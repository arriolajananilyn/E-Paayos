import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import OnCallMechanicLayout from '../oncallmechanic/technician/OnCallMechanicLayout.jsx'
import AddressTabsSelector from '../../components/AddressTabsSelector.jsx'
import ShopAddressGoogleMap from '../../components/ShopAddressGoogleMap.jsx'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Building2, Camera, Eye, MapPin, RotateCcw, Save, Store, X } from 'lucide-react'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function ShopInfoLayout({ variant, pageMeta, children }) {
  if (variant === 'independent') {
    return (
      <OnCallMechanicLayout activeSection="business-info" pageMeta={pageMeta}>
        {children}
      </OnCallMechanicLayout>
    )
  }
  return (
    <ShopOwnerDashboard activeSection="shop-info" pageMeta={pageMeta}>
      {children}
    </ShopOwnerDashboard>
  )
}

/** Same options as `registration.jsx` (shop owner business + location steps) and backend `userModel` enums */
const BUSINESS_TYPES = ['Sole Proprietorship (Single Owner)', 'Partnership (Multiple Owners)', 'Corporation (Multiple Owners)']
const SERVICE_TYPES = ['Home Service', 'Shop Visit', 'Both (Home Service and Shop Visit)']

/** On-call provider registration uses different labels; DB enum stays Home Service | Shop Visit | Both */
const INDEPENDENT_SERVICE_TYPES_DISPLAY = [
  'Home Service',
  'Technician/Mechanic location Visit',
  'Both (Home Service, Technician/Mechanic location Visit)',
]
const INDEPENDENT_DISPLAY_TO_DB = {
  'Home Service': 'Home Service',
  'Technician/Mechanic location Visit': 'Shop Visit',
  'Both (Home Service, Technician/Mechanic location Visit)': 'Both',
}
const INDEPENDENT_DB_TO_DISPLAY = {
  'Home Service': 'Home Service',
  'Shop Visit': 'Technician/Mechanic location Visit',
  Both: 'Both (Home Service, Technician/Mechanic location Visit)',
}

/** API / DB use short enums; UI matches registration labels */
const BUSINESS_DISPLAY_BY_DB = {
  'Sole Proprietorship': 'Sole Proprietorship (Single Owner)',
  Partnership: 'Partnership (Multiple Owners)',
  Corporation: 'Corporation (Multiple Owners)',
}
const BUSINESS_DB_BY_DISPLAY = {
  'Sole Proprietorship (Single Owner)': 'Sole Proprietorship',
  'Partnership (Multiple Owners)': 'Partnership',
  'Corporation (Multiple Owners)': 'Corporation',
}
const SERVICE_DISPLAY_BY_DB = {
  'Home Service': 'Home Service',
  'Shop Visit': 'Shop Visit',
  Both: 'Both (Home Service and Shop Visit)',
}
const SERVICE_DB_BY_DISPLAY = {
  'Home Service': 'Home Service',
  'Shop Visit': 'Shop Visit',
  'Both (Home Service and Shop Visit)': 'Both',
}
const REPAIR_SERVICE_TYPES = [
  'Automotive Repair',
  'Motorcycle Repair',
  'Appliance Repair',
  'Electronics/ Gadget Repair',
  'Electrical/ Wiring Repair',
  'Transmission',
  'General Maintenance',
]
const DAYS_OF_OPERATION = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api'
const NCR_REGION_CODE = '130000000'
/** Shop profile location is limited to Marinduque (MIMAROPA) — PSGC codes from psgc.gitlab.io */
const MARINDUQUE_REGION_CODE = '170000000'
const MARINDUQUE_PROVINCE_CODE = '174000000'
const FALLBACK_REGIONS = [{ code: MARINDUQUE_REGION_CODE, name: 'MIMAROPA Region' }]

/** Same picker shape as `registration.jsx` shop-owner step 2. */
const DEFAULT_OPERATING_HOURS_PARTS = {
  openHH: '',
  openMM: '',
  openPeriod: 'AM',
  closeHH: '',
  closeMM: '',
  closePeriod: 'PM',
}

/** Resolve stored shop photo path or data URL for <img src>. */
function resolveShopPlacePhotoUrl(raw, apiBase) {
  if (!raw || typeof raw !== 'string') return ''
  const s = raw.trim()
  if (!s) return ''
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('/uploads/')) return `${apiBase}${s}`
  return s
}

/** Parse `operatingHours` from registration: `HH:MM AM - HH:MM PM`. */
function parseOperatingHoursToParts(s) {
  if (!s || typeof s !== 'string') return { ...DEFAULT_OPERATING_HOURS_PARTS }
  const m = s
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s+(AM|PM)\s+-\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i)
  if (!m) return { ...DEFAULT_OPERATING_HOURS_PARTS }
  return {
    openHH: m[1],
    openMM: m[2],
    openPeriod: m[3].toUpperCase(),
    closeHH: m[4],
    closeMM: m[5],
    closePeriod: m[6].toUpperCase(),
  }
}

function emptyShopForm() {
  return {
    shopName: '',
    businessType: '',
    repairServicesOffered: [],
    serviceType: 'Both (Home Service and Shop Visit)',
    yearsOfOperation: '',
    numberOfEmployees: '',
    operatingHours: '',
    daysOfOperation: [],
    shopDescription: '',
    shopRegion: '',
    shopProvince: '',
    shopCityMunicipality: '',
    shopBarangay: '',
    shopDetailedAddress: '',
    shopLandmark: '',
    shopPlacePhoto: '',
  }
}

function userToShopForm(u) {
  if (!u || (u.role !== 'shop-owner' && u.role !== 'oncall-mechanic-technician')) return emptyShopForm()
  return {
    shopName: u.shopName || '',
    businessType: BUSINESS_DISPLAY_BY_DB[u.businessType] || u.businessType || '',
    repairServicesOffered: Array.isArray(u.repairServicesOffered) ? [...u.repairServicesOffered] : [],
    serviceType:
      u.role === 'oncall-mechanic-technician'
        ? INDEPENDENT_DB_TO_DISPLAY[u.serviceType] ||
          SERVICE_DISPLAY_BY_DB[u.serviceType] ||
          'Both (Home Service, Technician/Mechanic location Visit)'
        : SERVICE_DISPLAY_BY_DB[u.serviceType] || u.serviceType || 'Both (Home Service and Shop Visit)',
    yearsOfOperation: u.yearsOfOperation != null && u.yearsOfOperation !== '' ? String(u.yearsOfOperation) : '',
    numberOfEmployees: u.numberOfEmployees != null && u.numberOfEmployees !== '' ? String(u.numberOfEmployees) : '',
    operatingHours: u.operatingHours || '',
    daysOfOperation: Array.isArray(u.daysOfOperation) ? [...u.daysOfOperation] : [],
    shopDescription: u.shopDescription || '',
    shopRegion: u.shopRegion || '',
    shopProvince: u.shopProvince || '',
    shopCityMunicipality: u.shopCityMunicipality || '',
    shopBarangay: u.shopBarangay || '',
    shopDetailedAddress: u.shopDetailedAddress || '',
    shopLandmark: u.shopLandmark || '',
    shopPlacePhoto: typeof u.shopPlacePhoto === 'string' ? u.shopPlacePhoto : '',
  }
}

export function ShopInfoInner({ variant = 'shop' }) {
  const [profileLoading, setProfileLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const [account, setAccount] = useState({
    fullName: '',
    email: '',
    phoneCode: '+63',
    phoneNumber: '',
    createdAt: '',
  })

  const [form, setForm] = useState(emptyShopForm)
  const [providerRole, setProviderRole] = useState('')
  const [savedSnapshot, setSavedSnapshot] = useState(null)
  const [operatingHoursParts, setOperatingHoursParts] = useState({ ...DEFAULT_OPERATING_HOURS_PARTS })

  const [psgcRegions, setPsgcRegions] = useState(FALLBACK_REGIONS)
  const [psgcProvincesByRegion, setPsgcProvincesByRegion] = useState({})
  const [psgcCitiesByProvince, setPsgcCitiesByProvince] = useState({})
  const [psgcCitiesByRegion, setPsgcCitiesByRegion] = useState({})
  const [psgcBarangaysByCity, setPsgcBarangaysByCity] = useState({})
  const [psgcLoading, setPsgcLoading] = useState(false)

  const psgcFetchedRef = useRef({
    regions: false,
    provinces: new Set(),
    citiesRegion: new Set(),
    citiesProvince: new Set(),
    barangays: new Set(),
  })

  const fetchPSGC = async (path) => {
    const res = await fetch(`${PSGC_BASE_URL}${path}`, { method: 'GET' })
    if (!res.ok) throw new Error(`PSGC request failed: ${res.status}`)
    return res.json()
  }

  async function loadRegions() {
    if (psgcFetchedRef.current.regions) return
    psgcFetchedRef.current.regions = true
    setPsgcLoading(true)
    try {
      const data = await fetchPSGC('/regions/')
      const formatted = (data || []).map((r) => ({ code: String(r.code), name: r.name }))
      if (formatted.length) setPsgcRegions(formatted)
    } catch {
      psgcFetchedRef.current.regions = false
    } finally {
      setPsgcLoading(false)
    }
  }

  async function loadProvinces(regionCode) {
    if (!regionCode || regionCode === NCR_REGION_CODE) return
    if (psgcFetchedRef.current.provinces.has(regionCode)) return
    psgcFetchedRef.current.provinces.add(regionCode)
    setPsgcLoading(true)
    try {
      const data = await fetchPSGC(`/regions/${regionCode}/provinces/`)
      const formatted = (data || []).map((p) => ({ code: String(p.code), name: p.name }))
      setPsgcProvincesByRegion((prev) => ({ ...prev, [regionCode]: formatted }))
    } catch {
      setPsgcProvincesByRegion((prev) => ({ ...prev, [regionCode]: [] }))
      psgcFetchedRef.current.provinces.delete(regionCode)
    } finally {
      setPsgcLoading(false)
    }
  }

  async function loadCitiesForRegion(regionCode) {
    if (!regionCode) return
    if (psgcFetchedRef.current.citiesRegion.has(regionCode)) return
    psgcFetchedRef.current.citiesRegion.add(regionCode)
    setPsgcLoading(true)
    try {
      const data =
        (await fetchPSGC(`/regions/${regionCode}/cities-municipalities/`).catch(() => null)) ||
        (await fetchPSGC(`/regions/${regionCode}/cities/`).catch(() => []))
      const formatted = (data || []).map((c) => ({ code: String(c.code), name: c.name }))
      setPsgcCitiesByRegion((prev) => ({ ...prev, [regionCode]: formatted }))
    } catch {
      setPsgcCitiesByRegion((prev) => ({ ...prev, [regionCode]: [] }))
      psgcFetchedRef.current.citiesRegion.delete(regionCode)
    } finally {
      setPsgcLoading(false)
    }
  }

  async function loadCitiesForProvince(provinceCode) {
    if (!provinceCode) return
    if (psgcFetchedRef.current.citiesProvince.has(provinceCode)) return
    psgcFetchedRef.current.citiesProvince.add(provinceCode)
    setPsgcLoading(true)
    try {
      const data = await fetchPSGC(`/provinces/${provinceCode}/cities-municipalities/`)
      const formatted = (data || []).map((c) => ({ code: String(c.code), name: c.name }))
      setPsgcCitiesByProvince((prev) => ({ ...prev, [provinceCode]: formatted }))
    } catch {
      setPsgcCitiesByProvince((prev) => ({ ...prev, [provinceCode]: [] }))
      psgcFetchedRef.current.citiesProvince.delete(provinceCode)
    } finally {
      setPsgcLoading(false)
    }
  }

  async function loadBarangays(cityCode) {
    if (!cityCode) return
    if (psgcFetchedRef.current.barangays.has(cityCode)) return
    psgcFetchedRef.current.barangays.add(cityCode)
    setPsgcLoading(true)
    try {
      const data = await fetchPSGC(`/cities-municipalities/${cityCode}/barangays/`)
      const formatted = (data || []).map((b) => ({ code: String(b.code), name: b.name }))
      setPsgcBarangaysByCity((prev) => ({ ...prev, [cityCode]: formatted }))
    } catch {
      setPsgcBarangaysByCity((prev) => ({ ...prev, [cityCode]: [] }))
      psgcFetchedRef.current.barangays.delete(cityCode)
    } finally {
      setPsgcLoading(false)
    }
  }

  useEffect(() => {
    loadRegions()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time PSGC region list
  }, [])

  useEffect(() => {
    loadProvinces(MARINDUQUE_REGION_CODE)
    loadCitiesForProvince(MARINDUQUE_PROVINCE_CODE)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Marinduque-only shop address data
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      setProfileLoading(true)
      setLoadError('')
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.hash = '#/login'
        return
      }
      try {
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.message || 'Could not load profile.')
        }
        const u = await res.json()
        if (cancelled) return
        if (u.role !== 'shop-owner' && u.role !== 'oncall-mechanic-technician') {
          window.location.hash = '#/login'
          return
        }
        if (variant === 'independent' && u.role !== 'oncall-mechanic-technician') {
          window.location.hash = u.role === 'shop-owner' ? '#/provider/shop-info' : '#/login'
          return
        }
        setProviderRole(u.role || '')
        setAccount({
          fullName: u.fullName || '',
          email: u.email || '',
          phoneCode: u.phoneCode || '+63',
          phoneNumber: u.phoneNumber || '',
          createdAt: u.createdAt || '',
        })
        let next = userToShopForm(u)
        if (next.shopProvince !== MARINDUQUE_PROVINCE_CODE) {
          next = {
            ...next,
            shopRegion: MARINDUQUE_REGION_CODE,
            shopProvince: MARINDUQUE_PROVINCE_CODE,
            shopCityMunicipality: '',
            shopBarangay: '',
          }
        } else if (next.shopRegion !== MARINDUQUE_REGION_CODE) {
          next = { ...next, shopRegion: MARINDUQUE_REGION_CODE }
        }
        setForm(next)
        setOperatingHoursParts(parseOperatingHoursToParts(next.operatingHours))
        setSavedSnapshot(JSON.stringify(next))
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Something went wrong while loading.')
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }
    loadProfile()
    return () => {
      cancelled = true
    }
  }, [variant])

  useEffect(() => {
    if (!form.shopRegion) return
    if (form.shopRegion === NCR_REGION_CODE) {
      loadCitiesForRegion(form.shopRegion)
    } else {
      loadProvinces(form.shopRegion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.shopRegion])

  useEffect(() => {
    if (!form.shopProvince || form.shopRegion === NCR_REGION_CODE) return
    loadCitiesForProvince(form.shopProvince)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.shopProvince, form.shopRegion])

  useEffect(() => {
    if (!form.shopCityMunicipality) return
    loadBarangays(form.shopCityMunicipality)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.shopCityMunicipality])

  const update = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveError('')
    setSaveNotice('')
  }, [])

  const setOperatingHoursPart = useCallback(
    (part, rawValue) => {
      setOperatingHoursParts((current) => {
        let value = rawValue
        if (part === 'openHH' || part === 'closeHH') {
          value = String(rawValue || '').replace(/\D/g, '').slice(0, 2)
        } else if (part === 'openMM' || part === 'closeMM') {
          value = String(rawValue || '').replace(/\D/g, '').slice(0, 2)
        } else {
          value = rawValue === 'PM' ? 'PM' : 'AM'
        }
        const next = { ...current, [part]: value }
        const complete =
          /^\d{1,2}$/.test(next.openHH) &&
          /^\d{1,2}$/.test(next.openMM) &&
          /^\d{1,2}$/.test(next.closeHH) &&
          /^\d{1,2}$/.test(next.closeMM)
        if (complete) {
          const openHH = String(Math.min(Math.max(Number(next.openHH), 1), 12)).padStart(2, '0')
          const openMM = String(Math.min(Math.max(Number(next.openMM), 0), 59)).padStart(2, '0')
          const closeHH = String(Math.min(Math.max(Number(next.closeHH), 1), 12)).padStart(2, '0')
          const closeMM = String(Math.min(Math.max(Number(next.closeMM), 0), 59)).padStart(2, '0')
          update(
            'operatingHours',
            `${openHH}:${openMM} ${next.openPeriod} - ${closeHH}:${closeMM} ${next.closePeriod}`,
          )
        } else {
          update('operatingHours', '')
        }
        return next
      })
    },
    [update],
  )

  const toggleArrayValue = useCallback((field, value) => {
    setForm((prev) => {
      const arr = [...(prev[field] || [])]
      const i = arr.indexOf(value)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(value)
      return { ...prev, [field]: arr }
    })
    setSaveError('')
    setSaveNotice('')
  }, [])

  const addressSelectorCommonProps = {
    formData: form,
    errors: {},
    handleInputChange: update,
    psgcRegions,
    psgcProvincesByRegion,
    psgcCitiesByProvince,
    psgcCitiesByRegion,
    psgcBarangaysByCity,
    isLoadingPSGC: psgcLoading,
    NCR_REGION_CODE,
    loadProvinces,
    loadCitiesForRegion,
    loadCitiesForProvince,
    loadBarangays,
  }

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return true
    try {
      return JSON.stringify(form) !== savedSnapshot
    } catch {
      return true
    }
  }, [form, savedSnapshot])

  const handleReset = useCallback(() => {
    if (!savedSnapshot) return
    try {
      const snapshot = JSON.parse(savedSnapshot)
      setForm(snapshot)
      setOperatingHoursParts(parseOperatingHoursToParts(snapshot.operatingHours))
      setSaveNotice('Reverted to last saved version.')
      setSaveError('')
      window.setTimeout(() => setSaveNotice(''), 2500)
    } catch {
      /* ignore */
    }
  }, [savedSnapshot])

  const handleSave = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.hash = '#/login'
      return
    }
    setSaving(true)
    setSaveError('')
    setSaveNotice('')
    try {
      const isIndependent = variant === 'independent' || providerRole === 'oncall-mechanic-technician' || providerRole === 'independent-mechanic-technician'
      const payload = {
        ...form,
        businessType: BUSINESS_DB_BY_DISPLAY[form.businessType] || form.businessType,
        serviceType:
          isIndependent
            ? INDEPENDENT_DISPLAY_TO_DB[form.serviceType] ?? SERVICE_DB_BY_DISPLAY[form.serviceType] ?? form.serviceType
            : SERVICE_DB_BY_DISPLAY[form.serviceType] || form.serviceType,
        yearsOfOperation: form.yearsOfOperation === '' ? null : Number(form.yearsOfOperation),
        numberOfEmployees: form.numberOfEmployees === '' ? null : Number(form.numberOfEmployees),
      }
      if (isIndependent) {
        delete payload.numberOfEmployees
      }
      const res = await fetch(`${API_URL}/api/users/me/shop`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'Could not save. Please try again.')
      }
      const u = await res.json()
      const next = userToShopForm(u)
      setForm(next)
      setOperatingHoursParts(parseOperatingHoursToParts(next.operatingHours))
      setSavedSnapshot(JSON.stringify(next))
      setAccount((a) => ({
        ...a,
        fullName: u.fullName || a.fullName,
        email: u.email || a.email,
        phoneCode: u.phoneCode || a.phoneCode,
        phoneNumber: u.phoneNumber || a.phoneNumber,
        createdAt: u.createdAt || a.createdAt,
      }))
      setSaveNotice(
        providerRole === 'oncall-mechanic-technician'
          ? 'Saved successfully. Your business profile is updated.'
          : 'Saved successfully. Your shop profile is updated.',
      )
      window.setTimeout(() => setSaveNotice(''), 4000)
    } catch (e) {
      setSaveError(e?.message || 'Something went wrong while saving.')
    } finally {
      setSaving(false)
    }
  }, [form, providerRole])

  const isOnCallProvider = providerRole === 'oncall-mechanic-technician'

  const regionName = useMemo(
    () => psgcRegions.find((r) => r.code === form.shopRegion)?.name || '',
    [psgcRegions, form.shopRegion],
  )
  const provinceName = useMemo(
    () => (psgcProvincesByRegion[form.shopRegion] || []).find((p) => p.code === form.shopProvince)?.name || '',
    [psgcProvincesByRegion, form.shopRegion, form.shopProvince],
  )
  const cityOptions = useMemo(() => {
    if (form.shopRegion === NCR_REGION_CODE) return psgcCitiesByRegion[form.shopRegion] || []
    return psgcCitiesByProvince[form.shopProvince] || []
  }, [form.shopRegion, form.shopProvince, psgcCitiesByRegion, psgcCitiesByProvince])
  const cityName = useMemo(
    () => cityOptions.find((c) => c.code === form.shopCityMunicipality)?.name || '',
    [cityOptions, form.shopCityMunicipality],
  )
  const barangayName = useMemo(
    () => (psgcBarangaysByCity[form.shopCityMunicipality] || []).find((b) => b.code === form.shopBarangay)?.name || '',
    [psgcBarangaysByCity, form.shopCityMunicipality, form.shopBarangay],
  )

  const previewAddressLine = useMemo(() => {
    const parts = [provinceName, cityName, barangayName].filter(Boolean)
    const head = parts.length ? parts.join(', ') : ''
    const detail = form.shopDetailedAddress?.trim()
    if (head && detail) return `${head}, ${detail}`
    if (detail) return detail
    return head || 'Shop address'
  }, [provinceName, cityName, barangayName, form.shopDetailedAddress])

  /** Structured address parts for map geocoding (cleaner than a single long string). */
  const shopMapAddressParts = useMemo(
    () => ({
      detailedAddress: form.shopDetailedAddress?.trim() || '',
      barangay: barangayName || '',
      cityMunicipality: cityName || '',
      province: provinceName || '',
      region: regionName || '',
      landmark: form.shopLandmark?.trim() || '',
    }),
    [
      barangayName,
      cityName,
      provinceName,
      regionName,
      form.shopDetailedAddress,
      form.shopLandmark,
    ],
  )

  const memberSinceYear = useMemo(() => {
    if (!account.createdAt) return '—'
    const y = new Date(account.createdAt).getFullYear()
    return Number.isNaN(y) ? '—' : String(y)
  }, [account.createdAt])

  const shopPhotoDisplayUrl = useMemo(
    () => resolveShopPlacePhotoUrl(form.shopPlacePhoto, API_URL),
    [form.shopPlacePhoto],
  )

  const clearShopPhoto = useCallback(() => {
    update('shopPlacePhoto', '')
  }, [update])

  const handleShopPhotoFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setSaveError('Please choose a valid image file (JPG, PNG, etc.).')
        event.target.value = ''
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setSaveError('Image must be 5MB or smaller.')
        event.target.value = ''
        return
      }
      setSaveError('')
      setSaveNotice('')
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(new Error('Could not read the image.'))
          reader.readAsDataURL(file)
        })
        update('shopPlacePhoto', dataUrl)
      } catch {
        setSaveError('Could not load that image. Try another file.')
      } finally {
        event.target.value = ''
      }
    },
    [update],
  )

  if (profileLoading) {
    return (
      <ShopInfoLayout
        variant={variant}
        pageMeta={{
          title: variant === 'independent' ? 'Business Info' : 'Shop Info',
          description:
            variant === 'independent'
              ? 'Loading your business profile…'
              : 'View and edit the shop details from your registration.',
        }}
      >
        <div className="flex min-h-[200px] items-center justify-center rounded-sm border border-border/60 bg-card/80 p-8">
          <p className="text-sm text-muted-foreground">
            {variant === 'independent' ? 'Loading business profile from the server…' : 'Loading shop profile from the server…'}
          </p>
        </div>
      </ShopInfoLayout>
    )
  }

  if (loadError) {
    return (
      <ShopInfoLayout
        variant={variant}
        pageMeta={{
          title: variant === 'independent' ? 'Business Info' : 'Shop Info',
          description:
            variant === 'independent'
              ? 'View and edit your business details from registration.'
              : 'View and edit the shop details from your registration.',
        }}
      >
        <Card className="border-destructive/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Could not load</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </CardContent>
        </Card>
      </ShopInfoLayout>
    )
  }

  return (
    <ShopInfoLayout
      variant={variant}
      pageMeta={{
        title: variant === 'independent' ? 'Business Info' : 'Shop Info',
        description:
          variant === 'independent'
            ? 'Business profile, location, and hours—kept in sync with your registration when you save.'
            : 'Business, location, and hours from your shop-owner registration—kept in sync with the database when you save.',
      }}
    >
      <div className="grid gap-3.5 lg:grid-cols-[1fr_min(380px,100%)]">
        <div className="space-y-3.5">
          {/* Shop Photo Card */}
          <Card className="rounded-none border border-slate-200 bg-white p-0 shadow-[0_3px_8px_rgba(15,23,42,0.14)] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:border-[#081F5C] transition-all">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex items-start gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-none bg-indigo-50/80 border border-indigo-200/80 text-[#081F5C] shadow-2xs">
                  <Camera className="size-4.5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <CardTitle className="text-sm font-black tracking-tight text-slate-900">
                    {isOnCallProvider ? 'Business Place Photo' : 'Shop Photo'}
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-500">
                    {isOnCallProvider
                      ? 'Tap the frame below to add or change your photo. It appears on public listings when saved.'
                      : 'Tap the frame below to add or change your shop photo. It appears on your public listing when saved.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3.5">
              <div className="relative w-full">
                <input
                  id="shop-place-photo-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleShopPhotoFile}
                />
                <label
                  htmlFor="shop-place-photo-input"
                  className={`group relative flex h-48 sm:h-56 w-full cursor-pointer flex-col overflow-hidden rounded-none shadow-2xs transition-all duration-300 focus-within:outline-none ${
                    shopPhotoDisplayUrl
                      ? 'border border-slate-300'
                      : 'border-2 border-dashed border-slate-300 bg-slate-50 hover:border-[#081F5C]'
                  }`}
                >
                  {shopPhotoDisplayUrl ? (
                    <>
                      <img
                        src={shopPhotoDisplayUrl}
                        alt={isOnCallProvider ? 'Your business place' : 'Your shop'}
                        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div
                        className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center gap-2"
                        aria-hidden
                      >
                        <Camera className="size-5 text-white" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Tap to change photo</span>
                      </div>
                    </>
                  ) : (
                    <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-2.5 p-6 text-center">
                      <div className="flex size-12 items-center justify-center rounded-none bg-indigo-50/80 border border-indigo-200/80 text-[#081F5C] shadow-2xs transition-transform group-hover:scale-105">
                        <Store className="size-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-900">
                          {isOnCallProvider ? 'Upload Business Place Photo' : 'Upload Shop Photo'}
                        </p>
                        <p className="max-w-xs text-[11px] text-slate-500">
                          Click to select a photo from your device
                        </p>
                      </div>
                    </div>
                  )}
                </label>
                {form.shopPlacePhoto ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      clearShopPhoto()
                    }}
                    className="absolute right-2.5 top-2.5 z-20 flex size-8 items-center justify-center rounded-none border border-slate-300 bg-white/95 text-slate-700 shadow-md hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    aria-label="Remove photo"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              <p className="text-center text-[11px] text-slate-500">
                JPG, PNG, or WebP · Max 5MB · Click <span className="font-bold text-slate-700">Save Changes</span> below to commit updates.
              </p>
            </CardContent>
          </Card>

          {/* Business Info Card */}
          <Card className="rounded-none border border-slate-200 bg-white p-0 shadow-[0_3px_8px_rgba(15,23,42,0.14)] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:border-[#081F5C] transition-all">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-none bg-indigo-50/80 border border-indigo-200/80 text-[#081F5C] shadow-2xs">
                  <Building2 className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black text-slate-900">
                    {isOnCallProvider ? 'Business Information' : 'Business & Shop Details'}
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-500">
                    Update your operational settings and service qualifications.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3.5">
              <div className="grid gap-1">
                <Label htmlFor="shopName" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  {isOnCallProvider ? 'Business Name' : 'Shop Name'} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="shopName"
                  value={form.shopName}
                  onChange={(e) => update('shopName', e.target.value)}
                  placeholder={isOnCallProvider ? 'Enter business name' : 'Enter shop name'}
                  className="rounded-none border-slate-300 text-xs font-semibold shadow-2xs focus:border-[#081F5C] focus:ring-1 focus:ring-[#081F5C]"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Type of Business <span className="text-rose-500">*</span>
                </Label>
                <Select value={form.businessType || undefined} onValueChange={(v) => update('businessType', v)}>
                  <SelectTrigger className="rounded-none border-slate-300 text-xs font-bold shadow-2xs focus:border-[#081F5C]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none text-xs font-medium">
                    {BUSINESS_TYPES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Repair Services Offered <span className="text-rose-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {REPAIR_SERVICE_TYPES.map((s) => {
                    const selected = form.repairServicesOffered.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleArrayValue('repairServicesOffered', s)}
                        className={`rounded-none border px-2.5 py-1 text-xs cursor-pointer transition-all ${
                          selected
                            ? 'border-[#081F5C] bg-linear-to-r from-[#04133d] to-[#081F5C] text-white font-bold shadow-xs'
                            : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold'
                        }`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Service Location Type <span className="text-rose-500">*</span>
                </Label>
                <Select value={form.serviceType || undefined} onValueChange={(v) => update('serviceType', v)}>
                  <SelectTrigger className="rounded-none border-slate-300 text-xs font-bold shadow-2xs focus:border-[#081F5C]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none text-xs font-medium">
                    {(isOnCallProvider ? INDEPENDENT_SERVICE_TYPES_DISPLAY : SERVICE_TYPES).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={`grid gap-3 ${isOnCallProvider ? '' : 'sm:grid-cols-2'}`}>
                <div className="grid gap-1">
                  <Label htmlFor="yearsOfOperation" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                    Years of Operation <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="yearsOfOperation"
                    inputMode="numeric"
                    value={form.yearsOfOperation}
                    onChange={(e) => update('yearsOfOperation', e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="e.g. 5"
                    className="rounded-none border-slate-300 text-xs font-bold shadow-2xs focus:border-[#081F5C]"
                  />
                </div>
                {!isOnCallProvider ? (
                  <div className="grid gap-1">
                    <Label htmlFor="numberOfEmployees" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                      Number of Technicians <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="numberOfEmployees"
                      inputMode="numeric"
                      value={form.numberOfEmployees}
                      onChange={(e) => update('numberOfEmployees', e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="e.g. 3"
                      className="rounded-none border-slate-300 text-xs font-bold shadow-2xs focus:border-[#081F5C]"
                    />
                  </div>
                ) : null}
              </div>

              <div className="bg-slate-50/80 p-3 border border-slate-200 rounded-none space-y-1.5">
                <Label htmlFor="operatingHoursOpenHH" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 block">
                  Operating Hours <span className="text-rose-500">*</span>
                </Label>
                {(() => {
                  const p = operatingHoursParts
                  return (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-0.5 text-xs">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Opening Time</p>
                        <div className="flex flex-wrap items-center gap-1">
                          <Input
                            id="operatingHoursOpenHH"
                            type="number"
                            inputMode="numeric"
                            placeholder="HH"
                            min="1"
                            max="12"
                            step="1"
                            value={p.openHH}
                            onChange={(e) => setOperatingHoursPart('openHH', e.target.value)}
                            className="h-8 w-14 text-center rounded-none border-slate-300 font-bold text-xs"
                          />
                          <span className="font-bold text-slate-500">:</span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="MM"
                            min="0"
                            max="59"
                            step="1"
                            value={p.openMM}
                            onChange={(e) => setOperatingHoursPart('openMM', e.target.value)}
                            className="h-8 w-14 text-center rounded-none border-slate-300 font-bold text-xs"
                          />
                          <div className="flex">
                            {['AM', 'PM'].map((meridiem) => (
                              <button
                                key={`open-${meridiem}`}
                                type="button"
                                onClick={() => setOperatingHoursPart('openPeriod', meridiem)}
                                className={`h-8 rounded-none border px-2 text-xs cursor-pointer transition-all ${
                                  p.openPeriod === meridiem
                                    ? 'border-[#081F5C] bg-linear-to-r from-[#04133d] to-[#081F5C] text-white font-bold shadow-xs'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold'
                                }`}
                              >
                                {meridiem}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Closing Time</p>
                        <div className="flex flex-wrap items-center gap-1">
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="HH"
                            min="1"
                            max="12"
                            step="1"
                            value={p.closeHH}
                            onChange={(e) => setOperatingHoursPart('closeHH', e.target.value)}
                            className="h-8 w-14 text-center rounded-none border-slate-300 font-bold text-xs"
                          />
                          <span className="font-bold text-slate-500">:</span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="MM"
                            min="0"
                            max="59"
                            step="1"
                            value={p.closeMM}
                            onChange={(e) => setOperatingHoursPart('closeMM', e.target.value)}
                            className="h-8 w-14 text-center rounded-none border-slate-300 font-bold text-xs"
                          />
                          <div className="flex">
                            {['AM', 'PM'].map((meridiem) => (
                              <button
                                key={`close-${meridiem}`}
                                type="button"
                                onClick={() => setOperatingHoursPart('closePeriod', meridiem)}
                                className={`h-8 rounded-none border px-2 text-xs cursor-pointer transition-all ${
                                  p.closePeriod === meridiem
                                    ? 'border-[#081F5C] bg-linear-to-r from-[#04133d] to-[#081F5C] text-white font-bold shadow-xs'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold'
                                }`}
                              >
                                {meridiem}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="grid gap-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Days of Operation <span className="text-rose-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {DAYS_OF_OPERATION.map((d) => {
                    const selected = form.daysOfOperation.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleArrayValue('daysOfOperation', d)}
                        className={`rounded-none border px-2.5 py-1 text-xs cursor-pointer transition-all ${
                          selected
                            ? 'border-[#081F5C] bg-linear-to-r from-[#04133d] to-[#081F5C] text-white font-bold shadow-xs'
                            : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="shopDescription" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Shop Description (optional)
                </Label>
                <Textarea
                  id="shopDescription"
                  value={form.shopDescription}
                  onChange={(e) => update('shopDescription', e.target.value)}
                  rows={3}
                  className="rounded-none border-slate-300 text-xs font-medium min-h-[80px] resize-y shadow-2xs focus:border-[#081F5C]"
                  placeholder="Tell customers about your shop history, specializations, and services..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Shop Location Card */}
          <Card className="rounded-none border border-slate-200 bg-white p-0 shadow-[0_3px_8px_rgba(15,23,42,0.14)] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:border-[#081F5C] transition-all">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-none bg-indigo-50/80 border border-indigo-200/80 text-[#081F5C] shadow-2xs">
                  <MapPin className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black text-slate-900">Shop Location & Address</CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-500">
                    Specify your exact registered address and Google Maps pin location.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3.5">
              <div className="grid gap-1">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Address (Region / Province / City / Barangay) <span className="text-rose-500">*</span>
                </Label>
                <AddressTabsSelector
                  {...addressSelectorCommonProps}
                  label="Region/Province/City/Barangay"
                  hideLabel
                  placeholder="Please Select : Region/Province/City/Barangay"
                  regionKey="shopRegion"
                  provinceKey="shopProvince"
                  cityKey="shopCityMunicipality"
                  barangayKey="shopBarangay"
                  errorRegionKey="shopRegion"
                  errorProvinceKey="shopProvince"
                  errorCityKey="shopCityMunicipality"
                  errorBarangayKey="shopBarangay"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="shopDetailedAddress" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Detailed Address (Building, Street, Unit No.)
                </Label>
                <Textarea
                  id="shopDetailedAddress"
                  placeholder="e.g. Unit 2B, Building Name, Street Address"
                  value={form.shopDetailedAddress}
                  onChange={(e) => update('shopDetailedAddress', e.target.value)}
                  className="rounded-none border-slate-300 text-xs font-medium h-16 w-full resize-none shadow-2xs focus:border-[#081F5C]"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="shopLandmark" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Landmark / Directions (optional)
                </Label>
                <Input
                  id="shopLandmark"
                  type="text"
                  value={form.shopLandmark}
                  onChange={(e) => update('shopLandmark', e.target.value)}
                  placeholder="e.g. Across Barangay Hall, beside Shell station"
                  className="rounded-none border-slate-300 text-xs font-semibold shadow-2xs focus:border-[#081F5C]"
                />
              </div>

              <ShopAddressGoogleMap
                addressParts={shopMapAddressParts}
                mapTitle={
                  form.shopName?.trim()
                    ? `${form.shopName.trim()} — shop location`
                    : isOnCallProvider
                      ? `${(account.fullName || 'Service').trim()} — service location`
                      : 'Shop location'
                }
              />
            </CardContent>
          </Card>

          {/* Account Contact Footer Card */}
          <Card className="rounded-none border border-slate-200 bg-slate-50/80 p-3.5 shadow-2xs">
            <CardHeader className="p-0 pb-2 border-b border-slate-200">
              <CardTitle className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                Account Contact Details
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                From your account registration. Update in Account Settings if necessary.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-2 grid gap-1.5 text-xs sm:grid-cols-2">
              <div>
                <span className="font-bold text-slate-600 uppercase text-[10px]">Registered Name: </span>
                <span className="font-bold text-slate-900">{account.fullName || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600 uppercase text-[10px]">Email: </span>
                <span className="font-bold text-slate-900">{account.email || '—'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-bold text-slate-600 uppercase text-[10px]">Phone Number: </span>
                <span className="font-bold text-slate-900">
                  {account.phoneCode} {account.phoneNumber || '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Save Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] hover:opacity-95 text-white font-bold text-xs px-4 py-2 shadow-md shadow-[#081F5C]/25 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Save className="mr-1.5 size-3.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!savedSnapshot || !isDirty}
              className="rounded-none border-slate-300 text-slate-700 font-bold text-xs px-3.5 py-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Revert Changes
            </Button>
            {saveNotice ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded-none">{saveNotice}</span> : null}
            {saveError ? <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 border border-rose-200 rounded-none">{saveError}</span> : null}
          </div>
        </div>

        {/* Customer Preview Sidebar */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-none border border-slate-200 bg-white p-0 shadow-[0_3px_8px_rgba(15,23,42,0.14)] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:border-[#081F5C] transition-all">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex items-center gap-2 text-[#081F5C]">
                <Eye className="size-4" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Customer Live Preview</span>
              </div>
              <CardTitle className="text-xs font-medium text-slate-500 mt-0.5">
                Summary card shown on public search
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5">
              <div className="rounded-none bg-linear-to-r from-[#04133d] via-slate-900 to-[#081F5C] p-3.5 text-white shadow-md space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-none border border-white/30 bg-white/10">
                    {shopPhotoDisplayUrl ? (
                      <img
                        src={shopPhotoDisplayUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Store className="size-6 text-white" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black leading-snug">
                      {isOnCallProvider
                        ? account.fullName || 'Provider'
                        : form.shopName.trim() || 'Shop name'}
                    </div>
                    <div className="text-[11px] text-indigo-200 font-medium mt-0.5">
                      {isOnCallProvider ? 'On-call provider' : `Owner: ${account.fullName || '—'}`}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-white/90">
                      <MapPin className="size-3.5 shrink-0 text-rose-400" />
                      <span className="truncate">{previewAddressLine}</span>
                    </div>
                    {form.shopLandmark?.trim() ? (
                      <p className="mt-1 text-[11px] text-slate-300">Landmark: {form.shopLandmark}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/15 pt-3 text-[11px] text-slate-200">
                  {form.shopDescription?.trim() ? (
                    <p className="line-clamp-3 leading-relaxed">{form.shopDescription}</p>
                  ) : (
                    <p className="italic text-slate-400">No shop description provided.</p>
                  )}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {form.repairServicesOffered.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-none bg-white/15 px-2 py-0.5 text-[10px] font-bold">
                        {s}
                      </span>
                    ))}
                    {form.repairServicesOffered.length > 4 ? (
                      <span className="text-[10px] text-slate-300">+{form.repairServicesOffered.length - 4} more</span>
                    ) : null}
                  </div>
                  <div className="space-y-1 pt-1 text-slate-300">
                    <p><span className="text-slate-400 font-medium">Service Type:</span> {form.serviceType || '—'}</p>
                    <p><span className="text-slate-400 font-medium">Hours:</span> {form.operatingHours || '—'}</p>
                    <p><span className="text-slate-400 font-medium">Days Open:</span> {form.daysOfOperation.length ? form.daysOfOperation.join(', ') : '—'}</p>
                    {!isOnCallProvider && (
                      <p><span className="text-slate-400 font-medium">Team Size:</span> {form.numberOfEmployees || '—'}</p>
                    )}
                    <p><span className="text-slate-400 font-medium">Years Operating:</span> {form.yearsOfOperation || '—'}</p>
                    <p><span className="text-slate-400 font-medium">Member Since:</span> {memberSinceYear}</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-relaxed text-center">
                This preview updates live as you edit your shop profile details above.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ShopInfoLayout>
  )
}

export default function ShopInfoPage() {
  return <ShopInfoInner variant="shop" />
}
