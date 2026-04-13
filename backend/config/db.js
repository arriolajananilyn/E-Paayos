import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    console.error("MONGO_URI is not set in environment variables")
    process.exit(1)
  }
  try {
    await mongoose.connect(mongoUri)
    console.log("MongoDB connected")
  } catch (error) {
    console.error("MongoDB connection error:", error.message)
    process.exit(1)
  }
}

