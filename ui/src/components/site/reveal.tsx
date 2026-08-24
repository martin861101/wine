import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export interface RevealProps {
  /** Semantics preserved via `as` — defaults to a div. */
  as?: ElementType;
  /** Entrance motion variant. */
  variant?: "up" | "down" | "left" | "right" | "blur" | "zoom";
  /** Stagger delay in ms. */
  delay?: number;
  className?: string;
  children?: ReactNode;
}

export function Reveal({
  as: Tag = "div",
  variant = "up",
  delay = 0,
  className,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Comp = Tag as ElementType;

  return (
    <Comp
      ref={ref}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      className={cn("reveal", `reveal--${variant}`, shown && "reveal--in", className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}
