import express from "express"
import multer from "multer"
import {
  registerUser,
  loginUser,
  getMe,
  patchMyPaymentMethods,
  patchMyWarrantySettings,
  updateShopOwnerShopInfo,
  listShopOwnersForRegistration,
  listUsersForAdmin,
  getUserForAdmin,
  approveUserForAdmin,
  rejectUserForAdmin,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/userController.js"
import { listPublicAnnouncements, incrementAnnouncementView } from "../controllers/announcementController.js"
import { protect, adminOnly } from "../middleware/authMiddleware.js"

const router = express.Router()

/** Registration files are kept in memory and saved to MongoDB (see userModel embedded images). */
const registerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.get("/announcements/public", listPublicAnnouncements)
router.post("/announcements/:id/view", incrementAnnouncementView)
router.get("/register/shop-owners", listShopOwnersForRegistration)

router.post(
  "/register",
  registerUpload.fields([
    { name: "validId", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "businessPermitCertificate", maxCount: 1 },
  ]),
  registerUser
)
router.post("/login", loginUser)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.get("/me", protect, getMe)
router.patch("/me/change-password", protect, changePassword)
router.patch("/me/password", protect, changePassword)
router.patch("/me/payment-methods", protect, patchMyPaymentMethods)
router.patch("/me/warranty-settings", protect, patchMyWarrantySettings)
router.patch("/me/shop", protect, updateShopOwnerShopInfo)
router.get("/admin/list", protect, adminOnly, listUsersForAdmin)
router.patch("/admin/:id/approve", protect, adminOnly, approveUserForAdmin)
router.patch("/admin/:id/reject", protect, adminOnly, rejectUserForAdmin)
router.get("/admin/:id", protect, adminOnly, getUserForAdmin)

export default router
