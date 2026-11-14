import { useEffect, useState, useRef, useMemo } from "react"
import CustomerLayout, { readCustomerUserSession } from "../../layout/customerlayout.jsx"
import { cn } from "../../lib/utils"
import { getApiBaseUrl } from "../../lib/apiBaseUrl"
import { resolvePsgcField } from "../../lib/psgcResolve"

import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Bell,
  MapPin,
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
  CheckSquare,
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

export const MARINDUQUE_MUNICIPALITY_CODE_MAP = {
  "174001000": "Boac",
  "174002000": "Buenavista",
  "174003000": "Gasan",
  "174004000": "Mogpog",
  "174005000": "Santa Cruz",
  "174006000": "Torrijos",
}

export const MARINDUQUE_PROVINCE_CODE_MAP = {
  "174000000": "Marinduque",
}

export const MARINDUQUE_BARANGAY_CODE_MAP = {
  "174001001":"Agot","174001002":"Agumaymayan","174001003":"Amoingon","174001004":"Apitong","174001005":"Balagasan","174001006":"Balaring","174001007":"Balimbing","174001008":"Balogo","174001009":"Bangbangalon","174001010":"Bamban","174001011":"Bantad","174001012":"Bantay","174001013":"Bayuti","174001014":"Binunga","174001015":"Boi","174001016":"Boton","174001017":"Buliasnin","174001018":"Bunganay","174001019":"Maligaya","174001020":"Caganhao","174001021":"Canat","174001022":"Catubugan","174001023":"Cawit","174001024":"Daig","174001025":"Daypay","174001026":"Duyay","174001027":"Ihatub","174001028":"Isok II Pob.","174001029":"Hinapulan","174001030":"Laylay","174001031":"Lupac","174001032":"Mahinhin","174001033":"Mainit","174001034":"Malbog","174001035":"Malusak (Pob.)","174001036":"Mansiwat","174001037":"Mataas Na Bayan (Pob.)","174001038":"Maybo","174001039":"Mercado (Pob.)","174001040":"Murallon (Pob.)","174001041":"Ogbac","174001042":"Pawa","174001043":"Pili","174001044":"Poctoy","174001045":"Poras","174001046":"Puting Buhangin","174001047":"Puyog","174001048":"Sabong","174001049":"San Miguel (Pob.)","174001050":"Santol","174001051":"Sawi","174001052":"Tabi","174001053":"Tabigue","174001054":"Tagwak","174001055":"Tambunan","174001056":"Tampus (Pob.)","174001057":"Tanza","174001058":"Tugos","174001059":"Tumagabok","174001060":"Tumapon","174001061":"Isok I (Pob.)",
  "174002001":"Bagacay","174002002":"Bagtingon","174002003":"Bicas-bicas","174002004":"Caigangan","174002005":"Daykitin","174002006":"Libas","174002007":"Malbog","174002011":"Sihi","174002012":"Timbo","174002013":"Tungib-Lipata","174002014":"Yook","174002015":"Barangay I (Pob.)","174002016":"Barangay II (Pob.)","174002017":"Barangay III (Pob.)","174002018":"Barangay IV (Pob.)",
  "174003001":"Antipolo","174003003":"Bachao Ibaba","174003004":"Bachao Ilaya","174003005":"Bacongbacong","174003006":"Bahi","174003007":"Bangbang","174003008":"Banot","174003009":"Banuyo","174003010":"Bognuyan","174003011":"Cabugao","174003012":"Dawis","174003013":"Dili","174003014":"Libtangin","174003015":"Mahunig","174003016":"Mangiliol","174003017":"Masiga","174003018":"Matandang Gasan","174003019":"Pangi","174003020":"Pinggan","174003021":"Tabionan","174003022":"Tapuyan","174003023":"Tiguion","174003024":"Barangay I (Pob.)","174003025":"Barangay II (Pob.)","174003026":"Barangay III (Pob.)",
  "174004001":"Anapog-Sibucao","174004002":"Argao","174004003":"Balanacan","174004004":"Banto","174004005":"Bintakay","174004006":"Bocboc","174004007":"Butansapa","174004008":"Candahon","174004009":"Capayang","174004010":"Danao","174004011":"Dulong Bayan (Pob.)","174004012":"Gitnang Bayan (Pob.)","174004013":"Guisian","174004014":"Hinadharan","174004015":"Hinanggayon","174004016":"Ino","174004017":"Janagdong","174004018":"Lamesa","174004019":"Laon","174004020":"Magapua","174004021":"Malayak","174004022":"Malusak","174004023":"Mampaitan","174004024":"Mangyan-Mababad","174004025":"Market Site (Pob.)","174004026":"Mataas Na Bayan","174004027":"Mendez","174004028":"Nangka I","174004029":"Nangka II","174004030":"Paye","174004032":"Pili","174004033":"Puting Buhangin","174004034":"Sayao","174004035":"Silangan","174004036":"Sumangga","174004037":"Tarug","174004038":"Villa Mendez (Pob.)",
  "174005001":"Alobo","174005002":"Angas","174005003":"Aturan","174005004":"Bagong Silang Pob.","174005005":"Baguidbirin","174005006":"Baliis","174005007":"Balogo","174005008":"Banahaw Pob.","174005009":"Bangcuangan","174005010":"Banogbog","174005011":"Biga","174005012":"Botilao","174005013":"Buyabod","174005014":"Dating Bayan","174005015":"Devilla","174005016":"Dolores","174005017":"Haguimit","174005018":"Hupi","174005019":"Ipil","174005020":"Jolo","174005021":"Kaganhao","174005022":"Kalangkang","174005023":"Kamandugan","174005024":"Kasily","174005025":"Kilo-kilo","174005026":"Kinyaman","174005027":"Labo","174005028":"Lamesa","174005029":"Landy","174005030":"Lapu-lapu Pob.","174005031":"Libjo","174005032":"Lipa","174005033":"Lusok","174005034":"Maharlika Pob.","174005035":"Makulapnit","174005036":"Maniwaya","174005037":"Manlibunan","174005038":"Masaguisi","174005039":"Masalukot","174005040":"Matalaba","174005041":"Mongpong","174005042":"Morales","174005043":"Napo","174005044":"Pag-Asa Pob.","174005045":"Pantayin","174005047":"Polo","174005048":"Pulong-Parang","174005049":"Punong","174005050":"San Antonio","174005051":"San Isidro","174005052":"Tagum","174005053":"Tamayo","174005054":"Tambangan","174005055":"Tawiran","174005056":"Taytay",
  "174006001":"Bangwayin","174006002":"Bayakbakin","174006003":"Bolo","174006004":"Bonliw","174006005":"Buangan","174006006":"Cabuyo","174006007":"Cagpo","174006008":"Dampulan","174006009":"Kay Duke","174006010":"Mabuhay","174006011":"Makawayan","174006012":"Malibago","174006013":"Malinao","174006014":"Maranlig","174006015":"Marlangga","174006016":"Matuyatuya","174006017":"Nangka","174006018":"Pakaskasan","174006019":"Payanas","174006020":"Poblacion","174006021":"Poctoy","174006022":"Sibuyao","174006023":"Suha","174006024":"Talawan","174006025":"Tigwi"
}

export function getReadableMunicipality(cityVal) {
  if (!cityVal) return "Boac"
  const s = String(cityVal).trim()
  if (MARINDUQUE_MUNICIPALITY_CODE_MAP[s]) {
    return MARINDUQUE_MUNICIPALITY_CODE_MAP[s]
  }
  if (!/^\d+$/.test(s)) {
    const found = MARINDUQUE_MUNICIPALITIES.find((m) => m.toLowerCase() === s.toLowerCase())
    return found || s
  }
  return "Boac"
}

export function getReadableProvince(provVal) {
  if (!provVal) return MARINDUQUE_PROVINCE
  const s = String(provVal).trim()
  if (s === "174000000" || MARINDUQUE_PROVINCE_CODE_MAP[s] || /^\d+$/.test(s)) {
    return MARINDUQUE_PROVINCE
  }
  return s
}

export function getReadableBarangay(brgyVal, cityName = "Boac") {
  if (!brgyVal) {
    const list = getBarangaysByMunicipality(cityName)
    return list[0] || ""
  }
  const s = String(brgyVal).trim()
  if (MARINDUQUE_BARANGAY_CODE_MAP[s]) {
    return MARINDUQUE_BARANGAY_CODE_MAP[s]
  }
  if (!/^\d+$/.test(s)) {
    return s
  }
  const list = getBarangaysByMunicipality(cityName)
  return list[0] || s
}

export async function normalizeAddressToText(addr) {
  if (!addr || typeof addr !== "object") return addr

  let city = getReadableMunicipality(addr.city || addr.cityMunicipality)
  let province = getReadableProvince(addr.province)
  let barangay = getReadableBarangay(addr.barangay, city)

  // Extra fallback if code was from another region/external PSGC
  const rawCity = String(addr.city || addr.cityMunicipality || "").trim()
  if (/^\d+$/.test(rawCity) && city === "Boac" && !MARINDUQUE_MUNICIPALITY_CODE_MAP[rawCity]) {
    try {
      const resCity = await resolvePsgcField("city", rawCity)
      if (resCity && !/^\d+$/.test(resCity)) city = resCity
    } catch {}
  }

  const rawBrgy = String(addr.barangay || "").trim()
  if (/^\d+$/.test(rawBrgy) && !MARINDUQUE_BARANGAY_CODE_MAP[rawBrgy]) {
    try {
      const resBrgy = await resolvePsgcField("barangay", rawBrgy)
      if (resBrgy && !/^\d+$/.test(resBrgy)) barangay = resBrgy
    } catch {}
  }

  return {
    ...addr,
    city: /^\d+$/.test(city) ? "Boac" : city,
    barangay: /^\d+$/.test(barangay) ? (getBarangaysByMunicipality(city)[0] || "") : barangay,
    province: /^\d+$/.test(province) ? MARINDUQUE_PROVINCE : province,
    postalCode: addr.postalCode && !/^\d{5,}$/.test(addr.postalCode)
      ? addr.postalCode
      : getZipCodeByMunicipality(city),
  }
}

export function getBarangaysByMunicipality(muni) {
  const cleanMuni = getReadableMunicipality(muni)
  const key = cleanMuni.replace(/\s+/g, '')
  return MARINDUQUE_DATA[key]?.barangays || MARINDUQUE_DATA.Boac.barangays
}

export function getZipCodeByMunicipality(muni) {
  const cleanMuni = getReadableMunicipality(muni)
  const key = cleanMuni.replace(/\s+/g, '')
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

// Detect if an address object was from legacy mock seed data
export function isMockAddress(addr) {
  if (!addr) return true
  const mockIds = ["addr-1", "addr-2", "addr-3"]
  if (mockIds.includes(addr.id)) return true
  if (addr.recipient === "Juan Dela Cruz" && String(addr.street || "").includes("Sunflower")) return true
  if (addr.label === "Family Farm Property" && addr.recipient === "Maria Dela Cruz") return true
  if (addr.label === "Commercial Workshop Depot" && String(addr.street || "").includes("Market Site")) return true
  return false
}

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
    const avatarUrl = loggedUser?.profileImage || loggedUser?.avatar || loggedUser?.avatarUrl || ""
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
        if (Array.isArray(parsed)) {
          const nonMock = parsed
            .filter((a) => !isMockAddress(a))
            .map((a) => {
              const city = getReadableMunicipality(a.city || a.cityMunicipality)
              return {
                ...a,
                city,
                barangay: getReadableBarangay(a.barangay, city),
                province: getReadableProvince(a.province),
                postalCode: a.postalCode && !/^\d{5,}$/.test(a.postalCode) ? a.postalCode : getZipCodeByMunicipality(city),
              }
            })
          if (nonMock.length > 0) return nonMock
        }
      }
    } catch (e) {
      console.error("Error loading user addresses", e)
    }
    return []
  })

  const [isAddressesLoading, setIsAddressesLoading] = useState(true)
  const [isSavingAddresses, setIsSavingAddresses] = useState(false)

  // Primary Default Address Helper
  const defaultAddress = useMemo(() => {
    return addresses.find((a) => a.isDefault) || addresses[0] || null
  }, [addresses])

  const saveAddresses = async (newAddresses) => {
    const cleanList = (newAddresses || [])
      .filter((a) => !isMockAddress(a))
      .map((a) => {
        const city = getReadableMunicipality(a.city || a.cityMunicipality)
        return {
          ...a,
          city,
          barangay: getReadableBarangay(a.barangay, city),
          province: getReadableProvince(a.province),
          postalCode: a.postalCode && !/^\d{5,}$/.test(a.postalCode) ? a.postalCode : getZipCodeByMunicipality(city),
        }
      })
    setAddresses(cleanList)
    try {
      localStorage.setItem(addressStorageKey, JSON.stringify(cleanList))
    } catch (e) {
      console.error("Error saving addresses to localStorage", e)
    }

    const currentToken = localStorage.getItem("token")
    if (currentToken) {
      try {
        setIsSavingAddresses(true)
        const res = await fetch(`${getApiBaseUrl()}/api/users/me/delivery-addresses`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ deliveryAddresses: cleanList }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          console.warn("Could not save delivery addresses to server:", errData?.message)
        }
      } catch (err) {
        console.error("Failed to sync delivery addresses to backend:", err)
      } finally {
        setIsSavingAddresses(false)
      }
    }
  }

  // Hydrate user profile and delivery addresses from database
  useEffect(() => {
    let isMounted = true

    const hydrateUserDataAndAddresses = async () => {
      const activeToken = localStorage.getItem("token")
      if (!activeToken) {
        if (isMounted) setIsAddressesLoading(false)
        return
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data || !isMounted) {
          if (isMounted) setIsAddressesLoading(false)
          return
        }

        // 1. Update Profile details with authentic registered account data
        setProfile((prev) => {
          const fn = data.firstName || (data.fullName ? data.fullName.split(" ")[0] : prev.firstName)
          const ln = data.lastName || (data.fullName ? data.fullName.split(" ").slice(1).join(" ") : prev.lastName)
          const phone = data.phoneNumber || data.phone || prev.phone
          const email = data.email || prev.email
          const username = data.username || (data.email ? data.email.split("@")[0] : prev.username)
          const dob = data.birthdate ? new Date(data.birthdate).toISOString().slice(0, 10) : prev.dob
          const gender = data.gender || prev.gender

          return {
            ...prev,
            firstName: fn,
            lastName: ln,
            phone,
            email,
            username,
            dob,
            gender,
            avatarUrl: data.profileImage || data.avatar || prev.avatarUrl,
          }
        })

        // Also refresh cached user in localStorage
        try {
          const rawLocalUser = localStorage.getItem("user")
          const currentLocalUser = rawLocalUser ? JSON.parse(rawLocalUser) : {}
          localStorage.setItem("user", JSON.stringify({ ...currentLocalUser, ...data }))
        } catch (e) {}

        // 2. Hydrate & sync Delivery Addresses (resolving any numerical codes to text)
        let realAddresses = []
        if (Array.isArray(data.deliveryAddresses) && data.deliveryAddresses.length > 0) {
          realAddresses = await Promise.all(
            data.deliveryAddresses
              .filter((a) => !isMockAddress(a))
              .map(normalizeAddressToText)
          )
        }

        // If backend had no delivery addresses saved yet, check local storage
        if (realAddresses.length === 0) {
          try {
            const saved = localStorage.getItem(addressStorageKey)
            if (saved) {
              const parsed = JSON.parse(saved)
              if (Array.isArray(parsed)) {
                realAddresses = await Promise.all(
                  parsed.filter((a) => !isMockAddress(a)).map(normalizeAddressToText)
                )
              }
            }
          } catch (e) {}
        }

        // If still empty, use user's authentic registration location details as their primary address
        if (realAddresses.length === 0) {
          const hasLocation = Boolean(data.detailedAddress || data.barangay || data.cityMunicipality)
          if (hasLocation) {
            const rawCity = data.cityMunicipality || "Boac"
            const rawBrgy = data.barangay || ""
            const rawProv = data.province || MARINDUQUE_PROVINCE

            const primaryAddr = await normalizeAddressToText({
              id: `addr-${Date.now()}`,
              label: "Home / Primary Address",
              recipient: data.fullName || `${profile.firstName} ${profile.lastName}`.trim(),
              phone: data.phoneNumber || profile.phone,
              street: data.detailedAddress || "",
              barangay: rawBrgy,
              city: rawCity,
              province: rawProv,
              postalCode: data.postalCode || getZipCodeByMunicipality(rawCity),
              type: "Home",
              isDefault: true,
            })
            realAddresses = [primaryAddr]
          }
        }

        // Set genuine addresses state & update localStorage
        setAddresses(realAddresses)
        try {
          localStorage.setItem(addressStorageKey, JSON.stringify(realAddresses))
        } catch (e) {}

        // Sync to backend if backend deliveryAddresses was empty or had numeric codes
        if (realAddresses.length > 0 && (!data.deliveryAddresses || data.deliveryAddresses.length === 0)) {
          fetch(`${getApiBaseUrl()}/api/users/me/delivery-addresses`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${activeToken}`,
            },
            body: JSON.stringify({ deliveryAddresses: realAddresses }),
          }).catch((err) => console.warn("Background address sync error:", err))
        }
      } catch (err) {
        console.error("Failed to load user profile and addresses:", err)
      } finally {
        if (isMounted) setIsAddressesLoading(false)
      }
    }

    hydrateUserDataAndAddresses()

    return () => {
      isMounted = false
    }
  }, [addressStorageKey])

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
      const city = getReadableMunicipality(addr.city || addr.cityMunicipality)
      const brgys = getBarangaysByMunicipality(city)
      const rawBrgy = getReadableBarangay(addr.barangay, city)
      const province = getReadableProvince(addr.province)
      setEditingAddress(addr)
      setAddressForm({
        ...addr,
        label: addr.label || "Home",
        recipient: addr.recipient || `${profile.firstName} ${profile.lastName}`.trim(),
        phone: addr.phone || profile.phone,
        street: addr.street || "",
        city,
        barangay: brgys.includes(rawBrgy) ? rawBrgy : brgys[0] || rawBrgy,
        province,
        postalCode: addr.postalCode || getZipCodeByMunicipality(city),
        type: addr.type || "Home",
        isDefault: Boolean(addr.isDefault),
      })
    } else {
      setEditingAddress(null)
      const defaultCity = getReadableMunicipality(defaultAddress?.city) || "Boac"
      const boacBrgys = getBarangaysByMunicipality(defaultCity)
      const recipientName = `${profile.firstName} ${profile.lastName}`.trim() || loggedUser?.fullName || ""
      setAddressForm({
        label: addresses.length === 0 ? "Home" : "",
        recipient: recipientName,
        phone: profile.phone || loggedUser?.phoneNumber || "",
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
    const cleanCity = getReadableMunicipality(newCity)
    const brgys = getBarangaysByMunicipality(cleanCity)
    const zip = getZipCodeByMunicipality(cleanCity)
    setAddressForm((prev) => ({
      ...prev,
      city: cleanCity,
      barangay: brgys[0] || "",
      postalCode: zip,
    }))
  }

  const handleSaveAddress = async (e) => {
    e.preventDefault()
    const recipientName = (addressForm.recipient || `${profile.firstName} ${profile.lastName}`).trim()
    if (!recipientName) {
      toast.error("Please enter recipient name.")
      return
    }
    if (!addressForm.phone?.trim()) {
      toast.error("Please enter a valid contact phone number.")
      return
    }
    if (!addressForm.street?.trim()) {
      toast.error("Please enter street address, house no., or landmark.")
      return
    }
    if (!addressForm.city?.trim() || !addressForm.barangay?.trim()) {
      toast.error("Please select a municipality and barangay in Marinduque.")
      return
    }

    const resolvedCity = getReadableMunicipality(addressForm.city)
    const resolvedBrgy = getReadableBarangay(addressForm.barangay, resolvedCity)
    const resolvedProv = getReadableProvince(addressForm.province)

    const payload = {
      label: addressForm.label?.trim() || (addressForm.type === "Home" ? "Home Address" : `${addressForm.type} Address`),
      recipient: recipientName,
      phone: addressForm.phone.trim(),
      street: addressForm.street.trim(),
      city: resolvedCity,
      barangay: resolvedBrgy,
      province: resolvedProv,
      postalCode: addressForm.postalCode || getZipCodeByMunicipality(resolvedCity),
      type: addressForm.type || "Home",
      isDefault: Boolean(addressForm.isDefault),
    }

    let updatedList = []
    if (editingAddress && editingAddress.id) {
      if (payload.isDefault) {
        updatedList = addresses.map((a) => (a.id === editingAddress.id ? { ...a, ...payload } : { ...a, isDefault: false }))
      } else {
        const otherDefaults = addresses.filter((a) => a.id !== editingAddress.id && a.isDefault)
        if (!payload.isDefault && otherDefaults.length === 0) {
          payload.isDefault = true
        }
        updatedList = addresses.map((a) => (a.id === editingAddress.id ? { ...a, ...payload } : a))
      }
      toast.success("Service address updated successfully!")
    } else {
      const newAddr = { ...payload, id: `addr-${Date.now()}` }
      if (payload.isDefault || addresses.length === 0) {
        newAddr.isDefault = true
        updatedList = addresses.map((a) => ({ ...a, isDefault: false }))
        updatedList.push(newAddr)
      } else {
        updatedList = [...addresses, newAddr]
      }
      toast.success("New service address added!")
    }

    await saveAddresses(updatedList)
    setIsAddressModalOpen(false)
  }

  const handleDeleteAddress = async (id) => {
    const toDelete = addresses.find((a) => a.id === id)
    let filtered = addresses.filter((a) => a.id !== id)
    if (toDelete?.isDefault && filtered.length > 0) {
      filtered = filtered.map((a, idx) => (idx === 0 ? { ...a, isDefault: true } : a))
    }
    await saveAddresses(filtered)
    toast.success("Address removed.")
  }

  const handleSetDefaultAddress = async (id) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }))
    await saveAddresses(updated)
    toast.success("Default primary service address updated!")
  }

  // ── Password Handlers ───────────────────────────────────────────────────────
  const handleUpdatePassword = async (e) => {
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
    try {
      const token = localStorage.getItem("token") || ""
      const res = await fetch(`${getApiBaseUrl()}/api/users/me/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          currentPassword: security.currentPassword,
          newPassword: security.newPassword,
          confirmPassword: security.confirmPassword,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || "Failed to update password.")
      }

      setSecurity((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
      toast.success(data.message || "Security password changed successfully!")
    } catch (err) {
      toast.error(err.message || "Failed to change password. Please check your credentials.")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // ── Notifications Save ─────────────────────────────────────────────────────
  const handleToggleNotification = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] }
    saveNotificationsToStorage(updated)
    toast.success("Notification preferences saved.")
  }

  const userInitials = String(profile.firstName || profile.lastName || "C").trim().charAt(0).toUpperCase()
  const currentDisplayAvatar = avatarPreview || profile.avatarUrl

  return (
    <CustomerLayout activePage="account-settings">
      <main className="w-full max-w-[1440px] mx-auto px-3.5 sm:px-10 md:px-16 pt-3 sm:pt-5 pb-6 sm:pb-8 space-y-3.5 sm:space-y-5">

        {/* ── HERO HEADER CARD (NAVY BLUE BRAND SYSTEM) ─────────────────────── */}
        <div className={cn("overflow-hidden rounded-none bg-white ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>

          {/* TOP COLORED MESH BANNER - NAVY BLUE GRADIENT */}
          <div className="relative h-20 sm:h-36 w-full bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,71,166,0.35),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(8,31,92,0.5),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.2),transparent_45%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>

          {/* WHITE SECTION BELOW */}
          <div className="relative px-3.5 pb-3.5 sm:px-6 sm:pb-5 bg-white space-y-2.5 sm:space-y-3">

            {/* Row 1: Overlapping Avatar (Left) + Name & Badges Info */}
            <div className="flex flex-col items-center gap-2.5 sm:gap-3 sm:flex-row sm:items-end text-center sm:text-left">

              {/* Profile Picture Avatar Circle */}
              <div className="relative shrink-0 group self-center sm:self-auto -mt-10 sm:-mt-14 z-20">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-[#04133d] via-[#081F5C] to-[#1447a6] opacity-90 blur-xs group-hover:opacity-100 transition-opacity" />

                <Avatar className="relative size-20 sm:size-28 border-3 sm:border-4 border-white shadow-xl">
                  {currentDisplayAvatar ? (
                    <AvatarImage src={currentDisplayAvatar} alt={profile.firstName} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-lg sm:text-xl font-black text-white">
                    {userInitials || "CU"}
                  </AvatarFallback>
                </Avatar>

                {/* Online Status Pulse Badge */}
                <div className="absolute bottom-0.5 left-0.5 flex items-center justify-center size-4 sm:size-5 rounded-full bg-white shadow-sm ring-2 ring-white z-10">
                  <span className="relative flex size-2 sm:size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 sm:size-2.5 bg-[#1447a6]"></span>
                  </span>
                </div>

                {/* Camera Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change profile picture"
                  className="absolute bottom-0.5 right-0.5 flex size-7 sm:size-8 items-center justify-center rounded-full bg-[#081F5C] text-white shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-white z-10 hover:bg-[#1447a6]"
                >
                  <Camera className="size-3.5 sm:size-4" />
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
              <div className="space-y-0.5 sm:pb-0.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 sm:justify-start">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                    {profile.firstName} {profile.lastName}
                  </h1>

                  <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#081F5C] rounded-none shadow-2xs">
                    <ShieldCheck className="size-2.5 sm:size-3 text-[#1447a6]" />
                    Verified Customer
                  </span>

                  <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-900 rounded-none">
                    <Award className="size-2.5 sm:size-3 text-amber-600" />
                    VIP Member
                  </span>
                </div>

                <p className="text-[11px] sm:text-xs font-semibold text-slate-600 truncate">
                  @{profile.username} • <span className="text-slate-500">{profile.email}</span>
                </p>
              </div>

            </div>

            {/* Row 2: Contact Info Chips (Left) & Quick Stat Cards (Right) */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-1 border-t border-slate-100">

              {/* Left Side: Contact Info Chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-0.5 sm:py-1 text-slate-700">
                  <Phone className="size-3 sm:size-3.5 text-[#081F5C]" />
                  {profile.phone}
                </span>

                <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-0.5 sm:py-1 text-slate-700">
                  <MapPin className="size-3 sm:size-3.5 text-[#081F5C]" />
                  {defaultAddress
                    ? `${getReadableMunicipality(defaultAddress.city)}, ${getReadableProvince(defaultAddress.province)}`
                    : "Marinduque"}
                </span>

                <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-0.5 sm:py-1 text-slate-700">
                  <User className="size-3 sm:size-3.5 text-[#081F5C]" />
                  {profile.buyerType}
                </span>
              </div>

              {/* Right Side: 4 Stat Cards */}
              <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2">

                {/* Bookings Stat */}
                <div
                  onClick={() => navigate('my-bookings')}
                  className="flex flex-col items-center justify-center rounded-none bg-gradient-to-br from-blue-50 to-indigo-100/60 px-2 sm:px-3 py-1 sm:py-1.5 border border-blue-200/80 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                >
                  <div className="flex items-center gap-1">
                    <Wrench className="size-3 sm:size-3.5 text-[#081F5C]" />
                    <span className="text-xs sm:text-sm font-black text-slate-900">{bookingsCount}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-[#081F5C]">Bookings</span>
                </div>

                {/* Addresses Stat */}
                <div
                  onClick={() => setActiveTab('addresses')}
                  className="flex flex-col items-center justify-center rounded-none bg-gradient-to-br from-slate-50 to-blue-100/60 px-2 sm:px-3 py-1 sm:py-1.5 border border-slate-200 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                >
                  <div className="flex items-center gap-1">
                    <MapPin className="size-3 sm:size-3.5 text-[#1447a6]" />
                    <span className="text-xs sm:text-sm font-black text-slate-900">{addresses.length}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-[#1447a6]">Addresses</span>
                </div>

                {/* Reviews Stat */}
                <div
                  onClick={() => navigate('reviews-ratings')}
                  className="flex flex-col items-center justify-center rounded-none bg-gradient-to-br from-amber-50 to-yellow-100/60 px-2 sm:px-3 py-1 sm:py-1.5 border border-amber-200/80 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                >
                  <div className="flex items-center gap-1">
                    <Star className="size-3 sm:size-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs sm:text-sm font-black text-slate-900">{reviewsCount}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-800">Reviews</span>
                </div>

                {/* Favorites Stat */}
                <div
                  onClick={() => navigate('find-services')}
                  className="flex flex-col items-center justify-center rounded-none bg-gradient-to-br from-rose-50 to-pink-100/60 px-2 sm:px-3 py-1 sm:py-1.5 border border-rose-200/80 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                >
                  <div className="flex items-center gap-1">
                    <Heart className="size-3 sm:size-3.5 text-rose-500 fill-rose-500" />
                    <span className="text-xs sm:text-sm font-black text-slate-900">{savedShopsCount}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-rose-800">Saved</span>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ── MAIN CONTENT GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3.5 sm:gap-5 lg:grid-cols-12 items-start">

          {/* SIDE NAVIGATION BAR */}
          <div className="lg:col-span-3 lg:sticky lg:top-4 lg:self-start z-10 transition-all">
            <div className={cn("space-y-1 bg-white/95 p-2 sm:p-2.5 ring-1 ring-slate-200/80 backdrop-blur-sm", cardShadow)}>
              <div className="px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Account Settings
              </div>

              <nav className="flex overflow-x-auto pb-1.5 lg:flex-col lg:overflow-visible lg:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  const badgeCount =
                    tab.countKey === "addresses"
                      ? addresses.length
                      : undefined

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex shrink-0 items-center justify-between gap-2 rounded-none px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all lg:w-full cursor-pointer text-left whitespace-nowrap",
                        isActive
                          ? "bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-[0_4px_16px_-4px_rgba(8,31,92,0.45)]"
                          : "bg-white text-slate-600 hover:bg-blue-50/70 hover:text-[#081F5C]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                        <Icon className={cn("size-3.5 sm:size-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                        <span className="truncate">{tab.label}</span>
                      </div>

                      {badgeCount !== undefined && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-none",
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {badgeCount}
                        </span>
                      )}

                      {tab.badge && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold rounded-none",
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
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Preferred time or landmark"
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 sm:text-lg">Service Address Book</h2>
                      {isSavingAddresses && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 font-semibold">
                          <Loader2 className="size-3 animate-spin" /> Syncing...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Saved locations for bookings.
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

                {/* LOADING STATE */}
                {isAddressesLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <Loader2 className="size-6 animate-spin text-[#081F5C]" />
                    <p className="text-xs font-medium text-slate-500">Loading service addresses...</p>
                  </div>
                ) : addresses.length === 0 ? (
                  /* EMPTY STATE (NO MOCK DATA) */
                  <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <div className="size-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mb-3 text-[#081F5C] shadow-2xs">
                      <MapPin className="size-7 text-[#1447a6]" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">No Service Addresses Saved Yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
                      Add your home, office, or workshop service location in Marinduque for fast technician booking & dispatch.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenAddressModal()}
                      className={primaryBtnStyle}
                    >
                      <Plus className="size-4" />
                      Add Your First Service Address
                    </button>
                  </div>
                ) : (
                  /* ADDRESSES GRID */
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                    {addresses.map((addr) => {
                      const typeBadgeStyle =
                        addr.type === "Work"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : addr.type === "Shop"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : addr.type === "Farm"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"

                      return (
                        <div
                          key={addr.id}
                          className={cn(
                            "flex flex-col justify-between rounded-none border bg-white p-3.5 transition-all shadow-2xs",
                            addr.isDefault
                              ? "border-[#081F5C] ring-2 ring-[#081F5C]/15 bg-blue-50/15"
                              : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
                          )}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900">{addr.label}</span>
                                <span className={cn("px-1.5 py-0.5 border text-[10px] font-semibold", typeBadgeStyle)}>
                                  {addr.type || "Home"}
                                </span>
                              </div>
                              {addr.isDefault && (
                                <span className="bg-[#081F5C] text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="size-3 text-sky-300" />
                                  Default Primary
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 space-y-1">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                <User className="size-3.5 text-slate-400 shrink-0" />
                                <span>{addr.recipient}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                <Phone className="size-3.5 text-slate-400 shrink-0" />
                                <span>{addr.phone}</span>
                              </div>
                              <div className="flex items-start gap-1.5 pt-0.5">
                                <MapPin className="size-3.5 text-[#081F5C] shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="leading-snug text-slate-800 font-medium">{addr.street}</p>
                                  {(() => {
                                    const displayCity = getReadableMunicipality(addr.city)
                                    const displayBrgy = getReadableBarangay(addr.barangay, displayCity)
                                    const displayProv = getReadableProvince(addr.province)
                                    const displayZip = addr.postalCode && !/^\d{5,}$/.test(addr.postalCode)
                                      ? addr.postalCode
                                      : getZipCodeByMunicipality(displayCity)
                                    return (
                                      <p className="text-slate-500 text-[11px]">
                                        {displayBrgy ? `${displayBrgy}, ` : ""}
                                        {displayCity}, {displayProv} {displayZip}
                                      </p>
                                    )
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                            {!addr.isDefault ? (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-xs font-semibold text-[#081F5C] hover:underline cursor-pointer"
                              >
                                Set as Default
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-[#081F5C] flex items-center gap-1">
                                <CheckCircle2 className="size-3.5 text-emerald-600" /> Primary Address
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
                      )
                    })}
                  </div>
                )}
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
                          placeholder="Min. 6 characters"
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
                          placeholder="New password"
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

            {/* TAB 4: NOTIFICATIONS & PRIVACY */}
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

      </main>

      {/* ── ADDRESS MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-1.5rem)] sm:max-w-md max-h-[90dvh] flex flex-col gap-0 bg-white rounded-none p-0 overflow-hidden border border-slate-200 shadow-2xl"
        >
          <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-8 items-center justify-center bg-white/15 text-sky-300 border border-white/20 shrink-0">
                  <MapPin className="size-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                    {editingAddress ? "Edit Service Address" : "Add New Service Address"}
                  </DialogTitle>
                  <DialogDescription className="text-[11px] text-blue-100/80 font-normal mt-0.5">
                    Address for service visits.
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="size-8 flex items-center justify-center text-white/75 hover:text-white hover:bg-white/15 transition-colors shrink-0 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveAddress} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Address Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Home"
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
                placeholder="House no., street, landmark"
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
              <button type="submit" disabled={isSavingAddresses} className={primaryBtnStyle}>
                {isSavingAddresses ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving Address...
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Save Address
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}
