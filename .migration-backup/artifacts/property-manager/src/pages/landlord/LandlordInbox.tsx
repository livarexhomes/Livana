import { useState, useEffect, useRef } from 'react'
import {
  MessageSquare, Send, X, ChevronLeft, Plus, HeadphonesIcon,
  Inbox, Clock, CheckCircle2, XCircle, Loader2, RefreshCw,
} from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'
import { formatDistanceToNow, format } from 'date-fns'

const STATUS_META = {
  open:        { label: 'Open',        icon: Clock,        color: 'text-amber-600', bg: 'bg-amber-50',  dot: 'bg-amber-400' },
  in_progress: { label: 'In Progress', icon: Loader2,      color: 'text-blue-600',  bg: 'bg-blue-50',   dot: 'bg-blue-500'  },
  resolved:    { label: 'Resolved',    icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50',  dot: 'bg-green-500' },
  closed:      { label: 'Closed',      icon: XCircle,      color: 'text-gray-500',  bg: 'bg-gray-100',  dot: 'bg-gray-400'  },
}

const PRIORITY_META = {
  low:    { label: 'Low',    color: 'text-gray-500',  bg: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600',  bg: 'bg-blue-50'  },
  high:   { label: 'High',   color: 'text-amber-600', bg: 'bg-amber-50' },
  urgent: { label: 'Urgent', color: 'text-red-600',   bg: 'bg-red-50'   },
}

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'] as const

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
  sender_role: 'landlord' | 'admin'
  body: string
  created_at: string
}

// ── ChatThread Component ────────────────────────────────────────────────────

function ChatThread({
  ticket,
  landlord,
  onBack,
  onStatusChange,
}: {
  ticket: SupportTicket
  landlord: Landlord | null
  onBack: () => void
  onStatusChange: (id: string, status: SupportTicket['status']) => void
}) {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const s = STATUS_META[ticket.status]
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

    const channel = supabase
      .channel(`landlord_chat:${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.find((m) => m.id === payload.new.id)
              ? prev
              : [...prev, payload.new as SupportMessage]
          )
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket.id])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    const body = input.trim()
    if (!body || sending || isClosed) return

    setSending(true)
    setInput('')

    const optId = `opt-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: optId,
        ticket_id: ticket.id,
        sender_role: 'landlord',
        body,
        created_at: new Date().toISOString(),
      },
    ])

    const supabase = createClient()
    const { data: inserted, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_role: 'landlord',
        body,
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
    }

    if (inserted) {
      console.log('Message sent:', inserted)
      setMessages((prev) =>
        prev.map((m) => (m.id === optId ? (inserted as SupportMessage) : m))
      )
    }

    setSending(false)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <HeadphonesIcon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-sm truncate">{ticket.subject}</p>
            <span
              className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Started {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#F7F8FC]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <span className="text-[11px] text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
                Ticket opened · {format(new Date(ticket.created_at), 'dd MMM yyyy, h:mm a')}
              </span>
            </div>
            {messages.map((msg) => {
              const isLandlord = msg.sender_role === 'landlord'
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isLandlord ? 'justify-end' : 'justify-start'}`}
                >
                  {!isLandlord && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0 shadow-sm">
                      <HeadphonesIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] flex flex-col gap-1 ${isLandlord ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isLandlord
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                      } ${msg.id.startsWith('opt-') ? 'opacity-60' : ''}`}
                    >
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">
                      {isLandlord ? 'You' : 'Support'} ·{' '}
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                  </div>
                  {isLandlord && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-[9px] font-bold text-white">
                        {landlord?.full_name?.[0]?.toUpperCase() || 'L'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
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

      {/* Reply input */}
      {!isClosed ? (
        <form onSubmit={sendReply} className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0 bg-white">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendReply(e as any)
              }
            }}
            placeholder="Type your message… (Enter to send)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400 shrink-0 bg-gray-50">
          This ticket is {ticket.status}. Contact support if you need further assistance.
        </div>
      )}
    </div>
  )
}

// ── NewTicketModal Component ────────────────────────────────────────────────

function NewTicketModal({
  landlordId,
  onClose,
  onCreated,
}: {
  landlordId: string
  onClose: () => void
  onCreated: (ticket: SupportTicket) => void
}) {
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim() || submitting) return

    setSubmitting(true)
    const supabase = createClient()

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        landlord_id: landlordId,
        subject: subject.trim(),
        priority,
        status: 'open',
      })
      .select()
      .single()

    if (ticketError || !ticket) {
      setSubmitting(false)
      alert('Failed to create ticket. Please try again.')
      return
    }

    // Create first message
    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_role: 'landlord',
      body: message.trim(),
    })

    setSubmitting(false)
    onCreated(ticket as SupportTicket)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">New Support Ticket</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
            <div className="flex gap-2">
              {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    priority === p
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main LandlordInbox Component ────────────────────────────────────────────

export default function LandlordInbox() {
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })

      const { data: l } = await supabase
        .from('landlords')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setLandlord(l)

      if (l) {
        // Load tickets
        const { data } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('landlord_id', l.id)
          .order('updated_at', { ascending: false })

        const ticketList = (data as SupportTicket[]) ?? []
        setTickets(ticketList)

        // Auto-select first open ticket
        const firstOpen = ticketList.find((t) => t.status === 'open')
        if (firstOpen) {
          setSelectedId(firstOpen.id)
        } else if (ticketList.length > 0) {
          setSelectedId(ticketList[0].id)
        }
      }

      setLoading(false)
    })
  }, [])

  // Subscribe to ticket updates
  useEffect(() => {
    if (!landlord) return

    const supabase = createClient()
    const channel = supabase
      .channel('landlord_tickets')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => {
          if (payload.new.landlord_id === landlord.id) {
            setTickets((prev) => [payload.new as SupportTicket, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        (payload) => {
          setTickets((prev) =>
            prev.map((t) =>
              t.id === payload.new.id ? { ...t, ...payload.new } as SupportTicket : t
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [landlord])

  function handleStatusChange(id: string, status: SupportTicket['status']) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
  }

  function handleTicketCreated(ticket: SupportTicket) {
    setTickets((prev) => [ticket, ...prev])
    setSelectedId(ticket.id)
    setShowNewTicket(false)
    setMobileView('thread')
  }

  function selectTicket(id: string) {
    setSelectedId(id)
    setMobileView('thread')
  }

  const filtered =
    filterStatus === 'all' ? tickets : tickets.filter((t) => t.status === filterStatus)
  const selected = tickets.find((t) => t.id === selectedId) ?? null

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  }

  // ── List Panel ────────────────────────────────────────────────────────────
  const ListPanel = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Support Tickets</h2>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Ticket
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterStatus(key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {key === 'all' ? 'All' : STATUS_META[key].label}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  filterStatus === key ? 'bg-white/20 text-white' : 'bg-white text-gray-400'
                }`}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Inbox className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-500">No tickets yet</p>
            <p className="text-xs text-gray-400 mt-1">Create a ticket to get support from our team.</p>
          </div>
        ) : (
          filtered.map((ticket) => {
            const s = STATUS_META[ticket.status]
            const p = PRIORITY_META[ticket.priority]
            const isActive = selectedId === ticket.id
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => selectTicket(ticket.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-colors ${
                  isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isActive ? 'text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    {ticket.subject}
                  </p>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/80' : s.bg
                    } ${isActive ? 'text-blue-700' : s.color}`}
                  >
                    <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}
                  >
                    {p.label}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-auto">
                    {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <AuthGuard require="landlord">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <LandlordSidebar
          userName={landlord?.full_name}
          userEmail={user?.email}
          isVerified={landlord?.is_verified}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center gap-3 pl-14 pr-4 md:px-6 py-4 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Support Center</h1>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {counts.open} open
            </span>
            {counts.in_progress > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                <Loader2 className="w-3 h-3" />
                {counts.in_progress} in progress
              </span>
            )}
          </header>

          {/* Two-panel layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: list */}
            <div
              className={`
              w-full md:w-80 lg:w-96 shrink-0 bg-white border-r border-gray-100 overflow-hidden flex flex-col
              ${mobileView === 'thread' ? 'hidden md:flex' : 'flex'}
            `}
            >
              <ListPanel />
            </div>

            {/* Right: thread */}
            <div
              className={`
              flex-1 bg-white overflow-hidden flex flex-col
              ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
            `}
            >
              {selected ? (
                <ChatThread
                  key={selected.id}
                  ticket={selected}
                  landlord={landlord}
                  onBack={() => setMobileView('list')}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
                  <p className="text-sm font-semibold text-gray-500">Select a ticket</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Choose a ticket from the list to view the conversation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New Ticket Modal */}
        {showNewTicket && landlord && (
          <NewTicketModal
            landlordId={landlord.id}
            onClose={() => setShowNewTicket(false)}
            onCreated={handleTicketCreated}
          />
        )}
      </div>
    </AuthGuard>
  )
}
