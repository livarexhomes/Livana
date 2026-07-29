import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageSquare, Paperclip, ChevronDown } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; url: string; mediaType: string; data?: string }

interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
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
  { icon: '💰', title: 'Pricing & fees',    sub: 'Zero agent fees',         msg: 'What are the costs and fees for tenants and landlords?' },
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

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '11px 14px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
          display: 'inline-block', animation: 'cwBounce 1.3s infinite ease-in-out',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </div>
  )
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

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) {
      setUnread(false)
      setTimeout(() => inputRef.current?.focus(), 220)
    }
  }, [open])

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

  // ── Send ──────────────────────────────────────────────────────────────────────
  async function sendMessage(text: string, img: typeof pendingImg) {
    if (!text.trim() && !img) return
    setActionsUsed(true)

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
      setMessages(m => [...m, {
        role: 'assistant',
        content: [{ type: 'text', text: data.reply || data.error || 'Something went wrong.' }],
      }])
      if (!open) setUnread(true)
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        content: [{ type: 'text', text: 'Connection issue. Reach us on WhatsApp: +234 706 137 0742.' }],
      }])
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
          position:fixed; bottom:72px; right:18px; z-index:9999;
          width:370px; height:540px;
          display:flex; flex-direction:column;
          border-radius:20px; overflow:hidden;
          background:#fff;
          box-shadow:0 24px 64px rgba(0,0,0,0.18),0 4px 16px rgba(0,0,0,0.1);
          transform-origin:bottom right;
          transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.18s ease;
        }
        .cw-panel.open   { transform:scale(1) translateY(0);     opacity:1; pointer-events:auto;  }
        .cw-panel.closed { transform:scale(0.86) translateY(18px); opacity:0; pointer-events:none; }

        /* ── Mobile bottom sheet ── */
        @media(max-width:480px){
          .cw-panel {
            left:0;right:0;bottom:0;width:100%;height:92svh;
            border-radius:20px 20px 0 0;
            transform-origin:bottom center;
          }
          .cw-panel.open   { transform:translateY(0);    opacity:1; pointer-events:auto; }
          .cw-panel.closed { transform:translateY(100%); opacity:0; pointer-events:none; }
          .cw-handle { display:block !important; }
          .cw-toggle { bottom:16px!important; right:16px!important; width:48px!important; height:48px!important; }
        }

        /* ── Toggle button ── */
        .cw-toggle {
          position:fixed; bottom:18px; right:18px; z-index:9999;
          width:44px; height:44px; border-radius:50%;
          background:#2563eb; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 20px rgba(37,99,235,0.45);
          transition:transform 0.2s ease, background 0.2s;
        }
        .cw-toggle.open { background:#1e40af; transform:rotate(8deg) scale(0.94); }
        .cw-toggle:not(.open):hover { transform:scale(1.1); }

        /* ── Messages scroll ── */
        .cw-scroll { scrollbar-width:thin; scrollbar-color:#e2e8f0 transparent; }
        .cw-scroll::-webkit-scrollbar { width:4px; }
        .cw-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }

        /* ── Action card hover ── */
        .cw-action:hover { border-color:#2563eb !important; background:#eff6ff !important; }
        .cw-action:hover .cw-action-title { color:#1d4ed8 !important; }

        /* ── Input focus ── */
        .cw-input:focus { box-shadow:0 0 0 2px rgba(37,99,235,0.25); }
      `}</style>

      {/* ── Chat panel ────────────────────────────────────────────────────────── */}
      <div className={`cw-panel ${open ? 'open' : 'closed'}`}>

        {/* Drag handle (mobile only) */}
        <div className="cw-handle" style={{
          display:'none', width:'100%', padding:'10px 0 4px',
          display:'none', justifyContent:'center', background:'#fff', flexShrink:0,
        }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#e2e8f0' }} />
        </div>

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div style={{
          background:'linear-gradient(160deg,#0f172a 0%,#1e3a8a 100%)',
          padding:'14px 16px', display:'flex', alignItems:'center',
          gap:12, flexShrink:0,
        }}>
          {/* Avatar */}
          <div style={{
            width:40, height:40, borderRadius:'50%',
            background:'linear-gradient(135deg,#3b82f6,#6366f1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, fontSize:15, fontWeight:900, color:'#fff',
            boxShadow:'0 0 0 3px rgba(255,255,255,0.12)',
          }}>L</div>

          {/* Name + status */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#fff', fontWeight:700, fontSize:14, letterSpacing:'-0.01em' }}>
              Livarex AI
            </div>
            <div style={{
              color:'rgba(255,255,255,0.55)', fontSize:11,
              display:'flex', alignItems:'center', gap:5, marginTop:1,
            }}>
              <span style={{
                width:6, height:6, borderRadius:'50%', background:'#4ade80',
                boxShadow:'0 0 6px #4ade80', display:'inline-block', flexShrink:0,
              }}/>
              Online · Property Assistant
            </div>
          </div>

          {/* WhatsApp */}
          <a href="https://wa.me/2347061370742?text=Hello%20Livarex!"
            target="_blank" rel="noopener noreferrer"
            title="Continue on WhatsApp"
            style={{
              width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'rgba(255,255,255,0.55)', transition:'background 0.15s',
            }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.16)')}
            onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>

          {/* Minimise */}
          <button onClick={() => setOpen(false)} style={{
            width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.08)',
            border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'rgba(255,255,255,0.55)', transition:'background 0.15s',
          }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.16)')}
            onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')}
          >
            <ChevronDown size={16}/>
          </button>
        </div>

        {/* ── Messages ────────────────────────────────────────────────────────── */}
        <div className="cw-scroll" style={{
          flex:1, overflowY:'auto',
          padding:'16px 14px', display:'flex', flexDirection:'column', gap:12,
          background:'#f8fafc',
        }}>

          {/* Welcome card (always shown) */}
          <div style={{ animation:'cwFadeUp 0.4s ease both' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{
                width:28, height:28, borderRadius:'50%',
                background:'linear-gradient(135deg,#3b82f6,#6366f1)',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, fontSize:10, fontWeight:900, color:'#fff',
              }}>L</div>
              <div style={{
                padding:'11px 14px', borderRadius:'16px 16px 16px 4px',
                background:'#fff', color:'#1e293b',
                fontSize:13, lineHeight:1.6,
                boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                border:'1px solid rgba(0,0,0,0.05)',
                maxWidth:'82%',
              }}>
                Hi there! 👋 I'm <strong>Livarex AI</strong> — your property assistant.<br/>
                How can I help you today?
              </div>
            </div>
          </div>

          {/* Quick action cards (disappear once conversation starts) */}
          {!actionsUsed && messages.length === 0 && (
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr',
              gap:8, marginTop:4,
              animation:'cwFadeUp 0.45s 0.1s ease both', opacity:0,
              animationFillMode:'forwards',
            }}>
              {ACTIONS.map(a => (
                <button
                  key={a.title}
                  className="cw-action"
                  onClick={() => sendMessage(a.msg, null)}
                  style={{
                    background:'#fff', border:'1px solid #e2e8f0',
                    borderRadius:12, padding:'11px 12px',
                    cursor:'pointer', textAlign:'left',
                    transition:'all 0.15s', display:'flex',
                    flexDirection:'column', gap:4,
                  }}
                >
                  <span style={{ fontSize:20, lineHeight:1 }}>{a.icon}</span>
                  <span className="cw-action-title" style={{
                    fontSize:12, fontWeight:700, color:'#1e293b',
                    lineHeight:1.3, transition:'color 0.15s',
                  }}>{a.title}</span>
                  <span style={{ fontSize:10.5, color:'#94a3b8', lineHeight:1.3 }}>{a.sub}</span>
                </button>
              ))}
            </div>
          )}

          {/* Conversation messages */}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display:'flex', gap:8,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems:'flex-end',
              animation:'cwFadeUp 0.3s ease both',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width:28, height:28, borderRadius:'50%',
                  background:'linear-gradient(135deg,#3b82f6,#6366f1)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, fontSize:10, fontWeight:900, color:'#fff',
                }}>L</div>
              )}
              <div style={{
                maxWidth:'80%', display:'flex', flexDirection:'column', gap:4,
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.content.map((block, j) =>
                  block.type === 'image_url' ? (
                    <img key={j} src={block.url} alt="attachment" style={{
                      maxWidth:200, maxHeight:160, borderRadius:12,
                      objectFit:'cover', border:'2px solid rgba(255,255,255,0.4)',
                    }}/>
                  ) : (
                    <div key={j} style={{
                      padding:'10px 13px',
                      borderRadius: msg.role === 'user'
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      fontSize:13, lineHeight:1.6,
                      whiteSpace:'pre-wrap', wordBreak:'break-word',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg,#2563eb,#3b82f6)'
                        : '#fff',
                      color: msg.role === 'user' ? '#fff' : '#1e293b',
                      boxShadow: msg.role === 'assistant'
                        ? '0 1px 4px rgba(0,0,0,0.06)'
                        : '0 2px 8px rgba(37,99,235,0.25)',
                      border: msg.role === 'assistant'
                        ? '1px solid rgba(0,0,0,0.05)'
                        : 'none',
                    }}>
                      {block.text}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{
              display:'flex', gap:8, alignItems:'flex-end',
              animation:'cwFadeUp 0.25s ease both',
            }}>
              <div style={{
                width:28, height:28, borderRadius:'50%',
                background:'linear-gradient(135deg,#3b82f6,#6366f1)',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, fontSize:10, fontWeight:900, color:'#fff',
              }}>L</div>
              <div style={{
                background:'#fff', borderRadius:'16px 16px 16px 4px',
                border:'1px solid rgba(0,0,0,0.05)',
                boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <TypingDots/>
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* ── Pending image preview ────────────────────────────────────────────── */}
        {pendingImg && (
          <div style={{
            padding:'8px 14px', borderTop:'1px solid #f1f5f9',
            background:'#f8fafc', display:'flex', alignItems:'center', gap:8, flexShrink:0,
          }}>
            <div style={{ position:'relative' }}>
              <img src={pendingImg.url} alt="preview" style={{
                width:48, height:48, borderRadius:8,
                objectFit:'cover', border:'1px solid #e2e8f0',
              }}/>
              <button onClick={removePendingImg} style={{
                position:'absolute', top:-5, right:-5,
                width:16, height:16, borderRadius:'50%',
                background:'#ef4444', border:'2px solid #fff',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <X size={8} color="#fff"/>
              </button>
            </div>
            <span style={{ fontSize:11, color:'#64748b' }}>Image ready · press send</span>
          </div>
        )}

        {/* ── Input bar ────────────────────────────────────────────────────────── */}
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'10px 12px',
          borderTop:'1px solid #f1f5f9',
          background:'#fff', flexShrink:0,
        }}>
          {/* Attach */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach image"
            style={{
              width:34, height:34, borderRadius:10,
              background:'#f1f5f9', border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#64748b', flexShrink:0, transition:'background 0.15s',
            }}
            onMouseEnter={e=>(e.currentTarget.style.background='#e2e8f0')}
            onMouseLeave={e=>(e.currentTarget.style.background='#f1f5f9')}
          >
            <Paperclip size={15}/>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>

          {/* Text */}
          <input
            ref={inputRef}
            className="cw-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message Livarex AI…"
            disabled={loading}
            style={{
              flex:1, fontSize:13,
              background:'#f1f5f9', borderRadius:22,
              padding:'9px 15px', border:'1px solid transparent',
              outline:'none', color:'#1e293b',
              transition:'box-shadow 0.15s, border-color 0.15s',
            }}
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width:36, height:36, borderRadius:'50%', border:'none',
              background: canSend
                ? 'linear-gradient(135deg,#2563eb,#3b82f6)'
                : '#e2e8f0',
              cursor: canSend ? 'pointer' : 'default',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
              boxShadow: canSend ? '0 4px 12px rgba(37,99,235,0.35)' : 'none',
              transition:'all 0.15s',
              transform: canSend ? 'scale(1)' : 'scale(0.92)',
            }}
          >
            <Send size={14} color={canSend ? '#fff' : '#94a3b8'}
              style={{ transform:'translateX(1px)' }}/>
          </button>
        </div>
      </div>

      {/* ── Toggle button ─────────────────────────────────────────────────────── */}
      <button
        className={`cw-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Open Livarex chat"
      >
        {open
          ? <X size={18} color="#fff"/>
          : <MessageSquare size={17} color="#fff"/>
        }
        {!open && unread && (
          <span style={{
            position:'absolute', top:-2, right:-2,
            width:13, height:13, borderRadius:'50%',
            background:'#ef4444', border:'2px solid #fff',
          }}/>
        )}
        {!open && (
          <span style={{
            position:'absolute', inset:0, borderRadius:'50%',
            background:'#3b82f6', animation:'cwPulse 2.8s ease-out infinite',
          }}/>
        )}
      </button>
    </>
  )
}
