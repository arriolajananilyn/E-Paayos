import { Settings } from 'lucide-react'
import IndependentMechanicLayout, { IndependentPlaceholder } from './IndependentMechanicLayout.jsx'

export default function IndependentMechanicAccountSettings() {
  return (
    <IndependentMechanicLayout
      activeSection="account-settings"
      pageMeta={{
        title: 'Account Settings',
        description: 'Profile and account security.',
      }}
    >
      <IndependentPlaceholder
        icon={Settings}
        title="Account Settings (placeholder)"
        body="This is where you will adjust your profile, password, and preferences — similar to the shop owner’s Account Settings."
      />
    </IndependentMechanicLayout>
  )
}
