import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  LayoutList,
  MapPin,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import logoEpaayos from '../assets/epaayosLOGO.png'
import headerBackground from '../assets/headerbackground.png'

/**
 * Palette (3 pillars):
 * — Gradient navy blue
 * — Gradient light blue-violet
 * — White (+ navy-tinted text for readability on light areas)
 */
const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const navyGlow = '#2a63cc'

const bvIce = '#eef2ff'
const bvPeriwinkle = '#e0e7ff'
const bvLilac = '#e9e5ff'
const bvSoft = '#c7d2fe'
const bvViolet = '#a5b4fc'

const borderNavySoft = 'rgba(8, 31, 92, 0.12)'
const borderBvSoft = 'rgba(99, 102, 241, 0.18)'
const textBodyOnLight = 'rgba(8, 31, 92, 0.72)'

const gradientNavyButton = `linear-gradient(135deg, ${navy} 0%, ${navyMuted} 42%, ${navyBright} 78%, ${navyGlow} 100%)`
const gradientNavyFooter = `linear-gradient(180deg, ${navyBright} 0%, ${navy} 45%, ${navyDeep} 100%)`

const gradientLightBlueViolet = `linear-gradient(155deg, #ffffff 0%, ${bvIce} 28%, ${bvPeriwinkle} 55%, ${bvLilac} 100%)`
const gradientLightBlueVioletAlt = `linear-gradient(135deg, #ffffff 0%, ${bvIce} 40%, #f5f3ff 100%)`
const gradientBlueVioletButton = `linear-gradient(135deg, ${bvPeriwinkle} 0%, ${bvSoft} 45%, ${bvViolet} 100%)`

/** Hero mesh: navy atmosphere + light blue-violet glows */
const gradientHeroMesh = `
  radial-gradient(ellipse 85% 65% at 100% -8%, rgba(147, 197, 253, 0.28) 0%, transparent 52%),
  radial-gradient(ellipse 75% 55% at -5% 105%, rgba(167, 139, 250, 0.22) 0%, transparent 50%),
  radial-gradient(ellipse 55% 45% at 88% 92%, ${navyGlow}44 0%, transparent 52%),
  radial-gradient(ellipse 70% 50% at 15% 20%, rgba(255, 255, 255, 0.07) 0%, transparent 48%)
`

const HERO_TYPEWRITER_TITLES = [
  {
    line1: 'Connect Customers with',
    line2: 'Trusted Repair Providers. . .',
  },
  {
    line1: 'Discover Verified',
    line2: 'Technicians in Marinduque. . .',
  },
]
const HERO_TYPEWRITER_CHAR_MS = 62
const HERO_TYPEWRITER_LINE_PAUSE_MS = 520
const HERO_TYPEWRITER_HOLD_MS = 10000
const HERO_TYPEWRITER_FADE_MS = 900

function HeroBackgroundLayers() {
  return (
    <div className="relative h-full w-full">
      <img
        src={headerBackground}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover object-[center_42%] motion-reduce:scale-100"
        decoding="async"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `${gradientHeroMesh}, linear-gradient(180deg, rgba(4, 19, 61, 0.82) 0%, rgba(4, 19, 61, 0.74) 20%, rgba(8, 31, 92, 0.62) 45%, rgba(4, 19, 61, 0.58) 68%, rgba(4, 19, 61, 0.72) 82%, rgba(4, 19, 61, 0.78) 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-sky-400/20 blur-3xl sm:size-96"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-1/4 size-64 rounded-full bg-violet-500/15 blur-3xl sm:size-80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-56 sm:h-72 lg:h-[22rem]"
        style={{
          background: `linear-gradient(to top,
            ${bvIce} 0%,
            rgba(238, 242, 255, 0.97) 6%,
            rgba(224, 231, 255, 0.9) 14%,
            rgba(199, 210, 254, 0.72) 28%,
            rgba(165, 180, 252, 0.52) 42%,
            rgba(120, 140, 190, 0.36) 56%,
            rgba(8, 31, 92, 0.48) 70%,
            rgba(4, 19, 61, 0.62) 84%,
            rgba(4, 19, 61, 0.42) 93%,
            transparent 100%)`,
        }}
      />
    </div>
  )
}

function HeroTypewriterCursor({ className = 'text-white' }) {
  return (
    <span
      className={`ml-1 inline-block h-[0.72em] w-[1.5px] rounded-full bg-current animate-pulse align-middle motion-reduce:hidden shadow-[0_0_10px_currentColor] ${className}`}
      aria-hidden
    />
  )
}

function HeroTypewriterTitle() {
  const [titleIndex, setTitleIndex] = useState(0)
  const [line1Count, setLine1Count] = useState(0)
  const [line2Count, setLine2Count] = useState(0)
  const [phase, setPhase] = useState('typing1')
  const [reducedMotion, setReducedMotion] = useState(false)

  const currentTitle = HERO_TYPEWRITER_TITLES[titleIndex]

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncReducedMotion = () => setReducedMotion(mediaQuery.matches)
    syncReducedMotion()
    mediaQuery.addEventListener('change', syncReducedMotion)
    return () => mediaQuery.removeEventListener('change', syncReducedMotion)
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      setLine1Count(HERO_TYPEWRITER_TITLES[0].line1.length)
      setLine2Count(HERO_TYPEWRITER_TITLES[0].line2.length)
      setTitleIndex(0)
      setPhase('hold')
      return undefined
    }

    let timerId = 0
    const { line1: fullLine1, line2: fullLine2 } = currentTitle

    if (phase === 'typing1') {
      if (line1Count < fullLine1.length) {
        timerId = window.setTimeout(() => setLine1Count((count) => count + 1), HERO_TYPEWRITER_CHAR_MS)
      } else {
        timerId = window.setTimeout(() => setPhase('typing2'), HERO_TYPEWRITER_LINE_PAUSE_MS)
      }
    } else if (phase === 'typing2') {
      if (line2Count < fullLine2.length) {
        timerId = window.setTimeout(() => setLine2Count((count) => count + 1), HERO_TYPEWRITER_CHAR_MS)
      } else {
        timerId = window.setTimeout(() => setPhase('hold'), HERO_TYPEWRITER_LINE_PAUSE_MS)
      }
    } else if (phase === 'hold') {
      timerId = window.setTimeout(() => setPhase('fadeOut'), HERO_TYPEWRITER_HOLD_MS)
    } else if (phase === 'fadeOut') {
      timerId = window.setTimeout(() => {
        setLine1Count(0)
        setLine2Count(0)
        setTitleIndex((index) => (index + 1) % HERO_TYPEWRITER_TITLES.length)
        setPhase('typing1')
      }, HERO_TYPEWRITER_FADE_MS)
    }

    return () => window.clearTimeout(timerId)
  }, [phase, line1Count, line2Count, reducedMotion, currentTitle])

  const line1 = currentTitle.line1.slice(0, line1Count)
  const line2 = currentTitle.line2.slice(0, line2Count)
  const isFading = phase === 'fadeOut'
  const showLine1Cursor = !reducedMotion && phase === 'typing1'
  const showLine2Cursor = !reducedMotion && phase === 'typing2'

  return (
    <h1
      className="text-[clamp(1.85rem,4vw,3.15rem)] font-extrabold leading-[1.1] tracking-tight text-white"
      aria-label={`${currentTitle.line1} ${currentTitle.line2}`}
    >
      <div
        className={`space-y-1 transition-opacity duration-900 ease-out motion-reduce:transition-none sm:space-y-1.5 ${
          isFading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className="block font-extrabold text-white">
          {line1}
          {showLine1Cursor ? <HeroTypewriterCursor className="text-white" /> : null}
        </span>
        <span
          className="block min-h-[1.1em] bg-clip-text font-extrabold text-transparent"
          style={{
            backgroundImage: `linear-gradient(115deg, #ffffff 0%, ${bvPeriwinkle} 42%, ${bvSoft} 88%)`,
          }}
        >
          {line2}
          {showLine2Cursor ? <HeroTypewriterCursor className="text-sky-200" /> : null}
        </span>
      </div>
    </h1>
  )
}

function LandingPublicHeader({ navItems, onSectionNavigate, coverMode }) {
  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        coverMode
          ? 'border-b border-white/5 bg-white/[0.04] backdrop-blur-xl'
          : 'border-b bg-white/95 shadow-sm backdrop-blur-md'
      }`}
      style={coverMode ? undefined : { borderColor: borderNavySoft }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8">
        <button
          type="button"
          className="flex shrink-0 items-center"
          aria-label="E-Paayos — scroll to top"
          onClick={() => onSectionNavigate('hero')}
        >
          <img
            src={logoEpaayos}
            alt="E-PAAYOS"
            className={`h-9 w-auto max-h-11 max-w-[min(72vw,260px)] object-contain object-left transition sm:h-11 ${
              coverMode ? 'brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]' : ''
            }`}
            decoding="async"
          />
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                coverMode
                  ? 'text-white/90 hover:bg-white/10 hover:text-white'
                  : 'hover:bg-slate-100/80'
              }`}
              style={coverMode ? undefined : { color: navy }}
              onClick={() => onSectionNavigate(item.target)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            className={`transition ${
              coverMode
                ? 'border-white/30 bg-white/10 text-white backdrop-blur-md hover:border-white/50 hover:bg-white/18'
                : 'bg-white hover:bg-white'
            }`}
            style={coverMode ? undefined : { borderColor: borderNavySoft, color: navy }}
            onClick={() => { window.location.hash = '#/login' }}
          >
            Sign In
          </Button>
          <Button
            size="sm"
            className="border-0 text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg"
            style={{ backgroundImage: gradientNavyButton }}
            onClick={() => { window.location.hash = '#/register' }}
          >
            Get Started
          </Button>
        </div>
      </div>
    </header>
  )
}

function LandingPage() {
  const [headerCoverMode, setHeaderCoverMode] = useState(true)

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    const onScroll = () => {
      setHeaderCoverMode(window.scrollY < window.innerHeight * 0.92)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = [
    { label: 'Home', target: 'hero' },
    { label: 'Features', target: 'features' },
    { label: 'About', target: 'about' },
    { label: 'Process', target: 'process' },
    { label: 'Contact', target: 'contact' },
  ]

  const coreFeatures = [
    {
      title: 'Verified Service Providers',
      description: 'LMD-PESO verification helps customers connect with trusted and screened technicians.',
    },
    {
      title: 'Location-Based Discovery',
      description: 'Find nearby repair shops or On-call Mechanic/Technician providers within Marinduque quickly.',
    },
    {
      title: 'Home Service Booking',
      description: 'Book at-home repair services for appliances, gadgets, and vehicles with ease.',
    },
    {
      title: 'Direct Messaging',
      description: 'Communicate instantly with service providers for updates, schedules, and concerns.',
    },
    {
      title: 'Ratings and Reviews',
      description: 'Check feedback and evaluate quality to choose the right technician confidently.',
    },
    {
      title: 'Basic Chatbot Support',
      description: 'Get quick guidance on common questions and platform navigation anytime.',
    },
  ]

  const beneficiaries = [
    'LMD-PESO administrators',
    'Repair shop owners',
    'On-call Mechanic/Technician providers',
    'Customers and households',
    'Local Marinduque community',
  ]

  const heroHighlights = [
    { icon: ShieldCheck, label: 'Verified providers' },
    { icon: MapPin, label: 'Marinduque-wide' },
    { icon: LayoutList, label: 'Book & chat in one app' },
  ]

  const heroContent = (
    <div className="mx-auto w-full max-w-2xl space-y-5 text-center sm:space-y-6 lg:mx-0 lg:max-w-3xl lg:text-left">
      <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_32px_rgba(4,19,61,0.2)] backdrop-blur-md sm:text-xs lg:justify-start">
        Web-Based Repair Service Management System
      </p>

      <HeroTypewriterTitle />

      <p className="mx-auto max-w-xl text-pretty text-base leading-relaxed text-white/82 sm:text-lg lg:mx-0 lg:max-w-2xl">
        E-Paayos centralizes discovery, verification, booking, and communication between customers,
        repair shops, and on-call technicians across Marinduque.
      </p>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:justify-center lg:mx-0 lg:max-w-none lg:justify-start">
        <Button
          type="button"
          className="h-12 w-full min-w-0 flex-row items-center justify-center gap-2 rounded-full border-0 px-7 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(8,31,92,0.48)] transition hover:-translate-y-0.5 hover:brightness-110 sm:w-auto sm:text-base"
          style={{ backgroundImage: gradientNavyButton }}
          onClick={() => { window.location.hash = '#/register' }}
        >
          <Wrench className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
          Register now
          <ChevronRight className="h-4 w-4 shrink-0 opacity-90 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full min-w-0 flex-row items-center justify-center gap-2 rounded-full border-white/35 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/55 hover:bg-white/18 sm:w-auto sm:text-base"
          onClick={() => scrollToSection('features')}
        >
          <LayoutList className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
          Explore features
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-nowrap items-center justify-center gap-1.5 overflow-x-auto pt-1 [scrollbar-width:none] [-ms-overflow-style:none] sm:gap-2 lg:mx-0 lg:justify-start [&::-webkit-scrollbar]:hidden">
        {heroHighlights.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/18 bg-white/8 px-2.5 py-1.5 text-[10px] font-medium text-white/85 backdrop-blur-md sm:gap-2 sm:px-3.5 sm:py-2 sm:text-xs"
          >
            <Icon className="size-3.5 shrink-0 text-sky-200 sm:size-4" aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-white" style={{ color: textBodyOnLight }}>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 hidden h-dvh overflow-hidden lg:block"
        style={{ backgroundColor: navyDeep }}
        aria-hidden
      >
        <HeroBackgroundLayers />
      </div>

      <LandingPublicHeader
        navItems={navItems}
        onSectionNavigate={scrollToSection}
        coverMode={headerCoverMode}
      />

      <main className="relative w-full min-w-0 overflow-x-hidden">
        <section id="hero" className="relative h-dvh min-h-dvh w-full overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden lg:hidden"
            style={{ backgroundColor: navyDeep }}
            aria-hidden
          >
            <HeroBackgroundLayers />
          </div>

          <div className="relative z-10 flex h-dvh min-h-dvh flex-col text-white lg:pointer-events-none lg:fixed lg:inset-x-0 lg:top-0 lg:z-10 lg:h-dvh">
            <div className="pointer-events-auto mx-auto flex w-full max-w-7xl flex-1 min-h-0 items-center px-4 pt-[4.5rem] pb-14 sm:px-6 sm:pt-24 sm:pb-16 lg:justify-start lg:px-8 lg:pt-28 lg:pb-20">
              {heroContent}
            </div>

            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="pointer-events-auto absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-0.5 text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:animate-none sm:bottom-5"
              aria-label="Scroll to Features"
            >
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] sm:text-[10px]">Scroll</span>
              <ChevronDown className="h-5 w-5 animate-bounce drop-shadow-[0_2px_8px_rgba(4,19,61,0.45)] sm:h-6 sm:w-6" aria-hidden />
            </button>
          </div>

          <div className="hidden h-dvh min-h-dvh lg:block" aria-hidden />
        </section>

        <section
          id="features"
          className="relative z-30 w-full scroll-mt-20 py-12 sm:py-14 lg:-mt-12 lg:py-16"
          style={{ backgroundImage: gradientLightBlueViolet }}
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl">
              <p
                className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{ borderColor: borderBvSoft, color: navy }}
              >
                Platform capabilities
              </p>
              <h2
                className="relative mt-4 text-[clamp(1.65rem,3.5vw,2.75rem)] font-extrabold leading-[1.15] tracking-tight"
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(105deg, ${navyDeep} 0%, ${navy} 32%, ${navyBright} 62%, ${bvViolet} 100%)`,
                  }}
                >
                  Core System Features
                </span>
              </h2>
              <p className="mt-2 text-sm sm:text-base" style={{ color: textBodyOnLight }}>
                Designed to bridge customers, repair providers, and government verification in one modern platform.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coreFeatures.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderColor: borderNavySoft }}
                >
                  <h3
                    className="bg-clip-text text-base font-semibold text-transparent sm:text-lg"
                    style={{ backgroundImage: `linear-gradient(90deg, ${navy} 0%, ${navyMuted} 55%, ${navyBright} 100%)` }}
                  >
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm" style={{ color: textBodyOnLight }}>{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="relative z-40 w-full scroll-mt-20 border-y bg-white" style={{ borderColor: borderNavySoft }}>
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ borderColor: borderBvSoft, color: navy }}>
                About the System
              </p>
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl" style={{ color: navy }}>
                A Professional Service Platform for Marinduque
              </h2>
              <p className="mt-4 text-sm sm:text-base" style={{ color: textBodyOnLight }}>
                E-Paayos is a web-based repair service management system that streamlines how customers find,
                book, and communicate with trusted service providers. The platform supports verified onboarding,
                transparent profiles, and organized transactions for higher service quality and public trust.
              </p>
              <p className="mt-3 text-sm sm:text-base" style={{ color: textBodyOnLight }}>
                The system is designed to support local livelihood while improving convenience for households and
                businesses that need reliable repairs for appliances, gadgets, and vehicles.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: borderNavySoft }}>
                <p className="text-sm font-semibold" style={{ color: navy }}>Mission</p>
                <p className="mt-2 text-sm" style={{ color: textBodyOnLight }}>
                  Deliver safer, faster, and more accessible repair services through technology.
                </p>
              </article>
              <article className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: borderNavySoft }}>
                <p className="text-sm font-semibold" style={{ color: navy }}>Vision</p>
                <p className="mt-2 text-sm" style={{ color: textBodyOnLight }}>
                  Build a trusted, connected, and service-ready local repair ecosystem.
                </p>
              </article>
              <article className="rounded-2xl border bg-white p-5 shadow-sm sm:col-span-2" style={{ borderColor: borderNavySoft }}>
                <p className="text-sm font-semibold" style={{ color: navy }}>Why E-Paayos Matters</p>
                <p className="mt-2 text-sm" style={{ color: textBodyOnLight }}>
                  By combining verification, discovery, messaging, and booking into one platform, E-Paayos
                  reduces uncertainty and helps both customers and providers complete repair jobs with confidence.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="process" className="relative z-40 w-full scroll-mt-20 border-y bg-white" style={{ borderColor: borderNavySoft }}>
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
            <div
              className="rounded-2xl border p-6"
              style={{ borderColor: borderBvSoft, backgroundImage: gradientLightBlueVioletAlt }}
            >
              <h3 className="text-lg font-semibold" style={{ color: navy }}>How E-Paayos Works</h3>
              <ol className="mt-4 space-y-3 text-sm" style={{ color: textBodyOnLight }}>
                <li>1. Service providers register and submit profile details.</li>
                <li>2. LMD-PESO validates and verifies eligible technicians/mechanics.</li>
                <li>3. Customers search providers by location and service type.</li>
                <li>4. Customers book services and coordinate through direct messaging.</li>
                <li>5. Customers submit ratings/reviews after service completion.</li>
              </ol>
            </div>

            <div
              className="rounded-2xl border p-6"
              style={{ borderColor: borderBvSoft, backgroundImage: gradientLightBlueVioletAlt }}
            >
              <h3 className="text-lg font-semibold" style={{ color: navy }}>Who Benefits</h3>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2" style={{ color: textBodyOnLight }}>
                {beneficiaries.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border bg-white px-3 py-2"
                    style={{ borderColor: borderNavySoft, color: navy }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="relative z-40 w-full scroll-mt-20 py-14 text-center sm:py-16"
          style={{ backgroundImage: gradientLightBlueViolet }}
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: navy }}>Build a More Reliable Repair Service Community</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base" style={{ color: textBodyOnLight }}>
              Start using E-Paayos to improve access, trust, and coordination between customers and service providers in Marinduque.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                className="border-0 text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
                style={{ backgroundImage: gradientNavyButton }}
                onClick={() => { window.location.hash = '#/register' }}
              >
                Create an Account
              </Button>
              <Button
                variant="outline"
                className="border-0 font-medium shadow-md transition hover:brightness-110 hover:shadow-lg"
                style={{ backgroundImage: gradientBlueVioletButton, color: navy }}
                onClick={() => { window.location.hash = '#/login' }}
              >
                Explore the Platform
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer
        className="relative z-40 w-full border-t border-white/10 px-4 py-5 text-center text-xs text-white/85 sm:text-sm"
        style={{ backgroundImage: gradientNavyFooter }}
      >
        E-Paayos | Development of a Web-Based Repair Service Management System in Marinduque
      </footer>
    </div>
  )
}

export default LandingPage
