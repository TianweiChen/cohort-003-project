import { eq, and, inArray } from "drizzle-orm";
import { db } from "~/db";
import { lessonBookmarks, lessons, modules } from "~/db/schema";

// ─── Bookmark Service ───
// Handles lesson bookmarks for enrolled students.
// Bookmarks are private to each student and persist until manually removed.

export function toggleBookmark(opts: { userId: number; lessonId: number }) {
  const { userId, lessonId } = opts;
  const existing = db
    .select()
    .from(lessonBookmarks)
    .where(
      and(
        eq(lessonBookmarks.userId, userId),
        eq(lessonBookmarks.lessonId, lessonId)
      )
    )
    .get();

  if (existing) {
    db.delete(lessonBookmarks)
      .where(eq(lessonBookmarks.id, existing.id))
      .run();
    return false;
  }

  db.insert(lessonBookmarks).values({ userId, lessonId }).run();
  return true;
}

export function isBookmarked(opts: { userId: number; lessonId: number }) {
  const { userId, lessonId } = opts;
  const row = db
    .select({ id: lessonBookmarks.id })
    .from(lessonBookmarks)
    .where(
      and(
        eq(lessonBookmarks.userId, userId),
        eq(lessonBookmarks.lessonId, lessonId)
      )
    )
    .get();
  return row !== undefined;
}

export function getBookmarkedLessonIdsForCourse(opts: {
  userId: number;
  courseId: number;
}): number[] {
  const { userId, courseId } = opts;

  const courseModules = db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .all();

  if (courseModules.length === 0) return [];

  const courseLessons = db
    .select({ id: lessons.id })
    .from(lessons)
    .where(inArray(lessons.moduleId, courseModules.map((m) => m.id)))
    .all();

  if (courseLessons.length === 0) return [];

  const bookmarked = db
    .select({ lessonId: lessonBookmarks.lessonId })
    .from(lessonBookmarks)
    .where(
      and(
        eq(lessonBookmarks.userId, userId),
        inArray(
          lessonBookmarks.lessonId,
          courseLessons.map((l) => l.id)
        )
      )
    )
    .all();

  return bookmarked.map((b) => b.lessonId);
}
