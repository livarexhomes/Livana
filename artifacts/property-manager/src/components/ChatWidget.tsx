import { useState, useRef, useEffect, type ReactNode } from 'react'
import { X, Send, MessageSquare, Paperclip, ChevronDown, User, LayoutGrid, Check } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { getPlatformSettings, getNotificationSettings, phoneToWaLink } from '../lib/platform-settings'

// ── Types ─────────────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; url: string; mediaType: string; data?: string }

interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
}

interface AgentMessage {
  id: string
  inquiry_id: string
  sender: 'visitor' | 'admin'
  body: string
  created_at: string
}

// ── Config ────────────────────────────────────────────────────────────────────

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL
  ? `${import.meta.env.VITE_CHAT_API_URL}/api/chat`
  : '/api/chat'

// ── Quick action cards shown inline after welcome ─────────────────────────────

const ACTIONS = [
  { icon: '🏠', title: 'Find a home',       sub: 'Browse verified rentals', msg: 'Show me available verified rentals in Lagos and Ogun.' },
  { icon: '📅', title: 'Book inspection',   sub: 'Schedule a viewing',      msg: 'I want to book a property inspection. How do I do that?' },
  { icon: '🏢', title: 'List my property',  sub: 'Become a landlord',       msg: 'I am a landlord and want to list my property on Livarex.' },
  { icon: '👤', title: 'Talk to Agent',     sub: 'Get human support',       msg: null },
]

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

/**
 * Renders WhatsApp-flavored markdown used by the bot's system prompt
 * (*bold*, • bullets, lines starting with a number + period or emoji) as
 * structured JSX instead of raw text with asterisks.
 */
function renderBotText(text: string): ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bullet list item
    const bullet = line.match(/^[\s]*[•▪‣]\s+(.*)/)
    if (bullet) {
      return (
        <div key={i} className="flex gap-2 mt-1 first:mt-0">
          <span className="text-primary mt-[7px] shrink-0 size-[5px] rounded-full bg-current" aria-hidden />
          <span>{formatInline(bullet[1])}</span>
        </div>
      )
    }
    // Numbered list item (e.g. "1. First step")
    const numbered = line.match(/^[\s]*(\d+)[.)]\s+(.*)/)
    if (numbered) {
      return (
        <div key={i} className="flex gap-2 mt-1 first:mt-0">
          <span className="text-primary text-xs font-bold shrink-0 leading-[1.7]">{numbered[1]}.</span>
          <span>{formatInline(numbered[2])}</span>
        </div>
      )
    }
    // Heading line: uppercase bold label used for sections like "ABOUT LIVAREX"
    if (/^[A-Z0-9][A-Z0-9 /&()_-]{3,}$/.test(line.trim()) && line.trim().length <= 40) {
      return (
        <div key={i} className="mt-2 first:mt-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {formatInline(line.trim())}
        </div>
      )
    }
    return (
      <div key={i} className={i > 0 ? 'mt-1.5 first:mt-0' : ''}>{formatInline(line)}</div>
    )
  })
}

function formatInline(text: string): ReactNode[] {
  // Split on *bold* segments
  return text.split(/(\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i} className="font-semibold">{part.slice(1, -1)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen]             = useState(false)
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [unread, setUnread]         = useState(false)
  const [pendingImg, setPendingImg] = useState<{ url: string; data: string; mediaType: string } | null>(null)
  const [actionsUsed, setActionsUsed] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // Admin phone (from Settings) used for the header WhatsApp link + fallbacks.
  const [waHref, setWaHref] = useState('https://wa.me/2347061370742?text=Hello%20Livarex!')

  useEffect(() => {
    getPlatformSettings().then(s => {
      setWaHref(phoneToWaLink(s.phone, 'Hello Livarex!'))
    }).catch(() => { /* keep default */ })
  }, [])

  // ── Agent form state ──────────────────────────────────────────────────────
  const [showAgentForm, setShowAgentForm]       = useState(false)
  const [agentName, setAgentName]               = useState('')
  const [agentNote, setAgentNote]               = useState('')
  const [agentPhone, setAgentPhone]             = useState('')
  const [agentSubmitting, setAgentSubmitting]   = useState(false)
  const [agentSubmitted, setAgentSubmitted]     = useState(false)

  // ── Live agent-thread state (two-way chat with admin) ─────────────────────
  const [inquiryId, setInquiryId]               = useState<string | null>(null)
  const [agentThread, setAgentThread]           = useState<AgentMessage[]>([])
  const [agentThreadLoading, setAgentThreadLoading] = useState(false)
  const [agentInput, setAgentInput]             = useState('')
  const [agentSending, setAgentSending]         = useState(false)
  const [agentUnread, setAgentUnread]           = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) {
      setUnread(false)
      setAgentUnread(false)
      setTimeout(() => inputRef.current?.focus(), 220)
    }
  }, [open])

  // ── Anonymous sign-in + restore any active agent thread ─────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        // Quietly sign the visitor in anonymously; if the Supabase project
        // doesn't allow anonymous sign-ins, fall back to one-shot behavior.
        await supabase.auth.signInAnonymously().catch(() => {})
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Reconnect the visitor to their most recent open thread (if any)
      const { data: inquiries } = await supabase
        .from('chat_inquiries')
        .select('id')
        .eq('visitor_id', user.id)
        .in('status', ['open', 'replied'])
        .order('created_at', { ascending: false })
        .limit(1)
      if (inquiries && inquiries.length > 0) {
        setInquiryId(inquiries[0].id)
        setShowAgentForm(false)
        setAgentSubmitted(true)
      }
    })
  }, [])

  // ── Load + subscribe to the agent thread ────────────────────────────────────
  useEffect(() => {
    if (!inquiryId) return
    const supabase = createClient()
    setAgentThreadLoading(true)
    supabase.from('chat_messages').select('*')
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Agent thread load error:', error)
        setAgentThread((data as AgentMessage[]) ?? [])
        setAgentThreadLoading(false)
      })

    const channel = supabase.channel(`visitor_chat:${inquiryId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `inquiry_id=eq.${inquiryId}` },
        (payload) => {
          const msg = payload.new as AgentMessage
          setAgentThread(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
          if (msg.sender === 'admin' && !open) setAgentUnread(true)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [inquiryId])

  // ── Image attach ─────────────────────────────────────────────────────────────
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

  // ── Agent form ────────────────────────────────────────────────────────────────
  function triggerAgentForm() {
    setActionsUsed(true)
    setShowMenu(false)
    setShowAgentForm(true)
  }

  async function submitAgentForm(e: React.FormEvent) {
    e.preventDefault()
    const name = agentName.trim()
    const note = agentNote.trim()
    if (!name || !note || agentSubmitting) return
    setAgentSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: inserted, error } = await supabase.from('chat_inquiries').insert({
        name,
        note,
        phone: agentPhone.trim() || null,
        visitor_id: user?.id ?? null,
      }).select('id, read_by_admin').single()
      if (error) throw error
      setAgentSubmitted(true)
      if (inserted?.id) {
        // Enter the live thread — the visitor's note is the first message
        setInquiryId(inserted.id)
        setShowAgentForm(false)
        setAgentThread([{
          id: `initial-${inserted.id}`,
          inquiry_id: inserted.id,
          sender: 'visitor',
          body: note,
          created_at: new Date().toISOString(),
        }])

        // Notify the admin (email + notification bell picks it up via realtime).
        getNotificationSettings().then(notif => {
          fetch('/api/send-support-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'chat',
              adminEmail: notif.adminEmail,
              userName: name,
              userEmail: '',
              subject: 'Website chat inquiry',
              message: note,
              ticketId: inserted.id,
              channel: 'Live chat',
            }),
          }).catch(() => { /* non-fatal */ })
        }).catch(() => { /* non-fatal */ })
      }
    } catch (err) {
      console.error('Agent form error:', err)
      // fall back to WhatsApp on failure
      getPlatformSettings().then(s => {
        window.open(phoneToWaLink(s.phone, `Hi, I'm ${name}. ${note}`), '_blank')
      }).catch(() => {
        window.open('https://wa.me/2347061370742', '_blank')
      })
      setAgentSubmitted(true)
    } finally {
      setAgentSubmitting(false)
    }
  }

  // ── Live agent-thread send ─────────────────────────────────────────────────
  async function sendAgentMessage(e: React.FormEvent) {
    e.preventDefault()
    const body = agentInput.trim()
    if (!body || agentSending || !inquiryId) return
    setAgentSending(true)
    setAgentInput('')
    const optId = `opt-${Date.now()}`
    setAgentThread(prev => [...prev, {
      id: optId, inquiry_id: inquiryId, sender: 'visitor', body, created_at: new Date().toISOString(),
    }])
    const supabase = createClient()
    try {
      const { data: inserted, error } = await supabase.from('chat_messages')
        .insert({ inquiry_id: inquiryId, sender: 'visitor', body }).select().single()
      if (error) throw error
      if (inserted) setAgentThread(prev => prev.map(m => m.id === optId ? inserted as AgentMessage : m))
      // Flag the inquiry as unread for the admin
      await supabase.from('chat_inquiries').update({ read_by_admin: false }).eq('id', inquiryId)
    } catch (err) {
      console.error('Agent message send error:', err)
      setAgentThread(prev => prev.filter(m => m.id !== optId))
      setAgentInput(body)
    } finally {
      setAgentSending(false)
    }
  }

  const agentCanSend = agentInput.trim().length > 0 && !agentSending

  // ── Send ──────────────────────────────────────────────────────────────────────
  async function sendMessage(text: string, img: typeof pendingImg) {
    if (!text.trim() && !img) return
    setActionsUsed(true)
    setShowMenu(false)

    const userContent: ContentBlock[] = []
    if (img) userContent.push({ type: 'image_url', url: img.url, mediaType: img.mediaType, data: img.data })
    if (text.trim()) userContent.push({ type: 'text', text: text.trim() })

    const userMsg: Message = { role: 'user', content: userContent }
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
      const res  = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || 'Something went wrong.'
      setMessages(m => [...m, {
        role: 'assistant',
        content: [{ type: 'text', text: reply }],
      }])
      if (!open) setUnread(true)
      // If bot is escalating to human, auto-show the form
      if (!agentSubmitted && !showAgentForm && ESCALATION_KEYWORDS.some(kw => reply.toLowerCase().includes(kw))) {
        setTimeout(() => setShowAgentForm(true), 700)
      }
    } catch {
      getPlatformSettings().then(s => {
        setMessages(m => [...m, {
          role: 'assistant',
          content: [{ type: 'text', text: `Connection issue. Reach us on WhatsApp: ${s.phone}.` }],
        }])
      }).catch(() => {
        setMessages(m => [...m, {
          role: 'assistant',
          content: [{ type: 'text', text: 'Connection issue. Reach us on WhatsApp: +234 800 548 2621.' }],
        }])
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    sendMessage(input, pendingImg)
    setInput('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const canSend = (input.trim().length > 0 || !!pendingImg) && !loading

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Global styles ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes cwBounce {
          0%,60%,100% { transform:translateY(0); }
          30%          { transform:translateY(-5px); }
        }
        @keyframes cwPulse {
          0%  { transform:scale(1);   opacity:0.5; }
          70% { transform:scale(1.8); opacity:0;   }
          100%{ transform:scale(1.8); opacity:0;   }
        }
        @keyframes cwFadeUp {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0);   }
        }

        /* ── Panel ── */
        .cw-panel {
          position:fixed; bottom:calc(72px + env(safe-area-inset-bottom)); right:18px; z-index:9999;
          width:380px; height:560px; max-height:calc(100dvh - 96px);
          display:flex; flex-direction:column;
          border-radius:16px; overflow:hidden;
          background:hsl(var(--background));
          box-shadow:0 24px 64px rgba(2,6,23,0.2),0 4px 16px rgba(2,6,23,0.08);
          transform-origin:bottom right;
          transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.18s ease;
        }
        .cw-panel.open   { transform:scale(1) translateY(0);     opacity:1; pointer-events:auto;  }
        .cw-panel.closed { transform:scale(0.86) translateY(18px); opacity:0; pointer-events:none; }

        /* ── Mobile bottom sheet ── */
        @media(max-width:640px){
          .cw-panel {
            left:0;right:0;bottom:0;width:100%;height:92dvh;max-height:none;
            border-radius:16px 16px 0 0;
            transform-origin:bottom center;
          }
          .cw-panel.open   { transform:translateY(0);    opacity:1; pointer-events:auto; }
          .cw-panel.closed { transform:translateY(100%); opacity:0; pointer-events:none; }
          .cw-handle { display:block !important; }
          /* Keep the input bar above the iOS home indicator / Android nav bar */
          .cw-input-bar { padding-bottom:calc(10px + env(safe-area-inset-bottom))!important; }
        }

        /* ── Short viewports (landscape phones / small screens) ── */
        @media(max-width:640px) and (max-height:480px){
          .cw-panel { height:100dvh; border-radius:0; }
        }

        /* ── Minimum 44px touch targets on touch devices ── */
        @media (pointer:coarse){
          .cw-attach, .cw-send { width:44px; height:44px; }
        }

        /* ── Toggle button ── */
        .cw-toggle {
          position:fixed; bottom:calc(18px + env(safe-area-inset-bottom)); right:calc(18px + env(safe-area-inset-right)); z-index:9999;
          width:52px; height:52px; border-radius:50%;
          background:hsl(var(--primary)); border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 20px hsl(var(--primary) / 0.45);
          transition:transform 0.2s ease, background 0.2s;
        }
        .cw-toggle.open { background:hsl(var(--primary) / 0.9); transform:rotate(8deg) scale(0.94); }
        .cw-toggle:not(.open):hover { transform:scale(1.08); }
        .cw-toggle:focus-visible { outline:2px solid hsl(var(--ring)); outline-offset:3px; }

        /* ── Messages scroll ── */
        .cw-scroll { scrollbar-width:thin; scrollbar-color:hsl(var(--border)) transparent; }
        .cw-scroll::-webkit-scrollbar { width:5px; }
        .cw-scroll::-webkit-scrollbar-thumb { background:hsl(var(--border)); border-radius:5px; }

        /* ── Action card hover ── */
        .cw-action:hover { border-color:hsl(var(--primary)) !important; background:hsl(var(--primary) / 0.06) !important; }
        .cw-action:hover .cw-action-title { color:hsl(var(--primary)) !important; }

        /* ── Input focus ── */
        .cw-input:focus { box-shadow:0 0 0 2px hsl(var(--ring) / 0.25); }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .cw-panel, .cw-toggle { transition-duration:0.001s; }
          .cw-panel.open, .cw-panel.closed { transform:none; }
          [class*='cw-'] { animation:none !important; }
        }
      `}</style>

      {/* ── Chat panel ────────────────────────────────────────────────────────── */}
      <div className={`cw-panel ${open ? 'open' : 'closed'}`}
        role="dialog" aria-label="Livarex AI chat">

        {/* Drag handle (mobile only) */}
        <div className="cw-handle" style={{
          display:'none', width:'100%', padding:'10px 0 4px',
          justifyContent:'center', background:'hsl(var(--background))', flexShrink:0,
        }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'hsl(var(--border))' }} />
        </div>

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 flex items-center gap-3 px-4 py-3.5 overflow-hidden"
          style={{
            background:'linear-gradient(160deg,hsl(var(--sidebar-primary) / 0.95) 0%, hsl(var(--primary) / 0.85) 100%)',
          }}>
          {/* Avatar */}
          <div className="relative shrink-0 flex items-center justify-center size-10 rounded-full text-[15px] font-black text-white"
            style={{ background:'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow:'0 0 0 3px rgba(255,255,255,0.15)' }}>
            L
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-400" aria-hidden />
          </div>

          {/* Name + status */}
          <div className="min-w-0 flex-1 text-white">
            <div className="truncate text-[14px] font-bold tracking-[-0.01em]">Livarex AI</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
              <span className="inline-block size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" aria-hidden />
              Online · Property assistant
            </div>
          </div>

          {/* Menu button — only visible once a conversation has started */}
          {actionsUsed && (
            <button
              onClick={() => setShowMenu(v => !v)}
              title="Show menu"
              aria-label="Show menu"
              className="grid size-8 shrink-0 place-items-center rounded-lg border-none text-white/65 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white/70 hover:bg-white/15"
              style={{ background: showMenu ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)' }}
            >
              <LayoutGrid size={14} />
            </button>
          )}

          {/* WhatsApp */}
          <a href={waHref}
            target="_blank" rel="noopener noreferrer"
            title="Continue on WhatsApp"
            aria-label="Continue on WhatsApp"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-white/65 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white/70"
            style={{ background:'rgba(255,255,255,0.08)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>

          {/* Minimise */}
          <button onClick={() => setOpen(false)}
            aria-label="Minimise chat"
            className="grid size-8 shrink-0 place-items-center rounded-lg border-none text-white/65 transition-colors cursor-pointer hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white/70"
            style={{ background:'rgba(255,255,255,0.08)' }}
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* ── Messages ────────────────────────────────────────────────────────── */}
        <div className="cw-scroll flex-1 overflow-y-auto px-3.5 py-4 flex flex-col gap-3"
          style={{ background:'hsl(var(--muted) / 0.5)' }}>

          {/* Welcome card (always shown) */}
          <div style={{ animation:'cwFadeUp 0.4s ease both' }}>
            <div className="flex items-end gap-2">
              <Avatar small />
              <div className="max-w-[82%] rounded-[16px_16px_16px_4px] border border-border/60 bg-card px-3.5 py-2.5 text-[13px] leading-relaxed text-card-foreground shadow-[0_1px_3px_rgba(2,6,23,0.05)]">
                Hi there! 👋 I'm <strong>Livarex AI</strong> — your property assistant.<br/>
                How can I help you today?
              </div>
            </div>
          </div>

          {/* Quick action cards — shown on first open, or when Menu button is pressed */}
          {(!actionsUsed && messages.length === 0) || showMenu ? (
            <div className="grid grid-cols-2 gap-2" style={{ animation:'cwFadeUp 0.3s ease both' }}>
              {showMenu && (
                <div className="col-span-2 pb-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  What can I help you with?
                </div>
              )}
              {ACTIONS.map(a => (
                <button
                  key={a.title}
                  className="cw-action flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left transition-all cursor-pointer hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => a.msg ? sendMessage(a.msg, null) : triggerAgentForm()}
                >
                  <span className="text-xl leading-none" aria-hidden>{a.icon}</span>
                  <span className="cw-action-title text-xs font-bold leading-tight text-card-foreground transition-colors">{a.title}</span>
                  <span className="text-[10.5px] leading-tight text-muted-foreground">{a.sub}</span>
                </button>
              ))}
            </div>
          ) : null}

          {/* Conversation messages */}
          {messages.map((msg, i) => (
            <div key={i} className="flex items-end gap-2"
              style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation:'cwFadeUp 0.3s ease both' }}>
              {msg.role === 'assistant' && <Avatar small />}
              <div className="flex max-w-[80%] flex-col gap-1"
                style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.content.map((block, j) =>
                  block.type === 'image_url' ? (
                    <img key={j} src={block.url} alt="attachment" className="max-h-40 max-w-[200px] rounded-xl border-2 border-white/40 object-cover" />
                  ) : (
                    <div key={j} className="px-3 py-2 text-[13px] leading-relaxed break-words"
                      style={{
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        whiteSpace:'pre-wrap',
                        background: msg.role === 'user' ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : 'hsl(var(--card))',
                        color: msg.role === 'user' ? '#fff' : 'hsl(var(--card-foreground))',
                        boxShadow: msg.role === 'assistant'
                          ? '0 1px 3px rgba(2,6,23,0.05)'
                          : '0 2px 8px rgba(37,99,235,0.25)',
                        border: msg.role === 'assistant' ? '1px solid hsl(var(--border) / 0.6)' : 'none',
                      }}>
                      {msg.role === 'user' ? block.text : renderBotText(block.text)}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}

          {/* ── Agent contact form (shown until a live thread exists) ─────── */}
          {showAgentForm && !inquiryId && (
            <div className="flex items-start gap-2" style={{ animation:'cwFadeUp 0.35s ease both' }}>
              <Avatar small />
              <div className="max-w-[88%] flex-1 rounded-[16px_16px_16px_4px] border border-border/70 bg-card p-4 shadow-[0_1px_3px_rgba(2,6,23,0.05)]">
                {agentSubmitted ? (
                  <div className="py-2 text-center">
                    <div className="mx-auto mb-2.5 grid size-9 place-items-center rounded-full bg-emerald-100">
                      <Check size={18} className="text-emerald-700" />
                    </div>
                    <p className="m-0 text-[13px] font-bold text-emerald-800">Request received!</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Our team will reach out within 2 hours on business days.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submitAgentForm} className="flex flex-col gap-2.5">
                    <div className="mb-0.5 flex items-center gap-2">
                      <div className="grid size-6.5 place-items-center rounded-lg bg-primary/10">
                        <User size={13} className="text-primary" />
                      </div>
                      <div>
                        <p className="m-0 text-xs font-bold text-card-foreground">Talk to a Livarex agent</p>
                        <p className="m-0 text-[10.5px] text-muted-foreground">We reply within 2 hours on business days</p>
                      </div>
                    </div>
                    <Field label="Your name *">
                      <input
                        value={agentName}
                        onChange={e => setAgentName(e.target.value)}
                        placeholder="e.g. Adebayo Okafor"
                        required
                        className="w-full rounded-lg border border-input bg-muted/40 px-3 py-2 text-xs text-card-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                    </Field>
                    <Field label="What do you need help with? *">
                      <textarea
                        value={agentNote}
                        onChange={e => setAgentNote(e.target.value)}
                        placeholder="Briefly describe what you need…"
                        required
                        rows={2}
                        className="w-full resize-none rounded-lg border border-input bg-muted/40 px-3 py-2 text-xs text-card-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                    </Field>
                    <Field label="Phone number (optional)">
                      <input
                        value={agentPhone}
                        onChange={e => setAgentPhone(e.target.value)}
                        placeholder="+234 …"
                        type="tel"
                        className="w-full rounded-lg border border-input bg-muted/40 px-3 py-2 text-xs text-card-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                    </Field>
                    <button
                      type="submit"
                      disabled={!agentName.trim() || !agentNote.trim() || agentSubmitting}
                      className="mt-1 rounded-[10px] border-none py-2 text-xs font-bold transition-all cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-ring"
                      style={{
                        background: (!agentName.trim() || !agentNote.trim() || agentSubmitting)
                          ? 'hsl(var(--muted-foreground) / 0.2)' : 'linear-gradient(135deg,#2563eb,#3b82f6)',
                        color: (!agentName.trim() || !agentNote.trim() || agentSubmitting)
                          ? 'hsl(var(--muted-foreground))' : '#fff',
                      }}
                    >
                      {agentSubmitting ? 'Sending…' : 'Send Request'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ── Live agent thread (two-way chat with admin) ───────────────── */}
          {inquiryId && (
            <>
              <div className="flex justify-center">
                <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                  style={{ animation:'cwFadeUp 0.3s ease both' }}>
                  Connected to a Livarex agent
                </span>
              </div>
              {agentThreadLoading ? (
                <div className="flex items-end gap-2" style={{ animation:'cwFadeUp 0.25s ease both' }}>
                  <Avatar small />
                  <div className="rounded-[16px_16px_16px_4px] border border-border/60 bg-card shadow-[0_1px_3px_rgba(2,6,23,0.05)]">
                    <TypingDots />
                  </div>
                </div>
              ) : (
                agentThread.map((msg) => {
                  const isVisitor = msg.sender === 'visitor'
                  return (
                    <div key={msg.id} className="flex items-end gap-2"
                      style={{ justifyContent: isVisitor ? 'flex-end' : 'flex-start', animation:'cwFadeUp 0.3s ease both' }}>
                      {!isVisitor && <AgentAvatar />}
                      <div className="flex max-w-[80%] flex-col gap-1"
                        style={{ alignItems: isVisitor ? 'flex-end' : 'flex-start' }}>
                        <div className="px-3 py-2 text-[13px] leading-relaxed break-words"
                          style={{
                            borderRadius: isVisitor ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            whiteSpace:'pre-wrap',
                            background: isVisitor ? 'linear-gradient(135deg,#059669,#10b981)' : 'hsl(var(--card))',
                            color: isVisitor ? '#fff' : 'hsl(var(--card-foreground))',
                            boxShadow: isVisitor ? '0 2px 8px rgba(5,150,105,0.25)' : '0 1px 3px rgba(2,6,23,0.05)',
                            border: isVisitor ? 'none' : '1px solid hsl(var(--border) / 0.6)',
                            opacity: msg.id.startsWith('opt-') ? 0.6 : 1,
                          }}>
                          {msg.body}
                        </div>
                        <span className="px-1 text-[10px] text-muted-foreground">
                          {isVisitor ? 'You' : 'Agent'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-end gap-2" style={{ animation:'cwFadeUp 0.25s ease both' }}>
              <Avatar small />
              <div className="rounded-[16px_16px_16px_4px] border border-border/60 bg-card shadow-[0_1px_3px_rgba(2,6,23,0.05)]">
                <TypingDots/>
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* ── Pending image preview ────────────────────────────────────────────── */}
        {pendingImg && (
          <div className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-muted/40 px-3.5 py-2">
            <div className="relative">
              <img src={pendingImg.url} alt="preview" className="size-12 rounded-lg border border-border object-cover" />
              <button onClick={removePendingImg} aria-label="Remove image"
                className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full border-2 border-card bg-destructive cursor-pointer"
              >
                <X size={8} className="text-white" />
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">Image ready · press send</span>
          </div>
        )}

        {/* ── Input bar ────────────────────────────────────────────────────────── */}
        <div className="cw-input-bar flex shrink-0 items-center gap-2 border-t border-border/60 bg-card px-3 py-2.5">
          {/* Attach (bot mode only) */}
          {!inquiryId && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                title="Attach image"
                aria-label="Attach image"
                className="cw-attach grid size-8.5 shrink-0 cursor-pointer place-items-center rounded-[10px] border-none text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                style={{ background:'hsl(var(--muted))' }}
              >
                <Paperclip size={15} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
            </>
          )}

          {/* Text — agent mode when a live thread is active */}
          {inquiryId ? (
            <form onSubmit={sendAgentMessage} className="flex flex-1 items-center gap-2">
              <input
                className="cw-input flex-1 rounded-[22px] border border-transparent px-3.5 py-2 text-[16px] text-card-foreground outline-none transition-shadow focus:border-transparent sm:text-[13px]"
                value={agentInput}
                onChange={e => setAgentInput(e.target.value)}
                placeholder="Message the agent…"
                disabled={agentSending}
                style={{ background:'hsl(var(--muted))' }}
              />
              <button
                type="submit"
                disabled={!agentCanSend}
                aria-label="Send message to agent"
                className="cw-send grid size-9 shrink-0 place-items-center rounded-full border-none transition-all cursor-pointer disabled:cursor-default"
                style={{
                  background: agentCanSend ? 'linear-gradient(135deg,#059669,#10b981)' : 'hsl(var(--muted-foreground) / 0.25)',
                  boxShadow: agentCanSend ? '0 4px 12px rgba(5,150,105,0.35)' : 'none',
                  transform: agentCanSend ? 'scale(1)' : 'scale(0.92)',
                }}
              >
                <Send size={14} color={agentCanSend ? '#fff' : 'hsl(var(--muted-foreground))'} className="translate-x-px" />
              </button>
            </form>
          ) : (
            <>
              {/* Text */}
              <input
                ref={inputRef}
                className="cw-input flex-1 rounded-[22px] border border-transparent px-3.5 py-2 text-[16px] text-card-foreground outline-none transition-shadow focus:border-transparent sm:text-[13px]"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Message Livarex AI…"
                disabled={loading}
                style={{ background:'hsl(var(--muted))' }}
              />

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send message"
                className="cw-send grid size-9 shrink-0 place-items-center rounded-full border-none transition-all cursor-pointer disabled:cursor-default"
                style={{
                  background: canSend ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : 'hsl(var(--muted-foreground) / 0.25)',
                  boxShadow: canSend ? '0 4px 12px rgba(37,99,235,0.35)' : 'none',
                  transform: canSend ? 'scale(1)' : 'scale(0.92)',
                }}
              >
                <Send size={14} color={canSend ? '#fff' : 'hsl(var(--muted-foreground))'} className="translate-x-px" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Toggle button ─────────────────────────────────────────────────────── */}
      <button
        className={`cw-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close Livarex chat' : 'Open Livarex chat'}
      >
        {open
          ? <X size={18} color="#fff"/>
          : <MessageSquare size={17} color="#fff"/>
        }
        {!open && (unread || agentUnread) && (
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-destructive" aria-hidden />
        )}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-primary" style={{ animation:'cwPulse 2.8s ease-out infinite' }} aria-hidden />
        )}
      </button>
    </>
  )
}

// ── Small shared bits ──────────────────────────────────────────────────────────

function Avatar({ small = false }: { small?: boolean }) {
  const size = small ? 28 : 40
  return (
    <div className="relative shrink-0 grid place-items-center rounded-full text-white"
      style={{
        width:size, height:size, fontSize: small ? 10 : 15, fontWeight:900,
        background:'linear-gradient(135deg,#3b82f6,#6366f1)',
      }}>
      L
      {small && (
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-400" aria-hidden />
      )}
    </div>
  )
}

function AgentAvatar() {
  return (
    <div className="relative shrink-0 grid size-7 place-items-center rounded-full text-white"
      style={{
        fontSize: 10, fontWeight: 900,
        background:'linear-gradient(135deg,#059669,#10b981)',
      }}>
      A
      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-400" aria-hidden />
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-3">
      {[0, 1, 2].map(i => (
        <span key={i} className="inline-block size-[7px] rounded-full bg-muted-foreground/50"
          style={{ animation:'cwBounce 1.3s infinite ease-in-out', animationDelay:`${i * 0.18}s` }} />
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
