import { BarChart3 } from 'lucide-react'
import OnCallMechanicLayout, { IndependentPlaceholder } from './OnCallMechanicLayout.jsx'

export default function OnCallMechanicReportAnalytics() {
  return (
    <OnCallMechanicLayout
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
    </OnCallMechanicLayout>
  )
}
