import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { requireMechanicTechnician } from "../middleware/requireMechanicTechnician.js"
import { listTechnicianBookings, patchTechnicianBookingAction } from "../controllers/bookingController.js"

const router = express.Router()

router.use(protect, requireMechanicTechnician)
router.get("/bookings", listTechnicianBookings)
router.patch("/bookings/:id", patchTechnicianBookingAction)

export default router
