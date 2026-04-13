import asyncHandler from "express-async-handler"

/** After `protect` — only logged-in customers may access catalog booking/search APIs. */
export const requireCustomer = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== "customer") {
    res.status(403)
    throw new Error("Customer access only")
  }
  next()
})
