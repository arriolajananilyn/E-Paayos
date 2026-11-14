import { Notification } from "../models/notificationModel.js"
import { User } from "../models/userModel.js"

function pickPayload(input) {
  return {
    category: input.category || "account",
    kind: input.kind || "",
    severity: input.severity || "info",
    title: String(input.title || "").slice(0, 200) || "Account update",
    message: String(input.message || "").slice(0, 1000),
    target: input.target || "",
    referenceCode: input.referenceCode || "",
    actorName: input.actorName || "",
  }
}

/** Never throws: notification failures must not break the primary action. */
export async function notifyUser(recipientId, input) {
  if (!recipientId) return null
  try {
    return await Notification.create({ recipient: recipientId, ...pickPayload(input) })
  } catch (err) {
    console.warn("Could not create notification:", err?.message || err)
    return null
  }
}

export async function notifyAdmins(input, { excludeId } = {}) {
  try {
    const admins = await User.find({ role: "admin" }).select("_id").lean()
    const payload = pickPayload(input)
    const docs = admins
      .filter((a) => !excludeId || String(a._id) !== String(excludeId))
      .map((a) => ({ recipient: a._id, ...payload }))
    if (docs.length) await Notification.insertMany(docs)
  } catch (err) {
    console.warn("Could not notify admins:", err?.message || err)
  }
}
