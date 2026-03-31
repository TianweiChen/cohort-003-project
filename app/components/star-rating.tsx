import { useState } from "react";
import { Star } from "lucide-react";
import { useFetcher } from "react-router";
import { cn } from "~/lib/utils";

export function StarRatingDisplay({
  average,
  count,
  size = "sm",
}: {
  average: number | null;
  count: number;
  size?: "sm" | "md";
}) {
  const iconClass = size === "sm" ? "size-3.5" : "size-5";

  if (average === null) return null;

  const rounded = Math.round(average * 2) / 2;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              iconClass,
              star <= rounded
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {average.toFixed(1)} ({count})
      </span>
    </div>
  );
}

export function StarRatingInput({
  courseId,
  currentRating,
  fetcher,
}: {
  courseId: number;
  currentRating: number | null;
  fetcher: ReturnType<typeof useFetcher>;
}) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const optimisticRating = fetcher.formData
    ? Number(fetcher.formData.get("rating"))
    : null;
  const displayRating = optimisticRating ?? currentRating;
  const activeRating = hoveredRating ?? displayRating ?? 0;

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-muted-foreground">
        {currentRating ? "Your rating" : "Rate this course"}
      </p>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(null)}
            onClick={() => {
              fetcher.submit(
                { intent: "rate-course", rating: String(star) },
                { method: "POST" }
              );
            }}
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                star <= activeRating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
