// Minimal pub/sub so that when the admin saves Listing Rules (e.g. a new
// Agency Fee percentage), forms already open in other tabs pick up the change.

type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeListingRulesChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyListingRulesChange() {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch (err) {
      console.error('[settings-store] listener error:', err)
    }
  })
}
