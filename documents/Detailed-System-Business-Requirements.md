# Detailed System Business Requirements & User Story Specifications

> **Project:** Smart Museum Multilingual AI Audio Guide & Navigation System  
> **Document Purpose:** Detailed Agile functional specifications decomposed into Themes, Epics, User Stories, Acceptance Criteria, and Technical Implementation Tasks.

---

## THEME 1: SYSTEM GOVERNANCE, SECURITY & ACCESS CONTROL

### Epic 01: Identity Authentication & Role-Based Access Control (UC-02)

#### User story 02.1: Role-Based System Login (Role-Based Login)
* **Description:** As a Staff member or Administrator (Admin / Curator / Staff), I need to log into the Administrative Portal using my Username and Password so that the system authenticates my identity and routes me directly to my role-specific workspace.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Enables the user to input Username and Password. Upon clicking "Sign In", the system processes the authentication request in real time with a response latency < 1 second.
  2. Submitted passwords are authenticated against one-way cryptographic hashes using industry standards (Bcrypt cost factor $\ge$ 12 or Argon2id) stored in the database. Plaintext passwords must never be stored, cached, or logged.
  3. Upon valid credentials, the system establishes a secure session (JWT token transmitted via `HttpOnly`, `SameSite=Strict` cookie with a 60-minute lifespan) and routes to the proper workspace: Admin to the Global Dashboard, Curator to Translation & Audio Management, and Staff to Exhibit Cataloging.
  4. If credentials fail, the system renders a generic error message: *"Invalid username or password"*, retaining the entered username while clearing the password field to prevent user enumeration attacks.
* **Task List:**
  * **Task 02.1.1 (Backend):** Develop `/api/v1/auth/login` endpoint verifying Bcrypt hashed passwords, issuing JWT tokens with role claims, and attaching secure `HttpOnly` cookies.
  * **Task 02.1.2 (Frontend):** Build a responsive Admin Login page, handle authentication state persistence, and configure route guards based on user roles.
  * **Task 02.1.3 (Database):** Construct `users` table, generating database indexes on `username` and `email` columns for rapid authentication queries.

#### User story 02.2: Brute-Force Protection & Account Lockout (Account Lockout)
* **Description:** As a System Administrator, I need the system to automatically lock user accounts upon consecutive failed login attempts to safeguard against automated brute-force credential stuffing.
* **Priority:** Must have
* **Story point:** 3
* **Acceptance Criteria:**
  1. The system tracks consecutive failed login attempts per account.
  2. If an account incurs 5 consecutive failed attempts, the system automatically locks the account for 15 minutes, rejecting subsequent login requests and displaying: *"Account temporarily locked due to 5 failed attempts. Please retry after 15 minutes."*
  3. All failed attempts and lockout events are automatically logged into system security audit trails with client IP addresses and timestamps.
* **Task List:**
  * **Task 02.2.1 (Backend):** Implement rate-limiting middleware tracking failed attempts (using Redis or database fields) and enforce lockout thresholds.
  * **Task 02.2.2 (Frontend):** Catch HTTP 423 (Locked) responses and present a countdown lockout alert modal.
  * **Task 02.2.3 (Database):** Add `failed_attempts`, `locked_until`, and `is_active` fields to `users` table, and design the `login_audit_logs` table.

#### User story 02.3: Secure Session Management & Logout (Session Management & Logout)
* **Description:** As an Administrative Portal User, I need my session to automatically expire during inactivity and have the ability to explicitly log out to revoke active access tokens, ensuring security on shared workstations.
* **Priority:** Should have
* **Story point:** 2
* **Acceptance Criteria:**
  1. Sessions automatically expire after 60 minutes or after 30 minutes of continuous user inactivity.
  2. Clicking "Log Out" clears session cookies, revokes the token server-side, and immediately redirects the user to the Login screen.
* **Task List:**
  * **Task 02.3.1 (Backend):** Construct `/api/v1/auth/logout` endpoint that purges authentication cookies and blacklists active tokens.
  * **Task 02.3.2 (Frontend):** Implement a Logout action button on the administrative navigation header, wiping all local user states upon exit.

---

## THEME 2: EXHIBIT CATALOGING & SPATIAL POSITIONING

### Epic 02: Exhibit & POI Catalog Management (UC-03)

#### User story 03.1: Create Digitized Exhibit Profile (Create New POI)
* **Description:** As Museum Staff, I need to create a new exhibit profile with title, teaser preview, primary Vietnamese narration, cover photo, and floor level to digitize the artifact for public visitors.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Provides an input form for: Vietnamese Title (`title_vi`), Pre-unlock Teaser (`short_description_vi`), Full Narrative (`description_vi`), Floor level (`floor`), and Cover Image upload (`image_url`).
  2. Input validation: Required title and description fields must not be empty; uploaded images must strictly be JPG/PNG/WebP formats under 5MB.
  3. Upon clicking "Save", the system creates a database record with `translation_status = 'PENDING'` and dispatches asynchronous background jobs for translation and audio synthesis.
* **Task List:**
  * **Task 03.1.1 (Backend):** Develop `POST /api/v1/admin/pois` endpoint accepting multipart form-data, persisting exhibit metadata, and saving images to `/static/images`.
  * **Task 03.1.2 (Frontend):** Build POI creation form with rich text editors, image previewers, and client-side validation rules.
  * **Task 03.1.3 (Database):** Construct `pois` table with constraints and timestamp fields (`created_at`, `updated_at`).

#### User story 03.2: Update POI Information & Re-trigger AI Pipelines (Update POI & Re-trigger AI)
* **Description:** As Museum Staff, I need to update exhibit information and photos as historical research evolves, and have the system automatically trigger background pipelines to refresh translations and audio narrations.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Allows modifying any existing exhibit metadata with form pre-population.
  2. If the primary Vietnamese description (`description_vi`) changes, the system automatically schedules background tasks to translate text into 4 target languages and re-synthesize audio guides.
  3. Displays a success notification: *"POI updated successfully. Background translation and audio generation initiated."*
* **Task List:**
  * **Task 03.2.1 (Backend):** Build `PUT /api/v1/admin/pois/{id}` endpoint detecting modifications in `description_vi` to trigger FastAPI BackgroundTasks.
  * **Task 03.2.2 (Frontend):** Develop POI editing views, presenting background processing status indicators.

#### User story 03.3: Delete Exhibit with Cascade Purging (Cascade Deletion)
* **Description:** As an Administrator, I need to remove decommissioned exhibits, and have the system cleanly purge all associated translation records and audio files to prevent database bloat and orphaned files.
* **Priority:** Should have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Clicking "Delete" prompts a confirmation dialog: *"Are you sure you want to delete this exhibit and its associated audio/translation files?"*
  2. Upon confirmation, deleting the record from `pois` automatically cascades deletions across `poi_translations` and `poi_audios` via foreign-key constraints.
  3. Physical `.mp3` audio files and cover images are deleted from server static directories to release storage capacity.
* **Task List:**
  * **Task 03.3.1 (Backend):** Construct `DELETE /api/v1/admin/pois/{id}` with file system unlinking utilities for `/static/audio` and `/static/images`.
  * **Task 03.3.2 (Frontend):** Create confirmation modal dialogs and refresh table datasets post-deletion.
  * **Task 03.3.3 (Database):** Configure `poi_id` foreign keys with `ON DELETE CASCADE` across `poi_translations` and `poi_audios`.

---

### Epic 03: GPS Geofence Positioning & Proximity Calibration (UC-04)

#### User story 04.1: Interactive Map GPS Geolocation (Interactive GPS Geolocation)
* **Description:** As Museum Staff, I need to visually pin or drag an exhibit's GPS coordinates across an interactive map (or manually input latitude and longitude) to calibrate its accurate physical location.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Renders an interactive map (OpenStreetMap / Leaflet) allowing staff to click or drag a marker to designate geographical coordinates.
  2. Latitude and longitude fields update dynamically as the map marker moves, and vice versa.
  3. Boundary validation: If coordinates fall outside the museum perimeter bounds (`[lat_min, lat_max]`, `[lng_min, lng_max]`), the system triggers a warning alert and inhibits submission.
* **Task List:**
  * **Task 04.1.1 (Backend):** Implement geographical bounding box validation inside the POI coordinate update API.
  * **Task 04.1.2 (Frontend):** Integrate Leaflet.js into the admin view, handling marker `dragend` events to synchronize form coordinates.

#### User story 04.2: Proximity Geofence Trigger Radius Calibration (Geofence Radius Calibration)
* **Description:** As Museum Staff, I need to configure a proximity geofence radius (in meters) around each exhibit to enable automated outdoor visitor detection.
* **Priority:** Must have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Staff can input a proximity radius (default: 30 meters; allowed bounds: 5m to 100m).
  2. The interactive map renders a circular visual geofence (`L.circle`) around the marker, providing an intuitive estimation of physical detection zones.
  3. Upon saving, `radius_meters` is stored in the database.
* **Task List:**
  * **Task 04.2.1 (Backend):** Add `radius_meters` to Pydantic validation schemas (`POIUpdateSchema`).
  * **Task 04.2.2 (Frontend):** Render dynamic `L.circle` layers on Leaflet maps that scale proportionately with numeric input adjustments.

#### User story 04.3: Invalidate Route Caches Post Coordinate Updates (Route Cache Invalidation)
* **Description:** As Museum Staff, I want the system to invalidate existing route caches immediately when exhibit coordinates are updated, ensuring visitors receive newly calculated paths.
* **Priority:** Should have
* **Story point:** 2
* **Acceptance Criteria:**
  1. Saving coordinate modifications clears cached walking directions.
  2. Next visitor route requests compute fresh waypoints using the updated coordinates.
* **Task List:**
  * **Task 04.3.1 (Backend):** Write cache invalidation logic inside the routing service upon successful POI spatial updates.

---

## THEME 3: MULTILINGUAL AI AUTOMATION & CURATORIAL REVIEW

### Epic 04: Automated Multilingual Translation & Voice Synthesis (UC-07 & UC-08)

#### User story 07.1: Asynchronous Multilingual Translation Pipeline (Automated Multilingual Translation)
* **Description:** As the System, I need to automatically extract source Vietnamese narratives and dispatch asynchronous translation jobs across 4 target languages (`en` - English, `ja` - Japanese, `ko` - Korean, `zh` - Chinese) to eliminate language barriers for international tourists.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Operates as an asynchronous background worker without blocking admin user interactions.
  2. Dispatches translation payloads to external translation APIs (Deep-Translator / Google Translate) per target language.
  3. Implements exponential backoff retry logic (up to 3 attempts) for intermittent network drops.
  4. Stores translated strings into `poi_translations` with `status = 'COMPLETED'` and triggers downstream audio synthesis (Epic 05).
* **Task List:**
  * **Task 07.1.1 (Backend):** Construct `TranslationService` integrating `deep-translator`, loading target language lists from environment variables (`TARGET_LANGUAGES=en,ja,ko,zh`).
  * **Task 07.1.2 (Backend):** Implement async retry handlers and error loggers for failed translation jobs.
  * **Task 07.1.3 (Database):** Construct `poi_translations` table enforcing `UNIQUE(poi_id, language_code)`.

#### User story 08.1: High-Fidelity Neural TTS Audio Generation (Neural TTS Audio Generation)
* **Description:** As the System, I need to convert localized narratives into natural-sounding `.mp3` audio files using Microsoft Edge Neural TTS voices.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Consumes translated texts and invokes Edge-TTS with designated language voice profiles (`vi-VN`, `en-US`, `ja-JP`, `ko-KR`, `zh-CN`).
  2. Saves binary `.mp3` streams into static storage directories (`/static/audio/poi_{id}_{lang}.mp3`).
  3. Records `audio_url`, file size, and `status = 'READY'` in the `poi_audios` table.
* **Task List:**
  * **Task 08.1.1 (Backend):** Construct `TTSService` with `edge-tts`, configuring neural voice profiles for all supported languages.
  * **Task 08.1.2 (Backend):** Persist binary audio files and register record metadata in the database.

#### User story 08.2: Content Hashing Validation for Intelligent Audio Caching (Text Hashing Cache Validation)
* **Description:** As the System, I need to compute and compare content hashes of narrative texts against stored cache records before calling the TTS engine, preventing redundant synthesis and saving server resources.
* **Priority:** Should have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Computes MD5/SHA256 hashes of narrative strings prior to audio synthesis.
  2. Compares hashes with `text_hash` in `poi_audios`.
  3. If identical (Cache Hit), synthesis is bypassed and the existing `.mp3` file is retained, completing in < 50ms.
* **Task List:**
  * **Task 08.2.1 (Backend):** Add `compute_text_hash` utilities and cache-hit conditional logic before invoking `edge-tts`.
  * **Task 08.2.2 (Database):** Add indexed `text_hash` column to `poi_audios`.

#### User story 08.3: Client-Side Web Speech API Fallback (Web Speech API Fallback)
* **Description:** As a Visitor, I want my mobile browser to automatically fall back to native device speech synthesis if the museum audio streaming server experiences downtime.
* **Priority:** Could have
* **Story point:** 3
* **Acceptance Criteria:**
  1. If static audio fails with HTTP 404/500 or audio record status is `FAILED`, the audio player catches errors gracefully.
  2. Automatically invokes native Web Speech API (`window.speechSynthesis`) to narrate text in the selected language.
* **Task List:**
  * **Task 08.3.1 (Frontend):** Build fallback routines in `AudioPlayer.jsx` to trigger `speechSynthesis.speak()` when audio tags encounter errors.

---

### Epic 05: Curatorial Review, Linguistic Curation & Publishing (UC-05)

#### User story 05.1: Translation Catalog Browsing & Multi-Filter Audit (Translation Management & Filtering)
* **Description:** As a Curator, I need to browse and filter translation records by language, exhibit, and publication status to oversee content quality.
* **Priority:** Must have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Displays translations in a structured data table with POI name, language, snippet preview, audio status, and approval status (`Pending` / `Published`).
  2. Supports instant multi-criteria filtering by: language code, exhibit name, and publication status.
* **Task List:**
  * **Task 05.1.1 (Backend):** Build `GET /api/v1/admin/translations` supporting filter query parameters (`language_code`, `status`, `poi_id`).
  * **Task 05.1.2 (Frontend):** Develop translation management interface with search filters and clean UX dropdowns.

#### User story 05.2: Audio Preview & Historical Terminology Refinement (Audio Preview & Text Refinement)
* **Description:** As a Curator, I need to preview audio narrations, audit translated terminology, and edit text narratives, with the system automatically marking associated audio files as needing regeneration.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Features an embedded audio player inside the curator audit view.
  2. Curators can edit translated titles and descriptions.
  3. Saving text modifications automatically flags audio status as *"Pending Update"*, preventing desynchronization between text and voice.
* **Task List:**
  * **Task 05.2.1 (Backend):** Build `PUT /api/v1/admin/translations/{id}` updating content and flagging audio records.
  * **Task 05.2.2 (Frontend):** Create an audit modal dialog integrating inline audio playback and text editing forms.

#### User story 05.3: Regenerate Audio & Approve for Public Exhibition (Regenerate Audio & Approve Publishing)
* **Description:** As a Curator, I need to regenerate audio guides post-refinement and approve content for publication (`Published`) so that it becomes accessible to museum visitors.
* **Priority:** Must have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Offers a "Regenerate Audio Guide" button that synthesizes fresh `.mp3` files matching updated text.
  2. "Approve & Publish" button becomes enabled only when both text and audio are verified and ready.
  3. Approving updates status to `Published`, instantly synchronizing verified content to mobile visitors.
* **Task List:**
  * **Task 05.3.1 (Backend):** Build `POST /api/v1/admin/translations/{id}/regenerate-audio` and `POST /api/v1/admin/translations/{id}/publish`.
  * **Task 05.3.2 (Frontend):** Implement reactive UI state transitions updating badges from `Pending` to `Published`.

---

## THEME 4: VISITOR SERVICES, DIGITAL PAYMENT & ON-SITE NAVIGATION

### Epic 06: Digital Admission Payment & Tour Session Activation (UC-09)

#### User story 09.1: Frictionless Digital Admission Checkout (Digital Tour Admission Payment)
* **Description:** As a Visitor, I want to purchase an all-inclusive digital tour pass via domestic VietQR or international credit/debit card to unlock all audio guides on my phone without waiting at physical ticket desks.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Clicking "Unlock Tour" displays the fixed admission price (e.g., 50,000 VND).
  2. Supports 2 payment options: domestic VietQR (via PayOS) and international credit/debit cards (via Stripe).
  3. Generates secure checkout sessions in < 1 second; presents dynamic VietQR codes or PCI-DSS compliant card input forms.
* **Task List:**
  * **Task 09.1.1 (Backend):** Integrate PayOS SDK (VietQR) and Stripe API; build `POST /api/v1/payments/create-checkout`.
  * **Task 09.1.2 (Frontend):** Build a mobile checkout modal with automatic transaction polling.
  * **Task 09.1.3 (Database):** Construct `transactions` table recording `transaction_id`, `amount`, `payment_method`, and `status`.

#### User story 09.2: Webhook-Driven 24-Hour Visiting Session Activation (24-Hour Visiting Session Activation)
* **Description:** As the System, I need to receive automated payment Webhook confirmations to activate a 24-hour Visiting Session, granting full audio guide streaming permissions.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Verifies Webhook cryptographic signatures from PayOS / Stripe to prevent fraudulent spoofing.
  2. Updates transaction status to `PAID` and generates an active `session_code`.
  3. Sets session validity strictly to 24 hours (`expires_at = now() + 24 hours`).
  4. Visitor browser detects active session, saves tokens to `localStorage`, and unlocks all audio streaming buttons.
* **Task List:**
  * **Task 09.2.1 (Backend):** Construct Webhook endpoint `POST /api/v1/payments/webhook` with signature verification and session provisioning.
  * **Task 09.2.2 (Frontend):** Create `VisitorSessionContext` to listen for payment confirmations and decrypt audio controls.
  * **Task 09.2.3 (Database):** Construct `visiting_sessions` table with `session_code`, `expires_at`, and `is_active`.

#### User story 09.3: Restore Tour Session via Session Code (Restore Visiting Session)
* **Description:** As a Visitor, I want to use my Session Code to restore my active tour session if I change devices or refresh my browser, avoiding redundant ticket purchases.
* **Priority:** Should have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Provides a "Restore Tour Session" action on the home screen.
  2. Entering a valid `session_code` within the 24-hour window restores full access and displays remaining active hours.
  3. Expired or non-existent codes return clear explanatory error alerts.
* **Task List:**
  * **Task 09.3.1 (Backend):** Build `POST /api/v1/sessions/restore` validating session codes and expiration timestamps.
  * **Task 09.3.2 (Frontend):** Build Session Code restoration modal with friendly status feedback.

---

### Epic 07: Interactive Map, GPS Geofencing & Smart Wayfinding (UC-01)

#### User story 01.1: Interactive Museum Map & Real-time GPS Position (Interactive Map & Real-time GPS Position)
* **Description:** As a Visitor, I want to view an interactive digital map of the museum grounds displaying my real-time GPS position marker to orient myself effortlessly.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Requests browser geolocation permissions on mobile devices.
  2. Renders visitor coordinates in real time with an accuracy circle indicator.
  3. If location permission is denied or GPS is unavailable, centers by default on the Museum Entrance with helper guidance.
* **Task List:**
  * **Task 01.1.1 (Frontend):** Integrate OpenStreetMap / Leaflet inside `MapPage.jsx`, invoking `navigator.geolocation.watchPosition` for real-time tracking.
  * **Task 01.1.2 (Frontend):** Optimize touch gestures (pinch-to-zoom, panning) for mobile web browsers.

#### User story 01.2: Automated Voice Narration on GPS Proximity (GPS Geofence Proximity Trigger)
* **Description:** As a Visitor, I want the app to automatically trigger audio narrations when I physically walk into an exhibit's GPS Geofence Radius without manual search.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. The app continuously evaluates Euclidean/Haversine distance between current GPS position and exhibit coordinates.
  2. When distance $\le$ `radius_meters`, triggers proximity events: displays toast notifications and begins audio streaming in the selected language.
  3. Includes a cooldown mechanism: triggers only once per exhibit while the visitor remains within the radius.
* **Task List:**
  * **Task 01.2.1 (Frontend):** Write distance evaluation routines inside `geofenceService.js`.
  * **Task 01.2.2 (Frontend):** Autoplay audio using HTML5 Audio API and present a sticky bottom mini-player.

#### User story 01.3: Intelligent Recommended Walking Route (Recommended Walking Route Calculation)
* **Description:** As a Visitor, I want an intelligent recommended route guiding me sequentially to adjacent exhibits so that I can explore without getting lost or backtracking.
* **Priority:** Should have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Computes optimal walking paths between waypoints.
  2. Renders dynamic polyline paths connecting the visitor's location to the next suggested exhibit marker.
  3. Automatically updates route guidance to the next POI upon completing an exhibit's audio guide.
* **Task List:**
  * **Task 01.3.1 (Backend/Frontend):** Implement waypoint path calculation routines based on spatial coordinate matrices.
  * **Task 01.3.2 (Frontend):** Render dashed animated paths using `L.polyline` on Leaflet maps.

#### User story 01.4: Tap Map Marker for Teaser Preview Card (POI Preview Card)
* **Description:** As a Visitor, I want to tap any exhibit marker on the map to inspect teaser photos and brief summaries before heading over.
* **Priority:** Must have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Tapping an exhibit marker slides up a Bottom Preview Card.
  2. Card displays: cover image, title, preview teaser, and approximate walking distance.
  3. Provides a "Navigate Here" action button to recalculate route polylines toward the selected marker.
* **Task List:**
  * **Task 01.4.1 (Frontend):** Build `PoiPreviewCard.jsx` with mobile-optimized slide-up bottom sheet transitions.

---

## THEME 5: OPERATIONAL ANALYTICS, FIELD TELEMETRY & SYSTEM HEALTH

### Epic 08: Visitor Flow Analytics & Spatial Telemetry (UC-06)

#### User story 06.1: Real-time Visitor Density Heatmap (Real-time Visitor Density Heatmap)
* **Description:** As an Operations Manager, I need to view real-time visitor density heatmaps across museum grounds to identify crowded zones and deploy staff accordingly.
* **Priority:** Should have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Renders a heatmap overlay (`Leaflet.heat`) illustrating visitor concentrations derived from recent GPS proximity trigger events.
  2. High-density hotspots appear red/orange, while low-traffic areas display green.
  3. Refreshes dynamically on configurable intervals (30s or 60s) without full-page reloads.
* **Task List:**
  * **Task 06.1.1 (Backend):** Build `GET /api/v1/admin/analytics/heatmap` aggregating telemetry events from the past hour.
  * **Task 06.1.2 (Frontend):** Integrate `leaflet.heat` into administrative dashboards with smooth data re-rendering.

#### User story 06.2: Exhibit Ranking, Dwell Times & Language Demographics (Top POIs, Dwell Time & Language Demographics)
* **Description:** As an Administrator, I need statistical rankings of top-visited exhibits, average dwell times, and language breakdowns to evaluate exhibition impact.
* **Priority:** Must have
* **Story point:** 5
* **Acceptance Criteria:**
  1. Displays bar charts ranking Top 10 most-played exhibit audio guides per day/week/month.
  2. Computes average visitor dwell time (in seconds/minutes) within each exhibit's geofence boundary.
  3. Presents pie charts illustrating language usage distribution (`vi`, `en`, `ja`, `ko`, `zh`).
* **Task List:**
  * **Task 06.2.1 (Backend):** Build `/api/v1/admin/analytics/summary` executing aggregation queries on `telemetry_logs`.
  * **Task 06.2.2 (Frontend):** Integrate charting libraries (Chart.js / Recharts) rendering visual metric widgets.

#### User story 06.3: Telemetry Filtering & Structured Data Export (Telemetry Filtering & Data Export)
* **Description:** As an Administrator, I need to filter telemetry datasets by date ranges and export reports to CSV or JSON formats for archival and institutional reporting.
* **Priority:** Should have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Date filtering: Today, Last 7 Days, Last 30 Days, or custom Start Date - End Date.
  2. Provides an "Export Report" button downloading structured `.csv` or `.json` files.
  3. Output files include: Date, Exhibit Name, Trigger Count, Language Code, and Average Duration.
* **Task List:**
  * **Task 06.3.1 (Backend):** Build `GET /api/v1/admin/analytics/export` streaming file downloads.
  * **Task 06.3.2 (Frontend):** Add Date Range Pickers and download buttons to the analytics toolbar.

---

### Epic 09: Infrastructure Health Monitoring & System Diagnostics (UC-06)

#### User story 06.4: API Latency & SQLite WAL Performance Monitoring (API Latency & Database Monitoring)
* **Description:** As a System Administrator, I need to monitor API response latency, mobile audio streaming throughput, and database WAL connection efficiency to prevent bottlenecks during peak hours.
* **Priority:** Should have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Tracks average API response times (< 200ms).
  2. Monitors SQLite Write-Ahead Logging (WAL) concurrency and checks for write lock contention.
  3. Audits audio streaming error rates (< 1%).
* **Task List:**
  * **Task 06.4.1 (Backend):** Implement timing middleware measuring request latencies and expose `/api/v1/admin/system/health`.
  * **Task 06.4.2 (Frontend):** Build system health dashboard cards showing performance metrics.

#### User story 06.5: Static Audio Storage Capacity Alert Thresholds (>85%) (Audio Cache Storage Threshold Warning)
* **Description:** As a System Administrator, I need automated alerts when static audio cache disk consumption exceeds 85% capacity, prompting timely pruning or storage expansion.
* **Priority:** Must have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Monitors disk usage of the server partition holding `/static/audio`.
  2. Flags status as `WARNING` (yellow) at $\ge$ 85% and `CRITICAL` (red) at $\ge$ 95%.
  3. Triggers dashboard warning banners: *"Audio cache capacity exceeds 85%. Please prune orphaned files or expand storage quota."*
* **Task List:**
  * **Task 06.5.1 (Backend):** Use Python's `shutil.disk_usage` to compute disk space percentages.
  * **Task 06.5.2 (Frontend):** Create dynamic visual storage progress bars changing color based on utilization percentages.

#### User story 06.6: AI Pipeline Availability & Live Auto-Refresh (AI Health & Live Auto-Refresh)
* **Description:** As a System Administrator, I need visibility into the operational health of external translation and TTS services, with an auto-refresh toggle for continuous oversight.
* **Priority:** Should have
* **Story point:** 3
* **Acceptance Criteria:**
  1. Displays service status badges: Deep-Translator API (`ONLINE` / `DEGRADED`) and Edge-TTS Engine (`ONLINE` / `OFFLINE`).
  2. Offers a "Live Auto-Refresh" toggle with configurable 30s or 60s intervals to monitor system vitals hands-free.
* **Task List:**
  * **Task 06.6.1 (Backend):** Build background health-check routines testing AI endpoints with short timeouts (2s).
  * **Task 06.6.2 (Frontend):** Implement reactive `setInterval` timers when auto-refresh is toggled on.
