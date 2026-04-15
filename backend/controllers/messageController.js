import asyncHandler from "express-async-handler"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"
import mongoose from "mongoose"
import { User } from "../models/userModel.js"
import { Conversation } from "../models/conversationModel.js"
import { Message } from "../models/messageModel.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MESSAGE_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "messages")

const participantSelect =
  "fullName shopName role email employedByShopOwner accountApprovalStatus"

function buildPublicBaseUrl(req) {
  return process.env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`
}

/** Sorted so userA string < userB string — stable unique pair. */
function sortParticipantIds(id1, id2) {
  const a = id1 instanceof mongoose.Types.ObjectId ? id1 : new mongoose.Types.ObjectId(id1)
  const b = id2 instanceof mongoose.Types.ObjectId ? id2 : new mongoose.Types.ObjectId(id2)
  const sa = String(a)
  const sb = String(b)
  return sa < sb ? [a, b] : [b, a]
}

function roleLabel(role) {
  const map = {
    "shop-owner": "Shop",
    customer: "Customer",
    "mechanic-technician": "Mechanic",
    "independent-mechanic-technician": "Independent",
    admin: "Admin",
  }
  return map[role] || (typeof role === "string" ? role.replace(/_/g, " ") : "User")
}

function buildParticipantPayload(u) {
  if (!u) {
    return { shopName: "", ownerName: "", name: "User", role: "User", isOnline: false }
  }
  const shopName = typeof u.shopName === "string" ? u.shopName.trim() : ""
  const fullName = typeof u.fullName === "string" ? u.fullName.trim() : ""
  const name =
    u.role === "shop-owner" && shopName
      ? shopName
      : fullName || shopName || (typeof u.email === "string" ? u.email : "User")
  return {
    shopName,
    ownerName: u.role === "shop-owner" ? fullName : "",
    name,
    role: roleLabel(u.role),
    isOnline: false,
  }
}

function getReadAt(conv, userId) {
  const uid = String(userId)
  const hit = (conv.reads || []).find((r) => r.user && String(r.user) === uid)
  return hit?.lastReadAt ? new Date(hit.lastReadAt) : new Date(0)
}

async function unreadCountFor(conversationId, userId, lastReadAt) {
  return Message.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },
    createdAt: { $gt: lastReadAt },
  })
}

/**
 * GET /api/messages/conversations
 */
export const listConversations = asyncHandler(async (req, res) => {
  const me = req.user._id
  const list = await Conversation.find({
    $or: [{ userA: me }, { userB: me }],
  })
    .sort({ lastMessageAt: -1 })
    .lean()

  const out = []
  for (const c of list) {
    const otherId = String(c.userA) === String(me) ? c.userB : c.userA
    const other = await User.findById(otherId).select(participantSelect).lean()
    if (!other || other.role === "admin") continue

    const lastRead = getReadAt(c, me)
    const unread = await unreadCountFor(c._id, me, lastRead)

    out.push({
      conversationId: String(c._id),
      participant: buildParticipantPayload(other),
      lastMessage: {
        content: c.lastMessagePreview || "",
        createdAt: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : new Date(0).toISOString(),
      },
      unreadCount: unread,
    })
  }

  res.json({ conversations: out })
})

/**
 * POST /api/messages/conversations
 * body: { otherUserId: string }
 */
export const createConversation = asyncHandler(async (req, res) => {
  const me = req.user._id
  const raw = req.body?.otherUserId
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) {
    res.status(400)
    throw new Error("Valid otherUserId is required")
  }
  const otherId = new mongoose.Types.ObjectId(String(raw))
  if (String(otherId) === String(me)) {
    res.status(400)
    throw new Error("Cannot start a conversation with yourself")
  }

  const other = await User.findById(otherId).select(participantSelect).lean()
  if (!other) {
    res.status(404)
    throw new Error("User not found")
  }
  if (other.role === "admin") {
    res.status(403)
    throw new Error("Cannot message this user")
  }

  const [userA, userB] = sortParticipantIds(me, otherId)

  let conv = await Conversation.findOne({ userA, userB })
  let created = false
  if (!conv) {
    try {
      conv = await Conversation.create({
        userA,
        userB,
        reads: [
          { user: me, lastReadAt: new Date(0) },
          { user: otherId, lastReadAt: new Date(0) },
        ],
      })
      created = true
    } catch {
      conv = await Conversation.findOne({ userA, userB })
    }
  }
  if (!conv) {
    res.status(500)
    throw new Error("Could not create conversation")
  }

  const convObj = conv.toObject ? conv.toObject() : conv

  res.status(created ? 201 : 200).json({
    conversation: {
      conversationId: String(convObj._id),
      participant: buildParticipantPayload(other),
      lastMessage: {
        content: convObj.lastMessagePreview || "",
        createdAt: convObj.lastMessageAt
          ? new Date(convObj.lastMessageAt).toISOString()
          : new Date(0).toISOString(),
      },
      unreadCount: 0,
    },
  })
})

async function assertParticipant(convId, userId) {
  const conv = await Conversation.findById(convId).select("userA userB").lean()
  if (!conv) {
    return null
  }
  const ok = String(conv.userA) === String(userId) || String(conv.userB) === String(userId)
  return ok ? conv : null
}

/**
 * GET /api/messages/conversations/:conversationId/messages
 */
export const listMessages = asyncHandler(async (req, res) => {
  const me = req.user._id
  const { conversationId } = req.params
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    res.status(400)
    throw new Error("Invalid conversation id")
  }

  const conv = await assertParticipant(conversationId, me)
  if (!conv) {
    res.status(404)
    throw new Error("Conversation not found")
  }

  const doc = await Conversation.findById(conversationId)
  if (doc) {
    let r = doc.reads.find((x) => x.user && String(x.user) === String(me))
    if (!r) {
      doc.reads.push({ user: me, lastReadAt: new Date() })
    } else {
      r.lastReadAt = new Date()
    }
    await doc.save()
  }

  const rows = await Message.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .limit(500)
    .lean()

  const messages = rows.map((m) => ({
    _id: String(m._id),
    content: m.content || "",
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
    fromMe: String(m.sender) === String(me),
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
  }))

  res.json({ messages })
})

/**
 * POST /api/messages/conversations/:conversationId/messages
 * multipart: content (text), files field name "files"
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const me = req.user._id
  const { conversationId } = req.params
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    res.status(400)
    throw new Error("Invalid conversation id")
  }

  const conv = await assertParticipant(conversationId, me)
  if (!conv) {
    res.status(404)
    throw new Error("Conversation not found")
  }

  const content = typeof req.body?.content === "string" ? req.body.content.trim() : ""
  const files = Array.isArray(req.files) ? req.files : []

  if (!content && !files.length) {
    res.status(400)
    throw new Error("Message content or file is required")
  }

  await fs.mkdir(MESSAGE_UPLOAD_DIR, { recursive: true })
  const baseUrl = buildPublicBaseUrl(req)
  const attachments = []

  for (const f of files) {
    const orig = typeof f.originalname === "string" ? f.originalname : "file"
    const ext = path.extname(orig) || ""
    const fileName = `msg-${Date.now()}-${crypto.randomUUID()}${ext}`
    const dest = path.join(MESSAGE_UPLOAD_DIR, fileName)
    if (f.path) {
      await fs.rename(f.path, dest)
    } else if (f.buffer) {
      await fs.writeFile(dest, f.buffer)
    }
    const rel = `/uploads/messages/${fileName}`
    attachments.push({
      url: `${baseUrl}${rel}`,
      mimetype: f.mimetype || "application/octet-stream",
      originalName: orig,
      size: f.size || 0,
    })
  }

  const preview = content || (attachments.length ? `Sent ${attachments.length} file(s)` : "")

  const msg = await Message.create({
    conversation: conversationId,
    sender: me,
    content,
    attachments,
  })

  const lastAt = msg.createdAt || new Date()
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageAt: lastAt,
        lastMessagePreview: preview.slice(0, 500),
        lastSender: me,
      },
    }
  )

  const doc = await Conversation.findById(conversationId)
  if (doc) {
    let r = doc.reads.find((x) => x.user && String(x.user) === String(me))
    if (!r) {
      doc.reads.push({ user: me, lastReadAt: lastAt })
    } else {
      r.lastReadAt = lastAt
    }
    await doc.save()
  }

  res.status(201).json({
    message: {
      _id: String(msg._id),
      content,
      createdAt: lastAt.toISOString(),
      fromMe: true,
      attachments,
    },
  })
})
