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
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Calculate service fee</DialogTitle>
          <DialogDescription>
            Enter the labor price and replacement parts used for{' '}
            <span className="font-medium text-foreground">{customerName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="svc-fee-labor">Labor Price</Label>
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
            />
          </div>

          <div className="grid gap-2">
            <Label>Replacement Part:</Label>
            <div className="space-y-2">
              {parts.map((row, idx) => (
                <div key={`part-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
                  <Input
                    type="text"
                    placeholder="Part name"
                    value={row.name}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setParts((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                    }
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Price"
                    value={row.price}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setParts((prev) => prev.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || parts.length <= 1}
                    onClick={() => setParts((prev) => prev.filter((_, i) => i !== idx))}
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
              >
                Add replacement part
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-[#081F5C]/15 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
            <span className="font-medium text-foreground">Estimated Total</span>
            <span className="text-base font-bold tabular-nums text-[#081F5C] dark:text-blue-100">{totalDisplay}</span>
          </div>

          {combinedError ? <p className="text-sm text-destructive">{combinedError}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit} className="bg-[#081F5C] text-white hover:bg-[#04133d]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save service fee'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
