/**
 * Resolve stored PSGC codes to readable names via https://psgc.gitlab.io/api
 * (same source as frontend registration / psgcResolve.js).
 */

const PSGC_BASE_URL = "https://psgc.gitlab.io/api"
const FETCH_MS = 10000

const displayNameCache = new Map()

async function fetchPsgcJson(path) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_MS)
  try {
    const res = await fetch(`${PSGC_BASE_URL}${path}`, { signal: ctrl.signal })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/**
 * @param {'region' | 'province' | 'city' | 'barangay'} kind
 * @param {string|number} code
 */
export async function getPsgcDisplayName(kind, code) {
  const s = String(code ?? "").trim()
  if (!s) return ""
  const cacheKey = `${kind}:${s}`
  if (displayNameCache.has(cacheKey)) return displayNameCache.get(cacheKey)

  let label = ""
  try {
    let j
    switch (kind) {
      case "region":
        j = await fetchPsgcJson(`/regions/${s}`)
        label = j?.regionName || j?.name || ""
        break
      case "province":
        j = await fetchPsgcJson(`/provinces/${s}`)
        if (!j) j = await fetchPsgcJson(`/districts/${s}`)
        label = j?.name || ""
        break
      case "city":
        j = await fetchPsgcJson(`/cities-municipalities/${s}`)
        label = j?.name || ""
        break
      case "barangay":
        j = await fetchPsgcJson(`/barangays/${s}`)
        label = j?.name || ""
        break
      default:
        label = ""
    }
  } catch {
    label = ""
  }

  const out = label || s
  displayNameCache.set(cacheKey, out)
  return out
}

async function resolveOne(kind, code) {
  if (code == null || code === "") return ""
  const s = String(code).trim()
  if (!/^\d+$/.test(s)) return s
  return getPsgcDisplayName(kind, s)
}

/**
 * One readable line for customer-facing shop location (PSGC codes → names).
 */
export async function formatReadableShopAddress(owner) {
  if (!owner) return "—"
  const detail = typeof owner.shopDetailedAddress === "string" ? owner.shopDetailedAddress.trim() : ""

  const [brgy, city, prov, reg] = await Promise.all([
    resolveOne("barangay", owner.shopBarangay),
    resolveOne("city", owner.shopCityMunicipality),
    resolveOne("province", owner.shopProvince),
    resolveOne("region", owner.shopRegion),
  ])

  const geoParts = [brgy, city, prov, reg].filter(Boolean)
  const geoLine = geoParts.join(", ")

  if (detail && geoLine) return `${detail}, ${geoLine}`
  if (detail) return detail
  return geoLine || "—"
}
