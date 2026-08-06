import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { generateDeck, sanitizeLLMJson, normalizeDeck, routeQuestion, generateInsertSlides, SYSTEM_PROMPT } from '../src/generator.js'
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

test('sanitizeLLMJson strips markdown fences around the JSON', () => {
  assert.equal(sanitizeLLMJson('```json\n{"a":1}\n```'), '{"a":1}')
  assert.equal(sanitizeLLMJson('```\n{"a":1}\n```'), '{"a":1}')
  assert.equal(sanitizeLLMJson('{"a":1}'), '{"a":1}')
})

test('SYSTEM_PROMPT instructs the model to prefer glb objects over primitives', () => {
  assert.match(SYSTEM_PROMPT, /Prefer 'glb' objects over 'primitive' shapes/)
  assert.match(SYSTEM_PROMPT, /assetId whose tags best match the slide's topic/)
})

test('a fenced-JSON response parses without a retry', async () => {
  const calls = mockFetch([{ raw: '```json\n' + JSON.stringify(goodDeck) + '\n```' }])
  const deck = await generateDeck('topic')
  assert.deepEqual(summarize(deck), summarize(goodDeck))
  assert.equal(calls.length, 1)
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

test('normalizeDeck rewrites shape shorthands ({ type: "torus" }) to primitives', () => {
  const deck = structuredClone(goodDeck)
  deck.slides[0].objects = [
    { type: 'torus', position: [0, 0, 0], color: '#fff' },
    { type: 'sphere', position: [1, 0, 0], color: '#fff' },
  ]
  normalizeDeck(deck)
  assert.equal(deck.slides[0].objects[0].type, 'primitive')
  assert.equal(deck.slides[0].objects[0].shape, 'torus')
  assert.equal(deck.slides[0].objects[1].shape, 'sphere')
  assert.doesNotThrow(() => validateDeck(deck))
})

// Layout enforcement repositions objects, so compare deck STRUCTURE, not positions.
const summarize = (d) => ({
  title: d.title,
  slideTitles: d.slides.map((s) => s.title),
  types: d.slides.flatMap((s) => s.objects.map((o) => o.type)),
})

test('returns the deck when the first response is valid', async () => {
  const calls = mockFetch([{ deck: goodDeck }])
  const deck = await generateDeck('topic')
  assert.deepEqual(summarize(deck), summarize(goodDeck))
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
  assert.deepEqual(summarize(deck), summarize(goodDeck))
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
  assert.deepEqual(summarize(deck), summarize(goodDeck))
  assert.equal(calls.length, 2)
  assert.match(calls[1].body.messages[1].content, /not valid JSON/)
})

test('does not retry API errors', async () => {
  const calls = mockFetch([{ error: 500 }])
  await assert.rejects(() => generateDeck('topic'), /API error 500/)
  assert.equal(calls.length, 1)
})

// --- Phase 4: live adaptation router + insert generator ---

test('router returns an answer with a non-empty answer string', async () => {
  const calls = mockFetch([{ raw: JSON.stringify({ mode: 'answer', answer: 'Ice and rock.' }) }])
  const decision = await routeQuestion('What are Saturn rings made of?', goodDeck, 2)
  assert.deepEqual(decision, { mode: 'answer', answer: 'Ice and rock.' })
  assert.equal(calls.length, 1)
  assert.match(calls[0].body.messages[1].content, /Currently showing slide 3/)
})

test('router returns insert mode', async () => {
  mockFetch([{ raw: JSON.stringify({ mode: 'insert' }) }])
  const decision = await routeQuestion('Tell me more about Titan', goodDeck, 0)
  assert.deepEqual(decision, { mode: 'insert' })
})

test('router retries once when the mode is unknown', async () => {
  const calls = mockFetch([
    { raw: JSON.stringify({ mode: 'teleport' }) },
    { raw: JSON.stringify({ mode: 'answer', answer: 'ok' }) },
  ])
  const decision = await routeQuestion('q', goodDeck, 0)
  assert.equal(decision.mode, 'answer')
  assert.equal(calls.length, 2)
  assert.match(calls[1].body.messages[1].content, /invalid — use only "insert" or "answer"/)
})

test('router throws after two unknown modes', async () => {
  const calls = mockFetch([
    { raw: JSON.stringify({ mode: 'teleport' }) },
    { raw: JSON.stringify({ mode: 'teleport' }) },
  ])
  await assert.rejects(() => routeQuestion('q', goodDeck, 0), /unknown mode twice/)
  assert.equal(calls.length, 2)
})

test('router rejects an empty answer', async () => {
  mockFetch([{ raw: JSON.stringify({ mode: 'answer', answer: '  ' }) }])
  await assert.rejects(() => routeQuestion('q', goodDeck, 0), /empty answer/)
})

test('insert generator returns 1-2 slides splicable into the deck', async () => {
  const insertDeck = {
    title: 'T',
    slides: [
      {
        title: 'inserted',
        notes: 'n',
        camera: { position: [0, 0, 5], lookAt: [0, 0, 0] },
        objects: [
          { type: 'glb', assetId: 'avocado', position: [0, 0, 0], scale: 1 },
        ],
        transition: 'fly',
      },
    ],
  }
  const calls = mockFetch([{ deck: insertDeck }])
  const sub = await generateInsertSlides('Tell me about X', goodDeck, 0)
  assert.equal(sub.slides.length, 1)
  assert.equal(sub.slides[0].title, 'inserted')
  assert.equal(calls.length, 1)
})

test('insert generator truncates oversized responses to 2 slides', async () => {
  const slides = Array.from({ length: 5 }, (_, i) => ({
    title: 's' + i,
    notes: 'n',
    camera: { position: [0, 0, 5], lookAt: [0, 0, 0] },
    objects: [{ type: 'text', content: 'hi', position: [0, 0, 0], fontSize: 1, billboard: true }],
    transition: 'fly',
  }))
  mockFetch([{ deck: { title: 'T', slides } }])
  const sub = await generateInsertSlides('q', goodDeck, 0)
  assert.equal(sub.slides.length, 2)
})

test('insert generator retries once on invalid slides, then succeeds', async () => {
  const calls = mockFetch([
    { deck: invalidDeck },
    {
      deck: {
        title: 'T',
        slides: [{ ...goodSlide, title: 'fixed' }],
      },
    },
  ])
  const sub = await generateInsertSlides('q', goodDeck, 0)
  assert.equal(sub.slides[0].title, 'fixed')
  assert.equal(calls.length, 2)
  assert.match(calls[1].body.messages[1].content, /rejected/)
})

test('insert generator throws after two invalid responses', async () => {
  const calls = mockFetch([{ deck: invalidDeck }, { deck: invalidDeck }])
  await assert.rejects(() => generateInsertSlides('q', goodDeck, 0), /invalid slides twice/)
  assert.equal(calls.length, 2)
})
