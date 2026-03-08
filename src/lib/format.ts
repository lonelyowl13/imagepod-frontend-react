export function stringsToLines(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return ''
  return arr.join('\n')
}

export function linesToStrings(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export function envToLines(env: Record<string, string> | undefined): string {
  if (!env || Object.keys(env).length === 0) return ''
  return Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
}

export function linesToEnv(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  s.split('\n').forEach((line) => {
    const i = line.indexOf('=')
    if (i > 0) {
      const key = line.slice(0, i).trim()
      const value = line.slice(i + 1).trim()
      if (key) out[key] = value
    }
  })
  return out
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}
