import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent } from "~/components/ui/card";
import { UserRole } from "~/db/schema";
import type { CommentThread, CommentWithAuthor } from "~/services/lessonCommentService";
import { UserAvatar } from "~/components/user-avatar";

// ─── CommentSection ───
// Displays threaded comments for a lesson.
// Top-level comments can have one level of replies; replies cannot be replied to.
// Delete is available to: comment owner, course instructor, admins.

type Props = {
  comments: CommentThread[];
  currentUserId: number | null;
  currentUserRole: UserRole | null;
  courseInstructorId: number;
  enrolled: boolean;
};

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function DeleteButton({
  commentId,
}: {
  commentId: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const fetcher = useFetcher({ key: `delete-comment-${commentId}` });

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-destructive">Delete?</span>
        <Button
          variant="destructive"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            fetcher.submit(
              { intent: "delete-comment", commentId: String(commentId) },
              { method: "post" }
            );
            setConfirming(false);
          }}
        >
          Confirm
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Delete comment"
      className="h-6 px-2 text-muted-foreground hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

function CommentForm({
  parentId,
  placeholder,
  submitLabel,
  onCancel,
}: {
  parentId?: number;
  placeholder: string;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const fetcher = useFetcher({
    key: parentId ? `post-reply-${parentId}` : "post-comment",
  });
  const [content, setContent] = useState("");

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.commentPosted) {
      setContent("");
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="post-comment" />
      {parentId && (
        <input type="hidden" name="parentId" value={String(parentId)} />
      )}
      <Textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="mb-2 min-h-[80px] resize-none"
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || content.trim().length === 0}
        >
          {isSubmitting ? "Posting..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </fetcher.Form>
  );
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  currentUserRole,
  courseInstructorId,
  enrolled,
}: {
  comment: CommentWithAuthor;
  replies: CommentWithAuthor[];
  currentUserId: number | null;
  currentUserRole: UserRole | null;
  courseInstructorId: number;
  enrolled: boolean;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const canDelete = (c: CommentWithAuthor) =>
    currentUserId !== null &&
    (c.userId === currentUserId ||
      currentUserId === courseInstructorId ||
      currentUserRole === UserRole.Admin);

  return (
    <div className="space-y-3">
      {/* Top-level comment */}
      <div className="flex gap-3">
        <UserAvatar name={comment.authorName} avatarUrl={null} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{comment.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground">{comment.content}</p>
          <div className="mt-1 flex items-center gap-2">
            {enrolled && currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                aria-expanded={showReplyForm}
                onClick={() => setShowReplyForm((v) => !v)}
              >
                Reply
              </Button>
            )}
            {canDelete(comment) && <DeleteButton commentId={comment.id} />}
          </div>

          {showReplyForm && (
            <div className="mt-2">
              <CommentForm
                parentId={comment.id}
                placeholder="Write a reply..."
                submitLabel="Post Reply"
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies — indented */}
      {replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-border pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <UserAvatar name={reply.authorName} avatarUrl={null} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{reply.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(reply.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">{reply.content}</p>
                {canDelete(reply) && (
                  <div className="mt-1">
                    <DeleteButton commentId={reply.id} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({
  comments,
  currentUserId,
  currentUserRole,
  courseInstructorId,
  enrolled,
}: Props) {
  const totalCount = comments.reduce(
    (sum, t) => sum + 1 + t.replies.length,
    0
  );

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">
            Comments {totalCount > 0 && `(${totalCount})`}
          </h2>
        </div>

        {/* Thread list */}
        {comments.length === 0 ? (
          <p className="mb-6 text-sm text-muted-foreground">
            No comments yet. Be the first to start the discussion.
          </p>
        ) : (
          <div className="mb-6 space-y-6">
            {comments.map(({ comment, replies }) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replies={replies}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                courseInstructorId={courseInstructorId}
                enrolled={enrolled}
              />
            ))}
          </div>
        )}

        {/* Post form — only for enrolled students */}
        {enrolled && currentUserId && (
          <>
            <div className="mb-3 border-t pt-4" />
            <CommentForm
              placeholder="Write a comment..."
              submitLabel="Post Comment"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
