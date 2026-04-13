import ShopOwnerDashboard from './dashboard.jsx'
import { MessagingPanel } from '../../components/MessagingPanel'

function MessagesPage() {
  return (
    <ShopOwnerDashboard
      activeSection="messages"
      pageMeta={{
        title: 'Messages',
        description: 'Makipag-chat sa mga customer at tingnan ang inquiries.',
      }}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <MessagingPanel variant="shop-owner" className="min-h-0" />
      </div>
    </ShopOwnerDashboard>
  )
}

export default MessagesPage
