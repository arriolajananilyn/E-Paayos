import { Button } from '../components/ui/button'
import logoEpaayos from '../assets/epaayosLOGO.png'

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

/** Gradient navy blue — hero base, primary CTAs, footer base */
const gradientNavyBlue = `linear-gradient(135deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 62%, ${navyBright} 100%)`
const gradientNavyButton = `linear-gradient(135deg, ${navy} 0%, ${navyMuted} 42%, ${navyBright} 78%, ${navyGlow} 100%)`
const gradientNavyFooter = `linear-gradient(180deg, ${navyBright} 0%, ${navy} 45%, ${navyDeep} 100%)`

/** Gradient light blue-violet — soft section fills, secondary accents */
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

function LandingPage() {
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const navItems = [
    { label: 'Home', target: 'hero' },
    { label: 'Features', target: 'features' },
    { label: 'About', target: 'about' },
    { label: 'Process', target: 'process' },
    { label: 'Contact', target: 'contact' }
  ]

  const coreFeatures = [
    {
      title: 'Verified Service Providers',
      description: 'LMD-PESO verification helps customers connect with trusted and screened technicians.'
    },
    {
      title: 'Location-Based Discovery',
      description: 'Find nearby repair shops or independent mechanics within Marinduque quickly.'
    },
    {
      title: 'Home Service Booking',
      description: 'Book at-home repair services for appliances, gadgets, and vehicles with ease.'
    },
    {
      title: 'Direct Messaging',
      description: 'Communicate instantly with service providers for updates, schedules, and concerns.'
    },
    {
      title: 'Ratings and Reviews',
      description: 'Check feedback and evaluate quality to choose the right technician confidently.'
    },
    {
      title: 'Basic Chatbot Support',
      description: 'Get quick guidance on common questions and platform navigation anytime.'
    }
  ]

  const beneficiaries = [
    'LMD-PESO administrators',
    'Repair shop owners',
    'Independent technicians/mechanics',
    'Customers and households',
    'Local Marinduque community'
  ]

  return (
    <div className="min-h-screen w-full min-w-0 bg-white" style={{ color: textBodyOnLight }}>
      <header
        className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-md"
        style={{ borderColor: borderNavySoft }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            className="flex shrink-0 items-center"
            aria-label="E-Paayos — scroll to top"
            onClick={() => { scrollToSection('hero') }}
          >
            <img
              src={logoEpaayos}
              alt="E-PAAYOS"
              className="h-9 w-auto max-h-11 max-w-[min(72vw,260px)] object-contain object-left sm:h-11"
              decoding="async"
            />
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className="rounded-full px-4 py-2 text-sm font-medium transition hover:bg-slate-100/80"
                style={{ color: navy }}
                onClick={() => { scrollToSection(item.target) }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-white transition hover:bg-white"
              style={{ borderColor: borderNavySoft, color: navy }}
              onClick={() => { window.location.hash = '#/login' }}
            >
              Sign In
            </Button>
            <Button
              className="border-0 text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
              style={{ backgroundImage: gradientNavyButton }}
              onClick={() => { window.location.hash = '#/register' }}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full min-w-0">
        <section
          id="hero"
          className="relative w-full overflow-hidden text-white"
          style={{ backgroundImage: gradientNavyBlue }}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ background: gradientHeroMesh }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
            style={{
              backgroundImage: `linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)`,
              backgroundSize: '200% 200%'
            }}
            aria-hidden
          />
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto space-y-6">
              <p
                className="mx-auto inline-flex rounded-full border border-white/35 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm"
                style={{ backgroundImage: `linear-gradient(120deg, ${navyMuted}e6 0%, ${navy}cc 55%, ${navyBright}cc 100%)` }}
              >
                Web-Based Repair Service Management System
              </p>

              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.15]">
                Connect Customers with{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(120deg, #ffffff 0%, ${bvPeriwinkle} 55%, ${bvSoft} 100%)` }}
                >
                  Trusted Repair Providers
                </span>{' '}
                in Marinduque
              </h1>

              <p className="mx-auto max-w-2xl text-sm text-white/75 sm:text-base">
                E-Paayos centralizes discovery, verification, booking, and communication between customers,
                repair shops, and independent technicians. Built for faster, safer, and more reliable repair services.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  className="border-0 font-medium text-white shadow-md hover:brightness-105"
                  style={{ backgroundColor: '#ffffff', color: navy }}
                  onClick={() => { window.location.hash = '#/register' }}
                >
                  Register Now
                </Button>
                <Button
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10"
                  onClick={() => { window.location.hash = '#/login' }}
                >
                  Login to Account
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4 text-center text-xs text-white/75 sm:grid-cols-2 sm:text-sm">
                <div className="rounded-xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm">
                  <p className="text-lg font-semibold text-white">Centralized</p>
                  <p>Provider records and verification via LMD-PESO</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm">
                  <p className="text-lg font-semibold text-white">Accessible</p>
                  <p>Mobile-friendly interface for faster discovery</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="w-full py-10 sm:py-12 lg:py-14"
          style={{ backgroundImage: gradientLightBlueViolet }}
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl" style={{ color: navy }}>Core System Features</h2>
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

        <section id="about" className="w-full border-y bg-white" style={{ borderColor: borderNavySoft }}>
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

        <section id="process" className="w-full border-y bg-white" style={{ borderColor: borderNavySoft }}>
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
          className="w-full py-14 text-center sm:py-16"
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
        className="w-full border-t border-white/10 px-4 py-5 text-center text-xs text-white/85 sm:text-sm"
        style={{ backgroundImage: gradientNavyFooter }}
      >
        E-Paayos | Development of a Web-Based Repair Service Management System in Marinduque
      </footer>
    </div>
  )
}

export default LandingPage
