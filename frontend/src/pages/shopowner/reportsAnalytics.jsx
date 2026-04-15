import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { BarChart3 } from 'lucide-react'
import ShopOwnerDashboard from './dashboard.jsx'

function ReportsAnalyticsPage() {
  return (
    <ShopOwnerDashboard
      activeSection="reports-analytics"
      pageMeta={{ title: 'Reports & Analytics', description: 'View business insights and performance reports.' }}
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <BarChart3 className="h-5 w-5 text-blue-700" />
          </div>
          <CardTitle className="text-base">Reports & Analytics</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is where you will see reports, metrics, and analytics for your shop’s performance.
          </p>
        </CardContent>
      </Card>
    </ShopOwnerDashboard>
  )
}

export default ReportsAnalyticsPage
