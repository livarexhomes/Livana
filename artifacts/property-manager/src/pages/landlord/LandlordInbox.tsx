import { useState, useEffect, useRef } from 'react'
import {
  MessageSquare, MapPin, Clock, Send, X, ChevronLeft,
  Home, CheckCircle, Inbox,
} from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open:    { label: 'Open',    bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'   },
  replied: { label: 'Replied', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed:  { label: 'Closed',  bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
}

const AVATAR_GRADS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
]
function avatarGrad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

interface Reply {
  id: string
  enquiry_id: string
  landlord_id: string
  message: string
  created_at: string
}

export default function LandlordInbox() {
  const [landlord, setLandlord]         = useState<Landlord | null>(null)
  const [user, setUser]                 = useState<{ email?: string } | null>(null)
  const [enquiries, setEnquiries]       = useState<any[]>([])
  const [replies, setReplies]           = useState<Record<string, Reply[]>>({})
  const [selected, setSelected]         = useState<string | null>(null)
  const [filter, setFilter]             = useState('all')
  const [loading, setLoading]           = useState(true)
  const [replyText, setReplyText]       = useState('')
  const [sending, setSending]           = useState(false)
  const [mobileView, setMobileView]     = useState<'list' | 'thread'>('list')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: l } = await supabase
        .from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) {
        const { data } = await supabase
          .from('enquiries')
          .select('*, properties(id, title, city, price), tenants(full_name, phone)')
          .eq('landlord_id', l.id)
          .order('created_at', { ascending: false })
        const list = (data as any[]) ?? []
        setEnquiries(list)
        // pre-select first
        if (list.length > 0) setSelected(list[0].id)
        // load all replies for these enquiries
        if (list.length > 0) {
          const ids = list.map((e: any) => e.id)
          const { data: rData } = await supabase
            .from('enquiry_replies')
            .select('*')
            .in('enquiry_id', ids)
            .order('created_at', { ascending: true })
          const grouped: Record<string, Reply[]> = {}
          for (const r of (rData ?? []) as Reply[]) {
            if (!grouped[r.enquiry_id]) grouped[r.enquiry_id] = []
            grouped[r.enquiry_id].push(r)
          }
          setReplies(grouped)
        }
      }
      setLoading(false)
    })
  }, [])

  // scroll to bottom when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected, replies])

  async function sendReply() {
    if (!replyText.trim() || !selected || !landlord) return
    setSending(true)
    const supabase = createClient()
    const { data: newReply } = await supabase
      .from('enquiry_replies')
      .insert({ enquiry_id: selected, landlord_id: landlord.id, message: replyText.trim() })
      .select()
      .single()
    if (newReply) {
      setReplies(prev => ({
        ...prev,
        [selected]: [...(prev[selected] ?? []), newReply as Reply],
      }))
      // mark enquiry as replied
      await supabase.from('enquiries').update({ status: 'replied' }).eq('id', selected)
      setEnquiries(es => es.map(e => e.id === selected ? { ...e, status: 'replied' } : e))
    }
    setReplyText('')
    setSending(false)
    textareaRef.current?.focus()
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('enquiries').update({ status }).eq('id', id)
    setEnquiries(es => es.map(e => e.id === id ? { ...e, status } : e))
  }

  function selectEnquiry(id: string) {
    setSelected(id)
    setMobileView('thread')
  }

  const tabs = [
    { key: 'all',     label: 'All',     count: enquiries.length },
    { key: 'open',    label: 'Open',    count: enquiries.filter(e => e.status === 'open').length },
    { key: 'replied', label: 'Replied', count: enquiries.filter(e => e.status === 'replied').length },
    { key: 'closed',  label: 'Closed',  count: enquiries.filter(e => e.status === 'closed').length },
  ]
  const visible = filter === 'all' ? enquiries : enquiries.filter(e => e.status === filter)
  const activeEnquiry = enquiries.find(e => e.id === selected)
  const activeReplies = selected ? (replies[selected] ?? []) : []

  // ── List panel ──────────────────────────────────────────────
  const ListPanel = () => (
    <div className="flex flex-col h-full">
      {/* List header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Inbox</h2>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {tabs.map(tab => (
            <button key={tab.key} type="button" onClick={() => setFilter(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                filter === tab.key ? 'bg-white/20 text-white' : 'bg-white text-gray-400'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enquiry list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Inbox className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-500">No enquiries</p>
            <p className="text-xs text-gray-400 mt-1">Messages from tenants will appear here.</p>
          </div>
        ) : (
          visible.map(e => {
            const s = STATUS_META[e.status] ?? STATUS_META.open
            const name = e.tenants?.full_name ?? 'Tenant'
            const replyCount = (replies[e.id] ?? []).length
            const isActive = selected === e.id
            return (
              <button key={e.id} type="button" onClick={() => selectEnquiry(e.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-colors ${
                  isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(name)} flex items-center justify-center shrink-0 shadow-sm`}>
                    <span className="text-[10px] font-bold text-white">{initials(name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>{name}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(e.created_at)}</span>
                    </div>
                    <p className="text-xs text-blue-500 font-medium truncate mb-1">
                      {e.properties?.title ?? 'Property enquiry'}
                      {e.properties?.city ? ` · ${e.properties.city}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{e.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${s.bg} ${s.text}`}>
                        <span className={`w-1 h-1 rounded-full ${s.dot}`} />{s.label}
                      </span>
                      {replyCount > 0 && (
                        <span className="text-[10px] text-gray-400">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  // ── Thread panel ─────────────────────────────────────────────
  const ThreadPanel = () => {
    if (!activeEnquiry) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-sm font-semibold text-gray-500">Select an enquiry</p>
          <p className="text-xs text-gray-400 mt-1">Choose a message from the list to view the conversation.</p>
        </div>
      )
    }

    const s = STATUS_META[activeEnquiry.status] ?? STATUS_META.open
    const name = activeEnquiry.tenants?.full_name ?? 'Tenant'

    return (
      <div className="flex flex-col h-full">
        {/* Thread header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white shrink-0">
          {/* Mobile back button */}
          <button type="button" onClick={() => setMobileView('list')}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(name)} flex items-center justify-center shrink-0 shadow-sm`}>
            <span className="text-xs font-bold text-white">{initials(name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">{name}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Home className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-blue-600 font-medium truncate">{activeEnquiry.properties?.title ?? 'Property enquiry'}</p>
              {activeEnquiry.properties?.city && (
                <div className="flex items-center gap-0.5 text-[11px] text-gray-400 shrink-0">
                  <MapPin className="w-3 h-3" />{activeEnquiry.properties.city}
                </div>
              )}
            </div>
          </div>
          {/* Status actions */}
          <div className="flex items-center gap-2 shrink-0">
            {activeEnquiry.status !== 'closed' && (
              <button type="button" onClick={() => updateStatus(activeEnquiry.id, 'closed')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-3 h-3" /> Close
              </button>
            )}
            {activeEnquiry.status === 'closed' && (
              <button type="button" onClick={() => updateStatus(activeEnquiry.id, 'open')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">
                Reopen
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#F7F8FC]">
          {/* Original enquiry bubble */}
          <div className="flex gap-3">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGrad(name)} flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
              <span className="text-[9px] font-bold text-white">{initials(name)}</span>
            </div>
            <div className="flex-1 max-w-[80%]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-700">{name}</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />{timeAgo(activeEnquiry.created_at)}
                </span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">{activeEnquiry.message}</p>
              </div>
            </div>
          </div>

          {/* Reply bubbles */}
          {activeReplies.map(r => (
            <div key={r.id} className="flex gap-3 flex-row-reverse">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <span className="text-[9px] font-bold text-white">
                  {initials(landlord?.full_name ?? 'You')}
                </span>
              </div>
              <div className="flex-1 max-w-[80%] flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />{timeAgo(r.created_at)}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">You</span>
                </div>
                <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                  <p className="text-sm text-white leading-relaxed">{r.message}</p>
                </div>
              </div>
            </div>
          ))}

          {activeReplies.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <p className="text-xs text-gray-400">No replies yet — be the first to respond.</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {activeEnquiry.status !== 'closed' ? (
          <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
                }}
                placeholder="Type your reply… (Ctrl+Enter to send)"
                rows={2}
                className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all leading-relaxed"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={sending || replyText.trim().length < 2}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors shrink-0 self-end"
              >
                {sending
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />
                }
                <span className="hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 px-1">
              Replying as <span className="font-semibold text-gray-600">{landlord?.full_name ?? 'you'}</span>
              {activeEnquiry.tenants?.phone && (
                <> · <a href={`https://wa.me/${activeEnquiry.tenants.phone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline font-semibold">WhatsApp tenant</a></>
              )}
            </p>
          </div>
        ) : (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 shrink-0 text-center">
            <p className="text-xs text-gray-400">This enquiry is closed.</p>
            <button type="button" onClick={() => updateStatus(activeEnquiry.id, 'open')}
              className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
              Reopen to reply
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center gap-3 pl-14 pr-4 md:px-6 py-4 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Inbox</h1>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {enquiries.filter(e => e.status === 'open').length} open
            </span>
            {enquiries.filter(e => e.status === 'replied').length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                <CheckCircle className="w-3 h-3" />
                {enquiries.filter(e => e.status === 'replied').length} replied
              </span>
            )}
          </header>

          {/* Two-panel inbox */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: list — hidden on mobile when thread is open */}
            <div className={`
              w-full md:w-80 lg:w-96 shrink-0 bg-white border-r border-gray-100 overflow-hidden flex flex-col
              ${mobileView === 'thread' ? 'hidden md:flex' : 'flex'}
            `}>
              <ListPanel />
            </div>

            {/* Right: thread — hidden on mobile when list is shown */}
            <div className={`
              flex-1 bg-white overflow-hidden flex flex-col
              ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
            `}>
              <ThreadPanel />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
