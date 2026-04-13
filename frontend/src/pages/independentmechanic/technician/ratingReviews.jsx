import { Star } from 'lucide-react'
import IndependentMechanicLayout, { IndependentPlaceholder } from './IndependentMechanicLayout.jsx'

export default function IndependentMechanicRatingReviews() {
  return (
    <IndependentMechanicLayout
      activeSection="ratings-reviews"
      pageMeta={{
        title: 'Ratings & Reviews',
        description: 'Feedback mula sa mga customer.',
      }}
    >
      <IndependentPlaceholder
        icon={Star}
        title="Ratings & Reviews (placeholder)"
        body="Dito ipapakita ang average rating at mga review — katulad ng Reviews & Ratings ng shop owner."
      />
    </IndependentMechanicLayout>
  )
}
