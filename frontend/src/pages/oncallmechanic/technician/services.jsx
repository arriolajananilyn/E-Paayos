import OnCallMechanicLayout from './OnCallMechanicLayout.jsx'
import { ServicesCatalogBody } from '../../shopowner/services.jsx'

export default function OnCallMechanicServices() {
  return (
    <OnCallMechanicLayout
      activeSection="services"
      wrapContent={false}
      pageMeta={{
        title: 'Services',
        description: 'Manage your service listings as an On-call Mechanic/Technician.',
      }}
    >
      <div className="w-full max-w-full min-w-0 overflow-x-hidden">
        <ServicesCatalogBody variant="independent" />
      </div>
    </OnCallMechanicLayout>
  )
}
