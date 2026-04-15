import mongoose from "mongoose"

const readEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastReadAt: { type: Date, default: () => new Date(0) },
  },
  { _id: false }
)

const conversationSchema = new mongoose.Schema(
  {
    /** Lower Mongo id string always in userA, higher in userB — unique pair. */
    userA: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userB: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lastMessageAt: { type: Date, default: () => new Date() },
    lastMessagePreview: { type: String, default: "" },
    lastSender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reads: { type: [readEntrySchema], default: [] },
  },
  { timestamps: true }
)

conversationSchema.index({ userA: 1, userB: 1 }, { unique: true })

export const Conversation = mongoose.model("Conversation", conversationSchema)
