import { test } from 'node:test'
import assert from 'node:assert/strict'
import { enforceLayout, LAYOUT_LINE_H, LAYOUT_GAP } from '../src/generator.js'

const slide = () => ({
  title: 's',
  notes: '',
  camera: { position: [0, 0, 5], lookAt: [0, 0, 0] },
  objects: [
    { type: 'text', content: 'Title', position: [9, 9, 9], fontSize: 1.1, billboard: true },
    { type: 'text', content: 'Body line 1\nBody line 2', position: [-9, -9, 9], fontSize: 0.5, billboard: true },
    { type: 'primitive', shape: 'box', position: [9, 9, 9], color: '#fff' },
    { type: 'glb', assetId: 'avocado', position: [-9, 9, 9] },
    { type: 'chart', data: [{ label: 'A', value: 1 }], position: [9, 9, 9] },
    { type: 'image', prompt: 'nebula', position: [9, 9, 9] },
  ],
  transition: 'fly',
})

test('text objects stack top-left, biggest first, anchorY-middle gap preserved', () => {
  const d = { title: 't', slides: [slide()] }
  enforceLayout(d)
  const texts = d.slides[0].objects.filter((o) => o.type === 'text')
  assert.equal(texts.length, 2)
  const [title, body] = texts

  // title: fs 1.1, 1 line → h = 1.1 * 1.35 * 1 = 1.485; position at top - h/2
  const titleH = 1.1 * LAYOUT_LINE_H * 1
  assert.deepEqual(title.position, [-3.4, +(2.6 - titleH / 2).toFixed(5), 0])

  // body: fs 0.5, 2 literal '\n' lines (each short) → h = 0.5 * 1.35 * 2 = 1.35
  const bodyH = 0.5 * LAYOUT_LINE_H * 2
  // top after title = 2.6 - titleH - GAP = 2.6 - 1.485 - 0.5 = 0.615
  const bodyTop = 2.6 - titleH - LAYOUT_GAP
  assert.deepEqual(body.position, [-3.4, +(bodyTop - bodyH / 2).toFixed(5), 0])

  const gap = title.position[1] - titleH / 2 - (body.position[1] + bodyH / 2)
  assert.ok(Math.abs(gap - LAYOUT_GAP) < 1e-9, `expected gap ${LAYOUT_GAP}, got ${gap}`)
})

test('wrapping titles (long text that exceeds maxWidth) are correctly line-counted', () => {
  // "Black Hole Formation" at fs 1.1 → 21 chars → perLine ≈ 17 → 2 wrapped lines
  const s = slide()
  s.objects[0].content = 'Black Hole Formation' // title, overwrite
  s.objects[1].content = 'Subtitle' // short body
  s.objects[1].fontSize = 0.5
  const d = { title: 't', slides: [s] }
  enforceLayout(d)
  const [title, subtitle] = d.slides[0].objects.filter((o) => o.type === 'text')

  // title at 2.6 - h/2; h = 1.1 * 1.35 * 2 = 2.97 (2 wrapped lines)
  const titleH = 1.1 * LAYOUT_LINE_H * 2
  assert.deepEqual(title.position, [-3.4, +(2.6 - titleH / 2).toFixed(5), 0])

  const subH = 0.5 * LAYOUT_LINE_H * 1 // "Subtitle" is short → 1 line
  const subTop = 2.6 - titleH - LAYOUT_GAP
  assert.deepEqual(subtitle.position, [-3.4, +(subTop - subH / 2).toFixed(5), 0])

  // gap preserved despite the wrapping estimate
  const gap = title.position[1] - titleH / 2 - (subtitle.position[1] + subH / 2)
  assert.ok(Math.abs(gap - LAYOUT_GAP) < 1e-9)
})

test('solid objects grid on the right, at least 2.5 units from the text column', () => {
  const d = { title: 't', slides: [slide()] }
  enforceLayout(d)
  const texts = d.slides[0].objects.filter((o) => o.type === 'text')
  const solids = d.slides[0].objects.filter((o) => o.type === 'glb' || o.type === 'primitive')
  assert.deepEqual(
    solids.map((m) => m.position),
    [
      [2.1, -0.9, 0],
      [3.6, -0.9, 0],
    ],
  )
  for (const t of texts) for (const m of solids) {
    const dist = Math.hypot(t.position[0] - m.position[0], t.position[1] - m.position[1])
    assert.ok(dist >= 2.5, `text ${t.position} vs solid ${m.position}: dist ${dist}`)
  }
})

test('charts center instead of the right grid; images pin to z = -7', () => {
  const d = { title: 't', slides: [slide()] }
  enforceLayout(d)
  const chart = d.slides[0].objects.find((o) => o.type === 'chart')
  const img = d.slides[0].objects.find((o) => o.type === 'image')
  assert.deepEqual(chart.position, [0, 0.3, 0])
  assert.deepEqual(img.position, [0, 0.5, -7])
})

test('enforceLayout is idempotent', () => {
  const d = { title: 't', slides: [slide()] }
  enforceLayout(d)
  const first = JSON.stringify(d)
  enforceLayout(d)
  assert.equal(JSON.stringify(d), first)
})

test('multiple charts stack without overlapping each other', () => {
  const s = slide()
  s.objects.push({ type: 'chart', data: [{ label: 'B', value: 2 }], position: [9, 9, 9] })
  const d = { title: 't', slides: [s] }
  enforceLayout(d)
  const charts = d.slides[0].objects.filter((o) => o.type === 'chart')
  assert.equal(charts.length, 2)
  assert.ok(Math.abs(charts[0].position[1] - charts[1].position[1]) >= 2.5)
})
