import { useState } from 'react'
import {
  CUSTOMER_NOTIFICATION_ROUTES,
  NotificationFeedContent,
} from '../../components/notifications/NotificationFeed.jsx'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function NotificationPage() {
  const [user] = useState(readCustomerUserSession)

  return (
    <CustomerLayout activePage="notification">
      <main className="w-full px-3.5 sm:px-10 md:px-16 pt-3 sm:pt-5 pb-6 sm:pb-8 space-y-3.5 sm:space-y-4 max-w-[1440px] mx-auto">
        <NotificationFeedContent
          user={user}
          readScope="customer"
          bookingsUrl={`${API_URL}/api/catalog/bookings`}
          routes={CUSTOMER_NOTIFICATION_ROUTES}
          variant="customer"
        />
      </main>
    </CustomerLayout>
  )
}

export default NotificationPage
