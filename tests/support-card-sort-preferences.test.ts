import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  SUPPORT_CARD_SORT_PREFERENCES_KEY,
  createDefaultSupportCardSortPreferences,
  loadSupportCardSortPreferences,
  saveSupportCardSortPreferences,
} from '../src/lib/support-card-sort-preferences.ts'

function memoryStorage(raw: string | null = null) {
  return {
    getItem: (key: string) => (key === SUPPORT_CARD_SORT_PREFERENCES_KEY ? raw : null),
    setItem: (key: string, value: string) => {
      assert.equal(key, SUPPORT_CARD_SORT_PREFERENCES_KEY)
      raw = value
    },
  }
}

test('manual sort conditions default to zero with no configured lessons', () => {
  const defaults = createDefaultSupportCardSortPreferences()
  assert.equal(defaults.useCurrentSchedule, false)
  assert.ok(
    defaults.lessons.every((lesson) => !lesson.enabled && lesson.param === null && lesson.subParam === null),
  )
  assert.ok(Object.values(defaults.triggerCounts).every((value) => value === 0))
  assert.deepEqual(loadSupportCardSortPreferences(memoryStorage()), defaults)
})

test('all manual inputs and the current-schedule option persist', () => {
  const storage = memoryStorage()
  const preferences = createDefaultSupportCardSortPreferences()
  preferences.useCurrentSchedule = true
  preferences.lessons[0] = { enabled: true, type: 'sp', param: 'vocal', subParam: 'dance' }
  preferences.triggerCounts.class_end = 3
  preferences.triggerCounts['skill_card_gained:SSR'] = 2
  saveSupportCardSortPreferences(storage, preferences)
  assert.deepEqual(loadSupportCardSortPreferences(storage), preferences)
})

test('invalid saved lesson values and counts are normalized', () => {
  const storage = memoryStorage(
    JSON.stringify({
      version: 2,
      useCurrentSchedule: 'yes',
      lessons: [{ enabled: true, type: 'bad', param: 'vocal', subParam: 'vocal' }],
      triggerCounts: { class_end: -2, drink_gained: 3.9, lesson_end: 'bad' },
    }),
  )
  const restored = loadSupportCardSortPreferences(storage)
  assert.equal(restored.useCurrentSchedule, false)
  assert.deepEqual(restored.lessons[0], { enabled: true, type: 'normal', param: 'vocal', subParam: null })
  assert.equal(restored.triggerCounts.class_end, 0)
  assert.equal(restored.triggerCounts.drink_gained, 3)
  assert.equal(restored.triggerCounts.lesson_end, 0)
})

test('corrupt, incompatible, or inaccessible storage falls back safely', () => {
  const expected = createDefaultSupportCardSortPreferences()
  for (const raw of ['{broken', 'null', '{"version":3}']) {
    assert.deepEqual(loadSupportCardSortPreferences(memoryStorage(raw)), expected)
  }
  const blockedStorage = {
    getItem: () => {
      throw new Error('unavailable')
    },
    setItem: () => {
      throw new Error('full')
    },
  }
  assert.deepEqual(loadSupportCardSortPreferences(blockedStorage), expected)
  assert.doesNotThrow(() => saveSupportCardSortPreferences(blockedStorage, expected))
})
