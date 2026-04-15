import express from "express"
import multer from "multer"
import { protect } from "../middleware/authMiddleware.js"
import {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  presencePing,
} from "../controllers/messageController.js"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 8 },
})

const router = express.Router()
router.use(protect)

router.get("/conversations", listConversations)
router.post("/conversations", createConversation)
router.post("/presence/ping", presencePing)
router.get("/conversations/:conversationId/messages", listMessages)
router.post("/conversations/:conversationId/messages", upload.array("files", 8), sendMessage)

export default router
