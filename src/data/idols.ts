import catalog from '@data/idols.json'
import type { IdolData, IdolVersion } from '../types/idol'

/** Public Wiki catalog. Update with npm run idols:update; IDs survive refreshes. */
export const IDOLS = catalog as IdolData[]
const idolsById = new Map(IDOLS.map((idol) => [idol.id, idol]))
const versionsById = new Map(
  IDOLS.flatMap((idol) =>
    idol.versions.map((version) => [version.id, { idolId: idol.id, version }] as const),
  ),
)

export function findIdolById(idolId: string): IdolData | undefined {
  return idolsById.get(idolId)
}

export function findIdolVersion(idolId: string, versionId: string): IdolVersion | undefined {
  const entry = versionsById.get(versionId)
  return entry?.idolId === idolId ? entry.version : undefined
}
