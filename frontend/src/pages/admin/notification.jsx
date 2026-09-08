import { useEffect, useState } from 'react'
import {
  ADMIN_NOTIFICATION_ROUTES,
  NotificationFeedContent,
} from '../../components/notifications/NotificationFeed.jsx'
import AdminDashboard from './dashboard.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

export function readAdminUserSession() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null
  if (!token || !raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed.role !== 'admin') return null
    return parsed
  } catch {
    return null
  }
}

export function AdminNotificationContent() {
  const [user] = useState(readAdminUserSession)

  useEffect(() => {
    if (!user) {
      window.location.hash = '#/login'
    }
  }, [user])

  if (!user) {
    return (
      <div className="rounded-none border border-border/80 bg-white/90 p-8 text-center text-sm text-muted-foreground dark:bg-white/5">
        Loading…
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4">
      <NotificationFeedContent
        user={user}
        readScope="admin"
        bookingsUrl={`${API_URL}/api/admin/service-bookings`}
        routes={ADMIN_NOTIFICATION_ROUTES}
        variant="admin"
      />
    </div>
  )
}

export default function AdminNotification({ isEmbedded = false }) {
  if (isEmbedded) {
    return <AdminNotificationContent />
  }

  return (
    <AdminDashboard initialSection="notification">
      <AdminNotificationContent />
    </AdminDashboard>
  )
}
