/**
 * Build public URL for a stored upload path (Windows paths, relative, or uploads/...).
 */
export function buildAdminFileUrl(storedPath, apiBaseUrl) {
  if (!storedPath) return ''
  const base = String(apiBaseUrl || '').replace(/\/$/, '')
  if (/^https?:\/\//i.test(String(storedPath))) return String(storedPath)

  let path = String(storedPath).replace(/\\/g, '/')
  const idx = path.toLowerCase().lastIndexOf('uploads/')
  if (idx !== -1) {
    path = path.slice(idx)
  }
  if (!/^uploads\//i.test(path)) {
    const parts = path.split('/').filter(Boolean)
    const file = parts[parts.length - 1] || ''
    path = file ? `uploads/${file}` : ''
  }
  if (!path) return ''
  return `${base}/${path.replace(/^\/+/, '')}`
}

export function uploadsBasename(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return ''
  return storedPath.replace(/\\/g, '/').split('/').pop() || ''
}

export function isLikelyImageFilename(name) {
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(String(name || ''))
}
