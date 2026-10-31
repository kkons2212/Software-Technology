# MVP Codebase Mapping & Architectural Reference (Cu Chi Tunnels Smart Audio Guide)

This document maps the entire codebase of the MVP project, covering functions, methods, parameters, data types, and return values across both the Backend (FastAPI / SQLAlchemy) and Frontend (React / Vite).

---

## 1. Architectural Overview

```
[ FRONTEND: React / Vite ]
  │
  ├── Views (Admin / Visitor)
  │     ├── Components & Modals
  │     └── Contexts (Auth, Audio, VisitorSession) & Hooks (Geolocation, Geofence, Polling)
  │
  └── API Layer (Axios / Fetch Client)
        │
        ▼ (HTTP REST / JSON / Streaming)
[ BACKEND: FastAPI ]
  │
  ├── Middleware (Security, Audit Logging, Error Handling)
  │
  ├── Controllers (Routers / Request Handlers)
  │     ▼
  ├── Services (Business Logic & Orchestration)
  │     ├── Integrations (Offline Translator, EdgeTTS, PayOS, PayPal)
  │     └── Workers (Background Translation, Audio Synthesis)
  │     ▼
  ├── Repositories (Data Access Layer - Raw SQL / SQLAlchemy)
  │     ▼
  └── Schemas & Models (Pydantic DTOs & DB Tables / MySQL)
```

---

## 2. Backend Mapping

### 2.1. Controllers (Request Ingestion & Routing)

#### `app.controllers.auth_controller`
- **Prefix / Tags**: `/api/v1/auth`, `auth`
- **`login_admin(payload: AdminLoginRequest, request: Request, response: Response, auth_service: AuthService) -> AdminSessionResponse`**
  - *Parameters*:
    - `payload`: Pydantic object containing `username` (trimmed string) and `password` (string).
    - `request`: `fastapi.Request` instance used to resolve client IP via `resolve_client_ip`.
    - `response`: `fastapi.Response` instance used to plant the HttpOnly `admin_access_token` cookie.
    - `auth_service`: Dependency injected from `get_auth_service`.
  - *Returns*: `AdminSessionResponse` containing `success: bool`, `data: AdminSessionDataResponse(admin: AdminProfileResponse)`.
  - *Notes*: Sets an HttpOnly `admin_access_token` cookie with an 8-hour lifetime.
- **`read_current_admin(current_admin: AdminProfileResponse) -> AdminSessionResponse`**
  - *Parameters*: `current_admin`: Injected from `get_current_admin_profile` (decodes the JWT token from cookie).
  - *Returns*: `AdminSessionResponse` containing current admin profile.
- **`logout_admin(request: Request, response: Response, current_admin: AdminProfileResponse, auth_service: AuthService) -> AdminLogoutResponse`**
  - *Parameters*: Request token and current admin profile.
  - *Returns*: `AdminLogoutResponse` containing `success: True`, `data.message: "Logged out successfully."`.
  - *Notes*: Clears `admin_access_token` cookie (Max-Age=0) and records audit log entry.

---

#### `app.controllers.poi_controller` (Visitor & Admin POI Queries)
- **Prefix / Tags**: `/api/v1/pois`, `pois`
- **`get_map_pois(service: POIService, language: str = 'vi', token: str | None = None, ...) -> APIResponse[list[POIMapItem]]`**
  - *Endpoint*: `GET /api/v1/pois`
  - *Parameters*: `language` (ISO code: `vi`, `en`, `ja`, `ko`, `zh`), `token` (visitor session token to unlock full descriptions).
  - *Returns*: List of `POIMapItem` objects (`id`, `title`, `short_description`, `image_url`, `latitude`, `longitude`, `trigger_radius`, `description` (masked if unpaid), `audio_url`, `is_locked`).
- **`get_visitor_poi_detail(poi_id: str, service: POIService, language: str = 'vi', ...) -> APIResponse[POIMapItem]`**
  - *Endpoint*: `GET /api/v1/pois/{poi_id}`
  - *Returns*: Detailed single POI information as `POIMapItem`.
- **`create_poi(request: Request, background_tasks: BackgroundTasks, current_admin: AdminProfileResponse, poi_service: POIService) -> POIResponse`**
  - *Endpoint*: `POST /api/v1/pois` (Admin only)
  - *Parameters*: Form data or JSON (`title`, `short_description`, `description`, `latitude`, `longitude`, `radius`, `image_file`).
  - *Returns*: `POIResponse` containing the created POI record along with initial multilingual translation statuses.
  - *Background Tasks*: Dispatches `pipeline_service.trigger_poi_translation_pipeline`.
- **`list_pois(page: int, size: int, search: str, poi_service: POIService, _) -> POIListResponse`**
  - *Endpoint*: `GET /api/v1/admin/pois` (Admin catalog)
  - *Returns*: `POIListResponse(items: list[POIResponse], total: int, page: int, size: int)`.
- **`get_poi(poi_id: str, poi_service: POIService, _) -> POIResponse`**
  - *Endpoint*: `GET /api/v1/admin/pois/{poi_id}`.

---

#### `app.controllers.admin_poi_controller` (Admin POI Operations)
- **Prefix / Tags**: `/api/v1/admin/pois`, `admin-pois`
- **`update_poi(poi_id: str, payload: POIUpdateRequest, request: Request, background_tasks: BackgroundTasks, service: POIService, current_admin: AdminProfileResponse) -> POIUpdateResponse`**
  - *Endpoint*: `PATCH /api/v1/admin/pois/{poi_id}`
  - *Parameters*: `payload` (`title`, `short_description`, `description`, `image_url`, `latitude`, `longitude`, `radius`).
  - *Returns*: `POIUpdateResponse(success=True, data=POIMapItem)`.
  - *Side Effects*: If narrative fields (`title`, `description`) change, foreign language translations are flagged as `NEEDS_UPDATE` and background re-translation is scheduled.
- **`set_poi_visibility(poi_id: str, payload: POIVisibilityUpdateRequest, request: Request, service: POIService, current_admin: AdminProfileResponse) -> POIResponse`**
  - *Endpoint*: `PUT /api/v1/admin/pois/{poi_id}/visibility`
  - *Parameters*: `payload.is_active: bool`.
  - *Returns*: `POIResponse` reflecting updated visibility state.
- **`upload_poi_image(file: UploadFile, service: POIService, current_admin: AdminProfileResponse) -> dict`**
  - *Endpoint*: `POST /api/v1/admin/pois/upload-image`
  - *Returns*: `{"image_url": str}`.

---

#### `app.controllers.audio_controller`
- **Prefix / Tags**: `/api/v1/audio`, `audio`
- **`stream_poi_audio(poi_id: str, language: str, token: str | None, x_session_token: str | None, authorization: str | None, audio_service: AudioService) -> FileResponse`**
  - *Endpoint*: `GET /api/v1/audio/{poi_id}`
  - *Parameters*:
    - `poi_id`: Exhibit ID (e.g., `POI_9F9F3176070C`).
    - `language`: Audio language code (`vi`, `en`, `ja`, `ko`, `zh`).
    - Session token: Extracted from query param `token`, header `X-Session-Token`, or `Authorization: Bearer <token>`.
  - *Returns*: `FileResponse` (`.mp3` file stream with `Accept-Ranges: bytes`, `Content-Type: audio/mpeg`).
  - *Security*: Validates active 24-hour session via `audio_service.verify_streaming_access`.

---

#### `app.controllers.payment_controller`
- **Prefix / Tags**: `/api/v1/payments`, `payments`
- **`create_checkout_order(payload: CheckoutCreateRequest, payment_service: PaymentService) -> CheckoutCreateResponse`**
  - *Endpoint*: `POST /api/v1/payments/checkout`
  - *Parameters*: `payment_method` (`VIETQR`, `CARD`, `PAYPAL`), `preferred_language` (`vi`, `en`, etc.).
  - *Returns*: `CheckoutCreateResponse` with `order_id`, `pay_amount`, `qr_code_url`, `checkout_url`, `transfer_bank`, `transfer_account`, `transfer_content`, `expires_at`.
- **`get_order_status(order_id: str, payment_service: PaymentService) -> OrderStatusResponse`**
  - *Endpoint*: `GET /api/v1/payments/order/{order_id}`
  - *Returns*: `OrderStatusResponse` (`PENDING`, `PAID`, `EXPIRED`), `session_code`, `session_token`, `session_expires_at`.
- **`simulate_payment_success(order_id: str, body: SimulatePaymentRequest, payment_service: PaymentService) -> OrderStatusResponse`**
  - *Endpoint*: `POST /api/v1/payments/order/{order_id}/simulate-success` (Development/testing environment).
- **`handle_payment_webhook(payload: PayOSWebhookPayload, payment_service: PaymentService) -> WebhookResponse`**
  - *Endpoint*: `POST /api/v1/payments/webhook`
  - *Parameters*: Signed webhook payload from PayOS gateway.

---

#### `app.controllers.session_controller`
- **Prefix / Tags**: `/api/v1/sessions`, `sessions`
- **`restore_session(payload: SessionRestoreRequest, session_service: SessionService) -> SessionRestoreResponse`**
  - *Endpoint*: `POST /api/v1/sessions/restore`
  - *Parameters*: `payload.session_code`: 6-character uppercase alphanumeric recovery code.
  - *Returns*: `SessionRestoreResponse` with `session_token`, `remaining_seconds`, `status`, `expires_at`, `preferred_language`.

---

#### `app.controllers.translation_controller`
- **Prefix / Tags**: `/api/v1/admin/translations`, `admin-translations`
- **`list_translations(poi_id, language_id, status_filter, page, size, ...) -> TranslationListResponse`**
- **`get_translation_by_id(id: str, ...) -> TranslationResponse`**
- **`update_translation(id: str, payload: TranslationUpdateRequest, ...) -> TranslationResponse`**
- **`publish_translation(id: str, ...) -> TranslationResponse`**
- **`regenerate_translation_audio(id: str, tts_service: TTSService, ...) -> AudioRegenerationResponse`**

---

#### `app.controllers.telemetry_controller` & `analytics_controller`
- **`record_telemetry_trigger(payload: TelemetryTriggerCreate, telemetry_service) -> TelemetryTriggerResponse`**: Records geofence entry events (`POST /api/v1/telemetry/trigger`).
- **`get_analytics_summary(time_range: AnalyticsTimeRange, ...) -> AnalyticsSummaryResponse`**: Retrieves KPI dashboard metrics (`total_visitors`, `total_audio_plays`, `top_pois`, `language_distribution`).
- **`get_heatmap_telemetry(time_range, ...) -> HeatmapResponse`**: Retrieves coordinate intensity and visitor distribution for the density heatmap.
- **`export_telemetry_dataset(...) -> StreamingResponse`**: Streams raw telemetry events as CSV or JSON.

---

#### `app.controllers.tour_controller` & `system_controller`
- **`get_walking_route(origin_lat, origin_lng, destination_poi_id, wayfinding_service) -> RouteResponse`**: Computes turn-by-turn walking paths formatted as GeoJSON Feature LineStrings to destination POIs.
- **`get_system_health(admin, storage_service) -> SystemHealthResponse`**: Monitors disk usage, audio cache size, database latency, and external service statuses.
- **`clean_orphaned_audio(request, admin, storage_service) -> CleanOrphansResponse`**: Scans and removes unreferenced `.mp3` cache files from disk.

---

### 2.2. Services (Business Logic Layer)

| Service | Primary Methods | Parameters | Returns |
| :--- | :--- | :--- | :--- |
| **`POIService`** | `create_poi` | `payload: POICreateRequest`, `created_by: str`, `image_file: UploadFile` | `POIResponse` |
| | `update_poi` | `poi_id: str`, `payload: POIUpdateRequest`, `admin_user_name: str` | `POIUpdateResponse` |
| | `get_visitor_pois` | `language: str`, `session_token: str \| None` | `list[POIMapItem]` |
| | `validate_coordinates_in_bounds` | `latitude: float`, `longitude: float` | `None` (raises `HTTPException 422` if out of bounds) |
| **`AuthService`** | `authenticate_admin` | `payload: AdminLoginRequest`, `client_ip: str` | `AdminSessionTokenDTO(access_token, admin)` |
| | `resolve_authenticated_admin` | `token: str` | `AdminProfileResponse` |
| **`PaymentService`** | `create_order` | `payment_method: str`, `preferred_language: str` | `CheckoutCreateResponse` |
| | `process_payment_success` | `transaction_id: str`, `preferred_language: str`, `gateway_tx_id: str` | `OrderStatusResponse` |
| | `get_order_status` | `order_id: str` | `OrderStatusResponse` |
| **`SessionService`** | `create_session_for_payment` | `transaction_id: str`, `preferred_language: str` | `VisitorSession` |
| | `restore_session_by_code` | `session_code: str` | `SessionRestoreData` |
| | `validate_active_session` | `session_token: str` | `VisitorSession` |
| **`TranslationPipelineService`** | `trigger_poi_translation_pipeline` | `poi_id: str`, `admin_username: str` | `None` (runs asynchronously across `en`, `ja`, `ko`, `zh`) |
| | `_translate_and_synthesize_language` | `poi_id: str`, `target_lang: str`, `narrative: dict` | `POITranslation` |
| **`TTSService`** | `synthesize_audio_for_translation` | `stran_id: str` | `tuple[audio_url: str, duration: int]` |
| **`WayfindingService`** | `generate_walking_route` | `origin_lat: float`, `origin_lng: float`, `dest_poi_id: str` | `GeoJsonRouteFeature` |
| **`StorageService`** | `get_storage_health` | None | `StorageHealthData` |
| | `clean_orphaned_audio_files` | `dry_run: bool` | `CleanOrphansData` |

---

### 2.3. Repositories (Data Access Layer)

- **`POIRepository`**:
  - `create(poi: POI) -> POI`
  - `get_by_id(poi_id: str) -> POI | None`
  - `list_active_pois() -> list[POI]`
  - `list_admin_catalog(page: int, size: int, search: str) -> tuple[list[POI], int]`
  - `update_poi(poi_id: str, fields: dict) -> POI | None`
- **`TranslationRepository`**:
  - `get_by_poi_and_language(poi_id: str, language_id: str) -> POITranslation | None`
  - `get_translations(poi_id, language_id, status, skip, limit) -> tuple[list[POITranslation], int]`
  - `update_translation(stran_id: str, ...) -> POITranslation | None`
  - `publish_translation(stran_id: str, admin_username: str) -> POITranslation | None`
- **`SessionRepository`**:
  - `create_session(transaction_id: str, preferred_language: str, duration_hours: int = 24) -> VisitorSession`
  - `find_by_session_code(session_code: str) -> VisitorSession | None`
  - `find_by_token(session_token: str) -> VisitorSession | None`
- **`TransactionRepository`**:
  - `create_transaction(pay_amount, payment_gateway, payment_method, ...) -> Transaction`
  - `get_by_id(transaction_id: str) -> Transaction | None`
  - `mark_as_paid(transaction_id: str, preferred_language: str, ...) -> tuple[Transaction, VisitorSession]`
- **`UserRepository`**:
  - `find_by_username(user_name: str) -> User | None`
  - `update_failed_attempts(user, failed_attempts, locked_until)`
  - `reset_failed_attempts(user)`
- **`TelemetryRepository`**:
  - `create_trigger(session_id, poi_id, dwell_time) -> POITrigger`
  - `count_visitor_sessions(range_start) -> int`
  - `list_heatmap_poi_triggers(range_start) -> list[tuple[str, str, float, float, int]]`

---

### 2.4. Integrations (External Service Connectors)

- **`DeepTranslatorClient`**:
  - Cascade priority order:
    1. `_translate_narrative_with_offline_api`: Local Docker Offline Translation API (`POST /translate`, port 8001).
    2. `_translate_narrative_with_google_cloud`: Google Cloud Translation API v2 (rotating key pool).
    3. `_translate_narrative_with_free_deep_translator`: Free library fallback.
  - Primary method: `translate_exhibit_narrative(title, short_desc, desc, target_lang, source_lang) -> dict[str, str | None]`.
- **`EdgeTTSClient`**:
  - Generates neural speech audio using Microsoft Edge Neural TTS.
  - Primary method: `synthesize_or_reuse(text, language_id, audio_dir, audio_hash) -> tuple[file_name: str, duration_sec: int, is_reused: bool]`.
- **`PayPalClient`**:
  - International payment checkout via PayPal REST API v2 Sandbox.
  - Primary methods: `create_order(...)`, `capture_order(paypal_order_id: str)`.

---

## 3. Frontend Mapping

### 3.1. API Clients (`src/api/`)

| API Module | Function Name | Declared Arguments | Target Endpoint |
| :--- | :--- | :--- | :--- |
| **`authApi.js`** | `loginAdmin` | `{ username, password }` | `POST /api/v1/auth/login` |
| | `fetchCurrentAdmin` | None | `GET /api/v1/auth/me` |
| | `logoutAdmin` | None | `POST /api/v1/auth/logout` |
| **`poiApi.js`** | `getMapPois` | `{ language, token, signal }` | `GET /api/v1/pois` |
| | `getVisitorPoiDetail` | `poiId, { language, token, signal }` | `GET /api/v1/pois/{poiId}` |
| | `getPois` | `{ page, size, search, signal }` | `GET /api/v1/admin/pois` |
| | `createPoi` | `poiData, imageFile, { signal }` | `POST /api/v1/pois` |
| | `updatePoi` | `poiId, changes, { signal }` | `PATCH /api/v1/admin/pois/{poiId}` |
| | `togglePoiVisibility`| `poiId, isActive, { signal }` | `PUT /api/v1/admin/pois/{poiId}/visibility` |
| | `uploadPoiImage` | `file, { signal }` | `POST /api/v1/admin/pois/upload-image` |
| **`paymentApi.js`** | `createCheckoutOrder`| `{ paymentMethod, preferredLanguage }` | `POST /api/v1/payments/checkout` |
| | `getOrderStatus` | `orderId, { signal }` | `GET /api/v1/payments/order/{orderId}` |
| | `simulatePaymentSuccess` | `orderId, { preferredLanguage }` | `POST /api/v1/payments/order/{orderId}/simulate-success` |
| **`sessionApi.js`** | `restoreSession` | `{ sessionCode }, { signal }` | `POST /api/v1/sessions/restore` |
| **`translationApi.js`** | `getTranslations` | `{ poiId, languageId, status, page, size }` | `GET /api/v1/admin/translations` |
| | `updateTranslation` | `translationId, payload, { signal }` | `PUT /api/v1/admin/translations/{id}` |
| | `publishTranslation`| `translationId, { signal }` | `POST /api/v1/admin/translations/{id}/publish` |
| | `regenerateTranslationAudio` | `translationId, { signal }` | `POST /api/v1/admin/translations/{id}/regenerate-audio` |
| **`telemetryApi.js`**| `reportPoiTrigger` | `{ poiId, sessionId, dwellTime, triggerType }` | `POST /api/v1/telemetry/trigger` |
| **`tourApi.js`** | `getWalkingRoute` | `{ originLat, originLng, destinationPoiId }` | `GET /api/v1/tours/walking-route` |
| **`analyticsApi.js`**| `getAnalyticsSummary` | `{ range, signal }` | `GET /api/v1/analytics/summary` |
| | `getHeatmapData` | `{ range, signal }` | `GET /api/v1/analytics/heatmap` |
| **`systemApi.js`** | `getSystemHealth` | `{ signal }` | `GET /api/v1/system/health` |
| | `cleanOrphanedAudio` | `{ signal }` | `POST /api/v1/system/clean-orphaned-audio` |

---

### 3.2. Contexts & State Management (`src/contexts/`)

#### 1. `AuthContext.jsx`
- **State Variables**:
  - `admin`: Profile of authenticated administrator (`{ user_name, email, full_name }` or `null`).
  - `isAuthenticated`: `boolean` (True when admin session is valid).
  - `isLoading`: `boolean` (True during initial session cookie validation).
- **Exported Actions**:
  - `login({ username, password })`: Submits login credentials, stores profile, sets `isAuthenticated`.
  - `logout()`: Clears cookie, resets state, redirects to login page.

#### 2. `VisitorSessionContext.jsx`
- **State Variables**:
  - `sessionToken`: `string | null` (Security token for audio streaming and paywall access).
  - `sessionCode`: `string | null` (6-character code for cross-device session recovery).
  - `expiresAt`: `string | null` (ISO-8601 expiration timestamp).
  - `preferredLanguage`: `string` (Defaults to `vi`).
  - `timeRemaining`: `number` (Milliseconds remaining in active session).
- **Exported Actions**:
  - `activateSession({ session_token, session_code, expires_at, preferred_language })`: Activates session upon payment confirmation.
  - `restoreSession(code)`: Recovers session using 6-character code.
  - `clearSession()`: Clears session on expiration or manual reset.
  - `setLanguage(lang)`: Updates tour language preference.

#### 3. `AudioPlayerContext.jsx`
- **State Variables**:
  - `currentPoi`: Active POI (`{ id, title, audioUrl }`).
  - `isPlaying`: `boolean`.
  - `currentTime`, `duration`: `number` (Playback timing).
  - `playbackRate`: Speed multiplier (`1.0`, `1.25`, `1.5`).
- **Exported Actions**:
  - `playPoiAudio(poi, audioUrl)`: Loads and plays narration audio.
  - `togglePlayPause()`: Toggles play/pause states.
  - `seekTo(seconds)`: Jumps to specific playback position.
  - `changePlaybackRate(rate)`: Adjusts playback speed.

---

### 3.3. Custom Hooks (`src/hooks/`)

- **`useGeolocation.js`**:
  - *Parameters*: `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }`.
  - *Returns*: `{ location: { lat, lng }, accuracy, error, isTracking, isOutsideMuseum }`.
  - *Role*: Tracks real-time GPS coordinates of visitors via `navigator.geolocation.watchPosition`.
- **`useGeofenceTrigger.js`**:
  - *Parameters*: `{ userLocation, pois, onTrigger, isUnlocked, currentPlayingPoiId, cooldownDurationMs }`.
  - *Role*: Computes Haversine distances to exhibits. Triggers `onTrigger(poi)` when within radius and outside cooldown.
- **`usePaymentPolling.js`**:
  - *Parameters*: `{ orderId, isOpen, onPaymentSuccess, onError, pollIntervalMs = 2500 }`.
  - *Role*: Polls `getOrderStatus` every 2.5 seconds while payment modal is open until order transitions to `PAID`.

---

### 3.4. Utility Functions (`src/utils/`)

- **`haversine.js`**:
  - `calculateHaversineDistance(origin: { lat, lng }, destination: { lat, lng }) -> number`: Computes distance in meters between two GPS coordinates.
- **`museumBounds.js`**:
  - `isWithinMuseumBounds(latitude, longitude) -> boolean`: Validates whether coordinates fall within acceptable geographic limits.
- **`cooldownService.js`**:
  - `isCooldownActive(poiId, durationMs) -> boolean`: Checks if POI narration was recently triggered.
  - `setCooldown(poiId, timestamp)`: Sets cooldown timestamp for triggered POI.
  - `getRemainingCooldownSeconds(poiId)`: Retrieves remaining cooldown seconds.

---

### 3.5. Views & Component Hierarchy

#### Admin Views (`src/views/admin/`)
1. **`AdminLoginView.jsx`**: Administrative login form with 15-minute lockout handling upon consecutive failures (`AccountLockoutModal`).
2. **`PoiCatalogPage.jsx`**: Complete POI catalog with visibility toggles (`DeactivateConfirmModal`) and exhibit creation (`AdminMapPicker` & cover image uploader).
3. **`GeofenceCalibPage.jsx`**: Dedicated geofence calibration workspace with draggable pins and radius slider (`AdminMapPicker`).
4. **`TranslationPage.jsx` / `TranslationAuditView.jsx`**: Side-by-side multilingual translation review, preview player (`AudioAuditPlayer`), and audio synthesis trigger (`RegenerateAudioButton`).
5. **`AnalyticsDashboard.jsx`**: Executive dashboard with visitor metrics, average tour duration, language distribution, and density heatmaps (`AnalyticsHeatmap`).
6. **`SystemHealthPage.jsx`**: Storage health monitor with capacity alerts (`StorageHealthBanner`) and cleanup modal (`CleanOrphansModal`).

#### Visitor Views (`src/views/visitor/`)
1. **`VisitorTourPage.jsx` / `VisitorMapView.jsx`**:
   - Interactive exhibit map (`OutdoorMapView`, `WalkingRouteLayer`, `VisitorLocationMarker`).
   - POI card carousel and list (`VisitorPoiCard`, `VisitorPoiList`).
   - Content paywall barrier (`ContentPaywallGate`).
   - Docked mini audio player (`MiniAudioPlayer`).
   - Wayfinding guidance banner (`VisitorWayfindingBanner`).
   - QR and Card payment modal (`CheckoutModal`).
2. **`CheckoutSuccessPage.jsx`**: Payment confirmation screen showing cross-device recovery code (`session_code`).
3. **`QRCodePage.jsx`**: Public QR entrance page for mobile onboarding.

---

## 4. End-to-End Data Flows

### 4.1. Automated Narration Trigger via Geofence
1. `useGeolocation` retrieves visitor coordinates `(lat, lng)`.
2. `useGeofenceTrigger` evaluates distances across POIs via `calculateHaversineDistance`.
3. If $d \le \text{trigger\_radius}$ and `isCooldownActive(poi_id)` is `false`:
   - Enforces cooldown via `setCooldown(poi_id)`.
   - Records telemetry event via `telemetryApi.reportPoiTrigger`.
   - Calls `playPoiAudio` in `AudioPlayerContext`.
   - Browser requests `GET /api/v1/audio/{poi_id}?token={session_token}&language={lang}`.
   - Backend validates streaming permissions via `AudioService.verify_streaming_access` and streams `.mp3` audio.

### 4.2. Checkout & 24-Hour Session Activation
1. Visitor selects payment method in `CheckoutModal`.
2. Frontend calls `paymentApi.createCheckoutOrder` -> Backend creates record in `transactions` table and initializes PayOS/PayPal order.
3. Hook `usePaymentPolling` checks order status every 2.5 seconds via `paymentApi.getOrderStatus`.
4. Upon successful payment verification:
   - Backend marks transaction as `PAID`.
   - `SessionService` generates 24-hour `visitor_sessions` record, secret `session_token`, and 6-character `session_code`.
5. Hook receives `PAID` status, stores credentials in `VisitorSessionContext` (`localStorage`), unlocks paywall, and enables premium narration streaming.

### 4.3. Translation & Voice Synthesis Pipeline
1. Admin creates or edits POI narrative in `POIFormModal`.
2. Backend saves Vietnamese source (`language_id = 'vi'`) in `pois` and `poi_translations`.
3. Background task `TranslationPipelineService` executes:
   - For each target language (`en`, `ja`, `ko`, `zh`):
     - Sends text block to `DeepTranslatorClient` (Docker Offline API on port 8001 -> Google Cloud fallback).
     - Saves translation record with status `PENDING`.
     - Calls `EdgeTTSClient` to synthesize localized `.mp3` audio.
     - Updates audio file path and transitions status to `READY` or `PUBLISHED`.
4. Admin UI reflects updated sync status through `AudioSyncBadge`.
