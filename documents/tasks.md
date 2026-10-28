# ENGINEERING TASK BREAKDOWN BY USER STORY (AGILE SPRINT WBS)
### Project: Smart Multilingual Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site
*Agile task breakdown organized 1-to-1 by User Story, featuring interactive progress checklists, 3-tier architectural layering, Definition of Done (DoD), and paired 1-to-1 unit testing targets ($\ge 80\%$ coverage).*

---

## 📊 1. SPRINT PROGRESS MATRIX & USER STORY INDEX

| Story ID | User Story Title | Use Case | Priority | Story Points | Total Tasks | Progress Status |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| [**US 01.1**](#-us-011-interactive-outdoor-map-header--real-time-gps-tracking) | Interactive Outdoor Map, Header & Real-Time GPS Tracking | UC-01 | Must Have | 5 SP | 7 Tasks | [x] 7/7 |
| [**US 01.2**](#-us-012-tap-map-marker-for-teaser-preview-bottom-sheet) | Tap Map Marker for Teaser Preview Bottom Sheet | UC-01 | Must Have | 3 SP | 3 Tasks | [x] 3/3 |
| [**US 01.3**](#-us-013-automated-voice-narration-on-gps-proximity--mini-audio-player) | Automated Voice Narration on GPS Proximity & Mini Audio Player | UC-01 | Must Have | 8 SP | 6 Tasks | [x] 6/6 |
| [**US 01.4**](#-us-014-intelligent-recommended-walking-route-wayfinding) | Intelligent Recommended Walking Route Wayfinding | UC-01 | Should Have | 5 SP | 3 Tasks | [ ] 0/3 |
| [**US 02.1**](#-us-021-administrator-authentication--portal-login) | Administrator Authentication & Portal Login | UC-02 | Must Have | 5 SP | 5 Tasks | [x] 5/5 |
| [**US 02.2**](#-us-022-brute-force-protection--account-lockout) | Brute-Force Protection & Account Lockout | UC-02 | Must Have | 3 SP | 4 Tasks | [x] 4/4 |
| [**US 02.3**](#-us-023-secure-session-management--inactivity-logout) | Secure Session Management & Inactivity Logout | UC-02 | Should Have | 2 SP | 3 Tasks | [x] 3/3 |
| [**US 03.1**](#-us-031-create-digitized-exhibit-profile--cover-image-upload) | Create Digitized Exhibit Profile & Cover Image Upload | UC-03 | Must Have | 5 SP | 5 Tasks | [x] 5/5 |
| [**US 03.2**](#-us-032-interactive-gps-geolocation--geofence-calibration) | Interactive GPS Geolocation & Geofence Calibration | UC-03 | Must Have | 5 SP | 4 Tasks | [x] 4/4 |
| [**US 03.3**](#-us-033-deactivate--hide-exhibit--invalidate-navigation-route) | Deactivate / Hide Exhibit & Invalidate Navigation Route | UC-03 | Should Have | 3 SP | 3 Tasks | [ ] 0/3 |
| [**US 03.4**](#-us-034-update-exhibit-details--synchronize-translation-status) | Update Exhibit Details & Synchronize Translation Status | UC-03 | Must Have | 3 SP | 3 Tasks | [x] 3/3 |
| [**US 04.1**](#-us-041-multilingual-translation-audit--historical-terminology-refinement) | Multilingual Translation Audit & Historical Terminology Refinement | UC-04 | Must Have | 5 SP | 4 Tasks | [x] 4/4 |
| [**US 04.2**](#-us-042-audio-guide-preview--dynamic-voice-re-generation) | Audio Guide Preview & Dynamic Voice Re-generation | UC-04 | Must Have | 3 SP | 4 Tasks | [x] 4/4 |
| [**US 04.3**](#-us-043-administrative-approval--live-mobile-app-synchronization) | Administrative Approval & Live Mobile App Synchronization | UC-04 | Must Have | 3 SP | 3 Tasks | [x] 3/3 |
| [**US 04.4**](#-us-044-automated-ai-translation--audio-synthesis-pipeline) | Automated AI Translation & Audio Synthesis Pipeline | UC-04 | Must Have | 8 SP | 5 Tasks | [ ] 0/5 |
| [**US 05.1**](#-us-051-real-time-visitor-density-heatmap) | Real-Time Visitor Density Heatmap | UC-05 | Should Have | 5 SP | 3 Tasks | [ ] 0/3 |
| [**US 05.2**](#-us-052-exhibit-rankings-dwell-times--language-demographics) | Exhibit Rankings, Dwell Times & Language Demographics | UC-05 | Must Have | 5 SP | 3 Tasks | [x] 3/3 |
| [**US 05.3**](#-us-053-static-audio-storage-capacity-alert--orphan-pruning) | Static Audio Storage Capacity Alert & Orphan Pruning | UC-05 | Must Have | 5 SP | 5 Tasks | [x] 5/5 |
| [**US 05.4**](#-us-054-telemetry-filtering--structured-data-export) | Telemetry Filtering & Structured Data Export | UC-05 | Should Have | 3 SP | 3 Tasks | [ ] 0/3 |
| [**US 06.1**](#-us-061-frictionless-digital-admission-checkout-via-vietqr--cards) | Frictionless Digital Admission Checkout via VietQR & Cards | UC-06 | Must Have | 5 SP | 5 Tasks | [ ] 0/5 |
| [**US 06.2**](#-us-062-webhook-driven-24-hour-visiting-session-activation) | Webhook-Driven 24-Hour Visiting Session Activation | UC-06 | Must Have | 5 SP | 4 Tasks | [ ] 0/4 |
| [**US 06.3**](#-us-063-multi-device-session-recovery-via-session-code) | Multi-Device Session Recovery via Session Code | UC-06 | Should Have | 3 SP | 3 Tasks | [ ] 0/3 |
| [**US 06.4**](#-us-064-content-protection--narrativeaudio-decryption-access-control) | Content Protection & Narrative/Audio Decryption Access Control | UC-06 | Must Have | 5 SP | 4 Tasks | [ ] 0/4 |
| **TOTAL** | **23 User Stories (12 Complete)** | — | — | **100 SP** | **92 Tasks** | **[x] 52/92 Tasks** |

---

## 🗺️ EPIC 01: MOBILE MAP, AUTOMATED GEOFENCING & SMART NAVIGATION (UC-01)

### 📌 US 01.1: Interactive Outdoor Map, Header & Real-Time GPS Tracking
> **As a** Visitor,  
> **I want to** view an interactive digital map showing my live GPS location marker and select published languages from the header,  
> **So that** I can easily orient myself on the historic relic grounds and identify nearby exhibits.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [x] 7/7 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-01.1.1:** Fullscreen Leaflet map renders smoothly across mobile viewports (360px–430px), supporting pinch-to-zoom and pan interactions across Cu Chi complex boundaries.
- [x] **AC-01.1.2:** System queries location via standard HTML5 Geolocation API. If location permission is denied or GPS is disabled, gracefully default map viewport to Main Entrance (`11.1432, 106.4631`) and prompt an informative banner.
- [x] **AC-01.1.3:** Fixed 56px top header features a Dynamic Language Selector **filtering strictly `PUBLISHED` languages**, accompanied by an active 24-hour session countdown badge.
- [x] **AC-01.1.4:** Visitor location is represented by a 14x14px `#1D4ED8` blue dot with a white stroke and a subtle GPS accuracy radius buffer.
- [x] **AC-01.1.5:** Active POIs are loaded from the public API and displayed as map markers; language-specific markers require published translations and ready audio.

#### Task Checklist:
- [x] `TSK-01.1.1` `[Frontend]` **Fullscreen Leaflet Map Container (`VisitorMapView.jsx`)**
  - **Scope:** Initialize Leaflet with OpenStreetMap tiles, custom zoom (+/-) controls, and a dedicated 44x44px circular "Locate Me" button at the bottom-right viewport.
  - **DoD:** Map renders without tile seams or flickering; zoom/pan gestures are touch-optimized.
  - **Paired Unit Test:** `src/views/__tests__/VisitorMapView.test.jsx`
- [x] `TSK-01.1.2` `[Frontend]` **Real-Time GPS Tracking Hook (`useGeolocation.js`)**
  - **Scope:** Continuous geolocation listener using `navigator.geolocation.watchPosition` with options `{ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }`. Invoke `clearWatch` on unmount. Implement fallback to Main Entrance on errors.
  - **DoD:** State updates coordinates accurately; gracefully handles `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, and `TIMEOUT` error codes.
  - **Paired Unit Test:** `src/hooks/__tests__/useGeolocation.test.js`
- [x] `TSK-01.1.3` `[Frontend]` **Mobile Header & Dynamic Language Switcher (`VisitorHeader.jsx`)**
  - **Scope:** Fixed 56px navbar querying active languages (`GET /api/v1/languages`). Render native language labels. Show 24h countdown badge for active sessions.
  - **DoD:** Filter out unapproved/draft languages; language switch updates audio/text context without triggering a full page reload.
  - **Paired Unit Test:** `src/components/visitor/__tests__/VisitorHeader.test.jsx`
- [x] `TSK-01.1.4` `[Frontend]` **Visitor GPS Blue Dot & Accuracy Overlay**
  - **Scope:** Implement custom Leaflet `L.divIcon` representing the visitor's physical walking position with a subtle pulsating ring effect.
  - **DoD:** Smooth marker transitions on position updates; marker remains centered when "Locate Me" is tapped.
  - **Paired Unit Test:** `src/components/visitor/__tests__/VisitorLocationMarker.test.jsx`
- [x] `TSK-01.1.5` `[Test]` **Unit Test Suite for US 01.1**
  - **Scope:** Validate map rendering, geolocation watch/error/timeout fallbacks, published-language loading and persistence, active session countdown, and visitor/POI marker behavior.
  - **DoD:** 100% test pass in Vitest, $\ge 80\%$ line & branch code coverage, zero unhandled rejections.
  - **Execution:** `npm run test`
- [x] `TSK-01.1.6` `[Backend]` **Public Published-Language and Map-POI APIs**
  - **Scope:** Implement `GET /api/v1/languages` and `GET /api/v1/pois` through Controller → Service → Repository, filtering map data to active POIs and published translations with ready audio when a language is selected.
  - **DoD:** Responses match the visitor API contract and expose only map summaries, coordinates, image URLs, and trigger radii.
  - **Paired Unit Test:** `tests/unit/test_public_map_api.py`
- [x] `TSK-01.1.7` `[Frontend]` **Load and Render Public Map POIs**
  - **Scope:** Load POIs for the selected published language and render markers alongside the visitor's location, with visible retry feedback when the API is unavailable.
  - **DoD:** Language changes refresh the map markers and markers are removed cleanly when the map unmounts.
  - **Paired Unit Tests:** `src/api/__tests__/poiApi.test.js`, `src/components/visitor/__tests__/VisitorPoiMarkers.test.jsx`

---

### 📌 US 01.2: Tap Map Marker for Teaser Preview Bottom Sheet
> **As a** Visitor,  
> **I want to** tap any exhibit marker on the map to inspect teaser photos and brief summaries before walking over,  
> **So that** I can plan my route and decide whether to visit that exhibit.
>
> * **Priority:** Must Have | **Estimate:** 3 SP
> * **Progress:** [x] 3/3 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-01.2.1:** Exhibit pins display sequential numbers. Active playing pin turns blue `#1D4ED8`, while completed/listened pins turn green `#15803D`.
- [x] **AC-01.2.2:** Tapping a pin slides up a mobile Bottom Sheet ($<40\text{vh}$) displaying: 72x72px thumbnail, exhibit title, calculated walking distance, free preview summary, "Directions" button, and "Play Narration" button.
- [x] **AC-01.2.3:** Tapping empty map space or swiping down dismisses the Bottom Sheet.

#### Task Checklist:
- [x] `TSK-01.2.1` `[Frontend]` **POI Marker Rendering & Dynamic Geofence Circles**
  - **Scope:** Query active exhibits and render numbered pins. Overlay individual configured `trigger_radius` (10m–50m) as dashed circles (`L.circle`).
  - **DoD:** Pins trigger `onSelectPOI(id)`; pin styling dynamically reflects state (`default`, `playing`, `visited`).
  - **Paired Unit Test:** `src/components/visitor/__tests__/VisitorPoiMarkers.test.jsx`
- [x] `TSK-01.2.2` `[Frontend]` **POI Teaser Bottom Sheet Component (`PoiPreviewCard.jsx`)**
  - **Scope:** Mobile slide-up preview card containing thumbnail, title, Haversine distance, free introductory text, "Directions" CTA, and "Play Audio" CTA.
  - **DoD:** Opens with smooth transition; dismisses cleanly on backdrop click or downward swipe gesture.
  - **Paired Unit Test:** `src/components/visitor/__tests__/PoiPreviewCard.test.jsx`
- [x] `TSK-01.2.3` `[Test]` **Unit Test Suite for US 01.2 (`VisitorPoiMarkers.test.jsx`, `PoiPreviewCard.test.jsx`)**
  - **Scope:** Test marker click triggers, pin color updates (playing/visited), bottom sheet opening, thumbnail render, distance display, and dismissal.
  - **DoD:** 100% test pass in Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `npm run test -- src/components/visitor/__tests__/VisitorPoiMarkers.test.jsx src/components/visitor/__tests__/PoiPreviewCard.test.jsx`

---

### 📌 US 01.3: Automated Voice Narration on GPS Proximity & Mini Audio Player
> **As a** Visitor with an active session,  
> **I want** the audio guide to start playing automatically when I walk within an exhibit's geofence radius, with a pinned bottom player,  
> **So that** I can seamlessly immerse myself in the history without having to constantly stare at my phone.
>
> * **Priority:** Must Have | **Estimate:** 8 SP
> * **Progress:** [x] 6/6 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-01.3.1:** When distance between visitor and POI $\le$ POI's configured `trigger_radius` (10m–50m), automatically initiate audio guide playback for the selected language.
- [x] **AC-01.3.2:** 10-Minute Cooldown Trigger Lock: After an exhibit is triggered, apply a 600-second lockout per POI to prevent annoying repeated popups while lingering near boundary lines.
- [x] **AC-01.3.3:** Floating Mini Audio Player pinned to the viewport bottom: exhibit title, progress scrubber, Skip -10s, Play/Pause, Skip +10s, playback speed toggle (`0.8x | 1.0x | 1.2x`), and `Offline TTS` indicator.
- [x] **AC-01.3.4:** Singleton Audio Context: Exactly 1 audio stream active at any time. 3.5s Fallback Timeout: If MP3 stream buffering exceeds 3.5 seconds due to forest cell coverage drops, automatically abort and fallback to browser Web Speech API.
- [x] **AC-01.3.5:** Automatically ingest trigger events into the backend `POITrigger` table to power telemetry heatmaps and dwell analytics.

#### Task Checklist:
- [x] `TSK-01.3.1` `[Frontend]` **Geofence Proximity Detection Engine (`useGeofenceTrigger.js`)**
  - **Scope:** Continuously calculate Haversine distance against each active POI's individual `trigger_radius` (10m–50m). Fire trigger callback upon entering zone.
  - **DoD:** Accurate detection without false positives; handles coordinate precision and rounding cleanly.
  - **Paired Unit Test:** `src/hooks/__tests__/useGeofenceTrigger.test.js`
- [x] `TSK-01.3.2` `[Frontend]` **10-Minute Cooldown Lockout Mechanism**
  - **Scope:** Store POI trigger timestamps in `localStorage`. Prevent re-triggering within 600 seconds unless manually initiated by the visitor.
  - **DoD:** Suppresses repeated auto-play events; automatically resets timer after 600s expires.
  - **Paired Unit Test:** `src/services/__tests__/cooldownService.test.js`
- [x] `TSK-01.3.3` `[Frontend]` **Floating Mini Audio Player Component (`MiniAudioPlayer.jsx`)**
  - **Scope:** Pinned bottom bar (68px height, positioned above bottom navigation) with scrolling title, large Play/Pause toggle, Skip -10s/+10s, speed toggles, and status badges.
  - **DoD:** Fluid touch interactions; does not obscure map navigation controls or critical CTA buttons.
  - **Paired Unit Test:** `src/components/__tests__/MiniAudioPlayer.test.jsx`
- [x] `TSK-01.3.4` `[Frontend]` **Singleton Audio Context & 3.5s Web Speech Fallback (`AudioPlayerContext.jsx`)**
  - **Scope:** Global `HTMLAudioElement` singleton. Set a 3500ms timeout on network stream loading: abort on timeout and seamlessly initiate `window.speechSynthesis` with native text.
  - **DoD:** Zero overlapping audio streams; verified fallback execution under simulated offline/packet-drop conditions.
  - **Paired Unit Test:** `src/context/__tests__/AudioPlayerContext.test.jsx`
- [x] `TSK-01.3.5` `[Backend]` **Client Telemetry Ingestion Endpoint (`POST /api/v1/telemetry/trigger`)**
  - **Scope:** Receive trigger payload (`SessionID`, `PoiID`, `DwellTime`, `TriggerType`). Open short-lived JIT DB connection, persist into `POITrigger`, and close immediately.
  - **DoD:** Returns HTTP 201 Created; does not block or bottleneck concurrent visitor requests.
  - **Paired Unit Test:** `tests/unit/controllers/test_telemetry_controller.py`
- [x] `TSK-01.3.6` `[Test]` **Unit Test Suite for US 01.3 (`useGeofenceTrigger.test.js`, `MiniAudioPlayer.test.jsx`, `AudioPlayerContext.test.jsx`, `test_telemetry_controller.py`)**
  - **Scope:** Test Haversine proximity calculations, 600s cooldown debounce in localStorage, player controls & speed toggling, 3.5s buffering timeout fallback to Web Speech, and telemetry ingestion controller.
  - **DoD:** 100% test pass in Vitest and Pytest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `npm run test -- useGeofenceTrigger MiniAudioPlayer AudioPlayerContext` && `pytest tests/unit/controllers/test_telemetry_controller.py`

---

### 📌 US 01.4: Intelligent Recommended Walking Route Wayfinding
> **As a** Visitor,  
> **I want** an intelligent recommended walking route plotted sequentially between exhibits on the map,  
> **So that** I do not get lost within the dense tunnel complex and can optimize my visit duration.
>
> * **Priority:** Should Have | **Estimate:** 5 SP
> * **Progress:** [ ] 0/3 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-01.4.1:** When a visitor clicks "Directions" on any POI card, system computes and renders a 4px solid blue polyline `#1D4ED8` connecting current GPS to destination.
- [ ] **AC-01.4.2:** Banner displays remaining distance (e.g., "120m to destination") alongside a "Clear Route" button.

#### Task Checklist:
- [ ] `TSK-01.4.1` `[Backend]` **Waypoint Walking Route Calculator (`wayfinding_service.py`)**
  - **Scope:** Compute optimal path waypoints connecting visitor's current location with destination POI within Cu Chi relic boundaries.
  - **DoD:** Returns valid GeoJSON LineString payload with calculation latency $< 500\text{ms}$.
  - **Paired Unit Test:** `tests/unit/services/test_wayfinding_service.py`
- [ ] `TSK-01.4.2` `[Frontend]` **Walking Route Polyline Overlay (`RouteOverlay.jsx`)**
  - **Scope:** Draw Leaflet `L.polyline` (4px `#1D4ED8`). Display floating top banner with remaining distance counter and "Clear Route" button.
  - **DoD:** Clears polyline overlay cleanly upon cancel button tap or upon reaching the target geofence.
  - **Paired Unit Test:** `src/components/__tests__/RouteOverlay.test.jsx`
- [ ] `TSK-01.4.3` `[Test]` **Unit Test Suite for US 01.4 (`test_wayfinding_service.py`, `RouteOverlay.test.jsx`)**
  - **Scope:** Test path waypoint calculation algorithms in service, polyline rendering on map, distance banner updates, and clear route interactions.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_wayfinding_service.py` && `npm run test -- RouteOverlay`

---

## 🔐 EPIC 02: ADMINISTRATIVE AUTHENTICATION & ACCESS CONTROL (UC-02)

### 📌 US 02.1: Administrator Authentication & Portal Login
> **As an** Administrator,  
> **I need to** log into the Administrative Portal using my Username/Email and Password,  
> **So that** the system authenticates my identity, establishes a secure session, and grants access to administrative modules.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [x] 5/5 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-02.1.1:** Multiple Admin accounts supported via `User` table (no `role` column; all accounts in table are Admins).
- [x] **AC-02.1.2:** Passwords authenticated against one-way Bcrypt cryptographic hashes (cost factor $\ge 12$). Plaintext passwords must never be stored, cached, or logged.
- [x] **AC-02.1.3:** Valid login issues JWT token via HttpOnly, SameSite=Strict cookie (60-minute lifespan, 30-minute idle timeout), records event in `Audit`, and redirects to Dashboard.
- [x] **AC-02.1.4:** Invalid credentials yield generic error: "Invalid username or password", retaining entered username while wiping password field to prevent user enumeration.

#### Task Checklist:
- [x] `TSK-02.1.1` `[Database]` **Seed Initial Admin Accounts & `User` Table Schema**
  - **Scope:** Ensure `User` table contains unique index on `Email` and `Username`, hash default administrator credentials with Bcrypt.
  - **DoD:** Schema migration passes cleanly in CI MySQL container.
  - **Paired Unit Test:** `tests/unit/repositories/test_user_repository.py`
- [x] `TSK-02.1.2` `[Backend]` **`UserRepository` Authentication Operations**
  - **Scope:** Implement `find_by_username()` and `find_by_email()`. Enforce strict JIT DB connection (open $\rightarrow$ query $\rightarrow$ close immediately).
  - **DoD:** Returns User entity or None; releases database connection immediately without connection leaks.
  - **Paired Unit Test:** `tests/unit/repositories/test_user_repository.py`
- [x] `TSK-02.1.3` `[Backend]` **`AuthService` & Secure Password Verification**
  - **Scope:** Verify Bcrypt hashes, generate 60-minute JWT token, and record login action in `Audit` with client IP and timestamp.
  - **DoD:** Achieves 100% test coverage for valid login, invalid password, and nonexistent user.
  - **Paired Unit Test:** `tests/unit/services/test_auth_service.py`
- [x] `TSK-02.1.4` `[Frontend]` **Admin Login Page & Form Validation (`AdminLoginView.jsx`)**
  - **Scope:** Desktop login view, client form validation, authentication state context, and route guards protecting `/admin/*`. Also wires the Vite dev-server `server.proxy` (`/api`, `/static` → `http://127.0.0.1:8000`) so the relative API paths issued by `apiClient.js` reach FastAPI on the same origin, which is required for the `SameSite=Strict` session cookie and for the DoD redirection to be observable in a browser.
  - **DoD:** Clean redirection on successful login; displays clear inline alerts on authentication errors.
  - **Paired Unit Test:** `src/views/admin/__tests__/AdminLoginView.test.jsx`
- [x] `TSK-02.1.5` `[Test]` **Unit Test Suite for US 02.1 (`test_user_repository.py`, `test_auth_service.py`, `AdminLoginView.test.jsx`)**
  - **Scope:** Test user queries in repository, Bcrypt password verification and JWT token generation in service, JIT DB lifecycle, and admin login form with route guards.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/repositories/test_user_repository.py tests/unit/services/test_auth_service.py` && `npm run test -- AdminLoginView`

---

### 📌 US 02.2: Brute-Force Protection & Account Lockout
> **As an** Administrator,  
> **I need** the system to automatically lock accounts upon 5 consecutive failed login attempts,  
> **So that** automated brute-force attacks and credential stuffing are prevented.
>
> * **Priority:** Must Have | **Estimate:** 3 SP
> * **Progress:** [x] 4/4 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-02.2.1:** Track failed attempts in `FalsedAttempts`. At 5 consecutive failures, calculate `Lockeduntil = now() + 15 minutes` and log security warning in `Audit`.
- [x] **AC-02.2.2:** Return `HTTP 423 Locked` response with countdown payload: `{ "detail": "Account locked", "retry_after_seconds": 900 }`.
- [x] **AC-02.2.3:** Client UI catches HTTP 423 and renders an active countdown timer disabling the submit button until lockout expires.

#### Task Checklist:
- [x] `TSK-02.2.1` `[Backend]` **Failed Attempt Tracking & Lockout Counter**
  - **Scope:** Increment `FalsedAttempts` in `User` table on bad password. When $\ge 5$, assign `Lockeduntil`. Reset counter to 0 on successful authentication.
  - **DoD:** Rejects login when `Lockeduntil > now()`.
  - **Paired Unit Test:** `tests/unit/services/test_auth_service.py`
- [x] `TSK-02.2.2` `[Backend]` **`HTTP 423 Locked` Response Handler**
  - **Scope:** In `auth_controller.py`, intercept locked user state and return HTTP 423 with calculated `retry_after_seconds`.
  - **DoD:** RFC-compliant HTTP 423 response with accurate seconds countdown payload.
  - **Paired Unit Test:** `tests/unit/controllers/test_auth_controller.py`
- [x] `TSK-02.2.3` `[Frontend]` **Lockout Countdown Modal Component (`AccountLockoutModal.jsx`)**
  - **Scope:** Catch HTTP 423 response and render real-time countdown timer modal disabling login submit button.
  - **DoD:** Live 1-second interval countdown; cannot be bypassed via page refresh.
  - **Paired Unit Test:** `src/components/__tests__/AccountLockoutModal.test.jsx`
- [x] `TSK-02.2.4` `[Test]` **Unit Test Suite for US 02.2 (`test_auth_service.py`, `test_auth_controller.py`, `AccountLockoutModal.test.jsx`)**
  - **Scope:** Test failed attempt increments up to 5, calculation of 15m lockout, HTTP 423 response with countdown seconds, and countdown modal UI.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_auth_service.py tests/unit/controllers/test_auth_controller.py` && `npm run test -- AccountLockoutModal`

---

### 📌 US 02.3: Secure Session Management & Inactivity Logout
> **As an** Administrator,  
> **I need** my session to automatically expire during inactivity and have the ability to explicitly log out,  
> **So that** workstation security is maintained in shared administrative environments.
>
> * **Priority:** Should Have | **Estimate:** 2 SP
> * **Progress:** [x] 3/3 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-02.3.1:** Clicking "Log Out" clears session cookies, revokes the token server-side, and redirects immediately to the Login screen.
- [x] **AC-02.3.2:** Automatically expire session and wipe local authentication state after 30 minutes of continuous user inactivity.

#### Task Checklist:
- [x] `TSK-02.3.1` `[Backend]` **Logout & Token Invalidation (`POST /api/v1/auth/logout`)**
  - **Scope:** Clear HttpOnly session cookies, record logout in `Audit`, and invalidate active session tokens.
  - **DoD:** Token is immediately rejected in all subsequent requests.
  - **Paired Unit Test:** `tests/unit/controllers/test_auth_controller.py`
- [x] `TSK-02.3.2` `[Frontend]` **Inactivity Idle Timer Hook (`useIdleTimer.js`) & Logout Action**
  - **Scope:** Track mouse/keyboard inactivity for 30 minutes. Trigger auto-logout toast, clear local state, and redirect to login screen.
  - **DoD:** Idle timer functions reliably even when the browser tab is running in the background.
  - **Paired Unit Test:** `src/hooks/__tests__/useIdleTimer.test.js`
- [x] `TSK-02.3.3` `[Test]` **Unit Test Suite for US 02.3 (`test_auth_controller.py`, `useIdleTimer.test.js`)**
  - **Scope:** Test logout cookie purging, server token invalidation, and 30-min idle timer event tracking with automatic logout toast and redirection.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/controllers/test_auth_controller.py` && `npm run test -- useIdleTimer`

---

## 🏛️ EPIC 03: EXHIBIT & POI SPATIAL CATALOG MANAGEMENT (UC-03)

### 📌 US 03.1: Create Digitized Exhibit Profile & Cover Image Upload
> **As an** Administrator,  
> **I need to** create a new exhibit profile with Vietnamese title, teaser summary, full narrative, and upload cover photos,  
> **So that** historical relics can be digitized and prepared for visitor exploration.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [x] 5/5 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-03.1.1:** Coordinate columns adhere to WGS84 decimal precision (`DECIMAL(10,7)`), default `Radius = 30`, `Is_Active = TRUE`, and spatial indexing applied.
- [x] **AC-03.1.2:** Image upload validates MIME types (JPG/PNG/WebP $<5\text{MB}$), persists files to `/static/images`.
- [x] **AC-03.1.3:** Successfully creating a Vietnamese POI profile automatically triggers background AI translation and audio generation workers for foreign languages (`en`, `ja`, `ko`, `zh`).
- [x] **AC-03.1.4:** Admin catalog table displays thumbnail, title, trigger radius, and AI status badges.

#### Task Checklist:
- [x] `TSK-03.1.1` `[Database]` **`POI` Table DDL & Coordinate Precision**
  - **Scope:** Verify WGS84 decimal precision (`DECIMAL(10,7)`), default `Radius = 30`, `Is_Active = TRUE`, and spatial indexing on coordinates.
  - **DoD:** Passes `mysql_schema.sql` syntax check in CI container.
  - **Paired Unit Test:** `tests/unit/repositories/test_poi_repository.py`
- [x] `TSK-03.1.2` `[Backend]` **`POIRepository` Insert & Data Persistence**
  - **Scope:** Implement `create_poi()`, persisting title, descriptions, coordinates, radius, and image path under JIT session lifecycle.
  - **DoD:** Returns created POI entity with auto-increment ID.
  - **Paired Unit Test:** `tests/unit/repositories/test_poi_repository.py`
- [x] `TSK-03.1.3` `[Backend]` **Endpoint & Image Upload (`POST /api/v1/admin/pois`)**
  - **Scope:** Accept `multipart/form-data`, validate image MIME type ($<5\text{MB}$), save to disk, and dispatch background AI worker event.
  - **DoD:** Returns HTTP 201 Created without blocking main request thread.
  - **Paired Unit Test:** `tests/unit/controllers/test_poi_controller.py`
- [x] `TSK-03.1.4` `[Frontend]` **POI Catalog Table View (`PoiCatalogPage.jsx`)**
  - **Scope:** Desktop table rendering exhibit thumbnail, Vietnamese title, individual trigger radius (e.g., `15m`, `30m`), and generation badges (`PENDING`, `READY`, `FAILED`).
  - **DoD:** Smooth paginated rendering; includes real-time search filter by title.
  - **Paired Unit Test:** `src/views/admin/__tests__/PoiCatalogPage.test.jsx`
- [x] `TSK-03.1.5` `[Test]` **Unit Test Suite for US 03.1 (`test_poi_repository.py`, `test_poi_controller.py`, `PoiCatalogPage.test.jsx`)**
  - **Scope:** Test POI repository create queries, multipart image validation ($<5\text{MB}$), background event dispatching, and POI catalog table rendering with search filter.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/repositories/test_poi_repository.py tests/unit/controllers/test_poi_controller.py` && `npm run test -- PoiCatalogPage`

---

### 📌 US 03.2: Interactive GPS Geolocation & Geofence Calibration
> **As an** Administrator,  
> **I need to** visually pin or drag an exhibit's GPS coordinates on an interactive map and calibrate its proximity trigger radius (10m–50m),  
> **So that** automated narration triggers accurately in physical field conditions.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [x] 4/4 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-03.2.1:** Leaflet map allows draggable pin placement, dynamically populating numeric Latitude and Longitude input fields.
- [x] **AC-03.2.2:** Radius slider adjusts between 10m and 50m with 1m step increments; Geofence circle on map scales dynamically in real time.
- [x] **AC-03.2.3:** Coordinates must reside strictly within Cu Chi relic boundaries (`Lat: [11.136361, 11.149306]`, `Lng: [106.455139, 106.467639]`). Out-of-bounds pins highlight red `#B91C1C` and disable save action.

#### Task Checklist:
- [x] `TSK-03.2.1` `[Backend]` **Cu Chi Perimeter Bounding Box Validator**
  - **Scope:** Implement coordinate boundary validator in `poi_service.py`: Lat `[11.136361, 11.149306]`, Lng `[106.455139, 106.467639]`. Reject out-of-bounds coordinates with HTTP 400.
  - **DoD:** Rejects invalid coordinates server-side.
  - **Paired Unit Test:** `tests/unit/services/test_poi_service.py`
- [x] `TSK-03.2.2` `[Frontend]` **Interactive Leaflet Map Coordinate Picker (`AdminMapPicker.jsx`)**
  - **Scope:** Draggable pin (`draggable: true`), dynamic `L.circle` radius preview scaling in real time with slider, and dual numeric Lat/Lng input bindings.
  - **DoD:** Two-way data synchronization between map pin and numeric input fields.
  - **Paired Unit Test:** `src/components/admin/__tests__/AdminMapPicker.test.jsx`
- [x] `TSK-03.2.3` `[Frontend]` **Out-of-Bounds Error State & Save Lock**
  - **Scope:** Display red border `#B91C1C` on map container and disable submit button when coordinates fall outside Cu Chi complex boundaries.
  - **DoD:** Form submission strictly blocked on out-of-bounds coordinates.
  - **Paired Unit Test:** `src/components/admin/__tests__/AdminMapPicker.test.jsx`
- [x] `TSK-03.2.4` `[Test]` **Unit Test Suite for US 03.2 (`test_poi_service.py`, `AdminMapPicker.test.jsx`)**
  - **Scope:** Test bounding box coordinate validator (`[11.136361, 11.149306]`, `[106.455139, 106.467639]`), draggable pin events, radius circle sync, and red border error state.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_poi_service.py` && `npm run test -- AdminMapPicker`

---

### 📌 US 03.3: Deactivate / Hide Exhibit & Invalidate Navigation Route
> **As an** Administrator,  
> **I need to** deactivate or hide decommissioned exhibits without losing historical records,  
> **So that** the system immediately removes them from visitor maps and recalculates walking tour paths.
>
> * **Priority:** Should Have | **Estimate:** 3 SP
> * **Progress:** [ ] 0/3 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-03.3.1:** Set `Is_Active = FALSE`. Exclude inactive POIs from visitor queries immediately.
- [ ] **AC-03.3.2:** Retain all historical translations, audio files, and `POITrigger` telemetry intact in the database.
- [ ] **AC-03.3.3:** Present a confirmation modal before applying deactivation.

#### Task Checklist:
- [ ] `TSK-03.3.1` `[Backend]` **Safe Deactivation Endpoint (`PATCH /api/v1/admin/pois/{id}/visibility`)**
  - **Scope:** Accept boolean `is_active`, toggle `Is_Active` in `POI` table, and write event to `Audit` table.
  - **DoD:** Inactive POIs immediately hidden from visitor queries while preserving telemetry.
  - **Paired Unit Test:** `tests/unit/services/test_poi_service.py`
- [ ] `TSK-03.3.2` `[Frontend]` **Deactivate Confirmation Dialog (`DeactivateConfirmModal.jsx`)**
  - **Scope:** Modal informing admin that the exhibit will be hidden from visitor maps and active walking routes will be recalculated.
  - **DoD:** API only triggered upon explicit user confirmation in modal.
  - **Paired Unit Test:** `src/components/__tests__/DeactivateConfirmModal.test.jsx`
- [ ] `TSK-03.3.3` `[Test]` **Unit Test Suite for US 03.3 (`test_poi_service.py`, `DeactivateConfirmModal.test.jsx`)**
  - **Scope:** Test `Is_Active = FALSE` toggle, exclusion from public visitor queries, audit logging, and confirmation modal before deactivation.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_poi_service.py` && `npm run test -- DeactivateConfirmModal`

---

### 📌 US 03.4: Update Exhibit Details & Synchronize Translation Status
> **As an** Administrator,  
> **I need to** edit an existing exhibit's details,  
> **So that** the system automatically flags affected foreign translations as "Needs Update" to ensure audio-text synchronization.
>
> * **Priority:** Must Have | **Estimate:** 3 SP
> * **Progress:** [x] 3/3 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-03.4.1:** Exhibit metadata, coordinates, and radius update successfully.
- [x] **AC-03.4.2:** Modifying the Vietnamese narrative automatically marks all related foreign language translations as `POITranslation.Status = 'NEEDS_UPDATE'`.

#### Task Checklist:
- [x] `TSK-03.4.1` `[Backend]` **Update POI & Invalidate Translations (`PUT /api/v1/admin/pois/{id}`)**
  - **Scope:** Update POI record. If narrative text changes, automatically update `POITranslation.Status = 'NEEDS_UPDATE'` for all linked foreign languages.
  - **DoD:** Foreign language translations marked `NEEDS_UPDATE`; prevents desynchronized audio playback.
  - **Paired Unit Test:** `tests/unit/controllers/test_poi_controller.py`
- [x] `TSK-03.4.2` `[Frontend]` **POI Edit Form Modal (`POIFormModal.jsx`)**
  - **Scope:** Pre-fill existing exhibit data, pin coordinates, radius slider, and cover image preview for immediate update.
  - **DoD:** Strict form validation and clear success notification toast.
  - **Paired Unit Test:** `src/components/__tests__/POIFormModal.test.jsx`
- [x] `TSK-03.4.3` `[Test]` **Unit Test Suite for US 03.4 (`test_poi_controller.py`, `POIFormModal.test.jsx`)**
  - **Scope:** Test POI metadata updates, automatic setting of `POITranslation.Status = 'NEEDS_UPDATE'` on description change, and edit modal pre-filling and validation.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/controllers/test_poi_controller.py` && `npm run test -- POIFormModal`

---

## 🌐 EPIC 04: AUTOMATED AI PIPELINE & MULTILINGUAL CURATION (UC-04)

### 📌 US 04.1: Multilingual Translation Audit & Historical Terminology Refinement
> **As an** Administrator,  
> **I need to** inspect machine translations side-by-side with source text and edit historical terms,  
> **So that** cultural, historical, and linguistic accuracy is preserved.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [x] 4/4 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-04.1.1:** 2-column comparison layout: Read-only source Vietnamese on left (background `#F8FAFC`), editable target textarea on right (background `#FFFFFF`).
- [x] **AC-04.1.2:** 3-tier filter bar: Filter by POI, Target Language, and Review Status (`DRAFT`, `NEEDS_UPDATE`, `PUBLISHED`).
- [x] **AC-04.1.3:** Any edits to the translation text immediately update status badge to amber `"Audio Needs Update"` and lock the publish button.

#### Task Checklist:
- [x] `TSK-04.1.1` `[Backend]` **Translation Retrieval & Update Endpoints**
  - **Scope:** Build `GET /api/v1/admin/translations` with query filters (`poi_id`, `language_id`, `status`) and `PUT /api/v1/admin/translations/{id}` that sets `Status = 'NEEDS_UPDATE'` on text update.
  - **DoD:** Returns filtered results accurately; updates text and status atomically.
  - **Paired Unit Test:** `tests/unit/controllers/test_translation_controller.py`
- [x] `TSK-04.1.2` `[Frontend]` **Side-by-Side Translation Audit View (`TranslationAuditView.jsx`)**
  - **Scope:** 2-column comparison interface with auto-resizing textareas and multi-parameter filter header.
  - **DoD:** Allows rapid auditing without data loss on tab navigation.
  - **Paired Unit Test:** `src/views/__tests__/TranslationAuditView.test.jsx`
- [x] `TSK-04.1.3` `[Frontend]` **Audio Sync Badge & Lock Indicator Component**
  - **Scope:** Render green `"Audio In Sync"` badge when text matches audio, or amber `"Audio Needs Update"` badge immediately when text is edited.
  - **DoD:** Real-time visual feedback on keystrokes.
  - **Paired Unit Test:** `src/components/__tests__/AudioSyncBadge.test.jsx`
- [x] `TSK-04.1.4` `[Test]` **Unit Test Suite for US 04.1 (`test_translation_controller.py`, `TranslationAuditView.test.jsx`, `AudioSyncBadge.test.jsx`)**
  - **Scope:** Test translation filtering endpoints, text editing payload handling, side-by-side view layout, and real-time audio sync badge indicator.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/controllers/test_translation_controller.py` && `npm run test -- TranslationAuditView AudioSyncBadge`

---

### 📌 US 04.2: Audio Guide Preview & Dynamic Voice Re-generation
> **As an** Administrator,  
> **I need to** preview synthesized audio narrations and trigger re-synthesis via Neural TTS on demand after editing text,  
> **So that** I can verify audio clarity and tone before publishing.
>
> * **Priority:** Must Have | **Estimate:** 3 SP
> * **Progress:** [x] 4/4 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-04.2.1:** Compact HTML5 `.mp3` player embedded directly in each translation row for instant preview.
- [x] **AC-04.2.2:** "Regenerate Audio Guide" button highlighted when `Status == 'NEEDS_UPDATE'`, showing loading spinner during TTS generation.
- [x] **AC-04.2.3:** On completion, translation status resets to `DRAFT` and unlocks the publish action button.

#### Task Checklist:
- [x] `TSK-04.2.1` `[Backend]` **Regenerate Audio Endpoint (`POST /api/v1/admin/translations/{id}/regenerate-audio`)**
  - **Scope:** Re-synthesize audio via Edge-TTS for specific language, update `POIAudio`, reset translation status to `DRAFT`.
  - **DoD:** Returns new MP3 URL without blocking server threads.
  - **Paired Unit Test:** `tests/unit/controllers/test_audio_controller.py`
- [x] `TSK-04.2.2` `[Frontend]` **Single-Row Audio Audit Preview Player (`AudioAuditPlayer.jsx`)**
  - **Scope:** Embedded player with Play/Pause, duration counter, and progress bar beneath translation textarea.
  - **DoD:** Plays audio clearly; auto-pauses when switching to a different row.
  - **Paired Unit Test:** `src/components/__tests__/AudioAuditPlayer.test.jsx`
- [x] `TSK-04.2.3` `[Frontend]` **"Regenerate Audio Guide" Button & Loading State**
  - **Scope:** Button highlights in accent color when `NEEDS_UPDATE`; displays spinner and toast notification on completion.
  - **DoD:** Reloads audio player with new stream upon completion.
  - **Paired Unit Test:** `src/components/__tests__/RegenerateAudioButton.test.jsx`
- [x] `TSK-04.2.4` `[Test]` **Unit Test Suite for US 04.2 (`test_audio_controller.py`, `AudioAuditPlayer.test.jsx`, `RegenerateAudioButton.test.jsx`)**
  - **Scope:** Test audio regeneration trigger, TTS adapter/service behavior, persistence and status reset to DRAFT, mini audio preview player, auto-pause, API wiring, and loading/error states.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/controllers/test_audio_controller.py tests/unit/services/test_tts_service.py tests/unit/repositories/test_audio_repository.py tests/unit/integrations/test_edge_tts_client.py` && `npm run test -- AudioAuditPlayer RegenerateAudioButton TranslationAuditView AudioSyncBadge translationApi`

---

### 📌 US 04.3: Administrative Approval & Live Mobile App Synchronization
> **As an** Administrator,  
> **I need to** grant final publication approval (`PUBLISHED`) to verified translations and audio files,  
> **So that** the latest approved audio guide is made live for visitors on the mobile map.
>
> * **Priority:** Must Have | **Estimate:** 3 SP
> * **Progress:** [x] 3/3 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-04.3.1:** Strictly forbid publication if text and audio are desynchronized (`Status == 'NEEDS_UPDATE'`).
- [ ] **AC-04.3.2:** Sets `POITranslation.Status = 'PUBLISHED'` and `POIAudio.Status = 'READY'`. Mobile visitor app immediately recognizes the published language.

#### Task Checklist:
- [x] `TSK-04.3.1` `[Backend]` **Publish Translation Endpoint (`POST /api/v1/admin/translations/{id}/publish`)**
  - **Scope:** Check text/audio synchronization. Reject with HTTP 400 if `NEEDS_UPDATE`. Otherwise, set `Status = 'PUBLISHED'` and log in `Audit`.
  - **DoD:** Only verified, synchronized content can be published.
  - **Paired Unit Test:** `tests/unit/controllers/test_translation_controller.py`
- [x] `TSK-04.3.2` `[Frontend]` **Publish Action Handler & Strict UI State Lock**
  - **Scope:** Disable "Approve & Publish" button (`disabled opacity-40`) whenever `status == 'NEEDS_UPDATE'`. Enable only when audio is in sync.
  - **DoD:** Prevents accidental publishing of desynchronized content.
  - **Paired Unit Test:** `src/views/__tests__/TranslationAuditView.test.jsx`
- [x] `TSK-04.3.3` `[Test]` **Unit Test Suite for US 04.3 (`test_translation_controller.py`, `TranslationAuditView.test.jsx`)**
  - **Scope:** Test rejection of publishing when `NEEDS_UPDATE`, successful publish transition to `PUBLISHED`, and UI button disabled state locking.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/controllers/test_translation_controller.py` && `npm run test -- TranslationAuditView`

---

### 📌 US 04.4: Automated AI Translation & Audio Synthesis Pipeline
> **As the** System Worker,  
> **I need to** automatically translate Vietnamese narratives into target languages (`en`, `ja`, `ko`, `zh`) and synthesize neural audio guides in the background,  
> **So that** administrators do not have to wait and draft audio guides are ready for verification.
>
> * **Priority:** Must Have | **Estimate:** 8 SP
> * **Progress:** [ ] 0/5 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-04.4.1:** Translate Vietnamese source text into 4 target languages using `deep-translator` with up to 3 exponential backoff retries.
- [ ] **AC-04.4.2:** Synthesize localized text into MP3 format ($64\text{kbps}-96\text{kbps}$) using `edge-tts` with high-quality native neural voices.
- [ ] **AC-04.4.3:** SHA-256 Audio Caching Engine: Compute `audio_hash = SHA256(title + text + lang + voice)`. Reuse existing MP3 file if hash matches.
- [ ] **AC-04.4.4:** Enforce JIT database lifecycle: never hold DB connection open across external translation or TTS API calls.

#### Task Checklist:
- [ ] `TSK-04.4.1` `[Backend]` **Asynchronous Multilingual Translation Worker (`translation_worker.py`)**
  - **Scope:** Process background translation queue, chunk text exceeding API limits, translate into `en`, `ja`, `ko`, `zh`, retry on network errors, and persist translations with `DRAFT` status.
  - **DoD:** Non-blocking background worker; handles network drops gracefully.
  - **Paired Unit Test:** `tests/unit/services/test_translation_service.py`
- [ ] `TSK-04.4.2` `[Backend]` **Neural Voice TTS Synthesis Worker (`audio_synthesis_worker.py`)**
  - **Scope:** Convert translated text to MP3 files ($64\text{kbps}-96\text{kbps}$) using `edge-tts`, save to `/static/audio`, update `POIAudio`.
  - **DoD:** Adheres to JIT DB connection: open DB $\rightarrow$ read $\rightarrow$ close DB $\rightarrow$ invoke TTS $\rightarrow$ open DB $\rightarrow$ write URL.
  - **Paired Unit Test:** `tests/unit/services/test_audio_service.py`
- [ ] `TSK-04.4.3` `[Backend]` **SHA-256 Audio Content Hash Engine**
  - **Scope:** Implement `compute_audio_hash(title, text, lang_code, voice_id)`. Before running TTS, check `POIAudio` for matching hash; reuse existing audio on match.
  - **DoD:** Prevents duplicate MP3 generation for identical text content.
  - **Paired Unit Test:** `tests/unit/services/test_audio_service.py`
- [ ] `TSK-04.4.4` `[Database]` **Align Status Enums in `POITranslation` & `POIAudio`**
  - **Scope:** Verify status enums: `POITranslation.Status` (`PENDING`, `DRAFT`, `NEEDS_UPDATE`, `PUBLISHED`, `FAILED`) and `POIAudio.Status` (`PENDING`, `READY`, `FAILED`).
  - **DoD:** Schema aligned with containerized MySQL environment in CI.
  - **Paired Unit Test:** `tests/unit/repositories/test_translation_repository.py`
- [ ] `TSK-04.4.5` `[Test]` **Unit Test Suite for US 04.4 (`test_translation_service.py`, `test_audio_service.py`, `test_translation_repository.py`)**
  - **Scope:** Test translation retry/backoff, edge-tts synthesis mock with JIT DB lifecycle, SHA-256 hash deduplication, and repository status enum validations.
  - **DoD:** 100% test pass in Pytest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_translation_service.py tests/unit/services/test_audio_service.py tests/unit/repositories/test_translation_repository.py`

---

## 📈 EPIC 05: OPERATIONAL TELEMETRY & SYSTEM HEALTH MONITORING (UC-05)

### 📌 US 05.1: Real-Time Visitor Density Heatmap
> **As an** Administrator,  
> **I need to** view real-time visitor density heatmaps across museum grounds,  
> **So that** staff can manage crowd flow and avoid bottleneck congestion inside narrow tunnels.
>
> * **Priority:** Should Have | **Estimate:** 5 SP
> * **Progress:** [ ] 0/3 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-05.1.1:** Heatmap displays 3 gradient tiers (Green: Low Density $\rightarrow$ Yellow: Moderate $\rightarrow$ Red: Congestion Alert).
- [ ] **AC-05.1.2:** Aggregated from `POITrigger` GPS events across preset intervals: Today, Past 7 Days, or custom date ranges.

#### Task Checklist:
- [ ] `TSK-05.1.1` `[Backend]` **Heatmap Telemetry Aggregation Endpoint (`GET /api/v1/admin/analytics/heatmap`)**
  - **Scope:** Aggregate visitor GPS coordinates from `POITrigger` within preset time windows. Return array of `{ lat, lng, intensity }`.
  - **DoD:** Query execution $< 1\text{s}$ over 100,000 sample records.
  - **Paired Unit Test:** `tests/unit/services/test_telemetry_service.py`
- [ ] `TSK-05.1.2` `[Frontend]` **Real-Time Visitor Density Heatmap View (`HeatmapView.jsx`)**
  - **Scope:** Overlay `leaflet.heat` layer on admin map with controls for intensity radius and gradient opacity.
  - **DoD:** Smooth rendering of high-density clusters across Cu Chi map.
  - **Paired Unit Test:** `src/views/__tests__/HeatmapView.test.jsx`
- [ ] `TSK-05.1.3` `[Test]` **Unit Test Suite for US 05.1 (`test_telemetry_service.py`, `HeatmapView.test.jsx`)**
  - **Scope:** Test SQL aggregation of coordinates within preset intervals and Leaflet.heat overlay rendering with gradient adjustments.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_telemetry_service.py` && `npm run test -- HeatmapView`

---

### 📌 US 05.2: Exhibit Rankings, Dwell Times & Language Demographics
> **As an** Administrator,  
> **I need** statistical rankings of top-visited exhibits, average dwell times, and language breakdowns,  
> **So that** I can evaluate exhibition impact and make data-driven curation decisions.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [x] 3/3 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-05.2.1:** 4 KPI summary cards: Total Visitors, Total Audio Plays, Top Exhibit, Average Tour Duration.
- [x] **AC-05.2.2:** Horizontal Bar Chart of Top 10 POIs by trigger volume; percentage distribution list of visitor languages (Vietnamese, English, Japanese, Korean, Chinese).

#### Task Checklist:
- [x] `TSK-05.2.1` `[Backend]` **Analytics Summary Endpoint (`GET /api/v1/admin/analytics/summary`)**
  - **Scope:** Run indexed SQL aggregations: POI trigger counts, `AVG(DwellTime)` per POI, and `LanguageID` distribution from `VisitorSession`.
  - **DoD:** Sub-second query response time ($< 800\text{ms}$).
  - **Paired Unit Test:** `tests/unit/services/test_telemetry_service.py`
- [x] `TSK-05.2.2` `[Frontend]` **KPI Metric Cards & Analytics Charts (`AnalyticsDashboard.jsx`)**
  - **Scope:** Enterprise-grade dashboard: 4 flat KPI cards, Top 10 POI horizontal bar chart, and language demographic ranked lists.
  - **DoD:** Fully responsive layout across desktop and tablet screens.
  - **Paired Unit Test:** `src/views/__tests__/AnalyticsDashboard.test.jsx`
- [x] `TSK-05.2.3` `[Test]` **Unit Test Suite for US 05.2 (`test_telemetry_service.py`, `AnalyticsDashboard.test.jsx`)**
  - **Scope:** Test KPI queries, dwell time averaging, language breakdown distributions, and dashboard charts rendering.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_telemetry_service.py` && `npm run test -- AnalyticsDashboard`

---

### 📌 US 05.3: Static Audio Storage Capacity Alert & Orphan Pruning
> **As a** System Administrator,  
> **I need** automated alerts when audio storage exceeds 85%, and an action button to prune orphaned MP3 files,  
> **So that** disk exhaustion is avoided and server storage costs are optimized.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [x] 5/5 Tasks Completed

#### Acceptance Criteria:
- [x] **AC-05.3.1:** Check physical disk usage of `/static/audio` via standard `shutil.disk_usage()`.
- [x] **AC-05.3.2:** Sticky alert banner on admin header when disk usage $\ge 85\%$ (Amber: 85%-94%, Red Alert: $\ge 95\%$).
- [x] **AC-05.3.3:** "Clean Orphaned Audio" action scans disk, compares against active `POIAudio.Audio_url` DB records, and deletes unreferenced MP3s safely.

#### Task Checklist:
- [x] `TSK-05.3.1` `[Backend]` **System Health & Storage Check (`GET /api/v1/admin/system/health`)**
  - **Scope:** Inspect disk usage using `shutil.disk_usage()`, test DB connection latency, and external service health.
  - **DoD:** Returns `{ disk_used_percent, db_status, external_services_ok }`.
  - **Paired Unit Test:** `tests/unit/services/test_system_health.py`
- [x] `TSK-05.3.2` `[Frontend]` **Storage Progress Meter & Alert Banner (`StorageHealthBanner.jsx`)**
  - **Scope:** Progress meter ($<85\%$ green, $85\%-94\%$ amber, $\ge 95\%$ red). Sticky warning banner triggered at $\ge 85\%$.
  - **DoD:** Visually prominent alert with direct button to trigger cleanup modal.
  - **Paired Unit Test:** `src/components/__tests__/StorageHealthBanner.test.jsx`
- [x] `TSK-05.3.3` `[Backend]` **Orphan Audio Pruning Endpoint (`POST /api/v1/admin/storage/clean-orphans`)**
  - **Scope:** Scan `/static/audio`, cross-reference with DB `Audio_url` set, unlink orphaned files via `os.unlink()`, and return reclaimed space in MB.
  - **DoD:** Never deletes referenced files; correctly returns freed space amount.
  - **Paired Unit Test:** `tests/unit/services/test_storage_service.py`
- [x] `TSK-05.3.4` `[Frontend]` **"Clean Orphaned Audio" Modal & Action Trigger**
  - **Scope:** Confirmation modal, progress indicator, and toast report displaying reclaimed disk space in MB.
  - **DoD:** Automatically refreshes storage health gauge upon completion.
  - **Paired Unit Test:** `src/components/__tests__/StorageHealthBanner.test.jsx`
- [x] `TSK-05.3.5` `[Test]` **Unit Test Suite for US 05.3 (`test_system_health.py`, `test_storage_service.py`, `StorageHealthBanner.test.jsx`)**
  - **Scope:** Test disk usage inspection via `shutil.disk_usage()`, threshold warning alerts at $\ge 85\%$, orphan file deletion logic, and cleanup modal confirmation.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_system_health.py tests/unit/services/test_storage_service.py` && `npm run test -- StorageHealthBanner`

---

### 📌 US 05.4: Telemetry Filtering & Structured Data Export
> **As an** Administrator,  
> **I need to** filter telemetry datasets by date ranges and export reports to CSV or JSON formats,  
> **So that** I can share reports with site management and archive operational records.
>
> * **Priority:** Should Have | **Estimate:** 3 SP
> * **Progress:** [ ] 0/3 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-05.4.1:** Export structured dataset: Date, Exhibit Name, Trigger Count, Language, Average Dwell Duration.
- [ ] **AC-05.4.2:** Stream download directly from server to avoid server memory spikes.

#### Task Checklist:
- [ ] `TSK-05.4.1` `[Backend]` **Telemetry Stream Export Endpoint (`GET /api/v1/admin/analytics/export`)**
  - **Scope:** Stream CSV / JSON using FastAPI `StreamingResponse`, batching records from database.
  - **DoD:** Proper UTF-8 with BOM for Excel compatibility with Vietnamese text.
  - **Paired Unit Test:** `tests/unit/services/test_export_service.py`
- [ ] `TSK-05.4.2` `[Frontend]` **Telemetry Date Range Picker & Export Toolbar**
  - **Scope:** Date range filter with "Export CSV" and "Export JSON" download buttons.
  - **DoD:** Triggers secure browser file download.
  - **Paired Unit Test:** `src/components/__tests__/AnalyticsExport.test.jsx`
- [ ] `TSK-05.4.3` `[Test]` **Unit Test Suite for US 05.4 (`test_export_service.py`, `AnalyticsExport.test.jsx`)**
  - **Scope:** Test CSV and JSON file streaming, date range filtering, BOM headers, and frontend download button triggers.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_export_service.py` && `npm run test -- AnalyticsExport`

---

## 💳 EPIC 06: DIGITAL ADMISSION PAYMENT & VISITING SESSIONS (UC-06)

### 📌 US 06.1: Frictionless Digital Admission Checkout via VietQR & Cards
> **As a** Visitor,  
> **I want to** purchase an all-inclusive digital tour pass via domestic VietQR or card,  
> **So that** I can unlock full exhibit narratives and audio guides across the entire museum.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [ ] 0/5 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-06.1.1:** Integrate online payment gateways (PayOS for domestic VietQR and Stripe for international cards).
- [ ] **AC-06.1.2:** Mobile checkout modal: fixed price, validity label ("24-hour unlimited access"), selectable VietQR code, and card payment option.
- [ ] **AC-06.1.3:** Automated client polling: poll order status every 2.5 seconds while QR modal is active. On `PAID`, automatically close modal and unlock tour.

#### Task Checklist:
- [ ] `TSK-06.1.1` `[Backend]` **Create Checkout Order Endpoint (`POST /api/v1/payments/create-checkout`)**
  - **Scope:** Record `PENDING` order in `Transaction` table, call payment SDK to generate VietQR payload or card checkout session URL.
  - **DoD:** Returns `order_id`, `qr_code_url`, and `checkout_url` within $< 1.5\text{s}$.
  - **Paired Unit Test:** `tests/unit/controllers/test_payment_controller.py`
- [ ] `TSK-06.1.2` `[Backend]` **Order Status Polling Endpoint (`GET /api/v1/payments/order/{order_id}/status`)**
  - **Scope:** Support client polling. Query `Transaction` status (`PENDING`, `PAID`, `EXPIRED`).
  - **DoD:** JIT DB lifecycle; sub-100ms response time.
  - **Paired Unit Test:** `tests/unit/controllers/test_payment_controller.py`
- [ ] `TSK-06.1.3` `[Frontend]` **Mobile Checkout Modal (`CheckoutModal.jsx`)**
  - **Scope:** Clean mobile checkout modal: fixed price display, high-resolution VietQR image, banking instructions, and card payment redirect CTA.
  - **DoD:** Crisp QR rendering without distortion; download QR image option.
  - **Paired Unit Test:** `src/components/__tests__/CheckoutModal.test.jsx`
- [ ] `TSK-06.1.4` `[Frontend]` **Payment Polling Hook (`usePaymentPolling.js`)**
  - **Scope:** Schedule status check every 2.5 seconds. On `PAID`, clear polling interval, trigger chime, and unlock application context.
  - **DoD:** Cleans up interval on modal close or unmount.
  - **Paired Unit Test:** `src/hooks/__tests__/usePaymentPolling.test.js`
- [ ] `TSK-06.1.5` `[Test]` **Unit Test Suite for US 06.1 (`test_payment_controller.py`, `CheckoutModal.test.jsx`, `usePaymentPolling.test.js`)**
  - **Scope:** Test payment gateway order creation, status query endpoint, checkout modal QR rendering, and 2.5s polling hook interval lifecycle.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/controllers/test_payment_controller.py` && `npm run test -- CheckoutModal usePaymentPolling`

---

### 📌 US 06.2: Webhook-Driven 24-Hour Visiting Session Activation
> **As the** System Backend,  
> **I need to** process payment webhooks with HMAC signatures,  
> **So that** a 24-hour visiting session is activated and a unique Session Code (`CCT-XXXXXX`) is issued to the visitor.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [ ] 0/4 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-06.2.1:** Verify cryptographic HMAC SHA-256 signature from payment gateway to prevent counterfeit requests.
- [ ] **AC-06.2.2:** Mark `Transaction.Status = 'PAID'`, create `VisitorSession` valid for exactly 24 hours (`Expire_at = now() + 24 hours`).
- [ ] **AC-06.2.3:** Issue unique Session Code (e.g., `CCT-894201`) and store session token in visitor's `localStorage`.

#### Task Checklist:
- [ ] `TSK-06.2.1` `[Backend]` **Secure Webhook Handler (`POST /api/v1/payments/webhook`)**
  - **Scope:** Verify HMAC signature against raw request body. On match, update `Transaction`, generate random `SessionCode`, and persist `VisitorSession` (24h validity).
  - **DoD:** Rejects invalid signatures with HTTP 401; idempotent handling of duplicate webhooks.
  - **Paired Unit Test:** `tests/unit/services/test_payment_service.py`
- [ ] `TSK-06.2.2` `[Database]` **`VisitorSession` & `Transaction` Schema Alignment**
  - **Scope:** Configure 24h lifespan, unique `SessionCode` (`VARCHAR(20)`), and ON DELETE CASCADE constraints.
  - **DoD:** Passes CI schema verification in container.
  - **Paired Unit Test:** `tests/unit/repositories/test_session_repository.py`
- [ ] `TSK-06.2.3` `[Frontend]` **Visitor Session Context (`VisitorSessionContext.jsx`)**
  - **Scope:** Persist session token and code in `localStorage`, expose global `isUnlocked`, `sessionCode`, and `timeRemaining` properties.
  - **DoD:** Restores unlocked state automatically on page reload.
  - **Paired Unit Test:** `src/context/__tests__/VisitorSessionContext.test.jsx`
- [ ] `TSK-06.2.4` `[Test]` **Unit Test Suite for US 06.2 (`test_payment_service.py`, `test_session_repository.py`, `VisitorSessionContext.test.jsx`)**
  - **Scope:** Test HMAC signature verification, 24h expiration timestamping, session code generation, and session context unlock state persistence.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/services/test_payment_service.py tests/unit/repositories/test_session_repository.py` && `npm run test -- VisitorSessionContext`

---

### 📌 US 06.3: Multi-Device Session Recovery via Session Code
> **As a** Visitor,  
> **I want to** enter my Session Code if I change devices or refresh my browser,  
> **So that** I can resume my purchased tour without paying again.
>
> * **Priority:** Should Have | **Estimate:** 3 SP
> * **Progress:** [ ] 0/3 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-06.3.1:** Visitor enters uppercase code (e.g., `CCT-894201`).
- [ ] **AC-06.3.2:** If code is valid and unexpired, return new session token and restore tour state. If expired or invalid, display: "Session code is invalid or has expired."

#### Task Checklist:
- [ ] `TSK-06.3.1` `[Backend]` **Session Restore Endpoint (`POST /api/v1/sessions/restore`)**
  - **Scope:** Query `session_code` in `VisitorSession`. Verify `Expire_at > now()`. Return new token and remaining validity seconds.
  - **DoD:** Returns HTTP 404/410 on invalid or expired code.
  - **Paired Unit Test:** `tests/unit/controllers/test_session_controller.py`
- [ ] `TSK-06.3.2` `[Frontend]` **Session Restore Modal Dialog (`RestoreSessionModal.jsx`)**
  - **Scope:** Monospace uppercase text input, inline validation, and error alert handling.
  - **DoD:** Immediately unlocks application state on valid code entry.
  - **Paired Unit Test:** `src/components/__tests__/RestoreSessionModal.test.jsx`
- [ ] `TSK-06.3.3` `[Test]` **Unit Test Suite for US 06.3 (`test_session_controller.py`, `RestoreSessionModal.test.jsx`)**
  - **Scope:** Test session code validation, unexpired session check, error handling on expired/nonexistent codes, and restoration modal input.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/controllers/test_session_controller.py` && `npm run test -- RestoreSessionModal`

---

### 📌 US 06.4: Content Protection & Narrative/Audio Decryption Access Control
> **As the** Museum Administration,  
> **I need** in-depth narratives and audio streams to remain strictly locked for unpaid visitors,  
> **So that** museum intellectual property and digital admission revenue are protected.
>
> * **Priority:** Must Have | **Estimate:** 5 SP
> * **Progress:** [ ] 0/4 Tasks Completed

#### Acceptance Criteria:
- [ ] **AC-06.4.1:** For unpaid visitors, API responses omit `description` and `audio_url`, returning only `short_description` and thumbnail.
- [ ] **AC-06.4.2:** Audio streaming endpoint (`GET /api/v1/audio/{poi_id}`) enforces active session token. Returns `HTTP 403 Forbidden` if unpaid or expired.
- [ ] **AC-06.4.3:** Frontend applies visual paywall blur gradient over text preview with an unlock CTA button.

#### Task Checklist:
- [ ] `TSK-06.4.1` `[Backend]` **Audio Streaming Authorization Middleware**
  - **Scope:** Protect `/api/v1/audio/*`. Inspect session token; return `HTTP 403 Forbidden` if token is missing, invalid, or expired.
  - **DoD:** Completely prevents unauthorized audio file streaming or scraping.
  - **Paired Unit Test:** `tests/unit/controllers/test_audio_controller.py`
- [ ] `TSK-06.4.2` `[Backend]` **POI Content Gating Filter**
  - **Scope:** In `poi_service.py`, inspect visitor session. For unpaid requests, sanitize `description` and `audio_url` fields, providing only teaser content.
  - **DoD:** Protects content at backend API layer, preventing data leakage to client.
  - **Paired Unit Test:** `tests/unit/services/test_poi_service.py`
- [ ] `TSK-06.4.3` `[Frontend]` **Content Paywall Gate Component (`ContentPaywallGate.jsx`)**
  - **Scope:** Render first 3 lines of preview text covered by a smooth fade gradient (`bg-gradient-to-b from-transparent to-white`) with unlock CTA button.
  - **DoD:** Tapping unlock CTA opens `CheckoutModal.jsx`.
  - **Paired Unit Test:** `src/components/__tests__/ContentPaywallGate.test.jsx`
- [ ] `TSK-06.4.4` `[Test]` **Unit Test Suite for US 06.4 (`test_audio_controller.py`, `test_poi_service.py`, `ContentPaywallGate.test.jsx`)**
  - **Scope:** Test HTTP 403 authorization middleware on audio streams, POI teaser filtering for unpaid users, and paywall gradient overlay UI with unlock trigger.
  - **DoD:** 100% test pass in Pytest and Vitest, $\ge 80\%$ line & branch code coverage.
  - **Execution:** `pytest tests/unit/controllers/test_audio_controller.py tests/unit/services/test_poi_service.py` && `npm run test -- ContentPaywallGate`
