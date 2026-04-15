import IndependentMechanicLayout from './IndependentMechanicLayout.jsx'
import { NotificationFeedContent } from '../../../components/notifications/NotificationFeed.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const ROUTES = {
  bookings: '#/independent/technician/service-request',
  messages: '#/independent/technician/messages',
  dashboard: '#/independent/technician/dashboard',
}

export default function IndependentMechanicNotification() {
  return (
    <IndependentMechanicLayout
      activeSection="notification"
      pageMeta={{
        title: 'Notifications',
        description: 'Mga update sa mga booking na naka-assign sa’yo.',
      }}
    >
      <NotificationBootstrap readScope="mechanic_independent" />
    </IndependentMechanicLayout>
  )
}

function NotificationBootstrap({ readScope }) {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null
  let user = null
  try {
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed?.role === 'independent-mechanic-technician') user = parsed
  } catch {
    user = null
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-[#081F5C]/10 bg-white/90 p-8 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
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
