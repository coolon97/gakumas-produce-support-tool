export interface InputStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function getInputStorage(): InputStorage | undefined {
  try {
    return (globalThis as { localStorage?: InputStorage }).localStorage
  } catch {
    return undefined
  }
}

export function readStoredInput<T>(key: string, initial: T, storage = getInputStorage()): T {
  try {
    const raw = storage?.getItem(`gakumas-input:${key}`)
    if (raw == null) return initial
    const value: unknown = JSON.parse(raw)
    if (initial instanceof Set) {
      return (
        Array.isArray(value) && value.every((item) => typeof item === 'string') ? new Set(value) : initial
      ) as T
    }
    if (Array.isArray(initial)) {
      return (Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : initial) as T
    }
    if (initial === null) return (value === null || typeof value === 'string' ? value : initial) as T
    return (typeof value === typeof initial ? value : initial) as T
  } catch {
    return initial
  }
}

export function writeStoredInput<T>(key: string, value: T, storage = getInputStorage()): void {
  try {
    storage?.setItem(`gakumas-input:${key}`, JSON.stringify(value instanceof Set ? [...value] : value))
  } catch {
    // Storage being blocked or full must not prevent editing inputs.
  }
}
