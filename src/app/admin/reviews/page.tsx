import { getReviewsAdminAction } from "@/actions/admin";
import ReviewsClient from "@/components/admin/ReviewsClient";

export default async function AdminReviewsPage() {
  const res = await getReviewsAdminAction();

  if (!res.ok) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-serif text-2xl text-ink">Reviews & Ratings Module</h1>
        <p className="text-sm text-red-600 mt-2">{res.error || "Failed to load reviews."}</p>
      </div>
    );
  }

  return (
    <ReviewsClient
      initialReviews={res.data || []}
      initialStats={res.stats || { avgRating: 0, totalReviews: 0 }}
    />
  );
}
