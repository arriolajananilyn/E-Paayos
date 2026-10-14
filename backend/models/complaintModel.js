import mongoose from "mongoose"

const complaintSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, default: "", trim: true },
    customerPhone: { type: String, default: "", trim: true },

    // Target party being reported
    targetType: {
      type: String,
      enum: ["shop", "technician", "booking", "platform", "other"],
      default: "shop",
      index: true,
    },
    targetShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    targetShopName: { type: String, default: "", trim: true },

    targetTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetTechnicianName: { type: String, default: "", trim: true },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    bookingServiceTitle: { type: String, default: "", trim: true },

    category: {
      type: String,
      enum: [
        "overcharging",
        "poor_service",
        "unprofessional_behavior",
        "warranty_violation",
        "damage_property",
        "late_no_show",
        "scam_fraud",
        "harassment",
        "other",
      ],
      default: "poor_service",
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 250 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    evidencePhotos: [{ type: String, trim: true }],

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "under_investigation", "action_taken", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },

    // Service Provider explanation / formal response
    providerExplanation: { type: String, default: "", trim: true, maxlength: 5000 },
    providerExplanationPhotos: [{ type: String, trim: true }],
    providerRespondedAt: { type: Date, default: null },
    explanationRequestedAt: { type: Date, default: null },

    adminNotes: { type: String, default: "", trim: true, maxlength: 5000 },
    adminAction: { type: String, default: "", trim: true, maxlength: 250 },
    resolutionRemarks: { type: String, default: "", trim: true, maxlength: 5000 },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export const Complaint = mongoose.model("Complaint", complaintSchema)
