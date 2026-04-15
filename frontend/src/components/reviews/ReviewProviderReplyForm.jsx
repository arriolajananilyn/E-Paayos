import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Shop owner or assigned technician: one public reply per review.
 * After a non-empty reply is saved, the form locks and only shows "Sent".
 * @param {{ patchUrl: string, shopResponse?: string, providerReviewRespondedAt?: string|null, label?: string, onUpdated?: (payload: { shopResponse: string, providerReviewRespondedAt: string|null }) => void }} props
 */
export function ReviewProviderReplyForm({
  patchUrl,
  shopResponse = '',
  providerReviewRespondedAt = null,
  label = 'Your reply to this customer (visible on the service listing)',
  onUpdated,
}) {
  const savedText = typeof shopResponse === 'string' ? shopResponse.trim() : ''
  /** May reply only until a non-empty message has been saved (here or in a previous session). */
  const isLocked = savedText.length > 0

  const [draft, setDraft] = useState(savedText)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLocked) {
      setDraft(typeof shopResponse === 'string' ? shopResponse : '')
    }
  }, [shopResponse, patchUrl, isLocked])

  const submit = async () => {
    if (!patchUrl || isLocked) return
    const text = draft.trim()
    if (!text) {
      setError('Maglagay muna ng reply bago i-save.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(patchUrl, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ shopResponse: text }),
      })
      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }
      if (!res.ok) throw new Error(data?.message || 'Could not save reply.')
      const nextText = typeof data?.shopResponse === 'string' ? data.shopResponse.trim() : text
      const nextAt = data?.providerReviewRespondedAt ?? null
      onUpdated?.({ shopResponse: nextText, providerReviewRespondedAt: nextAt })
    } catch (e) {
      setError(e?.message || 'Could not save reply.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-[#081F5C]/12 bg-slate-50/80 p-3">
      <p className="text-xs font-medium text-[#081F5C]">{label}</p>

      {isLocked ? (
        <>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{savedText}</p>
          {providerReviewRespondedAt ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sent: {new Date(providerReviewRespondedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" disabled className="min-w-22 bg-emerald-600/15 text-emerald-800 hover:bg-emerald-600/15">
              Sent
            </Button>
          </div>
        </>
      ) : (
        <>
          {providerReviewRespondedAt ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Last updated: {new Date(providerReviewRespondedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          ) : null}
          <Textarea
            className="mt-2 min-h-[72px] resize-y text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Salamat po sa review…"
            maxLength={4000}
            disabled={saving}
          />
          {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setDraft('')}>
              Clear
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={() => void submit()}>
              {saving ? 'Sending…' : 'Save reply'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
