export interface DbConnectionOptions {
  url: string
  authToken?: string
}

export function resolveDbConnection(values: { url?: string; authToken?: string }): DbConnectionOptions {
  const url = values.url ?? process.env.TURSO_DATABASE_URL

  if (!url) {
    throw new Error('Missing database URL. Pass `--url` or set `TURSO_DATABASE_URL`.')
  }

  return {
    url,
    authToken: values.authToken ?? process.env.TURSO_AUTH_TOKEN,
  }
}
