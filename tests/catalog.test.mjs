import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GLB_CATALOG, CATALOG_IDS, CATALOG_BY_ID } from '../src/catalog.js'

test('catalog has 15-20 curated models', () => {
  assert.ok(GLB_CATALOG.length >= 15 && GLB_CATALOG.length <= 20, `got ${GLB_CATALOG.length}`)
})

test('assetIds are unique and kebab-case', () => {
  const ids = GLB_CATALOG.map((m) => m.assetId)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/)
})

test('every entry has url, tags, license, and attribution', () => {
  for (const m of GLB_CATALOG) {
    assert.ok(m.url.startsWith('https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/'), m.assetId)
    assert.ok(Array.isArray(m.tags) && m.tags.length > 0, m.assetId)
    assert.ok(['CC0', 'CC BY 4.0'].includes(m.license), `${m.assetId}: ${m.license}`)
    assert.ok(typeof m.attribution === 'string' && m.attribution.length > 0, m.assetId)
  }
})

test('CATALOG_IDS and CATALOG_BY_ID stay in sync with the catalog', () => {
  assert.equal(CATALOG_IDS.size, GLB_CATALOG.length)
  assert.equal(Object.keys(CATALOG_BY_ID).length, GLB_CATALOG.length)
  for (const m of GLB_CATALOG) {
    assert.equal(CATALOG_BY_ID[m.assetId], m)
  }
})

test('all 17 catalog URLs are reachable', async () => {
  for (const m of GLB_CATALOG) {
    const res = await fetch(m.url, { method: 'HEAD' })
    assert.ok(res.ok, `${m.assetId}: ${res.status}`)
  }
})
