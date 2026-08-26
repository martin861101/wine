import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MapPin } from "lucide-react";

import { site } from "@/data/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/50 gradient-soft sm:mt-20">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {/* Primary footer grid — 12-column editorial */}
        <div className="grid gap-10 py-12 sm:py-14 md:grid-cols-12">
          <div className="md:col-span-6 lg:col-span-7">
            <div className="flex items-center gap-3">
              <img
                src="/img/wine-chapters-logo.png"
                alt=""
                className="h-11 w-11 rounded-full border border-border/40 object-contain shadow-soft"
              />
              <span className="font-display text-[1.35rem] tracking-tight">Wine & Chapters</span>
            </div>
            <p className="mt-4 max-w-[32rem] text-sm leading-relaxed text-muted-foreground">
              {site.tagline}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {site.meetingCadence} · {site.city}
            </p>
          </div>

          <nav aria-label="Explore" className="md:col-span-3">
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-foreground/80">
              Explore
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {[
                { to: "/about", label: "About" },
                { to: "/reviews", label: "Reviews" },
                { to: "/shop", label: "Shop" },
                { to: "/events", label: "Events" },
                { to: "/contact", label: "Contact" },
                { to: "/login", label: "Member portal" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="inline-flex underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-foreground/80">
              Say hello
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
                <a
                  href={`mailto:${site.email}`}
                  className="min-w-0 break-words underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {site.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Instagram className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="min-w-0 break-words underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {site.instagram}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
                <span className="min-w-0 break-words">{site.city}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar — legal + credit */}
        <div className="flex flex-col gap-4 border-t border-border/50 py-6 text-xs leading-relaxed text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-balance">
            © {new Date().getFullYear()} Wine & Chapters. Made with wine, patience and very long
            chapters.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <nav aria-label="Legal">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {[
                  { to: "/privacy-policy", label: "Privacy policy" },
                  { to: "/terms-of-use", label: "Terms of use" },
                  { to: "/cookie-policy", label: "Cookie notice" },
                ].map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="underline-offset-4 transition-colors hover:text-primary hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <span aria-hidden="true" className="hidden h-3 w-px bg-border/60 md:block" />
            <span className="inline-flex flex-wrap items-center gap-1">
              Digital experience by{" "}
              <a
                href="https://hookitupservices.com/"
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
              >
                Hookitup Solutions
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
