import { eq } from "drizzle-orm";
import { db } from "~/db";
import { lessonComments, users } from "~/db/schema";

// ─── Lesson Comment Service ───
// Handles fetching, creating, and deleting lesson comments.
// Threading: parentId=null means top-level; parentId set means reply (one level only).

export type CommentWithAuthor = {
  id: number;
  lessonId: number;
  userId: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  authorName: string;
};

export type CommentThread = {
  comment: CommentWithAuthor;
  replies: CommentWithAuthor[];
};

/**
 * Returns the raw DB row for a comment, without author info.
 * Used internally for validation in write operations (createComment, deleteComment).
 */
export function getCommentById(commentId: number) {
  return db
    .select()
    .from(lessonComments)
    .where(eq(lessonComments.id, commentId))
    .get();
}

export function getCommentsByLessonId(lessonId: number): CommentThread[] {
  const rows = db
    .select({
      id: lessonComments.id,
      lessonId: lessonComments.lessonId,
      userId: lessonComments.userId,
      parentId: lessonComments.parentId,
      content: lessonComments.content,
      createdAt: lessonComments.createdAt,
      authorName: users.name,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(eq(lessonComments.lessonId, lessonId))
    .orderBy(lessonComments.createdAt)
    .all();

  const topLevel = rows.filter((r) => r.parentId === null);
  const replies = rows.filter((r) => r.parentId !== null);

  return topLevel.map((comment) => ({
    comment,
    replies: replies.filter((r) => r.parentId === comment.id),
  }));
}
