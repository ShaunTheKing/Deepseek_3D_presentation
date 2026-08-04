import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { loadHistory, saveToHistory, clearHistory } from '../src/history.js'

const mem = new Map()
function stubStorage() {
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  }
}

afterEach(() => {
  delete globalThis.localStorage
  mem.clear()
})

test('returns an empty list when nothing was saved', () => {
  stubStorage()
  assert.deepEqual(loadHistory(), [])
})

test('round-trips saved entries, newest first', () => {
  stubStorage()
  saveToHistory({ topic: 'a', deck: { title: 'A' }, ts: 1 })
  saveToHistory({ topic: 'b', deck: { title: 'B' }, ts: 2 })
  const h = loadHistory()
  assert.equal(h.length, 2)
  assert.equal(h[0].topic, 'b')
  assert.equal(h[1].topic, 'a')
})

test('caps history at 10 entries', () => {
  stubStorage()
  for (let i = 1; i <= 12; i++) saveToHistory({ topic: 't' + i, deck: {}, ts: i })
  const h = loadHistory()
  assert.equal(h.length, 10)
  assert.equal(h[0].topic, 't12')
  assert.equal(h[9].topic, 't3')
})

test('clearHistory empties the list', () => {
  stubStorage()
  saveToHistory({ topic: 'a', deck: {}, ts: 1 })
  clearHistory()
  assert.deepEqual(loadHistory(), [])
})

test('corrupted storage falls back to an empty list', () => {
  stubStorage()
  mem.set('deepseek-3d-history', '{not json')
  assert.deepEqual(loadHistory(), [])
})

test('survives without localStorage (SSR / Node)', () => {
  assert.deepEqual(loadHistory(), [])
  assert.deepEqual(saveToHistory({ topic: 'a', deck: {}, ts: 1 }), [])
})
