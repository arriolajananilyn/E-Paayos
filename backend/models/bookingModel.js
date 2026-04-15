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
      enum: ["pending", "confirmed", "working", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    /** Set when the shop owner rejects (cancels) a booking from the dashboard. */
    rejectionReason: { type: String, default: "", trim: true, maxlength: 2000 },
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
  },
  { timestamps: true }
)

export const Booking = mongoose.model("Booking", bookingSchema)
