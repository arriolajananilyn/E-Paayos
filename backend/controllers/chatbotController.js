import asyncHandler from "express-async-handler"
import { processChatMessage } from "../services/chatbotService.js"

/**
 * POST /api/chatbot/message
 * Body: { message: string, conversationHistory?: Array<{role, content}> }
 *
 * Protected by auth middleware — req.user is the authenticated customer.
 */
export const handleChatMessage = asyncHandler(async (req, res) => {
  const { message, conversationHistory } = req.body

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400)
    throw new Error("Message is required")
  }

  if (message.length > 1000) {
    res.status(400)
    throw new Error("Message is too long (max 1000 characters)")
  }

  // User ID comes from JWT-verified auth middleware — never trust frontend
  const userId = req.user._id

  try {
    const result = await processChatMessage(message, conversationHistory || [], userId)
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    console.error("[Chatbot] Unexpected error:", err.message || err)
    return res.json({
      success: true,
      message: "Kumusta! I am your E-Paayos assistant. How can I help you find repair services or check your bookings today?",
    })
  }
})
