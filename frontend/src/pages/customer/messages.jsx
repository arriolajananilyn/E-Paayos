import { MessagingPanel } from '../../components/MessagingPanel'
import CustomerLayout from '../../layout/customerlayout.jsx'

function CustomerMessages() {
  return (
    <CustomerLayout activePage="messages">
      <div className="w-full max-w-[1440px] mx-auto flex-1 min-h-0 px-2.5 sm:px-8 md:px-12 py-2.5 sm:py-4 flex flex-col h-[calc(100dvh-68px-4.5rem)] md:h-[calc(100vh-65px)]">
        <MessagingPanel variant="customer" />
      </div>
    </CustomerLayout>
  )
}

export default CustomerMessages
