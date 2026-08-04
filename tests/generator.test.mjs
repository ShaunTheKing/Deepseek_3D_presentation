import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { generateDeck } from '../src/generator.js'

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

// The exact failure class the user hit: model invented a shape outside the schema.
const badDeck = {
  title: 'T',
  slides: [
    {
      ...goodSlide,
      objects: [
        { type: 'primitive', shape: 'cube', position: [0, 0, 0], color: '#fff' },
      ],
    },
  ],
}

function mockFetch(responses) {
  const calls = []
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) })
    const r = responses.shift()
    if (r.error) return { ok: false, status: r.error }
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(r.deck) } }] }),
    }
  }
  return calls
}

afterEach(() => {
  delete globalThis.fetch
})

test('returns the deck when the first response is valid', async () => {
  const calls = mockFetch([{ deck: goodDeck }])
  const deck = await generateDeck('topic')
  assert.deepEqual(deck, goodDeck)
  assert.equal(calls.length, 1)
})

test('retries once with the validation error as a hint, then returns a valid deck', async () => {
  const calls = mockFetch([{ deck: badDeck }, { deck: goodDeck }])
  const deck = await generateDeck('topic')
  assert.deepEqual(deck, goodDeck)
  assert.equal(calls.length, 2)
  const retryBody = calls[1].body
  assert.match(retryBody.messages[1].content, /rejected/)
  assert.match(retryBody.messages[1].content, /valid shape and color/)
})

test('gives up (throws) after two invalid responses', async () => {
  const calls = mockFetch([{ deck: badDeck }, { deck: badDeck }])
  await assert.rejects(() => generateDeck('topic'), /primitive needs a valid shape and color/)
  assert.equal(calls.length, 2)
})

test('does not retry API errors', async () => {
  const calls = mockFetch([{ error: 500 }])
  await assert.rejects(() => generateDeck('topic'), /API error 500/)
  assert.equal(calls.length, 1)
})
