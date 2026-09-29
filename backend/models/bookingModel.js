import mongoose from "mongoose"

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    shopOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    shopService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopService",
      required: true,
      index: true,
    },
    contactName: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    /** Calendar date the customer prefers (stored at UTC midnight of that calendar day in server TZ — use ISO date string for API). */
    preferredDate: { type: Date, required: true },
    /** 24h "HH:mm" from client */
    preferredTime: { type: String, required: true, trim: true },
    serviceMode: {
      type: String,
      enum: ["home", "in-shop"],
      required: true,
    },
    /** Where the item will be serviced (required when serviceMode is home). */
    serviceAddress: { type: String, default: "", trim: true },
    /** Customer device GPS when home service (optional; helps technicians navigate). */
    serviceLatitude: { type: Number, min: -90, max: 90 },
    serviceLongitude: { type: Number, min: -180, max: 180 },
    /** Optional customer-uploaded issue photos (data URLs or remote URLs). */
    issuePhotos: [{ type: String, trim: true }],
    problemDescription: { type: String, required: true, trim: true },
    notes: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "working", "fixed", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    fixedAt: { type: Date, default: null },
    /** Set when the shop owner rejects (cancels) a booking from the dashboard. */
    rejectionReason: { type: String, default: "", trim: true, maxlength: 2000 },
    /** Picture proof uploaded by provider or technician when starting job (working status). */
    startJobProofPhotos: [{ type: String, trim: true }],
    /** Handover / item claimed picture proof uploaded when marking job as completed. */
    completionProofPhotos: [{ type: String, trim: true }],
    /** Notes regarding item handover, test, and release condition. */
    completionNotes: { type: String, default: "", trim: true, maxlength: 2000 },
    /** Customer feedback after completed service. */
    customerReviewRating: { type: Number, min: 1, max: 5, default: null },
    customerReviewComment: { type: String, default: "", trim: true, maxlength: 4000 },
    customerReviewMedia: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
          default: "image",
        },
        url: { type: String, trim: true, default: "" },
        name: { type: String, trim: true, default: "" },
      },
    ],
    customerReviewedAt: { type: Date, default: null },
    /** Shop owner or assigned technician reply visible to customers on the review. */
    providerReviewResponse: { type: String, default: "", trim: true, maxlength: 4000 },
    providerReviewRespondedAt: { type: Date, default: null },
    /** Labor price entered by provider during fee calculation (PHP). */
    serviceFeeLaborRateAtCalc: { type: Number, default: null, min: 0 },
    /** Parts, materials, or replacement costs on top of labor (PHP, computed from replacement parts). */
    serviceFeeMaterialsAmount: { type: Number, default: null, min: 0 },
    /** What was spent or replaced (e.g. oil filter, screen module). */
    serviceFeeMaterialsDescription: { type: String, default: "", trim: true, maxlength: 2000 },
    /** Detailed replacement parts list entered by provider. */
    serviceFeeReplacementParts: [
      {
        name: { type: String, trim: true, default: "", maxlength: 200 },
        price: { type: Number, default: 0, min: 0 },
      },
    ],
    /** Set when provider saves the calculate-fee step; required before completed. */
    serviceFeeConfirmedAt: { type: Date, default: null },
    /** ShopEmployee or registered mechanic User assigned by shop owner to manage/perform this booking. */
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedTechnicianName: { type: String, default: "", trim: true },
    assignedTechnicianJobTitle: { type: String, default: "", trim: true },
    assignedTechnicianPhone: { type: String, default: "", trim: true },
    assignedTechnicianModel: {
      type: String,
      enum: ["User", "ShopEmployee", "none"],
      default: "none",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
      index: true,
    },
    paymentMethod: { type: String, default: "", trim: true },
    paymentProofImage: { type: String, default: "", trim: true },
    paidAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    /** Warranty Claim & Refund Process */
    warrantyClaim: {
      status: {
        type: String,
        enum: ["none", "pending", "approved", "working", "in_progress", "fixed", "rejected", "resolved", "completed"],
        default: "none",
        index: true,
      },
      claimType: {
        type: String,
        enum: ["labor_rework", "refund", "both"],
        default: "refund",
      },
      reason: { type: String, default: "", trim: true },
      details: { type: String, default: "", trim: true, maxlength: 4000 },
      proofPhotos: [{ type: String, trim: true }],
      isLaborCovered: { type: Boolean, default: true },
      isPartsCovered: { type: Boolean, default: false },
      requestedAmount: { type: Number, default: 0, min: 0 },
      approvedAmount: { type: Number, default: 0, min: 0 },
      refundPaymentMethod: { type: String, default: "", trim: true },
      refundAccountName: { type: String, default: "", trim: true },
      refundAccountNumber: { type: String, default: "", trim: true },
      refundProofImage: { type: String, default: "", trim: true },
      rejectionReason: { type: String, default: "", trim: true, maxlength: 2000 },
      resolutionNotes: { type: String, default: "", trim: true, maxlength: 2000 },
      claimedAt: { type: Date, default: null },
      approvedAt: { type: Date, default: null },
      startedAt: { type: Date, default: null },
      fixedAt: { type: Date, default: null },
      resolvedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
)

export const Booking = mongoose.model("Booking", bookingSchema)
