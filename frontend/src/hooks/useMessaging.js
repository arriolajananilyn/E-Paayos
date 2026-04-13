import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const RECIPIENT_KEY = 'epaayos_message_recipient'

const initialConversations = () => [
  {
    conversationId: 'th-3001',
    participant: {
      shopName: 'Arriola Auto Care',
      ownerName: 'Maria Arriola',
      name: 'Arriola Auto Care',
      role: 'Shop',
      isOnline: true,
    },
    lastMessage: {
      content: 'Sure, we can accommodate you tomorrow.',
      createdAt: new Date().toISOString(),
    },
    unreadCount: 2,
  },
  {
    conversationId: 'th-3002',
    participant: {
      shopName: 'QuickFix Garage',
      ownerName: 'Juan Reyes',
      name: 'QuickFix Garage',
      role: 'Shop',
      isOnline: false,
    },
    lastMessage: {
      content: 'Please send your vehicle model and plate number.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    unreadCount: 0,
  },
]

/** Shop owner inbox: participants are customers; fromMe = shop sent the message */
const shopOwnerInitialConversations = () => [
  {
    conversationId: 'so-3001',
    participant: { name: 'Rhod Velmar Debelen', role: 'Customer', isOnline: true },
    lastMessage: {
      content: 'Motorcycle tune-up po. Available ba tomorrow?',
      createdAt: new Date().toISOString(),
    },
    unreadCount: 1,
  },
  {
    conversationId: 'so-3002',
    participant: { name: 'Ana Santos', role: 'Customer', isOnline: false },
    lastMessage: {
      content: 'Salamat po sa update!',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    unreadCount: 0,
  },
]

const shopOwnerInitialMessagesByConversation = () => ({
  'so-3001': [
    {
      _id: 'so-m1',
      content: 'Hello! What service do you need?',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      fromMe: true,
      attachments: [],
    },
    {
      _id: 'so-m2',
      content: 'Motorcycle tune-up po. Available ba tomorrow?',
      createdAt: new Date(Date.now() - 3500000).toISOString(),
      fromMe: false,
      attachments: [],
    },
    {
      _id: 'so-m3',
      content: 'Sure, we can accommodate you tomorrow.',
      createdAt: new Date(Date.now() - 3400000).toISOString(),
      fromMe: true,
      attachments: [],
    },
  ],
  'so-3002': [
    {
      _id: 'so-m4',
      content: 'Your booking is confirmed for Saturday 2 PM.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      fromMe: true,
      attachments: [],
    },
    {
      _id: 'so-m5',
      content: 'Salamat po sa update!',
      createdAt: new Date(Date.now() - 86000000).toISOString(),
      fromMe: false,
      attachments: [],
    },
  ],
})

/** Mechanic/technician inbox: customers at shop owners; fromMe = technician sent */
const mechanicTechnicianInitialConversations = () => [
  {
    conversationId: 'mt-3001',
    participant: { name: 'Juan Dela Cruz', role: 'Customer', isOnline: true },
    lastMessage: {
      content: 'Hi, could we reschedule my appointment?',
      createdAt: new Date().toISOString(),
    },
    unreadCount: 1,
  },
  {
    conversationId: 'mt-3002',
    participant: {
      shopName: 'QuickFix Garage',
      ownerName: 'QC Branch',
      name: 'QuickFix Garage',
      role: 'Shop owner',
      isOnline: false,
    },
    lastMessage: {
      content: 'Please update the status of JOB-1001.',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    unreadCount: 0,
  },
]

const mechanicTechnicianInitialMessagesByConversation = () => ({
  'mt-3001': [
    {
      _id: 'mt-m1',
      content: 'Hi, could we reschedule my appointment?',
      createdAt: new Date(Date.now() - 4000000).toISOString(),
      fromMe: false,
      attachments: [],
    },
    {
      _id: 'mt-m2',
      content: 'Good day! What date works best for you?',
      createdAt: new Date(Date.now() - 3900000).toISOString(),
      fromMe: true,
      attachments: [],
    },
  ],
  'mt-3002': [
    {
      _id: 'mt-m3',
      content: 'Please update the status of JOB-1001.',
      createdAt: new Date(Date.now() - 7100000).toISOString(),
      fromMe: false,
      attachments: [],
    },
    {
      _id: 'mt-m4',
      content: 'Noted. JOB-1001 is now in progress.',
      createdAt: new Date(Date.now() - 7000000).toISOString(),
      fromMe: true,
      attachments: [],
    },
  ],
})

const initialMessagesByConversation = () => ({
  'th-3001': [
    {
      _id: 'm1',
      content: 'Hello! What service do you need?',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      fromMe: false,
      attachments: [],
    },
    {
      _id: 'm2',
      content: 'Motorcycle tune-up po. Available ba tomorrow?',
      createdAt: new Date(Date.now() - 3500000).toISOString(),
      fromMe: true,
      attachments: [],
    },
    {
      _id: 'm3',
      content: 'Sure, we can accommodate you tomorrow.',
      createdAt: new Date(Date.now() - 3400000).toISOString(),
      fromMe: false,
      attachments: [],
    },
  ],
  'th-3002': [
    {
      _id: 'm4',
      content: 'Please send your vehicle model and plate number.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      fromMe: false,
      attachments: [],
    },
  ],
})

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
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(() => {
    if (isShopOwner) return 'so-3001'
    if (isMechanicTechnician) return 'mt-3001'
    return 'th-3001'
  })
  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState(() => {
    if (isShopOwner) return shopOwnerInitialConversations()
    if (isMechanicTechnician) return mechanicTechnicianInitialConversations()
    return initialConversations()
  })
  const [messagesByConversation, setMessagesByConversation] = useState(() => {
    if (isShopOwner) return shopOwnerInitialMessagesByConversation()
    if (isMechanicTechnician) return mechanicTechnicianInitialMessagesByConversation()
    return initialMessagesByConversation()
  })
  const [loading] = useState(false)
  const [messagesLoading] = useState(false)
  const [error, setError] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [sellerInfo, setSellerInfo] = useState(null)
  const [hasSelectedNewConversation, setHasSelectedNewConversation] = useState(false)

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
        setSellerInfo({
          shopName: typeof parsed.shopName === 'string' ? parsed.shopName : '',
          ownerName: typeof parsed.ownerName === 'string' ? parsed.ownerName : '',
          fullName: parsed.fullName || parsed.shopName || parsed.ownerName || 'Shop',
          role: parsed.role || 'Shop',
          isOnline: Boolean(parsed.isOnline),
        })
        setHasSelectedNewConversation(true)
        setSelectedId(null)
      }
    } catch {
      sessionStorage.removeItem(RECIPIENT_KEY)
    }
  }, [skipRecipientHydration])

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

  const messages = selectedId ? messagesByConversation[selectedId] ?? [] : []

  const isOwnMessage = useCallback((m) => Boolean(m?.fromMe), [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, selectedId, hasSelectedNewConversation])

  const handleSelectConversation = useCallback((id) => {
    setSelectedId(id)
    setSidebarOpen(false)
    setHasSelectedNewConversation(false)
    setSellerInfo(null)
    sessionStorage.removeItem(RECIPIENT_KEY)
    setConversations((prev) =>
      prev.map((c) => (c.conversationId === id ? { ...c, unreadCount: 0 } : c)),
    )
  }, [])

  const handleSendMessage = useCallback(
    (e) => {
      e.preventDefault()
      const text = input.trim()
      if (!text && attachments.length === 0) return

      const attachmentPayload = attachments.map((file) => ({
        url: URL.createObjectURL(file),
        mimetype: file.type,
        originalName: file.name,
        size: file.size,
      }))

      const now = new Date().toISOString()
      const preview = text || (attachments.length ? `Sent ${attachments.length} file(s)` : '')

      setUploading(true)
      window.setTimeout(() => {
        if (hasSelectedNewConversation && sellerInfo) {
          const newId = `conv-${Date.now()}`
          const participant = {
            shopName: sellerInfo.shopName || '',
            ownerName: sellerInfo.ownerName || '',
            name: sellerInfo.fullName || sellerInfo.shopName || 'Shop',
            role: sellerInfo.role || 'Shop',
            isOnline: sellerInfo.isOnline ?? false,
          }
          setConversations((prev) => [
            {
              conversationId: newId,
              participant,
              lastMessage: { content: preview, createdAt: now },
              unreadCount: 0,
            },
            ...prev,
          ])
          setMessagesByConversation((prev) => ({
            ...prev,
            [newId]: [
              {
                _id: `m-${Date.now()}`,
                content: text,
                createdAt: now,
                fromMe: true,
                attachments: attachmentPayload,
              },
            ],
          }))
          setSelectedId(newId)
          setHasSelectedNewConversation(false)
          setSellerInfo(null)
          sessionStorage.removeItem(RECIPIENT_KEY)
        } else if (selectedId) {
          setMessagesByConversation((prev) => {
            const list = prev[selectedId] ?? []
            return {
              ...prev,
              [selectedId]: [
                ...list,
                {
                  _id: `m-${Date.now()}`,
                  content: text,
                  createdAt: now,
                  fromMe: true,
                  attachments: attachmentPayload,
                },
              ],
            }
          })
          setConversations((prev) =>
            prev.map((c) =>
              c.conversationId === selectedId
                ? { ...c, lastMessage: { content: preview, createdAt: now }, unreadCount: 0 }
                : c,
            ),
          )
        }
        setInput('')
        setAttachments([])
        setUploading(false)
      }, 350)
    },
    [attachments, hasSelectedNewConversation, input, selectedId, sellerInfo],
  )

  return {
    query,
    setQuery,
    selectedId,
    setSelectedId: handleSelectConversation,
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
    isOwnMessage,
    setError,
    attachments,
    setAttachments,
    uploading,
  }
}
