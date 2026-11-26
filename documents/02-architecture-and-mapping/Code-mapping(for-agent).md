# Codebase Mapping: Agent Fast-Pinpoint Reference (Cu Chi Tunnels Smart Audio Guide)

> **Scope:** Single-read map (< 44 KB). Active `MVP/` wired into [`main.py`](../../MVP/backend/app/main.py#L116) & [`App.jsx`](../../MVP/frontend/src/App.jsx#L60); stubs/wrappers excluded.  
> **Aliases:** `BE/`=`MVP/backend/app/`, `FE/`=`MVP/frontend/src/`, `T_BE/`=`MVP/backend/tests/unit/`, `T_FE/`=`MVP/frontend/src/` (`**/__tests__/`).

---

## 1. Agent Fast-Lookup Index

### 1.1 Symptom / Error Code -> Exact Pinpoint

| Symptom / HTTP / Error Code | Root Location (File + Symbol) | Primary Fix / Check Target |
|---|---|---|
| `423 ACCOUNT_LOCKED` / brute-force lockout | [`auth_service.py#L54`](../../MVP/backend/app/services/auth_service.py#L54) (`MAX_FAILED_ATTEMPTS=5`, `LOCKOUT_DURATION_MINUTES=15`) | `BE/services/auth_service.py`, `FE/components/admin/AccountLockoutModal.jsx` |
| `401 UNAUTHENTICATED` / JWT rejected after logout | [`auth_service.py#L242`](../../MVP/backend/app/services/auth_service.py#L242) (`_is_token_revoked`), [`dependencies.py#L73`](../../MVP/backend/app/core/dependencies.py#L73) | `BE/core/security.py`, `Audit` (`ADMIN_LOGOUT` timestamp) |
| `400 GEO_OUT_OF_BOUNDS` on POI create/edit | [`poi_service.py#L58`](../../MVP/backend/app/services/poi_service.py#L58) (`_is_within_cu_chi_bounds`), [`config.py#L148`](../../MVP/backend/app/core/config.py#L148) (`CU_CHI_BOUNDS`) | Set `ALLOW_GLOBAL_COORDINATES=True` or update `CU_CHI_BOUNDS` + `FE/utils/museumBounds.js` |
| Image upload rejected (`<= 5 MB`, MIME/Pillow) | [`poi_service.py#L88`](../../MVP/backend/app/services/poi_service.py#L88) (`validate_image_file`), [`config.py#L91`](../../MVP/backend/app/core/config.py#L91) | `BE/integrations/storage_client.py`, `BE/controllers/admin_poi_controller.py` |
| Broken `/static/images/` or `/api/v1/media/poi-images/` | [`media_controller.py#L26`](../../MVP/backend/app/controllers/media_controller.py#L26) (`get_poi_image`), [`main.py#L140`](../../MVP/backend/app/main.py#L140) | Check `STATIC_DIR`, `SUPABASE_URL`, `X-Content-Type-Options: nosniff` |
| Translation stuck `PENDING` / `FAILED` | [`pipeline_queue.py#L48`](../../MVP/backend/app/services/pipeline_queue.py#L48), [`deep_translator_client.py#L34`](../../MVP/backend/app/integrations/deep_translator_client.py#L34) | Render wake-up (`110s`) -> OpenRouter keys (`401/402/403/429` rotation) |
| Publish blocked (`NEEDS_UPDATE` / audio not `READY`) | [`translation_service.py#L172`](../../MVP/backend/app/services/translation_service.py#L172) (`publish_translation`) | Must call `POST /admin/translations/{id}/regenerate-audio` before publish |
| `401 INVALID_WEBHOOK_SIGNATURE` (PayOS) | [`payment_service.py#L586`](../../MVP/backend/app/services/payment_service.py#L586) (`verify_payos_webhook_signature`) | Verify `PAYOS_CHECKSUM_KEY` and exact `PayAmount`/`Currency` match |
| `404` on `/simulate-success` or `/paypal-checkout` | [`payment_controller.py#L75`](../../MVP/backend/app/controllers/payment_controller.py#L75), [`config.py#L141`](../../MVP/backend/app/core/config.py#L141) | `is_payment_simulation_allowed` requires `ENVIRONMENT=development` or `ENABLE_PAYMENT_SIMULATION=True` |
| `404 SESSION_NOT_FOUND` or `429` on PIN restore | [`session_service.py#L16`](../../MVP/backend/app/services/session_service.py#L16), [`session_restore_rate_limit.py#L9`](../../MVP/backend/app/core/session_restore_rate_limit.py#L9) | `5` attempts / `60s` per IP & per `CCT-` code; 24h TTL in `VisitorSession.Expire_at` |
| `403 CONTENT_LOCKED` / `404 AUDIO_NOT_FOUND` | [`audio_service.py#L34`](../../MVP/backend/app/services/audio_service.py#L34), [`audio_repository.py#L145`](../../MVP/backend/app/repositories/audio_repository.py#L145) | Check `token` / `X-Session-Token` / `Bearer`; audio falls back to `vi` if missing |
| Geofence auto-play not firing repeatedly | [`cooldownService.js#L9`](../../MVP/frontend/src/services/cooldownService.js#L9) (`DEFAULT_COOLDOWN_DURATION_MS=600000`), [`useGeofenceTrigger.js#L29`](../../MVP/frontend/src/hooks/useGeofenceTrigger.js#L29) | 10-minute `localStorage` lock (`poi_cooldown_*`), radius clamped `10m–50m` |
| Walking route slow or straight-line fallback | [`wayfinding_service.py#L106`](../../MVP/backend/app/services/wayfinding_service.py#L106) (`_resolve_route_coordinates`) | Bypass `<= 35m`, OSRM `0.8s` timeout, Haversine fallback |
| `/qr` link points to `localhost` or wrong origin | [`config.py#L207`](../../MVP/backend/app/core/config.py#L207) (`resolve_base_url`), [`system_controller.py#L80`](../../MVP/backend/app/controllers/system_controller.py#L80) | Set `BASE_URL` or `CLOUDFLARE_TUNNEL_URL` in `MVP/backend/.env` |
| Storage `WARNING` (`>=85%`) / `CRITICAL` (`>=95%`) | [`storage_service.py#L24`](../../MVP/backend/app/services/storage_service.py#L24), [`config.py#L93`](../../MVP/backend/app/core/config.py#L93) (`STORAGE_QUOTA_BYTES=1GB`) | Run `POST /api/v1/admin/storage/clean-orphans` (`1/5minute`) |

### 1.2 UI Route -> Page & Components ([`App.jsx`](../../MVP/frontend/src/App.jsx#L19))

| Route Path | View Component | Key Child Components / Contexts | Module |
|---|---|---|---|
| `/`, `/visitor`, `/tour` | [`VisitorTourPage.jsx`](../../MVP/frontend/src/views/visitor/VisitorTourPage.jsx#L70) | `VisitorHeader`, `VisitorMapView`, `VisitorPoiMarkers`, `VisitorLocationMarker`, `RouteOverlay`, `PoiPreviewCard`, `ContentPaywallGate`, `MiniAudioPlayer`, `CheckoutModal`, `RestoreSessionModal`, `VisitorSessionContext`, `AudioPlayerContext` | [5.0](#module-50-interactive-map-gps-geofencing--osrm-wayfinding) & [4.0](#module-40-digital-admission-payment--24h-visitor-session) |
| `/visitor/checkout/success` | [`CheckoutSuccessPage.jsx`](../../MVP/frontend/src/views/visitor/CheckoutSuccessPage.jsx#L1) | `usePaymentPolling`, `VisitorSessionContext` | [4.0](#module-40-digital-admission-payment--24h-visitor-session) |
| `/qr` | [`QRCodePage.jsx`](../../MVP/frontend/src/views/QRCodePage.jsx#L29) | `systemApi.getPublicSystemConfig` | [5.0](#module-50-interactive-map-gps-geofencing--osrm-wayfinding) |
| `/admin/login` | [`AdminLoginView.jsx`](../../MVP/frontend/src/views/admin/AdminLoginView.jsx#L34) | `AccountLockoutModal`, `AuthContext` | [1.0](#module-10-administrative-authentication--session-security) |
| `/admin`, `/admin/analytics` | [`AnalyticsDashboard.jsx`](../../MVP/frontend/src/views/admin/AnalyticsDashboard.jsx#L52) | `AdminRouteGuard`, `AdminLayout`, `AdminNavbar`, `AnalyticsHeatmap`, `AnalyticsExport` | [6.0](#module-60-operational-telemetry-density-heatmap--system-health) |
| `/admin/pois` | [`PoiCatalogPage.jsx`](../../MVP/frontend/src/views/admin/PoiCatalogPage.jsx#L20) | `POIFormModal`, `DeactivateConfirmModal`, `AdminMapPicker` | [2.0](#module-20-exhibition-catalog--spatial-geofence-management) |
| `/admin/geofence`, `/admin/pois/:id/geofence` | [`GeofenceCalibPage.jsx`](../../MVP/frontend/src/views/admin/GeofenceCalibPage.jsx#L24) | `AdminMapPicker` | [2.0](#module-20-exhibition-catalog--spatial-geofence-management) |
| `/admin/translations` | [`TranslationPage.jsx`](../../MVP/frontend/src/views/admin/TranslationPage.jsx#L7) | `TranslationAuditView`, `AudioSyncBadge`, `AudioAuditPlayer`, `RegenerateAudioButton` | [3.0](#module-30-multilingual-translation--edge-tts-audio-pipeline) |
| `/admin/health` | [`SystemHealthPage.jsx`](../../MVP/frontend/src/views/admin/SystemHealthPage.jsx#L7) | `StorageHealthBanner`, `CleanOrphansModal` | [6.0](#module-60-operational-telemetry-density-heatmap--system-health) |
| `*` | [`NotFoundPage.jsx`](../../MVP/frontend/src/views/NotFoundPage.jsx#L3) | Fallback 404 page | [Core](#core--shared-infrastructure) |

### 1.3 Module & DFD / UC Jump Table

| Module | DFD | UC | Domain | Tables | Jump |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **1.0** | 1.0 | UC-02 | Admin Auth & Security | `User`, `Audit` | [1.0](#module-10-administrative-authentication--session-security) |
| **2.0** | 2.0 | UC-03 | POI Catalog & Geofence | `POI`, `POITranslation`, `LanguageCode`, `Audit` | [2.0](#module-20-exhibition-catalog--spatial-geofence-management) |
| **3.0** | 3.0 | UC-04 | Translation & Edge-TTS | `POITranslation`, `LanguageCode`, `POI`, `Audit` | [3.0](#module-30-multilingual-translation--edge-tts-audio-pipeline) |
| **4.0** | 4.0 | UC-06 | Payment & 24h Session | `Transaction`, `VisitorSession`, `POITranslation` | [4.0](#module-40-digital-admission-payment--24h-visitor-session) |
| **5.0** | 5.0 | UC-01 | Map, GPS & Wayfinding | `POI`, `POITranslation`, `LanguageCode`, `VisitorSession` | [5.0](#module-50-interactive-map-gps-geofencing--osrm-wayfinding) |
| **6.0** | 6.0 | UC-05 | Telemetry, Heatmap & Health | `POITrigger`, `VisitorSession`, `POI`, `POITranslation`, `Audit` | [6.0](#module-60-operational-telemetry-density-heatmap--system-health) |
| **Core** | - | - | Shared Routing, HTTP, DB, Docker | All 8 tables | [Core](#core--shared-infrastructure) & [Checklist](#maintenance--verification-checklist) |

---

## 2. System Topology, API Surface & Data Model

### 2.1 3-Tier Architecture

```text
FE (React 18): views/ -> components/{admin,visitor} + contexts/{Auth,VisitorSession,AudioPlayer} + hooks/ + api/
BE (FastAPI):  main.py (14 routers) -> controllers/ -> services/ + workers -> repositories/ -> MySQL 8 (8 tables)
                                                    -> integrations/ (Render, OpenRouter, EdgeTTS, PayPal, Supabase)
```

### 2.2 Complete API-to-Service Matrix (`main.py` Routers)

| Mod | Endpoint | Auth / Limit | Controller -> Service Method | Schema |
|---|---|---|---|---|
| 1.0 | `POST /api/v1/auth/login` | Pub / `5/m` | `auth_controller` -> `AuthService.authenticate_admin` | `AdminSessionResponse` |
| 1.0 | `GET /api/v1/auth/me` | Admin / Def | `auth_controller` -> `dependencies.get_current_admin_profile` | `AdminSessionResponse` |
| 1.0 | `POST /api/v1/auth/logout` | Admin / Def | `auth_controller` -> `AuthService.logout_admin` | `AdminLogoutResponse` |
| 2.0 | `GET /api/v1/pois` | Pub / `60/m` | `poi_controller` -> `POIService.list_map_pois` | `APIResponse[list[POIMapItem]]` |
| 2.0 | `GET /api/v1/pois/{poi_id}` | Pub / Def | `poi_controller` -> `POIService.get_visitor_poi_detail` | `APIResponse[POIMapItem]` |
| 2.0 | `POST /api/v1/admin/pois` | Admin / Def | `poi_controller` -> `POIService.create_new_poi` | `POIResponse` |
| 2.0 | `GET /api/v1/admin/pois` | Admin / Def | `poi_controller` -> `POIService.list_pois` | `POIListResponse` |
| 2.0 | `GET /api/v1/admin/pois/{poi_id}` | Admin / Def | `poi_controller` -> `POIService.get_poi_details` | `POIResponse` |
| 2.0 | `PUT /api/v1/admin/pois/{poi_id}` | Admin / Def | `admin_poi_controller` -> `POIService.update_poi` | `POIUpdateResponse` |
| 2.0 | `POST /api/v1/admin/pois/upload-image` | Admin / `10/m` | `admin_poi_controller` -> `POIService.save_cover_image` | `{"image_url": str}` |
| 2.0 | `PATCH /api/v1/admin/pois/{poi_id}/visibility` | Admin / Def | `admin_poi_controller` -> `POIService.set_poi_visibility` | `POIResponse` |
| 2.0 | `POST /api/v1/admin/pois/{poi_id}/retry-translations` | Admin / Def | `admin_poi_controller` -> `POIService.retry_poi_translations` | `POIRetryTranslationResponse` |
| 3.0 | `GET /api/v1/languages` | Pub / Def | `language_controller` -> `LanguageService.list_published` / `list_all` | `APIResponse[list[PublishedLanguage]]` |
| 3.0 | `GET /api/v1/admin/translations` | Admin / Def | `translation_controller` -> `TranslationService.list_translations` | `TranslationListResponse` |
| 3.0 | `GET /api/v1/admin/translations/{id}` | Admin / Def | `translation_controller` -> `TranslationService.get_translation_by_id` | `TranslationResponse` |
| 3.0 | `PUT /api/v1/admin/translations/{id}` | Admin / Def | `translation_controller` -> `TranslationService.update_translation` | `TranslationResponse` |
| 3.0 | `POST /api/v1/admin/translations/{id}/regenerate-audio` | Admin / `3/m` | `translation_controller` -> `TTSService.regenerate_audio` | `AudioRegenerationResponse` |
| 3.0 | `POST /api/v1/admin/translations/{id}/publish` | Admin / Def | `translation_controller` -> `TranslationService.publish_translation` | `TranslationResponse` |
| 3.0 | `POST /api/v1/admin/translations/{id}/retry` | Admin / Def | `translation_controller` -> `TranslationService.retry_translation` | `TranslationResponse` |
| 4.0 | `POST /api/v1/payments/create-checkout` | Pub / `5/m` | `payment_controller` -> `PaymentService.create_checkout_order` | `CheckoutCreateResponse` |
| 4.0 | `GET /api/v1/payments/order/{order_id}/status` | Pub / `30/m` | `payment_controller` -> `PaymentService.get_order_status` | `OrderStatusResponse` |
| 4.0 | `POST /api/v1/payments/order/{order_id}/simulate-success` | Dev / Def | `payment_controller` -> `PaymentService.simulate_payment_success` | `OrderSessionResponse` |
| 4.0 | `POST /api/v1/payments/webhook` | HMAC / Unlim | `payment_controller` -> `PaymentService.process_payment_webhook` | `WebhookResponse` |
| 4.0 | `GET /api/v1/payments/paypal-checkout` & `/confirm-mock` | Dev / Def | `payment_controller` -> Mock PayPal HTML & redirect | `HTMLResponse` / `RedirectResponse` |
| 4.0 | `POST /api/v1/payments/order/{order_id}/session` | Token / `10/m` | `payment_controller` -> `PaymentService.exchange_order_session` | `OrderSessionResponse` |
| 4.0 | `POST /api/v1/payments/order/{order_id}/paypal-capture` | Token / Def | `payment_controller` -> `PaymentService.capture_paypal_order` | `OrderSessionResponse` |
| 4.0 | `POST /api/v1/sessions/restore` | Pub / `5/60s` | `session_controller` -> `SessionService.restore_session` | `SessionRestoreResponse` |
| 4.0 | `GET /api/v1/audio/{poi_id}` (alias `/stream/{poi_id}`) | 24h / `20/m` | `audio_controller` -> `AudioService.get_audio_source_for_poi` | `FileResponse` / `307` |
| 5.0 | `GET /api/v1/tour/route` | Pub / `10/m` | `tour_controller` -> `WayfindingService.calculate_walking_route` | `RouteResponse` |
| 5.0 | `GET /api/v1/media/poi-images/{filename}` | Pub / Def | `media_controller` -> `StorageClient.download_file` / disk | `Response` / `FileResponse` |
| 5.0 | `GET /api/v1/system/public-config` | Pub / Def | `system_controller` -> `resolve_base_url` | `PublicConfigResponse` |
| 6.0 | `POST /api/v1/telemetry/trigger` | Pub / `20/m` | `telemetry_controller` -> `TelemetryService.ingest_trigger` | `TelemetryTriggerResponse` |
| 6.0 | `GET /api/v1/admin/analytics/summary` & `/heatmap` | Admin / Def | `analytics_controller` -> `TelemetryService.get_analytics_summary` / `get_heatmap_data` | `AnalyticsSummaryResponse` / `HeatmapResponse` |
| 6.0 | `GET /api/v1/admin/analytics/export` | Admin / Def | `analytics_controller` -> `ExportService.stream_csv` / `stream_json` | `StreamingResponse` |
| 6.0 | `GET /api/v1/admin/system/health` | Admin / Def | `system_controller` -> `StorageService.get_system_health` | `SystemHealthResponse` |
| 6.0 | `POST /api/v1/admin/storage/clean-orphans` | Admin / `1/5m` | `system_controller` -> `StorageService.prune_orphaned_audio_files` | `CleanOrphansResponse` |
| 6.0 | `GET /health` | Pub / Def | `main` (`health_check`) | `{"status": "ok"}` |

### 2.3 Service-to-Repository-to-DB Matrix ([`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L23))

| Repository | ORM (`BE/models/`) | MySQL Table | Consuming Services & FKs |
|---|---|---|---|
| [`user_repository.py`](../../MVP/backend/app/repositories/user_repository.py#L15) | `user.py` | `User` | `AuthService`; parent of `Audit`, `POI`, `POITranslation` |
| [`audit_repository.py`](../../MVP/backend/app/repositories/audit_repository.py#L17) | `audit.py` | `Audit` | `AuthService`, `POIService`, `TranslationService`, `StorageService`; FK `UserName -> User` (`RESTRICT`) |
| [`language_repository.py`](../../MVP/backend/app/repositories/language_repository.py#L13) | `language.py` | `LanguageCode` | `LanguageService`, `POIService`, `TranslationPipelineService` (`vi, en, ja, ko, zh, fr`) |
| [`poi_repository.py`](../../MVP/backend/app/repositories/poi_repository.py#L12) | `poi.py` | `POI` | `POIService`, `WayfindingService`, `Translation*`, `StorageService`; FK `Create_by -> User` (`SET NULL`) |
| [`translation_repository.py`](../../MVP/backend/app/repositories/translation_repository.py#L9) | `translation.py` | `POITranslation` | `TranslationService`, `TranslationPipelineService`, `TranslationWorker`, `AudioSynthesisWorker`; FKs `PoiID`, `LanguageID`, `Review_by` (`RESTRICT`) |
| [`audio_repository.py`](../../MVP/backend/app/repositories/audio_repository.py#L13) | `audio.py` | `POITranslation` (Audio) | `AudioService`, `TTSService`, `AudioSynthesisWorker`, `StorageService`; `POIAudio` dataclass over `Audio_url`, `Duration`, `File_size` |
| [`transaction_repository.py`](../../MVP/backend/app/repositories/transaction_repository.py#L14) | `transaction.py` | `Transaction` | `PaymentService`; parent of `VisitorSession` (`TransactionID`) |
| [`session_repository.py`](../../MVP/backend/app/repositories/session_repository.py#L12) | `session.py` | `VisitorSession` | `SessionService`, `PaymentService`, `AudioService`, `POIService`; FKs `PreferredLanguage`, `TransactionID` (`RESTRICT`) |
| [`telemetry_repository.py`](../../MVP/backend/app/repositories/telemetry_repository.py#L15) | `trigger.py` | `POITrigger` | `TelemetryService`, `ExportService`; FKs `SessionID -> VisitorSession`, `PoiID -> POI` (`RESTRICT`) |

---

## Module 1.0: Administrative Authentication & Session Security

- **Scope:** DFD 1.0 / UC-02 | **Tables:** `User`, `Audit` | **Entry:** `FE/views/admin/AdminLoginView.jsx`, `BE/controllers/auth_controller.py` (`/api/v1/auth`)

### 1.1 Subprocesses & 3-Layer Feature Map

| ID | Feature / DFD Subprocess | Layer 1 (Frontend) | Layer 2 (Backend) | Layer 3 (Data & Schema) | Test Files |
|---|---|---|---|---|---|
| **1.1** | Login & Bcrypt | `AdminLoginView.jsx`, `AuthContext.jsx`, `authApi.js` | `auth_controller` (`POST /login`), `auth_service`, `security` | `user_repository`, `AdminLoginRequest`, `User` | `T_BE/controllers/test_auth_controller.py`, `T_FE/views/admin/__tests__/AdminLoginView.test.jsx` |
| **1.2** | Brute-Force Lockout | `AccountLockoutModal.jsx` | `auth_service` (`_evaluate_admin_login`), `limiter` (`5/min`) | `user_repository`, `User.FalsedAttempts`, `Lockeduntil` | `T_BE/services/test_auth_service.py`, `T_FE/components/__tests__/AccountLockoutModal.test.jsx` |
| **1.3** | Cookie & Profile | `apiClient.js`, `AdminRouteGuard.jsx`, `AdminLayout.jsx`, `AdminNavbar.jsx` | `auth_controller` (`GET /me`), `dependencies` | `config` (`ACCESS_TOKEN_EXPIRE_MINUTES=60`), `AdminProfileResponse` | `T_BE/core/test_security.py`, `T_FE/components/admin/__tests__/AdminNavbar.test.jsx`, `AdminRouteGuard.test.jsx` |
| **1.4** | Logout & 30m Idle | `AdminNavbar.jsx`, `useIdleTimer.js`, `AuthContext.jsx` | `auth_controller` (`POST /logout`), `auth_service` (`_is_token_revoked`) | `audit_repository` (`find_last_logout_at`), `Audit` | `T_BE/repositories/test_audit_repository.py`, `T_FE/contexts/__tests__/AuthContext.test.jsx`, `T_FE/hooks/__tests__/useIdleTimer.test.js` |

### 1.2 UI, Business Rules & Validation Control Points
- **UI:** `AdminLoginView.jsx` (`/admin/login`: `username`, `password`, error banner, `AccountLockoutModal`); `AdminNavbar.jsx` (`/admin/*`: greeting `full_name || user_name`, `StorageHealthBanner`, Logout).
- **BR-AUTH-01..05:** Bcrypt `BCRYPT_ROUNDS=12` + `DUMMY_BCRYPT_HASH` on unknown user; lock `15` min after `5` failures (HTTP 423); HS256 JWT (`60m`) in `admin_session` cookie (`httponly=True`, `samesite="strict"`); `ADMIN_LOGOUT` audit row revokes all older JWTs; `useIdleTimer` logs out after `IDLE_TIMEOUT_MINUTES=30`.
- **VAL-AUTH-01..02:** `AdminLoginRequest.username` (`1..255` trimmed; DB `User.UserName` max `20`), `password` (`1..128` byte-exact); `JWT_SECRET_KEY` (`64` hex chars); login rate limit `5/minute`.

### 1.3 Quick-Fix Spots & Change Impact
- **Lockout threshold (`5`) & duration (`15m`):** [`auth_service.py#L54`](../../MVP/backend/app/services/auth_service.py#L54) & [`AccountLockoutModal.jsx#L11`](../../MVP/frontend/src/components/admin/AccountLockoutModal.jsx#L11).
- **JWT expiry (`60m`), idle timeout (`30m`), cookie `Secure`, rate limit (`5/minute`):** [`config.py#L64`](../../MVP/backend/app/core/config.py#L64), [`auth_controller.py#L55`](../../MVP/backend/app/controllers/auth_controller.py#L55), [`useIdleTimer.js#L41`](../../MVP/frontend/src/hooks/useIdleTimer.js#L41).
- **Change Impact:** UI (`AdminLoginView`, `AccountLockoutModal`, `AdminNavbar`, `adminTranslations.js`) | Validation (`auth_schema.py`, `AdminLoginView`) | Rules (`auth_service.py`, `config.py`, `security.py`) | DB (`mysql_schema.sql`, `user.py`, `audit.py`, `user_repository.py`, `audit_repository.py`).

---

## Module 2.0: Exhibition Catalog & Spatial Geofence Management

- **Scope:** DFD 2.0 / UC-03 | **Tables:** `POI`, `POITranslation`, `LanguageCode`, `Audit` | **Entry:** `FE/views/admin/PoiCatalogPage.jsx`, `GeofenceCalibPage.jsx`, `BE/controllers/poi_controller.py`, `admin_poi_controller.py`

### 2.1 Subprocesses & 3-Layer Feature Map

| ID | Feature / DFD Subprocess | Layer 1 (Frontend) | Layer 2 (Backend) | Layer 3 (Data & Schema) | Test Files |
|---|---|---|---|---|---|
| **2.1** | Catalog List & Detail | `PoiCatalogPage.jsx`, `poiApi.js` | `poi_controller` (`GET /admin/pois`, `/{poi_id}`), `poi_service` | `poi_repository`, `POIListResponse`, `POIResponse` | `T_FE/views/admin/__tests__/PoiCatalogPage.test.jsx`, `T_BE/controllers/test_poi_controller.py` |
| **2.2** | Create & Auto-Seed | `PoiCatalogPage.jsx`, `poiApi.js` | `poi_controller` (`POST /admin/pois`), `poi_service` (`create_new_poi`) | `poi_repository`, `POICreateRequest`, `POI`, `POITranslation` | `T_BE/services/test_poi_service.py`, `T_BE/schemas/test_poi_schema.py` |
| **2.3** | Artwork Upload (`<=5MB`) | `POIFormModal.jsx`, `poiApi.js` | `admin_poi_controller` (`POST /upload-image`), `poi_service`, `storage_client` | `config` (`MAX_IMAGE_SIZE_BYTES`), `/static/images` or Supabase | `T_BE/controllers/test_admin_poi_controller.py`, `T_BE/integrations/test_storage_client.py` |
| **2.4** | Edit, Delta & Retry | `POIFormModal.jsx`, `adminPoiApi.js`, `poiApi.js` | `admin_poi_controller` (`PUT /{id}`, `POST /retry-translations`), `poi_service` | `poi_repository` (`update_translation_narrative_and_invalidate_foreign`), `POIUpdateRequest` | `T_FE/components/__tests__/POIFormModal.test.jsx`, `T_BE/repositories/test_poi_repository.py` |
| **2.5** | Geofence & Visibility | `GeofenceCalibPage.jsx`, `AdminMapPicker.jsx`, `DeactivateConfirmModal.jsx` | `admin_poi_controller` (`PUT /{id}`, `PATCH /visibility`), `poi_service` | `POI` (`CHK_POI_Radius_Range: 10..50`, `Is_Active`) | `T_FE/views/admin/__tests__/GeofenceCalibPage.test.jsx`, `AdminMapPicker.test.jsx`, `DeactivateConfirmModal.test.jsx` |
| **2.6** | Visitor POIs & Paywall | `VisitorTourPage.jsx`, `poiApi.js` | `poi_controller` (`GET /pois`, `/{id}`), `poi_service` (`_to_map_item`) | `POIMapItem` (`description=None`, `audio_url=None` if unpaid) | `T_BE/test_public_map_api.py` |

### 2.2 UI, Business Rules & Validation Control Points
- **UI:** `PoiCatalogPage.jsx` (`/admin/pois`: thumbnail, coords, radius, language pills, search, create modal, edit/calib/hide/retry actions); `GeofenceCalibPage.jsx` + `AdminMapPicker.jsx` (`/admin/geofence`: draggable pin + `10m–50m` radius slider).
- **BR-POI-01..05:** Coords must lie inside `CU_CHI_BOUNDS` (`11.136361..11.149306`, `106.455139..106.467639`) unless `ALLOW_GLOBAL_COORDINATES=True`; create seeds `vi=PUBLISHED` + foreign `PENDING` and queues DFD 3.0; editing `title`/`short_description`/`description` resets foreign translations to `PENDING` and queues re-translation; images checked via extension + MIME + Pillow `verify()`/`load()` + `nosniff`; `_strip_language_prefix` removes `[LANG] ` prefixes.
- **VAL-POI-01:** `title` (`1..255`), `short_description` (`<= 255`), `latitude` (`-90..90`), `longitude` (`-180..180`), `radius` (`10..50`, default `30`); `POIUpdateRequest` requires `>= 1` non-null field.

### 2.3 Quick-Fix Spots & Change Impact
- **Title / short description limits (`255`):** [`poi_schema.py#L91`](../../MVP/backend/app/schemas/poi_schema.py#L91), [`poi_schema.py#L163`](../../MVP/backend/app/schemas/poi_schema.py#L163), [`POIFormModal.jsx#L150`](../../MVP/frontend/src/components/admin/POIFormModal.jsx#L150), [`PoiCatalogPage.jsx#L159`](../../MVP/frontend/src/views/admin/PoiCatalogPage.jsx#L159).
- **Radius range (`10m–50m`) & default (`30`):** [`poi_schema.py#L13`](../../MVP/backend/app/schemas/poi_schema.py#L13), [`mysql_schema.sql#L85`](../../MVP/backend/scripts/mysql_schema.sql#L85), [`AdminMapPicker.jsx#L59`](../../MVP/frontend/src/components/admin/AdminMapPicker.jsx#L59).
- **Cu Chi bounds & image upload rules (`5 MB`):** [`config.py#L91`](../../MVP/backend/app/core/config.py#L91), [`config.py#L148`](../../MVP/backend/app/core/config.py#L148), [`museumBounds.js#L6`](../../MVP/frontend/src/utils/museumBounds.js#L6), [`poi_service.py#L58`](../../MVP/backend/app/services/poi_service.py#L58).
- **Integration:** [`StorageClient.upload_image_file`](../../MVP/backend/app/integrations/storage_client.py#L174) (Supabase `museum-media` or local `/static/images`).
- **Change Impact:** UI (`PoiCatalogPage`, `POIFormModal`, `GeofenceCalibPage`, `AdminMapPicker`) | Bounds/Schema (`poi_schema.py`, `config.py`, `museumBounds.js`, `mysql_schema.sql`) | Logic (`poi_service.py`, `poi_repository.py`, `poi.py`, `poiApi.js`).

---

## Module 3.0: Multilingual Translation & Edge-TTS Audio Pipeline

- **Scope:** DFD 3.0 / UC-04 | **Tables:** `POITranslation`, `LanguageCode`, `POI`, `Audit` | **Entry:** `FE/views/admin/TranslationPage.jsx`, `TranslationAuditView.jsx`, `BE/controllers/translation_controller.py`, `language_controller.py`

### 3.1 Subprocesses & 3-Layer Feature Map

| ID | Feature / DFD Subprocess | Layer 1 (Frontend) | Layer 2 (Backend) | Layer 3 (Data & Schema) | Test Files |
|---|---|---|---|---|---|
| **3.1** | Queue & Recovery | On POI create/edit/retry | `main` (`lifespan`, `_render_keep_alive_loop`), `pipeline_queue`, `translation_pipeline_service` | `translation_repository` (`get_pending_poi_translations`), `POITranslation` | `T_BE/services/test_pipeline_queue.py`, `test_translation_pipeline_service.py` |
| **3.2** | Two-Tier AI Translate | Background worker | `translation_worker`, `deep_translator_client` (Render OPUS-MT -> OpenRouter) | `translation_repository`, `config` (`OPENROUTER_API_KEY` pool), `POITranslation` | `T_BE/integrations/test_deep_translator_client.py` |
| **3.3** | Edge-TTS & Dedup | Worker or `RegenerateAudioButton.jsx` | `audio_synthesis_worker`, `tts_service`, `edge_tts_client`, `storage_client` | `audio_repository`, `POITranslation` (`Audio_url`, `Duration`, `File_size`) | `T_BE/integrations/test_edge_tts_client.py`, `T_BE/services/test_tts_service.py` |
| **3.4** | Audit, Edit & Publish | `TranslationPage.jsx`, `TranslationAuditView.jsx`, `AudioSyncBadge.jsx`, `AudioAuditPlayer.jsx`, `translationApi.js` | `translation_controller` (`GET/PUT/publish/retry/regenerate-audio`), `translation_service` | `translation_schema`, `audio_schema`, `translation_repository`, `Audit` | `T_FE/views/__tests__/TranslationAuditView.test.jsx`, `T_BE/controllers/test_translation_controller.py`, `T_BE/services/test_translation_service.py` |

### 3.2 UI, Business Rules & Validation Control Points
- **UI:** `TranslationAuditView.jsx` (`/admin/translations`: side-by-side Vietnamese source vs editable target `title`/`short_description`/`description`, filters by POI/language/status, `AudioAuditPlayer`, `AudioSyncBadge`, `RegenerateAudioButton`, Save Draft/Publish/Retry).
- **BR-TRANS-01..05:** Render chunks `<= 500` chars (`wakeup_timeout=110s`, `timeout=70s`) -> OpenRouter `openrouter/free` rotating keys on `401/402/403/429`; editing text sets `NEEDS_UPDATE` and locks Publish until audio status == `READY`; Edge-TTS primary voices (`vi-VN-HoaiMyNeural`, `en-US-AriaNeural`, `ja-JP-NanamiNeural`, `ko-KR-SunHiNeural`, `zh-CN-XiaoxiaoNeural`, `fr-FR-DeniseNeural`) + fallback voices; regen rate limit `3/minute`; `PipelineQueueManager` concurrency `1`, `PIPELINE_AUTO_RECOVERY=True`.
- **VAL-TRANS-01:** `TranslationUpdateRequest`: `title` (`1..255`), `short_description` (`<= 1000`), DB statuses `PENDING | DRAFT | NEEDS_UPDATE | PUBLISHED | FAILED`.

### 3.3 Quick-Fix Spots & Change Impact
- **Render chunk size (`500`) & OpenRouter rotation codes:** [`deep_translator_client.py#L18`](../../MVP/backend/app/integrations/deep_translator_client.py#L18).
- **Timeouts, model, concurrency (`1`), keep-alive (`600s`):** [`config.py#L121`](../../MVP/backend/app/core/config.py#L121).
- **TTS voice mappings:** [`edge_tts_client.py#L59`](../../MVP/backend/app/integrations/edge_tts_client.py#L59) (`VOICE_BY_LANGUAGE`, `FALLBACK_VOICE_BY_LANGUAGE`).
- **Publish lock & `NEEDS_UPDATE` transition:** [`translation_service.py#L116`](../../MVP/backend/app/services/translation_service.py#L116) & [`translation_service.py#L172`](../../MVP/backend/app/services/translation_service.py#L172).
- **Audit edit max lengths (`255` / `1000`):** [`translation_schema.py#L11`](../../MVP/backend/app/schemas/translation_schema.py#L11) & [`TranslationAuditView.jsx#L609`](../../MVP/frontend/src/views/admin/TranslationAuditView.jsx#L609).
- **Change Impact:** UI (`TranslationAuditView`, `AudioAuditPlayer`, `AudioSyncBadge`, `RegenerateAudioButton`) | Logic (`deep_translator_client.py`, `edge_tts_client.py`, `translation_service.py`, `config.py`) | DB (`mysql_schema.sql`, `translation.py`, `language.py`, `translation_repository.py`, `audio_repository.py`).

---

## Module 4.0: Digital Admission Payment & 24h Visitor Session

- **Scope:** DFD 4.0 / UC-06 | **Tables:** `Transaction`, `VisitorSession`, `POITranslation` | **Entry:** `FE/components/visitor/CheckoutModal.jsx`, `RestoreSessionModal.jsx`, `BE/controllers/payment_controller.py`, `session_controller.py`, `audio_controller.py`

### 4.1 Subprocesses & 3-Layer Feature Map

| ID | Feature / DFD Subprocess | Layer 1 (Frontend) | Layer 2 (Backend) | Layer 3 (Data & Schema) | Test Files |
|---|---|---|---|---|---|
| **4.1** | Paywall & 24h Context | `ContentPaywallGate.jsx`, `VisitorSessionContext.jsx`, `VisitorHeader.jsx` | `poi_service` (`_to_map_item`) | `localStorage`, `session_repository` (`is_session_active`) | `T_FE/components/__tests__/ContentPaywallGate.test.jsx`, `T_FE/contexts/__tests__/VisitorSessionContext.test.jsx` |
| **4.2** | Checkout Order | `CheckoutModal.jsx`, `paymentApi.js` | `payment_controller` (`POST /create-checkout`), `payment_service`, `paypal_client` | `transaction_repository`, `payment_schema`, `Transaction` (`creator_token_hash`) | `T_FE/components/__tests__/CheckoutModal.test.jsx`, `T_BE/controllers/test_payment_controller.py`, `T_BE/services/test_payment_service.py` |
| **4.3** | Poll, Webhook & Sim | `usePaymentPolling.js`, `CheckoutSuccessPage.jsx`, `paymentApi.js` | `payment_controller` (`/status`, `/webhook`, `/session`, `/paypal-capture`, `/simulate-success`) | `transaction_repository` (`mark_as_paid`), `session` (`+24h`, `CCT-`) | `T_FE/hooks/__tests__/usePaymentPolling.test.js`, `T_FE/api/__tests__/paymentApi.test.js` |
| **4.4** | PIN Restore | `RestoreSessionModal.jsx`, `sessionApi.js`, `dateUtils.js` | `session_controller` (`POST /sessions/restore`), `session_restore_rate_limit`, `session_service` | `session_schema`, `session_repository`, `VisitorSession` | `T_FE/components/visitor/__tests__/RestoreSessionModal.test.jsx`, `T_BE/controllers/test_session_controller.py`, `T_BE/services/test_session_service.py`, `T_BE/core/test_session_restore_rate_limit.py` |
| **4.5** | Audio Streaming | `AudioPlayerContext.jsx`, `MiniAudioPlayer.jsx` | `audio_controller` (`GET /audio/{poi_id}`), `audio_service` | `audio_repository` (`vi` fallback), `session_repository` | `T_BE/controllers/test_audio_controller.py`, `T_BE/services/test_audio_service.py`, `T_BE/repositories/test_audio_repository.py` |

### 4.2 UI, Business Rules & Validation Control Points
- **UI:** `CheckoutModal.jsx` (50,000 VND / USD, VietQR + bank memo `CCT <6 chars>`, PayPal button, polling status, dev Simulate button); `RestoreSessionModal.jsx` (`CCT-XXXXXX` PIN input).
- **BR-PAY-01..06:** `AUDIO_GUIDE_SERVICE_FEE=50000` (`PAYPAL_EXCHANGE_RATE=25000.0`); `vi` defaults to `VIETQR`, non-`vi` defaults to `CARD`/`PAYPAL`; `exchange_order_session` checks `SHA256(creator_token)`; PayOS webhook checks `code=="00"`, HMAC-SHA256 (`PAYOS_CHECKSUM_KEY`), and amount/currency; `mark_as_paid` provisions 24h `VisitorSession` (`CCT-XXXXXX`); simulation routes return 404 unless dev/sim enabled; `/sessions/restore` limits `5` attempts/`60s` per IP and per code; `/audio/{poi_id}` requires active session (HTTP 403 `CONTENT_LOCKED`) and falls back to `vi` audio.
- **VAL-PAY-01:** `payment_method` in `VIETQR | CARD | PAYPAL`; mock PayPal `order_id` matches `^TXN_[0-9A-F]{12}$`; `session_code` `3..36` chars normalized to `CCT-...`.

### 4.3 Quick-Fix Spots & Change Impact
- **Ticket price (`50000` VND), PayPal rate (`25000.0`), simulation toggle:** [`config.py#L112`](../../MVP/backend/app/core/config.py#L112) & [`payment_service.py#L155`](../../MVP/backend/app/services/payment_service.py#L155).
- **VietQR fallback bank info & transfer memo:** [`payment_service.py#L35`](../../MVP/backend/app/services/payment_service.py#L35) & [`payment_service.py#L194`](../../MVP/backend/app/services/payment_service.py#L194).
- **24h session TTL & `CCT-` code format:** [`session.py#L14`](../../MVP/backend/app/models/session.py#L14) & [`transaction_repository.py#L107`](../../MVP/backend/app/repositories/transaction_repository.py#L107).
- **Restore PIN rate limits (`5` / `60s`):** [`session_restore_rate_limit.py#L9`](../../MVP/backend/app/core/session_restore_rate_limit.py#L9).
- **Integrations:** PayOS (`https://api-merchant.payos.vn/v2/payment-requests` or `img.vietqr.io` in `payment_service.py`), PayPal Orders V2 (`paypal_client.py`).
- **Change Impact:** UI (`CheckoutModal`, `ContentPaywallGate`, `RestoreSessionModal`, `visitorTranslations.js`) | Schema (`payment_schema.py`, `session_schema.py`) | Logic (`payment_service.py`, `session_service.py`, `config.py`) | DB (`mysql_schema.sql`, `transaction.py`, `session.py`, `transaction_repository.py`, `session_repository.py`).

---

## Module 5.0: Interactive Map, GPS Geofencing & OSRM Wayfinding

- **Scope:** DFD 5.0 / UC-01 | **Tables:** `POI`, `POITranslation`, `LanguageCode`, `VisitorSession` | **Entry:** `FE/views/visitor/VisitorTourPage.jsx`, `QRCodePage.jsx`, `BE/controllers/tour_controller.py`, `media_controller.py`, `system_controller.py`

### 5.1 Subprocesses & 3-Layer Feature Map

| ID | Feature / DFD Subprocess | Layer 1 (Frontend) | Layer 2 (Backend) | Layer 3 (Data & Schema) | Test Files |
|---|---|---|---|---|---|
| **5.1** | Map, Markers & Card | `VisitorTourPage.jsx`, `VisitorMapView.jsx`, `VisitorHeader.jsx`, `VisitorPoiMarkers.jsx`, `VisitorLocationMarker.jsx`, `PoiPreviewCard.jsx`, `visitorTranslations.js` | `poi_controller` (`GET /pois`), `language_controller`, `media_controller` | `poi_repository`, `language_repository`, `museumBounds.js` | `T_FE/views/visitor/__tests__/VisitorTourPage.test.jsx`, `T_FE/views/__tests__/VisitorMapView.test.jsx`, `PoiPreviewCard.test.jsx`, `T_BE/controllers/test_language_controller.py`, `test_media_controller.py` |
| **5.2** | GPS & 10m Cooldown | `useGeolocation.js`, `useGeofenceTrigger.js`, `cooldownService.js`, `haversine.js` | Client Haversine (`10m–50m`, default `30m`, `600s`) | `localStorage` (`poi_cooldown_*`) | `T_FE/hooks/__tests__/useGeolocation.test.js`, `useGeofenceTrigger.test.js`, `T_FE/services/__tests__/cooldownService.test.js`, `T_FE/utils/__tests__/haversine.test.js` |
| **5.3** | Audio Player & Speed | `AudioPlayerContext.jsx`, `MiniAudioPlayer.jsx` | `audio_controller` (`GET /audio/{poi_id}`) | `<audio>` (`3500ms`, `[0.8, 1.0, 1.2]`) | `T_FE/contexts/__tests__/AudioPlayerContext.test.jsx`, `T_FE/components/__tests__/MiniAudioPlayer.test.jsx` |
| **5.4** | OSRM Wayfinding | `RouteOverlay.jsx`, `tourApi.js` | `tour_controller` (`GET /tour/route`, `10/min`), `wayfinding_service` | `tour_schema` (`GeoJsonRouteFeature`), `POI` | `T_FE/components/visitor/__tests__/RouteOverlay.test.jsx`, `T_BE/controllers/test_tour_controller.py`, `T_BE/services/test_wayfinding_service.py` |
| **5.5** | Entrance QR (`/qr`) | `QRCodePage.jsx`, `systemApi.js` | `system_controller` (`GET /system/public-config`), `config` (`resolve_base_url`) | `system_schema` (`PublicConfigResponse`) | `T_FE/views/__tests__/QRCodePage.test.jsx`, `T_FE/api/__tests__/systemApi.test.js`, `T_BE/controllers/test_system_controller.py` |

### 5.2 UI, Business Rules & Validation Control Points
- **UI:** `VisitorTourPage.jsx` (`/`, `/visitor`: language picker, OSM map, POI markers, `RouteOverlay`, `PoiPreviewCard`, `MiniAudioPlayer`); `QRCodePage.jsx` (`/qr`: SVG QR, copy link, 1024x1024 PNG download).
- **BR-MAP-01..04:** Spherical Haversine (`EARTH_RADIUS_METERS=6371000`) clamps radius `10m–50m` (default `30m`); `cooldownService` enforces `600s` (`10 min`) lock in `localStorage`; `WayfindingService` bypasses OSRM for distance `<= 35.0m`, queries OSRM foot API (`0.8s` timeout, `72.0` m/min ETA), falls back to direct Haversine; `resolve_base_url()` checks `.env` on disk (`BASE_URL`, then `CLOUDFLARE_TUNNEL_URL`).
- **VAL-MAP-01:** `origin_lat`, `origin_lng`, `destination_poi_id` required (`10/minute`); returns RFC 7946 `LineString` (`RouteResponse`).

### 5.3 Quick-Fix Spots & Change Impact
- **Geofence cooldown (`10 min`) & radius defaults (`30m`):** [`cooldownService.js#L9`](../../MVP/frontend/src/services/cooldownService.js#L9) & [`useGeofenceTrigger.js#L13`](../../MVP/frontend/src/hooks/useGeofenceTrigger.js#L13).
- **Playback speeds (`0.8/1.0/1.2`) & stream timeout (`3500ms`):** [`AudioPlayerContext.jsx#L12`](../../MVP/frontend/src/contexts/AudioPlayerContext.jsx#L12) & [`MiniAudioPlayer.jsx#L11`](../../MVP/frontend/src/components/visitor/MiniAudioPlayer.jsx#L11).
- **OSRM URL, timeout (`0.8s`), walking speed (`72.0`):** [`wayfinding_service.py#L34`](../../MVP/backend/app/services/wayfinding_service.py#L34).
- **Default map center (`11.1432, 106.4631`) & 6-language copy:** [`museumBounds.js#L6`](../../MVP/frontend/src/utils/museumBounds.js#L6) & [`visitorTranslations.js#L7`](../../MVP/frontend/src/locales/visitorTranslations.js#L7).
- **Change Impact:** UI (`VisitorTourPage`, `VisitorMapView`, `PoiPreviewCard`, `MiniAudioPlayer`, `RouteOverlay`, `QRCodePage`) | Geofence (`useGeofenceTrigger`, `cooldownService`, `poi_schema.py`) | Routing (`wayfinding_service.py`, `tour_controller.py`, `tour_schema.py`).

---

## Module 6.0: Operational Telemetry, Density Heatmap & System Health

- **Scope:** DFD 6.0 / UC-05 | **Tables:** `POITrigger`, `VisitorSession`, `POI`, `POITranslation`, `Audit` | **Entry:** `FE/views/admin/AnalyticsDashboard.jsx`, `SystemHealthPage.jsx`, `BE/controllers/telemetry_controller.py`, `analytics_controller.py`, `system_controller.py`

### 6.1 Subprocesses & 3-Layer Feature Map

| ID | Feature / DFD Subprocess | Layer 1 (Frontend) | Layer 2 (Backend) | Layer 3 (Data & Schema) | Test Files |
|---|---|---|---|---|---|
| **6.1** | Ping & KPIs | `telemetryApi.js`, `AnalyticsDashboard.jsx`, `analyticsApi.js` | `telemetry_controller` (`POST /trigger`, `20/min`), `analytics_controller` (`GET /summary`), `telemetry_service` | `telemetry_repository`, `telemetry_schema`, `analytics_schema`, `POITrigger` | `T_BE/controllers/test_telemetry_controller.py`, `T_BE/services/test_telemetry_service.py`, `T_FE/views/__tests__/AnalyticsDashboard.test.jsx` |
| **6.2** | Heatmap & Export | `AnalyticsHeatmap.jsx`, `AnalyticsExport.jsx`, `analyticsApi.js` | `analytics_controller` (`GET /heatmap`, `/export`), `telemetry_service`, `export_service` | `analytics_schema` (`HeatmapDataDTO`), `POITrigger`, `POI`, `VisitorSession` | `T_FE/components/admin/__tests__/AnalyticsHeatmap.test.jsx`, `AnalyticsExport.test.jsx`, `T_BE/controllers/test_analytics_controller.py`, `test_export_controller.py`, `T_BE/services/test_export_service.py` |
| **6.3** | Health & Orphans | `SystemHealthPage.jsx`, `StorageHealthBanner.jsx`, `CleanOrphansModal.jsx`, `systemApi.js` | `system_controller` (`/health`, `/clean-orphans` `1/5m`), `storage_service`, `main` (`/health`) | `system_schema`, `audio_repository`, `audit_repository` | `T_FE/views/admin/__tests__/SystemHealthPage.test.jsx`, `T_FE/components/__tests__/StorageHealthBanner.test.jsx`, `CleanOrphansModal.test.jsx`, `T_BE/controllers/test_system_controller.py`, `T_BE/services/test_storage_service.py`, `T_BE/test_main.py` |

### 6.2 UI, Business Rules & Validation Control Points
- **UI:** `AnalyticsDashboard.jsx` (`/admin`, `/admin/analytics`: KPI cards, Top 10 POIs, language chart, `AnalyticsHeatmap` with radius `28` / blur `18` / 4 legend tiers and no congestion alert/sliders, `AnalyticsExport`); `SystemHealthPage.jsx` (`/admin/health`: DB latency, 1 GB bar, Clean Orphans).
- **BR-TEL-01..03 & BR-SYS-01..02:** `ingest_trigger` creates guest `VisitorSession` if `session_id` omitted; heatmap normalizes `round(count / max_trigger_count, 3)` (Gray `0`, Green `<0.4`, Yellow `0.4–0.7`, Red `>=0.7`); CSV streams UTF-8 BOM `\xef\xbb\xbf` with `Content-Disposition` exposed; storage alerts trigger `WARNING >= 85%` and `CRITICAL >= 95%` of `1 GB`; orphan cleanup (`1/5minute`) unlinks unreferenced MP3s and logs `ADMIN_STORAGE_CLEANED`.
- **VAL-TEL-01:** `dwell_time >= 0`, `preferred_language` `2..20` chars, `range` in `TODAY | LAST_7_DAYS | LAST_30_DAYS`, `format` in `^(csv|json)$`.

### 6.3 Quick-Fix Spots & Change Impact
- **Storage quota (`1 GB`) & `85% / 95%` thresholds:** [`config.py#L93`](../../MVP/backend/app/core/config.py#L93), [`storage_service.py#L24`](../../MVP/backend/app/services/storage_service.py#L24), [`StorageHealthBanner.jsx#L4`](../../MVP/frontend/src/components/admin/StorageHealthBanner.jsx#L4).
- **Heatmap gradient, radius (`28`), blur (`18`) & intensity formula:** [`AnalyticsHeatmap.jsx#L38`](../../MVP/frontend/src/components/admin/AnalyticsHeatmap.jsx#L38) & [`telemetry_service.py#L173`](../../MVP/backend/app/services/telemetry_service.py#L173).
- **CSV export columns:** [`export_service.py#L92`](../../MVP/backend/app/services/export_service.py#L92) (`stream_csv`).
- **Change Impact:** UI (`AnalyticsDashboard`, `AnalyticsHeatmap`, `AnalyticsExport`, `SystemHealthPage`, `StorageHealthBanner`) | Thresholds/Schemas (`analytics_schema.py`, `telemetry_schema.py`, `config.py`, `storage_service.py`) | DB (`mysql_schema.sql`, `trigger.py`, `telemetry_repository.py`).

---

## Core & Shared Infrastructure

- **Shared Files:** [`main.jsx`](../../MVP/frontend/src/main.jsx#L1), [`NotFoundPage.jsx`](../../MVP/frontend/src/views/NotFoundPage.jsx#L3), [`database.py`](../../MVP/backend/app/core/database.py#L21), [`dependencies.py`](../../MVP/backend/app/core/dependencies.py#L34), [`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L1), [`docker-compose.yml`](../../MVP/docker-compose.yml#L1), `MVP/Dockerfile.{app,mysql}`, `MVP/backend/.env.example`.
- **Core Quick-Fix Spots:** FE route [`App.jsx#L19`](../../MVP/frontend/src/App.jsx#L19) & [`AdminNavbar.jsx#L9`](../../MVP/frontend/src/components/admin/AdminNavbar.jsx#L9) | BE router/CORS [`main.py#L41`](../../MVP/backend/app/main.py#L41) & [`main.py#L166`](../../MVP/backend/app/main.py#L166) | Error JSON [`exceptions.py#L37`](../../MVP/backend/app/core/exceptions.py#L37) & [`apiClient.js#L47`](../../MVP/frontend/src/api/apiClient.js#L47) | Rate limits [`config.py#L74`](../../MVP/backend/app/core/config.py#L74) & [`limiter.py#L44`](../../MVP/backend/app/core/limiter.py#L44).

---

## Maintenance & Verification Checklist

1. **Add/Modify Field Order:** [`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L1) -> `models/` & `repositories/` -> `schemas/` -> `services/` mapper -> `api/` & UI (`maxLength`) -> unit/Vitest tests.
2. **SISE Layering:** Keep HTTP parsing in `controllers/` and business rules in `services/`; `controllers/` never import `repositories/` or `models/`; raise [`ApiError`](../../MVP/backend/app/core/exceptions.py#L21) for `{"success": false, "error": {"code", "message", "details"}}`.
3. **Pre-Commit Commands:** `cd MVP/backend && ruff check . && black --check --workers 1 . && pytest` | `cd MVP/frontend && npm test`.
