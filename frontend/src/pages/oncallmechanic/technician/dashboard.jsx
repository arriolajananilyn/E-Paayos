import OnCallMechanicLayout from './OnCallMechanicLayout.jsx'
import { ShopOwnerDashboardHome } from '../../shopowner/dashboard.jsx'

export default function OnCallMechanicDashboard() {
  return (
    <OnCallMechanicLayout
      activeSection="dashboard"
      wrapContent={false}
      pageMeta={{
        title: 'Dashboard',
        description: 'Overview of your On-call Mechanic/Technician workspace—bookings and listings at a glance.',
      }}
    >
      <ShopOwnerDashboardHome variant="independent" />
    </OnCallMechanicLayout>
  )
}
