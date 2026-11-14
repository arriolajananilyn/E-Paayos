/**
 * Progressive discipline & restriction helpers for User accounts.
 */

export async function syncExpiredRestrictionIfNeeded(user) {
  if (!user || user.moderationStatus !== "restricted") return false
  if (!user.restrictedUntil) return false
  const untilTime = new Date(user.restrictedUntil).getTime()
  if (!Number.isFinite(untilTime) || Date.now() <= untilTime) return false

  const nextStatus = Number(user.warningCount || 0) > 0 ? "warned" : "active"
  user.moderationStatus = nextStatus
  user.restrictedAt = null
  user.restrictedUntil = null
  user.restrictionReason = ""
  user.restrictionCategory = ""
  user.restrictionRelatedTicket = ""
  user.restrictedBy = null
  user.restrictedByName = ""
  if (!Array.isArray(user.moderationLogs)) user.moderationLogs = []
  user.moderationLogs.push({
    action: "restriction_lifted",
    summary: "Temporary account restriction period expired automatically.",
    details: `Account standing restored to "${nextStatus}".`,
    actorName: "System Auto-Expiry",
    createdAt: new Date(),
  })
  await user.save({ validateBeforeSave: false })
  return true
}

export function formatRestrictionPayload(user) {
  const reason = typeof user?.restrictionReason === "string" ? user.restrictionReason.trim() : ""
  const category = typeof user?.restrictionCategory === "string" ? user.restrictionCategory.trim() : ""
  const relatedTicket =
    typeof user?.restrictionRelatedTicket === "string" ? user.restrictionRelatedTicket.trim() : ""
  const restrictedUntil = user?.restrictedUntil ? new Date(user.restrictedUntil).toISOString() : null
  const restrictedAt = user?.restrictedAt ? new Date(user.restrictedAt).toISOString() : null
  const warningCount = Number(user?.warningCount || 0)

  return {
    code: "ACCOUNT_RESTRICTED",
    message: restrictedUntil
      ? `Your account is temporarily restricted until ${new Date(restrictedUntil).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })} due to rule violations.`
      : "Your account has been restricted by the Administrator due to repeated or severe rule violations.",
    reason: reason || "Repeated or severe violation of E-Paayos platform rules.",
    category,
    relatedTicket,
    restrictedAt,
    restrictedUntil,
    warningCount,
    action:
      "Please contact LMD-PESO Administration or E-Paayos Support if you wish to appeal or clarify this restriction.",
  }
}
