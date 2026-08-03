// Real-time support alerts for the Admin dashboard.
//
// One realtime channel watches chat_inquiries + chat_messages so the admin is
// alerted the instant a visitor starts a conversation or sends a new message —
// no page refresh. The module also owns the notification sound + mute toggle
// (persisted to localStorage), kept separate from the UI so any component can
// trigger alerts.

import { createClient } from './supabase'

export type SupportAlertEvent =
  | { type: 'new_inquiry'; inquiry: { id: string; name: string; note: string } }
  | { type: 'new_queued'; inquiry: { id: string; name: string; note: string; ticketNo?: string | null } }
  | { type: 'new_message'; inquiryId: string; inquiryName: string; body: string; sender: 'visitor' | 'admin' }

const MUTE_KEY = 'livarex-support-sound-muted'

export function getSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setSoundMuted(muted: boolean) {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1')
    else localStorage.removeItem(MUTE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Play a short "pop" notification using the Web Audio API (no asset file).
 * No-op when muted or when the AudioContext can't be created.
 */
export function playSupportSound(muted: boolean) {
  if (muted) return
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
    osc.onended = () => ctx.close().catch(() => {})
  } catch {
    /* ignore */
  }
}

/**
 * Subscribe to new chat inquiries + new visitor messages. Returns an
 * unsubscribe function. The callback receives a `SupportAlertEvent`.
 */
export function subscribeToSupportAlerts(
  onChange: (event: SupportAlertEvent) => void,
): () => void {
  const supabase = createClient()
  const channel = supabase.channel('admin-support-alerts')

  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_inquiries' },
      (payload) => {
        const row = (payload.new ?? {}) as Record<string, unknown>
        if (row.agent_status === 'queued') {
          // Offline form submission (or a chat that had to be queued).
          onChange({
            type: 'new_queued',
            inquiry: {
              id: String(row.id ?? ''),
              name: String(row.name ?? 'Guest'),
              note: String(row.note ?? ''),
              ticketNo: typeof row.ticket_no === 'string' ? row.ticket_no : null,
            },
          })
          return
        }
        onChange({
          type: 'new_inquiry',
          inquiry: {
            id: String(row.id ?? ''),
            name: String(row.name ?? 'Guest'),
            note: String(row.note ?? ''),
          },
        })
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        const row = (payload.new ?? {}) as Record<string, unknown>
        if (row.sender !== 'visitor') return // only alert on visitor messages
        onChange({
          type: 'new_message',
          inquiryId: String(row.inquiry_id ?? ''),
          inquiryName: 'Visitor',
          body: String(row.body ?? ''),
          sender: 'visitor',
        })
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
