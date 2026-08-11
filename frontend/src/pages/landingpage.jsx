import { useEffect, useState, useMemo } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Bike,
  Bot,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Home,
  Laptop,
  LayoutDashboard,
  LogIn,
  MapPin,
  Menu,
  MessageSquare,
  Moon,
  Plug,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Tv,
  UserCheck,
  UserRound,
  Users,
  WashingMachine,
  Wrench,
  X,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import logoEpaayos from '../assets/epaayosLOGO.png'
import headerBackground from '../assets/headerbackground.png'
import gadgetsImg from '../assets/gadgets.png'
import applianceImg from '../assets/applience.png'
import vehiclesImg from '../assets/vehicles.png'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/**
 * E-PAAYOS Branding Palette - Minimal Micro-Radius Theme (rounded-sm / rounded)
 * Deep Navy: #04133d, #081F5C
 * Ice Blue / Periwinkle: #eef2ff, #e0e7ff
 */

export const PUBLIC_CATEGORIES = ['All', 'Appliance', 'Gadget', 'Vehicle', 'Others']

export const SERVICE_TYPES = [
  { value: 'home', label: 'Home service' },
  { value: 'in-shop', label: 'In-shop' },
  { value: 'both', label: 'Both Home service and in-shop' },
]

function serviceTypeBadge(type) {
  const label = SERVICE_TYPES.find((x) => x.value === type)?.label ?? 'Home service'
  return (
    <span className="rounded-sm border border-white/30 bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
      {label}
    </span>
  )
}

function categoryBadgeClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'bg-gradient-to-r from-sky-600 to-blue-700 text-white'
  if (normalized === 'gadget') return 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
  if (normalized === 'appliance') return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
  if (normalized === 'others') return 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
  return 'bg-gradient-to-r from-slate-600 to-slate-800 text-white'
}

function categoryTopBannerImage(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return vehiclesImg
  if (normalized === 'appliance') return applianceImg
  if (normalized === 'gadget') return gadgetsImg
  return headerBackground
}

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return `${first}${second}`.toUpperCase()
}

function staffRoleHeading(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'Mechanics'
  return 'Technicians'
}

function staffAssignedLabel(category, count) {
  const n = Math.max(0, Number(count) || 0)
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') {
    return `${n} ${n === 1 ? 'mechanic' : 'mechanics'} assigned`
  }
  return `${n} ${n === 1 ? 'technician' : 'technicians'} assigned`
}

function formatLaborPriceRange(min, max) {
  const minNum = Number(min)
  const maxNum = Number(max)
  if (!Number.isFinite(minNum) || !Number.isFinite(maxNum) || minNum < 0 || maxNum < 0) return '—'
  return `PHP ${minNum.toLocaleString()} - PHP ${maxNum.toLocaleString()}`
}

/** Fallback Featured Services data matching findServices.jsx structure */
const FALLBACK_PUBLIC_SERVICES = [
  {
    id: 'pub-s1',
    shopName: 'Island Cool Aircon & Appliance Repair',
    shopOwner: 'Juan Dela Cruz',
    serviceName: 'Aircon Cleaning, Freon Refill & Maintenance',
    subcategory: 'In-depth split & window type AC cleaning, leak test & compressor check',
    category: 'Appliance',
    type: 'both',
    shopAddress: 'Boac, Marinduque',
    shopRating: 4.9,
    completedJobs: 142,
    laborRatingMin: 500,
    laborRatingMax: 2200,
    staff: ['Juan Dela Cruz', 'Mark Santos', 'Pedro Reyes'],
    shopPlacePhoto: applianceImg,
  },
  {
    id: 'pub-s2',
    shopName: 'Marinduque Tech & Gadget Clinic',
    shopOwner: 'Ramon Mercado',
    serviceName: 'Smartphone & Laptop Motherboard / Screen Replacement',
    subcategory: 'Water damage diagnosis, LCD replacement & micro-soldering repairs',
    category: 'Gadget',
    type: 'in-shop',
    shopAddress: 'Gasan, Marinduque',
    shopRating: 4.8,
    completedJobs: 98,
    laborRatingMin: 350,
    laborRatingMax: 1800,
    staff: ['Ramon Mercado', 'Alex Tan'],
    shopPlacePhoto: gadgetsImg,
  },
  {
    id: 'pub-s3',
    shopName: 'Boac Express Auto & Motorcycle Repairs',
    shopOwner: 'Carlos Villareal',
    serviceName: 'Motorcycle & Car Engine Tune-Up & Brake Overhaul',
    subcategory: 'CVT cleaning, FI diagnostic scan, oil change & brake shoe replacement',
    category: 'Vehicle',
    type: 'both',
    shopAddress: 'Boac, Marinduque',
    shopRating: 5.0,
    completedJobs: 215,
    laborRatingMin: 300,
    laborRatingMax: 3500,
    staff: ['Carlos Villareal', 'Eduardo Ramos', 'Leo Garcia'],
    shopPlacePhoto: vehiclesImg,
  },
  {
    id: 'pub-s4',
    shopName: 'LMD Electrical & Power Maintenance',
    shopOwner: 'Mariano Garcia',
    serviceName: 'Household Wiring & Power Generator Repair',
    subcategory: 'Short circuit troubleshooting, breaker replacement & motor rewinding',
    category: 'Others',
    type: 'home',
    shopAddress: 'Santa Cruz, Marinduque',
    shopRating: 4.9,
    completedJobs: 76,
    laborRatingMin: 400,
    laborRatingMax: 2000,
    staff: ['Mariano Garcia'],
    shopPlacePhoto: headerBackground,
  },
]

const HERO_SLIDES = [
  {
    id: 1,
    image: headerBackground,
    tagline: 'Web-Based Repair Management System',
    titlePrefix: 'Connect Customers with ',
    titleHighlight: 'Trusted Repair Providers',
    subtitle:
      'E-Paayos centralizes discovery, PESO verification, booking, and communication between customers, repair shops, and on-call technicians across Marinduque.',
    metrics: [
      { val: '500+', label: 'Jobs Completed' },
      { val: '6', label: 'Municipalities' },
      { val: '100%', label: 'PESO Verified' },
    ],
  },
  {
    id: 2,
    image: gadgetsImg,
    tagline: 'Gadget & Appliance Experts',
    titlePrefix: 'Fast & Reliable ',
    titleHighlight: 'Home Service & Shop Repairs',
    subtitle:
      'Book verified technicians for laptops, smartphones, aircons, refrigerators, and electronics with real-time status tracking and direct provider chat.',
    metrics: [
      { val: '24/7', label: 'In-App Support' },
      { val: '4.9★', label: 'Avg Customer Rating' },
      { val: 'Direct', label: 'In-App Messaging' },
    ],
  },
  {
    id: 3,
    image: vehiclesImg,
    tagline: 'Automotive & On-Call Mechanics',
    titlePrefix: 'On-Demand ',
    titleHighlight: 'Vehicle & Roadside Help',
    subtitle:
      'Find verified motorcycle, car, and engine mechanics near you for emergency roadside assistance or scheduled maintenance in Marinduque.',
    metrics: [
      { val: '15 Mins', label: 'Quick Response' },
      { val: 'Boac - Torrijos', label: 'Island Coverage' },
      { val: 'Certified', label: 'Mechanic Skills' },
    ],
  },
  {
    id: 4,
    image: applianceImg,
    tagline: 'LMD-PESO Accredited System',
    titlePrefix: 'Empowering Local ',
    titleHighlight: 'Livelihood & Technicians',
    subtitle:
      'Supporting local Marinduque service providers and repair businesses through official PESO credential screening and job opportunity dispatching.',
    metrics: [
      { val: 'PESO', label: 'Screened Techs' },
      { val: 'Transparent', label: 'Service Quotes' },
      { val: 'Secure', label: 'Bookings' },
    ],
  },
]

const CATEGORIES_OVERVIEW = [
  {
    name: 'Appliance',
    desc: 'Aircon, refrigerators, washing machines & ovens',
    icon: WashingMachine,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  {
    name: 'Gadget',
    desc: 'Laptops, smartphones, PCs, TVs & audio systems',
    icon: Smartphone,
    color: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  },
  {
    name: 'Vehicle',
    desc: 'Motorcycles, cars, tricycles & engine overhauls',
    icon: Bike,
    color: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  },
  {
    name: 'Others',
    desc: 'Household wiring, power tools & custom repairs',
    icon: Wrench,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
]

const PUBLIC_FAQS = [
  {
    question: 'What is E-Paayos?',
    answer:
      'E-Paayos is a web-based repair service management system created to connect residents and households across Marinduque with trusted, LMD-PESO verified repair shops and on-call mechanics/technicians.',
  },
  {
    question: 'How are technicians and repair shops verified?',
    answer:
      'Service providers undergo credential screening and accreditation by LMD-PESO administrators before receiving verified badges on the platform.',
  },
  {
    question: 'Can I request home service repair or shop walk-in?',
    answer:
      'Yes! You can choose between On-Site Home Service (technician visits your location) or Shop Walk-In service based on your convenience.',
  },
  {
    question: 'Which municipalities in Marinduque are covered?',
    answer:
      'E-Paayos supports all six municipalities: Boac, Gasan, Mogpog, Santa Cruz, Buenavista, and Torrijos.',
  },
  {
    question: 'How do repair shops and independent mechanics register?',
    answer:
      'Click "Get Started", select your registration role as "Repair Shop Owner" or "On-Call Technician", fill in your credentials, and submit for LMD-PESO verification.',
  },
]

/** Public Landing Page Catalog Card matching findServices.jsx layout with minimal rounded-sm */
function PublicCatalogServiceCard({ item, isDark }) {
  const topBannerImage = categoryTopBannerImage(item.category)
  const ratingNum = Number(item.shopRating)
  const ratingLabel = Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '5.0'
  const displayedStaff = item.staff ?? [item.shopOwner || 'Technician']

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        window.location.hash = '#/login'
      }}
      className={`group cursor-pointer overflow-hidden rounded-sm border text-left flex flex-col justify-between transition-all duration-300 shadow-md hover:-translate-y-1 ${
        isDark
          ? 'bg-[#0a1836] border-sky-900/50 hover:border-sky-400 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_-8px_rgba(56,189,248,0.25)] text-slate-100'
          : 'bg-white border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.12)] hover:border-[#081F5C] hover:shadow-[0_8px_25px_rgba(8,31,92,0.2)] text-slate-900'
      }`}
    >
      <div>
        {/* Banner Frame */}
        <div
          className="relative h-28 w-full bg-[#04133d] bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(4,19,61,0.88), rgba(8,31,92,0.45)), url(${topBannerImage})`,
          }}
        >
          <div className="absolute inset-0 flex flex-col p-3 justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/40 bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white shadow-xs">
                  {initialsFromName(item.shopOwner || item.shopName)}
                </span>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-white drop-shadow-xs">{item.shopName}</h4>
                  <p className="truncate text-[11px] font-medium text-white/90">Owner: {item.shopOwner || '—'}</p>
                </div>
              </div>

              {/* Category Badge */}
              <Badge className={`shrink-0 rounded-sm border-0 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryBadgeClass(item.category)}`}>
                {item.category}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-1">
              {serviceTypeBadge(item.type)}
              <div className="flex items-center gap-1 rounded-sm border border-white/30 bg-black/40 px-2 py-0.5 backdrop-blur-xs">
                <Star className="h-3 w-3 fill-amber-300 text-amber-200" />
                <span className="text-[11px] font-bold text-white tabular-nums">{ratingLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-2">
          <div className="space-y-1">
            <p className={`text-sm font-extrabold uppercase tracking-wide truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {item.serviceName}
            </p>
            <p className={`text-xs line-clamp-2 leading-snug font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {item.subcategory?.trim() ? item.subcategory.trim() : '—'}
            </p>
          </div>

          <div className={`space-y-1.5 pt-2 text-xs border-t ${isDark ? 'border-sky-900/30 text-slate-300' : 'border-slate-100 text-slate-600'}`}>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-sky-500" />
              <span className="truncate">{item.shopAddress || 'Boac, Marinduque'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wrench className="h-4 w-4 shrink-0 text-sky-500" />
              <span>{item.completedJobs || 0} completed jobs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center text-[10px] font-bold text-sky-500">
                PHP
              </span>
              <span className="font-semibold text-sky-400">
                Labor price: {formatLaborPriceRange(item.laborRatingMin, item.laborRatingMax)}
              </span>
            </div>
          </div>

          <div className={`pt-2.5 border-t ${isDark ? 'border-sky-900/30' : 'border-slate-100'}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
              {staffRoleHeading(item.category)}
            </p>
            <div className="mt-1.5 flex items-center justify-between">
              <div className="inline-flex items-center gap-1">
                {displayedStaff.slice(0, 3).map((name) => (
                  <span
                    key={name}
                    title={name}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-white bg-gradient-to-br from-[#04133d] to-[#1447a6] text-[9px] font-bold text-white shadow-2xs"
                  >
                    {initialsFromName(name)}
                  </span>
                ))}
              </div>
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {staffAssignedLabel(item.category, displayedStaff.length)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <Button
          size="sm"
          className="w-full h-9 rounded-sm bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white font-bold text-xs gap-1.5 shadow-xs uppercase tracking-wider"
        >
          Book Repair Service
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function PublicTopbar({ isDark, toggleTheme, scrollToSection }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Home', target: 'hero' },
    { label: 'About', target: 'about' },
    { label: 'Featured Services', target: 'featured-services' },
    { label: 'Portals', target: 'portals' },
    { label: 'Features', target: 'features' },
    { label: 'Process', target: 'process' },
    { label: 'FAQ', target: 'faq' },
  ]

  const handleNavClick = (target) => {
    scrollToSection(target)
    setMobileMenuOpen(false)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b backdrop-blur-md ${
        isDark
          ? 'bg-[#04133d]/90 border-sky-900/40 text-slate-100'
          : 'bg-white/90 border-slate-200/80 text-slate-800 shadow-xs'
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => handleNavClick('hero')}
          className="flex items-center gap-3 cursor-pointer group text-left"
        >
          <img
            src={logoEpaayos}
            alt="E-PAAYOS"
            className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
          />
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link) => (
            <button
              key={link.target}
              type="button"
              onClick={() => handleNavClick(link.target)}
              className={`px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                isDark
                  ? 'text-slate-200 hover:text-sky-400 hover:bg-sky-950/40'
                  : 'text-slate-700 hover:text-[#081F5C] hover:bg-slate-100'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark / Light Mode Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-sm border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          {/* Sign In Button */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className={`hidden sm:inline-flex h-9 px-4 text-xs font-bold rounded-sm border transition-all uppercase tracking-wider ${
              isDark
                ? 'border-sky-500/30 bg-slate-900/60 text-sky-300 hover:bg-sky-950/60 hover:text-white'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            <a href="#/login">
              <LogIn className="size-3.5 mr-1.5 text-sky-500" />
              Sign In
            </a>
          </Button>

          {/* Get Started Button */}
          <Button
            asChild
            size="sm"
            className="h-9 px-4 sm:px-5 text-xs font-extrabold rounded-sm bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white shadow-md shadow-blue-700/20 uppercase tracking-wider"
          >
            <a href="#/register">
              Get Started
              <ArrowRight className="size-3.5 ml-1.5" />
            </a>
          </Button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-sm border transition-colors ${
              isDark ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-700'
            }`}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden border-b px-4 pt-3 pb-6 space-y-2 shadow-2xl animate-in slide-in-from-top duration-200 ${
            isDark ? 'bg-[#04133d] border-sky-900/50 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {navLinks.map((link) => (
            <button
              key={link.target}
              type="button"
              onClick={() => handleNavClick(link.target)}
              className={`block w-full text-left px-4 py-2.5 rounded-sm text-sm font-semibold uppercase tracking-wider transition-colors ${
                isDark ? 'hover:bg-sky-950/60 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-slate-700/30 flex flex-col gap-2">
            <Button
              asChild
              variant="outline"
              className={`w-full justify-center h-10 rounded-sm font-bold text-xs uppercase tracking-wider ${
                isDark ? 'border-sky-500/30 bg-slate-900 text-sky-300' : 'border-slate-300 text-slate-800'
              }`}
            >
              <a href="#/login">
                <LogIn className="size-4 mr-2 text-sky-500" />
                Sign In to Account
              </a>
            </Button>
            <Button
              asChild
              className="w-full justify-center h-10 rounded-sm bg-gradient-to-r from-blue-700 to-sky-600 text-white font-extrabold text-xs uppercase tracking-wider"
            >
              <a href="#/register">
                Get Started Free
                <ArrowRight className="size-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

export default function LandingPage() {
  const [theme, setTheme] = useState('dark')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedFeaturedCategory, setSelectedFeaturedCategory] = useState('All')
  const [openFaq, setOpenFaq] = useState(0)

  // Live Catalog services state with fallback to findServices.jsx structure
  const [liveServices, setLiveServices] = useState(FALLBACK_PUBLIC_SERVICES)

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  // Attempt to fetch real published services from backend catalog if available
  useEffect(() => {
    fetch(`${API_URL}/api/catalog/shop-services`)
      ? fetch(`${API_URL}/api/catalog/shop-services`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              setLiveServices(data)
            }
          })
          .catch(() => {})
      : null
  }, [])

  const activeSlideData = HERO_SLIDES[currentSlide]

  const scrollToNextSection = () => {
    const el = document.getElementById('about')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const filteredServicesList = useMemo(() => {
    if (selectedFeaturedCategory === 'All') return liveServices
    return liveServices.filter(
      (s) => String(s.category ?? '').toLowerCase() === selectedFeaturedCategory.toLowerCase()
    )
  }, [liveServices, selectedFeaturedCategory])

  return (
    <div
      className={`min-h-screen font-sans selection:bg-sky-500 selection:text-white relative overflow-x-hidden transition-colors duration-300 scroll-smooth ${
        isDark ? 'bg-[#030b21] text-slate-100' : 'bg-gradient-to-br from-[#eef4ff] via-[#f4f8ff] to-[#e6efff] text-slate-800'
      }`}
    >
      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-sm blur-[160px] transition-colors duration-500 ${
            isDark ? 'bg-sky-600/15' : 'bg-blue-300/30'
          }`}
        />
        <div
          className={`absolute top-1/3 -left-40 w-[600px] h-[600px] rounded-sm blur-[170px] transition-colors duration-500 ${
            isDark ? 'bg-indigo-600/15' : 'bg-indigo-200/30'
          }`}
        />
      </div>

      {/* Modern Edge-to-Edge Fixed Topbar Header */}
      <PublicTopbar isDark={isDark} toggleTheme={toggleTheme} scrollToSection={scrollToSection} />

      {/* Spacer for Fixed Topbar */}
      <div aria-hidden className="h-20 shrink-0" />

      {/* Main Content Container */}
      <main className="relative">
        {/* Fixed Hero Section (Pinned under topbar while next section slides over it) */}
        <section id="hero" className="fixed top-20 inset-x-0 z-0 w-full h-[calc(100vh-5rem)] min-h-[600px] max-h-[760px] flex items-center overflow-hidden">
          {/* Background Images Carousel */}
          {HERO_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
              style={{
                backgroundImage: `url('${slide.image}')`,
              }}
            />
          ))}

          {/* Gradient Tint Overlay */}
          <div
            className={`absolute inset-0 transition-colors duration-500 ${
              isDark
                ? 'bg-gradient-to-r from-[#030b21]/95 via-[#030b21]/85 via-50% to-[#030b21]/40'
                : 'bg-gradient-to-r from-[#eef4ff] via-[#eef4ff]/95 via-50% to-[#eef4ff]/40'
            }`}
          />

          {/* Hero Content Container */}
          <div className="relative z-10 w-full px-6 sm:px-12 lg:px-16 py-8 max-w-4xl text-left space-y-4 sm:space-y-6">
            {/* Tagline Pill Badge */}
            <div
              className={`inline-flex items-center gap-2 rounded-sm border px-4 py-1.5 text-xs font-bold shadow-xs backdrop-blur-md transition-all duration-500 ${
                isDark
                  ? 'border-sky-500/40 bg-sky-950/80 text-sky-300'
                  : 'border-blue-500/40 bg-white/95 text-blue-800'
              }`}
            >
              <Sparkles className="size-3.5 text-sky-400 animate-pulse" />
              <span>{activeSlideData.tagline}</span>
            </div>

            {/* Headline */}
            <h1
              className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] transition-all duration-500 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {activeSlideData.titlePrefix}
              <span
                className={`bg-clip-text text-transparent block sm:inline ${
                  isDark
                    ? 'bg-gradient-to-r from-sky-400 via-indigo-300 to-blue-200'
                    : 'bg-gradient-to-r from-blue-700 via-indigo-800 to-sky-700'
                }`}
              >
                {activeSlideData.titleHighlight}
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className={`text-sm sm:text-base leading-relaxed max-w-2xl font-medium transition-all duration-500 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              {activeSlideData.subtitle}
            </p>

            {/* Hero Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 text-sm bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white font-extrabold shadow-lg shadow-blue-700/30 gap-2 rounded-sm uppercase tracking-wider"
              >
                <a href="#/register">
                  <Wrench className="size-4" />
                  Get Started Now
                  <ArrowRight className="size-4" />
                </a>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className={`h-12 px-6 text-sm border font-bold shadow-xs gap-2 rounded-sm uppercase tracking-wider ${
                  isDark
                    ? 'border-sky-500/30 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white'
                    : 'border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <a href="#/login">
                  <LogIn className="size-4 text-sky-500" />
                  Sign In to Account
                </a>
              </Button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
              {activeSlideData.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-sm border backdrop-blur-md shadow-xs transition-colors ${
                    isDark
                      ? 'bg-slate-900/80 border-sky-900/40'
                      : 'bg-white/90 border-slate-200'
                  }`}
                >
                  <p className="text-xl sm:text-2xl font-black text-sky-400">{m.val}</p>
                  <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {m.label}
                  </p>
                </div>
              ))}
              <div
                className={`p-3.5 rounded-sm border backdrop-blur-md shadow-xs transition-colors ${
                  isDark
                    ? 'bg-slate-900/80 border-sky-900/40'
                    : 'bg-white/90 border-slate-200'
                }`}
              >
                <p className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Marinduque
                </p>
                <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Island Wide
                </p>
              </div>
            </div>
          </div>

          {/* Floating Carousel Controls & Slide Indicators */}
          <div className="absolute bottom-6 right-6 sm:right-12 z-20 flex items-center gap-3">
            <button
              type="button"
              onClick={prevSlide}
              className={`p-2 rounded-sm border backdrop-blur-md transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900/80 border-slate-700 text-white/80 hover:text-sky-400'
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:text-blue-700'
              }`}
              title="Previous Slide"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              {HERO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 transition-all rounded-sm cursor-pointer ${
                    idx === currentSlide
                      ? 'w-7 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                      : isDark
                      ? 'w-2 bg-white/40 hover:bg-white/70'
                      : 'w-2 bg-slate-400/60 hover:bg-slate-700'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              className={`p-2 rounded-sm border backdrop-blur-md transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900/80 border-slate-700 text-white/80 hover:text-sky-400'
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:text-blue-700'
              }`}
              title="Next Slide"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Animated Scroll Down Button */}
          <button
            type="button"
            onClick={scrollToNextSection}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer group"
            title="Scroll to next section"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
              Explore
            </span>
            <div className="size-8 rounded-sm bg-sky-500/10 border border-sky-500/30 flex items-center justify-center group-hover:bg-sky-500/20 transition-all">
              <ChevronDown className="size-5 animate-bounce" />
            </div>
          </button>
        </section>

        {/* Spacer for Fixed Hero Section */}
        <div aria-hidden className="h-[calc(100vh-5rem)] min-h-[600px] max-h-[760px] pointer-events-none" />

        {/* Main Content Overlay Sheet (Slides up over fixed Hero with minimal top curve) */}
        <div
          className={`relative z-10 rounded-t-md sm:rounded-t-lg border-t transition-colors duration-300 shadow-[0_-25px_60px_rgba(0,0,0,0.3)] ${
            isDark
              ? 'bg-[#030b21] border-sky-900/40'
              : 'bg-[#f4f8ff] border-slate-200'
          }`}
        >
          {/* About Section */}
          <section id="about" className="mx-auto max-w-7xl px-4 pt-16 pb-14 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span
                className={`inline-flex items-center gap-1.5 rounded-sm border px-3.5 py-1 text-xs font-bold uppercase tracking-wider mb-3 ${
                  isDark
                    ? 'border-sky-500/30 bg-sky-950/60 text-sky-300'
                    : 'border-blue-500/30 bg-blue-50 text-blue-800'
                }`}
              >
                <ShieldCheck className="size-3.5 text-sky-400" />
                LMD-PESO Accredited System
              </span>
              <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                About the E-Paayos Platform
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-sky-400 mx-auto mt-4 rounded-sm" />
            </div>

            {/* 3 Pillars Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div
                className={`p-6 rounded-sm border transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-sky-900/40 hover:border-sky-500/40 shadow-lg'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div
                  className={`size-12 rounded-sm flex items-center justify-center mb-5 ${
                    isDark ? 'bg-sky-950/80 text-sky-400' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <UserCheck className="size-6" />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  PESO Credential Verification
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  LMD-PESO administrator verification ensures all registered technicians and repair shop providers are thoroughly screened and accredited.
                </p>
              </div>

              <div
                className={`p-6 rounded-sm border transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-sky-900/40 hover:border-sky-500/40 shadow-lg'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div
                  className={`size-12 rounded-sm flex items-center justify-center mb-5 ${
                    isDark ? 'bg-indigo-950/80 text-indigo-400' : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  <MapPin className="size-6" />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Location-Based Discovery
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Discover available repair providers nearest to your barangay or municipality across Boac, Gasan, Mogpog, Sta. Cruz, Buenavista, and Torrijos.
                </p>
              </div>

              <div
                className={`p-6 rounded-sm border transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-sky-900/40 hover:border-sky-500/40 shadow-lg'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div
                  className={`size-12 rounded-sm flex items-center justify-center mb-5 ${
                    isDark ? 'bg-sky-950/80 text-sky-300' : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  <Wrench className="size-6" />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Home Service & Shop Booking
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Seamlessly schedule on-site home repair visits or shop appointments with live status updates, direct messaging, and review evaluation.
                </p>
              </div>
            </div>

            {/* Narrative Box */}
            <div
              className={`p-8 sm:p-10 rounded-sm border transition-all ${
                isDark
                  ? 'bg-slate-900/60 border-sky-900/30'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="space-y-4 text-sm sm:text-base leading-relaxed">
                <p className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  <strong>E-Paayos</strong> is a web-based repair service management platform engineered specifically for Marinduque.
                  It bridges households and businesses with accredited service providers, making repair discovery, appointment scheduling, and customer communication fast, transparent, and dependable.
                </p>
                <p className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  By integrating LMD-PESO verification, real-time messaging, and review transparency, E-Paayos strengthens local technicians’ livelihoods while providing peace of mind for every customer needing appliance, gadget, electrical, or vehicle repairs.
                </p>
              </div>
            </div>
          </section>

          {/* Featured Repair Services Showcase matching findServices.jsx catalog cards */}
          <section id="featured-services" className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 lg:px-8 border-t border-sky-900/20">
            <div className="text-center mb-10">
              <span
                className={`inline-flex items-center gap-1.5 rounded-sm border px-3.5 py-1 text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDark
                    ? 'border-sky-500/30 bg-sky-950/60 text-sky-300'
                    : 'border-blue-500/30 bg-blue-50 text-blue-800'
                }`}
              >
                <Award className="size-3.5 text-sky-400" />
                Available Shop & On-Call Services
              </span>
              <h3 className={`text-2xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Featured Repair Services & Supplies
              </h3>
              <p className={`text-xs sm:text-sm mt-2 max-w-xl mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Active listings from verified shops and on-call mechanics across Marinduque.
              </p>

              {/* Filter Category Tabs matching PUBLIC_CATEGORIES */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {PUBLIC_CATEGORIES.map((cat) => {
                  const isActive = selectedFeaturedCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedFeaturedCategory(cat)}
                      className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-700 to-sky-600 text-white shadow-md shadow-blue-700/20 scale-105'
                          : isDark
                          ? 'bg-[#0a1836] text-slate-300 hover:bg-slate-800 hover:text-white border border-sky-900/50'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Services Cards Grid featuring exact findServices.jsx Card Structure */}
            {filteredServicesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredServicesList.map((service) => (
                  <PublicCatalogServiceCard key={service.id} item={service} isDark={isDark} />
                ))}
              </div>
            ) : (
              <div className={`p-8 text-center border rounded-sm max-w-md mx-auto ${
                isDark ? 'bg-[#0a1836] border-sky-900/40 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-xs'
              }`}>
                <Wrench className="size-10 text-sky-400 mx-auto mb-3 opacity-80" />
                <p className="text-sm font-bold uppercase tracking-wider mb-1">No services found in this category</p>
                <p className="text-xs text-slate-400 mb-4">Try selecting another category tab above to explore available repair services.</p>
                <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-sm uppercase">
                  <a href="#/login">View All Services in App</a>
                </Button>
              </div>
            )}

            <div className="mt-10 text-center">
              <Button
                asChild
                size="lg"
                className={`h-11 px-8 rounded-sm font-extrabold text-xs sm:text-sm border shadow-md gap-2 uppercase tracking-wider ${
                  isDark
                    ? 'bg-[#0a1836] hover:bg-sky-950 text-sky-300 border-sky-500/30'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                <a href="#/login">
                  <Search className="size-4 text-sky-500" />
                  Explore All Marinduque Repair Services
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
          </section>

          {/* Multi Platform Portals Preview Section */}
          <section id="portals" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-sky-900/20">
            <div className="text-center mb-12">
              <span
                className={`inline-flex items-center gap-1.5 rounded-sm border px-3.5 py-1 text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDark
                    ? 'border-sky-500/30 bg-sky-950/60 text-sky-300'
                    : 'border-blue-500/30 bg-blue-50 text-blue-800'
                }`}
              >
                Multi-Role Portals
              </span>
              <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Explore E-Paayos System Workspaces
              </h2>
              <p className={`text-xs sm:text-sm mt-2 max-w-xl mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Tailored web portals designed for customers, repair providers, and PESO administrators.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Portal Card */}
              <div
                className={`group p-8 border rounded-sm flex flex-col justify-between transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-sky-900/40 hover:border-sky-500/50 shadow-xl'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-xl'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`size-12 rounded-sm flex items-center justify-center ${
                        isDark ? 'bg-sky-950 text-sky-400' : 'bg-sky-50 text-sky-700'
                      }`}
                    >
                      <Users className="size-6" />
                    </div>
                    <span className="bg-sky-600 text-white font-bold text-[11px] px-3 py-1 rounded-sm uppercase tracking-wider">
                      Customer Workspace
                    </span>
                  </div>

                  <h3 className={`text-xl font-bold mb-3 flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Customer Storefront & Booking
                    <ArrowUpRight className="size-5 text-slate-400 group-hover:text-sky-400 transition-colors" />
                  </h3>

                  <p className={`text-xs sm:text-sm mb-6 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Browse verified repair shops & on-call technicians, filter by municipality, book home service visits, track progress live, and direct message providers.
                  </p>

                  <div className={`space-y-2.5 mb-8 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>Search Repair Shops & On-Call Techs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>On-Site Home Service & Walk-In Booking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>In-App Chat & Review Evaluations</span>
                    </div>
                  </div>
                </div>

                <Button asChild className="w-full h-11 rounded-sm bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white font-bold text-xs gap-2 uppercase tracking-wider">
                  <a href="#/login">
                    Enter Customer Storefront
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>

              {/* Service Provider Portal Card */}
              <div
                className={`group p-8 border rounded-sm flex flex-col justify-between transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-sky-900/40 hover:border-sky-500/50 shadow-xl'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-xl'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`size-12 rounded-sm flex items-center justify-center ${
                        isDark ? 'bg-indigo-950 text-indigo-400' : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      <LayoutDashboard className="size-6" />
                    </div>
                    <span className="bg-indigo-600 text-white font-bold text-[11px] px-3 py-1 rounded-sm uppercase tracking-wider">
                      Provider Workspace
                    </span>
                  </div>

                  <h3 className={`text-xl font-bold mb-3 flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Technician & Repair Console
                    <ArrowUpRight className="size-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  </h3>

                  <p className={`text-xs sm:text-sm mb-6 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Dedicated console for repair shop owners and independent mechanics to manage service offerings, accept incoming job requests, view earnings, and dispatch technicians.
                  </p>

                  <div className={`space-y-2.5 mb-8 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>Manage Service Listings & Pricing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>Accept Booking Requests & Schedule Shifts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>Revenue Analytics & Performance Reports</span>
                    </div>
                  </div>
                </div>

                <Button
                  asChild
                  className={`w-full h-11 rounded-sm font-bold text-xs gap-2 transition-colors uppercase tracking-wider ${
                    isDark
                      ? 'bg-slate-800 hover:bg-sky-600 text-sky-300 hover:text-white'
                      : 'bg-slate-900 hover:bg-blue-700 text-white'
                  }`}
                >
                  <a href="#/register">
                    Register as Service Provider
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>

              {/* LMD-PESO Admin Console Card */}
              <div
                className={`group p-8 border rounded-sm flex flex-col justify-between transition-all ${
                  isDark
                    ? 'bg-slate-900/80 border-sky-900/40 hover:border-sky-500/50 shadow-xl'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-xl'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`size-12 rounded-sm flex items-center justify-center ${
                        isDark ? 'bg-amber-950 text-amber-400' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <ShieldCheck className="size-6" />
                    </div>
                    <span className="bg-amber-500 text-slate-950 font-bold text-[11px] px-3 py-1 rounded-sm uppercase tracking-wider">
                      LMD-PESO Admin
                    </span>
                  </div>

                  <h3 className={`text-xl font-bold mb-3 flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    PESO Administration Console
                    <ArrowUpRight className="size-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                  </h3>

                  <p className={`text-xs sm:text-sm mb-6 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Verification management dashboard for LMD-PESO administrators to evaluate technician credentials, audit system compliance, monitor island activity, and maintain quality assurance.
                  </p>

                  <div className={`space-y-2.5 mb-8 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>Review & Approve Provider Applications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>Island-Wide Activity & Audit Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-sky-400 shrink-0" />
                      <span>Community Livelihood Analytics</span>
                    </div>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full h-11 rounded-sm bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs gap-2 uppercase tracking-wider"
                >
                  <a href="#/login">
                    Launch Admin Console
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {/* Platform Key Features */}
          <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-sky-900/20">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Designed for Transparency, Efficiency & Trust
              </h2>
              <p className={`mt-3 text-sm sm:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Key capabilities empowering customers, repair shops, and technicians across Marinduque.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className={`p-6 border rounded-sm ${
                  isDark ? 'bg-slate-900/70 border-sky-900/40' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div
                  className={`size-12 flex items-center justify-center rounded-sm mb-4 ${
                    isDark ? 'bg-sky-950 text-sky-400' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  LMD-PESO Accreditation
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Government-linked credential screening ensures every service provider meets skill & safety standards.
                </p>
              </div>

              <div
                className={`p-6 border rounded-sm ${
                  isDark ? 'bg-slate-900/70 border-sky-900/40' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div
                  className={`size-12 flex items-center justify-center rounded-sm mb-4 ${
                    isDark ? 'bg-sky-950 text-sky-400' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <MessageSquare className="size-6" />
                </div>
                <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Real-Time Direct Messaging
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Communicate directly with your technician or shop owner for repair quotes, scheduling, and live status.
                </p>
              </div>

              <div
                className={`p-6 border rounded-sm ${
                  isDark ? 'bg-slate-900/70 border-sky-900/40' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div
                  className={`size-12 flex items-center justify-center rounded-sm mb-4 ${
                    isDark ? 'bg-sky-950 text-sky-400' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <Bot className="size-6" />
                </div>
                <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  AI Assistant & Guidance
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Instant AI chatbot guidance for common device issues, troubleshooting tips, and platform navigation.
                </p>
              </div>
            </div>
          </section>

          {/* Product & Service Categories Overview */}
          <section id="categories" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-sky-900/20">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span
                className={`inline-flex items-center gap-1.5 rounded-sm border px-3.5 py-1 text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDark
                    ? 'border-sky-500/30 bg-sky-950/60 text-sky-300'
                    : 'border-blue-500/30 bg-blue-50 text-blue-800'
                }`}
              >
                Coverage
              </span>
              <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Service Categories
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {CATEGORIES_OVERVIEW.map((cat, idx) => {
                const IconComp = cat.icon
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-sm border text-center transition-all ${
                      isDark
                        ? 'bg-slate-900/70 border-sky-900/40 hover:border-sky-500/50'
                        : 'bg-white border-slate-200 shadow-xs hover:shadow-md'
                    }`}
                  >
                    <div className={`size-12 flex items-center justify-center rounded-sm mx-auto mb-3 border ${cat.color}`}>
                      <IconComp className="size-6" />
                    </div>
                    <h4 className={`text-xs sm:text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {cat.name}
                    </h4>
                    <p className={`text-[11px] font-medium leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {cat.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Process Workflow (How E-Paayos Works) */}
          <section id="process" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-sky-900/20">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span
                className={`inline-flex items-center gap-1.5 rounded-sm border px-3.5 py-1 text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDark
                    ? 'border-sky-500/30 bg-sky-950/60 text-sky-300'
                    : 'border-blue-500/30 bg-blue-50 text-blue-800'
                }`}
              >
                Simple Steps
              </span>
              <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                How E-Paayos Works
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div
                className={`p-6 rounded-sm border text-center ${
                  isDark ? 'bg-slate-900/70 border-sky-900/40' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="size-10 bg-gradient-to-r from-blue-700 to-sky-600 text-white font-black text-sm flex items-center justify-center rounded-sm mx-auto mb-4 shadow-md">
                  1
                </div>
                <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Register Account</h4>
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Create your Customer, Repair Shop Owner, or Independent Mechanic profile in seconds.
                </p>
              </div>

              <div
                className={`p-6 rounded-sm border text-center ${
                  isDark ? 'bg-slate-900/70 border-sky-900/40' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="size-10 bg-gradient-to-r from-blue-700 to-sky-600 text-white font-black text-sm flex items-center justify-center rounded-sm mx-auto mb-4 shadow-md">
                  2
                </div>
                <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Discover Services</h4>
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Search nearby providers by category, rating, location, and PESO accreditation status.
                </p>
              </div>

              <div
                className={`p-6 rounded-sm border text-center ${
                  isDark ? 'bg-slate-900/70 border-sky-900/40' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="size-10 bg-gradient-to-r from-blue-700 to-sky-600 text-white font-black text-sm flex items-center justify-center rounded-sm mx-auto mb-4 shadow-md">
                  3
                </div>
                <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Book & Coordinate</h4>
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Schedule home service or shop walk-in, chat directly, and clarify repair quotes.
                </p>
              </div>

              <div
                className={`p-6 rounded-sm border text-center ${
                  isDark ? 'bg-slate-900/70 border-sky-900/40' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="size-10 bg-gradient-to-r from-blue-700 to-sky-600 text-white font-black text-sm flex items-center justify-center rounded-sm mx-auto mb-4 shadow-md">
                  4
                </div>
                <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Complete & Rate</h4>
                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Get your repair completed reliably, track job history, and leave feedback for community trust.
                </p>
              </div>
            </div>
          </section>

          {/* Interactive Accordion FAQ */}
          <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 border-t border-sky-900/20">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Frequently Asked Questions
              </h2>
              <p className={`text-xs sm:text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Quick answers about using E-Paayos in Marinduque.
              </p>
            </div>

            <div className="space-y-3">
              {PUBLIC_FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className={`border rounded-sm overflow-hidden transition-all ${
                    isDark ? 'bg-slate-900/80 border-sky-900/40' : 'bg-white border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                    className={`w-full p-5 text-left font-bold flex items-center justify-between gap-4 text-sm sm:text-base cursor-pointer transition-colors ${
                      isDark ? 'text-white hover:text-sky-400' : 'text-slate-900 hover:text-blue-700'
                    }`}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`size-5 transition-transform duration-200 shrink-0 ${
                        openFaq === idx ? 'rotate-180 text-sky-400' : 'text-slate-400'
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div
                      className={`px-5 pb-5 text-xs sm:text-sm leading-relaxed border-t pt-3 ${
                        isDark ? 'border-sky-900/30 text-slate-300' : 'border-slate-100 text-slate-600'
                      }`}
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Call-To-Action Banner */}
          <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div
              className={`relative overflow-hidden p-8 sm:p-14 text-center text-white rounded-sm shadow-2xl ${
                isDark
                  ? 'bg-gradient-to-r from-blue-950 via-[#04133d] to-indigo-950 border border-sky-500/30'
                  : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600'
              }`}
            >
              <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                  Ready to Experience Safer, Smarter Repair Services in Marinduque?
                </h2>
                <p className="text-sm sm:text-base text-sky-100 font-medium">
                  Join thousands of households, repair shops, and technicians building a connected repair community today.
                </p>
                <div className="pt-4 flex flex-wrap justify-center gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-blue-900 hover:bg-sky-50 font-extrabold px-8 rounded-sm shadow-lg uppercase tracking-wider"
                  >
                    <a href="#/register">Create Free Account</a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/40 bg-white/10 text-white hover:bg-white/20 font-bold px-8 rounded-sm backdrop-blur-md uppercase tracking-wider"
                  >
                    <a href="#/login">Sign In to Dashboard</a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Modern Footer */}
          <footer
            className={`border-t py-12 px-4 sm:px-6 lg:px-8 text-center sm:text-left transition-colors ${
              isDark ? 'bg-[#020718] border-sky-900/40 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="space-y-3">
                <img src={logoEpaayos} alt="E-PAAYOS" className="h-10 w-auto mx-auto sm:mx-0 object-contain" />
                <p className="text-xs leading-relaxed">
                  Web-Based Repair Service Management System facilitating accredited, location-based repair bookings across Marinduque.
                </p>
              </div>

              <div>
                <h5 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Quick Navigation
                </h5>
                <ul className="space-y-2 text-xs">
                  <li>
                    <button type="button" onClick={() => scrollToSection('hero')} className="hover:text-sky-400 cursor-pointer">
                      Home
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => scrollToSection('about')} className="hover:text-sky-400 cursor-pointer">
                      About Platform
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => scrollToSection('featured-services')} className="hover:text-sky-400 cursor-pointer">
                      Featured Services
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => scrollToSection('portals')} className="hover:text-sky-400 cursor-pointer">
                      Portals & Roles
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h5 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Municipalities
                </h5>
                <ul className="grid grid-cols-2 gap-1 text-xs">
                  <li>Boac</li>
                  <li>Gasan</li>
                  <li>Mogpog</li>
                  <li>Santa Cruz</li>
                  <li>Buenavista</li>
                  <li>Torrijos</li>
                </ul>
              </div>

              <div>
                <h5 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Access Portals
                </h5>
                <div className="space-y-2 text-xs">
                  <a href="#/login" className="block hover:text-sky-400 font-semibold">
                    Customer Account Sign In →
                  </a>
                  <a href="#/register" className="block hover:text-sky-400 font-semibold">
                    Register Service Provider →
                  </a>
                  <a href="#/login" className="block hover:text-sky-400 font-semibold">
                    LMD-PESO Admin Portal →
                  </a>
                </div>
              </div>
            </div>

            <div className="mx-auto max-w-7xl pt-6 border-t border-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
              <p>© {new Date().getFullYear()} E-Paayos Marinduque. All rights reserved.</p>
              <p className="text-[11px] text-slate-500">
                Development of a Web-Based Repair Service Management System in Marinduque
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
