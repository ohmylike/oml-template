import type { SchemaTableDescription } from './db-schema'

export interface DataBundle {
  formatVersion: 1
  service: string
  exportedAt: string
  schema: {
    source: 'drizzle'
    tables: SchemaTableDescription[]
  }
  data: Record<string, Record<string, unknown>[]>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function createBundle(input: Omit<DataBundle, 'formatVersion' | 'exportedAt'>): DataBundle {
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    ...input,
  }
}

export function parseBundle(text: string): DataBundle {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(
      error instanceof Error ? `Failed to parse bundle JSON: ${error.message}` : 'Failed to parse bundle JSON.',
    )
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid bundle: expected a JSON object.')
  }
  if (parsed.formatVersion !== 1) {
    throw new Error('Invalid bundle: unsupported formatVersion.')
  }
  if (typeof parsed.service !== 'string' || parsed.service.length === 0) {
    throw new Error('Invalid bundle: service must be a non-empty string.')
  }
  if (typeof parsed.exportedAt !== 'string' || parsed.exportedAt.length === 0) {
    throw new Error('Invalid bundle: exportedAt must be a non-empty string.')
  }
  if (!isRecord(parsed.schema)) {
    throw new Error('Invalid bundle: schema must be an object.')
  }
  if (parsed.schema.source !== 'drizzle') {
    throw new Error('Invalid bundle: schema.source must be "drizzle".')
  }
  if (!Array.isArray(parsed.schema.tables)) {
    throw new Error('Invalid bundle: schema.tables must be an array.')
  }
  if (!isRecord(parsed.data)) {
    throw new Error('Invalid bundle: data must be an object.')
  }

  const data: Record<string, Record<string, unknown>[]> = {}
  for (const [tableName, rows] of Object.entries(parsed.data)) {
    if (!Array.isArray(rows)) {
      throw new Error(`Invalid bundle: data.${tableName} must be an array.`)
    }

    data[tableName] = rows.map((row, index) => {
      if (!isRecord(row)) {
        throw new Error(`Invalid bundle: data.${tableName}[${index}] must be an object.`)
      }

      return { ...row }
    })
  }

  return {
    formatVersion: 1,
    service: parsed.service,
    exportedAt: parsed.exportedAt,
    schema: {
      source: 'drizzle',
      tables: parsed.schema.tables as SchemaTableDescription[],
    },
    data,
  }
}
