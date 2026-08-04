import { validateDeck } from './schema'

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
