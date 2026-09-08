import OnCallMechanicLayout from './OnCallMechanicLayout.jsx'
import { MessagingPanel } from '../../../components/MessagingPanel'

export default function OnCallMechanicMessages() {
  return (
    <OnCallMechanicLayout
      activeSection="messages"
      pageMeta={{
        title: 'Messages',
        description: 'Chat with customers and view inquiries.',
      }}
      fullHeightMain={true}
      wrapContent={false}
    >
      <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <MessagingPanel variant="mechanic-technician" className="min-h-0" />
      </div>
    </OnCallMechanicLayout>
  )
}
