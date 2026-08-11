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
      <main className="mx-auto w-full max-w-[1440px] space-y-4 px-6 pb-8 pt-6 sm:px-10 md:px-16">
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
