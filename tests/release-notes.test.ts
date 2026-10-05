import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { RELEASE_NOTES } from '../src/data/release-notes.ts'
import { getUnreadReleaseNotes, markReleaseNotesRead } from '../src/lib/release-notes.ts'
import type { InputStorage } from '../src/lib/input-storage.ts'
import idols from '../data/idols.json'
import cards from '../data/cards.json'
import manifest from '../package.json'

function memoryStorage(): InputStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

test('first access shows releases; closing persists read state across revisits', () => {
  const storage = memoryStorage()
  assert.deepEqual(getUnreadReleaseNotes(storage), RELEASE_NOTES)
  markReleaseNotesRead(RELEASE_NOTES, storage)
  assert.deepEqual(getUnreadReleaseNotes(storage), [])
})

test('an update only displays unread releases, including skipped versions, without forgetting history', () => {
  const storage = memoryStorage()
  markReleaseNotesRead(RELEASE_NOTES, storage)
  const next = { ...RELEASE_NOTES[0], version: '0.1.2' }
  const newest = { ...next, version: '0.1.3' }
  const releases = [newest, next, ...RELEASE_NOTES]
  assert.deepEqual(getUnreadReleaseNotes(storage, releases), [newest, next])
  markReleaseNotesRead([newest], storage)
  assert.deepEqual(getUnreadReleaseNotes(storage, releases), [next])
  assert.deepEqual(getUnreadReleaseNotes(storage, RELEASE_NOTES), [])
})

test('corrupt, unavailable and blocked storage do not prevent displaying or closing release notes', () => {
  for (const value of ['invalid', '{}', 'null', '[1]']) {
    const storage = { getItem: () => value, setItem: () => {} }
    assert.deepEqual(getUnreadReleaseNotes(storage), RELEASE_NOTES)
  }
  const blocked = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('full')
    },
  }
  assert.deepEqual(getUnreadReleaseNotes(blocked), RELEASE_NOTES)
  assert.doesNotThrow(() => markReleaseNotesRead(RELEASE_NOTES, blocked))
  assert.deepEqual(getUnreadReleaseNotes(undefined), RELEASE_NOTES)
})

test('release acknowledgement leaves saved inputs and tutorial progress intact', () => {
  const storage = memoryStorage()
  storage.setItem('gakumas-input:tutorial.version', '13')
  storage.setItem('gakumas:app-inputs', 'saved deck and schedule')
  markReleaseNotesRead(RELEASE_NOTES, storage)
  assert.equal(storage.getItem('gakumas-input:tutorial.version'), '13')
  assert.equal(storage.getItem('gakumas:app-inputs'), 'saved deck and schedule')
})

test('published notes identify all four added cards and their bundled images at the current version', () => {
  assert.equal(RELEASE_NOTES[0].version, manifest.version)
  assert.equal(new Set(RELEASE_NOTES.map((release) => release.version)).size, RELEASE_NOTES.length)
  assert.equal(RELEASE_NOTES[0].idolVersionIds.length, 2)
  assert.equal(RELEASE_NOTES[0].supportCardIds.length, 2)
  for (const release of RELEASE_NOTES) {
    for (const id of release.idolVersionIds) {
      const idol = idols.flatMap((entry) => entry.versions).find((entry) => entry.id === id)
      assert.ok(idol, 'P idol in notes must exist in the catalog')
      assert.ok(existsSync('assets/game/PIdol/converted/' + idol.rarity + '/' + id + '.webp'))
    }
    for (const id of release.supportCardIds) {
      const card = cards.find((entry) => entry.id === id)
      assert.ok(card, 'Support card in notes must exist in the catalog')
      assert.ok(existsSync('assets/game/' + card.imageUrl!.slice('local:'.length)))
    }
  }
})
