import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = (env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "")

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        // Same-origin /uploads in dev (see buildAdminFileUrl). Target must be the API that has backend/uploads.
        "/uploads": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})