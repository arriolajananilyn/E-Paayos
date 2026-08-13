import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Loader2 } from 'lucide-react'

function formatPhp(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(x)
  } catch {
    return `₱${Math.round(x).toLocaleString('en-PH')}`
  }
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string} [props.customerName]
 * @param {number|null|undefined} [props.initialLaborPrice]
 * @param {Array<{name:string, price:number}>} [props.initialReplacementParts]
 * @param {boolean} [props.isSubmitting]
 * @param {string} [props.error]
 * @param {(payload: { laborPrice: number, replacementParts: Array<{name:string, price:number}> }) => void} props.onSave
 */
export function ServiceFeeCalculateDialog({
  open,
  onOpenChange,
  customerName = 'Customer',
  initialLaborPrice = null,
  initialReplacementParts = [],
  isSubmitting = false,
  error = '',
  onSave,
}) {
  const [laborPrice, setLaborPrice] = useState('')
  const [parts, setParts] = useState([{ name: '', price: '' }])
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setLocalError('')
    setLaborPrice(
      initialLaborPrice != null && Number.isFinite(Number(initialLaborPrice))
        ? String(initialLaborPrice)
        : '',
    )
    const seeded = Array.isArray(initialReplacementParts)
      ? initialReplacementParts
          .map((x) => ({
            name: typeof x?.name === 'string' ? x.name : '',
            price:
              x?.price != null && Number.isFinite(Number(x.price))
                ? String(x.price)
                : '',
          }))
          .filter((x) => x.name || x.price)
      : []
    setParts(seeded.length ? seeded : [{ name: '', price: '' }])
  }, [open, initialLaborPrice, initialReplacementParts])

  const parsedLabor = useMemo(() => {
    const s = String(laborPrice ?? '').trim()
    if (s === '') return NaN
    const n = Number(s)
    return Number.isFinite(n) ? n : NaN
  }, [laborPrice])

  const partsTotal = useMemo(
    () =>
      parts.reduce((sum, row) => {
        const n = Number(String(row.price ?? '').trim())
        return Number.isFinite(n) && n >= 0 ? sum + n : sum
      }, 0),
    [parts],
  )

  const totalDisplay = useMemo(() => {
    if (!Number.isFinite(parsedLabor)) return '—'
    return formatPhp(parsedLabor + partsTotal)
  }, [parsedLabor, partsTotal])

  const handleSubmit = () => {
    setLocalError('')
    if (!Number.isFinite(parsedLabor) || parsedLabor < 0) {
      setLocalError('Enter a valid labor price (0 or more).')
      return
    }
    const cleanedParts = []
    for (const row of parts) {
      const name = String(row.name ?? '').trim()
      const raw = String(row.price ?? '').trim()
      if (!name && !raw) continue
      const n = Number(raw)
      if (!name) {
        setLocalError('Each replacement part must have a name.')
        return
      }
      if (!Number.isFinite(n) || n < 0) {
        setLocalError(`Enter a valid price for "${name}".`)
        return
      }
      cleanedParts.push({ name, price: n })
    }
    onSave({ laborPrice: parsedLabor, replacementParts: cleanedParts })
  }

  const combinedError = error || localError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border border-slate-200 bg-white p-6 shadow-2xl sm:max-w-lg" showCloseButton>
        <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
          <DialogTitle className="text-xl font-black text-slate-900">Calculate Service Fee</DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
            Enter the labor price and replacement parts used for{' '}
            <span className="font-bold text-slate-900">{customerName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 text-xs sm:text-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="svc-fee-labor" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Labor Price (PHP) <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="svc-fee-labor"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="0"
              value={laborPrice}
              disabled={isSubmitting}
              onChange={(e) => setLaborPrice(e.target.value)}
              className="rounded-none border-slate-300 bg-white text-xs font-bold shadow-2xs focus:border-indigo-600"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Replacement Parts & Materials</Label>
            <div className="space-y-2">
              {parts.map((row, idx) => (
                <div key={`part-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <Input
                    type="text"
                    placeholder="Part name"
                    value={row.name}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setParts((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                    }
                    className="rounded-none border-slate-300 text-xs font-semibold shadow-2xs"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Price (PHP)"
                    value={row.price}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setParts((prev) => prev.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))
                    }
                    className="rounded-none border-slate-300 text-xs font-bold shadow-2xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || parts.length <= 1}
                    onClick={() => setParts((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-none border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setParts((prev) => [...prev, { name: '', price: '' }])}
                className="rounded-none border-slate-300 text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50"
              >
                + Add Replacement Part
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-none border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
            <span className="font-extrabold uppercase tracking-wider text-slate-700">Estimated Total Fee</span>
            <span className="text-base font-black text-indigo-700">{totalDisplay}</span>
          </div>

          {combinedError ? <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 border border-rose-200 rounded-none">{combinedError}</p> : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-3 border-t border-slate-100 pt-3.5">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 shadow-md shadow-indigo-900/20 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save Service Fee'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
