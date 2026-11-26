# MVP Codebase Mapping — Cu Chi Tunnels Smart Audio Guide

Self-contained codebase map inside `MVP/`, combining the 3-level drill-down (**System Overview -> DFD & Use Cases -> Files & Quick-Fix Spots**) with the Level 1 & Level 2 Data Flow Diagrams in [DFD.md](../documents/DFD.md).

> **Quick navigation in VS Code**: `Ctrl + Click` any `[Open](...)` or `#L...` link to jump straight to the target file and line.

---

## LEVEL 1 — SYSTEM OVERVIEW

### 1.1. 3-Tier Architecture & DFD Level 1 Data Flow

```text
[ FRONTEND: React 18 / Vite / Tailwind / Leaflet ]
  ├── views/ (Routed Pages) ──► components/ (UI blocks: visitor/, admin/)
  ├── contexts/ (Auth, VisitorSession, AudioPlayer) & hooks/ (GPS, Geofence, Polling, Idle)
  ├── locales/ (adminTranslations.js, visitorTranslations.js) & services/utils/
  └── api/ (apiClient.js + 12 API clients)
          │  HTTP REST / JSON / MP3 Stream
          ▼
[ BACKEND: FastAPI / SQLAlchemy / MySQL 8 ]
  ├── main.py (CORS, 13 Routers, Static Image Guard, Lifespan Workers)
  ├── controllers/ (Request Ingestion, Validation, Auth, Rate Limiting)
  ├── services/ (Business Logic + Pipeline Queue + Translation/TTS Workers)
  ├── integrations/ (Render Translate, OpenRouter Multi-Key, Edge-TTS, PayPal, Supabase)
  ├── repositories/ (SQLAlchemy Queries) ──► models/ & schemas/
  └── core/ (config, database, dependencies, security, exceptions, limiter)
```

```text
[Admin]   ──► DFD 1.0 Auth & Security       ──► D1: User, Audit
          ──► DFD 2.0 Exhibition & Catalog  ──► D2: POI ──(2.7 trigger)──► DFD 3.0
          ──► DFD 3.0 Translation & Audio   ──► D3: POITranslation, LanguageCode + Audio Storage
          ──► DFD 6.0 Telemetry & Health    ◄── D6: POITrigger, POI, Audit, Disk/Audio Storage

[Visitor] ──► DFD 4.0 Payment & 24h Session ──► D4: Transaction, D5: VisitorSession
          ──► DFD 5.0 Map, GPS & Wayfinding ◄── D2: POI, D3: POITranslation, D5: VisitorSession
                                            ──(GPS pings)──► DFD 6.0 (D6: POITrigger)
```

### 1.2. Unified Navigation Index (DFD 1.0–6.0 ↔ UC-01–UC-06)

| DFD | UC | Process / Use Case Name | Domain | Data Stores | Quick Jump |
| :---: | :---: | :--- | :---: | :--- | :--- |
| **DFD 5.0** | **UC-01** | Interactive Map, GPS Geofencing, Audio & Smart Wayfinding | Visitor | `POI`, `POITranslation`, `LanguageCode`, `VisitorSession` | [UC-1.1](#uc-11-view-map-gps--geofence-auto-play-dfd-5157) · [UC-1.2](#uc-12-poi-details-audio-streaming--paywall-dfd-44-54-55-58) · [UC-1.3](#uc-13-walking-route--wayfinding-dfd-59) |
| **DFD 1.0** | **UC-02** | Administrative Authentication & Session Security | Admin | `User`, `Audit` | [Jump to UC-02 / DFD 1.0](#uc-02--dfd-10--admin-authentication--session-security) |
| **DFD 2.0** | **UC-03** | Exhibition & Catalog Management (Content, Photos, Geofence) | Admin | `POI`, Image Storage | [UC-3.1](#uc-31-createedit-poi-content-cover-image--visibility-dfd-2127) · [UC-3.2](#uc-32-configure-gps-coordinates-latitude--longitude--geofence-radius-dfd-22-24) |
| **DFD 3.0** | **UC-04** | Multilingual Translation, TTS Audio & Publishing | Admin / Worker | `POITranslation`, Audio Storage | [UC-4.1](#uc-41-automated-ai-translation-pipeline-render--openrouter--edge-tts-dfd-33-35-37) · [UC-4.2](#uc-42-translation-audit-audio-regeneration--publishing-dfd-31-32-34-36) |
| **DFD 6.0** | **UC-05** | Traffic Telemetry, Analytics Heatmap & System Health | Visitor / Admin | `POITrigger`, `POI`, `Audit`, Audio Storage | [UC-5.1](#uc-51-telemetry-kpi-analytics-heatmap--export-dfd-61-62-64) · [UC-5.2](#uc-52-system-health-storage-quota--orphan-cleanup-dfd-63) |
| **DFD 4.0** | **UC-06** | Digital Admission Payment, 24h Session, PIN Restore & QR | Visitor | `Transaction`, `VisitorSession` | [UC-6.1](#uc-61-24-hour-unlock-checkout-vietqr-paypal-simulation-dfd-41-42) · [UC-6.2](#uc-62-24-hour-session-pin-restore--tour-qr-page-dfd-43) |
| **Core** | **Core** | Shared Infrastructure (Routing, HTTP Client, DB, Config) | Shared | All 8 MySQL tables | [Jump to Core](#core--shared-infrastructure) |

### 1.3. Top-Level Module Guide (What to Change -> Which Folder?)

| Layer | Folder | Primary Responsibility |
| :--- | :--- | :--- |
| **BE** | [controllers/](backend/app/controllers) | HTTP endpoints, admin auth guards, rate limits, response serialization. |
| **BE** | [services/](backend/app/services) | Business rules, background job queue, and translation/TTS workers. |
| **BE** | [repositories/](backend/app/repositories) | SQLAlchemy queries and atomic writes to MySQL. |
| **BE** | [integrations/](backend/app/integrations) | External clients: Render Translate, OpenRouter, Edge-TTS, PayPal, Supabase. |
| **BE** | [schemas/](backend/app/schemas) & [models/](backend/app/models) | Pydantic API validation and SQLAlchemy ORM table definitions. |
| **BE** | [core/](backend/app/core) | `.env` settings, DB engine, JWT/bcrypt, error envelope, rate limiter, DI. |
| **FE** | [views/](frontend/src/views) | Full routed pages registered in [App.jsx](frontend/src/App.jsx). |
| **FE** | [components/](frontend/src/components) | Reusable UI blocks (`visitor/` and `admin/`): headers, modals, players, badges, maps. |
| **FE** | [contexts/](frontend/src/contexts) & [hooks/](frontend/src/hooks) | Global state (Auth, 24h Session, Audio) and GPS / Geofence / Polling / Idle hooks. |
| **FE** | [api/](frontend/src/api) & [locales/](frontend/src/locales) | Backend REST calls and UI dictionaries (6-language Visitor / Vietnamese Admin). |

---

## LEVEL 2 & LEVEL 3 — DFD PROCESSES, USE CASES, FILES & QUICK-FIX SPOTS

---

## UC-01 / DFD 5.0 — Interactive Map, GPS Geofencing, Audio & Smart Wayfinding

### DFD 5.0 Level 2 Subprocess Flow
| DFD ID | Subprocess | Data Flow / Responsibility | Key Files |
| :---: | :--- | :--- | :--- |
| **5.1** | Receive Visitor Request | Accept POI/map request, selected language, session token, and destination. | [VisitorMapView.jsx](frontend/src/views/visitor/VisitorMapView.jsx), [poiApi.js](frontend/src/api/poiApi.js), [poi_controller.py](backend/app/controllers/poi_controller.py) |
| **5.2** | Retrieve Active POI Data | Query active POIs, coordinates, and geofence radius from `POI`. | [poi_service.py](backend/app/services/poi_service.py), [poi_repository.py](backend/app/repositories/poi_repository.py), [poi.py](backend/app/models/poi.py) |
| **5.3** | Retrieve Published Translation & Audio Metadata | Fetch `PUBLISHED` localized text and audio reference for the requested language. | [poi_service.py](backend/app/services/poi_service.py), [translation_repository.py](backend/app/repositories/translation_repository.py), [translation.py](backend/app/models/translation.py), [language_repository.py](backend/app/repositories/language_repository.py) |
| **5.4** | Validate Visitor Session | Verify 24h session token before unlocking protected descriptions or audio. | [poi_service.py](backend/app/services/poi_service.py), [session_service.py](backend/app/services/session_service.py), [session_repository.py](backend/app/repositories/session_repository.py) |
| **5.5** | Apply Content Access Rules | Return teaser preview or full narrative according to session status. | [poi_service.py](backend/app/services/poi_service.py), [ContentPaywallGate.jsx](frontend/src/components/visitor/ContentPaywallGate.jsx) |
| **5.6** | Retrieve Map & Location Data | Track live visitor GPS coordinates and render POIs on the OSM map. | [useGeolocation.js](frontend/src/hooks/useGeolocation.js), [InteractiveOsmMap.jsx](frontend/src/components/visitor/InteractiveOsmMap.jsx), [VisitorLocationMarker.jsx](frontend/src/components/visitor/VisitorLocationMarker.jsx) |
| **5.7** | Detect Geofence & Apply Cooldown | Detect entry into a POI geofence and suppress repeat triggers during cooldown. | [useGeofenceTrigger.js](frontend/src/hooks/useGeofenceTrigger.js), [cooldownService.js](frontend/src/services/cooldownService.js), [VisitorTourPage.jsx](frontend/src/views/visitor/VisitorTourPage.jsx) |
| **5.8** | Authorize & Retrieve Audio | Verify audio access and stream the `.mp3` narration. | [audio_controller.py](backend/app/controllers/audio_controller.py), [audio_service.py](backend/app/services/audio_service.py), [audio_repository.py](backend/app/repositories/audio_repository.py), [AudioPlayerContext.jsx](frontend/src/contexts/AudioPlayerContext.jsx) |
| **5.9** | Calculate Walking Route | Compute walking route geometry and distance to the selected POI. | [tour_controller.py](backend/app/controllers/tour_controller.py), [wayfinding_service.py](backend/app/services/wayfinding_service.py), [tourApi.js](frontend/src/api/tourApi.js), [RouteOverlay.jsx](frontend/src/components/visitor/RouteOverlay.jsx) |

### UC-1.1: View Map, GPS & Geofence Auto-Play (DFD 5.1–5.7)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `VisitorTourPage.jsx` | [Open](frontend/src/views/visitor/VisitorTourPage.jsx) | Main visitor page; loads POIs/languages, coordinates GPS, geofence triggers, and modals. |
| FE | `VisitorMapView.jsx` & `InteractiveOsmMap.jsx` | [MapView](frontend/src/views/visitor/VisitorMapView.jsx) · [OsmMap](frontend/src/components/visitor/InteractiveOsmMap.jsx) | Initializes the Leaflet OSM map, recenter button, and marker/route layers. |
| FE | `VisitorHeader.jsx` | [Open](frontend/src/components/visitor/VisitorHeader.jsx) | Responsive top bar: branding, language picker, restore button, and 24h pass status. |
| FE | `VisitorLocationMarker.jsx` | [Open](frontend/src/components/visitor/VisitorLocationMarker.jsx) | Renders the visitor's live GPS dot and accuracy ring. |
| FE | `VisitorPoiMarkers.jsx` | [Open](frontend/src/components/visitor/VisitorPoiMarkers.jsx) | Renders POI markers, geofence radius circles, and marker click handlers. |
| FE | `useGeolocation.js` | [Open](frontend/src/hooks/useGeolocation.js) | Wraps `watchPosition` GPS tracking and permission error handling. |
| FE | `useGeofenceTrigger.js` | [Open](frontend/src/hooks/useGeofenceTrigger.js) | Checks distance against POI radius, enforces cooldown, and fires auto-play triggers. |
| FE | `cooldownService.js` | [Open](frontend/src/services/cooldownService.js) | Stores per-POI re-trigger cooldown timers in `sessionStorage`. |
| FE | `haversine.js` & `museumBounds.js` | [haversine](frontend/src/utils/haversine.js) · [bounds](frontend/src/utils/museumBounds.js) | Haversine distance formula and Cu Chi Tunnels entrance/perimeter bounds. |
| FE | `visitorTranslations.js` | [Open](frontend/src/locales/visitorTranslations.js) | Visitor UI dictionary for 6 languages (`vi`, `en`, `ja`, `ko`, `fr`, `zh`). |
| FE | `poiApi.js` & `languageApi.js` | [poiApi](frontend/src/api/poiApi.js) · [languageApi](frontend/src/api/languageApi.js) | Calls `GET /api/v1/pois` and `GET /api/v1/languages`. |
| BE | `poi_controller.py` & `language_controller.py` | [poi_ctrl](backend/app/controllers/poi_controller.py) · [lang_ctrl](backend/app/controllers/language_controller.py) | Serves map POIs and published language list. |
| BE | `poi_service.py` & `language_service.py` | [poi_svc](backend/app/services/poi_service.py) · [lang_svc](backend/app/services/language_service.py) | Filters active POIs, joins `PUBLISHED` translations, masks `description` for unpaid sessions. |
| BE | `poi_repository.py` & `language_repository.py` | [poi_repo](backend/app/repositories/poi_repository.py) · [lang_repo](backend/app/repositories/language_repository.py) | Queries `POI`, `POITranslation`, and `LanguageCode` tables. |

#### Quick-Fix Spots in These Files
- **Change POI repeat cooldown duration** (default `10 min`): [cooldownService.js#L9](frontend/src/services/cooldownService.js#L9) (`DEFAULT_COOLDOWN_DURATION_MS`) & [useGeofenceTrigger.js#L35](frontend/src/hooks/useGeofenceTrigger.js#L35).
- **Adjust GPS accuracy/timeout options**: [useGeolocation.js](frontend/src/hooks/useGeolocation.js) (`GEOLOCATION_OPTIONS`).
- **Tweak mobile visitor header layout**: [VisitorHeader.jsx](frontend/src/components/visitor/VisitorHeader.jsx) *(UI only, no BE impact)*.
- **Update default map center or site perimeter (`latitude` / `longitude`)**: [museumBounds.js#L6](frontend/src/utils/museumBounds.js#L6) (`MAIN_ENTRANCE`, `MUSEUM_BOUNDS`) & sync [config.py#L148](backend/app/core/config.py#L148) (`CU_CHI_BOUNDS`).
- **Edit 6-language visitor UI copy**: [visitorTranslations.js](frontend/src/locales/visitorTranslations.js) (`VISITOR_TRANSLATIONS`).

---

### UC-1.2: POI Details, Audio Streaming & Paywall (DFD 4.4, 5.4, 5.5, 5.8)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `PoiPreviewCard.jsx` | [Open](frontend/src/components/visitor/PoiPreviewCard.jsx) | Exhibit detail card: cover image, teaser, full description or paywall, embedded audio player. |
| FE | `ContentPaywallGate.jsx` | [Open](frontend/src/components/visitor/ContentPaywallGate.jsx) | Paywall gate blocking full descriptions for unpaid visitors with an unlock CTA. |
| FE | `AudioPlayerContext.jsx` | [Open](frontend/src/contexts/AudioPlayerContext.jsx) | Global `HTMLAudioElement` controller: play/pause, seek, speed toggle, language reload. |
| FE | `MiniAudioPlayer.jsx` | [Open](frontend/src/components/visitor/MiniAudioPlayer.jsx) | Inline MP3 player embedded inside `PoiPreviewCard`. |
| BE | `audio_controller.py` | [Open](backend/app/controllers/audio_controller.py) | `GET /api/v1/audio/{poi_id}` streaming MP3 after verifying the 24h session token. |
| BE | `media_controller.py` | [Open](backend/app/controllers/media_controller.py) | `GET /api/v1/media/poi-images/{filename}` serving cover photos from local disk or Supabase. |
| BE | `audio_service.py`, `audio_repository.py`, `audio.py` | [audio_svc](backend/app/services/audio_service.py) · [audio_repo](backend/app/repositories/audio_repository.py) · [model](backend/app/models/audio.py) | Validates session streaming rights and resolves MP3 path/URL for `(poi_id, language)`. |
| BE | `storage_client.py` | [Open](backend/app/integrations/storage_client.py) | Uploads/downloads media via Supabase Storage with local `static/` fallback. |

#### Quick-Fix Spots in These Files
- **Change audio playback speed options** (`0.8x / 1.0x / 1.2x`): [AudioPlayerContext.jsx#L13](frontend/src/contexts/AudioPlayerContext.jsx#L13) (`SUPPORTED_PLAYBACK_RATES`) & [MiniAudioPlayer.jsx](frontend/src/components/visitor/MiniAudioPlayer.jsx) (`SPEED_OPTIONS`).
- **Adjust free vs. paid content masking**: [poi_service.py](backend/app/services/poi_service.py) (`list_map_pois`, `get_visitor_poi_detail`) & [ContentPaywallGate.jsx](frontend/src/components/visitor/ContentPaywallGate.jsx).
- **Debug MP3 token validation or headers**: [audio_controller.py](backend/app/controllers/audio_controller.py) (`_extract_token`, `_serve_audio_response`).
- **Fix broken POI cover images**: [media_controller.py](backend/app/controllers/media_controller.py) (`get_poi_image`) & [main.py](backend/app/main.py) (`protect_static_images`).

---

### UC-1.3: Walking Route & Wayfinding (DFD 5.9)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `RouteOverlay.jsx` | [Open](frontend/src/components/visitor/RouteOverlay.jsx) | Draws walking polyline, remaining distance, and ETA on Leaflet. |
| FE | `tourApi.js` | [Open](frontend/src/api/tourApi.js) | Calls `GET /api/v1/tour/walking-route`. |
| BE | `tour_controller.py` | [Open](backend/app/controllers/tour_controller.py) | Handles walking route requests with `RATE_LIMIT_WALKING_ROUTE`. |
| BE | `wayfinding_service.py` & `tour_schema.py` | [wayfinding](backend/app/services/wayfinding_service.py) · [tour_schema](backend/app/schemas/tour_schema.py) | Queries OSRM foot routing and falls back to straight-line Haversine on error. |

#### Quick-Fix Spots in These Files
- **Change route line color or stroke width**: [RouteOverlay.jsx](frontend/src/components/visitor/RouteOverlay.jsx) (`L.polyline`).
- **Change OSRM endpoint or timeout**: [wayfinding_service.py](backend/app/services/wayfinding_service.py) (`_try_osrm_foot_route`).

---

## UC-02 / DFD 1.0 — Admin Authentication & Session Security

### DFD 1.0 Level 2 Subprocess Flow
| DFD ID | Subprocess | Data Flow / Responsibility | Key Files |
| :---: | :--- | :--- | :--- |
| **1.1** | Credential Ingestion & Identity Verification | Accept username/email + password, fetch credentials from `User`, verify bcrypt hash. | [AdminLoginView.jsx](frontend/src/views/admin/AdminLoginView.jsx), [authApi.js](frontend/src/api/authApi.js), [auth_controller.py](backend/app/controllers/auth_controller.py), [auth_service.py](backend/app/services/auth_service.py), [auth_schema.py](backend/app/schemas/auth_schema.py), [user_repository.py](backend/app/repositories/user_repository.py), [user.py](backend/app/models/user.py) |
| **1.2** | Brute-Force Defense & Account Lockout | Count consecutive failures, lock account 15 min after 5 tries, notify UI, log to `Audit`. | [AccountLockoutModal.jsx](frontend/src/components/admin/AccountLockoutModal.jsx), [auth_service.py](backend/app/services/auth_service.py), [user_repository.py](backend/app/repositories/user_repository.py), [audit_repository.py](backend/app/repositories/audit_repository.py), [audit.py](backend/app/models/audit.py) |
| **1.3** | Session Issuance & Token Management | Reset failed counters, issue HttpOnly JWT cookie, return profile, validate active sessions. | [AuthContext.jsx](frontend/src/contexts/AuthContext.jsx), [authApi.js](frontend/src/api/authApi.js), [auth_controller.py](backend/app/controllers/auth_controller.py), [auth_service.py](backend/app/services/auth_service.py), [security.py](backend/app/core/security.py) |
| **1.4** | Session Revocation & Security Audit Logging | Handle logout, clear HttpOnly cookie, write termination event to `Audit`, redirect to login. | [AuthContext.jsx](frontend/src/contexts/AuthContext.jsx), [authApi.js](frontend/src/api/authApi.js), [auth_controller.py](backend/app/controllers/auth_controller.py), [auth_service.py](backend/app/services/auth_service.py), [audit_repository.py](backend/app/repositories/audit_repository.py) |

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `AdminLoginView.jsx` | [Open](frontend/src/views/admin/AdminLoginView.jsx) | `/admin/login` form, error messaging, and lockout modal trigger. |
| FE | `AccountLockoutModal.jsx` | [Open](frontend/src/components/admin/AccountLockoutModal.jsx) | Countdown modal shown when an account is temporarily locked. |
| FE | `AdminRouteGuard.jsx` & `AdminLayout.jsx` | [Guard](frontend/src/components/admin/AdminRouteGuard.jsx) · [Layout](frontend/src/components/admin/AdminLayout.jsx) | Guards `/admin/*` routes and renders the shared admin shell. |
| FE | `AdminNavbar.jsx` | [Open](frontend/src/components/admin/AdminNavbar.jsx) | Top nav bar, storage health banner, and sign-out button. |
| FE | `AuthContext.jsx` & `useIdleTimer.js` | [AuthContext](frontend/src/contexts/AuthContext.jsx) · [useIdleTimer](frontend/src/hooks/useIdleTimer.js) | Holds admin auth state and triggers idle auto-logout. |
| FE | `authApi.js` | [Open](frontend/src/api/authApi.js) | Calls `/api/v1/auth/login`, `/me`, and `/logout`. |
| BE | `auth_controller.py`, `auth_service.py`, `auth_schema.py` | [ctrl](backend/app/controllers/auth_controller.py) · [svc](backend/app/services/auth_service.py) · [schema](backend/app/schemas/auth_schema.py) | Sets/clears HttpOnly JWT cookies, verifies bcrypt, enforces lockout, writes `Audit` logs. |
| BE | `user_repository.py`, `audit_repository.py`, `user.py`, `audit.py` | [user_repo](backend/app/repositories/user_repository.py) · [audit_repo](backend/app/repositories/audit_repository.py) · [user](backend/app/models/user.py) · [audit](backend/app/models/audit.py) | Reads/writes `User` and `Audit` tables. |
| BE | `security.py` & `dependencies.py` | [security](backend/app/core/security.py) · [deps](backend/app/core/dependencies.py) | JWT signing/decoding, bcrypt hashing, and `get_current_admin_profile` dependency. |

#### Quick-Fix Spots in These Files
- **Change max failed attempts (`5`) or lockout duration (`15 min`)**: [auth_service.py#L54](backend/app/services/auth_service.py#L54) (`MAX_FAILED_ATTEMPTS`, `LOCKOUT_DURATION_MINUTES`).
- **Change idle auto-logout (`30 min`) & JWT lifetime**: [config.py#L64](backend/app/core/config.py#L64) (`IDLE_TIMEOUT_MINUTES`, `ACCESS_TOKEN_EXPIRE_MINUTES`) & [useIdleTimer.js#L9](frontend/src/hooks/useIdleTimer.js#L9).
- **Adjust cookie `Secure` / `SameSite` flags**: [auth_controller.py](backend/app/controllers/auth_controller.py) (`login_admin`) & [config.py#L67](backend/app/core/config.py#L67) (`IS_COOKIE_SECURE`).

---

## UC-03 / DFD 2.0 — Exhibition & Catalog Management (Content, Photos, Geofence)

### DFD 2.0 Level 2 Subprocess Flow
| DFD ID | Subprocess | Data Flow / Responsibility | Key Files |
| :---: | :--- | :--- | :--- |
| **2.1** | Receive Catalog Command | Accept create, edit, search, detail, image, or visibility command from Admin UI. | [PoiCatalogPage.jsx](frontend/src/views/admin/PoiCatalogPage.jsx), [poiApi.js](frontend/src/api/poiApi.js), [poi_controller.py](backend/app/controllers/poi_controller.py), [admin_poi_controller.py](backend/app/controllers/admin_poi_controller.py) |
| **2.2** | Validate Exhibit Information | Validate narrative fields, GPS bounds (`CU_CHI_BOUNDS`), and radius (`10m–50m`). | [POIFormModal.jsx](frontend/src/components/admin/POIFormModal.jsx), [poi_schema.py](backend/app/schemas/poi_schema.py), [poi_service.py](backend/app/services/poi_service.py) |
| **2.3** | Retrieve & Search Exhibit Catalog | Fetch exhibit list, search matches, details, and translation status badges. | [PoiCatalogPage.jsx](frontend/src/views/admin/PoiCatalogPage.jsx), [poiApi.js](frontend/src/api/poiApi.js), [poi_controller.py](backend/app/controllers/poi_controller.py), [poi_service.py](backend/app/services/poi_service.py), [poi_repository.py](backend/app/repositories/poi_repository.py) |
| **2.4** | Persist Exhibit Changes | Insert/update exhibit records in `POI` (enforced by `CHK_POI_Radius_Range`). | [poi_controller.py](backend/app/controllers/poi_controller.py), [admin_poi_controller.py](backend/app/controllers/admin_poi_controller.py), [poi_service.py](backend/app/services/poi_service.py), [poi_repository.py](backend/app/repositories/poi_repository.py), [poi.py](backend/app/models/poi.py) |
| **2.5** | Manage Cover Image | Validate, upload, and return cover image URL for the exhibit record. | [PoiCatalogPage.jsx](frontend/src/views/admin/PoiCatalogPage.jsx), [POIFormModal.jsx](frontend/src/components/admin/POIFormModal.jsx), [poiApi.js](frontend/src/api/poiApi.js), [admin_poi_controller.py](backend/app/controllers/admin_poi_controller.py), [poi_service.py](backend/app/services/poi_service.py) |
| **2.6** | Control Exhibit Visibility | Activate or hide an exhibit (`Is_Active`) in the visitor-facing catalog. | [PoiCatalogPage.jsx](frontend/src/views/admin/PoiCatalogPage.jsx), [DeactivateConfirmModal.jsx](frontend/src/components/admin/DeactivateConfirmModal.jsx), [poiApi.js](frontend/src/api/poiApi.js), [admin_poi_controller.py](backend/app/controllers/admin_poi_controller.py), [poi_service.py](backend/app/services/poi_service.py), [poi_repository.py](backend/app/repositories/poi_repository.py) |
| **2.7** | Initiate Translation & Audio Generation | Hand off newly created or edited Vietnamese narrative to **DFD 3.0** pipeline. | [poi_service.py](backend/app/services/poi_service.py), [translation_pipeline_service.py](backend/app/services/translation_pipeline_service.py) |

### UC-3.1: Create/Edit POI Content, Cover Image & Visibility (DFD 2.1–2.7)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `PoiCatalogPage.jsx` | [Open](frontend/src/views/admin/PoiCatalogPage.jsx) | `/admin/pois` catalog: search, create modal, localized Vietnamese status pills, retry button. |
| FE | `POIFormModal.jsx` | [Open](frontend/src/components/admin/POIFormModal.jsx) | Edit POI modal (title, short description, full narrative, cover photo, coordinates, radius). |
| FE | `DeactivateConfirmModal.jsx` | [Open](frontend/src/components/admin/DeactivateConfirmModal.jsx) | Confirmation modal to hide or reactivate a POI on the visitor map. |
| FE | `poiApi.js` & `adminPoiApi.js` | [poiApi](frontend/src/api/poiApi.js) · [adminPoiApi](frontend/src/api/adminPoiApi.js) | Calls create/update/visibility/upload-image/retry endpoints. |
| FE | `adminTranslations.js` | [Open](frontend/src/locales/adminTranslations.js) | Centralized Vietnamese string dictionary for the Admin Portal. |
| BE | `admin_poi_controller.py` & `poi_controller.py` | [admin_poi_ctrl](backend/app/controllers/admin_poi_controller.py) · [poi_ctrl](backend/app/controllers/poi_controller.py) | `POST /admin/pois`, `PUT /admin/pois/{id}`, `PATCH /{id}/visibility`, `POST /{id}/retry-translations`, `POST /upload-image`. |
| BE | `poi_service.py` & `poi_repository.py` | [poi_svc](backend/app/services/poi_service.py) · [poi_repo](backend/app/repositories/poi_repository.py) | Validates bounds, saves images, detects Vietnamese text edits, sets foreign rows to `PENDING`, enqueues background jobs. |
| BE | `poi_schema.py` & `poi.py` | [poi_schema](backend/app/schemas/poi_schema.py) · [poi_model](backend/app/models/poi.py) | Validates field lengths/radius and maps the `POI` table (with `CHK_POI_Radius_Range`). |

#### Quick-Fix Spots in These Files
- **Change `title` / `short_description` character limits**:
  - Backend: [poi_schema.py#L91](backend/app/schemas/poi_schema.py#L91) (`POIUpdateRequest`) & [poi_schema.py#L162](backend/app/schemas/poi_schema.py#L162) (`POICreateRequest`).
  - Frontend: [POIFormModal.jsx#L150](frontend/src/components/admin/POIFormModal.jsx#L150) & [#L273](frontend/src/components/admin/POIFormModal.jsx#L273) (Edit); [PoiCatalogPage.jsx#L159](frontend/src/views/admin/PoiCatalogPage.jsx#L159) & [#L470](frontend/src/views/admin/PoiCatalogPage.jsx#L470) (Create).
- **Change status set on foreign translations during Update POI** (`PENDING`): [poi_repository.py#L146](backend/app/repositories/poi_repository.py#L146) (`update_translation_narrative_and_invalidate_foreign`).
- **Customize status pill colors/labels in POI table**: [PoiCatalogPage.jsx#L342](frontend/src/views/admin/PoiCatalogPage.jsx#L342) & [adminTranslations.js#L140](frontend/src/locales/adminTranslations.js#L140).
- **Change cover photo max size/MIME types** (`5MB`, JPG/PNG/WebP): [config.py#L90](backend/app/core/config.py#L90) & [poi_service.py](backend/app/services/poi_service.py) (`validate_image_file`).

---

### UC-3.2: Configure GPS Coordinates (`latitude` / `longitude`) & Geofence Radius (DFD 2.2, 2.4)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `GeofenceCalibPage.jsx` | [Open](frontend/src/views/admin/GeofenceCalibPage.jsx) | `/admin/geofence` page dedicated to selecting a POI and saving `latitude`, `longitude`, and `radius` edits. |
| FE | `AdminMapPicker.jsx` | [Open](frontend/src/components/admin/AdminMapPicker.jsx) | Interactive Leaflet pin picker with `latitude`/`longitude` inputs, `10m–50m` radius circle, and perimeter check. |
| FE | `museumBounds.js` | [Open](frontend/src/utils/museumBounds.js) | Default map center (`MAIN_ENTRANCE`) and allowed `latitude`/`longitude` bounds (`MUSEUM_BOUNDS`). |
| BE | `admin_poi_controller.py` & `poi_service.py` | [admin_poi_ctrl](backend/app/controllers/admin_poi_controller.py) · [poi_svc](backend/app/services/poi_service.py) | Persists `latitude`/`longitude`/`radius` and validates coordinates against `CU_CHI_BOUNDS`. |
| BE | `poi_schema.py`, `poi.py`, `config.py` | [schema](backend/app/schemas/poi_schema.py) · [model](backend/app/models/poi.py) · [config](backend/app/core/config.py) | Validates `latitude` (`-90..90`), `longitude` (`-180..180`), `radius` (`10..50`), and `CU_CHI_BOUNDS`. |

#### Quick-Fix Spots in These Files
- **Change `latitude` / `longitude` validation & bounds**:
  - Allowed site bounds & global toggle: [config.py#L148](backend/app/core/config.py#L148) (`ALLOW_GLOBAL_COORDINATES`, `CU_CHI_BOUNDS`), [museumBounds.js#L6](frontend/src/utils/museumBounds.js#L6) (`MAIN_ENTRANCE`, `MUSEUM_BOUNDS`), and [poi_service.py#L60](backend/app/services/poi_service.py#L60).
  - API schema (`-90..90`, `-180..180`): [poi_schema.py#L114](backend/app/schemas/poi_schema.py#L114) (Update) & [poi_schema.py#L178](backend/app/schemas/poi_schema.py#L178) (Create).
  - DB columns & CHECK constraints: [poi.py#L35](backend/app/models/poi.py#L35) & [mysql_schema.sql#L72](backend/scripts/mysql_schema.sql#L72).
- **Change allowed radius range (`10m–50m`)**: [poi_schema.py#L122](backend/app/schemas/poi_schema.py#L122) (`MIN_TRIGGER_RADIUS`, `MAX_TRIGGER_RADIUS`), DB constraint [poi.py#L24](backend/app/models/poi.py#L24) & [mysql_schema.sql#L82](backend/scripts/mysql_schema.sql#L82) (`CHK_POI_Radius_Range`), [AdminMapPicker.jsx](frontend/src/components/admin/AdminMapPicker.jsx), and [adminTranslations.js#L125](frontend/src/locales/adminTranslations.js#L125).

---

## UC-04 / DFD 3.0 — Multilingual Translation, TTS Audio & Publishing

### DFD 3.0 Level 2 Subprocess Flow
| DFD ID | Subprocess | Data Flow / Responsibility | Key Files |
| :---: | :--- | :--- | :--- |
| **3.1** | Receive Translation Workflow Command | Accept admin review/edit/regenerate/publish command or pipeline trigger from **DFD 2.7**. | [TranslationAuditView.jsx](frontend/src/views/admin/TranslationAuditView.jsx), [translationApi.js](frontend/src/api/translationApi.js), [translation_controller.py](backend/app/controllers/translation_controller.py) |
| **3.2** | Retrieve Translation & Audio Data | Load translation rows, Vietnamese source text, review status, and audio metadata. | [TranslationAuditView.jsx](frontend/src/views/admin/TranslationAuditView.jsx), [translation_service.py](backend/app/services/translation_service.py), [translation_repository.py](backend/app/repositories/translation_repository.py), [audio_repository.py](backend/app/repositories/audio_repository.py) |
| **3.3** | Translate Exhibit Narrative | Translate narrative fields via Render API / OpenRouter fallback and save `DRAFT`. | [translation_pipeline_service.py](backend/app/services/translation_pipeline_service.py), [translation_worker.py](backend/app/services/translation_worker.py), [deep_translator_client.py](backend/app/integrations/deep_translator_client.py), [translation_repository.py](backend/app/repositories/translation_repository.py) |
| **3.4** | Review & Edit Translation | Side-by-side comparison, manual text edits, and status update (`NEEDS_UPDATE`). | [TranslationAuditView.jsx](frontend/src/views/admin/TranslationAuditView.jsx), [translationApi.js](frontend/src/api/translationApi.js), [translation_controller.py](backend/app/controllers/translation_controller.py), [translation_service.py](backend/app/services/translation_service.py), [translation_repository.py](backend/app/repositories/translation_repository.py) |
| **3.5** | Generate or Regenerate Audio | Synthesize `.mp3` via Edge-TTS (auto voice selection) and save audio file + metadata. | [RegenerateAudioButton.jsx](frontend/src/components/admin/RegenerateAudioButton.jsx), [translationApi.js](frontend/src/api/translationApi.js), [translation_controller.py](backend/app/controllers/translation_controller.py), [tts_service.py](backend/app/services/tts_service.py), [audio_synthesis_worker.py](backend/app/services/audio_synthesis_worker.py), [edge_tts_client.py](backend/app/integrations/edge_tts_client.py), [audio_repository.py](backend/app/repositories/audio_repository.py) |
| **3.6** | Approve & Publish Translation | Transition reviewed translation to `PUBLISHED` after verifying audio sync. | [TranslationAuditView.jsx](frontend/src/views/admin/TranslationAuditView.jsx), [translationApi.js](frontend/src/api/translationApi.js), [translation_controller.py](backend/app/controllers/translation_controller.py), [translation_service.py](backend/app/services/translation_service.py), [translation_repository.py](backend/app/repositories/translation_repository.py) |
| **3.7** | Store Translation & Audio Metadata | Persist text, status, audio URL, duration, and file size into `POITranslation`. | [translation_repository.py](backend/app/repositories/translation_repository.py), [audio_repository.py](backend/app/repositories/audio_repository.py), [translation.py](backend/app/models/translation.py), [audio.py](backend/app/models/audio.py) |

### UC-4.1: Automated AI Translation Pipeline (Render / OpenRouter) & Edge-TTS (DFD 3.3, 3.5, 3.7)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| BE | `pipeline_queue.py` | [Open](backend/app/services/pipeline_queue.py) | Async job queue with concurrency limit, POI dedup, and startup auto-recovery. |
| BE | `translation_pipeline_service.py` | [Open](backend/app/services/translation_pipeline_service.py) | Runs Vietnamese TTS + proactive Render wake-up in parallel, then processes foreign languages. |
| BE | `translation_worker.py` | [Open](backend/app/services/translation_worker.py) | Single-language worker using JIT DB sessions: `PENDING` -> translate -> `DRAFT` / `FAILED`. |
| BE | `audio_synthesis_worker.py` | [Open](backend/app/services/audio_synthesis_worker.py) | Synthesizes MP3 via Edge-TTS (SHA-256 dedup), uploads to Supabase; sets `NEEDS_UPDATE` on failure. |
| BE | `deep_translator_client.py` | [Open](backend/app/integrations/deep_translator_client.py) | 2-tier client: Render API (`110s` wake-up, `<=500` char chunks) -> OpenRouter (multi-key rotation on `401/402/403/429`). |
| BE | `edge_tts_client.py` | [Open](backend/app/integrations/edge_tts_client.py) | Auto-selects native neural voice per language, discovers new languages via `list_voices()`, falls back to secondary voice. |
| BE | `main.py` | [Open](backend/app/main.py) | Manages queue `lifespan` and optional periodic Render keep-alive ping. |

#### Quick-Fix Spots in These Files
- **Adjust Render chunk size (`500` chars) & OpenRouter rotation codes**: [deep_translator_client.py#L18](backend/app/integrations/deep_translator_client.py#L18) (`RENDER_MAX_CHUNK_CHARS`) & [#L24](backend/app/integrations/deep_translator_client.py#L24) (`OPENROUTER_ROTATE_STATUSES`).
- **Adjust Render wake-up (`110s`), translate timeout (`70s`), OpenRouter model, or keep-alive**: [config.py#L119](backend/app/core/config.py#L119).
- **Change default or fallback TTS voice per language**: [edge_tts_client.py#L59](backend/app/integrations/edge_tts_client.py#L59) (`VOICE_BY_LANGUAGE`) & [#L74](backend/app/integrations/edge_tts_client.py#L74) (`FALLBACK_VOICE_BY_LANGUAGE`).

---

### UC-4.2: Translation Audit, Audio Regeneration & Publishing (DFD 3.1, 3.2, 3.4, 3.6)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `TranslationPage.jsx` & `TranslationAuditView.jsx` | [Page](frontend/src/views/admin/TranslationPage.jsx) · [AuditView](frontend/src/views/admin/TranslationAuditView.jsx) | Side-by-side audit UI (Vietnamese source vs. target), 3-tier filters, save draft, regenerate audio, publish. |
| FE | `AudioSyncBadge.jsx` | [Open](frontend/src/components/admin/AudioSyncBadge.jsx) | Sync status badge and publish lock indicator. |
| FE | `AudioAuditPlayer.jsx` & `RegenerateAudioButton.jsx` | [Player](frontend/src/components/admin/AudioAuditPlayer.jsx) · [RegenBtn](frontend/src/components/admin/RegenerateAudioButton.jsx) | Inline MP3 preview player and manual audio regeneration button. |
| FE | `translationApi.js` | [Open](frontend/src/api/translationApi.js) | Calls `/api/v1/admin/translations/*`. |
| BE | `translation_controller.py` & `translation_service.py` | [ctrl](backend/app/controllers/translation_controller.py) · [svc](backend/app/services/translation_service.py) | Lists, updates text (forces `NEEDS_UPDATE` to lock publish), publishes (`PUBLISHED`), and retries. |
| BE | `tts_service.py` | [Open](backend/app/services/tts_service.py) | Manually regenerates MP3 audio on admin request. |
| BE | `translation_repository.py`, `translation_schema.py`, `translation.py` | [repo](backend/app/repositories/translation_repository.py) · [schema](backend/app/schemas/translation_schema.py) · [model](backend/app/models/translation.py) | Queries, validates (`Short_Description <= 1000`), and defines the 5 `POITranslation` statuses. |

#### Quick-Fix Spots in These Files
- **Add/remove status filter dropdown items**: [TranslationAuditView.jsx#L17](frontend/src/views/admin/TranslationAuditView.jsx#L17) (`STATUS_OPTIONS`).
- **Change translation edit character limits**: [translation_schema.py#L11](backend/app/schemas/translation_schema.py#L11) & [TranslationAuditView.jsx#L608](frontend/src/views/admin/TranslationAuditView.jsx#L608).
- **Modify Publish button lock rules**: [translation_service.py](backend/app/services/translation_service.py) (`publish_translation`) & [AudioSyncBadge.jsx](frontend/src/components/admin/AudioSyncBadge.jsx).

---

## UC-05 / DFD 6.0 — Telemetry, Analytics Heatmap & System Health

### DFD 6.0 Level 2 Subprocess Flow
| DFD ID | Subprocess | Data Flow / Responsibility | Key Files |
| :---: | :--- | :--- | :--- |
| **6.1** | Ingest & Aggregate Visitor Telemetry | Collect GPS proximity triggers into `POITrigger`, compute visit counts, average dwell time, and language stats. | [AnalyticsDashboard.jsx](frontend/src/views/admin/AnalyticsDashboard.jsx), [analyticsApi.js](frontend/src/api/analyticsApi.js), [telemetryApi.js](frontend/src/api/telemetryApi.js), [telemetry_controller.py](backend/app/controllers/telemetry_controller.py), [analytics_controller.py](backend/app/controllers/analytics_controller.py), [telemetry_service.py](backend/app/services/telemetry_service.py), [telemetry_repository.py](backend/app/repositories/telemetry_repository.py), [analytics_schema.py](backend/app/schemas/analytics_schema.py), [trigger.py](backend/app/models/trigger.py) |
| **6.2** | Generate & Render Density Heatmap | Aggregate telemetry pings by time range, compute normalized density weights, render `leaflet.heat`. | [AnalyticsDashboard.jsx](frontend/src/views/admin/AnalyticsDashboard.jsx), [AnalyticsHeatmap.jsx](frontend/src/components/admin/AnalyticsHeatmap.jsx), [analyticsApi.js](frontend/src/api/analyticsApi.js), [analytics_controller.py](backend/app/controllers/analytics_controller.py), [telemetry_service.py](backend/app/services/telemetry_service.py), [telemetry_repository.py](backend/app/repositories/telemetry_repository.py) |
| **6.3** | Monitor System Health & Storage Capacity | Measure disk usage vs. `85% / 95%` thresholds, prune orphaned MP3s, log cleanup to `Audit`. | [SystemHealthPage.jsx](frontend/src/views/admin/SystemHealthPage.jsx), [StorageHealthBanner.jsx](frontend/src/components/admin/StorageHealthBanner.jsx), [CleanOrphansModal.jsx](frontend/src/components/admin/CleanOrphansModal.jsx), [systemApi.js](frontend/src/api/systemApi.js), [systemHealthApi.js](frontend/src/api/systemHealthApi.js), [system_controller.py](backend/app/controllers/system_controller.py), [storage_service.py](backend/app/services/storage_service.py), [system_schema.py](backend/app/schemas/system_schema.py) |
| **6.4** | Filter & Export Telemetry Datasets | Apply date filters (`Today / 7d / 30d / Custom`), query `POITrigger`, stream UTF-8 BOM CSV or JSON. | [AnalyticsExport.jsx](frontend/src/components/admin/AnalyticsExport.jsx), [AnalyticsDashboard.jsx](frontend/src/views/admin/AnalyticsDashboard.jsx), [analyticsApi.js](frontend/src/api/analyticsApi.js), [analytics_controller.py](backend/app/controllers/analytics_controller.py), [export_service.py](backend/app/services/export_service.py), [telemetry_repository.py](backend/app/repositories/telemetry_repository.py) |

### UC-5.1: Telemetry, KPI Analytics, Heatmap & Export (DFD 6.1, 6.2, 6.4)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `AnalyticsDashboard.jsx` | [Open](frontend/src/views/admin/AnalyticsDashboard.jsx) | `/admin` and `/admin/analytics`: KPI cards, Top 10 POIs, language chart, heatmap, export. |
| FE | `AnalyticsHeatmap.jsx` | [Open](frontend/src/components/admin/AnalyticsHeatmap.jsx) | Leaflet density heatmap (`leaflet.heat`) with congestion alerts. |
| FE | `AnalyticsExport.jsx` | [Open](frontend/src/components/admin/AnalyticsExport.jsx) | Date range picker and CSV/JSON download trigger. |
| FE | `analyticsApi.js` & `telemetryApi.js` | [analyticsApi](frontend/src/api/analyticsApi.js) · [telemetryApi](frontend/src/api/telemetryApi.js) | Calls `/api/v1/admin/analytics/*` and posts `POST /api/v1/telemetry/trigger`. |
| BE | `telemetry_controller.py` & `analytics_controller.py` | [tel_ctrl](backend/app/controllers/telemetry_controller.py) · [ana_ctrl](backend/app/controllers/analytics_controller.py) | Ingests visitor GPS triggers and serves summary/heatmap/export endpoints. |
| BE | `telemetry_service.py` & `export_service.py` | [tel_svc](backend/app/services/telemetry_service.py) · [exp_svc](backend/app/services/export_service.py) | Computes KPIs, normalized heatmap `intensity`, and CSV/JSON export streams. |
| BE | `telemetry_repository.py`, `analytics_schema.py`, `trigger.py` | [tel_repo](backend/app/repositories/telemetry_repository.py) · [schema](backend/app/schemas/analytics_schema.py) · [trigger](backend/app/models/trigger.py) | Aggregate queries on `POITrigger`. |

#### Quick-Fix Spots in These Files
- **Change heatmap density thresholds (`40%` / `70%`) & colors**: [AnalyticsHeatmap.jsx#L34](frontend/src/components/admin/AnalyticsHeatmap.jsx#L34) (`HEATMAP_GRADIENT`), [#L261](frontend/src/components/admin/AnalyticsHeatmap.jsx#L261) (`intensity >= 0.7`, `0.4`) & legend labels [adminTranslations.js#L229](frontend/src/locales/adminTranslations.js#L229).
- **Change `intensity` calculation formula**: [telemetry_service.py#L173](backend/app/services/telemetry_service.py#L173) (`get_heatmap_data`).
- **Add/edit exported CSV columns**: [export_service.py](backend/app/services/export_service.py) (`stream_csv`).

---

### UC-5.2: System Health, Storage Quota & Orphan Cleanup (DFD 6.3)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `SystemHealthPage.jsx` | [Open](frontend/src/views/admin/SystemHealthPage.jsx) | `/admin/health`: DB status, media disk usage, quota alerts, and cleanup action. |
| FE | `StorageHealthBanner.jsx` & `CleanOrphansModal.jsx` | [Banner](frontend/src/components/admin/StorageHealthBanner.jsx) · [CleanModal](frontend/src/components/admin/CleanOrphansModal.jsx) | Global storage alert bar on `AdminNavbar` and orphan cleanup confirmation modal. |
| FE | `systemApi.js` & `systemHealthApi.js` | [systemApi](frontend/src/api/systemApi.js) · [healthApi](frontend/src/api/systemHealthApi.js) | Calls `GET /admin/system/health`, `POST /admin/storage/clean-orphans`, `GET /system/public-config`. |
| BE | `system_controller.py`, `storage_service.py`, `system_schema.py` | [sys_ctrl](backend/app/controllers/system_controller.py) · [storage_svc](backend/app/services/storage_service.py) · [schema](backend/app/schemas/system_schema.py) | Measures disk usage against `1 GB` quota and removes unreferenced media files. |

#### Quick-Fix Spots in These Files
- **Change storage quota (`1 GB`) or `85% / 95%` alert thresholds**: [config.py#L92](backend/app/core/config.py#L92) (`STORAGE_QUOTA_BYTES`) & [storage_service.py#L104](backend/app/services/storage_service.py#L104) (`_resolve_threshold_status`).

---

## UC-06 / DFD 4.0 — Digital Admission Payment & Tour Session Activation

### DFD 4.0 Level 2 Subprocess Flow
| DFD ID | Subprocess | Data Flow / Responsibility | Key Files |
| :---: | :--- | :--- | :--- |
| **4.1** | Order Creation & Checkout Initialization | Validate pass pricing & payment method, create `PENDING` row in `Transaction`, request VietQR / PayPal checkout. | [CheckoutModal.jsx](frontend/src/components/visitor/CheckoutModal.jsx), [paymentApi.js](frontend/src/api/paymentApi.js), [payment_controller.py](backend/app/controllers/payment_controller.py), [payment_service.py](backend/app/services/payment_service.py), [payment_schema.py](backend/app/schemas/payment_schema.py), [transaction_repository.py](backend/app/repositories/transaction_repository.py), [transaction.py](backend/app/models/transaction.py) |
| **4.2** | Webhook Verification & 24h Session Activation | Verify gateway webhook/capture, mark `Transaction` as `PAID`, provision 24h `VisitorSession`, exchange token via polling. | [usePaymentPolling.js](frontend/src/hooks/usePaymentPolling.js), [CheckoutSuccessPage.jsx](frontend/src/views/visitor/CheckoutSuccessPage.jsx), [VisitorSessionContext.jsx](frontend/src/contexts/VisitorSessionContext.jsx), [paymentApi.js](frontend/src/api/paymentApi.js), [payment_controller.py](backend/app/controllers/payment_controller.py), [payment_service.py](backend/app/services/payment_service.py), [session_service.py](backend/app/services/session_service.py), [transaction_repository.py](backend/app/repositories/transaction_repository.py), [session_repository.py](backend/app/repositories/session_repository.py), [session.py](backend/app/models/session.py) |
| **4.3** | Cross-Device Session Recovery | Validate `SessionCode` (`CCT-...`) and 24h expiry in `VisitorSession`, restore token + language on device. | [RestoreSessionModal.jsx](frontend/src/components/visitor/RestoreSessionModal.jsx), [sessionApi.js](frontend/src/api/sessionApi.js), [VisitorSessionContext.jsx](frontend/src/contexts/VisitorSessionContext.jsx), [session_controller.py](backend/app/controllers/session_controller.py), [session_service.py](backend/app/services/session_service.py), [session_repository.py](backend/app/repositories/session_repository.py), [session_schema.py](backend/app/schemas/session_schema.py), [session.py](backend/app/models/session.py) |
| **4.4** | Content Protection & Streaming Authorization | Enforce paywall on full POI descriptions and authorize `.mp3` streaming for active sessions *(see also [UC-1.2](#uc-12-poi-details-audio-streaming--paywall-dfd-44-54-55-58))*. | [ContentPaywallGate.jsx](frontend/src/components/visitor/ContentPaywallGate.jsx), [AudioPlayerContext.jsx](frontend/src/contexts/AudioPlayerContext.jsx), [poi_controller.py](backend/app/controllers/poi_controller.py), [audio_controller.py](backend/app/controllers/audio_controller.py), [audio_service.py](backend/app/services/audio_service.py), [session_service.py](backend/app/services/session_service.py), [audio_repository.py](backend/app/repositories/audio_repository.py), [audio.py](backend/app/models/audio.py) |

### UC-6.1: 24-Hour Unlock Checkout (VietQR, PayPal, Simulation) (DFD 4.1, 4.2)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `CheckoutModal.jsx` | [Open](frontend/src/components/visitor/CheckoutModal.jsx) | Payment method modal, VietQR / PayPal flow, and dev simulation button. |
| FE | `CheckoutSuccessPage.jsx` | [Open](frontend/src/views/visitor/CheckoutSuccessPage.jsx) | Gateway redirect page that captures/exchanges the order for a session token. |
| FE | `usePaymentPolling.js` & `paymentApi.js` | [Polling](frontend/src/hooks/usePaymentPolling.js) · [paymentApi](frontend/src/api/paymentApi.js) | Polls order status and calls `/api/v1/payments/*`. |
| BE | `payment_controller.py` & `payment_service.py` | [pay_ctrl](backend/app/controllers/payment_controller.py) · [pay_svc](backend/app/services/payment_service.py) | Creates orders, verifies PayOS webhooks, captures PayPal, exchanges `creator_token` for 24h session. |
| BE | `paypal_client.py` | [Open](backend/app/integrations/paypal_client.py) | PayPal REST API integration (OAuth, create order, capture). |
| BE | `transaction_repository.py`, `payment_schema.py`, `transaction.py` | [repo](backend/app/repositories/transaction_repository.py) · [schema](backend/app/schemas/payment_schema.py) · [model](backend/app/models/transaction.py) | Persists `Transaction` (`PENDING` -> `PAID`) and atomically creates `VisitorSession` in `mark_as_paid`. |

#### Quick-Fix Spots in These Files
- **Change ticket price (`50,000 VND`) & PayPal exchange rate**: [config.py#L112](backend/app/core/config.py#L112) (`AUDIO_GUIDE_SERVICE_FEE`, `PAYPAL_EXCHANGE_RATE`) & [payment_service.py#L155](backend/app/services/payment_service.py#L155).
- **Toggle payment simulation button**: [config.py#L116](backend/app/core/config.py#L116) (`ENABLE_PAYMENT_SIMULATION`) & [CheckoutModal.jsx#L30](frontend/src/components/visitor/CheckoutModal.jsx#L30).
- **Update VietQR bank account or visitor language handling**: [payment_service.py#L169](backend/app/services/payment_service.py#L169) (`create_checkout_order`).

---

### UC-6.2: 24-Hour Session, PIN Restore & Tour QR Page (DFD 4.3)

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `VisitorSessionContext.jsx` | [Open](frontend/src/contexts/VisitorSessionContext.jsx) | Persists `session_token`, PIN code, and 24h expiry in `localStorage` with live countdown. |
| FE | `RestoreSessionModal.jsx` | [Open](frontend/src/components/visitor/RestoreSessionModal.jsx) | 6-language modal for entering a `CCT-...` restore code. |
| FE | `QRCodePage.jsx` | [Open](frontend/src/views/QRCodePage.jsx) | `/qr` page rendering the public tour entry QR code. |
| FE | `sessionApi.js` & `dateUtils.js` | [sessionApi](frontend/src/api/sessionApi.js) · [dateUtils](frontend/src/utils/dateUtils.js) | Calls `POST /api/v1/sessions/restore` and normalizes UTC timestamps. |
| BE | `session_controller.py`, `session_service.py`, `session_repository.py` | [ctrl](backend/app/controllers/session_controller.py) · [svc](backend/app/services/session_service.py) · [repo](backend/app/repositories/session_repository.py) | Validates restore PIN, checks 24h expiry, and returns session credentials. |
| BE | `session_restore_rate_limit.py`, `session_schema.py`, `session.py` | [limiter](backend/app/core/session_restore_rate_limit.py) · [schema](backend/app/schemas/session_schema.py) · [model](backend/app/models/session.py) | Brute-force rate limiter, `CCT-...` code validation, and `VisitorSession` ORM model. |

#### Quick-Fix Spots in These Files
- **Change session lifetime (`24h`) or `CCT-...` code format**: [session.py#L14](backend/app/models/session.py#L14) (`get_default_expire_at`, `generate_session_code`) & [transaction_repository.py#L107](backend/app/repositories/transaction_repository.py#L107).
- **Adjust restore-PIN rate limits**: [session_restore_rate_limit.py](backend/app/core/session_restore_rate_limit.py).
- **Change `/qr` target URL**: [system_controller.py](backend/app/controllers/system_controller.py) (`get_public_config`) & `BASE_URL` in [.env.example](backend/.env.example).

---

## Core — Shared Infrastructure

#### Related Files
| Layer | File | Quick Link | Role |
| :---: | :--- | :---: | :--- |
| FE | `App.jsx` & `main.jsx` | [App.jsx](frontend/src/App.jsx) · [main.jsx](frontend/src/main.jsx) | Central route table (lazy-loaded Visitor/Admin bundles) and React entry point. |
| FE | `apiClient.js` & `NotFoundPage.jsx` | [apiClient](frontend/src/api/apiClient.js) · [404](frontend/src/views/NotFoundPage.jsx) | Shared HTTP client (base URL, cookies, error parsing) and 404 fallback page. |
| BE | `main.py` | [Open](backend/app/main.py) | FastAPI app factory, CORS, `/static` mount, 13 routers, and `lifespan` workers. |
| BE | `config.py`, `database.py`, `dependencies.py` | [config](backend/app/core/config.py) · [db](backend/app/core/database.py) · [deps](backend/app/core/dependencies.py) | Environment settings, SQLAlchemy engine, and Dependency Injection. |
| BE | `exceptions.py` & `limiter.py` | [exceptions](backend/app/core/exceptions.py) · [limiter](backend/app/core/limiter.py) | Unified JSON error envelope and SlowAPI per-endpoint rate limiter. |
| DB | `mysql_schema.sql` & `docker-compose.yml` | [schema.sql](backend/scripts/mysql_schema.sql) · [compose](docker-compose.yml) | Authoritative MySQL DDL (8 tables) and local Docker Compose setup. |

#### Quick-Fix Spots in These Files
- **Add a new frontend page route**: [App.jsx](frontend/src/App.jsx) (`VISITOR_ROUTES` / `ADMIN_ROUTES`, `<Routes>`) & [AdminNavbar.jsx](frontend/src/components/admin/AdminNavbar.jsx) (if Admin).
- **Register a new backend router or change CORS**: [main.py](backend/app/main.py) (`create_app`, `DEFAULT_CORS_ORIGINS`, `include_router`).
- **Change global API error JSON format**: [exceptions.py](backend/app/core/exceptions.py) (`build_error_envelope`) & [apiClient.js](frontend/src/api/apiClient.js) (`buildErrorFromResponse`).
- **Adjust API rate limits**: [config.py#L73](backend/app/core/config.py#L73) (`RATE_LIMIT_*`).
