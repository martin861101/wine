import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { memberApi, type DiscussionThread } from "@/lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function DiscussionBoard() {
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyBodies, setReplyBodies] = useState<Record<string, string>>({});
  const discussions = useQuery({
    queryKey: ["discussions"],
    queryFn: memberApi.getDiscussions,
    retry: 1,
  });

  const createThread = useMutation({
    mutationFn: () => memberApi.createDiscussion({ title, body }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setComposerOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["discussions"] });
      toast.success("Your post is live.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Your post could not be published."),
  });

  const addComment = useMutation({
    mutationFn: ({ threadId, comment }: { threadId: string; comment: string }) =>
      memberApi.commentOnDiscussion(threadId, comment),
    onSuccess: (_, input) => {
      setReplyBodies((old) => ({ ...old, [input.threadId]: "" }));
      void queryClient.invalidateQueries({ queryKey: ["discussions"] });
      toast.success("Comment added.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Your comment could not be added."),
  });

  function submitThread(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim() || createThread.isPending) return;
    createThread.mutate();
  }

  function submitComment(event: React.FormEvent<HTMLFormElement>, threadId: string) {
    event.preventDefault();
    const comment = replyBodies[threadId]?.trim() ?? "";
    if (!comment || addComment.isPending) return;
    addComment.mutate({ threadId, comment });
  }

  return (
    <Card className="rounded-4xl border-border/60 bg-card/80 shadow-soft">
      <CardContent className="p-7 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">The reading room</p>
            <h2 className="mt-2 font-display text-3xl">Start a conversation</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Share a thought about the current read, ask the club a question or start a new thread.
            </p>
          </div>
          <Button
            variant={composerOpen ? "outline" : "hero"}
            onClick={() => setComposerOpen((open) => !open)}
          >
            {composerOpen ? (
              <X className="mr-2 h-4 w-4" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            {composerOpen ? "Close" : "Start a post"}
          </Button>
        </div>

        {composerOpen ? (
          <form onSubmit={submitThread} className="mt-7 space-y-4 rounded-3xl bg-accent/50 p-5">
            <div>
              <label htmlFor="discussion-title" className="text-sm font-medium">
                Post title
              </label>
              <Input
                id="discussion-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What would you like to discuss?"
                maxLength={200}
                className="mt-2 bg-background/70"
                required
              />
            </div>
            <div>
              <label htmlFor="discussion-body" className="text-sm font-medium">
                Your post
              </label>
              <Textarea
                id="discussion-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Share your thoughts with the club…"
                maxLength={5000}
                className="mt-2 min-h-28 bg-background/70"
                required
              />
            </div>
            <Button type="submit" variant="hero" disabled={createThread.isPending}>
              {createThread.isPending ? "Publishing…" : "Publish post"}
            </Button>
          </form>
        ) : null}

        <div className="mt-8 space-y-5">
          {discussions.isPending ? (
            <div className="flex items-center gap-3 rounded-2xl bg-accent/50 p-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading conversations…
            </div>
          ) : discussions.isError ? (
            <p className="rounded-2xl bg-accent/50 p-5 text-sm text-muted-foreground">
              Conversations are taking a moment to load. Please refresh and try again.
            </p>
          ) : discussions.data?.length ? (
            discussions.data.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                replyBody={replyBodies[thread.id] ?? ""}
                onReplyBodyChange={(value) =>
                  setReplyBodies((old) => ({ ...old, [thread.id]: value }))
                }
                onSubmitComment={(event) => submitComment(event, thread.id)}
                submitting={addComment.isPending}
              />
            ))
          ) : (
            <p className="rounded-2xl bg-accent/50 p-5 text-sm leading-relaxed text-muted-foreground">
              No one has started a conversation yet. Be the first to post.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ThreadCard({
  thread,
  replyBody,
  onReplyBodyChange,
  onSubmitComment,
  submitting,
}: {
  thread: DiscussionThread;
  replyBody: string;
  onReplyBodyChange: (value: string) => void;
  onSubmitComment: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) {
  return (
    <article className="rounded-3xl border border-border/60 bg-background/45 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl leading-tight">{thread.title}</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {thread.author.firstName} {thread.author.lastName} · {formatDate(thread.createdAt)}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {thread.comments.length} {thread.comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>
      <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {thread.body}
      </p>

      {thread.comments.length ? (
        <div className="mt-6 space-y-3 border-l-2 border-primary/20 pl-4">
          {thread.comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl bg-accent/50 p-4">
              <p className="text-xs font-medium">
                {comment.author.firstName} {comment.author.lastName}
                <span className="ml-2 font-normal text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </span>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={onSubmitComment}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={`reply-${thread.id}`} className="sr-only">
            Comment on {thread.title}
          </label>
          <Textarea
            id={`reply-${thread.id}`}
            value={replyBody}
            onChange={(event) => onReplyBodyChange(event.target.value)}
            placeholder="Add to the conversation…"
            maxLength={2000}
            className="min-h-20 bg-background/70"
          />
        </div>
        <Button type="submit" variant="outline" disabled={submitting || !replyBody.trim()}>
          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
          Comment
        </Button>
      </form>
    </article>
  );
}
