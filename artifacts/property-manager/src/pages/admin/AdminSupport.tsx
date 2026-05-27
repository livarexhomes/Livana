import { useState, useEffect, useRef } from 'react'
import { Link } from 'wouter'
import {
  HeadphonesIcon, Send, Loader2, MessageSquare,
  Clock, CheckCircle2, XCircle, AlertCircle, User,
  ChevronLeft, RefreshCw,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
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
  tenants?: { full_name: string | null; phone: string | null } | null
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
  low:    { label: 'Low',    color: 'text-gray-500',  bg: 'bg-gray-100'  },
  normal: { label: 'Normal', color: 'text-blue-600',  bg: 'bg-blue-50'   },
  high:   { label: 'High',   color: 'text-amber-600', bg: 'bg-amber-50'  },
  urgent: { label: 'Urgent', color: 'text-red-600',   bg: 'bg-red-50'    },
}

const STATUS_META = {
  open:        { label: 'Open',        icon: Clock,        color: 'text-amber-600', bg: 'bg-amber-50',  dot: 'bg-amber-400'  },
  in_progress: { label: 'In Progress', icon: Loader2,      color: 'text-blue-600',  bg: 'bg-blue-50',   dot: 'bg-blue-500'   },
  resolved:    { label: 'Resolved',    icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50',  dot: 'bg-green-500'  },
  closed:      { label: 'Closed',      icon: XCircle,      color: 'text-gray-500',  bg: 'bg-gray-100',  dot: 'bg-gray-400'   },
}

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'] as const

// ── Chat Thread (admin side) ──────────────────────────────────────────────────

function AdminChatThread({
  ticket,
  onBack,
  onStatusChange,
}: {
  ticket: SupportTicket
  onBack: () => void
  onStatusChange: (id: string, status: SupportTicket['status']) => void
}) {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading]   = useState(true)
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const s = STATUS_META[ticket.status]
  const p = PRIORITY_META[ticket.priority]
  const tenantName = ticket.tenants?.full_name ?? 'Tenant'
  const tenantInitial = tenantName[0]?.toUpperCase() ?? 'T'

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
      .channel(`admin_chat:${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as SupportMessage]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ticket.id])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    const body = input.trim()
    if (!body || sending) return
    setSending(true)
    setInput('')

    const optId = `opt-${Date.now()}`

    // Optimistic insert
    const optimistic: SupportMessage = {
      id: optId,
      ticket_id: ticket.id,
      sender_role: 'admin',
      body,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const supabase = createClient()
    const { data: inserted } = await supabase
      .from('support_messages')
      .insert({ ticket_id: ticket.id, sender_role: 'admin', body })
      .select()
      .single()

    // Replace optimistic entry with the real row (avoids Realtime duplicate)
    if (inserted) {
      setMessages(prev => prev.map(m => m.id === optId ? inserted as SupportMessage : m))
    }

    // Auto-move to in_progress on first admin reply if still open
    if (ticket.status === 'open') {
      await updateStatus('in_progress')
    }

    setSending(false)
  }

  async function updateStatus(newStatus: SupportTicket['status']) {
    setUpdatingStatus(true)
    const supabase = createClient()
    await supabase.from('support_tickets').update({ status: newStatus }).eq('id', ticket.id)
    onStatusChange(ticket.id, newStatus)
    setUpdatingStatus(false)
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Tenant avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-sm font-bold text-white">{tenantInitial}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-sm truncate">{ticket.subject}</p>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>
              {p.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            From <span className="font-semibold text-gray-600">{tenantName}</span>
            {ticket.tenants?.phone && <span> · {ticket.tenants.phone}</span>}
            <span> · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
          </p>
        </div>

        {/* Status changer */}
        <div className="relative shrink-0">
          <select
            value={ticket.status}
            onChange={e => updateStatus(e.target.value as SupportTicket['status'])}
            disabled={updatingStatus}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer disabled:opacity-50"
          >
            {STATUS_OPTIONS.map(st => (
              <option key={st} value={st}>{STATUS_META[st].label}</option>
            ))}
          </select>
          {updatingStatus
            ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400 pointer-events-none" />
            : <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          }
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
            <div className="flex justify-center">
              <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                Ticket opened · {format(new Date(ticket.created_at), 'dd MMM yyyy, h:mm a')}
              </span>
            </div>

            {messages.map(msg => {
              const isAdmin = msg.sender_role === 'admin'
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  {!isAdmin && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-xs font-bold text-white">{tenantInitial}</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isAdmin
                        ? 'bg-gray-900 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    } ${msg.id.startsWith('opt-') ? 'opacity-60' : ''}`}>
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">
                      {isAdmin ? 'You' : tenantName} · {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center shrink-0 shadow-sm">
                      <HeadphonesIcon className="w-3.5 h-3.5 text-white" />
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
        <form onSubmit={sendReply} className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as any) } }}
            placeholder="Reply to tenant… (Enter to send)"
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
          Ticket is {ticket.status}. Change status to reopen.
        </div>
      )}
    </div>
  )
}

// ── Main Admin Support Page ───────────────────────────────────────────────────

export default function AdminSupportPage() {
  const [tickets, setTickets]       = useState<SupportTicket[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [user, setUser] = useState<{ email?: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))

    supabase
      .from('support_tickets')
      .select('*, tenants(full_name, phone)')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setTickets((data as SupportTicket[]) ?? [])
        setLoading(false)
      })
  }, [])

  // Realtime: new tickets + status updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin_tickets_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
        setTickets(prev => [payload.new as SupportTicket, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, (payload) => {
        setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } as SupportTicket : t))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  function handleStatusChange(id: string, status: SupportTicket['status']) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus)
  const selected = tickets.find(t => t.id === selectedId) ?? null

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  }

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <HeadphonesIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-gray-900">Support Inbox</h1>
                <p className="text-xs text-gray-400">{counts.open} open · {counts.in_progress} in progress</p>
              </div>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden gap-0">

            {/* ── Left: ticket list ── */}
            <div className={`flex flex-col border-r border-gray-100 bg-white w-full lg:w-80 xl:w-96 shrink-0 ${selected ? 'hidden lg:flex' : 'flex'}`}>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 px-3 py-3 border-b border-gray-50 overflow-x-auto no-scrollbar">
                {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(key => (
                  <button key={key} onClick={() => setFilterStatus(key)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      filterStatus === key
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}>
                    {key === 'all' ? 'All' : STATUS_META[key].label}
                    <span className={`text-[10px] font-bold px-1 rounded ${filterStatus === key ? 'text-white/70' : 'text-gray-400'}`}>
                      {counts[key]}
                    </span>
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4 rounded-xl animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm font-semibold text-gray-400">No tickets</p>
                  </div>
                ) : (
                  filtered.map(ticket => {
                    const s = STATUS_META[ticket.status]
                    const p = PRIORITY_META[ticket.priority]
                    const isActive = selectedId === ticket.id
                    const tenantName = ticket.tenants?.full_name ?? 'Tenant'
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedId(ticket.id)}
                        className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-all ${
                          isActive ? 'bg-gray-900' : 'hover:bg-gray-50'
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
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`flex items-center gap-1 text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                            <User className="w-3 h-3" />
                            {tenantName}
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isActive ? 'bg-white/15 text-white/80' : `${p.bg} ${p.color}`
                          }`}>
                            {p.label}
                          </span>
                          <span className={`text-[11px] ml-auto ${isActive ? 'text-white/50' : 'text-gray-400'}`}>
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
            <div className={`flex-1 min-w-0 p-4 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
              {selected ? (
                <AdminChatThread
                  key={selected.id}
                  ticket={selected}
                  onBack={() => setSelectedId(null)}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-center p-10 h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                    <HeadphonesIcon className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-bold text-gray-900 mb-1">Select a ticket</p>
                  <p className="text-sm text-gray-400">Choose a ticket from the inbox to reply.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
