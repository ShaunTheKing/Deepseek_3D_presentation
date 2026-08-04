# DeepSeek 3D Presentation

Prompt → cinematic 3D fly-through. An AI builds a 3D presentation deck (text +
primitives + camera moves) from a one-line topic, rendered with Three.js.

## Quick start

```bash
Activate the project conda env (it contains Node + npm), then install dependencies
(first time only). Copy the example env file, then edit `.env` and put your real
key in (`VITE_DEEPSEEK_API_KEY=sk-...` from platform.deepseek.com → API Keys).

```
conda activate /Users/shauntheking/Projects/Deepseek_3D_presentation/.conda/AIP
npm install
cp .env.example .env
npm run dev
```

Then open http://localhost:5173.

Other commands: `npm test` (schema validation tests), `npm run build`
(production build → `dist/`), `npm run preview` (serve the build).

> ⚠️ If you paste commands into zsh, keep `#` out of pasted lines — interactive
> zsh does not always treat `#` as a comment, so `cmd # note` can corrupt the
> command (a stray `#` arg made Vite serve from a wrong root and show a blank
> page). Paste only the plain commands above.


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
| `src/generator.js` | Phase 1 AI generator — calls DeepSeek, validates, retries once on invalid output |
| `src/schema.js` | Deck schema + `validateDeck` — structural validation of LLM output |
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
