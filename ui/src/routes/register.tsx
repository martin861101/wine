import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/site/auth-layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Join Wine & Chapters" },
      {
        name: "description",
        content:
          "Create your Wine & Chapters member account and verify your email to enter the clubhouse.",
      },
      { property: "og:title", content: "Join Wine & Chapters" },
      {
        property: "og:description",
        content: "Create your member account, verify your email, and join the conversation.",
      },
    ],
  }),
  component: RegisterPage,
});

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "Please add your first name").max(60),
    lastName: z.string().trim().min(2, "Please add your last name").max(60),
    email: z.string().trim().email("Enter a valid email address").max(160),
    region: z.string().trim().min(2, "Which city or suburb are you in?").max(80),
    instagram: z.string().trim().max(40).optional(),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Z]/, "Include one uppercase letter")
      .regex(/[0-9]/, "Include one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const { register } = useAuth();
  const [submitted, setSubmitted] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      region: "",
      instagram: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    try {
      const res = await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        region: values.region,
        ...(values.instagram ? { instagram: values.instagram } : {}),
      });
      setSubmitted(res.message);
      toast.success("Account created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit right now.");
    }
  }

  if (submitted) {
    return (
      <AuthLayout
        eyebrow="Account created"
        title="Check your inbox."
        description={submitted}
        footer={
          <Link to="/login" className="font-medium text-primary underline underline-offset-4">
            Back to sign in
          </Link>
        }
      >
        <div className="flex items-start gap-3 rounded-3xl bg-sage/25 p-5 text-sm leading-relaxed">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-sage-foreground"
            aria-hidden="true"
          />
          <p>
            Verify your email, then sign in to enter the member area. Email confirmation remains
            required for account security.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Member registration"
      title="Pull up a chair."
      description="A few details so we can welcome you properly. Verify your email and you’re ready for the member area."
      footer={
        <>
          Already a member?{" "}
          <Link to="/login" className="font-medium text-primary underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" placeholder="Aisha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" placeholder="Patel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input placeholder="Johannesburg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input placeholder="@yourhandle" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  At least 8 characters, one uppercase letter and one number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
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
            {form.formState.isSubmitting ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
