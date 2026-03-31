import { eq, and, sql } from "drizzle-orm";
import { db } from "~/db";
import { courseRatings } from "~/db/schema";

// ─── Rating Service ───
// Handles course star ratings (upsert, read, aggregate).
// Uses positional parameters (project convention).

export function getUserRatingForCourse(userId: number, courseId: number) {
  return db
    .select()
    .from(courseRatings)
    .where(
      and(eq(courseRatings.userId, userId), eq(courseRatings.courseId, courseId))
    )
    .get();
}

export function upsertCourseRating(
  userId: number,
  courseId: number,
  rating: number
) {
  return db
    .insert(courseRatings)
    .values({ userId, courseId, rating })
    .onConflictDoUpdate({
      target: [courseRatings.userId, courseRatings.courseId],
      set: { rating },
    })
    .returning()
    .get();
}

export function getCourseRatingStats(courseId: number): {
  average: number | null;
  count: number;
} {
  const result = db
    .select({
      average: sql<number | null>`avg(${courseRatings.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(courseRatings)
    .where(eq(courseRatings.courseId, courseId))
    .get();

  return {
    average: result?.average ?? null,
    count: result?.count ?? 0,
  };
}

// Single query for all courses — used in the course list loader.
export function getRatingStatsForCourses(
  courseIds: number[]
): Map<number, { average: number | null; count: number }> {
  const statsMap = new Map<number, { average: number | null; count: number }>();
  if (courseIds.length === 0) return statsMap;

  const rows = db
    .select({
      courseId: courseRatings.courseId,
      average: sql<number | null>`avg(${courseRatings.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(courseRatings)
    .groupBy(courseRatings.courseId)
    .all();

  for (const row of rows) {
    statsMap.set(row.courseId, { average: row.average, count: row.count });
  }

  return statsMap;
}
