import { Bell } from 'lucide-react'
import IndependentMechanicLayout, { IndependentPlaceholder } from './IndependentMechanicLayout.jsx'

export default function IndependentMechanicNotification() {
  return (
    <IndependentMechanicLayout
      activeSection="notification"
      pageMeta={{
        title: 'Notifications',
        description: 'Mga paalala at update sa account mo.',
      }}
    >
      <IndependentPlaceholder
        icon={Bell}
        title="Notifications (placeholder)"
        body="Walang listahan pa — itutulad sa notification flow ng ibang role kapag handa na."
      />
    </IndependentMechanicLayout>
  )
}
