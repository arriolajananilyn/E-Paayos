import jwt from "jsonwebtoken"
import asyncHandler from "express-async-handler"
import { User } from "../models/userModel.js"

export const protect = asyncHandler(async (req, res, next) => {
  let token
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]
  }
  if (!token) {
    res.status(401)
    throw new Error("Not authorized, no token")
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500)
    throw new Error("JWT_SECRET not set")
  }

  let decoded
  try {
    decoded = jwt.verify(token, secret)
  } catch {
    res.status(401)
    throw new Error("Not authorized, token invalid")
  }

  const user = await User.findById(decoded.id).select(
    "-password -validIdImage -selfieImage -businessPermitCertificateImage"
  )
  if (!user) {
    res.status(401)
    throw new Error("Not authorized, user not found")
  }

  if (user.role !== "admin") {
    const st = user.accountApprovalStatus
    if (st === "pending") {
      res.status(403)
      throw new Error("Your account is waiting for admin approval. Please try again later.")
    }
    if (st === "rejected") {
      res.status(403)
      throw new Error(
        user.approvalRejectionReason?.trim()
          ? `Your registration was not approved. Reason: ${user.approvalRejectionReason.trim()}`
          : "Your registration was not approved."
      )
    }
  }

  req.user = user
  next()
})

export const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403)
    throw new Error("Admin access only")
  }
  next()
})
