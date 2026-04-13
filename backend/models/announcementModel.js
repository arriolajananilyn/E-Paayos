import mongoose from "mongoose"

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    targetAudience: {
      type: String,
      default: "all",
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "scheduled"],
      default: "draft",
    },
    scheduledDate: { type: Date },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, default: "" },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const Announcement = mongoose.model("Announcement", announcementSchema)
