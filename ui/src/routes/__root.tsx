import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";

import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { DemoChatWidget } from "@/components/site/demo-chat-widget";
import { AIActionHandler } from "@/components/site/ai-action-handler";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Chapter missing</p>
        <h1 className="mt-3 font-display text-6xl">404</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This page has been shelved elsewhere. Let's get you back to the reading room.
        </p>
        <div className="mt-8">
          <Button variant="hero" asChild>
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl tracking-tight">This page didn't load</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Something went wrong on our end. Try again, or head back home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            variant="hero"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Wine & Chapters — A Women's Book Club" },
      {
        name: "description",
        content:
          "Wine & Chapters is a premium women's book club: one curated read a month, beautiful meetups and reviews worth reading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..800;1,400..700&family=Inter:wght@300..700&display=swap",
      },
      { rel: "icon", href: "/img/wine-chapters-logo.png", type: "image/png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <>
      <HeadContent />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <div className="flex min-h-dvh flex-col">
            <Navbar />
            <main id="main" className="flex-1">
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </main>
            <Footer />
          </div>
          <AIActionHandler />
          <DemoChatWidget />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}
