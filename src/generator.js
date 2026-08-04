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
    })[];
    transition: 'fly' | 'fade' | 'orbit';
  }[];
}
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

// Accept the shape aliases models love to use; the renderer only ever sees
// canonical shapes.
const SHAPE_ALIASES = { cube: 'box', ring: 'torus' }

export function normalizeDeck(deck) {
  for (const slide of deck.slides) {
    for (const obj of slide.objects) {
      if (obj.type === 'primitive' && SHAPE_ALIASES[obj.shape]) {
        obj.shape = SHAPE_ALIASES[obj.shape]
      }
    }
  }
  return deck
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
