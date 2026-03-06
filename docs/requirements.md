# Step 1 — Product Vision (PM with UI Expertise)

## Vision
Build a lightweight, reliable browser-based work-hour tracker that lets users record check-in/check-out timestamps in seconds, view today’s status instantly, and review recent work sessions without any backend dependency in V1.

## Problem Statement
Many individual workers and small teams need a fast way to track working time but do not want to install software, create accounts, or maintain server infrastructure. Existing tools are often too complex for simple daily check-in/check-out logging.

## Primary Users
- Freelancers who need simple time records.
- Small team members tracking daily start/end times.
- Students/part-time workers who need personal attendance logs.

## Use Cases
- Start a work session with one click (check-in).
- End a work session with one click (check-out).
- See whether the user is currently checked in.
- View recent entries with timestamps and total session duration.
- Keep data between browser sessions (same device/browser).

## Non-Functional Requirements (Step 1)
- Fast interaction: primary actions complete in under 1 second.
- Offline-first behavior in browser for V1.
- Works in modern Chromium/Firefox/Safari browsers.
- No external dependencies required for core functionality.
- Clear, readable UI on desktop and mobile widths.

## Success Criteria
- User can perform full check-in/check-out flow without guidance.
- Data persists after page refresh and browser restart.
- Invalid action attempts (double check-in/check-out) are prevented.
- At least one day of usage can be reviewed in history quickly.

---

# Step 2 — Requirements Specification (Product Owner)

## Functional Requirements
- FR-1: User can create a new active session by clicking Check In.
- FR-2: User can close the active session by clicking Check Out.
- FR-3: System shows current status: Checked In or Checked Out.
- FR-4: System stores and retrieves entries from localStorage.
- FR-5: System displays entry history sorted by most recent check-in.
- FR-6: System calculates and displays duration for completed sessions.
- FR-7: System prevents overlapping sessions.
- FR-8: System shows actionable feedback messages for errors/success.

## Non-Functional Requirements
- NFR-1: Dependency-free frontend (HTML/CSS/Vanilla JS).
- NFR-2: Compatible with VS Code Live Server.
- NFR-3: Basic accessibility (keyboard reachable controls, sufficient contrast).
- NFR-4: Local operations should remain responsive for up to 5,000 entries.
- NFR-5: Data format should be versionable for future migration.

## User Stories (INVEST)
- US-1: As a worker, I want one-click check-in so I can quickly start tracking.
- US-2: As a worker, I want one-click check-out so I can end tracking accurately.
- US-3: As a worker, I want to see my current status so I avoid duplicate actions.
- US-4: As a worker, I want to see recent entries so I can verify logged sessions.
- US-5: As a worker, I want data to persist after refresh so I do not lose records.

## Acceptance Criteria
- AC-1: Given no active session, when user clicks Check In, then an active entry is created with a timestamp.
- AC-2: Given an active session, when user clicks Check Out, then entry receives checkout timestamp and duration.
- AC-3: Given an active session, when user clicks Check In again, then action is blocked with message.
- AC-4: Given no active session, when user clicks Check Out, then action is blocked with message.
- AC-5: Given saved entries, when page reloads, then status and history are restored correctly.

## Constraints
- Browser-only for V1 (no backend/API).
- Use localStorage as persistence layer.
- Must run from static files via Live Server.

## Out-of-Scope (V1)
- Multi-user accounts and authentication.
- Cloud sync and cross-device consistency.
- Editable/deletable entries with audit trails.
- Payroll calculations and billing exports.

## Future Opportunities
- Export CSV/PDF reports.
- Tag sessions by project/client.
- Add reminders and auto-checkout prompts.
- Team dashboard and approvals.

---

# Step 4 — Requirements Revision (Product Owner)

## Updated User Stories
- US-1 (updated): As a worker, I want large, clear action buttons so I can check in/out quickly on desktop or mobile.
- US-2 (updated): As a worker, I want visible status cards with timestamp context so I can trust my current tracking state.
- US-3 (updated): As a worker, I want readable history rows with clear date/time and duration formatting so I can scan records fast.
- US-4 (new): As a keyboard user, I want complete action flow accessible by keyboard so I can use the app without a mouse.

## Updated Acceptance Criteria
- AC-1 (updated): Check In and Check Out controls are always visible above the fold on standard laptop viewport.
- AC-2 (updated): Active/inactive status is visually distinct and announced via an aria-live status message.
- AC-3 (updated): History is displayed in a structured table with headings and locale-formatted timestamps.
- AC-4 (new): Primary actions are reachable by keyboard tab order and have visible focus styles.
- AC-5 (updated): Feedback messages are shown in a dedicated message area and remain readable.

## Updated Functional Requirements
- FR-9: Provide dedicated status panel showing current state and active session start time.
- FR-10: Render history in a semantic table layout with fixed column labels.
- FR-11: Display non-blocking inline message area for operation outcomes.
- FR-12: Enforce button enabled/disabled states based on active session.

## New UX-Driven Requirements
- UXR-1: Minimum tappable control height of 44px for primary actions.
- UXR-2: Maintain clear visual hierarchy with heading, status, actions, then history.
- UXR-3: Use color + text labels (not color alone) to communicate state.
- UXR-4: Support narrow viewports down to 320px width without horizontal overflow.

---

# Step 5 — Historic Period Overview Revision (Product Owner)

## Updated Functional Requirements
- FR-13: In Historic mode, provide a period overview list with one row per day.
- FR-14: Each row must show the local date, earliest check-in time, and latest check-out time for that day.
- FR-15: Support Week, Month, and Year period filters based on an anchor date.
- FR-16: Provide a Copy action that copies Date/Start/End as tab-separated text for external applications.
- FR-17: Disable Copy and show an empty-state message when no rows exist for the selected period.

## Updated Non-Functional Requirements
- NFR-6: Historic period recalculation remains responsive for datasets up to 5,000 entries.
- NFR-7: Day grouping and period boundaries must use local time consistently.
- NFR-8: Feature must not change existing persistence contracts or entry invariants.

## Updated User Stories (INVEST)
- US-6: As a worker, I want a week/month/year overview of daily start and end times so I can quickly understand my working pattern.
- US-7: As a worker, I want to copy historic Date/Start/End rows so I can paste them into spreadsheet or payroll tools.

## Acceptance Criteria
- AC-6: Given Historic mode, when the user selects Week/Month/Year, the overview rows update to that period immediately.
- AC-7: Given multiple sessions on the same day, then the day row shows the earliest check-in and latest check-out.
- AC-8: Given no sessions in period, then the UI shows “No sessions in this period.” and Copy is disabled.
- AC-9: Given period rows exist, when Copy is clicked, then clipboard text includes a header and one Date/Start/End row per day.
- AC-10: Existing rules (single active session, overlap prevention, valid check-out ordering) remain unchanged.

## Constraints and Dependencies
- Keep implementation in current single-page layout and existing Day Overview section.
- Reuse existing design tokens and component classes in `public/styles.css`.
- Use service-layer aggregation to keep business logic out of rendering modules.
- Clipboard copy depends on browser Clipboard API support.

## Integration Notes
- Business aggregation is implemented in `src/services/timeEntryService.js` via `buildHistoricStartEndOverview(...)`.
- Date/range helpers are centralized in `src/shared/dateTime.js` (`toLocalDateKey`, `getRangeBounds`).
- UI structure and refs are extended in `src/ui/mainView.js`; rendering stays in `src/ui/checkView.js`.
- Persistence layer in `src/services/storageService.js` remains unchanged and provider-agnostic (localStorage/Supabase).

---

# Step 6 — Auth & Sign-Up Revision (Product Owner)

## Updated Functional Requirements
- FR-18: Provide a signed-out landing panel with clear routes to Create Account and Sign In.
- FR-19: Provide sign-up form fields for email, password, and confirm password.
- FR-20: Validate sign-up input client-side (email format, password strength, password confirmation match).
- FR-21: Integrate Supabase `auth.signUp` behavior and handle both confirmation-required and immediate-session responses.
- FR-22: Provide explicit confirmation screen and transition to sign-in after account creation when email verification is required.
- FR-23: Route authenticated users to app home state and hide signed-out panels.

## Updated Non-Functional Requirements
- NFR-9: Signed-out auth flow must remain keyboard-complete without pointer interaction.
- NFR-10: Loading, success, and error states must be exposed via readable inline messaging and ARIA live regions.
- NFR-11: Mobile and desktop layouts must preserve clear action hierarchy for landing/auth/confirmation panels.

## Updated User Stories (INVEST)
- US-8: As a new user, I want a clear Create Account path from landing so I can start quickly.
- US-9: As a new user, I want transparent password and validation feedback so I can fix issues immediately.
- US-10: As a new user, I want clear confirmation guidance after sign-up so I know what to do next.

## Acceptance Criteria
- AC-11: Given signed-out state, landing panel is visible and provides Create Account and Sign In actions.
- AC-12: Given invalid sign-up input, submission is blocked and a clear validation message is shown.
- AC-13: Given Supabase sign-up response with no session, confirmation panel is shown and user can continue to sign-in.
- AC-14: Given Supabase sign-up response with session, user is redirected to authenticated app home.
- AC-15: Given duplicate email or network failure, user sees actionable error messaging.
