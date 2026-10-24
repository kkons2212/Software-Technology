# Project Overview & Architecture
## 1. Tech Stack

### Frontend & Client
* **Framework:** React.js (Mobile-first Web Application / PWA)
* **Interactive Mapping:** OpenStreetMap.js (Leaflet / MapLibre GL integration)

### Backend & API
* **Framework:** Python FastAPI (Structured using 3-Layer Architecture: Router -> Service -> Repository)
* **Database:** MYSQL 8.0 / SQLALCHEMY

### AI Services & Media Pipeline
* **Text Translation:** `deep-translator` / Google Translate API integration
* **Text-to-Speech (TTS):** Python `edge-tts` library (Pre-rendered and cached MP3 static files)

### Infrastructure & Deployment
* **Containerization:** Docker & Docker Compose (`kocoten/smart-museum-db:v1`)
* **Storage & Caching:** Local Static File Server / Caching for pre-generated audio

---

# 2 Business Requirements Analysis: Cu Chi Tunnels Smart Multilingual Guide

## 1. Business Context & Vision

The Smart Museum System operates as a multidimensional digital interaction network designed around two primary human actors: **Museum Visitors** who consume digitized cultural heritage services via mobile devices, and **Museum Administrators** who manage exhibits, spatial coordinates, multilingual translations, voice narration assets, and system telemetry. The system supports multiple Administrator accounts to allow collaborative management across the museum's administrative team. All human operations are supported by an automated AI, Payment & Telemetry Infrastructure (VietQR / International Card Payment Gateway, Automated Translation Services, Neural Voice TTS Engine, Interactive Digital Mapping Platform, and Telemetry Logging Module) ensuring an automated end-to-end operational pipeline.

The central mission of the system is to transform static physical artifacts, heritage grounds, underground tunnel complexes, and scholarly historical documentation of the Cu Chi Tunnels Historical Site into vibrant, intuitive, and multilingual digital journeys. It commercializes digital services through frictionless online admission payments and time-limited visiting sessions, automatically triggers intelligent voice narrations based on outdoor GPS geofencing and interactive map navigation, coordinates optimal walking routes through historical waypoints, automates AI translation and neural voice dubbing workflows, and delivers real-time operational telemetry to empower business decision-making and facility governance.

## 2. Platform Setup, Administrative Access Governance & Admission Pricing

The business journey initiates with platform configuration, service pricing, and administrative account governance. The system supports multiple Administrator accounts to enable collaborative management by the museum's administrative team. Administrators configure foundational operating parameters (fixed digital tour admission pricing, target supported languages, museum geographical site boundaries, infrastructure storage alert thresholds), while managing administrative credentials:

* **Multiple Administrators:** The system supports multiple concurrent Administrator accounts. Each Administrator has full operational authority across the administrative portal: creating and updating exhibit profiles, calibrating GPS geofence boundaries, reviewing and refining machine translations, regenerating neural audio guides, publishing approved content, and monitoring facility telemetry.
* **Security & Account Governance:** All administrator accounts are secured by industry-standard one-way cryptographic hashing (Bcrypt cost factor ≥ 12 or Argon2id), an anti-brute-force rate limiter (automatic 15-minute account lockout upon 5 consecutive failed login attempts), and secure session tokens (JWT transmitted via HttpOnly, SameSite=Strict cookies) with an automatic 30-minute idle timeout and a maximum lifetime of 60 minutes.

## 3. Exhibit Cataloging, Content Editing & GPS Geofence Positioning Workflow

Whenever new exhibits are introduced or outdoor zones are reconfigured, an Administrator initiates the Exhibit Cataloging, Content Editing & GPS Geofence Positioning Workflow. The Administrator enters core identification metadata: title, pre-payment preview teaser description, full detailed narrative in the source language (Vietnamese), and high-resolution imagery. Crucially, the Administrator calibrates the precise spatial positioning of the outdoor exhibit by clicking or dragging a pin across the interactive map (or manually inputting latitude and longitude), while configuring a proximity geofence radius (e.g., default 30 meters) to facilitate automatic visitor detection. The system validates all inputs: coordinates must reside strictly within museum perimeter boundaries, and media formats must comply before persisting records to the central database and refreshing navigation routing caches. If an exhibit is decommissioned or temporarily closed, an Administrator can deactivate or hide the exhibit (toggling its active status to inactive), which immediately excludes it from visitor-facing maps, proximity triggers, and route calculations while preserving all translation assets, audio files, and historical telemetry logs.

## 4. Automated Multilingual Translation & AI Voice Synthesis Pipeline

Immediately following POI creation or primary description updates, the backend triggers the Automated Multilingual Translation & AI Voice Synthesis Pipeline in the background:

* **Automated AI Translation:** The system extracts the source Vietnamese text and dispatches asynchronous translation requests across configured target languages (English, Japanese, Korean, Chinese). An exponential backoff retry mechanism (up to 3 attempts) is executed individually per language to overcome transient network drops.
* **AI Voice Synthesis & Intelligent Audio Caching:** Following translation completion, localized text strings are forwarded to the Microsoft Edge Neural TTS voice engine to synthesize high-fidelity .mp3 narration files. An intelligent content hashing rule (Text Hashing) compares the hash of the text against stored cache records: if the text remains unchanged, existing cached audio is reused (Audio Cache Hit), preserving computational overhead and network bandwidth. If external synthesis services encounter prolonged outages, the system sets an operational error flag, automatically arming client-side Web Speech API fallback on the visitor's mobile browser.

## 5. Multilingual Review, Linguistic Refinement & Publishing Workflow

To ensure uncompromised accuracy regarding historical, cultural, and scholarly contexts of the resistance war, the Multilingual Review, Linguistic Refinement & Publishing Workflow acts as a mandatory operational checkpoint before content is released to the public. Administrators access a dedicated translation management interface with filters by language or exhibit, preview the synthesized audio guides, and inspect translated terminology. If linguistic inaccuracies or sensitive historical terms are detected, an Administrator edits the text; this action immediately marks the corresponding audio file as "Needs Update" and requires audio regeneration matching the exact language code. Only translations and voice files explicitly marked as "Approved & Published" by an Administrator are synchronized to the visitor-facing application.

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

* **B1 – Platform Setup, Administrative Governance & Admission Pricing:** Administrators configure fixed admission pricing, museum site boundaries, target language suites, and manage administrative credentials → Multiple Administrators log into the unified administrative portal.
* **B2 – Exhibit Cataloging, GPS Geofencing & Automated AI Pipeline:** An Administrator inputs exhibit metadata (source language: Vietnamese), uploads media, and configures GPS coordinates with geofence trigger radii on the digital map → System triggers automated background processing: Multilingual translation across target languages with retry logic → Neural voice synthesis and audio caching utilizing text-hash validation.
* **B3 – Multilingual Content Review & Publishing:** Administrators preview audio, refine scholarly terminology, and approve content for publication → System publishes verified content, ready for real-time synchronization to mobile visitors.
* **B4 – Digital Admission Payment & 24-Hour Visiting Session Activation:** Visitors open the mobile web application, choose their native language, and select "Unlock Tour" → Payment is processed via VietQR or International Card → System verifies transaction via Webhook, activates a 24-hour Visiting Session, issues a Session Code for session recovery, and unlocks all narrative content and audio streaming.
* **B5 – GPS Geofence-Triggered Tour, Map Navigation & Operational Monitoring:** Visitors explore the museum grounds → Voice guide is automatically triggered upon entering an exhibit's GPS Geofence Radius or selecting on the digital map → Interactive map updates current waypoint and plots recommended walking routes → Administrative tier aggregates visitor density heatmaps, dwell times, monitors storage health (>85% alert), and exports operational reports.

---

# Detailed System Business Requirements & User Story Specifications

> [!TIP]
> **Complete Engineering Task Breakdown & Matrix:**
> For the standalone engineering Work Breakdown Structure (WBS), including layer assignments (Backend, Frontend, Database, DevOps), Story Points, priority rankings, interactive task checklists, and 1-to-1 Unit Test Definition of Done mappings, refer to [tasks.md].

## Theme 1: System Governance, Security & Access Control

### Epic 01: Administrative Authentication & Session Security

#### User Story 02.1: Administrator Authentication & Portal Login (Administrator Login)

* **Description:** As an Administrator, I need to log into the Administrative Portal using my Username/Email and Password so that the system authenticates my identity, establishes a secure session, and grants access to all administrative management modules.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* The system supports multiple Administrator accounts with unique credentials.
* Enables an Administrator to input Username/Email and Password. Upon clicking "Sign In", the system processes the authentication request in real time with a response latency < 1 second.
* Submitted passwords are authenticated against one-way cryptographic hashes using industry standards (Bcrypt cost factor ≥ 12 or Argon2id) stored in the database. Plaintext passwords must never be stored, cached, or logged.
* Upon valid credentials, the system establishes a secure session (JWT token transmitted via HttpOnly, SameSite=Strict cookie with a 60-minute lifespan and 30-minute idle timeout) and routes the Administrator to the unified Administrative Workspace (providing access to Exhibit Cataloging, Multilingual Curation, and Telemetry Dashboard).
* If credentials fail, the system renders a generic error message: "Invalid username or password", retaining the entered username while clearing the password field to prevent user enumeration attacks.

#### User Story 02.2: Brute-Force Protection & Account Lockout (Account Lockout)

* **Description:** As an Administrator, I need the system to automatically lock admin accounts upon consecutive failed login attempts to safeguard against automated brute-force credential stuffing.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* The system tracks consecutive failed login attempts per account.
* If an account incurs 5 consecutive failed attempts, the system automatically locks the account for 15 minutes, rejecting subsequent login requests and displaying: "Account temporarily locked due to 5 failed attempts. Please retry after 15 minutes."
* All failed attempts and lockout events are automatically logged into system security audit trails with client IP addresses and timestamps.

#### User Story 02.3: Secure Session Management & Logout (Session Management & Logout)

* **Description:** As an Administrator, I need my session to automatically expire during inactivity and have the ability to explicitly log out to revoke active access tokens, ensuring security on administrative workstations.
* **Priority:** Should have
* **Story Point:** 2

**Acceptance Criteria:**

* Sessions automatically expire after 60 minutes or after 30 minutes of continuous user inactivity.
* Clicking "Log Out" clears session cookies, revokes the token server-side, and immediately redirects the user to the Login screen.

## Theme 2: Exhibit Cataloging & Spatial Positioning

### Epic 02: Exhibit & POI Catalog Management

#### User Story 03.1: Create Digitized Exhibit Profile (Create New POI)

* **Description:** As an Administrator, I need to create a new exhibit profile with Vietnamese title, teaser preview, primary Vietnamese narration, outdoor zone, and cover photos to digitize historical artifacts for public visitors.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Provides an input form for: Vietnamese Title (title_vi), Pre-unlock Teaser (short_description_vi), Full Narrative (description_vi) and Cover Image upload (image_url).
* Input validation: Required title and description fields must not be empty; uploaded images must strictly be JPG/PNG/WebP formats under 5MB.
* Upon clicking "Save", the system creates a database record with translation_status = 'PENDING' and dispatches asynchronous background jobs for translation and audio synthesis.

#### User Story 03.2: Interactive GPS Geolocation & Geofence Calibration (GPS Geofence Calibration)

* **Description:** As an Administrator, I need to visually pin or drag an exhibit's GPS coordinates across an interactive map (or manually input latitude and longitude) and calibrate a proximity trigger radius, so that the system automatically detects visitors approaching the physical exhibit.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Renders an interactive map (OpenStreetMap / Leaflet) allowing the Administrator to click or drag a marker to designate geographical coordinates.
* Latitude and longitude fields update dynamically as the map marker moves, and vice versa.
* The Administrator can configure a proximity geofence radius (default: 30 meters; allowable range: 10m to 50m). The map renders a circular boundary (L.circle) representing the detection zone.
* Boundary validation: If coordinates fall outside the Cu Chi Tunnels museum perimeter boundary, the system displays a boundary error notification and prevents submission.

#### User Story 03.3: Deactivate / Hide Exhibit & Invalidate Navigation Route Cache (Exhibit Visibility Toggle & Route Invalidation)

* **Description:** As an Administrator, I need to deactivate or hide decommissioned or temporarily closed exhibits, so that the system immediately removes them from visitor maps, proximity triggers, and wayfinding routes without losing historical translation records or telemetry data.
* **Priority:** Should have
* **Story Point:** 3

**Acceptance Criteria:**

* Provides a visibility toggle switch or "Hide / Deactivate Exhibit" action in the POI management view.
* Clicking "Deactivate / Hide" prompts a confirmation dialog: "Are you sure you want to hide this exhibit from visitor maps and active tour routes?"
* Upon confirmation, the system updates the exhibit's visibility status (`is_active = FALSE`) in the database.
* Deactivated exhibits are immediately filtered out from all visitor-facing endpoints: their markers disappear from the outdoor interactive map, automated GPS geofence triggers are disabled, and audio streaming becomes inaccessible to visitors.
* The system automatically invalidates existing route calculation caches so that visitor navigation paths compute fresh waypoints immediately without routing through the hidden POI.
* All underlying translation records, synthesized audio files, media assets, and historical telemetry audit logs remain preserved in the database for administrative auditing or future re-activation.

#### User Story 03.4: Update Exhibit Details & Synchronize Translation Status (Update POI)

* **Description:** As an Administrator, I need to edit an existing exhibit's details (title, preview summary, narrative description, spatial coordinates, trigger radius, or cover photo), and have the system automatically flag affected translation records as "Needs Update" to ensure audio-text synchronization.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* Provides an "Edit Exhibit" action within the POI management table opening a pre-populated edit form.
* The Administrator can update: Vietnamese Title (`title_vi`), Pre-unlock Teaser (`short_description_vi`), Full Narrative (`description_vi`), Cover Photo upload, GPS Coordinates (`latitude`, `longitude`), and Trigger Radius (`radius` from 10m to 50m).
* Coordinate and radius updates dynamically synchronize with the interactive Leaflet map picker (`AdminMapPicker.jsx`).
* Coordinates are validated against the Cu Chi Tunnels perimeter bounding box.
* Modifying narrative descriptions automatically updates the status of all associated translation records (`POITranslation.status = 'NEEDS_UPDATE'`) and disables public publication until audio is regenerated.

## Theme 3: Multilingual Content Review & Publishing

### Epic 03: Multilingual Translation Audit & Audio Publishing

#### User Story 04.1: Multilingual Translation Audit & Historical Terminology Refinement (Review & Filter Translations)

* **Description:** As an Administrator, I need to inspect machine translations across target languages (en, ja, ko, zh) with multi-criteria filters, and edit historical terms so that international visitors receive culturally and scholarly accurate descriptions.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Displays translations in a structured data table with POI name, target language, preview text, and publication status (Pending, Needs Update, Published).
* Supports instant filtering by target language code, exhibit name, and approval status.
* Administrators can edit translated titles and descriptions. Saving modifications automatically marks the audio guide status as "Needs Update" to avoid desynchronization between text and voice.

#### User Story 04.2: Audio Guide Preview & Dynamic Voice Re-generation (Audio Preview & TTS Re-synthesis)

* **Description:** As an Administrator, I need to preview synthesized audio narrations and trigger re-synthesis via Neural TTS on demand, ensuring natural pronunciation and vocal cadence.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* Embeds an audio player inside the translation review interface allowing instant playback of the .mp3 file for each language.
* Provides a "Regenerate Audio Guide" action: invoking the Microsoft Edge Neural TTS service to synthesize a new audio file matching the revised text string.
* If external TTS synthesis fails, displays an explanatory error message: "Unable to generate Audio Guide, please try again later" and retains current data without crashing.

#### User Story 04.3: Administrative Approval & Live Mobile App Synchronization (Approve & Publish)

* **Description:** As an Administrator, I need to grant final publication approval (Published) to verified translations and audio files so that they are immediately synchronized to the visitor mobile web application.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* The "Approve & Publish" button is enabled only when both valid translated text and a synthesized audio file are present.
* Clicking "Approve & Publish" updates the record status to Published in poi_translations and poi_audios.
* Content changes take effect in real time, making verified narratives and audio available on the visitor mobile web client.

#### User Story 04.4: Automated AI Translation & Audio Synthesis Pipeline (Background Processing Engine)

* **Description:** As the System, I need to automatically translate Vietnamese narratives into target foreign languages (`en`, `ja`, `ko`, `zh`) and synthesize neural voice audio guides in the background upon POI creation or primary narrative updates, so that draft translations and narrations are prepared without manual overhead.
* **Priority:** Must have
* **Story Point:** 8

**Acceptance Criteria:**

* Upon POI creation or narrative description update, the backend automatically dispatches asynchronous background worker jobs for all configured target languages (`en`, `ja`, `ko`, `zh`).
* The translation worker processes source Vietnamese text using `deep-translator` with an exponential backoff retry mechanism (up to 3 attempts) to handle transient network errors.
* Localized text strings are synthesized into high-quality MP3 audio files ($64\text{kbps}-96\text{kbps}$) using `edge-tts` with native neural voices.
* An intelligent SHA-256 audio content hashing mechanism (`audio_hash = SHA256(title + text + lang + voice)`) checks existing files before synthesis: if identical audio exists, it is reused to conserve computation and storage.
* Short-lived JIT database connections are strictly enforced: database sessions are never held open during long-running external translation or TTS network calls.

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
* Client polling checks order status every 2.5 seconds while modal is active; on payment completion, tour access is automatically unlocked.

#### User Story 06.2: Webhook-Driven 24-Hour Visiting Session Activation (24-Hour Visiting Session Activation)

* **Description:** As the System, I need to process automated payment Webhook confirmations to activate a 24-hour Visiting Session, issuing a unique Session Code and unlocking all audio guide streaming permissions.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Verifies the cryptographic signature of incoming Webhooks from PayOS / Stripe to prevent tampering.
* Updates transaction status to PAID and provisions a new VisitingSession valid for exactly 24 hours (expires_at = now() + 24 hours).
* Issues a unique, cryptographically secure Session Code, stores the session token in the visitor's mobile localStorage, and unlocks all audio streaming buttons.

#### User Story 06.3: Multi-Device Session Recovery via Session Code (Restore Visiting Session)

* **Description:** As a Visitor, I want to use my Session Code to restore my active tour session if I switch devices, open an incognito tab, or refresh my browser, avoiding redundant pass purchases.
* **Priority:** Should have
* **Story Point:** 3

**Acceptance Criteria:**

* Provides a "Restore Tour Session" option on the unlock screen.
* Entering a valid, unexpired Session Code restores access and displays remaining session validity time.
* If the code does not exist or has exceeded 24 hours, the system rejects restoration with: "Session code is invalid or has expired."

#### User Story 06.4: Content Protection & Narrative/Audio Decryption Access Control (Content Protection & Streaming Authorization)

* **Description:** As a Museum Administrator, I need in-depth narratives and audio streams to remain strictly locked for unauthenticated visitors, protecting digitized cultural intellectual property and securing digital revenue.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Pre-payment visitors can only access exhibit titles, thumbnail photos, and teaser preview snippets (short_description).
* Full historical narratives and audio play buttons are locked with visual padlock indicators.
* Audio streaming endpoints (/api/v1/audio/{poi_id}) enforce valid session token authorization, rejecting unauthorized requests with HTTP 403 Forbidden.

### Epic 05: Interactive Map, GPS Geofencing & Smart Wayfinding

#### User Story 01.1: Interactive Outdoor Map & Real-time GPS Position (Interactive Map & Real-time GPS Position)

* **Description:** As a Visitor, I want to view an interactive digital map of the Cu Chi Tunnels grounds displaying my real-time GPS position marker, so that I can orient myself effortlessly across the outdoor complex.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Requests HTML5 browser geolocation permissions on mobile devices upon opening the map.
* Renders the visitor's live GPS coordinates as a distinct animated location marker alongside POI markers on OpenStreetMap.
* Supports fluid pinch-to-zoom and pan gestures.
* If GPS is disabled or coordinates fall outside the museum grounds, notifies the visitor and centers the map view at the Main Entrance by default.
* Top header includes a dynamic language dropdown filtering strictly published languages.

#### User Story 01.2: Tap Map Marker for Teaser Preview Card (POI Preview Card)

* **Description:** As a Visitor, I want to tap any exhibit marker on the map to inspect teaser photos and brief summaries before heading over.
* **Priority:** Must have
* **Story Point:** 3

**Acceptance Criteria:**

* Tapping an exhibit marker highlights the pin and slides up a Bottom Preview Card.
* Card displays: thumbnail image, exhibit title, short teaser description, an "Audio Guide" button, and a "Directions" button.
* Tapping "Audio Guide" redirects the visitor to the audio player screen for that exhibit. Tapping empty map space dismisses the card.

#### User Story 01.3: Automated Voice Narration on GPS Proximity (GPS Geofence Proximity Trigger)

* **Description:** As a Visitor with an active session, I want the audio guide in my selected language to automatically start playing when I walk within an exhibit's geofence radius, allowing hands-free historical immersion with a floating mini audio player.
* **Priority:** Must have
* **Story Point:** 8

**Acceptance Criteria:**

* Continuously computes the distance between the visitor's live GPS coordinates and all exhibit coordinates using the Haversine formula against each POI's configured radius (10m–50m).
* When the visitor enters an exhibit's configured geofence radius, the system automatically triggers audio playback in the visitor's chosen language.
* Implements a 10-minute cooldown trigger lock (debounce): avoids re-triggering the same exhibit narration within 10 minutes unless manually initiated by the visitor.
* If the mobile network fails to stream the .mp3 file within 3.5 seconds, automatically arms client-side Web Speech API fallback on the mobile browser.
* Pinned mini audio player at the bottom allows play/pause, seek ±10s, and speed adjustment (`0.8x`, `1.0x`, `1.2x`).

#### User Story 01.4: Intelligent Recommended Walking Route (Recommended Walking Route Calculation)

* **Description:** As a Visitor, I want an intelligent recommended route guiding me sequentially to adjacent exhibits so that I can explore without getting lost or backtracking.
* **Priority:** Should have
* **Story Point:** 5

**Acceptance Criteria:**

* Selecting "Directions" on a POI card calculates the walking path from the visitor's current GPS location to the target POI.
* Renders a prominent polyline route overlay connecting start and destination points on the map.
* Displays the estimated walking distance in meters.
* Provides a "Clear Route" button to remove the path overlay and return to standard map exploration.

## Theme 5: Operational Analytics, Field Telemetry & System Health

### Epic 06: Operational Telemetry & Infrastructure Health Monitoring

#### User Story 05.1: Real-time Visitor Density Heatmap (Real-time Visitor Density Heatmap)

* **Description:** As an Administrator, I need to view real-time visitor density heatmaps across museum grounds to identify crowded zones and optimize visitor flow management.
* **Priority:** Should have
* **Story Point:** 5

**Acceptance Criteria:**

* The analytics dashboard renders a visual heatmap layer (Leaflet.heat) overlaid on the Cu Chi Tunnels site map.
* Heatmap gradient reflects visitor concentration derived from recent GPS telemetry pings (green = low density, red/orange = high congestion).
* Allows filtering heatmap data by preset time ranges (Today, Past 7 Days, Peak Hours).

#### User Story 05.2: Exhibit Ranking, Dwell Times & Language Demographics (Top POIs, Dwell Time & Language Demographics)

* **Description:** As an Administrator, I need statistical rankings of top-visited exhibits, average dwell times, and language breakdowns to evaluate exhibition impact.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Renders bar charts ranking Top 10 most visited POIs based on proximity trigger counts.
* Calculates and displays average visitor dwell time (in minutes) within each exhibit's geofence boundary.
* Displays ranked distributions of visitor language selections (vi, en, ja, ko, zh).

#### User Story 05.3: Static Audio Storage Capacity Alert Thresholds (>85%) & Orphan Pruning

* **Description:** As a System Administrator, I need automated alerts when static audio cache disk consumption exceeds 85% capacity, and an action to prune orphaned MP3 files, preventing disk exhaustion.
* **Priority:** Must have
* **Story Point:** 5

**Acceptance Criteria:**

* Monitors disk usage of the server partition holding `/static/audio`.
* Flags status as WARNING (yellow) at ≥ 85% and CRITICAL (red) at ≥ 95%.
* Triggers dashboard warning banners: "Audio cache capacity exceeds 85%. Please prune orphaned files or expand storage quota."
* Provides a "Clean Orphaned Audio" action that compares physical storage against active database records and removes unreferenced audio files.

#### User Story 05.4: Telemetry Filtering & Structured Data Export (Telemetry Filtering & Data Export)

* **Description:** As an Administrator, I need to filter telemetry datasets by date ranges and export reports to CSV or JSON formats for archival and institutional reporting.
* **Priority:** Should have
* **Story Point:** 3

**Acceptance Criteria:**

* Date filtering: Today, Last 7 Days, Last 30 Days, or custom Start Date - End Date.
* Provides an "Export Report" button downloading structured .csv or .json files.
* Output files include: Date, Exhibit Name, Trigger Count, Language Code, and Average Duration.
