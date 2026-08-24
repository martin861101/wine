import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { site } from "@/data/site";
import { contactApi } from "@/lib/api";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Wine & Chapters" },
      {
        name: "description",
        content:
          "Questions about membership, hosting or partnerships? Reach the Wine & Chapters committee by email, Instagram or our contact form.",
      },
      { property: "og:title", content: "Contact Wine & Chapters" },
      {
        property: "og:description",
        content: "Reach the committee about membership, hosting or partnerships.",
      },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(80),
  email: z.string().trim().email("Enter a valid email address").max(160),
  subject: z.string().trim().min(3, "Add a short subject").max(120),
  message: z.string().trim().min(20, "A little more detail, please").max(1500),
});

type ContactValues = z.infer<typeof contactSchema>;

const channels = [
  { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
  { icon: Instagram, label: "Instagram", value: site.instagram, href: site.instagramUrl },
  { icon: MessageCircle, label: "WhatsApp community", value: site.whatsapp },
  { icon: MapPin, label: "Where we meet", value: site.city },
];

function ContactPage() {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  async function onSubmit(values: ContactValues) {
    const res = await contactApi.send(values);
    toast.success(res.message);
    form.reset();
  }

  return (
    <>
      <div className="gradient-hero">
        <Section className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="eyebrow">Contact</p>
            <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
              Let's talk books, hosting or partnerships.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              The committee reads everything and replies within two working days.
            </p>
          </div>
        </Section>
      </div>

      <Section id="contact-options" className="grid gap-12 pt-14 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionHeading align="left" eyebrow="Find us" title="Ways to reach the club" />
          <ul className="mt-10 space-y-4">
            {channels.map((channel) => (
              <li key={channel.label}>
                <Card className="rounded-3xl border-border/60 bg-card/70">
                  <CardContent className="flex gap-4 p-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush text-blush-foreground">
                      <channel.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {channel.label}
                      </p>
                      {channel.href ? (
                        <a
                          href={channel.href}
                          target={channel.href.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer noopener"
                          className="mt-1 block font-display text-lg transition-colors hover:text-primary"
                        >
                          {channel.value}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm leading-relaxed">{channel.value}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <Card className="rounded-4xl border-border/60 bg-card/70 shadow-soft">
          <CardContent className="p-8 sm:p-10">
            <h2 className="font-display text-2xl">Send a message</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                </div>
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Membership enquiry" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={6}
                          placeholder="Tell us a little about yourself and what you're reading."
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
                  {form.formState.isSubmitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
