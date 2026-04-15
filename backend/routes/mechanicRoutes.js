import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { requireMechanicTechnician } from "../middleware/requireMechanicTechnician.js"
import {
  listMechanicReviewsRatings,
  listTechnicianBookings,
  patchMechanicBookingReviewResponse,
  patchTechnicianBookingAction,
} from "../controllers/bookingController.js"

const router = express.Router()

router.use(protect, requireMechanicTechnician)
router.get("/bookings", listTechnicianBookings)
router.get("/reviews-ratings", listMechanicReviewsRatings)
router.patch("/bookings/:id/review-response", patchMechanicBookingReviewResponse)
router.patch("/bookings/:id", patchTechnicianBookingAction)

export default router
