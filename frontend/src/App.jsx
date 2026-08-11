import './App.css'
import { useEffect, useState } from 'react'
import Register from './pages/auth/registration.jsx'
import LandingPage from './pages/landingpage.jsx'
import Login from './pages/auth/login.jsx'
import CustomerDashboard from './pages/customer/dashboard.jsx'
import CustomerMyBookings from './pages/customer/myBookings.jsx'
import CustomerMessages from './pages/customer/messages.jsx'
import CustomerNotification from './pages/customer/notification.jsx'
import CustomerAccountSettings from './pages/customer/accountSettings.jsx'
import CustomerReviewsRatings from './pages/customer/reviewRatings.jsx'
import CustomerFindServices from './pages/customer/findServices.jsx'
import CustomerServiceDetails from './pages/customer/serviceDetails.jsx'
import CustomerViewShop from './pages/customer/viewshop.jsx'
import AdminDashboard from './pages/admin/dashboard.jsx'
import ShopOwnerDashboard from './pages/shopowner/dashboard.jsx'
import ManageEmployeePage from './pages/shopowner/manageEmployee.jsx'
import TrackEmployeePage from './pages/shopowner/trackEmployee.jsx'
import ServiceRequestPage from './pages/shopowner/serviceRequest.jsx'
import AppointmentsSchedulePage from './pages/shopowner/appointmentsSchedule.jsx'
import ServiceHistoryPage from './pages/shopowner/serviceHistory.jsx'
import ServicesPage from './pages/shopowner/services.jsx'
import MessagesPage from './pages/shopowner/messages.jsx'
import ReviewsRatingsPage from './pages/shopowner/reviewsRatings.jsx'
import ReportsAnalyticsPage from './pages/shopowner/reportsAnalytics.jsx'
import NotificationPage from './pages/shopowner/notification.jsx'
import AccountSettingsPage from './pages/shopowner/accountSettings.jsx'
import ShopInfoPage from './pages/shopowner/shopInfo.jsx'
import MechanicTechnicianDashboard from './pages/mechanic/technician/dashboard.jsx'
import MechanicTechnicianAssignedRequest from './pages/mechanic/technician/assignedRequest.jsx'
import MechanicTechnicianServiceHistory from './pages/mechanic/technician/serviceHistory.jsx'
import MechanicTechnicianWorkInfo from './pages/mechanic/technician/workInfo.jsx'
import MechanicTechnicianMessages from './pages/mechanic/technician/messages.jsx'
import MechanicTechnicianReviewRatings from './pages/mechanic/technician/reviewRatings.jsx'
import MechanicTechnicianNotification from './pages/mechanic/technician/notification.jsx'
import OnCallMechanicDashboard from './pages/oncallmechanic/technician/dashboard.jsx'
import OnCallMechanicServices from './pages/oncallmechanic/technician/services.jsx'
import OnCallMechanicBusinessInfo from './pages/oncallmechanic/technician/businessInfo.jsx'
import OnCallMechanicServiceRequest from './pages/oncallmechanic/technician/serviceRequest.jsx'
import OnCallMechanicServiceHistory from './pages/oncallmechanic/technician/serviceHistory.jsx'
import OnCallMechanicMessages from './pages/oncallmechanic/technician/messages.jsx'
import OnCallMechanicRatingReviews from './pages/oncallmechanic/technician/ratingReviews.jsx'
import OnCallMechanicReportAnalytics from './pages/oncallmechanic/technician/reportAnalytics.jsx'
import OnCallMechanicNotification from './pages/oncallmechanic/technician/notification.jsx'
import OnCallMechanicAccountSettings from './pages/oncallmechanic/technician/accountSettings.jsx'

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash || '#/')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const renderRoute = () => {
    const rawHash = (route || '#/').split('?')[0]
    const cleanRoute = rawHash.length > 2 && rawHash.endsWith('/') ? rawHash.slice(0, -1) : rawHash

    if (cleanRoute.startsWith('#/customer/view-shop/')) {
      const raw = route.slice('#/customer/view-shop/'.length)
      const anchorId = decodeURIComponent(raw.split('?')[0] || '')
      return <CustomerViewShop anchorServiceId={anchorId} />
    }
    if (cleanRoute.startsWith('#/customer/shop/')) {
      const raw = route.slice('#/customer/shop/'.length)
      const serviceId = decodeURIComponent(raw.split('?')[0] || '')
      return <CustomerServiceDetails serviceId={serviceId} />
    }
    switch (cleanRoute) {
      case '#/':
      case '':
        return <LandingPage />
      case '#/register':
        return <Register />
      case '#/login':
        return <Login />
      case '#/customer/dashboard':
        return <CustomerDashboard />
      case '#/customer/my-bookings':
        return <CustomerMyBookings />
      case '#/customer/messages':
        return <CustomerMessages />
      case '#/customer/notification':
        return <CustomerNotification />
      case '#/customer/account-settings':
        return <CustomerAccountSettings />
      case '#/customer/reviews-ratings':
        return <CustomerReviewsRatings />
      case '#/customer/find-services':
        return <CustomerFindServices />
      case '#/admin/dashboard':
        return <AdminDashboard />
      case '#/provider/dashboard':
        return <ShopOwnerDashboard />
      case '#/provider/services':
        return <ServicesPage />
      case '#/provider/shop-info':
        return <ShopInfoPage />
      case '#/provider/manage-employee':
        return <ManageEmployeePage />
      case '#/provider/track-employee':
        return <TrackEmployeePage />
      case '#/provider/service-request':
        return <ServiceRequestPage />
      case '#/provider/appointments-schedule':
        return <AppointmentsSchedulePage />
      case '#/provider/service-history':
        return <ServiceHistoryPage />
      case '#/provider/messages':
        return <MessagesPage />
      case '#/provider/reviews-ratings':
        return <ReviewsRatingsPage />
      case '#/provider/reports-analytics':
        return <ReportsAnalyticsPage />
      case '#/provider/notification':
        return <NotificationPage />
      case '#/provider/account-settings':
        return <AccountSettingsPage />
      case '#/mechanic/technician/dashboard':
        return <MechanicTechnicianDashboard />
      case '#/mechanic/technician/assigned-request':
        return <MechanicTechnicianAssignedRequest />
      case '#/mechanic/technician/service-history':
      case '#/mechanic/technician/active-jobs':
        return <MechanicTechnicianServiceHistory />
      case '#/mechanic/technician/work-info':
        return <MechanicTechnicianWorkInfo />
      case '#/mechanic/technician/messages':
        return <MechanicTechnicianMessages />
      case '#/mechanic/technician/reviews-ratings':
        return <MechanicTechnicianReviewRatings />
      case '#/mechanic/technician/notification':
        return <MechanicTechnicianNotification />
      case '#/independent/technician/dashboard':
        return <OnCallMechanicDashboard />
      case '#/independent/technician/services':
        return <OnCallMechanicServices />
      case '#/independent/technician/business-info':
        return <OnCallMechanicBusinessInfo />
      case '#/independent/technician/service-request':
        return <OnCallMechanicServiceRequest />
      case '#/independent/technician/service-history':
        return <OnCallMechanicServiceHistory />
      case '#/independent/technician/messages':
        return <OnCallMechanicMessages />
      case '#/independent/technician/ratings-reviews':
        return <OnCallMechanicRatingReviews />
      case '#/independent/technician/reports-analytics':
        return <OnCallMechanicReportAnalytics />
      case '#/independent/technician/notification':
        return <OnCallMechanicNotification />
      case '#/independent/technician/account-settings':
        return <OnCallMechanicAccountSettings />
      default:
        return <LandingPage />
    }
  }

  return (
    <>
      {renderRoute()}
    </>
  )
}

export default App
