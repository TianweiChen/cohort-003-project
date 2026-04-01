# Lesson Comments Design

**Date:** 2026-03-30
**Status:** Approved

## Context

Students currently have no way to ask questions or discuss lesson content. This feature adds a threaded comment system to lesson pages so students can engage with the material and with each other, while instructors and admins can moderate by deleting comments.

## Requirements

- Enrolled students can post top-level comments on lessons
- Enrolled students can reply to existing top-level comments (one level deep — replies cannot be replied to)
- Comments are visible immediately upon posting (no approval workflow)
- Students can delete their own comments
- The course instructor and admins can delete any comment on lessons within that course
- Unenrolled visitors cannot post comments (read-only view)

## Data Model

New table: `lessonComments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | integer | PK, autoincrement |
| `lessonId` | integer | FK → lessons, not null |
| `userId` | integer | FK → users, not null |
| `parentId` | integer | FK → lessonComments, nullable (null = top-level comment) |
| `content` | text | not null, 1–2000 characters |
| `createdAt` | text | ISO datetime, not null |

**Threading rules:**
- `parentId IS NULL` → top-level comment
- `parentId IS NOT NULL` → reply; `parentId` must reference a top-level comment in the same lesson (enforced in service layer)
- No replies-to-replies (enforced in service layer)

**Hard deletes only** — no soft-delete status column. Deleted comment content is gone; orphaned replies are also deleted (cascade).

## Service Layer

New file: `app/services/lessonCommentService.ts`

### Functions

```ts
// Fetch all comments for a lesson, structured as threads
getCommentsByLessonId(lessonId: number): CommentThread[]
// CommentThread = { comment: LessonComment & { authorName: string }, replies: (LessonComment & { authorName: string })[] }

// Create a comment or reply
createComment(userId: number, lessonId: number, content: string, parentId?: number): LessonComment

// Delete a comment (and cascade-delete its replies if top-level)
// Authorization: own comment, OR course instructor, OR Admin
deleteComment(commentId: number, requestingUserId: number, requestingUserRole: UserRole, courseInstructorId: number): void

// Fetch a single comment (used by delete handler for authorization checks)
getCommentById(commentId: number): LessonComment | null
```

### Validation rules (in service)
- `content` must be 1–2000 characters (trimmed)
- `parentId`, if provided, must reference a comment with `parentId IS NULL` in the same lesson
- `createComment` does not re-check enrollment — the route action checks enrollment before calling the service

## Route Changes

**File:** `app/routes/courses.$slug.lessons.$lessonId.tsx`

### Loader additions
- Call `getCommentsByLessonId(lesson.id)` and include the result in loader data as `comments`
- Also include `isEnrolled` (already computed) and the `courseInstructorId` for client-side delete button visibility

### Action additions
Two new intents added to the existing `action()`:

**`post-comment`**
```
Fields: content (string), parentId (optional coerced number)
Auth: must be logged in + enrolled
Validation: Zod (content: z.string().min(1).max(2000), parentId: z.coerce.number().optional())
On success: return null (React Router re-validates loader data)
```

**`delete-comment`**
```
Fields: commentId (coerced number)
Auth: must be logged in
Authorization: checked in deleteComment() service function
On success: return null
```

## UI

**Placement:** Below the quiz section, above the prev/next navigation, at the bottom of the lesson page.

### Comment section structure

```
[ Comments (N) ]                          ← section heading with count

  [Avatar] StudentName  · 2 hours ago
  Comment text here...
  [Reply]  [Delete ×]                     ← Delete shown to: comment owner, course instructor, Admin

    [Avatar] OtherStudent  · 1 hour ago   ← indented reply
    Reply text here...
    [Delete ×]

  [Avatar] AnotherStudent  · 1 day ago
  Another top-level comment...
  [Reply]  [Delete ×]

─────────────────────────────────────────
  [ Write a comment...           ] textarea  ← only shown to enrolled students
  [ Post Comment ]
```

### Interaction details
- **Reply toggle**: clicking "Reply" on a top-level comment reveals an inline textarea + "Post Reply" button directly below that comment; clicking again collapses it
- **Delete**: inline confirm pattern (same as `DeleteLessonButton` in `instructor.$courseId.tsx`) — first click shows "Delete?" + Confirm/Cancel; confirmed click submits `delete-comment` via `useFetcher`
- **Optimistic UI**: use `useFetcher` for post and delete so the page doesn't do a full reload
- **Empty state**: "No comments yet. Be the first to start the discussion." shown when there are no comments
- **Unenrolled visitors**: see comments read-only; the post textarea is hidden

### Components
- Reuse existing shadcn/ui: `Button`, `Textarea`, `Card`
- Avatar: single-letter initial in a colored circle (no external image dependency)
- Lucide icon: `Trash2` for delete, `MessageSquare` for section icon

## Migration

New Drizzle migration file in `drizzle/` that adds the `lessonComments` table with:
- Cascade delete on `lessonId` (delete lesson → delete its comments)
- Cascade delete on `userId` (delete user → delete their comments)
- Cascade delete on `parentId` (delete top-level comment → delete its replies)

## Testing

**Service tests** in `app/services/lessonCommentService.test.ts`:
- `createComment` inserts a row and returns it
- `createComment` with `parentId` inserts a reply
- `createComment` rejects `parentId` pointing to a reply (not top-level)
- `createComment` rejects `parentId` in a different lesson
- `getCommentsByLessonId` returns structured threads with author names
- `deleteComment` succeeds for comment owner
- `deleteComment` succeeds for course instructor
- `deleteComment` succeeds for Admin
- `deleteComment` throws 403 for unrelated student
- Deleting a top-level comment also deletes its replies

**Manual verification:**
1. Enroll a student, navigate to a lesson, post a comment — it appears immediately
2. Reply to the comment — it appears indented below
3. Delete your own comment — it disappears; its replies are also gone
4. Log in as the course instructor, navigate to the lesson — delete button visible on all comments
5. Log in as an unrelated student — no delete button on other students' comments
6. Visit lesson page while not enrolled — comment form is hidden, existing comments visible
