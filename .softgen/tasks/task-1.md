---
title: "Set up design system, shared layout, and entry routing"
status: "in_progress"
priority: "urgent"
type: "chore"
tags: ["design", "layout", "routing"]
created_by: "agent"
created_at: "2026-04-13"
position: 1
---

## Notes
Establish a clean, professional visual foundation and shared layout structure for the Admin and Partner portals, including a clear entry experience that routes users to the appropriate login flows.

## Checklist
- [ ] Define visual design system in globals.css and tailwind.config.ts (colors, typography, spacing) to match the project brief.
- [ ] Implement shared layout containers for admin and partner sections (header, content wrapper, responsive behavior).
- [ ] Update src/pages/_app.tsx to include ThemeProvider and apply base layout styling consistently.
- [ ] Implement src/pages/index.tsx as a simple landing page with clear entry cards/links to Admin and Partner login routes.