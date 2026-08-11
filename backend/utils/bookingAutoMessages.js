export function bookingRef(bookingId) {
  const s = String(bookingId || "")
  if (!s) return "BK-"
  return `BK-${s.slice(-8).toUpperCase()}`
}

export function formatPreferredDate(d) {
  if (!d) return ""
  const x = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(x.getTime())) return ""
  return x.toISOString().slice(0, 10)
}

export function formatNewBookingCustomerToProvider({ booking, serviceName, shopName }) {
  const ref = bookingRef(booking._id)
  const lines = [
    `[Booking ${ref}] New booking request`,
    `Service: ${serviceName || "Service"}`,
    `Shop / provider: ${shopName || "Provider"}`,
    `Contact: ${booking.contactName} (${booking.contactPhone})`,
    `Preferred date: ${formatPreferredDate(booking.preferredDate)}`,
    `Preferred time: ${booking.preferredTime || ""}`,
    `Mode: ${booking.serviceMode === "home" ? "Home service" : "In-shop"}`,
  ]
  if (booking.serviceMode === "home" && booking.serviceAddress) {
    lines.push(`Address: ${booking.serviceAddress}`)
  }
  if (
    booking.serviceMode === "home" &&
    booking.serviceLatitude != null &&
    booking.serviceLongitude != null &&
    Number.isFinite(Number(booking.serviceLatitude)) &&
    Number.isFinite(Number(booking.serviceLongitude))
  ) {
    lines.push(`Location (GPS): ${booking.serviceLatitude}, ${booking.serviceLongitude}`)
  }
  lines.push("")
  lines.push("Photo Issue:")
  lines.push("")
  lines.push(`Issue / problem: ${booking.problemDescription || ""}`)
  const notesTrim = typeof booking.notes === "string" ? booking.notes.trim() : ""
  if (notesTrim) lines.push(`Notes: ${notesTrim}`)
  return lines.join("\n")
}

export function formatStatusUpdateToCustomer({ newStatus, bookingRefId, shopName, rejectionReason }) {
  const ref = bookingRef(bookingRefId)
  const label = shopName || "The provider"
  if (newStatus === "confirmed") {
    return `[Booking ${ref}] ${label} confirmed your booking.`
  }
  if (newStatus === "cancelled") {
    const reason = rejectionReason ? `\nReason: ${rejectionReason}` : ""
    return `[Booking ${ref}] Your booking was rejected.${reason}`
  }
  if (newStatus === "working") {
    return `[Booking ${ref}] Your booking is now in progress (working).`
  }
  if (newStatus === "completed") {
    return `[Booking ${ref}] Your booking is marked completed. Thank you!`
  }
  return `[Booking ${ref}] Status updated to ${newStatus}.`
}

function formatPhpAmount(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—"
  const num = Number(n)
  return `PHP ${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Full breakdown for chat when provider saves labor + replacement parts (service fee).
 * @param {{ bookingRefId: unknown, providerLabel: string, labor: unknown, materials: unknown, replacementParts?: Array<{name?: string, price?: number}>, serviceName?: string }} p
 */
export function formatServiceFeeToCustomer({
  bookingRefId,
  providerLabel,
  labor,
  materials,
  replacementParts,
  serviceName,
}) {
  const ref = bookingRef(bookingRefId)
  const lab = Number.isFinite(Number(labor)) ? Number(labor) : null
  const mat = Number.isFinite(Number(materials)) ? Number(materials) : null
  const total = lab != null && mat != null ? lab + mat : null

  const parts = Array.isArray(replacementParts)
    ? replacementParts
        .map((x) => ({
          name: typeof x?.name === "string" ? x.name.trim() : "",
          price: Number.isFinite(Number(x?.price)) ? Number(x.price) : 0,
        }))
        .filter((x) => x.name)
    : []

  const lines = [
    `[Booking ${ref}] Service fee — what you will pay`,
    `Updated by: ${providerLabel || "provider"}`,
  ]
  if (serviceName && String(serviceName).trim()) {
    lines.push(`Service: ${String(serviceName).trim()}`)
  }
  lines.push("")
  lines.push(`Labor charge: ${formatPhpAmount(lab)}`)

  if (parts.length > 0) {
    lines.push("Replacement parts / materials:")
    for (const p of parts) {
      lines.push(`  • ${p.name}: ${formatPhpAmount(p.price)}`)
    }
    lines.push(`Parts subtotal: ${formatPhpAmount(mat)}`)
  } else {
    lines.push(`Parts / materials total: ${formatPhpAmount(mat)}`)
  }

  lines.push("")
  lines.push(`Total amount due: ${formatPhpAmount(total)}`)
  lines.push("")
  lines.push("Complete payment from My bookings using your provider’s accepted payment methods.")

  return lines.join("\n")
}

const PAYMENT_TYPE_LABEL = {
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank transfer",
  cash_on_service: "Cash (on-site)",
  other: "Other",
}

/**
 * Customer → shop owner: payment confirmed with breakdown, option used, and receipt image attached separately.
 */
export function formatPaymentToProvider({
  bookingRefId,
  customerName,
  serviceName,
  chosenMethod,
  labor,
  materials,
  totalPaid,
}) {
  const ref = bookingRef(bookingRefId)
  const type = typeof chosenMethod?.type === "string" ? chosenMethod.type : ""
  const typeLabel = PAYMENT_TYPE_LABEL[type] || type || "Payment"

  const lines = [
    `[Booking ${ref}] Payment received`,
    "",
    `Customer: ${customerName || "Customer"}`,
    `Service: ${serviceName || "Service"}`,
    "",
    "Amount paid (service fee):",
    `  Labor: ${formatPhpAmount(labor)}`,
    `  Parts / materials: ${formatPhpAmount(materials)}`,
    `  Total: ${formatPhpAmount(totalPaid)}`,
    "",
    "Payment option:",
    `  Method: ${typeLabel}`,
  ]

  const acc = typeof chosenMethod?.accountName === "string" ? chosenMethod.accountName.trim() : ""
  const det = typeof chosenMethod?.details === "string" ? chosenMethod.details.trim() : ""
  if (acc) lines.push(`  Registered account name: ${acc}`)
  if (det && type !== "cash_on_service") lines.push(`  Number / account details: ${det}`)

  lines.push("")
  if (type === "cash_on_service") {
    lines.push("Receipt image: Not uploaded (cash paid on-site).")
  } else {
    lines.push("Proof of payment (receipt):")
  }

  return lines.join("\n")
}

export function formatTechnicianActionToCustomer({ bookingRefId, action, technicianName }) {
  const ref = bookingRef(bookingRefId)
  const who = technicianName || "Your technician"
  if (action === "working") {
    return `[Booking ${ref}] ${who} started working on your booking.`
  }
  return `[Booking ${ref}] ${who} marked your booking as completed.`
}

function guessImageMimeFromUrl(url) {
  const s = String(url || "")
  if (/^data:image\//i.test(s)) {
    const m = /^data:image\/([a-zA-Z0-9+.-]+);/i.exec(s)
    if (m) {
      const sub = m[1].toLowerCase().split("+")[0]
      if (sub === "svg+xml") return "image/svg+xml"
      return `image/${sub}`
    }
    return "image/jpeg"
  }
  const lower = s.split("?")[0].toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".gif")) return "image/gif"
  if (lower.endsWith(".svg")) return "image/svg+xml"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  return "image/jpeg"
}

/**
 * Maps booking.issuePhotos (string URLs) to Message attachment objects so images show in Messages UI.
 */
export function issuePhotosToMessageAttachments(issuePhotos) {
  if (!Array.isArray(issuePhotos)) return []
  return issuePhotos
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter(Boolean)
    .slice(0, 6)
    .map((url, i) => ({
      url,
      mimetype: guessImageMimeFromUrl(url),
      originalName: `Issue / repair photo ${i + 1}`,
      size: 0,
    }))
}

/** Single receipt image from customer payment (data URL or /uploads path). */
export function buildPaymentProofAttachments(paymentProofUrl) {
  if (!paymentProofUrl || typeof paymentProofUrl !== "string") return []
  const url = paymentProofUrl.trim()
  if (!url) return []
  return [
    {
      url,
      mimetype: guessImageMimeFromUrl(url),
      originalName: "Payment receipt (proof)",
      size: 0,
    },
  ]
}
