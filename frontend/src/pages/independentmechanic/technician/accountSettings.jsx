import { Settings } from 'lucide-react'
import IndependentMechanicLayout, { IndependentPlaceholder } from './IndependentMechanicLayout.jsx'

export default function IndependentMechanicAccountSettings() {
  return (
    <IndependentMechanicLayout
      activeSection="account-settings"
      pageMeta={{
        title: 'Account Settings',
        description: 'Profile at seguridad ng account.',
      }}
    >
      <IndependentPlaceholder
        icon={Settings}
        title="Account Settings (placeholder)"
        body="Dito mo ma-aadjust ang profile, password, at preferences — parang Account Settings ng shop owner."
      />
    </IndependentMechanicLayout>
  )
}
