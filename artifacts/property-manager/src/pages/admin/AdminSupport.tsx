import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  HeadphonesIcon, Send, Loader2, MessageSquare,
  Clock, CheckCircle2, XCircle, User,
  ChevronLeft, ChevronDown as ChevronDownIcon, RefreshCw, Inbox, Building2, Mail,
  UserPlus, Volume2, VolumeX, ShieldCheck, KeyRound, Trash2, Search, X,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient } from '../../lib/supabase'
import { subscribeSupportPresence, type LiveSupportState, type SupportAgent, type SupportStatus } from '../../lib/live-support'
import { claimInquiry, unassignInquiry, type AgentAssignmentStatus } from '../../lib/support-assignment'
import { subscribeToSupportAlerts, playSupportSound, getSoundMuted, setSoundMuted } from '../../lib/support-notifications'
import {
  getNotificationSettings, getSupportAvailability, invalidatePlatformSettings,
  type SupportAvailability, DEFAULT_AVAILABILITY,
} from '../../lib/platform-settings'
import { useToast } from '../../hooks/use-toast'
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
  status: 'new' | 'open' | 'replied' | 'closed'
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
  email: string | null
  visitor_id: string | null
  read_by_admin: boolean
  ticket_no: string | null
  agent_id: string | null
  agent_status: AgentAssignmentStatus
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
  read_by_visitor: boolean
  attachment_url: string | null
  attachment_name: string | null
  created_at: string
}

interface Agent {
  id: string
  user_id: string
  name: string
  email: string
  role: 'agent' | 'support' | 'admin'
  active: boolean
  created_at: string
  last_seen_at?: string | null
}

interface ContactMessage {
  id: string
  name: string
  email: string
  role: string
  subject: string
  message: string
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
  new:     { label: 'New',     color: 'text-sky-600', bg: 'bg-sky-50',    dot: 'bg-sky-500'    },
  open:    { label: 'Open',    color: 'text-amber-600', bg: 'bg-amber-50',  dot: 'bg-amber-400' },
  replied: { label: 'Replied', color: 'text-blue-600',  bg: 'bg-blue-50',   dot: 'bg-blue-500'  },
  closed:  { label: 'Closed',  color: 'text-slate-500', bg: 'bg-slate-100', dot: 'bg-slate-400' },
}

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'] as const

// ── Small helpers ─────────────────────────────────────────────────────────────

const AVATAR_GRADS = [
  'from-sky-500 to-blue-600',
  'from-slate-600 to-slate-700',
  'from-indigo-500 to-blue-600',
  'from-blue-500 to-cyan-600',
  'from-slate-700 to-slate-900',
]

function avatarGrad(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}

function initialsOf(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
}

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
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(tenantName)} flex items-center justify-center shrink-0 text-[13px] font-semibold text-white`}>
          <span>{tenantInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-[15px] truncate">{tenantName}</p>
            <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
            </span>
          </div>
          <p className="text-[12.5px] text-slate-400 mt-0.5">
            {enquiry.tenants?.phone && <span>{enquiry.tenants.phone} · </span>}
            {formatDistanceToNow(new Date(enquiry.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="relative shrink-0">
          <select value={enquiry.status} onChange={e => changeStatus(e.target.value as Enquiry['status'])}
            disabled={updating}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-[12.5px] font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer disabled:opacity-50 hover:border-slate-300 transition-colors">
            <option value="open">Open</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
          {updating
            ? <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400 pointer-events-none" />
            : <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />}
        </div>
      </div>

      {/* Body - Chat Thread */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
          </div>
        ) : (
          <>
            {/* Property info */}
            <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-slate-900 truncate">{propertyTitle}</p>
                {propertyCity && <p className="text-[12px] text-slate-500 mt-0.5">{propertyCity}</p>}
              </div>
            </div>

            <div className="flex justify-center">
              <span className="text-[11px] text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                Enquiry received · {format(new Date(enquiry.created_at), 'dd MMM yyyy, h:mm a')}
              </span>
            </div>

            {/* Original enquiry message */}
            <div className="flex items-end gap-2.5 justify-start">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(tenantName)} flex items-center justify-center shrink-0 text-[11px] font-semibold text-white`}>
                <span>{tenantInitial}</span>
              </div>
              <div className="max-w-[75%] flex flex-col gap-1 items-start">
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-[13.5px] leading-relaxed bg-slate-100 text-slate-800">
                  {enquiry.message}
                </div>
                <span className="text-[10.5px] text-slate-400 px-1">
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
                <div key={reply.id} className={`flex items-end gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  {!isAdmin && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 text-[11px] font-semibold text-white">
                      <span>L</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${isAdmin ? 'bg-slate-900 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
                      {reply.message}
                    </div>
                    <span className="text-[10.5px] text-slate-400 px-1">
                      {isAdmin ? 'You' : senderName} · {format(new Date(reply.created_at), 'h:mm a')}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                      <HeadphonesIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              )
            })}

            {isClosed && (
              <div className="flex justify-center">
                <span className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
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
        <form onSubmit={sendReply} className="px-5 py-3.5 border-t border-slate-100 flex items-end gap-2 shrink-0">
          <textarea 
            rows={1} 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as any) } }}
            placeholder="Type your reply… (Enter to send)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[13.5px] bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all resize-none placeholder:text-slate-400" 
          />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <div className="px-5 py-3.5 border-t border-slate-100 text-center text-[12px] text-slate-400 shrink-0">
          This enquiry is closed. Change status to reopen.
        </div>
      )}
    </div>
  )
}

// ── ChatRequestDetail ─────────────────────────────────────────────────────────

function ChatRequestDetail({ inquiry, onBack, onMarkRead, onStatusChange, agents, liveState }: {
  inquiry: ChatInquiry
  onBack: () => void
  onMarkRead: (id: string) => void
  onStatusChange: (id: string, status: ChatInquiry['status']) => void
  agents: SupportAgent[]
  liveState: LiveSupportState
}) {
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [loading, setLoading]     = useState(true)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [updating, setUpdating]   = useState(false)
  const [visitorTyping, setVisitorTyping] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignedTo, setAssignedTo] = useState<SupportAgent | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const visitorTypingTimer = useRef<number | null>(null)
  const typingSentAt = useRef(0)

  const s = ENQUIRY_STATUS_META[inquiry.status]
  const assignedAgent = assignedTo ?? agents.find(a => a.id === inquiry.agent_id) ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, visitorTyping])

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
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.sender === 'visitor') {
          setVisitorTyping(true)
          if (visitorTypingTimer.current) window.clearTimeout(visitorTypingTimer.current)
          visitorTypingTimer.current = window.setTimeout(() => setVisitorTyping(false), 2500)
        }
      })
      .subscribe()

    // Opening the thread marks it as read (both the inquiry badge and the
    // visitor's message read-receipts).
    supabase.from('chat_inquiries').update({ read_by_admin: true }).eq('id', inquiry.id)
    supabase.from('chat_messages')
      .update({ read_by_admin: true })
      .eq('inquiry_id', inquiry.id)
      .eq('sender', 'visitor')
    onMarkRead(inquiry.id)

    return () => {
      supabase.removeChannel(channel)
      if (visitorTypingTimer.current) window.clearTimeout(visitorTypingTimer.current)
    }
  }, [inquiry.id])

  /** Broadcast "typing" to the visitor (throttled to ~1.5s). */
  function broadcastTyping() {
    if (!inquiry.id) return
    const now = Date.now()
    if (now - typingSentAt.current < 1500) return
    typingSentAt.current = now
    const supabase = createClient()
    supabase.channel(`admin_chat_inquiry:${inquiry.id}`)
      .send({ type: 'broadcast', event: 'typing', payload: { sender: 'admin' } })
      .catch(() => { /* best-effort */ })
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    const body = input.trim()
    if (!body || sending) return
    setSending(true); setInput('')
    const optId = `opt-${Date.now()}`
    setMessages(prev => [...prev, { id: optId, inquiry_id: inquiry.id, sender: 'admin', body, read_by_admin: true, read_by_visitor: false, attachment_url: null, attachment_name: null, created_at: new Date().toISOString() }])
    const supabase = createClient()
    const { data: inserted } = await supabase.from('chat_messages')
      .insert({ inquiry_id: inquiry.id, sender: 'admin', body }).select().single()
    if (inserted) setMessages(prev => prev.map(m => m.id === optId ? inserted as ChatMessage : m))
    // Reply counts as read; auto-advance status open → replied
    await supabase.from('chat_inquiries').update({ read_by_admin: true }).eq('id', inquiry.id)
    await supabase.from('chat_messages')
      .update({ read_by_admin: true })
      .eq('inquiry_id', inquiry.id)
      .eq('sender', 'visitor')
    onMarkRead(inquiry.id)
    if (inquiry.status === 'open') {
      await supabase.from('chat_inquiries').update({ status: 'replied' }).eq('id', inquiry.id)
      onStatusChange(inquiry.id, 'replied')
    }
    setSending(false)

    // Email the visitor when they may not have the widget open.
    if (inquiry.email) {
      getNotificationSettings().then(notif => {
        fetch('/api/send-support-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'chat',
            adminEmail: notif.adminEmail,
            userName: inquiry.name,
            userEmail: inquiry.email,
            subject: 'New reply from Livarex Support',
            message: body,
            ticketId: inquiry.id,
            ticketNo: inquiry.ticket_no ?? '',
            channel: 'Live chat reply',
          }),
        }).catch(() => { /* non-fatal */ })
      }).catch(() => { /* non-fatal */ })
    }
  }

  async function changeStatus(newStatus: ChatInquiry['status']) {
    setUpdating(true)
    const supabase = createClient()
    await supabase.from('chat_inquiries').update({ status: newStatus }).eq('id', inquiry.id)
    onStatusChange(inquiry.id, newStatus)
    setUpdating(false)
  }

  async function doClaim(agentId: string) {
    if (assigning) return
    setAssigning(true)
    const ok = await claimInquiry(inquiry.id, agentId)
    if (ok) {
      const agent = agents.find(a => a.id === agentId) ?? null
      setAssignedTo(agent)
      onStatusChange(inquiry.id, inquiry.status)
    }
    setAssigning(false)
  }

  async function doUnassign() {
    if (assigning) return
    setAssigning(true)
    const ok = await unassignInquiry(inquiry.id)
    if (ok) { setAssignedTo(null); onStatusChange(inquiry.id, inquiry.status) }
    setAssigning(false)
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(inquiry.name)} flex items-center justify-center shrink-0 text-[13px] font-semibold text-white`}>
          <span>{inquiry.name[0]?.toUpperCase() ?? 'U'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-[15px] truncate">{inquiry.name}</p>
            <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
            </span>
            {/* Assignment status badge */}
            {inquiry.agent_status === 'assigned' && assignedAgent ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                <User className="w-3 h-3" />{assignedAgent.name.split(' ')[0]}
              </span>
            ) : inquiry.agent_status === 'queued' ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                <Clock className="w-3 h-3" />Queued
              </span>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Unassigned
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-slate-400 mt-0.5">
            {inquiry.ticket_no && <span className="font-medium text-slate-500">{inquiry.ticket_no} · </span>}
            {inquiry.email && <span>{inquiry.email} · </span>}
            {inquiry.phone && <span>{inquiry.phone} · </span>}
            {format(new Date(inquiry.created_at), 'dd MMM yyyy, h:mm a')}
          </p>
        </div>
        <div className="relative shrink-0">
          <select value={inquiry.status} onChange={e => changeStatus(e.target.value as ChatInquiry['status'])}
            disabled={updating}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-[12.5px] font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer disabled:opacity-50 hover:border-slate-300 transition-colors">
            <option value="open">Open</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
          {updating
            ? <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400 pointer-events-none" />
            : <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />}
        </div>
      </div>

      {/* Assignment bar */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-100 bg-slate-50/60 shrink-0 flex-wrap">
        <span className="text-[11px] font-medium text-slate-400">Assigned</span>
        <span className="text-[12.5px] font-medium text-slate-700">
          {assignedAgent ? assignedAgent.name : (inquiry.agent_status === 'queued' ? 'Queued — no agent claimed this yet' : 'Unassigned')}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {inquiry.agent_status !== 'assigned' && (
            <button onClick={() => doClaim(liveState.onlineAgents[0]?.id ?? agents[0]?.id ?? '')}
              disabled={assigning || agents.length === 0}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition-colors">
              {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}
              Assign to me
            </button>
          )}
          <select
            value={assignedAgent?.id ?? ''}
            onChange={e => e.target.value ? doClaim(e.target.value) : doUnassign()}
            disabled={assigning || agents.length === 0}
            className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg border border-slate-200 text-[11.5px] font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer disabled:opacity-40 hover:border-slate-300 transition-colors">
            <option value="">Reassign…</option>
            {agents.filter(a => a.active).map(a => (
              <option key={a.id} value={a.id}>{a.name}{a.available ? '' : ' (unavailable)'}</option>
            ))}
            {inquiry.agent_status === 'assigned' && <option value="__unassign__" disabled>— Unassign —</option>}
          </select>
          {inquiry.agent_status === 'assigned' && (
            <button onClick={doUnassign} disabled={assigning}
              title="Unassign"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors">
              Unassign
            </button>
          )}
        </div>
      </div>

      {/* Body — chat thread */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
        {/* Original visitor message */}
        <div className="flex items-end gap-2.5 justify-start">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(inquiry.name)} flex items-center justify-center shrink-0 text-[11px] font-semibold text-white`}>
            <span>{inquiry.name[0]?.toUpperCase() ?? 'U'}</span>
          </div>
          <div className="max-w-[75%] flex flex-col gap-1 items-start">
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-[13.5px] leading-relaxed bg-slate-100 text-slate-800">
              {inquiry.note}
            </div>
            <span className="text-[10.5px] text-slate-400 px-1">
              {inquiry.name} · {format(new Date(inquiry.created_at), 'h:mm a')}
            </span>
          </div>
        </div>

        {/* Thread messages */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
          </div>
        ) : (
          messages.map(msg => {
            const isAdmin = msg.sender === 'admin'
            return (
              <div key={msg.id} className={`flex items-end gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                {!isAdmin && (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(inquiry.name)} flex items-center justify-center shrink-0 text-[11px] font-semibold text-white`}>
                    <span>{inquiry.name[0]?.toUpperCase() ?? 'U'}</span>
                  </div>
                )}
                <div className={`max-w-[75%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                  {msg.attachment_url && (
                    <img src={msg.attachment_url} alt={msg.attachment_name ?? 'attachment'}
                      className="max-h-40 max-w-[220px] rounded-xl border border-slate-200 object-cover" />
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap ${isAdmin ? 'bg-slate-900 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'} ${msg.id.startsWith('opt-') ? 'opacity-60' : ''}`}>
                    {msg.body}
                  </div>
                  <span className="text-[10.5px] text-slate-400 px-1 flex items-center gap-1">
                    {isAdmin ? 'You' : inquiry.name} · {format(new Date(msg.created_at), 'h:mm a')}
                    {isAdmin && !msg.id.startsWith('opt-') && (
                      <span className={msg.read_by_visitor ? 'text-slate-500' : 'text-slate-400'}>
                        {msg.read_by_visitor ? '✓✓ Read' : '✓ Sent'}
                      </span>
                    )}
                  </span>
                </div>
                {isAdmin && (
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                    <HeadphonesIcon className="w-4 h-4 text-white" />
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
        <>
          {visitorTyping && (
            <div className="px-6 pb-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-block size-1.5 rounded-full bg-slate-400 animate-pulse" />
              {inquiry.name} is typing…
            </div>
          )}
          <form onSubmit={sendReply} className="px-5 py-3.5 border-t border-slate-100 flex items-end gap-2 shrink-0">
            <textarea rows={1} value={input} onChange={e => { setInput(e.target.value); broadcastTyping() }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as any) } }}
              placeholder={`Reply to ${inquiry.name}… (Enter to send)`}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all resize-none placeholder:text-slate-400" />
            <button type="submit" disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </>
      ) : (
        <div className="px-5 py-3.5 border-t border-slate-100 text-center text-[12px] text-slate-400 shrink-0">
          This request is closed. Change status to reopen.
        </div>
      )}
    </div>
  )
}

// ── SupportTab ────────────────────────────────────────────────────────────────

function SupportTab({ onOpenQueued }: { onOpenQueued: (id: string) => void }) {
  const [tickets, setTickets]       = useState<SupportTicket[]>([])
  const [queued, setQueued]         = useState<ChatInquiry[]>([])
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

  // Queued offline/live requests — no agent has claimed them yet.
  useEffect(() => {
    const supabase = createClient()
    const loadQueued = () => {
      supabase.from('chat_inquiries').select('*')
        .eq('agent_status', 'queued')
        .order('created_at', { ascending: false })
        .then(({ data }) => setQueued((data as ChatInquiry[]) ?? []))
    }
    loadQueued()
    const channel = supabase.channel('admin_queued_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_inquiries' },
        (payload) => {
          const row = payload.new as ChatInquiry
          if (row.agent_status === 'queued') setQueued(prev => [row, ...prev])
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_inquiries' },
        (payload) => {
          const row = payload.new as ChatInquiry
          // A claim/status change removes it from the queue; any re-queue adds it back.
          setQueued(prev => {
            const rest = prev.filter(q => q.id !== row.id)
            return row.agent_status === 'queued' ? [row, ...rest] : rest
          })
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Claim a queued request for the current admin.
  async function claimQueued(inquiryId: string) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return
    // Find the agents roster row for this admin (or fall back to the first
    // active agent so a claim is always possible from the queue).
    const { data: roster } = await supabase.from('agents').select('id').eq('user_id', userId).maybeSingle()
    const agentId = (roster?.id as string | undefined)
      ?? (await supabase.from('agents').select('id').eq('active', true).limit(1).maybeSingle()).data?.id as string | undefined
    if (!agentId) return
    const ok = await claimInquiry(inquiryId, agentId)
    if (ok) setQueued(prev => prev.filter(q => q.id !== inquiryId))
  }

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
    <div className="flex flex-1 overflow-hidden gap-3 p-3">
      {/* Queued requests — offline form submissions + chats waiting for an agent */}
      <div className={`flex flex-col rounded-xl border border-slate-200 bg-white w-full lg:w-64 xl:w-72 shrink-0 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-3.5 pt-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400 font-bold">Waiting for an agent</p>
              <h2 className="mt-0.5 text-[15px] font-bold text-slate-950 leading-tight tracking-tight flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Queued
              </h2>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-bold">Waiting</p>
              <p className="mt-0.5 text-[15px] font-bold text-slate-900 leading-tight tabular-nums">{queued.length}</p>
            </div>
          </div>
          {queued.length > 0 && (
            <p className="mt-1.5 text-[10.5px] leading-snug text-slate-400">
              Visitors who couldn't reach a live agent. Claim one to start replying.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {queued.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <p className="text-xs font-semibold text-slate-500">Queue is clear</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Offline requests will appear here</p>
            </div>
          ) : (
            queued.map(q => (
              <div key={q.id}
                className="group w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition-all hover:border-slate-300 hover:bg-slate-50/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[12.5px] truncate text-slate-900">{q.name}</p>
                  {q.ticket_no && (
                    <span className="shrink-0 inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                      {q.ticket_no}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10.5px]">
                  <span className="inline-flex items-center gap-1 min-w-0 text-slate-500">
                    <Mail className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{q.email ?? q.phone ?? 'No contact'}</span>
                  </span>
                  <span className={`ml-auto shrink-0 text-[9.5px] tabular-nums ${selected ? 'text-blue-800/50' : 'text-slate-400'}`}>
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-1 leading-snug">{q.note}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <button
                    onClick={() => claimQueued(q.id)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <User className="w-2.5 h-2.5" />Assign to me
                  </button>
                  <button
                    onClick={() => onOpenQueued(q.id)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
                  >
                    Open thread
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket queue */}
      <div className={`flex flex-col rounded-xl border border-slate-200 bg-white w-full lg:w-72 xl:w-80 shrink-0 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${selected ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-3.5 pt-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400 font-bold">Support queue</p>
              <h2 className="mt-0.5 text-[15px] font-bold text-slate-950 leading-tight tracking-tight">Tickets</h2>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-bold">Total Tickets</p>
              <p className="mt-0.5 text-[15px] font-bold text-slate-900 leading-tight tabular-nums">{tickets.length}</p>
            </div>
          </div>

          {/* Status filters — single compact row */}
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(key => {
              const active = filterStatus === key
              return (
                <button key={key} onClick={() => setFilterStatus(key)}
                  className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'
                  }`}>
                  {key === 'all' ? 'All' : STATUS_META[key].label}
                  <span className={`min-w-[15px] inline-flex items-center justify-center h-[15px] px-1 rounded text-[9px] font-bold tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{counts[key]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <p className="text-xs font-semibold text-slate-500">No tickets in this view</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tickets will appear here when created</p>
            </div>
          ) : (
            <div className="space-y-1">
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
                    className={`w-full text-left rounded-lg border px-2.5 py-2 transition-all ${isActive ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold text-[12.5px] truncate ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>{ticket.subject}</p>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.color}`}>
                        <span className={`w-1 h-1 rounded-full ${s.dot}`} />{s.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10.5px]">
                      <span className={`inline-flex items-center gap-1 min-w-0 ${isActive ? 'text-blue-800/70' : 'text-slate-500'}`}>
                        <User className="w-2.5 h-2.5 shrink-0" />
                        {isLandlordTicket && <span className="rounded bg-violet-100 px-1 py-px text-[8.5px] font-bold text-violet-700 leading-none">LL</span>}
                        <span className="truncate">{senderName}</span>
                      </span>
                      <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-semibold ${p.bg} ${p.color}`}>{p.label}</span>
                      <span className={`ml-auto shrink-0 text-[9.5px] tabular-nums ${isActive ? 'text-blue-800/50' : 'text-slate-400'}`}>
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
      <div className={`flex-1 min-w-0 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {selected ? (
          <AdminChatThread key={selected.id} ticket={selected} onBack={() => setSelectedId(null)} onStatusChange={handleStatusChange} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-center p-8 h-full">
            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
              <HeadphonesIcon className="w-5 h-5 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">Select a ticket</p>
            <p className="text-[13px] text-slate-400">Choose a ticket from the list to reply.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ContactDetail ─────────────────────────────────────────────────────────────

function ContactDetail({ contact, onBack }: {
  contact: ContactMessage
  onBack: () => void
}) {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(contact.name)} flex items-center justify-center shrink-0 text-[13px] font-semibold text-white`}>
          <span>{contact.name[0]?.toUpperCase() ?? 'C'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-[15px] truncate">{contact.name}</p>
          <p className="text-[12.5px] text-slate-400 truncate">{contact.email}</p>
        </div>
        <span className="shrink-0 inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          Contact form
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-medium text-slate-400 mb-1">Role</p>
            <p className="text-[13.5px] font-medium text-slate-800">{contact.role || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-medium text-slate-400 mb-1">Received</p>
            <p className="text-[13.5px] font-medium text-slate-800">{format(contact.created_at, 'd MMM yyyy, h:mm a')}</p>
          </div>
          <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-medium text-slate-400 mb-1">Subject</p>
            <p className="text-[13.5px] font-medium text-slate-800">{contact.subject || 'No subject'}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-slate-400 mb-2">Message</p>
          <p className="text-[13.5px] text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4">{contact.message}</p>
        </div>
      </div>

      {/* Footer — reply via email */}
      <div className="px-5 py-3.5 border-t border-slate-100 shrink-0">
        <a
          href={`mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${contact.subject || 'Your message'}`)}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[13.5px] font-medium transition-colors"
        >
          <Mail className="w-4 h-4" /> Reply via Email
        </a>
      </div>
    </div>
  )
}

// ── InboxTab ──────────────────────────────────────────────────────────────────

type InboxItemType = 'enquiry' | 'chat' | 'contact'

interface InboxItem {
  id: string
  type: InboxItemType
  name: string
  subtitle: string
  body: string
  status: 'new' | 'open' | 'replied' | 'closed'
  unread: boolean
  created_at: string
  enquiry?: Enquiry
  chatInquiry?: ChatInquiry
  contact?: ContactMessage
}

function toChatItem(c: ChatInquiry): InboxItem {
  return {
    id: c.id,
    type: 'chat',
    name: c.name,
    subtitle: c.email ?? c.phone ?? 'Web chat',
    body: c.note,
    status: c.status,
    unread: !c.read_by_admin,
    created_at: c.created_at,
    chatInquiry: c,
  }
}

function toContactItem(c: ContactMessage): InboxItem {
  return {
    id: c.id,
    type: 'contact',
    name: c.name,
    subtitle: c.email,
    body: c.message,
    status: 'open',
    unread: true,
    created_at: c.created_at,
    contact: c,
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

function InboxTab({ liveState, onOpenThreadChange, initialChatId, onInitialChatConsumed }: {
  liveState: LiveSupportState
  onOpenThreadChange: (id: string | null) => void
  initialChatId?: string | null
  onInitialChatConsumed?: () => void
}) {
  const [enquiries, setEnquiries]   = useState<Enquiry[]>([])
  const [chats, setChats]           = useState<ChatInquiry[]>([])
  const [contacts, setContacts]     = useState<ContactMessage[]>([])
  const [agents, setAgents]         = useState<SupportAgent[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [filterType, setFilterType]   = useState<'all' | InboxItemType>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Notify the parent of the currently-open thread so the page-level alert
  // handler can suppress toasts for messages in the thread being viewed.
  useEffect(() => {
    if (selectedKey?.startsWith('chat:')) onOpenThreadChange(selectedKey.slice(5))
    else onOpenThreadChange(null)
  }, [selectedKey, onOpenThreadChange])

  // When the admin clicks "Open thread" in the Queued section, jump straight
  // to that chat in the inbox once it has loaded.
  useEffect(() => {
    if (!initialChatId) return
    const found = chats.find(c => c.id === initialChatId)
    if (found) {
      setSelectedKey(`chat:${found.id}`)
      onInitialChatConsumed?.()
    }
  }, [initialChatId, chats, onInitialChatConsumed])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('enquiries').select('*, tenants(full_name, phone), properties(title, city, address)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setEnquiries((data as Enquiry[]) ?? []))
    supabase.from('chat_inquiries').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setChats((data as ChatInquiry[]) ?? []))
    supabase.from('contact_messages').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setContacts((data as ContactMessage[]) ?? []); setLoading(false) })
    supabase.from('agents').select('id, user_id, name, email, role, active, presence, available, availability_note, last_seen_at, created_at').order('created_at', { ascending: false })
      .then(({ data }) => setAgents((data as SupportAgent[]) ?? []))

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

    const contactChannel = supabase.channel('admin_contact_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        (payload) => setContacts(prev => [payload.new as ContactMessage, ...prev]))
      .subscribe()

    // The roster feed is the single source of truth for presence + availability.
    const agentsChannel = supabase.channel('livarex-admin-roster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' },
        () => {
          supabase.from('agents').select('id, user_id, name, email, role, active, presence, available, availability_note, last_seen_at, created_at').order('created_at', { ascending: false })
            .then(({ data }) => setAgents((data as SupportAgent[]) ?? []))
        })
      .subscribe()

    return () => {
      supabase.removeChannel(enqChannel)
      supabase.removeChannel(chatChannel)
      supabase.removeChannel(contactChannel)
      supabase.removeChannel(agentsChannel)
    }
  }, [])

  const items = useMemo(() => {
    const combined: InboxItem[] = [
      ...chats.map(toChatItem),
      ...enquiries.map(toEnquiryItem),
      ...contacts.map(toContactItem),
    ]
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [chats, enquiries, contacts])

  const typeFiltered = filterType === 'all' ? items : items.filter(i => i.type === filterType)
  const statusFiltered = filterStatus === 'all' ? items : items.filter(i => i.status === filterStatus)
  const filtered = (filterStatus === 'all' ? typeFiltered : typeFiltered.filter(i => i.status === filterStatus))
    .filter(i => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return i.name.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q) || i.body.toLowerCase().includes(q)
    })
  const selected = items.find(i => `${i.type}:${i.id}` === selectedKey) ?? null

  // Each chip counts the items that would be visible if it were selected
  // (honouring the other filter), so both "All" chips always agree.
  const typeCounts = {
    all:     statusFiltered.length,
    enquiry: statusFiltered.filter(i => i.type === 'enquiry').length,
    chat:    statusFiltered.filter(i => i.type === 'chat').length,
    contact: statusFiltered.filter(i => i.type === 'contact').length,
  }
  const counts = {
    all:     typeFiltered.length,
    new:     typeFiltered.filter(i => i.status === 'new').length,
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
    <div className="flex flex-1 overflow-hidden lg:gap-0.5">
      {/* Inbox queue */}
      <div className={`flex flex-col bg-white w-full lg:w-[21rem] xl:w-[23rem] shrink-0 overflow-hidden border-r border-slate-200/70 ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-4 pt-3.5 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">Inbox</h2>
            <span className="text-[11px] font-medium text-slate-400 tabular-nums">{items.length} conversations</span>
          </div>

          {/* Search */}
          <div className="mt-2.5 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full h-8 pl-8 pr-8 rounded-lg border border-slate-200 bg-slate-50/60 text-[12.5px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter group — Type + Status, visually grouped in one container */}
          <div className="mt-3 rounded-xl bg-slate-50/80 p-2 space-y-2">
            {/* Type filters */}
            <div className="flex items-center gap-1">
              {(['all', 'enquiry', 'chat', 'contact'] as const).map(key => {
                const active = filterType === key
                return (
                  <button key={key} onClick={() => setFilterType(key)}
                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-medium transition-colors ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                    }`}>
                    {key === 'all' ? 'All' : key === 'enquiry' ? 'Enquiries' : key === 'chat' ? 'Chat' : 'Contact'}
                    <span className={`min-w-[16px] inline-flex items-center justify-center h-[16px] px-1 rounded-full text-[10px] font-semibold tabular-nums ${
                      active ? 'bg-slate-900 text-white' : 'bg-slate-200/70 text-slate-500'
                    }`}>{typeCounts[key]}</span>
                  </button>
                )
              })}
            </div>

            {/* Divider between Type and Status */}
            <div className="h-px bg-slate-200/70 mx-0.5" />

            {/* Status filter — dropdown select */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 shrink-0">Status</span>
              <div className="relative flex-1 min-w-0">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="appearance-none w-full h-7 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="all">All statuses</option>
                  {(['new', 'open', 'replied', 'closed'] as const).map(key => (
                    <option key={key} value={key}>
                      {ENQUIRY_STATUS_META[key].label} ({counts[key]})
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {loading ? (
            <div className="space-y-1.5 px-1 pt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[60px] rounded-xl bg-slate-100/80 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 px-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                <Inbox className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-[13px] font-medium text-slate-600">No conversations here</p>
              <p className="text-[12px] text-slate-400 mt-1">Try a different filter.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map(item => {
                const s = ENQUIRY_STATUS_META[item.status]
                const isActive = `${item.type}:${item.id}` === selectedKey
                const isChat = item.type === 'chat'
                const isContact = item.type === 'contact'
                const isUnread = (isChat || isContact) && item.unread
                const chatInq = item.chatInquiry
                const assignedAgent = chatInq?.agent_id ? agents.find(a => a.id === chatInq.agent_id) : null
                return (
                  <button key={`${item.type}:${item.id}`} onClick={() => setSelectedKey(`${item.type}:${item.id}`)}
                    className={`relative w-full text-left rounded-xl px-3 py-2.5 transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-slate-100 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]'
                        : isUnread
                          ? 'bg-white border border-slate-200/70 shadow-sm hover:border-slate-300'
                          : 'hover:bg-slate-50'
                    }`}>
                    {/* Unread left accent */}
                    {isUnread && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-sky-500" />}
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(item.name)} flex items-center justify-center shrink-0 text-[11px] font-semibold text-white`}>
                      {initialsOf(item.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Name + time */}
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate ${isUnread ? 'font-semibold text-[13.5px] text-slate-900' : 'font-medium text-[13px] text-slate-800'}`}>{item.name}</p>
                        <span className={`shrink-0 text-[10.5px] tabular-nums ${isUnread ? 'font-medium text-slate-500' : 'text-slate-400'}`}>
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {/* Preview + badges */}
                      <div className="mt-1 flex items-center gap-1.5 min-w-0">
                        <p className={`text-[12px] truncate min-w-0 flex-1 ${isUnread ? 'text-slate-600' : 'text-slate-500'}`}>{item.subtitle}</p>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10.5px] font-medium ${s.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                        </span>
                        {isChat && chatInq?.agent_status === 'queued' && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-600">
                            <Clock className="w-3 h-3" />Queued
                          </span>
                        )}
                        {isChat && assignedAgent && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-400">
                            <User className="w-3 h-3" />{assignedAgent.name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      {/* Body preview (only when present) */}
                      {item.body && (
                        <p className={`text-[11.5px] mt-0.5 line-clamp-1 ${isUnread ? 'text-slate-500' : 'text-slate-400'}`}>{item.body}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className={`flex-1 min-w-0 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {selected ? (
          selected.type === 'chat' && selected.chatInquiry ? (
            <ChatRequestDetail key={selected.id} inquiry={selected.chatInquiry}
              onBack={() => setSelectedKey(null)}
              onMarkRead={handleChatMarkRead}
              onStatusChange={handleChatStatusChange}
              agents={agents}
              liveState={liveState} />
          ) : selected.type === 'contact' && selected.contact ? (
            <ContactDetail key={selected.id} contact={selected.contact}
              onBack={() => setSelectedKey(null)} />
          ) : selected.enquiry ? (
            <EnquiryDetail key={selected.id} enquiry={selected.enquiry}
              onBack={() => setSelectedKey(null)}
              onStatusChange={handleEnquiryStatusChange} />
          ) : null
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-slate-300" />
              </div>
              <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-white border border-slate-200 shadow-sm">
                <span className="size-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="text-[15px] font-semibold text-slate-800">Select a conversation</p>
            <p className="text-[13px] text-slate-400 max-w-[260px] leading-relaxed mt-1">Choose an enquiry or chat from the list to view and reply.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AgentsTab ─────────────────────────────────────────────────────────────────

function ConfirmAgentDelete({ agent, onConfirm, onCancel, loading }: {
  agent: SupportAgent
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-base font-extrabold text-gray-900 mb-1">Delete agent</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          This will permanently delete <span className="font-semibold text-gray-700">{agent.name}</span>'s account
          ({agent.email}) and all their data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AgentsTab({ agents, setAgents, liveState }: {
  agents: SupportAgent[]
  setAgents: React.Dispatch<React.SetStateAction<SupportAgent[]>>
  liveState: LiveSupportState
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SupportAgent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({})
  const { toast } = useToast()

  // Current active conversations per agent (assigned + open/replied). Refreshed
  // on roster/tab changes and every 30s.
  useEffect(() => {
    const supabase = createClient()
    let disposed = false
    const loadCounts = () => {
      supabase.from('chat_inquiries')
        .select('agent_id')
        .in('agent_status', ['assigned'])
        .in('status', ['open', 'replied'])
        .then(({ data }) => {
          if (disposed) return
          const counts: Record<string, number> = {}
          for (const row of (data ?? []) as { agent_id: string | null }[]) {
            if (row.agent_id) counts[row.agent_id] = (counts[row.agent_id] ?? 0) + 1
          }
          setActiveCounts(counts)
        })
    }
    loadCounts()
    const ch = supabase.channel('agent_active_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_inquiries' }, loadCounts)
      .subscribe()
    const iv = setInterval(loadCounts, 30_000)
    return () => { disposed = true; clearInterval(iv); supabase.removeChannel(ch) }
  }, [])

  /** Attach the caller's session token so the API can verify they're an admin. */
  async function authedFetch(url: string, body: unknown) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  async function toggleActive(agent: SupportAgent) {
    const supabase = createClient()
    await supabase.from('agents').update({ active: !agent.active }).eq('id', agent.id)
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, active: !agent.active } : a))
  }

  async function toggleAvailable(agent: SupportAgent) {
    const supabase = createClient()
    await supabase.from('agents').update({ available: !agent.available }).eq('id', agent.id)
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, available: !agent.available } : a))
  }

  async function resetPassword(agent: SupportAgent) {
    setBusyId(agent.id)
    try {
      const res = await authedFetch('/api/manage-support-agent', { action: 'reset-password', userId: agent.user_id })
      const data = await res.json()
      if (!res.ok) { toast({ title: 'Reset failed', description: data.error || 'Could not send reset email', variant: 'destructive' }) }
      else toast({ title: 'Reset email sent', description: `${agent.name} will get a password reset link.` })
    } catch {
      toast({ title: 'Reset failed', description: 'Could not send reset email', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  async function removeAgent(agent: SupportAgent) {
    setDeleting(true)
    try {
      const res = await authedFetch('/api/manage-support-agent', { action: 'remove', userId: agent.user_id })
      const data = await res.json()
      if (!res.ok) { toast({ title: 'Remove failed', description: data.error || 'Could not remove agent', variant: 'destructive' }) }
      else {
        setAgents(prev => prev.filter(a => a.id !== agent.id))
        toast({ title: 'Agent removed', description: 'Their account was permanently deleted.' })
      }
    } catch {
      toast({ title: 'Remove failed', description: 'Could not remove agent', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Presence is stored server-side on the roster; the manual Support override
  // does NOT change anyone's presence here (it only affects the visitor-facing
  // availability messaging).
  const availableCount = liveState.availableCount

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Roster */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Agents</h3>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              {agents.length} total · {availableCount} available
            </span>
          </div>
          {agents.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <ShieldCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No agents yet. Add one from Settings → Agents.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {agents.map(agent => {
                const isBusy = busyId === agent.id
                const status: 'online' | 'away' | 'offline' = agent.presence
                const isAvailable = agent.available && agent.presence === 'online'
                const statusStyles = status === 'online'
                  ? 'bg-emerald-50 text-emerald-700'
                  : status === 'away'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
                const statusDot = status === 'online' ? 'bg-emerald-500' : status === 'away' ? 'bg-amber-400' : 'bg-slate-400'
                return (
                  <div key={agent.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-xs font-bold text-white">{initialsOf(agent.name)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 text-sm truncate">{agent.name}</p>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusStyles}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                          {status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline'}
                        </span>
                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${agent.active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {agent.role}
                        </span>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {agent.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {agent.email}
                        {agent.last_seen_at && (
                          <span className="ml-1.5">
                            · last seen {formatDistanceToNow(new Date(agent.last_seen_at), { addSuffix: true })}
                          </span>
                        )}
                        {agent.availability_note && (
                          <span className="ml-1.5 text-amber-600">· {agent.availability_note}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg ${activeCounts[agent.id] ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'}`}>
                        <MessageSquare className="w-3 h-3" />
                        {activeCounts[agent.id] ?? 0} active
                      </span>
                      <button onClick={() => toggleAvailable(agent)} disabled={isBusy}
                        title={agent.available ? 'Stop accepting new conversations' : 'Accept new conversations'}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors ${
                          agent.available ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {agent.available ? 'Available' : 'Unavailable'}
                      </button>
                      <button onClick={() => resetPassword(agent)} disabled={isBusy} title="Send password reset"
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-600 hover:text-blue-700 hover:border-blue-200 disabled:opacity-40 transition-colors">
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />} Reset
                      </button>
                      <button onClick={() => toggleActive(agent)} disabled={isBusy}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors ${
                          agent.active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}>
                        {agent.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setDeleteTarget(agent)} disabled={busyId === agent.id} title="Remove agent"
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 disabled:opacity-40 transition-colors">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {deleteTarget && (
        <ConfirmAgentDelete agent={deleteTarget} loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => removeAgent(deleteTarget)} />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSupportPage() {
  const [user, setUser]   = useState<{ email?: string; id?: string } | null>(null)
  const [tab, setTab]     = useState<'support' | 'inbox' | 'agents'>('support')
  const [openCount, setOpenCount]     = useState(0)
  const [chatOpenCount, setChatOpenCount] = useState(0)
  const [contactCount, setContactCount]   = useState(0)
  const [liveState, setLiveState] = useState<LiveSupportState>({
    status: 'offline', online: false, onlineAgents: [], awayAgents: [], offlineAgents: [], agents: [], availableCount: 0, agentCount: 0,
  })
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [muted, setMuted] = useState(getSoundMuted)
  const [availability, setAvailability] = useState<SupportAvailability>(DEFAULT_AVAILABILITY)
  // Set when the admin clicks "Open thread" from the Queued section; the Inbox
  // tab consumes it as its initial selection.
  const [pendingChatId, setPendingChatId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    return subscribeSupportPresence(setLiveState)
  }, [])

  // Keep the standalone roster list in sync with the same single source.
  useEffect(() => {
    const supabase = createClient()
    const load = () => {
      supabase.from('agents').select('id, user_id, name, email, role, active, presence, available, availability_note, last_seen_at, created_at').order('created_at', { ascending: false })
        .then(({ data }) => setAgents((data as SupportAgent[]) ?? []))
    }
    load()
    const ch = supabase.channel('admin_support_roster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Register the current admin in the agents roster on login (idempotent).
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || user.is_anonymous) return
      setUser({ email: user.email, id: user.id })
      window.__livarexUserId = user.id
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/register-support-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ userId: user.id, email: user.email }),
        })
      } catch {
        /* non-fatal */
      }
      const { data } = await supabase.from('agents').select('id, user_id, name, email, role, active, presence, available, availability_note, last_seen_at, created_at').order('created_at', { ascending: false })
      setAgents((data as SupportAgent[]) ?? [])
    })
  }, [])

  // Sound + toast alerts for new chats / messages (only when not looking at the
  // open thread — a page-level check keeps it simple; the bell + badges always update).
  const openInquiryIdRef = useRef<string | null>(null)
  const handleOpenThreadChange = useCallback((id: string | null) => {
    openInquiryIdRef.current = id
  }, [])
  useEffect(() => {
    return subscribeToSupportAlerts((event) => {
      const isOpenThread = event.type === 'new_message' && openInquiryIdRef.current === event.inquiryId
      // Suppress sound (and toast) when the visitor is messaging inside the
      // thread the admin is already looking at.
      if (isOpenThread) return
      playSupportSound(getSoundMuted())
      if (event.type === 'new_queued') {
        toast({
          title: `Offline request from ${event.inquiry.name}`,
          description: (event.inquiry.ticketNo ? `${event.inquiry.ticketNo} — ` : '') + (event.inquiry.note || '').slice(0, 60),
        })
      } else if (event.type === 'new_inquiry') {
        toast({
          title: `New chat from ${event.inquiry.name}`,
          description: (event.inquiry.note || '').slice(0, 80),
        })
      } else if (event.type === 'new_message') {
        toast({
          title: 'New message from visitor',
          description: (event.body || '').slice(0, 80),
        })
      }
    })
  }, [toast])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email, id: user?.id })
      if (user?.id) window.__livarexUserId = user.id
    })

    // Badge counts
    const fetchCounts = () => {
      supabase.from('enquiries').select('id', { count: 'exact', head: true }).in('status', ['new', 'open'])
        .then(({ count }) => setOpenCount(count ?? 0))
      supabase.from('chat_inquiries').select('id', { count: 'exact', head: true }).eq('read_by_admin', false)
        .then(({ count }) => setChatOpenCount(count ?? 0))
      supabase.from('contact_messages').select('id', { count: 'exact', head: true })
        .then(({ count }) => setContactCount(count ?? 0))
    }
    fetchCounts()

    const ch1 = supabase.channel('enquiry_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, fetchCounts)
      .subscribe()
    const ch2 = supabase.channel('chat_inquiry_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_inquiries' }, fetchCounts)
      .subscribe()
    const ch3 = supabase.channel('contact_message_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, fetchCounts)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3) }
  }, [])

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const inboxCount = openCount + chatOpenCount + contactCount
  const availableAgentCount = liveState.availableCount

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Page header */}
          <header className="bg-white border-b border-slate-200 shrink-0">
            <div className="px-4 md:px-6 pt-3 pb-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <h1 className="text-[19px] font-bold text-slate-900 tracking-tight">Support &amp; Inbox</h1>
                  <p className="mt-0.5 text-[13px] text-slate-500">Manage customer enquiries and conversations.</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  {/* Manual availability override (online / offline / back in) */}
                  <AvailabilityControl availability={availability} onChange={setAvailability} />
                  {/* Dynamic presence indicator */}
                  <PresenceIndicator userId={user?.id} state={liveState} />
                  <button
                    onClick={() => { const next = !muted; setMuted(next); setSoundMuted(next) }}
                    title={muted ? 'Unmute notifications' : 'Mute notifications'}
                    aria-label={muted ? 'Unmute notifications' : 'Mute notifications'}
                    className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Unified stat strip */}
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <StatCard
                  icon={<HeadphonesIcon className="w-4 h-4 text-blue-600" />}
                  label="Open Enquiries"
                  count={openCount}
                  highlight={openCount > 0}
                />
                <StatCard
                  icon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
                  label="Unread Chats"
                  count={chatOpenCount}
                  highlight={chatOpenCount > 0}
                />
                <StatCard
                  icon={<Mail className="w-4 h-4 text-violet-600" />}
                  label="Contact Messages"
                  count={contactCount}
                  highlight={contactCount > 0}
                />
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div className="px-4 md:px-6 py-2 bg-white border-b border-slate-200 shrink-0">
            <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button onClick={() => setTab('support')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  tab === 'support' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}>
                <HeadphonesIcon className="w-3.5 h-3.5" />
                Support
              </button>
              <button onClick={() => setTab('inbox')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all relative ${
                  tab === 'inbox' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}>
                <Inbox className="w-3.5 h-3.5" />
                Inbox
                {inboxCount > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-bold ${
                    tab === 'inbox' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {inboxCount > 99 ? '99+' : inboxCount}
                  </span>
                )}
              </button>
              <button onClick={() => setTab('agents')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  tab === 'agents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}>
                <UserPlus className="w-3.5 h-3.5" />
                Agents
                {availableAgentCount > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-bold ${
                    tab === 'agents' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {availableAgentCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="flex flex-1 overflow-hidden">
            {tab === 'support' ? <SupportTab onOpenQueued={(id) => { setPendingChatId(id); setTab('inbox') }} /> : tab === 'inbox' ? (
              <InboxTab liveState={liveState} onOpenThreadChange={handleOpenThreadChange} initialChatId={pendingChatId} onInitialChatConsumed={() => setPendingChatId(null)} />
            ) : (
              <AgentsTab agents={agents} setAgents={setAgents} liveState={liveState} />
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

/** Compact stat card used in the page header. Highlights when there's action needed. */
function StatCard({ icon, label, count, highlight = false }: { icon: React.ReactNode; label: string; count: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-shadow ${highlight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-200/70 bg-white'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${highlight ? 'bg-slate-900' : 'bg-slate-50 border border-slate-100'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] font-medium text-slate-400 leading-none truncate">{label}</p>
        <p className={`mt-1 text-lg leading-none tabular-nums ${highlight ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{count}</p>
      </div>
    </div>
  )
}

/**
 * Unified presence + availability indicator for the admin header. Reads the
 * same single source (the roster) as the agent list, the Agents tab, and the
 * customer chatbot — there is no independent online-status logic here.
 */
function PresenceIndicator({ userId, state }: { userId?: string; state: LiveSupportState }) {
  const me = state.agents.find(a => a.user_id === userId)
  const myPresence: SupportStatus = me?.presence ?? 'offline'
  const myAvailable = Boolean(me?.available && myPresence === 'online')

  const statusStyles = myPresence === 'online'
    ? { dot: 'bg-emerald-500', label: 'Online', sub: myAvailable ? 'You’re available to chat' : 'Connected — not accepting chats' }
    : myPresence === 'away'
      ? { dot: 'bg-amber-400', label: 'Away', sub: 'Heartbeat idle — you’ll look offline soon' }
      : { dot: 'bg-slate-400', label: 'Offline', sub: 'Heartbeat not detected' }

  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${myPresence === 'online' ? 'border-slate-200 bg-white' : 'border-slate-200/80 bg-slate-50'}`}>
      <span className="relative flex size-2">
        <span className={`size-2 rounded-full ${statusStyles.dot}`} />
        {myPresence === 'online' && <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />}
      </span>
      <div className="leading-tight">
        <p className="text-[13px] font-semibold text-slate-800">{statusStyles.label}</p>
        <p className="text-[11px] text-slate-400">{statusStyles.sub}</p>
      </div>
    </div>
  )
}

/**
 * Manual support-availability control. Lets an admin override the auto
 * presence-driven status and tell visitors when support will be back:
 *   Auto     → driven by realtime presence (+ optional weekly schedule)
 *   Online   → force-available
 *   Offline  → force-unavailable
 *   Back in  → offline, but shows "Back at HH:MM" on the widget
 * Persists to admin_settings (key: support_availability) so the public
 * widget can read it. The control lives in the page header.
 */
function AvailabilityControl({ availability, onChange }: {
  availability: SupportAvailability
  onChange: (next: SupportAvailability) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    getSupportAvailability({ refresh: true }).then(a => {
      if (mounted) { onChange(a); setLoaded(true) }
    })
    return () => { mounted = false }
  }, [])

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const persist = async (next: SupportAvailability) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('admin_settings').upsert({
      key: 'support_availability',
      value: next,
      category: 'support',
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })
    if (error) console.warn('[availability] save failed:', error.message)
    onChange(next)
    invalidatePlatformSettings()
    setSaving(false)
  }

  const setMode = (mode: SupportAvailability['mode']) => {
    setOpen(false)
    void persist({ ...availability, mode })
  }

  const setBackAt = (backAt: string) => {
    void persist({ ...availability, mode: 'back_in', backAt })
  }

  // Effective state shown on the closed control.
  const shown = (() => {
    if (availability.mode === 'online') return { dot: 'bg-emerald-500', label: 'Online' }
    if (availability.mode === 'offline') return { dot: 'bg-slate-300', label: 'Offline' }
    if (availability.mode === 'back_in') return { dot: 'bg-amber-400', label: availability.backAt ? `Back ${availability.backAt}` : 'Back in…' }
    return { dot: 'bg-sky-500', label: 'Auto' }
  })()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!loaded}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-slate-50 transition-colors"
        title="Set support availability"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={`size-2 rounded-full ${shown.dot}`} />
        <span className="text-[12.5px] font-medium text-slate-700">Support · {shown.label}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        {saving && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg" role="menu">
          {([
            { mode: 'auto' as const, label: 'Auto', desc: 'Follow live presence + schedule' },
            { mode: 'online' as const, label: 'Online', desc: 'Show support as available' },
            { mode: 'offline' as const, label: 'Offline', desc: 'Show support as unavailable' },
            { mode: 'back_in' as const, label: 'Back in…', desc: 'Set when support returns' },
          ]).map(opt => (
            <button
              key={opt.mode}
              role="menuitem"
              onClick={() => setMode(opt.mode)}
              className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
                availability.mode === opt.mode ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <span className={`mt-1.5 size-2 rounded-full shrink-0 ${
                opt.mode === 'online' ? 'bg-emerald-500' : opt.mode === 'offline' ? 'bg-slate-300' : opt.mode === 'back_in' ? 'bg-amber-400' : 'bg-sky-500'
              }`} />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-slate-800">{opt.label}</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">{opt.desc}</span>
              </span>
            </button>
          ))}

          {/* Back-in time input */}
          {availability.mode === 'back_in' && (
            <div className="mt-1 pt-1.5 border-t border-slate-100 px-2.5 pb-1.5">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Back at</label>
              <input
                type="time"
                value={availability.backAt ?? ''}
                onChange={e => setBackAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
