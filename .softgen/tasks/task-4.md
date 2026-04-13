---
title: "Build Admin portal: dashboard, location management, create partner, territory management"
status: "todo"
priority: "high"
type: "feature"
tags: ["admin", "ui", "territory", "locations"]
created_by: "agent"
created_at: "2026-04-13"
position: 4
---

## Notes
Implement the core Admin experience: a simple dashboard with quick actions, full CRUD for location hierarchy, the Create Partner form with cascading territory and upline, and a Territory Management page showing assigned vs vacant positions with hooks into partner creation.

## Checklist
- [ ] Build Admin Dashboard page with quick links to Create Partner, Location Management, and Territory Management.
- [ ] Implement Location Management UI (countries, states, districts, pincodes, locations) with cascading filters and Supabase-backed CRUD.
- [ ] Implement Create Partner form (basic details, role, territory, upline, login credentials) with validations and Supabase-backed partner creation.
- [ ] Enforce unique mobile and username checks with clear error messages.
- [ ] Implement Territory Management page to visualize assignments (vacant vs assigned) across the hierarchy and prefill Create Partner when initiating assignment.