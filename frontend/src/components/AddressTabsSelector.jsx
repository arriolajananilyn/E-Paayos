import { useEffect, useState } from 'react'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

/**
 * PSGC address picker: tap main field → step through Region / Province / City / Barangay tabs (same UX as registration).
 */
export default function AddressTabsSelector({
  label,
  labelClassName,
  hideLabel,
  placeholder,
  regionKey,
  provinceKey,
  cityKey,
  barangayKey,
  errorRegionKey,
  errorProvinceKey,
  errorCityKey,
  errorBarangayKey,

  formData,
  errors,
  handleInputChange,

  psgcRegions,
  psgcProvincesByRegion,
  psgcCitiesByProvince,
  psgcCitiesByRegion,
  psgcBarangaysByCity,
  isLoadingPSGC,
  NCR_REGION_CODE,

  loadProvinces,
  loadCitiesForRegion,
  loadCitiesForProvince,
  loadBarangays,

  /** When both set, region/province are fixed; only city/municipality & barangay are selectable (e.g. Marinduque-only shop profile). */
  lockedRegionCode,
  lockedProvinceCode,
  /** With locked province: fourth tab — street line (same field as optional detailed address). */
  streetKey,
}) {
  const [showTabs, setShowTabs] = useState(false)
  const [level, setLevel] = useState('region')

  const regionVal = formData?.[regionKey] || ''
  const provinceVal = formData?.[provinceKey] || ''
  const cityVal = formData?.[cityKey] || ''
  const barangayVal = formData?.[barangayKey] || ''

  const [localRegion, setLocalRegion] = useState(regionVal)
  const [localProvince, setLocalProvince] = useState(provinceVal)
  const [localCity, setLocalCity] = useState(cityVal)
  const [localBarangay, setLocalBarangay] = useState(barangayVal)

  const isLockedProvince = Boolean(lockedRegionCode && lockedProvinceCode)
  const lockedFourStep = isLockedProvince && Boolean(streetKey)

  useEffect(() => {
    if (!isLockedProvince) return
    if (formData?.[regionKey] !== lockedRegionCode) handleInputChange(regionKey, lockedRegionCode)
    if (formData?.[provinceKey] !== lockedProvinceCode) handleInputChange(provinceKey, lockedProvinceCode)
  }, [
    isLockedProvince,
    lockedRegionCode,
    lockedProvinceCode,
    regionKey,
    provinceKey,
    formData?.[regionKey],
    formData?.[provinceKey],
    handleInputChange,
  ])

  useEffect(() => {
    setLocalRegion(regionVal)
    setLocalProvince(provinceVal)
    setLocalCity(cityVal)
    setLocalBarangay(barangayVal)
  }, [regionVal, provinceVal, cityVal, barangayVal])

  const region = localRegion
  const province = localProvince
  const city = localCity
  const barangay = localBarangay

  const regionName = (psgcRegions || []).find((r) => r.code === region)?.name || ''
  const provinceName = (psgcProvincesByRegion?.[region] || []).find((p) => p.code === province)?.name || ''
  const cityOptions = region === NCR_REGION_CODE ? psgcCitiesByRegion?.[region] || [] : psgcCitiesByProvince?.[province] || []
  const cityName = cityOptions.find((c) => c.code === city)?.name || ''
  const barangayName = (psgcBarangaysByCity?.[city] || []).find((b) => b.code === barangay)?.name || ''

  const streetVal = streetKey ? String(formData?.[streetKey] ?? '').trim() : ''

  const selectedDisplay = (
    isLockedProvince
      ? [provinceName, cityName, barangayName, streetVal].filter(Boolean)
      : [regionName, provinceName, cityName, barangayName].filter(Boolean)
  ).join(', ')

  const getOptions = () => {
    switch (level) {
      case 'region':
        return isLockedProvince ? [] : psgcRegions || []
      case 'province':
        if (isLockedProvince) {
          const list = psgcProvincesByRegion?.[lockedRegionCode] || []
          const p = list.find((x) => String(x.code) === String(lockedProvinceCode))
          const name = p?.name || 'Marinduque'
          return [{ code: lockedProvinceCode, name }]
        }
        return region === NCR_REGION_CODE ? [] : psgcProvincesByRegion?.[region] || []
      case 'city':
        return region === NCR_REGION_CODE ? psgcCitiesByRegion?.[region] || [] : psgcCitiesByProvince?.[province] || []
      case 'barangay':
        return psgcBarangaysByCity?.[city] || []
      case 'street':
        return []
      default:
        return []
    }
  }

  const options = getOptions()
  const isOptionsLoading = isLoadingPSGC && level !== 'street'

  const currentError =
    (level === 'region' && errors?.[errorRegionKey]) ||
    (level === 'province' && errors?.[errorProvinceKey]) ||
    (level === 'city' && errors?.[errorCityKey]) ||
    (level === 'barangay' && errors?.[errorBarangayKey]) ||
    (level === 'street' && streetKey && errors?.[streetKey]) ||
    ''

  const anyError =
    errors?.[errorRegionKey] ||
    errors?.[errorProvinceKey] ||
    errors?.[errorCityKey] ||
    errors?.[errorBarangayKey] ||
    (streetKey ? errors?.[streetKey] : false)

  const handleSelect = (code) => {
    if (isLockedProvince && level === 'region') return

    if (level === 'region') {
      setLocalRegion(code)
      setLocalProvince('')
      setLocalCity('')
      setLocalBarangay('')
      handleInputChange(regionKey, code)
      handleInputChange(provinceKey, '')
      handleInputChange(cityKey, '')
      handleInputChange(barangayKey, '')

      setShowTabs(true)
      if (code === NCR_REGION_CODE) {
        loadCitiesForRegion(code)
        setLevel('city')
      } else {
        loadProvinces(code)
        setLevel('province')
      }
      return
    }

    if (level === 'province') {
      if (isLockedProvince && String(code) !== String(lockedProvinceCode)) return
      setLocalProvince(code)
      setLocalCity('')
      setLocalBarangay('')
      handleInputChange(provinceKey, code)
      handleInputChange(cityKey, '')
      handleInputChange(barangayKey, '')
      loadCitiesForProvince(code)
      setShowTabs(true)
      setLevel('city')
      return
    }

    if (level === 'city') {
      setLocalCity(code)
      setLocalBarangay('')
      handleInputChange(cityKey, code)
      handleInputChange(barangayKey, '')
      loadBarangays(code)
      setShowTabs(true)
      setLevel('barangay')
      return
    }

    if (level === 'barangay') {
      setLocalBarangay(code)
      handleInputChange(barangayKey, code)
      if (lockedFourStep) {
        setLevel('street')
        setShowTabs(true)
      } else {
        setShowTabs(false)
      }
    }
  }

  const reset = () => {
    if (isLockedProvince) {
      setLocalRegion(lockedRegionCode)
      setLocalProvince(lockedProvinceCode)
      setLocalCity('')
      setLocalBarangay('')
      handleInputChange(regionKey, lockedRegionCode)
      handleInputChange(provinceKey, lockedProvinceCode)
      handleInputChange(cityKey, '')
      handleInputChange(barangayKey, '')
      if (streetKey) handleInputChange(streetKey, '')
      setLevel(lockedFourStep ? 'province' : 'city')
      setShowTabs(true)
      return
    }
    setLocalRegion('')
    setLocalProvince('')
    setLocalCity('')
    setLocalBarangay('')
    handleInputChange(regionKey, '')
    handleInputChange(provinceKey, '')
    handleInputChange(cityKey, '')
    handleInputChange(barangayKey, '')
    setLevel('region')
    setShowTabs(true)
  }

  const canGoProvince = !isLockedProvince && Boolean(region) && region !== NCR_REGION_CODE
  const canGoCity = isLockedProvince
    ? Boolean(lockedProvinceCode)
    : region === NCR_REGION_CODE
      ? Boolean(region)
      : Boolean(province)
  const canGoBarangay = Boolean(city)
  const canGoStreetTab = Boolean(barangay)

  return (
    <div className="space-y-4">
      {!hideLabel && (
        <Label className={labelClassName || 'text-sm font-medium text-gray-700'}>{label} *</Label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowTabs((prev) => {
              const next = !prev
              if (next) {
                if (lockedFourStep) {
                  if (!city) setLevel('city')
                  else if (!barangay) setLevel('barangay')
                  else setLevel('street')
                } else if (isLockedProvince) {
                  if (!city) setLevel('city')
                  else if (!barangay) setLevel('barangay')
                  else setLevel('barangay')
                } else if (!region) {
                  setLevel('region')
                } else if (region === NCR_REGION_CODE) {
                  if (!city) setLevel('city')
                  else if (!barangay) setLevel('barangay')
                } else {
                  if (!province) setLevel('province')
                  else if (!city) setLevel('city')
                  else if (!barangay) setLevel('barangay')
                }
              }
              return next
            })
          }}
          className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left ${
            anyError ? 'border-red-500' : 'border-gray-300'
          } hover:border-gray-400`}
          disabled={isLoadingPSGC}
        >
          <span className={`text-sm ${selectedDisplay ? 'text-gray-900' : 'text-gray-500'}`}>
            {isLoadingPSGC
              ? 'Loading...'
              : selectedDisplay ||
                placeholder ||
                (lockedFourStep
                  ? 'Select province, municipality, barangay, street'
                  : isLockedProvince
                    ? 'Select municipality, barangay'
                    : 'Please Select : Region/Province/City/Barangay')}
          </span>
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {showTabs && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
            {!isLockedProvince ? (
              <>
                <button
                  type="button"
                  onClick={() => setLevel('region')}
                  className={`min-w-0 flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                    level === 'region' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Region
                </button>
                <button
                  type="button"
                  onClick={() => setLevel('province')}
                  className={`min-w-0 flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                    level === 'province' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
                  disabled={!canGoProvince}
                >
                  Province
                </button>
              </>
            ) : null}
            {lockedFourStep ? (
              <button
                type="button"
                onClick={() => setLevel('province')}
                className={`min-w-0 flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  level === 'province' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Province
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setLevel('city')}
              className={`min-w-0 flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                level === 'city' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
              disabled={!canGoCity}
            >
              {isLockedProvince ? 'Municipality' : 'City'}
            </button>
            <button
              type="button"
              onClick={() => setLevel('barangay')}
              className={`min-w-0 flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                level === 'barangay' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
              disabled={!canGoBarangay}
            >
              Barangay
            </button>
            {lockedFourStep ? (
              <button
                type="button"
                onClick={() => setLevel('street')}
                className={`min-w-0 flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  level === 'street' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
                disabled={!canGoStreetTab}
              >
                Street
              </button>
            ) : null}
          </div>

          <div
            className={`overflow-y-auto rounded-lg border border-gray-200 ${
              level === 'street' && streetKey ? 'max-h-none' : 'max-h-60'
            }`}
          >
            <div className="p-3">
              <div className="grid grid-cols-1 gap-2">
                {level === 'street' && streetKey ? (
                  <Textarea
                    id={`${streetKey}-inline`}
                    value={formData?.[streetKey] ?? ''}
                    onChange={(e) => handleInputChange(streetKey, e.target.value)}
                    rows={4}
                    className="min-h-[100px] w-full resize-y text-sm"
                    placeholder="House / unit no., building, street name, etc. (optional)"
                  />
                ) : isOptionsLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Loading {level} options...</div>
                ) : (
                  <>
                    {options.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => handleSelect(option.code)}
                        className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        {option.name}
                      </button>
                    ))}
                    {options.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No options available. Select the previous level first.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={reset}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Reset Selection
              </button>
              <button
                type="button"
                onClick={() => setShowTabs(false)}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {currentError ? <p className="text-sm text-red-600">{currentError}</p> : null}
    </div>
  )
}
