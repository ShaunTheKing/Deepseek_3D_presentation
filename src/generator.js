import { validateDeck } from './schema.js'

// ⚠️ Testing only — Phase 5 moves this behind a server proxy.
// Provider: OpenRouter (OpenAI-compatible endpoint). Set VITE_OPENROUTER_API_KEY
// in a local .env file (see .env.example), then RESTART the dev server — Vite
// only reads .env at startup. Optional chaining keeps this module importable
// in plain Node for unit tests.
const API_KEY = import.meta.env?.VITE_OPENROUTER_API_KEY || 'sk-or-paste-your-key-here'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = import.meta.env?.VITE_LLM_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free'

async function chat(messages, temperature) {
  // Friendly error instead of a confusing 401 when the key is missing, typo'd,
  // or still the placeholder. Skipped in Node (unit tests mock fetch).
  if (import.meta.env && !API_KEY.startsWith('sk-or-v1-')) {
    throw new Error(
      'Invalid API key — set VITE_OPENROUTER_API_KEY=sk-or-v1-... in .env, then restart the dev server',
    )
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + API_KEY,
      'X-Title': 'DeepSeek 3D Presentation',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error('API error ' + res.status)
  const data = await res.json()
  return sanitizeLLMJson(data.choices[0].message.content)
}

export const SYSTEM_PROMPT = `
You are an expert 3D presentation designer.
Output ONLY raw JSON (no markdown fences) following this schema exactly.
No extra fields. Camera positions must be cinematic and never inside objects.
All text must have billboard: true. Objects must not overlap each other.
Primitive shapes are ONLY: box, sphere, torus, plane. Never use other shapes
(cube, cylinder, cone, pyramid, etc.). Every primitive MUST include a color string.
All numbers must be plain JSON numbers — never expressions like Math.PI or -Math.PI/2.
RULE: Prefer 'glb' objects over 'primitive' shapes whenever a catalog asset's
tags match the slide's topic. Use primitives only for abstract backdrops, floors,
or when no catalog asset fits. Include at least 1 glb object on most slides that
have a catalog match.
LAYOUT RULES (mandatory):
- Text lives in a LEFT column: x around -3.4 (between -4.5 and -2.0), stacked from y = 2.6 downward.
- glb / primitive objects live on the RIGHT: x between 1.5 and 4.0, y between -1.5 and 0.5.
- Charts are centered at x = 0, y = 0.3.
- Keep at least 2.5 world units between any text position and any object position.
- Title fontSize max 1.1, other text fontSize max 0.5. Never place two text objects at the same y.
- Background image planes stay at z = -7.
- The app re-positions everything into this layout in code; your positions are suggestions.

type Deck = {
  title: string;
  slides: {
    title: string;
    notes: string;
    camera: { position: [number, number, number]; lookAt: [number, number, number]; fov?: number };
    objects: ({
      type: 'text'; content: string; position: [number, number, number];
      fontSize: number; color?: string; billboard?: boolean;
    } | {
      type: 'primitive'; shape: 'box' | 'sphere' | 'torus' | 'plane';
      position: [number, number, number]; rotation?: [number, number, number];
      scale?: [number, number, number]; color: string;
      metalness?: number; roughness?: number; emissive?: string;
    } | {
      type: 'glb'; assetId: string; position: [number, number, number];
      rotation?: [number, number, number]; scale?: number;
    } | {
      type: 'chart'; title?: string;
      data: { label: string; value: number }[];
      position: [number, number, number]; scale?: [number, number, number]; color?: string;
    } | {
      type: 'image'; prompt: string; position?: [number, number, number];
      rotation?: [number, number, number]; scale?: [number, number, number]; opacity?: number;
    })[];
    transition: 'fly' | 'fade' | 'orbit';
  }[];
}

Rules for the new object types:
- glb: use ONLY these assetIds (never invent URLs or other ids):
  avocado: food,nature | antique-camera: camera,vintage | lantern: street,light |
  water-bottle: bottle,drink | toy-car: car,vehicle | boom-box: music,retro |
  flight-helmet: helmet,aviation | barramundi-fish: fish,ocean | corset: fashion |
  sci-fi-helmet: helmet,space | animated-morph-cube: abstract,shape |
  sheen-chair: furniture,room | metal-rough-spheres: material,abstract |
  fox: animal,wildlife | box: shape,cargo | damaged-helmet: helmet,battle |
  glam-velvet-sofa: furniture,sofa
  Always pick the assetId whose tags best match the slide's topic. Default scale
  1 = a ~1.4-unit-tall object.
- chart: 3D bar chart for statistics or comparisons. data: 1-12 entries of
  { label: string, value: number }. Bars are auto-sized; values can be any scale.
- image: a background plane generated from your prompt. Write a short cinematic
  visual prompt (5-10 words), e.g. "fiery volcano eruption at night, cinematic".
  Place it behind the scene (position z around -7). Do not use more than 1-2 images per deck.
`

// The model sometimes writes code-like literals (-Math.PI/2, Math.PI*2) instead of
// plain JSON numbers, or wraps the JSON in markdown fences. Rewrite those forms.
export function sanitizeLLMJson(content) {
  return String(content)
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .replace(/(-?\bMath\.PI)(\s*([*/])\s*(\d+(?:\.\d+)?))?/g, (m, pi, opPart, op, num) => {
      let v = Math.PI
      if (opPart) v = op === '*' ? v * parseFloat(num) : v / parseFloat(num)
      return String(m.startsWith('-') ? -v : v)
    })
}

// Accept the shape aliases and shorthands models love to use; the renderer only
// ever sees canonical objects.
const SHAPE_ALIASES = { cube: 'box', ring: 'torus' }
const SHAPE_SHORTHAND = new Set(['box', 'sphere', 'torus', 'plane'])

export function normalizeDeck(deck) {
  for (const slide of deck.slides) {
    for (const obj of slide.objects) {
      if (obj.type === 'primitive' && SHAPE_ALIASES[obj.shape]) {
        obj.shape = SHAPE_ALIASES[obj.shape]
      } else if (SHAPE_SHORTHAND.has(obj.type)) {
        // The model sometimes writes { type: 'torus' } instead of
        // { type: 'primitive', shape: 'torus' }.
        obj.shape = obj.type
        obj.type = 'primitive'
      }
    }
  }
  enforceLayout(deck)
  return deck
}

// The LLM can't do spatial reasoning, so don't trust its positions: snap every
// slide into a fixed template. Text stacks top-left, models grid on the right,
// wide charts center, images stay far behind. Overlaps become impossible.
export function enforceLayout(deck) {
  for (const slide of deck.slides) {
    const texts = slide.objects.filter((o) => o.type === 'text')
    const solids = slide.objects.filter((o) => o.type === 'glb' || o.type === 'primitive')
    const charts = slide.objects.filter((o) => o.type === 'chart')
    const imgs = slide.objects.filter((o) => o.type === 'image')

    // 1. Text: stack top-left, biggest (title) first, spacing by line count.
    texts.sort((a, b) => (b.fontSize || 0.5) - (a.fontSize || 0.5))
    let y = 2.6
    for (const t of texts) {
      const fs = t.fontSize || 0.5
      const lines = String(t.content).split('\n').length
      t.position = [-3.4, y, 0]
      y -= fs * lines * 1.35 + 0.5 // block height + gap
    }

    // 2. Models: right/lower area, grid-spaced, far from the text column.
    solids.forEach((m, i) => {
      m.position = [2.1 + (i % 2) * 1.5, -0.9 - Math.floor(i / 2) * 1.8, 0]
    })

    // 3. Charts are wide (up to 12 bars) — center them instead of the right grid.
    charts.forEach((c, i) => {
      c.position = [0, 0.3 - i * 2.6, 0]
    })

    // 4. Backgrounds stay far behind everything.
    for (const im of imgs) im.position = [0, 0.5, -7]
  }
  return deck
}

export const ROUTER_PROMPT = `
You are the live-adaptation router for a 3D presentation.
A viewer asks a question while a slide is showing. Decide how to respond:
- "insert": the question deserves 1-2 new slides woven into the deck right after
  the current slide (a new subtopic, a deeper dive, "tell me more about X").
- "answer": a 1-2 sentence spoken answer is enough (a quick fact or clarification).
Output ONLY raw JSON: {"mode":"insert"} or {"mode":"answer","answer":"..."}.
`

function deckContext(deck, slideIdx) {
  const titles = deck.slides.map((s, i) => `${i + 1}. ${s.title}`).join(' | ')
  return `Deck: "${deck.title}". Slides: ${titles}. Currently showing slide ${slideIdx + 1} (${deck.slides[slideIdx]?.title}).`
}

// Phase 4: decide whether a viewer question becomes new slides or a quick answer.
export async function routeQuestion(question, deck, slideIdx, retryHint) {
  const userContent = retryHint
    ? `${deckContext(deck, slideIdx)} Viewer question: "${question}". Your previous response was rejected: ${retryHint} — output only the required JSON.`
    : `${deckContext(deck, slideIdx)} Viewer question: "${question}".`

  // API/transport errors propagate here — only malformed CONTENT retries.
  const content = await chat(
    [
      { role: 'system', content: ROUTER_PROMPT },
      { role: 'user', content: userContent },
    ],
    0.3,
  )

  let d
  try {
    d = JSON.parse(content)
  } catch (e) {
    if (retryHint) throw new Error('Router returned invalid JSON twice: ' + e.message)
    return routeQuestion(
      question,
      deck,
      slideIdx,
      'the previous output was not valid JSON — output plain JSON only',
    )
  }

  if (d.mode === 'answer') {
    if (typeof d.answer !== 'string' || d.answer.trim() === '') {
      throw new Error('Router returned an empty answer')
    }
    return { mode: 'answer', answer: d.answer.trim() }
  }
  if (d.mode === 'insert') return { mode: 'insert' }

  if (retryHint) throw new Error('Router returned an unknown mode twice: ' + d.mode)
  return routeQuestion(
    question,
    deck,
    slideIdx,
    `the previous mode "${d.mode}" is invalid — use only "insert" or "answer"`,
  )
}

// Phase 4: generate 1-2 slides to splice into the deck after the current slide.
export async function generateInsertSlides(question, deck, slideIdx, retryHint) {
  const userContent = retryHint
    ? `A viewer asked: "${question}". Insert 1-2 new slides right after slide ${slideIdx + 1} of ${deckContext(deck, slideIdx)} Your previous response was rejected: ${retryHint} — fix every problem. Output ONLY raw JSON: {"slides":[{title, notes, camera, objects, transition}, ...]}`
    : `A viewer asked: "${question}". Insert 1-2 new slides right after slide ${slideIdx + 1} of ${deckContext(deck, slideIdx)} Output ONLY raw JSON: {"slides":[{title, notes, camera, objects, transition}, ...]}`

  // API/transport errors propagate here — only malformed CONTENT retries.
  const content = await chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    0.7,
  )

  let d
  try {
    d = JSON.parse(content)
  } catch (e) {
    if (retryHint) throw new Error('Insert returned invalid JSON twice: ' + e.message)
    return generateInsertSlides(
      question,
      deck,
      slideIdx,
      'the previous output was not valid JSON — output plain JSON numbers only, never expressions like Math.PI',
    )
  }

  const sub = { title: deck.title, slides: d.slides }
  if (Array.isArray(sub.slides) && sub.slides.length > 2) sub.slides = sub.slides.slice(0, 2)
  try {
    normalizeDeck(sub) // aliases + layout enforcement, same as full decks
    validateDeck(sub)
  } catch (e) {
    if (retryHint) throw new Error('Insert returned invalid slides twice: ' + e.message)
    return generateInsertSlides(question, deck, slideIdx, e.message)
  }
  return sub
}

export async function generateDeck(topic, retryHint) {
  const userContent = retryHint
    ? 'Topic: "' + topic + '". Generate a 4-slide deck. Your previous response was ' +
      'rejected: ' + retryHint + ' — fix every problem.'
    : 'Topic: "' + topic + '". Generate a 4-slide deck.'

  // Retry once (Phase 2) on ANY invalid output: unparseable JSON or schema violations.
  // API/transport errors propagate here — only malformed CONTENT retries.
  const content = await chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    0.7,
  )

  let deck
  try {
    deck = JSON.parse(content)
  } catch (e) {
    if (retryHint) throw new Error('The AI returned invalid JSON twice: ' + e.message)
    return generateDeck(
      topic,
      'the previous output was not valid JSON — output plain JSON numbers only, ' +
        'never expressions like Math.PI',
    )
  }

  try {
    normalizeDeck(deck)
    validateDeck(deck)
  } catch (e) {
    if (retryHint) throw new Error('The AI returned an invalid deck twice: ' + e.message)
    return generateDeck(topic, e.message)
  }
  return deck
}
