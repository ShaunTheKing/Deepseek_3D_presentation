import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateDeck } from '../src/schema.js'
import { DECK } from '../src/deck.js'

const clone = (d) => structuredClone(d)

test('fallback deck validates', () => {
  assert.doesNotThrow(() => validateDeck(DECK))
})

test('rejects non-object decks', () => {
  assert.throws(() => validateDeck(null), /not an object/)
  assert.throws(() => validateDeck('deck'), /not an object/)
})

test('rejects missing or empty slides', () => {
  assert.throws(() => validateDeck({ title: 'x' }), /no slides/)
  assert.throws(() => validateDeck({ title: 'x', slides: [] }), /no slides/)
})

test('rejects missing title', () => {
  assert.throws(() => validateDeck({ slides: [{}] }), /missing a title/)
})

test('rejects unknown object type', () => {
  const d = clone(DECK)
  d.slides[0].objects[0].type = 'nope'
  assert.throws(() => validateDeck(d), /unknown object type/)
})

test('rejects invalid primitive shape', () => {
  const d = clone(DECK)
  d.slides[0].objects.push({
    type: 'primitive', shape: 'pyramid', position: [0, 0, 0], color: '#fff',
  })
  assert.throws(() => validateDeck(d), /valid shape and color/)
})

test('rejects non-finite numbers in positions', () => {
  const d = clone(DECK)
  d.slides[0].objects[1].position = [0, NaN, 0]
  assert.throws(() => validateDeck(d), /position/)
  const d2 = clone(DECK)
  d2.slides[0].camera.position = [Infinity, 0, 0]
  assert.throws(() => validateDeck(d2), /camera/)
})

test('rejects malformed camera', () => {
  const d = clone(DECK)
  d.slides[1].camera.position = [1, 2]
  assert.throws(() => validateDeck(d), /camera/)
})

test('rejects bad rotation, scale, and fov', () => {
  const d = clone(DECK)
  d.slides[0].objects[1].rotation = [0, 'x', 0]
  assert.throws(() => validateDeck(d), /rotation/)
  const d2 = clone(DECK)
  d2.slides[0].objects[1].scale = [1, 2]
  assert.throws(() => validateDeck(d2), /scale/)
  const d3 = clone(DECK)
  d3.slides[0].camera.fov = 'wide'
  assert.throws(() => validateDeck(d3), /fov/)
})

test('rejects invalid transition', () => {
  const d = clone(DECK)
  d.slides[0].transition = 'teleport'
  assert.throws(() => validateDeck(d), /transition/)
})

// --- Phase 3 object types: glb / chart / image ---

test('accepts glb, chart, and image objects', () => {
  const d = clone(DECK)
  d.slides[0].objects.push(
    { type: 'glb', assetId: 'avocado', position: [2, 0, 0], scale: 1.2 },
    {
      type: 'chart',
      data: [
        { label: 'A', value: 3 },
        { label: 'B', value: 7 },
      ],
      position: [0, 1, 0],
    },
    { type: 'image', prompt: 'a nebula, cinematic', position: [0, 1, -7], opacity: 0.5 },
  )
  assert.doesNotThrow(() => validateDeck(d))
})

test('rejects unknown glb assetIds', () => {
  const d = clone(DECK)
  d.slides[0].objects.push({ type: 'glb', assetId: 'not-a-model', position: [0, 0, 0] })
  assert.throws(() => validateDeck(d), /valid assetId.*not-a-model/)
})

test('rejects charts with no data or too much data', () => {
  const d = clone(DECK)
  d.slides[0].objects.push({ type: 'chart', data: [], position: [0, 0, 0] })
  assert.throws(() => validateDeck(d), /data array of 1-12/)
  const d2 = clone(DECK)
  d2.slides[0].objects.push({
    type: 'chart',
    data: Array.from({ length: 13 }, (_, i) => ({ label: 'x' + i, value: i })),
    position: [0, 0, 0],
  })
  assert.throws(() => validateDeck(d2), /data array of 1-12/)
})

test('rejects chart entries with bad labels or values', () => {
  const d = clone(DECK)
  d.slides[0].objects.push({
    type: 'chart',
    data: [{ label: 'A', value: NaN }],
    position: [0, 0, 0],
  })
  assert.throws(() => validateDeck(d), /finite numeric value/)
  const d2 = clone(DECK)
  d2.slides[0].objects.push({
    type: 'chart',
    data: [{ label: '', value: 1 }],
    position: [0, 0, 0],
  })
  assert.throws(() => validateDeck(d2), /label string/)
})

test('rejects images with empty prompts or bad opacity', () => {
  const d = clone(DECK)
  d.slides[0].objects.push({ type: 'image', prompt: '   ', position: [0, 0, 0] })
  assert.throws(() => validateDeck(d), /non-empty prompt/)
  const d2 = clone(DECK)
  d2.slides[0].objects.push({ type: 'image', prompt: 'ok', position: [0, 0, 0], opacity: 'half' })
  assert.throws(() => validateDeck(d2), /opacity must be a number/)
})
