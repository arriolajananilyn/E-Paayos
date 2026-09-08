import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getApiBaseUrl } from '../lib/apiBaseUrl'

const RECIPIENT_KEY = 'epaayos_message_recipient'

const API_BASE = getApiBaseUrl()

function getToken() {
  return localStorage.getItem('token')
}

async function apiFetch(path, options = {}) {
  const token = getToken()
  const { body: rawBody, headers: optHeaders = {}, ...rest } = options
  const headers = { ...optHeaders }
  if (token) headers.Authorization = `Bearer ${token}`
  const isForm = rawBody instanceof FormData
  if (!isForm && rawBody != null && typeof rawBody !== 'string') {
    headers['Content-Type'] = 'application/json'
  }
  const body =
    !isForm && rawBody != null && typeof rawBody !== 'string' ? JSON.stringify(rawBody) : rawBody

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers, body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message || res.statusText || 'Request failed'
    throw new Error(msg)
  }
  return data
}

export function formatMessageTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * @param {'customer' | 'shop-owner' | 'mechanic-technician'} [variant]
 */
export default function useMessaging(variant = 'customer') {
  const isShopOwner = variant === 'shop-owner'
  const isMechanicTechnician = variant === 'mechanic-technician'
  const skipRecipientHydration = isShopOwner || isMechanicTechnician

  const listRef = useRef(null)
  const skipFetchOnceRef = useRef(null)

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [sellerInfo, setSellerInfo] = useState(null)
  const [hasSelectedNewConversation, setHasSelectedNewConversation] = useState(false)

  const loadConversations = useCallback(async (opts = {}) => {
    const { silent } = opts
    if (!silent) setLoading(true)
    try {
      const data = await apiFetch('/api/messages/conversations')
      setConversations(Array.isArray(data.conversations) ? data.conversations : [])
      if (!silent) setError(null)
    } catch (e) {
      if (!silent) setError(e?.message || 'Could not load conversations.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations({ silent: false })
  }, [loadConversations])

  // Presence heartbeat while messaging UI is open.
  useEffect(() => {
    let cancelled = false
    const ping = async () => {
      try {
        await apiFetch('/api/messages/presence/ping', { method: 'POST', body: {} })
      } catch {
        // ignore presence errors; messaging should still work
      }
    }
    const start = async () => {
      if (cancelled) return
      await ping()
    }
    void start()
    const t = setInterval(() => {
      void ping()
    }, 20_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') void ping()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      loadConversations({ silent: true })
    }, 25000)
    return () => clearInterval(t)
  }, [loadConversations])

  useEffect(() => {
    if (skipRecipientHydration) return
    try {
      const raw = sessionStorage.getItem(RECIPIENT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (
        parsed &&
        typeof parsed === 'object' &&
        (typeof parsed.fullName === 'string' || typeof parsed.shopName === 'string')
      ) {
        const otherUserId = parsed.otherUserId || parsed.shopOwnerId
        setSellerInfo({
          shopName: typeof parsed.shopName === 'string' ? parsed.shopName : '',
          ownerName: typeof parsed.ownerName === 'string' ? parsed.ownerName : '',
          fullName: parsed.fullName || parsed.shopName || parsed.ownerName || 'Shop',
          role: parsed.role || 'Shop',
          isOnline: Boolean(parsed.isOnline),
          otherUserId: typeof otherUserId === 'string' ? otherUserId : '',
        })
        setHasSelectedNewConversation(true)
        setSelectedId(null)
      }
    } catch {
      sessionStorage.removeItem(RECIPIENT_KEY)
    }
  }, [skipRecipientHydration])

  const loadMessages = useCallback(async (convId, { silent } = {}) => {
    if (!convId) return
    if (!silent) setMessagesLoading(true)
    try {
      const data = await apiFetch(`/api/messages/conversations/${encodeURIComponent(convId)}/messages`)
      setMessages(Array.isArray(data.messages) ? data.messages : [])
      if (!silent) setError(null)
    } catch (e) {
      if (!silent) setError(e?.message || 'Could not load messages.')
      setMessages([])
    } finally {
      if (!silent) setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) {
      if (!hasSelectedNewConversation) setMessages([])
      return
    }
    if (skipFetchOnceRef.current === selectedId) {
      skipFetchOnceRef.current = null
      return
    }
    loadMessages(selectedId, { silent: false })
  }, [selectedId, hasSelectedNewConversation, loadMessages])

  useEffect(() => {
    if (!selectedId) return
    const t = setInterval(() => {
      loadMessages(selectedId, { silent: true })
    }, 12000)
    return () => clearInterval(t)
  }, [selectedId, loadMessages])

  const currentConversation = useMemo(
    () => conversations.find((c) => c.conversationId === selectedId) ?? null,
    [conversations, selectedId],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => {
      const p = c.participant || {}
      const hay = [p.shopName, p.ownerName, p.name, p.role, c.lastMessage?.content]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [conversations, query])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, selectedId, hasSelectedNewConversation])

  const selectConversation = useCallback((id) => {
    setSelectedId(id)
    setSidebarOpen(false)
    setHasSelectedNewConversation(false)
    setSellerInfo(null)
    sessionStorage.removeItem(RECIPIENT_KEY)
    setConversations((prev) =>
      prev.map((c) => (c.conversationId === id ? { ...c, unreadCount: 0 } : c)),
    )
  }, [])

  const isOwnMessage = useCallback((m) => Boolean(m?.fromMe), [])

  const deliverMessage = useCallback(
    async (rawText, files = [], opts = {}) => {
      const text = String(rawText || '').trim()
      const fileList = Array.isArray(files) ? files : []
      if (!text && fileList.length === 0) return

      const preview = text || (fileList.length ? `Sent ${fileList.length} file(s)` : '')
      const now = new Date().toISOString()

      const sendForm = async (convId) => {
        const fd = new FormData()
        fd.append('content', text)
        if (opts.isAiQuery) {
          fd.append('triggerAiReply', 'true')
        }
        for (const file of fileList) {
          fd.append('files', file)
        }
        return apiFetch(`/api/messages/conversations/${encodeURIComponent(convId)}/messages`, {
          method: 'POST',
          body: fd,
        })
      }

      setUploading(true)
      setError(null)
      try {
        if (hasSelectedNewConversation && sellerInfo) {
          const otherUserId = sellerInfo.otherUserId
          if (!otherUserId || String(otherUserId).length !== 24) {
            setError('Missing shop contact. Open Messages from a service page (Message shop) or try again.')
            setUploading(false)
            return
          }

          const created = await apiFetch('/api/messages/conversations', {
            method: 'POST',
            body: { otherUserId: String(otherUserId) },
          })
          const conv = created.conversation
          if (!conv?.conversationId) throw new Error('Could not start conversation.')

          const convId = conv.conversationId
          setConversations((prev) => {
            const has = prev.some((c) => c.conversationId === convId)
            if (has) {
              return prev.map((c) => (c.conversationId === convId ? { ...conv, unreadCount: 0 } : c))
            }
            return [{ ...conv, unreadCount: 0 }, ...prev]
          })

          const sent = await sendForm(convId)
          const msg = sent.message
          if (!msg) throw new Error('Message was not saved.')

          skipFetchOnceRef.current = convId
          setHasSelectedNewConversation(false)
          setSellerInfo(null)
          sessionStorage.removeItem(RECIPIENT_KEY)
          if (sent.aiReply) {
            setMessages([msg, sent.aiReply])
          } else {
            setMessages([msg])
          }
          setSelectedId(convId)
          setInput('')
          setAttachments([])
          await loadConversations({ silent: true })
        } else if (selectedId) {
          const sent = await sendForm(selectedId)
          const msg = sent.message
          if (!msg) throw new Error('Message was not saved.')
          if (sent.aiReply) {
            setMessages((prev) => [...prev, msg, sent.aiReply])
          } else {
            setMessages((prev) => [...prev, msg])
          }
          const finalPreview = sent.aiReply?.content || preview
          setConversations((prev) =>
            prev.map((c) =>
              c.conversationId === selectedId
                ? {
                    ...c,
                    lastMessage: { content: finalPreview, createdAt: sent.aiReply?.createdAt || msg.createdAt || now },
                    unreadCount: 0,
                  }
                : c,
            ),
          )
          setInput('')
          setAttachments([])
          await loadConversations({ silent: true })
        }
      } catch (err) {
        setError(err?.message || 'Send failed.')
      } finally {
        setUploading(false)
      }
    },
    [hasSelectedNewConversation, loadConversations, selectedId, sellerInfo],
  )

  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault()
      await deliverMessage(input.trim(), attachments)
    },
    [attachments, deliverMessage, input],
  )

  const sendQuickAiQuery = useCallback(
    async (promptText) => {
      await deliverMessage(promptText, [], { isAiQuery: true })
    },
    [deliverMessage],
  )

  return {
    query,
    setQuery,
    selectedId,
    setSelectedId: selectConversation,
    input,
    setInput,
    sidebarOpen,
    setSidebarOpen,
    filtered,
    messages,
    loading,
    messagesLoading,
    error,
    listRef,
    sellerInfo,
    currentConversation,
    hasSelectedNewConversation,
    formatTime: formatMessageTime,
    handleSendMessage,
    sendQuickAiQuery,
    isOwnMessage,
    setError,
    attachments,
    setAttachments,
    uploading,
  }
}
