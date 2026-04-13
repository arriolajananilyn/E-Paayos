import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Star } from 'lucide-react'
import ShopOwnerDashboard from './dashboard.jsx'

function ReviewsRatingsPage() {
  return (
    <ShopOwnerDashboard
      activeSection="reviews-ratings"
      pageMeta={{ title: 'Reviews & Ratings', description: 'View customer feedback and overall ratings.' }}
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Star className="h-5 w-5 text-blue-700" />
          </div>
          <CardTitle className="text-base">Reviews & Ratings</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dito mo makikita ang feedback, reviews, at ratings mula sa customers.
          </p>
        </CardContent>
      </Card>
    </ShopOwnerDashboard>
  )
}

export default ReviewsRatingsPage
