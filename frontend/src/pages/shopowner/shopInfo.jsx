import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import IndependentMechanicLayout from '../independentmechanic/technician/IndependentMechanicLayout.jsx'
import AddressTabsSelector from '../../components/AddressTabsSelector.jsx'
import ShopAddressGoogleMap from '../../components/ShopAddressGoogleMap.jsx'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Building2, Eye, MapPin, RotateCcw, Save, Store } from 'lucide-react'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function ShopInfoLayout({ variant, pageMeta, children }) {
  if (variant === 'independent') {
    return (
      <IndependentMechanicLayout activeSection="business-info" pageMeta={pageMeta}>
        {children}
      </IndependentMechanicLayout>
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

/** Independent provider registration uses different labels; DB enum stays Home Service | Shop Visit | Both */
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
  }
}

function userToShopForm(u) {
  if (!u || (u.role !== 'shop-owner' && u.role !== 'independent-mechanic-technician')) return emptyShopForm()
  return {
    shopName: u.shopName || '',
    businessType: BUSINESS_DISPLAY_BY_DB[u.businessType] || u.businessType || '',
    repairServicesOffered: Array.isArray(u.repairServicesOffered) ? [...u.repairServicesOffered] : [],
    serviceType:
      u.role === 'independent-mechanic-technician'
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
        if (u.role !== 'shop-owner' && u.role !== 'independent-mechanic-technician') {
          window.location.hash = '#/login'
          return
        }
        if (variant === 'independent' && u.role !== 'independent-mechanic-technician') {
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
      const payload = {
        ...form,
        businessType: BUSINESS_DB_BY_DISPLAY[form.businessType] || form.businessType,
        serviceType:
          providerRole === 'independent-mechanic-technician'
            ? INDEPENDENT_DISPLAY_TO_DB[form.serviceType] ?? SERVICE_DB_BY_DISPLAY[form.serviceType] ?? form.serviceType
            : SERVICE_DB_BY_DISPLAY[form.serviceType] || form.serviceType,
        yearsOfOperation: form.yearsOfOperation === '' ? null : Number(form.yearsOfOperation),
        numberOfEmployees: form.numberOfEmployees === '' ? null : Number(form.numberOfEmployees),
      }
      if (providerRole === 'independent-mechanic-technician') {
        delete payload.shopName
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
        providerRole === 'independent-mechanic-technician'
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

  const isIndependentProvider = providerRole === 'independent-mechanic-technician'

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
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border/60 bg-card/80 p-8">
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
      <div className="grid gap-6 lg:grid-cols-[1fr_min(400px,100%)]">
        <div className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Building2 className="h-5 w-5 text-blue-700" />
              </div>
              <CardTitle className="text-base">
                {isIndependentProvider ? 'Business Information' : 'Business / Shop Information'}
              </CardTitle>
              <CardDescription>
                {isIndependentProvider
                  ? 'Same as the business information step in independent provider registration.'
                  : 'Same as the business / shop step in shop-owner registration.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isIndependentProvider ? (
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop name *</Label>
                  <Input id="shopName" value={form.shopName} onChange={(e) => update('shopName', e.target.value)} />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Type of business *</Label>
                <Select value={form.businessType || undefined} onValueChange={(v) => update('businessType', v)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type of repair services offered *</Label>
                <div className="flex flex-wrap gap-2">
                  {REPAIR_SERVICE_TYPES.map((s) => {
                    const selected = form.repairServicesOffered.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleArrayValue('repairServicesOffered', s)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          selected
                            ? 'border-[#081F5C] bg-[#081F5C] text-white'
                            : 'border-border bg-background text-foreground hover:bg-muted/60'
                        }`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Service type *</Label>
                <Select value={form.serviceType || undefined} onValueChange={(v) => update('serviceType', v)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isIndependentProvider ? INDEPENDENT_SERVICE_TYPES_DISPLAY : SERVICE_TYPES).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={`grid gap-4 ${isIndependentProvider ? '' : 'sm:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label htmlFor="yearsOfOperation">Years of operation *</Label>
                  <Input
                    id="yearsOfOperation"
                    inputMode="numeric"
                    value={form.yearsOfOperation}
                    onChange={(e) => update('yearsOfOperation', e.target.value.replace(/\D/g, '').slice(0, 2))}
                  />
                </div>
                {!isIndependentProvider ? (
                  <div className="space-y-2">
                    <Label htmlFor="numberOfEmployees">Number of technicians/mechanics *</Label>
                    <Input
                      id="numberOfEmployees"
                      inputMode="numeric"
                      value={form.numberOfEmployees}
                      onChange={(e) => update('numberOfEmployees', e.target.value.replace(/\D/g, '').slice(0, 3))}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="operatingHoursOpenHH" className="text-sm font-medium text-gray-700">
                  Operating hours *
                </Label>
                {(() => {
                  const p = operatingHoursParts
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Opening</p>
                          <div className="flex flex-wrap items-center gap-2">
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
                              className="h-10 w-20 text-center"
                            />
                            <span className="text-gray-500">:</span>
                            <Input
                              type="number"
                              inputMode="numeric"
                              placeholder="MM"
                              min="0"
                              max="59"
                              step="1"
                              value={p.openMM}
                              onChange={(e) => setOperatingHoursPart('openMM', e.target.value)}
                              className="h-10 w-20 text-center"
                            />
                            <div className="flex gap-1">
                              {['AM', 'PM'].map((meridiem) => (
                                <button
                                  key={`open-${meridiem}`}
                                  type="button"
                                  onClick={() => setOperatingHoursPart('openPeriod', meridiem)}
                                  className={`h-10 rounded-md border px-3 text-sm ${
                                    p.openPeriod === meridiem
                                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {meridiem}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Closing</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="number"
                              inputMode="numeric"
                              placeholder="HH"
                              min="1"
                              max="12"
                              step="1"
                              value={p.closeHH}
                              onChange={(e) => setOperatingHoursPart('closeHH', e.target.value)}
                              className="h-10 w-20 text-center"
                            />
                            <span className="text-gray-500">:</span>
                            <Input
                              type="number"
                              inputMode="numeric"
                              placeholder="MM"
                              min="0"
                              max="59"
                              step="1"
                              value={p.closeMM}
                              onChange={(e) => setOperatingHoursPart('closeMM', e.target.value)}
                              className="h-10 w-20 text-center"
                            />
                            <div className="flex gap-1">
                              {['AM', 'PM'].map((meridiem) => (
                                <button
                                  key={`close-${meridiem}`}
                                  type="button"
                                  onClick={() => setOperatingHoursPart('closePeriod', meridiem)}
                                  className={`h-10 rounded-md border px-3 text-sm ${
                                    p.closePeriod === meridiem
                                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {meridiem}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-2">
                <Label>Days of operation *</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_OPERATION.map((d) => {
                    const selected = form.daysOfOperation.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleArrayValue('daysOfOperation', d)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          selected
                            ? 'border-[#081F5C] bg-[#081F5C] text-white'
                            : 'border-border bg-background text-foreground hover:bg-muted/60'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopDescription">Shop description (optional)</Label>
                <Textarea
                  id="shopDescription"
                  value={form.shopDescription}
                  onChange={(e) => update('shopDescription', e.target.value)}
                  rows={4}
                  className="min-h-[96px] resize-y"
                  placeholder="Tell customers about your shop (optional)"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Shop location &amp; address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Shop Address *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="shopDetailedAddress" className="text-sm font-medium text-gray-700">
                  Detailed address (optional)
                </Label>
                <Textarea
                  id="shopDetailedAddress"
                  placeholder="Unit No., Building, Street, etc."
                  value={form.shopDetailedAddress}
                  onChange={(e) => update('shopDetailedAddress', e.target.value)}
                  className="h-20 w-full resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopLandmark" className="text-sm font-medium text-gray-700">
                  Landmark (optional)
                </Label>
                <Input
                  id="shopLandmark"
                  type="text"
                  value={form.shopLandmark}
                  onChange={(e) => update('shopLandmark', e.target.value)}
                  placeholder="e.g., near barangay hall"
                  className="h-10"
                />
              </div>

              <ShopAddressGoogleMap
                addressParts={shopMapAddressParts}
                mapTitle={
                  form.shopName?.trim()
                    ? `${form.shopName.trim()} — shop location`
                    : isIndependentProvider
                      ? `${(account.fullName || 'Service').trim()} — service location`
                      : 'Shop location'
                }
              />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-muted/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Account contact (not updated on this page)</CardTitle>
              <CardDescription className="text-xs">
                From your registration. Use Account Settings when you need to change email or phone on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Registered name: </span>
                <span className="font-medium">{account.fullName || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{account.email || '—'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Phone: </span>
                <span className="font-medium">
                  {account.phoneCode} {account.phoneNumber || '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={!savedSnapshot || !isDirty}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Revert to last saved
            </Button>
            {saveNotice ? <span className="text-sm text-emerald-700 dark:text-emerald-400">{saveNotice}</span> : null}
            {saveError ? <span className="text-sm text-destructive">{saveError}</span> : null}
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card className="border-border/80 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Customer preview</span>
              </div>
              <CardTitle className="text-sm">Summary shown on the shop listing</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="relative overflow-hidden rounded-lg text-white"
                style={{ background: 'linear-gradient(135deg,#04133d,#1447a6)' }}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15">
                    <Store className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-snug">
                      {isIndependentProvider
                        ? account.fullName || 'Provider'
                        : form.shopName.trim() || 'Shop name'}
                    </div>
                    <div className="mt-0.5 text-xs text-white/90">
                      {isIndependentProvider ? 'Independent provider' : `Owner: ${account.fullName || '—'}`}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-white/85">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="min-w-0 leading-snug">{previewAddressLine}</span>
                    </div>
                    {form.shopLandmark?.trim() ? (
                      <p className="mt-1 text-[11px] text-white/75">Landmark: {form.shopLandmark}</p>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2 border-t border-white/15 px-4 py-3 text-[11px] text-white/90">
                  {form.shopDescription?.trim() ? (
                    <p className="line-clamp-4 text-white/85">{form.shopDescription}</p>
                  ) : (
                    <p className="text-white/60">No shop description.</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {form.repairServicesOffered.slice(0, 4).map((s) => (
                      <span key={s} className="rounded bg-white/15 px-2 py-0.5 text-[10px]">
                        {s}
                      </span>
                    ))}
                    {form.repairServicesOffered.length > 4 ? (
                      <span className="text-[10px] text-white/70">+{form.repairServicesOffered.length - 4} more</span>
                    ) : null}
                  </div>
                  <p className="text-white/85">
                    <span className="text-white/60">Service type: </span>
                    {form.serviceType || '—'}
                  </p>
                  <p className="text-white/85">
                    <span className="text-white/60">Hours: </span>
                    {form.operatingHours || '—'}
                  </p>
                  <p className="text-white/85">
                    <span className="text-white/60">Open: </span>
                    {form.daysOfOperation.length ? form.daysOfOperation.join(', ') : '—'}
                  </p>
                  {!isIndependentProvider ? (
                    <p className="text-white/85">
                      <span className="text-white/60">Team size (registered): </span>
                      {form.numberOfEmployees || '—'}
                    </p>
                  ) : null}
                  <p className="text-white/85">
                    <span className="text-white/60">Years operating: </span>
                    {form.yearsOfOperation || '—'}
                  </p>
                  <p className="text-white/80">
                    <span className="text-white/60">Contact: </span>
                    {account.email}
                    {account.phoneNumber ? ` · ${account.phoneCode} ${account.phoneNumber}` : ''}
                  </p>
                  <p className="text-white/70">On E-Paayos: Since {memberSinceYear}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                These details come from your registration record and stay aligned with the database when you save.
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
