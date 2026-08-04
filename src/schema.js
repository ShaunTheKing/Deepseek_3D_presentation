// Deck schema validation — pure module (no imports) so it can be unit-tested
// and shared by the LLM generator without bundling tricks.

const SHAPES = new Set(['box', 'sphere', 'torus', 'plane'])
const TRANSITIONS = new Set(['fly', 'fade', 'orbit'])

function isVec3(v) {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
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
    if (slide.camera.fov !== undefined && typeof slide.camera.fov !== 'number') {
      throw new Error(`${at}: camera fov must be a number`)
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
          throw new Error(
            `${o}: primitive needs a valid shape and color (got shape: "${obj.shape}", color: "${obj.color}")`,
          )
        }
        if (obj.rotation !== undefined && !isVec3(obj.rotation)) {
          throw new Error(`${o}: rotation must be an array of 3 numbers`)
        }
        if (obj.scale !== undefined && !isVec3(obj.scale)) {
          throw new Error(`${o}: scale must be an array of 3 numbers`)
        }
      } else {
        throw new Error(`${o}: unknown object type "${obj.type}"`)
      }
      if (!isVec3(obj.position)) throw new Error(`${o}: needs a position array of 3 numbers`)
    })
    if (!TRANSITIONS.has(slide.transition)) throw new Error(`${at}: invalid transition`)
  })
}
