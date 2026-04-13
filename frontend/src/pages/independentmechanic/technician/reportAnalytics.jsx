import { BarChart3 } from 'lucide-react'
import IndependentMechanicLayout, { IndependentPlaceholder } from './IndependentMechanicLayout.jsx'

export default function IndependentMechanicReportAnalytics() {
  return (
    <IndependentMechanicLayout
      activeSection="reports-analytics"
      pageMeta={{
        title: 'Report & Analytics',
        description: 'Buod ng performance at trend.',
      }}
    >
      <IndependentPlaceholder
        icon={BarChart3}
        title="Report & Analytics (placeholder)"
        body="Mga chart at export — pansamantalang teksto hanggang ma-link ang datos."
      />
    </IndependentMechanicLayout>
  )
}
