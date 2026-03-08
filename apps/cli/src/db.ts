import {
  exportDatabase as exportDatabaseFromCore,
  importDatabase as importDatabaseFromCore,
  summarizeBundle,
} from '@oml-__SERVICE_NAME__/core'
import type { DbConnectionOptions } from './db-connection'
const SERVICE_NAME = 'oml-__SERVICE_NAME__'

export async function exportDatabase(options: DbConnectionOptions) {
  return exportDatabaseFromCore({
    ...options,
    serviceName: SERVICE_NAME,
  })
}

export async function importDatabase(bundleText: string, options: DbConnectionOptions) {
  return importDatabaseFromCore(bundleText, options)
}

export { summarizeBundle }
