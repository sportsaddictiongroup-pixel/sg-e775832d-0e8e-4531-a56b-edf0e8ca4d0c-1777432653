---
title: "Implement admin Location Management with Supabase"
status: in_progress
priority: high
type: feature
tags: ["admin", "locations", "supabase", "crud"]
created_by: "agent"
created_at: "2026-04-13T17:27:34Z"
position: 6
---

## Notes
Location Management module for admin at /admin/locations. Must use only real Supabase data from countries, states, districts, pincodes, locations, and territory_assignments. No mock data or localStorage. Provide drilldown UI (countries → states → districts → pincodes → locations), CRUD for states/districts/pincodes/locations with validation and delete rules, loading/error/empty states, and RLS so only admins can access/modify these tables.

## Checklist
- [ ] Configure RLS policies on countries, states, districts, pincodes, locations, and territory_assignments so only admin users (profiles.role = 'admin') can select/insert/update/delete
- [ ] Implement /admin/locations page using real Supabase queries with drilldown: countries → states → districts → pincodes → locations
- [ ] Add modal forms to create states/districts/pincodes/locations with proper uniqueness validation and friendly error messages
- [ ] Add guarded delete actions that only allow deletion when no child records exist, with clear warnings otherwise
- [ ] Implement loading, empty, and error states for each level; ensure no blank screens
- [ ] Verify no mock or static data is used; all location data comes from Supabase