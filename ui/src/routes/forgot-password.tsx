import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthLayout } from "@/components/site/auth-layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Wine & Chapters" },
      {
        name: "description",
        content: "Request a password reset link for your Wine & Chapters member account.",
      },
      { property: "og:title", content: "Reset your password — Wine & Chapters" },
      {
        property: "og:description",
        content: "Request a password reset link for your member account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(values: Values) {
    const res = await authApi.forgotPassword(values.email);
    setSent(res.message);
  }

  return (
    <AuthLayout
      eyebrow="Forgot password"
      title="We'll send you a reset link."
      description="Enter the email address on your membership and we'll email a secure link that expires in 30 minutes."
      footer={
        <Link to="/login" className="font-medium text-primary underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex items-start gap-3 rounded-3xl bg-sage/25 p-5 text-sm leading-relaxed">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-sage-foreground" aria-hidden="true" />
          <p>{sent}</p>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
