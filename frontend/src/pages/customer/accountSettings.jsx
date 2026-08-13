import { useEffect, useState, useRef, useMemo } from "react"
import CustomerLayout, { readCustomerUserSession } from "../../layout/customerlayout.jsx"
import { cn } from "../../lib/utils"

import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Bell,
  MapPin,
  CreditCard,
  Camera,
  Upload,
  Trash2,
  Plus,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Edit3,
  Smartphone,
  Globe,
  Building,
  Key,
  ShieldCheck,
  RotateCcw,
  Sliders,
  ChevronRight,
  X,
  Star,
  Wrench,
  Heart,
  Loader2,
  FileText,
  Award,
  Calendar,
  LogOut,
  CheckSquare
} from "lucide-react"

import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Switch } from "../../components/ui/switch"
import { Badge } from "../../components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog"

// ── MARINDUQUE PSGC DATA & HELPERS ──────────────────────────────────────────
export const MARINDUQUE_PROVINCE = "Marinduque"

export const MARINDUQUE_MUNICIPALITIES = [
  "Boac",
  "Mogpog",
  "Gasan",
  "Buenavista",
  "Torrijos",
  "Santa Cruz"
]

export const MARINDUQUE_DATA = {
  Boac: {
    zipCode: "4900",
    barangays: [
      "Amoingon", "Babadit", "Bahi", "Balanacan", "Bamban", "Bangbangalon", "Bantay", 
      "Bayuti", "Binunga", "Boi", "Botoan", "Buliasnin", "Cawa-Cawa", "Center (Poblacion)", 
      "Daig", "Daypay", "Duyay", "Hinapulan", "Ihatub", "Isok 1st (Poblacion)", 
      "Isok 2nd (Poblacion)", "Laylay", "Lupac", "Mahinhin", "Mainit", "Malbog", 
      "Maluso", "Mansiwat", "Mataas Na Bayan (Poblacion)", "Maybo", "Mercado (Poblacion)", 
      "Murallon (Poblacion)", "Ogbac", "Pawa", "Pili", "Poctoy", "Poras", "San Miguel (Poblacion)", 
      "Santol", "Sawi", "Tabi", "Tabing Daan", "Tagdangas", "Tampus (Poblacion)", "Tugos", "Tumagabok"
    ]
  },
  Mogpog: {
    zipCode: "4901",
    barangays: [
      "Anapao", "Argao", "Balanacan", "Banto", "Bintakay", "Bocboc", "Butansapa", 
      "Candahon", "Capayang", "Danao", "Dulong Bayan (Poblacion)", "Gitnang Bayan (Poblacion)", 
      "Hinaking", "Hinapulan", "Ino", "Janagdong", "Lahi", "Laon", "Magapua", "Malayak", 
      "Malusak", "Mampaitan", "Mangyan-Mababad", "Market Site (Poblacion)", "Mataas na Bayan (Poblacion)", 
      "Nangka I", "Nangka II", "Paye", "Pili", "Silangan (Poblacion)", "Sumangga", "Tarug", "Villa Mendez"
    ]
  },
  Gasan: {
    zipCode: "4905",
    barangays: [
      "Antipolo", "Bachao Ibaba", "Bachao Ilaya", "Bacong-Bacong", "Bahi", "Bangwayan", 
      "Banot", "Bognuyan", "Cabugao", "Dawis", "Dili", "Libtangin", "Mahunig", "Mangili", 
      "Masaguisi", "Matandang Gasan", "Pangi", "Pinggan", "Poblacion", "Tabepero", 
      "Tapuyan", "Tupapan"
    ]
  },
  Buenavista: {
    zipCode: "4904",
    barangays: [
      "Bagacing", "Bagtingon", "Bikinis", "Bongoy", "Caigangan", "Daykitin", "Libas", 
      "Lipata", "Malbog", "Sihi", "Timbo", "Tungib-Lipata", "Yook", "Poblacion"
    ]
  },
  Torrijos: {
    zipCode: "4903",
    barangays: [
      "Bangwayan", "Bayakbakin", "Bolo", "Bonliw", "Buangan", "Cabacungan", "Cagpo", 
      "Dampulan", "Kay Duke", "Mabuhay", "Makawayan", "Malibago", "Mannga", "Marinduque", 
      "Maroncop", "Pakaskasan", "Payonas", "Poblacion", "Poctoy", "Sibuyao", "Suha", "Tigwi"
    ]
  },
  SantaCruz: {
    zipCode: "4902",
    barangays: [
      "Alobo", "Angas", "Aturan", "Bagupaye", "Balogo", "Banahaw", "Bangcuang", "Banogao", 
      "Barid", "Botoan", "Buyabod", "Dating Bayan", "Devilla", "Dolores", "Haguimit", 
      "Hupi", "Ipil", "Jolo", "Kilo-kilo", "Labo", "Lamesa", "Landy", "Lapu-lapu", 
      "Libjo", "Lipa", "Makapuyat", "Malibago", "Manamoc", "Maniwaya", "Mapang", "Masaguisi", 
      "Masalukot", "Morales", "Napo", "Pag-asa", "Pantayin", "Polo", "Pulong-Parang", 
      "Punong", "San Antonio", "San Isidro", "Tagum", "Tamayo", "Timbo", "Torrijos"
    ]
  }
}

export function getBarangaysByMunicipality(muni) {
  if (!muni) return MARINDUQUE_DATA.Boac.barangays
  const key = muni.replace(/\s+/g, '')
  return MARINDUQUE_DATA[key]?.barangays || MARINDUQUE_DATA.Boac.barangays
}

export function getZipCodeByMunicipality(muni) {
  if (!muni) return "4900"
  const key = muni.replace(/\s+/g, '')
  return MARINDUQUE_DATA[key]?.zipCode || "4900"
}

// ── NAVIGATION HELPER FOR E-PAAYOS ───────────────────────────────────────────
function useNavigateHelper() {
  return (path) => {
    if (!path) return
    const target = path.startsWith('#')
      ? path
      : `#/customer/${path.replace(/^\/customer\//, '').replace(/^\//, '')}`
    window.location.hash = target
  }
}

// ── DESIGN TOKENS & STYLING UTILITIES (NAVY BLUE BRAND SYSTEM) ───────────────
const controlShadow =
  "shadow-[0_4px_20px_-4px_rgba(15,23,42,0.12)] transition-all duration-200"

const cardShadow =
  "shadow-[0_4px_20px_-4px_rgba(15,23,42,0.14)] transition-all duration-200 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.20)]"

const inputStyle = cn(
  "h-9 w-full rounded-none border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#081F5C]/30 focus:border-[#081F5C] transition-all",
  controlShadow
)

const selectStyle = cn(
  "h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#081F5C]/30 focus:border-[#081F5C] cursor-pointer transition-all",
  controlShadow
)

const primaryBtnStyle =
  "inline-flex items-center justify-center gap-2 rounded-none bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_16px_-4px_rgba(8,31,92,0.45)] transition-all duration-200 hover:shadow-[0_6px_24px_-4px_rgba(8,31,92,0.55)] hover:from-[#081F5C] hover:to-[#04133d] active:scale-[0.98] disabled:opacity-60 sm:text-sm cursor-pointer"

const outlineBtnStyle = cn(
  "inline-flex items-center justify-center gap-2 rounded-none bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#081F5C] hover:border-blue-200 transition-all cursor-pointer",
  controlShadow
)

// ── TABS CONFIGURATION ──────────────────────────────────────────────────────
const TABS = [
  { id: "profile", label: "Profile & Information", icon: User, badge: "Main" },
  { id: "addresses", label: "Service & Delivery Addresses", icon: MapPin, countKey: "addresses" },
  { id: "security", label: "Password & Security", icon: Shield },
  { id: "payment", label: "Payment Methods", icon: CreditCard, countKey: "payments" },
  { id: "notifications", label: "Notifications & Privacy", icon: Bell },
]

// Preset Avatars
const PRESET_AVATARS = [
  { id: "avatar1", label: "Avatar 1", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" },
  { id: "avatar2", label: "Avatar 2", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80" },
  { id: "avatar3", label: "Avatar 3", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80" },
  { id: "avatar4", label: "Avatar 4", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80" },
  { id: "avatar5", label: "Avatar 5", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80" },
]

// Sample Initial E-Paayos Addresses
const INITIAL_ADDRESSES = [
  {
    id: "addr-1",
    label: "Home / Main Residence",
    recipient: "Juan Dela Cruz",
    phone: "+63 917 889 4521",
    street: "123 Sunflower St., Brgy. San Miguel",
    barangay: "San Miguel (Poblacion)",
    city: "Boac",
    province: "Marinduque",
    postalCode: "4900",
    isDefault: true,
    type: "Home",
  },
  {
    id: "addr-2",
    label: "Commercial Workshop Depot",
    recipient: "Juan Dela Cruz (Store)",
    phone: "+63 988 234 5678",
    street: "Market Site, Brgy. Janagdong",
    barangay: "Janagdong",
    city: "Mogpog",
    province: "Marinduque",
    postalCode: "4901",
    isDefault: false,
    type: "Work",
  },
  {
    id: "addr-3",
    label: "Family Farm Property",
    recipient: "Maria Dela Cruz",
    phone: "+63 915 990 1122",
    street: "Unit 4B Agro Commercial Center, Brgy. Pinggan",
    barangay: "Pinggan",
    city: "Gasan",
    province: "Marinduque",
    postalCode: "4905",
    isDefault: false,
    type: "Farm",
  },
]

// Sample Initial Payment Methods for E-Paayos
const INITIAL_PAYMENTS = [
  {
    id: "pay-1",
    type: "GCash",
    accountName: "Juan Dela Cruz",
    accountNumber: "0917••••521",
    isDefault: true,
    badgeColor: "bg-blue-600",
  },
  {
    id: "pay-2",
    type: "Maya",
    accountName: "Juan Dela Cruz",
    accountNumber: "0917••••521",
    isDefault: false,
    badgeColor: "bg-indigo-700",
  },
  {
    id: "pay-3",
    type: "Cash on Service",
    accountName: "Cash Payment upon Job Completion",
    accountNumber: "Standard COD",
    isDefault: false,
    badgeColor: "bg-[#04133d]",
  },
]

export default function AccountSettings() {
  const navigate = useNavigateHelper()
  const fileInputRef = useRef(null)

  // Active Tab state
  const [activeTab, setActiveTab] = useState("profile")

  // Logged User Session from E-Paayos System
  const loggedUser = useMemo(() => {
    return readCustomerUserSession()
  }, [])

  const token = useMemo(() => {
    return localStorage.getItem("token") || ""
  }, [])

  const userId = loggedUser?._id || loggedUser?.id || "guest"

  const addressStorageKey = useMemo(() => {
    return `ep_user_addresses_${userId}`
  }, [userId])

  const paymentStorageKey = useMemo(() => {
    return `ep_user_payments_${userId}`
  }, [userId])

  const notificationStorageKey = useMemo(() => {
    return `ep_user_notifications_${userId}`
  }, [userId])

  // Profile Form State
  const [profile, setProfile] = useState(() => {
    const fn = loggedUser?.fullName
      ? loggedUser.fullName.split(" ")[0]
      : loggedUser?.firstName || "Juan"
    const ln = loggedUser?.fullName
      ? loggedUser.fullName.split(" ").slice(1).join(" ") || "Dela Cruz"
      : loggedUser?.lastName || "Dela Cruz"
    const username = loggedUser?.username || loggedUser?.email?.split("@")[0] || "juandc_epaayos"
    const email = loggedUser?.email || "juan.delacruz@email.com"
    const phone = loggedUser?.contactNumber || loggedUser?.phone || "+63 917 889 4521"
    const avatarUrl = loggedUser?.profileImage || loggedUser?.avatar || loggedUser?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
    const buyerType = loggedUser?.customerType || "Residential Service Client"
    const bio = loggedUser?.bio || "Customer using E-Paayos service booking platform for home & appliance repairs in Marinduque."

    return {
      firstName: fn,
      lastName: ln,
      username,
      email,
      phone,
      dob: loggedUser?.dob || "1994-05-18",
      gender: loggedUser?.gender || "male",
      buyerType,
      bio,
      avatarUrl,
    }
  })

  const [avatarPreview, setAvatarPreview] = useState(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Service & Delivery Addresses State
  const [addresses, setAddresses] = useState(() => {
    try {
      const saved = localStorage.getItem(addressStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.error("Error loading user addresses", e)
    }
    return INITIAL_ADDRESSES
  })

  const saveAddressesToStorage = (newAddresses) => {
    setAddresses(newAddresses)
    try {
      localStorage.setItem(addressStorageKey, JSON.stringify(newAddresses))
    } catch (e) {
      console.error("Error saving addresses", e)
    }
  }

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [addressForm, setAddressForm] = useState({
    label: "",
    recipient: "",
    phone: "",
    street: "",
    city: "Boac",
    barangay: "San Miguel (Poblacion)",
    province: MARINDUQUE_PROVINCE,
    postalCode: "4900",
    type: "Home",
    isDefault: false,
  })

  // Security Form State
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    twoFactor: true,
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Payment Methods State & Modal
  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem(paymentStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.error("Error loading user payments", e)
    }
    return INITIAL_PAYMENTS
  })

  const savePaymentsToStorage = (newPayments) => {
    setPayments(newPayments)
    try {
      localStorage.setItem(paymentStorageKey, JSON.stringify(newPayments))
    } catch (e) {
      console.error("Error saving payments", e)
    }
  }

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    type: "GCash",
    accountName: "",
    accountNumber: "",
    isDefault: false,
  })

  // Notifications State
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(notificationStorageKey)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error("Error loading notifications", e)
    }
    return {
      bookingUpdates: true,
      technicianArrivalAlerts: true,
      priceQuotes: true,
      smsAlerts: true,
      emailDigest: true,
      promotionalOffers: false,
      publicReviews: true,
    }
  })

  const saveNotificationsToStorage = (newNotes) => {
    setNotifications(newNotes)
    try {
      localStorage.setItem(notificationStorageKey, JSON.stringify(newNotes))
    } catch (e) {
      console.error("Error saving notifications", e)
    }
  }

  // Active Sessions Mock Data
  const [sessions, setSessions] = useState([
    { id: "s1", device: "Chrome / Windows 11", location: "Boac, Marinduque, PH", isCurrent: true, lastActive: "Active now" },
    { id: "s2", device: "E-Paayos Mobile App / Android 14", location: "Boac, Marinduque, PH", isCurrent: false, lastActive: "2 hours ago" },
  ])

  // Count metrics for Hero Header
  const bookingsCount = useMemo(() => {
    try {
      const b = localStorage.getItem("ep_customer_bookings")
      if (b) {
        const parsed = JSON.parse(b)
        if (Array.isArray(parsed)) return parsed.length
      }
    } catch (e) {}
    return 6
  }, [])

  const reviewsCount = useMemo(() => {
    try {
      const r = localStorage.getItem("ep_customer_reviews")
      if (r) {
        const parsed = JSON.parse(r)
        if (Array.isArray(parsed)) return parsed.length
      }
    } catch (e) {}
    return 4
  }, [])

  const savedShopsCount = useMemo(() => {
    try {
      const s = localStorage.getItem("ep_saved_shops")
      if (s) {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed.length
      }
    } catch (e) {}
    return 5
  }, [])

  // ── Profile Photo Upload Handlers ──────────────────────────────────────────
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit. Please choose a smaller image.")
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setAvatarPreview(reader.result)
        toast.success("Profile photo preview updated! Click 'Save Profile Changes' to apply.")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSelectPresetAvatar = (url) => {
    setAvatarPreview(url)
    toast.success("Preset avatar selected! Click 'Save Profile Changes' to confirm.")
  }

  const handleRemovePhoto = () => {
    setAvatarPreview(null)
    setProfile((prev) => ({ ...prev, avatarUrl: "" }))
    toast.info("Profile photo cleared. Default initials avatar will be used.")
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setIsSavingProfile(true)

    setTimeout(() => {
      const finalAvatar = avatarPreview || profile.avatarUrl
      const updatedProfile = {
        ...profile,
        avatarUrl: finalAvatar,
      }
      setProfile(updatedProfile)
      setAvatarPreview(null)

      // Sync with localStorage user session for E-Paayos app
      try {
        const rawUser = localStorage.getItem("user")
        if (rawUser) {
          const userObj = JSON.parse(rawUser)
          const updatedUserObj = {
            ...userObj,
            fullName: `${profile.firstName} ${profile.lastName}`.trim(),
            contactNumber: profile.phone,
            phone: profile.phone,
            profileImage: finalAvatar,
            avatar: finalAvatar,
            customerType: profile.buyerType,
            bio: profile.bio,
          }
          localStorage.setItem("user", JSON.stringify(updatedUserObj))
        }
      } catch (err) {
        console.error("Error updating user object in localStorage", err)
      }

      setIsSavingProfile(false)
      toast.success("Account profile successfully updated!")
    }, 500)
  }

  // ── Address Handlers ────────────────────────────────────────────────────────
  const handleOpenAddressModal = (addr = null) => {
    if (addr) {
      const city = addr.city || "Boac"
      const brgys = getBarangaysByMunicipality(city)
      setEditingAddress(addr)
      setAddressForm({
        ...addr,
        city,
        barangay: addr.barangay || brgys[0] || "",
        province: MARINDUQUE_PROVINCE,
        postalCode: addr.postalCode || getZipCodeByMunicipality(city)
      })
    } else {
      setEditingAddress(null)
      const defaultCity = "Boac"
      const boacBrgys = getBarangaysByMunicipality("Boac")
      setAddressForm({
        label: "",
        recipient: `${profile.firstName} ${profile.lastName}`.trim(),
        phone: profile.phone,
        street: "",
        city: defaultCity,
        barangay: boacBrgys[0] || "",
        province: MARINDUQUE_PROVINCE,
        postalCode: getZipCodeByMunicipality(defaultCity),
        type: "Home",
        isDefault: addresses.length === 0,
      })
    }
    setIsAddressModalOpen(true)
  }

  const handleCityChangeInForm = (newCity) => {
    const brgys = getBarangaysByMunicipality(newCity)
    const zip = getZipCodeByMunicipality(newCity)
    setAddressForm((prev) => ({
      ...prev,
      city: newCity,
      barangay: brgys[0] || "",
      postalCode: zip,
    }))
  }

  const handleSaveAddress = (e) => {
    e.preventDefault()
    const recipientName = addressForm.recipient || `${profile.firstName} ${profile.lastName}`.trim()
    if (!recipientName || !addressForm.phone || !addressForm.barangay || !addressForm.street) {
      toast.error("Please fill in recipient name, phone, street, and barangay.")
      return
    }

    const payload = {
      label: addressForm.label || "Service Address",
      recipient: recipientName,
      phone: addressForm.phone,
      street: addressForm.street,
      city: addressForm.city || "Boac",
      barangay: addressForm.barangay || "",
      province: addressForm.province || MARINDUQUE_PROVINCE,
      postalCode: addressForm.postalCode || "4900",
      type: addressForm.type || "Home",
      isDefault: Boolean(addressForm.isDefault)
    }

    let updatedList = []
    if (editingAddress && editingAddress.id) {
      if (payload.isDefault) {
        updatedList = addresses.map((a) => (a.id === editingAddress.id ? { ...a, ...payload } : { ...a, isDefault: false }))
      } else {
        updatedList = addresses.map((a) => (a.id === editingAddress.id ? { ...a, ...payload } : a))
      }
      toast.success("Address successfully updated!")
    } else {
      const newAddr = { ...payload, id: `addr-${Date.now()}` }
      if (payload.isDefault) {
        updatedList = addresses.map((a) => ({ ...a, isDefault: false }))
        updatedList.push(newAddr)
      } else {
        updatedList = [...addresses, newAddr]
      }
      toast.success("New service delivery address added!")
    }

    saveAddressesToStorage(updatedList)
    setIsAddressModalOpen(false)
  }

  const handleDeleteAddress = (id) => {
    const filtered = addresses.filter((a) => a.id !== id)
    saveAddressesToStorage(filtered)
    toast.success("Address removed.")
  }

  const handleSetDefaultAddress = (id) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }))
    saveAddressesToStorage(updated)
    toast.success("Default primary location set!")
  }

  // ── Password Handlers ───────────────────────────────────────────────────────
  const handleUpdatePassword = (e) => {
    e.preventDefault()
    if (!security.currentPassword) {
      toast.error("Please enter your current password.")
      return
    }
    if (security.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.")
      return
    }
    if (security.newPassword !== security.confirmPassword) {
      toast.error("New password and confirm password do not match.")
      return
    }

    setIsUpdatingPassword(true)
    setTimeout(() => {
      setIsUpdatingPassword(false)
      setSecurity((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
      toast.success("Security password changed successfully!")
    }, 600)
  }

  // ── Payment Handlers ───────────────────────────────────────────────────────
  const handleSavePayment = (e) => {
    e.preventDefault()
    if (!paymentForm.accountName || !paymentForm.accountNumber) {
      toast.error("Please provide account name and mobile/account number.")
      return
    }

    let updatedList = payments
    if (paymentForm.isDefault) {
      updatedList = payments.map((p) => ({ ...p, isDefault: false }))
    }

    const newPay = {
      id: `pay-${Date.now()}`,
      ...paymentForm,
      badgeColor: paymentForm.type === "GCash" ? "bg-blue-600" : paymentForm.type === "Maya" ? "bg-indigo-700" : "bg-[#04133d]",
    }

    savePaymentsToStorage([...updatedList, newPay])
    setIsPaymentModalOpen(false)
    setPaymentForm({
      type: "GCash",
      accountName: "",
      accountNumber: "",
      isDefault: false,
    })
    toast.success(`${paymentForm.type} account linked successfully!`)
  }

  const handleDeletePayment = (id) => {
    const updated = payments.filter((p) => p.id !== id)
    savePaymentsToStorage(updated)
    toast.success("Payment method removed.")
  }

  const handleSetDefaultPayment = (id) => {
    const updated = payments.map((p) => ({ ...p, isDefault: p.id === id }))
    savePaymentsToStorage(updated)
    toast.success("Default payment method updated!")
  }

  // ── Notifications Save ─────────────────────────────────────────────────────
  const handleToggleNotification = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] }
    saveNotificationsToStorage(updated)
    toast.success("Notification preferences saved.")
  }

  const userInitials = (profile.firstName[0] || "J") + (profile.lastName[0] || "D")
  const currentDisplayAvatar = avatarPreview || profile.avatarUrl

  return (
    <CustomerLayout activePage="account-settings">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4 sm:space-y-6">

        {/* ── HERO HEADER CARD (NAVY BLUE BRAND SYSTEM) ─────────────────────── */}
        <div className={cn("overflow-hidden rounded-none bg-white ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>

          {/* TOP COLORED MESH BANNER - NAVY BLUE GRADIENT */}
          <div className="relative h-28 sm:h-36 w-full bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,71,166,0.35),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(8,31,92,0.5),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.2),transparent_45%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>

          {/* WHITE SECTION BELOW */}
          <div className="relative px-4 pb-4 sm:px-6 sm:pb-5 bg-white space-y-3">

            {/* Row 1: Overlapping Avatar (Left) + Name & Badges Info */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end text-center sm:text-left">

              {/* Profile Picture Avatar Circle */}
              <div className="relative shrink-0 group self-center sm:self-auto -mt-12 sm:-mt-14 z-20">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-[#04133d] via-[#081F5C] to-[#1447a6] opacity-90 blur-xs group-hover:opacity-100 transition-opacity" />

                <Avatar className="relative size-24 border-4 border-white shadow-xl sm:size-28">
                  {currentDisplayAvatar ? (
                    <AvatarImage src={currentDisplayAvatar} alt={profile.firstName} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xl font-black text-white">
                    {userInitials || "CU"}
                  </AvatarFallback>
                </Avatar>

                {/* Online Status Pulse Badge */}
                <div className="absolute bottom-0.5 left-0.5 flex items-center justify-center size-5 rounded-full bg-white shadow-sm ring-2 ring-white z-10">
                  <span className="relative flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-[#1447a6]"></span>
                  </span>
                </div>

                {/* Camera Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change profile picture"
                  className="absolute bottom-0.5 right-0.5 flex size-8 items-center justify-center rounded-full bg-[#081F5C] text-white shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-white z-10 hover:bg-[#1447a6]"
                >
                  <Camera className="size-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>

              {/* Name, Badges & Email Details */}
              <div className="space-y-0.5 sm:pb-0.5 flex-1">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {profile.firstName} {profile.lastName}
                  </h1>

                  <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#081F5C] rounded-none shadow-2xs">
                    <ShieldCheck className="size-3 text-[#1447a6]" />
                    Verified E-Paayos Customer
                  </span>

                  <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 rounded-none">
                    <Award className="size-3 text-amber-600" />
                    VIP Member
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-600">
                  @{profile.username} • <span className="text-slate-500">{profile.email}</span>
                </p>
              </div>

            </div>

            {/* Row 2: Contact Info Chips (Left) & Quick Stat Cards (Right) */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 border-t border-slate-100">

              {/* Left Side: Contact Info Chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 text-slate-700">
                  <Phone className="size-3.5 text-[#081F5C]" />
                  {profile.phone}
                </span>

                <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 text-slate-700">
                  <MapPin className="size-3.5 text-[#081F5C]" />
                  Boac, Marinduque
                </span>

                <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 text-slate-700">
                  <User className="size-3.5 text-[#081F5C]" />
                  {profile.buyerType}
                </span>
              </div>

              {/* Right Side: 4 Stat Cards */}
              <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-2">

                {/* Bookings Stat */}
                <div
                  onClick={() => navigate('my-bookings')}
                  className="flex flex-col items-center justify-center rounded-none bg-gradient-to-br from-blue-50 to-indigo-100/60 px-3 py-1.5 border border-blue-200/80 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                >
                  <div className="flex items-center gap-1">
                    <Wrench className="size-3.5 text-[#081F5C]" />
                    <span className="text-xs font-black text-slate-900">{bookingsCount}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#081F5C]">Bookings</span>
                </div>

                {/* Addresses Stat */}
                <div
                  onClick={() => setActiveTab('addresses')}
                  className="flex flex-col items-center justify-center rounded-none bg-gradient-to-br from-slate-50 to-blue-100/60 px-3 py-1.5 border border-slate-200 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                >
                  <div className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-[#1447a6]" />
                    <span className="text-xs font-black text-slate-900">{addresses.length}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#1447a6]">Addresses</span>
                </div>

                {/* Reviews Stat */}
                <div
                  onClick={() => navigate('reviews-ratings')}
                  className="flex flex-col items-center justify-center rounded-none bg-gradient-to-br from-amber-50 to-yellow-100/60 px-3 py-1.5 border border-amber-200/80 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                >
                  <div className="flex items-center gap-1">
                    <Star className="size-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-black text-slate-900">{reviewsCount}</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800">Reviews</span>
                </div>

                {/* Favorites Stat */}
                <div
                  onClick={() => navigate('find-services')}
                  className="flex flex-col items-center justify-center rounded-none bg-gradient-to-br from-rose-50 to-pink-100/60 px-3 py-1.5 border border-rose-200/80 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                >
                  <div className="flex items-center gap-1">
                    <Heart className="size-3.5 text-rose-500 fill-rose-500" />
                    <span className="text-xs font-black text-slate-900">{savedShopsCount}</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-800">Saved</span>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ── MAIN CONTENT GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 items-start">

          {/* SIDE NAVIGATION BAR */}
          <div className="lg:col-span-3 lg:sticky lg:top-4 lg:self-start z-10 transition-all">
            <div className={cn("space-y-1 bg-white/95 p-2 sm:p-2.5 ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>
              <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Account Settings
              </div>

              <nav className="flex overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 scrollbar-none gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  const badgeCount =
                    tab.countKey === "addresses"
                      ? addresses.length
                      : tab.countKey === "payments"
                      ? payments.length
                      : undefined

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex shrink-0 items-center justify-between gap-2.5 rounded-none px-3 py-2 text-xs font-semibold transition-all sm:text-sm lg:w-full cursor-pointer text-left",
                        isActive
                          ? "bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-[0_4px_16px_-4px_rgba(8,31,92,0.45)]"
                          : "bg-white text-slate-600 hover:bg-blue-50/70 hover:text-[#081F5C]"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={cn("size-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                        <span className="truncate">{tab.label}</span>
                      </div>

                      {badgeCount !== undefined && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] font-bold rounded-none",
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {badgeCount}
                        </span>
                      )}

                      {tab.badge && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] font-semibold rounded-none",
                            isActive ? "bg-white/20 text-white" : "bg-blue-50 text-[#081F5C]"
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>

              <div className="mt-3 border-t border-slate-100 pt-2.5 px-2">
                <div className="rounded-none bg-slate-50 p-2.5 text-xs text-slate-500 space-y-1 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                    <ShieldCheck className="size-3.5 text-[#081F5C]" />
                    Data Privacy Guarantee
                  </div>
                  <p className="text-[10px] leading-normal text-slate-500">
                    Your details are protected under E-Paayos Encryption standards.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* TAB PANELS */}
          <div className="lg:col-span-9">

            {/* TAB 1: PROFILE & INFORMATION */}
            {activeTab === "profile" && (
              <div className={cn("space-y-4 bg-white/95 p-4 sm:p-5 ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">Personal Profile</h2>
                  <p className="text-xs text-slate-500">
                    Update your display name, contact info, and profile avatar image.
                  </p>
                </div>

                {/* PROFILE PHOTO EDITING SECTION */}
                <div className="rounded-none border border-slate-200/70 bg-slate-50/60 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Camera className="size-3.5 text-[#081F5C]" />
                      Profile Picture & Avatar
                    </h3>
                    {avatarPreview && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-none">
                        Unsaved Preview
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Avatar className="size-16 border-2 border-[#081F5C]/40 shadow-sm shrink-0">
                      {currentDisplayAvatar ? (
                        <AvatarImage src={currentDisplayAvatar} alt={profile.firstName} />
                      ) : null}
                      <AvatarFallback className="bg-[#081F5C] text-lg font-bold text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={primaryBtnStyle}
                        >
                          <Upload className="size-3.5" />
                          Upload Photo
                        </button>

                        {currentDisplayAvatar && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className={outlineBtnStyle}
                          >
                            <Trash2 className="size-3.5 text-rose-500" />
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Supports JPG, PNG or WEBP (Max 5MB).
                      </p>
                    </div>
                  </div>

                  {/* PRESET AVATAR CHOOSER */}
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Quick Select Avatar:</p>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_AVATARS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPresetAvatar(preset.url)}
                          className={cn(
                            "relative rounded-full transition-transform hover:scale-105 active:scale-95 focus:outline-none cursor-pointer",
                            currentDisplayAvatar === preset.url && "ring-2 ring-[#081F5C] ring-offset-1"
                          )}
                        >
                          <Avatar className="size-9 shadow-xs">
                            <AvatarImage src={preset.url} alt={preset.label} />
                          </Avatar>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FORM FIELDS */}
                <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        required
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Last Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        required
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Username <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">@</span>
                        <input
                          type="text"
                          value={profile.username}
                          onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                          required
                          className={cn(inputStyle, "pl-7")}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          required
                          className={inputStyle}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-[#081F5C] text-[10px] px-1.5 py-0.5 font-bold rounded-none">
                          Verified
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        required
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Customer Category
                      </label>
                      <select
                        value={profile.buyerType}
                        onChange={(e) => setProfile({ ...profile, buyerType: e.target.value })}
                        className={selectStyle}
                      >
                        <option value="Residential Service Client">Residential Service Client</option>
                        <option value="Commercial / Business Client">Commercial / Business Client</option>
                        <option value="Appliance & Electronics Owner">Appliance & Electronics Owner</option>
                        <option value="Vehicle / Transport Owner">Vehicle / Transport Owner</option>
                        <option value="Property / Estate Manager">Property / Estate Manager</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={profile.dob}
                        onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Gender
                      </label>
                      <select
                        value={profile.gender}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                        className={selectStyle}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Short Bio & Service Preferences
                    </label>
                    <textarea
                      rows={3}
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Tell service technicians about your preferred appointment times or location landmarks..."
                      className={cn(inputStyle, "h-auto py-2 resize-none")}
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className={primaryBtnStyle}
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="size-4" />
                          Save Profile Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: SERVICE & DELIVERY ADDRESSES */}
            {activeTab === "addresses" && (
              <div className={cn("space-y-4 bg-white/95 p-4 sm:p-5 ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">Service Address Book</h2>
                    <p className="text-xs text-slate-500">
                      Manage home & workshop service locations for fast technician booking & dispatch in Marinduque.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddressModal()}
                    className={primaryBtnStyle}
                  >
                    <Plus className="size-4" />
                    Add Address
                  </button>
                </div>

                {/* ADDRESSES GRID */}
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={cn(
                        "flex flex-col justify-between rounded-none border bg-white p-3.5 transition-all",
                        addr.isDefault
                          ? "border-[#081F5C] ring-2 ring-[#081F5C]/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">{addr.label}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {addr.type}
                            </span>
                          </div>
                          {addr.isDefault && (
                            <span className="bg-[#081F5C] text-white text-[10px] font-bold px-1.5 py-0.5">
                              Default Primary
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 space-y-0.5">
                          <p className="font-semibold text-slate-800">{addr.recipient}</p>
                          <p className="text-slate-500 text-[11px]">{addr.phone}</p>
                          <p className="leading-snug">{addr.street}</p>
                          <p className="text-slate-500 text-[11px]">
                            {addr.barangay ? `${addr.barangay}, ` : ""}{addr.city}, {addr.province} {addr.postalCode}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        {!addr.isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-xs font-semibold text-[#081F5C] hover:underline cursor-pointer"
                          >
                            Set Default
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-[#081F5C] flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Primary Address
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAddressModal(addr)}
                            className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                            title="Edit Address"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PASSWORD & SECURITY */}
            {activeTab === "security" && (
              <div className={cn("space-y-5 bg-white/95 p-4 sm:p-5 ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">Password & Account Security</h2>
                  <p className="text-xs text-slate-500">
                    Manage your account credentials, login security, and active sessions.
                  </p>
                </div>

                {/* CHANGE PASSWORD FORM */}
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Key className="size-3.5 text-[#081F5C]" />
                    Change Password
                  </h3>

                  <div className="space-y-3 max-w-md">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={security.showCurrent ? "text" : "password"}
                          value={security.currentPassword}
                          onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                          placeholder="••••••••"
                          required
                          className={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setSecurity((prev) => ({ ...prev, showCurrent: !prev.showCurrent }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {security.showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={security.showNew ? "text" : "password"}
                          value={security.newPassword}
                          onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                          placeholder="At least 6 characters"
                          required
                          className={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setSecurity((prev) => ({ ...prev, showNew: !prev.showNew }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {security.showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={security.showConfirm ? "text" : "password"}
                          value={security.confirmPassword}
                          onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                          placeholder="Re-enter new password"
                          required
                          className={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setSecurity((prev) => ({ ...prev, showConfirm: !prev.showConfirm }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {security.showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className={primaryBtnStyle}
                    >
                      {isUpdatingPassword ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="size-4" />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* 2-FACTOR AUTHENTICATION TOGGLE */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4 text-[#081F5C]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Two-Factor Authentication (2FA)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500">
                        Require an SMS verification code when signing in from an unrecognized browser.
                      </p>
                    </div>

                    <Switch
                      checked={security.twoFactor}
                      onCheckedChange={(val) => {
                        setSecurity((prev) => ({ ...prev, twoFactor: val }))
                        toast.success(val ? "2FA Authentication enabled!" : "2FA Authentication disabled.")
                      }}
                    />
                  </div>
                </div>

                {/* ACTIVE SESSIONS LIST */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Globe className="size-3.5 text-[#081F5C]" />
                      Active Sessions & Devices
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSessions((prev) => prev.filter((s) => s.isCurrent))
                        toast.success("Other active sessions terminated.")
                      }}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Sign out other sessions
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{sess.device}</span>
                            {sess.isCurrent && (
                              <span className="bg-blue-100 text-[#081F5C] text-[10px] font-bold px-1.5 py-0.5">
                                Current Device
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {sess.location} • <span className="text-slate-400">{sess.lastActive}</span>
                          </p>
                        </div>

                        {!sess.isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              setSessions((prev) => prev.filter((s) => s.id !== sess.id))
                              toast.success("Session revoked.")
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Revoke session"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PAYMENT METHODS */}
            {activeTab === "payment" && (
              <div className={cn("space-y-4 bg-white/95 p-4 sm:p-5 ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">Payment Methods</h2>
                    <p className="text-xs text-slate-500">
                      Manage linked e-wallets, bank cards, or default cash payment preferences for service bookings.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentForm({
                        type: "GCash",
                        accountName: `${profile.firstName} ${profile.lastName}`.trim(),
                        accountNumber: profile.phone,
                        isDefault: payments.length === 0,
                      })
                      setIsPaymentModalOpen(true)
                    }}
                    className={primaryBtnStyle}
                  >
                    <Plus className="size-4" />
                    Link Payment Account
                  </button>
                </div>

                {/* PAYMENTS GRID */}
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                  {payments.map((pay) => (
                    <div
                      key={pay.id}
                      className={cn(
                        "flex flex-col justify-between rounded-none border bg-white p-3.5 transition-all",
                        pay.isDefault
                          ? "border-[#081F5C] ring-2 ring-[#081F5C]/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn("text-white text-[10px] font-bold px-2 py-0.5", pay.badgeColor)}>
                            {pay.type}
                          </span>
                          {pay.isDefault && (
                            <span className="bg-[#081F5C] text-white text-[10px] font-bold px-1.5 py-0.5">
                              Default Method
                            </span>
                          )}
                        </div>

                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-slate-800">{pay.accountName}</p>
                          <p className="text-slate-500 font-mono text-xs">{pay.accountNumber}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        {!pay.isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultPayment(pay.id)}
                            className="text-xs font-semibold text-[#081F5C] hover:underline cursor-pointer"
                          >
                            Set Default
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-[#081F5C] flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Primary Wallet
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeletePayment(pay.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Remove payment method"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: NOTIFICATIONS & PRIVACY */}
            {activeTab === "notifications" && (
              <div className={cn("space-y-5 bg-white/95 p-4 sm:p-5 ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">Notifications & Privacy Preferences</h2>
                  <p className="text-xs text-slate-500">
                    Control how E-Paayos sends updates on booking progress, technician dispatches, and quotes.
                  </p>
                </div>

                <div className="space-y-4">

                  {/* Item 1: Booking Updates */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="space-y-0.5 max-w-lg">
                      <h3 className="text-xs font-bold text-slate-800">Booking Status Updates</h3>
                      <p className="text-xs text-slate-500">
                        Get instant alerts when a technician accepts, starts, or completes your service booking request.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.bookingUpdates}
                      onCheckedChange={() => handleToggleNotification("bookingUpdates")}
                    />
                  </div>

                  {/* Item 2: Technician Arrival Alerts */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="space-y-0.5 max-w-lg">
                      <h3 className="text-xs font-bold text-slate-800">Technician Dispatch & Arrival Alerts</h3>
                      <p className="text-xs text-slate-500">
                        Notifications when a service provider is en route to your Marinduque service location.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.technicianArrivalAlerts}
                      onCheckedChange={() => handleToggleNotification("technicianArrivalAlerts")}
                    />
                  </div>

                  {/* Item 3: Price Quotes & Invoices */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="space-y-0.5 max-w-lg">
                      <h3 className="text-xs font-bold text-slate-800">Price Quotes & Billing Alerts</h3>
                      <p className="text-xs text-slate-500">
                        Notifications when a technician sends cost estimates, diagnostic updates, or service invoices.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.priceQuotes}
                      onCheckedChange={() => handleToggleNotification("priceQuotes")}
                    />
                  </div>

                  {/* Item 4: SMS Notifications */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="space-y-0.5 max-w-lg">
                      <h3 className="text-xs font-bold text-slate-800">SMS Mobile Text Alerts</h3>
                      <p className="text-xs text-slate-500">
                        Receive critical booking updates via SMS on your registered phone number ({profile.phone}).
                      </p>
                    </div>
                    <Switch
                      checked={notifications.smsAlerts}
                      onCheckedChange={() => handleToggleNotification("smsAlerts")}
                    />
                  </div>

                  {/* Item 5: Email Digest */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="space-y-0.5 max-w-lg">
                      <h3 className="text-xs font-bold text-slate-800">Email Summaries & Receipts</h3>
                      <p className="text-xs text-slate-500">
                        Receive official e-receipts and service repair logs at {profile.email}.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailDigest}
                      onCheckedChange={() => handleToggleNotification("emailDigest")}
                    />
                  </div>

                  {/* Item 6: Promotional Offers */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="space-y-0.5 max-w-lg">
                      <h3 className="text-xs font-bold text-slate-800">Promotions & Discount Vouchers</h3>
                      <p className="text-xs text-slate-500">
                        Receive special service coupons and seasonal repair promo codes.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.promotionalOffers}
                      onCheckedChange={() => handleToggleNotification("promotionalOffers")}
                    />
                  </div>

                  {/* Item 7: Public Reviews Visibility */}
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5 max-w-lg">
                      <h3 className="text-xs font-bold text-slate-800">Public Review Profile Visibility</h3>
                      <p className="text-xs text-slate-500">
                        Display your display name on public shop reviews and rating feedback on E-Paayos.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.publicReviews}
                      onCheckedChange={() => handleToggleNotification("publicReviews")}
                    />
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ── ADDRESS MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-none p-0 overflow-hidden border border-slate-200">
          <DialogHeader className="p-4 bg-gradient-to-r from-[#04133d] to-[#081F5C] text-white space-y-1">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="size-4 text-sky-400" />
              {editingAddress ? "Edit Service Address" : "Add New Service Address"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Provide delivery or service dispatch details in Marinduque.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAddress} className="p-4 space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Address Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Home, Main Shop, Farm"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  required
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Location Category
                </label>
                <select
                  value={addressForm.type}
                  onChange={(e) => setAddressForm({ ...addressForm, type: e.target.value })}
                  className={selectStyle}
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work / Office</option>
                  <option value="Shop">Shop / Workshop</option>
                  <option value="Farm">Farm / Property</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Contact Person / Recipient <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={addressForm.recipient}
                  onChange={(e) => setAddressForm({ ...addressForm, recipient: e.target.value })}
                  required
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+63 9XX XXX XXXX"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  required
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Municipality (Marinduque) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addressForm.city}
                  onChange={(e) => handleCityChangeInForm(e.target.value)}
                  className={selectStyle}
                >
                  {MARINDUQUE_MUNICIPALITIES.map((muni) => (
                    <option key={muni} value={muni}>{muni}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Barangay <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addressForm.barangay}
                  onChange={(e) => setAddressForm({ ...addressForm, barangay: e.target.value })}
                  className={selectStyle}
                >
                  {getBarangaysByMunicipality(addressForm.city).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Street Address / House No. / Landmark <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 123 Sunflower St., near Municipal Hall"
                value={addressForm.street}
                onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                required
                className={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Province</label>
                <input
                  type="text"
                  value={MARINDUQUE_PROVINCE}
                  disabled
                  className={cn(inputStyle, "bg-slate-100 text-slate-500 cursor-not-allowed")}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Zip Code</label>
                <input
                  type="text"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  className={inputStyle}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="defaultAddrCheck"
                checked={addressForm.isDefault}
                onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                className="size-4 rounded border-slate-300 text-[#081F5C] focus:ring-[#081F5C] cursor-pointer"
              />
              <label htmlFor="defaultAddrCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Set as primary default address
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className={outlineBtnStyle}
              >
                Cancel
              </button>
              <button type="submit" className={primaryBtnStyle}>
                <Check className="size-4" />
                Save Address
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── PAYMENT MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-none p-0 overflow-hidden border border-slate-200">
          <DialogHeader className="p-4 bg-gradient-to-r from-[#04133d] to-[#081F5C] text-white space-y-1">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="size-4 text-sky-400" />
              Link Payment Method
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Add a GCash, Maya, or payment details for E-Paayos transactions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePayment} className="p-4 space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Payment Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentForm.type}
                onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                className={selectStyle}
              >
                <option value="GCash">GCash Mobile Wallet</option>
                <option value="Maya">Maya Mobile Wallet</option>
                <option value="Cash on Service">Cash on Service (COD)</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Account / Cardholder Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Juan Dela Cruz"
                value={paymentForm.accountName}
                onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })}
                required
                className={inputStyle}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Account Number / Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="0917 XXX XXXX or Card No."
                value={paymentForm.accountNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                required
                className={inputStyle}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="defaultPayCheck"
                checked={paymentForm.isDefault}
                onChange={(e) => setPaymentForm({ ...paymentForm, isDefault: e.target.checked })}
                className="size-4 rounded border-slate-300 text-[#081F5C] focus:ring-[#081F5C] cursor-pointer"
              />
              <label htmlFor="defaultPayCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Set as default payment method
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className={outlineBtnStyle}
              >
                Cancel
              </button>
              <button type="submit" className={primaryBtnStyle}>
                <Check className="size-4" />
                Link Account
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}
