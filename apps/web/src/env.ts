export interface WebEnv {
  ENVIRONMENT: string
  SERVICE_NAME: string
  API_ORIGIN: string
  CACHE: KVNamespace
  ASSETS: Fetcher
}
