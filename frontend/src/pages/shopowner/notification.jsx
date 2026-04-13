import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Bell } from 'lucide-react'
import ShopOwnerDashboard from './dashboard.jsx'

function NotificationPage() {
  return (
    <ShopOwnerDashboard
      activeSection="notification"
      pageMeta={{ title: 'Notification', description: 'View your latest updates and alerts.' }}
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Bell className="h-5 w-5 text-blue-700" />
          </div>
          <CardTitle className="text-base">Notification</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dito lalabas ang mga updates at important alerts para sa shop mo.
          </p>
        </CardContent>
      </Card>
    </ShopOwnerDashboard>
  )
}

export default NotificationPage
