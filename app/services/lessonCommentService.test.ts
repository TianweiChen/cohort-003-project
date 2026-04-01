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
  createComment,
  deleteComment,
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

describe("lessonCommentService — write", () => {
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

  describe("createComment", () => {
    it("creates a top-level comment and returns it", () => {
      const comment = createComment(base.user.id, lesson.id, "  Hello world  ");
      expect(comment).toBeDefined();
      expect(comment.content).toBe("Hello world"); // trimmed
      expect(comment.userId).toBe(base.user.id);
      expect(comment.lessonId).toBe(lesson.id);
      expect(comment.parentId).toBeNull();
    });

    it("creates a reply to a top-level comment", () => {
      const parent = createComment(base.user.id, lesson.id, "Parent");
      const reply = createComment(student2.id, lesson.id, "Reply", parent.id);
      expect(reply.parentId).toBe(parent.id);
    });

    it("throws when parentId points to a reply (not top-level)", () => {
      const parent = createComment(base.user.id, lesson.id, "Parent");
      const reply = createComment(student2.id, lesson.id, "Reply", parent.id);
      expect(() =>
        createComment(base.user.id, lesson.id, "Nested reply", reply.id)
      ).toThrow("Invalid parent comment");
    });

    it("throws when content is empty after trimming", () => {
      expect(() =>
        createComment(base.user.id, lesson.id, "   ")
      ).toThrow("Comment content cannot be empty");
    });

    it("throws when parentId belongs to a different lesson", () => {
      const otherLesson = testDb
        .insert(schema.lessons)
        .values({
          moduleId: lesson.moduleId,
          title: "Other",
          position: 2,
        })
        .returning()
        .get();

      const otherComment = createComment(
        base.user.id,
        otherLesson.id,
        "Other lesson"
      );
      expect(() =>
        createComment(base.user.id, lesson.id, "Cross-lesson reply", otherComment.id)
      ).toThrow("Invalid parent comment");
    });
  });

  describe("deleteComment", () => {
    it("allows a user to delete their own comment", () => {
      const comment = createComment(base.user.id, lesson.id, "My comment");
      deleteComment(
        comment.id,
        base.user.id,
        schema.UserRole.Student,
        base.instructor.id
      );
      expect(getCommentById(comment.id)).toBeUndefined();
    });

    it("allows the course instructor to delete any comment", () => {
      const comment = createComment(base.user.id, lesson.id, "Student comment");
      deleteComment(
        comment.id,
        base.instructor.id,
        schema.UserRole.Instructor,
        base.instructor.id
      );
      expect(getCommentById(comment.id)).toBeUndefined();
    });

    it("allows an admin to delete any comment", () => {
      const admin = testDb
        .insert(schema.users)
        .values({
          name: "Admin",
          email: "admin@example.com",
          role: schema.UserRole.Admin,
        })
        .returning()
        .get();

      const comment = createComment(base.user.id, lesson.id, "Student comment");
      deleteComment(
        comment.id,
        admin.id,
        schema.UserRole.Admin,
        base.instructor.id
      );
      expect(getCommentById(comment.id)).toBeUndefined();
    });

    it("throws when an unrelated student tries to delete another's comment", () => {
      const comment = createComment(base.user.id, lesson.id, "My comment");
      expect(() =>
        deleteComment(
          comment.id,
          student2.id,
          schema.UserRole.Student,
          base.instructor.id
        )
      ).toThrow("Not authorized");
    });

    it("throws when the comment does not exist", () => {
      expect(() =>
        deleteComment(99999, base.user.id, schema.UserRole.Student, base.instructor.id)
      ).toThrow("Comment not found");
    });

    it("cascade-deletes replies when a top-level comment is deleted", () => {
      const parent = createComment(base.user.id, lesson.id, "Parent");
      const reply = createComment(student2.id, lesson.id, "Reply", parent.id);

      deleteComment(
        parent.id,
        base.user.id,
        schema.UserRole.Student,
        base.instructor.id
      );

      expect(getCommentById(parent.id)).toBeUndefined();
      expect(getCommentById(reply.id)).toBeUndefined();
    });
  });
});
