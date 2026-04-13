import dotenv from "dotenv"
import mongoose from "mongoose"
import { connectDB } from "../config/db.js"
import { User } from "../models/userModel.js"

dotenv.config()

const email = (process.env.SEED_ADMIN_EMAIL || "admin@epaayos.local").toLowerCase().trim()
const password = process.env.SEED_ADMIN_PASSWORD || "Admin123456"
const fullName = process.env.SEED_ADMIN_NAME || "Administrator"

async function main() {
  await connectDB()

  const existing = await User.findOne({ email })
  if (existing) {
    if (existing.role !== "admin") {
      console.error(`May existing user na ang ${email} bilang "${existing.role}". Pumili ng ibang email (SEED_ADMIN_EMAIL).`)
      process.exit(1)
    }
    console.log("Admin user na ang naka-register:", email)
    await mongoose.disconnect()
    return
  }

  await User.create({
    role: "admin",
    fullName,
    gender: "prefer-not",
    birthdate: new Date("1990-01-01"),
    region: "NCR",
    province: "Metro Manila",
    cityMunicipality: "Manila",
    barangay: "Ermita",
    detailedAddress: "E-Paayos (seeded admin account)",
    postalCode: "1000",
    phoneNumber: "9000000000",
    email,
    password,
    idType: "government-id",
    accountApprovalStatus: "approved",
  })

  console.log("Tapos na. Naka-create ang admin account.")
  console.log("  Email:", email)
  console.log(
    process.env.SEED_ADMIN_PASSWORD
      ? "  Password: (galing sa SEED_ADMIN_PASSWORD sa .env)"
      : "  Default password: Admin123456 — palitan ito sa production (i-set ang SEED_ADMIN_PASSWORD bago mag-seed)."
  )
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
