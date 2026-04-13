import mongoose from "mongoose"

const shopEmployeeSchema = new mongoose.Schema(
  {
    shopOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    skills: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive", "on-leave"],
      default: "active",
    },
  },
  { timestamps: true }
)

export const ShopEmployee = mongoose.model("ShopEmployee", shopEmployeeSchema)
