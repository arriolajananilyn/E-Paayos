import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CreditCard,
  HelpCircle,
  Lock,
  Plus,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
import OnCallMechanicLayout from './OnCallMechanicLayout.jsx'
const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const SECTIONS = {
  PROFILE: 'profile',
  PASSWORD: 'password',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  PRIVACY: 'privacy',
  SUPPORT: 'support',
}

const PAYMENT_METHOD_TYPES = [
  { value: 'gcash', label: 'GCash', detailsLabel: 'GCash number', placeholder: '09XX XXX XXXX' },
  { value: 'maya', label: 'Maya', detailsLabel: 'Maya number', placeholder: '09XX XXX XXXX' },
  {
    value: 'cash_on_service',
    label: 'Cash (on-site)',
    detailsLabel: 'Cash instruction (optional)',
    placeholder: 'e.g. Prepare exact amount if possible',
  },
]

const PAYMENT_DETAILS_REQUIRED = new Set(['gcash', 'maya'])

function normalizePaymentMethods(raw) {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(PAYMENT_METHOD_TYPES.map((t) => t.value))
  return raw
    .filter((m) => m && typeof m === 'object' && typeof m.id === 'string')
    .map((m) => ({
      id: m.id,
      type: allowed.has(m.type) ? m.type : PAYMENT_METHOD_TYPES[0].value,
      accountName: typeof m.accountName === 'string' ? m.accountName : '',
      details: typeof m.details === 'string' ? m.details : '',
      notes: typeof m.notes === 'string' ? m.notes : '',
      qrImage: typeof m.qrImage === 'string' ? m.qrImage : '',
    }))
}

function newPaymentId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

function paymentTypeMeta(typeValue) {
  return PAYMENT_METHOD_TYPES.find((t) => t.value === typeValue) || PAYMENT_METHOD_TYPES[PAYMENT_METHOD_TYPES.length - 1]
}

function supportsQrUpload(typeValue) {
  return typeValue === 'gcash' || typeValue === 'maya'
}

function readStoredUser() {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function OnCallMechanicAccountSettings() {
  const [user, setUser] = useState(() => readStoredUser())
  const imageInputRef = useRef(null)
  const paymentQrInputRef = useRef(null)
  const [active, setActive] = useState(SECTIONS.PROFILE)
  const [openAccount, setOpenAccount] = useState(true)
  const [openPayments, setOpenPayments] = useState(true)
  const [openPreferences, setOpenPreferences] = useState(true)
  const [openSupport, setOpenSupport] = useState(false)

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [notificationSettings, setNotificationSettings] = useState({
    pushBookingRequest: true,
    pushMessages: true,
    emailReports: false,
  })
  const [privacySettings, setPrivacySettings] = useState({
    showContactNumber: true,
    showApproximateLocation: true,
  })
  const [paymentMethods, setPaymentMethods] = useState(() =>
    normalizePaymentMethods(readStoredUser()?.acceptedPaymentMethods),
  )
  const [paymentForm, setPaymentForm] = useState({
    type: PAYMENT_METHOD_TYPES[0].value,
    accountName: '',
    details: '',
    notes: '',
    qrImage: '',
  })

  const [profileNotice, setProfileNotice] = useState({ type: '', message: '' })
  const [passwordNotice, setPasswordNotice] = useState({ type: '', message: '' })
  const [paymentNotice, setPaymentNotice] = useState({ type: '', message: '' })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  useEffect(() => {
    const nextUser = readStoredUser()
    const localMethods = normalizePaymentMethods(nextUser?.acceptedPaymentMethods)
    setUser(nextUser)
    setProfileForm({
      fullName: nextUser?.fullName || '',
      email: nextUser?.email || '',
      phone: nextUser?.phone || '',
    })
    setPaymentMethods(localMethods)

    const hydrateFromServer = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const meRes = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const meData = await meRes.json().catch(() => ({}))
        if (!meRes.ok) return

        const serverMethods = normalizePaymentMethods(meData?.acceptedPaymentMethods)
        const mergedUser = { ...(nextUser || {}), ...meData }

        // Migration safety: if old data only exists locally, push it once.
        if (!serverMethods.length && localMethods.length) {
          const syncRes = await fetch(`${API_URL}/api/users/me/payment-methods`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ acceptedPaymentMethods: localMethods }),
          })
          const syncData = await syncRes.json().catch(() => ({}))
          if (syncRes.ok) {
            mergedUser.acceptedPaymentMethods = normalizePaymentMethods(syncData?.acceptedPaymentMethods)
          }
        } else {
          mergedUser.acceptedPaymentMethods = serverMethods
        }

        localStorage.setItem('user', JSON.stringify(mergedUser))
        setUser(mergedUser)
        setProfileForm({
          fullName: mergedUser?.fullName || '',
          email: mergedUser?.email || '',
          phone: mergedUser?.phone || '',
        })
        setPaymentMethods(normalizePaymentMethods(mergedUser?.acceptedPaymentMethods))
      } catch {
        // keep local fallback
      }
    }

    void hydrateFromServer()
  }, [])

  useEffect(() => {
    if (!paymentNotice.message) return undefined
    const timer = setTimeout(() => {
      setPaymentNotice({ type: '', message: '' })
    }, 5000)
    return () => clearTimeout(timer)
  }, [paymentNotice.message])

  const persistAcceptedPaymentMethods = async (methods) => {
    const current = readStoredUser() || {}
    const merged = {
      ...current,
      acceptedPaymentMethods: methods,
    }
    localStorage.setItem('user', JSON.stringify(merged))
    setUser(merged)
    setPaymentMethods(methods)
    try {
      const token = localStorage.getItem('token')
      if (!token) return true
      const res = await fetch(`${API_URL}/api/users/me/payment-methods`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ acceptedPaymentMethods: methods }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to sync payment methods.')
      return true
    } catch (err) {
      setPaymentNotice({ type: 'error', message: err?.message || 'Saved locally but failed to sync to server.' })
      return false
    }
  }

  const handleAddPaymentMethod = async (event) => {
    event.preventDefault()
    setPaymentNotice({ type: '', message: '' })

    const accountNameTrim = paymentForm.accountName.trim()
    const detailsTrim = paymentForm.details.trim()
    const notesTrim = paymentForm.notes.trim()

    if (!accountNameTrim) {
      setPaymentNotice({ type: 'error', message: 'Account name is required.' })
      return
    }

    if (PAYMENT_DETAILS_REQUIRED.has(paymentForm.type) && !detailsTrim) {
      setPaymentNotice({
        type: 'error',
        message: `${paymentTypeMeta(paymentForm.type).detailsLabel} is required for this payment type.`,
      })
      return
    }

    if (paymentMethods.length >= 12) {
      setPaymentNotice({ type: 'error', message: 'You can save up to 12 payment options.' })
      return
    }

    const nextMethod = {
      id: newPaymentId(),
      type: paymentForm.type,
      accountName: accountNameTrim,
      details: detailsTrim,
      notes: notesTrim,
      qrImage: paymentForm.qrImage,
    }

    const ok = await persistAcceptedPaymentMethods([...paymentMethods, nextMethod])
    setPaymentForm((prev) => ({
      ...prev,
      accountName: '',
      details: '',
      notes: '',
      qrImage: '',
    }))
    if (ok) setPaymentNotice({ type: 'success', message: 'Payment option added.' })
  }

  const handleRemovePaymentMethod = async (id) => {
    setPaymentNotice({ type: '', message: '' })
    const ok = await persistAcceptedPaymentMethods(paymentMethods.filter((m) => m.id !== id))
    if (ok) setPaymentNotice({ type: 'success', message: 'Payment option removed.' })
  }

  const handleChoosePaymentQr = () => {
    if (paymentQrInputRef.current) paymentQrInputRef.current.click()
  }

  const handlePaymentQrFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setPaymentNotice({ type: 'error', message: 'Please upload a valid QR image file.' })
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPaymentNotice({ type: 'error', message: 'QR image size must be 5MB or less.' })
      event.target.value = ''
      return
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Failed to read QR image file.'))
        reader.readAsDataURL(file)
      })

      setPaymentForm((prev) => ({ ...prev, qrImage: dataUrl }))
      setPaymentNotice({ type: 'success', message: 'QR image attached to payment option.' })
    } catch {
      setPaymentNotice({ type: 'error', message: 'Unable to upload QR image.' })
    } finally {
      event.target.value = ''
    }
  }

  const accountTypeLabel = useMemo(() => {
    const role = String(user?.role || '').toLowerCase()
    if (role === 'oncall-mechanic-technician') return 'On-call Mechanic / Technician'
    return 'Service Provider'
  }, [user])

  const initials = useMemo(() => {
    const source = user?.fullName || user?.email || 'User'
    return source.trim().charAt(0).toUpperCase()
  }, [user])

  const profilePhoto = useMemo(() => {
    const photo = user?.profileImage || user?.avatar || user?.profilePhoto || ''
    if (typeof photo !== 'string') return ''
    return photo.trim()
  }, [user])

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setProfileNotice({ type: '', message: '' })

    if (!profileForm.fullName.trim()) {
      setProfileNotice({ type: 'error', message: 'Full name is required.' })
      return
    }

    setIsSavingProfile(true)
    try {
      const current = readStoredUser() || {}
      const merged = {
        ...current,
        fullName: profileForm.fullName.trim(),
        phone: profileForm.phone.trim(),
      }
      localStorage.setItem('user', JSON.stringify(merged))
      setUser(merged)
      setProfileNotice({ type: 'success', message: 'Profile details saved locally.' })
    } catch {
      setProfileNotice({ type: 'error', message: 'Failed to save profile changes.' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPasswordNotice({ type: '', message: '' })

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'Please fill all password fields.' })
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordNotice({ type: 'error', message: 'New password must be at least 8 characters.' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'New password and confirm password do not match.' })
      return
    }

    setIsSavingPassword(true)
    try {
      setPasswordNotice({
        type: 'success',
        message: 'Password UI is ready. Connect this action to backend endpoint when available.',
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleChoosePhoto = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click()
    }
  }

  const handlePhotoFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setProfileNotice({ type: 'error', message: 'Please select a valid image file.' })
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileNotice({ type: 'error', message: 'Image size must be 5MB or less.' })
      event.target.value = ''
      return
    }

    setIsUploadingPhoto(true)
    setProfileNotice({ type: '', message: '' })

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Failed to read selected image.'))
        reader.readAsDataURL(file)
      })

      const current = readStoredUser() || {}
      const merged = {
        ...current,
        profileImage: dataUrl,
      }
      localStorage.setItem('user', JSON.stringify(merged))
      setUser(merged)
      setProfileNotice({ type: 'success', message: 'Profile photo updated locally.' })
    } catch {
      setProfileNotice({ type: 'error', message: 'Unable to update profile photo.' })
    } finally {
      setIsUploadingPhoto(false)
      event.target.value = ''
    }
  }

  return (
    <OnCallMechanicLayout
      activeSection="account-settings"
      fullHeightMain
      wrapContent={false}
      pageMeta={{
        title: 'Account Settings',
        description: 'Manage your profile, security, payments customers can use, and preferences.',
      }}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="rounded-2xl bg-linear-to-r from-[#04133d] to-[#0b2b73] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-white/90 text-base font-semibold text-[#081F5C]">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">Account Settings</h2>
              <p className="truncate text-xs text-slate-200">
                Update your profile, security, accepted customer payments, and preferences.
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
          <aside className="h-full min-h-0 rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-[#04133d] to-[#0b2b73] text-lg font-semibold text-white">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{user?.fullName || 'Service Provider'}</p>
                <p className="truncate text-xs text-gray-600">{accountTypeLabel}</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />
                <button
                  type="button"
                  onClick={handleChoosePhoto}
                  disabled={isUploadingPhoto}
                  className="mt-1 text-xs font-medium text-[#081F5C] hover:text-[#04133d] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            <nav className="mt-3 space-y-2 text-sm">
              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100"
                  onClick={() => setOpenAccount((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>My Account</span>
                  </span>
                  {openAccount ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                </button>

                {openAccount && (
                  <div className="mt-2 space-y-2 pl-10">
                    <button
                      type="button"
                      onClick={() => setActive(SECTIONS.PROFILE)}
                      className={`block w-full rounded-md py-1 text-left transition ${active === SECTIONS.PROFILE ? 'font-semibold text-[#081F5C]' : 'text-gray-700 hover:text-[#081F5C]'}`}
                    >
                      Profile Information
                    </button>
                    <button
                      type="button"
                      onClick={() => setActive(SECTIONS.PASSWORD)}
                      className={`block w-full rounded-md py-1 text-left transition ${active === SECTIONS.PASSWORD ? 'font-semibold text-[#081F5C]' : 'text-gray-700 hover:text-[#081F5C]'}`}
                    >
                      Change Password
                    </button>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100"
                  onClick={() => setOpenPayments((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <span>Payments</span>
                  </span>
                  {openPayments ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {openPayments && (
                  <div className="mt-2 space-y-2 pl-10">
                    <button
                      type="button"
                      onClick={() => setActive(SECTIONS.PAYMENTS)}
                      className={`block w-full rounded-md py-1 text-left transition ${active === SECTIONS.PAYMENTS ? 'font-semibold text-[#081F5C]' : 'text-gray-700 hover:text-[#081F5C]'}`}
                    >
                      Payment methods
                    </button>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100"
                  onClick={() => setOpenPreferences((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    <SettingsIcon className="h-4 w-4" />
                    <span>Preferences</span>
                  </span>
                  {openPreferences ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {openPreferences && (
                  <div className="mt-2 space-y-2 pl-10">
                    <button
                      type="button"
                      onClick={() => setActive(SECTIONS.NOTIFICATIONS)}
                      className={`block w-full rounded-md py-1 text-left transition ${active === SECTIONS.NOTIFICATIONS ? 'font-semibold text-[#081F5C]' : 'text-gray-700 hover:text-[#081F5C]'}`}
                    >
                      Notifications
                    </button>
                    <button
                      type="button"
                      onClick={() => setActive(SECTIONS.PRIVACY)}
                      className={`block w-full rounded-md py-1 text-left transition ${active === SECTIONS.PRIVACY ? 'font-semibold text-[#081F5C]' : 'text-gray-700 hover:text-[#081F5C]'}`}
                    >
                      Privacy
                    </button>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100"
                  onClick={() => setOpenSupport((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>Support</span>
                  </span>
                  {openSupport ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                </button>

                {openSupport && (
                  <div className="mt-1 space-y-1 pl-9">
                    <button
                      type="button"
                      onClick={() => setActive(SECTIONS.SUPPORT)}
                      className={`block w-full text-left ${active === SECTIONS.SUPPORT ? 'font-semibold text-[#081F5C]' : 'text-gray-700 hover:text-[#081F5C]'}`}
                    >
                      Help Center
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </aside>

          <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm">
            {active === SECTIONS.PROFILE && (
              <section className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Profile Information</h3>
                  <p className="text-sm text-gray-600">Keep your account details up to date.</p>
                </div>

                {profileNotice.message && (
                  <div
                    className={`rounded-md border px-3 py-2 text-sm ${
                      profileNotice.type === 'success'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {profileNotice.message}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSaveProfile}>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">Email change is currently disabled.</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        placeholder="09XXXXXXXXX"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="rounded-md bg-linear-to-r from-[#04133d] to-[#0b2b73] px-4 py-2 text-sm text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              </section>
            )}

            {active === SECTIONS.PASSWORD && (
              <section className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
                  <p className="text-sm text-gray-600">Use a strong password to protect your account.</p>
                </div>

                {passwordNotice.message && (
                  <div
                    className={`rounded-md border px-3 py-2 text-sm ${
                      passwordNotice.type === 'success'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {passwordNotice.message}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleChangePassword}>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="Current password"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="New password"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="rounded-md bg-linear-to-r from-[#04133d] to-[#0b2b73] px-4 py-2 text-sm text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingPassword ? 'Saving...' : 'Update Password'}
                  </button>
                </form>
              </section>
            )}

            {active === SECTIONS.PAYMENTS && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Payment methods</h3>
                    <p className="text-sm text-gray-600">
                      Add accepted payments for customers: GCash, Maya, and Cash (on-site).
                    </p>
                  </div>
                </div>

                {paymentNotice.message && (
                  <div
                    className={`rounded-md border px-3 py-2 text-sm ${
                      paymentNotice.type === 'success'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {paymentNotice.message}
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Your saved options</p>
                  {paymentMethods.length === 0 ? (
                    <p className="text-sm text-gray-600">No payment methods yet. Add one below so customers know how to settle with you.</p>
                  ) : (
                    <ul className="space-y-2">
                      {paymentMethods.map((method) => {
                        const meta = paymentTypeMeta(method.type)
                        return (
                          <li
                            key={method.id}
                            className="flex gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm"
                          >
                            <div className="mt-0.5 shrink-0 text-[#081F5C]">
                              <CreditCard aria-hidden className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="font-medium text-gray-900">{meta.label}</p>
                              <p className="text-gray-700">
                                Account name: <span className="font-medium text-gray-900">{method.accountName}</span>
                              </p>
                              {method.details ? (
                                <p className="wrap-break-word whitespace-pre-wrap text-gray-700">{method.details}</p>
                              ) : method.type === 'cash_on_service' ? (
                                <p className="text-gray-600">Customer pays in cash upon service completion.</p>
                              ) : null}
                              {method.notes ? (
                                <p className="text-xs text-gray-500">Note: {method.notes}</p>
                              ) : null}
                              {method.qrImage ? (
                                <div className="pt-1">
                                  <p className="mb-1 text-xs text-gray-500">Customer QR</p>
                                  <img
                                    src={method.qrImage}
                                    alt={`${meta.label} QR`}
                                    className="h-24 w-24 rounded border border-gray-200 object-cover"
                                  />
                                </div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              title="Remove"
                              onClick={() => handleRemovePaymentMethod(method.id)}
                              className="shrink-0 rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <form className="space-y-3 rounded-lg border border-dashed border-[#081F5C]/25 bg-white p-4" onSubmit={handleAddPaymentMethod}>
                  <p className="text-sm font-semibold text-gray-900">Add payment option</p>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Method type</label>
                    <select
                      value={paymentForm.type}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, type: event.target.value, qrImage: '' }))}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      {PAYMENT_METHOD_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Account name (required)</label>
                    <input
                      type="text"
                      value={paymentForm.accountName}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, accountName: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="Name shown to customer"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">{paymentTypeMeta(paymentForm.type).detailsLabel}</label>
                    <textarea
                      value={paymentForm.details}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, details: event.target.value }))}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder={paymentTypeMeta(paymentForm.type).placeholder}
                    />
                  </div>
                  {supportsQrUpload(paymentForm.type) && (
                    <div>
                      <label className="mb-1 block text-xs text-gray-600">QR code (optional)</label>
                      <input
                        ref={paymentQrInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePaymentQrFileChange}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleChoosePaymentQr}
                          className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Upload QR
                        </button>
                        {paymentForm.qrImage ? (
                          <img
                            src={paymentForm.qrImage}
                            alt="QR preview"
                            className="h-14 w-14 rounded border border-gray-200 object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">No QR uploaded yet</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Extra note for customer (optional)</label>
                    <input
                      type="text"
                      value={paymentForm.notes}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="e.g. Send receipt after payment"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-md bg-linear-to-r from-[#04133d] to-[#0b2b73] px-4 py-2 text-sm text-white transition hover:brightness-110"
                  >
                    <Plus className="h-4 w-4" />
                    Add option
                  </button>
                </form>
              </section>
            )}

            {active === SECTIONS.NOTIFICATIONS && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-700" />
                  <h3 className="text-base font-semibold text-gray-900">Notification Preferences</h3>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <span>New booking requests</span>
                    <input
                      type="checkbox"
                      checked={notificationSettings.pushBookingRequest}
                      onChange={(event) =>
                        setNotificationSettings((prev) => ({ ...prev, pushBookingRequest: event.target.checked }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <span>Incoming messages</span>
                    <input
                      type="checkbox"
                      checked={notificationSettings.pushMessages}
                      onChange={(event) => setNotificationSettings((prev) => ({ ...prev, pushMessages: event.target.checked }))}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <span>Email weekly reports</span>
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailReports}
                      onChange={(event) => setNotificationSettings((prev) => ({ ...prev, emailReports: event.target.checked }))}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">These settings are currently stored in UI state for now.</p>
              </section>
            )}

            {active === SECTIONS.PRIVACY && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-700" />
                  <h3 className="text-base font-semibold text-gray-900">Privacy Settings</h3>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <span>Show contact number to customers</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.showContactNumber}
                      onChange={(event) =>
                        setPrivacySettings((prev) => ({ ...prev, showContactNumber: event.target.checked }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <span>Show approximate service location</span>
                    <input
                      type="checkbox"
                      checked={privacySettings.showApproximateLocation}
                      onChange={(event) =>
                        setPrivacySettings((prev) => ({ ...prev, showApproximateLocation: event.target.checked }))
                      }
                    />
                  </label>
                </div>
              </section>
            )}

            {active === SECTIONS.SUPPORT && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-700" />
                  <h3 className="text-base font-semibold text-gray-900">Help Center</h3>
                </div>
                <p className="text-sm text-gray-700">
                  Need assistance? Reach support via email at <span className="font-medium">support@epaayos.com</span> or
                  open the Messages page for in-app assistance.
                </p>
                <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  Tip: Include your booking ID or service request ID when contacting support for faster assistance.
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </OnCallMechanicLayout>
  )
}
