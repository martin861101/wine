import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/site/auth-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Wine & Chapters" },
      {
        name: "description",
        content:
          "Sign in to the Wine & Chapters member portal to RSVP, review books and vote on the next read.",
      },
      { property: "og:title", content: "Sign in — Wine & Chapters" },
      { property: "og:description", content: "Access the Wine & Chapters member portal." },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Passwords are at least 8 characters"),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const destination =
    redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/portal";

  useEffect(() => {
    if (!isLoading && isAuthenticated) void navigate({ href: destination });
  }, [destination, isAuthenticated, isLoading, navigate]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  async function onSubmit(values: LoginValues) {
    try {
      const session = await login(values.email, values.password, values.remember);
      toast.success(`Welcome back, ${session.user.firstName}.`);
      void navigate({ href: destination });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in right now.");
    }
  }

  if (isLoading || isAuthenticated) return null;

  return (
    <AuthLayout
      eyebrow="Member portal"
      title="Welcome back to the reading room."
      description="Sign in to RSVP, publish reviews and vote on next month's book."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-primary underline underline-offset-4">
            Apply for membership
          </Link>
        </>
      }
    >
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-11"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-between gap-4">
            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2.5 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="remember"
                    />
                  </FormControl>
                  <FormLabel htmlFor="remember" className="text-sm font-normal">
                    Remember me
                  </FormLabel>
                </FormItem>
              )}
            />
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
