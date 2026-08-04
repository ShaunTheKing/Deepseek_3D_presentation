// ⚠️ Testing only — Phase 5 moves this behind a server proxy.
// Set VITE_DEEPSEEK_API_KEY in a local .env file (see .env.example) or paste your key below.
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || 'sk-paste-your-key-here'

const SYSTEM_PROMPT = `
You are an expert 3D presentation designer.
Output ONLY raw JSON (no markdown fences) following this schema exactly.
No extra fields. Camera positions must be cinematic and never inside objects.
All text must have billboard: true. Objects must not overlap each other.

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

export async function generateDeck(topic) {
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
        { role: 'user', content: 'Topic: "' + topic + '". Generate a 4-slide deck.' },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error('API error ' + res.status)
  const data = await res.json()
  const deck = JSON.parse(data.choices[0].message.content)
  validateDeck(deck)
  return deck
}

const SHAPES = new Set(['box', 'sphere', 'torus', 'plane'])
const TRANSITIONS = new Set(['fly', 'fade', 'orbit'])

function isVec3(v) {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')
}

// Structural validation so malformed model output never reaches the renderer.
export function validateDeck(deck) {
  if (!deck || typeof deck !== 'object') throw new Error('Deck is not an object')
  if (typeof deck.title !== 'string') throw new Error('Deck is missing a title')
  if (!Array.isArray(deck.slides) || deck.slides.length === 0) {
    throw new Error('Deck has no slides')
  }
  deck.slides.forEach((slide, i) => {
    const at = `slide ${i + 1}`
    if (!slide || typeof slide !== 'object') throw new Error(`${at}: not an object`)
    if (typeof slide.title !== 'string') throw new Error(`${at}: missing title`)
    if (!slide.camera || !isVec3(slide.camera.position) || !isVec3(slide.camera.lookAt)) {
      throw new Error(`${at}: camera needs position and lookAt arrays of 3 numbers`)
    }
    if (!Array.isArray(slide.objects)) throw new Error(`${at}: missing objects array`)
    slide.objects.forEach((obj, j) => {
      const o = `${at}, object ${j + 1}`
      if (obj.type === 'text') {
        if (typeof obj.content !== 'string' || typeof obj.fontSize !== 'number') {
          throw new Error(`${o}: text needs a content string and a numeric fontSize`)
        }
      } else if (obj.type === 'primitive') {
        if (!SHAPES.has(obj.shape) || typeof obj.color !== 'string') {
          throw new Error(`${o}: primitive needs a valid shape and color`)
        }
      } else {
        throw new Error(`${o}: unknown object type "${obj.type}"`)
      }
      if (!isVec3(obj.position)) throw new Error(`${o}: needs a position array of 3 numbers`)
    })
    if (!TRANSITIONS.has(slide.transition)) throw new Error(`${at}: invalid transition`)
  })
}
