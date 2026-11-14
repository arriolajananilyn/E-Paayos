import { useMemo, useState } from 'react'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { Calendar, CalendarDayButton } from '../ui/calendar'
import {
  bookableHours,
  dateFromYmd,
  formatMinutes12h,
  formatSlotLabel,
  isBookableDate,
  isMinuteBookable,
  isTimeSlotBooked,
  manilaTodayYmd,
  normalizedOpenDays,
  parseOperatingHours,
  parseTimeToMinutes,
  timeValueFromParts,
  ymdFromDate,
} from '../../lib/shopAvailability'

const MINUTES = Array.from({ length: 60 }, (_, minute) => minute)

const fieldClass =
  'h-10 w-full cursor-pointer rounded-none border border-slate-300 bg-white px-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#081F5C] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'

function formatDisplayDate(ymd) {
  const date = dateFromYmd(ymd)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default function ShopSchedulePicker({
  daysOfOperation,
  operatingHours,
  date,
  time,
  bookedTimes = [],
  loadingTimes = false,
  timesError = '',
  onChange,
}) {
  const [pendingHour, setPendingHour] = useState(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [dateError, setDateError] = useState('')
  const openDays = useMemo(() => normalizedOpenDays(daysOfOperation), [daysOfOperation])
  const window = parseOperatingHours(operatingHours)
  const hours = bookableHours(operatingHours)
  const selectedMinutes = parseTimeToMinutes(time)
  const activeHour = selectedMinutes == null ? pendingHour : Math.floor(selectedMinutes / 60)
  const activeMinute = selectedMinutes == null ? null : selectedMinutes % 60
  const today = manilaTodayYmd()
  const todayDate = useMemo(() => dateFromYmd(today), [today])
  const selectedDateObj = useMemo(() => dateFromYmd(date), [date])
  const hasShopSchedule = openDays.length > 0 && window != null

  const isMinuteBooked = (hour, minute) =>
    isTimeSlotBooked(operatingHours, timeValueFromParts(hour, minute), bookedTimes)

  const hourHasBookableWindow = (hour) =>
    Boolean(date) && MINUTES.some((minute) => isMinuteBookable(operatingHours, date, hour, minute))

  const hourHasOpenMinute = (hour) =>
    Boolean(date) &&
    MINUTES.some(
      (minute) => isMinuteBookable(operatingHours, date, hour, minute) && !isMinuteBooked(hour, minute),
    )

  const bookedCountInHour = (hour) =>
    date
      ? MINUTES.filter(
          (minute) => isMinuteBookable(operatingHours, date, hour, minute) && isMinuteBooked(hour, minute),
        ).length
      : 0

  const applyDate = (ymd) => {
    const keepTime =
      selectedMinutes != null &&
      isMinuteBookable(operatingHours, ymd, Math.floor(selectedMinutes / 60), selectedMinutes % 60)
    if (!keepTime) setPendingHour(null)
    onChange({ date: ymd, time: keepTime ? time : '' })
  }

  const handleSelectCalendarDate = (pickedDate) => {
    if (!pickedDate) return
    if (!isBookableDate(pickedDate, openDays)) {
      setDateError('This shop is closed or unavailable on that date. Choose an open date.')
      return
    }
    const ymd = ymdFromDate(pickedDate)
    setDateError('')
    setCalendarOpen(false)
    applyDate(ymd)
  }

  const noTimesLeft =
    Boolean(date) && !loadingTimes && hours.length > 0 && hours.every((item) => !hourHasOpenMinute(item.hour))

  return (
    <div className="space-y-3">
      <p className="text-[11px] sm:text-xs font-medium text-slate-600 leading-relaxed">
        {hasShopSchedule
          ? `Open ${openDays.join(', ')} · ${window.label}. Pick an available date (grey dates are closed/unavailable), then choose the hour and minute.`
          : 'This shop has not published open days and hours yet, so booking is unavailable.'}
      </p>

      <div className="space-y-3 border border-slate-200 bg-slate-50 p-3">
        <div>
          <label htmlFor="book-pref-date" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Date
          </label>
          <button
            id="book-pref-date"
            type="button"
            disabled={!hasShopSchedule}
            aria-expanded={calendarOpen}
            onClick={() => {
              if (!hasShopSchedule) return
              setCalendarOpen((open) => !open)
            }}
            className={`${fieldClass} flex items-center justify-between gap-2 text-left`}
          >
            <span className="flex items-center gap-2 truncate">
              <CalendarIcon className="h-4 w-4 shrink-0 text-[#081F5C]" />
              <span className={date ? 'text-slate-900' : 'font-medium text-slate-400'}>
                {date ? formatDisplayDate(date) : 'Select an open date'}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                calendarOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {calendarOpen && hasShopSchedule ? (
            <div className="mt-2 border border-slate-300 bg-white p-2.5 shadow-sm">
              <Calendar
                mode="single"
                selected={selectedDateObj}
                onSelect={handleSelectCalendarDate}
                defaultMonth={selectedDateObj || todayDate}
                startMonth={todayDate}
                disabled={(day) => !isBookableDate(day, openDays)}
                className="mx-auto w-full max-w-[300px] p-0"
                classNames={{
                  month: 'flex w-full flex-col gap-3',
                  day: 'relative aspect-square h-full w-full p-0.5 text-center select-none',
                  today: 'rounded-none ring-1 ring-[#081F5C]/40 bg-blue-50/40',
                  disabled: 'cursor-not-allowed opacity-100',
                  outside: 'text-slate-300 opacity-50',
                }}
                components={{
                  DayButton: ({ className, modifiers, ...props }) => (
                    <CalendarDayButton
                      modifiers={modifiers}
                      className={`rounded-none font-bold transition-colors ${
                        modifiers.disabled
                          ? 'bg-slate-200 text-slate-400 opacity-100 line-through'
                          : modifiers.selected
                            ? 'bg-[#081F5C] text-white hover:bg-[#081F5C] hover:text-white'
                            : 'bg-white text-slate-900 hover:bg-blue-50 hover:text-[#081F5C]'
                      } ${className || ''}`}
                      {...props}
                    />
                  ),
                }}
              />
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 border border-slate-300 bg-white" />
                  Open
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 border border-[#081F5C] bg-[#081F5C]" />
                  Selected
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 border border-slate-300 bg-slate-200" />
                  Closed / Unavailable
                </span>
              </div>
            </div>
          ) : null}

          {dateError ? <p className="mt-1.5 text-xs font-medium text-amber-700">{dateError}</p> : null}
        </div>

        {!date ? (
          <p className="text-xs font-medium text-slate-500">Select an open date first.</p>
        ) : hours.length === 0 ? (
          <p className="text-xs font-medium text-slate-500">No operating hours are set for this shop.</p>
        ) : loadingTimes ? (
          <p className="text-xs font-medium text-slate-500">Checking already booked times for this date…</p>
        ) : noTimesLeft ? (
          <p className="text-xs font-medium text-amber-700">No open times left on this date. Choose another open date.</p>
        ) : (
          <div className="space-y-3">
            {timesError ? <p className="text-xs font-medium text-amber-700">{timesError}</p> : null}

            {bookedTimes.length > 0 ? (
              <div className="border border-slate-200 bg-white p-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Already booked on this date (unavailable):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bookedTimes.map((hm) => (
                    <span
                      key={hm}
                      className="inline-flex items-center gap-1 border border-slate-300 bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-500 line-through select-none cursor-not-allowed"
                    >
                      {formatSlotLabel(hm)}
                      <span className="no-underline text-[9px] uppercase tracking-wider text-slate-500">
                        (Booked)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="book-pref-hour" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Hour
                </label>
                <select
                  id="book-pref-hour"
                  value={activeHour == null ? '' : String(activeHour)}
                  onChange={(event) => {
                    const hour = Number(event.target.value)
                    if (!Number.isInteger(hour) || !hourHasOpenMinute(hour)) return
                    setPendingHour(hour)
                    if (
                      activeMinute != null &&
                      isMinuteBookable(operatingHours, date, hour, activeMinute) &&
                      !isMinuteBooked(hour, activeMinute)
                    ) {
                      onChange({ date, time: timeValueFromParts(hour, activeMinute) })
                    } else {
                      onChange({ date, time: '' })
                    }
                  }}
                  className={fieldClass}
                >
                  <option value="">Hour</option>
                  {hours.map((item) => {
                    if (!hourHasBookableWindow(item.hour)) return null
                    const allBooked = !hourHasOpenMinute(item.hour)
                    const bookedCount = bookedCountInHour(item.hour)
                    return (
                      <option
                        key={item.hour}
                        value={item.hour}
                        disabled={allBooked}
                        className={allBooked ? 'bg-slate-200 text-slate-400' : undefined}
                      >
                        {item.label}
                        {allBooked
                          ? ' (Booked)'
                          : bookedCount > 0
                            ? ` (${bookedCount} booked)`
                            : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <span className="pb-2 text-lg font-black leading-none text-slate-400" aria-hidden="true">
                :
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor="book-pref-minute" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Minute
                </label>
                <select
                  id="book-pref-minute"
                  value={selectedMinutes == null || activeMinute == null ? '' : String(activeMinute)}
                  disabled={activeHour == null}
                  onChange={(event) => {
                    const minute = Number(event.target.value)
                    if (activeHour == null || !Number.isInteger(minute)) return
                    if (!isMinuteBookable(operatingHours, date, activeHour, minute)) return
                    if (isMinuteBooked(activeHour, minute)) return
                    onChange({ date, time: timeValueFromParts(activeHour, minute) })
                  }}
                  className={fieldClass}
                >
                  <option value="">{activeHour == null ? 'Minute' : 'Min'}</option>
                  {activeHour == null
                    ? null
                    : MINUTES.map((minute) => {
                        if (!isMinuteBookable(operatingHours, date, activeHour, minute)) return null
                        const booked = isMinuteBooked(activeHour, minute)
                        return (
                          <option
                            key={minute}
                            value={minute}
                            disabled={booked}
                            className={booked ? 'bg-slate-200 text-slate-400' : undefined}
                          >
                            {String(minute).padStart(2, '0')}
                            {booked ? ' — Booked' : ''}
                          </option>
                        )
                      })}
                </select>
              </div>
            </div>
            <p className="text-xs font-semibold text-[#081F5C]">
              {selectedMinutes == null ? 'Choose hour, then minute.' : formatMinutes12h(selectedMinutes)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
