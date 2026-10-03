# QR Attendance App — Red UI Implementation and Asset Plan

**Scope:** Build only the mobile app UI in the existing Expo project. Use mock data and local UI state where needed. Do not implement API, database, authentication exchange, camera scanning, push delivery, or approval persistence in this UI pass. Prepare clean component boundaries for those integrations. Preserve existing project files, routing conventions, assets, dependencies, and working behavior.

**Source of truth:** The attached Attendance Management System technical plan defines product behavior. This document translates its UI into an implementation brief. The approved red mockups are visual references, but any inconsistent labels, dates, counts, navigation, or invitation behavior in generated images must yield to the rules here.

## 1. Non-negotiable product behavior

- An employee **does not check in immediately**. They scan the employer's daily QR, inspect the verification result, then submit an **attendance request**. Only employer approval marks them **Present**.
- QR scan success means **QR verified**, never **Present**. Keep requested time and approved time distinct.
- Network/Wi-Fi verification is advisory. If unavailable, show **Network not verified** and allow a request. Actual Internet offline means the request was **not sent**.
- The employer opens a daily attendance session and sees a stable QR for that session. Closing attendance is a confirmed action.
- A newly signed-in Google user may create a workplace. They can join only a workplace for which the employer pre-added their exact email, or claim an email-bound invitation. A public, anyone-can-join link is forbidden.
- Adding an email creates an invited employee entry. Show **Copy invite link** and **Share link**; do not imply an email was sent unless an email provider is actually configured. A forwarded link cannot join using a different Google account.
- Employee ID + PIN is a fallback for an employer-provisioned employee. Do not ask employees to invent a password.
- Employer can approve/reject requests and manually mark/correct attendance, with a reason for manual changes and a rejection reason when required by product rules.
- Never call someone Absent solely because they have not requested attendance while the workday remains open. Use **Not marked**.
- No leave request system, check-out flow, tracked work hours, payroll, geofencing, or open invitation policy in this UI pass. These appeared in earlier visual explorations and are outside this plan.

## 2. Visual identity

### Palette

| Token | Hex | Use |
| --- | --- | --- |
| `brand.primary` | `#B83B4A` | Primary CTA, selected tab/icon, important links |
| `brand.pressed` | `#922D3A` | Pressed button, dark brand heading/accent |
| `brand.light` | `#D96570` | Small decorative strokes only |
| `brand.tint` | `#FCE9E7` | Selected surfaces, subtle callouts |
| `canvas` | `#FAF8F6` | Main background |
| `surface` | `#FFFFFF` | Cards, fields, modal surfaces |
| `surface.muted` | `#F5F1EE` | Secondary grouped areas |
| `border` | `#EAE5E2` | Cards, input borders, dividers |
| `text.primary` | `#17202A` | Titles and body |
| `text.secondary` | `#667085` | Supporting labels |
| `text.inverse` | `#FFFFFF` | On filled primary buttons |
| `success` | `#19875A` | Present/approved/verified |
| `success.tint` | `#E5F5EB` | Positive chip/card tint |
| `pending` | `#B86B08` | Pending emphasis |
| `pending.tint` | `#FFF2D9` | Pending chip/card tint |
| `info` | `#3E70B8` | Neutral information |
| `info.tint` | `#EAF2FF` | Network/permission guidance |
| `danger` | `#A92F39` | Rejected/error/destructive meaning |
| `danger.tint` | `#FCE8E8` | Rejection/error surface |
| `neutral.status` | `#667085` | Not marked/closed/unavailable |
| `neutral.tint` | `#F0F1F2` | Neutral chips |

Brand red and danger red are semantically different. Every status has a text label and icon in addition to color. Keep backgrounds mostly ivory/white; do not flood screens with red or use neon, glass effects, loud gradients, or thick shadows.

### Typography

- Preferred typeface: **Inter**. If unavailable in the existing app, use the platform system font until the font asset is installed; do not block UI development. Bundle licensed Inter Regular (400), Medium (500), Semibold (600), Bold (700) once if choosing custom font.
- Display/page title: 26–28 px, 700, line height around 32–34.
- Section heading: 18–20 px, 600–700, line height around 24–28.
- Card title: 16 px, 600; body: 14–16 px, 400–500; metadata: 12–13 px, 400–500.
- Key attendance status: 22–26 px, 700. Metric numbers: 24–28 px, 700.
- Buttons: 15–16 px, 600. Minimum readable metadata 12 px; respect system font scaling, test long names and translated text.
- Sentence case for most labels. Prefer concise plain language: “Request attendance”, “Waiting for employer approval”, “Not marked”.

### Layout and interaction tokens

| Property | Mobile rule |
| --- | --- |
| Base spacing | 4 px scale; common gaps 8, 12, 16, 24 |
| Page horizontal padding | 16–20 px |
| Card internal padding | 16 px (20 px for hero card) |
| Card radius | 16 px |
| Input/button radius | 12 px |
| Chip radius | 999 px |
| Standard button height | 48–52 px; tap target at least 44 × 44 px |
| Border | 1 px `border`; very soft elevation only where needed |
| Bottom tab bar | Safe-area aware, icon + label, visible selected state |
| Scrolling | Header and bottom tabs stable where sensible; content scrolls without clipping CTA |
| Safe areas | Support notches, home indicator, keyboard, small phones |

Prefer outline icons with a consistent 20–24 px stroke and 2 px visual weight. Use one icon family throughout (for example the project's existing icon library); avoid mixing filled and outline families. Use a filled icon only for selected navigation if available in that same family.

## 3. Canonical navigation map

### Shared entry flow

`Welcome → Google sign-in placeholder → Membership resolution → Existing workplace / Choose path`.

- Choose path: **Create a workplace** always; **Join a workplace** only if a matching preapproved entry is returned. Otherwise provide an explanatory empty state rather than an arbitrary workplace search.
- Invite deep link: `Invite preview → Continue with Google → Matching email → Confirm join → Employee Today`.
- Wrong account, expired/revoked invite, already claimed, and no matching workplace each have a dedicated helpful state.
- PIN fallback: `Welcome → Employee ID + PIN → Employee Today` for provisioned staff.
- Several memberships: workplace chooser/switcher with the role displayed on each workplace; do not silently make another workplace.

### Employee

Bottom tabs: **Today**, **History** only. Open Profile from a header avatar. Scan, Review Request, Pending/Approved/Rejected Detail, and History Day Detail are nested screens with a back action.

### Employer

Bottom tabs: **Today**, **Attendance**, **Employees**, **Reports**. Open Settings/Profile from header avatar/gear. Daily QR, Requests, Request Detail, Add/Edit Employee, Employee Detail, Invite Management, and Manual Attendance are nested screens. The Today screen exposes Review Requests prominently; Requests does not need a fifth tab.

## 4. Screen specifications

### A. Authentication and onboarding

| Screen | Layout and content | Main action / state |
| --- | --- | --- |
| Welcome | Small workplace/calendar illustration, wordmark, short subtitle, Google button, secondary employee ID + PIN | Continue with Google; loading/error; no role selection before identity |
| Choose path | Greeting and two calm option cards; Create workplace; Join workplace only for exact preapproved email | Select path; no matching workplace explanation |
| Create workplace | Name, timezone suggested from device but editable, optional address | Create workplace; required field and failed save states |
| Invite preview | Workplace name, employee role, invited email, short privacy guidance | Continue with Google; preserve destination through login |
| Confirm join | Matched Google email, workplace details, membership role | Join workplace; progress/success/conflict |
| Wrong Google account | Invited email and current email shown separately | Switch Google account |
| Expired/revoked invite | Clear reason without exposing token | Ask employer for new link; return to welcome |
| PIN login | Employee code, obscured 4/6-digit PIN, inline errors | Sign in; ask employer to reset PIN |
| Workplace chooser | Existing workplaces with role and last-used context | Enter selected workplace |

### B. Employee

| Screen/state | Exact hierarchy and key copy | Action |
| --- | --- | --- |
| Today — Not marked | Header date/workplace/avatar; large neutral status card **Not marked**; helper “Scan your workplace QR to request attendance”; 2–3 recent days | **Scan today's QR** |
| Scan | Camera-like viewfinder, corner guide, flashlight, scan guidance, permission callout | Scan placeholder; request camera permission only on entry when integration exists |
| Invalid/closed/expired QR | Clear result with workplace/date if safe; no request CTA | Scan again / return Today |
| Review request | **QR verified**; workplace verified; network **Verified**, **Not verified**, or **Unavailable**; current workplace-local date/time | **Request attendance**; explanatory “Your employer will review this request” |
| Sending/offline | Progress while submitting; disable duplicate taps. On Internet failure: **Request not sent** and previous confirmed state remains | Retry when online |
| Today — Pending | Amber **Waiting for employer approval**; requested time and request timeline | View status/refresh; no duplicate request button |
| Today — Present | Green **Present**; check-in/request time and approved time shown separately | View detail/history |
| Today — Rejected | Reason if supplied, decision time, whether another attempt is allowed | View request; rescan only if permitted |
| History | Simple month selector and date rows: Present, Pending, Rejected, Not marked; check-in time only where meaningful | Open day detail |
| History day detail | Workplace-local date, status, requested/check-in and approval times, verification notes | Back to History |
| Profile | Name/avatar, employee code, email if available, workplace, workplace switcher if applicable, sign out | Switch workplace/sign out |

### C. Employer

| Screen | Exact hierarchy and content | Action |
| --- | --- | --- |
| Today | Workplace/date, four compact counts Employees/Present/Pending/Not marked, pending request card, 3–5 roster rows | **Review requests** if pending; **Open attendance** when closed |
| Daily QR — Closed | Date, closed state and brief explanation | **Open attendance** |
| Daily QR — Open | Large high contrast QR area, opened time, workplace date, open chip, small caution that approval is needed | **Close attendance** behind confirmation; share/print guidance if supported |
| Requests queue | Pending first, employee name/code, request time, QR and network indicators, filter chips | Open detail, Approve, Reject |
| Request detail | Employee, membership/workplace, requested time, QR validity, advisory network result, decision history | Approve/Reject with disabled submitting state and outcome |
| Reject confirmation | Optional/required reason according to product rule, clear consequences | Confirm rejection |
| Attendance roster | Workplace-local date, Present/Pending/Not marked counts, search/filter, row actions | Open record / Manual attendance |
| Manual attendance | Employee, date, Present/Absent/Half day/Leave, check-in when applicable, required reason | Save record with confirmation/audit copy |
| Employees | Searchable list, Active/Invite pending/Inactive filters, name/code/email | Add employee |
| Add employee | Exact email required for Google path, optional name/code; separate **No Google account** PIN provisioning path | **Save employee**, then Copy/Share invite link; never claim automatic email delivery |
| Employee detail | Identity, membership state, attendance history, edit, PIN reset where applicable | Edit/Deactivate with confirmation |
| Invitations | Email-bound entries, Pending/Claimed/Expired/Revoked, Copy link/Share/Reissue/Revoke | Manage one-use invitation; no open link toggle |
| Reports | Month/date range, concise Present/Pending/Not marked/Absent after applied rule, employee list, export when supported | View range / Export |
| Settings | Workplace name, timezone, optional address, profile, employee invitation access, sign out | Save settings; no anyone-can-join switch |

## 5. Component inventory

Create shared `Screen`, `AppHeader`, `BottomTabs`, `PrimaryButton`, `SecondaryButton`, `TextField`, `SelectField`, `Card`, `StatusChip`, `MetricTile`, `EmployeeRow`, `RequestCard`, `TimelineStep`, `VerificationRow`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ConfirmDialog`, `Avatar`, and `DateSwitcher` components. Build the QR frame, calendar rows, charts (if any), form controls, and status surfaces in React Native rather than exporting flat screen images.

Component states: default, pressed, focused (web where relevant), disabled, loading, empty, success, error. All destructive buttons have a confirmation step. A success toast may supplement but must not replace persistent on-screen status. Long names and emails truncate sensibly; full values remain accessible in detail screens. Follow screen reader labels, keyboard behavior, focus order, adequate touch targets, and WCAG AA contrast for text.

## 6. Asset strategy: what to generate

The approved boards are **visual references**, not spritesheets to crop into app screens. Prefer code-native UI for everything interactive. Create a small reusable brand asset set; the implementation agent can generate it locally or with an image tool, then inspect at actual mobile sizes.

| Asset | Format and use | Requirement |
| --- | --- | --- |
| Brand mark + wordmark | Editable SVG source; PNG export if native path needs it | Abstract calendar/QR corner with a subtle approval check; simple and recognizable at 24 px |
| App icon | PNG export for Expo config, plus editable source | Warm crimson field, white/ivory mark, safe margins; no tiny text |
| Android adaptive icon foreground | Transparent PNG | Centered mark with broad clear padding; let config supply background `#B83B4A` |
| Splash symbol | Transparent PNG | Same mark, centered on `#FAF8F6`; no full-screen baked artwork |
| Welcome illustration | SVG or transparent PNG | Small storefront/workplace and calendar motif; restrained red/blush; optional |
| Empty history | SVG or transparent PNG | Simple calendar motif, small scale |
| No employees | SVG or transparent PNG | Two-person/workplace motif, small scale |
| No pending requests | SVG or transparent PNG | Approval check/card motif, small scale |
| Invite expired / network error | SVG or transparent PNG, optional | Simple line illustration; never replace explanatory copy |
| Google button | Use Google's official branding asset when permitted by its guidelines | Keep official multicolor G distinct from app branding |
| Standard icons | Existing consistent vector icon package, not PNG per icon | QR, camera, flashlight, calendar, clock, people, bell, settings, check, warning, link, copy |
| QR code | **Generated at runtime from the backend's session payload** | Never ship a fixed QR bitmap or use the mockup QR for a live session |
| Avatars | Google avatar URL where available, initials fallback | No generated photos required |

Avoid generating status chips, buttons, metric tiles, list rows, text, tab bars, or calendar screenshots as assets. Do not use a generated image as a functional QR. Verify font and image licensing before bundling third-party assets.

### Asset generation prompt — reusable style lock

```text
Design an asset for a modern small-business QR attendance app named Workly.
Style: clean vector-friendly 2D geometry, gently rounded corners, even line weight,
confident negative space, warm human tone, polished and restrained. Palette:
crimson #B83B4A, wine #922D3A, blush #FCE9E7, warm ivory #FAF8F6,
charcoal #17202A. No neon, glass, gradients, glossy 3D, photography, shadows,
watermarks, interface screenshots, QR content, or small illegible text.
Transparent background unless the asset prompt explicitly requests a field.
Deliver one centered isolated asset with clean edges and generous margins.
```

### Individual prompts for the agent

**1. Brand mark**

```text
Create a simple original vector-friendly symbol for Workly, a QR attendance
request app for small workplaces. Combine a calendar tile or four QR scan
corners with one understated approval check. The mark must remain recognizable
at 24 px. Use one crimson #B83B4A shape and an ivory/negative-space check.
No clock hands, no letters inside the mark, no fake QR pattern. Transparent
background. Produce an editable vector source and light/dark PNG previews.
```

**2. Wordmark**

```text
Create a clean wordmark reading exactly “Workly” using a friendly modern
sans-serif style, paired with the approved calendar/QR approval mark. Use
wine #922D3A on light backgrounds. Keep symbol-to-word spacing balanced.
Deliver horizontal and symbol-only variants with editable vector sources.
```

**3. App icon and adaptive foreground**

```text
Use the approved Workly mark, unchanged. Create a square app icon with solid
#B83B4A background and a centered ivory mark, generous safe margins, no
wordmark and no rounded-corner mask baked into the file. Also export a separate
transparent adaptive foreground containing only the centered ivory mark;
configure the Android background color as #B83B4A. Check legibility at 48 px.
```

**4. Splash symbol**

```text
Use the same approved Workly mark, unchanged, as a centered transparent PNG.
No full-screen composition and no slogan. The app config supplies #FAF8F6
as the splash background. Keep clear padding around the symbol.
```

**5. Welcome illustration**

```text
Create a compact transparent 2D illustration of a welcoming small workplace
storefront with one calendar tile and a subtle check mark. Crimson #B83B4A,
blush #FCE9E7, warm ivory and charcoal accents. Friendly but professional,
low detail, broad shapes, no people or readable text. Fits above a login
button without taking more than roughly one-third of a phone screen.
```

**6. Empty states**

```text
Create three separate small transparent illustrations in the exact Workly
style: A) empty attendance history — a clean calendar; B) no team members —
a small workplace with two abstract people; C) no pending requests — a request
card with a small check. Each is a standalone asset with identical visual
weight and scale. No text baked into images; accompanying copy remains native.
```

**7. Error illustrations (optional)**

```text
Create two small transparent Workly-style illustrations: expired invitation
as a simple link/card with a small time symbol, and offline request as a
network symbol. Use restrained semantic cues. No alarming red full-screen
background, no embedded text, and no implication that attendance was marked.
```

### Asset QA and placement

- Inspect icon on light/dark launcher previews and at 48 px; inspect illustrations at their actual rendered dimensions. Remove detail that vanishes.
- Export required resolution variants according to the Expo version and project config; configure the icon, adaptive icon, and splash through the existing `app.json`/`app.config.*` rather than assuming a file path.
- Suggested folders inside the existing app: `assets/brand/`, `assets/illustrations/`, `assets/fonts/`. Keep editable masters alongside or in `design/` if the repository allows it.
- Do not overwrite the existing app icon or splash until the replacements are previewed. No generated photo avatars.

## 7. Build order and acceptance

1. Inspect the existing Expo app, router, installed icon package, fonts, asset paths, and current styles. Do not scaffold a second app.
2. Add theme tokens, typography, shared components, role navigation shells, and safe-area behavior.
3. Build Welcome, Google placeholder, PIN login, workplace choice/create, invite preview/claim and error states.
4. Build Employee Today in four states, Scan visual shell, Review Request, History, Detail, and Profile.
5. Build Employer Today, Daily QR visual shell, Requests/Detail, Attendance/Manual form, Employees/Add/Detail/Invitations, Reports, and Settings.
6. Generate the few reusable assets from the prompts above; wire them into relevant screens. Use placeholders only until final assets are ready.
7. Walk through the UI locally with mock data: direct employer signup, invited employee, PIN fallback, QR review → pending → approved/rejected, employer opening QR and reviewing requests, manual attendance, invitations, and offline error. Verify small phone, larger phone, keyboard, font scaling, and screen reader labels.

**Done means:** The Expo app opens without backend services; all listed screens are navigable; role navigation is consistent; mock interactions visibly transition between honest states; red tokens and assets match across screens; no request becomes Present before employer approval; no public invite path exists; no generated QR is used as a real credential.

## 8. Copy-ready implementation prompt for a coding agent

```text
Work inside my existing attendance full-stack project and its existing Expo app.
Read the attached Attendance Management System technical plan and this UI file.
Implement only the mobile frontend UI. Do not build backend APIs, OAuth token
exchange, real camera scanning, push notifications, or database persistence in
this pass. Inspect the current app and preserve its architecture, package
manager, routes, assets, and working features.

Make the exact red Workly-style UI described here. Use the design tokens,
typography, spacing, canonical employee two-tab navigation and employer four-tab
navigation, and all screen specifications. Build reusable React Native
components, realistic local mock data, and UI-only transitions so the entire
QR attendance journey can be explored. A scan leads to Review Request, then
Pending; only an employer approval demo action changes it to Present. Show
requested and approved times separately. Wi-Fi unavailable remains advisory;
Internet offline means request not sent. Use Not marked during an open day.

Implement Google sign-in as a visual placeholder and employee ID + PIN fallback
UI; do not claim authentication is active. Direct signup offers Create workplace
and only a verified preapproved Join option. Invitations are one-use and bound
to an employer-added exact email. The employer Add Employee UI saves a pending
entry and offers Copy/Share invite link; it does not claim to send an email and
has no open-link toggle.

Generate or build the required logo, app icon, adaptive foreground, splash
symbol, welcome illustration, and three empty-state illustrations using the
asset prompts in this document. Reuse a single consistent outline icon family.
Do not export whole mockup screens as images; render controls, text, cards,
status chips, and lists as native components. A displayed QR in UI-only mode
must be labeled demo/non-scannable and never treated as a credential.

After implementation, run the project's typecheck/lint and launch the Expo
preview if available. Fix rendering/navigation problems. Report changed files,
what remains a UI placeholder, and how to open employee and employer demo flows.
```
