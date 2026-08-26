import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Headphones,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AI_ACTION_EVENT,
  aiActionSchema,
  aiMoodSchema,
  dispatchAIAction,
  type AIAction,
  type AIMood,
} from "@/lib/ai-actions";

const destinations = {
  home: { path: "/" },
  "current-read": { path: "/", hash: "this-months-read", selector: "#this-months-read" },
  events: { path: "/events", selector: "#events-list" },
  reviews: { path: "/reviews", selector: "#reviews-journal" },
  membership: { path: "/register" },
  poll: { path: "/portal", hash: "club-poll", selector: "#club-poll" },
  contact: { path: "/contact", selector: "#contact-options" },
} as const;

const widgetTargets = {
  event: { path: "/events", selector: "#events-list" },
  poll: { path: "/portal", hash: "club-poll", selector: "#club-poll" },
  current_read: { path: "/portal", hash: "club-current-read", selector: "#club-current-read" },
  reviews: { path: "/reviews", selector: "#reviews-journal" },
  suggest_book: { path: "/portal", hash: "suggest-book", selector: "#suggest-book" },
} as const;

function focusAndHighlight(selector?: string) {
  if (!selector) return;
  window.setTimeout(() => {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const hadTabIndex = target.hasAttribute("tabindex");
    if (!hadTabIndex) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.classList.add("ai-action-highlight");
    window.setTimeout(() => {
      target.classList.remove("ai-action-highlight");
      if (!hadTabIndex) target.removeAttribute("tabindex");
    }, 2400);
  }, 320);
}

export function AIActionHandler() {
  const navigate = useNavigate();
  const [bookAction, setBookAction] = useState<Extract<AIAction, { type: "SHOW_BOOK" }> | null>(
    null,
  );
  const [bookRevealed, setBookRevealed] = useState(false);
  const [audioAction, setAudioAction] = useState<Extract<AIAction, { type: "SHOW_AUDIO" }> | null>(
    null,
  );
  const [audioCollapsed, setAudioCollapsed] = useState(false);
  const [effect, setEffect] = useState<Extract<AIAction, { type: "TRIGGER_EFFECT" }> | null>(null);
  const [mood, setMood] = useState<AIMood>("default");
  const lastToast = useRef({ key: "", at: 0 });
  const lastEffectAt = useRef(0);
  const effectTimer = useRef<number | null>(null);

  const applyMood = useCallback((nextMood: AIMood) => {
    document.documentElement.dataset.booksMood = nextMood;
    sessionStorage.setItem("books-ai:mood", nextMood);
    setMood(nextMood);
  }, []);

  useEffect(() => {
    const saved = aiMoodSchema.safeParse(sessionStorage.getItem("books-ai:mood"));
    applyMood(saved.success ? saved.data : "default");
  }, [applyMood]);

  const visit = useCallback(
    (target: { path: string; hash?: string; selector?: string }) => {
      void navigate({
        to: target.path,
        ...(target.hash ? { hash: target.hash } : {}),
      });
      focusAndHighlight(target.selector);
    },
    [navigate],
  );

  const handleAction = useCallback(
    (action: AIAction) => {
      switch (action.type) {
        case "NAVIGATE":
          visit(destinations[action.destination]);
          break;
        case "OPEN_WIDGET":
          visit(widgetTargets[action.widget]);
          break;
        case "SHOW_BOOK":
          setAudioAction(null);
          setBookRevealed(!action.blind);
          setBookAction(action);
          break;
        case "SHOW_AUDIO":
          setBookAction(null);
          setAudioCollapsed(false);
          setAudioAction(action);
          break;
        case "SET_MOOD":
          applyMood(action.mood);
          break;
        case "SHOW_TOAST": {
          const key = `${action.toastType}:${action.message}`;
          const now = Date.now();
          if (lastToast.current.key === key && now - lastToast.current.at < 10_000) break;
          lastToast.current = { key, at: now };
          if (action.toastType === "success") toast.success(action.message);
          else if (action.toastType === "book")
            toast(action.message, { icon: <BookOpen className="h-4 w-4" aria-hidden="true" /> });
          else toast.info(action.message);
          break;
        }
        case "TRIGGER_EFFECT": {
          const now = Date.now();
          if (now - lastEffectAt.current < 12_000) break;
          lastEffectAt.current = now;
          if (effectTimer.current) window.clearTimeout(effectTimer.current);
          setEffect(action);
          effectTimer.current = window.setTimeout(() => setEffect(null), 2200);
          break;
        }
      }
    },
    [applyMood, visit],
  );

  useEffect(() => {
    const onAction = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const parsed = aiActionSchema.safeParse(event.detail);
      if (parsed.success) handleAction(parsed.data);
    };
    window.addEventListener(AI_ACTION_EVENT, onAction);
    return () => {
      window.removeEventListener(AI_ACTION_EVENT, onAction);
      if (effectTimer.current) window.clearTimeout(effectTimer.current);
    };
  }, [handleAction]);

  return (
    <>
      {bookAction ? (
        <aside
          className="pointer-events-none fixed inset-x-4 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-[990] sm:inset-x-auto sm:bottom-[max(1.75rem,env(safe-area-inset-bottom))] sm:left-7 sm:w-[23rem]"
          aria-live="polite"
        >
          <Card className="pointer-events-auto overflow-hidden rounded-3xl border-primary/25 bg-card/95 shadow-lift backdrop-blur-xl">
            {bookAction.blind && !bookRevealed ? (
              <CardContent className="relative p-7">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3"
                  onClick={() => setBookAction(null)}
                  aria-label="Close book surprise"
                >
                  <X aria-hidden="true" />
                </Button>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="eyebrow mt-5">Blind date with a book</p>
                <p className="mt-4 font-display text-xl italic leading-relaxed">
                  {bookAction.tease ?? "A deliciously mysterious next chapter."}
                </p>
                <Button
                  variant="hero"
                  className="mt-6 w-full"
                  onClick={() => setBookRevealed(true)}
                >
                  Reveal my book
                </Button>
              </CardContent>
            ) : (
              <div className="grid grid-cols-[7rem_1fr]">
                <div className="min-h-48 bg-accent">
                  {bookAction.book.cover ? (
                    <img
                      src={bookAction.book.cover}
                      alt={`Cover of ${bookAction.book.title}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center font-display text-sm">
                      {bookAction.book.title}
                    </div>
                  )}
                </div>
                <div className="relative min-w-0 p-5 pr-11">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1.5"
                    onClick={() => setBookAction(null)}
                    aria-label="Close book preview"
                  >
                    <X aria-hidden="true" />
                  </Button>
                  <p className="eyebrow">Bookie Smalls recommends</p>
                  <h2 className="mt-2 font-display text-xl leading-tight">
                    {bookAction.book.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bookAction.book.authors.join(", ") || "Author unavailable"}
                  </p>
                  {bookAction.book.description ? (
                    <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                      {bookAction.book.description}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </Card>
        </aside>
      ) : null}

      {audioAction ? (
        <aside className="pointer-events-none fixed inset-x-4 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-[980] sm:inset-x-auto sm:bottom-7 sm:left-7 sm:w-80">
          <Card className="pointer-events-auto overflow-hidden rounded-3xl border-primary/25 bg-card/95 shadow-lift backdrop-blur-xl">
            <CardContent className={audioCollapsed ? "p-3" : "p-5"}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Headphones className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{audioAction.title}</p>
                  {!audioCollapsed ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {audioAction.author || "Audiobook search"}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAudioCollapsed((value) => !value)}
                  aria-label={audioCollapsed ? "Expand audio card" : "Collapse audio card"}
                >
                  {audioCollapsed ? (
                    <ChevronUp aria-hidden="true" />
                  ) : (
                    <ChevronDown aria-hidden="true" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAudioAction(null)}
                  aria-label="Close audio card"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
              {!audioCollapsed ? (
                <>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Open Spotify to see available audiobook results. Nothing plays until you choose
                    it.
                  </p>
                  <Button variant="hero" className="mt-4 w-full" asChild>
                    <a href={audioAction.url} target="_blank" rel="noreferrer">
                      Open Spotify <ExternalLink aria-hidden="true" />
                    </a>
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      ) : null}

      {mood !== "default" ? (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-[970] rounded-full bg-card/90 shadow-soft backdrop-blur-lg"
          onClick={() => dispatchAIAction({ type: "SET_MOOD", mood: "default" })}
        >
          <RotateCcw aria-hidden="true" /> Reset mood
        </Button>
      ) : null}

      {effect ? (
        <div className={`ai-effect ai-effect--${effect.effect}`} aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} style={{ "--ai-effect-index": index } as React.CSSProperties} />
          ))}
        </div>
      ) : null}
    </>
  );
}
