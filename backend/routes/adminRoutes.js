import express from "express"
import { protect, adminOnly } from "../middleware/authMiddleware.js"
import {
  listAnnouncementsAdmin,
  getAnnouncementStats,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js"
import { getAdminServiceBookingStats, listAdminServiceBookings } from "../controllers/bookingController.js"
import {
  listAdminComplaints,
  getAdminComplaintStats,
  getComplaintById,
  updateComplaintAdmin,
  deleteComplaintAdmin,
  requestProviderExplanation,
} from "../controllers/complaintController.js"

const router = express.Router()

router.use(protect, adminOnly)

router.get("/service-bookings/stats", getAdminServiceBookingStats)
router.get("/service-bookings", listAdminServiceBookings)

router.get("/announcements/stats", getAnnouncementStats)
router.get("/announcements", listAnnouncementsAdmin)
router.post("/announcements", createAnnouncement)
router.patch("/announcements/:id", updateAnnouncement)
router.delete("/announcements/:id", deleteAnnouncement)

router.get("/complaints/stats", getAdminComplaintStats)
router.get("/complaints", listAdminComplaints)
router.get("/complaints/:id", getComplaintById)
router.patch("/complaints/:id", updateComplaintAdmin)
router.delete("/complaints/:id", deleteComplaintAdmin)
router.post("/complaints/:id/request-explanation", requestProviderExplanation)

export default router

