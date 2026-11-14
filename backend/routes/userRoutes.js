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
  warnUserForAdmin,
  restrictUserForAdmin,
  unrestrictUserForAdmin,
  getMyModerationStatus,
  acknowledgeMyWarning,
  forgotPassword,
  resetPassword,
  changePassword,
  patchMyDeliveryAddresses,
  patchMyCustomerPaymentMethods,
} from "../controllers/userController.js"
import { listPublicAnnouncements, incrementAnnouncementView } from "../controllers/announcementController.js"
import {
  createCustomerComplaint,
  createProviderComplaint,
  listCustomerComplaints,
  listProviderComplaints,
  listProviderFiledComplaints,
  respondToComplaintAsProvider,
} from "../controllers/complaintController.js"
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
router.get("/me/moderation", protect, getMyModerationStatus)
router.post("/me/warnings/:warningId/acknowledge", protect, acknowledgeMyWarning)
router.patch("/me/change-password", protect, changePassword)
router.patch("/me/password", protect, changePassword)
router.patch("/me/delivery-addresses", protect, patchMyDeliveryAddresses)
router.patch("/me/customer-payment-methods", protect, patchMyCustomerPaymentMethods)
router.patch("/me/payment-methods", protect, patchMyPaymentMethods)
router.patch("/me/warranty-settings", protect, patchMyWarrantySettings)
router.patch("/me/shop", protect, updateShopOwnerShopInfo)
router.get("/admin/list", protect, adminOnly, listUsersForAdmin)
router.patch("/admin/:id/approve", protect, adminOnly, approveUserForAdmin)
router.patch("/admin/:id/reject", protect, adminOnly, rejectUserForAdmin)
router.post("/admin/:id/warn", protect, adminOnly, warnUserForAdmin)
router.post("/admin/:id/restrict", protect, adminOnly, restrictUserForAdmin)
router.post("/admin/:id/unrestrict", protect, adminOnly, unrestrictUserForAdmin)
router.get("/admin/:id", protect, adminOnly, getUserForAdmin)

// Customer Complaints / Reports
router.post("/complaints", protect, createCustomerComplaint)
router.get("/complaints/my", protect, listCustomerComplaints)

// Service Provider Complaints & Explanations (Shop Owner / Technician)
router.get("/complaints/provider", protect, listProviderComplaints)
router.get("/complaints/provider/filed", protect, listProviderFiledComplaints)
router.post("/complaints/provider", protect, createProviderComplaint)
router.patch("/complaints/provider/:id/respond", protect, respondToComplaintAsProvider)

export default router
