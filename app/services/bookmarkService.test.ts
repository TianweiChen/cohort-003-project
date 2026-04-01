import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;
let mod: typeof schema.modules.$inferSelect;
let lesson: typeof schema.lessons.$inferSelect;
let lesson2: typeof schema.lessons.$inferSelect;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock so the module picks up our test db
import {
  toggleBookmark,
  isBookmarked,
  getBookmarkedLessonIdsForCourse,
} from "./bookmarkService";

beforeEach(() => {
  testDb = createTestDb();
  base = seedBaseData(testDb);

  mod = testDb
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Module 1", position: 1 })
    .returning()
    .get();

  lesson = testDb
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title: "Lesson 1", position: 1 })
    .returning()
    .get();

  lesson2 = testDb
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title: "Lesson 2", position: 2 })
    .returning()
    .get();
});

describe("toggleBookmark", () => {
  it("creates a bookmark and returns true", () => {
    const result = toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    expect(result).toBe(true);
  });

  it("removes an existing bookmark and returns false", () => {
    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    const result = toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    expect(result).toBe(false);
  });

  it("toggling again re-creates the bookmark", () => {
    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    const result = toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    expect(result).toBe(true);
  });

  it("bookmarks are per-user — different users can bookmark the same lesson independently", () => {
    const student2 = testDb
      .insert(schema.users)
      .values({ name: "Student Two", email: "s2@example.com", role: schema.UserRole.Student })
      .returning()
      .get();

    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    // student2 has not bookmarked yet
    expect(isBookmarked({ userId: student2.id, lessonId: lesson.id })).toBe(false);

    toggleBookmark({ userId: student2.id, lessonId: lesson.id });
    expect(isBookmarked({ userId: student2.id, lessonId: lesson.id })).toBe(true);

    // removing student2's bookmark doesn't affect base.user
    toggleBookmark({ userId: student2.id, lessonId: lesson.id });
    expect(isBookmarked({ userId: base.user.id, lessonId: lesson.id })).toBe(true);
  });
});

describe("isBookmarked", () => {
  it("returns false when not bookmarked", () => {
    expect(isBookmarked({ userId: base.user.id, lessonId: lesson.id })).toBe(false);
  });

  it("returns true after bookmarking", () => {
    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    expect(isBookmarked({ userId: base.user.id, lessonId: lesson.id })).toBe(true);
  });

  it("returns false after unbookmarking", () => {
    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    expect(isBookmarked({ userId: base.user.id, lessonId: lesson.id })).toBe(false);
  });
});

describe("getBookmarkedLessonIdsForCourse", () => {
  it("returns an empty array when nothing is bookmarked", () => {
    const ids = getBookmarkedLessonIdsForCourse({
      userId: base.user.id,
      courseId: base.course.id,
    });
    expect(ids).toEqual([]);
  });

  it("returns the id of a bookmarked lesson", () => {
    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    const ids = getBookmarkedLessonIdsForCourse({
      userId: base.user.id,
      courseId: base.course.id,
    });
    expect(ids).toContain(lesson.id);
    expect(ids).toHaveLength(1);
  });

  it("returns ids for multiple bookmarked lessons", () => {
    toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
    toggleBookmark({ userId: base.user.id, lessonId: lesson2.id });
    const ids = getBookmarkedLessonIdsForCourse({
      userId: base.user.id,
      courseId: base.course.id,
    });
    expect(ids).toContain(lesson.id);
    expect(ids).toContain(lesson2.id);
    expect(ids).toHaveLength(2);
  });

  it("does not return lessons from a different course", () => {
    const otherCourse = testDb
      .insert(schema.courses)
      .values({
        title: "Other Course",
        slug: "other-course",
        description: "Another course",
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        status: schema.CourseStatus.Published,
      })
      .returning()
      .get();

    const otherMod = testDb
      .insert(schema.modules)
      .values({ courseId: otherCourse.id, title: "Other Module", position: 1 })
      .returning()
      .get();

    const otherLesson = testDb
      .insert(schema.lessons)
      .values({ moduleId: otherMod.id, title: "Other Lesson", position: 1 })
      .returning()
      .get();

    toggleBookmark({ userId: base.user.id, lessonId: otherLesson.id });

    const ids = getBookmarkedLessonIdsForCourse({
      userId: base.user.id,
      courseId: base.course.id,
    });
    expect(ids).not.toContain(otherLesson.id);
    expect(ids).toHaveLength(0);
  });

  it("only returns bookmarks for the requesting user", () => {
    const student2 = testDb
      .insert(schema.users)
      .values({ name: "Student Two", email: "s2@example.com", role: schema.UserRole.Student })
      .returning()
      .get();

    toggleBookmark({ userId: student2.id, lessonId: lesson.id });

    const ids = getBookmarkedLessonIdsForCourse({
      userId: base.user.id,
      courseId: base.course.id,
    });
    expect(ids).toHaveLength(0);
  });

  it("returns empty array for a course with no modules", () => {
    const emptyCourse = testDb
      .insert(schema.courses)
      .values({
        title: "Empty Course",
        slug: "empty-course",
        description: "No modules",
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        status: schema.CourseStatus.Published,
      })
      .returning()
      .get();

    const ids = getBookmarkedLessonIdsForCourse({
      userId: base.user.id,
      courseId: emptyCourse.id,
    });
    expect(ids).toEqual([]);
  });
});
