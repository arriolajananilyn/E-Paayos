import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      enum: ["account", "moderation", "appeal", "complaint", "report"],
      default: "account",
    },
    kind: { type: String, default: "" },
    severity: {
      type: String,
      enum: ["info", "success", "warning", "danger"],
      default: "info",
    },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    /** Logical target resolved per role on the client: moderation | complaints | users | complaint-admin | account */
    target: { type: String, default: "" },
    referenceCode: { type: String, default: "" },
    actorName: { type: String, default: "" },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
)

notificationSchema.index({ recipient: 1, createdAt: -1 })

export const Notification = mongoose.model("Notification", notificationSchema)
