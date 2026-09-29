import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { requireCustomer } from "../middleware/requireCustomer.js"
import { getCatalogShopContextByServiceId, listCatalogShopServices } from "../controllers/catalogController.js"
import {
  createCustomerBooking,
  createCustomerBookingReview,
  listCustomerBookings,
  getCustomerBookingById,
  payCustomerBooking,
  listServiceReviewsForCustomer,
  submitCustomerWarrantyClaim,
} from "../controllers/bookingController.js"

const router = express.Router()

router.use(protect, requireCustomer)

router.get("/shop-services", listCatalogShopServices)
router.get("/shop-services/context/:serviceId", getCatalogShopContextByServiceId)
router.get("/shop-services/:serviceId/reviews", listServiceReviewsForCustomer)
router.get("/bookings", listCustomerBookings)
router.get("/bookings/:id", getCustomerBookingById)
router.post("/bookings", createCustomerBooking)
router.post("/bookings/:id/pay", payCustomerBooking)
router.post("/bookings/:id/review", createCustomerBookingReview)
router.post("/bookings/:id/warranty-claim", submitCustomerWarrantyClaim)

export default router
