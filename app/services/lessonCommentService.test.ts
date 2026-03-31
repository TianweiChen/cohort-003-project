import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;
let lesson: typeof schema.lessons.$inferSelect;
let student2: typeof schema.users.$inferSelect;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock so the module picks up our test db
import {
  getCommentById,
  getCommentsByLessonId,
} from "./lessonCommentService";

describe("lessonCommentService — read", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);

    const mod = testDb
      .insert(schema.modules)
      .values({ courseId: base.course.id, title: "Module 1", position: 1 })
      .returning()
      .get();

    lesson = testDb
      .insert(schema.lessons)
      .values({ moduleId: mod.id, title: "Lesson 1", position: 1 })
      .returning()
      .get();

    student2 = testDb
      .insert(schema.users)
      .values({
        name: "Student Two",
        email: "student2@example.com",
        role: schema.UserRole.Student,
      })
      .returning()
      .get();
  });

  describe("getCommentById", () => {
    it("returns the comment by id", () => {
      const inserted = testDb
        .insert(schema.lessonComments)
        .values({
          lessonId: lesson.id,
          userId: base.user.id,
          content: "Hello",
          parentId: null,
        })
        .returning()
        .get();

      const found = getCommentById(inserted.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(inserted.id);
      expect(found!.content).toBe("Hello");
    });

    it("returns undefined for a non-existent id", () => {
      expect(getCommentById(99999)).toBeUndefined();
    });
  });

  describe("getCommentsByLessonId", () => {
    it("returns an empty array when there are no comments", () => {
      const threads = getCommentsByLessonId(lesson.id);
      expect(threads).toEqual([]);
    });

    it("returns top-level comments with author name", () => {
      testDb
        .insert(schema.lessonComments)
        .values({
          lessonId: lesson.id,
          userId: base.user.id,
          content: "Top comment",
          parentId: null,
        })
        .run();

      const threads = getCommentsByLessonId(lesson.id);
      expect(threads).toHaveLength(1);
      expect(threads[0].comment.content).toBe("Top comment");
      expect(threads[0].comment.authorName).toBe("Test User");
      expect(threads[0].replies).toEqual([]);
    });

    it("nests replies under their parent comment", () => {
      const parent = testDb
        .insert(schema.lessonComments)
        .values({
          lessonId: lesson.id,
          userId: base.user.id,
          content: "Parent",
          parentId: null,
        })
        .returning()
        .get();

      testDb
        .insert(schema.lessonComments)
        .values({
          lessonId: lesson.id,
          userId: student2.id,
          content: "Reply",
          parentId: parent.id,
        })
        .run();

      const threads = getCommentsByLessonId(lesson.id);
      expect(threads).toHaveLength(1);
      expect(threads[0].replies).toHaveLength(1);
      expect(threads[0].replies[0].content).toBe("Reply");
      expect(threads[0].replies[0].authorName).toBe("Student Two");
    });

    it("does not return comments from a different lesson", () => {
      const otherLesson = testDb
        .insert(schema.lessons)
        .values({
          moduleId: lesson.moduleId,
          title: "Other Lesson",
          position: 2,
        })
        .returning()
        .get();

      testDb
        .insert(schema.lessonComments)
        .values({
          lessonId: otherLesson.id,
          userId: base.user.id,
          content: "Wrong lesson",
          parentId: null,
        })
        .run();

      const threads = getCommentsByLessonId(lesson.id);
      expect(threads).toHaveLength(0);
    });
  });
});
