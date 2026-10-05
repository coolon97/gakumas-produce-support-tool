import { RELEASE_NOTES } from '../data/release-notes'
import type { ReleaseNote } from '../data/release-notes'
import { getInputStorage, readStoredInput, writeStoredInput } from './input-storage'
import type { InputStorage } from './input-storage'

const SEEN_RELEASES_KEY = 'release-notes.seen'

export function getUnreadReleaseNotes(
  storage: InputStorage | undefined = getInputStorage(),
  releases: readonly ReleaseNote[] = RELEASE_NOTES,
): readonly ReleaseNote[] {
  const seen = readStoredInput(SEEN_RELEASES_KEY, new Set<string>(), storage)
  return releases.filter((release) => !seen.has(release.version))
}

export function markReleaseNotesRead(
  releases: readonly ReleaseNote[],
  storage: InputStorage | undefined = getInputStorage(),
): void {
  const seen = readStoredInput(SEEN_RELEASES_KEY, new Set<string>(), storage)
  releases.forEach((release) => seen.add(release.version))
  writeStoredInput(SEEN_RELEASES_KEY, seen, storage)
}
