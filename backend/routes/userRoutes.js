import express from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import {
  registerUser,
  loginUser,
  getMe,
  updateShopOwnerShopInfo,
  listShopOwnersForRegistration,
  listUsersForAdmin,
  getUserForAdmin,
  approveUserForAdmin,
  rejectUserForAdmin,
} from "../controllers/userController.js"
import { protect, adminOnly } from "../middleware/authMiddleware.js"

const router = express.Router()

// ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + "-" + unique + ext)
  },
})

const upload = multer({ storage })

router.get("/register/shop-owners", listShopOwnersForRegistration)

router.post(
  "/register",
  upload.fields([
    { name: "validId", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "businessPermitCertificate", maxCount: 1 },
  ]),
  registerUser
)
router.post("/login", loginUser)
router.get("/me", protect, getMe)
router.patch("/me/shop", protect, updateShopOwnerShopInfo)
router.get("/admin/list", protect, adminOnly, listUsersForAdmin)
router.patch("/admin/:id/approve", protect, adminOnly, approveUserForAdmin)
router.patch("/admin/:id/reject", protect, adminOnly, rejectUserForAdmin)
router.get("/admin/:id", protect, adminOnly, getUserForAdmin)

export default router

