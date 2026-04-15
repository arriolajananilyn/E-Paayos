import { useCallback, useState } from 'react'
import { LogoutConfirmDialog } from '@/components/LogoutConfirmDialog'

/**
 * Opens a confirmation dialog; calls `performLogout` only after the user confirms.
 */
export function useLogoutConfirmation(performLogout) {
  const [open, setOpen] = useState(false)
  const requestLogout = useCallback(() => setOpen(true), [])
  const onConfirm = useCallback(() => {
    performLogout()
  }, [performLogout])

  const LogoutDialog = (
    <LogoutConfirmDialog open={open} onOpenChange={setOpen} onConfirm={onConfirm} />
  )

  return { requestLogout, LogoutDialog }
}
