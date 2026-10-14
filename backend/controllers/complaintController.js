import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import { Complaint } from "../models/complaintModel.js"
import { User } from "../models/userModel.js"
import { Booking } from "../models/bookingModel.js"
import { sendDirectMessage } from "../services/directMessage.js"

// Clean up any legacy mock/dummy complaints to ensure only real platform complaints are maintained
export const purgeMockComplaintsIfAny = async () => {
  try {
    const dummyTickets = [
      "CMP-202610-101",
      "CMP-202610-102",
      "CMP-202610-103",
      "CMP-202610-104",
      "CMP-202610-105",
    ]
    const dummyNames = [
      "Maria Elena Santos",
      "Juan Paolo Reyes",
      "Corazon Del Rosario",
      "Arnel M. Mendoza",
      "Leah Joy Villafuerte",
    ]
    const result = await Complaint.deleteMany({
      $or: [
        { ticketNumber: { $in: dummyTickets } },
        { customerName: { $in: dummyNames } },
      ],
    })
    if (result.deletedCount > 0) {
      console.log(`[Complaints] Purged ${result.deletedCount} legacy mock complaint records from database.`)
    }
  } catch (err) {
    // silent catch
  }
}

/**
 * @desc Get all complaints with filtering, search & pagination (Admin)
 * @route GET /api/admin/complaints
 * @access Admin
 */
export const listAdminComplaints = asyncHandler(async (req, res) => {
  await purgeMockComplaintsIfAny()

  const {
    status,
    category,
    priority,
    targetType,
    search,
    page = 1,
    limit = 50,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query

  const filter = {}

  if (status && status !== "all") {
    filter.status = status
  }
  if (category && category !== "all") {
    filter.category = category
  }
  if (priority && priority !== "all") {
    filter.priority = priority
  }
  if (targetType && targetType !== "all") {
    filter.targetType = targetType
  }

  if (search && search.trim()) {
    const s = search.trim()
    const regex = new RegExp(s, "i")
    filter.$or = [
      { ticketNumber: regex },
      { customerName: regex },
      { customerEmail: regex },
      { customerPhone: regex },
      { targetShopName: regex },
      { targetTechnicianName: regex },
      { subject: regex },
      { description: regex },
      { bookingServiceTitle: regex },
    ]
  }

  const p = Math.max(1, parseInt(page, 10) || 1)
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
  const skip = (p - 1) * l

  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate("customer", "fullName email phone profilePicture")
      .populate("targetShop", "fullName email phone shopName shopAddress profilePicture")
      .populate("booking", "problemDescription status preferredDate preferredTime contactName contactPhone serviceFeeLaborRateAtCalc serviceFeeMaterialsAmount")
      .sort(sort)
      .skip(skip)
      .limit(l)
      .lean(),
    Complaint.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: complaints,
    pagination: {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    },
  })
})

/**
 * @desc Get complaint stats summary (Admin)
 * @route GET /api/admin/complaints/stats
 * @access Admin
 */
export const getAdminComplaintStats = asyncHandler(async (req, res) => {
  await purgeMockComplaintsIfAny()

  const [
    total,
    pending,
    underInvestigation,
    actionTaken,
    resolved,
    dismissed,
    urgent,
    high,
    categoryCounts,
  ] = await Promise.all([
    Complaint.countDocuments({}),
    Complaint.countDocuments({ status: "pending" }),
    Complaint.countDocuments({ status: "under_investigation" }),
    Complaint.countDocuments({ status: "action_taken" }),
    Complaint.countDocuments({ status: "resolved" }),
    Complaint.countDocuments({ status: "dismissed" }),
    Complaint.countDocuments({ priority: "urgent" }),
    Complaint.countDocuments({ priority: "high" }),
    Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ])

  const byCategory = {}
  categoryCounts.forEach((c) => {
    byCategory[c._id] = c.count
  })

  res.json({
    success: true,
    data: {
      total,
      pending,
      underInvestigation,
      actionTaken,
      resolved,
      dismissed,
      urgentOrHigh: urgent + high,
      urgent,
      high,
      byCategory,
    },
  })
})

/**
 * @desc Get single complaint by ID or Ticket Number
 * @route GET /api/admin/complaints/:id
 * @access Admin
 */
export const getComplaintById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { ticketNumber: id.toUpperCase() }

  const complaint = await Complaint.findOne(query)
    .populate("customer", "fullName email phone profilePicture")
    .populate("targetShop", "fullName email phone shopName shopAddress profilePicture")
    .populate("booking")
    .populate("reviewedBy", "fullName email")
    .lean()

  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  res.json({ success: true, data: complaint })
})

/**
 * @desc Update complaint status, priority, admin action & notes (Admin)
 * @route PATCH /api/admin/complaints/:id
 * @access Admin
 */
export const updateComplaintAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  const {
    status,
    priority,
    adminNotes,
    adminAction,
    resolutionRemarks,
    notifyCustomer = true,
  } = req.body

  const complaint = await Complaint.findById(id)
  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  const prevStatus = complaint.status

  if (status) complaint.status = status
  if (priority) complaint.priority = priority
  if (typeof adminNotes === "string") complaint.adminNotes = adminNotes.trim()
  if (typeof adminAction === "string") complaint.adminAction = adminAction.trim()
  if (typeof resolutionRemarks === "string") complaint.resolutionRemarks = resolutionRemarks.trim()

  complaint.reviewedBy = req.user._id
  complaint.reviewedAt = new Date()

  if (["resolved", "action_taken", "dismissed"].includes(status) && !complaint.resolvedAt) {
    complaint.resolvedAt = new Date()
  }

  await complaint.save()

  // Optional: send automated message to customer via direct chat
  if (notifyCustomer && complaint.customer && status !== prevStatus) {
    try {
      const statusLabel =
        status === "under_investigation"
          ? "is now under official investigation"
          : status === "action_taken"
          ? "has had formal regulatory action taken"
          : status === "resolved"
          ? "has been successfully resolved"
          : status === "dismissed"
          ? "has been closed/dismissed"
          : "has been updated"

      const text = `📢 [E-Paayos Admin Notice] Your Complaint Ticket #${complaint.ticketNumber} ${statusLabel}.\n\n` +
        `• Subject: ${complaint.subject}\n` +
        (complaint.adminAction ? `• Action Taken: ${complaint.adminAction}\n` : "") +
        (complaint.resolutionRemarks ? `• Official Remarks: ${complaint.resolutionRemarks}\n` : "") +
        `\nThank you for helping keep E-Paayos safe, fair, and reliable.`

      await sendDirectMessage({
        fromUserId: req.user._id,
        toUserId: complaint.customer,
        content: text,
      })
    } catch (err) {
      console.warn("Could not send chat notification for complaint update:", err?.message || err)
    }
  }

  res.json({
    success: true,
    message: "Complaint updated successfully.",
    data: complaint,
  })
})

/**
 * @desc Delete a complaint (Admin)
 * @route DELETE /api/admin/complaints/:id
 * @access Admin
 */
export const deleteComplaintAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  const complaint = await Complaint.findById(id)
  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  await Complaint.findByIdAndDelete(id)
  res.json({ success: true, message: "Complaint ticket removed." })
})

/**
 * @desc Customer submits a new complaint / report
 * @route POST /api/users/complaints
 * @access Customer
 */
export const createCustomerComplaint = asyncHandler(async (req, res) => {
  const customerId = req.user._id
  const customer = await User.findById(customerId).lean()

  const {
    targetType = "shop",
    targetShopId,
    targetShopName,
    targetTechnicianId,
    targetTechnicianName,
    bookingId,
    category = "poor_service",
    subject,
    description,
    evidencePhotos = [],
    priority = "medium",
  } = req.body

  if (!subject || !subject.trim()) {
    res.status(400)
    throw new Error("Complaint subject/title is required.")
  }

  if (!description || !description.trim()) {
    res.status(400)
    throw new Error("Detailed description of the issue is required.")
  }

  let shopName = targetShopName || ""
  let shopId = targetShopId || null
  let serviceTitle = ""
  let bookingDoc = null

  if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
    bookingDoc = await Booking.findById(bookingId).populate("shopOwner", "fullName shopName").populate("shopService", "name title").lean()
    if (bookingDoc) {
      if (!shopId && bookingDoc.shopOwner) {
        shopId = bookingDoc.shopOwner._id
      }
      if (!shopName && bookingDoc.shopOwner) {
        shopName = bookingDoc.shopOwner.shopName || bookingDoc.shopOwner.fullName || ""
      }
      serviceTitle = bookingDoc.shopService?.name || bookingDoc.shopService?.title || bookingDoc.problemDescription || ""
    }
  }

  // Generate unique human-readable ticket number
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "")
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const ticketNumber = `CMP-${yyyymm}-${randomSuffix}`

  const newComplaint = await Complaint.create({
    ticketNumber,
    customer: customerId,
    customerName: customer?.fullName || req.user.fullName || "Customer",
    customerEmail: customer?.email || req.user.email || "",
    customerPhone: customer?.phone || customer?.mobile || "",
    targetType,
    targetShop: shopId,
    targetShopName: shopName,
    targetTechnician: targetTechnicianId || null,
    targetTechnicianName: targetTechnicianName || "",
    booking: bookingDoc?._id || (bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null),
    bookingServiceTitle: serviceTitle,
    category,
    subject: subject.trim(),
    description: description.trim(),
    evidencePhotos: Array.isArray(evidencePhotos) ? evidencePhotos : [],
    priority: ["urgent", "high", "medium", "low"].includes(priority) ? priority : "medium",
    status: "pending",
  })

  // Requirement: Notify relevant service provider of complaint
  const targetProviderId = shopId || targetTechnicianId || null
  if (targetProviderId) {
    try {
      await sendDirectMessage({
        fromUserId: customerId,
        toUserId: targetProviderId,
        content: `📢 [LMD-PESO Notice] Complaint #${ticketNumber} has been filed regarding your service (${serviceTitle || "Repair Booking"}).\n\n` +
          `• Subject: ${subject.trim()}\n` +
          `• Category: ${category}\n` +
          `• Customer Statement: "${description.trim().slice(0, 150)}..."\n\n` +
          `Please review this in your E-Paayos Provider portal and submit your official explanation or response for LMD-PESO dispute resolution.`,
      })
    } catch (err) {
      console.warn("Could not send provider notice:", err?.message || err)
    }
  }

  res.status(201).json({
    success: true,
    message: `Report successfully filed under ticket #${ticketNumber}. The LMD-PESO moderation board and service provider have been notified.`,
    data: newComplaint,
  })
})

/**
 * @desc Get current customer's filed complaints
 * @route GET /api/users/complaints/my
 * @access Customer
 */
export const listCustomerComplaints = asyncHandler(async (req, res) => {
  const customerId = req.user._id

  const complaints = await Complaint.find({ customer: customerId })
    .populate("targetShop", "fullName shopName shopAddress")
    .populate("booking", "ref problemDescription serviceMode")
    .sort({ createdAt: -1 })
    .lean()

  res.json({ success: true, data: complaints })
})

/**
 * @desc Get complaints targeting the logged-in service provider (Shop owner or technician)
 * @route GET /api/users/complaints/provider
 * @access Service Provider
 */
export const listProviderComplaints = asyncHandler(async (req, res) => {
  const providerId = req.user._id

  const complaints = await Complaint.find({
    $or: [{ targetShop: providerId }, { targetTechnician: providerId }],
  })
    .populate("customer", "fullName email phone")
    .populate("booking", "ref problemDescription serviceMode")
    .sort({ createdAt: -1 })
    .lean()

  res.json({ success: true, data: complaints })
})

/**
 * @desc Service provider submits explanation or defense response to a complaint
 * @route PATCH /api/users/complaints/provider/:id/respond
 * @access Service Provider
 */
export const respondToComplaintAsProvider = asyncHandler(async (req, res) => {
  const providerId = req.user._id
  const { id } = req.params
  const { explanation, explanationPhotos = [] } = req.body

  if (!explanation || !explanation.trim()) {
    res.status(400)
    throw new Error("Explanation or response statement is required.")
  }

  const complaint = await Complaint.findById(id)
  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  const isTarget =
    String(complaint.targetShop) === String(providerId) ||
    String(complaint.targetTechnician) === String(providerId)

  if (!isTarget && req.user.role !== "admin") {
    res.status(403)
    throw new Error("You are not authorized to respond to this complaint.")
  }

  complaint.providerExplanation = explanation.trim()
  if (Array.isArray(explanationPhotos) && explanationPhotos.length > 0) {
    complaint.providerExplanationPhotos = explanationPhotos
  }
  complaint.providerRespondedAt = new Date()

  if (complaint.status === "pending") {
    complaint.status = "under_investigation"
  }

  await complaint.save()

  // Notify customer
  if (complaint.customer) {
    try {
      await sendDirectMessage({
        fromUserId: providerId,
        toUserId: complaint.customer,
        content: `💬 [E-Paayos Complaint Update] The service provider (${complaint.targetShopName || req.user.fullName}) has submitted an official response/explanation regarding your Complaint #${complaint.ticketNumber}.\n\n` +
          `• Explanation: "${explanation.trim().slice(0, 200)}..."\n\n` +
          `The LMD-PESO Administrator will review both statements for dispute resolution.`,
      })
    } catch (err) {
      console.warn("Failed to send customer notification:", err?.message)
    }
  }

  res.json({
    success: true,
    message: "Official explanation/response submitted successfully.",
    data: complaint,
  })
})

/**
 * @desc LMD-PESO Administrator requests explanation from service provider
 * @route POST /api/admin/complaints/:id/request-explanation
 * @access Admin
 */
export const requestProviderExplanation = asyncHandler(async (req, res) => {
  const { id } = req.params
  const complaint = await Complaint.findById(id)
  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  complaint.explanationRequestedAt = new Date()
  if (complaint.status === "pending") {
    complaint.status = "under_investigation"
  }
  await complaint.save()

  const targetProviderId = complaint.targetShop || complaint.targetTechnician
  if (targetProviderId) {
    try {
      await sendDirectMessage({
        fromUserId: req.user._id,
        toUserId: targetProviderId,
        content: `⚠️ [LMD-PESO Official Inquiry] You are officially requested by the LMD-PESO Administrator to provide an explanation/defense regarding Complaint #${complaint.ticketNumber}.\n\n` +
          `• Complainant: ${complaint.customerName}\n` +
          `• Subject: ${complaint.subject}\n` +
          `• Category: ${complaint.category}\n\n` +
          `Please log into your Provider Portal to submit your official statement and counter-evidence within 48 hours for arbitration.`,
      })
    } catch (err) {
      console.warn("Failed to notify provider:", err?.message)
    }
  }

  res.json({
    success: true,
    message: `Official inquiry notice sent to service provider (${complaint.targetShopName || "Provider"}).`,
    data: complaint,
  })
})
