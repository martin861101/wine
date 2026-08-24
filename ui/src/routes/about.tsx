import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Leaf, ShieldCheck, Sparkles } from "lucide-react";

import { Section } from "@/components/site/section";
import { StoryBook, type StoryBookPage } from "@/components/story-book";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { aboutStoryVideos } from "@/data/videos";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Wine & Chapters — Our Story" },
      {
        name: "description",
        content:
          "The heart behind Wine & Chapters: how books became a place of comfort, connection and belonging.",
      },
      { property: "og:title", content: "About Wine & Chapters" },
      {
        property: "og:description",
        content: "A book club created so women can read, connect and simply be themselves.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: Heart,
    title: "Come as you are",
    body: "Quiet or loud, introverted or extroverted, there is no single right way to belong here.",
  },
  {
    icon: Leaf,
    title: "Read without pressure",
    body: "A passionate reader or someone picking up a book for the first time in years — both are welcome.",
  },
  {
    icon: ShieldCheck,
    title: "Be seen",
    body: "A thoughtful space where women can share honestly, without judgement or the need to fit a box.",
  },
  {
    icon: Sparkles,
    title: "Find your people",
    body: "Books begin the conversation; kindness, adventures and friendship carry it beyond the final page.",
  },
];

function AboutPage() {
  const pages: StoryBookPage[] = [
    {
      content: (
        <div>
          <p className="eyebrow">Our story</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight tracking-tight sm:text-5xl">
            It started with one person.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Wine &amp; Chapters started with a little girl who found comfort in books.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Our founder, Shix Sasha, has loved books from a young age. Growing up feeling
            misunderstood and trying to navigate ADHD, she often found the world a little
            overwhelming. The library became her quiet place — somewhere she could slow her mind
            down, escape into another story and, for a little while, just be herself.
          </p>
          <p className="mt-10 eyebrow">Turn the page to keep reading</p>
        </div>
      ),
    },
    {
      content: (
        <div>
          <p className="eyebrow">A quiet place</p>
          <h2 className="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">
            Books gave her room to breathe.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            In the library, the world could slow down. Every story offered a little space to rest,
            imagine and feel at home.
          </p>
        </div>
      ),
      video: aboutStoryVideos[0],
    },
    {
      content: (
        <div>
          <p className="eyebrow">The heart behind Wine &amp; Chapters</p>
          <h2 className="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">
            That feeling never really left her.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Wine &amp; Chapters was born from the hope of creating that same feeling for other women
            — a space where you don&apos;t have to fit into a box or be a certain kind of person. A
            space where you can be quiet or loud, introverted or extroverted, a passionate reader or
            someone who hasn&apos;t picked up a book in years but would love to try.
          </p>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            A place where you can be a little strange, a little weird, laugh until your stomach
            hurts, discover somewhere new, meet someone you wouldn&apos;t normally cross paths with,
            or simply sit with a glass of wine and enjoy being around people.
          </p>
        </div>
      ),
    },
    {
      content: (
        <div>
          <p className="eyebrow">Made for belonging</p>
          <h2 className="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">
            Come exactly as you are.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Quiet or loud, introverted or extroverted, deeply read or ready to begin again — there
            is no single right way to belong here.
          </p>
        </div>
      ),
      video: aboutStoryVideos[1],
    },
    {
      content: (
        <div>
          <p className="eyebrow">Why we stay</p>
          <h2 className="mt-5 max-w-3xl text-3xl leading-tight tracking-tight sm:text-4xl">
            The books bring us together. Connection makes us stay.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Most importantly, it&apos;s a space where you can be seen for who you are, without
            judgement.
          </p>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            We come together because we love books, but we stay because of the connections we make —
            the conversations, the adventures, the kindness, the support and the friendships that
            grow along the way.
          </p>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Whether you join us for every book, one event, a new experience, or simply the laughs
            and giggles… there is a place for you here.
          </p>
        </div>
      ),
    },
    {
      content: (
        <div>
          <p className="eyebrow">The table is set</p>
          <h2 className="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">
            The best chapters are shared.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Good books are only the beginning. Conversation, curiosity and friendship carry every
            chapter well beyond the final page.
          </p>
        </div>
      ),
      video: aboutStoryVideos[2],
    },
    {
      content: (
        <div>
          <p className="eyebrow">A little space to simply be</p>
          <h2 className="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">
            Reading perfectly is not required.
          </h2>
          <div className="about-book-values mt-7 grid gap-3 sm:grid-cols-2">
            {values.map((value) => (
              <Card
                key={value.title}
                className="about-book-value-card rounded-3xl border-border/60 bg-card/70"
              >
                <CardContent className="flex gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
                    <value.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-base leading-tight">{value.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {value.body}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ),
    },
    {
      content: (
        <div>
          <p className="eyebrow">The next chapter</p>
          <h2 className="mt-5 max-w-2xl text-3xl leading-tight tracking-tight sm:text-4xl">
            There is always room for one more reader.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Wine &amp; Chapters isn&apos;t about reading perfectly. It&apos;s about coming together,
            finding your people, and creating a little space in life to simply be.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="hero" asChild>
              <Link to="/register">Join Wine & Chapters</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/events">Browse events</Link>
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Section className="about-book-reader">
      <StoryBook
        pages={pages}
        title="A story written together."
        subtitle="A women’s reading community for slow evenings, good wine and better stories."
        logoSrc="/img/wine-chapters-logo-2.jpeg"
      />
    </Section>
  );
}
