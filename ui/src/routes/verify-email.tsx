import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/site/auth-layout";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    code:
      typeof search["code"] === "string"
        ? search["code"]
        : typeof search["token"] === "string"
          ? search["token"]
          : "",
  }),
  head: () => ({
    meta: [
      { title: "Verify your email — Wine & Chapters" },
      {
        name: "description",
        content: "Confirm your email address to activate your Wine & Chapters membership.",
      },
      { property: "og:title", content: "Verify your email — Wine & Chapters" },
      {
        property: "og:description",
        content: "Confirm your email address to activate your membership.",
      },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { code } = Route.useSearch();
  const { data, isPending, isError } = useQuery({
    queryKey: ["verify-email", code],
    queryFn: () => authApi.verifyEmail(code),
    retry: false,
  });

  return (
    <AuthLayout
      eyebrow="Email verification"
      title="Almost there."
      description="We're confirming your email address so the committee can review your application."
      footer={
        <Link to="/login" className="font-medium text-primary underline underline-offset-4">
          Go to sign in
        </Link>
      }
    >
      {isPending ? (
        <p className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Verifying your email…
        </p>
      ) : isError ? (
        <div className="space-y-5">
          <p className="rounded-3xl bg-accent p-5 text-sm leading-relaxed">
            That verification link is invalid or has expired. Request a new one and we'll email it
            straight away.
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-3xl bg-sage/25 p-5 text-sm leading-relaxed">
            <BadgeCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-sage-foreground"
              aria-hidden="true"
            />
            <p>{data?.message}</p>
          </div>
          <Button variant="hero" className="w-full" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
