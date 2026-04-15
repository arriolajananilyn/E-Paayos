import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { requireCustomer } from "../middleware/requireCustomer.js"
import { getCatalogShopContextByServiceId, listCatalogShopServices } from "../controllers/catalogController.js"
import {
  createCustomerBooking,
  createCustomerBookingReview,
  listCustomerBookings,
  listServiceReviewsForCustomer,
} from "../controllers/bookingController.js"

const router = express.Router()

router.use(protect, requireCustomer)

router.get("/shop-services", listCatalogShopServices)
router.get("/shop-services/context/:serviceId", getCatalogShopContextByServiceId)
router.get("/shop-services/:serviceId/reviews", listServiceReviewsForCustomer)
router.get("/bookings", listCustomerBookings)
router.post("/bookings", createCustomerBooking)
router.post("/bookings/:id/review", createCustomerBookingReview)

export default router
