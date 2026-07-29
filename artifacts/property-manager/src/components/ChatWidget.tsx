import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageSquare, Paperclip, Image as ImageIcon } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; url: string; mediaType: string }

interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
}

// ── Config ───────────────────────────────────────────────────────────────────

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL
  ? `${import.meta.env.VITE_CHAT_API_URL}/api/chat`
  : '/api/chat'

// ── Slash commands ───────────────────────────────────────────────────────────

const COMMANDS = [
  { cmd: '/listings',  icon: '🏠', label: 'Browse properties',     fill: 'Show me all available verified rental listings right now.' },
  { cmd: '/inspect',   icon: '📅', label: 'Book an inspection',    fill: 'I want to book a property inspection. Can you help me?' },
  { cmd: '/landlord',  icon: '🏢', label: 'List my property',      fill: 'I am a landlord and I want to list my property on Livarex.' },
  { cmd: '/price',     icon: '💰', label: 'Pricing & fees',         fill: 'What are the fees and costs for tenants and landlords on Livarex?' },
  { cmd: '/verify',    icon: '✅', label: 'How verification works', fill: 'How does the landlord verification process work on Livarex?' },
  { cmd: '/contact',   icon: '📞', label: 'Contact Livarex',       fill: 'What are the contact details for Livarex support?' },
]

const WELCOME: Message = {
  role: 'assistant',
  content: [{ type: 'text', text: "Hi! 👋 I'm the **Livarex AI** property assistant.\n\nType **/** to see quick commands, or ask me anything about rentals, inspections, or listing your property!" }],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderText(text: string) {
  // Bold **text**
  return text.split(/(\*\*[^*]+\*\*)/).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**')
      ? <strong key={i}>{chunk.slice(2, -2)}</strong>
      : <span key={i}>{chunk}</span>
  )
}

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, data] = result.split(',')
      const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      resolve({ data, mediaType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
          display: 'inline-block', animation: 'bounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [unread, setUnread]     = useState(false)
  const [pendingImg, setPendingImg] = useState<{ url: string; data: string; mediaType: string } | null>(null)
  const [showCmds, setShowCmds] = useState(false)
  const [cmdFilter, setCmdFilter] = useState('')

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) { setUnread(false); setTimeout(() => inputRef.current?.focus(), 200) }
  }, [open])

  // ── Input change ───────────────────────────────────────────────────────────
  function handleInput(v: string) {
    setInput(v)
    if (v === '/' || v.startsWith('/')) {
      setShowCmds(true)
      setCmdFilter(v.slice(1).toLowerCase())
    } else {
      setShowCmds(false)
      setCmdFilter('')
    }
  }

  function pickCommand(fill: string) {
    setInput('')
    setShowCmds(false)
    sendMessage(fill, null)
  }

  // ── Image pick ─────────────────────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data, mediaType } = await fileToBase64(file)
    const url = URL.createObjectURL(file)
    setPendingImg({ url, data, mediaType })
    e.target.value = ''
    inputRef.current?.focus()
  }

  function removePendingImg() {
    if (pendingImg) URL.revokeObjectURL(pendingImg.url)
    setPendingImg(null)
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function sendMessage(text: string, img: typeof pendingImg) {
    if (!text.trim() && !img) return

    const userContent: ContentBlock[] = []
    if (img) userContent.push({ type: 'image_url', url: img.url, mediaType: img.mediaType })
    if (text.trim()) userContent.push({ type: 'text', text: text.trim() })

    const userMsg: Message = { role: 'user', content: userContent }
    const next = [...messages, userMsg]
    setMessages(next)
    setPendingImg(null)
    setLoading(true)

    // Build API payload — convert image_url blocks to Anthropic format
    const apiMessages = next.map(m => ({
      role: m.role,
      content: m.content.map(b => {
        if (b.type === 'image_url') {
          return { type: 'image', source: { type: 'base64', media_type: b.mediaType, data: b.data ?? '' } }
        }
        return { type: 'text', text: b.text }
      }),
    }))

    try {
      const res  = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const data = await res.json()
      const reply: Message = {
        role: 'assistant',
        content: [{ type: 'text', text: data.reply || data.error || 'Sorry, something went wrong.' }],
      }
      setMessages(m => [...m, reply])
      if (!open) setUnread(true)
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        content: [{ type: 'text', text: "Having trouble connecting. Reach us on WhatsApp: +234 706 137 0742." }],
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    setShowCmds(false)
    sendMessage(input, pendingImg)
    setInput('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setShowCmds(false); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const filteredCmds = COMMANDS.filter(c =>
    c.cmd.slice(1).includes(cmdFilter) || c.label.toLowerCase().includes(cmdFilter)
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0);    }
          40%            { transform: translateY(-5px); }
        }
        @keyframes chatPulse {
          0%  { transform: scale(1);   opacity: 0.4; }
          70% { transform: scale(1.7); opacity: 0;   }
          100%{ transform: scale(1.7); opacity: 0;   }
        }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        /* ── Desktop panel ── */
        .chat-panel {
          position: fixed;
          bottom: 72px; right: 18px;
          z-index: 9999;
          width: 360px;
          height: 520px;
          display: flex; flex-direction: column;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.1);
          background: #fff;
          border: 1px solid rgba(0,0,0,0.07);
          transform-origin: bottom right;
          transition: transform 0.26s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease;
        }
        .chat-panel.open  { transform: scale(1) translateY(0);    opacity: 1; pointer-events: auto; }
        .chat-panel.closed{ transform: scale(0.88) translateY(16px); opacity: 0; pointer-events: none; }

        /* ── Mobile: full-width bottom sheet ── */
        @media (max-width: 480px) {
          .chat-panel {
            left: 0; right: 0;
            bottom: 0;
            width: 100%;
            height: 92svh;
            border-radius: 20px 20px 0 0;
            transform-origin: bottom center;
          }
          .chat-panel.open  { transform: translateY(0);    opacity: 1; pointer-events: auto; }
          .chat-panel.closed{ transform: translateY(100%); opacity: 0; pointer-events: none; }

          /* drag handle */
          .chat-panel-handle {
            display: block !important;
          }
        }

        .chat-toggle {
          position: fixed;
          bottom: 18px; right: 18px;
          z-index: 9999;
          width: 44px; height: 44px;
          border-radius: 50%;
          background: #2563eb;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px rgba(37,99,235,0.45);
          transition: all 0.2s ease;
        }
        .chat-toggle.open { background: #1d4ed8; transform: rotate(8deg) scale(0.95); }
        .chat-toggle:not(.open):hover { transform: scale(1.1); }

        @media (max-width: 480px) {
          .chat-toggle {
            bottom: 16px; right: 16px;
            width: 48px; height: 48px;
          }
        }
      `}</style>

      {/* ── Popup panel ─────────────────────────────────────────────────────── */}
      <div className={`chat-panel ${open ? 'open' : 'closed'}`}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%)',
          padding: '13px 14px', display: 'flex', alignItems: 'center',
          gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 14, color: '#fff', flexShrink: 0,
          }}>L</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>Livarex AI</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Online · Property Assistant
            </div>
          </div>
          {/* WhatsApp shortcut */}
          <a href="https://wa.me/2347061370742?text=Hello%20Livarex!" target="_blank" rel="noopener noreferrer"
            title="Continue on WhatsApp"
            style={{ color: 'rgba(255,255,255,0.6)', display: 'flex', marginRight: 6 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
          <button onClick={() => setOpen(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.65)', display: 'flex', padding: 2,
          }}>
            <X size={17} />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 10,
          background: '#f8fafc',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', gap: 7,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 10, fontWeight: 900, color: '#fff',
                }}>L</div>
              )}
              <div style={{
                maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 4,
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.content.map((block, j) => (
                  block.type === 'image_url' ? (
                    <img key={j} src={block.url} alt="attachment"
                      style={{ maxWidth: 200, maxHeight: 160, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
                  ) : (
                    <div key={j} style={{
                      padding: '9px 12px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: msg.role === 'user' ? '#2563eb' : '#fff',
                      color: msg.role === 'user' ? '#fff' : '#1e293b',
                      boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      border: msg.role === 'assistant' ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    }}>
                      {renderText(block.text)}
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 10, fontWeight: 900, color: '#fff',
              }}>L</div>
              <div style={{
                background: '#fff', borderRadius: '16px 16px 16px 4px',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Slash command menu ─────────────────────────────────────────────── */}
        {showCmds && filteredCmds.length > 0 && (
          <div style={{
            borderTop: '1px solid #f1f5f9',
            background: '#fff',
            flexShrink: 0,
          }}>
            <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Quick commands
            </div>
            {filteredCmds.map(c => (
              <button key={c.cmd} onClick={() => pickCommand(c.fill)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{c.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', display: 'block', lineHeight: 1.2 }}>{c.cmd}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{c.label}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Pending image preview ──────────────────────────────────────────── */}
        {pendingImg && (
          <div style={{
            borderTop: '1px solid #f1f5f9', padding: '8px 12px',
            background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={pendingImg.url} alt="preview"
                style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
              <button onClick={removePendingImg} style={{
                position: 'absolute', top: -5, right: -5,
                width: 16, height: 16, borderRadius: '50%',
                background: '#ef4444', border: '2px solid #fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={9} color="#fff" />
              </button>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>Image ready to send</span>
          </div>
        )}

        {/* ── Input row ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 10px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0,
        }}>
          {/* Slash hint */}
          <button
            onClick={() => { handleInput('/'); inputRef.current?.focus() }}
            title="Quick commands  (/)"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
            /
          </button>
          {/* Attach image */}
          <button onClick={() => fileRef.current?.click()} title="Attach image"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', flexShrink: 0,
            }}>
            <ImageIcon size={15} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

          {/* Text input */}
          <input
            ref={inputRef}
            value={input}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask or type / for commands…"
            disabled={loading}
            style={{
              flex: 1, fontSize: 13,
              background: '#f1f5f9', borderRadius: 20,
              padding: '8px 13px', border: 'none', outline: 'none', color: '#1e293b',
            }}
          />
          {/* Send */}
          <button onClick={handleSend}
            disabled={(!input.trim() && !pendingImg) || loading}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: (!input.trim() && !pendingImg) || loading ? '#cbd5e1' : '#2563eb',
              border: 'none',
              cursor: (!input.trim() && !pendingImg) || loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}>
            <Send size={14} color="#fff" />
          </button>
        </div>
      </div>

      {/* ── Floating toggle button ───────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open Livarex chat"
        className={`chat-toggle${open ? ' open' : ''}`}
      >
        {open ? <X size={17} color="#fff" /> : <MessageSquare size={17} color="#fff" />}
        {!open && unread && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 13, height: 13, borderRadius: '50%',
            background: '#ef4444', border: '2px solid #fff',
          }} />
        )}
        {!open && (
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: '#2563eb', animation: 'chatPulse 2.5s ease-out infinite',
          }} />
        )}
      </button>
    </>
  )
}
