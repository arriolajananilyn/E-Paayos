import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import { Notification } from "../models/notificationModel.js"

function shapeNotification(n) {
  return {
    _id: String(n._id),
    category: n.category,
    kind: n.kind,
    severity: n.severity,
    title: n.title,
    message: n.message,
    target: n.target,
    referenceCode: n.referenceCode,
    actorName: n.actorName,
    read: Boolean(n.readAt),
    readAt: n.readAt,
    createdAt: n.createdAt,
  }
}

/**
 * @route   GET /api/users/me/notifications
 * @access  Private
 */
export const listMyNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query?.limit) || 100))
  const [rows, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ recipient: req.user._id, readAt: null }),
  ])
  return res.json({ success: true, notifications: rows.map(shapeNotification), unreadCount })
})

/**
 * @route   POST /api/users/me/notifications/:id/read
 * @access  Private
 */
export const markMyNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid notification id")
  }
  const doc = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  )
  return res.json({ success: true, notification: doc ? shapeNotification(doc) : null })
})

/**
 * @route   POST /api/users/me/notifications/read-all
 * @access  Private
 */
export const markAllMyNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } }
  )
  return res.json({ success: true, updated: result.modifiedCount || 0 })
})
