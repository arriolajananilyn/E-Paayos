/**
 * Progressive discipline & restriction helpers for User accounts.
 */
import { notifyUser } from "../services/notificationService.js"

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
  await notifyUser(user._id, {
    category: "moderation",
    kind: "restriction_expired",
    severity: "success",
    title: "Restriction period ended",
    message: "Your temporary account restriction has expired and your access is restored. Please keep following platform rules.",
    target: "moderation",
    actorName: "System",
  })
  return true
}

export function sanitizeAppeal(appeal) {
  if (!appeal) return null
  const a = appeal.toObject ? appeal.toObject() : appeal
  return {
    _id: a._id ? String(a._id) : undefined,
    appealRef: a.appealRef || "",
    restrictionStartedAt: a.restrictionStartedAt ? new Date(a.restrictionStartedAt).toISOString() : null,
    subject: a.subject || "",
    reason: a.reason || "",
    evidencePhotos: Array.isArray(a.evidencePhotos) ? a.evidencePhotos : [],
    status: a.status || "submitted",
    submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : null,
    reviewStartedAt: a.reviewStartedAt ? new Date(a.reviewStartedAt).toISOString() : null,
    reviewedAt: a.reviewedAt ? new Date(a.reviewedAt).toISOString() : null,
    reviewedByName: a.reviewedByName || "",
    adminRemarks: a.adminRemarks || "",
    decisionAcknowledged: Boolean(a.decisionAcknowledged),
    decisionAcknowledgedAt: a.decisionAcknowledgedAt ? new Date(a.decisionAcknowledgedAt).toISOString() : null,
  }
}

export function getLatestAppealForUser(user) {
  const list = Array.isArray(user?.appeals) ? user.appeals : []
  if (!list.length) return null
  const sorted = [...list].sort(
    (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  )
  const latest = sorted[0]
  if (user?.moderationStatus === "restricted" && user?.restrictedAt && latest?.restrictionStartedAt) {
    const restTime = new Date(user.restrictedAt).getTime()
    const appealRestTime = new Date(latest.restrictionStartedAt).getTime()
    if (Number.isFinite(restTime) && Number.isFinite(appealRestTime) && appealRestTime < restTime) {
      // Appeal belongs to an older restriction cycle; check if there's any appeal for current cycle
      const currentCycle = sorted.find(
        (a) => a.restrictionStartedAt && new Date(a.restrictionStartedAt).getTime() >= restTime
      )
      return currentCycle ? sanitizeAppeal(currentCycle) : null
    }
  }
  return sanitizeAppeal(latest)
}

export function formatRestrictionPayload(user) {
  const reason = typeof user?.restrictionReason === "string" ? user.restrictionReason.trim() : ""
  const category = typeof user?.restrictionCategory === "string" ? user.restrictionCategory.trim() : ""
  const relatedTicket =
    typeof user?.restrictionRelatedTicket === "string" ? user.restrictionRelatedTicket.trim() : ""
  const restrictedUntil = user?.restrictedUntil ? new Date(user.restrictedUntil).toISOString() : null
  const restrictedAt = user?.restrictedAt ? new Date(user.restrictedAt).toISOString() : null
  const warningCount = Number(user?.warningCount || 0)
  const latestAppeal = getLatestAppealForUser(user)

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
    latestAppeal,
    action:
      "You may submit an appeal or monitor your appeal status below if you believe this restriction should be reviewed.",
  }
}
