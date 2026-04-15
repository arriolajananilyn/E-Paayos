import { LogOut } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Controlled confirmation before ending the session (shared across roles).
 */
export function LogoutConfirmDialog({ open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border/60 shadow-2xl sm:max-w-md" size="default">
        <AlertDialogHeader>
          <AlertDialogMedia className="size-11 rounded-xl bg-muted text-foreground ring-1 ring-border/60">
            <LogOut className="size-5" aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg font-semibold tracking-tight">
            Sign out of your account?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            You will be signed out on this device and will need to sign in again to access the platform.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="sm:flex-1">Stay signed in</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="sm:flex-1"
            onClick={() => onConfirm?.()}
          >
            Sign out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
