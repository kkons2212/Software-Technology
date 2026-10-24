# VISUAL USER INTERFACE RULES (UI SYSTEM RULES)
## Smart Multilingual Automated Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site

> **Document Purpose:** This document serves as the standard **Visual Interface Guidelines (UI - User Interface)** for AI Agents when writing CSS, Tailwind CSS, and implementing UI components across both subsystems: **Visitor Web App** (Visitor - Mobile-First) and **Admin Web Portal** (Unified Multi-Admin - Desktop-First).
> **Core Visual Philosophy:** Minimalist, Functional, High Outdoor Readability, Monochrome Neutrals paired with Semantic Status Colors — **strictly no decorative gradients, neon colors, or distracting embellishments**.

---

## 1. DESIGN TOKENS & MINIMALIST COLOR SYSTEM

AI Agents writing CSS, Tailwind CSS, or UI Components must strictly adhere to the following visual constraints:

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

## 2. VISITOR WEB APP UI COMPONENT STANDARDS (MOBILE-FIRST)

The visitor interface adheres to a **Mobile-First** standard (optimized viewport `375px–430px`, centered with `max-w-md mx-auto` on larger screens).

### 2.1. Header & Dynamic Language Switcher UI
* **Fixed Height:** `h-14` (`56px`), white background `#FFFFFF`, subtle bottom border `border-b border-slate-200`, sticky at the top (`sticky top-0 z-30`).
* **Dynamic Language Selector:**
  * Dropdown or compact pill-bar design (`px-2.5 py-1.5 rounded-md border border-slate-300 text-sm font-medium`), automatically scaling based on available languages.
  * Displays language names in their **native script** (e.g., `Tiếng Việt`, `English`, `日本語`, `한국어`, `中文`, `Français`...), avoiding distracting multicolored flag icons.
  * **Dynamic Language Filtering Rule:** Only display languages with published content (`PUBLISHED`). If a language is not yet supported or has no published translations, **hide it completely or render it disabled (`disabled opacity-40`)** to prevent visitors from selecting empty guides.
* **Unlock CTA & 24h Session Status Badge on Header:**
  * **When Unpaid (`Unpaid`):** Render "Unlock Audio Guide" in primary accent (`bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-md`) with a monochrome lock icon.
  * **When Active (`Active 24h`):** Replace the unlock button with a minimal countdown badge (`bg-green-50 text-green-700 border border-green-200 text-xs px-2.5 py-1 rounded-md`) displaying session code and remaining time (e.g., `CCT-8942 • 23h 45m`).

### 2.2. Outdoor Map & Overlays UI
* **Map Container (OpenStreetMap / Leaflet):** Occupies most screen real estate (`h-[calc(100vh-3.5rem)]`), hides non-essential Leaflet controls, keeping only zoom buttons (`+ / -`) and the "Locate Me" button positioned at the bottom right (`44px × 44px`, white background, `border-slate-300`).
* **User GPS Indicator:** Blue dot `#1D4ED8` (`14px × 14px`) with `2px` white border and a subtle pulse/static radius circle representing the visitor's physical position.
* **POI Markers & Dynamic Geofence Radius Circles:**
  * Minimalist circular pins or cards numbered sequentially (`bg-slate-900 text-white font-bold`).
  * If geofence radiuses are displayed on the map, each POI's circle is rendered **strictly according to its individual configured radius** (`poi.trigger_radius` from `10m` to `50m`, default `30m`). Never render a fixed, uniform radius across all POIs.
  * **Currently Playing POI:** Highlights border and background in accent blue `#1D4ED8`.
  * **Listened POI (`Listened`):** Changes to green `#15803D` with a subtle checkmark.
* **Walking Navigation Polyline:** Solid or dashed single-color line `#1D4ED8`, `4px` width, clearly visible against the bright outdoor map.

### 2.3. POI Preview Bottom Sheet & Content Gate UI
* **Sliding Bottom Sheet / Preview Card:**
  * White background `#FFFFFF`, rounded top corners (`rounded-t-xl`), top border `border-t border-slate-200`, max height `40vh` to avoid obscuring the map.
  * Clean horizontal layout: Square thumbnail (`72px × 72px`, `rounded-lg object-cover`), POI Title (`font-semibold text-slate-900`), distance badge (`text-xs text-slate-600`, e.g., `120m away`), and free summary preview (`short_description`, truncated to `line-clamp-3`).
  * 2 Action buttons split evenly (`grid grid-cols-2 gap-2 mt-3`):
    * Secondary button `"Directions"` / `"Clear Route"`: Light background with gray border (`bg-slate-100 text-slate-900 border border-slate-300 h-11 rounded-md font-medium`).
    * Primary button `"Play Audio"`: Primary accent (`bg-slate-800 text-white h-11 rounded-md font-medium`). Includes a lock icon (`🔒`) if the visitor has not unlocked the session.
* **Content Gate Paywall Blur Effect:**
  * On the POI details page before unlocking, full historical text displays only the first 3 lines, with the rest covered by a smooth fade gradient (`bg-gradient-to-b from-transparent to-white`) and a flat unlock prompt box (`border border-slate-200 bg-slate-50 p-4 rounded-lg text-center`).

### 2.4. Checkout & Session Restore Modal UI
* **Modal Container:** White background `#FFFFFF`, rounded corners `rounded-lg`, border `border-slate-200`, subtle backdrop overlay (`bg-slate-900/50`).
* **Price Display:** Flat informational box (`bg-slate-50 p-3 rounded-md border border-slate-200`) showing the fixed tour price prominently (`text-xl font-bold text-slate-900`) and the validity label: `"24-hour unlimited access for the entire historical site"`.
* **Payment Gateway Options:** 2 flat selectable cards (`border border-slate-300 p-3 rounded-md flex items-center justify-between`):
  1. `VietQR (Domestic Bank Transfer)` — Displays a clear square QR code in the center when selected.
  2. `International Card (Stripe / PayOS)` — Displays a minimalist PCI-compliant card input form.
* **Session Restore Box (`Restore Session Box`):** Fixed in the bottom half of the modal (separated by `border-t border-slate-200 pt-3`), containing an uppercase input field for `Session Code` (`uppercase tracking-wider font-mono text-center`, e.g., `CCT-8942`) and an inline `"Restore"` button.

### 2.5. Floating Mini Audio Player UI
* **Fixed Position:** Pinned to the bottom of the screen (`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-300 px-4 py-2.5`).
* **2-Row Compact Layout:**
  * Row 1: Active POI Title (`text-sm font-semibold truncate`) + Playback speed toggle (`0.8x | 1.0x | 1.2x` as small pill buttons `border border-slate-300 rounded px-1.5 py-0.5 text-xs`) + Network fallback indicator if using `Offline TTS` (`bg-amber-50 text-amber-700 text-xs px-1.5 rounded`).
  * Row 2: Progress seek bar (monochrome `#1E293B`, `4px` height) + 3 standard `44px × 44px` control buttons: Skip Backward `-10s`, `Play/Pause`, Skip Forward `+10s`.

---

## 3. MULTI-ADMIN PORTAL UI COMPONENT STANDARDS (DESKTOP-FIRST)

The unified Multi-Admin interface (no fragmented Staff/Curator views) adheres to a **Desktop-First** standard (`min-w-[1024px]`), prioritizing flat data tables, high information density, and structural consistency.

### 3.1. Unified Admin Layout Shell
* **Left Navigation Sidebar (`w-60`) or Top Tab Bar:** Background `#F8FAFC`, border `#E2E8F0`, featuring 3 primary navigation sections for all Admins:
  1. `POI & Geofence Management`
  2. `Multilingual Translations & TTS Audio`
  3. `Telemetry, Traffic & System Health`
* **Sticky Storage Alert Banner:**
  * Only rendered at the top of the viewport (`w-full px-6 py-2.5 flex items-center justify-between border-b`) when `/static/audio` disk storage reaches ≥ 85%.
  * `85%–94%`: Light amber background `bg-amber-50 border-amber-300 text-amber-800`.
  * `≥ 95%`: Light red background `bg-red-50 border-red-300 text-red-800`.
  * Right action button: `"Clean Orphaned Audio"` (`bg-white border border-current px-3 py-1 rounded text-xs font-semibold`).

### 3.2. POI & Geofence Management Form UI
* **POI Data Table:** Flat table (`w-full border-collapse text-sm`), header background `#F1F5F9 text-slate-700 font-semibold`, rows separated by `border-b border-slate-200`. Explicitly displays the **individual Geofence Radius** column (e.g., `15m`, `30m`, `45m`) and AI generation status badges:
  * `PENDING`: `bg-amber-50 text-amber-700 border border-amber-200` (with a monochrome spinner icon during async background processing).
  * `READY`: `bg-green-50 text-green-700 border border-green-200`.
  * `FAILED`: `bg-red-50 text-red-700 border border-red-200`.
* **POI Create / Edit Form (2 Parallel Columns `grid grid-cols-12 gap-6`):**
  * **Left Column (6 cols):** Primary text inputs (`Title`, `Free Summary` (`short_description`), `Detailed Narration` (`description`)) and cover image upload dropzone.
  * **Right Column (6 cols - Interactive Map & Custom Radius Picker):**
    * Leaflet map container `320px` height, border `border-slate-300 rounded-md`. The POI's dynamic radius circle (`L.circle`) is styled with an outline `#1D4ED8` (`2px solid`), transparent fill `fillOpacity: 0.15`, scaling in real time with the POI's configured radius.
    * Dual numerical inputs for `Latitude` and `Longitude` (`font-mono text-sm`) placed directly below the map.
    * Dynamic Radius Slider (`Range Slider 10m–50m`) with an inline meter label (defaults to `30m`).
    * **Out-of-Bounds Error State:** If the pin is moved outside the Cu Chi Tunnels bounding box, the map border and Lat/Lng inputs turn red `#B91C1C`, displaying an inline error message and disabling the `"Save Changes"` button (`opacity-50 cursor-not-allowed bg-slate-300`).
* **POI Deletion Button:** Styled in warning red (`text-red-700 bg-red-50 border border-red-200 hover:bg-red-100`), separated from Save/Cancel buttons.

### 3.3. Side-by-Side Translation & Audio Audit UI
* **3-Tier Filter Bar:** Positioned at the top with 3 horizontal flat dropdowns: `Language (dynamically rendered from system LanguageCode table)`, `Exhibit (POI)`, and `Status (DRAFT / NEEDS_UPDATE / PUBLISHED)`.
* **Side-by-Side Comparison Grid:**
  * **Left Column (Original Source Text):** Light gray background `#F8FAFC`, read-only (`read-only`), maintaining historical integrity.
  * **Right Column (Target Translation):** White background `#FFFFFF` `textarea`, border `border-slate-300 focus:border-slate-800`, allowing immediate text adjustments.
* **Audio Playback & Publishing Controls:**
  * Integrated single-row `.mp3` preview player with sync status badge:
    * When text and audio match: Green badge `"Audio In Sync"` (`bg-green-50 text-green-700`), `"Approve & Publish"` button enabled (`bg-slate-800 text-white`).
    * When text is edited (`NEEDS_UPDATE`): Badge changes immediately to amber `"Audio Needs Update"` (`bg-amber-50 text-amber-700 border-amber-300`), `"Regenerate Audio Guide"` button highlights, and `"Approve & Publish"` is strictly disabled (`disabled opacity-40 cursor-not-allowed`).

### 3.4. Telemetry, Visitor Density & System Health UI
* **KPI Metric Cards:** 4-column flat grid (`bg-white border border-slate-200 p-4 rounded-md`), displaying large figures (`text-2xl font-bold text-slate-900`) and subtle labels (`text-xs text-slate-600`), without decorative icons.
* **Analytics Charts:**
  * Heatmap (`Leaflet.heat`): Minimalist light gray map background highlighting 3 density levels (Green -> Yellow -> Red).
  * `Top 10 POI`, `Dwell Time`, and `Language Distribution`: Flat bar charts or ranked lists with monochrome progress bars (`#1E293B` and `#64748B`), dynamically listing selected visitor languages. Strictly no 3D or pie charts.
* **Storage Meter & API Health Indicators:**
  * Horizontal storage progress bar (`h-3 rounded-full bg-slate-200`) dynamically changing colors across the 3 thresholds: `< 85%` (`#15803D`), `85%–94%` (`#B45309`), `≥ 95%` (`#B91C1C`).
  * API service statuses (`Translate API`, `Edge-TTS`, `Payment Gateway`) displayed via `10px × 10px` indicator dots with clear textual labels (`Online` - Green, `Degraded` - Amber, `Offline` - Red).

---

## 4. UI TOUCHPOINT MATRIX: VISITOR APP VS. ADMIN PORTAL

| Interface Component | Admin Portal UI (Desktop-First) | Visitor Web App UI (Mobile-First) |
| :--- | :--- | :--- |
| **Interactive Map & POI Radius** | Desktop map with draggable pin, POI dynamic radius slider (`10m–50m`), Lat/Lng numeric inputs, and red bounding-box error border. | Fullscreen mobile map, visitor GPS dot, numbered POI markers (with dynamic radius circles), polyline directions, and non-blocking GPS banner. |
| **Content & Multilingual UI** | Side-by-Side 2-column audit: Source text column alongside target language editable textarea. | Dynamic language selector showing only `PUBLISHED` languages; Bottom sheet with free summary and blurred locked narration. |
| **Audio Player** | Audit player directly linked to sync badges (`NEEDS_UPDATE` / `READY`) and `"Regenerate Audio Guide"` button. | Pinned `Floating Mini Player` at bottom (seek `±10s`, speed `0.8x–1.2x`, `Offline TTS` indicator on weak network). |
| **Payment & Operations** | Trigger metrics, `Export CSV/JSON`, storage progress meter, and `Sticky Storage Alert Banner` at ≥ 85%. | `Checkout Modal` with fixed pricing, `VietQR` / `Card` selection, `Session Code` restore input, and 24h countdown badge. |
