Create a premium, editorial-style hero section animation for a book club website called Wine & Chapters.

Goal

The animation should feel elegant, calm, luxurious, and natural—similar to a high-end interior design or lifestyle website. The user should feel like warm afternoon sunlight is filtering through leaves outside a window. The animation must remain extremely subtle and never distract from the content.

Background

- Use the provided hero image as the static background.
- Do not animate the background itself.
- Keep all animation in a separate overlay layer.

Branch Shadow Overlay

Create a transparent PNG or SVG of soft olive branch shadows.

Place the overlay:

- Absolutely positioned over the hero.
- Full width and height.
- "pointer-events: none"
- "mix-blend-mode: multiply"
- Initial opacity between 0.12–0.20.
- Apply a slight blur (1–2px) for realism.

Animation

Animate only the branch shadow overlay.

Movement should imitate leaves moving in a gentle breeze.

Animation properties:

- Duration: 12–18 seconds
- Infinite loop
- Ease: "ease-in-out"
- Alternate direction
- No sudden changes
- Seamless looping

Maximum movement:

- Translate X: ±8px
- Translate Y: ±4px
- Rotate: ±0.8°
- Opacity variation: 0.12 → 0.20

The movement should be almost imperceptible.

Enhanced Realism

Split the shadow into three separate layers:

Layer 1

- Largest leaves
- Slight blur
- Duration: 18s

Layer 2

- Medium leaves
- Duration: 14s
- Reverse direction

Layer 3

- Small foreground leaves
- Duration: 22s
- Slightly different transform values

Each layer should move independently with different timing to avoid mechanical motion.

Performance

- Animate only "transform" and "opacity".
- Use "will-change: transform".
- Ensure 60 FPS.
- No layout shifts.
- GPU-accelerated transforms only.

Visual Style

The animation should resemble:

- Afternoon sunlight entering through a nearby window.
- Olive tree branches swaying softly outdoors.
- A premium luxury hotel lobby.
- An editorial magazine landing page.
- Calm, warm, minimalist interior photography.

Avoid:

- Fast movement.
- Large rotations.
- Obvious looping.
- Shaking or jitter.
- Cartoon-like effects.
- Dramatic wind simulation.

Overall Feeling

The visitor should barely notice the movement consciously, but the page should feel alive, warm, sophisticated, and immersive. The animation should enhance the reading atmosphere without drawing attention to itself.
