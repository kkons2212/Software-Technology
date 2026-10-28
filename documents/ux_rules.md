# USER EXPERIENCE & INTERACTION FLOW RULES (UX SYSTEM RULES)
## Smart Multilingual Automated Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site

> **Document Purpose:** This document serves as the standard **User Experience & Interaction Logic (UX)** guidelines for AI Agents when implementing business workflows, state management, event handling, and exception control for both the **Visitor Web App** and the **Admin Web Portal (Unified Multi-Admin)**.
> **Core UX Philosophy:** Maximum automation for outdoor visitors (Zero-Install, Zero-Reload, Hands-Free Audio driven by individual POI geofence radiuses) and absolute safe control for Administrators (Non-blocking AI Pipeline, Strict Text-Audio Sync, Safe Deletion).

---

## 1. DESIGN TOKENS & MINIMALIST VISUAL FOUNDATION

AI Agents implementing CSS, Tailwind CSS, or UI components must adhere strictly to the following visual constraints:

### 1.1. Color Palette — Maximum 2 Neutral Shades + 4 Semantic Status Colors

No flashy gradients, neon colors, or more than 3 colors on a single screen.

| Token Role | Standard Color Code (Hex / Tailwind) | Mandatory Application Rule |
| :--- | :--- | :--- |
| **Primary Background** | `#FFFFFF` (`bg-white`) or `#F8FAFC` (`bg-slate-50`) | Bright, clean background for high readability under outdoor sunlight at Cu Chi Tunnels. |
| **Secondary Surface / Card** | `#F1F5F9` (`bg-slate-100`) + Border `#E2E8F0` (`border-slate-200`) | Separate content blocks with subtle `1px solid` borders; avoid heavy drop shadows (`box-shadow`). |
| **Primary Text** | `#0F172A` (`text-slate-900`) | WCAG AAA contrast ratio (≥ 7:1) for outdoor readability. |
| **Muted Text** | `#475569` (`text-slate-600`) | Used for subtitles, distance meters, timestamps, and secondary captions. |
| **Primary Action Accent** | `#1E293B` (`bg-slate-800`) or `#1D4ED8` (`bg-blue-700`) | Exactly 1 accent color for primary CTA buttons (Unlock, Listen, Save, Publish). |
| **Success / Ready Status** | `#15803D` (`text-green-700` / `bg-green-50`) | Used for: `PUBLISHED`, `READY`, `PAID`, "Listened" checkmark, Online indicator, Storage < 85%. |
| **Warning / Processing Status** | `#B45309` (`text-amber-700` / `bg-amber-50`) | Used for: `PENDING`, `NEEDS_UPDATE` (Audio needs update), TTS generating, Storage 85%–94%. |
| **Danger / Error / Locked Status** | `#B91C1C` (`text-red-700` / `bg-red-50`) | Used for: Delete button, GPS Out-of-Bounds, `FAILED`, Account Lock `HTTP 423`, Storage ≥ 95%. |

### 1.2. Typography & Multi-Script Layout Spacing

* **Multi-script Font Stack:** Use system sans-serif font families (`Inter`, `system-ui`, `-apple-system`, `Noto Sans`) supporting flexible writing systems and configured languages (Vietnamese, Latin, CJK, Cyrillic...) without layout breaks or uneven line heights (`line-height: 1.5`).
* **Minimum Font Floor:**
  * On Mobile (Visitor App): Audio guide narration text ≥ `16px` (`text-base`), headings ≥ `18px–20px` (`font-semibold`), secondary labels no smaller than `12px` (`text-xs`).
  * Touch Target: All interactive elements on the visitor interface must have a minimum touch target of `44px × 44px` with ≥ `8px` padding to allow easy tapping while walking outdoors.
* **No Unnecessary Animations:** Banned: complex animations, parallax, and glassmorphism that drain battery and degrade performance on mid-tier mobile devices. Only subtle standard transitions are permitted (`transition-all duration-200`).

---

## 2. VISITOR JOURNEY UX RULES

### 2.1. Stage 1: Zero-Install Access & Dynamic Multilingual Setup (`UC-01`)
* **Zero-Install Rule:** Visitors scan a QR code at the entrance or exhibit to open directly into the Web App. Multi-step onboarding carousels and mandatory account registration are strictly banned.
* **Dynamic Language Selection & Availability Filtering:**
  * The system is extensible, allowing multiple languages to be configured in the database.
  * **Availability Verification:** The visitor interface only permits selecting languages that have approved and published translations and audio guides (`PUBLISHED`). If a language lacks content or has not been published by an Admin, it is **hidden or rendered disabled (`disabled opacity-40`)** to prevent visitors from selecting empty guides.
* **Zero-Reload i18n Rule:**
  * When a visitor selects an available language, save the language code immediately to `localStorage` (`museum_preferred_lang`).
  * All UI labels, POI lists, previews, and audio player sources must update instantaneously via reactive state **without reloading the page (`window.location.reload` is strictly banned)**.
* **Non-blocking Geolocation Initialization:**
  * Immediately after language selection, invoke `navigator.geolocation.watchPosition`.
  * If the visitor **denies GPS permission** or is physically **outside the historical complex boundary**: Never show a blocking error popup. The map automatically centers at the **Main Entrance (`11.1432, 106.4631`)** with a non-blocking toast/banner allowing manual exploration.

### 2.2. Stage 2: Freemium Exploration, Payment & 24h Session Recovery (`UC-06`)
* **Freemium Discovery Hierarchy:**
  * **Before Payment:** Visitors have full access to the outdoor map, see their real-time GPS position, tap `"Directions"` to navigate to any POI, and read free summaries (`short_description`).
  * **Paywall Trigger:** Only when the visitor taps `"Unlock Audio Guide"` in the header, or taps `"Play Audio"` / locked detailed historical narration (`Lock icon`), does the application display the `Checkout Modal`.
* **Automated Webhook-Driven Activation:**
  * When the visitor selects **VietQR** or **International Card (Stripe / PayOS)** (`POST /api/v1/payments/create-checkout`), the client listens for confirmation via polling or WebSocket/SSE.
  * Immediately upon Backend confirmation of `PAID`:
    1. Close the Checkout Modal and remove all lock icons across all screens without requiring a page reload.
    2. Store the `SessionToken`, `SessionCode` (6–8 alphanumeric characters, e.g., `CCT-8942`), and expiration timestamp `expires_at = now() + 24 hours` in browser storage.
    3. Display a modal prompting the visitor to record or copy their `SessionCode` with a 1-tap copy button.
* **Session Recovery Rule (`POST /api/v1/sessions/restore`):**
  * If a visitor changes devices, clears browser cache, or uses incognito mode, they can tap `"Restore Tour Session"` (accessible on the Header and Checkout Modal) and enter their `SessionCode`.
  * If the session is within its 24-hour validity window, full access is restored immediately without repayment.

### 2.3. Stage 3: Outdoor Walking Navigation & Dynamic Hands-Free Audio (`UC-01`)
* **Map Interaction & Bottom Sheet Preview:**
  * Tapping a POI pin on the map opens a `Bottom Sheet` displaying real-time distance calculated via the Haversine formula.
  * Tapping `"Directions"` renders a polyline route from the visitor's coordinates to the POI and toggles the button label to `"Clear Route"`.
* **Dynamic Geofence Proximity Auto-Trigger:**
  * Each POI has an **independent trigger radius (`poi.trigger_radius`)** configured by Admin (ranging from `10m` to `50m`, default `30m`).
  * As the visitor walks (`watchPosition` updating coordinates continuously), the system calculates the Haversine distance `d` to each active POI. If the visitor holds an active 24h session and enters **the POI's geofence boundary (`d ≤ poi.trigger_radius`)**, the application automatically fetches the audio and plays the narration in the selected language.
* **10-Minute Cooldown Anti-Spam Debounce:**
  * Once a POI auto-triggers via GPS, record the timestamp (`lastTriggeredAt`). For the next **10 minutes (600 seconds)**, if the visitor remains or wanders **within that same POI's radius (`d ≤ poi.trigger_radius`)**, audio **will not auto-trigger again**. (Visitors may still press `"Play Audio"` manually at any time).
* **Overlapping Geofence Resolution:**
  * If a visitor is within the radius of multiple POIs simultaneously, the system prioritizes the physically closest POI.
  * **No Abrupt Audio Interruptions:** If audio is currently playing for POI A and the visitor enters POI B's radius, never cut off POI A mid-sentence. Instead, display a subtle notification toast: `"You are near [POI B Title] — Tap to switch"`.
* **Persistent Player & Weak Network Fallback:**
  * Closing the detail sheet or switching views keeps audio playing smoothly via the `Floating Mini Player` at the bottom (seek `±10s`, speed `0.8x, 1.0x, 1.2x`).
  * **3G/4G Weak Coverage Fallback:** Under dense Cu Chi forest canopy where cellular stream hangs without loading within 3.5 seconds, the player automatically aborts the stream and switches to browser `Web Speech API` (`window.speechSynthesis`) using the pre-cached text and target language's BCP-47 code (`vi-VN`, `en-US`, `zh-CN`, `ja-JP`...).

---

## 3. MULTI-ADMIN WORKFLOW UX RULES

The system enforces a **Unified Multi-Admin Model**: Every authenticated Administrator operates on a single consolidated dashboard with full administrative capabilities, eliminating fragmented role interfaces.

### 3.1. Stage 1: Authentication, Brute-Force Lock & Session Management (`UC-02`)
* **Preserve Username on Failed Attempt:** When login fails, clear only the `Password` field, retain the `Username/Email` input, and refocus the password field.
* **Temporary Account Lockout (`HTTP 423 Locked`):**
  * When login fails ≥ 5 consecutive times, return `HTTP 423 Locked`, disable the submit button, and display a **15-minute countdown timer** informing the Admin of the remaining lockout duration.
* **Session Lifecycle:**
  * Uses `HttpOnly JWT` valid for a maximum of **60 minutes**, coupled with a **30-minute idle timeout**. Upon expiration or logout, clear all session state and redirect to `/admin/login`.

### 3.2. Stage 2: POI Management, Two-Way Map Sync & Async AI Workers (`UC-03`)
* **Two-Way Coordinate & Radius Synchronization:**
  * Dragging the pin on the Leaflet map immediately updates the numerical `Latitude` and `Longitude` fields.
  * Typing coordinates into the Lat/Lng fields moves the map pin and geofence circle in real time.
  * Adjusting the Geofence Radius Slider (`10m–50m`, default `30m`) dynamically resizes the `L.circle` overlay on the map.
* **Bounding Box Guardrail:**
  * Coordinates outside the Cu Chi Tunnels bounding polygon immediately turn inputs red, show an error alert, and disable the `"Save Changes"` button.
* **Non-blocking Async AI Pipeline:**
  * Saving a POI (`POST / PUT /api/v1/admin/pois`) saves the record with status `PENDING` and spawns a background worker to run machine translation and Edge-TTS audio synthesis.
  * The Admin UI returns immediately, shows a `PENDING` badge ("Pending"), and updates to `READY` automatically when complete without requiring a page reload.
* **Hybrid Safe Deletion Confirmation:**
  * Deleting a POI requires a 2-step confirmation dialog explaining that physical `.mp3` files will be purged while the database record is deactivated (`is_active = FALSE`) to protect audit and trigger history.

### 3.3. Stage 3: Multilingual Audit & Strict Text-Audio Sync Rule (`UC-04`)
* **Side-by-Side Review Grid:**
  * Filter by `Language`, `Exhibit`, or `Approval Status`. The original source text is presented side-by-side with the editable target translation and an inline audio preview player.
* **Strict Text-Audio Sync Rule (MANDATORY):**
  1. Modifying any text in a translation immediately updates its status to **`NEEDS_UPDATE` ("Audio Needs Update")**.
  2. The system **automatically disables the `"Approve & Publish"` button** for that translation to prevent publishing text that does not match the narration.
  3. The Admin must click **`"Regenerate Audio Guide"`**.
  4. Only after Edge-TTS generates the new `.mp3` matching the revised text does the `"Approve & Publish"` button re-enable.
  5. Clicking `"Approve & Publish"` sets status to `PUBLISHED`, instantly unlocking the content on the live visitor application.

### 3.4. Stage 4: Visitor Density Analytics & Storage Health Monitoring (`UC-05`)
* **Telemetry & Report Export:**
  * Displays visitor density heatmaps, Top 10 POIs, average dwell time, and language breakdown. Supports CSV and JSON report exports.
* **Storage Threshold Alert Rule (≥ 85%):**
  * Periodically inspects `/static/audio` disk usage.
  * When storage reaches **≥ 85%**, a sticky alert banner is pinned to the top of all Admin pages with a 1-click `"Clean Orphaned Audio"` button calling `POST /api/v1/admin/storage/clean-orphans`.
  * When storage reaches **≥ 95%**, displays a critical red alert and temporarily halts new audio generation.

---

## 4. ADMIN ↔ VISITOR INTERACTION TOUCHPOINT MATRIX

| System Component | Administrator Action (`Admin Action`) | Visitor Experience (`Visitor Experience`) |
| :--- | :--- | :--- |
| **Interactive Map & POI Radius** | Sets coordinates inside Cu Chi boundary and configures custom radius (`10m–50m`, default `30m`). | Updates pin on outdoor map; auto-triggers narration when walking into the POI's specific radius. |
| **Content & Multilingual Setup** | Creates source text, adjusts translations, and clicks `Approve & Publish`. | Dynamic language selector shows only `PUBLISHED` languages; updates free summary and locked narration. |
| **Audio Guide Pipeline** | Clicks `Regenerate Audio Guide` upon text edits to ensure 100% audio-text sync before publishing. | Seamless playback via `Floating Mini Player` (seek `±10s`, speed `0.8x–1.2x`), auto-falls back to `Web Speech API`. |
| **24h Session & Operations** | Monitors real-time density on Heatmap, views revenue metrics, and runs storage cleanup. | Unlocks full 24h pass via `VietQR` / `Stripe`, receives `SessionCode` (6–8 chars) for cross-device recovery. |
