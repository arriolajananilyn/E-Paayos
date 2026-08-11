import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

let connecting

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection
  if (connecting) return connecting

  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    console.error("MONGO_URI is not set in environment variables")
    if (!process.env.VERCEL) process.exit(1)
    throw new Error("MONGO_URI is not set")
  }

  connecting = mongoose
    .connect(mongoUri)
    .then((conn) => {
      console.log("MongoDB connected")
      return conn
    })
    .catch((error) => {
      connecting = undefined
      console.error("MongoDB connection error:", error.message)
      if (!process.env.VERCEL) process.exit(1)
      throw error
    })

  return connecting
}

