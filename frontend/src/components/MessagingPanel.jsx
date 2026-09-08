import { useEffect, useMemo, useRef } from 'react'
import {
  Search,
  Send,
  MoreVertical,
  Image as ImageIcon,
  Paperclip,
  Menu,
  Info,
  X,
  MessageSquare,
  Bot,
  Sparkles,
  Tag,
  Clock,
  MapPin,
  CalendarCheck,
} from 'lucide-react'
import useMessaging from '../hooks/useMessaging'

const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/** Booking auto-message: photos render between "Photo Issue:" and "Issue / problem:" */
const BOOKING_ISSUE_SPLIT = /\n(?=Issue \/ problem:)/

function resolveAttachmentUrl(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_BASE}${value}`
  if (/^https?:\/\//i.test(value)) {
    // If backend stored a localhost URL, remap to configured API base so other devices can load it.
    try {
      const parsed = new URL(value)
      const host = (parsed.hostname || '').toLowerCase()
      if (host === 'localhost' || host === '127.0.0.1') {
        const api = new URL(API_BASE)
        parsed.protocol = api.protocol
        parsed.host = api.host
        return parsed.toString()
      }
    } catch {
      // fall through
    }
    return value
  }
  // Best-effort: treat as relative server path
  return `${API_BASE}${value.startsWith('/') ? '' : '/'}${value}`
}

function formatRoleDisplay(role) {
  if (!role || typeof role !== 'string') return 'User'
  const r = role.replace(/_/g, ' ').trim()
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()
}

function formatShopOwnerLine(entity) {
  if (!entity || typeof entity !== 'object') return 'Unknown'
  const shop = String(entity.shopName || '').trim()
  const owner = String(entity.ownerName || '').trim()
  const legacy = String(entity.name || entity.fullName || '').trim()
  if (shop && owner) return `${shop} (${owner})`
  if (shop) return shop
  if (legacy && owner) return `${legacy} (${owner})`
  if (owner) return owner
  return legacy || 'Unknown'
}

function participantAvatarInitial(entity) {
  const s = String(entity?.shopName || entity?.name || entity?.fullName || 'U').trim()
  const ch = s.charAt(0)
  return ch ? ch.toUpperCase() : 'U'
}

function ComposerAttachmentChip({ file, onRemove }) {
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl])

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (file.type?.startsWith('image/')) {
    return (
      <div className="relative">
        <img src={objectUrl} alt={file.name} className="h-20 w-20 object-cover rounded-none border border-slate-200" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-none bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex items-center gap-2 p-2 bg-slate-100 rounded-none border border-slate-200">
      <Paperclip className="h-4 w-4 text-slate-600 shrink-0" />
      <div className="text-xs min-w-0">
        <div className="font-medium truncate max-w-[100px]">{file.name}</div>
        <div className="text-[10px] text-slate-500">{formatFileSize(file.size)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="h-5 w-5 rounded-none bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

/**
 * Shared messaging UI (sidebar + thread + composer). Matches customer messages layout.
 * @param {{ variant?: 'customer' | 'shop-owner' | 'mechanic-technician', className?: string }} props
 */
export function MessagingPanel({ variant = 'customer', className = '' }) {
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const {
    query,
    setQuery,
    selectedId,
    setSelectedId,
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
    formatTime,
    handleSendMessage,
    sendQuickAiQuery,
    isOwnMessage,
    setError,
    attachments,
    setAttachments,
    uploading,
  } = useMessaging(variant)

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    setAttachments((prev) => [...prev, ...imageFiles])
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const emptySelectHint =
    variant === 'shop-owner'
      ? 'Select a conversation to view customer messages.'
      : variant === 'mechanic-technician'
        ? 'Select a conversation to view messages with the customer or shop owner.'
        : 'Your messages will appear here.'

  const newConvHint =
    variant === 'shop-owner'
      ? 'Send your first message to the customer below.'
      : variant === 'mechanic-technician'
        ? 'Send your first message below.'
        : 'Send your first message below.'

  return (
    <div className={`flex min-h-0 flex-1 basis-0 flex-col gap-3 sm:gap-4 overflow-hidden ${className}`}>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close conversation list"
          className="fixed inset-0 z-10 bg-black/25 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="relative flex min-h-0 flex-1 basis-0 items-stretch gap-2.5 sm:gap-4">
        <aside
          className={`absolute inset-y-0 left-0 z-30 flex h-full min-h-0 w-[min(100%,18rem)] sm:w-64 lg:w-72 flex-col rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-transform duration-200 sm:static sm:inset-y-auto sm:left-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
          }`}
        >
          <div className="p-2.5 sm:p-3 shadow-2xs rounded-none border-b border-slate-200 bg-white">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-white border border-slate-200 rounded-none px-3 sm:px-3.5 py-1.5 sm:py-2 pr-9 sm:pr-10 outline-none focus:border-[#081F5C] focus:ring-1 focus:ring-[#081F5C] transition-all shadow-[0_2px_5px_rgba(15,23,42,0.14)] text-xs sm:text-sm"
              />
              <span className="pointer-events-none absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white p-1.5 rounded-none shadow-2xs">
                <Search className="h-3 w-3" />
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-none bg-white">
            {loading ? (
              <div className="p-6 text-center text-slate-500 text-xs sm:text-sm font-medium">Loading conversations...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-500 text-xs sm:text-sm">
                <div>{error}</div>
                <button
                  type="button"
                  className="mt-2 text-xs text-[#1447a6] hover:underline font-medium"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs sm:text-sm font-medium">No conversations</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.conversationId}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.conversationId)
                    setSidebarOpen(false)
                  }}
                  className={`w-full px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-start gap-2 sm:gap-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-left transition-colors cursor-pointer ${
                    currentConversation && currentConversation.conversationId === c.conversationId
                      ? 'bg-slate-100/90 border-l-4 border-l-[#081F5C]'
                      : 'bg-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`h-9 w-9 rounded-none flex items-center justify-center text-sm font-semibold ${
                        currentConversation && currentConversation.conversationId === c.conversationId
                          ? 'bg-[#081F5C] text-white'
                          : 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white'
                      }`}
                    >
                      {participantAvatarInitial(c.participant)}
                    </div>
                    {c.participant?.isOnline ? (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-none ring-2 ring-white bg-emerald-500" />
                    ) : null}
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-semibold text-xs sm:text-sm truncate block ${
                            currentConversation && currentConversation.conversationId === c.conversationId
                              ? 'text-[#081F5C]'
                              : 'text-slate-900'
                          }`}
                        >
                          {formatShopOwnerLine(c.participant)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span
                          className={`text-[11px] font-semibold whitespace-nowrap ${
                            currentConversation && currentConversation.conversationId === c.conversationId
                              ? 'text-[#081F5C]'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatRoleDisplay(c.participant?.role)}
                        </span>
                        <span
                          className={`text-[10px] ${
                            currentConversation && currentConversation.conversationId === c.conversationId
                              ? 'text-[#081F5C]/70'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatTime(c.lastMessage?.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`text-[12px] truncate mt-0.5 ${
                        currentConversation && currentConversation.conversationId === c.conversationId
                          ? 'text-[#081F5C] font-medium'
                          : 'text-slate-500'
                      }`}
                    >
                      {c.lastMessage?.content || 'Start a conversation'}
                    </div>
                  </div>
                  {!currentConversation || currentConversation.conversationId !== c.conversationId ? (
                    c.unreadCount > 0 ? (
                      <span className="ml-1 shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-none bg-[#081F5C] text-white text-[10px] font-bold">
                        {c.unreadCount}
                      </span>
                    ) : null
                  ) : (
                    <span className="ml-1 shrink-0 text-[11px] text-[#081F5C]/60 font-medium">Last</span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
          <div className="px-3 sm:px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
            {currentConversation ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  className="sm:hidden mr-1 h-8 w-8 rounded-none hover:bg-slate-100 grid place-items-center shrink-0"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-4 w-4 text-slate-700" />
                </button>
                <div className="h-9 w-9 rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-2xs">
                  {participantAvatarInitial(currentConversation.participant)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate min-w-0 flex-1">
                      {formatShopOwnerLine(currentConversation.participant)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 shrink-0 whitespace-nowrap">
                      {formatRoleDisplay(currentConversation.participant?.role)}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-[11px] ${
                      currentConversation.participant?.isOnline ? 'text-emerald-600 font-medium' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-none shrink-0 ${
                        currentConversation.participant?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    {currentConversation.participant?.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            ) : hasSelectedNewConversation && sellerInfo ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  className="sm:hidden mr-1 h-8 w-8 rounded-none hover:bg-slate-100 grid place-items-center shrink-0"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-4 w-4 text-slate-700" />
                </button>
                <div className="h-9 w-9 rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-2xs">
                  {participantAvatarInitial(sellerInfo)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate min-w-0 flex-1">
                      {formatShopOwnerLine(sellerInfo)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 shrink-0 whitespace-nowrap">
                      {formatRoleDisplay(sellerInfo?.role)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#081F5C] font-medium">
                    <span className="inline-block h-2 w-2 rounded-none bg-[#1447a6] shrink-0" />
                    New conversation
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  className="sm:hidden mr-1 h-8 w-8 rounded-none hover:bg-slate-100 grid place-items-center shrink-0"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-4 w-4 text-slate-700" />
                </button>
                <div className="text-sm text-slate-500 font-medium">No conversation selected</div>
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-2 text-slate-500 shrink-0">
              {/* Show AI Active pill when chatting with a provider */}
              {(currentConversation?.participant?.role === 'Shop' ||
                currentConversation?.participant?.role === 'Mechanic' ||
                currentConversation?.participant?.role === 'Independent' ||
                sellerInfo?.role === 'Shop' ||
                sellerInfo?.role === 'Mechanic' ||
                sellerInfo?.role === 'Independent') && (
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700 shadow-2xs"
                  title="Shop AI Assistant replies automatically to services, hours, and rates when provider is busy or away"
                >
                  <Sparkles className="h-3 w-3 text-blue-600 animate-pulse" />
                  <span className="hidden sm:inline">Shop AI Active</span>
                  <span className="sm:hidden">AI</span>
                </div>
              )}
              <button
                type="button"
                className="h-8 w-8 rounded-none hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                title="Info"
              >
                <Info className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-none hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                title="More"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto scrollbar-hidden px-3 sm:px-4 py-3 space-y-2 bg-white min-h-0"
          >
            {!currentConversation && !hasSelectedNewConversation ? (
              <div className="grid h-full min-h-0 place-items-center px-4 text-center text-slate-500">
                <div>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-none bg-slate-50 border border-slate-200 text-[#081F5C] shadow-[0_2px_5px_rgba(15,23,42,0.1)]">
                    <MessageSquare className="h-6 w-6 text-[#081F5C]" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Select a conversation</div>
                  <div className="text-xs text-slate-500 mt-1">{emptySelectHint}</div>
                </div>
              </div>
            ) : hasSelectedNewConversation ? (
              <div className="flex h-full min-h-0 flex-col overflow-y-auto">
                <div className="grid min-h-32 flex-1 place-items-center px-4 text-center text-slate-500">
                  <div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-none bg-slate-50 border border-slate-200 text-[#081F5C] shadow-[0_2px_5px_rgba(15,23,42,0.1)]">
                      <MessageSquare className="h-6 w-6 text-[#081F5C]" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">Start a conversation</div>
                    <div className="text-xs text-slate-500 mt-1">{newConvHint}</div>
                    {sellerInfo ? (
                      <div className="mt-2.5 text-xs font-semibold text-[#081F5C] bg-slate-50 px-3 py-1 border border-slate-200 inline-block rounded-none">
                        Chatting with: {formatShopOwnerLine(sellerInfo)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : messagesLoading ? (
              <div className="grid h-full min-h-0 place-items-center text-sm text-slate-500 font-medium">Loading messages...</div>
            ) : error ? (
              <div className="grid h-full min-h-0 place-items-center px-4 text-center text-sm text-red-500">{error}</div>
            ) : messages.length === 0 ? (
              <div className="grid h-full min-h-0 place-items-center text-sm text-slate-500 font-medium">No messages yet</div>
            ) : (
              messages.map((m) => {
                const isMe = isOwnMessage(m)
                const hasAtt = m.attachments && m.attachments.length > 0
                const rawContent = typeof m.content === 'string' ? m.content : ''
                const parts = rawContent.split(BOOKING_ISSUE_SPLIT)
                const useBookingPhotoLayout =
                  hasAtt &&
                  parts.length >= 2 &&
                  rawContent.includes('[Booking') &&
                  parts[0].includes('Photo Issue:')

                /** Payment proof: summary text first, receipt image(s) below */
                const usePaymentProofLayout =
                  hasAtt &&
                  rawContent.includes('[Booking') &&
                  rawContent.includes('Payment received') &&
                  rawContent.includes('Proof of payment')

                const attachmentBlock = (
                  <div
                    className={`space-y-2 ${useBookingPhotoLayout || usePaymentProofLayout ? 'my-2' : 'mb-2'}`}
                  >
                    {m.attachments.map((att, idx) => (
                      <div key={idx}>
                        {att.mimetype?.startsWith('image/') ? (
                          <button
                            type="button"
                            className="block w-full p-0 border-0 bg-transparent cursor-pointer"
                            onClick={() => window.open(resolveAttachmentUrl(att.url), '_blank')}
                          >
                            <img
                              src={resolveAttachmentUrl(att.url)}
                              alt={att.originalName || 'Image'}
                              className="max-w-full max-h-64 rounded-none border border-slate-200"
                            />
                          </button>
                        ) : (
                          <a
                            href={resolveAttachmentUrl(att.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-none border ${
                              isMe ? 'bg-[#1447a6]/90 border-white/25 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <Paperclip className="h-4 w-4 shrink-0" />
                            <div className="flex-1 min-w-0 text-left">
                              <div className="text-xs font-medium truncate">
                                {att.originalName || att.filename}
                              </div>
                              <div className="text-[10px] opacity-70">{formatFileSize(att.size || 0)}</div>
                            </div>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )

                return (
                  <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`${
                        isMe
                          ? 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white'
                          : m.isAiGenerated
                          ? 'bg-gradient-to-b from-blue-50/80 via-white to-white text-slate-900 border border-blue-200/90 shadow-xs'
                          : 'bg-white text-slate-900 border border-slate-200'
                      } max-w-[88%] sm:max-w-[82%] rounded-none px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-[13px] shadow-[0_2px_5px_rgba(15,23,42,0.08)]`}
                    >
                      {m.isAiGenerated && (
                        <div className="flex items-center gap-1.5 pb-1 mb-1.5 border-b border-blue-200/60 text-[10px] font-bold text-blue-700">
                          <Bot className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="uppercase tracking-wider">Virtual Assistant</span>
                          <span className="text-[9px] font-medium text-slate-400">· Automated Shop Reply</span>
                        </div>
                      )}
                      {useBookingPhotoLayout ? (
                        <>
                          <div className="whitespace-pre-wrap wrap-break-word">{parts[0].trimEnd()}</div>
                          {attachmentBlock}
                          <div className="whitespace-pre-wrap wrap-break-word">{parts.slice(1).join('').trimStart()}</div>
                        </>
                      ) : usePaymentProofLayout ? (
                        <>
                          <div className="whitespace-pre-wrap wrap-break-word">{rawContent}</div>
                          {attachmentBlock}
                        </>
                      ) : (
                        <>
                          {hasAtt ? attachmentBlock : null}
                          {m.content ? <div className="whitespace-pre-wrap wrap-break-word">{m.content}</div> : null}
                        </>
                      )}
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-white/80' : 'text-slate-400'}`}>
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            {uploading && (
              <div className="flex justify-start animate-pulse">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-none text-xs text-blue-700 shadow-2xs">
                  <Bot className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                  <span className="text-[11px] font-medium">Shop AI Assistant is preparing a reply...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Chips for Customer */}
          {variant === 'customer' && (currentConversation || (hasSelectedNewConversation && sellerInfo)) ? (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-50 border-t border-slate-200/80 overflow-x-auto [scrollbar-width:none]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
                <Bot className="h-3 w-3 text-[#081F5C]" />
                <span className="hidden xs:inline">Ask AI:</span>
              </span>
              <button
                type="button"
                onClick={() => sendQuickAiQuery('Ano-ano po ang mga serbisyo at presyo ninyo?')}
                disabled={uploading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none bg-white border border-slate-200 text-slate-700 hover:border-[#081F5C] hover:text-[#081F5C] text-[11px] font-medium transition-colors shadow-2xs whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Tag className="h-3 w-3 text-blue-600" />
                <span>Services & Rates</span>
              </button>
              <button
                type="button"
                onClick={() => sendQuickAiQuery('Ano po ang inyong operating hours at araw ng operasyon?')}
                disabled={uploading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none bg-white border border-slate-200 text-slate-700 hover:border-[#081F5C] hover:text-[#081F5C] text-[11px] font-medium transition-colors shadow-2xs whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Clock className="h-3 w-3 text-amber-600" />
                <span>Operating Hours</span>
              </button>
              <button
                type="button"
                onClick={() => sendQuickAiQuery('Saan po ang inyong exact location at landmark?')}
                disabled={uploading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none bg-white border border-slate-200 text-slate-700 hover:border-[#081F5C] hover:text-[#081F5C] text-[11px] font-medium transition-colors shadow-2xs whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
              >
                <MapPin className="h-3 w-3 text-emerald-600" />
                <span>Shop Location</span>
              </button>
              <button
                type="button"
                onClick={() => sendQuickAiQuery('May update po ba sa aking booking status?')}
                disabled={uploading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none bg-white border border-slate-200 text-slate-700 hover:border-[#081F5C] hover:text-[#081F5C] text-[11px] font-medium transition-colors shadow-2xs whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
              >
                <CalendarCheck className="h-3 w-3 text-purple-600" />
                <span>My Bookings</span>
              </button>
            </div>
          ) : null}

          <form
            onSubmit={handleSendMessage}
            className="p-2 sm:p-2.5 bg-white shrink-0 rounded-none border-t border-slate-200"
          >
            {attachments.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5 sm:gap-2">
                {attachments.map((file, idx) => (
                  <ComposerAttachmentChip
                    key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                    file={file}
                    onRemove={() => removeAttachment(idx)}
                  />
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-0.5 sm:gap-1 text-slate-500 shrink-0">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-none hover:bg-slate-100 grid place-items-center text-slate-600 transition-colors cursor-pointer"
                  title="Send image"
                >
                  <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-none hover:bg-slate-100 grid place-items-center text-slate-600 transition-colors cursor-pointer"
                  title="Send file"
                >
                  <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message here..."
                className="flex-1 min-w-0 bg-white border border-slate-200 rounded-none px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] outline-none focus:border-[#081F5C] focus:ring-1 focus:ring-[#081F5C]"
              />
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || uploading}
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-none bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white grid place-items-center shadow-[0_2px_5px_rgba(15,23,42,0.14)] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {uploading ? (
                  <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default MessagingPanel
