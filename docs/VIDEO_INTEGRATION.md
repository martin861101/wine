# Ambient video integration

The frontend uses the supplied MP4 clips as silent editorial motion rather than as primary content.
This keeps the book-reading interaction focused while adding movement to the moments where users
pause to browse.

## Placement map

- `/about`: one distinct numbered clip on each of the five storybook pages, rendered in a separate
  paper-framed panel beside the two-sided book.
- Homepage About book: one distinct clip on each of the three interactive story pages, rendered in
  the separate panel beside the two-sided book.
- Homepage current-book section: one supporting reading-mood clip.
- Homepage upcoming-event preview: one supporting gathering clip.

The source files remain in `videos/` and the deployable copies live in `ui/public/videos/`. The
mapping and poster fallbacks are defined in `ui/src/data/videos.ts`.

## Playback behavior

All new clips render through `ui/src/components/site/ambient-video.tsx`. The component enforces
`autoPlay`, `loop`, `muted`, `playsInline`, and `preload="metadata"`. Videos are decorative and
aria-hidden by default; each About video panel keeps its clip descriptive through an accessible label
and visible paper caption. A translucent noise and crease treatment keeps the clips visually
consistent with the printed pages. The poster image remains visible while media metadata is loading.

The homepage hero video is handled separately in `ui/src/routes/index.tsx`: desktop uses
`/videos/hero_vid.mp4`, while viewports up to 767px use `/videos/hero_vid_mobile.mp4`. The first
pass starts at the beginning, and each subsequent replay starts at 3 seconds for either source. It
intentionally omits the native `loop` attribute so the restart position can be controlled, while the
reduced-motion preference still pauses it at the beginning. The mobile wash is intentionally lighter
than the desktop wash: it is concentrated around the copy, fades below it, and uses a reduced full-screen
primary tint so the mobile footage remains visible. The mobile video is also scaled to 92% to show a
slightly wider view of the source.

When changing or adding a source clip, add the MP4 to both the source `videos/` folder and
`ui/public/videos/`, then update the matching entry in `ui/src/data/videos.ts`.
