# DeepSeek 3D Presentation

Prompt → cinematic 3D fly-through. An AI builds a 3D presentation deck (text +
primitives + camera moves) from a one-line topic, rendered with Three.js.

## Quick start

```bash
# 1. Activate the project conda env (contains Node + npm)
conda activate /Users/shauntheking/Projects/Deepseek_3D_presentation/.conda/AIP

# 2. Install dependencies
npm install

# 3. Add your DeepSeek API key (optional for the demo deck — required for Generate)
cp .env.example .env
# edit .env → VITE_DEEPSEEK_API_KEY=sk-...

# 4. Run
npm run dev        # dev server → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build
```

No API key? The app still runs — it renders the fallback demo deck (`src/deck.js`,
"The Solar System") and you can navigate with ←/→ or the buttons.

## Using the AI button

Type a topic (e.g. *"How volcanoes erupt"*), hit **Generate**, and DeepSeek
returns a 4-slide deck that follows the schema in `src/generator.js`. Each deck
costs a fraction of a cent.

Test topics from the plan: *"How volcanoes erupt"*, *"The Roman Empire"*,
*"How mRNA vaccines work"*.

## Architecture

| File | Role |
|---|---|
| `src/App.jsx` | UI shell: title, Generate bar, nav, overlays |
| `src/Scene.jsx` | Three.js renderer: camera rig, transitions, glow, sparkles |
| `src/deck.js` | Fallback deck (works offline, demos every object type) |
| `src/generator.js` | Phase 1 AI generator — calls DeepSeek, validates deck shape |
| `src/main.jsx` | React entry point |

Deck schema (also embedded in the LLM system prompt):

```ts
type Deck = {
  title: string
  slides: {
    title: string
    notes: string
    camera: { position: [n,n,n]; lookAt: [n,n,n]; fov?: number }
    objects: (
      | { type: 'text'; content: string; position: [n,n,n]; fontSize: number; color?: string; billboard?: boolean }
      | { type: 'primitive'; shape: 'box'|'sphere'|'torus'|'plane'; position: [n,n,n]; rotation?: [n,n,n]; scale?: [n,n,n]; color: string; metalness?: number; roughness?: number; emissive?: string }
    )[]
    transition: 'fly' | 'fade' | 'orbit'
  }[]
}
```

## ⚠️ Security note (dev-only setup)

The DeepSeek API key lives in the **client** (`src/generator.js` reads
`VITE_DEEPSEEK_API_KEY`). Any visitor can read it from the browser and use it to
spend your quota. This is intentional for local Phase 1 testing only — **Phase 5
moves the call behind a serverless proxy** (e.g. a Vercel function) so the key
never ships to the browser. Never deploy the current setup as-is. `.env` and
`.conda/` are gitignored.
