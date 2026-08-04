import { useEffect, useRef, useState } from 'react'
import { DECK as FALLBACK_DECK } from './deck'
import { generateDeck, routeQuestion, generateInsertSlides } from './generator'
import { loadHistory, saveToHistory, clearHistory } from './history'
import Scene, { controlsAPI, preloadAssets } from './Scene'

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
  const [muted, setMuted] = useState(false)
  const [ask, setAsk] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState(null)
  const askRef = useRef(null)
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
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
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

  // Phase 4: live adaptation — router decides insert vs answer overlay.
  const askQuestion = async () => {
    const q = ask.trim()
    if (!q || asking || loading) return
    setAsking(true)
    setError(null)
    try {
      const decision = await routeQuestion(q, DECK, idx)
      if (decision.mode === 'answer') {
        setAnswer(decision.answer)
      } else {
        const sub = await generateInsertSlides(q, DECK, idx)
        preloadAssets(sub)
        const newSlides = [...DECK.slides.slice(0, idx + 1), ...sub.slides, ...DECK.slides.slice(idx + 1)]
        const spliced = { ...DECK, slides: newSlides }
        setDeck(spliced)
        setIdx(idx + 1) // camera flies to the first spliced slide
        setGenerated(true)
        setHistoryList(saveToHistory({ topic: DECK.title + ' + live', deck: spliced, ts: Date.now() }))
        setAsk('')
      }
    } catch (e) {
      setError('Ask failed: ' + e.message)
    }
    setAsking(false)
  }

  const go = (dir) =>
    setIdx((i) => Math.max(0, Math.min(DECK.slides.length - 1, i + dir)))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'Escape') {
        setShowHistory(false)
        setAnswer(null)
      }
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        askRef.current?.focus()
      }
      if ((e.key === '+' || e.key === '=') && e.target.tagName !== 'INPUT') {
        e.preventDefault()
        controlsAPI.zoomIn?.()
      }
      if ((e.key === '-' || e.key === '_') && e.target.tagName !== 'INPUT') {
        e.preventDefault()
        controlsAPI.zoomOut?.()
      }
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

  // Narration: read the slide's notes aloud (speechSynthesis, muted toggle).
  useEffect(() => {
    if (muted || typeof speechSynthesis === 'undefined' || !slide?.notes) return
    const t = setTimeout(() => {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(slide.notes)
      u.rate = 1.02
      speechSynthesis.speak(u)
    }, 450)
    return () => {
      clearTimeout(t)
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    }
  }, [idx, muted, slide])

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

      {/* Ask bar — live adaptation */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          ref={askRef}
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
          placeholder="Ask the deck… ( / )"
          disabled={asking || loading}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            width: 260,
            outline: 'none',
          }}
        />
        <button
          style={{ ...btn, opacity: asking || loading ? 0.6 : 1 }}
          onClick={askQuestion}
          disabled={asking || loading || !ask.trim()}
        >
          {asking ? 'Thinking…' : 'Ask'}
        </button>
      </div>

      {/* Live answer overlay */}
      {answer && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,6,10,0.55)',
            zIndex: 25,
          }}
          onClick={() => setAnswer(null)}
        >
          <div
            style={{
              maxWidth: 560,
              background: 'rgba(15,18,28,0.96)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 14,
              padding: '22px 26px',
              color: 'white',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>Live answer</div>
            <div style={{ fontSize: 16, lineHeight: 1.55 }}>{answer}</div>
            <button style={{ ...btn, marginTop: 16 }} onClick={() => setAnswer(null)}>
              Got it
            </button>
          </div>
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
        <button style={btn} onClick={() => controlsAPI.zoomOut?.()} title="Zoom out (−)">
          −
        </button>
        <button style={btn} onClick={() => controlsAPI.zoomIn?.()} title="Zoom in (+)">
          +
        </button>
        <button
          style={{ ...btn, opacity: muted ? 0.6 : 1 }}
          onClick={() => setMuted((m) => !m)}
          disabled={loading}
          title={muted ? 'Unmute narration' : 'Mute narration'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
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
