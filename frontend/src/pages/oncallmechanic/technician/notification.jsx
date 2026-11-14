import { useState } from 'react'
import OnCallMechanicLayout from './OnCallMechanicLayout.jsx'
import { NotificationFeedContent } from '../../../components/notifications/NotificationFeed.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const ROUTES = {
  bookings: '#/independent/technician/service-request',
  messages: '#/independent/technician/messages',
  dashboard: '#/independent/technician/dashboard',
  complaints: '#/independent/technician/complaints',
  account: '#/independent/technician/account-settings',
}

export default function OnCallMechanicNotification() {
  return (
    <OnCallMechanicLayout
      activeSection="notification"
      pageMeta={{
        title: 'Notifications',
        description: 'Updates on the bookings assigned to you.',
      }}
    >
      <NotificationBootstrap readScope="mechanic_independent" />
    </OnCallMechanicLayout>
  )
}

function readIndependentUser() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null
  try {
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.role === 'oncall-mechanic-technician' ? parsed : null
  } catch {
    return null
  }
}

function NotificationBootstrap({ readScope }) {
  const [user] = useState(readIndependentUser)

  if (!user) {
    return (
      <div className="rounded-sm border border-[#081F5C]/10 bg-white/90 p-8 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
        Loading…
      </div>
    )
  }

  return (
    <NotificationFeedContent
      user={user}
      readScope={readScope}
      bookingsUrl={`${API_URL}/api/mechanic/bookings`}
      routes={ROUTES}
      variant="technician"
    />
  )
}
