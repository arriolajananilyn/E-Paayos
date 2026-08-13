import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  MessageCircle,
  Send,
  Trash2,
  X,
  Loader2,
  Sparkles,
  ChevronDown,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:5000'

const SUGGESTED_QUESTIONS = [
  'What services are available?',
  'Find a repair shop for me',
  'How do I book a service?',
  'Check my repair requests',
  'What shops offer laptop repair?',
  'How does E-Paayos work?',
]

/* ------------------------------------------------------------------ */
/*  Helper – basic markdown-ish rendering                              */
/* ------------------------------------------------------------------ */

function renderMessageContent(text) {
  if (!text) return null
  // Split by double newlines for paragraphs, then handle inline formatting
  const paragraphs = text.split(/\n{2,}/)
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n')
    return (
      <div key={pi} className={pi > 0 ? 'mt-2' : ''}>
        {lines.map((line, li) => {
          // Numbered list items
          const numMatch = line.match(/^(\d+)\.\s+/)
          if (numMatch) {
            return (
              <div key={li} className="flex gap-1.5 mt-0.5">
                <span className="font-bold text-[#081F5C] shrink-0 min-w-[1.2em]">
                  {numMatch[1]}.
                </span>
                <span>{renderInline(line.slice(numMatch[0].length))}</span>
              </div>
            )
          }
          // Bullet list items
          if (/^[-•]\s+/.test(line)) {
            return (
              <div key={li} className="flex gap-1.5 mt-0.5">
                <span className="text-[#081F5C] shrink-0">•</span>
                <span>{renderInline(line.replace(/^[-•]\s+/, ''))}</span>
              </div>
            )
          }
          return (
            <span key={li}>
              {li > 0 && <br />}
              {renderInline(line)}
            </span>
          )
        })}
      </div>
    )
  })
}

function renderInline(text) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

/* ------------------------------------------------------------------ */
/*  Typing Indicator                                                   */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 mb-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#081F5C] to-[#1447a6] shadow-sm">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-slate-200 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Widget                                                        */
/* ------------------------------------------------------------------ */

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showScrollDown, setShowScrollDown] = useState(false)

  // Movable / Draggable Button Position
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    try {
      const saved = localStorage.getItem('epaayos_chatbot_position')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(10, window.innerWidth - 76)
          const maxY = Math.max(10, window.innerHeight - 76)
          return {
            x: Math.min(Math.max(10, parsed.x), maxX),
            y: Math.min(Math.max(10, parsed.y), maxY),
          }
        }
      }
    } catch {
      // fallback
    }
    // Default position: bottom-right (20px margin)
    return {
      x: Math.max(10, window.innerWidth - 76),
      y: Math.max(10, window.innerHeight - 76),
    }
  })

  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0, hasMoved: false })

  // Keep button inside screen bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(10, window.innerWidth - 76)
        const maxY = Math.max(10, window.innerHeight - 76)
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        }
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Start drag (Mouse or Touch)
  const handleDragStart = (e) => {
    if (e.type === 'mousedown' && e.button !== 0) return

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: position.x,
      posY: position.y,
      hasMoved: false,
    }
    isDraggingRef.current = true
    setIsDragging(true)
  }

  // Handle Dragging
  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingRef.current) return

      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY

      const dx = clientX - dragStartRef.current.mouseX
      const dy = clientY - dragStartRef.current.mouseY

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragStartRef.current.hasMoved = true
      }

      const maxX = Math.max(10, window.innerWidth - 76)
      const maxY = Math.max(10, window.innerHeight - 76)

      const newX = Math.min(Math.max(10, dragStartRef.current.posX + dx), maxX)
      const newY = Math.min(Math.max(10, dragStartRef.current.posY + dy), maxY)

      setPosition({ x: newX, y: newY })
    }

    const handleEnd = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      setIsDragging(false)

      if (dragStartRef.current.hasMoved) {
        try {
          localStorage.setItem('epaayos_chatbot_position', JSON.stringify(position))
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [position])

  const handleButtonClick = () => {
    if (!dragStartRef.current.hasMoved) {
      setIsOpen(true)
    }
  }

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'instant',
        block: 'end',
      })
    })
  }, [])

  useEffect(() => {
    if (messages.length) scrollToBottom()
  }, [messages, loading, scrollToBottom])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  // Track scroll to show/hide "scroll down" button
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setShowScrollDown(!isNearBottom)
  }, [])

  // Get auth token
  const getToken = () => {
    try {
      return localStorage.getItem('token')
    } catch {
      return null
    }
  }

  // Send message to API
  const sendMessage = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    setInput('')
    setError('')

    const userMsg = { role: 'user', content: msg, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const token = getToken()
      if (!token) {
        setError('Please log in to use the assistant.')
        setLoading(false)
        return
      }

      // Build conversation history for context
      const history = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-20)
        .map(({ role, content }) => ({ role, content }))

      const res = await fetch(`${API_BASE}/api/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          conversationHistory: history.slice(0, -1), // exclude current message
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong')
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, timestamp: Date.now() },
      ])
    } catch (err) {
      const errMsg = err.message || "Sorry, I'm having trouble connecting right now."
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errMsg, timestamp: Date.now(), isError: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setError('')
    setInput('')
  }

  const handleSuggestedQuestion = (q) => {
    sendMessage(q)
  }

  const showSuggestions = messages.length === 0 && !loading

  return (
    <>
      {/* Movable Floating Chat Button */}
      {!isOpen && (
        <button
          type="button"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onClick={handleButtonClick}
          id="chatbot-toggle"
          aria-label="Open E-Paayos AI Assistant (Drag to move)"
          title="Click to chat • Drag to move anywhere"
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            touchAction: 'none',
          }}
          className={`z-50 flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-[#081F5C] to-[#1447a6] text-white shadow-[0_4px_20px_rgba(8,31,92,0.4)] hover:shadow-[0_6px_28px_rgba(8,31,92,0.55)] transition-all duration-150 group select-none ${
            isDragging
              ? 'cursor-grabbing scale-110 shadow-[0_8px_32px_rgba(8,31,92,0.6)] ring-4 ring-[#081F5C]/20'
              : 'cursor-grab hover:scale-105 active:scale-95'
          }`}
        >
          <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform pointer-events-none" />
          {/* Pulse ring when idle */}
          {!isDragging && (
            <span
              className="absolute inset-0 rounded-full animate-ping bg-[#081F5C]/30 pointer-events-none"
              style={{ animationDuration: '2.5s' }}
            />
          )}
          {/* Subtle tooltip hint on hover */}
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-0.5 bg-slate-900/90 text-white text-[10px] font-semibold rounded shadow-xs whitespace-nowrap pointer-events-none">
            Drag to move
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed z-50 bottom-0 right-0 sm:bottom-5 sm:right-5 w-full sm:w-[400px] h-[100dvh] sm:h-[540px] flex flex-col bg-white sm:rounded-2xl shadow-[0_8px_40px_rgba(8,31,92,0.25)] border-0 sm:border border-slate-200/80 overflow-hidden"
          role="dialog"
          aria-label="E-Paayos AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#081F5C] to-[#1447a6] text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide leading-none">
                  E-Paayos Assistant
                </h3>
                <p className="text-[10px] font-medium text-white/70 mt-0.5">
                  AI-powered • Always here to help
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  aria-label="Clear conversation"
                  className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gradient-to-b from-slate-50 to-white scroll-smooth"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
          >
            {/* Welcome Message (always shown) */}
            {messages.length === 0 && !loading && (
              <div className="flex items-end gap-2.5 mb-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#081F5C] to-[#1447a6] shadow-sm">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-slate-200 shadow-sm">
                  <p className="text-[13px] text-slate-800 leading-relaxed">
                    Kumusta! 👋 I'm your <strong className="font-semibold text-[#081F5C]">E-Paayos AI Assistant</strong>. I can help you find repair shops, check services, track your bookings, and more.
                  </p>
                  <p className="text-[13px] text-slate-800 leading-relaxed mt-1.5">
                    How can I help you today?
                  </p>
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {showSuggestions && (
              <div className="pb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-9">
                  Suggested Questions
                </p>
                <div className="flex flex-wrap gap-1.5 ml-9">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSuggestedQuestion(q)}
                      className="px-3 py-1.5 text-[11px] font-semibold text-[#081F5C] bg-[#081F5C]/5 hover:bg-[#081F5C]/10 border border-[#081F5C]/15 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2.5 mb-3 ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#081F5C] to-[#1447a6] shadow-sm">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[80%] px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#081F5C] to-[#1447a6] text-white rounded-2xl rounded-br-md shadow-sm'
                      : `bg-white border shadow-sm rounded-2xl rounded-bl-md ${
                          msg.isError
                            ? 'border-rose-200 bg-rose-50/50 text-rose-700'
                            : 'border-slate-200 text-slate-800'
                        }`
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span>{msg.content}</span>
                  ) : (
                    <div className="space-y-0.5">{renderMessageContent(msg.content)}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll-to-bottom button */}
          {showScrollDown && (
            <button
              type="button"
              onClick={() => scrollToBottom()}
              className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-md text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-[#081F5C] transition-all"
            >
              <ChevronDown className="h-3 w-3" />
              New messages
            </button>
          )}

          {/* Error Bar */}
          {error && (
            <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-[11px] text-rose-600 font-medium shrink-0">
              {error}
            </div>
          )}

          {/* Input Area */}
          <div className="px-3 py-3 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  rows={1}
                  maxLength={1000}
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#081F5C]/20 focus:border-[#081F5C]/30 transition-all disabled:opacity-50"
                  style={{
                    minHeight: '40px',
                    maxHeight: '120px',
                    height: 'auto',
                    overflow: input.split('\n').length > 3 ? 'auto' : 'hidden',
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#081F5C] to-[#1447a6] text-white shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-150"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-1.5 font-medium">
              AI-powered assistant • Responses are based on E-Paayos data
            </p>
          </div>
        </div>
      )}
    </>
  )
}
