---
title: "Implement Admin and Partner authentication flows"
status: "todo"
priority: "high"
type: "feature"
tags: ["auth", "admin", "partner"]
created_by: "agent"
created_at: "2026-04-13"
position: 3
---

## Notes
Wire Supabase Auth into the app for both Admin and Partner sides, with distinct login routes, role validation, and basic route protection to ensure users only access appropriate dashboards.

## Checklist
- [ ] Create /admin/login page with username + password form wired to Supabase Auth and restricted to role = admin.
- [ ] Create /partner/login page with role dropdown + username + password, validating that the selected role matches the profile.
- [ ] Implement Supabase session handling and route guards for admin and partner dashboard pages.
- [ ] Handle authentication errors with user-friendly messages (invalid credentials, role mismatch, etc.).
- [ ] Implement logout flows for both admin and partner users.