/**
 * Store uploads inline in the database (e.g. data URLs) instead of writing files under
 * `uploads/`. Use on Vercel/serverless (no durable disk) or when the API must not depend
 * on a local folder so images load on every device.
 *
 * Set `PORTABLE_UPLOADS=1` on any host without persistent disk, even if not on Vercel.
 */
export function shouldStoreUploadsInline() {
  const p = process.env.PORTABLE_UPLOADS
  if (p === "1" || p === "true" || p === "yes") return true
  if (process.env.VERCEL) return true
  return false
}
