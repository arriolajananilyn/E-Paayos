import IndependentMechanicLayout from './IndependentMechanicLayout.jsx'
import { ShopOwnerDashboardHome } from '../../shopowner/dashboard.jsx'

export default function IndependentMechanicDashboard() {
  return (
    <IndependentMechanicLayout
      activeSection="dashboard"
      wrapContent={false}
      pageMeta={{
        title: 'Dashboard',
        description: 'Overview of your independent mechanic workspace—bookings and listings at a glance.',
      }}
    >
      <ShopOwnerDashboardHome variant="independent" />
    </IndependentMechanicLayout>
  )
}
