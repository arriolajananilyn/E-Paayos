import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import userRoutes from "./routes/userRoutes.js"
import shopRoutes from "./routes/shopRoutes.js"
import catalogRoutes from "./routes/catalogRoutes.js"
import mechanicRoutes from "./routes/mechanicRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import messageRoutes from "./routes/messageRoutes.js"
import { connectDB } from "./config/db.js"

dotenv.config()

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set in .env (required for login/register tokens)")
  process.exit(1)
}

const app = express()

// Middleware
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173"
app.use(cors({ origin: CLIENT_URL, credentials: true }))
// Booking issue photos can increase payload size (base64 strings).
app.use(express.json({ limit: "15mb" }))
app.use(express.urlencoded({ extended: true, limit: "15mb" }))

// Static for uploads
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Routes
app.get("/", (req, res) => {
  res.send("E-Paayos Backend is running successfully")
})
app.use("/api/users", userRoutes)
app.use("/api/shop", shopRoutes)
app.use("/api/catalog", catalogRoutes)
app.use("/api/mechanic", mechanicRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/messages", messageRoutes)

app.use((err, req, res, _next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500
  res.status(status).json({ message: err.message || "Server error" })
})

// DB and server start
connectDB()

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})