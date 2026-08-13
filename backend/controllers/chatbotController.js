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
    // Quick pre-flight check for missing / placeholder API key
    const key = process.env.GEMINI_API_KEY || ""
    if (!key || key === "your_gemini_api_key_here" || key.length < 10) {
      console.error("[Chatbot] GEMINI_API_KEY is missing or still set to the placeholder value.")
      return res.status(503).json({
        success: false,
        message: "The AI assistant is not configured yet. Please ask the administrator to set a valid Gemini API key.",
      })
    }

    const result = await processChatMessage(message, conversationHistory || [], userId)
    return res.json({
      success: true,
      message: result.message,
    })
  } catch (err) {
    console.error("[Chatbot] Error:", err.message || err)

    // Gemini API key / auth errors
    if (
      err.message?.includes("GEMINI_API_KEY") ||
      err.message?.includes("API key not valid") ||
      err.message?.includes("API_KEY_INVALID") ||
      err.status === 401 ||
      err.status === 403
    ) {
      return res.status(503).json({
        success: false,
        message: "The AI assistant is not configured correctly. Please contact the administrator.",
      })
    }

    // Rate limit
    if (err.status === 429 || err.message?.includes("rate limit") || err.message?.includes("Rate limit")) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait a moment and try again.",
      })
    }

    // Quota exceeded
    if (err.message?.includes("quota") || err.message?.includes("billing") || err.code === "insufficient_quota") {
      return res.status(503).json({
        success: false,
        message: "The AI service quota has been exceeded. Please contact the administrator.",
      })
    }

    return res.status(500).json({
      success: false,
      message: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
    })
  }
})
