import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  CreditCard,
  Heart,
  LoaderCircle,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EventCalendar } from "@/components/site/event-calendar";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  contributionApi,
  memberApi,
  paymentSettingsApi,
  publicApi,
  type ClubEvent,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { parseEventDate } from "@/lib/event-date";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — Wine & Chapters Meetups" },
      {
        name: "description",
        content:
          "Supper clubs, book swaps and author evenings. See upcoming Wine & Chapters meetups, venues, themes and remaining seats.",
      },
      { property: "og:title", content: "Events — Wine & Chapters" },
      {
        property: "og:description",
        content: "Supper clubs, book swaps and author evenings across Johannesburg.",
      },
    ],
  }),
  component: EventsPage,
});

export function MemberEventCard({ event }: { event: ClubEvent }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const remaining = Math.max(0, event.capacity - event.attendingCount);
  const action = useMutation({
    mutationFn: () => memberApi.rsvp(event.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["club-events"] });
      void queryClient.invalidateQueries({ queryKey: ["widget-home"] });
      toast.success("Your RSVP is confirmed.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Your RSVP could not be saved."),
  });

  return (
    <Card className="overflow-hidden rounded-4xl border-border/60 bg-card/70 card-lift">
      {event.coverImage ? (
        <img
          src={event.coverImage}
          alt={`Event artwork for ${event.title}`}
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="h-32 gradient-hero" aria-hidden="true" />
      )}
      <CardContent className="p-8">
        <div className="flex flex-wrap items-center gap-2">
          {event.theme ? <Badge variant="secondary">{event.theme}</Badge> : null}
          <Badge variant="outline">{remaining > 0 ? `${remaining} seats left` : "Full"}</Badge>
        </div>
        <h3 className="mt-4 font-display text-2xl">{event.title}</h3>
        {event.description ? (
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{event.description}</p>
        ) : null}
        <dl className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            <dd>
              {parseEventDate(event.eventDate).toLocaleDateString("en-ZA", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {event.startTime.slice(0, 5)}
            </dd>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            <dd>{event.venueName}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <Ticket className="h-4 w-4 text-primary" aria-hidden="true" />
            <dd>{event.contributionAmount ? `R${event.contributionAmount}` : "Included"}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            <dd>{event.attendingCount} attending</dd>
          </div>
        </dl>
        <Progress
          value={(event.attendingCount / event.capacity) * 100}
          className="mt-6 h-2"
          aria-label={`${event.attendingCount} of ${event.capacity} seats taken`}
        />
        {isAuthenticated ? (
          <Button
            variant={event.myRsvp?.status === "ATTENDING" ? "outline" : "hero"}
            className="mt-7 w-full"
            disabled={event.myRsvp?.status === "ATTENDING" || remaining === 0 || action.isPending}
            onClick={() => action.mutate()}
          >
            {event.myRsvp?.status === "ATTENDING"
              ? "RSVP confirmed"
              : action.isPending
                ? "Saving…"
                : remaining === 0
                  ? "Event full"
                  : "RSVP"}
          </Button>
        ) : (
          <Button variant="hero" className="mt-7 w-full" asChild>
            <Link to="/login" search={{ redirect: "/events" }}>
              Sign in to RSVP
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ContributionCard() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("100");
  const [email, setEmail] = useState(user?.email ?? "");
  const paymentSettings = useQuery({
    queryKey: ["payment-method-settings"],
    queryFn: paymentSettingsApi.get,
    staleTime: 60_000,
  });
  const checkout = useMutation({
    mutationFn: () => contributionApi.checkout(Number(amount), email),
    onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Secure checkout could not start."),
  });

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("contribution") !== "thanks") return;
    toast.success("Thank you for contributing to the next chapter.");
    window.history.replaceState({}, "", "/events");
  }, []);

  function contribute() {
    if (!paymentSettings.data?.onlinePaymentsEnabled) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 20 || value > 100_000) {
      toast.error("Enter a contribution between R20 and R100,000.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast.error("Enter a valid email address for your receipt.");
      return;
    }
    checkout.mutate();
  }

  return (
    <Card className="overflow-hidden rounded-4xl border-primary/25 bg-card/80 shadow-lift">
      <CardContent className="grid gap-8 p-8 sm:p-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blush text-blush-foreground">
            <Heart className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="eyebrow mt-6">Support a gathering</p>
          <h2 className="mt-3 text-3xl tracking-tight sm:text-4xl">
            Help make the next chapter possible.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Membership stays free. Optional contributions help cover welcoming venues, discussion
            materials and small details that make every gathering feel special.
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-background/75 p-6">
          {paymentSettings.isPending ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Loading payment options…
            </p>
          ) : paymentSettings.isError ? (
            <p className="text-sm text-destructive" role="alert">
              Payment options could not be loaded. Please refresh and try again.
            </p>
          ) : !paymentSettings.data?.onlinePaymentsEnabled ? (
            <div aria-live="polite">
              <p className="text-sm font-medium">Manual payment instructions</p>
              <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-foreground">
                {paymentSettings.data?.manualPaymentMessage}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">Choose an amount</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[50, 100, 250, 500].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                      amount === String(value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 hover:border-primary/50"
                    }`}
                  >
                    R{value}
                  </button>
                ))}
              </div>
              <label
                htmlFor="contribution-amount"
                className="mt-5 block text-xs font-medium text-muted-foreground"
              >
                Custom amount (ZAR)
              </label>
              <Input
                id="contribution-amount"
                type="number"
                min="20"
                step="10"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2"
              />
              <label
                htmlFor="contribution-email"
                className="mt-4 block text-xs font-medium text-muted-foreground"
              >
                Receipt email
              </label>
              <Input
                id="contribution-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                readOnly={Boolean(user?.email)}
                className="mt-2"
              />
              <Button
                type="button"
                variant="hero"
                size="lg"
                className="mt-5 w-full"
                disabled={checkout.isPending}
                onClick={contribute}
              >
                {checkout.isPending ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard aria-hidden="true" />
                )}
                {checkout.isPending ? "Opening secure checkout…" : "Continue to secure checkout"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Contribute securely. Contributions are optional and non-recurring.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EventsPage() {
  const [view, setView] = useState("list");
  const { isAuthenticated } = useAuth();
  const events = useQuery({
    queryKey: ["club-events"],
    queryFn: isAuthenticated ? memberApi.getEvents : publicApi.getEvents,
  });
  const liveEvents = events.data ?? [];

  return (
    <>
      <div className="gradient-hero">
        <Section className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="eyebrow">Events</p>
            <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
              Evenings worth clearing your calendar for.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Supper clubs, book swaps and author evenings. Members RSVP first; remaining seats open
              to guests a week before.
            </p>
          </div>
        </Section>
      </div>

      <Section id="events-list" className="pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading align="left" eyebrow="What's coming up" title="Upcoming meetups" />
          <Tabs value={view} onValueChange={setView} className="w-auto">
            <TabsList className="rounded-full">
              <TabsTrigger value="list" className="rounded-full px-5">
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="rounded-full px-5">
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={view} onValueChange={setView} className="mt-10">
          <TabsContent value="list">
            <div className="grid gap-6 lg:grid-cols-3">
              {liveEvents.map((event) => (
                <MemberEventCard key={event.id} event={event} />
              ))}
            </div>
            {events.isPending ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading events…</p>
            ) : null}
            {events.isError ? (
              <p className="py-12 text-center text-sm text-destructive">
                Events could not be loaded. Please refresh and try again.
              </p>
            ) : null}
            {!events.isPending && liveEvents.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No published events yet.
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="calendar">
            {liveEvents.length ? (
              <EventCalendar
                events={liveEvents}
                renderEvent={(event) => <MemberEventCard event={event} />}
              />
            ) : null}
            {events.isPending ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Opening the calendar…
              </p>
            ) : null}
            {events.isError ? (
              <p className="py-12 text-center text-sm text-destructive">
                Events could not be loaded. Please refresh and try again.
              </p>
            ) : null}
            {!events.isPending && !events.isError && liveEvents.length === 0 ? (
              <div className="rounded-4xl border border-border/60 bg-card/60 px-6 py-12 text-center">
                <p className="font-display text-2xl">No published events yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The calendar will update automatically when the next gathering is announced.
                </p>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </Section>
      <Section className="pt-0">
        <ContributionCard />
      </Section>
    </>
  );
}
