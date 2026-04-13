import { MessageSquare } from 'lucide-react'
import IndependentMechanicLayout, { IndependentPlaceholder } from './IndependentMechanicLayout.jsx'

export default function IndependentMechanicMessages() {
  return (
    <IndependentMechanicLayout
      activeSection="messages"
      pageMeta={{
        title: 'Messages',
        description: 'Makipag-chat sa mga customer.',
      }}
      fullHeightMain
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col pr-2 md:pr-4">
        <IndependentPlaceholder
          icon={MessageSquare}
          title="Messages (placeholder)"
          body="Maaaring gamitin dito ang MessagingPanel (shop-owner variant) kapag handa na ang backend para sa independent thread."
        />
      </div>
    </IndependentMechanicLayout>
  )
}
