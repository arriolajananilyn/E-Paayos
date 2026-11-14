const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const HOURS_PATTERN = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–—]\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i

export function parseTimeToMinutes(hm) {
  const match = String(hm || "").trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function isTimeSlotBooked(_operatingHours, timeHm, bookedTimes) {
  const list = Array.isArray(bookedTimes) ? bookedTimes : []
  if (!list.length) return false
  const cleanedTarget = String(timeHm || "").trim()
  const targetMinutes = parseTimeToMinutes(cleanedTarget)

  return list.some((hm) => {
    const cleaned = String(hm || "").trim()
    if (!cleaned) return false
    if (cleaned === cleanedTarget) return true
    const bookedMinutes = parseTimeToMinutes(cleaned)
    return bookedMinutes != null && targetMinutes != null && bookedMinutes === targetMinutes
  })
}

function toMinutes(hh, mm, period) {
  let hour = Number(hh)
  const minute = Number(mm)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
  const meridiem = String(period || "").toUpperCase()
  if (meridiem === "AM") {
    if (hour === 12) hour = 0
  } else if (meridiem === "PM") {
    if (hour !== 12) hour += 12
  } else {
    return null
  }
  return hour * 60 + minute
}

function formatMinutes12h(total) {
  const hour24 = Math.floor(total / 60)
  const minute = total % 60
  const meridiem = hour24 >= 12 ? "PM" : "AM"
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`
}

export function parseOperatingHours(raw) {
  const match = String(raw || "").trim().match(HOURS_PATTERN)
  if (!match) return null
  const open = toMinutes(match[1], match[2], match[3])
  const close = toMinutes(match[4], match[5], match[6])
  if (open == null || close == null || close <= open) return null
  return {
    open,
    close,
    label: `${formatMinutes12h(open)} - ${formatMinutes12h(close)}`,
  }
}

export function manilaTodayYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function manilaNowMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === "hour")?.value)
  const minute = Number(parts.find((part) => part.type === "minute")?.value)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return hour * 60 + minute
}

function weekdayFromYmd(ymd) {
  const date = new Date(`${ymd}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return ""
  return DAY_NAMES[date.getUTCDay()]
}

/**
 * @returns {string} error message, or "" when the booking slot is allowed
 */
export function shopScheduleError(daysOfOperation, operatingHours, ymd, timeHm) {
  const openDays = (Array.isArray(daysOfOperation) ? daysOfOperation : [])
    .map((day) => String(day || "").trim().toLowerCase())
    .filter((day) => DAY_NAMES.some((name) => name.toLowerCase() === day))
  const window = parseOperatingHours(operatingHours)
  if (!openDays.length || !window) {
    return "This shop has not published bookable days and hours yet."
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))) return "Please choose a valid preferred date"
  if (ymd < manilaTodayYmd()) return "That date has already passed."
  const weekday = weekdayFromYmd(ymd).toLowerCase()
  if (!openDays.includes(weekday)) {
    return `This shop is closed on ${weekdayFromYmd(ymd)}. Choose one of their open days.`
  }
  const match = String(timeHm || "").match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return "Please choose a valid preferred time"
  const minutes = Number(match[1]) * 60 + Number(match[2])
  if (minutes < window.open || minutes >= window.close) {
    return `That time is outside shop hours (${window.label}).`
  }
  if (ymd === manilaTodayYmd() && minutes < manilaNowMinutes()) {
    return "That time has already passed. Choose a later open slot."
  }
  return ""
}
