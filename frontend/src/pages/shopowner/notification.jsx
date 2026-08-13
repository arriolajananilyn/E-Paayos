import ShopOwnerDashboard from './dashboard.jsx'
import { NotificationFeedContent } from '../../components/notifications/NotificationFeed.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const PROVIDER_NOTIF_ROUTES = {
  bookings: '#/provider/service-request',
  messages: '#/provider/messages',
  dashboard: '#/provider/dashboard',
}

function NotificationPage() {
  return (
    <ShopOwnerDashboard
      activeSection="notification"
      pageMeta={{
        title: 'Notifications',
        description: 'Stay updated with booking requests and service status.',
      }}
    >
      <ShopOwnerNotificationBody />
    </ShopOwnerDashboard>
  )
}

function ShopOwnerNotificationBody() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null
  let user = null
  try {
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed?.role === 'shop-owner') user = parsed
  } catch {
    user = null
  }

  if (!user) {
    return (
      <div className="rounded-sm border border-border/80 bg-white/90 p-8 text-center text-sm text-muted-foreground dark:bg-white/5">
        Loading…
      </div>
    )
  }

  return (
    <NotificationFeedContent
      user={user}
      readScope="shop_owner"
      bookingsUrl={`${API_URL}/api/shop/bookings`}
      routes={PROVIDER_NOTIF_ROUTES}
      variant="shopOwner"
    />
  )
}

export default NotificationPage
