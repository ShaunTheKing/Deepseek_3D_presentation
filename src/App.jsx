import { useEffect, useState } from 'react'
import { DECK as FALLBACK_DECK } from './deck'
import { generateDeck } from './generator'
import Scene from './Scene'

const btn = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(255,255,255,0.12)',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
}

export default function App() {
  const [idx, setIdx] = useState(0)
  const [DECK, setDeck] = useState(FALLBACK_DECK)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const slide = DECK.slides[idx]

  const generate = async () => {
    if (!topic || loading) return
    setLoading(true)
    try {
      const d = await generateDeck(topic)
      setDeck(d)
      setIdx(0)
    } catch (e) {
      alert('Generation failed: ' + e.message)
    }
    setLoading(false)
  }

  const go = (dir) =>
    setIdx((i) => Math.max(0, Math.min(DECK.slides.length - 1, i + dir)))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DECK])

  // 'fade' transitions: dip through black, then reveal the next slide.
  const isFade = slide?.transition === 'fade'
  const [fadeOut, setFadeOut] = useState(false)
  useEffect(() => {
    if (!isFade) {
      setFadeOut(false)
      return
    }
    setFadeOut(true)
    const t = setTimeout(() => setFadeOut(false), 320)
    return () => clearTimeout(t)
  }, [idx, isFade])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#05060a',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Scene slide={slide} />

      {/* Top-left title */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 24,
          color: 'rgba(255,255,255,0.85)',
          fontSize: 18,
          fontWeight: 700,
          textShadow: '0 0 12px rgba(0,0,0,0.8)',
        }}
      >
        {DECK.title}
      </div>

      {/* AI generation bar */}
      <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', gap: 8 }}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generate()}
          placeholder="Try: How volcanoes erupt"
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            width: 220,
            outline: 'none',
          }}
        />
        <button
          style={{ ...btn, opacity: loading ? 0.6 : 1 }}
          onClick={generate}
          disabled={loading}
        >
          {loading ? 'Thinking…' : 'Generate'}
        </button>
      </div>

      {/* Slide indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 24,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 14,
          textShadow: '0 0 10px rgba(0,0,0,0.8)',
        }}
      >
        {idx + 1} / {DECK.slides.length} — {slide.title}
      </div>

      {/* Navigation */}
      <div style={{ position: 'absolute', bottom: 20, right: 24, display: 'flex', gap: 8 }}>
        <button style={btn} onClick={() => go(-1)} disabled={idx === 0}>
          ‹ Prev
        </button>
        <button style={btn} onClick={() => go(1)} disabled={idx === DECK.slides.length - 1}>
          Next ›
        </button>
      </div>

      {/* Loading overlay — never a blank screen */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,6,10,0.72)',
            color: 'white',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          Generating your 3D deck…
        </div>
      )}

      {/* Fade-transition overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#05060a',
          pointerEvents: 'none',
          opacity: fadeOut ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  )
}
