import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { requireShopOwner } from "../middleware/requireShopOwner.js"
import {
  createShopService,
  deleteShopService,
  getRegisteredMechanics,
  getShopEmployees,
  getShopServices,
  patchRegisteredMechanic,
  updateShopService,
} from "../controllers/shopController.js"
import {
  listShopOwnerBookings,
  listShopOwnerReviewsRatings,
  patchShopOwnerBookingReviewResponse,
  patchShopOwnerBookingServiceFee,
  patchShopOwnerBookingStatus,
} from "../controllers/bookingController.js"

const router = express.Router()

router.use(protect, requireShopOwner)

router.get("/employees", getShopEmployees)
router.get("/registered-mechanics", getRegisteredMechanics)
router.patch("/registered-mechanics/:id", patchRegisteredMechanic)
router.get("/bookings", listShopOwnerBookings)
router.get("/reviews-ratings", listShopOwnerReviewsRatings)
router.patch("/bookings/:id/review-response", patchShopOwnerBookingReviewResponse)
router.patch("/bookings/:id/service-fee", patchShopOwnerBookingServiceFee)
router.patch("/bookings/:id", patchShopOwnerBookingStatus)
router.get("/services", getShopServices)
router.post("/services", createShopService)
router.patch("/services/:id", updateShopService)
router.delete("/services/:id", deleteShopService)

export default router
