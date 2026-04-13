import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import { Announcement } from "../models/announcementModel.js"

export const listAnnouncementsAdmin = asyncHandler(async (req, res) => {
  const status = req.query.status
  const search = typeof req.query.search === "string" ? req.query.search.trim() : ""
  const filter = {}
  if (status && status !== "all") {
    filter.status = status
  }
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
    ]
  }
  const rows = await Announcement.find(filter).sort({ createdAt: -1 }).lean()
  res.json({ data: rows })
})

export const getAnnouncementStats = asyncHandler(async (_req, res) => {
  const [totalAnnouncements, published, draft, scheduled, viewsAgg] = await Promise.all([
    Announcement.countDocuments({}),
    Announcement.countDocuments({ status: "published" }),
    Announcement.countDocuments({ status: "draft" }),
    Announcement.countDocuments({ status: "scheduled" }),
    Announcement.aggregate([{ $group: { _id: null, totalViews: { $sum: "$viewCount" } } }]),
  ])
  const totalViews = viewsAgg[0]?.totalViews ?? 0
  res.json({
    data: {
      totalAnnouncements,
      published,
      draft,
      scheduled,
      totalViews,
    },
  })
})

export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, priority, targetAudience, status, scheduledDate } = req.body
  if (!title?.trim() || !content?.trim()) {
    res.status(400)
    throw new Error("Title and content are required")
  }
  const st = status || "draft"
  const doc = await Announcement.create({
    title: title.trim(),
    content: content.trim(),
    priority: priority || "normal",
    targetAudience: targetAudience || "all",
    status: st,
    scheduledDate: st === "scheduled" && scheduledDate ? new Date(scheduledDate) : undefined,
    author: req.user._id,
    authorName: req.user.fullName || req.user.email || "Admin",
    viewCount: 0,
  })
  res.status(201).json({ data: doc })
})

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) {
    res.status(400)
    throw new Error("Invalid announcement id")
  }
  const { title, content, priority, targetAudience, status, scheduledDate } = req.body
  if (!title?.trim() || !content?.trim()) {
    res.status(400)
    throw new Error("Title and content are required")
  }
  const st = status || "draft"
  const patch = {
    title: title.trim(),
    content: content.trim(),
    priority: priority || "normal",
    targetAudience: targetAudience || "all",
    status: st,
    scheduledDate: st === "scheduled" && scheduledDate ? new Date(scheduledDate) : undefined,
  }
  const doc = await Announcement.findByIdAndUpdate(id, patch, { new: true, runValidators: true }).lean()
  if (!doc) {
    res.status(404)
    throw new Error("Announcement not found")
  }
  res.json({ data: doc })
})

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) {
    res.status(400)
    throw new Error("Invalid announcement id")
  }
  const gone = await Announcement.findByIdAndDelete(id)
  if (!gone) {
    res.status(404)
    throw new Error("Announcement not found")
  }
  res.json({ message: "Deleted" })
})
