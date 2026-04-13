---
title: "Set up database schema, RLS, and default admin bootstrap"
status: "todo"
priority: "urgent"
type: "feature"
tags: ["database", "supabase", "auth"]
created_by: "agent"
created_at: "2026-04-13"
position: 2
---

## Notes
Create the relational Supabase schema for profiles, locations, and territory assignments; configure RLS to respect admin vs partner access; and implement a backend-only, idempotent bootstrap process that ensures a default admin user exists.

## Checklist
- [x] Inspect existing Supabase schema to avoid conflicts with default profiles or auth-related tables.
- [x] Create or adapt profiles, countries, states, districts, pincodes, locations, and territory_assignments tables with proper PKs, FKs, and unique constraints.
- [x] Configure RLS policies so only admins can manage master/location/territory data, while partners have appropriate read access.
- [x] Implement a secure backend-only bootstrap routine that creates the default admin auth user and linked profile if it does not already exist.
- [x] Ensure admin bootstrap is idempotent and does not expose sensitive credentials on the frontend.