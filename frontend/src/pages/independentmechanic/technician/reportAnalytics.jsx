import { BarChart3 } from 'lucide-react'
import IndependentMechanicLayout, { IndependentPlaceholder } from './IndependentMechanicLayout.jsx'

export default function IndependentMechanicReportAnalytics() {
  return (
    <IndependentMechanicLayout
      activeSection="reports-analytics"
      pageMeta={{
        title: 'Report & Analytics',
        description: 'Summary of performance and trends.',
      }}
    >
      <IndependentPlaceholder
        icon={BarChart3}
        title="Report & Analytics (placeholder)"
        body="Charts and exports — placeholder copy until real data is connected."
      />
    </IndependentMechanicLayout>
  )
}
