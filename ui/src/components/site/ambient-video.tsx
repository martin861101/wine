import { useState, type VideoHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface AmbientVideoProps extends Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "children" | "poster" | "src"
> {
  src: string;
  label?: string;
}

/**
 * A lightweight, silent motion layer for editorial surfaces.
 * Videos are intentionally always muted, inline and looping so they never
 * interrupt reading or unexpectedly consume audio in the background.
 */
export function AmbientVideo({
  src,
  label,
  className,
  onCanPlay,
  ...videoProps
}: AmbientVideoProps) {
  const [ready, setReady] = useState(false);

  return (
    <video
      {...videoProps}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      onCanPlay={(event) => {
        setReady(true);
        onCanPlay?.(event);
      }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("ambient-video", ready && "ambient-video--ready", className)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
