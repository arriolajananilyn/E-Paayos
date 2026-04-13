import { History } from 'lucide-react'
import IndependentMechanicLayout, { IndependentPlaceholder } from './IndependentMechanicLayout.jsx'

export default function IndependentMechanicServiceHistory() {
  return (
    <IndependentMechanicLayout
      activeSection="service-history"
      pageMeta={{
        title: 'Service History',
        description: 'Nakaraang trabaho at natapos na booking.',
      }}
    >
      <IndependentPlaceholder
        icon={History}
        title="Service History (placeholder)"
        body="Listahan ng nakumpletong serbisyo — iintegrate sa parehong API pattern ng provider service history."
      />
    </IndependentMechanicLayout>
  )
}
