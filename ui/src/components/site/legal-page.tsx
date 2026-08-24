import type { ReactNode } from "react";

import { Section } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";

export interface LegalSection {
  title: string;
  paragraphs: ReactNode[];
}

export function LegalPage({
  eyebrow,
  title,
  description,
  lastUpdated,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <div className="gradient-hero">
        <Section className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Last updated {lastUpdated}
            </p>
          </div>
        </Section>
      </div>

      <Section className="pt-14 sm:pt-20">
        <Card className="mx-auto max-w-4xl rounded-4xl border-border/60 bg-card/80 shadow-soft">
          <CardContent className="space-y-10 p-7 sm:p-10 lg:p-14">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
