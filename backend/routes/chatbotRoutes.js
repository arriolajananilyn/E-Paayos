import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { requireCustomer } from "../middleware/requireCustomer.js"
import { handleChatMessage } from "../controllers/chatbotController.js"

const router = express.Router()

// All chatbot routes require authenticated customer
router.use(protect, requireCustomer)

router.post("/message", handleChatMessage)

export default router
