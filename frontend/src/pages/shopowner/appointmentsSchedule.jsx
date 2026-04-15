import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { CalendarDays } from 'lucide-react'
import ShopOwnerDashboard from './dashboard.jsx'

function AppointmentsSchedulePage() {
  return (
    <ShopOwnerDashboard
      activeSection="appointments-schedule"
      pageMeta={{ title: 'Appointments / Schedule', description: 'View and manage your shop appointments.' }}
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <CalendarDays className="h-5 w-5 text-blue-700" />
          </div>
          <CardTitle className="text-base">Appointments / Schedule</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is where you will manage appointment dates, times, and booking schedules.
          </p>
        </CardContent>
      </Card>
    </ShopOwnerDashboard>
  )
}

export default AppointmentsSchedulePage
