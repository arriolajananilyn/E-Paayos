import mongoose from "mongoose"

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    mimetype: { type: String, default: "" },
    originalName: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
)

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    isAiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
)

messageSchema.index({ conversation: 1, createdAt: 1 })

export const Message = mongoose.model("Message", messageSchema)
