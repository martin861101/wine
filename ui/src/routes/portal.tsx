import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Activity,
  BookHeart,
  Check,
  Loader2,
  MapPin,
  Megaphone,
  Search,
  Star,
  Trophy,
  Vote,
  Wine,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Section } from "@/components/site/section";
import { DiscussionBoard } from "@/components/site/discussion-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { memberApi, type BookSearchResult } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Member hub — Wine & Chapters" },
      {
        name: "description",
        content: "Your current read, upcoming events, votes and club updates.",
      },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const home = useQuery({
    queryKey: ["widget-home"],
    queryFn: memberApi.getWidgetHome,
    enabled: isAuthenticated,
    retry: 1,
  });

  const action = useMutation({
    mutationFn: (input: {
      kind: "rating" | "rsvp" | "vote";
      id: string;
      value?: number | string;
    }) => {
      if (input.kind === "rating") return memberApi.rateBook(input.id, Number(input.value));
      if (input.kind === "rsvp") return memberApi.rsvp(input.id);
      return memberApi.vote(input.id, String(input.value));
    },
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: ["widget-home"] });
      if (input.kind === "rating") toast.success("Your rating has been saved.");
      if (input.kind === "rsvp") toast.success("You’re on the guest list.");
      if (input.kind === "vote") toast.success("Your vote has been counted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "That action could not be completed."),
  });

  if (authLoading) return <PortalLoading />;
  if (!isAuthenticated) {
    return (
      <Section className="py-24">
        <Card className="mx-auto max-w-xl rounded-4xl border-border/60 bg-card/80">
          <CardContent className="p-10 text-center">
            <p className="eyebrow">Member hub</p>
            <h1 className="mt-4 font-display text-4xl tracking-tight">
              The reading room is members-only.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Sign in to see your current read, RSVP to gatherings and take part in the next vote.
            </p>
            <Button variant="hero" className="mt-8" asChild>
              <Link to="/login" search={{ redirect: "/portal" }}>
                Sign in to continue
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Section>
    );
  }
  if (home.isPending) return <PortalLoading />;
  if (home.isError) {
    return (
      <Section className="py-24">
        <Card className="mx-auto max-w-xl rounded-4xl border-destructive/30 bg-card/80">
          <CardContent className="p-10 text-center">
            <p className="eyebrow">A quiet moment</p>
            <h1 className="mt-4 font-display text-3xl tracking-tight">
              The member hub could not load.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button variant="outline" className="mt-7" onClick={() => void home.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </Section>
    );
  }

  const data = home.data;
  if (!data) return null;
  const current = data.currentBook;
  const ballot = data.activeBallot ?? data.activePoll;

  return (
    <>
      <div className="gradient-hero">
        <Section className="py-16 sm:py-24">
          <p className="eyebrow">Wine & Chapters member hub</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight tracking-tight sm:text-5xl">
            A little room for the book, the people and what comes next.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Everything important to your chapter, gathered in one calm place.
          </p>
        </Section>
      </div>

      <Section className="grid gap-6 pt-14 lg:grid-cols-[1.1fr_0.9fr]">
        <Card
          id="club-current-read"
          className="overflow-hidden rounded-4xl border-border/60 bg-card/80 shadow-soft"
        >
          <CardContent className="p-7 sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Current read</p>
                <h2 className="mt-2 font-display text-3xl">
                  {current?.book.title ?? "No current book yet"}
                </h2>
              </div>
              <BookBadge />
            </div>
            {current ? (
              <div className="mt-7 grid gap-7 sm:grid-cols-[9rem_1fr]">
                {current.book.coverUrl ? (
                  <img
                    src={current.book.coverUrl}
                    alt={`Cover of ${current.book.title}`}
                    className="mx-auto aspect-[3/4] w-36 rounded-2xl object-cover shadow-lift sm:mx-0"
                  />
                ) : (
                  <div className="mx-auto flex aspect-[3/4] w-36 items-center justify-center rounded-2xl bg-accent p-4 text-center font-display sm:mx-0">
                    {current.book.title}
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">
                    by {current.book.author ?? "Unknown author"}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {current.book.description ??
                      "The club has chosen a new story. Check back soon for more details."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      <CalendarDays className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      {current.startDate} — {current.endDate}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {current.reviews} reviews
                    </Badge>
                  </div>
                  <div
                    className="mt-6 flex flex-wrap items-center gap-1"
                    aria-label={`Rate ${current.book.title}`}
                  >
                    <span className="mr-2 text-sm text-muted-foreground">Rate this read</span>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className="rounded-full p-1 text-primary transition-colors hover:bg-accent disabled:opacity-50"
                        disabled={action.isPending}
                        onClick={() =>
                          action.mutate({ kind: "rating", id: current.book.id, value })
                        }
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      >
                        <Star
                          className="h-5 w-5"
                          fill={(current.myRating ?? 0) >= value ? "currentColor" : "none"}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {current.averageRating.toFixed(1)} average · {current.ratingCount} ratings
                    </span>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Club reading progress</span>
                      <span className="text-muted-foreground">{current.progressPercent}%</span>
                    </div>
                    <Progress
                      value={current.progressPercent}
                      className="mt-3 h-2"
                      aria-label={`Club reading progress: ${current.progressPercent} percent`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="An admin has not selected the next club read yet." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-4xl border-border/60 bg-card/80 shadow-soft">
          <CardContent className="p-7 sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Next gathering</p>
                <h2 className="mt-2 font-display text-2xl">
                  {data.upcomingEvent?.title ?? "No upcoming event"}
                </h2>
              </div>
              <Wine className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            {data.upcomingEvent ? (
              <>
                <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                  {data.upcomingEvent.eventDate} · {data.upcomingEvent.startTime}
                </p>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                  {data.upcomingEvent.venueName}
                </p>
                <div className="mt-7">
                  <Progress
                    value={(data.upcomingEvent.attendingCount / data.upcomingEvent.capacity) * 100}
                    className="h-2"
                    aria-label={`${data.upcomingEvent.attendingCount} of ${data.upcomingEvent.capacity} seats taken`}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {data.upcomingEvent.capacityRemaining} seats remaining
                  </p>
                </div>
                <Button
                  variant={data.upcomingEvent.myRsvp?.status === "ATTENDING" ? "outline" : "hero"}
                  className="mt-7 w-full"
                  disabled={
                    action.isPending ||
                    data.upcomingEvent.myRsvp?.status === "ATTENDING" ||
                    data.upcomingEvent.capacityRemaining <= 0
                  }
                  onClick={() => action.mutate({ kind: "rsvp", id: data.upcomingEvent!.id })}
                >
                  {data.upcomingEvent.myRsvp?.status === "ATTENDING" ? (
                    <>
                      <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                      You’re attending
                    </>
                  ) : data.upcomingEvent.capacityRemaining <= 0 ? (
                    "Event is full"
                  ) : (
                    "I’m attending"
                  )}
                </Button>
              </>
            ) : (
              <EmptyState text="The next gathering will appear here when it is published." />
            )}
          </CardContent>
        </Card>
      </Section>

      <Section className="grid gap-6 pt-0 lg:grid-cols-[1fr_0.65fr]">
        <Card id="club-poll" className="rounded-4xl border-border/60 bg-card/80">
          <CardContent className="p-7 sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Have your say</p>
                <h2 className="mt-2 font-display text-2xl">{ballot?.title ?? "No active vote"}</h2>
              </div>
              <Vote className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            {ballot ? (
              <div className="mt-6 space-y-3">
                {ballot.options.map((option) => {
                  const selected =
                    selectedOptions[ballot.id] === option.id || ballot.myVoteId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${selected ? "border-primary bg-accent/60" : "border-border/60 hover:border-primary/50"}`}
                      disabled={Boolean(ballot.myVoteId) || action.isPending}
                      onClick={() =>
                        setSelectedOptions((old) => ({ ...old, [ballot.id]: option.id }))
                      }
                    >
                      <span className="flex items-center gap-3 text-sm font-medium">
                        {selected ? (
                          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                        ) : (
                          <span
                            className="h-4 w-4 rounded-full border border-border"
                            aria-hidden="true"
                          />
                        )}
                        {option.label}
                      </span>
                      {ballot.myVoteId ? (
                        <span className="text-xs text-muted-foreground">{option.percentage}%</span>
                      ) : null}
                    </button>
                  );
                })}
                <Button
                  variant="hero"
                  className="mt-3 w-full"
                  disabled={
                    !selectedOptions[ballot.id] || Boolean(ballot.myVoteId) || action.isPending
                  }
                  onClick={() => {
                    const optionId = selectedOptions[ballot.id];
                    if (optionId) action.mutate({ kind: "vote", id: ballot.id, value: optionId });
                  }}
                >
                  {action.isPending
                    ? "Saving…"
                    : ballot.myVoteId
                      ? "Vote recorded"
                      : "Cast my vote"}
                </Button>
              </div>
            ) : (
              <EmptyState text="There is no open ballot or poll right now." />
            )}
          </CardContent>
        </Card>
        <div className="space-y-6">
          {data.announcement ? (
            <Card className="rounded-4xl border-border/60 bg-card/80">
              <CardContent className="p-7">
                <div className="flex gap-3">
                  <Megaphone className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="eyebrow">Club note</p>
                    <h2 className="mt-2 font-display text-xl">{data.announcement.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {data.announcement.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card className="rounded-4xl border-border/60 bg-card/80">
            <CardContent className="p-7">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="eyebrow">Club snapshot</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-accent/60 p-4">
                  <p className="font-display text-3xl">{data.stats.members}</p>
                  <p className="mt-1 text-xs text-muted-foreground">members</p>
                </div>
                <div className="rounded-2xl bg-accent/60 p-4">
                  <p className="font-display text-3xl">{data.stats.booksRead}</p>
                  <p className="mt-1 text-xs text-muted-foreground">club reads</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/events">Browse events</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/about">About the club</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="pt-0">
        <PortalClubhouse />
      </Section>

      <Section className="pt-0">
        <DiscussionBoard />
      </Section>
    </>
  );
}

function PortalClubhouse() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const discovery = useQuery({
    queryKey: ["book-discovery", submittedQuery],
    queryFn: () => memberApi.searchBooks(submittedQuery),
    enabled: submittedQuery.length >= 2,
  });
  const activity = useQuery({
    queryKey: ["community-activity"],
    queryFn: memberApi.getCommunityActivity,
  });
  const suggest = useMutation({
    mutationFn: (book: BookSearchResult) => memberApi.suggestBook(book),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-activity"] });
      toast.success("Your book suggestion is now in the community box.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The suggestion could not be saved."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
      <Card id="suggest-book" className="rounded-4xl border-border/60 bg-card/80">
        <CardContent className="p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <BookHeart className="h-5 w-5 text-primary" />
            <div>
              <p className="eyebrow">Discover & suggest</p>
              <h2 className="mt-2 font-display text-2xl">Find our next shared story</h2>
            </div>
          </div>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedQuery(query.trim());
            }}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search books by title or author"
              minLength={2}
              aria-label="Search books"
            />
            <Button type="submit" variant="hero" disabled={query.trim().length < 2}>
              <Search /> Search
            </Button>
          </form>
          {discovery.isPending && submittedQuery ? (
            <p className="mt-6 text-sm text-muted-foreground">Searching the shelves…</p>
          ) : null}
          {discovery.isError ? (
            <p className="mt-6 text-sm text-destructive">
              Book discovery is unavailable right now.
            </p>
          ) : null}
          {discovery.data ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {discovery.data.map((book) => (
                <div
                  key={`${book.externalProvider}-${book.externalId}`}
                  className="flex gap-3 rounded-3xl border border-border/60 p-4"
                >
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="h-24 w-16 rounded-lg object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-display">{book.title}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{book.author}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => suggest.mutate(book)}
                      disabled={suggest.isPending}
                    >
                      Suggest
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card className="rounded-4xl border-border/60 bg-card/80">
        <CardContent className="p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="eyebrow">Around the clubhouse</p>
              <h2 className="mt-2 font-display text-2xl">Community activity</h2>
            </div>
          </div>
          {activity.isPending ? (
            <p className="mt-6 text-sm text-muted-foreground">Gathering the latest chapters…</p>
          ) : null}
          {activity.data?.length ? (
            <ol className="mt-6 space-y-3">
              {activity.data.slice(0, 8).map((item) => (
                <li key={item.id} className="rounded-2xl bg-accent/50 p-4 text-sm leading-relaxed">
                  {item.text}
                </li>
              ))}
            </ol>
          ) : !activity.isPending ? (
            <EmptyState text="Community activity will appear as members suggest, review and vote." />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function BookBadge() {
  return (
    <Badge variant="secondary" className="rounded-full">
      <Star className="mr-1 h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
      Members’ pick
    </Badge>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <p className="mt-8 rounded-2xl bg-accent/50 p-5 text-sm leading-relaxed text-muted-foreground">
      {text}
    </p>
  );
}
function PortalLoading() {
  return (
    <Section className="flex min-h-[60dvh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Opening the reading room…
      </div>
    </Section>
  );
}
