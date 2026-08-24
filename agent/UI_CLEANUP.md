Inspect the Wine & Chapters repository and perform a focused visual UI cleanup across the entire frontend.

Goal:
Make the interface feel crisp, clean, cohesive, and modern while preserving the existing Wine & Chapters identity, pink colour palette, content, functionality, responsive behaviour, and whimsical storybook character.

Tasks:
- Standardise border radiuses across cards, panels, forms, buttons, modals, images, dropdowns, and other containers.
- Add soft, tasteful shadows to cards and elevated components to improve separation and depth.
- Refine borders, background contrast, spacing, padding, and alignment.
- Improve typography hierarchy, line-height, and text readability.
- Standardise buttons, inputs, badges, navigation elements, and interactive states.
- Improve hover, focus, pressed, disabled, and transition states.
- Ensure sections are visually distinct without making the page feel fragmented.
- Remove inconsistent one-off styling and consolidate repeated styles into shared components or design tokens where appropriate.
- Fix obvious visual defects, awkward gaps, uneven sizing, overflow, and alignment problems.
- Review desktop, tablet, and mobile layouts.
- Preserve the existing decorative artwork, animations, book interaction, functionality, and dynamic data.
- Maintain accessible contrast and clearly visible keyboard focus states.
- Keep shadows subtle and elegant—avoid heavy floating cards, excessive gradients, or rounding every small element unnecessarily.

Suggested visual system:
- Small controls/badges: 8–10px radius
- Inputs/buttons: 10–14px radius
- Cards/panels: 16–20px radius
- Feature sections/modals: 20–28px radius
- Default card shadow: soft, low-opacity, slightly warm or neutral
- Hover elevation: minimal increase with a smooth 180–250ms transition

Implementation requirements:
1. First inspect the existing styling architecture, shared components, theme variables, and all major routes.
2. Reuse the current system instead of introducing a second styling approach.
3. Establish shared radius, shadow, border, spacing, and transition tokens.
4. Apply improvements consistently across the public site, member-facing pages, authentication views, and admin interface.
5. Do not redesign the product or change business logic.
6. Do not replace the established pink palette with a generic white SaaS dashboard aesthetic.
7. Do not hard-code styling repeatedly when a reusable class, token, or shared component is appropriate.
8. Keep animations restrained and respect `prefers-reduced-motion`.
9. Run the available lint, type-check, test, and production build commands.
10. Fix any regressions introduced by the cleanup.

Before finishing, visually review every major page at mobile and desktop widths. Provide a concise summary of the files changed, the shared design rules introduced, the routes reviewed, and verification results.
