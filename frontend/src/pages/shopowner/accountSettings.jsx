import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  HelpCircle,
  Info,
  Lock,
  Mail,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Store,
  Trash2,
  User,
  Wallet,
  Wrench,
} from 'lucide-react'
import ShopOwnerDashboard from './dashboard.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const SECTIONS = {
  PROFILE: 'profile',
  PASSWORD: 'password',
  PAYMENTS: 'payments',
  WARRANTY: 'warranty',
  NOTIFICATIONS: 'notifications',
  PRIVACY: 'privacy',
  SUPPORT: 'support',
}

const TABS = [
  { id: SECTIONS.PROFILE, label: 'Profile Information', shortLabel: 'Profile', icon: User },
  { id: SECTIONS.PASSWORD, label: 'Security & Password', shortLabel: 'Security', icon: Lock },
  { id: SECTIONS.PAYMENTS, label: 'Payment Methods', shortLabel: 'Payments', icon: Wallet, countKey: 'payments' },
  { id: SECTIONS.WARRANTY, label: 'Warranty Management', shortLabel: 'Warranty', icon: ShieldCheck },
  { id: SECTIONS.NOTIFICATIONS, label: 'Notifications', shortLabel: 'Notifications', icon: Bell },
  { id: SECTIONS.PRIVACY, label: 'Privacy & Safety', shortLabel: 'Privacy', icon: Shield },
  { id: SECTIONS.SUPPORT, label: 'Help Center', shortLabel: 'Support', icon: HelpCircle },
]

const WARRANTY_PERIOD_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 15, label: '15 Days' },
  { value: 30, label: '30 Days (1 Month)' },
  { value: 60, label: '60 Days (2 Months)' },
  { value: 90, label: '90 Days (3 Months)' },
  { value: 180, label: '180 Days (6 Months)' },
  { value: 365, label: '365 Days (1 Year)' },
]

const DEFAULT_COVERED_ITEMS = [
  { id: 'cov-1', text: 'Workmanship & repair assembly errors', enabled: true },
  { id: 'cov-2', text: 'Manufacturer-defective replacement components', enabled: true },
  { id: 'cov-3', text: 'Recurring symptoms from serviced repair scope', enabled: true },
  { id: 'cov-4', text: 'Diagnostic realignment & tuning adjustments', enabled: true },
]

const DEFAULT_VOID_CONDITIONS = [
  { id: 'void-1', text: 'Accidental drops, physical impact, or external collision', enabled: true },
  { id: 'void-2', text: 'Liquid intrusion, chemical spill, or corrosion', enabled: true },
  { id: 'void-3', text: 'Broken warranty seals or unauthorized tampering', enabled: true },
  { id: 'void-4', text: 'Third-party disassembly or unauthorized modifications', enabled: true },
]

function normalizeWarrantyList(rawList, defaultList) {
  if (Array.isArray(rawList)) {
    const list = rawList
      .filter((item) => item && typeof item === 'object')
      .map((item, idx) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `item-${Date.now()}-${idx}`,
        text: typeof item.text === 'string' ? item.text.trim() : '',
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
      }))
      .filter((item) => item.text.length > 0)
    return list.length > 0 ? list : defaultList.map((d) => ({ ...d }))
  }
  if (rawList && typeof rawList === 'object') {
    const items = []
    if (typeof rawList.workmanshipErrors === 'boolean') {
      items.push({ id: 'cov-1', text: 'Workmanship & repair assembly errors', enabled: rawList.workmanshipErrors })
    }
    if (typeof rawList.defectiveParts === 'boolean') {
      items.push({ id: 'cov-2', text: 'Manufacturer-defective replacement components', enabled: rawList.defectiveParts })
    }
    if (typeof rawList.recurringIssues === 'boolean') {
      items.push({ id: 'cov-3', text: 'Recurring symptoms from serviced repair scope', enabled: rawList.recurringIssues })
    }
    if (typeof rawList.calibrationIssues === 'boolean') {
      items.push({ id: 'cov-4', text: 'Diagnostic realignment & tuning adjustments', enabled: rawList.calibrationIssues })
    }
    if (typeof rawList.physicalDamage === 'boolean') {
      items.push({ id: 'void-1', text: 'Accidental drops, physical impact, or external collision', enabled: rawList.physicalDamage })
    }
    if (typeof rawList.waterLiquidDamage === 'boolean') {
      items.push({ id: 'void-2', text: 'Liquid intrusion, chemical spill, or corrosion', enabled: rawList.waterLiquidDamage })
    }
    if (typeof rawList.tamperedSeals === 'boolean') {
      items.push({ id: 'void-3', text: 'Broken warranty seals or unauthorized tampering', enabled: rawList.tamperedSeals })
    }
    if (typeof rawList.unauthorizedModification === 'boolean') {
      items.push({ id: 'void-4', text: 'Third-party disassembly or unauthorized modifications', enabled: rawList.unauthorizedModification })
    }
    if (items.length > 0) return items
  }
  return defaultList.map((d) => ({ ...d }))
}

const DEFAULT_WARRANTY_SETTINGS = {
  laborWarrantyEnabled: true,
  laborWarrantyDays: 30,
  partsWarrantyEnabled: true,
  partsWarrantyDays: 30,
  warrantyPolicyTerms:
    'All repair services performed include standard workmanship warranty. Replacement parts are protected against manufacturer defects under normal operating conditions. Warranty is invalidated by physical impact, water intrusion, or unauthorized disassembly.',
  coveredItems: DEFAULT_COVERED_ITEMS,
  voidConditions: DEFAULT_VOID_CONDITIONS,
}

function normalizeWarrantySettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WARRANTY_SETTINGS }
  return {
    laborWarrantyEnabled: typeof raw.laborWarrantyEnabled === 'boolean' ? raw.laborWarrantyEnabled : true,
    laborWarrantyDays: Number(raw.laborWarrantyDays) || 30,
    partsWarrantyEnabled: typeof raw.partsWarrantyEnabled === 'boolean' ? raw.partsWarrantyEnabled : true,
    partsWarrantyDays: Number(raw.partsWarrantyDays) || 30,
    warrantyPolicyTerms:
      typeof raw.warrantyPolicyTerms === 'string' && raw.warrantyPolicyTerms.trim()
        ? raw.warrantyPolicyTerms
        : DEFAULT_WARRANTY_SETTINGS.warrantyPolicyTerms,
    coveredItems: normalizeWarrantyList(raw.coveredItems, DEFAULT_COVERED_ITEMS),
    voidConditions: normalizeWarrantyList(raw.voidConditions, DEFAULT_VOID_CONDITIONS),
  }
}

const PAYMENT_METHOD_TYPES = [
  { value: 'gcash', label: 'GCash', detailsLabel: 'GCash number', placeholder: '09XX XXX XXXX', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'maya', label: 'Maya', detailsLabel: 'Maya number', placeholder: '09XX XXX XXXX', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  {
    value: 'cash_on_service',
    label: 'Cash (on-site)',
    detailsLabel: 'Cash instruction (optional)',
    placeholder: 'e.g. Prepare exact amount if possible',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
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

export default function ShopOwnerAccountSettings() {
  const [user, setUser] = useState(() => readStoredUser())
  const imageInputRef = useRef(null)
  const paymentQrInputRef = useRef(null)
  const [active, setActive] = useState(SECTIONS.PROFILE)

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
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
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

  const [warrantySettings, setWarrantySettings] = useState(() =>
    normalizeWarrantySettings(readStoredUser()?.warrantySettings),
  )
  const [warrantyNotice, setWarrantyNotice] = useState({ type: '', message: '' })
  const [isSavingWarranty, setIsSavingWarranty] = useState(false)
  const [newCoveredItemInput, setNewCoveredItemInput] = useState('')
  const [newVoidConditionInput, setNewVoidConditionInput] = useState('')

  const [profileNotice, setProfileNotice] = useState({ type: '', message: '' })
  const [passwordNotice, setPasswordNotice] = useState({ type: '', message: '' })
  const [paymentNotice, setPaymentNotice] = useState({ type: '', message: '' })
  const [copiedId, setCopiedId] = useState(null)
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
      phone: (nextUser?.phone || '').replace(/\D/g, '').slice(0, 11),
    })
    setPaymentMethods(localMethods)
    setWarrantySettings(normalizeWarrantySettings(nextUser?.warrantySettings))

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
          phone: (mergedUser?.phone || '').replace(/\D/g, '').slice(0, 11),
        })
        setPaymentMethods(normalizePaymentMethods(mergedUser?.acceptedPaymentMethods))
        if (mergedUser?.warrantySettings) {
          setWarrantySettings(normalizeWarrantySettings(mergedUser.warrantySettings))
        }
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

  useEffect(() => {
    if (!profileNotice.message) return undefined
    const timer = setTimeout(() => {
      setProfileNotice({ type: '', message: '' })
    }, 5000)
    return () => clearTimeout(timer)
  }, [profileNotice.message])

  useEffect(() => {
    if (!passwordNotice.message) return undefined
    const timer = setTimeout(() => {
      setPasswordNotice({ type: '', message: '' })
    }, 5000)
    return () => clearTimeout(timer)
  }, [passwordNotice.message])

  useEffect(() => {
    if (!warrantyNotice.message) return undefined
    const timer = setTimeout(() => {
      setWarrantyNotice({ type: '', message: '' })
    }, 5000)
    return () => clearTimeout(timer)
  }, [warrantyNotice.message])

  const handleSaveWarranty = async (e) => {
    if (e) e.preventDefault()
    setWarrantyNotice({ type: '', message: '' })
    setIsSavingWarranty(true)
    try {
      const current = readStoredUser() || {}
      const merged = {
        ...current,
        warrantySettings,
      }
      localStorage.setItem('user', JSON.stringify(merged))
      setUser(merged)

      const token = localStorage.getItem('token')
      if (token) {
        const res = await fetch(`${API_URL}/api/users/me/warranty-settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ warrantySettings }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to sync warranty settings with server.')
        }
        if (data?.warrantySettings) {
          const synced = normalizeWarrantySettings(data.warrantySettings)
          setWarrantySettings(synced)
          merged.warrantySettings = synced
          localStorage.setItem('user', JSON.stringify(merged))
        }
      }

      setWarrantyNotice({
        type: 'success',
        message: 'Warranty policies & guarantee configurations saved successfully.',
      })
    } catch (err) {
      setWarrantyNotice({
        type: 'error',
        message: err?.message || 'Failed to save warranty settings.',
      })
    } finally {
      setIsSavingWarranty(false)
    }
  }

  const handleResetWarrantyToDefault = () => {
    setWarrantySettings({ ...DEFAULT_WARRANTY_SETTINGS })
    setWarrantyNotice({
      type: 'success',
      message: 'Warranty settings restored to standard platform default template.',
    })
  }

  const handleAddCoveredItem = () => {
    const text = newCoveredItemInput.trim()
    if (!text) return
    const newItem = {
      id: `cov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      enabled: true,
    }
    setWarrantySettings((prev) => ({
      ...prev,
      coveredItems: [...prev.coveredItems, newItem],
    }))
    setNewCoveredItemInput('')
  }

  const handleRemoveCoveredItem = (id) => {
    setWarrantySettings((prev) => ({
      ...prev,
      coveredItems: prev.coveredItems.filter((item) => item.id !== id),
    }))
  }

  const handleToggleCoveredItem = (id) => {
    setWarrantySettings((prev) => ({
      ...prev,
      coveredItems: prev.coveredItems.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    }))
  }

  const handleAddVoidCondition = () => {
    const text = newVoidConditionInput.trim()
    if (!text) return
    const newItem = {
      id: `void-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      enabled: true,
    }
    setWarrantySettings((prev) => ({
      ...prev,
      voidConditions: [...prev.voidConditions, newItem],
    }))
    setNewVoidConditionInput('')
  }

  const handleRemoveVoidCondition = (id) => {
    setWarrantySettings((prev) => ({
      ...prev,
      voidConditions: prev.voidConditions.filter((item) => item.id !== id),
    }))
  }

  const handleToggleVoidCondition = (id) => {
    setWarrantySettings((prev) => ({
      ...prev,
      voidConditions: prev.voidConditions.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    }))
  }

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
    if (ok) setPaymentNotice({ type: 'success', message: 'Payment option successfully added.' })
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

  const initials = useMemo(() => {
    const source = user?.fullName || user?.email || 'Shop'
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
      setProfileNotice({ type: 'success', message: 'Profile details saved successfully.' })
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
    if (passwordForm.newPassword.length < 6) {
      setPasswordNotice({ type: 'error', message: 'New password must be at least 6 characters long.' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'New password and confirm password do not match.' })
      return
    }

    setIsSavingPassword(true)
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch(`${API_URL}/api/users/me/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password.')
      }

      setPasswordNotice({
        type: 'success',
        message: data.message || 'Your password has been changed successfully!',
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPasswordNotice({
        type: 'error',
        message: err.message || 'Failed to change password. Please check your credentials.',
      })
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
      setProfileNotice({ type: 'success', message: 'Profile photo updated successfully.' })
    } catch {
      setProfileNotice({ type: 'error', message: 'Unable to update profile photo.' })
    } finally {
      setIsUploadingPhoto(false)
      event.target.value = ''
    }
  }

  const copyToClipboard = (text, id) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <ShopOwnerDashboard
      activeSection="account-settings"
      pageMeta={{
        title: 'Account Settings',
        description: 'Manage your profile, security, shop payment options, and preferences.',
      }}
    >
      <main className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4 overflow-x-hidden pb-8">
        {/* ── HERO PROFILE CARD ─────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-md border border-slate-200/90 bg-white shadow-xs">
          {/* Brand Navy Mesh Banner */}
          <div className="relative h-28 sm:h-36 w-full bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.22),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white/95 border border-white/15">
                <Store className="h-3 w-3 text-blue-200" />
                Shop Management
              </span>
            </div>
          </div>

          {/* Profile Details Container */}
          <div className="relative px-4 pb-4 sm:px-6 sm:pb-5 bg-white space-y-3">
            {/* Row 1: Overlapping Avatar & Primary Identity */}
            <div className="flex flex-col items-center sm:flex-row sm:items-end gap-3 text-center sm:text-left">
              {/* Profile Avatar with Camera Trigger */}
              <div className="relative shrink-0 -mt-11 sm:-mt-14 z-10">
                <div className="relative h-22 w-22 sm:h-28 sm:w-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] flex items-center justify-center text-white">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black tracking-tight">{initials}</span>
                  )}
                </div>

                {/* Online pulse indicator */}
                <div className="absolute bottom-1 left-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-white">
                  <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-[#1447a6]" />
                  </span>
                </div>

                {/* Camera upload button */}
                <button
                  type="button"
                  onClick={handleChoosePhoto}
                  disabled={isUploadingPhoto}
                  title="Change profile picture"
                  className="absolute bottom-1 right-1 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#081F5C] text-white shadow-md ring-2 ring-white transition-transform hover:scale-110 active:scale-95 cursor-pointer hover:bg-[#1447a6] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />
              </div>

              {/* Name, Badges & Email */}
              <div className="space-y-1 sm:pb-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                    {user?.fullName || 'Shop Owner'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-sm bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-[#081F5C]">
                    <ShieldCheck className="h-3 w-3 text-[#1447a6]" />
                    Verified Shop Owner
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-amber-900">
                    <Award className="h-3 w-3 text-amber-600" />
                    E-Paayos Partner
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 truncate">
                  {user?.email || 'shopowner@epaayos.com'}
                </p>
              </div>
            </div>

            {/* Row 2: Contact Chips & Quick Interactive Stats */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-100">
              {/* Left Side Chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1 rounded-sm bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1 text-slate-700">
                  <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#081F5C]" />
                  {profileForm.phone || 'No phone set'}
                </span>
                <span className="flex items-center gap-1 rounded-sm bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1 text-slate-700">
                  <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#081F5C]" />
                  {user?.email || 'Email verified'}
                </span>
                <span className="flex items-center gap-1 rounded-sm bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1 text-slate-700">
                  <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#081F5C]" />
                  Auto Repair & Services
                </span>
              </div>

              {/* Right Side Quick Stat Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActive(SECTIONS.PAYMENTS)}
                  className="flex flex-col items-center justify-center rounded-sm bg-gradient-to-br from-blue-50 to-indigo-100/60 px-2 sm:px-3 py-1 sm:py-1.5 border border-blue-200/80 cursor-pointer transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-1">
                    <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#081F5C]" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{paymentMethods.length}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[#081F5C]">Payments</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActive(SECTIONS.WARRANTY)}
                  className="flex flex-col items-center justify-center rounded-sm bg-gradient-to-br from-amber-50 to-amber-100/70 px-2 sm:px-3 py-1 sm:py-1.5 border border-amber-200/80 cursor-pointer transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-700" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {warrantySettings.laborWarrantyEnabled ? `${warrantySettings.laborWarrantyDays}d` : 'Off'}
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-amber-800">Warranty</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActive(SECTIONS.NOTIFICATIONS)}
                  className="flex flex-col items-center justify-center rounded-sm bg-gradient-to-br from-slate-50 to-blue-100/60 px-2 sm:px-3 py-1 sm:py-1.5 border border-slate-200 cursor-pointer transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-1">
                    <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#1447a6]" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {notificationSettings.pushBookingRequest ? 'Active' : 'Off'}
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[#1447a6]">Alerts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActive(SECTIONS.PASSWORD)}
                  className="flex flex-col items-center justify-center rounded-sm bg-gradient-to-br from-emerald-50 to-teal-100/60 px-2 sm:px-3 py-1 sm:py-1.5 border border-emerald-200 cursor-pointer transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-700" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">Safe</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-800">Security</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN SETTINGS GRID ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* SIDE/MOBILE NAVIGATION BAR */}
          <div className="lg:col-span-3 lg:sticky lg:top-4 z-10">
            <div className="rounded-md border border-slate-200/90 bg-white p-2 sm:p-2.5 shadow-xs">
              <div className="px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Settings Menu
              </div>

              {/* Horizontal Scroll on Mobile (< lg), Stacked on Desktop (>= lg) */}
              <nav className="flex overflow-x-auto pb-1.5 lg:flex-col lg:overflow-visible lg:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-0.5 px-0.5 gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = active === tab.id
                  const badgeCount = tab.countKey === 'payments' ? paymentMethods.length : undefined

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActive(tab.id)}
                      className={`flex shrink-0 items-center justify-between gap-2 rounded-sm px-3 py-2 text-xs sm:text-sm font-semibold transition-all lg:w-full cursor-pointer text-left whitespace-nowrap ${isActive
                        ? 'bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-blue-50/70 hover:text-[#081F5C]'
                        }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate hidden sm:inline">{tab.label}</span>
                        <span className="truncate sm:hidden">{tab.shortLabel}</span>
                      </div>

                      {badgeCount !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* SECTION CONTENT DISPLAY */}
          <div className="lg:col-span-9 min-w-0">
            {/* 1. PROFILE SECTION */}
            {active === SECTIONS.PROFILE && (
              <div className="rounded-md border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Profile Information</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Update your account identity and customer-facing contact details.
                    </p>
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#081F5C]">
                    <User className="h-5 w-5" />
                  </div>
                </div>

                {profileNotice.message && (
                  <div
                    className={`flex items-center gap-2 rounded-sm border px-3.5 py-2.5 text-xs sm:text-sm ${profileNotice.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                  >
                    {profileNotice.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span>{profileNotice.message}</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSaveProfile}>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="w-full rounded-sm border border-slate-300 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">Email Address</label>
                        <span className="text-[10px] text-slate-400">Locked</span>
                      </div>
                      <div className="relative">
                        <input
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="w-full rounded-sm border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                        />
                        <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">Email address change requires administrative support.</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Phone Number</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        value={profileForm.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 11)
                          setProfileForm((prev) => ({ ...prev, phone: val }))
                        }}
                        className="w-full rounded-sm border border-slate-300 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                        placeholder="09XXXXXXXXX"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">Used for customer booking notifications & calls (max 11 digits).</p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {isSavingProfile ? 'Saving Changes...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. PASSWORD SECTION */}
            {active === SECTIONS.PASSWORD && (
              <div className="rounded-md border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Change Password</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Keep your account safe by using a strong password with at least 8 characters.
                    </p>
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Lock className="h-5 w-5" />
                  </div>
                </div>

                {passwordNotice.message && (
                  <div
                    className={`flex items-center gap-2 rounded-sm border px-3.5 py-2.5 text-xs sm:text-sm ${passwordNotice.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                  >
                    {passwordNotice.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span>{passwordNotice.message}</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleChangePassword}>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full rounded-sm border border-slate-300 px-3.5 py-2 pr-10 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.next ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full rounded-sm border border-slate-300 px-3.5 py-2 pr-10 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                          placeholder="Min. 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => ({ ...prev, next: !prev.next }))}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full rounded-sm border border-slate-300 px-3.5 py-2 pr-10 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                          placeholder="Re-type new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {isSavingPassword ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. PAYMENTS SECTION */}
            {active === SECTIONS.PAYMENTS && (
              <div className="rounded-md border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Accepted Payment Methods</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Configure GCash, Maya, and Cash-on-site options for customers to settle service fees.
                    </p>
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#081F5C]">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>

                {paymentNotice.message && (
                  <div
                    className={`flex items-center gap-2 rounded-sm border px-3.5 py-2.5 text-xs sm:text-sm ${paymentNotice.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                  >
                    {paymentNotice.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span>{paymentNotice.message}</span>
                  </div>
                )}

                {/* Saved Payment Methods List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Active Payment Methods ({paymentMethods.length})
                    </p>
                  </div>

                  {paymentMethods.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-300 p-6 text-center space-y-2 bg-slate-50/50">
                      <Wallet className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-700">No payment methods added yet</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Add GCash, Maya, or Cash options below so customers know how to pay upon booking or completion.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {paymentMethods.map((method) => {
                        const meta = paymentTypeMeta(method.type)
                        return (
                          <div
                            key={method.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-slate-300 transition"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[#081F5C]">
                                <CreditCard className="h-5 w-5" />
                              </div>

                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {method.accountName}
                                  </span>
                                </div>

                                {method.details ? (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                    <span className="font-mono">{method.details}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(method.details, method.id)}
                                      title="Copy number"
                                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                      {copiedId === method.id ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                ) : method.type === 'cash_on_service' ? (
                                  <p className="text-xs text-slate-500">Pay directly in cash upon service completion.</p>
                                ) : null}

                                {method.notes && (
                                  <p className="text-[11px] text-slate-500 italic">Note: {method.notes}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              {method.qrImage && (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={method.qrImage}
                                    alt={`${meta.label} QR`}
                                    className="h-12 w-12 rounded border border-slate-200 object-cover"
                                  />
                                  <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">QR Attached</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemovePaymentMethod(method.id)}
                                title="Remove payment method"
                                className="flex items-center gap-1 rounded-sm px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sm:hidden">Remove</span>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Add Payment Method Form */}
                <form
                  onSubmit={handleAddPaymentMethod}
                  className="rounded-md border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-[#081F5C]" />
                    <p className="text-xs sm:text-sm font-bold text-slate-900">Add New Payment Option</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Type</label>
                      <select
                        value={paymentForm.type}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, type: e.target.value, qrImage: '' }))}
                        className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                      >
                        {PAYMENT_METHOD_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Account / Receiver Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={paymentForm.accountName}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, accountName: e.target.value }))}
                        className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                        placeholder="e.g. Juan Dela Cruz"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      {paymentTypeMeta(paymentForm.type).detailsLabel}
                      {PAYMENT_DETAILS_REQUIRED.has(paymentForm.type) && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type={PAYMENT_DETAILS_REQUIRED.has(paymentForm.type) ? 'tel' : 'text'}
                      inputMode={PAYMENT_DETAILS_REQUIRED.has(paymentForm.type) ? 'numeric' : 'text'}
                      maxLength={PAYMENT_DETAILS_REQUIRED.has(paymentForm.type) ? 11 : undefined}
                      value={paymentForm.details}
                      onChange={(e) => {
                        const val = PAYMENT_DETAILS_REQUIRED.has(paymentForm.type)
                          ? e.target.value.replace(/\D/g, '').slice(0, 11)
                          : e.target.value
                        setPaymentForm((prev) => ({ ...prev, details: val }))
                      }}
                      className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                      placeholder={paymentTypeMeta(paymentForm.type).placeholder}
                    />
                  </div>

                  {supportsQrUpload(paymentForm.type) && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">QR Code Image (Optional)</label>
                      <input
                        ref={paymentQrInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePaymentQrFileChange}
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleChoosePaymentQr}
                          className="inline-flex items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <QrCode className="h-3.5 w-3.5 text-[#081F5C]" />
                          Upload QR Code
                        </button>
                        {paymentForm.qrImage ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={paymentForm.qrImage}
                              alt="QR Preview"
                              className="h-10 w-10 rounded border border-slate-200 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPaymentForm((prev) => ({ ...prev, qrImage: '' }))}
                              className="text-[11px] text-red-600 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No QR uploaded</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Customer Note (Optional)</label>
                    <input
                      type="text"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                      placeholder="e.g. Please send screenshot of receipt after payment"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Payment Option
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3.5 WARRANTY MANAGEMENT SECTION */}
            {active === SECTIONS.WARRANTY && (
              <div className="rounded-md border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Warranty &amp; Service Guarantee</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Configure your shop warranty durations, coverage inclusions, void conditions, and customer terms.
                    </p>
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>

                {warrantyNotice.message && (
                  <div
                    className={`flex items-center gap-2 rounded-sm border px-3.5 py-2.5 text-xs sm:text-sm ${
                      warrantyNotice.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                  >
                    {warrantyNotice.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span>{warrantyNotice.message}</span>
                  </div>
                )}

                {/* Quick Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Labor Guarantee</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          warrantySettings.laborWarrantyEnabled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {warrantySettings.laborWarrantyEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-lg font-black text-slate-900">
                      {warrantySettings.laborWarrantyEnabled ? `${warrantySettings.laborWarrantyDays} Days` : 'No Warranty'}
                    </p>
                    <p className="text-[11px] text-slate-500">Workmanship &amp; repair labor protection</p>
                  </div>

                  <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Parts Guarantee</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          warrantySettings.partsWarrantyEnabled
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {warrantySettings.partsWarrantyEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-lg font-black text-slate-900">
                      {warrantySettings.partsWarrantyEnabled ? `${warrantySettings.partsWarrantyDays} Days` : 'No Warranty'}
                    </p>
                    <p className="text-[11px] text-slate-500">Replaced components &amp; factory defects</p>
                  </div>

                  <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Claim Response</span>
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Fast-Track
                      </span>
                    </div>
                    <p className="text-lg font-black text-slate-900">24 – 48 Hours</p>
                    <p className="text-[11px] text-slate-500">Standard inspection &amp; resolution window</p>
                  </div>
                </div>

                <form onSubmit={handleSaveWarranty} className="space-y-5">
                  {/* Coverage Duration Settings */}
                  <div className="rounded-md border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-[#081F5C]" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Warranty Durations &amp; Toggles
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">Customer-facing guarantee</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Labor Warranty Card */}
                      <div className="rounded-sm border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Wrench className="h-3.5 w-3.5 text-[#081F5C]" />
                              Workmanship &amp; Labor Warranty
                            </label>
                            <p className="text-[11px] text-slate-500">Guarantees service quality and repair durability.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={warrantySettings.laborWarrantyEnabled}
                              onChange={(e) =>
                                setWarrantySettings((prev) => ({ ...prev, laborWarrantyEnabled: e.target.checked }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#081F5C]"></div>
                          </label>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Duration Period</label>
                          <select
                            disabled={!warrantySettings.laborWarrantyEnabled}
                            value={warrantySettings.laborWarrantyDays}
                            onChange={(e) =>
                              setWarrantySettings((prev) => ({ ...prev, laborWarrantyDays: Number(e.target.value) }))
                            }
                            className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            {WARRANTY_PERIOD_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Parts Warranty Card */}
                      <div className="rounded-sm border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <BadgeCheck className="h-3.5 w-3.5 text-[#081F5C]" />
                              Replaced Parts Warranty
                            </label>
                            <p className="text-[11px] text-slate-500">Covers defects in new components supplied by shop.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={warrantySettings.partsWarrantyEnabled}
                              onChange={(e) =>
                                setWarrantySettings((prev) => ({ ...prev, partsWarrantyEnabled: e.target.checked }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#081F5C]"></div>
                          </label>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Duration Period</label>
                          <select
                            disabled={!warrantySettings.partsWarrantyEnabled}
                            value={warrantySettings.partsWarrantyDays}
                            onChange={(e) =>
                              setWarrantySettings((prev) => ({ ...prev, partsWarrantyDays: Number(e.target.value) }))
                            }
                            className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            {WARRANTY_PERIOD_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coverage Scope & Exclusions Checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Covered Items Card */}
                    <div className="rounded-md border border-slate-200/90 bg-white p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5 text-emerald-800">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Covered Under Warranty</h4>
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {warrantySettings.coveredItems.filter((i) => i.enabled).length} Active
                          </span>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs text-slate-700">
                          {warrantySettings.coveredItems.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">No covered items added yet. Add one below.</p>
                          ) : (
                            warrantySettings.coveredItems.map((item) => (
                              <div
                                key={item.id}
                                className="group flex items-center justify-between gap-2 p-1.5 rounded-sm hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                              >
                                <label className="flex items-start gap-2 cursor-pointer select-none flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={item.enabled}
                                    onChange={() => handleToggleCoveredItem(item.id)}
                                    className="mt-0.5 h-4 w-4 accent-[#081F5C] rounded cursor-pointer shrink-0"
                                  />
                                  <span className={`text-xs break-words ${item.enabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}`}>
                                    {item.text}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCoveredItem(item.id)}
                                  title="Remove item"
                                  className="opacity-60 hover:opacity-100 text-slate-400 hover:text-red-600 p-1 transition cursor-pointer shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Add New Covered Item Input Form */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newCoveredItemInput}
                            onChange={(e) => setNewCoveredItemInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddCoveredItem()
                              }
                            }}
                            placeholder="Add new covered warranty item..."
                            className="flex-1 rounded-sm border border-slate-300 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#081F5C] focus:ring-1 focus:ring-[#081F5C]"
                          />
                          <button
                            type="button"
                            onClick={handleAddCoveredItem}
                            disabled={!newCoveredItemInput.trim()}
                            className="inline-flex items-center gap-1 rounded-sm bg-[#081F5C] hover:bg-[#04133d] disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Void / Non-Covered Conditions Card */}
                    <div className="rounded-md border border-slate-200/90 bg-white p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5 text-amber-800">
                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Warranty Voiding Conditions</h4>
                          </div>
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {warrantySettings.voidConditions.filter((i) => i.enabled).length} Active
                          </span>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs text-slate-700">
                          {warrantySettings.voidConditions.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">No void conditions added yet. Add one below.</p>
                          ) : (
                            warrantySettings.voidConditions.map((item) => (
                              <div
                                key={item.id}
                                className="group flex items-center justify-between gap-2 p-1.5 rounded-sm hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                              >
                                <label className="flex items-start gap-2 cursor-pointer select-none flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={item.enabled}
                                    onChange={() => handleToggleVoidCondition(item.id)}
                                    className="mt-0.5 h-4 w-4 accent-amber-600 rounded cursor-pointer shrink-0"
                                  />
                                  <span className={`text-xs break-words ${item.enabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}`}>
                                    {item.text}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVoidCondition(item.id)}
                                  title="Remove condition"
                                  className="opacity-60 hover:opacity-100 text-slate-400 hover:text-red-600 p-1 transition cursor-pointer shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Add New Void Condition Input Form */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newVoidConditionInput}
                            onChange={(e) => setNewVoidConditionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddVoidCondition()
                              }
                            }}
                            placeholder="Add new void condition..."
                            className="flex-1 rounded-sm border border-slate-300 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                          />
                          <button
                            type="button"
                            onClick={handleAddVoidCondition}
                            disabled={!newVoidConditionInput.trim()}
                            className="inline-flex items-center gap-1 rounded-sm bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer-Facing Warranty Policy Terms */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-[#081F5C]" />
                        Official Warranty Policy &amp; Terms
                      </label>
                      <button
                        type="button"
                        onClick={handleResetWarrantyToDefault}
                        className="inline-flex items-center gap-1 text-[11px] text-[#081F5C] hover:underline cursor-pointer font-semibold"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to Default Template
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={warrantySettings.warrantyPolicyTerms}
                      onChange={(e) =>
                        setWarrantySettings((prev) => ({ ...prev, warrantyPolicyTerms: e.target.value }))
                      }
                      className="w-full rounded-sm border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                      placeholder="Enter specific warranty policies, guarantee terms, and customer guidelines..."
                    />
                    <p className="text-[11px] text-slate-400">
                      This policy statement is presented to customers during booking confirmation and on completed service receipts.
                    </p>
                  </div>

                  {/* Claim Resolution Flow Information */}
                  <div className="rounded-md border border-blue-100 bg-blue-50/70 p-3.5 sm:p-4 text-xs text-blue-950 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-[#081F5C]">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>How Warranty Claims Work on E-Paayos:</span>
                    </div>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-700 text-[11px] sm:text-xs">
                      <li>Customer submits a warranty inspection claim under their completed booking history.</li>
                      <li>Your shop receives a priority warranty alert and reviews the issue within 24–48 hours.</li>
                      <li>Upon inspection and verification, eligible repairs or part replacements are fulfilled at zero additional labor cost.</li>
                    </ol>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      All changes are saved and applied to future customer bookings.
                    </span>
                    <button
                      type="submit"
                      disabled={isSavingWarranty}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      {isSavingWarranty ? 'Saving Policy...' : 'Save Warranty Settings'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. NOTIFICATIONS SECTION */}
            {active === SECTIONS.NOTIFICATIONS && (
              <div className="rounded-md border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Notification Preferences</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Manage how you receive real-time repair booking alerts and business updates.
                    </p>
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#081F5C]">
                    <Bell className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 sm:p-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50/70 transition cursor-pointer">
                    <div className="space-y-0.5 pr-4">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">New Booking Requests</p>
                      <p className="text-[11px] sm:text-xs text-slate-500">
                        Receive immediate sound and push notifications when a nearby customer requests auto service.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.pushBookingRequest}
                      onChange={(e) =>
                        setNotificationSettings((prev) => ({ ...prev, pushBookingRequest: e.target.checked }))
                      }
                      className="h-4 w-4 sm:h-5 sm:w-5 accent-[#081F5C] rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 sm:p-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50/70 transition cursor-pointer">
                    <div className="space-y-0.5 pr-4">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">Incoming Chat Messages</p>
                      <p className="text-[11px] sm:text-xs text-slate-500">
                        Get notified when customers or technicians send in-app messages regarding repairs.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.pushMessages}
                      onChange={(e) =>
                        setNotificationSettings((prev) => ({ ...prev, pushMessages: e.target.checked }))
                      }
                      className="h-4 w-4 sm:h-5 sm:w-5 accent-[#081F5C] rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 sm:p-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50/70 transition cursor-pointer">
                    <div className="space-y-0.5 pr-4">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">Weekly Performance Reports</p>
                      <p className="text-[11px] sm:text-xs text-slate-500">
                        Receive a weekly email summary of completed services, employee revenue, and customer ratings.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailReports}
                      onChange={(e) =>
                        setNotificationSettings((prev) => ({ ...prev, emailReports: e.target.checked }))
                      }
                      className="h-4 w-4 sm:h-5 sm:w-5 accent-[#081F5C] rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-700" />
                  <span>Preferences are automatically preserved across your active browser session.</span>
                </div>
              </div>
            )}

            {/* 5. PRIVACY SECTION */}
            {active === SECTIONS.PRIVACY && (
              <div className="rounded-md border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Privacy & Visibility Settings</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Control what shop contact and location details are visible to customers on the map.
                    </p>
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#081F5C]">
                    <Shield className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 sm:p-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50/70 transition cursor-pointer">
                    <div className="space-y-0.5 pr-4">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">Show Contact Number to Customers</p>
                      <p className="text-[11px] sm:text-xs text-slate-500">
                        Allow customers with confirmed bookings to view and call your direct shop hotline number.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.showContactNumber}
                      onChange={(e) =>
                        setPrivacySettings((prev) => ({ ...prev, showContactNumber: e.target.checked }))
                      }
                      className="h-4 w-4 sm:h-5 sm:w-5 accent-[#081F5C] rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 sm:p-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50/70 transition cursor-pointer">
                    <div className="space-y-0.5 pr-4">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">Show Approximate Service Location</p>
                      <p className="text-[11px] sm:text-xs text-slate-500">
                        Display your repair shop pin on the Marinduque customer interactive discovery map.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.showApproximateLocation}
                      onChange={(e) =>
                        setPrivacySettings((prev) => ({ ...prev, showApproximateLocation: e.target.checked }))
                      }
                      className="h-4 w-4 sm:h-5 sm:w-5 accent-[#081F5C] rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 6. SUPPORT SECTION */}
            {active === SECTIONS.SUPPORT && (
              <div className="rounded-md border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Help Center & Support</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Need help managing technicians, services, or payouts? We are here for you.
                    </p>
                  </div>
                  <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#081F5C]">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <div className="rounded-md border border-slate-200 p-4 space-y-2 bg-slate-50/50">
                    <p className="font-semibold text-slate-900">E-Paayos Partner Help Desk</p>
                    <p className="text-slate-600">
                      Reach our merchant operations team directly via email at{' '}
                      <a href="mailto:support@epaayos.com" className="font-semibold text-[#081F5C] underline">
                        support@epaayos.com
                      </a>{' '}
                      or use the in-app Messages tab to chat with support.
                    </p>
                  </div>

                  <div className="rounded-md border border-blue-100 bg-blue-50/80 p-3.5 sm:p-4 text-blue-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-[#081F5C]" />
                      Fast Support Tip
                    </p>
                    <p className="text-xs text-blue-800">
                      When reporting an issue with a customer booking or technician assignment, please provide the Booking ID or Service Request ID for immediate resolution.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </ShopOwnerDashboard>
  )
}
