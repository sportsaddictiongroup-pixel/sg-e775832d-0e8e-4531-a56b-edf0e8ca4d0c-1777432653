---
title: "Admin Partner Directory Page"
status: "in_progress"
priority: "high"
type: "feature"
tags: ["admin", "directory", "read-only"]
created_by: "softgen"
created_at: "2026-04-30T18:22:00Z"
position: 7
---

## Notes
- Strict scope lock: Read-only feature.
- Do not modify existing files, logic, schema, or auth.
- Fetch users from `profiles` and `partner_details` where `role = 'partner'`.
- Mobile responsive layout (Table on desktop, Cards on mobile).

## Checklist
- [ ] Create `src/pages/admin/partner-directory.tsx`
- [ ] Implement secure Supabase data fetching (read-only) joined between `profiles` and `partner_details`
- [ ] Add Search (username, full_name, mobile_number)
- [ ] Add Filters (Country, State, District, Pincode, Location)
- [ ] Build responsive UI (Desktop table, Mobile cards)
- [ ] Add pagination (20 per page)
- [ ] Add placeholder "View" action