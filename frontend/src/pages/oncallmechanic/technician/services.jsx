import OnCallMechanicLayout from './OnCallMechanicLayout.jsx'
import { ServicesCatalogBody } from '../../shopowner/services.jsx'

export default function OnCallMechanicServices() {
  return (
    <OnCallMechanicLayout
      activeSection="services"
      pageMeta={{
        title: 'Services',
        description: 'Manage your service listings as an On-call Mechanic/Technician.',
      }}
    >
      <ServicesCatalogBody variant="independent" />
    </OnCallMechanicLayout>
  )
}
