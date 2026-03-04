# Step 5D — Roadmap

## V1: Local Prototype (Browser + Live Server)
- Build dependency-free SPA-style browser app with modular vanilla JS.
- Implement check-in/check-out workflow and session history.
- Store data with localStorage and validate action rules.
- Prepare concise product and UX docs.

## V2: GitHub Deployment
- Publish static app via GitHub Pages.
- Add CI workflow for lint/check scripts (optional tooling stage).
- Introduce versioning and release notes.

## V3: Supabase Backend
- Add authentication and per-user data isolation.
- Replace/augment localStorage with Supabase tables.
- Implement sync conflict handling and migration path from V1 local data.

## V4: Reporting & Analytics
- Add time summaries by day/week/month.
- Add filtering by date range and optional tags/projects.
- Export reports (CSV/PDF).

## V5: Extended UI/UX
- Add richer responsive layouts and stronger visual hierarchy.
- Add onboarding hints and empty states.
- Improve accessibility audits and localization options.
