import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AmbientVideo } from "@/components/site/ambient-video";
import { Button } from "@/components/ui/button";
import type { VideoAsset } from "@/data/videos";
import { cn } from "@/lib/utils";

interface StoryBookProps {
  pages: StoryBookPage[];
  title: string;
  subtitle: string;
  logoSrc: string;
  className?: string;
}

export interface StoryBookPage {
  content: ReactNode;
  video?: VideoAsset;
}

export function StoryBook({ pages, title, subtitle, logoSrc, className }: StoryBookProps) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const currentPage = pages[page];

  const changePage = useCallback(
    (nextPage: number) => {
      if (nextPage < 0 || nextPage >= pages.length || nextPage === page) return;
      setDirection(nextPage > page ? "next" : "previous");
      setPage(nextPage);
    },
    [page, pages.length],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") changePage(page + 1);
      if (event.key === "ArrowLeft") changePage(page - 1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changePage, page]);

  if (!currentPage) return null;

  return (
    <div className={cn("story-book-reader", className)}>
      <div className="story-book-reader__header">
        <p className="eyebrow">Wine &amp; Chapters · Our story</p>
        <p className="story-book-reader__page-number">
          Page {String(page + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
        </p>
      </div>

      <div className="story-book-reader__stage">
        <div className="story-book-reader__book-shadow" aria-hidden="true" />
        <div className="story-book-reader__layout">
          <div className="story-book-reader__book" aria-label="Wine & Chapters story book">
            <div className="story-book-reader__back-cover" aria-hidden="true" />
            <div className="story-book-reader__page-stack" aria-hidden="true" />

            <div className="story-book-reader__spread">
              <div className="story-book-reader__leaf story-book-reader__leaf--middle">
                <div
                  key={page}
                  className={`story-book-reader__page story-book-reader__page--${direction}`}
                  role="region"
                  aria-live="polite"
                  aria-label={`About story page ${page + 1} of ${pages.length}`}
                >
                  <div className="story-book-reader__page-content">{currentPage.content}</div>
                  {currentPage.video ? (
                    <figure
                      className="story-book-reader__page-video"
                      aria-label={currentPage.video.caption}
                    >
                      <div className="story-book-reader__page-video-frame">
                        <AmbientVideo
                          key={currentPage.video.src}
                          src={currentPage.video.src}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <figcaption>{currentPage.video.caption}</figcaption>
                    </figure>
                  ) : null}
                </div>
              </div>

              <aside className="story-book-reader__leaf story-book-reader__leaf--right">
                <div className="story-book-reader__inside-cover">
                  <img
                    src={logoSrc}
                    alt="Wine & Chapters logo"
                    className="story-book-reader__cover-logo"
                  />
                  <p className="story-book-reader__publisher">Wine &amp; Chapters</p>
                  <h2>{title}</h2>
                  <p className="story-book-reader__subtitle">{subtitle}</p>
                  <p className="story-book-reader__cover-mark">A women&apos;s reading community</p>
                </div>
              </aside>
            </div>

            <div
              className="story-book-reader__binding story-book-reader__binding--one"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <nav className="story-book-reader__controls" aria-label="About story pages">
        <Button variant="outline" onClick={() => changePage(page - 1)} disabled={page === 0}>
          <ArrowLeft aria-hidden="true" /> Previous page
        </Button>
        <div className="story-book-reader__progress" aria-hidden="true">
          {pages.map((_, index) => (
            <span key={index} className={index === page ? "is-active" : ""} />
          ))}
        </div>
        <Button
          variant="hero"
          onClick={() => changePage(page + 1)}
          disabled={page === pages.length - 1}
        >
          Next page <ArrowRight aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}
