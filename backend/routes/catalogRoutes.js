import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { requireCustomer } from "../middleware/requireCustomer.js"
import { getCatalogShopContextByServiceId, listCatalogShopServices } from "../controllers/catalogController.js"
import { createCustomerBooking, listCustomerBookings } from "../controllers/bookingController.js"

const router = express.Router()

router.use(protect, requireCustomer)

router.get("/shop-services", listCatalogShopServices)
router.get("/shop-services/context/:serviceId", getCatalogShopContextByServiceId)
router.get("/bookings", listCustomerBookings)
router.post("/bookings", createCustomerBooking)

export default router
