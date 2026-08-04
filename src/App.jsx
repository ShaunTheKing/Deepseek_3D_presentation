import { useEffect, useState } from 'react'
import { DECK as FALLBACK_DECK } from './deck'
import { generateDeck } from './generator'
import { loadHistory, saveToHistory, clearHistory } from './history'
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

const STAGES = [
  'Writing outline…',
  'Building scenes…',
  'Placing cameras…',
  'Polishing lighting…',
]

export default function App() {
  const [boot] = useState(loadHistory)
  const [idx, setIdx] = useState(0)
  const [DECK, setDeck] = useState(boot[0]?.deck ?? FALLBACK_DECK)
  const [generated, setGenerated] = useState(boot.length > 0)
  const [historyList, setHistoryList] = useState(boot)
  const [showHistory, setShowHistory] = useState(false)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState(null)
  const slide = DECK.slides[idx]

  // Cycle loading stage messages while generating.
  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1100)
    return () => clearInterval(t)
  }, [loading])

  // Auto-dismiss the error banner.
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 9000)
    return () => clearTimeout(t)
  }, [error])

  const generate = async () => {
    if (!topic.trim() || loading) return
    setLoading(true)
    setStage(0)
    setError(null)
    try {
      const d = await generateDeck(topic.trim())
      setDeck(d)
      setIdx(0)
      setGenerated(true)
      setHistoryList(saveToHistory({ topic: topic.trim(), deck: d, ts: Date.now() }))
    } catch (e) {
      setError('Generation failed: ' + e.message)
    }
    setLoading(false)
  }

  const loadFromHistory = (entry) => {
    setDeck(entry.deck)
    setIdx(0)
    setTopic(entry.topic)
    setGenerated(true)
    setShowHistory(false)
  }

  const go = (dir) =>
    setIdx((i) => Math.max(0, Math.min(DECK.slides.length - 1, i + dir)))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'Escape') setShowHistory(false)
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
        <button
          style={{ ...btn, opacity: loading ? 0.6 : 1 }}
          onClick={() => setShowHistory((v) => !v)}
          disabled={loading}
          title="Past decks are saved in this browser"
        >
          🕘 History
        </button>
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
          disabled={loading || !topic.trim()}
        >
          {loading ? 'Thinking…' : generated ? '↻ Regenerate' : 'Generate'}
        </button>
      </div>

      {/* History panel */}
      {showHistory && (
        <div
          style={{
            position: 'absolute',
            top: 64,
            right: 24,
            width: 320,
            maxHeight: '60vh',
            overflowY: 'auto',
            background: 'rgba(10,12,20,0.94)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 12,
            padding: 12,
            zIndex: 10,
          }}
        >
          <div
            style={{
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            Deck history
          </div>
          {historyList.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              Nothing here yet — generate a deck and it will be saved.
            </div>
          )}
          {historyList.map((entry, i) => (
            <button
              key={i}
              onClick={() => loadFromHistory(entry)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                padding: '10px 4px',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>{entry.topic}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {entry.deck.slides.length} slides ·{' '}
                {new Date(entry.ts).toLocaleString()}
              </div>
            </button>
          ))}
          {historyList.length > 0 && (
            <button
              onClick={() => {
                clearHistory()
                setHistoryList([])
                setGenerated(false)
              }}
              style={{
                ...btn,
                marginTop: 10,
                width: '100%',
                background: 'rgba(255,80,80,0.15)',
              }}
            >
              Clear history
            </button>
          )}
        </div>
      )}

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
        <button style={btn} onClick={() => go(-1)} disabled={idx === 0 || loading}>
          ‹ Prev
        </button>
        <button
          style={btn}
          onClick={() => go(1)}
          disabled={idx === DECK.slides.length - 1 || loading}
        >
          Next ›
        </button>
      </div>

      {/* Error banner — never a blank screen */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 64,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: 560,
            background: 'rgba(120,20,20,0.9)',
            border: '1px solid rgba(255,120,120,0.45)',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#ffd9d9',
            fontSize: 13,
            zIndex: 20,
          }}
        >
          <span style={{ flex: 1, wordBreak: 'break-word' }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffd9d9',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading overlay with stage messages */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'rgba(5,6,10,0.78)',
            color: 'white',
            zIndex: 30,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
            Building your 3D deck
          </div>
          <div style={{ fontSize: 15, opacity: 0.75 }}>{STAGES[stage]}</div>
          <div style={{ fontSize: 13, opacity: 0.5 }}>Topic: “{topic}”</div>
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
