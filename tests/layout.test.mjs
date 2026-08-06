import { test } from 'node:test'
import assert from 'node:assert/strict'
import { enforceLayout } from '../src/generator.js'

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

test('text objects stack in the left column, biggest first, never at the same y', () => {
  const d = { title: 't', slides: [slide()] }
  enforceLayout(d)
  const texts = d.slides[0].objects.filter((o) => o.type === 'text')
  assert.equal(texts.length, 2)
  for (const t of texts) {
    assert.equal(t.position[0], -3.4)
    assert.equal(t.position[2], 0)
  }
  // title (fs 1.1) above body (fs 0.5, 2 lines), gap = fs*lines*1.35 + 0.5
  const [title, body] = texts
  assert.ok(title.position[1] > body.position[1])
  const gap = title.position[1] - body.position[1]
  assert.ok(Math.abs(gap - 1.985) < 1e-9, `expected gap 1.985, got ${gap}`)
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
