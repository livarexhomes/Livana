import { useState, useEffect, useRef, useMemo } from 'react'
import {
  HeadphonesIcon, Send, Loader2, MessageSquare,
  Clock, CheckCircle2, XCircle, User,
  ChevronLeft, RefreshCw, Inbox, Building2,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient } from '../../lib/supabase'
import { formatDistanceToNow, format } from 'date-fns'

interface SupportTicket {
  id: string
  subject: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  tenant_id?: string | null
  landlord_id?: string | null
  tenants?: { full_name: string | null; phone: string | null } | null
  landlords?: { full_name: string | null; whatsapp: string | null } | null
}

interface SupportMessage {
  id: string
  ticket_id: string
  sender_role: 'tenant' | 'landlord' | 'admin'
  body: string
  created_at: string
}

interface Enquiry {
  id: string
  message: string
  status: 'open' | 'replied' | 'closed'
  created_at: string
  updated_at: string
  tenant_id?: string
  tenants?: { full_name: string | null; phone: string | null } | null
  properties?: { title: string | null; city: string | null; address: string | null } | null
}

interface ChatInquiry {
  id: string
  name: string
  note: string
  phone: string | null
  visitor_id: string | null
  read_by_admin: boolean
  status: 'open' | 'replied' | 'closed'
  created_at: string
  updated_at: string
}

interface ChatMessage {
  id: string
  inquiry_id: string
  sender: 'visitor' | 'admin'
  body: string
  read_by_admin: boolean
  created_at: string
}

interface EnquiryReply {
  id: string
  enquiry_id: string
  message: string
  created_at: string
  sender_role: 'landlord' | 'admin'
  landlords?: { full_name: string | null } | null
  admins?: { email: string | null } | null
}

const PRIORITY_META = {
  low:    { label: 'Low',    color: 'text-gray-500',  bg: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600',  bg: 'bg-blue-50'  },
  high:   { label: 'High',   color: 'text-amber-600', bg: 'bg-amber-50' },
  urgent: { label: 'Urgent', color: 'text-red-600',   bg: 'bg-red-50'   },
}

const STATUS_META = {
  open:        { label: 'Open',        icon: Clock,        color: 'text-amber-600', bg: 'bg-amber-50',  dot: 'bg-amber-400' },
  in_progress: { label: 'In Progress', icon: Loader2,      color: 'text-blue-600',  bg: 'bg-blue-50',   dot: 'bg-blue-500'  },
  resolved:    { label: 'Resolved',    icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50',  dot: 'bg-green-500' },
  closed:      { label: 'Closed',      icon: XCircle,      color: 'text-gray-500',  bg: 'bg-gray-100',  dot: 'bg-gray-400'  },
}

const ENQUIRY_STATUS_META = {
  open:    { label: 'Open',    color: 'text-amber-600', bg: 'bg-amber-50',  dot: 'bg-amber-400' },
  replied: { label: 'Replied', color: 'text-blue-600',  bg: 'bg-blue-50',   dot: 'bg-blue-500'  },
  closed:  { label: 'Closed',  color: 'text-gray-500',  bg: 'bg-gray-100',  dot: 'bg-gray-400'  },
}

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'] as const

// ── AdminChatThread ───────────────────────────────────────────────────────────

function AdminChatThread({
  ticket, onBack, onStatusChange,
}: {
  ticket: SupportTicket
  onBack: () => void
  onStatusChange: (id: string, status: SupportTicket['status']) => void
}) {
  const [messages, setMessages]   = useState<SupportMessage[]>([])
  const [loading, setLoading]     = useState(true)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const s = STATUS_META[ticket.status]
  const p = PRIORITY_META[ticket.priority]
  const isLandlordTicket = !!ticket.landlord_id
  const senderName = isLandlordTicket
    ? (ticket.landlords?.full_name ?? 'Landlord')
    : (ticket.tenants?.full_name ?? 'Tenant')
  const senderInitial = senderName[0]?.toUpperCase() ?? (isLandlordTicket ? 'L' : 'T')

  useEffect(() => { 
    console.log('Messages updated, count:', messages.length)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) 
  }, [messages])

  useEffect(() => {
    const supabase = createClient()
    console.log('Loading messages for ticket:', ticket.id)
    supabase.from('support_messages').select('*').eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => { 
        if (error) console.error('Error loading messages:', error)
        console.log('Initial messages loaded:', data?.length || 0, data)
        setMessages((data as SupportMessage[]) ?? []); 
        setLoading(false) 
      })

    const channel = supabase.channel(`admin_chat:${ticket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          console.log('New message received:', payload.new)
          setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new as SupportMessage])
        })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })
    return () => { supabase.removeChannel(channel) }
  }, [ticket.id])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    const body = input.trim()
    if (!body || sending) return
    setSending(true); setInput('')
    const optId = `opt-${Date.now()}`
    setMessages(prev => [...prev, { id: optId, ticket_id: ticket.id, sender_role: 'admin', body, created_at: new Date().toISOString() }])
    const supabase = createClient()
    const { data: inserted } = await supabase.from('support_messages')
      .insert({ ticket_id: ticket.id, sender_role: 'admin', body }).select().single()
    if (inserted) setMessages(prev => prev.map(m => m.id === optId ? inserted as SupportMessage : m))
    if (ticket.status === 'open') await updateStatus('in_progress')
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm ${isLandlordTicket ? 'from-violet-500 to-purple-600' : 'from-blue-500 to-cyan-500'}`}>
          <span className="text-sm font-bold text-white">{senderInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-sm truncate">{ticket.subject}</p>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
            </span>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>{p.label}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            From <span className="font-semibold text-gray-600">{senderName}</span>
            {isLandlordTicket
              ? (ticket.landlords?.whatsapp && <span> · {ticket.landlords.whatsapp}</span>)
              : (ticket.tenants?.phone && <span> · {ticket.tenants.phone}</span>)}
            <span> · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
          </p>
        </div>
        <div className="relative shrink-0">
          <select value={ticket.status} onChange={e => updateStatus(e.target.value as SupportTicket['status'])}
            disabled={updatingStatus}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer disabled:opacity-50">
            {STATUS_OPTIONS.map(st => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
          </select>
          {updatingStatus
            ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400 pointer-events-none" />
            : <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <>
            <div className="flex justify-center">
              <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                Ticket opened · {format(new Date(ticket.created_at), 'dd MMM yyyy, h:mm a')}
              </span>
            </div>
            {messages.map(msg => {
              const isAdmin = msg.sender_role === 'admin'
              const isFromLandlord = msg.sender_role === 'landlord'
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  {!isAdmin && (
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm ${isFromLandlord ? 'from-violet-500 to-purple-600' : 'from-blue-500 to-cyan-500'}`}>
                      <span className="text-xs font-bold text-white">{senderInitial}</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isAdmin ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'} ${msg.id.startsWith('opt-') ? 'opacity-60' : ''}`}>
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">
                      {isAdmin ? 'You' : senderName} · {format(new Date(msg.created_at), 'h:mm a')}
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

      {!isClosed ? (
        <form onSubmit={sendReply} className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
          <textarea rows={1} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as any) } }}
            placeholder={`Reply to ${isLandlordTicket ? 'landlord' : 'tenant'}… (Enter to send)`}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all resize-none" />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0">
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

// ── EnquiryDetail ─────────────────────────────────────────────────────────────

function EnquiryDetail({ enquiry, onBack, onStatusChange }: {
  enquiry: Enquiry
  onBack: () => void
  onStatusChange: (id: string, status: Enquiry['status']) => void
}) {
  const [replies, setReplies]   = useState<EnquiryReply[]>([])
  const [loading, setLoading]   = useState(true)
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [updating, setUpdating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  
  const s = ENQUIRY_STATUS_META[enquiry.status]
  const tenantName    = enquiry.tenants?.full_name ?? 'Tenant'
  const tenantInitial = tenantName[0]?.toUpperCase() ?? 'T'
  const propertyTitle = enquiry.properties?.title ?? 'Property'
  const propertyCity  = enquiry.properties?.city  ?? ''
  const isClosed = enquiry.status === 'closed'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  useEffect(() => {
    const supabase = createClient()
    // Load replies
    supabase
      .from('enquiry_replies')
      .select('*, landlords(full_name), admins(email)')
      .eq('enquiry_id', enquiry.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Error loading replies:', error)
        setReplies((data as EnquiryReply[]) ?? [])
        setLoading(false)
      })

    // Realtime subscription for new replies
    const channel = supabase.channel(`enquiry_replies:${enquiry.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'enquiry_replies', filter: `enquiry_id=eq.${enquiry.id}` },
        async (payload) => {
          // Fetch full reply with sender info
          const { data } = await supabase
            .from('enquiry_replies')
            .select('*, landlords(full_name), admins(email)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setReplies(prev => [...prev, data as EnquiryReply])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enquiry.id])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    const body = input.trim()
    if (!body || sending) return
    
    setSending(true)
    setInput('')
    
    const supabase = createClient()
    
    // Insert reply as admin
    const { data: inserted, error } = await supabase
      .from('enquiry_replies')
      .insert({ 
        enquiry_id: enquiry.id, 
        message: body,
        sender_role: 'admin'
      })
      .select('*, landlords(full_name), admins(email)')
      .single()
    
    if (error) {
      console.error('Error sending reply:', error)
      setSending(false)
      return
    }
    
    if (inserted) {
      setReplies(prev => [...prev, inserted as EnquiryReply])
    }
    
    // Update status to replied if it was open
    if (enquiry.status === 'open') {
      await supabase.from('enquiries').update({ status: 'replied' }).eq('id', enquiry.id)
      onStatusChange(enquiry.id, 'replied')
    }
    
    setSending(false)
  }

  async function changeStatus(newStatus: Enquiry['status']) {
    setUpdating(true)
    const supabase = createClient()
    await supabase.from('enquiries').update({ status: newStatus }).eq('id', enquiry.id)
    onStatusChange(enquiry.id, newStatus)
    setUpdating(false)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-sm font-bold text-white">{tenantInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-sm truncate">{tenantName}</p>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {enquiry.tenants?.phone && <span>{enquiry.tenants.phone} · </span>}
            {formatDistanceToNow(new Date(enquiry.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="relative shrink-0">
          <select value={enquiry.status} onChange={e => changeStatus(e.target.value as Enquiry['status'])}
            disabled={updating}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50">
            <option value="open">Open</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
          {updating
            ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400 pointer-events-none" />
            : <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />}
        </div>
      </div>

      {/* Body - Chat Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            {/* Property info */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-blue-900 truncate">{propertyTitle}</p>
                {propertyCity && <p className="text-xs text-blue-600 mt-0.5">{propertyCity}</p>}
              </div>
            </div>

            <div className="flex justify-center">
              <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                Enquiry received · {format(new Date(enquiry.created_at), 'dd MMM yyyy, h:mm a')}
              </span>
            </div>

            {/* Original enquiry message */}
            <div className="flex items-end gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-xs font-bold text-white">{tenantInitial}</span>
              </div>
              <div className="max-w-[75%] flex flex-col gap-1 items-start">
                <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed bg-gray-100 text-gray-800 rounded-bl-sm">
                  {enquiry.message}
                </div>
                <span className="text-[10px] text-gray-400 px-1">
                  {tenantName} · {format(new Date(enquiry.created_at), 'h:mm a')}
                </span>
              </div>
            </div>

            {/* Replies */}
            {replies.map(reply => {
              const isAdmin = reply.sender_role === 'admin'
              const senderName = isAdmin 
                ? (reply.admins?.email?.split('@')[0] ?? 'Admin')
                : (reply.landlords?.full_name ?? 'Landlord')
              return (
                <div key={reply.id} className={`flex items-end gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  {!isAdmin && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-xs font-bold text-white">L</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isAdmin ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                      {reply.message}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">
                      {isAdmin ? 'You' : senderName} · {format(new Date(reply.created_at), 'h:mm a')}
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
                  ✓ This enquiry has been closed
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
            placeholder="Type your reply... (Enter to send)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" 
          />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400 shrink-0">
          This enquiry is closed. Change status to reopen.
        </div>
      )}
    </div>
  )
}

// ── ChatRequestDetail ─────────────────────────────────────────────────────────

function ChatRequestDetail({ inquiry, onBack, onMarkRead, onStatusChange }: {
  inquiry: ChatInquiry
  onBack: () => void
  onMarkRead: (id: string) => void
  onStatusChange: (id: string, status: ChatInquiry['status']) => void
}) {
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [loading, setLoading]     = useState(true)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [updating, setUpdating]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const s = ENQUIRY_STATUS_META[inquiry.status]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('chat_messages').select('*')
      .eq('inquiry_id', inquiry.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Error loading chat messages:', error)
        setMessages((data as ChatMessage[]) ?? [])
        setLoading(false)
      })

    const channel = supabase.channel(`admin_chat_inquiry:${inquiry.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `inquiry_id=eq.${inquiry.id}` },
        (payload) => {
          setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new as ChatMessage])
        })
      .subscribe()

    // Opening the thread marks it as read
    supabase.from('chat_inquiries').update({ read_by_admin: true }).eq('id', inquiry.id)
    onMarkRead(inquiry.id)

    return () => { supabase.removeChannel(channel) }
  }, [inquiry.id])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    const body = input.trim()
    if (!body || sending) return
    setSending(true); setInput('')
    const optId = `opt-${Date.now()}`
    setMessages(prev => [...prev, { id: optId, inquiry_id: inquiry.id, sender: 'admin', body, read_by_admin: true, created_at: new Date().toISOString() }])
    const supabase = createClient()
    const { data: inserted } = await supabase.from('chat_messages')
      .insert({ inquiry_id: inquiry.id, sender: 'admin', body }).select().single()
    if (inserted) setMessages(prev => prev.map(m => m.id === optId ? inserted as ChatMessage : m))
    // Reply counts as read; auto-advance status open → replied
    await supabase.from('chat_inquiries').update({ read_by_admin: true }).eq('id', inquiry.id)
    onMarkRead(inquiry.id)
    if (inquiry.status === 'open') {
      await supabase.from('chat_inquiries').update({ status: 'replied' }).eq('id', inquiry.id)
      onStatusChange(inquiry.id, 'replied')
    }
    setSending(false)
  }

  async function changeStatus(newStatus: ChatInquiry['status']) {
    setUpdating(true)
    const supabase = createClient()
    await supabase.from('chat_inquiries').update({ status: newStatus }).eq('id', inquiry.id)
    onStatusChange(inquiry.id, newStatus)
    setUpdating(false)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-sm font-bold text-white">{inquiry.name[0]?.toUpperCase() ?? 'U'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-sm">{inquiry.name}</p>
            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {inquiry.phone && <span>{inquiry.phone} · </span>}
            {format(new Date(inquiry.created_at), 'dd MMM yyyy, h:mm a')}
          </p>
        </div>
        <div className="relative shrink-0">
          <select value={inquiry.status} onChange={e => changeStatus(e.target.value as ChatInquiry['status'])}
            disabled={updating}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50">
            <option value="open">Open</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
          {updating
            ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400 pointer-events-none" />
            : <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />}
        </div>
      </div>

      {/* Body — chat thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {/* Original visitor message */}
        <div className="flex items-end gap-2 justify-start">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">{inquiry.name[0]?.toUpperCase() ?? 'U'}</span>
          </div>
          <div className="max-w-[75%] flex flex-col gap-1 items-start">
            <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed bg-gray-100 text-gray-800 rounded-bl-sm">
              {inquiry.note}
            </div>
            <span className="text-[10px] text-gray-400 px-1">
              {inquiry.name} · {format(new Date(inquiry.created_at), 'h:mm a')}
            </span>
          </div>
        </div>

        {/* Thread messages */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : (
          messages.map(msg => {
            const isAdmin = msg.sender === 'admin'
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                {!isAdmin && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-white">{inquiry.name[0]?.toUpperCase() ?? 'U'}</span>
                  </div>
                )}
                <div className={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isAdmin ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'} ${msg.id.startsWith('opt-') ? 'opacity-60' : ''}`}>
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">
                    {isAdmin ? 'You' : inquiry.name} · {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
                {isAdmin && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                    <HeadphonesIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {inquiry.status !== 'closed' ? (
        <form onSubmit={sendReply} className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
          <textarea rows={1} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as any) } }}
            placeholder={`Reply to ${inquiry.name}… (Enter to send)`}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none" />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400 shrink-0">
          This request is closed. Change status to reopen.
        </div>
      )}
    </div>
  )
}

// ── SupportTab ────────────────────────────────────────────────────────────────

function SupportTab() {
  const [tickets, setTickets]       = useState<SupportTicket[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const supabase = createClient()
    console.log('Loading tickets...')
    supabase.from('support_tickets').select('*, tenants(full_name, phone), landlords(full_name, whatsapp)')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => { 
        if (error) console.error('Error loading tickets:', error)
        console.log('Tickets loaded:', data?.length || 0, data)
        setTickets((data as SupportTicket[]) ?? []); 
        setLoading(false) 
      })

    const channel = supabase.channel('admin_tickets_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => setTickets(prev => [payload.new as SupportTicket, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        (payload) => setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } as SupportTicket : t)))
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
    <div className="flex flex-1 overflow-hidden gap-3">
      {/* Ticket list */}
      <div className={`flex flex-col border border-slate-200 bg-white w-full lg:w-64 xl:w-72 shrink-0 overflow-hidden ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Support queue</p>
              <h2 className="text-base font-bold text-slate-950">Tickets</h2>
            </div>
            <span className="text-[11px] text-slate-500">{tickets.length} total</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(key => (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filterStatus === key ? 'bg-slate-950 text-white border-slate-950' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                {key === 'all' ? 'All' : STATUS_META[key].label}
                <span className={`text-[10px] font-bold ${filterStatus === key ? 'text-white/70' : 'text-slate-400'}`}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-3xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquare className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">No tickets</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(ticket => {
                const s = STATUS_META[ticket.status]
                const p = PRIORITY_META[ticket.priority]
                const isActive = selectedId === ticket.id
                const isLandlordTicket = !!ticket.landlord_id
                const senderName = isLandlordTicket
                  ? (ticket.landlords?.full_name ?? 'Landlord')
                  : (ticket.tenants?.full_name ?? 'Tenant')
                return (
                  <button key={ticket.id} onClick={() => setSelectedId(ticket.id)}
                    className={`w-full text-left rounded-3xl border px-3 py-2 transition-all ${isActive ? 'border-slate-900 bg-slate-950 text-white shadow-lg' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-slate-950'}`}>{ticket.subject}</p>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/15 text-white' : `${s.bg} ${s.color}`}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : s.dot}`} />{s.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                      <span className={`inline-flex items-center gap-1 ${isActive ? 'text-white/70' : 'text-slate-500'}`}>
                        <User className="w-3 h-3" />
                        {isLandlordTicket && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">LL</span>}
                        {senderName}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${isActive ? 'bg-white/10 text-white/80' : `${p.bg} ${p.color}`}`}>{p.label}</span>
                      <span className={`ml-auto text-[11px] ${isActive ? 'text-white/50' : 'text-slate-400'}`}>
                        {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat thread */}
      <div className={`flex-1 min-w-0 p-3 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {selected ? (
          <AdminChatThread key={selected.id} ticket={selected} onBack={() => setSelectedId(null)} onStatusChange={handleStatusChange} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-center p-8 h-full">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <HeadphonesIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-900 mb-1">Select a ticket</p>
            <p className="text-sm text-gray-400">Choose a ticket from the list to reply.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── InboxTab ──────────────────────────────────────────────────────────────────

type InboxItemType = 'enquiry' | 'chat'

interface InboxItem {
  id: string
  type: InboxItemType
  name: string
  subtitle: string
  body: string
  status: 'open' | 'replied' | 'closed'
  unread: boolean
  created_at: string
  enquiry?: Enquiry
  chatInquiry?: ChatInquiry
}

function toChatItem(c: ChatInquiry): InboxItem {
  return {
    id: c.id,
    type: 'chat',
    name: c.name,
    subtitle: c.phone ?? 'Web chat',
    body: c.note,
    status: c.status,
    unread: !c.read_by_admin,
    created_at: c.created_at,
    chatInquiry: c,
  }
}

function toEnquiryItem(e: Enquiry): InboxItem {
  return {
    id: e.id,
    type: 'enquiry',
    name: e.tenants?.full_name ?? 'Tenant',
    subtitle: e.properties?.title ?? 'Property',
    body: e.message,
    status: e.status,
    unread: false,
    created_at: e.created_at,
    enquiry: e,
  }
}

function InboxTab() {
  const [enquiries, setEnquiries]   = useState<Enquiry[]>([])
  const [chats, setChats]           = useState<ChatInquiry[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [filterType, setFilterType]   = useState<'all' | InboxItemType>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('enquiries').select('*, tenants(full_name, phone), properties(title, city, address)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setEnquiries((data as Enquiry[]) ?? []))
    supabase.from('chat_inquiries').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setChats((data as ChatInquiry[]) ?? []); setLoading(false) })

    const enqChannel = supabase.channel('admin_enquiries_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enquiries' },
        async (payload) => {
          const supabase2 = createClient()
          const { data } = await supabase2.from('enquiries')
            .select('*, tenants(full_name, phone), properties(title, city, address)')
            .eq('id', payload.new.id).single()
          if (data) setEnquiries(prev => [data as Enquiry, ...prev])
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'enquiries' },
        (payload) => setEnquiries(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } as Enquiry : e)))
      .subscribe()

    const chatChannel = supabase.channel('admin_chat_inquiries')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_inquiries' },
        (payload) => setChats(prev => [payload.new as ChatInquiry, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_inquiries' },
        (payload) => setChats(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } as ChatInquiry : i)))
      .subscribe()

    return () => { supabase.removeChannel(enqChannel); supabase.removeChannel(chatChannel) }
  }, [])

  const items = useMemo(() => {
    const combined: InboxItem[] = [
      ...chats.map(toChatItem),
      ...enquiries.map(toEnquiryItem),
    ]
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [chats, enquiries])

  const typeFiltered = filterType === 'all' ? items : items.filter(i => i.type === filterType)
  const filtered = filterStatus === 'all' ? typeFiltered : typeFiltered.filter(i => i.status === filterStatus)
  const selected = items.find(i => `${i.type}:${i.id}` === selectedKey) ?? null

  const counts = {
    all:     typeFiltered.length,
    open:    typeFiltered.filter(i => i.status === 'open').length,
    replied: typeFiltered.filter(i => i.status === 'replied').length,
    closed:  typeFiltered.filter(i => i.status === 'closed').length,
  }

  function handleEnquiryStatusChange(id: string, status: Enquiry['status']) {
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }

  function handleChatMarkRead(id: string) {
    setChats(prev => prev.map(c => c.id === id ? { ...c, read_by_admin: true } : c))
  }

  function handleChatStatusChange(id: string, status: ChatInquiry['status']) {
    setChats(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  return (
    <div className="flex flex-1 overflow-hidden gap-3">
      {/* List */}
      <div className={`flex flex-col border border-slate-200 bg-white w-full lg:w-64 xl:w-72 shrink-0 overflow-hidden ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Inbox queue</p>
              <h2 className="text-base font-bold text-slate-950">Enquiries & chat</h2>
            </div>
            <span className="text-[11px] text-slate-500">{items.length} total</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['all', 'enquiry', 'chat'] as const).map(key => (
              <button key={key} onClick={() => setFilterType(key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all ${
                  filterType === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                {key === 'all' ? 'All' : key === 'enquiry' ? 'Enquiries' : 'Chat'}
                <span className={`text-[10px] font-bold ${filterType === key ? 'text-white/70' : 'text-slate-400'}`}>
                  {key === 'all' ? items.length : key === 'enquiry' ? enquiries.length : chats.length}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['all', 'open', 'replied', 'closed'] as const).map(key => (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filterStatus === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                {key === 'all' ? 'All' : ENQUIRY_STATUS_META[key].label}
                <span className={`text-[10px] font-bold ${filterStatus === key ? 'text-white/70' : 'text-slate-400'}`}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-3xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Inbox className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">No messages yet</p>
              <p className="text-xs text-slate-400 mt-1">Property enquiries and web chat requests appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => {
                const s = ENQUIRY_STATUS_META[item.status]
                const isActive = `${item.type}:${item.id}` === selectedKey
                const isChat = item.type === 'chat'
                return (
                  <button key={`${item.type}:${item.id}`} onClick={() => setSelectedKey(`${item.type}:${item.id}`)}
                    className={`w-full text-left rounded-2xl border px-3 py-3 transition-all ${isActive ? 'border-slate-900 bg-slate-950 text-white shadow-lg' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-slate-950'}`}>{item.name}</p>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {isChat && item.unread && (
                          <span className={`size-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-emerald-500'}`} title="Unread" aria-label="Unread" />
                        )}
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isChat ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'} ${isActive ? '!bg-white/15 !text-white' : ''}`}>
                          {isChat ? 'Chat' : 'Enquiry'}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/15 text-white' : `${s.bg} ${s.color}`}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : s.dot}`} />{s.label}
                        </span>
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-1 ${isActive ? 'text-white/70' : 'text-slate-500'}`}>{item.subtitle}</p>
                    <p className={`text-[10px] mt-2 line-clamp-2 ${isActive ? 'text-white/70' : 'text-slate-500'}`}>{item.body}</p>
                    <p className={`text-[11px] mt-2 ${isActive ? 'text-white/50' : 'text-slate-400'}`}>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className={`flex-1 min-w-0 p-3 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {selected ? (
          selected.type === 'chat' && selected.chatInquiry ? (
            <ChatRequestDetail key={selected.id} inquiry={selected.chatInquiry}
              onBack={() => setSelectedKey(null)}
              onMarkRead={handleChatMarkRead}
              onStatusChange={handleChatStatusChange} />
          ) : selected.enquiry ? (
            <EnquiryDetail key={selected.id} enquiry={selected.enquiry}
              onBack={() => setSelectedKey(null)}
              onStatusChange={handleEnquiryStatusChange} />
          ) : null
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-center p-6 h-full">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-900 mb-1">Select a message</p>
            <p className="text-sm text-gray-400">Choose an enquiry or chat request to view and reply.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSupportPage() {
  const [user, setUser]   = useState<{ email?: string } | null>(null)
  const [tab, setTab]     = useState<'support' | 'inbox'>('support')
  const [openCount, setOpenCount]     = useState(0)
  const [chatOpenCount, setChatOpenCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))

    // Badge counts
    const fetchCounts = () => {
      supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'open')
        .then(({ count }) => setOpenCount(count ?? 0))
      supabase.from('chat_inquiries').select('id', { count: 'exact', head: true }).eq('read_by_admin', false)
        .then(({ count }) => setChatOpenCount(count ?? 0))
    }
    fetchCounts()

    const ch1 = supabase.channel('enquiry_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, fetchCounts)
      .subscribe()
    const ch2 = supabase.channel('chat_inquiry_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_inquiries' }, fetchCounts)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [])

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const inboxCount = openCount + chatOpenCount

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Page header */}
          <header className="bg-slate-950 text-white border-b border-slate-900/60 shadow-sm shrink-0">
            <div className="px-4 md:px-5 py-3 max-w-7xl mx-auto">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Support hub</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">Support & enquiries</h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-300">Streamline customer tickets and enquiries in a premium dashboard.</p>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-3xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm shadow-sm">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-300">Open enquiries</p>
                    <p className="mt-1 text-lg font-semibold text-white">{openCount}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm shadow-sm">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-300">Unread chats</p>
                    <p className="mt-1 text-lg font-semibold text-white">{chatOpenCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div className="flex items-center gap-2 px-4 md:px-5 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
            <button onClick={() => setTab('support')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-semibold transition-all ${
                tab === 'support' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}>
              <HeadphonesIcon className="w-4 h-4" />
              Support
            </button>
            <button onClick={() => setTab('inbox')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-semibold transition-all relative ${
                tab === 'inbox' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}>
              <Inbox className="w-4 h-4" />
              Inbox
              {inboxCount > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  tab === 'inbox' ? 'bg-white text-slate-950' : 'bg-blue-600 text-white'
                }`}>
                  {inboxCount > 99 ? '99+' : inboxCount}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex flex-1 overflow-hidden">
            {tab === 'support' ? <SupportTab /> : <InboxTab />}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
