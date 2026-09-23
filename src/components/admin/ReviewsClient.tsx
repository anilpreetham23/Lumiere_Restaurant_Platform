"use client";

import { useState } from "react";
import { updateReviewStatusAdminAction } from "@/actions/admin";

interface ReviewsClientProps {
  initialReviews: any[];
  initialStats: {
    avgRating: number;
    totalReviews: number;
  };
}

export default function ReviewsClient({ initialReviews, initialStats }: ReviewsClientProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [stats, setStats] = useState(initialStats);
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const filteredReviews = reviews.filter((r) => {
    if (ratingFilter !== "all" && r.rating !== ratingFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  async function handleStatusChange(reviewId: string, newStatus: "published" | "hidden" | "flagged") {
    setUpdatingId(reviewId);
    setErrorMsg("");

    const res = await updateReviewStatusAdminAction(reviewId, newStatus);
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r))
      );
    } else {
      setErrorMsg(res.error || "Failed to update review status.");
    }
    setUpdatingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Reviews & Dish Ratings</h1>
          <p className="text-sm text-neutral-500">
            Tenant-isolated customer dish ratings, reviews, and moderation management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-cream2 rounded-xl px-4 py-2.5 text-center shadow-sm">
            <span className="text-xs uppercase text-neutral-400 font-semibold block">Average Rating</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="font-serif text-2xl text-ink font-bold">{stats.avgRating.toFixed(1)}</span>
              <span className="text-gold font-bold text-lg">★</span>
            </div>
          </div>
          <div className="bg-white border border-cream2 rounded-xl px-4 py-2.5 text-center shadow-sm">
            <span className="text-xs uppercase text-neutral-400 font-semibold block">Total Reviews</span>
            <span className="font-serif text-2xl text-ink font-bold">{stats.totalReviews}</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
          {errorMsg}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border border-cream2 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">Filter by Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="text-xs border border-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold bg-white"
            >
              <option value="all">All Ratings (1 - 5 ★)</option>
              <option value="5">5 Stars ★★★★★</option>
              <option value="4">4 Stars ★★★★☆</option>
              <option value="3">3 Stars ★★★☆☆</option>
              <option value="2">2 Stars ★★☆☆☆</option>
              <option value="1">1 Star ★☆☆☆☆</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">Filter by Moderation Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-neutral-500">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </span>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white border border-cream2 rounded-xl p-12 text-center text-neutral-400">
          <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-sm font-medium">No reviews match your selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((r) => {
            const isUpdating = updatingId === r.id;
            return (
              <div
                key={r.id}
                className="bg-white border border-cream2 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-serif text-lg text-ink font-semibold">
                        {r.menu_items?.title || `Item #${r.menu_item_id}`}
                      </h3>
                      <div className="text-xs text-neutral-400 font-medium mt-0.5">
                        {r.menu_items?.cuisine ? `${r.menu_items.cuisine} Cuisine` : "Menu Item"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                      {"★".repeat(r.rating)}
                      <span className="ml-1 text-neutral-600">({r.rating}/5)</span>
                    </div>
                  </div>

                  {/* Review Text */}
                  {r.review_text ? (
                    <p className="text-sm text-neutral-700 italic bg-neutral-50 p-3 rounded-lg border border-neutral-100 mt-3">
                      "{r.review_text}"
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 italic mt-3">Star rating only (no written review text)</p>
                  )}
                </div>

                {/* Metadata & Moderation Bar */}
                <div className="pt-3 border-t border-cream2 flex items-center justify-between text-xs text-neutral-500">
                  <div>
                    <div>By: <strong className="text-ink">{r.customer_name || r.customers?.name || "Guest"}</strong></div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Moderation Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${
                      r.status === 'published'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : r.status === 'hidden'
                        ? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      {r.status}
                    </span>

                    <select
                      disabled={isUpdating}
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as any)}
                      className="text-[11px] border border-neutral-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-gold disabled:opacity-50"
                    >
                      <option value="published">Publish</option>
                      <option value="hidden">Hide</option>
                      <option value="flagged">Flag</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
