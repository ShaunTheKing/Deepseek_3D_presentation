import { validateDeck } from './schema.js'

// ⚠️ Testing only — Phase 5 moves this behind a server proxy.
// Set VITE_DEEPSEEK_API_KEY in a local .env file (see .env.example) or paste your key below.
// Optional chaining keeps this module importable in plain Node for unit tests.
const API_KEY = import.meta.env?.VITE_DEEPSEEK_API_KEY || 'sk-paste-your-key-here'

export const SYSTEM_PROMPT = `
You are an expert 3D presentation designer.
Output ONLY raw JSON (no markdown fences) following this schema exactly.
No extra fields. Camera positions must be cinematic and never inside objects.
All text must have billboard: true. Objects must not overlap each other.
Primitive shapes are ONLY: box, sphere, torus, plane. Never use other shapes
(cube, cylinder, cone, pyramid, etc.). Every primitive MUST include a color string.
All numbers must be plain JSON numbers — never expressions like Math.PI or -Math.PI/2.

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
  Pick assets whose tags match the topic. Default scale 1 = a ~1.4-unit-tall object.
- chart: 3D bar chart for statistics or comparisons. data: 1-12 entries of
  { label: string, value: number }. Bars are auto-sized; values can be any scale.
- image: a background plane generated from your prompt. Write a short cinematic
  visual prompt (5-10 words), e.g. "fiery volcano eruption at night, cinematic".
  Place it behind the scene (position z around -7). Do not use more than 1-2 images per deck.
`

// The model sometimes writes code-like literals (-Math.PI/2, Math.PI*2) instead of
// plain JSON numbers. Rewrite those exact forms to their numeric value.
export function sanitizeLLMJson(content) {
  return content.replace(
    /(-?\bMath\.PI)(\s*([*/])\s*(\d+(?:\.\d+)?))?/g,
    (m, pi, opPart, op, num) => {
      let v = Math.PI
      if (opPart) v = op === '*' ? v * parseFloat(num) : v / parseFloat(num)
      return String(m.startsWith('-') ? -v : v)
    },
  )
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

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + API_KEY,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: ROUTER_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error('Router API error ' + res.status)
  const data = await res.json()

  let d
  try {
    d = JSON.parse(sanitizeLLMJson(data.choices[0].message.content))
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

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + API_KEY,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error('Insert API error ' + res.status)
  const data = await res.json()

  let d
  try {
    d = JSON.parse(sanitizeLLMJson(data.choices[0].message.content))
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

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + API_KEY,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error('API error ' + res.status)
  const data = await res.json()
  const content = sanitizeLLMJson(data.choices[0].message.content)

  // Retry once (Phase 2) on ANY invalid output: unparseable JSON or schema violations.
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
