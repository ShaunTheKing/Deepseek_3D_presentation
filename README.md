# DeepSeek 3D Presentation

**Prompt → cinematic 3D fly-through.**
Type a one-line topic and an AI builds a 3D presentation deck — text, primitives, GLB models, charts, and camera moves — rendered live with Three.js / React Three Fiber.

> No API key? No problem — the app boots straight into a fallback demo deck ("The Solar System") so you can explore the renderer, camera controls, and post-processing with zero setup.

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Using the AI generator](#using-the-ai-generator)
- [Live adaptation (Ask bar)](#live-adaptation-ask-bar)
- [Camera & visuals](#camera--visuals)
- [Architecture](#architecture)
- [Deck schema](#deck-schema)
- [3D model credits](#3d-model-credits)
- [Security note](#security-note-dev-only-setup)

---

## Features

- 🎬 **AI-generated decks** — one line of text becomes a 4-slide, camera-choreographed 3D presentation.
- 🧩 **Rich slide objects** — text, primitives (box/sphere/torus/plane), GLB models, 3D bar charts, and AI-generated images.
- 💬 **Live Q&A** — ask a question mid-presentation; the app either answers inline or generates and splices in new slides on the fly.
- 🕹️ **Free-look camera** — orbit, zoom, and pan between scripted transitions without ever clipping into an object.
- ✨ **Cinematic post-processing** — bloom, vignette, film grain, and a rotating nebula backdrop.
- 📴 **Offline-friendly** — works without any API key using a built-in fallback deck.

## Quick start

```bash
# 1. Activate the project's conda env (contains Node + npm)
conda activate /Users/shauntheking/Projects/Deepseek_3D_presentation/.conda/AIP

# 2. Install dependencies (first time only)
npm install

# 3. Set up environment variables
cp .env.example .env
```

Then open `.env` and add your [OpenRouter](https://openrouter.ai/) key:

```
VITE_OPENROUTER_API_KEY=sk-or-v1-...
```

The default model is the free `nvidia/nemotron-3-ultra-550b-a55b:free`; override it with `VITE_LLM_MODEL` if you want something else.

```bash
# 4. Restart the dev server (Vite only reads .env at startup)
npm run dev
```

Open **http://localhost:5173**.

**Other commands:**

| Command | Description |
|---|---|
| `npm test` | Run schema validation tests |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |

> ⚠️ **zsh users:** don't paste `#` comments inline with commands — interactive zsh doesn't always treat `#` as a comment start, and a stray `#` argument has been known to make Vite serve from the wrong root (blank page). Paste only the plain commands above.

## Using the AI generator

Type a topic — e.g. *"How volcanoes erupt"* — and hit **Generate**. DeepSeek returns a 4-slide deck that conforms to the schema in `src/generator.js`. Each deck costs a fraction of a cent.

Good topics to try:
- "How volcanoes erupt"
- "The Roman Empire"
- "How mRNA vaccines work"

Navigate slides with **← / →** or the on-screen buttons.

## Live adaptation (Ask bar)

Press **/** or click the **Ask** bar at any point during a presentation to ask a follow-up question. Behind the scenes:

1. **`routeQuestion`** — a cheap, low-temperature router call decides whether the question needs:
   - a **quick answer** → shown as a dismissible overlay, deck untouched, or
   - a **deeper dive** → routed to slide generation.
2. **`generateInsertSlides`** — produces 1–2 new, schema-validated slides (retried once on failure).
3. **`preloadAssets`** — warms GLB/image caches so the new slides never stall on load.
4. The new slides are spliced in right after the current one, the camera flies there automatically, and the updated deck is saved to history.

Verified example: *"What are Saturn's rings made of?"* returns a quick answer overlay, while *"Tell me more about how Saturn's rings formed"* inserts two new slides ("Saturn's Ring Origins", "The Shattered Moon Theory") complete with models and imagery.

## Camera & visuals

- **Free-look controls** — after each scripted transition, `OrbitControls` takes over (drag to orbit, wheel/pinch to zoom, damping on). Zoom is clamped to a 2.5–50 range so you can't clip into objects or lose the scene. Controls lock during transitions and re-sync to the next slide's `lookAt` on arrival; keyboard `+`/`-` and on-screen buttons also zoom.
- **Post-processing** — Bloom (tuned to emissive objects only), Vignette, and subtle film grain via `@react-three/postprocessing`. Depth of field is intentionally omitted to protect frame rate on midrange hardware; if the effects composer fails to initialize, the plain scene still renders.
- **Environment & lighting** — a night-preset environment map adds reflections to metal/emissive materials (degrades gracefully offline), with rebalanced ambient/directional lighting.
- **Background** — tinted fog plus a slowly rotating nebula-gradient sphere behind the starfield, instead of a flat void.
- **Motion** — staggered GSAP entrance animations and gently floating titles; tweens are cleaned up on unmount to avoid leaks across regenerated decks.
- **Enforced layout** — the LLM can't do spatial reasoning, so `enforceLayout`
  (inside `normalizeDeck`) snaps every generated slide into a fixed template:
  text stacks top-left (x −3.4, title first), GLBs/primitives grid on the right
  (x 2.1/3.6), charts center, images pin to z −7. Overlaps are structurally
  impossible; the system prompt's LAYOUT RULES keep the model aligned with it.
- **Typography** — Space Grotesk throughout, via `@fontsource`.
- **Materials** — physically-based materials with clearcoat sheen on metallic hero objects.
- **Performance** — capped device pixel ratio, 4x multisampling, no DoF, and automatic disposal of geometries/materials on unmount.

## Architecture

| File | Role |
|---|---|
| `src/main.jsx` | React entry point |
| `src/App.jsx` | UI shell: title, Generate bar, nav, overlays |
| `src/Scene.jsx` | Three.js renderer: camera rig, transitions, glow, sparkles |
| `src/deck.js` | Fallback deck (works offline, demonstrates every object type) |
| `src/generator.js` | AI generator — calls OpenRouter, sanitizes JSON, validates, retries once |
| `src/schema.js` | Deck schema + `validateDeck`, structural validation of LLM output |
| `src/catalog.js` | GLB catalog (17 CC0 / CC-BY models); the AI only ever picks an `assetId`, never invents URLs |
| `src/history.js` | Deck history persisted to `localStorage` (last 10 decks) |

### Slide object types

- **GLB models** — `{ type: 'glb', assetId, position, rotation?, scale? }`. The AI selects an `assetId` from `src/catalog.js`; models are auto-normalized to ~1.4 units and streamed from jsDelivr (Khronos glTF-Sample-Assets). A model that fails to load simply renders nothing rather than breaking the app.
- **Charts** — `{ type: 'chart', data: [{ label, value }], position, scale?, color?, title? }`. Renders as 3D bars scaled to the data, with labels and a base plate (supports 1–12 entries).
- **Images** — `{ type: 'image', prompt, position?, scale?, opacity? }`. A 1280×720 plane generated by [Pollinations](https://pollinations.ai) from a short prompt, no API key required. Best used sparingly (1–2 per deck), placed behind the scene.

## Deck schema

Also embedded directly in the LLM's system prompt:

```ts
type Deck = {
  title: string
  slides: {
    title: string
    notes: string
    camera: { position: [n, n, n]; lookAt: [n, n, n]; fov?: number }
    objects: (
      | { type: 'text'; content: string; position: [n, n, n]; fontSize: number; color?: string; billboard?: boolean }
      | { type: 'primitive'; shape: 'box' | 'sphere' | 'torus' | 'plane'; position: [n, n, n]; rotation?: [n, n, n]; scale?: [n, n, n]; color: string; metalness?: number; roughness?: number; emissive?: string }
      | { type: 'glb'; assetId: string; position: [n, n, n]; rotation?: [n, n, n]; scale?: [n, n, n] }
      | { type: 'chart'; data: { label: string; value: number }[]; position: [n, n, n]; scale?: [n, n, n]; color?: string; title?: string }
      | { type: 'image'; prompt: string; position?: [n, n, n]; scale?: [n, n, n]; opacity?: number }
    )[]
    transition: 'fly' | 'fade' | 'orbit'
  }[]
}
```

## 3D model credits

All GLB models are from [Khronos glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets), served via jsDelivr.

| assetId | License | Attribution |
|---|---|---|
| avocado, water-bottle, boom-box, barramundi-fish, corset, animated-morph-cube | CC0 | Microsoft |
| antique-camera | CC0 | Maximillan Kamps (UX3D) |
| lantern | CC0 | sbtron; Frank Galligan (Draco) |
| toy-car | CC0 | Guido Odendahl; Eric Chadwick |
| flight-helmet | CC0 | Gary Hsu |
| sci-fi-helmet | CC0 | Michael Pavlovic; Norbert Nopper |
| sheen-chair | CC0 | Eric Chadwick (Wayfair) |
| metal-rough-spheres | CC BY 4.0 | Ed Mackey (Analytical Graphics) |
| fox | CC BY 4.0 | PixelMannen (model); tomkranis (rigging) |
| box | CC BY 4.0 | Cesium |
| damaged-helmet | CC BY 4.0 | ctxwing |
| glam-velvet-sofa | CC BY 4.0 | Eric Chadwick (Wayfair) |

## Security note (dev-only setup)

⚠️ The DeepSeek/OpenRouter API key currently lives in the **client** (`src/generator.js` reads `VITE_DEEPSEEK_API_KEY`/`VITE_OPENROUTER_API_KEY` directly). Any visitor can read it from the browser and spend your quota.

This is intentional for **local development only**. A future phase should move the API call behind a serverless proxy (e.g. a Vercel function) so the key never ships to the browser.

**Never deploy the current setup as-is.** `.env` and `.conda/` are already gitignored.

## New dependencies

`gsap`, `@react-three/postprocessing` (+ `postprocessing`), `@fontsource/space-grotesk`