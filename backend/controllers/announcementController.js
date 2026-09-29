import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import { Announcement } from "../models/announcementModel.js"

const INITIAL_ANNOUNCEMENTS = [
  {
    title: "LMD-PESO Island-Wide Free Skills Accreditation & Refresher Drive",
    content:
      "Official notice from the Provincial Government of Marinduque and LMD-PESO: Free technical training, safety verification, and certification upgrades are now open for all local repair technicians, electronics specialists, and vehicle mechanics in Boac, Gasan, Mogpog, Santa Cruz, Buenavista, and Torrijos. Register through the E-Paayos platform or visit your nearest municipal PESO desk.",
    priority: "high",
    targetAudience: "all",
    status: "published",
    authorName: "LMD-PESO Admin Board",
    viewCount: 1420,
  },
  {
    title: "Monsoon Readiness & Emergency Roadside / Home Service Advisory",
    content:
      "In view of upcoming heavy weather conditions, all accredited on-call mechanics and appliance repair shops are advised to observe emergency standard safety protocols. Customers requiring urgent generator repair, roof electrical checks, or flooded vehicle recovery can request verified priority dispatch through the E-Paayos mobile and web portal.",
    priority: "high",
    targetAudience: "all",
    status: "published",
    authorName: "E-Paayos Safety Committee",
    viewCount: 980,
  },
  {
    title: "New Service Warranty Tracking & Instant In-App Digital Invoicing",
    content:
      "Shop owners and on-call technicians can now issue automated PESO-compliant digital warranty seals and invoice summaries directly to customers upon job completion. This update enhances trust, protects customer consumer rights, and ensures clear labor fee transparency across Marinduque.",
    priority: "normal",
    targetAudience: "shop-owner",
    status: "published",
    authorName: "System Development Team",
    viewCount: 650,
  },
  {
    title: "Scheduled System Maintenance & Cloud Performance Upgrade",
    content:
      "E-Paayos will undergo server optimization and database indexing on Sunday from 1:00 AM to 3:00 AM PHT. Real-time chat messaging and booking requests will briefly queue during this period. We thank you for your patience as we continuously improve island-wide connectivity.",
    priority: "low",
    targetAudience: "all",
    status: "published",
    authorName: "E-Paayos Technical Operations",
    viewCount: 420,
  },
]

export const seedDefaultAnnouncementsIfEmpty = async () => {
  try {
    const count = await Announcement.countDocuments({})
    if (count === 0) {
      await Announcement.insertMany(INITIAL_ANNOUNCEMENTS)
      console.log("Initial database announcements seeded successfully.")
    }
  } catch (err) {
    console.error("Announcement seeding error:", err?.message || err)
  }
}

export const listPublicAnnouncements = asyncHandler(async (req, res) => {
  await seedDefaultAnnouncementsIfEmpty()
  const { targetAudience, search } = req.query
  const filter = {
    $or: [
      { status: "published" },
      {
        status: "scheduled",
        scheduledDate: { $lte: new Date() },
      },
    ],
  }
  if (targetAudience && targetAudience !== "all") {
    filter.targetAudience = { $in: ["all", targetAudience] }
  }
  if (search) {
    const s = String(search).trim()
    filter.$and = [
      {
        $or: [
          { title: { $regex: s, $options: "i" } },
          { content: { $regex: s, $options: "i" } },
        ],
      },
    ]
  }
  const rows = await Announcement.find(filter).sort({ createdAt: -1 }).limit(10).lean()
  res.json({ data: rows })
})

export const incrementAnnouncementView = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) {
    res.status(400)
    throw new Error("Invalid announcement id")
  }
  const updated = await Announcement.findByIdAndUpdate(
    id,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).lean()
  if (!updated) {
    res.status(404)
    throw new Error("Announcement not found")
  }
  res.json({ data: updated })
})

export const listAnnouncementsAdmin = asyncHandler(async (req, res) => {
  await seedDefaultAnnouncementsIfEmpty()
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
  await seedDefaultAnnouncementsIfEmpty()
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
