# Step 3 — UX Design (UI/UX Designer)

## UX Concept
A focused single-page app with lightweight auth routing where signed-out users land on a trust-first onboarding path (Landing → Sign Up/Sign In → Confirmation) before entering the tracking dashboard.

## Navigation Structure
- Single-page layout with hash-based auth routes for signed-out states (`#landing`, `#signup`, `#signin`, `#confirmation`) and `#app` for authenticated state.
- Signed-out: landing panel, auth form panel, and confirmation panel (only one visible at a time).
- Signed-in: status card + action buttons + day/historic overview + recent sessions.

## Text-Based Wireframes

### Desktop (Signed-Out)
```
+-------------------------------------------------------------+
| Work Hours Tracker                                          |
| Welcome + trust message                                     |
+-------------------------------------------------------------+
| [ Create account ] [ I already have an account ]           |
+-------------------------------------------------------------+
| Create account                                              |
| Email                                                       |
| Password                                                    |
| Confirm Password                                            |
| Validation / loading message                                |
| [ Sign Up ] [ Back ]                                        |
+-------------------------------------------------------------+
| Confirmation panel                                          |
| "Check your email" + Continue to sign in                  |
+-------------------------------------------------------------+
```

### Desktop (Signed-In)
```
+-------------------------------------------------------------+
| Current Status + Sync + Account controls                    |
| [ Check In ] [ Check Out ]                                  |
+-------------------------------------------------------------+
| Day/Historic Overview + Analytics                            |
+-------------------------------------------------------------+
| Recent Sessions                                              |
+-------------------------------------------------------------+
```

### Mobile
```
-----------------------------------
Work Hours Tracker
Welcome / Account flow

[ Create account ]
[ I already have an account ]

Email
Password
Confirm Password
Validation message
[ Sign Up ]

After sign-in:
STATUS: Checked In
[ Check In ] [ Check Out ]

Recent Sessions
...
-----------------------------------
```

## Interaction Flows
1. Initial load:
   - App restores auth session.
   - If signed out, landing route is shown.
   - If signed in, app-home dashboard is shown.
2. Sign Up:
   - User opens Create account flow.
   - System validates email/password/confirmation.
   - Supabase sign-up runs.
   - If session is absent (email verify required), confirmation panel appears with continue-to-sign-in action.
   - If session exists, user is redirected directly to app-home.
3. Sign In:
   - User enters credentials and signs in.
   - App transitions to authenticated dashboard state.
4. Check In:
   - User clicks Check In.
   - System validates no active session.
   - New entry is created with check-in timestamp.
   - UI updates status/message/history.
5. Check Out:
   - User clicks Check Out.
   - System validates active session exists.
   - Active entry receives check-out timestamp.
   - UI updates status/message/history.

## Color Palette
- Background: #f8fafc
- Surface: #ffffff
- Primary action: #2563eb
- Primary action hover: #1d4ed8
- Success/state active: #15803d
- Warning/info: #92400e
- Text primary: #0f172a
- Text secondary: #334155
- Border: #cbd5e1

## Typography
- Font family: system stack (`Segoe UI`, `Roboto`, `Helvetica Neue`, Arial, sans-serif)
- Heading: 28px, semibold
- Section titles: 20px, semibold
- Body: 16px
- Small/meta text: 14px

## Accessibility Considerations
- Semantic HTML with headings, buttons, table headers.
- Keyboard navigable controls with visible focus indicator.
- `aria-live` region for status and feedback updates.
- Minimum control touch target around 44px height.
- Color contrast designed for readable foreground/background pairings.
