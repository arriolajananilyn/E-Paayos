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

const router = express.Router()

router.use(protect, adminOnly)

router.get("/service-bookings/stats", getAdminServiceBookingStats)
router.get("/service-bookings", listAdminServiceBookings)

router.get("/announcements/stats", getAnnouncementStats)
router.get("/announcements", listAnnouncementsAdmin)
router.post("/announcements", createAnnouncement)
router.patch("/announcements/:id", updateAnnouncement)
router.delete("/announcements/:id", deleteAnnouncement)

export default router
