import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Users } from 'lucide-react'
import ShopOwnerDashboard from './dashboard.jsx'

function TrackEmployeePage() {
  return (
    <ShopOwnerDashboard
      activeSection="track-employee"
      pageMeta={{ title: 'Track Employee', description: 'Track status and activity of your employees.' }}
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Users className="h-5 w-5 text-blue-700" />
          </div>
          <CardTitle className="text-base">Track Employee</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is where you will track employee attendance and activity updates.
          </p>
        </CardContent>
      </Card>
    </ShopOwnerDashboard>
  )
}

export default TrackEmployeePage
