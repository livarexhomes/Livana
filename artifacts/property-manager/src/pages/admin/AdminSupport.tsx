import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  HeadphonesIcon, Send, Loader2, MessageSquare,
  Clock, CheckCircle2, XCircle, User,
  ChevronLeft, ChevronDown as ChevronDownIcon, RefreshCw, Inbox, Building2, Mail,
  Volume2, VolumeX, ShieldCheck, KeyRound, Trash2, Search, X, Lock,
  Paperclip, CheckCheck, Calendar, Home, Activity, Archive,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { MobileSidebarProvider } from '@/components/ui/mobile-admin'
import { createClient } from '../../lib/supabase'
import { SmartSelect } from '../../components/ui/smart-select'
import { subscribeSupportPresence, type LiveSupportState, type SupportAgent, type SupportStatus } from '../../lib/live-support'
import { claimInquiry, unassignInquiry, type AgentAssignmentStatus } from '../../lib/support-assignment'
import { subscribeToSupportAlerts, playSupportSound, getSoundMuted, setSoundMuted } from '../../lib/support-notifications'
import {
  getNotificationSettings,
} from '../../lib/platform-settings'
import {
  getSupportHours, isSupportOpen,
  type SupportHours,
} from '../../lib/support-hours'
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
  property_id?: string | null
  assigned_to?: string | null
  assigned_at?: string | null
  ticket_no?: string | null
  created_by?: string | null
  last_updated_by?: string | null
  archived?: boolean | null
  tenants?: { full_name: string | null; phone: string | null; email?: string | null } | null
  landlords?: { full_name: string | null; whatsapp: string | null; email?: string | null } | null
  properties?: { id: string; title: string; city: string; price: number; type?: string | null; status?: string | null } | null
  assignedAgent?: SupportAgent | null
}

interface SupportMessage {
  id: string
  ticket_id: string
  sender_role: 'tenant' | 'landlord' | 'admin'
  body: string
  read_by_admin?: boolean
  read_by_visitor?: boolean
  attachment_url?: string | null
  attachment_name?: string | null
  created_at: string
}

interface TicketEvent {
  id: string
  ticket_id: string
  actor_type: 'agent' | 'customer' | 'system'
  actor_id?: string | null
  event_type: string
  label: string
  metadata?: Record<string, unknown>
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

// ── Error boundary: prevents a render crash in a conversation panel from
//    leaving a completely blank/white space. Falls back to a retry button. ──
class ConversationErrorBoundary extends React.Component<{ children: React.ReactNode; ticketId: string }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; ticketId: string }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('Conversation render error:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-2">Unable to load this conversation.</p>
          <p className="text-xs text-gray-400 mb-3">The conversation panel encountered an error.</p>
          <button onClick={() => { this.setState({ hasError: false }) }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline">
            Reload conversation
          </button>
        </div>
      )
    }
    return <>{this.props.children}</>
  }
}

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

function ArchivePanel({
  tickets, onArchive, onClose,
}: {
  tickets: SupportTicket[]
  onArchive: (ids: string[]) => Promise<void>
  onClose: () => void
}) {
  const [types, setTypes] = useState<SupportTicket['status'][]>(['resolved', 'closed'])
  const [olderThan, setOlderThan] = useState('all')
  const [channel, setChannel] = useState('all')
  const [saving, setSaving] = useState(false)
  const typeOptions: { value: SupportTicket['status']; label: string; description: string }[] = [
    { value: 'open', label: 'Open', description: 'Active tickets still awaiting work' },
    { value: 'in_progress', label: 'In Progress', description: 'Tickets currently being handled' },
    { value: 'resolved', label: 'Resolved', description: 'Tickets with a completed resolution' },
    { value: 'closed', label: 'Closed', description: 'Tickets that are no longer active' },
  ]
  const cutoff = olderThan === 'all' ? 0 : Date.now() - Number(olderThan) * 86400000
  const matching = tickets.filter(t => {
    const matchesChannel = channel === 'all' || (channel === 'tenant' ? !!t.tenant_id : channel === 'landlord' ? !!t.landlord_id : !t.tenant_id && !t.landlord_id)
    return types.includes(t.status) && matchesChannel && (!cutoff || new Date(t.updated_at).getTime() < cutoff)
  })
  const toggleType = (type: SupportTicket['status']) => setTypes(prev => prev.includes(type) ? prev.filter(v => v !== type) : [...prev, type])
  const selectAll = () => setTypes(types.length === typeOptions.length ? [] : typeOptions.map(option => option.value))
  const submit = async () => { if (!matching.length) return; setSaving(true); await onArchive(matching.map(t => t.id)); setSaving(false); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2"><Archive className="h-4 w-4 text-primary" /><h2 className="text-base font-bold text-slate-950">Archive / Move to History</h2></div>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">Select the tickets you want to move to history. Archived tickets are removed from your active workspace but are never deleted.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs leading-relaxed text-blue-800">Archived tickets remain accessible in History and can be restored at any time. No conversation data will be permanently deleted.</div>
          <div>
            <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select ticket types</p><button type="button" onClick={selectAll} className="text-xs font-semibold text-primary hover:underline">{types.length === typeOptions.length ? 'Clear all' : 'Select all'}</button></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {typeOptions.map(option => {
                const selected = types.includes(option.value)
                const Icon = STATUS_META[option.value].icon
                return <label key={option.value} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${selected ? 'border-primary/30 bg-primary/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleType(option.value)} className="mt-0.5 accent-primary" />
                  <Icon className={`mt-0.5 h-3.5 w-3.5 ${STATUS_META[option.value].color}`} />
                  <span><span className="block text-xs font-semibold text-slate-800">{option.label}</span><span className="mt-0.5 block text-[10px] leading-snug text-slate-400">{option.description}</span></span>
                </label>
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Older than</span><select value={olderThan} onChange={e => setOlderThan(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25"><option value="all">Any age</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label>
            <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Channel</span><select value={channel} onChange={e => setChannel(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25"><option value="all">All Channels</option><option value="tenant">Tenant</option><option value="landlord">Landlord</option><option value="other">Other</option></select></label>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs text-emerald-800"><input type="checkbox" checked readOnly className="accent-emerald-600" /><span><span className="block font-semibold">Keep in History (Don't Delete)</span><span className="text-[11px] text-emerald-700/80">Archived tickets will be moved to History, not deleted.</span></span></label>
          <p className="text-xs text-slate-500"><span className="font-bold text-slate-900">{matching.length}</span> ticket{matching.length === 1 ? '' : 's'} match these filters.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" disabled={!matching.length || saving} onClick={submit} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"><Archive className="h-3.5 w-3.5" />{saving ? 'Moving…' : 'Move to History'}</button></div>
      </div>
    </div>
  )
}

// ── AdminChatThread ───────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'] as const

/** Broadcast a typing indicator to the ticket's customer channel. */
function broadcastTicketTyping(ticketId: string) {
  const supabase = createClient()
  supabase.channel(`support_typing:${ticketId}`)
    .send({ type: 'broadcast', event: 'typing', payload: { sender: 'admin' } })
    .catch(() => { /* best-effort */ })
}

function AdminChatThread({
  ticket, onBack, onStatusChange, onArchive, agents, liveState,
}: {
  ticket: SupportTicket
  onBack: () => void
  onStatusChange: (id: string, status: SupportTicket['status']) => void
  onArchive: (id: string) => void
  agents: SupportAgent[]
  liveState: LiveSupportState
}) {
  const [messages, setMessages]     = useState<SupportMessage[]>([])
  const [events, setEvents]         = useState<TicketEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState<string | null>(null)
  const [input, setInput]           = useState('')
  const [sending, setSending] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [assigning, setAssigning]   = useState(false)
  const [customerTyping, setCustomerTyping] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [customer, setCustomer]     = useState<{ name: string; email?: string | null; phone?: string | null; propertyId?: string | null; tickets: SupportTicket[]; enquiries: { id: string; message: string; status: string; created_at: string; properties?: { title: string | null } | null }[] } | null>(null)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingSentAt = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const s = STATUS_META[ticket.status]
  const p = PRIORITY_META[ticket.priority]
  const isLandlordTicket = !!ticket.landlord_id
  const senderName = isLandlordTicket
    ? (ticket.landlords?.full_name ?? 'Landlord')
    : (ticket.tenants?.full_name ?? 'Tenant')
  const senderInitial = senderName[0]?.toUpperCase() ?? (isLandlordTicket ? 'L' : 'T')
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'
  const assignedAgent = ticket.assignedAgent ?? agents.find(a => a.id === ticket.assigned_to) ?? null
  const availableAgents = liveState.agents.filter(a => a.presence === 'online' && a.available && a.active)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, events])

  // ── Load messages + events, subscribe to realtime ──────────────────────────
  useEffect(() => {
    const supabase = createClient()
    let active = true

    // Clear stale messages immediately so a previous ticket's conversation
    // never bleeds into the new one.
    setMessages([])
    setEvents([])
    setLoading(true)
    setLoadError(null)

    supabase.from('support_messages').select('*').eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setLoadError(error.message)
        } else {
          // Deduplicate by id — a double-fired query or a JOIN that produces
          // duplicate rows must never render the same message twice.
          const seen = new Set<string>()
          const deduped = (data as SupportMessage[] ?? []).filter(m => {
            if (!m || !m.id || seen.has(m.id)) return false
            seen.add(m.id)
            return true
          })
          setMessages(deduped)
        }
        setLoading(false)
      })

    supabase.from('support_ticket_events').select('*').eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => { if (active) setEvents(error ? [] : ((data as TicketEvent[]) ?? [])) })

    // Mark admin messages as read by the visitor when we open the thread.
    supabase.from('support_messages')
      .update({ read_by_admin: true })
      .eq('ticket_id', ticket.id)
      .eq('sender_role', 'admin')

    const channel = supabase.channel(`admin_chat:${ticket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          const msg = payload.new as SupportMessage
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
          if (msg.sender_role !== 'admin') {
            // Mark visitor messages as read by admin immediately.
            supabase.from('support_messages').update({ read_by_admin: true }).eq('id', msg.id)
          }
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_ticket_events', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => setEvents(prev => prev.find(e => e.id === (payload.new as TicketEvent).id) ? prev : [...prev, payload.new as TicketEvent]))
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.sender === 'customer') {
          setCustomerTyping(true)
          if (typingTimer.current) clearTimeout(typingTimer.current)
          typingTimer.current = setTimeout(() => setCustomerTyping(false), 2500)
        }
      })
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel); if (typingTimer.current) clearTimeout(typingTimer.current) }
  }, [ticket.id])

  // Click-outside handler for the "More" dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showMore && moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showMore])

  // ── Customer context: name/email/phone + previous tickets + enquiries + property ──
  useEffect(() => {
    const supabase = createClient()
    let active = true
    const load = async () => {
      let name = senderName
      let email: string | null = null
      let phone: string | null = null
      let customerId: string | null = null
      let propertyId: string | null = ticket.property_id ?? null
      let property: SupportTicket['properties'] = ticket.properties ?? null

      if (isLandlordTicket) {
        const { data: l } = await supabase.from('landlords').select('id, full_name, whatsapp, email').eq('id', ticket.landlord_id).maybeSingle()
        if (l) { name = l.full_name ?? name; phone = l.whatsapp ?? null; email = l.email ?? null; customerId = l.id }
      } else if (ticket.tenant_id) {
        const { data: t } = await supabase.from('tenants').select('id, full_name, phone, email').eq('id', ticket.tenant_id).maybeSingle()
        if (t) { name = t.full_name ?? name; phone = t.phone ?? null; email = t.email ?? null; customerId = t.id }
      }

      // Property context: use the ticket's linked property, else resolve from
      // the customer's most recent enquiry.
      if (!property && customerId) {
        const { data: enq } = await supabase
          .from('enquiries').select('property_id, properties(id, title, city, price, type, status)')
          .eq('tenant_id', customerId).order('created_at', { ascending: false }).limit(1).single()
        if (enq?.property_id && enq.properties) {
          propertyId = enq.property_id
          property = (Array.isArray(enq.properties) ? enq.properties[0] : enq.properties) as SupportTicket['properties']
        }
      }
      if (!property && propertyId) {
        const { data: prop } = await supabase.from('properties').select('id, title, city, price, type, status').eq('id', propertyId).maybeSingle()
        if (prop) property = prop as SupportTicket['properties']
      }

      // Previous tickets + enquiries.
      const [ticketsRes, enquiriesRes] = await Promise.all([
        supabase.from('support_tickets').select('id, subject, status, priority, ticket_no, created_at')
          .or(`tenant_id.eq.${customerId ?? '__none__'},landlord_id.eq.${customerId ?? '__none__'}`)
          .neq('id', ticket.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('enquiries').select('id, message, status, created_at, properties(title)')
          .eq('tenant_id', customerId ?? '__none__').order('created_at', { ascending: false }).limit(5),
      ])

      const enquiryRows = (enquiriesRes.data ?? []).map((e: Record<string, unknown>) => ({
        id: String(e.id ?? ''),
        message: String(e.message ?? ''),
        status: String(e.status ?? ''),
        created_at: String(e.created_at ?? ''),
        properties: Array.isArray(e.properties) ? (e.properties[0] as { title: string | null } | undefined) ?? null : null,
      }))

      if (!active) return
      setCustomer({
        name, email, phone, propertyId: property?.id ?? null,
        tickets: (ticketsRes.data as SupportTicket[]) ?? [],
        enquiries: enquiryRows,
      })
    }
    load()
    return () => { active = false }
  }, [ticket.id, ticket.tenant_id, ticket.landlord_id, ticket.property_id, senderName])

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function updateStatus(newStatus: SupportTicket['status']) {
    setUpdatingStatus(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('support_tickets').update({ status: newStatus, last_updated_by: user?.id }).eq('id', ticket.id)
    onStatusChange(ticket.id, newStatus)
    setUpdatingStatus(false)
  }

  async function updatePriority(newPriority: SupportTicket['priority']) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('support_tickets').update({ priority: newPriority, last_updated_by: user?.id }).eq('id', ticket.id)
  }

  async function assignTo(agentId: string | null) {
    if (assigning) return
    setAssigning(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('support_tickets').update({
      assigned_to: agentId,
      assigned_at: agentId ? new Date().toISOString() : null,
      last_updated_by: user?.id,
    }).eq('id', ticket.id)
    setAssigning(false)
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (sendingRef.current) return
    const body = input.trim()
    if ((!body && attachments.length === 0) || sending) return
    sendingRef.current = true
    setSending(true); setInput('')

    let optId: string | null = null
    try {
      // Upload attachments first.
      const supabase = createClient()
      const urls: string[] = []
      const names: string[] = []
      for (const f of attachments) {
        const ext = f.name.split('.').pop() ?? 'bin'
        const path = `support/${ticket.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage.from('support-attachments').upload(path, f)
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('support-attachments').getPublicUrl(path)
          urls.push(urlData.publicUrl)
          names.push(f.name)
        } else {
          throw new Error(`Upload failed: ${upErr.message}`)
        }
      }
      setAttachments([])

      // Optimistic message
      optId = `opt-${Date.now()}`
      const optMsg: SupportMessage = {
        id: optId, ticket_id: ticket.id, sender_role: 'admin', body: body || '',
        read_by_admin: true, read_by_visitor: false,
        attachment_url: urls[0] ?? null, attachment_name: names[0] ?? null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, optMsg])

      const { data: inserted, error: insertErr } = await supabase.from('support_messages')
        .insert({ ticket_id: ticket.id, sender_role: 'admin', body: body || '', attachment_url: urls[0] ?? null, attachment_name: names[0] ?? null })
        .select().single()
      if (insertErr) throw new Error(insertErr.message)
      if (inserted && optId) {
        // Replace the optimistic placeholder with the real server message,
        // then dedupe by id — a realtime INSERT echo of our own message can
        // otherwise land in state first and create a duplicate reply.
        setMessages(prev => prev
          .map(m => (m.id === optId ? (inserted as SupportMessage) : m))
          .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i))
      }
      if (ticket.status === 'open') await updateStatus('in_progress')
    } catch (err: any) {
      // Roll back the optimistic message so the user doesn't think it was sent.
      if (optId) setMessages(prev => prev.filter(m => m.id !== optId))
      setInput(body)
      toast({ title: 'Message not sent', description: err?.message || 'Check your connection and try again.', variant: 'destructive' })
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  function handleComposerChange(v: string) {
    setInput(v)
    const now = Date.now()
    if (now - typingSentAt.current < 1500) return
    typingSentAt.current = now
    broadcastTicketTyping(ticket.id)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-x-3 gap-y-3 px-4 py-4 border-b border-gray-100 shrink-0 flex-wrap">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm ${isLandlordTicket ? 'from-violet-500 to-purple-600' : 'from-blue-500 to-cyan-500'}`}>
          <span className="text-sm font-bold text-white">{senderInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 text-sm truncate">{ticket.subject}</p>
            {ticket.ticket_no && (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{ticket.ticket_no}</span>
            )}
            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
            </span>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>{p.label}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            From <span className="font-semibold text-gray-600">{senderName}</span>
            {assignedAgent && <span> · Assigned to <span className="font-semibold text-gray-600">{assignedAgent.name}</span></span>}
            <span> · Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
            <span> · Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="w-full flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100 shrink-0 flex-wrap">
          {/* Status */}
          <SmartSelect
            value={ticket.status}
            onValueChange={(v) => updateStatus(v as SupportTicket['status'])}
            options={STATUS_OPTIONS.map(st => ({
              value: st,
              label: STATUS_META[st].label,
              color: st === 'open' ? 'amber' : st === 'in_progress' ? 'blue' : st === 'resolved' ? 'success' : 'neutral',
            }))}
            disabled={updatingStatus}
          />

          {/* Priority */}
          <SmartSelect
            value={ticket.priority}
            onValueChange={(v) => updatePriority(v as SupportTicket['priority'])}
            options={PRIORITY_OPTIONS.map(pr => ({
              value: pr,
              label: PRIORITY_META[pr].label,
              color: pr === 'low' ? 'neutral' : pr === 'normal' ? 'blue' : pr === 'high' ? 'warning' : 'error',
            }))}
          />

          {/* Contextual actions stay together so the conversation remains primary. */}
          <div className="relative inline-flex">
            <button type="button" onClick={() => setShowMore(!showMore)}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
              Actions <ChevronDownIcon className="w-3 h-3" />
            </button>
            {showMore && (
              <div ref={moreRef} className="absolute right-0 mt-1 z-20 w-56 rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-xs">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Assign ticket</p>
                  <select value={assignedAgent?.id ?? ''} onChange={e => assignTo(e.target.value || null)} disabled={assigning}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none">
                    <option value="">Unassigned</option>
                    {availableAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                  <button type="button" onClick={() => { updateStatus('open'); setShowMore(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50">
                    <RefreshCw className="w-3 h-3" /> Reopen ticket
                  </button>
                )}
                {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                  <>
                    <button type="button" onClick={() => { updateStatus('resolved'); setShowMore(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50">
                      <CheckCircle2 className="w-3 h-3" /> Resolve ticket
                    </button>
                    <button type="button" onClick={() => { updateStatus('closed'); setShowMore(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50">
                      <XCircle className="w-3 h-3" /> Close ticket
                    </button>
                  </>
                )}
                <button type="button" onClick={() => { onArchive(ticket.id); setShowMore(false) }}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-gray-50 ${ticket.archived ? 'text-green-700' : 'text-slate-700'}`}>
                  {ticket.archived ? <><RefreshCw className="w-3 h-3" />Restore</> : <><Archive className="w-3 h-3" />Archive</>}
                </button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(ticket.ticket_no ?? ticket.id); setShowMore(false) }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50">
                  <MessageSquare className="w-3 h-3" /> Copy ticket reference
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: conversation + right context panel ───────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Conversation column */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                <span className="text-sm text-gray-500">Loading conversation…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-sm font-medium text-gray-600">Unable to load this conversation.</p>
                <button
                  onClick={() => {
                    setMessages([]); setEvents([])
                    setLoading(true); setLoadError(null)
                    const supabase = createClient()
                    supabase.from('support_messages').select('*').eq('ticket_id', ticket.id)
                      .order('created_at', { ascending: true })
                      .then(({ data, error }) => {
                        if (error) { setLoadError(error.message); setLoading(false); return }
                        const seen = new Set<string>()
                        const deduped = (data as SupportMessage[] ?? []).filter(m => {
                          if (!m || !m.id || seen.has(m.id)) return false
                          seen.add(m.id); return true
                        })
                        setMessages(deduped); setLoading(false)
                      })
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                    Ticket opened · {format(new Date(ticket.created_at), 'dd MMM yyyy, h:mm a')}
                  </span>
                </div>

                {/* Activity timeline (events) */}
                {events.length > 0 && (
                  <div className="mx-auto max-w-md space-y-1.5 py-1">
                    {events.map(ev => (
                      <div key={ev.id} className="flex items-start gap-2 text-[11px]">
                        <span className="mt-0.5 shrink-0 size-1.5 rounded-full bg-slate-300" />
                        <span className="text-slate-500">
                          <span className="font-semibold text-slate-600">{ev.label}</span>
                          <span className="text-slate-400"> · {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="flex justify-center py-6">
                    <p className="text-sm text-gray-400">No messages yet.</p>
                  </div>
                ) : (
                  messages.map(msg => {
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
                          {msg.attachment_url && (
                            <img src={msg.attachment_url} alt={msg.attachment_name ?? 'attachment'}
                              className="max-h-40 max-w-[220px] rounded-xl border border-gray-200 object-cover" />
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isAdmin ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'} ${msg.id.startsWith('opt-') ? 'opacity-60' : ''}`}>
                            {msg.body}
                          </div>
                          <span className="text-[10px] text-gray-400 px-1 flex items-center gap-1">
                            {isAdmin ? 'You' : senderName} · {format(new Date(msg.created_at), 'h:mm a')}
                            {isAdmin && (
                              <span className={msg.read_by_visitor ? 'text-slate-500' : 'text-slate-400'}>
                                {msg.read_by_visitor ? <><CheckCheck className="w-3 h-3 inline" /> Read</> : <><CheckCheck className="w-3 h-3 inline opacity-60" /> Sent</>}
                              </span>
                            )}
                          </span>
                        </div>
                        {isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center shrink-0 shadow-sm">
                            <HeadphonesIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}

                {customerTyping && (
                  <div className="flex items-end gap-2">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 ${isLandlordTicket ? 'from-violet-500 to-purple-600' : 'from-blue-500 to-cyan-500'}`}>
                      <span className="text-xs font-bold text-white">{senderInitial}</span>
                    </div>
                    <div className="px-3.5 py-2 rounded-2xl bg-gray-100 text-xs text-gray-500">{senderName} is typing…</div>
                  </div>
                )}

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

          {/* Composer */}
          {!isClosed ? (
            <form onSubmit={sendReply} className="px-4 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                onChange={e => setAttachments(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
              <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach image"
                className="w-10 h-10 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 flex items-center justify-center transition-colors shrink-0">
                <Paperclip className="w-4 h-4" />
              </button>
              {attachments.length > 0 && (
                <span className="text-[10px] text-gray-500 bg-gray-100 rounded-lg px-2 py-1">{attachments.length} attached</span>
              )}
              <textarea rows={1} value={input} onChange={e => handleComposerChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as any) } }}
                placeholder={`Reply to ${isLandlordTicket ? 'landlord' : 'tenant'}… (Enter to send)`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all resize-none" />
              <button type="submit" disabled={(!input.trim() && attachments.length === 0) || sending}
                className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground flex items-center justify-center transition-all shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400 shrink-0">
              <Lock className="w-3.5 h-3.5 inline-block mr-1 mb-0.5" />
              This ticket is closed. Reopen the ticket to continue the conversation.
            </div>
          )}
        </div>

        {/* Right context panel */}
        <div className="w-64 shrink-0 border-l border-gray-100 hidden xl:flex flex-col overflow-y-auto bg-gray-50/50">
          {/* Customer */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Customer</p>
            <p className="text-sm font-semibold text-gray-900">{customer?.name ?? senderName}</p>
            {customer?.email && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{customer.email}</p>}
            {customer?.phone && <p className="text-[11px] text-slate-500 truncate">{customer.phone}</p>}
            {!customer?.email && !customer?.phone && <p className="text-[11px] text-slate-400">No contact details</p>}
          </div>

          {/* Property context (auto-attached) */}
          {(ticket.properties || customer?.propertyId) && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                <Home className="w-3 h-3" /> Property
              </p>
              <p className="text-sm font-semibold text-gray-900">{ticket.properties?.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{ticket.properties?.city}</p>
              <p className="text-[11px] text-slate-500">Price: ₦{Number(ticket.properties?.price ?? 0).toLocaleString()}</p>
              {ticket.properties?.id && (
                <a href={`/listings/${ticket.properties.id}`} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-1.5 text-[11px] font-semibold text-blue-600 hover:underline">
                  View listing →
                </a>
              )}
            </div>
          )}

          {/* Previous tickets */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Previous tickets</p>
            {(customer?.tickets?.length ?? 0) === 0 ? (
              <p className="text-[11px] text-slate-400">No previous tickets</p>
            ) : (
              <div className="space-y-1.5">
                {customer?.tickets.map(t => (
                  <div key={t.id} className="text-[11px]">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_META[t.status].dot}`} />
                    <span className="text-slate-600 font-medium">{t.subject}</span>
                    <span className="text-slate-400"> · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enquiries */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Enquiries</p>
            {(customer?.enquiries?.length ?? 0) === 0 ? (
              <p className="text-[11px] text-slate-400">No enquiries</p>
            ) : (
              <div className="space-y-1.5">
                {customer?.enquiries.map(enq => (
                  <div key={enq.id} className="text-[11px]">
                    <span className="text-slate-600 font-medium">{enq.properties?.title ?? 'Property enquiry'}</span>
                    <span className="text-slate-400"> · {formatDistanceToNow(new Date(enq.created_at), { addSuffix: true })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Activity
            </p>
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                Created {format(new Date(ticket.created_at), 'dd MMM yyyy')}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 text-slate-400" />
                Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
              </div>
              {assignedAgent && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-slate-400" />
                  Assigned to {assignedAgent.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
  const { toast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  
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
            setReplies(prev => prev.find(r => r.id === data.id) ? prev : [...prev, data as EnquiryReply])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enquiry.id])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (sendingRef.current) return
    const body = input.trim()
    if (!body || sending) return
    sendingRef.current = true
    setSending(true); setInput('')

    try {
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
        throw new Error(error.message)
      }
      if (inserted) {
        setReplies(prev => prev.find(r => r.id === inserted.id) ? prev : [...prev, inserted as EnquiryReply])
      }

      // Update status to replied if it was open
      if (enquiry.status === 'open') {
        const { error: statusErr } = await supabase.from('enquiries').update({ status: 'replied' }).eq('id', enquiry.id)
        if (statusErr) throw new Error(statusErr.message)
        onStatusChange(enquiry.id, 'replied')
      }
    } catch (err: any) {
      setInput(body)
      toast({ title: 'Message not sent', description: err?.message || 'Check your connection and try again.', variant: 'destructive' })
    } finally {
      setSending(false)
      sendingRef.current = false
    }
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
      <div className="flex items-start gap-x-3 gap-y-3 px-5 py-4 border-b border-slate-100 shrink-0 flex-wrap">
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
        <div className="shrink-0">
          <SmartSelect
            value={enquiry.status}
            onValueChange={(v) => changeStatus(v as Enquiry['status'])}
            options={[
              { value: 'open',    label: 'Open',    color: 'amber' },
              { value: 'replied', label: 'Replied', color: 'blue' },
              { value: 'closed',  label: 'Closed',  color: 'neutral' },
            ]}
            disabled={updating}
          />
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
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[13.5px] bg-white text-slate-900 placeholder-slate-400 caret-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all resize-none" 
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
  const { toast } = useToast()
  const [assigning, setAssigning] = useState(false)
  const [assignedTo, setAssignedTo] = useState<SupportAgent | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const visitorTypingTimer = useRef<number | null>(null)
  const typingSentAt = useRef(0)
  const sendingRef = useRef(false)

  async function clearChat() {
    setClearing(true)
    try {
      const r = await fetch('/api/clear-chat-messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiry_id: inquiry.id }),
      })
      if (r.ok) setMessages([])
    } catch { /* non-fatal */ }
    setClearing(false)
    setShowClearConfirm(false)
  }

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
    if (sendingRef.current) return
    const body = input.trim()
    if (!body || sending) return
    sendingRef.current = true
    setSending(true); setInput('')

    const optId = `opt-${Date.now()}`
    setMessages(prev => [...prev, { id: optId, inquiry_id: inquiry.id, sender: 'admin', body, read_by_admin: true, read_by_visitor: false, attachment_url: null, attachment_name: null, created_at: new Date().toISOString() }])
    try {
      const supabase = createClient()
      const { data: inserted, error: insertErr } = await supabase.from('chat_messages')
        .insert({ inquiry_id: inquiry.id, sender: 'admin', body }).select().single()
      if (insertErr) throw new Error(insertErr.message)
      if (inserted) setMessages(prev => prev
        .map(m => (m.id === optId ? (inserted as ChatMessage) : m))
        .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i))
      else setMessages(prev => prev.filter(m => m.id !== optId))
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
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== optId))
      setInput(body)
      toast({ title: 'Message not sent', description: err?.message || 'Check your connection and try again.', variant: 'destructive' })
    } finally {
      setSending(false)
      sendingRef.current = false
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
        <div className="w-full flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
          <SmartSelect
            value={inquiry.status}
            onValueChange={(v) => changeStatus(v as ChatInquiry['status'])}
            options={[
              { value: 'open',    label: 'Open',    color: 'amber' },
              { value: 'replied', label: 'Replied', color: 'blue' },
              { value: 'closed',  label: 'Closed',  color: 'neutral' },
            ]}
            disabled={updating}
          />
          {/* Admin-only: clear all chat messages */}
          <button
            onClick={() => setShowClearConfirm(true)}
            title="Clear chat history"
            className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Clear-chat confirmation dialog ───────────────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-slate-900">Clear chat history?</p>
                <p className="text-[12.5px] text-slate-500 mt-0.5">This permanently deletes all messages in this thread. It cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} disabled={clearing}
                className="px-4 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={clearChat} disabled={clearing}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-[13px] font-medium text-white transition-colors flex items-center gap-1.5">
                {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Clear messages
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[13.5px] bg-white text-slate-900 placeholder-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all resize-none" />
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

function SupportTab({ onOpenQueued, view = 'queue' }: { onOpenQueued: (id: string) => void; view?: 'queue' | 'history' }) {
  const { toast } = useToast()
  const [tickets, setTickets]       = useState<SupportTicket[]>([])
  const [queued, setQueued]         = useState<ChatInquiry[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchivePanel, setShowArchivePanel] = useState(false)
  const [agents, setAgents]         = useState<SupportAgent[]>([])
  const [newTicketIds, setNewTicketIds] = useState<string[]>([])  // tickets that arrived live this session
  const [liveState, setLiveState]   = useState<LiveSupportState>({
    status: 'offline', online: false, onlineAgents: [], awayAgents: [], offlineAgents: [], agents: [], availableCount: 0, agentCount: 0,
  })
  const lastAutoAssigned = useRef('')

  // Presence/availability — the SAME canonical source as the rest of the admin
  // UI and the customer chatbot. Used for auto-assign (FIFO) + assign options.
  useEffect(() => {
    return subscribeSupportPresence(setLiveState)
  }, [])
  useEffect(() => {
    const supabase = createClient()
    const load = () => {
      supabase.from('agents').select('id, user_id, name, email, role, active, presence, available, availability_note, last_seen_at, created_at')
        .order('created_at', { ascending: true })
        .then(({ data }) => setAgents((data as SupportAgent[]) ?? []))
    }
    load()
    const ch = supabase.channel('support_tab_roster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Load tickets with full context + live counters.
  useEffect(() => {
    const supabase = createClient()

    // Track in-flight loadTickets calls by a token so that a stale async
    // resolver (from a previous selection or an earlier realtime event) can
    // never overwrite newer data or wipe the currently selected ticket.
    let loadCounter = 0

    const loadTickets = async () => {
      const myToken = ++loadCounter
      // Deduplicate the SELECT result by ticket.id — a duplicate row from a
      // JOIN or a double-fired realtime echo must never produce two entries.
      const dedup = (rows: SupportTicket[]): SupportTicket[] => {
        const seen = new Set<string>()
        return (rows ?? []).filter(t => {
          if (!t || !t.id || seen.has(t.id)) return false
          seen.add(t.id)
          return true
        })
      }
      const apply = (rows: SupportTicket[]) => {
        if (myToken !== loadCounter) return // stale resolve — ignore
        const clean = dedup(rows)
        // Preserve assignedAgent enrichment across reloads by merging the
        // agent roster onto each ticket. Use setTickets directly (not inside
        // a setAgents updater) so React processes it as a standalone update.
        setTickets(prevTickets => {
          const byId = new Map<string, SupportTicket>()
          // Start with fresh data from the DB (authoritative source), enriched
          // with the assigned agent from the current roster snapshot.
          for (const t of clean) {
            const agent = agents.find(a => a.id === t.assigned_to) ?? null
            byId.set(t.id, { ...t, assignedAgent: t.assignedAgent ?? agent })
          }
          // Preserve any enrichment (assignedAgent) from the previous snapshot
          // for tickets that are still present.
          for (const t of prevTickets) {
            if (!byId.has(t.id)) continue // stale, skip
            const existing = byId.get(t.id)
            if (existing && t.assignedAgent && !existing.assignedAgent) {
              existing.assignedAgent = t.assignedAgent
            }
          }
          return Array.from(byId.values())
        })
      }
      const { data, error } = await supabase.from('support_tickets')
        .select('*, tenants(full_name, phone, email), landlords(full_name, whatsapp, email), properties(id, title, city, price, type, status)')
        .order('updated_at', { ascending: false })
      if (!error) {
        apply((data as SupportTicket[]) ?? [])
      } else {
        // The joined select can fail (e.g. a nested relation blocked by RLS
        // or a dropped FK) and would otherwise silently empty the entire
        // Support Queue — so the page shows "0 tickets" even when they exist.
        // Fall back to a minimal select so rows still render.
        console.error('Support queue joined select failed, falling back:', error)
        const { data: fallback, error: fbErr } = await supabase.from('support_tickets')
          .select('*').order('updated_at', { ascending: false })
        if (fbErr) {
          console.error('Error loading tickets:', fbErr)
          toast({ title: 'Could not load support tickets', description: fbErr.message || 'Check your connection.', variant: 'destructive' })
        }
        apply((fallback as SupportTicket[]) ?? [])
      }
      setLoading(false)
    }
    loadTickets()

    const channel = supabase.channel('admin_tickets_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        (payload) => {
          const t = payload.new as { id: string; subject?: string; landlord_id?: string | null }
          // Track so the "New" panel stays visible until the agent opens it
          setNewTicketIds(prev => prev.includes(t.id) ? prev : [t.id, ...prev])
          // Sound + toast alert
          playSupportSound(getSoundMuted())
          toast({
            title: `New support ticket`,
            description: (t.subject ?? 'A new ticket has been submitted') +
              (t.landlord_id ? ' · Landlord' : ' · Tenant'),
          })
          loadTickets()
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, loadTickets)
      .subscribe()
    return () => { loadCounter++; supabase.removeChannel(channel) }
  }, [toast])

  // When the roster's available agents change, auto-assign the next waiting
  // chat (FIFO) to the first available agent. Re-arms whenever the queue or
  // the available set changes so it picks up new waiters and new agents.
  useEffect(() => {
    const available = liveState.agents.filter(a => a.presence === 'online' && a.available && a.active)
    if (available.length === 0 || queued.length === 0) return
    const supabase = createClient()
    const next = [...queued].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
    if (!next || lastAutoAssigned.current === next.id) return
    const agent = available[0]
    lastAutoAssigned.current = next.id
    void claimInquiry(next.id, agent.id).then(ok => {
      if (ok) setQueued(prev => prev.filter(q => q.id !== next.id))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveState.agents, queued])

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
          if (row.agent_status === 'queued') setQueued(prev => prev.find(q => q.id === row.id) ? prev : [row, ...prev])
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

  // Archive/unarchive a ticket by ID. Uses ticket.id as the unique key
  // so a ticket can never be archived twice or duplicated.
  async function archiveTicket(id: string) {
    const supabase = createClient()
    const ticket = tickets.find(t => t.id === id)
    if (!ticket) return
    const currentlyArchived = !!ticket.archived
    const { error } = await supabase.from('support_tickets')
      .update({ archived: !currentlyArchived })
      .eq('id', id)
    if (error) {
      toast({ title: 'Could not update ticket', description: error.message, variant: 'destructive' })
    } else {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, archived: !currentlyArchived } : t))
    }
  }

  // Filter by archived state, then status, then search query.
  const activeTickets = tickets.filter(t => !t.archived)
  const archivedTickets = tickets.filter(t => t.archived)
  const visibleTickets = view === 'history' ? archivedTickets : activeTickets
  const filtered = (filterStatus === 'all' ? visibleTickets : visibleTickets.filter(t => t.status === filterStatus))
    .filter(t => searchQuery.trim() === '' || t.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  const selected = tickets.find(t => t.id === selectedId) ?? null
  const counts = {
    all: visibleTickets.length,
    open: visibleTickets.filter(t => t.status === 'open').length,
    in_progress: visibleTickets.filter(t => t.status === 'in_progress').length,
    resolved: visibleTickets.filter(t => t.status === 'resolved').length,
    closed: visibleTickets.filter(t => t.status === 'closed').length,
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* Ticket queue */}
      <div className={`flex flex-col border-r border-slate-200 bg-white w-full lg:w-[22rem] xl:w-[24rem] shrink-0 overflow-hidden ${selected ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-3.5 pt-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400 font-bold">Support queue</p>
              <h2 className="mt-0.5 text-[15px] font-bold text-slate-950 leading-tight tracking-tight">Tickets</h2>
            </div>
            <div className="shrink-0 text-right flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowArchivePanel(true)}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-semibold border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-all"
                title="Move tickets to History"
              >
                <Archive className="w-2.5 h-2.5" />
                Move to History
              </button>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-bold">Total</p>
                <p className="mt-0.5 text-[15px] font-bold text-slate-900 leading-tight tabular-nums">{activeTickets.length}</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.75 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            </div>
          </div>

          {/* One compact status filter keeps the queue calm and scannable. */}
          <div className="mt-2.5">
            <SmartSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              label="Status"
              triggerClassName="h-8 w-full justify-between rounded-lg px-2.5 text-xs sm:w-auto sm:min-w-[150px]"
              options={(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(key => ({
                value: key,
                label: `${key === 'all' ? 'All' : STATUS_META[key].label} — ${counts[key]}`,
                color: key === 'open' ? 'amber' : key === 'in_progress' ? 'blue' : key === 'resolved' ? 'success' : key === 'closed' ? 'neutral' : undefined,
              }))}
            />
          </div>
        </div>

        {/* ── New-ticket notification panel ── */}
        {newTicketIds.length > 0 && (() => {
          const newOnes = tickets.filter(t => newTicketIds.includes(t.id))
          if (newOnes.length === 0) return null
          return (
            <div className="mx-2 mt-2 rounded-xl border border-blue-200 bg-blue-50/70 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                </span>
                <p className="text-[10.5px] font-bold text-blue-800 uppercase tracking-widest">
                  {newOnes.length} new {newOnes.length === 1 ? 'ticket' : 'tickets'}
                </p>
                <button
                  onClick={() => setNewTicketIds([])}
                  className="ml-auto text-[10px] text-blue-500 hover:text-blue-700 font-semibold"
                >
                  Dismiss all
                </button>
              </div>
              <div className="p-1.5 space-y-1">
                {newOnes.map(ticket => {
                  const isLandlordTicket = !!ticket.landlord_id
                  const senderName = isLandlordTicket
                    ? (ticket.landlords?.full_name ?? 'Landlord')
                    : (ticket.tenants?.full_name ?? 'Tenant')
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        setSelectedId(ticket.id)
                        setNewTicketIds(prev => prev.filter(id => id !== ticket.id))
                      }}
                      className="w-full text-left rounded-lg border border-blue-200 bg-white hover:bg-blue-50 px-2.5 py-2 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wide">New</span>
                        <p className="font-semibold text-[12px] truncate text-blue-900 flex-1">{ticket.subject}</p>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-blue-700/70">
                        <User className="w-2.5 h-2.5 shrink-0" />
                        {isLandlordTicket && <span className="rounded bg-violet-100 px-1 py-px text-[8.5px] font-bold text-violet-700 leading-none">LL</span>}
                        <span className="truncate">{senderName}</span>
                        <span className="ml-auto shrink-0 tabular-nums">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

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
                const isNew = newTicketIds.includes(ticket.id)
                const isLandlordTicket = !!ticket.landlord_id
                const senderName = isLandlordTicket
                  ? (ticket.landlords?.full_name ?? 'Landlord')
                  : (ticket.tenants?.full_name ?? 'Tenant')
                return (
                   <button key={ticket.id} onClick={() => {
                     setSelectedId(ticket.id)
                     setNewTicketIds(prev => prev.filter(id => id !== ticket.id))
                   }}
                     className={`w-full text-left rounded-lg border px-2.5 py-2 transition-all ${
                       isActive
                         ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/10'
                         : isNew
                           ? 'border-blue-300 bg-blue-50/40 hover:bg-blue-50'
                           : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                     }`}>
                     <div className="flex items-center justify-between gap-2">
                       <p className={`font-semibold text-[12.5px] truncate ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>{ticket.subject}</p>
                       <div className="flex items-center gap-1 shrink-0">
                         {isNew && !isActive && (
                           <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">NEW</span>
                         )}
                         <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.color}`}>
                           <span className={`w-1 h-1 rounded-full ${s.dot}`} />{s.label}
                         </span>
                         {view === 'history' && (
                           <button
                             type="button"
                             onClick={e => { e.stopPropagation(); archiveTicket(ticket.id) }}
                             title="Restore to active workspace"
                             className="p-0.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                           >
                             <RefreshCw className="w-2.5 h-2.5" />
                           </button>
                         )}
                       </div>
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
      <div className={`flex-1 min-w-0 min-h-0 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {selected ? (
          <ConversationErrorBoundary ticketId={selected.id}>
            <AdminChatThread key={selected.id} ticket={selected} onBack={() => setSelectedId(null)} onStatusChange={handleStatusChange} onArchive={archiveTicket} agents={agents} liveState={liveState} />
          </ConversationErrorBoundary>
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
    {showArchivePanel && view === 'queue' && (
      <ArchivePanel tickets={activeTickets} onArchive={async ids => {
        await Promise.all(ids.map(id => archiveTicket(id)))
        setSelectedId(current => ids.includes(current ?? '') ? null : current)
      }} onClose={() => setShowArchivePanel(false)} />
    )}
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
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  async function clearAllChats() {
    setClearingAll(true)
    try {
      const r = await fetch('/api/clear-all-chats', { method: 'DELETE' })
      if (r.ok) {
        setChats([])
        setSelectedKey(null)
      }
    } catch { /* non-fatal */ }
    setClearingAll(false)
    setShowClearAllConfirm(false)
  }

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
        if (data) setEnquiries(prev => prev.find(e => e.id === data.id) ? prev : [data as Enquiry, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'enquiries' },
        (payload) => setEnquiries(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } as Enquiry : e)))
      .subscribe()

    const chatChannel = supabase.channel('admin_chat_inquiries')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_inquiries' },
         (payload) => setChats(prev => prev.find(c => c.id === payload.new.id) ? prev : [payload.new as ChatInquiry, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_inquiries' },
        (payload) => setChats(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } as ChatInquiry : i)))
      .subscribe()

    const contactChannel = supabase.channel('admin_contact_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' },
         (payload) => setContacts(prev => prev.find(c => c.id === payload.new.id) ? prev : [payload.new as ContactMessage, ...prev]))
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
      // Queued (unassigned offline-form submissions) appear in the Support Queue tab.
      // Only show chats that have been claimed / assigned / or already had interaction.
      ...chats.filter(c => c.agent_status !== 'queued').map(toChatItem),
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
      {/* ── Clear-all confirmation dialog ─────────────────────────────────────── */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-slate-900">Clear all chat conversations?</p>
                <p className="text-[12.5px] text-slate-500 mt-0.5">
                  This permanently deletes every chat thread and all messages. It cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearAllConfirm(false)} disabled={clearingAll}
                className="px-4 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={clearAllChats} disabled={clearingAll}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-[13px] font-medium text-white transition-colors flex items-center gap-1.5">
                {clearingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox queue */}
      <div className={`flex flex-col bg-white w-full lg:w-[22rem] xl:w-[24rem] shrink-0 overflow-hidden border-r border-slate-200/70 ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-4 pt-3.5 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">Inbox</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400 tabular-nums">{items.length} conversations</span>
              {/* Admin: bulk-clear all chat conversations */}
              <button
                onClick={() => setShowClearAllConfirm(true)}
                title="Clear all chat conversations"
                className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-slate-200 bg-white text-[11.5px] font-medium text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            </div>
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
          <div className="mt-3 space-y-2">
            {/* Type filters — pills on desktop, dropdown on mobile */}
            <div className="sm:hidden">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as InboxItemType)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {(['all', 'enquiry', 'chat', 'contact'] as const).map(key => (
                  <option key={key} value={key}>
                    {key === 'all' ? 'All Types' : key === 'enquiry' ? 'Enquiries' : key === 'chat' ? 'Chat' : 'Contact'} ({typeCounts[key]})
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex items-center gap-1">
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
      <div className={`flex-1 min-w-0 min-h-0 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
              <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">Unable to load conversation.</p>
            </div>
          )
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { toast } = useToast()

  // Identify the signed-in user so we can protect the admin row (and the
  // signed-in user's own row) from being removed / demoted via this tab.
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setCurrentUserId(user.id)
    })
  }, [])

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
    // Client-side guard: the server endpoint also enforces this, but a local
    // check prevents an unnecessary round-trip and gives a clearer error.
    if (agent.role === 'admin' || agent.user_id === currentUserId) {
      toast({
        title: 'Cannot remove',
        description: 'Admin accounts are protected and cannot be removed.',
        variant: 'destructive',
      })
      setDeleteTarget(null)
      return
    }
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
                // Admins are protected, and the signed-in user cannot remove
                // their own row (prevents self-lockout).
                const isProtectedRow = agent.role === 'admin' || agent.user_id === currentUserId
                return (
                  <div key={agent.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      isProtectedRow ? 'bg-gradient-to-br from-indigo-600 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}>
                      <span className="text-xs font-bold text-white">{initialsOf(agent.name)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 text-sm truncate">{agent.name}</p>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusStyles}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                          {status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline'}
                        </span>
                        {isProtectedRow ? (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-purple-50 text-purple-700">
                            Admin
                          </span>
                        ) : (
                          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${agent.active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {agent.role}
                          </span>
                        )}
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
                      {isProtectedRow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600">
                          <ShieldCheck className="w-3 h-3" /> Protected
                        </span>
                      ) : (
                        <>
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
                        </>
                      )}
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
  const [tab, setTab]     = useState<'support' | 'inbox' | 'history'>('support')
  const [openCount, setOpenCount]     = useState(0)
  const [chatOpenCount, setChatOpenCount] = useState(0)
  const [contactCount, setContactCount]   = useState(0)
  // The Support Queue pill must reflect open *support tickets* (not enquiries)
  // so its badge matches the list rendered by the Support tab.
  const [supportOpenCount, setSupportOpenCount] = useState(0)
  const [liveState, setLiveState] = useState<LiveSupportState>({
    status: 'offline', online: false, onlineAgents: [], awayAgents: [], offlineAgents: [], agents: [], availableCount: 0, agentCount: 0,
  })
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [muted, setMuted] = useState(getSoundMuted)
  // Global support status = business hours (Africa/Lagos). Re-evaluated every
  // 60s so it flips exactly at 08:00/18:00 — never on heartbeat/realtime.
  const [supportHours, setSupportHours] = useState<SupportHours | null>(null)
  const [, setHoursTick] = useState(0)

  useEffect(() => {
    getSupportHours().then(setSupportHours).catch(() => {})
    const t = setInterval(() => setHoursTick(v => v + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const supportOpen = supportHours ? isSupportOpen(supportHours) : true
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
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress'])
        .then(({ count }) => setSupportOpenCount(count ?? 0))
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
    const ch4 = supabase.channel('support_ticket_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchCounts)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); supabase.removeChannel(ch4) }
  }, [])

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const inboxCount = openCount + chatOpenCount + contactCount
  const availableAgentCount = liveState.availableCount
  const effectiveSupportOnline = supportOpen && availableAgentCount > 0

  return (
    <AuthGuard require="admin">
      <MobileSidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <AdminSidebar userEmail={user?.email} userName={displayName} />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="md:hidden">
              <AdminHeader title="Support" subtitle={`${openCount} enquiries · ${chatOpenCount} chats · ${contactCount} contacts`} />
            </div>

            {/* Compact support workspace header */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 md:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold tracking-tight text-slate-950">Support workspace</h1>
                    <span className="hidden sm:inline text-[11px] text-slate-400 tabular-nums">{inboxCount} open</span>
                  </div>
                  <p className="hidden sm:block mt-0.5 text-[11px] text-slate-400">Keep customer conversations moving</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${effectiveSupportOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    <span className={`size-1.5 rounded-full ${effectiveSupportOnline ? 'bg-emerald-500' : supportOpen ? 'bg-amber-400' : 'bg-slate-400'}`} />
                    {effectiveSupportOnline ? 'Online' : supportOpen ? 'No agent' : 'Away'}
                  </div>
                  <button
                    onClick={() => { const next = !muted; setMuted(next); setSoundMuted(next) }}
                    title={muted ? 'Unmute' : 'Mute'}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Tab switcher — pills on desktop, dropdown on mobile */}
              <div className="mt-2 sm:hidden">
                <select
                  value={tab}
                  onChange={e => setTab(e.target.value as 'support' | 'inbox' | 'history')}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  <option value="support">Support Queue ({supportOpenCount})</option>
                  <option value="inbox">Inbox ({inboxCount})</option>
                  <option value="history">History</option>
                </select>
              </div>
              <div className="mt-2 hidden sm:flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 sm:overflow-visible sm:mx-0 sm:px-0">
                {([
                  { key: 'support', label: 'Support Queue', icon: HeadphonesIcon, count: supportOpenCount },
                  { key: 'inbox',   label: 'Inbox',         icon: Inbox,          count: inboxCount },
                  { key: 'history', label: 'History',        icon: Archive,        count: 0 },
                ] as const).map(t => {
                  const Icon = t.icon
                  return (
                    <button key={t.key} type="button" onClick={() => setTab(t.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        tab === t.key
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                          : 'border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}>
                      <Icon className="w-3 h-3" />
                      {t.label}
                      {t.count > 0 && (
                        <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                          tab === t.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>{t.count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

          {/* Tab content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {tab === 'support' || tab === 'history' ? <SupportTab view={tab === 'history' ? 'history' : 'queue'} onOpenQueued={(id) => { setPendingChatId(id); setTab('inbox') }} /> : (
              <InboxTab liveState={liveState} onOpenThreadChange={handleOpenThreadChange} initialChatId={pendingChatId} onInitialChatConsumed={() => setPendingChatId(null)} />
            )}
          </div>
        </div>
        </div>
      </MobileSidebarProvider>
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

