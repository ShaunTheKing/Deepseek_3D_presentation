import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { generateDeck, sanitizeLLMJson, normalizeDeck } from '../src/generator.js'
import { validateDeck } from '../src/schema.js'

const goodSlide = {
  title: 's',
  notes: '',
  camera: { position: [0, 0, 5], lookAt: [0, 0, 0] },
  objects: [
    { type: 'text', content: 'hi', position: [0, 0, 0], fontSize: 1, billboard: true },
  ],
  transition: 'fly',
}
const goodDeck = { title: 'T', slides: [goodSlide] }

// Genuinely invalid: 'pyramid' is not in the schema and not aliased.
const invalidDeck = {
  title: 'T',
  slides: [
    {
      ...goodSlide,
      objects: [
        { type: 'primitive', shape: 'pyramid', position: [0, 0, 0], color: '#fff' },
      ],
    },
  ],
}

// The failure class the user hit: model wrote code-like literals in the JSON.
const mathPIRaw = JSON.stringify({
  title: 'T',
  slides: [
    {
      ...goodSlide,
      objects: [
        {
          type: 'primitive',
          shape: 'box',
          position: [0, 0, 0],
          rotation: [-Math.PI / 2, 0, 0],
          color: '#fff',
        },
      ],
    },
  ],
}).replace('-1.5707963267948966', '-Math.PI/2')

function mockFetch(responses) {
  const calls = []
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) })
    const r = responses.shift()
    if (r.error) return { ok: false, status: r.error }
    const content = r.raw ?? JSON.stringify(r.deck)
    return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) }
  }
  return calls
}

afterEach(() => {
  delete globalThis.fetch
})

test('sanitizeLLMJson rewrites Math.PI expressions to plain numbers', () => {
  assert.equal(sanitizeLLMJson('[-Math.PI/2,0,0]'), `[-${Math.PI / 2},0,0]`)
  assert.equal(sanitizeLLMJson('[Math.PI*2,0,0]'), `[${Math.PI * 2},0,0]`)
  assert.equal(sanitizeLLMJson('[Math.PI,0,0]'), `[${Math.PI},0,0]`)
  assert.equal(sanitizeLLMJson('[Math.PI / 2,0,0]'), `[${Math.PI / 2},0,0]`)
  assert.equal(sanitizeLLMJson('no expressions here'), 'no expressions here')
})

test('normalizeDeck maps model-friendly aliases to canonical shapes', () => {
  const deck = structuredClone(goodDeck)
  deck.slides[0].objects = [
    { type: 'primitive', shape: 'cube', position: [0, 0, 0], color: '#fff' },
    { type: 'primitive', shape: 'ring', position: [1, 0, 0], color: '#fff' },
  ]
  normalizeDeck(deck)
  assert.equal(deck.slides[0].objects[0].shape, 'box')
  assert.equal(deck.slides[0].objects[1].shape, 'torus')
  assert.doesNotThrow(() => validateDeck(deck))
})

test('returns the deck when the first response is valid', async () => {
  const calls = mockFetch([{ deck: goodDeck }])
  const deck = await generateDeck('topic')
  assert.deepEqual(deck, goodDeck)
  assert.equal(calls.length, 1)
})

test('fixes Math.PI literals in-place without a retry', async () => {
  const calls = mockFetch([{ raw: mathPIRaw }])
  const deck = await generateDeck('topic')
  assert.equal(deck.slides[0].objects[0].rotation[0], -Math.PI / 2)
  assert.equal(calls.length, 1)
})

test('retries once with the validation error as a hint, then returns a valid deck', async () => {
  const calls = mockFetch([{ deck: invalidDeck }, { deck: goodDeck }])
  const deck = await generateDeck('topic')
  assert.deepEqual(deck, goodDeck)
  assert.equal(calls.length, 2)
  const retryBody = calls[1].body
  assert.match(retryBody.messages[1].content, /rejected/)
  assert.match(retryBody.messages[1].content, /got shape: "pyramid"/)
})

test('gives up (throws) after two invalid responses', async () => {
  const calls = mockFetch([{ deck: invalidDeck }, { deck: invalidDeck }])
  await assert.rejects(
    () => generateDeck('topic'),
    /invalid deck twice.*got shape: "pyramid"/,
  )
  assert.equal(calls.length, 2)
})

test('retries once when the JSON itself is unparseable', async () => {
  const calls = mockFetch([{ raw: '{"title":' }, { deck: goodDeck }])
  const deck = await generateDeck('topic')
  assert.deepEqual(deck, goodDeck)
  assert.equal(calls.length, 2)
  assert.match(calls[1].body.messages[1].content, /not valid JSON/)
})

test('does not retry API errors', async () => {
  const calls = mockFetch([{ error: 500 }])
  await assert.rejects(() => generateDeck('topic'), /API error 500/)
  assert.equal(calls.length, 1)
})
