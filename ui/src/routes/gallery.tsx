import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera } from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Wine & Chapters" },
      {
        name: "description",
        content:
          "A few Wine & Chapters moments worth remembering: books, shared tables and good company.",
      },
    ],
  }),
  component: GalleryPage,
});

const moments = [
  {
    type: "image",
    src: "/img/nici.jpg",
    alt: "Nici holding a book and a glass of wine in front of bookshelves",
    caption: "Books, wine and a new chapter",
  },
  {
    type: "video",
    src: "/videos/2.mp4",
    alt: "A Wine and Chapters gathering in motion",
    caption: "The feeling of a story shared",
  },
  {
    type: "image",
    src: "/img/member-reviewer.jpg",
    alt: "Wine and Chapters member enjoying a glass of wine",
    caption: "Good company, always",
  },
  {
    type: "video",
    src: "/videos/3.mp4",
    alt: "A quiet Wine and Chapters community moment",
    caption: "Connection keeps unfolding",
  },
  {
    type: "image",
    src: "/img/founder-shix-sasha.jpg",
    alt: "Founder Shix Sasha in front of her bookshelves",
    caption: "Where this chapter began",
  },
  {
    type: "video",
    src: "/videos/5.mp4",
    alt: "A warm Wine and Chapters gathering",
    caption: "There is room at the table",
  },
] as const;

function GalleryPage() {
  return (
    <>
      <div className="gallery-hero">
        <Section className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="eyebrow">From our camera roll</p>
            <Reveal>
              <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
                A few chapters worth remembering.
              </h1>
            </Reveal>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Books begin the conversation. Shared tables, new places and generous laughter make the
              memories.
            </p>
          </div>
        </Section>
      </div>

      <Section className="gallery-page pt-14">
        <div className="gallery-page__grid">
          {moments.map((moment, index) => (
            <figure key={moment.src} className={index % 3 === 0 ? "is-tall" : ""}>
              {moment.type === "image" ? (
                <img src={moment.src} alt={moment.alt} loading="lazy" />
              ) : (
                <video
                  src={moment.src}
                  aria-label={moment.alt}
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                />
              )}
              <figcaption>{moment.caption}</figcaption>
            </figure>
          ))}
        </div>
        <div className="gallery-page__cta">
          <Camera aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl">Come be part of the next one.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Meet the community at an upcoming gathering or start your membership application.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link to="/events">View events</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/register">
                Join the club <ArrowRight className="btn-arrow" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
