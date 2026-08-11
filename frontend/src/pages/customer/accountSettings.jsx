import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { User } from 'lucide-react'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'

function CustomerAccountSettings() {
  const [user] = useState(readCustomerUserSession)

  return (
    <CustomerLayout activePage="account-settings">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 w-full">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-1">Temporary page — settings form will be added soon.</p>
        </div>

        <Card className="shadow-md border-gray-200/80">
          <CardHeader className="pb-2">
            <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-1">
              <User className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Mock-only for now</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p><span className="text-gray-500">Name:</span> {user?.fullName || '—'}</p>
            <p><span className="text-gray-500">Email:</span> {user?.email || '—'}</p>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  )
}

export default CustomerAccountSettings
