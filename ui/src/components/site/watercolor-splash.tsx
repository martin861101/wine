import { cn } from "@/lib/utils";

export function WatercolorSplash({
  side = "left",
  className,
}: {
  side?: "left" | "right";
  className?: string;
}) {
  return (
    <img
      src="/img/splash.png"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={cn("watercolor-splash", `watercolor-splash--${side}`, className)}
    />
  );
}
