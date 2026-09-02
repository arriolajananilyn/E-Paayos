/**
 * Base URL for API and `/uploads` assets.
 * Prefer `VITE_API_URL` when set (production / custom hosts).
 * In production with unified Vercel deployment (frontend + backend on same domain),
 * returns '' so that fetch('/api/...') uses relative URLs (same origin).
 * In local dev, default to the same hostname as the page so admin previews work
 * when opening the app from another PC or phone on the LAN (not only `localhost`).
 */
export function getApiBaseUrl() {
  const env = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  const trimmed = env && String(env).trim()
  if (trimmed) return trimmed.replace(/\/$/, '')

  // In production (unified Vercel deploy), frontend & backend share the same origin.
  // Return '' so fetch('/api/...') just works as a relative URL.
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return ''
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:5000`.replace(/\/$/, '')
  }

  return 'http://localhost:5000'
}
