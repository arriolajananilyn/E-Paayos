/** Resolve stored PSGC codes to readable names via https://psgc.gitlab.io/api (same source as registration). */

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api'

const displayNameCache = new Map()

async function fetchPsgcJson(path) {
  const res = await fetch(`${PSGC_BASE_URL}${path}`)
  if (!res.ok) return null
  return res.json()
}

/**
 * @param {'region' | 'province' | 'city' | 'barangay'} kind
 * @param {string|number} code
 */
export async function getPsgcDisplayName(kind, code) {
  const s = String(code).trim()
  if (!s) return ''
  const cacheKey = `${kind}:${s}`
  if (displayNameCache.has(cacheKey)) return displayNameCache.get(cacheKey)

  let label = ''
  try {
    let j
    switch (kind) {
      case 'region':
        j = await fetchPsgcJson(`/regions/${s}`)
        label = j?.regionName || j?.name || ''
        break
      case 'province':
        j = await fetchPsgcJson(`/provinces/${s}`)
        if (!j) j = await fetchPsgcJson(`/districts/${s}`)
        label = j?.name || ''
        break
      case 'city':
        j = await fetchPsgcJson(`/cities-municipalities/${s}`)
        label = j?.name || ''
        break
      case 'barangay':
        j = await fetchPsgcJson(`/barangays/${s}`)
        label = j?.name || ''
        break
      default:
        label = ''
    }
  } catch {
    label = ''
  }

  const out = label || s
  displayNameCache.set(cacheKey, out)
  return out
}

/** Profile fields that hold PSGC (or rarely plain-text) geographic codes. */
const ADDRESS_FIELD_SPECS = [
  ['pobRegion', 'region'],
  ['pobProvince', 'province'],
  ['pobCityMunicipality', 'city'],
  ['pobBarangay', 'barangay'],
  ['region', 'region'],
  ['province', 'province'],
  ['cityMunicipality', 'city'],
  ['barangay', 'barangay'],
  ['permanentRegion', 'region'],
  ['permanentProvince', 'province'],
  ['permanentCityMunicipality', 'city'],
  ['permanentBarangay', 'barangay'],
  ['shopRegion', 'region'],
  ['shopProvince', 'province'],
  ['shopCityMunicipality', 'city'],
  ['shopBarangay', 'barangay'],
]

async function resolveOne(kind, code) {
  if (code == null || code === '') return ''
  const s = String(code).trim()
  if (!/^\d+$/.test(s)) return s
  return getPsgcDisplayName(kind, s)
}

/**
 * One readable line for shop location: street/detail + Barangay, City/Municipality, Province, Region.
 * PSGC numeric codes are resolved via psgc.gitlab.io; plain-text values are kept as-is.
 */
export async function formatReadableShopAddress(owner) {
  if (!owner) return '—'
  const detail = typeof owner.shopDetailedAddress === 'string' ? owner.shopDetailedAddress.trim() : ''

  const [brgy, city, prov, reg] = await Promise.all([
    resolveOne('barangay', owner.shopBarangay),
    resolveOne('city', owner.shopCityMunicipality),
    resolveOne('province', owner.shopProvince),
    resolveOne('region', owner.shopRegion),
  ])

  const geoParts = [brgy, city, prov, reg].filter(Boolean)
  const geoLine = geoParts.join(', ')

  if (detail && geoLine) return `${detail}, ${geoLine}`
  if (detail) return detail
  return geoLine || '—'
}

/**
 * Returns a map of profile property → display string (readable name or original non-numeric text).
 */
export async function resolveProfilePsgcLabels(profile) {
  const result = {}
  await Promise.all(
    ADDRESS_FIELD_SPECS.map(async ([prop, kind]) => {
      result[prop] = await resolveOne(kind, profile?.[prop])
    }),
  )
  return result
}
