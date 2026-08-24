import { BookOpen, Bot, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { aiApi, BooksChatError } from "@/lib/api";
import { dispatchAIAction } from "@/lib/ai-actions";
import {
  canOfferProactive,
  dismissProactive,
  markProactiveShown,
  parseProactiveState,
  type ProactiveState,
} from "@/lib/ai-proactive";
import { useAuth } from "@/lib/auth";
import { activeConversationStorageKey, booksGreeting } from "@/lib/books-memory";
import { BOOKS_WIDGET_OPEN_EVENT } from "@/lib/books-widget";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  status: "pending" | "complete" | "failed";
  requestId: string | null;
};

const quickPrompts = ["What’s happening in the club?", "Find my next book", "Surprise me"];

const proactiveStorageKey = "books-ai:proactive";

export function DemoChatWidget() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] = useState<{ id: string; text: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [proactivePrompt, setProactivePrompt] = useState<string | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const memberIdRef = useRef<string | null>(null);
  const previousMemberIdRef = useRef<string | null>(null);
  const [proactiveState, setProactiveState] = useState<ProactiveState>(() =>
    typeof window === "undefined"
      ? { count: 0, lastAt: 0, dismissed: false }
      : parseProactiveState(sessionStorage.getItem(proactiveStorageKey)),
  );
  const [messages, setMessages] = useState<Message[]>([booksGreeting]);

  useEffect(() => {
    const memberId = user?.id ?? null;
    const previousMemberId = previousMemberIdRef.current;
    memberIdRef.current = memberId;
    previousMemberIdRef.current = memberId;
    setMessages([booksGreeting]);
    setConversationId(null);
    setRetryRequest(null);
    setIsSending(false);
    setIsRestoring(Boolean(memberId));

    if (!memberId) {
      if (previousMemberId) {
        localStorage.removeItem(activeConversationStorageKey(previousMemberId));
      }
      return;
    }
    if (previousMemberId && previousMemberId !== memberId) {
      localStorage.removeItem(activeConversationStorageKey(previousMemberId));
    }

    let active = true;
    const storageKey = activeConversationStorageKey(memberId);
    const preferredConversationId = localStorage.getItem(storageKey);
    void aiApi
      .restoreConversation(preferredConversationId)
      .then((restored) => {
        if (!active || memberIdRef.current !== memberId) return;
        setConversationId(restored.conversationId);
        if (restored.conversationId) {
          localStorage.setItem(storageKey, restored.conversationId);
        } else {
          localStorage.removeItem(storageKey);
        }
        setMessages([booksGreeting, ...restored.messages]);
        const retryable = [...restored.messages]
          .reverse()
          .find((message) => message.role === "user" && message.status !== "complete");
        setRetryRequest(
          retryable?.requestId ? { id: retryable.requestId, text: retryable.text } : null,
        );
      })
      .catch(() => {
        if (active && memberIdRef.current === memberId) localStorage.removeItem(storageKey);
      })
      .finally(() => {
        if (active && memberIdRef.current === memberId) setIsRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const openAndFocus = () => {
      setProactivePrompt(null);
      setOpen(true);
      window.setTimeout(() => messageInputRef.current?.focus(), 0);
    };
    window.addEventListener(BOOKS_WIDGET_OPEN_EVENT, openAndFocus);
    return () => window.removeEventListener(BOOKS_WIDGET_OPEN_EVENT, openAndFocus);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(proactiveStorageKey, JSON.stringify(proactiveState));
  }, [proactiveState]);

  useEffect(() => {
    if (!isAuthenticated || open || !canOfferProactive(proactiveState, Date.now())) return;
    const timer = window.setTimeout(() => {
      const currentRead = document.querySelector<HTMLElement>(
        "#this-months-read, #club-current-read",
      );
      const bounds = currentRead?.getBoundingClientRect();
      const lingeringOnRead = Boolean(
        bounds && bounds.bottom > 0 && bounds.top < window.innerHeight,
      );
      if (!lingeringOnRead || Math.random() > 0.3) return;
      setProactivePrompt("Keen to find an audiobook while you browse?");
      setProactiveState((current) => markProactiveShown(current, Date.now()));
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, open, proactiveState]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending || isRestoring || isAuthLoading) return;
    setDraft("");

    if (!isAuthenticated) {
      setMessages((current) => [
        ...current,
        {
          id: `local-user:${crypto.randomUUID()}`,
          role: "user",
          text,
          status: "complete",
          requestId: null,
        },
        {
          id: `local-error:${crypto.randomUUID()}`,
          role: "assistant",
          text: "Please sign in with an approved membership to use the live reading-room assistant.",
          status: "complete",
          requestId: null,
        },
      ]);
      return;
    }

    const memberId = user?.id ?? null;
    if (!memberId) return;
    const requestId = retryRequest?.text === text ? retryRequest.id : crypto.randomUUID();
    setMessages((current) => {
      const withoutPriorError = current.filter((item) => item.id !== `error:${requestId}`);
      const existing = withoutPriorError.some(
        (item) => item.role === "user" && item.requestId === requestId,
      );
      if (existing) {
        return withoutPriorError.map((item) =>
          item.role === "user" && item.requestId === requestId
            ? { ...item, status: "pending" }
            : item,
        );
      }
      return [
        ...withoutPriorError,
        {
          id: `optimistic:${requestId}`,
          role: "user",
          text,
          status: "pending",
          requestId,
        },
      ];
    });
    setIsSending(true);
    try {
      const result = await aiApi.chat(text, conversationId, requestId);
      if (memberIdRef.current !== memberId) return;
      setConversationId(result.conversationId);
      localStorage.setItem(activeConversationStorageKey(memberId), result.conversationId);
      setMessages((current) => {
        const reconciled = current.map((item) =>
          item.role === "user" && item.requestId === requestId
            ? { ...item, id: result.userMessageId, status: "complete" as const }
            : item,
        );
        if (reconciled.some((item) => item.id === result.assistantMessageId)) return reconciled;
        return [
          ...reconciled,
          {
            id: result.assistantMessageId,
            role: "assistant",
            text: result.reply,
            status: "complete",
            requestId,
          },
        ];
      });
      setRetryRequest(null);
      result.actions.forEach(dispatchAIAction);
    } catch (error) {
      if (memberIdRef.current !== memberId) return;
      if (error instanceof BooksChatError) {
        setConversationId(error.conversationId);
        localStorage.setItem(activeConversationStorageKey(memberId), error.conversationId);
        setMessages((current) =>
          current.map((item) =>
            item.role === "user" && item.requestId === requestId
              ? { ...item, id: error.userMessageId }
              : item,
          ),
        );
      }
      setRetryRequest({ id: requestId, text });
      setMessages((current) => [
        ...current.map((item) =>
          item.role === "user" && item.requestId === requestId
            ? { ...item, status: "failed" as const }
            : item,
        ),
        {
          id: `error:${requestId}`,
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "The reading-room assistant is unavailable. Please try again.",
          status: "complete",
          requestId: null,
        },
      ]);
      setDraft(text);
    } finally {
      if (memberIdRef.current === memberId) setIsSending(false);
    }
  }

  function choosePrompt(prompt: string) {
    setDraft(prompt);
  }

  function acceptProactive() {
    setDraft("Find the audiobook for the current club read");
    setProactivePrompt(null);
    setOpen(true);
  }

  function declineProactive() {
    setProactivePrompt(null);
    setProactiveState((current) => dismissProactive(current));
  }

  return (
    <div className="ai-widget pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[1000] sm:bottom-[max(1.75rem,env(safe-area-inset-bottom))] sm:right-[max(1.75rem,env(safe-area-inset-right))]">
      {proactivePrompt && !open ? (
        <Card className="mb-3 ml-auto w-[calc(100vw-2.5rem)] max-w-xs rounded-3xl border-primary/20 bg-card/95 shadow-lift backdrop-blur-xl">
          <CardContent className="relative p-5 pr-12">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={declineProactive}
              aria-label="Dismiss Miss Books suggestion"
            >
              <X aria-hidden="true" />
            </Button>
            <p className="eyebrow">Miss Books has an idea</p>
            <p className="mt-3 font-display text-lg leading-snug">{proactivePrompt}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="hero" size="sm" onClick={acceptProactive}>
                Yes, please
              </Button>
              <Button variant="ghost" size="sm" onClick={declineProactive}>
                Not now
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {open ? (
        <Card
          role="dialog"
          aria-label="Chat with Miss Books"
          className="mb-3 w-[calc(100vw-2.5rem)] max-w-md overflow-hidden rounded-3xl border-primary/20 bg-card/90 shadow-lift backdrop-blur-3xl backdrop-saturate-150"
          style={{
            backgroundColor: "color-mix(in oklab, var(--card) 90%, transparent)",
            backdropFilter: "blur(32px) saturate(150%)",
            WebkitBackdropFilter: "blur(32px) saturate(150%)",
          }}
        >
          <div className="bg-primary px-5 py-4 text-primary-foreground">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/15">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-lg">Books</p>
                  <p className="text-xs text-primary-foreground/75">Your book-club companion</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                onClick={() => setOpen(false)}
                aria-label="Close Miss Books chat"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-4 rounded-2xl bg-primary-foreground/10 p-3 text-xs leading-relaxed text-primary-foreground/85">
              <div className="flex items-center gap-2 font-semibold text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isAuthenticated ? "In the club · ready to help" : "Member companion"}</span>
              </div>
              <p className="mt-1.5">
                {isAuthenticated
                  ? "Ask about the club, find a book, or let Miss Books show you around."
                  : "Sign in with an approved membership to start a live conversation."}
              </p>
            </div>
          </div>

          <CardContent className="p-4">
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1" aria-live="polite">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" ? (
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                      <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  ) : null}
                  <p
                    className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-accent/70 text-foreground"
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              ))}
              {isSending ? (
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  </span>
                  Thinking…
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => choosePrompt(prompt)}
                  className="rounded-full border border-border/70 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={sendMessage} className="mt-3 flex items-end gap-2">
              <label htmlFor="demo-chat-message" className="sr-only">
                Message Miss Books
              </label>
              <Textarea
                id="demo-chat-message"
                ref={messageInputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isAuthenticated ? "Ask the reading room…" : "Sign in to ask the AI…"}
                className="min-h-11 resize-none rounded-2xl bg-background/70 px-3 py-2.5 text-xs"
                rows={1}
                maxLength={500}
              />
              <Button
                type="submit"
                variant="hero"
                size="icon"
                aria-label="Send message"
                disabled={isSending || isRestoring || isAuthLoading || !draft.trim()}
              >
                <Send aria-hidden="true" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="ai-widget__launcher flex justify-end">
        <span className="ai-widget__butterfly ai-widget__butterfly--one" aria-hidden="true">
          <span className="ai-widget__butterfly-body" />
        </span>
        <span className="ai-widget__butterfly ai-widget__butterfly--two" aria-hidden="true">
          <span className="ai-widget__butterfly-body" />
        </span>
        <span className="ai-widget__butterfly ai-widget__butterfly--three" aria-hidden="true">
          <span className="ai-widget__butterfly-body" />
        </span>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="demo-chat-message"
          aria-label="Open Miss Books chat"
          className="ai-widget__launcher-button float-slow block h-24 w-24 overflow-hidden rounded-full shadow-lift transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <img src="/img/ai_widget.png" alt="" className="h-full w-full object-cover" />
        </button>
      </div>
    </div>
  );
}
