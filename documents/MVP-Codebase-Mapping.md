# Bản đồ Kiến trúc & Mapping Chi tiết Hệ thống MVP (Cu Chi Tunnels Smart Audio Guide)

Tài liệu này hệ thống hóa toàn bộ mã nguồn của dự án MVP, bao gồm chi tiết các hàm, phương thức, biến khai báo, kiểu dữ liệu và giá trị trả về ở cả hai tầng Backend (FastAPI / SQLAlchemy) và Frontend (React / Vite).

---

## 1. Tổng quan Kiến trúc

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

### 2.1. Controllers (Tầng tiếp nhận Request & Routing)

#### `app.controllers.auth_controller`
- **Prefix / Tags**: `/api/v1/auth`, `auth`
- **Hàm `login_admin(payload: AdminLoginRequest, request: Request, response: Response, auth_service: AuthService) -> AdminSessionResponse`**
  - *Tham số*:
    - `payload`: Object Pydantic chứa `username` (string đã trim) và `password` (string).
    - `request`: Đối tượng `fastapi.Request` dùng để bóc tách IP qua `resolve_client_ip`.
    - `response`: Đối tượng `fastapi.Response` dùng để ghi HttpOnly cookie `admin_access_token`.
    - `auth_service`: Dependency injection lấy từ `get_auth_service`.
  - *Giá trị trả về*: `AdminSessionResponse` chứa `success: bool`, `data: AdminSessionDataResponse(admin: AdminProfileResponse)`.
  - *Ghi chú*: Trả HttpOnly cookie `admin_access_token` với thời gian sống 8 tiếng.
- **Hàm `read_current_admin(current_admin: AdminProfileResponse) -> AdminSessionResponse`**
  - *Tham số*: `current_admin`: Lấy từ dependency `get_current_admin_profile` (giải mã token JWT từ cookie).
  - *Giá trị trả về*: `AdminSessionResponse` chứa thông tin tài khoản hiện tại.
- **Hàm `logout_admin(request: Request, response: Response, current_admin: AdminProfileResponse, auth_service: AuthService) -> AdminLogoutResponse`**
  - *Tham số*: Token trong request và thông tin admin hiện tại.
  - *Giá trị trả về*: `AdminLogoutResponse` chứa `success: True`, `data.message: "Logged out successfully."`.
  - *Ghi chú*: Xóa cookie `admin_access_token` (Max-Age=0) và ghi audit log.

---

#### `app.controllers.poi_controller` (Visitor & Admin POI Queries)
- **Prefix / Tags**: `/api/v1/pois`, `pois`
- **Hàm `get_map_pois(service: POIService, language: str = 'vi', token: str | None = None, ...) -> APIResponse[list[POIMapItem]]`**
  - *Endpoint*: `GET /api/v1/pois`
  - *Tham số*: `language` (mã ngôn ngữ: vi, en, ja, ko, zh), `token` (visitor session token để mở khóa nội dung).
  - *Giá trị trả về*: Danh sách `POIMapItem` gồm `id`, `title`, `short_description`, `image_url`, `latitude`, `longitude`, `trigger_radius`, `description` (ẩn nếu chưa trả phí), `audio_url`, `is_locked`.
- **Hàm `get_visitor_poi_detail(poi_id: str, service: POIService, language: str = 'vi', ...) -> APIResponse[POIMapItem]`**
  - *Endpoint*: `GET /api/v1/pois/{poi_id}`
  - *Giá trị trả về*: Chi tiết 1 điểm di tích dưới dạng `POIMapItem`.
- **Hàm `create_poi(request: Request, background_tasks: BackgroundTasks, current_admin: AdminProfileResponse, poi_service: POIService) -> POIResponse`**
  - *Endpoint*: `POST /api/v1/pois` (Admin only)
  - *Tham số*: Form-data hoặc JSON (`title`, `short_description`, `description`, `latitude`, `longitude`, `radius`, `image_file`).
  - *Giá trị trả về*: `POIResponse` chứa bản ghi POI vừa tạo kèm danh sách trạng thái dịch đa ngôn ngữ ban đầu.
  - *Tác vụ nền*: Đẩy tác vụ `pipeline_service.trigger_poi_translation_pipeline` vào `background_tasks`.
- **Hàm `list_pois(page: int, size: int, search: str, poi_service: POIService, _) -> POIListResponse`**
  - *Endpoint*: `GET /api/v1/admin/pois` (Admin catalog)
  - *Giá trị trả về*: `POIListResponse(items: list[POIResponse], total: int, page: int, size: int)`.
- **Hàm `get_poi(poi_id: str, poi_service: POIService, _) -> POIResponse`**
  - *Endpoint*: `GET /api/v1/admin/pois/{poi_id}`.

---

#### `app.controllers.admin_poi_controller` (Admin POI Operations)
- **Prefix / Tags**: `/api/v1/admin/pois`, `admin-pois`
- **Hàm `update_poi(poi_id: str, payload: POIUpdateRequest, request: Request, background_tasks: BackgroundTasks, service: POIService, current_admin: AdminProfileResponse) -> POIUpdateResponse`**
  - *Endpoint*: `PATCH /api/v1/admin/pois/{poi_id}`
  - *Tham số*: `payload` (chứa các trường cần update: `title`, `short_description`, `description`, `image_url`, `latitude`, `longitude`, `radius`).
  - *Giá trị trả về*: `POIUpdateResponse(success=True, data=POIMapItem)`.
  - *Xử lý phụ*: Nếu cập nhật narrative (`title`, `description`), tự động đánh dấu các bản dịch ngoại ngữ sang `NEEDS_UPDATE` và kích hoạt dịch lại trong background.
- **Hàm `set_poi_visibility(poi_id: str, payload: POIVisibilityUpdateRequest, request: Request, service: POIService, current_admin: AdminProfileResponse) -> POIResponse`**
  - *Endpoint*: `PUT /api/v1/admin/pois/{poi_id}/visibility`
  - *Tham số*: `payload.is_active: bool`.
  - *Giá trị trả về*: `POIResponse` sau khi cập nhật trạng thái hiển thị.
- **Hàm `upload_poi_image(file: UploadFile, service: POIService, current_admin: AdminProfileResponse) -> dict`**
  - *Endpoint*: `POST /api/v1/admin/pois/upload-image`
  - *Giá trị trả về*: `{"image_url": str}`.

---

#### `app.controllers.audio_controller`
- **Prefix / Tags**: `/api/v1/audio`, `audio`
- **Hàm `stream_poi_audio(poi_id: str, language: str, token: str | None, x_session_token: str | None, authorization: str | None, audio_service: AudioService) -> FileResponse`**
  - *Endpoint*: `GET /api/v1/audio/{poi_id}`
  - *Tham số*:
    - `poi_id`: ID của điểm di tích (ví dụ `POI_9F9F3176070C`).
    - `language`: Ngôn ngữ file audio (`vi`, `en`, `ja`, `ko`, `zh`).
    - Session token: Lấy từ query param `token`, header `X-Session-Token` hoặc `Authorization: Bearer <token>`.
  - *Giá trị trả về*: `FileResponse` (stream file `.mp3` với header `Accept-Ranges: bytes`, `Content-Type: audio/mpeg`).
  - *Bảo mật*: Kiểm tra session hợp lệ còn hạn 24h qua `audio_service.verify_streaming_access`.

---

#### `app.controllers.payment_controller`
- **Prefix / Tags**: `/api/v1/payments`, `payments`
- **Hàm `create_checkout_order(payload: CheckoutCreateRequest, payment_service: PaymentService) -> CheckoutCreateResponse`**
  - *Endpoint*: `POST /api/v1/payments/checkout`
  - *Tham số*: `payment_method` (`VIETQR`, `CARD`, `PAYPAL`), `preferred_language` (`vi`, `en`, ...).
  - *Giá trị trả về*: `CheckoutCreateResponse` chứa `order_id`, `pay_amount`, `qr_code_url`, `checkout_url`, `transfer_bank`, `transfer_account`, `transfer_content`, `expires_at`.
- **Hàm `get_order_status(order_id: str, payment_service: PaymentService) -> OrderStatusResponse`**
  - *Endpoint*: `GET /api/v1/payments/order/{order_id}`
  - *Giá trị trả về*: `OrderStatusResponse` gồm trạng thái đơn (`PENDING`, `PAID`, `EXPIRED`), `session_code`, `session_token`, `session_expires_at`.
- **Hàm `simulate_payment_success(order_id: str, body: SimulatePaymentRequest, payment_service: PaymentService) -> OrderStatusResponse`**
  - *Endpoint*: `POST /api/v1/payments/order/{order_id}/simulate-success` (Môi trường dev/demo).
- **Hàm `handle_payment_webhook(payload: PayOSWebhookPayload, payment_service: PaymentService) -> WebhookResponse`**
  - *Endpoint*: `POST /api/v1/payments/webhook`
  - *Tham số*: Payload ký bảo mật từ cổng PayOS.

---

#### `app.controllers.session_controller`
- **Prefix / Tags**: `/api/v1/sessions`, `sessions`
- **Hàm `restore_session(payload: SessionRestoreRequest, session_service: SessionService) -> SessionRestoreResponse`**
  - *Endpoint*: `POST /api/v1/sessions/restore`
  - *Tham số*: `payload.session_code`: Mã phục hồi 6 ký tự viết hoa.
  - *Giá trị trả về*: `SessionRestoreResponse` chứa `session_token`, `remaining_seconds`, `status`, `expires_at`, `preferred_language`.

---

#### `app.controllers.translation_controller`
- **Prefix / Tags**: `/api/v1/admin/translations`, `admin-translations`
- **Hàm `list_translations(poi_id, language_id, status_filter, page, size, ...) -> TranslationListResponse`**
- **Hàm `get_translation_by_id(id: str, ...) -> TranslationResponse`**
- **Hàm `update_translation(id: str, payload: TranslationUpdateRequest, ...) -> TranslationResponse`**
- **Hàm `publish_translation(id: str, ...) -> TranslationResponse`**
- **Hàm `regenerate_translation_audio(id: str, tts_service: TTSService, ...) -> AudioRegenerationResponse`**

---

#### `app.controllers.telemetry_controller` & `analytics_controller`
- **`record_telemetry_trigger(payload: TelemetryTriggerCreate, telemetry_service) -> TelemetryTriggerResponse`**: Ghi nhận sự kiện du khách bước vào geofence (`POST /api/v1/telemetry/trigger`).
- **`get_analytics_summary(time_range: AnalyticsTimeRange, ...) -> AnalyticsSummaryResponse`**: Lấy thống kê KPI dashboard (`total_visitors`, `total_audio_plays`, `top_pois`, `language_distribution`).
- **`get_heatmap_telemetry(time_range, ...) -> HeatmapResponse`**: Lấy tọa độ và mật độ du khách phục vụ vẽ bản đồ nhiệt.
- **`export_telemetry_dataset(...) -> StreamingResponse`**: Xuất dữ liệu telemetry dưới dạng CSV / JSON.

---

#### `app.controllers.tour_controller` & `system_controller`
- **`get_walking_route(origin_lat, origin_lng, destination_poi_id, wayfinding_service) -> RouteResponse`**: Tạo lộ trình đi bộ dạng GeoJSON Feature LineString nối từ vị trí du khách đến POI đích.
- **`get_system_health(admin, storage_service) -> SystemHealthResponse`**: Đo dung lượng đĩa, cache audio, độ trễ database, trạng thái dịch vụ bên ngoài.
- **`clean_orphaned_audio(request, admin, storage_service) -> CleanOrphansResponse`**: Quét và dọn các file mp3 rác không có liên kết trong database.

---

### 2.2. Services (Tầng xử lý Nghiệp vụ Logic)

| Service | Phương thức chính | Tham số đầu vào | Giá trị trả về |
| :--- | :--- | :--- | :--- |
| **`POIService`** | `create_poi` | `payload: POICreateRequest`, `created_by: str`, `image_file: UploadFile` | `POIResponse` |
| | `update_poi` | `poi_id: str`, `payload: POIUpdateRequest`, `admin_user_name: str` | `POIUpdateResponse` |
| | `get_visitor_pois` | `language: str`, `session_token: str \| None` | `list[POIMapItem]` |
| | `validate_coordinates_in_bounds` | `latitude: float`, `longitude: float` | `None` (ném `HTTPException 422` nếu ngoài phạm vi) |
| **`AuthService`** | `authenticate_admin` | `payload: AdminLoginRequest`, `client_ip: str` | `AdminSessionTokenDTO(access_token, admin)` |
| | `resolve_authenticated_admin` | `token: str` | `AdminProfileResponse` |
| **`PaymentService`** | `create_order` | `payment_method: str`, `preferred_language: str` | `CheckoutCreateResponse` |
| | `process_payment_success` | `transaction_id: str`, `preferred_language: str`, `gateway_tx_id: str` | `OrderStatusResponse` |
| | `get_order_status` | `order_id: str` | `OrderStatusResponse` |
| **`SessionService`** | `create_session_for_payment` | `transaction_id: str`, `preferred_language: str` | `VisitorSession` |
| | `restore_session_by_code` | `session_code: str` | `SessionRestoreData` |
| | `validate_active_session` | `session_token: str` | `VisitorSession` |
| **`TranslationPipelineService`** | `trigger_poi_translation_pipeline` | `poi_id: str`, `admin_username: str` | `None` (chạy async qua các ngôn ngữ: en, ja, ko, zh) |
| | `_translate_and_synthesize_language` | `poi_id: str`, `target_lang: str`, `narrative: dict` | `POITranslation` |
| **`TTSService`** | `synthesize_audio_for_translation` | `stran_id: str` | `tuple[audio_url: str, duration: int]` |
| **`WayfindingService`** | `generate_walking_route` | `origin_lat: float`, `origin_lng: float`, `dest_poi_id: str` | `GeoJsonRouteFeature` |
| **`StorageService`** | `get_storage_health` | Không | `StorageHealthData` |
| | `clean_orphaned_audio_files` | `dry_run: bool` | `CleanOrphansData` |

---

### 2.3. Repositories (Tầng Truy vấn Dữ liệu)

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

### 2.4. Integrations (Dịch vụ Ngoài)

- **`DeepTranslatorClient`**:
  - Bậc ưu tiên (Cascade):
    1. `_translate_narrative_with_offline_api`: Gọi Docker Offline Translation API (`POST /translate`, cổng 8001).
    2. `_translate_narrative_with_google_cloud`: Gọi Google Cloud Translation v2 (Key Pool quay vòng).
    3. `_translate_narrative_with_free_deep_translator`: Thư viện fallback miễn phí.
  - Phương thức chính: `translate_exhibit_narrative(title, short_desc, desc, target_lang, source_lang) -> dict[str, str | None]`.
- **`EdgeTTSClient`**:
  - Tạo giọng đọc audio AI qua Microsoft Edge Neural TTS.
  - Phương thức: `synthesize_or_reuse(text, language_id, audio_dir, audio_hash) -> tuple[file_name: str, duration_sec: int, is_reused: bool]`.
- **`PayPalClient`**:
  - Tích hợp thanh toán quốc tế qua PayPal REST API v2 Sandbox.
  - Phương thức: `create_order(...)`, `capture_order(paypal_order_id: str)`.

---

## 3. Frontend Mapping

### 3.1. API Clients (`src/api/`)

| File API | Tên hàm | Tham số khai báo | Endpoint gọi tương ứng |
| :--- | :--- | :--- | :--- |
| **`authApi.js`** | `loginAdmin` | `{ username, password }` | `POST /api/v1/auth/login` |
| | `fetchCurrentAdmin` | Không | `GET /api/v1/auth/me` |
| | `logoutAdmin` | Không | `POST /api/v1/auth/logout` |
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
- **Biến State**:
  - `admin`: Thông tin tài khoản admin đăng nhập (`{ user_name, email, full_name }` hoặc `null`).
  - `isAuthenticated`: `boolean` (True nếu admin đã xác thực).
  - `isLoading`: `boolean` (True trong khi kiểm tra cookie session ban đầu).
- **Hàm cung cấp**:
  - `login({ username, password })`: Gửi thông tin đăng nhập, lưu profile và bật `isAuthenticated`.
  - `logout()`: Xóa cookie, clear state và điều hướng về trang Login.

#### 2. `VisitorSessionContext.jsx`
- **Biến State**:
  - `sessionToken`: `string | null` (Token bảo mật dùng để stream audio và mở khóa description).
  - `sessionCode`: `string | null` (Mã 6 ký tự phục hồi phiên trên thiết bị khác).
  - `expiresAt`: `string | null` (Thời điểm hết hạn ISO-8601).
  - `preferredLanguage`: `string` (Mặc định `vi`).
  - `timeRemaining`: `number` (Số mili-giây còn lại trước khi hết phiên).
- **Hàm cung cấp**:
  - `activateSession({ session_token, session_code, expires_at, preferred_language })`: Kích hoạt phiên sau thanh toán.
  - `restoreSession(code)`: Khôi phục phiên qua mã 6 ký tự.
  - `clearSession()`: Xóa phiên khi hết hạn hoặc logout.
  - `setLanguage(lang)`: Thay đổi ngôn ngữ tham quan.

#### 3. `AudioPlayerContext.jsx`
- **Biến State**:
  - `currentPoi`: Điểm di tích đang phát audio (`{ id, title, audioUrl }`).
  - `isPlaying`: `boolean`.
  - `currentTime`, `duration`: `number` (Thời lượng phát).
  - `playbackRate`: Tốc độ phát (`1.0`, `1.25`, `1.5`).
- **Hàm cung cấp**:
  - `playPoiAudio(poi, audioUrl)`: Nạp và phát bài thuyết minh.
  - `togglePlayPause()`: Tạm dừng / tiếp tục.
  - `seekTo(seconds)`: Nhảy đến mốc thời gian.
  - `changePlaybackRate(rate)`: Tăng giảm tốc độ.

---

### 3.3. Custom Hooks (`src/hooks/`)

- **`useGeolocation.js`**:
  - *Tham số*: `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }`.
  - *Giá trị trả về*: `{ location: { lat, lng }, accuracy, error, isTracking, isOutsideMuseum }`.
  - *Nhiệm vụ*: Theo dõi tọa độ GPS thời gian thực của du khách qua `navigator.geolocation.watchPosition`.
- **`useGeofenceTrigger.js`**:
  - *Tham số*: `{ userLocation, pois, onTrigger, isUnlocked, currentPlayingPoiId, cooldownDurationMs }`.
  - *Nhiệm vụ*: Tính khoảng cách Haversine giữa du khách và các POI. Khi khoảng cách $\le$ bán kính geofence và POI không ở trạng thái cooldown, kích hoạt callback `onTrigger(poi)`.
- **`usePaymentPolling.js`**:
  - *Tham số*: `{ orderId, isOpen, onPaymentSuccess, onError, pollIntervalMs = 2500 }`.
  - *Nhiệm vụ*: Tự động gọi `getOrderStatus` định kỳ mỗi 2.5s khi modal thanh toán đang mở. Khi phát hiện đơn hàng chuyển sang `PAID`, kích hoạt phiên và đóng modal.

---

### 3.4. Utility Functions (`src/utils/`)

- **`haversine.js`**:
  - `calculateHaversineDistance(origin: { lat, lng }, destination: { lat, lng }) -> number`: Tính khoảng cách giữa hai điểm tọa độ theo mét.
- **`museumBounds.js`**:
  - `isWithinMuseumBounds(latitude, longitude) -> boolean`: Kiểm tra tọa độ có nằm trong phạm vi cho phép của hệ thống hay không.
- **`cooldownService.js`**:
  - `isCooldownActive(poiId, durationMs) -> boolean`: Kiểm tra POI đã được phát gần đây chưa (tránh phát lặp liên tục khi du khách đứng yên trong vùng phát).
  - `setCooldown(poiId, timestamp)`: Đánh dấu POI vừa được kích hoạt.
  - `getRemainingCooldownSeconds(poiId)`: Lấy số giây còn lại của cooldown.

---

### 3.5. Views & Component Hierarchy

#### Các trang Admin (`src/views/admin/`)
1. **`AdminLoginView.jsx`**: Form đăng nhập quản trị, xử lý khóa tài khoản tạm thời khi nhập sai mật khẩu quá 5 lần (`AccountLockoutModal`).
2. **`PoiCatalogPage.jsx`**: Danh mục toàn bộ POI, bảng điều khiển trạng thái ẩn/hiện (`DeactivateConfirmModal`), nút thêm mới POI (`AdminMapPicker` & upload ảnh cover).
3. **`GeofenceCalibPage.jsx`**: Trang hiệu chuẩn geofence chuyên biệt, kéo thả ghim vị trí và thanh trượt bán kính 10m-50m (`AdminMapPicker`).
4. **`TranslationPage.jsx` / `TranslationAuditView.jsx`**: Giao diện duyệt và biên tập nội dung dịch song ngữ song song, nghe thử audio thuyết minh (`AudioAuditPlayer`), tạo lại audio (`RegenerateAudioButton`).
5. **`AnalyticsDashboard.jsx`**: Bảng điều khiển KPI số lượt khách, thời gian tham quan trung bình, biểu đồ phân bố ngôn ngữ và bản đồ nhiệt (`AnalyticsHeatmap`).
6. **`SystemHealthPage.jsx`**: Bảng trạng thái ổ đĩa lưu trữ âm thanh, cảnh báo dung lượng (`StorageHealthBanner`) và hộp thoại dọn dẹp file audio mồ côi (`CleanOrphansModal`).

#### Các trang Du khách (`src/views/visitor/`)
1. **`VisitorTourPage.jsx` / `VisitorMapView.jsx`**:
   - Bản đồ tương tác di tích (`OutdoorMapView`, `WalkingRouteLayer`, `VisitorLocationMarker`).
   - Danh sách điểm tham quan dạng thẻ (`VisitorPoiCard`, `VisitorPoiList`).
   - Cổng giới hạn nội dung trả phí (`ContentPaywallGate`).
   - Trình phát âm thanh mini ghim chân màn hình (`MiniAudioPlayer`).
   - Thanh chỉ dẫn đường đi bộ (`VisitorWayfindingBanner`).
   - Modal thanh toán quét mã QR / Thẻ quốc tế (`CheckoutModal`).
2. **`CheckoutSuccessPage.jsx`**: Màn hình xác nhận thanh toán thành công, hiển thị mã khôi phục phiên (`session_code`).
3. **`QRCodePage.jsx`**: Trang công cộng hiển thị mã QR truy cập nhanh cho du khách quét bằng điện thoại tại cổng vào.

---

## 4. End-to-End Data Flows

### 4.1. Kích hoạt Âm thanh Tự động qua Geofence
1. `useGeolocation` lấy tọa độ thiết bị du khách `(lat, lng)`.
2. `useGeofenceTrigger` duyệt qua danh sách POI, tính khoảng cách bằng `calculateHaversineDistance`.
3. Nếu $d \le \text{trigger\_radius}$ và `isCooldownActive(poi_id)` là `false`:
   - Ghi nhận cooldown qua `setCooldown(poi_id)`.
   - Bắn sự kiện telemetry về backend qua `telemetryApi.reportPoiTrigger`.
   - Gọi `playPoiAudio` trong `AudioPlayerContext`.
   - Browser gửi request đến `GET /api/v1/audio/{poi_id}?token={session_token}&language={lang}`.
   - Backend xác thực token phiên qua `AudioService.verify_streaming_access`, stream nội dung MP3 về client.

### 4.2. Thanh toán & Kích hoạt Phiên Tham quan 24h
1. Du khách chọn phương thức thanh toán trong `CheckoutModal`.
2. Frontend gọi `paymentApi.createCheckoutOrder` -> Backend tạo giao dịch trong bảng `transactions` và sinh mã PayOS / PayPal.
3. Hook `usePaymentPolling` thăm dò trạng thái đơn hàng mỗi 2.5s qua `paymentApi.getOrderStatus`.
4. Khi thanh toán hoàn tất (qua Webhook hoặc Sandbox simulation):
   - Backend cập nhật transaction thành `PAID`.
   - `SessionService` tự động sinh 1 bản ghi `visitor_sessions` có hạn 24 giờ, 1 mã bí mật `session_token` và 1 mã phục hồi `session_code` 6 ký tự.
5. Hook nhận trạng thái `PAID`, lưu token vào `VisitorSessionContext` (persist tại `localStorage`), gỡ bỏ paywall và mở khóa toàn bộ nội dung thuyết minh.

### 4.3. Pipeline Dịch & Tổng hợp Giọng đọc khi Tạo/Sửa POI
1. Admin tạo hoặc sửa tiêu đề / bài thuyết minh POI trong `POIFormModal`.
2. Backend lưu thông tin tiếng Việt (`language_id = 'vi'`) vào bảng `pois` và `poi_translations`.
3. Tác vụ nền `TranslationPipelineService` kích hoạt:
   - Với mỗi ngôn ngữ (`en`, `ja`, `ko`, `zh`):
     - Gửi toàn bộ cụm văn bản sang `DeepTranslatorClient` (Offline API trên cổng 8001 -> Google Cloud Translate).
     - Lưu kết quả dịch vào `poi_translations` với trạng thái `PENDING`.
     - Gọi `EdgeTTSClient` tạo file MP3 giọng đọc chuẩn bản ngữ.
     - Cập nhật đường dẫn file audio và chuyển trạng thái sang `READY` hoặc `PUBLISHED`.
4. Trên giao diện Admin, huy hiệu `AudioSyncBadge` tự động chuyển từ trạng thái đồng bộ sang sẵn sàng.

