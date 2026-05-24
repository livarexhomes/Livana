import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'wouter'
import {
  HeadphonesIcon, ArrowRight, Plus, Send, ChevronLeft,
  Clock, AlertCircle, CheckCircle2, XCircle, Loader2,
  MessageSquare, Ticket,
} from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import { UserLayout } from './UserDashboard'
import { createClient } from '../../lib/supabase'
import { formatDistanceToNow, format } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SupportTicket {
  id: string
  subject: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
}

interface SupportMessage {
  id: string
  ticket_id: string
  sender_role: 'tenant' | 'admin'
  body: string
  created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_META = {
  low:    { label: 'Low',    color: 'text-gray-500',   bg: 'bg-gray-100'   },
  normal: { label: 'Normal', color: 'text-blue-600',   bg: 'bg-blue-50'    },
  high:   { label: 'High',   color: 'text-amber-600',  bg: 'bg-amber-50'   },
  urgent: { label: 'Urgent', color: 'text-red-600',    bg: 'bg-red-50'     },
}

const STATUS_META = {
  open:        { label: 'Open',        icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50',  dot: 'bg-amber-400'  },
  in_progress: { label: 'In Progress', icon: Loader2,       color: 'text-blue-600',   bg: 'bg-blue-50',   dot: 'bg-blue-500'   },
  resolved:    { label: 'Resolved',    icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50',  dot: 'bg-green-500'  },
  closed:      { label: 'Closed',      icon: XCircle,       color: 'text-gray-500',   bg: 'bg-gray-100',  dot: 'bg-gray-400'   },
}

// ── New Ticket Form ───────────────────────────────────────────────────────────

function NewTicketForm({ tenantId, onCreated }: { tenantId: string; onCreated: (t: SupportTicket) => void }) {
  const [subject, setSubject]   = useState('')
  const [priority, setPriority] = useState<SupportTicket['priority']>('normal')
  const [body, setBody]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setLoading(true); setError('')
    const supabase = createClient()

    // Create ticket
    const { data: ticket, error: tErr } = await supabase
      .from('support_tickets')
      .insert({ tenant_id: tenantId, subject: subject.trim(), priority })
      .select()
      .single()
    if (tErr || !ticket) { setError(tErr?.message ?? 'Failed to create ticket'); setLoading(false); return }

    // Post first message
    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_role: 'tenant',
      body: body.trim(),
    })

    setLoading(false)
    onCreated(ticket as SupportTicket)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
          <Ticket className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Submit a Ticket</h3>
          <p className="text-xs text-gray-400">We'll respond as soon as possible</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Subject</label>
          <input
            required
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief description of your issue"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(PRIORITY_META) as [SupportTicket['priority'], typeof PRIORITY_META['low']][]).map(([key, meta]) => (
              <button
                key={key} type="button"
                onClick={() => setPriority(key)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  priority === key
                    ? `${meta.bg} ${meta.color} border-current`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
          <textarea
            required
            rows={4}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Describe the issue in detail…"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Submitting…' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  )
}

// ── Chat Thread ───────────────────────────────────────────────────────────────

function ChatThread({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading]   = useState(true)
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const s = STATUS_META[ticket.status]
  const p = PRIORITY_META[ticket.priority]

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load messages + subscribe to Realtime
  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as SupportMessage[]) ?? [])
        setLoading(false)
      })

    // Realtime subscription — new messages appear instantly
    const channel = supabase
      .channel(`support_messages:${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          setMessages(prev => {
            // Avoid duplicates (optimistic insert already added it)
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as SupportMessage]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ticket.id])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const body = input.trim()
    if (!body || sending) return
    setSending(true)
    setInput('')

    // Optimistic insert
    const optimistic: SupportMessage = {
      id: `opt-${Date.now()}`,
      ticket_id: ticket.id,
      sender_role: 'tenant',
      body,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const supabase = createClient()
    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_role: 'tenant',
      body,
    })
    setSending(false)
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Thread header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{ticket.subject}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>
              {p.label}
            </span>
            <span className="text-[10px] text-gray-400">
              Opened {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            {/* System message */}
            <div className="flex justify-center">
              <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                Ticket opened · {format(new Date(ticket.created_at), 'dd MMM yyyy, h:mm a')}
              </span>
            </div>

            {messages.map(msg => {
              const isTenant = msg.sender_role === 'tenant'
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isTenant ? 'justify-end' : 'justify-start'}`}>
                  {!isTenant && (
                    <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center shrink-0 shadow-sm">
                      <HeadphonesIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isTenant ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isTenant
                        ? 'bg-gray-900 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    } ${msg.id.startsWith('opt-') ? 'opacity-60' : ''}`}>
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                  </div>
                  {isTenant && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
                      <Send className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Resolved/closed notice */}
            {isClosed && (
              <div className="flex justify-center">
                <span className="text-[11px] text-green-700 bg-green-50 border border-green-100 px-3 py-1 rounded-full">
                  {ticket.status === 'resolved' ? '✓ Ticket resolved' : 'Ticket closed'}
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      {!isClosed ? (
        <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any) } }}
            placeholder="Type a message… (Enter to send)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all resize-none"
          />
          <button
            type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400 shrink-0">
          This ticket is {ticket.status}. Open a new ticket if you need further help.
        </div>
      )}
    </div>
  )
}

// ── Main Support Page ─────────────────────────────────────────────────────────

export default function UserSupportPage() {
  const [tenantId, setTenantId]       = useState<string | null>(null)
  const [tickets, setTickets]         = useState<SupportTicket[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: tenant } = await supabase
        .from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) { setLoading(false); return }
      setTenantId(tenant.id)

      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('updated_at', { ascending: false })
      setTickets((data as SupportTicket[]) ?? [])
      setLoading(false)
    })
  }, [])

  // Realtime: update ticket list when status changes
  useEffect(() => {
    if (!tenantId) return
    const supabase = createClient()
    const channel = supabase
      .channel('support_tickets_list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new as SupportTicket : t))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tenantId])

  function handleTicketCreated(ticket: SupportTicket) {
    setTickets(prev => [ticket, ...prev])
    setShowNewForm(false)
    setSelectedId(ticket.id)
  }

  const selected = tickets.find(t => t.id === selectedId) ?? null

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Support">
        <div className="flex gap-5 h-[calc(100vh-130px)]">

          {/* ── Left: ticket list ── */}
          <div className={`flex flex-col gap-3 w-full lg:w-80 xl:w-96 shrink-0 ${selected ? 'hidden lg:flex' : 'flex'}`}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Support</h2>
                <p className="text-xs text-gray-400 mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => { setShowNewForm(v => !v); setSelectedId(null) }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  showNewForm
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> New ticket
              </button>
            </div>

            {/* New ticket form */}
            {showNewForm && tenantId && (
              <NewTicketForm tenantId={tenantId} onCreated={handleTicketCreated} />
            )}

            {/* Ticket list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))
              ) : tickets.length === 0 && !showNewForm ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                    <HeadphonesIcon className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">No tickets yet</h3>
                  <p className="text-xs text-gray-400 mb-4">Submit a ticket and we'll get back to you.</p>
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> New ticket
                  </button>
                </div>
              ) : (
                tickets.map(ticket => {
                  const s = STATUS_META[ticket.status]
                  const p = PRIORITY_META[ticket.priority]
                  const isActive = selectedId === ticket.id
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => { setSelectedId(ticket.id); setShowNewForm(false) }}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                          {ticket.subject}
                        </p>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : `${s.bg} ${s.color}`
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                          isActive ? 'bg-white/15 text-white/80' : `${p.bg} ${p.color}`
                        }`}>
                          {p.label}
                        </span>
                        <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                          {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Right: chat thread ── */}
          <div className={`flex-1 min-w-0 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
            {selected ? (
              <ChatThread
                key={selected.id}
                ticket={selected}
                onBack={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-center p-10">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-bold text-gray-900 mb-1">Select a ticket</p>
                <p className="text-sm text-gray-400">Choose a ticket from the list or create a new one.</p>
              </div>
            )}
          </div>

        </div>
      </UserLayout>
    </AuthGuard>
  )
}
