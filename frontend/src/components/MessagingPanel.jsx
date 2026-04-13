import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Send,
  MoreVertical,
  Image as ImageIcon,
  Paperclip,
  Menu,
  Info,
  X,
} from 'lucide-react'
import useMessaging from '../hooks/useMessaging'

const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function resolveAttachmentUrl(url) {
  if (!url) return ''
  return url.startsWith('http') || url.startsWith('blob:') ? url : `${API_BASE}${url}`
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
        <img src={objectUrl} alt={file.name} className="h-20 w-20 object-cover rounded-md border border-gray-200" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex items-center gap-2 p-2 bg-gray-100 rounded-md border border-gray-200">
      <Paperclip className="h-4 w-4 text-gray-600 shrink-0" />
      <div className="text-xs min-w-0">
        <div className="font-medium truncate max-w-[100px]">{file.name}</div>
        <div className="text-[10px] text-gray-500">{formatFileSize(file.size)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shrink-0"
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
      ? 'Pumili ng conversation para makita ang mga mensahe ng customer.'
      : variant === 'mechanic-technician'
        ? 'Pumili ng conversation para makita ang usapan sa customer o shop owner.'
        : 'Your messages will appear here.'

  const newConvHint =
    variant === 'shop-owner'
      ? 'Magpadala ng unang mensahe sa customer sa ibaba.'
      : variant === 'mechanic-technician'
        ? 'Magpadala ng unang mensahe sa ibaba.'
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

      <div className="relative flex min-h-0 flex-1 basis-0 items-stretch gap-3 sm:gap-4">
        <aside
          className={`absolute inset-y-0 left-0 z-30 flex h-full min-h-0 w-[min(100%,16rem)] flex-col rounded-lg border border-[#081F5C]/10 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.12)] transition-transform duration-200 sm:static sm:inset-y-auto sm:left-auto sm:w-64 lg:w-72 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
          }`}
        >
          <div className="p-3 shadow-sm rounded-t-lg border-b border-[#081F5C]/10">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-white/95 border border-[#081F5C]/15 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#081F5C]/20 focus:border-[#081F5C]/40 transition-all shadow-[0_3px_10px_rgba(15,23,42,0.08)] text-sm"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white p-1.5 rounded-md shadow-sm">
                <Search className="h-3 w-3" />
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hidden rounded-b-lg">
            {loading ? (
              <div className="p-6 text-center text-gray-500 text-sm">Loading conversations...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-500 text-sm">
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
              <div className="p-6 text-center text-gray-500 text-sm">No conversations</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.conversationId}
                  type="button"
                  onClick={() => setSelectedId(c.conversationId)}
                  className={`w-full px-3 py-2.5 flex items-start gap-2 hover:bg-slate-50/80 border-b border-[#081F5C]/8 last:border-b-0 text-left ${
                    currentConversation && currentConversation.conversationId === c.conversationId
                      ? 'bg-blue-50/70 border-l-2 border-l-[#1447a6]'
                      : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                        currentConversation && currentConversation.conversationId === c.conversationId
                          ? 'bg-[#081F5C] text-white'
                          : 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white'
                      }`}
                    >
                      {participantAvatarInitial(c.participant)}
                    </div>
                    {c.participant?.isOnline ? (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white bg-green-500" />
                    ) : null}
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-medium text-sm truncate block ${
                            currentConversation && currentConversation.conversationId === c.conversationId
                              ? 'text-[#081F5C]'
                              : 'text-gray-900'
                          }`}
                        >
                          {formatShopOwnerLine(c.participant)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span
                          className={`text-[11px] font-medium whitespace-nowrap ${
                            currentConversation && currentConversation.conversationId === c.conversationId
                              ? 'text-[#081F5C]/80'
                              : 'text-gray-700'
                          }`}
                        >
                          {formatRoleDisplay(c.participant?.role)}
                        </span>
                        <span
                          className={`text-[10px] ${
                            currentConversation && currentConversation.conversationId === c.conversationId
                              ? 'text-[#081F5C]/55'
                              : 'text-gray-400'
                          }`}
                        >
                          {formatTime(c.lastMessage?.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`text-[12px] truncate mt-0.5 ${
                        currentConversation && currentConversation.conversationId === c.conversationId
                          ? 'text-[#0b2b73]'
                          : 'text-gray-600'
                      }`}
                    >
                      {c.lastMessage?.content || 'Start a conversation'}
                    </div>
                  </div>
                  {!currentConversation || currentConversation.conversationId !== c.conversationId ? (
                    c.unreadCount > 0 ? (
                      <span className="ml-1 shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-[#081F5C] text-white text-[10px]">
                        {c.unreadCount}
                      </span>
                    ) : null
                  ) : (
                    <span className="ml-1 shrink-0 text-[11px] text-[#081F5C]/60">Last message</span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col rounded-lg border border-[#081F5C]/15 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.12)]">
          <div className="px-3 sm:px-4 py-2.5 border-b border-[#081F5C]/10 flex items-center justify-between gap-2">
            {currentConversation ? (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  className="sm:hidden mr-1 h-8 w-8 rounded-md hover:bg-gray-100 grid place-items-center shrink-0"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="h-9 w-9 rounded-full bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {participantAvatarInitial(currentConversation.participant)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate min-w-0 flex-1">
                      {formatShopOwnerLine(currentConversation.participant)}
                    </span>
                    <span className="text-[11px] font-medium text-gray-700 shrink-0 whitespace-nowrap">
                      {formatRoleDisplay(currentConversation.participant?.role)}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-[11px] ${
                      currentConversation.participant?.isOnline ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                        currentConversation.participant?.isOnline ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    {currentConversation.participant?.isOnline ? 'Active now' : 'Offline'}
                  </div>
                </div>
              </div>
            ) : hasSelectedNewConversation && sellerInfo ? (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  className="sm:hidden mr-1 h-8 w-8 rounded-md hover:bg-gray-100 grid place-items-center shrink-0"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="h-9 w-9 rounded-full bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {participantAvatarInitial(sellerInfo)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate min-w-0 flex-1">
                      {formatShopOwnerLine(sellerInfo)}
                    </span>
                    <span className="text-[11px] font-medium text-gray-700 shrink-0 whitespace-nowrap">
                      {formatRoleDisplay(sellerInfo?.role)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#081F5C]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#1447a6] shrink-0" />
                    New conversation
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  className="sm:hidden mr-1 h-8 w-8 rounded-md hover:bg-gray-100 grid place-items-center shrink-0"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="text-sm text-gray-500">No conversation selected</div>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-gray-500 shrink-0">
              <button
                type="button"
                className="h-8 w-8 rounded-md hover:bg-gray-100 flex items-center justify-center"
                title="Info"
              >
                <Info className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-md hover:bg-gray-100 flex items-center justify-center"
                title="More"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto scrollbar-hidden px-3 sm:px-4 py-3 space-y-2 bg-sky-50/40 min-h-0"
          >
            {!currentConversation && !hasSelectedNewConversation ? (
              <div className="grid h-full min-h-0 place-items-center px-4 text-center text-gray-500">
                <div>
                  <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-white border border-[#081F5C]/10 shadow-[0_3px_10px_rgba(15,23,42,0.08)] text-[#081F5C] grid place-items-center text-lg">
                    💬
                  </div>
                  <div className="text-sm font-medium text-gray-900">Select a conversation</div>
                  <div className="text-xs text-gray-500">{emptySelectHint}</div>
                </div>
              </div>
            ) : hasSelectedNewConversation ? (
              <div className="grid h-full min-h-0 place-items-center px-4 text-center text-gray-500">
                <div>
                  <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-white border border-[#081F5C]/10 shadow-[0_3px_10px_rgba(15,23,42,0.08)] text-[#081F5C] grid place-items-center text-lg">
                    💬
                  </div>
                  <div className="text-sm font-medium text-gray-900">Start a conversation</div>
                  <div className="text-xs text-gray-500">{newConvHint}</div>
                  {sellerInfo ? (
                    <div className="mt-2 text-xs text-[#081F5C]">
                      Chatting with: {formatShopOwnerLine(sellerInfo)}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : messagesLoading ? (
              <div className="grid h-full min-h-0 place-items-center text-sm text-gray-500">Loading messages...</div>
            ) : error ? (
              <div className="grid h-full min-h-0 place-items-center px-4 text-center text-sm text-red-500">{error}</div>
            ) : messages.length === 0 ? (
              <div className="grid h-full min-h-0 place-items-center text-sm text-gray-500">No messages yet</div>
            ) : (
              messages.map((m) => {
                const isMe = isOwnMessage(m)
                const hasAtt = m.attachments && m.attachments.length > 0
                return (
                  <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`${
                        isMe
                          ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white'
                          : 'bg-white text-gray-900 border border-[#081F5C]/12'
                      } max-w-[80%] rounded-lg px-3 py-2 text-[13px] shadow-[0_2px_8px_rgba(15,23,42,0.06)]`}
                    >
                      {hasAtt ? (
                        <div className="mb-2 space-y-2">
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
                                    className="max-w-full max-h-64 rounded-md"
                                  />
                                </button>
                              ) : (
                                <a
                                  href={resolveAttachmentUrl(att.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded border ${
                                    isMe ? 'bg-[#1447a6]/90 border-white/25' : 'bg-gray-50 border-gray-200'
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
                      ) : null}
                      {m.content ? <div className="whitespace-pre-wrap wrap-break-word">{m.content}</div> : null}
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-white/85' : 'text-gray-400'}`}>
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-white shadow-[0_-1px_0_0_rgba(8,31,92,0.06)] shrink-0 rounded-b-lg border-t border-[#081F5C]/10"
          >
            {attachments.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <ComposerAttachmentChip
                    key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                    file={file}
                    onRemove={() => removeAttachment(idx)}
                  />
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-gray-500 shrink-0">
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
                  className="h-8 w-8 rounded-md hover:bg-gray-100 grid place-items-center"
                  title="Send image"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 rounded-md hover:bg-gray-100 grid place-items-center"
                  title="Send file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message here"
                className="flex-1 min-w-0 bg-white/95 border border-[#081F5C]/15 rounded-lg px-3 py-2 text-sm shadow-[0_2px_8px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-[#081F5C]/20 focus:border-[#081F5C]/40"
              />
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || uploading}
                className="h-9 w-9 shrink-0 rounded-md bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white grid place-items-center shadow-[0_3px_10px_rgba(15,23,42,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
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
