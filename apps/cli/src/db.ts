import { createClient } from '@libsql/client'
import type { InValue } from '@libsql/client'
import { createBundle, parseBundle, type DataBundle } from './bundle'
import type { DbConnectionOptions } from './db-connection'
import { listSchemaTables } from './db-schema'

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function normalizeValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (value instanceof Uint8Array) {
    return Array.from(value)
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue)
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeValue(nestedValue)]),
    )
  }

  return String(value)
}

function toDbValue(value: unknown): InValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof ArrayBuffer ||
    value instanceof Uint8Array
  ) {
    return value
  }
  if (typeof value === 'bigint') {
    return Number(value)
  }

  return JSON.stringify(value)
}

async function listExistingTableNames(client: ReturnType<typeof createClient>) {
  const result = await client.execute(`
    select name
    from sqlite_master
    where type = 'table'
      and name not like 'sqlite_%'
    order by name
  `)

  return new Set(result.rows.map((row) => String(row.name)))
}

export async function exportDatabase(options: DbConnectionOptions) {
  const managedTables = listSchemaTables()
  const client = createClient(options)

  try {
    const existingTableNames = await listExistingTableNames(client)
    const tables = managedTables.filter((table) => existingTableNames.has(table.name))
    const data = Object.fromEntries(
      await Promise.all(
        tables.map(async (table) => {
          const result = await client.execute(`select * from ${quoteIdentifier(table.name)}`)
          const rows = result.rows.map((row) =>
            Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)])),
          )

          return [table.name, rows]
        }),
      ),
    )

    return createBundle({
      service: 'oml-__SERVICE_NAME__',
      schema: {
        source: 'drizzle',
        tables,
      },
      data,
    })
  } finally {
    client.close()
  }
}

export function summarizeBundle(bundle: DataBundle) {
  return Object.entries(bundle.data)
    .map(([name, rows]) => ({
      name,
      rowCount: rows.length,
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export async function importDatabase(bundleText: string, options: DbConnectionOptions) {
  const bundle = parseBundle(bundleText)
  const schemaTables = new Map(listSchemaTables().map((table) => [table.name, table]))
  const client = createClient(options)

  try {
    for (const [tableName, rows] of Object.entries(bundle.data)) {
      const table = schemaTables.get(tableName)
      if (!table) {
        throw new Error(`Unknown table in bundle: ${tableName}`)
      }

      const knownColumns = new Set(table.columns.map((column) => column.name))

      await client.execute(`delete from ${quoteIdentifier(tableName)}`)

      for (const row of rows) {
        const entries = Object.entries(row)
        if (entries.length === 0) {
          throw new Error(`Cannot import an empty row for table ${tableName}`)
        }

        const unknownColumns = entries
          .map(([columnName]) => columnName)
          .filter((columnName) => !knownColumns.has(columnName))

        if (unknownColumns.length > 0) {
          throw new Error(`Unknown column(s) for ${tableName}: ${unknownColumns.join(', ')}`)
        }

        const columns = entries.map(([columnName]) => quoteIdentifier(columnName)).join(', ')
        const placeholders = entries.map(() => '?').join(', ')
        const args = entries.map(([, value]) => toDbValue(value))

        await client.execute(
          `insert into ${quoteIdentifier(tableName)} (${columns}) values (${placeholders})`,
          args,
        )
      }
    }

    return {
      bundle,
      tables: summarizeBundle(bundle),
    }
  } finally {
    client.close()
  }
}
