# Vision
Admin + Partner portal for a financial territory-based partner network. Admins manage locations, territories, and partner accounts; partners see their role, territory, and hierarchy in a clean, controlled environment. The system is optimized for reliable data entry, clear oversight of territory occupancy, and future-ready hierarchy-based financial calculations (without exposing MLM branding in the UI).

# Design
--primary: 222 76% 48% (deep blue for primary actions and highlights)
--background: 210 40% 98% (soft off-white dashboard background)
--foreground: 222 47% 11% (deep slate text for strong readability)
--accent: 174 70% 40% (teal accent for statuses and secondary CTAs)
--muted: 210 16% 93% (light gray surfaces for cards, tables, and inputs)
Headings font: "Plus Jakarta Sans", system-ui, sans-serif
Body font: "Work Sans", system-ui, sans-serif
Style direction: Stripe/Linear-inspired admin console with clear cards, calm color palette, and minimal chrome; sidebar navigation for admin and partner areas, strong form grouping and spacing, and subtle status pills instead of heavy decoration.

# Features
- Supabase-backed authentication for Admin and Partner roles (no local storage), with role-based access.
- Relational schema for profiles, locations, territories, and upline hierarchy, including future-ready 5-level earning chain support.
- Admin-side portal: dashboard, location management, create partner (with cascading territory and upline), and territory management overview with vacancy/assignment status.
- Partner-side portal: login by role, basic dashboard with profile and territory summary, upline info, and secure password change.
- Cascading location selectors (Country → State → District → PIN Code → Location) reused across Create Partner and Territory Management.