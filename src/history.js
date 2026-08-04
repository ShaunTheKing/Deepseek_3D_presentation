// Deck history persisted in localStorage (Phase 2). Pure module — safe to import
// anywhere; storage access is guarded so SSR and Node tests never crash.

const KEY = 'deepseek-3d-history'
const MAX = 10

function storage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export function loadHistory() {
  const s = storage()
  if (!s) return []
  try {
    const parsed = JSON.parse(s.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveToHistory(entry) {
  const s = storage()
  if (!s) return loadHistory()
  const next = [entry, ...loadHistory()].slice(0, MAX)
  try {
    s.setItem(KEY, JSON.stringify(next))
  } catch {
    // Quota exceeded — history is best-effort; keep the in-memory list.
  }
  return next
}

export function clearHistory() {
  const s = storage()
  if (s) s.removeItem(KEY)
}
