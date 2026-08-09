import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import {
  X, Send, MessageSquare, Paperclip, ChevronDown, ChevronLeft, ChevronRight,
  Check, Loader2, Clock2, Smile, Home, CalendarCheck, Building2, Headset,
  MessageCircle, AlertCircle,
} from 'lucide-react'
import { useLocation, redirect } from '../lib/navigation'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { getPlatformSettings, getNotificationSettings, phoneToWaLink } from '../lib/platform-settings'
import { fetchSupportPresence, subscribeSupportPresence, type LiveSupportState, type SupportAgent } from '../lib/live-support'
import { assignChatToAgent } from '../lib/support-assignment'
import { getSupportHours, isSupportOpen, type SupportHours } from '../lib/support-hours'

// ── Types ─────────────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; url: string; mediaType: string; data?: string }

interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
  time?: number
}

interface AgentMessage {
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

// Flat view — no nested stage objects
type WidgetView = 'home' | 'bot' | 'live'

// Live-chat sub-states — drives the status banner and input behaviour
type LiveStatus =
  | 'connecting'  // ticket being created; spinner shown, input disabled
  | 'active'      // agent assigned and in conversation
  | 'queued'      // ticket queued — no agent assigned right now (within hours)
  | 'offline'     // ticket queued — outside hours, no agent
  | 'guest-form'  // unauthenticated visitor needs contact info before ticket is created
  | 'error'       // ticket creation failed

// ── Config ────────────────────────────────────────────────────────────────────

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL
  ? `${import.meta.env.VITE_CHAT_API_URL}/api/chat`
  : '/api/chat'

// ── Menu options ──────────────────────────────────────────────────────────────

const MENU_OPTIONS = [
  { icon: Home,          title: 'Find a property',  desc: 'Browse verified rentals nearby',  msg: 'Show me the best verified rentals in Lagos and Ogun.', live: false, whatsapp: false },
  { icon: CalendarCheck, title: 'Book an inspection',desc: 'Schedule a viewing fast',          msg: 'I want to book a property inspection soon.',           live: false, whatsapp: false },
  { icon: Building2,     title: 'List my property',  desc: 'Rent it out on Livarex',           msg: 'I want to list my property on Livarex.',              live: false, whatsapp: false },
  { icon: Headset,       title: 'Chat with support', desc: 'Talk to a live agent',             msg: null, live: true,  whatsapp: false },
  { icon: MessageCircle, title: 'WhatsApp us',       desc: 'Chat on WhatsApp instead',         msg: null, live: false, whatsapp: true  },
]

const MENU_CHIPS = [
  { label: 'Top rentals',  msg: 'Show me the best rentals available right now.' },
  { label: 'Inspect now',  msg: 'Book an inspection for a property in Lagos.'   },
  { label: 'Budget plan',  msg: 'I want a 2-bedroom home under ₦400,000.'      },
]

const EMOJI = ['😀', '😂', '😊', '😍', '👍', '👏', '🙏', '🎉', '❤️', '🔥']

const ESCALATION_KEYWORDS = [
  'human agent', 'connect you with', 'real person', 'team member',
  'speak to a', 'connecting you', 'livarex agent',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const res = r.result as string
      const [header, data] = res.split(',')
      resolve({ data, mediaType: header.match(/:(.*?);/)?.[1] ?? 'image/jpeg' })
    }
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function formatTime(ts?: number | string) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function renderBotText(text: string): ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const bullet = line.match(/^[\s]*[•▪‣]\s+(.*)/)
    if (bullet) return (
      <div key={i} className="flex gap-2 mt-1 first:mt-0">
        <span className="text-primary mt-[7px] shrink-0 size-[5px] rounded-full bg-current" aria-hidden />
        <span>{formatInline(bullet[1])}</span>
      </div>
    )
    const numbered = line.match(/^[\s]*(\d+)[.)]\s+(.*)/)
    if (numbered) return (
      <div key={i} className="flex gap-2 mt-1 first:mt-0">
        <span className="text-primary text-xs font-bold shrink-0 leading-[1.7]">{numbered[1]}.</span>
        <span>{formatInline(numbered[2])}</span>
      </div>
    )
    if (/^[A-Z0-9][A-Z0-9 /&()_-]{3,}$/.test(line.trim()) && line.trim().length <= 40) return (
      <div key={i} className="mt-2 first:mt-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{formatInline(line.trim())}</div>
    )
    return <div key={i} className={i > 0 ? 'mt-1.5 first:mt-0' : ''}>{formatInline(line)}</div>
  })
}

function formatInline(text: string): ReactNode[] {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2
      ? <strong key={i} className="font-semibold">{part.slice(1, -1)}</strong>
      : <span key={i}>{part}</span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [location] = useLocation()

  const [open, setOpen]                         = useState(false)
  const [view, setView]                         = useState<WidgetView>('home')
  const [launcherDismissed, setLauncherDismissed] = useState(false)

  // ── AI bot state ─────────────────────────────────────────────────────────
  const [messages, setMessages]                 = useState<Message[]>([])
  const [input, setInput]                       = useState('')
  const [loading, setLoading]                   = useState(false)
  const [unread, setUnread]                     = useState(false)
  const [pendingImg, setPendingImg]             = useState<{ url: string; data: string; mediaType: string } | null>(null)
  const [showEmoji, setShowEmoji]               = useState(false)
  const [showMenu, setShowMenu]                 = useState(false)

  const [waHref, setWaHref] = useState('https://wa.me/2347061370742?text=Hello%20Livarex!')

  // ── Support hours + presence ──────────────────────────────────────────────
  const [supportHours, setSupportHours]         = useState<SupportHours | null>(null)
  const [, setHoursTick]                        = useState(0)

  useEffect(() => {
    getSupportHours().then(h => { if (h) setSupportHours(h) }).catch(() => {})
    const t = setInterval(() => setHoursTick(n => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    getPlatformSettings().then(s => {
      if (s.phone) setWaHref(phoneToWaLink(s.phone, 'Hello Livarex!'))
    }).catch(() => {})
  }, [])

  // ── Live-agent form fields ────────────────────────────────────────────────
  const [agentName, setAgentName]               = useState('')
  const [agentEmail, setAgentEmail]             = useState('')
  const [agentNote, setAgentNote]               = useState('')
  const [agentPhone, setAgentPhone]             = useState('')
  const [agentSubmitting, setAgentSubmitting]   = useState(false)
  const [agentTicketNo, setAgentTicketNo]       = useState<string | null>(null)

  // ── Presence ──────────────────────────────────────────────────────────────
  const [liveState, setLiveState]               = useState<LiveSupportState>({
    status: 'offline', online: false, onlineAgents: [], awayAgents: [],
    offlineAgents: [], agents: [], availableCount: 0, agentCount: 0,
  })
  const [presenceReady, setPresenceReady]       = useState(false)

  useEffect(() => {
    const unsub = subscribeSupportPresence(state => {
      setLiveState(state)
      setPresenceReady(true)
    })
    return unsub
  }, [])

  // ── Live agent thread state ───────────────────────────────────────────────
  const [inquiryId, setInquiryId]               = useState<string | null>(null)
  const [agentThread, setAgentThread]           = useState<AgentMessage[]>([])
  const [agentThreadLoading, setAgentThreadLoading] = useState(false)
  const [agentInput, setAgentInput]             = useState('')
  const [agentSending, setAgentSending]         = useState(false)
  const [agentUnread, setAgentUnread]           = useState(false)
  const [agentTyping, setAgentTyping]           = useState(false)
  const [agentJoined, setAgentJoined]           = useState(false)
  const [chatQueued, setChatQueued]             = useState(false)

  // Live sub-state & assigned agent
  const [liveStatus, setLiveStatus]             = useState<LiveStatus>('connecting')
  const [assignedAgent, setAssignedAgent]       = useState<string | null>(null)

  const bottomRef        = useRef<HTMLDivElement>(null)
  const inputRef         = useRef<HTMLInputElement>(null)
  const agentInputRef    = useRef<HTMLInputElement>(null)
  const fileRef          = useRef<HTMLInputElement>(null)
  const agentTypingTimer = useRef<number | null>(null)
  const typingSentAt     = useRef(0)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open, agentThread, agentThreadLoading])

  // Focus the right input when panel opens
  useEffect(() => {
    if (open) {
      setUnread(false)
      setAgentUnread(false)
      setTimeout(() => {
        if (view === 'live' && inquiryId) agentInputRef.current?.focus()
        else if (view === 'bot') inputRef.current?.focus()
      }, 250)
    }
  }, [open, view, inquiryId])

  // ── Restore an authenticated visitor's active thread on mount ─────────────
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: inquiries } = await supabase
        .from('chat_inquiries')
        .select('id, ticket_no')
        .eq('visitor_id', user.id)
        .in('status', ['open', 'replied'])
        .order('created_at', { ascending: false })
        .limit(1)
      if (inquiries && inquiries.length > 0) {
        setInquiryId(inquiries[0].id)
        setAgentTicketNo(inquiries[0].ticket_no)
        setAgentJoined(true)
        setView('live')
        setLiveStatus('active') // restore: assume active (agent may or may not be online; messages will load)
      }
    })
  }, [])

  // ── Load + poll the agent thread (server endpoint bypasses RLS) ───────────
  const lastMsgTimestamp = useRef<string | null>(null)

  useEffect(() => {
    if (!inquiryId) return
    setAgentThreadLoading(true)

    // Initial load via server endpoint
    fetch(`/api/get-chat-messages?inquiry_id=${inquiryId}`)
      .then(r => r.json())
      .then(({ messages }) => {
        const msgs = (messages ?? []) as AgentMessage[]
        setAgentThread(msgs)
        if (msgs.length > 0) lastMsgTimestamp.current = msgs[msgs.length - 1].created_at
      })
      .catch(err => console.error('Agent thread load error:', err))
      .finally(() => setAgentThreadLoading(false))

    // Poll every 3 s for new messages (picks up admin replies even without RLS SELECT)
    const poll = setInterval(async () => {
      try {
        const qs = lastMsgTimestamp.current
          ? `inquiry_id=${inquiryId}&after=${encodeURIComponent(lastMsgTimestamp.current)}`
          : `inquiry_id=${inquiryId}`
        const r = await fetch(`/api/get-chat-messages?${qs}`)
        const { messages } = await r.json()
        if (!messages?.length) return
        setAgentThread(prev => {
          const ids = new Set(prev.map((m: AgentMessage) => m.id))
          const fresh = (messages as AgentMessage[]).filter(m => !ids.has(m.id))
          if (!fresh.length) return prev
          // track unread admin messages
          fresh.forEach(m => {
            if (m.sender === 'admin' && !open) setAgentUnread(true)
          })
          lastMsgTimestamp.current = messages[messages.length - 1].created_at
          return [...prev, ...fresh]
        })
      } catch { /* non-fatal */ }
    }, 3000)

    // Keep realtime broadcast for typing indicators only (no postgres_changes — needs RLS SELECT)
    const supabase = isSupabaseConfigured() ? createClient() : null
    const channel = supabase
      ? supabase.channel(`admin_chat_inquiry:${inquiryId}`)
          .on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (payload?.sender === 'admin') {
              setAgentTyping(true)
              if (agentTypingTimer.current) window.clearTimeout(agentTypingTimer.current)
              agentTypingTimer.current = window.setTimeout(() => setAgentTyping(false), 2500)
            }
          })
          .subscribe()
      : null

    return () => {
      clearInterval(poll)
      if (channel && supabase) supabase.removeChannel(channel)
      if (agentTypingTimer.current) window.clearTimeout(agentTypingTimer.current)
    }
  }, [inquiryId, open])

  // ── Image attach ──────────────────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data, mediaType } = await fileToBase64(file)
    setPendingImg({ url: URL.createObjectURL(file), data, mediaType })
    e.target.value = ''
    inputRef.current?.focus()
  }

  function removePendingImg() {
    if (pendingImg) URL.revokeObjectURL(pendingImg.url)
    setPendingImg(null)
  }

  // ── Business hours + individual presence ──────────────────────────────────
  const supportOpen    = supportHours ? isSupportOpen(supportHours) : true
  const agentAvailable = liveState.availableCount > 0

  const openWhatsApp = useCallback((note?: string) => {
    getPlatformSettings().then(s => {
      const msg = note?.trim() || 'Hi, I\'d like to chat with Livarex support.'
      window.open(phoneToWaLink(s.phone, msg), '_blank', 'noopener,noreferrer')
    }).catch(() => window.open('https://wa.me/2347061370742', '_blank'))
  }, [])

  // ── goLive: show live view instantly, create ticket async ─────────────────
  const goLive = useCallback(() => {
    setLauncherDismissed(true)
    setView('live')
    setShowMenu(false)

    // Already have an active thread — just restore the right status.
    if (inquiryId) {
      setLiveStatus(chatQueued ? (supportOpen ? 'queued' : 'offline') : 'active')
      return
    }

    setLiveStatus('connecting')

    const run = async () => {
      let user: { id?: string; email?: string; user_metadata?: Record<string, unknown> } | null = null
      if (isSupabaseConfigured()) {
        const supabase = createClient()
        const { data: { user: u } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
        user = u
      }

      // Refresh presence so we have the latest agent state.
      let currentState = liveState
      if (!presenceReady || liveState.availableCount === 0) {
        currentState = await fetchSupportPresence()
        setLiveState(currentState)
        setPresenceReady(true)
      }

      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
      const name = typeof meta.full_name === 'string' && meta.full_name
        ? meta.full_name
        : (user?.email?.split('@')[0] ?? '')
      const email = user?.email ?? ''

      // Anonymous visitor with no saved name: collect contact info first,
      // then create the ticket (works whether agents are online or offline).
      if (!name && !agentName) {
        setLiveStatus('guest-form')
        return
      }

      const effectiveName  = name  || agentName  || 'Guest'
      const effectiveEmail = email || agentEmail || ''
      setAgentName(effectiveName)
      setAgentEmail(effectiveEmail)

      await connectLiveThread({
        name: effectiveName,
        email: effectiveEmail,
        firstMessage: '',
        agents: currentState.agents,
      })
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId, supportOpen, liveState, presenceReady, chatQueued, agentName, agentEmail])

  // ── connectLiveThread: creates the ticket and sets liveStatus ─────────────
  // IMPORTANT: No WhatsApp redirect on failure — errors are shown inline.
  async function connectLiveThread({
    name,
    email,
    firstMessage,
    agents,
  }: {
    name: string
    email: string
    firstMessage: string
    agents?: SupportAgent[]
  }) {
    if (!isSupabaseConfigured()) { setLiveStatus('error'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    const note = firstMessage.trim() || `Hi, I'm ${name}. I'd like some help.`

    const availableAgents = (agents ?? liveState.agents).filter(a => a.presence === 'online' && a.available)
    const assignment = assignChatToAgent(availableAgents)
    setChatQueued(assignment.agentId === null)

    // Capture the assigned agent's name for the header + status banner.
    if (assignment.agentId) {
      const found = (agents ?? liveState.agents).find(a => a.id === assignment.agentId)
      if (found?.name) setAssignedAgent(found.name)
    }

    // Use the server-side endpoint so the service-role key bypasses RLS.
    type TicketRow = { id: string; ticket_no: string | null; read_by_admin: boolean }
    let inserted: TicketRow
    try {
      const resp = await fetch('/api/create-chat-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || null,
          note,
          phone: null,
          visitor_id: user?.id ?? null,
          agent_id: assignment.agentId,
          agent_status: assignment.agentStatus,
        }),
      })
      const json = await resp.json().catch(() => null) as TicketRow | null
      if (!resp.ok || !json?.id) {
        console.error('Live thread error:', resp.status, json)
        setLiveStatus('error')
        return
      }
      inserted = json
    } catch (err) {
      console.error('Live thread fetch error:', err)
      setLiveStatus('error')
      return
    }

    setInquiryId(inserted.id)
    setAgentTicketNo(inserted.ticket_no ?? null)
    setAgentJoined(true)

    // Seed the thread with the visitor's opening note.
    setAgentThread([{
      id: `init-${Date.now()}`,
      inquiry_id: inserted.id,
      sender: 'visitor',
      body: note,
      read_by_admin: inserted.read_by_admin,
      read_by_visitor: true,
      attachment_url: null,
      attachment_name: null,
      created_at: new Date().toISOString(),
    }])

    // Resolve live status
    if (assignment.agentId) {
      setLiveStatus('active')
    } else if (supportOpen) {
      setLiveStatus('queued')
    } else {
      setLiveStatus('offline')
    }

    // Non-blocking admin notification
    getNotificationSettings().then(notif => {
      fetch('/api/send-support-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'chat',
          adminEmail: notif.adminEmail,
          userName: name,
          userEmail: email,
          subject: 'New support chat',
          message: note,
          ticketId: inserted.id,
          ticketNo: inserted.ticket_no ?? '',
          channel: assignment.agentId ? 'Live chat' : 'Live chat (queued)',
        }),
      }).catch(() => {})
    }).catch(() => {})
  }

  // ── Guest contact form submit (offline / no session) ──────────────────────
  async function submitGuestForm(e: React.FormEvent) {
    e.preventDefault()
    const name = agentName.trim()
    const note = agentNote.trim()
    if (!name || !note || agentSubmitting) return
    setAgentSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      const resp = await fetch('/api/create-chat-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: agentEmail.trim() || null,
          note,
          phone: agentPhone.trim() || null,
          visitor_id: user?.id ?? null,
          agent_status: 'queued',
        }),
      })
      const inserted = await resp.json().catch(() => null)
      if (!resp.ok || !inserted?.id) throw new Error(inserted?.error || `HTTP ${resp.status}`)
      setInquiryId(inserted.id ?? null)
      setAgentTicketNo(inserted.ticket_no ?? null)
      setAgentJoined(true)
      if (inserted?.id) {
        setAgentThread([{
          id: `init-${Date.now()}`,
          inquiry_id: inserted.id,
          sender: 'visitor',
          body: note,
          read_by_admin: inserted.read_by_admin,
          read_by_visitor: true,
          attachment_url: null, attachment_name: null,
          created_at: new Date().toISOString(),
        }])
        getNotificationSettings().then(notif => {
          fetch('/api/send-support-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'chat', adminEmail: notif.adminEmail, userName: name,
              userEmail: agentEmail.trim(), subject: 'Offline support message',
              message: note, ticketId: inserted.id, ticketNo: inserted.ticket_no ?? '',
              channel: 'Offline form',
            }),
          }).catch(() => {})
        }).catch(() => {})
      }
      setLiveStatus('offline')
    } catch (err) {
      console.error('Guest form error:', err)
      setLiveStatus('error')
    } finally {
      setAgentSubmitting(false)
      setAgentNote('')
    }
  }

  // ── Live agent-thread send (server endpoint bypasses RLS) ────────────────
  async function sendAgentMessage(e: React.FormEvent) {
    e.preventDefault()
    const body = agentInput.trim()
    if ((!body && !pendingImg) || agentSending || !inquiryId) return
    setAgentSending(true)
    setAgentInput('')
    setShowEmoji(false)
    const optId   = `opt-${Date.now()}`
    const optBody = body || '📷 Image'
    // Optimistic update
    setAgentThread(prev => [...prev, {
      id: optId, inquiry_id: inquiryId, sender: 'visitor', body: optBody,
      read_by_admin: false, read_by_visitor: true,
      attachment_url: pendingImg ? pendingImg.url : null,
      attachment_name: pendingImg ? 'attachment' : null,
      created_at: new Date().toISOString(),
    }])
    try {
      const resp = await fetch('/api/send-chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: inquiryId,
          body: optBody,
          attachment_url: pendingImg ? pendingImg.url : null,
          attachment_name: pendingImg ? 'attachment' : null,
        }),
      })
      const inserted = await resp.json().catch(() => null) as AgentMessage | null
      if (!resp.ok || !inserted?.id) throw new Error(inserted?.id ?? `HTTP ${resp.status}`)
      // Replace optimistic row with real DB row (gets the real id + created_at)
      setAgentThread(prev => prev.map(m => m.id === optId ? inserted : m))
      // Advance the poll cursor so we don't re-fetch this message
      lastMsgTimestamp.current = inserted.created_at
    } catch (err) {
      console.error('Agent message send error:', err)
      // Remove optimistic row and restore input so user can retry
      setAgentThread(prev => prev.filter(m => m.id !== optId))
      setAgentInput(body)
    } finally {
      setAgentSending(false)
      if (pendingImg) { URL.revokeObjectURL(pendingImg.url); setPendingImg(null) }
    }
  }

  const agentCanSend = (agentInput.trim().length > 0 || !!pendingImg) && !agentSending

  function broadcastTyping() {
    if (!inquiryId || !isSupabaseConfigured()) return
    const now = Date.now()
    if (now - typingSentAt.current < 1500) return
    typingSentAt.current = now
    const supabase = createClient()
    supabase.channel(`admin_chat_inquiry:${inquiryId}`)
      .send({ type: 'broadcast', event: 'typing', payload: { sender: 'visitor' } })
      .catch(() => {})
  }

  // ── AI bot send ───────────────────────────────────────────────────────────
  async function sendMessage(text: string, img: typeof pendingImg) {
    if (!text.trim() && !img) return
    setView('bot')
    setShowEmoji(false)
    setShowMenu(false)

    const userContent: ContentBlock[] = []
    if (img) userContent.push({ type: 'image_url', url: img.url, mediaType: img.mediaType, data: img.data })
    if (text.trim()) userContent.push({ type: 'text', text: text.trim() })

    const userMsg: Message = { role: 'user', content: userContent, time: Date.now() }
    const next = [...messages, userMsg]
    setMessages(next)
    setPendingImg(null)
    setLoading(true)

    const apiMessages = next.map(m => ({
      role: m.role,
      content: m.content.map(b =>
        b.type === 'image_url'
          ? { type: 'image', source: { type: 'base64', media_type: b.mediaType, data: b.data ?? '' } }
          : { type: 'text', text: b.text }
      ),
    }))

    try {
      const res = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const rawText = await res.text()
      let reply = 'Something went wrong.'
      if (rawText) {
        try {
          const data = JSON.parse(rawText)
          reply = data.reply || data.message || data.text || data.error || reply
        } catch { reply = rawText.replace(/<[^>]+>/g, '').trim() || reply }
      }
      setMessages(m => [...m, { role: 'assistant', content: [{ type: 'text', text: reply }], time: Date.now() }])
      if (!open) setUnread(true)
      if (ESCALATION_KEYWORDS.some(kw => reply.toLowerCase().includes(kw))) {
        setTimeout(() => goLive(), 700)
      }
    } catch {
      getPlatformSettings().then(s => {
        setMessages(m => [...m, {
          role: 'assistant',
          content: [{ type: 'text', text: `Connection issue. Reach us on WhatsApp: ${s.phone}.` }],
          time: Date.now(),
        }])
      }).catch(() => {
        setMessages(m => [...m, {
          role: 'assistant',
          content: [{ type: 'text', text: 'Connection issue. Reach us on WhatsApp: +234 706 137 0742.' }],
          time: Date.now(),
        }])
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSend()                 { sendMessage(input, pendingImg); setInput('') }
  function handleKey(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  const canSend = (input.trim().length > 0 || !!pendingImg) && !loading

  function startChat(openingPrompt?: string) {
    setView('bot')
    setShowEmoji(false)
    setShowMenu(false)
    const greeting: Message = {
      role: 'assistant',
      content: [{ type: 'text', text: 'So, what are we doing today? 😀\n\nPlease type in your request or tap Menu for quick options.' }],
      time: Date.now(),
    }
    const firstMessage = openingPrompt?.trim()
      ? [{ role: 'user' as const, content: [{ type: 'text' as const, text: openingPrompt.trim() }], time: Date.now() }]
      : []
    setMessages([greeting, ...firstMessage])
  }

  function browseHelp() {
    setLauncherDismissed(true)
    setOpen(false)
    redirect('/contact')
  }

  const goHome = () => { setShowEmoji(false); setShowMenu(false); setView('home') }

  // Presence line for the header
  const presenceLine = (() => {
    if (liveState.availableCount > 0) {
      return { dot: 'bg-emerald-400', text: `Online · ${liveState.availableCount} agent${liveState.availableCount === 1 ? ' available' : 's available'}` }
    }
    if (supportOpen) return { dot: 'bg-emerald-400', text: 'Online · reply within minutes' }
    return { dot: 'bg-slate-400/80', text: 'Away · 8:00 AM – 6:00 PM WAT' }
  })()

  // Live header sub-title
  const liveHeaderSub = (() => {
    if (liveStatus === 'active')   return `Chatting with ${assignedAgent ?? 'Livarex Support'}`
    if (liveStatus === 'queued')   return agentTicketNo ? `Ticket #${agentTicketNo} · queued` : 'Queued — agent joining soon'
    if (liveStatus === 'offline')  return agentTicketNo ? `Ticket #${agentTicketNo} · offline message` : 'We\'ll reply when back online'
    if (liveStatus === 'connecting') return 'Connecting…'
    return 'Livarex Support'
  })()

  // Composer visibility
  const showComposer = view === 'bot' || (view === 'live' && liveStatus !== 'guest-form')

  // Hide widget inside dashboards
  const path = (location || '').split('?')[0]
  if (path.startsWith('/admin') || path.startsWith('/landlord') || path.startsWith('/user') || path.startsWith('/dashboard')) return null

  // Escape closes panel
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Global styles ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes cwBounce  { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)} }
        @keyframes cwPulse   { 0%{transform:scale(1);opacity:0.6}70%,100%{transform:scale(1.7);opacity:0} }
        @keyframes cwFadeUp  { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes cwPop     { from{opacity:0;transform:scale(0.92) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes cwSpin    { to{transform:rotate(360deg)} }

        .cw-panel {
          position:fixed; bottom:calc(84px + env(safe-area-inset-bottom)); right:18px; z-index:9999;
          width:390px; height:600px; max-height:calc(100dvh - 110px);
          display:flex; flex-direction:column; border-radius:22px; overflow:hidden;
          background:#fff; border:1px solid rgba(226,232,240,0.7);
          box-shadow:0 32px 80px rgba(2,6,23,0.2), 0 4px 20px rgba(2,6,23,0.06);
          transform-origin:bottom right;
          transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s ease;
        }
        .cw-panel.open   { transform:scale(1) translateY(0);     opacity:1; pointer-events:auto;  }
        .cw-panel.closed { transform:scale(0.9) translateY(24px); opacity:0; pointer-events:none; }

        .cw-launcher {
          position:fixed; bottom:calc(84px + env(safe-area-inset-bottom)); right:18px; z-index:9998;
          width:300px; max-width:calc(100vw - 36px);
          background:#fff; border:1px solid hsl(var(--border));
          border-radius:16px; box-shadow:0 16px 48px rgba(2,6,23,0.16);
          padding:14px 16px; cursor:pointer;
          animation:cwPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
          transition:transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cw-launcher:hover { transform:translateY(-2px); box-shadow:0 20px 54px rgba(2,6,23,0.2); }

        @media(max-width:640px) {
          .cw-panel {
            left:0; right:0; bottom:0; width:100vw;
            height:92vh; height:92svh; height:92dvh; /* progressive: dvh best on modern Android/iOS */
            max-height:none; border-radius:20px 20px 0 0; border-bottom:none;
            transform-origin:bottom center;
            overscroll-behavior:contain;
            -webkit-overflow-scrolling:touch;
          }
          .cw-panel.open   { transform:translateY(0);    opacity:1; pointer-events:auto; }
          .cw-panel.closed { transform:translateY(100%); opacity:0; pointer-events:none; }
          .cw-handle { display:flex !important; }
          .cw-composer { padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))!important; }
          .cw-launcher { right:12px; bottom:calc(80px + env(safe-area-inset-bottom,0px)); }
          .cw-toggle   { right:calc(14px + env(safe-area-inset-right,0px)); bottom:calc(14px + env(safe-area-inset-bottom,0px)); }
        }
        /* Very small Android phones (320–380px) */
        @media(max-width:380px) {
          .cw-panel { border-radius:14px 14px 0 0; }
          .cw-hero-title { font-size:18px !important; }
          .cw-action-card { padding:12px !important; gap:10px !important; }
          .cw-action-icon { width:38px !important; height:38px !important; }
        }
        @media(max-width:640px) and (max-height:480px) { .cw-panel { height:100vh; height:100dvh; border-radius:0; } }
        @media(pointer:coarse) { .cw-attach,.cw-send { width:44px; height:44px; } }

        .cw-toggle {
          position:fixed; bottom:calc(18px + env(safe-area-inset-bottom)); right:calc(18px + env(safe-area-inset-right)); z-index:9999;
          width:56px; height:56px; border-radius:50%;
          background:linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary) / 0.8));
          border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
          box-shadow:0 8px 28px hsl(var(--primary) / 0.45);
          transition:transform 0.2s ease, background 0.2s;
        }
        .cw-toggle.open { transform:rotate(90deg) scale(0.94); }
        .cw-toggle:not(.open):hover { transform:scale(1.08); }
        .cw-toggle:focus-visible { outline:2px solid hsl(var(--ring)); outline-offset:3px; }

        .cw-scroll { scrollbar-width:thin; scrollbar-color:rgba(226,232,240,0.8) transparent; }
        .cw-scroll::-webkit-scrollbar { width:4px; }
        .cw-scroll::-webkit-scrollbar-thumb { background:rgba(226,232,240,0.8); border-radius:4px; }

        .cw-card { transition:box-shadow 0.18s ease,transform 0.18s ease; }
        .cw-card:hover { box-shadow:0 12px 32px rgba(2,6,23,0.12); transform:translateY(-1px); }

        .cw-chip { transition:background 0.15s ease, color 0.15s ease; }
        .cw-chip:hover { background:rgba(37,99,235,0.08) !important; color:#2563eb !important; }

        .cw-input:focus { outline:none; box-shadow:0 0 0 2px rgba(37,99,235,0.2); border-color:rgba(37,99,235,0.4) !important; }

        @media(prefers-reduced-motion:reduce) {
          .cw-panel,.cw-toggle,.cw-launcher { transition-duration:0.001s; }
          [class*='cw-'] { animation:none !important; }
        }

        /* Home view gradient */
        .cw-hero {
          background:linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%);
        }
      `}</style>

      {/* ── Launcher teaser (before first open) ──────────────────────────────── */}
      {!open && !launcherDismissed && (
        <div className="cw-launcher" role="button" tabIndex={0}
          aria-label="Open chat"
          onClick={() => { setLauncherDismissed(true); setOpen(true) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLauncherDismissed(true); setOpen(true) } }}
        >
          <div className="flex items-start gap-2.5">
            <AvatarBubble small />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-slate-900 leading-snug">Hi there! 👋</p>
              <p className="mt-0.5 text-[12px] text-slate-500 leading-snug">Need help finding a property?</p>
              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                Chat with us <ChevronRight size={11} />
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setLauncherDismissed(true) }} aria-label="Dismiss"
              className="shrink-0 grid size-5 place-items-center rounded-md text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* ── Chat panel ────────────────────────────────────────────────────────── */}
      <div className={`cw-panel ${open ? 'open' : 'closed'}`}
        role="dialog" aria-label="Livarex support chat" aria-hidden={!open}>

        {/* Mobile drag handle */}
        <div className="cw-handle" style={{ display:'none', width:'100%', padding:'10px 0 4px', justifyContent:'center', background:'#fff', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#e2e8f0' }} />
        </div>

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="cw-hero shrink-0 px-4 py-3.5 flex items-center gap-3">

          {/* Back button (non-home views) or brand avatar (home) */}
          {view !== 'home' ? (
            <button onClick={goHome} aria-label="Back to home"
              className="grid size-8 shrink-0 place-items-center rounded-xl text-white/80 hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-white/70">
              <ChevronLeft size={18} />
            </button>
          ) : (
            <AvatarBubble small />
          )}

          {/* Title / sub-title */}
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-white leading-tight truncate">
              {view === 'home' && 'Livarex Support'}
              {view === 'bot'  && 'AI Assistant'}
              {view === 'live' && (liveStatus === 'active' && assignedAgent ? assignedAgent : 'Livarex Support')}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/65 truncate">
              {view === 'home' && (
                <><span className={`inline-block size-1.5 rounded-full ${presenceLine.dot}`} />{presenceLine.text}</>
              )}
              {view === 'bot' && (
                <span>Powered by Claude · ask anything</span>
              )}
              {view === 'live' && (
                <><span className={`inline-block size-1.5 rounded-full ${
                  liveStatus === 'active' ? 'bg-emerald-400' :
                  liveStatus === 'queued' ? 'bg-amber-400' :
                  liveStatus === 'connecting' ? 'bg-blue-400' : 'bg-slate-400/70'
                }`} />{liveHeaderSub}</>
              )}
            </div>
          </div>

          {/* WhatsApp shortcut */}
          <a href={waHref} target="_blank" rel="noopener noreferrer"
            title="Chat on WhatsApp" aria-label="Continue on WhatsApp"
            className="grid size-8 shrink-0 place-items-center rounded-xl text-white/70 hover:bg-white/10 transition-colors"
          >
            {/* WhatsApp message-bubble icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 01-4.073-1.115l-.29-.174-3.007.894.894-3.006-.174-.29A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.406-5.884c-.242-.121-1.43-.706-1.652-.787-.222-.08-.383-.12-.545.121-.16.242-.623.787-.764.948-.14.16-.282.18-.524.06-.242-.12-1.022-.377-1.947-1.2-.72-.642-1.206-1.433-1.347-1.675-.14-.242-.015-.373.106-.494.109-.108.242-.282.362-.423.12-.14.16-.242.242-.403.08-.16.04-.302-.02-.423-.06-.12-.545-1.313-.747-1.797-.196-.472-.396-.408-.545-.415-.14-.007-.302-.009-.463-.009-.16 0-.423.06-.644.302-.222.242-.847.827-.847 2.017s.867 2.34 1.987 3.173c.12.09 1.66 1.061 4.02 1.488.562.096 1.001.154 1.342.197.563.072 1.075.062 1.48-.038.452-.11 1.392-.569 1.588-1.118.196-.549.196-1.02.137-1.118-.06-.1-.222-.16-.464-.282z"/>
            </svg>
          </a>

          {/* Minimise */}
          <button onClick={() => setOpen(false)} aria-label="Minimise chat"
            className="grid size-8 shrink-0 place-items-center rounded-xl text-white/70 hover:bg-white/10 transition-colors">
            <ChevronDown size={16} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}

        {/* ══ HOME VIEW ══════════════════════════════════════════════════════ */}
        {view === 'home' && (
          <div className="cw-scroll flex-1 overflow-y-auto" style={{ animation:'cwFadeUp 0.35s ease both' }}>

            {/* Hero section */}
            <div className="cw-hero px-5 pt-6 pb-14">
              <p className="cw-hero-title text-[22px] font-extrabold text-white leading-tight tracking-[-0.02em]">
                Hi there! 👋
              </p>
              <p className="mt-1.5 text-[13px] text-white/65 leading-relaxed">
                Ask our AI anything, or connect with a real support agent.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[12px] text-white/60">
                <span className="relative flex size-2 shrink-0">
                  <span className={`size-2 rounded-full ${liveState.availableCount > 0 || supportOpen ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  {(liveState.availableCount > 0 || supportOpen) && (
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                  )}
                </span>
                {liveState.availableCount > 0
                  ? `${liveState.availableCount} agent${liveState.availableCount === 1 ? '' : 's'} available right now`
                  : supportOpen
                    ? 'Support online · reply within minutes'
                    : 'Support hours 8 AM – 6 PM WAT'}
              </div>
            </div>

            {/* Action cards — overlap the hero gradient */}
            <div className="px-4 -mt-9 space-y-3">

              {/* AI Chat card */}
              <button onClick={() => startChat()}
                className="cw-card cw-action-card w-full text-left bg-white rounded-2xl shadow-[0_8px_30px_rgba(2,6,23,0.1)] p-4 flex items-center gap-3.5 cursor-pointer">
                <div className="cw-action-icon w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background:'linear-gradient(135deg,#dbeafe,#eff6ff)' }}>
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-slate-900">Chat with Livarex AI</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Get instant answers 24/7</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>

              {/* Live agent card */}
              <button onClick={goLive}
                className="cw-card cw-action-card w-full text-left bg-white rounded-2xl shadow-[0_8px_30px_rgba(2,6,23,0.1)] p-4 flex items-center gap-3.5 cursor-pointer">
                <div className="cw-action-icon w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background:'linear-gradient(135deg,#d1fae5,#ecfdf5)' }}>
                  <Headset className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-slate-900">Talk to a real agent</div>
                  <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mt-0.5">
                    <span className={`size-1.5 rounded-full shrink-0 ${agentAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {agentAvailable ? 'Ready to help now' : supportOpen ? 'Experiencing a short delay' : 'Leave a message'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            </div>

            {/* Quick actions */}
            <div className="px-5 mt-7">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick actions</p>
              <div className="flex flex-wrap gap-2">
                {MENU_OPTIONS.filter(o => o.msg).map(o => (
                  <button key={o.title}
                    onClick={() => startChat(o.msg!)}
                    className="cw-chip px-3 py-1.5 text-[12px] font-semibold text-slate-600 bg-slate-100 rounded-full border border-slate-200/80">
                    {o.title}
                  </button>
                ))}
                <button
                  onClick={() => openWhatsApp()}
                  className="cw-chip px-3 py-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200/80">
                  WhatsApp us
                </button>
              </div>
            </div>

            {/* Trust strip */}
            <div className="px-5 mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
              <span>Verified listings</span><span>·</span><span>₦0 agent fees</span><span>·</span><span>&lt;2h response</span>
            </div>

            {/* Social links */}
            <div className="px-5 mt-4 pb-6 flex items-center gap-2.5">
              <span className="text-[11px] text-slate-400 font-semibold">Follow us:</span>
              <a href="https://instagram.com/livarex.ng" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-pink-500 hover:border-pink-300 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://linkedin.com/company/livarex" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://twitter.com/livarex_ng" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter"
                className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                </svg>
              </a>
              <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* ══ BOT VIEW ════════════════════════════════════════════════════════ */}
        {view === 'bot' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Quick-action pill bar */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-white">
              <button onClick={() => setShowMenu(m => !m)}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-full transition-colors ${showMenu ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}>
                Menu
              </button>
              <button onClick={browseHelp}
                className="px-3 py-1.5 text-[12px] font-bold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-full transition-colors">
                Help
              </button>
              <button onClick={goLive}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors">
                <span className={`size-1.5 rounded-full ${agentAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                Talk to agent
              </button>
            </div>

            {/* Messages */}
            <div className="cw-scroll flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5"
              style={{ background:'#f8fafc' }}>

              {/* Menu overlay */}
              {showMenu && (
                <div className="flex items-end gap-2" style={{ animation:'cwFadeUp 0.25s ease both' }}>
                  <AvatarBubble small />
                  <div className="max-w-[82%] rounded-[18px_18px_18px_5px] bg-white border border-slate-200/80 shadow-sm overflow-hidden">
                    <p className="px-4 pt-3 pb-2 text-[13px] font-bold text-slate-800">Choose an option 👇</p>
                    {MENU_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      return (
                        <button key={opt.title}
                          onClick={() => {
                            setShowMenu(false)
                            if (opt.whatsapp) openWhatsApp()
                            else if (opt.live) goLive()
                            else sendMessage(opt.msg ?? '', null)
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
                          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                            <Icon size={15} />
                          </span>
                          <span>
                            <span className="block text-[13px] font-semibold text-slate-900">{opt.title}</span>
                            <span className="block text-[11px] text-slate-500">{opt.desc}</span>
                          </span>
                        </button>
                      )
                    })}
                    <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-slate-100">
                      {MENU_CHIPS.map(chip => (
                        <button key={chip.label} onClick={() => { setShowMenu(false); sendMessage(chip.msg, null) }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ animation:'cwFadeUp 0.28s ease both' }}>
                  {msg.role === 'assistant' && <AvatarBubble small />}
                  <div className={`flex max-w-[80%] flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.content.map((block, j) =>
                      block.type === 'image_url' ? (
                        <img key={j} src={block.url} alt="attachment" className="max-h-40 max-w-[200px] rounded-xl object-cover" />
                      ) : (
                        <div key={j} className="px-3.5 py-2.5 text-[13px] leading-relaxed break-words"
                          style={{
                            borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            whiteSpace: 'pre-wrap',
                            background: msg.role === 'user'
                              ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
                              : '#ffffff',
                            color: msg.role === 'user' ? '#fff' : '#1e293b',
                            boxShadow: msg.role === 'user'
                              ? '0 2px 10px rgba(29,78,216,0.28)'
                              : '0 1px 4px rgba(2,6,23,0.07)',
                            border: msg.role === 'assistant' ? '1px solid rgba(226,232,240,0.9)' : 'none',
                          }}>
                          {msg.role === 'user' ? block.text : renderBotText(block.text)}
                        </div>
                      )
                    )}
                    <span className="px-1 text-[10px] text-slate-400">
                      {formatTime(msg.time)}
                      {msg.role === 'user' && <span className="ml-1 text-blue-500">✓ Sent</span>}
                    </span>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-end gap-2" style={{ animation:'cwFadeUp 0.25s ease both' }}>
                  <AvatarBubble small />
                  <div className="rounded-[18px_18px_18px_4px] bg-white border border-slate-200 px-3.5 py-2.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <TypingDots />
                      <span className="text-[10.5px] text-slate-400">typing…</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* ══ LIVE VIEW ═══════════════════════════════════════════════════════ */}
        {view === 'live' && (
          <div className="flex flex-col flex-1 min-h-0">

            {/* ── Status banner ── */}
            {liveStatus === 'connecting' && (
              <div className="shrink-0 flex items-center justify-center gap-2 py-2.5 text-[12px] text-slate-500 bg-slate-50 border-b border-slate-100">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Connecting you to an agent…
              </div>
            )}
            {liveStatus === 'active' && (
              <div className="shrink-0 flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border-b border-emerald-100">
                <span className="size-2 rounded-full bg-emerald-500" />
                Connected with {assignedAgent ?? 'Livarex Support'}
                <span className="text-emerald-600/60 font-normal">· reply within seconds</span>
              </div>
            )}
            {liveStatus === 'queued' && (
              <div className="shrink-0 py-2.5 px-4 text-center bg-amber-50 border-b border-amber-100">
                <div className="text-[12px] font-bold text-amber-800">
                  ⏳ {agentTicketNo ? `Ticket #${agentTicketNo}` : 'Queued'} · An agent will respond shortly
                </div>
                <div className="text-[11px] text-amber-600 mt-0.5">You can type a message below while you wait</div>
              </div>
            )}
            {liveStatus === 'offline' && (
              <div className="shrink-0 py-2.5 px-4 text-center bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-slate-700">
                  <Clock2 className="w-3.5 h-3.5 shrink-0" />
                  {agentTicketNo ? `Ticket #${agentTicketNo} created` : 'Support is offline'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">We'll reply when back online · 8 AM – 6 PM WAT</div>
              </div>
            )}
            {liveStatus === 'error' && (
              <div className="shrink-0 flex items-center justify-center gap-2 py-2.5 px-4 text-center bg-red-50 border-b border-red-100">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-[12px] text-red-700 font-semibold">Connection failed.</span>
                <button onClick={goLive} className="text-[12px] text-red-600 underline font-semibold">Try again</button>
              </div>
            )}

            {/* ── Guest contact form (offline + unauthenticated) ── */}
            {liveStatus === 'guest-form' && (
              <div className="cw-scroll flex-1 overflow-y-auto px-5 py-5" style={{ background:'#f8fafc' }}>
                <p className="text-[14px] font-bold text-slate-900 mb-1">Start a conversation</p>
                <p className="text-[12.5px] text-slate-500 mb-5 leading-relaxed">
                  Enter your details and we'll connect you right away — or reply as soon as an agent is free.
                </p>
                <form onSubmit={submitGuestForm} className="space-y-3">
                  <Field label="Your name *">
                    <input value={agentName} onChange={e => setAgentName(e.target.value)} required
                      autoComplete="name" placeholder="e.g. Adebayo Okafor"
                      className="cw-input w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition" />
                  </Field>
                  <Field label="Email address">
                    <input value={agentEmail} onChange={e => setAgentEmail(e.target.value)} type="email"
                      autoComplete="email" placeholder="you@example.com"
                      className="cw-input w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition" />
                  </Field>
                  <Field label="Phone (optional)">
                    <input value={agentPhone} onChange={e => setAgentPhone(e.target.value)} type="tel"
                      autoComplete="tel" placeholder="+234 …"
                      className="cw-input w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition" />
                  </Field>
                  <Field label="Message *">
                    <textarea value={agentNote} onChange={e => setAgentNote(e.target.value)} required rows={3}
                      placeholder="How can we help?"
                      className="cw-input w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition" />
                  </Field>
                  <button type="submit"
                    disabled={!agentName.trim() || !agentNote.trim() || agentSubmitting}
                    className="w-full py-3 text-[13px] font-bold text-white rounded-xl transition-all disabled:opacity-50"
                    style={{ background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow:'0 4px 14px rgba(29,78,216,0.3)' }}>
                    {agentSubmitting ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              </div>
            )}

            {/* ── Thread messages ── */}
            {liveStatus !== 'guest-form' && (
              <div className="cw-scroll flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
                style={{ background:'#f8fafc' }}>

                {/* Empty state while connecting */}
                {liveStatus === 'connecting' && agentThread.length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 py-10">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background:'linear-gradient(135deg,#dbeafe,#eff6ff)' }}>
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-slate-700">Finding you an agent…</p>
                      <p className="text-[12px] text-slate-400 mt-0.5">This usually takes just a second</p>
                    </div>
                  </div>
                )}

                {agentThreadLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                  </div>
                ) : (
                  agentThread.map(msg => {
                    const isVisitor = msg.sender === 'visitor'
                    return (
                      <div key={msg.id}
                        className={`flex items-end gap-2 ${isVisitor ? 'justify-end' : 'justify-start'}`}
                        style={{ animation:'cwFadeUp 0.28s ease both' }}>
                        {!isVisitor && <AgentAvatarBubble name={assignedAgent} />}
                        <div className={`flex max-w-[78%] flex-col gap-1 ${isVisitor ? 'items-end' : 'items-start'}`}>
                          {msg.attachment_url && (
                            <img src={msg.attachment_url} alt={msg.attachment_name ?? 'attachment'}
                              className="max-h-40 max-w-[200px] rounded-xl object-cover border border-slate-200" />
                          )}
                          <div className="px-3.5 py-2.5 text-[13px] leading-relaxed break-words"
                            style={{
                              borderRadius: isVisitor ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              whiteSpace: 'pre-wrap',
                              background: isVisitor ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : '#ffffff',
                              color: isVisitor ? '#fff' : '#1e293b',
                              boxShadow: isVisitor
                                ? '0 2px 10px rgba(29,78,216,0.25)'
                                : '0 1px 4px rgba(2,6,23,0.07)',
                              border: isVisitor ? 'none' : '1px solid rgba(226,232,240,0.9)',
                              opacity: msg.id.startsWith('opt-') ? 0.65 : 1,
                            }}>
                            {msg.body}
                          </div>
                          <span className="px-1 text-[10px] text-slate-400">
                            {formatTime(msg.created_at)}
                            {isVisitor && !msg.id.startsWith('opt-') && (
                              <span className={`ml-1 ${msg.read_by_admin ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {msg.read_by_admin ? '✓✓ Read' : '✓ Sent'}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Agent typing indicator */}
                {agentTyping && !agentThreadLoading && (
                  <div className="flex items-end gap-2" style={{ animation:'cwFadeUp 0.25s ease both' }}>
                    <AgentAvatarBubble name={assignedAgent} />
                    <div className="rounded-[18px_18px_18px_4px] bg-white border border-slate-200 px-3.5 py-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <TypingDots />
                        <span className="text-[10.5px] text-slate-400">typing…</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        )}

        {/* ── Pending image preview ────────────────────────────────────────── */}
        {showComposer && pendingImg && (
          <div className="shrink-0 flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3.5 py-2">
            <div className="relative">
              <img src={pendingImg.url} alt="preview" className="size-12 rounded-lg object-cover border border-slate-200" />
              <button onClick={removePendingImg} aria-label="Remove image"
                className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-red-500 border-2 border-white cursor-pointer">
                <X size={8} className="text-white" />
              </button>
            </div>
            <span className="text-[11px] text-slate-500">Image attached · press send</span>
          </div>
        )}

        {/* ── Composer ─────────────────────────────────────────────────────── */}
        {showComposer && (
          <div className="cw-composer shrink-0 border-t border-slate-100 bg-white px-3 py-2.5">
            {/* Emoji picker */}
            {showEmoji && (
              <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-md">
                {EMOJI.map(e => (
                  <button key={e} onClick={() => {
                    if (view === 'live' && inquiryId) setAgentInput(v => v + e)
                    else setInput(v => v + e)
                    setShowEmoji(false)
                    ;(view === 'live' && inquiryId ? agentInputRef : inputRef).current?.focus()
                  }}
                    className="grid size-7 place-items-center rounded-lg text-lg hover:bg-slate-100 transition-colors">
                    {e}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Attach */}
              <button onClick={() => fileRef.current?.click()} title="Attach image" aria-label="Attach image"
                className="cw-attach grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
                <Paperclip size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />

              {/* Emoji */}
              <button onClick={() => setShowEmoji(s => !s)} title="Emoji" aria-label="Emoji"
                className="cw-attach grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
                <Smile size={16} />
              </button>

              {/* Input — live chat or bot */}
              {(view === 'live' && liveStatus !== 'guest-form') ? (
                <form onSubmit={sendAgentMessage} className="flex flex-1 items-center gap-2">
                  <input
                    ref={agentInputRef}
                    className="cw-input flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-900 outline-none transition"
                    value={agentInput}
                    onChange={e => { setAgentInput(e.target.value); broadcastTyping() }}
                    placeholder={
                      liveStatus === 'connecting' ? 'Connecting…' :
                      liveStatus === 'active' ? `Message ${assignedAgent ?? 'support'}…` :
                      'Leave a message…'
                    }
                    disabled={agentSending || liveStatus === 'connecting'}
                  />
                  <button type="submit" disabled={!agentCanSend} aria-label="Send"
                    className="cw-send grid size-9 shrink-0 place-items-center rounded-full border-none cursor-pointer disabled:cursor-default transition-all"
                    style={{
                      background: agentCanSend ? 'linear-gradient(135deg,#059669,#10b981)' : '#e2e8f0',
                      boxShadow: agentCanSend ? '0 4px 14px rgba(5,150,105,0.35)' : 'none',
                    }}>
                    <Send size={14} color={agentCanSend ? '#fff' : '#94a3b8'} className="translate-x-px" />
                  </button>
                </form>
              ) : (
                <>
                  <input
                    ref={inputRef}
                    className="cw-input flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-900 outline-none transition"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Type your message…"
                    disabled={loading}
                  />
                  <button onClick={handleSend} disabled={!canSend} aria-label="Send"
                    className="cw-send grid size-9 shrink-0 place-items-center rounded-full border-none cursor-pointer disabled:cursor-default transition-all"
                    style={{
                      background: canSend ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : '#e2e8f0',
                      boxShadow: canSend ? '0 4px 14px rgba(29,78,216,0.35)' : 'none',
                    }}>
                    <Send size={14} color={canSend ? '#fff' : '#94a3b8'} className="translate-x-px" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Toggle button ────────────────────────────────────────────────────── */}
      <button
        className={`cw-toggle${open ? ' open' : ''}`}
        onClick={() => { setLauncherDismissed(true); setOpen(o => !o) }}
        aria-label={open ? 'Close Livarex chat' : 'Open Livarex chat'}
        aria-expanded={open}
      >
        {open
          ? <X size={20} color="#fff" />
          : <MessageSquare size={20} color="#fff" />
        }
        {!open && (unread || agentUnread) && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary" style={{ animation:'cwPulse 2.2s ease-out infinite' }} aria-hidden />
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full border-2 border-white bg-red-500 grid place-items-center" aria-hidden>
              <span className="text-[8px] font-black text-white">•</span>
            </span>
          </>
        )}
      </button>
    </>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function AvatarBubble({ small = false }: { small?: boolean }) {
  const s = small ? 30 : 42
  return (
    <div className="relative shrink-0 grid place-items-center rounded-full text-white"
      style={{ width:s, height:s, fontSize: small ? 11 : 16, fontWeight:900, background:'linear-gradient(135deg,#1d4ed8,#6366f1)' }}>
      L
      {small && (
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-400" aria-hidden />
      )}
    </div>
  )
}

function AgentAvatarBubble({ name }: { name?: string | null }) {
  const initial = name ? name[0].toUpperCase() : 'A'
  return (
    <div className="relative shrink-0 grid size-[30px] place-items-center rounded-full text-white"
      style={{ fontSize:11, fontWeight:900, background:'linear-gradient(135deg,#059669,#10b981)' }}>
      {initial}
      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-400" aria-hidden />
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="inline-block size-[6px] rounded-full bg-slate-400/50"
          style={{ animation:'cwBounce 1.3s infinite ease-in-out', animationDelay:`${i * 0.18}s` }} />
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] font-bold text-slate-500">{label}</label>
      {children}
    </div>
  )
}
