import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MapPin } from "lucide-react";

import { site } from "@/data/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/50 gradient-soft sm:mt-20">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <img
              src="/img/wine-chapters-logo.png"
              alt=""
              className="h-11 w-11 rounded-full object-contain"
            />
            <span className="font-display text-lg">Wine & Chapters</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {site.tagline} Meeting {site.meetingCadence.toLowerCase()} in {site.city}.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-display text-base">Explore</h2>
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
                <Link to={l.to} className="transition-colors hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-base">Say hello</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <a
                href={`mailto:${site.email}`}
                className="min-w-0 break-words transition-colors hover:text-primary"
              >
                {site.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Instagram className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 break-words transition-colors hover:text-primary"
              >
                {site.instagram}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{site.city}</span>
            </li>
          </ul>
        </div>

        <nav
          aria-label="Legal"
          className="border-t border-border/50 pt-8 md:col-span-4 md:flex md:items-center md:justify-between md:gap-6"
        >
          <h2 className="font-display text-base">Legal</h2>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground md:mt-0">
            {[
              { to: "/privacy-policy", label: "Privacy policy" },
              { to: "/terms-of-use", label: "Terms of use" },
              { to: "/cookie-policy", label: "Cookie notice" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition-colors hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border/50">
        <p className="mx-auto w-full max-w-7xl px-5 py-5 text-xs leading-relaxed text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} Wine & Chapters. Made with wine, patience and very long
          chapters.
        </p>
      </div>
    </footer>
  );
}
