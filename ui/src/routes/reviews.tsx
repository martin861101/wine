import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Heart,
  LoaderCircle,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Section, SectionHeading } from "@/components/site/section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bookReviewsApi, memberApi, publicApi, type PublishedReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Book Reviews — Wine & Chapters" },
      {
        name: "description",
        content:
          "Read thoughtful Wine & Chapters member perspectives and write your own structured book review.",
      },
      { property: "og:title", content: "Book Reviews — Wine & Chapters" },
      {
        property: "og:description",
        content: "A modern review journal for the books that made us think, laugh and feel.",
      },
    ],
  }),
  component: ReviewsPage,
});

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  bookTitle: z.string().trim().min(2, "Add the book title").max(180),
  author: z.string().trim().min(2, "Add the author").max(160),
  genre: z.string().trim().min(2, "Add the genre").max(100),
  pickedBy: z.string().trim().max(100),
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(["Paperback", "Hardback", "E-book", "Audiobook"]),
  spiceLevel: z.number().int().min(0).max(5),
  tearLevel: z.number().int().min(0).max(5),
  mood: z.enum(["Happy", "Laughing", "Loved", "Sad", "Emotional"]),
  thoughts: z.string().trim().min(20, "Share at least a few sentences").max(4000),
  favoriteQuotes: z.string().trim().max(1200),
  recommend: z.enum(["Yes", "No", "Maybe"]),
  containsSpoilers: z.boolean(),
});

type ReviewValues = z.infer<typeof reviewSchema>;

const moods = [
  { value: "Happy", emoji: "🙂" },
  { value: "Laughing", emoji: "😂" },
  { value: "Loved", emoji: "😍" },
  { value: "Sad", emoji: "☹️" },
  { value: "Emotional", emoji: "🥹" },
] as const;

function ChoiceScale({
  value,
  onChange,
  icon: Icon,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  icon: typeof Flame;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            aria-label={`${label}: ${level} out of 5`}
            aria-pressed={value === level}
            className={cn(
              "flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === level
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/60 bg-card hover:border-primary/40 hover:bg-accent/50",
            )}
          >
            {level === 0 ? "None" : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {level > 0 ? level : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewShowcase({ loginRedirect = "/reviews" }: { loginRedirect?: string }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const reviews = useQuery({ queryKey: ["published-reviews"], queryFn: publicApi.getReviews });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [comment, setComment] = useState("");
  const items = reviews.data ?? [];
  const selected = items[active] as PublishedReview | undefined;
  const addComment = useMutation({
    mutationFn: () => memberApi.commentOnReview(selected!.id, comment),
    onSuccess: () => {
      setComment("");
      void queryClient.invalidateQueries({ queryKey: ["published-reviews"] });
      toast.success("Your comment has been added.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Your comment could not be added."),
  });

  useEffect(() => {
    if (paused || items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % items.length), 8000);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [active, items.length]);

  if (reviews.isPending)
    return (
      <p className="mt-12 text-center text-sm text-muted-foreground">Opening the review journal…</p>
    );
  if (reviews.isError)
    return (
      <p className="mt-12 text-center text-sm text-destructive">Reviews could not be loaded.</p>
    );
  if (!selected)
    return (
      <p className="mt-12 rounded-3xl bg-accent/50 p-8 text-center text-sm text-muted-foreground">
        No reviews have been published yet.
      </p>
    );

  function move(direction: number) {
    setActive((index) => (index + direction + items.length) % items.length);
  }

  return (
    <div
      className="mx-auto mt-12 max-w-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Card
        key={selected.id}
        className="review-rotator__card min-h-[30rem] rounded-4xl border-border/60 bg-card/80 shadow-soft"
      >
        <CardContent className="flex min-h-[30rem] flex-col p-7 sm:p-10">
          <div className="flex items-start gap-4">
            {selected.bookCoverUrl ? (
              <img
                src={selected.bookCoverUrl}
                alt=""
                className="h-24 w-16 rounded-xl object-cover shadow-soft"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{selected.bookTitle}</p>
              <h3 className="mt-2 font-display text-2xl">{selected.title}</h3>
              <div className="mt-4 flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-primary/20 shadow-soft">
                  {selected.author.avatarUrl ? (
                    <AvatarImage
                      src={selected.author.avatarUrl}
                      alt={`${selected.author.firstName} ${selected.author.lastName}`}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-blush text-sm font-semibold text-blush-foreground">
                    {selected.author.firstName.charAt(0)}
                    {selected.author.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">
                  {selected.author.firstName} {selected.author.lastName}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-7 line-clamp-8 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {selected.body}
          </p>
          <div className="mt-auto border-t border-border/60 pt-6">
            <p className="text-sm font-medium">Conversation · {selected.comments.length}</p>
            {selected.comments.length ? (
              <div className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-2">
                {selected.comments.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-accent/50 px-4 py-3 text-sm">
                    <span className="font-medium">{item.author.firstName}</span>{" "}
                    <span className="text-muted-foreground">{item.body}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Be the first member to continue the conversation.
              </p>
            )}
            {isAuthenticated ? (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (comment.trim()) addComment.mutate();
                }}
              >
                <Input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={2000}
                  placeholder="Add a kind, thoughtful comment…"
                  aria-label="Review comment"
                />
                <Button
                  type="submit"
                  variant="hero"
                  disabled={!comment.trim() || addComment.isPending}
                >
                  Post
                </Button>
              </form>
            ) : (
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link to="/login" search={{ redirect: loginRedirect }}>
                  Sign in to comment
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {items.length > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => move(-1)}
            aria-label="Previous review"
          >
            <ChevronLeft />
          </Button>
          <span className="text-xs text-muted-foreground">
            {active + 1} of {items.length}
          </span>
          <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Next review">
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ReviewLatestRead({ id = "write-review" }: { id?: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      bookTitle: "",
      author: "",
      genre: "",
      pickedBy: "",
      startDate: "",
      endDate: "",
      format: "Paperback",
      spiceLevel: 0,
      tearLevel: 0,
      mood: "Happy",
      thoughts: "",
      favoriteQuotes: "",
      recommend: "Yes",
      containsSpoilers: false,
    },
  });
  const publish = useMutation({
    mutationFn: bookReviewsApi.publish,
    onSuccess: ({ message }) => {
      setSubmitError("");
      toast.success(message);
      form.reset();
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Your review could not be submitted.";
      setSubmitError(message);
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      toast.error(message);
    },
  });
  const rating = form.watch("rating");
  const spiceLevel = form.watch("spiceLevel");
  const tearLevel = form.watch("tearLevel");
  const mood = form.watch("mood");

  function onSubmit(values: ReviewValues) {
    setSubmitError("");
    if (!isAuthenticated) {
      toast.info("Sign in to publish your review.");
      window.setTimeout(() => window.location.assign("/login"), 500);
      return;
    }
    publish.mutate(values);
  }

  function onInvalid() {
    setSubmitError("Please complete the highlighted review fields, including a star rating.");
    window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }

  return (
    <>
      <Section id={id}>
        <SectionHeading
          eyebrow="Your reading journal"
          title="Review your latest read"
          description="Inspired by the club’s paper review sheet, rebuilt as a polished form that works beautifully on every screen."
        />
        <Card className="mx-auto mt-12 max-w-6xl overflow-hidden rounded-4xl border-primary/20 bg-card/85 shadow-lift">
          <CardContent className="p-6 sm:p-10 lg:p-12">
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate>
              {submitError ? (
                <div
                  ref={errorSummaryRef}
                  role="alert"
                  tabIndex={-1}
                  className="mb-6 rounded-2xl border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                >
                  {submitError}
                </div>
              ) : null}
              <div className="flex flex-col gap-6 border-b border-border/60 pb-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="eyebrow">Book club review</p>
                  <h2 className="mt-2 font-display text-3xl">What did this story do to you?</h2>
                </div>
                <fieldset>
                  <legend className="sr-only">Star rating</legend>
                  <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => form.setValue("rating", star, { shouldValidate: true })}
                        className="rounded-full p-1.5 text-primary transition-transform hover:scale-110"
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                      >
                        <Star
                          className={cn("h-7 w-7", star <= rating && "fill-current")}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.rating ? (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.rating.message}
                    </p>
                  ) : null}
                </fieldset>
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="review-title">Title</Label>
                      <Input
                        id="review-title"
                        className="mt-2"
                        placeholder="The book title"
                        {...form.register("bookTitle")}
                      />
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.bookTitle?.message}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="review-author">Author</Label>
                      <Input
                        id="review-author"
                        className="mt-2"
                        placeholder="Author name"
                        {...form.register("author")}
                      />
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.author?.message}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="review-genre">Genre</Label>
                      <Input
                        id="review-genre"
                        className="mt-2"
                        placeholder="Literary fiction"
                        {...form.register("genre")}
                      />
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.genre?.message}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="review-picker">Picked by</Label>
                      <Input
                        id="review-picker"
                        className="mt-2"
                        placeholder="Member or club vote"
                        {...form.register("pickedBy")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="review-format">Format</Label>
                      <select
                        id="review-format"
                        className="mt-2 flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                        {...form.register("format")}
                      >
                        <option>Paperback</option>
                        <option>Hardback</option>
                        <option>E-book</option>
                        <option>Audiobook</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="review-start">Start date</Label>
                      <div className="relative mt-2">
                        <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="review-start"
                          type="date"
                          className="pl-9"
                          {...form.register("startDate")}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="review-end">End date</Label>
                      <div className="relative mt-2">
                        <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="review-end"
                          type="date"
                          className="pl-9"
                          {...form.register("endDate")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 rounded-3xl bg-muted/45 p-5 sm:grid-cols-2">
                    <ChoiceScale
                      label="Spice level"
                      value={spiceLevel}
                      onChange={(value) => form.setValue("spiceLevel", value)}
                      icon={Flame}
                    />
                    <ChoiceScale
                      label="Tear level"
                      value={tearLevel}
                      onChange={(value) => form.setValue("tearLevel", value)}
                      icon={Droplets}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <fieldset>
                    <legend className="text-sm font-medium">Made me feel</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {moods.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => form.setValue("mood", option.value)}
                          aria-pressed={mood === option.value}
                          className={cn(
                            "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                            mood === option.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 bg-background hover:border-primary/50",
                          )}
                        >
                          <span aria-hidden="true">{option.emoji}</span> {option.value}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <Label htmlFor="review-thoughts">Thoughts</Label>
                    <Textarea
                      id="review-thoughts"
                      rows={7}
                      className="mt-2 resize-y"
                      placeholder="What stayed with you? Which character, idea or moment changed the way you saw the story?"
                      {...form.register("thoughts")}
                    />
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.thoughts?.message}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="review-quotes">Favourite quotes</Label>
                    <Textarea
                      id="review-quotes"
                      rows={4}
                      className="mt-2 resize-y"
                      placeholder="Save a line or passage you want to remember."
                      {...form.register("favoriteQuotes")}
                    />
                  </div>

                  <fieldset>
                    <legend className="text-sm font-medium">Would you recommend it?</legend>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {(["Yes", "No", "Maybe"] as const).map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-sm"
                        >
                          <input
                            type="radio"
                            value={option}
                            className="accent-primary"
                            {...form.register("recommend")}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                    <Checkbox
                      id="review-spoilers"
                      checked={form.watch("containsSpoilers")}
                      onCheckedChange={(checked) =>
                        form.setValue("containsSpoilers", checked === true)
                      }
                    />
                    <div>
                      <Label htmlFor="review-spoilers">This review contains spoilers</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        We will label it clearly before other members read it.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-4 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                  Reviews are moderated before they appear in the member feed.
                </p>
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  disabled={publish.isPending || isLoading}
                >
                  {publish.isPending ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : isAuthenticated ? (
                    <Send aria-hidden="true" />
                  ) : (
                    <BookOpen aria-hidden="true" />
                  )}
                  {isLoading
                    ? "Checking membership…"
                    : publish.isPending
                      ? "Submitting…"
                      : isAuthenticated
                        ? "Submit review"
                        : "Sign in to publish"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Section>

      <Section className="pt-0">
        <div className="mx-auto flex max-w-4xl items-center gap-4 rounded-3xl border border-border/60 bg-card/60 p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush text-blush-foreground">
            <Heart className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Thoughtful reviews make the next conversation richer. Be honest, be kind and leave room
            for another reader to see the book differently.
          </p>
        </div>
      </Section>
    </>
  );
}

function ReviewsPage() {
  return (
    <>
      <div className="gradient-hero">
        <Section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Book reviews</p>
            <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
              Every book leaves a little something behind.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Keep the rating, the tears, the spice and the lines you never want to forget — all in
              one thoughtful review.
            </p>
          </div>
        </Section>
      </div>

      <Section id="reviews-journal" className="pt-14">
        <SectionHeading
          eyebrow="In their words"
          title="What members say"
          description="One thoughtful member perspective at a time. The journal pauses while you read or join the conversation."
        />
        <ReviewShowcase />
      </Section>

      <ReviewLatestRead />
    </>
  );
}
