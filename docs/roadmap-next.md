# Work Hours Tracker — Next Roadmap (PM + UX + Architecture)

Date: 2026-03-06  
Scope: Existing single-page work-hours tracker (check-in/out, history, edit time, localStorage + Supabase support)

## 1) Product Manager View

### Problem / Opportunity Analysis
- The app solves basic time logging well, but users still need faster correction flows, better historical insight, and stronger trust in records when used for payroll/client reporting.
- Current value is strongest for individual daily use; opportunity is to expand into reliable weekly/monthly planning and lightweight team/compliance usage without losing SPA simplicity.
- Main friction points:
  - Manual interpretation of history for payroll export.
  - Limited anomaly detection (missed checkout, overlapping edits, outlier sessions).
  - Limited confidence in cross-device continuity for users not fully on Supabase.
  - Minimal accessibility and mobile ergonomics coverage for frequent in-field usage.
- Strategic opportunity: become a “low-friction, high-trust” tracker by combining clear UX, resilient sync, and reporting/export capabilities.

### High-Value Feature Themes
1. Reliability & Data Trust (validation, conflict handling, auditability)
2. Insight & Reporting (period summaries, exports, anomaly explanations)
3. Speed of Use (faster check-in/out and correction paths on mobile and desktop)
4. Accessibility & Inclusive UX (keyboard-first, screen reader clarity, contrast/focus)
5. Platform Readiness (progressive web app behavior, observability, future team model)

---

## 2) Multi-Version Roadmap With UX + Technical Architecture

## V1.1 — Usability and Trust Hardening

### PM: Goals, Dependencies, Risks, User Impact
**Goals**
- Improve daily confidence and reduce correction effort.
- Make historic overview more actionable with lightweight quality indicators.

**Dependencies**
- Existing `timeEntryService` validation and edit flows.
- Existing SPA structure in `mainView` + `checkView`.

**Risks**
- UX complexity creep from too many micro-states.
- Small but visible behavior differences between localStorage and Supabase modes.

**Expected User Impact**
- Fewer accidental mistakes, clearer session status, faster daily completion.

### Roadmap Items (V1.1)

#### 1) Smart Session Integrity Feedback
**UX rationale**
- Users need immediate confidence that a session is valid without scanning full history.

**Expected workflow**
- User checks in/out or edits time.
- UI shows inline integrity status: valid, warning (long session, missing checkout), or blocked (overlap).

**Single-page layout fit**
- Add integrity chip and short helper text in existing day-overview/status region.

**Accessibility**
- Status changes announced via polite live region.
- Non-color cues (icon/text label), WCAG AA contrast.

**Mobile vs desktop**
- Mobile: compact chip + expandable detail.
- Desktop: full inline status text always visible.

**Architecture changes**
- Add integrity evaluation utility in service layer; keep rendering logic in `checkView`.

**Service updates**
- `timeEntryService`: add `evaluateIntegrity(entries, activeEntry, now)`.
- `storageService`: no schema change.
- Supabase: no API change.

**Data model changes**
- None persisted; derived integrity state only.

**Testing implications**
- Regression tests for warning thresholds and overlap/missing checkout cases.
- UI tests for status rendering and aria-live output.

**Migration considerations**
- None; pure behavioral enhancement.

**Risks + mitigation**
- False positives on long sessions; make thresholds configurable and conservative by default.

#### 2) Faster Edit Flow (Quick Correct)
**UX rationale**
- Most edits are minor; current edit sheet can feel heavy for small corrections.

**Expected workflow**
- From recent session card, user taps “Quick +15m”, “Quick -15m”, or “Full edit”.

**Single-page layout fit**
- Extend existing session card action row; reuse current edit sheet for full edits.

**Accessibility**
- Button labels include action + target field (“Add 15 minutes to checkout”).
- Keyboard sequence and focus return to originating card.

**Mobile vs desktop**
- Mobile: stacked compact quick-action buttons.
- Desktop: inline action cluster.

**Architecture changes**
- Add thin command layer for relative time adjustments before save.

**Service updates**
- `timeEntryService`: add `adjustEntryMinutes(entryId, deltaIn, deltaOut)` with overlap validation.
- `storageService`: unchanged interfaces.
- Supabase: reuse update entry path.

**Data model changes**
- None.

**Testing implications**
- Add tests for quick adjustments crossing day boundaries and overlap rejection.

**Migration considerations**
- None.

**Risks + mitigation**
- Boundary bugs around midnight; centralize timezone conversion in shared date utilities.

#### 3) Export v1 (CSV for selected period)
**UX rationale**
- Users need a portable summary for payroll and personal records.

**Expected workflow**
- User selects historic range and clicks export; file downloads immediately.

**Single-page layout fit**
- Add export action next to existing copy control in historic tools.

**Accessibility**
- Export status announced; downloadable file naming readable.

**Mobile vs desktop**
- Mobile: share-sheet friendly file naming.
- Desktop: direct CSV download.

**Architecture changes**
- Add export formatter module (pure function) independent of persistence.

**Service updates**
- `timeEntryService`: provide filtered/normalized period dataset.
- `storageService` and Supabase: unchanged.

**Data model changes**
- None.

**Testing implications**
- Snapshot tests for CSV output columns/order and locale-safe timestamps.

**Migration considerations**
- None.

**Risks + mitigation**
- Locale formatting confusion; export in ISO + optional localized display columns.

---

## V2 — Cross-Device Reliability and PWA Readiness

### PM: Goals, Dependencies, Risks, User Impact
**Goals**
- Make Supabase-backed experience dependable across devices and intermittent connectivity.
- Reduce support burden by making sync status explicit.

**Dependencies**
- Stable Supabase configuration and auth flow.
- Clear source-of-truth rules between local cache and remote.

**Risks**
- Sync conflicts causing trust loss.
- Increased complexity in SPA state transitions.

**Expected User Impact**
- Better continuity and confidence: users can log now and trust later consistency.

### Roadmap Items (V2)

#### 1) Offline-First Queue + Sync Status
**UX rationale**
- Users should never fear data loss when connection drops.

**Expected workflow**
- User performs actions offline.
- Actions queue locally; sync badge shows pending count.
- On reconnect, queue flushes and status resolves.

**Single-page layout fit**
- Add small sync indicator in status panel header (global visibility).

**Accessibility**
- Status announcements for offline/online/sync-failed.
- Avoid motion-only indicators.

**Mobile vs desktop**
- Mobile: prominent reconnect + retry affordance.
- Desktop: compact status with details on hover/focus.

**Architecture changes**
- Introduce sync orchestrator between UI and persistence providers.

**Service updates**
- `storageService`: add queued-op store and replay primitives.
- Supabase integration: idempotent mutation keys + retry/backoff.
- `timeEntryService`: return operation metadata for queue.

**Data model changes**
- Add local operation log schema (`opId`, `entityId`, `type`, `payload`, `createdAt`, `attempts`).

**Testing implications**
- Integration tests for offline create/edit/delete then reconnect replay.
- Conflict simulation tests.

**Migration considerations**
- One-time local schema upgrade for queue store key.

**Risks + mitigation**
- Duplicate writes; enforce operation idempotency and last-write conflict resolution policy.

#### 2) PWA Installability and Background Readiness
**UX rationale**
- Frequent users benefit from app-like launch and resilience.

**Expected workflow**
- User installs app; opens quickly from home screen/desktop launcher.

**Single-page layout fit**
- No layout expansion required; add subtle install prompt entry point.

**Accessibility**
- Install prompt is keyboard reachable and dismissible.

**Mobile vs desktop**
- Mobile: strong value from home-screen access.
- Desktop: secondary value but still improves startup consistency.

**Architecture changes**
- Add service worker, app manifest, and asset caching strategy.

**Service updates**
- `storageService`/`timeEntryService`: unchanged APIs; ensure deterministic bootstrap when offline.
- Supabase: connectivity detection hooks.

**Data model changes**
- None.

**Testing implications**
- Smoke tests for first load, repeat load offline, and versioned cache invalidation.

**Migration considerations**
- Cache versioning policy; force refresh fallback on manifest mismatch.

**Risks + mitigation**
- Stale UI bundles; implement cache busting and update banner.

---

## V3 — Insights, Compliance, and Lightweight Team Readiness

### PM: Goals, Dependencies, Risks, User Impact
**Goals**
- Expand beyond raw logs into understandable work patterns and compliance support.
- Prepare data/permissions model for small-team adoption.

**Dependencies**
- Reliable period calculations and stable sync foundation from V2.

**Risks**
- Analytics overwhelm if visual density gets too high.
- Permissions complexity.

**Expected User Impact**
- Better planning decisions and easier month-end reconciliation.

### Roadmap Items (V3)

#### 1) Advanced Historic Analytics (weekly/monthly trends)
**UX rationale**
- Users need pattern visibility, not just row-level logs.

**Expected workflow**
- User switches to historic mode, chooses range, views trend summaries and key anomalies.

**Single-page layout fit**
- Add collapsible analytics panel below existing period overview section.

**Accessibility**
- Text equivalents for all charts/visual summaries.
- Keyboard navigation for data points where interactive.

**Mobile vs desktop**
- Mobile: prioritize summary cards over dense charts.
- Desktop: allow expanded detail with richer chart width.

**Architecture changes**
- Add analytics aggregation module with memoized selectors.

**Service updates**
- `timeEntryService`: trend calculators and anomaly detectors.
- `storageService`: optional cached aggregates.
- Supabase: optional server-side aggregate query path.

**Data model changes**
- No required persistent changes; optional aggregate cache object.

**Testing implications**
- Deterministic tests for trend outputs across timezone boundaries.

**Migration considerations**
- Safe fallback when cache missing or stale.

**Risks + mitigation**
- Performance for large histories; lazy compute + memoization.

#### 2) Compliance Rules Engine (breaks, max shift warnings)
**UX rationale**
- Prevent costly mistakes by warning users before policy breaches.

**Expected workflow**
- During active session and edits, user sees projected policy warnings.

**Single-page layout fit**
- Reuse integrity status area with rule-specific messages.

**Accessibility**
- Clear language, severity levels, and non-color encoding.

**Mobile vs desktop**
- Mobile: concise “at risk” badges.
- Desktop: full policy context tooltip/side copy.

**Architecture changes**
- Policy evaluation module with configurable rule set per user/team.

**Service updates**
- `timeEntryService`: `evaluatePolicy(entries, rules, now)`.
- `storageService`: store rules in user profile settings.
- Supabase: persist rules and optional server validation endpoint.

**Data model changes**
- Add `policyRules` in user profile (break thresholds, max shift, weekly caps).

**Testing implications**
- Rule matrix tests and locale/timezone coverage.

**Migration considerations**
- Add default rule profile for existing users.

**Risks + mitigation**
- Legal-policy variance by region; keep rules configurable and disabled by default.

#### 3) Team Mode Foundations (manager visibility for small teams)
**UX rationale**
- Teams need lightweight oversight without moving to a full HR suite.

**Expected workflow**
- Manager switches context to team summary; reviews member statuses and exceptions.

**Single-page layout fit**
- Add optional team tab section within existing panel stack (no route split yet).

**Accessibility**
- Table/list semantics for member status summaries.

**Mobile vs desktop**
- Mobile: condensed member cards.
- Desktop: sortable grid.

**Architecture changes**
- Introduce role-aware authorization checks and scoped queries.

**Service updates**
- `timeEntryService`: team summary query methods.
- Supabase integration: RLS policies for manager/member scopes.
- `storageService`: local mode remains single-user fallback.

**Data model changes**
- Add `teamId`, `role`, and membership relations.

**Testing implications**
- Security tests for role leakage and RLS enforcement.

**Migration considerations**
- Existing users default to personal workspace with no team membership.

**Risks + mitigation**
- Authorization bugs; enforce server-side checks and add policy regression suite.

---

## V4 — Workflow Automation and Ecosystem Integrations

### PM: Goals, Dependencies, Risks, User Impact
**Goals**
- Reduce repetitive admin work and connect tracker outputs to payroll/project tools.

**Dependencies**
- Stable exports (V1.1), sync reliability (V2), and team model (V3).

**Risks**
- Third-party API volatility and maintenance overhead.

**Expected User Impact**
- Significant time savings for supervisors and frequent reporting users.

### Roadmap Items (V4)

#### 1) Scheduled Reporting + Delivery
**UX rationale**
- Users should not manually generate the same report every pay period.

**Expected workflow**
- User configures schedule and recipient/destination; system generates reports automatically.

**Single-page layout fit**
- Add report automation settings section under historic/export controls.

**Accessibility**
- Clear schedule controls with descriptive labels and timezone disclosure.

**Mobile vs desktop**
- Mobile: simplified schedule templates.
- Desktop: full rule editor.

**Architecture changes**
- Introduce backend scheduler (serverless jobs/cron) and report generation service.

**Service updates**
- `timeEntryService`: report assembly API.
- Supabase integration: secure server-side job execution and storage.
- `storageService`: local mode exposes manual-only fallback.

**Data model changes**
- Add `reportSchedule` entities (cadence, timezone, destination, scope).

**Testing implications**
- End-to-end tests for schedule trigger, generation, and delivery logs.

**Migration considerations**
- No mandatory migration; feature gated to Supabase/server mode.

**Risks + mitigation**
- Failed deliveries; add retries, dead-letter queue, and user-visible job history.

#### 2) Integrations API (Payroll/Project systems)
**UX rationale**
- Exporting manually to external systems is error-prone and slow.

**Expected workflow**
- User connects integration, maps fields, and syncs approved periods.

**Single-page layout fit**
- Add integration management in account/settings sheet.

**Accessibility**
- Clear step labels and validation errors in mapping flow.

**Mobile vs desktop**
- Mobile: read-only integration health + quick retry.
- Desktop: full mapping/configuration.

**Architecture changes**
- Integration adapter layer + credential vaulting + webhook handling.

**Service updates**
- `timeEntryService`: canonical export DTO layer.
- Supabase: secure token storage via backend secrets (not client).
- `storageService`: no direct token persistence in local mode.

**Data model changes**
- Add `integrationConnection`, `fieldMapping`, and `syncLog` entities.

**Testing implications**
- Contract tests per adapter and replayable webhook tests.

**Migration considerations**
- Backfill optional mapping defaults for existing users.

**Risks + mitigation**
- Credential/security risk; enforce least privilege scopes and key rotation.

---

## 3) Cross-Version Technical Strategy

### Architecture Direction
- Keep SPA presentation in `mainView`/`checkView` but move increasingly complex business rules into focused service modules.
- Introduce explicit application state transitions (idle, active, offline-pending, sync-error) to prevent UI drift.
- Maintain provider-agnostic service interfaces so localStorage mode remains a stable fallback.

### Service Evolution Summary
- `timeEntryService`: from CRUD validation to richer domain layer (integrity, policy, analytics, reporting DTOs).
- `storageService`: from simple persistence to local cache + queued operations + migration versioning.
- Supabase integration: from basic persistence/auth to robust RLS, conflict handling, and server-assisted automation.

### Data and Migration Governance
- Version local schemas and remote tables explicitly.
- Provide forward-only migrations with rollback-safe toggles.
- Keep destructive migrations off by default; require explicit admin runbooks.

### Testing Strategy Evolution
- V1.1: extend regression/unit tests for integrity and quick edits.
- V2: add offline/sync integration and resilience tests.
- V3: add policy matrix, analytics correctness, and auth/RLS tests.
- V4: add adapter contract tests and scheduled job end-to-end coverage.

---

## 4) Prioritization Snapshot

1. **V1.1 first** to improve daily trust and perceived quality with low migration risk.
2. **V2 second** to make Supabase mode production-reliable across devices/network quality.
3. **V3 third** to unlock high-value insights and team viability.
4. **V4 fourth** once stable operational foundations and security controls are proven.

This sequence balances immediate UX wins, technical hardening, and long-term capability expansion.
