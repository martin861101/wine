import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessagesSquare,
  PenLine,
  Quote,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wine,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/site/reveal";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { benefits, testimonials } from "@/data/site";
import { newsletterApi, publicApi } from "@/lib/api";
import { openBooksWidget } from "@/lib/books-widget";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wine & Chapters — A Women's Book Club in Johannesburg" },
      {
        name: "description",
        content:
          "One curated read a month, candlelit meetups and 120+ women who love a good story. Join the Wine & Chapters book club community.",
      },
      { property: "og:title", content: "Wine & Chapters — A Women's Book Club" },
      {
        property: "og:description",
        content:
          "One curated read a month, candlelit meetups and 120+ women who love a good story.",
      },
    ],
  }),
  component: HomePage,
});

const iconMap: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  BookOpen,
  Wine,
  MessagesSquare,
  Trophy,
  Users,
  Sparkles,
};

function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const artworkX = useSpring(pointerX, { stiffness: 42, damping: 24, mass: 0.9 });
  const artworkPointerY = useSpring(pointerY, { stiffness: 42, damping: 24, mass: 0.9 });
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const artworkScrollY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 64]);
  const contentScrollY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 42]);
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.72, 1],
    [1, shouldReduceMotion ? 1 : 0.96, shouldReduceMotion ? 1 : 0.3],
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldReduceMotion || event.pointerType !== "mouse") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 7);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 5);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const revealTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        duration: 1.65,
        delay: 0.12,
        times: [0, 0.55, 1],
        ease: [0.22, 1, 0.36, 1] as const,
      };
  const entrance = (delay: number) => ({
    initial: shouldReduceMotion ? false : { opacity: 0, y: 22, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: shouldReduceMotion
      ? { duration: 0 }
      : { duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section
      ref={heroRef}
      className="home-hero"
      aria-labelledby="home-hero-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <motion.div
        className="home-hero__media"
        aria-hidden="true"
        initial={
          shouldReduceMotion
            ? false
            : {
                clipPath:
                  "polygon(92% 0%, 100% 0%, 100% 100%, 89% 100%, 94% 84%, 88% 69%, 93% 52%, 87% 35%, 94% 18%)",
              }
        }
        animate={{
          clipPath: [
            "polygon(92% 0%, 100% 0%, 100% 100%, 89% 100%, 94% 84%, 88% 69%, 93% 52%, 87% 35%, 94% 18%)",
            "polygon(34% 0%, 100% 0%, 100% 100%, 28% 100%, 36% 84%, 29% 69%, 35% 52%, 27% 35%, 36% 18%)",
            "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 84%, 0% 69%, 0% 52%, 0% 35%, 0% 18%)",
          ],
        }}
        transition={revealTransition}
      >
        <motion.div className="home-hero__scene" style={{ x: artworkX, y: artworkScrollY }}>
          <motion.div className="home-hero__picture-wrap" style={{ y: artworkPointerY }}>
            <picture className="home-hero__picture">
              <source media="(max-width: 767px)" srcSet="/img/hero_mobile.png" />
              <img
                src="/img/hero_bg.png"
                alt=""
                width={1672}
                height={941}
                decoding="async"
                fetchPriority="high"
              />
            </picture>
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="home-hero__petals" aria-hidden="true">
        <span className="home-hero__petal home-hero__petal--one" />
        <span className="home-hero__petal home-hero__petal--two" />
        <span className="home-hero__petal home-hero__petal--three" />
        <span className="home-hero__petal home-hero__petal--four" />
      </div>

      <motion.div
        className="home-hero__content mx-auto w-full max-w-7xl px-5 sm:px-8"
        style={{ y: contentScrollY, opacity: contentOpacity }}
      >
        <div className="home-hero__copy">
          <motion.p className="home-hero__eyebrow" {...entrance(0.68)}>
            Johannesburg · A women&apos;s literary circle
          </motion.p>

          <motion.h1 id="home-hero-title" className="home-hero__title" {...entrance(0.88)}>
            <span>Wine</span>
            <em>&amp; Chapters</em>
          </motion.h1>

          <motion.p className="home-hero__lede" {...entrance(1.18)}>
            A women&apos;s book club for slow evenings, good wine and better stories.
          </motion.p>

          <motion.div className="home-hero__actions" {...entrance(1.48)}>
            <Button size="lg" variant="hero" className="home-hero__primary-cta" asChild>
              <Link to="/register">
                Join the club
                <ArrowRight className="btn-arrow" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="home-hero__secondary-cta" asChild>
              <a href="#this-months-read">Discover this month&apos;s read</a>
            </Button>
          </motion.div>
        </div>
      </motion.div>
      <div className="home-hero__transition" aria-hidden="true" />
    </section>
  );
}

function About() {
  const navigate = useNavigate();
  const [isOpening, setIsOpening] = useState(false);
  const transitionTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    },
    [],
  );

  const openStory = () => {
    if (isOpening) return;

    setIsOpening(true);
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    transitionTimer.current = window.setTimeout(
      () => navigate({ to: "/about" }),
      shouldReduceMotion ? 0 : 1100,
    );
  };

  return (
    <Section id="about" className="home-about !pt-6">
      <img
        src="/img/branch-shadow-medium.svg"
        alt=""
        className="home-about__branch home-about__branch--left"
        aria-hidden="true"
      />
      <img
        src="/img/branch-shadow-small.svg"
        alt=""
        className="home-about__branch home-about__branch--right"
        aria-hidden="true"
      />

      <div className="home-about__book-stage">
        <article className={`home-about__book-cover${isOpening ? " is-opening" : ""}`}>
          <div className="home-about__book-cover-inner">
            <img src="/img/wine-chapters-logo-2.jpeg" alt="Wine & Chapters" />
            <p className="eyebrow">Our story</p>
            <h2>A story written together.</h2>
            <p>
              The heart behind Wine &amp; Chapters: a place for women to read, connect and simply
              be.
            </p>
            <Button
              variant="hero"
              size="lg"
              className="home-about__book-read"
              onClick={openStory}
              disabled={isOpening}
            >
              {isOpening ? "Opening…" : "Read Me"}
              <ArrowRight className="btn-arrow" aria-hidden="true" />
            </Button>
          </div>
          <img
            src="/img/branch-shadow-small.svg"
            alt=""
            className="home-about__book-cover-branch"
            aria-hidden="true"
          />
        </article>
      </div>
    </Section>
  );
}

function DiscoveryStrip() {
  return (
    <div className="home-chapter home-chapter--watercolor home-discovery">
      <Section className="home-discovery__inner">
        <article className="home-discovery__item">
          <span className="home-discovery__icon" aria-hidden="true">
            <PenLine />
          </span>
          <div>
            <p className="eyebrow">Just finished a book?</p>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl">Tell us what you thought.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Loved it, hated it, couldn&apos;t put it down? We want to hear it.
            </p>
            <Button variant="link" className="mt-4 h-auto px-0" asChild>
              <Link to="/reviews">
                Review your latest read <ArrowRight className="btn-arrow" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </article>
      </Section>
    </div>
  );
}

function Benefits() {
  return (
    <div className="home-editorial-block">
      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Why join"
            title="Everything a book club should have been"
            description="Wine & Chapters is for women who share a love of books, but also a love of connection, discovery and new experiences. Whether you're an introvert or an extrovert, an avid reader or someone who barely reads but wants to give it a try — you're welcome here. Come together each month to enjoy a great story, meet new people, explore beautiful places and create friendships, memories and stories of our own."
          />
        </Reveal>
        <div className="mt-14 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
          <figure className="relative min-h-[34rem] overflow-hidden rounded-4xl shadow-lift">
            <img
              src="/img/founder-shix-sasha.jpg"
              alt="Shix Sasha, founder of Wine & Chapters, in front of her bookshelves"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <figcaption className="absolute inset-x-5 bottom-5 rounded-3xl surface-glass p-5">
              <p className="eyebrow">The heart behind the club</p>
              <p className="mt-2 font-display text-xl">A place to read, connect and simply be.</p>
            </figcaption>
          </figure>
          <div className="grid gap-5 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = iconMap[benefit.icon] ?? BookOpen;
              return (
                <Card
                  key={benefit.title}
                  className="rounded-3xl border-border/60 bg-card/70 card-lift"
                >
                  <CardContent className="p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blush text-blush-foreground">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 font-display text-xl">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {benefit.body}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}

function CurrentBook() {
  const home = useQuery({ queryKey: ["public-home"], queryFn: publicApi.getHome });
  const current = home.data?.currentBook;
  if (home.isPending) {
    return (
      <Section>
        <p className="text-center text-sm text-muted-foreground">Opening this month&apos;s read…</p>
      </Section>
    );
  }
  if (!current) {
    return (
      <Section>
        <Card className="rounded-4xl border-border/60 bg-card/70">
          <CardContent className="p-10 text-center">
            <p className="eyebrow">This month&apos;s read</p>
            <Reveal>
              <h2 className="mt-3 font-display text-3xl">The next book is being selected.</h2>
            </Reveal>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Check back soon for the club&apos;s next chapter.
            </p>
          </CardContent>
        </Card>
      </Section>
    );
  }
  const categories = current.book.categories ?? [];
  return (
    <Section
      id="this-months-read"
      className="grid scroll-mt-24 items-center gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]"
    >
      <div className="current-book__media relative mx-auto w-full max-w-xs">
        <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-accent shadow-lift">
          {current.book.coverUrl ? (
            <img
              src={current.book.coverUrl}
              alt={`Cover of ${current.book.title}`}
              width={900}
              height={1200}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center font-display text-2xl">
              {current.book.title}
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="eyebrow">This month&apos;s read</p>
        <Reveal>
          <h2 className="mt-3 text-3xl tracking-tight sm:text-4xl">{current.book.title}</h2>
        </Reveal>
        <p className="mt-2 text-base text-muted-foreground">
          by {current.book.author ?? "Unknown author"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.slice(0, 2).map((category) => (
            <Badge key={category} variant="secondary" className="rounded-full">
              {category}
            </Badge>
          ))}
          <Badge variant="secondary" className="rounded-full">
            Club pick
          </Badge>
        </div>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {current.book.description ?? "The club description for this read will be added soon."}
        </p>
        <div className="mt-8 max-w-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Club reading progress</span>
            <span className="text-muted-foreground">{current.progressPercent}%</span>
          </div>
          <Progress
            value={current.progressPercent}
            className="mt-3 h-2"
            aria-label={`Club reading progress: ${current.progressPercent} percent`}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Reading window:{" "}
            {new Date(`${current.startDate}T00:00:00`).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "long",
            })}
            –
            {new Date(`${current.endDate}T00:00:00`).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>
    </Section>
  );
}

function EventPreview() {
  const eventsQuery = useQuery({ queryKey: ["public-events"], queryFn: publicApi.getEvents });
  const nextEvent = useMemo(() => {
    const today = toDateKey(new Date());
    return [...(eventsQuery.data ?? [])]
      .filter((event) => event.eventDate >= today)
      .sort((a, b) =>
        `${a.eventDate}T${a.startTime}`.localeCompare(`${b.eventDate}T${b.startTime}`),
      )[0];
  }, [eventsQuery.data]);

  if (eventsQuery.isPending) {
    return (
      <Section id="upcoming-events">
        <p className="text-center text-sm text-muted-foreground">Checking the club calendar…</p>
      </Section>
    );
  }

  if (eventsQuery.isError || !nextEvent) {
    return (
      <Section id="upcoming-events" className="home-event-teaser">
        <Card className="rounded-4xl border-border/60 bg-card/65">
          <CardContent className="p-10 text-center">
            <p className="eyebrow">Upcoming event</p>
            <Reveal>
              <h2 className="mt-3 font-display text-3xl">
                {eventsQuery.isError
                  ? "The events list could not be opened."
                  : "The next gathering is still being planned."}
              </h2>
            </Reveal>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              {eventsQuery.isError
                ? "Please refresh and try again in a moment."
                : "When the committee publishes a gathering, it will appear here automatically."}
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <Link to="/events">View all events</Link>
            </Button>
          </CardContent>
        </Card>
      </Section>
    );
  }

  const remaining = Math.max(0, nextEvent.capacity - nextEvent.attendingCount);
  return (
    <Section id="upcoming-events" className="home-event-teaser">
      <div className="home-event-teaser__layout">
        <div className="home-event-teaser__intro">
          <p className="eyebrow">Upcoming event</p>
          <Reveal>
            <h2 className="mt-4 text-3xl leading-tight tracking-tight sm:text-4xl">
              Gather, sip &amp; celebrate stories.
            </h2>
          </Reveal>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Join us for the next Wine &amp; Chapters gathering — thoughtful conversation, a
            beautiful setting and room at the table.
          </p>
          <Button variant="outline" className="mt-7" asChild>
            <Link to="/events">
              View all events <ArrowRight className="btn-arrow" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <Card className="home-event-teaser__card overflow-hidden rounded-4xl border-border/60 bg-card/90 shadow-soft">
          {nextEvent.coverImage ? (
            <img
              src={nextEvent.coverImage}
              alt={`Event artwork for ${nextEvent.title}`}
              className="home-event-teaser__image"
              loading="lazy"
            />
          ) : (
            <div className="home-event-teaser__image gradient-hero" aria-hidden="true" />
          )}
          <CardContent className="p-6 sm:p-8">
            <p className="eyebrow">{formatEventDay(nextEvent.eventDate)}</p>
            <h3 className="mt-3 font-display text-2xl sm:text-3xl">{nextEvent.title}</h3>
            <dl className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                <dt className="sr-only">Time</dt>
                <dd>{formatEventTime(nextEvent.startTime, nextEvent.endTime)}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                <dt className="sr-only">Venue</dt>
                <dd>{nextEvent.venueName}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                <dt className="sr-only">Seats</dt>
                <dd>{remaining > 0 ? `${remaining} seats remaining` : "Event full"}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                <dt className="sr-only">Contribution</dt>
                <dd>
                  {nextEvent.contributionAmount
                    ? `R${nextEvent.contributionAmount} contribution`
                    : "Included"}
                </dd>
              </div>
            </dl>
            <Button variant="hero" className="mt-7 w-full sm:w-auto" asChild>
              <Link to="/events">Event details &amp; RSVP</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function CallToAction() {
  return (
    <Section>
      <div className="overflow-hidden rounded-4xl gradient-hero px-8 py-16 text-center shadow-soft sm:px-16">
        <p className="eyebrow">Intake is open</p>
        <Reveal>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl leading-tight tracking-tight sm:text-4xl">
            Your next favourite book is already on our shelf.
          </h2>
        </Reveal>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Applications are reviewed within 48 hours. Chapters stay small on purpose.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button variant="hero" size="lg" asChild>
            <Link to="/register">Join Wine & Chapters</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/reviews">Browse book reviews</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setPending(true);
    const res = await newsletterApi.subscribe(email);
    setPending(false);
    setEmail("");
    toast.success(res.message);
  }

  return (
    <Section className="pb-4">
      <div className="rounded-4xl border border-border/60 bg-card/60 p-10 sm:p-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">The letter</p>
            <Reveal>
              <h2 className="mt-3 text-3xl tracking-tight">A short note, once a month</h2>
            </Reveal>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The book, the meetup, and three things worth reading. No spam, no spoilers.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <Input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-full bg-background px-5"
              required
            />
            <Button type="submit" variant="hero" size="lg" disabled={pending}>
              {pending ? "Subscribing…" : "Subscribe"}
            </Button>
          </form>
        </div>
      </div>
    </Section>
  );
}

function Testimonials() {
  const shouldReduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const testimonial = (testimonials[active] ?? testimonials[0]) as {
    readonly name: string;
    readonly quote: string;
    readonly image?: string;
  };

  function move(nextDirection: number) {
    setDirection(nextDirection);
    setActive((index) => (index + nextDirection + testimonials.length) % testimonials.length);
  }

  function getAutoplayDuration(quote: string) {
    const words = quote.replaceAll("\n", " ").trim().split(/\s+/).length;
    // slower dwell so Nadia remains readable, swift slide handled by transition below
    return Math.max(8500, Math.min(18000, Math.round(words * 360 + 5500)));
  }

  const isLong = testimonial.quote.length > 300 || testimonial.quote.split(/\s+/).length > 42;
  const TRUNCATE_WORDS = 34;

  function truncateWords(text: string, max: number) {
    const words = text.replaceAll("\n\n", " ").replaceAll("\n", " ").trim().split(/\s+/);
    if (words.length <= max) return text;
    return words.slice(0, max).join(" ") + "…";
  }

  const displayQuote =
    !isLong || expanded ? testimonial.quote : truncateWords(testimonial.quote, TRUNCATE_WORDS);

  useEffect(() => {
    setExpanded(false);
  }, [active]);

  useEffect(() => {
    if (isPaused || expanded) return;
    const duration = getAutoplayDuration(expanded ? testimonial.quote : displayQuote);
    const id = window.setTimeout(() => move(1), duration);
    return () => window.clearTimeout(id);
  }, [active, isPaused, expanded, testimonial.quote, displayQuote]);

  return (
    <div className="home-chapter home-chapter--quiet home-testimonials">
      <Section id="member-stories" className="relative z-10 py-12 sm:py-16">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="eyebrow eyebrow-accent">In their words</p>
          <h2 className="mt-3 text-2xl leading-tight tracking-tight sm:text-3xl">
            What members say
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The books bring us together. The people make Wine &amp; Chapters feel like home.
          </p>
        </Reveal>
        <div
          className="testimonial-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Wine and Chapters member testimonials"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
        >
          <div className={`testimonial-carousel__viewport${expanded ? " is-expanded" : ""}`}>
            <img
              src="/img/overlay.png"
              alt=""
              aria-hidden="true"
              className="testimonial-carousel__overlay"
              loading="lazy"
              decoding="async"
            />

            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.article
                key={testimonial.name}
                className="testimonial-carousel__slide"
                custom={direction}
                initial={
                  shouldReduceMotion ? { opacity: 0 } : { x: `${direction * 100}%`, opacity: 0 }
                }
                animate={{ x: 0, opacity: 1 }}
                exit={
                  shouldReduceMotion ? { opacity: 0 } : { x: `${direction * -100}%`, opacity: 0 }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0.35, ease: "easeOut" }
                    : { duration: 0.95, ease: [0.16, 0.84, 0.44, 1] }
                }
                drag={shouldReduceMotion ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) < 55 && Math.abs(info.velocity.x) < 450) return;
                  move(info.offset.x < 0 ? 1 : -1);
                }}
                aria-roledescription="slide"
                aria-label={`${active + 1} of ${testimonials.length}`}
              >
                <div className="testimonial-carousel__identity">
                  <div className="testimonial-carousel__portrait">
                    {testimonial.image ? (
                      <img
                        src={testimonial.image}
                        alt={`${testimonial.name}, Wine and Chapters member`}
                        loading="lazy"
                        style={{ objectPosition: "center 18%" }}
                      />
                    ) : (
                      <span aria-label={`${testimonial.name} initials`}>
                        {testimonial.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </span>
                    )}
                  </div>
                  <p className="testimonial-carousel__name">{testimonial.name}</p>
                </div>
                <div className="testimonial-carousel__divider" aria-hidden="true" />
                <div className="testimonial-carousel__quote">
                  <Quote aria-hidden="true" />
                  <blockquote
                    id={`testimonial-quote-${active}`}
                    className={expanded ? "" : "is-clamped"}
                  >
                    {(() => {
                      const paragraphs =
                        !isLong || expanded ? displayQuote.split("\n\n") : [displayQuote];
                      const allWordsCount = paragraphs.join(" ").trim().split(/\s+/).length;
                      if (shouldReduceMotion) {
                        return paragraphs.map((para, pIdx) => (
                          <span key={pIdx} className={pIdx === 0 ? "block" : "mt-3 block"}>
                            {para}
                          </span>
                        ));
                      }
                      let wordIndex = 0;
                      return paragraphs.map((para, pIdx) => {
                        const words = para.trim().split(/(\s+)/);
                        return (
                          <span
                            key={`${testimonial.name}-${pIdx}-${expanded ? "exp" : "col"}`}
                            className={pIdx === 0 ? "block" : "mt-3 block"}
                          >
                            <motion.span
                              initial="hidden"
                              animate="visible"
                              variants={{
                                hidden: {},
                                visible: { transition: { staggerChildren: 0.018 } },
                              }}
                            >
                              {words.map((w, wIdx) => {
                                if (!w.trim()) return <span key={wIdx}>{w}</span>;
                                const current = wordIndex++;
                                return (
                                  <motion.span
                                    key={`${current}-${w}`}
                                    variants={{
                                      hidden: { opacity: 0, y: 4 },
                                      visible: {
                                        opacity: 1,
                                        y: 0,
                                        transition: {
                                          duration: 0.24,
                                          ease: [0.22, 1, 0.36, 1] as const,
                                          delay: current * 0.015,
                                        },
                                      },
                                    }}
                                    style={{ display: "inline-block", whiteSpace: "pre" }}
                                  >
                                    {w}
                                  </motion.span>
                                );
                              })}
                            </motion.span>
                          </span>
                        );
                      });
                    })()}
                  </blockquote>
                  {isLong && (
                    <button
                      type="button"
                      className="testimonial-read-more"
                      onClick={() => setExpanded((v) => !v)}
                      aria-expanded={expanded}
                      aria-controls={`testimonial-quote-${active}`}
                    >
                      {expanded ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="testimonial-carousel__controls">
            <Button
              variant="outline"
              size="icon"
              onClick={() => move(-1)}
              aria-label="Previous testimonial"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="testimonial-carousel__dots" aria-label="Choose testimonial">
              {testimonials.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={index === active ? "is-active" : ""}
                  aria-label={`Show testimonial ${index + 1}: ${item.name}`}
                  aria-current={index === active ? "true" : undefined}
                  onClick={() => {
                    setDirection(index > active ? 1 : -1);
                    setActive(index);
                  }}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => move(1)}
              aria-label="Next testimonial"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}

const missBooksCapabilities = [
  { label: "Find books and authors", icon: Search },
  { label: "Compare prices and availability", icon: ShoppingBag },
  { label: "Discover reviews and recommendations", icon: Star },
  { label: "Explore club reads and events", icon: CalendarDays },
] as const;

function MeetBookieSmalls() {
  return (
    <div className="home-chapter home-chapter--watercolor home-miss-books">
      <Section id="meet-miss-books" aria-labelledby="meet-miss-books-title">
        <div className="home-miss-books__layout">
          <div className="home-miss-books__content">
            <p className="eyebrow eyebrow-accent">Your reading-room companion</p>
            <Reveal>
              <h2 id="meet-miss-books-title" className="mt-4 text-3xl tracking-tight sm:text-4xl">
                Meet Bookie Smalls
              </h2>
            </Reveal>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Your bookish AI companion with access to the wider web. Discover your next read,
              compare prices, find trusted reviews, explore authors, check club events, and navigate
              Wine &amp; Chapters—all through a simple conversation.
            </p>
            <ul className="home-miss-books__capabilities" aria-label="Bookie Smalls capabilities">
              {missBooksCapabilities.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <span aria-hidden="true">
                    <Icon />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
            <p className="home-miss-books__source-note">
              Wider-web discoveries use live public sources. Club reads and events come from Wine
              &amp; Chapters member data.
            </p>
            <Button
              type="button"
              variant="hero"
              size="lg"
              className="mt-7"
              onClick={openBooksWidget}
            >
              Ask Bookie Smalls
              <ArrowRight className="btn-arrow" aria-hidden="true" />
            </Button>
          </div>
          <figure className="home-miss-books__artwork">
            <picture>
              <source srcSet="/img/missbooks.webp" type="image/webp" />
              <img
                src="/img/missbooks.png"
                alt="Bookie Smalls, the Wine and Chapters AI companion, waving beside books and a glass of wine"
                width={1536}
                height={1024}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </figure>
        </div>
      </Section>
    </div>
  );
}

function HomePage() {
  return (
    <>
      <Hero />
      <div className="home-chapter home-chapter--quiet home-chapter--about">
        <About />
      </div>
      <DiscoveryStrip />
      <Testimonials />
      <MeetBookieSmalls />
      <div className="home-chapter home-chapter--quiet home-chapter--current">
        <CurrentBook />
      </div>
      <div className="home-chapter home-chapter--watercolor home-chapter--benefits">
        <Benefits />
      </div>
      <div className="home-chapter home-chapter--quiet home-chapter--events">
        <EventPreview />
      </div>
      <div className="home-chapter home-chapter--watercolor home-chapter--join">
        <CallToAction />
      </div>
      <div className="home-chapter home-chapter--quiet home-chapter--newsletter">
        <Newsletter />
      </div>
    </>
  );
}

function parseEventDate(date: string) {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatEventDay(date: string) {
  return parseEventDate(date).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEventTime(startTime: string, endTime: string | null) {
  const start = startTime.slice(0, 5);
  return endTime ? `${start}–${endTime.slice(0, 5)}` : start;
}
