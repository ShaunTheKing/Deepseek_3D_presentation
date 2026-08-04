import { validateDeck } from './schema.js'

// ⚠️ Testing only — Phase 5 moves this behind a server proxy.
// Set VITE_DEEPSEEK_API_KEY in a local .env file (see .env.example) or paste your key below.
// Optional chaining keeps this module importable in plain Node for unit tests.
const API_KEY = import.meta.env?.VITE_DEEPSEEK_API_KEY || 'sk-paste-your-key-here'

const SYSTEM_PROMPT = `
You are an expert 3D presentation designer.
Output ONLY raw JSON (no markdown fences) following this schema exactly.
No extra fields. Camera positions must be cinematic and never inside objects.
All text must have billboard: true. Objects must not overlap each other.
Primitive shapes are ONLY: box, sphere, torus, plane. Never use other shapes
(cube, cylinder, cone, pyramid, etc.). Every primitive MUST include a color string.

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

export async function generateDeck(topic, retryHint) {
  const userContent = retryHint
    ? 'Topic: "' + topic + '". Generate a 4-slide deck. Your previous response was ' +
      'rejected: ' + retryHint + ' — fix every schema violation.'
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
  const deck = JSON.parse(data.choices[0].message.content)
  try {
    validateDeck(deck)
  } catch (e) {
    // Phase 2: retry once automatically when validation fails, hinting the error.
    if (retryHint) throw e
    return generateDeck(topic, e.message)
  }
  return deck
}
