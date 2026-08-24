import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { site } from "@/data/site";

const links = [
  { to: "/about", label: "About" },
  { to: "/reviews", label: "Reviews" },
  { to: "/shop", label: "Shop" },
  { to: "/events", label: "Events" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 surface-glass">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8"
      >
        <Link to="/" className="flex items-center gap-2.5" aria-label={`${site.name} home`}>
          <img
            src="/img/wine-chapters-logo-2-transparent.png"
            alt=""
            width={96}
            height={64}
            className="h-16 w-24 shrink-0 bg-transparent object-contain"
          />
          <span className="font-display text-lg leading-none tracking-tight">
            Wine <span className="text-primary">&</span> Chapters
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                activeProps={{ className: "text-primary bg-accent/60" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
          {isAuthenticated && user?.role === "ADMIN" ? (
            <li>
              <Link
                to="/admin"
                activeProps={{ className: "text-primary bg-accent/60" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
              >
                Admin
              </Link>
            </li>
          ) : null}
        </ul>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/portal">Member hub</Link>
              </Button>
              <span className="text-sm text-muted-foreground">Hi, {user?.firstName}</span>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/register">Join the club</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm">
              <SheetTitle className="font-display text-xl">Wine & Chapters</SheetTitle>
              <ul className="mt-8 flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setOpen(false)}
                      activeProps={{ className: "text-primary" }}
                      className="block rounded-xl px-3 py-3 text-base font-medium transition-colors hover:bg-accent/60"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {isAuthenticated && user?.role === "ADMIN" ? (
                  <li>
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      activeProps={{ className: "text-primary" }}
                      className="block rounded-xl px-3 py-3 text-base font-medium transition-colors hover:bg-accent/60"
                    >
                      Admin dashboard
                    </Link>
                  </li>
                ) : null}
              </ul>
              <div className="mt-8 flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    <Button variant="hero" asChild onClick={() => setOpen(false)}>
                      <Link to="/portal">Member hub</Link>
                    </Button>
                    <Button variant="outline" onClick={() => void logout()}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link to="/login">Sign in</Link>
                    </Button>
                    <Button variant="hero" asChild onClick={() => setOpen(false)}>
                      <Link to="/register">Join the club</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
