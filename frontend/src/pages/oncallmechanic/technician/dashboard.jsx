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
      <div className="w-full max-w-full min-w-0 overflow-x-hidden">
        <ShopOwnerDashboardHome variant="independent" />
      </div>
    </OnCallMechanicLayout>
  )
}
