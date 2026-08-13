import ImageWithFallback from '@/components/ImageWithFallback'
import { buildAdminFileUrl, isLikelyImageFilename, uploadsBasename } from '@/lib/adminUploads'
import { resolveProfilePsgcLabels } from '@/lib/psgcResolve'
import { ExternalLink, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

const ROLE_LABELS = {
  customer: 'Customer',
  'shop-owner': 'Shop Owner',
  'oncall-mechanic-technician': 'On-call Mechanical / Technician',
  'mechanic-technician': 'Mechanic / Technician',
}

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  'prefer-not': 'Prefer not to say',
}

const CIVIL_LABELS = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widowed',
  separated: 'Separated',
}

const EMPLOYMENT_CAT_LABELS = {
  employed: 'Employed',
  unemployed: 'Unemployed',
}

function formatDate(value) {
  if (value == null || value === '') return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return String(value)
  }
}

function formatList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '—'
  return arr.map((x) => String(x)).join(', ')
}

function scalar(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value)
  return String(value)
}

/** One readable line: Region, Province, City/Municipality, Barangay (PSGC resolved when available). */
function formatGeoLine(geoLabels, profile, keys) {
  if (geoLabels === null) return '…'
  const parts = []
  for (const key of keys) {
    const resolved = geoLabels[key]
    let v =
      resolved !== undefined && resolved !== ''
        ? resolved
        : profile[key] != null && profile[key] !== ''
          ? String(profile[key]).trim()
          : ''
    if (v && v !== '—') parts.push(v)
  }
  return parts.length ? parts.join(', ') : '—'
}

function calculateAge(birthdate) {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatIdTypeLabel(idType) {
  if (!idType) return 'Valid ID'
  return String(idType)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function sectionHeading(title) {
  const t = String(title).trim()
  return t.endsWith('.') ? t : `${t}.`
}

function Section({ title, children }) {
  return (
    <div className="border-b border-gray-200 pb-5 last:border-0 last:pb-0 dark:border-white/10">
      <h3 className="mb-3 text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {sectionHeading(title)}
      </h3>
      <div className="max-w-3xl space-y-2.5">{children}</div>
    </div>
  )
}

/** One line: "Label:   value" (same idea as a simple form printout). */
function Line({ label, value }) {
  const v = value == null || value === '' ? '—' : value
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm sm:grid-cols-[minmax(11rem,13rem)_1fr] sm:items-start">
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}:</span>
      <span className="wrap-break-word whitespace-pre-wrap text-gray-900 dark:text-gray-100">{v}</span>
    </div>
  )
}

function DocumentCard({ title, subtitle, storedPath, dataUrl, apiBaseUrl }) {
  const name = uploadsBasename(storedPath) || (dataUrl ? 'Uploaded document' : '')
  const url = dataUrl || buildAdminFileUrl(storedPath, apiBaseUrl)
  const isImage =
    (typeof dataUrl === 'string' && /^data:image\//i.test(dataUrl)) ||
    (!dataUrl && Boolean(name) && isLikelyImageFilename(name))

  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-950/40">
      <div className="border-b border-gray-100 px-3 py-2 dark:border-white/10">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-200">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</div> : null}
      </div>
      <div className="p-2">
        {!url ? (
          <div className="flex h-52 items-center justify-center rounded-md bg-gray-50 text-xs text-gray-500 dark:bg-white/5">
            No file uploaded
          </div>
        ) : isImage ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md ring-1 ring-black/5">
            <ImageWithFallback
              src={url}
              alt={title}
              className="h-52 w-full object-cover transition-transform hover:scale-[1.02]"
            />
          </a>
        ) : (
          <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-md bg-gray-50 px-3 dark:bg-white/5">
            <FileText className="h-10 w-10 text-gray-400" aria-hidden />
            <span className="max-w-full truncate text-center text-xs text-gray-600 dark:text-gray-300">{name}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1447a6] underline underline-offset-2 hover:text-[#081F5C] dark:text-blue-300"
            >
              Open file
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function formatEmployer(emp) {
  if (!emp || typeof emp !== 'object') return '—'
  const shop = emp.shopName ? String(emp.shopName) : ''
  const name = emp.fullName ? String(emp.fullName) : ''
  const mail = emp.email ? String(emp.email) : ''
  const line = [shop, name].filter(Boolean).join(' — ')
  if (line && mail) return `${line} (${mail})`
  if (line) return line
  if (mail) return mail
  return '—'
}

/**
 * Read-only breakdown in the same order as `registration.jsx` steps (per role).
 */
export function AdminRegistrationDetailView({ profile, apiBaseUrl }) {
  const [geoLabels, setGeoLabels] = useState(null)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    setGeoLabels(null)
    resolveProfilePsgcLabels(profile)
      .then((labels) => {
        if (!cancelled) setGeoLabels(labels)
      })
      .catch(() => {
        if (!cancelled) setGeoLabels({})
      })
    return () => {
      cancelled = true
    }
  }, [profile])

  if (!profile) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data available.</p>
  }

  const GEO_PRESENT = ['region', 'province', 'cityMunicipality', 'barangay']
  const GEO_POB = ['pobRegion', 'pobProvince', 'pobCityMunicipality', 'pobBarangay']
  const GEO_PERMANENT = ['permanentRegion', 'permanentProvince', 'permanentCityMunicipality', 'permanentBarangay']
  const GEO_SHOP = ['shopRegion', 'shopProvince', 'shopCityMunicipality', 'shopBarangay']

  const placeOfBirthLine = formatGeoLine(geoLabels, profile, GEO_POB)
  const presentAddressLine = formatGeoLine(geoLabels, profile, GEO_PRESENT)
  const permanentAddressLine = formatGeoLine(geoLabels, profile, GEO_PERMANENT)
  const shopLocationLine = formatGeoLine(geoLabels, profile, GEO_SHOP)

  const isCustomer = profile.role === 'customer'
  const isMech = profile.role === 'mechanic-technician'

  const genderLabel = GENDER_LABELS[profile.gender] || scalar(profile.gender)
  const civilLabel = CIVIL_LABELS[profile.civilStatus] || scalar(profile.civilStatus)
  const empCatLabel = EMPLOYMENT_CAT_LABELS[profile.employmentStatusCategory] || scalar(profile.employmentStatusCategory)
  const roleLabel = ROLE_LABELS[profile.role] || scalar(profile.role)

  const rosterStatusLabel =
    profile.shopManagedStatus != null
      ? String(profile.shopManagedStatus).replace(/-/g, ' ')
      : '—'

  const age = calculateAge(profile.birthdate)
  const idTypeLabel = formatIdTypeLabel(profile.idType)
  const phoneDisplay = [profile.phoneCode, profile.phoneNumber].filter(Boolean).join(' ').trim() || '—'

  /** Customer: Step 1 Personal → Step 2 Address & Contact → Step 3 Account → Step 4 ID */
  if (isCustomer) {
    return (
      <div className="space-y-6">
        <Section title="Personal Info">
          <Line label="Role" value={roleLabel} />
          <Line label="Full name" value={profile.fullName} />
          <Line label="Gender" value={genderLabel} />
          <Line label="Date of birth" value={formatDate(profile.birthdate)} />
          <Line label="Age" value={age != null ? `${age} years old` : '—'} />
        </Section>

        <Section title="Address & Contact">
          <Line label="Address" value={presentAddressLine} />
          <Line label="Detailed address" value={profile.detailedAddress} />
          <Line label="Postal code" value={profile.postalCode} />
          <Line label="Phone" value={phoneDisplay} />
        </Section>

        <Section title="Account Details">
          <Line label="Email" value={profile.email} />
          <Line label="Account created" value={formatDate(profile.createdAt)} />
          <Line label="Last updated" value={formatDate(profile.updatedAt)} />
        </Section>

        <Section title="ID Verification">
          <Line label="ID type" value={profile.idType} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DocumentCard
              title={idTypeLabel}
              subtitle="Valid ID"
              storedPath={profile.validIdPath}
              dataUrl={profile.validIdDataUrl}
              apiBaseUrl={apiBaseUrl}
            />
            <DocumentCard
              title="Selfie"
              subtitle="Verification photo"
              storedPath={profile.selfiePath}
              dataUrl={profile.selfieDataUrl}
              apiBaseUrl={apiBaseUrl}
            />
          </div>
        </Section>
      </div>
    )
  }

  /** Mechanic / Shop owner: Step 1 Personal Info — field order matches `renderStep1` (extended). */
  const extendedPersonalInfo = (
    <Section title="Personal Info">
      <Line label="Role" value={roleLabel} />
      <Line label="Last name" value={profile.lastName} />
      <Line label="First name" value={profile.firstName} />
      <Line label="Middle name" value={profile.middleName} />
      <Line label="Full name (record)" value={profile.fullName} />
      <Line label="Date of birth" value={formatDate(profile.birthdate)} />
      <Line label="Age" value={age != null ? `${age} years old` : '—'} />
      <Line label="Sex" value={genderLabel} />
      <Line label="Civil status" value={civilLabel} />
      <Line label="Place of birth" value={placeOfBirthLine} />
      <Line label="Present address" value={presentAddressLine} />
      <Line label="Detailed present address" value={profile.detailedAddress} />
      <Line label="Permanent address" value={permanentAddressLine} />
      <Line label="Phone" value={phoneDisplay} />
      <Line label="Email" value={profile.email} />
      <Line label="Employment status — Category" value={empCatLabel} />
      <Line label="Employment status — Detail" value={profile.employmentStatusDetail} />
    </Section>
  )

  const accountDetailsStep = (
    <Section title="Account Details">
      <Line label="Email" value={profile.email} />
      <Line label="Phone" value={phoneDisplay} />
      <Line label="Account created" value={formatDate(profile.createdAt)} />
      <Line label="Last updated" value={formatDate(profile.updatedAt)} />
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Password is not shown. This step in registration also collects password and confirmation.
      </p>
    </Section>
  )

  const idVerificationBlock = (
    <Section title="ID Verification">
      <Line label="ID type" value={profile.idType} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DocumentCard
          title={idTypeLabel}
          subtitle="Valid ID"
          storedPath={profile.validIdPath}
          dataUrl={profile.validIdDataUrl}
          apiBaseUrl={apiBaseUrl}
        />
        <DocumentCard
          title="Selfie"
          subtitle="Verification photo"
          storedPath={profile.selfiePath}
          dataUrl={profile.selfieDataUrl}
          apiBaseUrl={apiBaseUrl}
        />
      </div>
    </Section>
  )

  /** Mechanic: shop gate → steps 1–6 (registration.jsx getActiveSteps for mechanic). */
  if (isMech) {
    return (
      <div className="space-y-6">
        <Section title="Employing shop (before registration steps)">
          <Line label="Registered under" value={formatEmployer(profile.employedByShopOwner)} />
        </Section>

        {extendedPersonalInfo}

        <Section title="Educational Background">
          <Line label="Highest educational level" value={profile.highestEducationalLevel} />
          <Line label="Year graduated / last attended" value={profile.yearGraduatedLastAttended} />
          <Line label="School / University" value={profile.schoolUniversity} />
          <Line label="Course / Program" value={profile.courseProgram} />
        </Section>

        <Section title="Work Experience">
          <Line label="Company name" value={profile.workCompanyName} />
          <Line label="Company address" value={profile.workCompanyAddress} />
          <Line label="Position held" value={profile.workPositionHeld} />
          <Line label="Inclusive from" value={profile.workInclusiveFrom} />
          <Line label="Inclusive to" value={profile.workInclusiveTo} />
          <Line label="Appointment status" value={profile.workAppointmentStatus} />
        </Section>

        <Section title="21st Century Skills">
          <Line label="Self-assessment (5 skills)" value={formatList(profile.skillsSelfAssessment)} />
          <p className="pt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            Technical skills acquired without formal training.
          </p>
          <Line label="Selected skills" value={formatList(profile.technicalSkillsNoFormalTraining)} />
        </Section>

        {accountDetailsStep}

        {idVerificationBlock}

        <Section title="Shop roster (set by shop owner after registration)">
          <Line label="Shop job title" value={profile.shopJobTitle} />
          <Line label="Roster status" value={rosterStatusLabel} />
        </Section>
      </div>
    )
  }

  /** Shop owner & independent provider: steps 1–6 from registration.jsx */
  const isOnCallRegistration = profile.role === 'oncall-mechanic-technician'

  return (
    <div className="space-y-6">
      {extendedPersonalInfo}

      <Section title={isOnCallRegistration ? 'Business Information' : 'Business / Shop Information'}>
        {!isOnCallRegistration ? <Line label="Shop name" value={profile.shopName} /> : null}
        <Line label="Type of business" value={profile.businessType} />
        <Line label="Repair services offered" value={formatList(profile.repairServicesOffered)} />
        <Line label="Service type" value={profile.serviceType} />
        <Line label="Years of operation" value={profile.yearsOfOperation} />
        {!isOnCallRegistration ? (
          <Line label="Number of employees / mechanics" value={profile.numberOfEmployees} />
        ) : null}
        <Line label="Operating hours" value={profile.operatingHours} />
        <Line label="Days of operation" value={formatList(profile.daysOfOperation)} />
        <Line label="Shop description" value={profile.shopDescription} />
      </Section>

      <Section title={isOnCallRegistration ? 'Location & Address' : 'Shop Location & Address'}>
        <Line label={isOnCallRegistration ? 'Location' : 'Shop location'} value={shopLocationLine} />
        <Line label="Detailed address" value={profile.shopDetailedAddress} />
        <Line label="Landmark" value={profile.shopLandmark} />
      </Section>

      {isOnCallRegistration ? (
        <Section title="Educational Background & 21st Century Skills">
          <Line label="Highest educational level" value={profile.highestEducationalLevel} />
          <Line label="Year graduated / last attended" value={profile.yearGraduatedLastAttended} />
          <Line label="School / university" value={profile.schoolUniversity} />
          <Line label="Course / program" value={profile.courseProgram} />
          <Line label="21st century skills (5)" value={formatList(profile.skillsSelfAssessment)} />
          <Line label="Technical skills (no formal training)" value={formatList(profile.technicalSkillsNoFormalTraining)} />
        </Section>
      ) : (
        <Section title="Business Registration Details">
          <Line label="DTI / SEC registration number" value={profile.dtiSecRegistrationNumber} />
          <Line label="Business permit number" value={profile.businessPermitNumber} />
          <Line label="TIN" value={profile.tinNumber} />
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Business permit / certificate (uploaded on this step)</p>
          <div className="mt-2 max-w-md">
            <DocumentCard
              title="Business permit / certificate"
              subtitle="From registration step 4"
              storedPath={profile.businessPermitCertificatePath}
              dataUrl={profile.businessPermitCertificateDataUrl}
              apiBaseUrl={apiBaseUrl}
            />
          </div>
        </Section>
      )}

      {accountDetailsStep}

      {idVerificationBlock}
    </div>
  )
}
