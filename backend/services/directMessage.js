import mongoose from "mongoose"
import { Conversation } from "../models/conversationModel.js"
import { Message } from "../models/messageModel.js"
import { markOnline } from "../utils/presenceStore.js"

function sortParticipantIds(id1, id2) {
  const a = id1 instanceof mongoose.Types.ObjectId ? id1 : new mongoose.Types.ObjectId(id1)
  const b = id2 instanceof mongoose.Types.ObjectId ? id2 : new mongoose.Types.ObjectId(id2)
  const sa = String(a)
  const sb = String(b)
  return sa < sb ? [a, b] : [b, a]
}

const PREVIEW_MAX = 500

function normalizeAttachments(raw) {
  if (!Array.isArray(raw) || !raw.length) return []
  const out = []
  for (const a of raw) {
    if (!a || typeof a.url !== "string") continue
    const url = a.url.trim()
    if (!url) continue
    const mimetype =
      typeof a.mimetype === "string" && a.mimetype.trim() ? a.mimetype.trim() : "image/jpeg"
    out.push({
      url,
      mimetype,
      originalName:
        typeof a.originalName === "string" && a.originalName.trim()
          ? a.originalName.trim()
          : `Attachment ${out.length + 1}`,
      size: Number.isFinite(Number(a.size)) ? Number(a.size) : 0,
    })
    if (out.length >= 12) break
  }
  return out
}

/**
 * Internal helper: create/find a 1:1 conversation and append a text message.
 * Used for booking-related automatic notifications (same storage as user chat).
 * Optional `attachments`: same shape as Message.attachments ({ url, mimetype, originalName, size }).
 */
export async function sendDirectMessage({ fromUserId, toUserId, content, attachments: rawAttachments }) {
  const text = typeof content === "string" ? content.trim() : ""
  const attachments = normalizeAttachments(rawAttachments)
  if (!text && !attachments.length) return { ok: false, error: "empty_content" }

  const from =
    fromUserId instanceof mongoose.Types.ObjectId ? fromUserId : new mongoose.Types.ObjectId(fromUserId)
  const to = toUserId instanceof mongoose.Types.ObjectId ? toUserId : new mongoose.Types.ObjectId(toUserId)

  if (String(from) === String(to)) return { ok: false, error: "same_user" }

  markOnline(from)

  const [userA, userB] = sortParticipantIds(from, to)

  let conv = await Conversation.findOne({ userA, userB })
  if (!conv) {
    try {
      conv = await Conversation.create({
        userA,
        userB,
        reads: [
          { user: userA, lastReadAt: new Date(0) },
          { user: userB, lastReadAt: new Date(0) },
        ],
      })
    } catch {
      conv = await Conversation.findOne({ userA, userB })
    }
  }
  if (!conv) return { ok: false, error: "no_conversation" }

  const msg = await Message.create({
    conversation: conv._id,
    sender: from,
    content: text.slice(0, 12000),
    attachments,
  })

  const lastAt = msg.createdAt || new Date()
  const preview =
    text.slice(0, PREVIEW_MAX) ||
    (attachments.length
      ? text.includes("Payment received")
        ? `Payment received — receipt attached`
        : `Issue photos (${attachments.length}) + booking details`
      : "")

  await Conversation.updateOne(
    { _id: conv._id },
    {
      $set: {
        lastMessageAt: lastAt,
        lastMessagePreview: preview,
        lastSender: from,
      },
    },
  )

  const doc = await Conversation.findById(conv._id)
  if (doc) {
    let r = doc.reads.find((x) => x.user && String(x.user) === String(from))
    if (!r) {
      doc.reads.push({ user: from, lastReadAt: lastAt })
    } else {
      r.lastReadAt = lastAt
    }
    await doc.save()
  }

  return { ok: true, messageId: String(msg._id) }
}
