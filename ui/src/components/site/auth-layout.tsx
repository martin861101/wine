import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import heroImage from "@/assets/hero-lounge.jpg";
import { Card, CardContent } from "@/components/ui/card";

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center">
      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-3xl shadow-soft">
          <img
            src={heroImage}
            alt="A warm library lounge with books and glasses of red wine"
            width={1600}
            height={1200}
            loading="lazy"
            className="h-[32rem] w-full object-cover"
          />
          <div className="absolute inset-x-5 bottom-5 rounded-2xl surface-glass p-5">
            <p className="font-display text-xl leading-snug">
              "The one evening a month I protect fiercely."
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Lerato D. · Member since 2024</p>
          </div>
        </div>
      </div>

      <Card className="mx-auto w-full max-w-md rounded-3xl border-border/50 bg-card shadow-soft">
        <CardContent className="p-7 sm:p-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-display text-[1.75rem] leading-tight tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-7 text-sm text-muted-foreground">{footer}</div> : null}
          <p className="mt-7 border-t border-border/50 pt-5 text-xs leading-relaxed text-muted-foreground">
            By continuing you agree to our community guidelines.{" "}
            <Link to="/contact" className="underline underline-offset-4 hover:text-primary">
              Questions?
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
