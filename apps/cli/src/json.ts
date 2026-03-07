export function stringifyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`
}
