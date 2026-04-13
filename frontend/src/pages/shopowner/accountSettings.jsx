import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Settings } from 'lucide-react'
import ShopOwnerDashboard from './dashboard.jsx'

function AccountSettingsPage() {
  return (
    <ShopOwnerDashboard
      activeSection="account-settings"
      pageMeta={{ title: 'Account Settings', description: 'Manage your profile and account preferences.' }}
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Settings className="h-5 w-5 text-blue-700" />
          </div>
          <CardTitle className="text-base">Account Settings</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dito mo ma-aadjust ang profile details, password, at account settings.
          </p>
        </CardContent>
      </Card>
    </ShopOwnerDashboard>
  )
}

export default AccountSettingsPage
