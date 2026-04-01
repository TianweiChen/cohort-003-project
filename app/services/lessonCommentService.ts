import { eq } from "drizzle-orm";
import { db } from "~/db";
import { lessonComments, users, UserRole } from "~/db/schema";

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

export function createComment(
  userId: number,
  lessonId: number,
  content: string,
  parentId?: number
) {
  if (parentId !== undefined) {
    const parent = getCommentById(parentId);
    if (!parent || parent.lessonId !== lessonId || parent.parentId !== null) {
      throw new Error("Invalid parent comment");
    }
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Comment content cannot be empty");
  }

  return db
    .insert(lessonComments)
    .values({
      userId,
      lessonId,
      content: trimmed,
      parentId: parentId ?? null,
    })
    .returning()
    .get();
}

/**
 * Deletes a comment if the requester is authorized (owner, course instructor, or admin).
 * IMPORTANT: `requestingUserRole` must be sourced from the authenticated session,
 * not from user-supplied input.
 */
export function deleteComment(
  commentId: number,
  requestingUserId: number,
  requestingUserRole: UserRole,
  courseInstructorId: number
): void {
  const comment = getCommentById(commentId);
  if (!comment) {
    throw new Error("Comment not found");
  }

  const isOwner = comment.userId === requestingUserId;
  const isInstructor = requestingUserId === courseInstructorId;
  const isAdmin = requestingUserRole === UserRole.Admin;

  if (!isOwner && !isInstructor && !isAdmin) {
    throw new Error("Not authorized");
  }

  db.delete(lessonComments).where(eq(lessonComments.id, commentId)).run();
}
