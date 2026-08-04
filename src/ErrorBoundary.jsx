import React from 'react'

// Catches any render/runtime error so the page never goes blank.
export default class ErrorBoundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#05060a',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            Something went wrong
          </div>
          <div
            style={{
              fontSize: 14,
              opacity: 0.8,
              marginBottom: 20,
              maxWidth: 520,
              wordBreak: 'break-word',
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button
            onClick={() => location.reload()}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
