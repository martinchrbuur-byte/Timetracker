# Step 3 — UX Design (UI/UX Designer)

## UX Concept
A focused single-page dashboard where the user immediately sees tracking status and can perform primary actions (Check In/Check Out) without navigation overhead. The interface prioritizes clarity, speed, and confidence.

## Navigation Structure
- Single-screen layout (no route changes in V1).
- Top section: app title and short purpose.
- Middle section: status card + action buttons.
- Bottom section: history table of tracked sessions.

## Text-Based Wireframes

### Desktop
```
+-------------------------------------------------------------+
| Work Hours Tracker                                          |
| Track check-in/check-out timestamps locally in your browser |
+-------------------------------------------------------------+
| STATUS: [Checked Out]                                      |
| Last Check In: --                                          |
| Message: Ready                                             |
| [ Check In ]   [ Check Out ]                               |
+-------------------------------------------------------------+
| Recent Sessions                                             |
| Date       | Check In        | Check Out       | Duration   |
| 2026-03-04 | 08:58:10        | 12:04:12        | 3h 06m     |
| ...                                                         |
+-------------------------------------------------------------+
```

### Mobile
```
-----------------------------------
Work Hours Tracker
Track timestamps locally

STATUS: Checked In
Started: 09:02
Message: Checked in successfully

[ Check In ]
[ Check Out ]

Recent Sessions
Date | In | Out | Duration
...
-----------------------------------
```

## Interaction Flows
1. Initial load:
   - App reads localStorage.
   - UI renders current status and history.
2. Check In:
   - User clicks Check In.
   - System validates no active session.
   - New entry is created with check-in timestamp.
   - UI updates status/message/history.
3. Check Out:
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
