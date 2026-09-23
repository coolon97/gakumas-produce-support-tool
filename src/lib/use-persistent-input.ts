import { useEffect, useState } from 'react'
import { readStoredInput, writeStoredInput } from './input-storage'

/** Save user inputs; modal visibility and calculated results remain transient. */
export function usePersistentInput<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStoredInput(key, initial))
  useEffect(() => writeStoredInput(key, value), [key, value])
  return [value, setValue] as const
}
