import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/reveal";

export function Section({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-24", className)}
      {...rest}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <p className="eyebrow eyebrow-accent">{eyebrow}</p> : null}
      <h2
        className={cn(
          "text-3xl leading-tight tracking-tight sm:text-4xl break-words",
          eyebrow ? "mt-5" : "mt-3",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </Reveal>
  );
}
