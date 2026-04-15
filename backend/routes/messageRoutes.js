import fs from "fs"
import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import { protect } from "../middleware/authMiddleware.js"
import {
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  presencePing,
} from "../controllers/messageController.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MESSAGE_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "messages")
fs.mkdirSync(MESSAGE_UPLOAD_DIR, { recursive: true })

const upload = multer({
  dest: MESSAGE_UPLOAD_DIR,
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
