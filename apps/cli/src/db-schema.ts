import { createClient } from '@libsql/client'
import * as schema from '@oml-__SERVICE_NAME__/core/db/schema'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import type { DbConnectionOptions } from './db-connection'

export interface SchemaColumnDescription {
  name: string
  sqlType: string
  dataType: string
  notNull: boolean
  primaryKey: boolean
}

export interface SchemaTableDescription {
  name: string
  columns: SchemaColumnDescription[]
}

export interface SchemaDescription {
  source: 'code' | 'database'
  tables: SchemaTableDescription[]
}

export interface SchemaProvider {
  describeCodeSchema(): SchemaDescription
  describeDatabaseSchema(options: DbConnectionOptions): Promise<SchemaDescription>
  listManagedTables(): SchemaTableDescription[]
}

function isTable(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false
  }

  try {
    getTableConfig(value as Parameters<typeof getTableConfig>[0])
    return true
  } catch {
    return false
  }
}

function listCodeSchemaTables(): SchemaTableDescription[] {
  return Object.values(schema)
    .filter(isTable)
    .map((table) => {
      const config = getTableConfig(table)

      return {
        name: config.name,
        columns: config.columns.map((column) => ({
          name: column.name,
          sqlType: column.getSQLType(),
          dataType: column.dataType,
          notNull: column.notNull,
          primaryKey: column.primary,
        })),
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

function inferDataType(sqlType: string) {
  const normalized = sqlType.trim().toUpperCase()

  if (normalized === '') {
    return 'unknown'
  }
  if (normalized.includes('INT') || normalized === 'REAL' || normalized === 'DOUBLE' || normalized === 'NUMERIC') {
    return 'number'
  }
  if (normalized === 'BOOLEAN') {
    return 'boolean'
  }
  if (normalized.includes('BLOB')) {
    return 'binary'
  }
  if (normalized === 'JSON') {
    return 'json'
  }

  return 'string'
}

async function listDatabaseSchemaTables(options: DbConnectionOptions): Promise<SchemaTableDescription[]> {
  const client = createClient(options)

  try {
    const tablesResult = await client.execute(`
      select name
      from sqlite_master
      where type = 'table'
        and name not like 'sqlite_%'
      order by name
    `)

    const tables = await Promise.all(
      tablesResult.rows.map(async (row) => {
        const tableName = String(row.name)
        const columnsResult = await client.execute(`pragma table_info(${quoteSqlString(tableName)})`)

        return {
          name: tableName,
          columns: columnsResult.rows.map((column) => ({
            name: String(column.name),
            sqlType: String(column.type ?? '').toLowerCase(),
            dataType: inferDataType(String(column.type ?? '')),
            notNull: Number(column.notnull ?? 0) === 1,
            primaryKey: Number(column.pk ?? 0) >= 1,
          })),
        }
      }),
    )

    return tables
  } finally {
    client.close()
  }
}

export const schemaProvider: SchemaProvider = {
  describeCodeSchema() {
    return {
      source: 'code',
      tables: listCodeSchemaTables(),
    }
  },
  async describeDatabaseSchema(options) {
    return {
      source: 'database',
      tables: await listDatabaseSchemaTables(options),
    }
  },
  listManagedTables() {
    return listCodeSchemaTables()
  },
}

export function describeSchema() {
  return schemaProvider.describeCodeSchema()
}

export function listSchemaTables() {
  return schemaProvider.listManagedTables()
}

export async function describeDatabaseSchema(options: DbConnectionOptions) {
  return schemaProvider.describeDatabaseSchema(options)
}
