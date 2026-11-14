const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const HOURS_PATTERN = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–—]\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i

function toMinutes(hh, mm, period) {
  let hour = Number(hh)
  const minute = Number(mm)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
  const meridiem = String(period || '').toUpperCase()
  if (meridiem === 'AM') {
    if (hour === 12) hour = 0
  } else if (meridiem === 'PM') {
    if (hour !== 12) hour += 12
  } else {
    return null
  }
  return hour * 60 + minute
}

export function formatMinutes12h(total) {
  const hour24 = Math.floor(total / 60)
  const minute = total % 60
  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`
}

export function formatSlotLabel(hm) {
  const match = String(hm || '').match(/^(\d{2}):(\d{2})$/)
  if (!match) return String(hm || '')
  return formatMinutes12h(Number(match[1]) * 60 + Number(match[2]))
}

/** Parse shop hours stored as `08:00 AM - 05:00 PM`. */
export function parseOperatingHours(raw) {
  const match = String(raw || '').trim().match(HOURS_PATTERN)
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
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function manilaNowMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return hour * 60 + minute
}

export function ymdFromDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateFromYmd(ymd) {
  const match = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function weekdayName(date) {
  return DAY_NAMES[date.getDay()]
}

export function normalizedOpenDays(daysOfOperation) {
  const days = Array.isArray(daysOfOperation) ? daysOfOperation : []
  return days
    .map((day) => String(day || '').trim())
    .filter((day) => DAY_NAMES.some((name) => name.toLowerCase() === day.toLowerCase()))
}

export function isOpenWeekday(date, daysOfOperation) {
  const openDays = normalizedOpenDays(daysOfOperation)
  if (!openDays.length) return false
  const name = weekdayName(date).toLowerCase()
  return openDays.some((day) => day.toLowerCase() === name)
}

export function isBookableDate(date, daysOfOperation) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false
  if (ymdFromDate(date) < manilaTodayYmd()) return false
  return isOpenWeekday(date, daysOfOperation)
}

export function parseTimeToMinutes(hm) {
  const match = String(hm || '').match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

export function timeValueFromParts(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** True when an existing booking matches the given time (HH:mm or total minutes). */
export function isTimeSlotBooked(_operatingHours, slotMinutesOrHm, bookedTimes) {
  const list = Array.isArray(bookedTimes) ? bookedTimes : []
  if (!list.length) return false
  const targetMinutes =
    typeof slotMinutesOrHm === 'number' ? slotMinutesOrHm : parseTimeToMinutes(slotMinutesOrHm)
  if (targetMinutes == null) return false
  const targetValue = timeValueFromParts(Math.floor(targetMinutes / 60), targetMinutes % 60)

  return list.some((hm) => {
    const cleaned = String(hm || '').trim()
    if (!cleaned) return false
    if (cleaned === targetValue) return true
    const bookedMinutes = parseTimeToMinutes(cleaned)
    return bookedMinutes != null && bookedMinutes === targetMinutes
  })
}

/** Hours that contain at least one minute inside the shop window. */
export function bookableHours(operatingHours) {
  const window = parseOperatingHours(operatingHours)
  if (!window) return []
  const start = Math.floor(window.open / 60)
  const end = Math.floor((window.close - 1) / 60)
  const hours = []
  for (let hour = start; hour <= end; hour += 1) {
    const meridiem = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    hours.push({ hour, label: `${hour12} ${meridiem}` })
  }
  return hours
}

export function isMinuteBookable(operatingHours, ymd, hour, minute) {
  const window = parseOperatingHours(operatingHours)
  if (!window || !ymd) return false
  const total = hour * 60 + minute
  if (total < window.open || total >= window.close) return false
  return isSlotStillOpen(ymd, total)
}

export function isSlotStillOpen(ymd, minutes) {
  if (!ymd || ymd < manilaTodayYmd()) return false
  if (ymd > manilaTodayYmd()) return true
  return minutes >= manilaNowMinutes()
}

/** Empty string when the schedule is allowed. */
export function shopScheduleError(daysOfOperation, operatingHours, ymd, timeHm) {
  const openDays = normalizedOpenDays(daysOfOperation)
  const window = parseOperatingHours(operatingHours)
  if (!openDays.length || !window) {
    return 'This shop has not published bookable days and hours yet.'
  }
  const date = dateFromYmd(ymd)
  if (!date) return 'Choose an open date.'
  if (ymdFromDate(date) < manilaTodayYmd()) return 'That date has already passed.'
  if (!isOpenWeekday(date, openDays)) {
    return `This shop is closed on ${weekdayName(date)}. Choose one of their open days.`
  }
  const match = String(timeHm || '').match(/^(\d{2}):(\d{2})$/)
  if (!match) return 'Choose an open time.'
  const minutes = Number(match[1]) * 60 + Number(match[2])
  if (minutes < window.open || minutes >= window.close) {
    return `That time is outside shop hours (${window.label}).`
  }
  if (!isSlotStillOpen(ymd, minutes)) return 'That time has already passed. Choose a later open slot.'
  return ''
}
