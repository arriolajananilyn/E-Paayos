import IndependentMechanicLayout from './IndependentMechanicLayout.jsx'
import { ServicesCatalogBody } from '../../shopowner/services.jsx'

export default function IndependentMechanicServices() {
  return (
    <IndependentMechanicLayout
      activeSection="services"
      pageMeta={{
        title: 'Services',
        description: 'Manage your service listings as an independent mechanic / technician.',
      }}
    >
      <ServicesCatalogBody variant="independent" />
    </IndependentMechanicLayout>
  )
}
