import mongoose from "mongoose"

const shopServiceSchema = new mongoose.Schema(
  {
    shopOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    subcategory: { type: String, default: "", trim: true },
    description: { type: String, required: true, trim: true },
    location: {
      type: String,
      enum: ["home", "in-shop", "both"],
      required: true,
    },
    requirements: { type: String, default: "", trim: true },
    /** Optional starting price (PHP) shown to customers; omit or 0 = "price on request" in UI. */
    startingPrice: { type: Number, min: 0, default: null },
    /** Labor fee range for this listing (PHP), set when the provider adds/edits the service. */
    laborRatingMin: { type: Number, min: 0, default: null },
    laborRatingMax: { type: Number, min: 0, default: null },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    /** ShopEmployee _id and/or registered mechanic User _id (employedByShopOwner). */
    technicianIds: [{ type: mongoose.Schema.Types.ObjectId }],
    bookingsCount: { type: Number, default: 0, min: 0 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

export const ShopService = mongoose.model("ShopService", shopServiceSchema)
