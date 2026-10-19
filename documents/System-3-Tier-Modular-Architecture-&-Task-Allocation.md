# System 3-Tier Modular Architecture & Task Allocation Specification

> **Project:** Smart Museum Multilingual AI Audio Guide & Navigation System  
> **Architecture Pattern:** 3-Tier Architecture (Presentation / Controller, Business Logic / Service, Data Access / Repository)  
> **Client Framework:** **React.js** (Single Web Client containing both Desktop Admin Portal & Mobile-first PWA for Visitors)  
> **Backend Framework:** **Python FastAPI**  
> **Database:** **SQLite (WAL mode)** with cascade constraints  
> **Document Purpose:** Define modular decomposition, directory structure, layer boundaries, and assign all 27 User Stories & Technical Tasks from `Detailed-System-Business-Requirements.md` to specific modular components across Backend and Frontend (React.js).

---

## 1. Architectural Overview & 3-Tier Principles

To achieve high maintainability, testability, and seamless extensibility, the project strictly applies the **3-Tier (3-Layer) Architecture** across Backend (FastAPI) and Frontend (React.js):

```
       +---------------------------------------------------------------------------------+
       |                              PRESENTATION LAYER                                 |
       |  • Frontend (React.js): Admin Views, Mobile Visitor Views, Contexts, Hooks      |
       |  • Backend API (FastAPI): Routers / Controllers (HTTP, Pydantic DTOs, Auth)    |
       +---------------------------------------+-----------------------------------------+
                                               | Request / Response (JSON DTOs)
                                               v
       +---------------------------------------------------------------------------------+
       |                         BUSINESS LOGIC LAYER (SERVICE)                          |
       |  • Business Rules, Workflow Orchestration, Validations, Spatial Checks         |
       |  • External Integrations (PayOS, Stripe, Edge-TTS, Deep-Translator)             |
       |  • Background Workers & Content Hashing Caching Logic                           |
       +---------------------------------------+-----------------------------------------+
                                               | Domain Entities / Operations
                                               v
       +---------------------------------------------------------------------------------+
       |                        DATA ACCESS LAYER (REPOSITORY)                           |
       |  • Database Queries (SQLAlchemy ORM / Raw SQLite Queries in WAL mode)           |
       |  • Storage Persistence, Transaction Handling, Cascade Deletion Operations        |
       |  • Data Entities / Database Schema Mapping                                      |
       +---------------------------------------------------------------------------------+
```

### Layer Responsibilities & Separation Rules
1. **Presentation / Controller Layer:**
   * **Backend Controllers:** Route incoming HTTP requests, validate Pydantic DTO schemas, verify cookies/JWT tokens, and serialize outputs. **Rule:** Contains **NO** business calculation or direct database operations.
   * **Frontend (React.js):** Single responsive codebase divided cleanly into `views/admin/` (Desktop workstation views) and `views/visitor/` (Mobile-first responsive views for smartphones).
2. **Business Logic / Service Layer:**
   * Contains museum domain rules: geofence Haversine calculations, brute-force lockout thresholds, Webhook signature verification, and audio content hashing (`text_hash`) to avoid redundant TTS calls.
   * Isolates external third-party SDKs in `backend/app/integrations/`.
3. **Data Access / Repository Layer:**
   * Encapsulates all database queries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) in `backend/app/repositories/`. Decoupled from the database engine to allow migration from SQLite to PostgreSQL without modifying business services.

---

## 2. Directory Structure Breakdown

The codebase is organized into small, decoupled files grouped by functional domains:

```text
POC/
├── backend/                                 # [TIER 1-3 BACKEND] Python FastAPI 3-Layer Architecture
│   ├── app/
│   │   ├── main.py                          # FastAPI App entrypoint, middleware, router aggregation
│   │   ├── core/                            # Cross-cutting foundational modules
│   │   │   ├── config.py                    # Environment variables (Pydantic Settings)
│   │   │   ├── database.py                  # SQLite engine, session maker, WAL pragma setup
│   │   │   ├── security.py                  # Bcrypt password hashing, JWT token generation
│   │   │   ├── middleware.py                # Request latency logger, rate limiting
│   │   │   └── exceptions.py                # Custom domain exceptions & global handlers
│   │   │
│   │   ├── models/                          # Database ORM Entity Models (SQLAlchemy)
│   │   │   ├── user.py                      # users, login_audit_logs
│   │   │   ├── poi.py                       # pois table
│   │   │   ├── translation.py               # poi_translations table
│   │   │   ├── audio.py                     # poi_audios table
│   │   │   ├── transaction.py               # transactions table
│   │   │   ├── visiting_session.py          # visiting_sessions table
│   │   │   └── telemetry.py                 # telemetry_logs table
│   │   │
│   │   ├── schemas/                         # Pydantic Request/Response DTO Schemas
│   │   │   ├── auth_schema.py               # Login, Token, Lockout response
│   │   │   ├── poi_schema.py                # POICreate, POIUpdate, POIResponse, Geofence
│   │   │   ├── translation_schema.py        # TranslationFilter, TranslationUpdate
│   │   │   ├── audio_schema.py              # AudioStatus, AudioRegenerate
│   │   │   ├── payment_schema.py            # CheckoutCreate, WebhookPayload, SessionRestore
│   │   │   ├── analytics_schema.py          # Heatmap, Summary, ExportFilter
│   │   │   └── system_health_schema.py      # HealthCheck, StorageStatus
│   │   │
│   │   ├── controllers/                     # Layer 1: HTTP API Routers
│   │   │   ├── auth_controller.py           # /api/v1/auth
│   │   │   ├── poi_controller.py            # /api/v1/admin/pois
│   │   │   ├── geofence_controller.py       # /api/v1/admin/pois/{id}/geofence
│   │   │   ├── translation_controller.py    # /api/v1/admin/translations
│   │   │   ├── payment_controller.py        # /api/v1/payments
│   │   │   ├── session_controller.py        # /api/v1/sessions
│   │   │   ├── tour_controller.py           # /api/v1/tour (Visitor public endpoints)
│   │   │   ├── analytics_controller.py      # /api/v1/admin/analytics
│   │   │   └── system_health_controller.py  # /api/v1/admin/system
│   │   │
│   │   ├── services/                        # Layer 2: Business Logic & Orchestration
│   │   │   ├── auth_service.py              # Auth validation, brute-force tracking, session lifecycle
│   │   │   ├── poi_service.py               # POI catalog management, media file handling
│   │   │   ├── geofence_service.py          # Coordinate boundary validation, radius calibration
│   │   │   ├── translation_service.py       # Async translation worker, retry logic
│   │   │   ├── tts_service.py               # Edge-TTS synthesizer, text hashing, cache check
│   │   │   ├── curation_service.py          # Curator audit, terminology editing, publishing
│   │   │   ├── payment_service.py           # Checkout creation, webhook signature, session activate
│   │   │   ├── session_service.py           # Visiting session validation & restore logic
│   │   │   ├── navigation_service.py        # Waypoint sequence, distance, route cache
│   │   │   ├── analytics_service.py         # Telemetry aggregation, heatmap stats, CSV export
│   │   │   └── system_health_service.py     # Disk usage, latency metrics, AI engine health
│   │   │
│   │   ├── integrations/                    # External Third-Party API Clients
│   │   │   ├── deep_translator_client.py    # Deep-Translator / Google Translate wrapper
│   │   │   ├── edge_tts_client.py           # Microsoft Edge Neural TTS wrapper
│   │   │   ├── payos_client.py              # VietQR PayOS SDK wrapper
│   │   │   └── stripe_client.py             # International Stripe payment wrapper
│   │   │
│   │   └── repositories/                    # Layer 3: Data Access & SQL Queries
│   │       ├── user_repository.py           # CRUD for users & login audit logs
│   │       ├── poi_repository.py            # CRUD for pois, boundary queries
│   │       ├── translation_repository.py    # Queries for poi_translations with multi-filter
│   │       ├── audio_repository.py          # Queries for poi_audios, hash lookups
│   │       ├── transaction_repository.py    # CRUD for transactions
│   │       ├── session_repository.py        # Session token lookup, expiration queries
│   │       └── telemetry_repository.py      # Telemetry event inserts, time-series aggregations
│   │
│   ├── static/                              # Static File Storage
│   │   ├── audio/                           # Pre-synthesized .mp3 audio guides
│   │   └── images/                          # POI cover photos & thumbnails
│   └── requirements.txt
│
└── frontend/                                # [TIER 1 CLIENT - REACT.JS] Web Client (Admin & Mobile PWA)
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/                             # Layer 1 (Client): HTTP API Services
        │   ├── apiClient.js                 # Axios instance with credentials & interceptors
        │   ├── authApi.js                   # Login, logout, session check
        │   ├── poiApi.js                    # Admin POI CRUD & coordinate saving
        │   ├── translationApi.js            # Curator translation query, edit, publish
        │   ├── paymentApi.js                # Create checkout, poll payment status, restore
        │   ├── tourApi.js                   # Visitor POI list, locked/unlocked details
        │   ├── analyticsApi.js              # Heatmap, summary metrics, export download
        │   └── systemHealthApi.js           # Latency, disk status, AI service vitals
        │
        ├── contexts/                        # Global Reactive State
        │   ├── AuthContext.jsx              # Admin user state, roles, token timer
        │   ├── VisitorSessionContext.jsx    # Visitor paid session token & expiration (localStorage)
        │   └── AudioPlayerContext.jsx       # Global audio guide player state
        │
        ├── hooks/                           # Reusable Behavioral Hooks
        │   ├── useGeolocation.js            # Browser watchPosition, permission handling
        │   ├── useGeofenceProximity.js      # Haversine distance trigger & cooldown logic
        │   └── useInterval.js               # Auto-refresh timer hook
        │
        ├── components/                      # Modular UI Widgets
        │   ├── common/                      # Modals, buttons, toast alerts, route guards
        │   ├── admin/                       # Admin Portal Components
        │   │   ├── AdminHeader.jsx          # Header with user role badge & logout
        │   │   ├── LeafletGeofenceMap.jsx   # Draggable marker + L.circle radius calibrator
        │   │   ├── TranslationAuditModal.jsx# Inline audio player + rich text editor for curators
        │   │   └── AnalyticsHeatmap.jsx     # Leaflet.heat overlay widget
        │   └── visitor/                     # Mobile-first Visitor Components
        │       ├── VisitorHeader.jsx        # Language selector, restore session trigger
        │       ├── InteractiveOsmMap.jsx    # Visitor real-time Leaflet map & polylines
        │       ├── StickyMiniPlayer.jsx     # Audio player with Web Speech fallback
        │       ├── PoiPreviewCard.jsx       # Bottom slide-up sheet for exhibits
        │       ├── PaymentModal.jsx         # VietQR & Card checkout modal
        │       └── RestoreSessionModal.jsx  # Modal for entering Session Code
        │
        └── views/                           # Page-Level Views
            ├── admin/                       # Admin Portal Pages (Desktop Workstation)
            │   ├── LoginPage.jsx            # UC-02: Role-based login & lockout countdown
            │   ├── PoiCatalogPage.jsx       # UC-03: Exhibit management list & form
            │   ├── GeofenceCalibPage.jsx    # UC-04: Spatial mapping calibration
            │   ├── TranslationPage.jsx      # UC-05: Curatorial audit & publishing
            │   ├── AnalyticsDashboard.jsx   # UC-06: Visitor telemetry & heatmaps
            │   └── SystemHealthPage.jsx     # UC-06: Diagnostics & cache alerts
            └── visitor/                     # Visitor Mobile PWA Pages (Smartphones)
                ├── VisitorTourPage.jsx      # UC-01: Main map & automatic audio tour
                └── CheckoutSuccessPage.jsx  # UC-09: Payment confirmation & session unlock
```

---

## 3. Core Functional Modules Breakdown

The project is decomposed into **7 decoupled functional modules**:

| Module Code | Module Name | Primary Business Scope | Referenced UC & Epics |
| :--- | :--- | :--- | :--- |
| **MOD-01** | **Identity, Security & Governance** | Authentication, password hashing, anti-brute force, JWT cookies, role-based authorization | Epic 01 (UC-02) |
| **MOD-02** | **Exhibit Catalog & Spatial Geofencing** | POI CRUD, image storage, boundary validation, GPS coordinates & geofence radius calibration, route cache invalidation | Epic 02 (UC-03), Epic 03 (UC-04) |
| **MOD-03** | **Multilingual AI & Audio Synthesis** | Async translation pipeline, Edge-TTS neural speech, content hashing audio cache validation | Epic 04 (UC-07, UC-08) |
| **MOD-04** | **Curatorial Review & Content Publishing** | Translation audit tables, audio preview, terminology refinement, status lifecycle (`Pending` -> `Published`) | Epic 05 (UC-05) |
| **MOD-05** | **Digital Payment & Session Management** | VietQR & Stripe checkouts, webhook signature verification, 24h visiting session activation & code restore | Epic 06 (UC-09) |
| **MOD-06** | **Interactive Map, Wayfinding & Audio Tour** | Real-time GPS location, proximity geofence trigger, recommended walking routes, preview sheets, audio player | Epic 07 (UC-01) |
| **MOD-07** | **Telemetry Analytics & System Health** | Visitor density heatmap, dwell time & top exhibit stats, CSV/JSON export, disk cache alerts (>85%), AI health | Epic 08 & 09 (UC-06) |

---

## 4. Complete Task Allocation Matrix

Below is the exhaustive mapping of all **27 User Stories** and their **Technical Tasks** from `Detailed-System-Business-Requirements.md` into specific architecture layers and module files:

### MOD-01: Identity, Security & Governance (UC-02)
| User Story | Task Code & Description | Tier / Layer | Assigned File Target |
| :--- | :--- | :--- | :--- |
| **US02.1** | **Task 02.1.1:** Develop `/api/v1/auth/login` verifying Bcrypt hash & issuing JWT cookie | Backend (FastAPI) | `backend/app/controllers/auth_controller.py`<br>`backend/app/services/auth_service.py` |
| | **Task 02.1.2:** Build responsive Admin Login page, state persistence, route guards | Frontend (React.js) | `frontend/src/views/admin/LoginPage.jsx`<br>`frontend/src/contexts/AuthContext.jsx` |
| | **Task 02.1.3:** Construct `users` table with indexes on `username` and `email` | Database (Schema) | `backend/app/models/user.py`<br>`backend/app/repositories/user_repository.py` |
| **US02.2** | **Task 02.2.1:** Rate-limiting middleware tracking failed attempts (15m lock after 5 fails) | Backend (Core) | `backend/app/core/middleware.py`<br>`backend/app/services/auth_service.py` |
| | **Task 02.2.2:** Catch HTTP 423 (Locked) responses and present countdown lockout modal | Frontend (React.js) | `frontend/src/views/admin/LoginPage.jsx` |
| | **Task 02.2.3:** Add `failed_attempts`, `locked_until` to `users`, create `login_audit_logs` | Database (Schema) | `backend/app/models/user.py`<br>`backend/app/repositories/user_repository.py` |
| **US02.3** | **Task 02.3.1:** Construct `/api/v1/auth/logout` endpoint purging auth cookies | Backend (FastAPI) | `backend/app/controllers/auth_controller.py`<br>`backend/app/services/auth_service.py` |
| | **Task 02.3.2:** Implement Logout action button in header, wiping local user states | Frontend (React.js) | `frontend/src/components/admin/AdminHeader.jsx` |

---

### MOD-02: Exhibit Catalog & Spatial Geofencing (UC-03 & UC-04)
| User Story | Task Code & Description | Tier / Layer | Assigned File Target |
| :--- | :--- | :--- | :--- |
| **US03.1** | **Task 03.1.1:** `POST /api/v1/admin/pois` multipart endpoint, saving cover images | Backend (FastAPI) | `backend/app/controllers/poi_controller.py`<br>`backend/app/services/poi_service.py` |
| | **Task 03.1.2:** POI creation form with image preview and client validation | Frontend (React.js) | `frontend/src/views/admin/PoiCatalogPage.jsx` |
| | **Task 03.1.3:** Construct `pois` table with constraints & timestamps | Database (Schema) | `backend/app/models/poi.py`<br>`backend/app/repositories/poi_repository.py` |
| **US03.2** | **Task 03.2.1:** `PUT /api/v1/admin/pois/{id}`, trigger background AI on `description_vi` change | Backend (FastAPI) | `backend/app/controllers/poi_controller.py`<br>`backend/app/services/poi_service.py` |
| | **Task 03.2.2:** POI editing view with background pipeline processing status indicators | Frontend (React.js) | `frontend/src/views/admin/PoiCatalogPage.jsx` |
| **US03.3** | **Task 03.3.1:** `DELETE /api/v1/admin/pois/{id}` with physical audio/image unlinking | Backend (Service/Repo) | `backend/app/services/poi_service.py`<br>`backend/app/repositories/poi_repository.py` |
| | **Task 03.3.2:** Delete confirmation modal dialog and dataset refresh | Frontend (React.js) | `frontend/src/views/admin/PoiCatalogPage.jsx` |
| | **Task 03.3.3:** Configure `poi_id` foreign keys with `ON DELETE CASCADE` | Database (Schema) | `backend/app/models/poi.py`, `translation.py`, `audio.py` |
| **US04.1** | **Task 04.1.1:** Geographic bounding box validation in POI coordinate update API | Backend (Service) | `backend/app/services/geofence_service.py` |
| | **Task 04.1.2:** Integrate Leaflet.js handling marker `dragend` to synchronize coordinates | Frontend (React.js) | `frontend/src/components/admin/LeafletGeofenceMap.jsx`<br>`frontend/src/views/admin/GeofenceCalibPage.jsx` |
| **US04.2** | **Task 04.2.1:** Add `radius_meters` (5m-100m) to Pydantic validation schemas | Backend (Schema) | `backend/app/schemas/poi_schema.py`<br>`backend/app/services/geofence_service.py` |
| | **Task 04.2.2:** Render dynamic `L.circle` layer scaling with numeric radius input | Frontend (React.js) | `frontend/src/components/admin/LeafletGeofenceMap.jsx` |
| **US04.3** | **Task 04.3.1:** Write cache invalidation logic inside routing service post-update | Backend (Service) | `backend/app/services/navigation_service.py` |

---

### MOD-03: Multilingual AI & Audio Synthesis (UC-07 & UC-08)
| User Story | Task Code & Description | Tier / Layer | Assigned File Target |
| :--- | :--- | :--- | :--- |
| **US07.1** | **Task 07.1.1:** Construct `TranslationService` integrating `deep-translator` (4 languages) | Backend (Service/Int) | `backend/app/services/translation_service.py`<br>`backend/app/integrations/deep_translator_client.py` |
| | **Task 07.1.2:** Implement async retry handlers (exponential backoff) & error loggers | Backend (Service) | `backend/app/services/translation_service.py` |
| | **Task 07.1.3:** Construct `poi_translations` table enforcing `UNIQUE(poi_id, language_code)` | Database (Schema) | `backend/app/models/translation.py`<br>`backend/app/repositories/translation_repository.py` |
| **US08.1** | **Task 08.1.1:** Construct `TTSService` with `edge-tts` and neural voice profiles | Backend (Service/Int) | `backend/app/services/tts_service.py`<br>`backend/app/integrations/edge_tts_client.py` |
| | **Task 08.1.2:** Persist binary `.mp3` files and register metadata in `poi_audios` | Backend (Service/Repo) | `backend/app/services/tts_service.py`<br>`backend/app/repositories/audio_repository.py` |
| **US08.2** | **Task 08.2.1:** Implement `compute_text_hash` and cache-hit conditional bypass logic | Backend (Service) | `backend/app/services/tts_service.py` |
| | **Task 08.2.2:** Add indexed `text_hash` column to `poi_audios` | Database (Schema) | `backend/app/models/audio.py`<br>`backend/app/repositories/audio_repository.py` |
| **US08.3** | **Task 08.3.1:** Build fallback routines in `StickyMiniPlayer.jsx` via Web Speech API | Frontend (React.js) | `frontend/src/components/visitor/StickyMiniPlayer.jsx` |

---

### MOD-04: Curatorial Review & Content Publishing (UC-05)
| User Story | Task Code & Description | Tier / Layer | Assigned File Target |
| :--- | :--- | :--- | :--- |
| **US05.1** | **Task 05.1.1:** Build `GET /api/v1/admin/translations` supporting multi-filtering | Backend (FastAPI) | `backend/app/controllers/translation_controller.py`<br>`backend/app/services/curation_service.py` |
| | **Task 05.1.2:** Develop translation table UI with search filters & dropdowns | Frontend (React.js) | `frontend/src/views/admin/TranslationPage.jsx` |
| **US05.2** | **Task 05.2.1:** Build `PUT /api/v1/admin/translations/{id}` updating text & flagging audio | Backend (FastAPI) | `backend/app/controllers/translation_controller.py`<br>`backend/app/services/curation_service.py` |
| | **Task 05.2.2:** Create audit modal integrating inline audio player and text editor | Frontend (React.js) | `frontend/src/components/admin/TranslationAuditModal.jsx` |
| **US05.3** | **Task 05.3.1:** Endpoints `/regenerate-audio` and `/publish` updating status | Backend (FastAPI) | `backend/app/controllers/translation_controller.py`<br>`backend/app/services/curation_service.py` |
| | **Task 05.3.2:** Implement reactive badges updating status from `Pending` to `Published` | Frontend (React.js) | `frontend/src/views/admin/TranslationPage.jsx` |

---

### MOD-05: Digital Payment & Session Management (UC-09)
| User Story | Task Code & Description | Tier / Layer | Assigned File Target |
| :--- | :--- | :--- | :--- |
| **US09.1** | **Task 09.1.1:** Integrate PayOS (VietQR) & Stripe; build `POST /api/v1/payments/create-checkout` | Backend (FastAPI/Int) | `backend/app/controllers/payment_controller.py`<br>`backend/app/services/payment_service.py`<br>`backend/app/integrations/payos_client.py`<br>`backend/app/integrations/stripe_client.py` |
| | **Task 09.1.2:** Build mobile checkout modal with automatic transaction polling | Frontend (React.js) | `frontend/src/components/visitor/PaymentModal.jsx` |
| | **Task 09.1.3:** Construct `transactions` table | Database (Schema) | `backend/app/models/transaction.py`<br>`backend/app/repositories/transaction_repository.py` |
| **US09.2** | **Task 09.2.1:** Webhook `POST /api/v1/payments/webhook` with signature verification | Backend (FastAPI) | `backend/app/controllers/payment_controller.py`<br>`backend/app/services/payment_service.py` |
| | **Task 09.2.2:** Create `VisitorSessionContext` to decrypt audio controls (using `localStorage`) | Frontend (React.js) | `frontend/src/contexts/VisitorSessionContext.jsx` |
| | **Task 09.2.3:** Construct `visiting_sessions` table (24-hour expiration) | Database (Schema) | `backend/app/models/visiting_session.py`<br>`backend/app/repositories/session_repository.py` |
| **US09.3** | **Task 09.3.1:** Build `POST /api/v1/sessions/restore` validating session codes | Backend (FastAPI) | `backend/app/controllers/session_controller.py`<br>`backend/app/services/session_service.py` |
| | **Task 09.3.2:** Build Session Code restoration modal with friendly status feedback | Frontend (React.js) | `frontend/src/components/visitor/RestoreSessionModal.jsx` |

---

### MOD-06: Interactive Map, Wayfinding & Audio Tour (UC-01)
| User Story | Task Code & Description | Tier / Layer | Assigned File Target |
| :--- | :--- | :--- | :--- |
| **US01.1** | **Task 01.1.1:** OpenStreetMap/Leaflet integration invoking `navigator.geolocation.watchPosition` | Frontend (React.js) | `frontend/src/hooks/useGeolocation.js`<br>`frontend/src/components/visitor/InteractiveOsmMap.jsx`<br>`frontend/src/views/visitor/VisitorTourPage.jsx` |
| | **Task 01.1.2:** Optimize mobile touch gestures (pinch-to-zoom, pan) for mobile web browsers | Frontend (React.js) | `frontend/src/components/visitor/InteractiveOsmMap.jsx` |
| **US01.2** | **Task 01.2.1:** Haversine distance evaluation routines inside `geofenceService.js` | Frontend (React.js) | `frontend/src/hooks/useGeofenceProximity.js` |
| | **Task 01.2.2:** Autoplay audio via HTML5 Audio and render sticky mini-player | Frontend (React.js) | `frontend/src/components/visitor/StickyMiniPlayer.jsx`<br>`frontend/src/contexts/AudioPlayerContext.jsx` |
| **US01.3** | **Task 01.3.1:** Waypoint path calculation routines based on spatial coordinate matrices | Backend (Service) | `backend/app/services/navigation_service.py`<br>`backend/app/controllers/tour_controller.py` |
| | **Task 01.3.2:** Render dynamic animated `L.polyline` walking paths on Leaflet map | Frontend (React.js) | `frontend/src/components/visitor/InteractiveOsmMap.jsx` |
| **US01.4** | **Task 01.4.1:** Build `PoiPreviewCard.jsx` slide-up bottom sheet with "Navigate Here" action | Frontend (React.js) | `frontend/src/components/visitor/PoiPreviewCard.jsx` |

---

### MOD-07: Telemetry Analytics & System Health (UC-06)
| User Story | Task Code & Description | Tier / Layer | Assigned File Target |
| :--- | :--- | :--- | :--- |
| **US06.1** | **Task 06.1.1:** `GET /api/v1/admin/analytics/heatmap` aggregating telemetry events | Backend (FastAPI) | `backend/app/controllers/analytics_controller.py`<br>`backend/app/services/analytics_service.py` |
| | **Task 06.1.2:** Integrate `leaflet.heat` overlay into admin dashboard | Frontend (React.js) | `frontend/src/components/admin/AnalyticsHeatmap.jsx` |
| **US06.2** | **Task 06.2.1:** `/api/v1/admin/analytics/summary` aggregating top POIs, dwell times, langs | Backend (FastAPI) | `backend/app/controllers/analytics_controller.py`<br>`backend/app/services/analytics_service.py`<br>`backend/app/repositories/telemetry_repository.py` |
| | **Task 06.2.2:** Integrate Chart.js/Recharts rendering visual metric widgets | Frontend (React.js) | `frontend/src/views/admin/AnalyticsDashboard.jsx` |
| **US06.3** | **Task 06.3.1:** `GET /api/v1/admin/analytics/export` streaming CSV/JSON files | Backend (FastAPI) | `backend/app/controllers/analytics_controller.py`<br>`backend/app/services/analytics_service.py` |
| | **Task 06.3.2:** Add date range pickers and download buttons to analytics toolbar | Frontend (React.js) | `frontend/src/views/admin/AnalyticsDashboard.jsx` |
| **US06.4** | **Task 06.4.1:** Timing middleware for latency & `/api/v1/admin/system/health` endpoint | Backend (Core/FastAPI) | `backend/app/core/middleware.py`<br>`backend/app/controllers/system_health_controller.py` |
| | **Task 06.4.2:** Build system health dashboard cards showing performance metrics | Frontend (React.js) | `frontend/src/views/admin/SystemHealthPage.jsx` |
| **US06.5** | **Task 06.5.1:** Python `shutil.disk_usage` for audio cache disk status (>85% alert) | Backend (Service) | `backend/app/services/system_health_service.py` |
| | **Task 06.5.2:** Visual storage progress bar changing colors on capacity limits | Frontend (React.js) | `frontend/src/views/admin/SystemHealthPage.jsx` |
| **US06.6** | **Task 06.6.1:** Health-check routines testing AI endpoints with 2s timeouts | Backend (Service) | `backend/app/services/system_health_service.py` |
| | **Task 06.6.2:** Implement reactive `setInterval` timers for live auto-refresh toggle | Frontend (React.js) | `frontend/src/views/admin/SystemHealthPage.jsx` |

---

## 5. Development & Implementation Roadmap

To maintain clean dependencies during development, modules should be implemented in the following sequence:

```
[Phase 1: Foundation & Core]
  └── Core config, DB WAL setup, Security & MOD-01 (Auth: UC-02)
        │
        v
[Phase 2: Digital Asset Management & Admin Web]
  └── MOD-02 (Exhibit & Spatial Catalog: UC-03, UC-04)
        │
        v
[Phase 3: AI Engine & Curation Pipeline]
  └── MOD-03 (Translation & TTS: UC-07, UC-08) ──> MOD-04 (Curatorial Review: UC-05)
        │
        v
[Phase 4: Commercialization & Visitor Experience]
  └── MOD-05 (Payment & Session: UC-09) ──> MOD-06 (Map, Geofencing & Audio Tour: UC-01)
        │
        v
[Phase 5: Operational Oversight & Diagnostics]
  └── MOD-07 (Analytics & System Health: UC-06)
```

---

## 6. Maintenance & Scalability Safeguards

1. **Isolation of External APIs:** All third-party services (PayOS, Stripe, Deep-Translator, Edge-TTS) reside strictly in `backend/app/integrations/`. If an external vendor changes its SDK or API syntax, only the corresponding integration client file is modified without touching business services or controllers.
2. **Pluggable Database Repositories:** All SQL queries and ORM operations are isolated in `backend/app/repositories/`. Moving from SQLite to PostgreSQL in production only requires updating database dialect connections in `core/database.py` and repository query syntax without altering any business logic.
3. **Decoupled Frontend State:** Complex global logic (authentication, audio streaming, paid sessions) is isolated into React Contexts (`AuthContext`, `AudioPlayerContext`, `VisitorSessionContext`), keeping UI components purely visual and easy to maintain.
