---
trigger: always_on
description: Mandatory UI/UX design intelligence workflow for all UI, frontend, and styling tasks.
---

# UI/UX Pro Max Implementation Guidelines

Whenever handling any user requests, tasks, or prompts related to UI, frontend development, web or mobile apps, components, layouts, design systems, styling, dashboards, or landing pages:

## 1. Activate UI/UX Skills
Always incorporate the `ui-ux-pro-max` skill along with relevant design companion skills (`design-system`, `ui-styling`, `design`, `banner-design`).

## 2. Execute Design Intelligence Search Before Coding
Query the bundled design intelligence database to determine the optimal style, 60-30-10 color palette, typography pairing, and component patterns:

- **New Projects, Pages, or Visual Direction:**
  ```bash
  python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system
  ```
  *(Or `python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py ...` if referenced globally)*

- **Targeted Domain Queries (Style, Colors, Typography, UX, Icons, Charts):**
  ```bash
  python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <style|color|typography|chart|ux|icons>
  ```

- **Stack-Specific Guidance:**
  ```bash
  python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack <react|html-tailwind|vue|svelte|nextjs|etc>
  ```

## 3. Strict UI Quality Standards
- **Color Discipline**: Apply the 60-30-10 rule (60% dominant neutral background, 30% secondary structure/cards, 10% accent/CTA). Avoid generic low-contrast AI gradients.
- **Typography**: Use intentional Google Font pairings matched to product archetype.
- **Icons**: Never use emojis as functional UI icons; use professional SVG icon libraries (Lucide, Heroicons, Phosphor).
- **Accessibility & Contrast**: Ensure WCAG AA compliance (4.5:1 text contrast minimum), visible `:focus-visible` rings for keyboard navigation, and respect `prefers-reduced-motion`.
- **Interactivity**: Add `cursor-pointer` to clickable elements, provide smooth hover/active transitions, and include responsive layouts for mobile (375px) through desktop (1440px).
- **Pre-Delivery Checklist**: Review states (default, hover, active, loading, empty, error) before presenting code.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
