# Project Overview & Architecture
## 1. Tech Stack

### Frontend & Client
* **Framework:** React.js (Mobile-first Web Application / PWA)
* **Interactive Mapping:** OpenStreetMap.js (Leaflet / MapLibre GL integration)

### Backend & API
* **Framework:** Python FastAPI (Structured using 3-Layer Architecture: Router -> Service -> Repository)
* **Database:** SQLite (MVP / Initial phase) / PostgreSQL (Production ready)

### AI Services & Media Pipeline
* **Text Translation:** `deep-translator` / Google Translate API integration
* **Text-to-Speech (TTS):** Python `edge-tts` library (Pre-rendered and cached MP3 static files)

### Infrastructure & Deployment
* **Containerization:** Docker & Docker Compose (To be confirmed with Instructor)
* **Storage & Caching:** Local Static File Server / Caching for pre-generated audio

---

# 2 Business Requirements Analysis: Cu Chi Tunnels Smart Multilingual Guide

## 1. Business Context & Vision

The Smart Museum System operates as a multidimensional digital interaction network that tightly integrates three primary groups of actors: Museum Visitors & International Tourists who consume digitized cultural heritage services, Museum Operational & Curatorial Personnel (System Admin / Curator / Operational Staff) who coordinate on-site resources and review exhibition assets, and Automated AI, Payment & Telemetry Infrastructure (VietQR / International Card Payment Gateway, Automated Translation Services, Neural Voice TTS Engine, Interactive Digital Mapping Platform, and Telemetry Logging Module) ensuring an automated end-to-end operational pipeline.

The central mission of the system is to transform static physical artifacts, heritage grounds, underground tunnel complexes, and scholarly historical documentation of the Cu Chi Tunnels Historical Site into vibrant, intuitive, and multilingual digital journeys. It commercializes digital services through frictionless online admission payments and time-limited visiting sessions, automatically triggers intelligent voice narrations based on outdoor GPS geofencing and interactive map navigation, coordinates optimal walking routes through historical waypoints, automates AI translation and neural voice dubbing workflows, and delivers real-time operational telemetry to empower business decision-making and facility governance.

## 2. Platform Setup, Access Governance & Admission Pricing

The business journey initiates with platform configuration, service pricing, identity governance, and role-based access control (RBAC). The System Administrator configures foundational operating parameters (fixed digital tour admission pricing, target supported languages, museum geographical site boundaries, infrastructure storage alert thresholds), while provisioning staff accounts with granular access privileges:

* **Admin:** Possesses full authority over system configuration, user access, and comprehensive audit monitoring.
* **Curator:** Specializes in academic curation, translation review, and voice narration regeneration.
* **Staff:** Handles artifact data entry, GPS coordinate calibration, and proximity geofence radius configuration.

All accounts are secured by industry-standard one-way cryptographic hashing (Bcrypt/Argon2id), an anti-brute-force rate limiter (automatic 15-minute account lockout upon 5 consecutive failed login attempts), and secure session tokens with a maximum lifetime of 60 minutes.

## 3. Exhibit Cataloging, Content Editing & GPS Geofence Positioning Workflow

Whenever new exhibits are introduced or gallery zones are reconfigured, staff initiate the Exhibit Cataloging, Content Editing & GPS Geofence Positioning Workflow. Personnel enter core identification metadata: title, pre-payment preview teaser description, full detailed narrative in the source language (Vietnamese), and high-resolution imagery. Crucially, staff calibrate the precise spatial positioning of the outdoor exhibit by clicking or dragging a pin across the interactive map (or manually inputting latitude and longitude), while configuring a proximity geofence radius (e.g., default 30 meters) to facilitate automatic visitor detection. The system validates all inputs: coordinates must reside strictly within museum perimeter boundaries, and media formats must comply before persisting records to the central database and refreshing navigation routing caches. If an exhibit is decommissioned, foreign-key cascade deletion immediately cleans up associated translations, audio assets, and physical server files.

## 4. Automated Multilingual Translation & AI Voice Synthesis Pipeline

Immediately following POI creation or primary description updates, the backend triggers the Automated Multilingual Translation & AI Voice Synthesis Pipeline in the background:

* **Automated AI Translation:** The system extracts the source Vietnamese text and dispatches asynchronous translation requests across configured target languages (English, Japanese, Korean, Chinese). An exponential backoff retry mechanism (up to 3 attempts) is executed individually per language to overcome transient network drops.
* **AI Voice Synthesis & Intelligent Audio Caching:** Following translation completion, localized text strings are forwarded to the Microsoft Edge Neural TTS voice engine to synthesize high-fidelity .mp3 narration files. An intelligent content hashing rule (Text Hashing) compares the hash of the text against stored cache records: if the text remains unchanged, existing cached audio is reused (Audio Cache Hit), preserving computational overhead and network bandwidth. If external synthesis services encounter prolonged outages, the system sets an operational error flag, automatically arming client-side Web Speech API fallback on the visitor's mobile browser.

## 5. Curatorial Review, Linguistic Refinement & Publishing Workflow

To ensure uncompromised accuracy regarding historical, cultural, and scholarly contexts of the resistance war, the Curatorial Review, Linguistic Refinement & Publishing Workflow acts as a mandatory operational checkpoint before content is released to the public. Curators access a dedicated management view with filters by language or exhibit, preview the synthesized audio guides, and inspect translated terminology. If linguistic inaccuracies or sensitive historical terms are detected, the Curator edits the text; this action immediately marks the corresponding audio file as "Pending Update" and requires audio regeneration matching the exact language code. Only translations and voice files explicitly marked as "Approved & Published" by the Curator are synchronized to the visitor-facing application.

## 6. Online Payment & Visiting Session Activation Workflow

From a monetization and content protection perspective, the Online Payment & Visiting Session Activation Workflow serves as the gateway for digital revenue and copyright protection:

* Visitors access the responsive web application via their smartphone mobile browser (requiring no application download) and select their preferred language. In the initial state, visitors can only view the overview list, map locations, and brief preview teasers; in-depth scholarly narratives and audio narrations remain securely locked.
* When visitors choose to unlock the tour, the system displays the single fixed admission price and offers flexible digital payment methods: domestic VietQR scanning for local visitors or credit/debit card entry for international tourists via a secure payment gateway (PayOS / Stripe).
* Upon receiving automated payment confirmation via Webhook from the payment gateway, the system immediately provisions an active Visiting Session valid for 24 hours, issues a unique Session Code (allowing visitors to seamlessly restore their access if they switch devices or refresh browsers), and decrypts full narrative content and audio guide streaming permissions.

## 7. GPS Proximity-Triggered Tour & Smart Map Navigation Journey

On the on-site frontline, the GPS Proximity-Triggered Tour & Smart Map Navigation Journey delivers a seamless visitor experience across the vast outdoor terrain:

* As visitors explore the heritage grounds with their active session, their mobile device continuously evaluates real-time location. As soon as the visitor enters the GPS Geofence Radius (30 meters) of an exhibit (e.g., hidden trapdoors, field hospitals, command bunkers, artillery displays), the system automatically detects proximity and triggers the corresponding voice narration in their chosen language without requiring manual search or clicking.
* Visitors can also interact directly with the digital map, selecting any exhibit to preview. The visitor's current GPS location marker is visually rendered on the Interactive Map, and the system automatically calculates and displays an intelligent Recommended Walking Route to guide them sequentially toward adjacent exhibits, eliminating crowding and disjointed wandering.

## 8. Visitor Telemetry & Infrastructure Health Monitoring Subsystems

At the executive operational tier, the Visitor Telemetry & Infrastructure Health Monitoring Subsystems provide continuous operational intelligence:

* **Visitor Telemetry & Spatial Analytics:** Administrators monitor real-time visitor density heatmaps, track hourly GPS proximity trigger trends across exhibits, identify top-ranked attractions alongside average dwell times, and analyze language demographic distributions among visitors.
* **Infrastructure Health Monitoring:** The system continuously tracks network latency, mobile streaming throughput, audio cache disk consumption (triggering automated warnings when storage exceeds 85%), database query performance, and external AI service availability. Administrators can enable live auto-refresh or export aggregated operational logs to CSV or JSON formats for institutional archival and auditing.

## 9. Core Business Workflow Summary (B1 → B5)

* **B1 – Platform Setup, Access Governance & Admission Pricing:** Administrators configure fixed admission pricing, museum site boundaries, target language suites, and staff access privileges → Personnel log into the operational portal according to designated privilege tiers (Admin / Curator / Staff).
* **B2 – Exhibit Cataloging, GPS Geofencing & Automated AI Pipeline:** Staff input exhibit metadata (source language: Vietnamese), upload media, and configure GPS coordinates with geofence trigger radii on the digital map → System triggers automated background processing: Multilingual translation across target languages with retry logic → Neural voice synthesis and audio caching utilizing text-hash validation.
* **B3 – Curatorial Review & Content Publishing:** Curators preview audio, refine scholarly terminology, and approve content for publication → System publishes verified content, ready for real-time synchronization to mobile visitors.
* **B4 – Digital Admission Payment & 24-Hour Visiting Session Activation:** Visitors open the mobile web application, choose their native language, and select "Unlock Tour" → Payment is processed via VietQR or International Card → System verifies transaction via Webhook, activates a 24-hour Visiting Session, issues a Session Code for session recovery, and unlocks all narrative content and audio streaming.
* **B5 – GPS Geofence-Triggered Tour, Map Navigation & Operational Monitoring:** Visitors explore the museum grounds → Voice guide is automatically triggered upon entering an exhibit's GPS Geofence Radius or selecting on the digital map → Interactive map updates current waypoint and plots recommended walking routes → Administrative tier aggregates visitor density heatmaps, dwell times, monitors storage health (>85% alert), and exports operational reports.

---

# Detailed System Business Requirements & User Story Specifications

## Theme 1: System Governance, Security & Access Control

### Epic 01: Identity Authentication & Role-Based Access Control

#### User Story 02.1: Role-Based System Login (Role-Based Login)

* **Description:** As a Staff member or Administrator (Admin / Curator / Staff), I need to log into the Administrative Portal using my Username and Password so that the system authenticates my identity and routes me directly to my role-specific workspace.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Enables the user to input Username and Password. Upon clicking "Sign In", the system processes the authentication request in real time with a response latency < 1 second.
* Submitted passwords are authenticated against one-way cryptographic hashes using industry standards (Bcrypt cost factor ≥ 12 or Argon2id) stored in the database. Plaintext passwords must never be stored, cached, or logged.
* Upon valid credentials, the system establishes a secure session (JWT token transmitted via HttpOnly, SameSite=Strict cookie with a 60-minute lifespan) and routes to the proper workspace: Admin to the Global Dashboard, Curator to Translation & Audio Management, and Staff to Exhibit Cataloging.
* If credentials fail, the system renders a generic error message: "Invalid username or password", retaining the entered username while clearing the password field to prevent user enumeration attacks.

**Task List:**

* Task 02.1.1 (Backend): Develop /api/v1/auth/login endpoint verifying Bcrypt hashed passwords, issuing JWT tokens with role claims, and attaching secure HttpOnly cookies.
* Task 02.1.2 (Frontend): Build a responsive Admin Login page, handle authentication state persistence, and configure route guards based on user roles.
* Task 02.1.3 (Database): Construct users table, generating database indexes on username and email columns for rapid authentication queries.

#### User Story 02.2: Brute-Force Protection & Account Lockout (Account Lockout)

* **Description:** As a System Administrator, I need the system to automatically lock admin accounts upon consecutive failed login attempts to safeguard against automated brute-force credential stuffing.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* The system tracks consecutive failed login attempts per account.
* If an account incurs 5 consecutive failed attempts, the system automatically locks the account for 15 minutes, rejecting subsequent login requests and displaying: "Account temporarily locked due to 5 failed attempts. Please retry after 15 minutes."
* All failed attempts and lockout events are automatically logged into system security audit trails with client IP addresses and timestamps.

**Task List:**

* Task 02.2.1 (Backend): Implement rate-limiting middleware tracking failed attempts (using Redis or database fields) and enforce lockout thresholds.
* Task 02.2.2 (Frontend): Catch HTTP 423 (Locked) responses and present a countdown lockout alert modal.
* Task 02.2.3 (Database): Add failed_attempts, locked_until, and is_active fields to users table, and design the login_audit_logs table.

#### User Story 02.3: Secure Session Management & Logout (Session Management & Logout)

* **Description:** As an Administrative Portal User, I need my session to automatically expire during inactivity and have the ability to explicitly log out to revoke active access tokens, ensuring security on shared workstations.
* **Priority:** Should have
* **Story Point:** 2

**Acceptance Criteria:**

* Sessions automatically expire after 60 minutes or after 30 minutes of continuous user inactivity.
* Clicking "Log Out" clears session cookies, revokes the token server-side, and immediately redirects the user to the Login screen.

**Task List:**

* Task 02.3.1 (Backend): Construct /api/v1/auth/logout endpoint that purges authentication cookies and blacklists active tokens.
* Task 02.3.2 (Frontend): Implement a Logout action button on the administrative navigation header, wiping all local user states upon exit.

## Theme 2: Exhibit Cataloging & Spatial Positioning

### Epic 02: Exhibit & POI Catalog Management

#### User Story 03.1: Create Digitized Exhibit Profile (Create New POI)

* **Description:** As Museum Staff, I need to create a new exhibit profile with Vietnamese title, teaser preview, primary Vietnamese narration, floor/zone level, and cover photos to digitize historical artifacts for public visitors.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Provides an input form for: Vietnamese Title (title_vi), Pre-unlock Teaser (short_description_vi), Full Narrative (description_vi), Floor/Zone level (floor), and Cover Image upload (image_url).
* Input validation: Required title and description fields must not be empty; uploaded images must strictly be JPG/PNG/WebP formats under 5MB.
* Upon clicking "Save", the system creates a database record with translation_status = 'PENDING' and dispatches asynchronous background jobs for translation and audio synthesis.

**Task List:**

* Task 03.1.1 (Backend): Develop POST /api/v1/admin/pois endpoint accepting multipart form-data, persisting exhibit metadata, and saving images to /static/images.
* Task 03.1.2 (Frontend): Build POI creation form with rich text editors, image previewers, and client-side validation rules.
* Task 03.1.3 (Database): Construct pois table with constraints and timestamp fields (created_at, updated_at).

#### User Story 03.2: Interactive GPS Geolocation & Geofence Calibration (GPS Geofence Calibration)

* **Description:** As Museum Staff, I need to visually pin or drag an exhibit's GPS coordinates across an interactive map (or manually input latitude and longitude) and calibrate a proximity trigger radius, so that the system automatically detects visitors approaching the physical exhibit.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Renders an interactive map (OpenStreetMap / Leaflet) allowing staff to click or drag a marker to designate geographical coordinates.
* Latitude and longitude fields update dynamically as the map marker moves, and vice versa.
* Staff can configure a proximity geofence radius (default: 30 meters; allowable range: 10m to 50m). The map renders a circular boundary (L.circle) representing the detection zone.
* Boundary validation: If coordinates fall outside the Cu Chi Tunnels museum perimeter boundary, the system displays a boundary error notification and prevents submission.

**Task List:**

* Task 03.2.1 (Backend): Implement geographical bounding box validation and update endpoints for coordinates and radius_meters.
* Task 03.2.2 (Frontend): Integrate Leaflet map picker in the admin view, supporting pin drag events and dynamic L.circle rendering synchronized with numeric radius inputs.

#### User Story 03.3: Delete Exhibit with Cascade Purging & Route Cache Invalidation (Cascade Purge & Cache Invalidation)

* **Description:** As an Administrator, I need to remove decommissioned exhibits, and have the system cleanly purge all associated translation records, audio files, and cached navigation paths to maintain database integrity and release storage.
* **Priority:** Should have
* **Story Point:** 3

**Acceptance Criteria:**

* Clicking "Delete" prompts a confirmation dialog: "Are you sure you want to delete this exhibit and its associated audio/translation files?"
* Upon confirmation, deleting the record from pois automatically cascades deletions across poi_translations and poi_audios via foreign-key constraints (ON DELETE CASCADE).
* Associated .mp3 audio files and cover image files are unlinked and purged from the server's local file storage.
* The system invalidates existing route calculation caches so that visitor navigation paths compute fresh waypoints immediately.

**Task List:**

* Task 03.3.1 (Backend): Implement DELETE /api/v1/admin/pois/{id} with file system unlinking utilities and route cache invalidation logic.
* Task 03.3.2 (Frontend): Add confirmation modals and table auto-refresh upon successful deletion.
* Task 03.3.3 (Database): Configure foreign keys on poi_translations and poi_audios with ON DELETE CASCADE.

## Theme 3: Multilingual Curatorial Review & Content Publishing

### Epic 03: Curatorial Review, Linguistic Curation & Publishing

#### User Story 04.1: Multilingual Translation Audit & Historical Terminology Refinement (Review & Filter Translations)

* **Description:** As a Curator, I need to inspect machine translations across target languages (en, ja, ko, zh) with multi-criteria filters, and edit historical terms so that international visitors receive culturally and scholarly accurate descriptions.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Displays translations in a structured data table with POI name, target language, preview text, and publication status (Pending, Needs Update, Published).
* Supports instant filtering by target language code, exhibit name, and approval status.
* Curators can edit translated titles and descriptions. Saving modifications automatically marks the audio guide status as "Needs Update" to avoid desynchronization between text and voice.

**Task List:**

* Task 04.1.1 (Backend): Build GET /api/v1/admin/translations supporting filter query parameters and PUT /api/v1/admin/translations/{id} for text updates.
* Task 04.1.2 (Frontend): Develop translation management data tables with multi-filter dropdowns and inline editing forms.

#### User Story 04.2: Audio Guide Preview & Dynamic Voice Re-generation (Audio Preview & TTS Re-synthesis)

* **Description:** As a Curator, I need to preview synthesized audio narrations and trigger re-synthesis via Neural TTS on demand, ensuring natural pronunciation and vocal cadence.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* Embeds an audio player inside the curatorial review view allowing instant playback of the .mp3 file for each language.
* Provides a "Regenerate Audio Guide" action: invoking the Microsoft Edge Neural TTS service to synthesize a new audio file matching the revised text string.
* If external TTS synthesis fails, displays an explanatory error message: "Unable to generate Audio Guide, please try again later" and retains current data without crashing.

**Task List:**

* Task 04.2.1 (Backend): Develop POST /api/v1/admin/translations/{id}/regenerate-audio invoking the edge-tts service.
* Task 04.2.2 (Frontend): Embed responsive audio preview players and attach loading state spinners to the regeneration action button.

#### User Story 04.3: Curatorial Approval & Live Mobile App Synchronization (Approve & Publish)

* **Description:** As a Curator, I need to grant final publication approval (Published) to verified translations and audio files so that they are immediately synchronized to the visitor mobile web application.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* The "Approve & Publish" button is enabled only when both valid translated text and a synthesized audio file are present.
* Clicking "Approve & Publish" updates the record status to Published in poi_translations and poi_audios.
* Content changes take effect in real time, making verified narratives and audio available on the visitor mobile web client.

**Task List:**

* Task 04.3.1 (Backend): Build POST /api/v1/admin/translations/{id}/publish updating database status flags and invalidating visitor content caches.
* Task 04.3.2 (Frontend): Update curatorial status badges to Published with reactive UI state changes.

## Theme 4: Visitor Services, Digital Payment & On-Site Navigation

### Epic 04: Digital Admission Payment & Tour Session Activation

#### User Story 06.1: Frictionless Digital Admission Checkout via VietQR & International Cards (Digital Tour Admission Payment)

* **Description:** As a Visitor, I want to purchase an all-inclusive digital tour pass via domestic VietQR or international credit/debit card, so that I can instantly unlock full exhibit narratives and audio guides without queuing at ticketing booths.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Selecting "Unlock Audio Guide Service" presents the single fixed admission price and two payment options: Domestic VietQR and International Credit/Debit Card.
* Selecting VietQR generates a dynamic VietQR code with order payload for domestic banking apps.
* Selecting Card routes the visitor to a secure, PCI-DSS compliant payment gateway form (PayOS / Stripe).

**Task List:**

* Task 06.1.1 (Backend): Integrate PayOS / Stripe SDKs; develop POST /api/v1/payments/create-checkout returning payment URLs and QR payloads.
* Task 06.1.2 (Frontend): Build a mobile-first checkout modal displaying dynamic QR codes and gateway redirects.
* Task 06.1.3 (Database): Construct transactions table recording transaction_id, amount, payment_method, and status.

#### User Story 06.2: Webhook-Driven 24-Hour Visiting Session Activation (24-Hour Visiting Session Activation)

* **Description:** As the System, I need to process automated payment Webhook confirmations to activate a 24-hour Visiting Session, issuing a unique Session Code and unlocking all audio guide streaming permissions.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Verifies the cryptographic signature of incoming Webhooks from PayOS / Stripe to prevent tampering.
* Updates transaction status to PAID and provisions a new VisitingSession valid for exactly 24 hours (expires_at = now() + 24 hours).
* Issues a unique, cryptographically secure Session Code, stores the session token in the visitor's mobile localStorage, and unlocks all audio streaming buttons.

**Task List:**

* Task 06.2.1 (Backend): Construct POST /api/v1/payments/webhook handling signature verification and atomic session activation.
* Task 06.2.2 (Frontend): Implement VisitorSessionContext to listen for payment confirmation, store session tokens, and refresh UI unlock states.
* Task 06.2.3 (Database): Construct visiting_sessions table with session_code, device_fingerprint, and expires_at.

#### User Story 06.3: Multi-Device Session Recovery via Session Code (Restore Visiting Session)

* **Description:** As a Visitor, I want to use my Session Code to restore my active tour session if I switch devices, open an incognito tab, or refresh my browser, avoiding redundant pass purchases.
* **Priority:** Should have
* **Story Point:** 3

**Acceptance Criteria:**

* Provides a "Restore Tour Session" option on the unlock screen.
* Entering a valid, unexpired Session Code restores access and displays remaining session validity time.
* If the code does not exist or has exceeded 24 hours, the system rejects restoration with: "Session code is invalid or has expired."

**Task List:**

* Task 06.3.1 (Backend): Develop POST /api/v1/sessions/restore validating code existence and expiration timestamps.
* Task 06.3.2 (Frontend): Build Session Code restoration modal dialog with clear validation error handling.

#### User Story 06.4: Content Protection & Narrative/Audio Decryption Access Control (Content Protection & Streaming Authorization)

* **Description:** As a Museum Administrator, I need in-depth narratives and audio streams to remain strictly locked for unauthenticated visitors, protecting digitized cultural intellectual property and securing digital revenue.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Pre-payment visitors can only access exhibit titles, thumbnail photos, and teaser preview snippets (short_description).
* Full historical narratives and audio play buttons are locked with visual padlock indicators.
* Audio streaming endpoints (/api/v1/audio/{poi_id}) enforce valid session token authorization, rejecting unauthorized requests with HTTP 403 Forbidden.

**Task List:**

* Task 06.4.1 (Backend): Enforce JWT/Session token validation middleware on audio streaming and full-content endpoints.
* Task 06.4.2 (Frontend): Implement conditional rendering locking full narratives and audio controls when no valid session is present.

### Epic 05: Interactive Map, GPS Geofencing & Smart Wayfinding

#### User Story 01.1: Interactive Outdoor Map & Real-time GPS Position (Interactive Map & Real-time GPS Position)

* **Description:** As a Visitor, I want to view an interactive digital map of the Cu Chi Tunnels grounds displaying my real-time GPS position marker, so that I can orient myself effortlessly across the outdoor complex.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Requests HTML5 browser geolocation permissions on mobile devices upon opening the map.
* Renders the visitor's live GPS coordinates as a distinct animated location marker alongside POI markers on OpenStreetMap.
* Supports fluid pinch-to-zoom and pan gestures.
* If GPS is disabled or coordinates fall outside the museum grounds (>30m), notifies the visitor and centers the map view at the Main Entrance by default.

**Task List:**

* Task 01.1.1 (Frontend): Integrate Leaflet/OpenStreetMap inside OutdoorMapView.jsx, using navigator.geolocation.watchPosition.
* Task 01.1.2 (Frontend): Build fallback default centering at Main Entrance when geolocation permission is denied.

#### User Story 01.2: Tap Map Marker for Teaser Preview Card (POI Preview Card)

* **Description:** As a Visitor, I want to tap any exhibit marker on the map to inspect teaser photos and brief summaries before heading over.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* Tapping an exhibit marker highlights the pin and slides up a Bottom Preview Card.
* Card displays: thumbnail image, exhibit title, short teaser description, an "Audio Guide" button, and a "Directions" button.
* Tapping "Audio Guide" redirects the visitor to the audio player screen for that exhibit. Tapping empty map space dismisses the card.

**Task List:**

* Task 01.2.1 (Frontend): Develop PoiPreviewCard.jsx with mobile slide-up bottom sheet animations.
* Task 01.2.2 (Frontend): Wire navigation click handlers connecting preview cards to the audio player route.

#### User Story 01.3: Automated Voice Narration on GPS Proximity (GPS Geofence Proximity Trigger)

* **Description:** As a Visitor with an active session, I want the audio guide in my selected language to automatically start playing when I walk within 30 meters of an exhibit, allowing hands-free historical immersion.
* **Priority:** Must have
* **Story Point:** 8

**Acceptance Criteria:**

* Continuously computes the distance between the visitor's live GPS coordinates and all exhibit coordinates using the Haversine formula.
* When the visitor enters an exhibit's configured geofence radius (default 30m), the system automatically triggers audio playback in the visitor's chosen language.
* Implements a cooldown trigger lock (debounce): avoids re-triggering the same exhibit narration within 10 minutes unless manually initiated by the visitor.
* If the mobile network fails to stream the .mp3 file, automatically arms client-side Web Speech API fallback on the mobile browser.

**Task List:**

* Task 01.3.1 (Frontend): Implement GeofenceDetectionService.js calculating distances and handling proximity threshold events.
* Task 01.3.2 (Frontend): Connect proximity events to the audio player controller with cooldown logic and Web Speech fallback.

#### User Story 01.4: Intelligent Recommended Walking Route (Recommended Walking Route Calculation)

* **Description:** As a Visitor, I want an intelligent recommended route guiding me sequentially to adjacent exhibits so that I can explore without getting lost or backtracking.
* **Priority:** Should have
* **Story Point:** 5

**Acceptance Criteria:**

* Selecting "Directions" on a POI card calculates the walking path from the visitor's current GPS location to the target POI.
* Renders a prominent polyline route overlay connecting start and destination points on the map.
* Displays the estimated walking distance in meters.
* Provides a "Clear Route" button to remove the path overlay and return to standard map exploration.

**Task List:**

* Task 01.4.1 (Frontend/Backend): Implement waypoint path calculation routines based on outdoor trail nodes.
* Task 01.4.2 (Frontend): Render animated dashed L.polyline route layers and distance info banners on the Leaflet map.

## Theme 5: Operational Analytics, Field Telemetry & System Health

### Epic 06: Operational Telemetry & Infrastructure Health Monitoring

#### User Story 05.1: Real-time Visitor Density Heatmap (Real-time Visitor Density Heatmap)

* **Description:** As an Operations Manager, I need to view real-time visitor density heatmaps across museum grounds to identify crowded zones and deploy staff accordingly.
* **Priority:** Should have
* **Story Point:** 5

**Acceptance Criteria:**

* The analytics dashboard renders a visual heatmap layer (Leaflet.heat) overlaid on the Cu Chi Tunnels site map.
* Heatmap gradient reflects visitor concentration derived from recent GPS telemetry pings (green = low density, red/orange = high congestion).
* Allows filtering heatmap data by preset time ranges (Today, Past 7 Days, Peak Hours).

**Task List:**

* Task 05.1.1 (Backend): Develop GET /api/v1/admin/analytics/heatmap aggregating telemetry coordinates within specified time windows.
* Task 05.1.2 (Frontend): Integrate leaflet.heat plugin on the admin dashboard with smooth re-rendering capabilities.

#### User Story 05.2: Exhibit Ranking, Dwell Times & Language Demographics (Top POIs, Dwell Time & Language Demographics)

* **Description:** As an Administrator, I need statistical rankings of top-visited exhibits, average dwell times, and language breakdowns to evaluate exhibition impact.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Renders bar charts ranking Top 10 most visited POIs based on proximity trigger counts.
* Calculates and displays average visitor dwell time (in minutes) within each exhibit's geofence boundary.
* Displays pie charts breaking down visitor language distributions (vi, en, ja, ko, zh).

**Task List:**

* Task 05.2.1 (Backend): Develop GET /api/v1/admin/analytics/summary aggregating trigger events, session timestamps, and language codes.
* Task 05.2.2 (Frontend): Build analytics dashboard charts using Recharts or Chart.js for rankings and demographic distributions.

#### User Story 05.3: Static Audio Storage Capacity Alert Thresholds (>85%) (Audio Cache Storage Threshold Warning)

* **Description:** As a System Administrator, I need automated alerts when static audio cache disk consumption exceeds 85% capacity, prompting timely pruning or storage expansion.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* Monitors disk usage of the server partition holding /static/audio.
* Flags status as WARNING (yellow) at ≥ 85% and CRITICAL (red) at ≥ 95%.
* Triggers dashboard warning banners: "Audio cache capacity exceeds 85%. Please prune orphaned files or expand storage quota."

**Task List:**

* Task 05.3.1 (Backend): Use Python's shutil.disk_usage to compute disk space percentages inside GET /api/v1/admin/system/health.
* Task 05.3.2 (Frontend): Create dynamic visual storage progress bars changing color based on utilization percentages.

#### User Story 05.4: Telemetry Filtering & Structured Data Export (Telemetry Filtering & Data Export)

* **Description:** As an Administrator, I need to filter telemetry datasets by date ranges and export reports to CSV or JSON formats for archival and institutional reporting.
* **Priority:** Should have
* **Story Point:** 3

**Acceptance Criteria:**

* Date filtering: Today, Last 7 Days, Last 30 Days, or custom Start Date - End Date.
* Provides an "Export Report" button downloading structured .csv or .json files.
* Output files include: Date, Exhibit Name, Trigger Count, Language Code, and Average Duration.

**Task List:**

* Task 05.4.1 (Backend): Build GET /api/v1/admin/analytics/export streaming file downloads.
* Task 05.4.2 (Frontend): Add Date Range Pickers and download buttons to the analytics toolbar.
