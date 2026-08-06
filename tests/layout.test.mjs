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

  const titleH = 1.1 * LAYOUT_LINE_H * 1
  assert.deepEqual(title.position, [-3.4, +(2.6 - titleH / 2).toFixed(5), 0])

  const bodyH = 0.5 * LAYOUT_LINE_H * 2
  const bodyTop = 2.6 - titleH - LAYOUT_GAP
  assert.deepEqual(body.position, [-3.4, +(bodyTop - bodyH / 2).toFixed(5), 0])

  const gap = title.position[1] - titleH / 2 - (body.position[1] + bodyH / 2)
  assert.ok(Math.abs(gap - LAYOUT_GAP) < 1e-9, `expected gap ${LAYOUT_GAP}, got ${gap}`)
})

test('wrapping titles are correctly line-counted', () => {
  const s = slide()
  s.objects[0].content = 'Black Hole Formation'
  s.objects[1].content = 'Subtitle'
  s.objects[1].fontSize = 0.5
  const d = { title: 't', slides: [s] }
  enforceLayout(d)
  const [title, subtitle] = d.slides[0].objects.filter((o) => o.type === 'text')

  const titleH = 1.1 * LAYOUT_LINE_H * 2
  assert.deepEqual(title.position, [-3.4, +(2.6 - titleH / 2).toFixed(5), 0])

  const subH = 0.5 * LAYOUT_LINE_H * 1
  const subTop = 2.6 - titleH - LAYOUT_GAP
  assert.deepEqual(subtitle.position, [-3.4, +(subTop - subH / 2).toFixed(5), 0])

  const gap = title.position[1] - titleH / 2 - (subtitle.position[1] + subH / 2)
  assert.ok(Math.abs(gap - LAYOUT_GAP) < 1e-9)
})

test('solid objects grid on the right, at least 2.5 units from the text column', () => {
  const d = { title: 't', slides: [slide()] }
  enforceLayout(d)
  const texts = d.slides[0].objects.filter((o) => o.type === 'text')
  const solids = d.slides[0].objects.filter((o) => o.type === 'glb' || o.type === 'primitive')
  assert.deepEqual(solids.map((m) => m.position), [[2.1, -0.9, 0], [3.6, -0.9, 0]])
  for (const t of texts) for (const m of solids) {
    assert.ok(Math.hypot(t.position[0] - m.position[0], t.position[1] - m.position[1]) >= 2.5)
  }
})

test('charts center instead of the right grid; images pin to z = -7', () => {
  const d = { title: 't', slides: [slide()] }
  enforceLayout(d)
  assert.deepEqual(d.slides[0].objects.find((o) => o.type === 'chart').position, [0, 0.3, 0])
  assert.deepEqual(d.slides[0].objects.find((o) => o.type === 'image').position, [0, 0.5, -7])
})

test('enforceLayout is idempotent', () => {
  const d = { title: 't', slides: [slide()] }
  enforceLayout(d)
  const first = JSON.stringify(d)
  enforceLayout(d)
  assert.equal(JSON.stringify(d), first)
})

test('fitCamera covers all content (z > 8, bounds in frustum)', () => {
  const s = slide()
  enforceLayout({ title: 't', slides: [s] })
  const cam = s.camera
  assert.equal(cam.fov, 50)
  assert.ok(cam.position[2] > 8, `z ${cam.position[2]} should be > 8`)
  const dist = cam.position[2]
  const hFov = (50 * Math.PI) / 180
  const halfH = Math.tan(hFov / 2) * dist
  const halfW = halfH * 1.6
  for (const o of s.objects) {
    if (o.type === 'image') continue
    assert.ok(
      o.position[0] >= cam.lookAt[0] - halfW - 0.1 &&
        o.position[0] <= cam.lookAt[0] + halfW + 0.1 &&
        o.position[1] >= cam.lookAt[1] - halfH - 0.1 &&
        o.position[1] <= cam.lookAt[1] + halfH + 0.1,
      `${o.type} at [${o.position.map((n) => n.toFixed(1))}] outside frustum`,
    )
  }
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
