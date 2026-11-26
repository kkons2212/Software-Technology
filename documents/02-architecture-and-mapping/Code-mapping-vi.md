# Bản Đồ Ánh Xạ Mã Nguồn & Kiểm Soát Bảo Trì Hệ Thống (Codebase Mapping - Smart Audio Guide Củ Chi)

> **Trạng thái:** Nguồn Tham Chiếu Độc Quyền Đang Hoạt Động (Active Single Source of Truth)  
> **Phạm vi:** Toàn bộ mã nguồn `MVP/` bao gồm Backend (FastAPI / SQLAlchemy 2.0 / MySQL 8.0) và Frontend (React 18 / Vite / Tailwind / Leaflet) kết nối trực tiếp vào [`main.py`](../../MVP/backend/app/main.py#L116) và [`App.jsx`](../../MVP/frontend/src/App.jsx#L60)  
> **Quy ước:** Toàn bộ liên kết sử dụng đường dẫn tương đối từ thư mục `documents/` (`../MVP/...#L...`) kèm theo tên định danh mã nguồn chính xác. Không bao gồm các file stub 1 dòng hoặc wrapper re-export không sử dụng.

---

## 1. Bản Đồ Hệ Thống Toàn Cục (Global System Map)

### 1.1 Trung Tâm Điều Hướng Mã Nguồn (Master Navigation Hub)

| Phân hệ / Miền nghiệp vụ | Thành phần / Lớp kiến trúc | Mục tài liệu | Tệp mã nguồn đang chạy | Trách nhiệm cốt lõi |
|---|---|---|---|---|
| **Cấu hình Core** | Biến môi trường & Settings | [Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) | [`config.py`](../../MVP/backend/app/core/config.py#L38) | Lớp `Settings` singleton, ranh giới toạ độ, hạn mức rate limit, danh sách provider |
| **Cấu hình Core** | DB Engine | [1.6 Ma trận Repo-DB](#16-ma-trận-service-sang-repository--repository-sang-database) | [`database.py`](../../MVP/backend/app/core/database.py#L21) | Engine SQLAlchemy (`create_database_engine`), hàm yield session `get_db` |
| **Cấu hình Core** | Bộ tiêm phụ thuộc (DI) | [Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) | [`dependencies.py`](../../MVP/backend/app/core/dependencies.py#L34) | Điểm cấu hình phụ thuộc ngoài L1/L2/L3 |
| **Cấu hình Core** | Chuẩn hoá lỗi | [Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) | [`exceptions.py`](../../MVP/backend/app/core/exceptions.py#L21) | Lớp `ApiError` và định dạng JSON thống nhất `{success: false, error}` |
| **Cấu hình Core** | Giới hạn tần suất | [Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) | [`limiter.py`](../../MVP/backend/app/core/limiter.py#L27) | `DynamicLimiter` và decorator `@rate_limit` |
| **Cấu hình Core** | Điểm vào FastAPI | [Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) | [`main.py`](../../MVP/backend/app/main.py#L116) | Khởi tạo app, CORS, 14 router, worker vòng đời lifespan, `/health` |
| **Cấu hình Core** | Định tuyến React | [Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) | [`App.jsx`](../../MVP/frontend/src/App.jsx#L60) | Quản lý lazy-load route cho khách (Visitor) và quản trị viên (Admin) |
| **Cấu hình Core** | HTTP Client | [Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) | [`apiClient.js`](../../MVP/frontend/src/api/apiClient.js#L162) | Wrapper fetch (`credentials: 'include'`, chuẩn hoá `ApiError`) |
| **Đóng gói** | Container Docker | [Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) | [`docker-compose.yml`](../../MVP/docker-compose.yml#L1) | Chạy App ([`Dockerfile.app`](../../MVP/Dockerfile.app#L1)) và MySQL ([`Dockerfile.mysql`](../../MVP/Dockerfile.mysql#L1)) |
| **1.0 Auth** | Màn hình & Bộ bảo vệ | [Module 1.0](#module-10-xác-thực-quản-trị-viên--bảo-mật-phiên-dfd-10--uc-02) | [`AdminLoginView.jsx`](../../MVP/frontend/src/views/admin/AdminLoginView.jsx#L34) | Form đăng nhập, [`AdminRouteGuard.jsx`](../../MVP/frontend/src/components/admin/AdminRouteGuard.jsx#L15), [`AdminNavbar.jsx`](../../MVP/frontend/src/components/admin/AdminNavbar.jsx#L9) |
| **1.0 Auth** | Ngữ cảnh & Đếm giờ rảnh | [Module 1.0](#module-10-xác-thực-quản-trị-viên--bảo-mật-phiên-dfd-10--uc-02) | [`AuthContext.jsx`](../../MVP/frontend/src/contexts/AuthContext.jsx#L23) | Trạng thái đăng nhập admin & [`useIdleTimer.js`](../../MVP/frontend/src/hooks/useIdleTimer.js#L41) (hết hạn sau 30 phút rảnh) |
| **1.0 Auth** | Controller & Service | [Module 1.0](#module-10-xác-thực-quản-trị-viên--bảo-mật-phiên-dfd-10--uc-02) | [`auth_controller.py`](../../MVP/backend/app/controllers/auth_controller.py#L28) | `/login`, `/me`, `/logout` -> chuyển tiếp sang [`auth_service.py`](../../MVP/backend/app/services/auth_service.py#L59) |
| **1.0 Auth** | Bảo mật & Dữ liệu | [Module 1.0](#module-10-xác-thực-quản-trị-viên--bảo-mật-phiên-dfd-10--uc-02) | [`security.py`](../../MVP/backend/app/core/security.py#L28) | Băm mật khẩu Bcrypt + JWT HS256, [`user_repository.py`](../../MVP/backend/app/repositories/user_repository.py#L15), [`audit_repository.py`](../../MVP/backend/app/repositories/audit_repository.py#L17) |
| **2.0 Catalog** | Màn hình & Bộ chọn toạ độ | [Module 2.0](#module-20-danh-mục-điểm-di-tích--quản-lý-vùng-geofence-dfd-20--uc-03) | [`PoiCatalogPage.jsx`](../../MVP/frontend/src/views/admin/PoiCatalogPage.jsx#L20) | Bảng POI, [`POIFormModal.jsx`](../../MVP/frontend/src/components/admin/POIFormModal.jsx#L26), [`GeofenceCalibPage.jsx`](../../MVP/frontend/src/views/admin/GeofenceCalibPage.jsx#L24), [`AdminMapPicker.jsx`](../../MVP/frontend/src/components/admin/AdminMapPicker.jsx#L82) |
| **2.0 Catalog** | Controllers | [Module 2.0](#module-20-danh-mục-điểm-di-tích--quản-lý-vùng-geofence-dfd-20--uc-03) | [`poi_controller.py`](../../MVP/backend/app/controllers/poi_controller.py#L26) | Tuyến đường POI công khai/admin + [`admin_poi_controller.py`](../../MVP/backend/app/controllers/admin_poi_controller.py#L26) |
| **2.0 Catalog** | Service & Repo | [Module 2.0](#module-20-danh-mục-điểm-di-tích--quản-lý-vùng-geofence-dfd-20--uc-03) | [`poi_service.py`](../../MVP/backend/app/services/poi_service.py#L155) | Kiểm tra ranh giới, định dạng ảnh, truy vấn [`poi_repository.py`](../../MVP/backend/app/repositories/poi_repository.py#L12) |
| **3.0 Translation** | Màn hình & Trình nghe thử | [Module 3.0](#module-30-dịch-máy-đa-ngữ--tổng-hợp-âm-thanh-edge-tts-dfd-30--uc-04) | [`TranslationAuditView.jsx`](../../MVP/frontend/src/views/admin/TranslationAuditView.jsx#L25) | Giao diện đối soát song ngữ ([`TranslationPage.jsx`](../../MVP/frontend/src/views/admin/TranslationPage.jsx#L7)), [`AudioAuditPlayer.jsx`](../../MVP/frontend/src/components/admin/AudioAuditPlayer.jsx#L11) |
| **3.0 Translation** | Controller & Service | [Module 3.0](#module-30-dịch-máy-đa-ngữ--tổng-hợp-âm-thanh-edge-tts-dfd-30--uc-04) | [`translation_controller.py`](../../MVP/backend/app/controllers/translation_controller.py#L23) | Đối soát/xuất bản/thử lại -> [`translation_service.py`](../../MVP/backend/app/services/translation_service.py#L15), [`tts_service.py`](../../MVP/backend/app/services/tts_service.py#L19) |
| **3.0 Translation** | Hàng đợi & Worker nền | [Module 3.0](#module-30-dịch-máy-đa-ngữ--tổng-hợp-âm-thanh-edge-tts-dfd-30--uc-04) | [`pipeline_queue.py`](../../MVP/backend/app/services/pipeline_queue.py#L48) | Hàng đợi bất đồng bộ, [`translation_pipeline_service.py`](../../MVP/backend/app/services/translation_pipeline_service.py#L21), [`translation_worker.py`](../../MVP/backend/app/services/translation_worker.py#L24), [`audio_synthesis_worker.py`](../../MVP/backend/app/services/audio_synthesis_worker.py#L21) |
| **3.0 Translation** | Client AI & TTS | [Module 3.0](#module-30-dịch-máy-đa-ngữ--tổng-hợp-âm-thanh-edge-tts-dfd-30--uc-04) | [`deep_translator_client.py`](../../MVP/backend/app/integrations/deep_translator_client.py#L34) | Cụm dịch Render + chuyển đổi dự phòng OpenRouter, [`edge_tts_client.py`](../../MVP/backend/app/integrations/edge_tts_client.py#L43) |
| **4.0 Payment** | Modal & Ngữ cảnh | [Module 4.0](#module-40-thanh-toán-vé-số-hóa--phiên-du-khách-24h-dfd-40--uc-06) | [`CheckoutModal.jsx`](../../MVP/frontend/src/components/visitor/CheckoutModal.jsx#L72) | Thanh toán VietQR/PayPal, [`RestoreSessionModal.jsx`](../../MVP/frontend/src/components/visitor/RestoreSessionModal.jsx#L68), [`VisitorSessionContext.jsx`](../../MVP/frontend/src/contexts/VisitorSessionContext.jsx#L88) |
| **4.0 Payment** | Controllers | [Module 4.0](#module-40-thanh-toán-vé-số-hóa--phiên-du-khách-24h-dfd-40--uc-06) | [`payment_controller.py`](../../MVP/backend/app/controllers/payment_controller.py#L29) | Tạo đơn/webhook/capture, [`session_controller.py`](../../MVP/backend/app/controllers/session_controller.py#L13), [`audio_controller.py`](../../MVP/backend/app/controllers/audio_controller.py#L15) |
| **4.0 Payment** | Services & Dữ liệu | [Module 4.0](#module-40-thanh-toán-vé-số-hóa--phiên-du-khách-24h-dfd-40--uc-06) | [`payment_service.py`](../../MVP/backend/app/services/payment_service.py#L44) | [`session_service.py`](../../MVP/backend/app/services/session_service.py#L10), [`audio_service.py`](../../MVP/backend/app/services/audio_service.py#L14), [`paypal_client.py`](../../MVP/backend/app/integrations/paypal_client.py#L18) |
| **5.0 Map** | Màn hình & Thành phần | [Module 5.0](#module-50-bản-đồ-tương-tác-gps-geofencing--dẫn-đường-osrm-dfd-50--uc-01) | [`VisitorTourPage.jsx`](../../MVP/frontend/src/views/visitor/VisitorTourPage.jsx#L70) | Màn hình tham quan, [`VisitorMapView.jsx`](../../MVP/frontend/src/views/visitor/VisitorMapView.jsx#L12), [`RouteOverlay.jsx`](../../MVP/frontend/src/components/visitor/RouteOverlay.jsx#L34), [`QRCodePage.jsx`](../../MVP/frontend/src/views/QRCodePage.jsx#L29) |
| **5.0 Map** | Hooks & Trình phát | [Module 5.0](#module-50-bản-đồ-tương-tác-gps-geofencing--dẫn-đường-osrm-dfd-50--uc-01) | [`useGeofenceTrigger.js`](../../MVP/frontend/src/hooks/useGeofenceTrigger.js#L29) | [`useGeolocation.js`](../../MVP/frontend/src/hooks/useGeolocation.js#L29), [`cooldownService.js`](../../MVP/frontend/src/services/cooldownService.js#L28), [`AudioPlayerContext.jsx`](../../MVP/frontend/src/contexts/AudioPlayerContext.jsx#L19) |
| **5.0 Map** | Dẫn đường & Media | [Module 5.0](#module-50-bản-đồ-tương-tác-gps-geofencing--dẫn-đường-osrm-dfd-50--uc-01) | [`tour_controller.py`](../../MVP/backend/app/controllers/tour_controller.py#L12) | [`wayfinding_service.py`](../../MVP/backend/app/services/wayfinding_service.py#L58) (OSRM + Haversine), [`media_controller.py`](../../MVP/backend/app/controllers/media_controller.py#L15) |
| **6.0 Telemetry** | Bảng phân tích Dashboard | [Module 6.0](#module-60-dữ-liệu-đo-đạc-bản-đồ-nhiệt-mật-độ--sức-khoẻ-hạ-tầng-dfd-60--uc-05) | [`AnalyticsDashboard.jsx`](../../MVP/frontend/src/views/admin/AnalyticsDashboard.jsx#L52) | Bảng chỉ số KPI, [`AnalyticsHeatmap.jsx`](../../MVP/frontend/src/components/admin/AnalyticsHeatmap.jsx#L103), [`SystemHealthPage.jsx`](../../MVP/frontend/src/views/admin/SystemHealthPage.jsx#L7) |
| **6.0 Telemetry** | Controllers & Services | [Module 6.0](#module-60-dữ-liệu-đo-đạc-bản-đồ-nhiệt-mật-độ--sức-khoẻ-hạ-tầng-dfd-60--uc-05) | [`analytics_controller.py`](../../MVP/backend/app/controllers/analytics_controller.py#L27) | [`telemetry_controller.py`](../../MVP/backend/app/controllers/telemetry_controller.py#L13), [`system_controller.py`](../../MVP/backend/app/controllers/system_controller.py#L30), [`telemetry_service.py`](../../MVP/backend/app/services/telemetry_service.py#L66), [`export_service.py`](../../MVP/backend/app/services/export_service.py#L33), [`storage_service.py`](../../MVP/backend/app/services/storage_service.py#L29) |

---

### 1.2 Kiến Trúc & Sơ Đồ Phụ Thuộc Tầng Hệ Thống

```mermaid
graph TD
    subgraph Client_Tier [Tầng Client: React 18 + Vite]
        AdminPortal["Cổng Quản Trị (/admin/*)"]
        VisitorApp["Ứng Dụng Khách PWA (/, /visitor, /qr)"]
    end

    subgraph API_Tier [Tầng API: FastAPI Controllers]
        AuthCtrl["auth_controller.py"]
        PoiCtrl["poi_controller.py"]
        AdminPoiCtrl["admin_poi_controller.py"]
        TransCtrl["translation_controller.py"]
        AudioCtrl["audio_controller.py"]
        LangCtrl["language_controller.py"]
        TourCtrl["tour_controller.py"]
        PayCtrl["payment_controller.py"]
        SessCtrl["session_controller.py"]
        AnaCtrl["analytics_controller.py"]
        TelCtrl["telemetry_controller.py"]
        SysCtrl["system_controller.py"]
        MediaCtrl["media_controller.py"]
    end

    subgraph Service_Tier [Tầng Dịch Vụ & Worker Nền]
        AuthSvc["auth_service.py"]
        PoiSvc["poi_service.py"]
        TransSvc["translation_service.py"]
        PipeSvc["translation_pipeline_service.py"]
        PipeQ["pipeline_queue.py"]
        TransW["translation_worker.py"]
        AudioW["audio_synthesis_worker.py"]
        TtsSvc["tts_service.py"]
        AudioSvc["audio_service.py"]
        LangSvc["language_service.py"]
        WaySvc["wayfinding_service.py"]
        PaySvc["payment_service.py"]
        SessSvc["session_service.py"]
        TelSvc["telemetry_service.py"]
        ExpSvc["export_service.py"]
        StorSvc["storage_service.py"]
    end

    subgraph Integration_Tier [Bộ Tương Thích Tích Hợp (Adapters)]
        DeepTrans["deep_translator_client.py<br/>(Render + OpenRouter)"]
        EdgeTTS["edge_tts_client.py<br/>(Edge Neural TTS)"]
        PayPal["paypal_client.py<br/>(PayPal Orders V2)"]
        StorCli["storage_client.py<br/>(Supabase / Ổ đĩa cục bộ)"]
    end

    subgraph Repo_DB_Tier [Repositories & Bảng MySQL 8.0]
        UserRepo["UserRepository -> Bảng User"]
        AuditRepo["AuditRepository -> Bảng Audit"]
        PoiRepo["POIRepository -> Bảng POI"]
        TransRepo["TranslationRepository -> Bảng POITranslation"]
        AudioRepo["AudioRepository -> Cột Audio trong POITranslation"]
        LangRepo["LanguageRepository -> Bảng LanguageCode"]
        TxnRepo["TransactionRepository -> Bảng Transaction"]
        SessRepo["SessionRepository -> Bảng VisitorSession"]
        TelRepo["TelemetryRepository -> Bảng POITrigger"]
    end

    AdminPortal --> AuthCtrl & PoiCtrl & AdminPoiCtrl & TransCtrl & AnaCtrl & SysCtrl & LangCtrl
    VisitorApp --> PoiCtrl & LangCtrl & TourCtrl & AudioCtrl & PayCtrl & SessCtrl & TelCtrl & MediaCtrl & SysCtrl

    AuthCtrl --> AuthSvc
    PoiCtrl --> PoiSvc
    AdminPoiCtrl --> PoiSvc
    TransCtrl --> TransSvc & TtsSvc
    AudioCtrl --> AudioSvc
    LangCtrl --> LangSvc
    TourCtrl --> WaySvc
    PayCtrl --> PaySvc
    SessCtrl --> SessSvc
    AnaCtrl --> TelSvc & ExpSvc
    TelCtrl --> TelSvc
    SysCtrl --> StorSvc
    MediaCtrl --> StorCli

    AuthSvc --> UserRepo & AuditRepo
    PoiSvc --> PoiRepo & AuditRepo & LangRepo & SessRepo & StorCli & PipeSvc
    TransSvc --> TransRepo & PoiRepo & AuditRepo & PipeSvc
    PipeSvc --> PipeQ & TransW & AudioW & LangRepo & PoiRepo
    TransW --> DeepTrans & TransRepo & PoiRepo
    AudioW --> EdgeTTS & AudioRepo & TransRepo & PoiRepo & StorCli
    TtsSvc --> EdgeTTS & AudioRepo & StorCli
    AudioSvc --> AudioRepo & SessRepo
    LangSvc --> LangRepo
    WaySvc --> PoiRepo
    PaySvc --> TxnRepo & SessRepo & PayPal
    SessSvc --> SessRepo
    TelSvc --> TelRepo
    ExpSvc --> TelRepo
    StorSvc --> AudioRepo & AuditRepo & PoiRepo
```

---

### 1.3 Mục Lục Phân Hệ & Định Hướng Thư Mục Cấp Cao

| DFD | Use Case | Phân hệ | Tên Miền Nghiệp Vụ | Các Bảng Dữ Liệu Sở Hữu / Truy Vấn | Liên kết nhảy |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **DFD 1.0** | **UC-02** | **Module 1.0** | Xác thực Quản trị viên & Bảo mật Phiên | `User`, `Audit` | [Xem Module 1.0](#module-10-xác-thực-quản-trị-viên--bảo-mật-phiên-dfd-10--uc-02) |
| **DFD 2.0** | **UC-03** | **Module 2.0** | Danh mục Điểm Di tích & Quản lý Vùng Geofence | `POI`, `POITranslation`, `LanguageCode`, `Audit` | [Xem Module 2.0](#module-20-danh-mục-điểm-di-tích--quản-lý-vùng-geofence-dfd-20--uc-03) |
| **DFD 3.0** | **UC-04** | **Module 3.0** | Dịch máy Đa ngữ & Tổng hợp Âm thanh Edge-TTS | `POITranslation`, `LanguageCode`, `POI`, `Audit` | [Xem Module 3.0](#module-30-dịch-máy-đa-ngữ--tổng-hợp-âm-thanh-edge-tts-dfd-30--uc-04) |
| **DFD 4.0** | **UC-06** | **Module 4.0** | Thanh toán Vé Số hóa & Phiên Du khách 24h | `Transaction`, `VisitorSession`, `POITranslation` | [Xem Module 4.0](#module-40-thanh-toán-vé-số-hóa--phiên-du-khách-24h-dfd-40--uc-06) |
| **DFD 5.0** | **UC-01** | **Module 5.0** | Bản đồ Tương tác, GPS Geofencing & Dẫn đường OSRM | `POI`, `POITranslation`, `LanguageCode`, `VisitorSession` | [Xem Module 5.0](#module-50-bản-đồ-tương-tác-gps-geofencing--dẫn-đường-osrm-dfd-50--uc-01) |
| **DFD 6.0** | **UC-05** | **Module 6.0** | Dữ liệu Đo đạc, Bản đồ Nhiệt Mật độ & Sức khoẻ Hạ tầng | `POITrigger`, `VisitorSession`, `POI`, `POITranslation`, `Audit` | [Xem Module 6.0](#module-60-dữ-liệu-đo-đạc-bản-đồ-nhiệt-mật-độ--sức-khoẻ-hạ-tầng-dfd-60--uc-05) |
| **Core** | **Core** | **Core** | Định tuyến dùng chung, HTTP Client, DB, Bảo mật & Đóng gói | Toàn bộ 8 bảng | [Xem Core](#hạ-tầng-cốt-lõi-dùng-chung-core--shared-infrastructure) |

---

### 1.4 Ma Trận Truy Vết Tính Năng Nguyên Tử (Traceability Matrix)

| ID | Tên tính năng | Lớp 1: Giao diện & State Frontend | Lớp 2: Logic & Gateway Backend | Lớp 3: Truy cập Dữ liệu & Schema | Tệp kiểm thử tự động (Tests) |
|---|---|---|---|---|---|
| **1.1** | Đăng nhập Admin & Kiểm tra Bcrypt | `AdminLoginView.jsx`, `authApi.js` | `auth_controller.py` (`POST /login`), `auth_service.py`, `security.py` | `user_repository.py`, `User`, `AdminLoginRequest` | [`test_auth_controller.py`](../../MVP/backend/tests/unit/controllers/test_auth_controller.py#L1), [`AdminLoginView.test.jsx`](../../MVP/frontend/src/views/admin/__tests__/AdminLoginView.test.jsx#L1) |
| **1.2** | Cấp phát Cookie HttpOnly chứa JWT | `apiClient.js`, `AuthContext.jsx` | `auth_controller.py` (`set_cookie`), `security.py` | `config.py` (`ACCESS_TOKEN_EXPIRE_MINUTES=60`) | [`test_security.py`](../../MVP/backend/tests/unit/core/test_security.py#L1), [`AuthContext.test.jsx`](../../MVP/frontend/src/contexts/__tests__/AuthContext.test.jsx#L1) |
| **1.3** | Giới hạn tần suất đăng nhập (5 lần/phút) | `AdminLoginView.jsx` | `limiter.py`, `auth_controller.py` | Bộ đếm IP của SlowAPI | [`test_limiter.py`](../../MVP/backend/tests/unit/core/test_limiter.py#L1), [`test_auth_controller.py`](../../MVP/backend/tests/unit/controllers/test_auth_controller.py#L1) |
| **1.4** | Khóa tài khoản sau 5 lần sai (15 phút) | `AccountLockoutModal.jsx` | `auth_service.py` (`MAX_FAILED_ATTEMPTS=5`) | `user_repository.py`, `User.Lockeduntil` | [`test_auth_service.py`](../../MVP/backend/tests/unit/services/test_auth_service.py#L1), [`AccountLockoutModal.test.jsx`](../../MVP/frontend/src/components/__tests__/AccountLockoutModal.test.jsx#L1) |
| **1.5** | Hồ sơ Admin & Lời chào trên Navbar | `AdminNavbar.jsx`, `AdminRouteGuard.jsx` | `auth_controller.py` (`GET /me`), `dependencies.py` | `user_repository.py`, `AdminProfileResponse` | [`AdminNavbar.test.jsx`](../../MVP/frontend/src/components/admin/__tests__/AdminNavbar.test.jsx#L1), [`AdminRouteGuard.test.jsx`](../../MVP/frontend/src/components/admin/__tests__/AdminRouteGuard.test.jsx#L1) |
| **1.6** | Tự động đăng xuất khi không thao tác (30p) | `AuthContext.jsx`, `useIdleTimer.js` | `config.py` (`IDLE_TIMEOUT_MINUTES=30`) | Lắng nghe sự kiện trình duyệt & `sessionStorage` | [`useIdleTimer.test.js`](../../MVP/frontend/src/hooks/__tests__/useIdleTimer.test.js#L1) |
| **1.7** | Đăng xuất & Thu hồi Token trong Audit | `AdminNavbar.jsx`, `authApi.js` | `auth_controller.py` (`POST /logout`), `auth_service.py` | `audit_repository.py`, `Audit` (`ADMIN_LOGOUT`) | [`test_audit_repository.py`](../../MVP/backend/tests/unit/repositories/test_audit_repository.py#L1) |
| **2.1** | Danh mục POI Admin có phân trang | `PoiCatalogPage.jsx`, `poiApi.js` | `poi_controller.py` (`GET /admin/pois`), `poi_service.py` | `poi_repository.py`, `POIListResponse` | [`PoiCatalogPage.test.jsx`](../../MVP/frontend/src/views/admin/__tests__/PoiCatalogPage.test.jsx#L1), [`test_poi_controller.py`](../../MVP/backend/tests/unit/controllers/test_poi_controller.py#L1) |
| **2.2** | Lọc tìm kiếm điểm POI theo tiêu đề | `PoiCatalogPage.jsx` | `poi_controller.py`, `poi_service.py` | `poi_repository.py` (`ilike`) | [`test_poi_repository.py`](../../MVP/backend/tests/unit/repositories/test_poi_repository.py#L1) |
| **2.3** | Lấy chi tiết POI & Modal chỉnh sửa | `POIFormModal.jsx`, `poiApi.js` | `poi_controller.py` (`GET /admin/pois/{id}`) | `poi_repository.py`, `POIResponse` | [`POIFormModal.test.jsx`](../../MVP/frontend/src/components/__tests__/POIFormModal.test.jsx#L1) |
| **2.4** | Tạo mới POI & Tự động gieo mầm bản dịch | `PoiCatalogPage.jsx`, `poiApi.js` | `poi_controller.py` (`POST /admin/pois`), `poi_service.py` | `poi_repository.py`, `POICreateRequest`, `POI`, `POITranslation` | [`test_poi_service.py`](../../MVP/backend/tests/unit/services/test_poi_service.py#L1), [`test_poi_schema.py`](../../MVP/backend/tests/unit/schemas/test_poi_schema.py#L1) |
| **2.5** | Kiểm tra ranh giới Củ Chi & Hiệu chỉnh Geofence | `GeofenceCalibPage.jsx`, `AdminMapPicker.jsx` | `admin_poi_controller.py` (`PUT /{id}`), `poi_service.py` | `config.py` (`CU_CHI_BOUNDS`), `POI.Radius` (`10..50`) | [`GeofenceCalibPage.test.jsx`](../../MVP/frontend/src/views/admin/__tests__/GeofenceCalibPage.test.jsx#L1), [`AdminMapPicker.test.jsx`](../../MVP/frontend/src/components/admin/__tests__/AdminMapPicker.test.jsx#L1) |
| **2.6** | Tải lên ảnh bìa POI (<= 5MB, Pillow check) | `POIFormModal.jsx`, `poiApi.js` | `admin_poi_controller.py` (`POST /upload-image`), `poi_service.py` | `storage_client.py`, `/static/images` hoặc Supabase | [`test_admin_poi_controller.py`](../../MVP/backend/tests/unit/controllers/test_admin_poi_controller.py#L1) |
| **2.7** | Cập nhật POI & Huỷ hợp lệ bản dịch cũ | `POIFormModal.jsx`, `adminPoiApi.js` | `admin_poi_controller.py` (`PUT /{id}`), `poi_service.py` | `poi_repository.py` (`POITranslation.Status='PENDING'`) | [`test_poi_service.py`](../../MVP/backend/tests/unit/services/test_poi_service.py#L1) |
| **2.8** | Bật/Tắt hiển thị POI (Active/Hidden) | `DeactivateConfirmModal.jsx` | `admin_poi_controller.py` (`PATCH /{id}/visibility`) | `poi_repository.py`, `POI.Is_Active` | [`DeactivateConfirmModal.test.jsx`](../../MVP/frontend/src/components/admin/__tests__/DeactivateConfirmModal.test.jsx#L1) |
| **2.9** | Thử lại dịch máy cho các bản dịch lỗi | `PoiCatalogPage.jsx`, `poiApi.js` | `admin_poi_controller.py` (`POST /{id}/retry-translations`) | `poi_repository.py`, `PipelineQueueManager` | [`test_admin_poi_controller.py`](../../MVP/backend/tests/unit/controllers/test_admin_poi_controller.py#L1) |
| **2.10**| Hiển thị POI công khai & Che nội dung Paywall | `VisitorTourPage.jsx`, `poiApi.js` | `poi_controller.py` (`GET /pois`, `GET /pois/{id}`) | `poi_service.py` (`_to_map_item`), `POIMapItem` | [`test_public_map_api.py`](../../MVP/backend/tests/unit/test_public_map_api.py#L1) |
| **3.1** | Hàng đợi dịch bất đồng bộ & Tự phục hồi | Chạy nền khi tạo/sửa POI | `pipeline_queue.py`, `translation_pipeline_service.py` | Khôi phục bản ghi `PENDING` lúc khởi động | [`test_pipeline_queue.py`](../../MVP/backend/tests/unit/services/test_pipeline_queue.py#L1), [`test_translation_pipeline_service.py`](../../MVP/backend/tests/unit/services/test_translation_pipeline_service.py#L1) |
| **3.2** | Dịch máy qua Render OPUS-MT | Worker nền | `translation_worker.py`, `deep_translator_client.py` | `translation_repository.py`, `POITranslation` | [`test_deep_translator_client.py`](../../MVP/backend/tests/unit/integrations/test_deep_translator_client.py#L1) |
| **3.3** | Tự động chuyển đổi cụm khoá OpenRouter | Dự phòng trong suốt khi Render lỗi | `deep_translator_client.py`, `config.py` | Cụm khoá xoay vòng trong `OPENROUTER_API_KEY` | [`test_deep_translator_client.py`](../../MVP/backend/tests/unit/integrations/test_deep_translator_client.py#L1) |
| **3.4** | Lồng tiếng Edge-TTS & Khử trùng lặp SHA-256 | Tổng hợp âm thanh nền | `audio_synthesis_worker.py`, `edge_tts_client.py` | `audio_repository.py`, các cột audio của `POITranslation` | [`test_edge_tts_client.py`](../../MVP/backend/tests/unit/integrations/test_edge_tts_client.py#L1) |
| **3.5** | Bảng đối soát bản dịch & Bộ lọc | `TranslationAuditView.jsx`, `TranslationPage.jsx` | `translation_controller.py` (`GET /admin/translations`) | `translation_repository.py`, `TranslationListResponse` | [`TranslationAuditView.test.jsx`](../../MVP/frontend/src/views/__tests__/TranslationAuditView.test.jsx#L1), [`test_translation_controller.py`](../../MVP/backend/tests/unit/controllers/test_translation_controller.py#L1) |
| **3.6** | Chỉnh sửa tay & Rào chắn đồng bộ âm thanh | `TranslationAuditView.jsx`, `AudioSyncBadge.jsx` | `translation_controller.py` (`PUT /{id}`), `translation_service.py` | Ép trạng thái `Status='NEEDS_UPDATE'` khi sửa chữ | [`test_translation_service.py`](../../MVP/backend/tests/unit/services/test_translation_service.py#L1), [`AudioSyncBadge.test.jsx`](../../MVP/frontend/src/components/__tests__/AudioSyncBadge.test.jsx#L1) |
| **3.7** | Phê duyệt bản dịch & Xuất bản (Publish) | `TranslationAuditView.jsx` | `translation_controller.py` (`POST /{id}/publish`) | Bắt buộc `audio.status='READY'`, đặt `PUBLISHED` | [`test_translation_service.py`](../../MVP/backend/tests/unit/services/test_translation_service.py#L1) |
| **3.8** | Tạo lại âm thanh thủ công & Nghe kiểm duyệt | `RegenerateAudioButton.jsx`, `AudioAuditPlayer.jsx` | `translation_controller.py` (`POST /{id}/regenerate-audio`), `tts_service.py` | `audio_repository.py`, `StorageClient` | [`test_tts_service.py`](../../MVP/backend/tests/unit/services/test_tts_service.py#L1), [`RegenerateAudioButton.test.jsx`](../../MVP/frontend/src/components/__tests__/RegenerateAudioButton.test.jsx#L1) |
| **4.1** | Giao diện tường phí Paywall Gate | `ContentPaywallGate.jsx`, `VisitorSessionContext.jsx` | `poi_service.py` (`is_locked=None`) | Token phiên lưu trong `localStorage` | [`ContentPaywallGate.test.jsx`](../../MVP/frontend/src/components/__tests__/ContentPaywallGate.test.jsx#L1) |
| **4.2** | Modal thanh toán VietQR / PayPal | `CheckoutModal.jsx`, `paymentApi.js` | `payment_controller.py` (`POST /create-checkout`), `payment_service.py` | `transaction_repository.py`, `Transaction`, `creator_token_hash` | [`CheckoutModal.test.jsx`](../../MVP/frontend/src/components/__tests__/CheckoutModal.test.jsx#L1), [`test_payment_controller.py`](../../MVP/backend/tests/unit/controllers/test_payment_controller.py#L1) |
| **4.3** | Webhook PayOS HMAC & Polling đơn hàng | `usePaymentPolling.js`, `CheckoutSuccessPage.jsx` | `payment_controller.py` (`/status`, `/webhook`, `/paypal-capture`) | `transaction_repository.py` (`mark_as_paid`) | [`usePaymentPolling.test.js`](../../MVP/frontend/src/hooks/__tests__/usePaymentPolling.test.js#L1), [`test_payment_service.py`](../../MVP/backend/tests/unit/services/test_payment_service.py#L1) |
| **4.4** | Chế độ giả lập thanh toán (Chỉ Dev) | `CheckoutModal.jsx` | `payment_controller.py` (`POST /simulate-success`, `/paypal-checkout`) | `config.py` (`is_payment_simulation_allowed`) | [`test_payment_controller.py`](../../MVP/backend/tests/unit/controllers/test_payment_controller.py#L1) |
| **4.5** | Đổi Creator Token lấy Phiên 24h | `usePaymentPolling.js`, `VisitorSessionContext.jsx` | `payment_controller.py` (`POST /order/{id}/session`) | `VisitorSession` (`CCT-XXXXXX`, `Expire_at=+24h`) | [`VisitorSessionContext.test.jsx`](../../MVP/frontend/src/contexts/__tests__/VisitorSessionContext.test.jsx#L1) |
| **4.6** | Khôi phục phiên đa thiết bị qua mã PIN | `RestoreSessionModal.jsx`, `sessionApi.js` | `session_controller.py` (`POST /sessions/restore`), `session_restore_rate_limit.py` | `session_repository.py`, `SessionRestoreRequest` | [`RestoreSessionModal.test.jsx`](../../MVP/frontend/src/components/visitor/__tests__/RestoreSessionModal.test.jsx#L1), [`test_session_controller.py`](../../MVP/backend/tests/unit/controllers/test_session_controller.py#L1) |
| **4.7** | Stream âm thanh có kiểm soát quyền | `AudioPlayerContext.jsx`, `MiniAudioPlayer.jsx` | `audio_controller.py` (`GET /audio/{poi_id}`), `audio_service.py` | `audio_repository.py` (dự phòng tiếng Việt `vi`), `session_repository.py` | [`test_audio_controller.py`](../../MVP/backend/tests/unit/controllers/test_audio_controller.py#L1), [`AudioPlayerContext.test.jsx`](../../MVP/frontend/src/contexts/__tests__/AudioPlayerContext.test.jsx#L1) |
| **5.1** | Bản đồ Leaflet OSM & Đánh dấu Marker | `VisitorMapView.jsx`, `VisitorPoiMarkers.jsx`, `VisitorLocationMarker.jsx` | `poi_controller.py` (`GET /pois`), `language_controller.py` | `museumBounds.js` (`MAIN_ENTRANCE`), `LanguageCode` | [`VisitorMapView.test.jsx`](../../MVP/frontend/src/views/__tests__/VisitorMapView.test.jsx#L1), [`VisitorPoiMarkers.test.jsx`](../../MVP/frontend/src/components/visitor/__tests__/VisitorPoiMarkers.test.jsx#L1) |
| **5.2** | Theo dõi GPS & Cooldown chống lặp 10 phút | `useGeolocation.js`, `useGeofenceTrigger.js`, `cooldownService.js`, `haversine.js` | Tính khoảng cách Haversine (`10m–50m`, mặc định `30m`, khoá `600s`) | Lưu vết trong `localStorage` (`poi_cooldown_*`) | [`useGeofenceTrigger.test.js`](../../MVP/frontend/src/hooks/__tests__/useGeofenceTrigger.test.js#L1), [`cooldownService.test.js`](../../MVP/frontend/src/services/__tests__/cooldownService.test.js#L1) |
| **5.3** | Tuyến đường đi bộ OSRM & Lớp phủ Polyline | `RouteOverlay.jsx`, `tourApi.js`, `PoiPreviewCard.jsx` | `tour_controller.py` (`GET /tour/route`), `wayfinding_service.py` | OSRM Foot HTTP (`timeout 0.8s`) + dự phòng Haversine | [`test_wayfinding_service.py`](../../MVP/backend/tests/unit/services/test_wayfinding_service.py#L1), [`RouteOverlay.test.jsx`](../../MVP/frontend/src/components/visitor/__tests__/RouteOverlay.test.jsx#L1) |
| **5.4** | Proxy & Bảo vệ tải ảnh bìa | `PoiPreviewCard.jsx` | `media_controller.py` (`GET /media/poi-images/{filename}`), `main.py` | `StorageClient` (ổ cứng cục bộ hoặc Supabase) | [`test_media_controller.py`](../../MVP/backend/tests/unit/controllers/test_media_controller.py#L1) |
| **5.5** | Kiosk mã QR lối vào bảo tàng (`/qr`) | `QRCodePage.jsx`, `systemApi.js` | `system_controller.py` (`GET /system/public-config`), `config.py` | `resolve_base_url()` (`BASE_URL` / `CLOUDFLARE_TUNNEL_URL`) | [`QRCodePage.test.jsx`](../../MVP/frontend/src/views/__tests__/QRCodePage.test.jsx#L1), [`test_system_controller.py`](../../MVP/backend/tests/unit/controllers/test_system_controller.py#L1) |
| **6.1** | Ghi nhận sự kiện kích hoạt Geofence | `VisitorTourPage.jsx`, `telemetryApi.js` | `telemetry_controller.py` (`POST /telemetry/trigger`), `telemetry_service.py` | `telemetry_repository.py`, `POITrigger` | [`test_telemetry_controller.py`](../../MVP/backend/tests/unit/controllers/test_telemetry_controller.py#L1), [`test_telemetry_service.py`](../../MVP/backend/tests/unit/services/test_telemetry_service.py#L1) |
| **6.2** | Bảng KPI Admin & Bản đồ nhiệt Heatmap | `AnalyticsDashboard.jsx`, `AnalyticsHeatmap.jsx`, `analyticsApi.js` | `analytics_controller.py` (`/summary`, `/heatmap`), `telemetry_service.py` | `telemetry_repository.py`, `HeatmapDataDTO` | [`AnalyticsDashboard.test.jsx`](../../MVP/frontend/src/views/__tests__/AnalyticsDashboard.test.jsx#L1), [`test_analytics_controller.py`](../../MVP/backend/tests/unit/controllers/test_analytics_controller.py#L1) |
| **6.3** | Xuất báo cáo CSV UTF-8 BOM / JSON | `AnalyticsExport.jsx`, `analyticsApi.js` | `analytics_controller.py` (`GET /export`), `export_service.py` | `telemetry_repository.py` (`query_export_telemetry`) | [`test_export_controller.py`](../../MVP/backend/tests/unit/controllers/test_export_controller.py#L1), [`test_export_service.py`](../../MVP/backend/tests/unit/services/test_export_service.py#L1) |
| **6.4** | Hạn mức lưu trữ & Dọn dẹp tệp mồ côi | `SystemHealthPage.jsx`, `StorageHealthBanner.jsx`, `CleanOrphansModal.jsx` | `system_controller.py` (`/health`, `/clean-orphans`), `storage_service.py` | Cảnh báo `85% / 95%` của `1 GB`, ghi `Audit` (`ADMIN_STORAGE_CLEANED`) | [`SystemHealthPage.test.jsx`](../../MVP/frontend/src/views/admin/__tests__/SystemHealthPage.test.jsx#L1), [`test_storage_service.py`](../../MVP/backend/tests/unit/services/test_storage_service.py#L1) |
| **6.5** | Kiểm tra trạng thái hoạt động (Liveness) | Probe của Docker / Render | `main.py` (`GET /health`) | Trả về `{"status": "ok", "service": ...}` | [`test_main.py`](../../MVP/backend/tests/unit/test_main.py#L1) |

---

### 1.5 Ma Trận Ánh Xạ Tuyến API Sang Service (API-to-Service Mapping)

| Phân hệ | Phương thức | Tuyến đường Endpoint | Quyền truy cập (Auth Gate) | Hạn mức Rate Limit | Controller -> Service được gọi | Schema phản hồi |
|---|---|---|---|---|---|---|
| **1.0 Auth** | `POST` | `/api/v1/auth/login` | Công khai | `5/phút` | `auth_controller.py` -> `AuthService.authenticate_admin` | `AdminSessionResponse` |
| **1.0 Auth** | `GET` | `/api/v1/auth/me` | Cookie Admin | Mặc định | `auth_controller.py` -> `get_current_admin_profile` | `AdminSessionResponse` |
| **1.0 Auth** | `POST` | `/api/v1/auth/logout` | Cookie Admin | Mặc định | `auth_controller.py` -> `AuthService.logout_admin` | `AdminLogoutResponse` |
| **2.0 Catalog** | `GET` | `/api/v1/pois` | Công khai | `60/phút` | `poi_controller.py` -> `POIService.list_map_pois` | `APIResponse[list[POIMapItem]]` |
| **2.0 Catalog** | `GET` | `/api/v1/pois/{poi_id}` | Công khai | Mặc định | `poi_controller.py` -> `POIService.get_visitor_poi_detail` | `APIResponse[POIMapItem]` |
| **2.0 Catalog** | `POST` | `/api/v1/admin/pois` | Cookie Admin | Mặc định | `poi_controller.py` -> `POIService.create_new_poi` | `POIResponse` |
| **2.0 Catalog** | `GET` | `/api/v1/admin/pois` | Cookie Admin | Mặc định | `poi_controller.py` -> `POIService.list_pois` | `POIListResponse` |
| **2.0 Catalog** | `GET` | `/api/v1/admin/pois/{poi_id}` | Cookie Admin | Mặc định | `poi_controller.py` -> `POIService.get_poi_details` | `POIResponse` |
| **2.0 Catalog** | `PUT` | `/api/v1/admin/pois/{poi_id}` | Cookie Admin | Mặc định | `admin_poi_controller.py` -> `POIService.update_poi` | `POIUpdateResponse` |
| **2.0 Catalog** | `POST` | `/api/v1/admin/pois/upload-image` | Cookie Admin | `10/phút` | `admin_poi_controller.py` -> `POIService.save_cover_image` | `{"image_url": str}` |
| **2.0 Catalog** | `PATCH` | `/api/v1/admin/pois/{poi_id}/visibility` | Cookie Admin | Mặc định | `admin_poi_controller.py` -> `POIService.set_poi_visibility` | `POIResponse` |
| **2.0 Catalog** | `POST` | `/api/v1/admin/pois/{poi_id}/retry-translations` | Cookie Admin | Mặc định | `admin_poi_controller.py` -> `POIService.retry_poi_translations` | `POIRetryTranslationResponse` |
| **3.0 Trans** | `GET` | `/api/v1/languages` | Công khai | Mặc định | `language_controller.py` -> `LanguageService.list_published` / `list_all` | `APIResponse[list[PublishedLanguage]]` |
| **3.0 Trans** | `GET` | `/api/v1/admin/translations` | Cookie Admin | Mặc định | `translation_controller.py` -> `TranslationService.list_translations` | `TranslationListResponse` |
| **3.0 Trans** | `GET` | `/api/v1/admin/translations/{id}` | Cookie Admin | Mặc định | `translation_controller.py` -> `TranslationService.get_translation_by_id` | `TranslationResponse` |
| **3.0 Trans** | `PUT` | `/api/v1/admin/translations/{id}` | Cookie Admin | Mặc định | `translation_controller.py` -> `TranslationService.update_translation` | `TranslationResponse` |
| **3.0 Trans** | `POST` | `/api/v1/admin/translations/{id}/regenerate-audio` | Cookie Admin | `3/phút` | `translation_controller.py` -> `TTSService.regenerate_audio` | `AudioRegenerationResponse` |
| **3.0 Trans** | `POST` | `/api/v1/admin/translations/{id}/publish` | Cookie Admin | Mặc định | `translation_controller.py` -> `TranslationService.publish_translation` | `TranslationResponse` |
| **3.0 Trans** | `POST` | `/api/v1/admin/translations/{id}/retry` | Cookie Admin | Mặc định | `translation_controller.py` -> `TranslationService.retry_translation` | `TranslationResponse` |
| **4.0 Payment** | `POST` | `/api/v1/payments/create-checkout` | Công khai | `5/phút` | `payment_controller.py` -> `PaymentService.create_checkout_order` | `CheckoutCreateResponse` |
| **4.0 Payment** | `GET` | `/api/v1/payments/order/{order_id}/status` | Công khai | `30/phút` | `payment_controller.py` -> `PaymentService.get_order_status` | `OrderStatusResponse` |
| **4.0 Payment** | `POST` | `/api/v1/payments/order/{order_id}/simulate-success` | Cờ Dev | Mặc định | `payment_controller.py` -> `PaymentService.simulate_payment_success` | `OrderSessionResponse` |
| **4.0 Payment** | `POST` | `/api/v1/payments/webhook` | Chữ ký PayOS HMAC | Không giới hạn | `payment_controller.py` -> `PaymentService.process_payment_webhook` | `WebhookResponse` |
| **4.0 Payment** | `GET` | `/api/v1/payments/paypal-checkout` | Cờ Dev | Mặc định | `payment_controller.py` -> Trang HTML mock PayPal | `HTMLResponse` |
| **4.0 Payment** | `GET` | `/api/v1/payments/paypal/confirm-mock` | Cờ Dev | Mặc định | `payment_controller.py` -> `PaymentService.simulate_payment_success` | `RedirectResponse` |
| **4.0 Payment** | `POST` | `/api/v1/payments/order/{order_id}/session` | Token người tạo | `10/phút` | `payment_controller.py` -> `PaymentService.exchange_order_session` | `OrderSessionResponse` |
| **4.0 Payment** | `POST` | `/api/v1/payments/order/{order_id}/paypal-capture` | Token người tạo | Mặc định | `payment_controller.py` -> `PaymentService.capture_paypal_order` | `OrderSessionResponse` |
| **4.0 Payment** | `POST` | `/api/v1/sessions/restore` | Công khai | Giới hạn IP + Mã PIN | `session_controller.py` -> `SessionService.restore_session` | `SessionRestoreResponse` |
| **4.0 Payment** | `GET` | `/api/v1/audio/{poi_id}` (hoặc `/stream/{poi_id}`) | Phiên 24h | `20/phút` | `audio_controller.py` -> `AudioService.get_audio_source_for_poi` | `FileResponse` / `307` |
| **5.0 Map** | `GET` | `/api/v1/tour/route` | Công khai | `10/phút` | `tour_controller.py` -> `WayfindingService.calculate_walking_route` | `RouteResponse` |
| **5.0 Map** | `GET` | `/api/v1/media/poi-images/{filename}` | Công khai | Mặc định | `media_controller.py` -> `StorageClient.download_file` / ổ đĩa | `Response` / `FileResponse` |
| **5.0 Map** | `GET` | `/api/v1/system/public-config` | Công khai | Mặc định | `system_controller.py` -> `resolve_base_url` | `PublicConfigResponse` |
| **6.0 Telem** | `POST` | `/api/v1/telemetry/trigger` | Công khai | `20/phút` | `telemetry_controller.py` -> `TelemetryService.ingest_trigger` | `TelemetryTriggerResponse` |
| **6.0 Telem** | `GET` | `/api/v1/admin/analytics/summary` | Cookie Admin | Mặc định | `analytics_controller.py` -> `TelemetryService.get_analytics_summary` | `AnalyticsSummaryResponse` |
| **6.0 Telem** | `GET` | `/api/v1/admin/analytics/heatmap` | Cookie Admin | Mặc định | `analytics_controller.py` -> `TelemetryService.get_heatmap_data` | `HeatmapResponse` |
| **6.0 Telem** | `GET` | `/api/v1/admin/analytics/export` | Cookie Admin | Mặc định | `analytics_controller.py` -> `ExportService.stream_csv` / `stream_json` | `StreamingResponse` |
| **6.0 System** | `GET` | `/api/v1/admin/system/health` | Cookie Admin | Mặc định | `system_controller.py` -> `StorageService.get_system_health` | `SystemHealthResponse` |
| **6.0 System** | `POST` | `/api/v1/admin/storage/clean-orphans` | Cookie Admin | `1 lần/5 phút` | `system_controller.py` -> `StorageService.prune_orphaned_audio_files` | `CleanOrphansResponse` |
| **6.0 System** | `GET` | `/health` | Công khai | Mặc định | `main.py` (`health_check`) | `{"status": "ok"}` |

---

### 1.6 Ma Trận Service Sang Repository & Repository Sang Database

| Lớp Service (Nghiệp vụ) | Repository phụ thuộc chính | Adapter bên ngoài | Thao tác thay đổi dữ liệu (Mutations) |
|---|---|---|---|
| [`AuthService`](../../MVP/backend/app/services/auth_service.py#L59) | `UserRepository`, `AuditRepository` | Không có | Cập nhật `FalsedAttempts`/`Lockeduntil`, ghi nhật ký đăng nhập/đăng xuất |
| [`POIService`](../../MVP/backend/app/services/poi_service.py#L155) | `POIRepository`, `AuditRepository`, `LanguageRepository`, `SessionRepository` | `StorageClient` | Thêm/sửa `POI`, gieo mầm/huỷ hiệu lực `POITranslation`, ghi audit |
| [`TranslationService`](../../MVP/backend/app/services/translation_service.py#L15) | `TranslationRepository`, `AuditRepository`, `POIRepository` | Không có | Cập nhật văn bản nháp (`NEEDS_UPDATE`), chuyển sang `PUBLISHED`, đẩy vào hàng đợi thử lại |
| [`TranslationPipelineService`](../../MVP/backend/app/services/translation_pipeline_service.py#L21) | `TranslationRepository`, `LanguageRepository`, `POIRepository`, `AudioRepository` | `DeepTranslatorClient`, `EdgeTTSClient` | Điều phối sinh TTS tiếng Việt + đánh thức Render + kích hoạt job từng ngôn ngữ |
| [`TranslationWorker`](../../MVP/backend/app/services/translation_worker.py#L24) | `TranslationRepository`, `POIRepository` | `DeepTranslatorClient` | Dịch các hàng `PENDING` thành `DRAFT` hoặc đánh dấu `FAILED` |
| [`AudioSynthesisWorker`](../../MVP/backend/app/services/audio_synthesis_worker.py#L21) | `AudioRepository`, `TranslationRepository`, `POIRepository` | `EdgeTTSClient`, `StorageClient` | Tạo file MP3, upload media, cập nhật siêu dữ liệu audio vào `POITranslation` |
| [`TTSService`](../../MVP/backend/app/services/tts_service.py#L19) | `AudioRepository` | `EdgeTTSClient`, `StorageClient` | Tạo lại MP3 theo yêu cầu và trả lại `DRAFT` nếu đang ở trạng thái `NEEDS_UPDATE` |
| [`AudioService`](../../MVP/backend/app/services/audio_service.py#L14) | `AudioRepository`, `SessionRepository` | Không có | Xác thực phiên 24h và phân giải đường dẫn âm thanh hoặc URL CDN |
| [`LanguageService`](../../MVP/backend/app/services/language_service.py#L20) | `LanguageRepository` | Không có | Đọc danh mục ngôn ngữ và lọc các ngôn ngữ đã xuất bản (`PUBLISHED`) |
| [`WayfindingService`](../../MVP/backend/app/services/wayfinding_service.py#L58) | `POIRepository` | OSRM Foot HTTP API | Đọc toạ độ POI để tính toán đường đi bộ và tạo đường GeoJSON |
| [`PaymentService`](../../MVP/backend/app/services/payment_service.py#L44) | `TransactionRepository`, `SessionRepository` | `PayPalClient`, PayOS HTTP | Tạo `Transaction`, kiểm tra webhook/capture, tạo `VisitorSession` |
| [`SessionService`](../../MVP/backend/app/services/session_service.py#L10) | `SessionRepository` | Không có | Chuẩn hoá mã `CCT-`, kiểm tra hạn 24h, xác thực token |
| [`TelemetryService`](../../MVP/backend/app/services/telemetry_service.py#L66) | `TelemetryRepository` | Không có | Ghi nhận `POITrigger` (tự tạo phiên khách nếu thiếu), tổng hợp chỉ số KPI |
| [`ExportService`](../../MVP/backend/app/services/export_service.py#L33) | `TelemetryRepository` | Không có | Xuất luồng file dữ liệu CSV (UTF-8 BOM) và JSON |
| [`StorageService`](../../MVP/backend/app/services/storage_service.py#L29) | `AudioRepository`, `AuditRepository`, `POIRepository` | Không có | Đo dung lượng đĩa so với hạn mức 1 GB, xoá các tệp MP3 mồ côi |

| Lớp Repository | Model ORM | Bảng MySQL 8.0 | Khoá ngoại & Ràng buộc xoá ([`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L23)) |
|---|---|---|---|
| [`UserRepository`](../../MVP/backend/app/repositories/user_repository.py#L15) | [`User`](../../MVP/backend/app/models/user.py#L17) | `User` | Thực thể admin chính (bảng cha của `Audit`, `POI`, `POITranslation`) |
| [`AuditRepository`](../../MVP/backend/app/repositories/audit_repository.py#L17) | [`Audit`](../../MVP/backend/app/models/audit.py#L28) | `Audit` | `UserName` -> `User(UserName)` (`ON DELETE RESTRICT`) |
| [`LanguageRepository`](../../MVP/backend/app/repositories/language_repository.py#L13) | [`LanguageCode`](../../MVP/backend/app/models/language.py#L9) | `LanguageCode` | Danh mục mã ngôn ngữ (`vi`, `en`, `ja`, `ko`, `zh`, `fr`) |
| [`POIRepository`](../../MVP/backend/app/repositories/poi_repository.py#L12) | [`POI`](../../MVP/backend/app/models/poi.py#L22) | `POI` | `Create_by` -> `User(UserName)` (`ON DELETE SET NULL`) |
| [`TranslationRepository`](../../MVP/backend/app/repositories/translation_repository.py#L9) | [`POITranslation`](../../MVP/backend/app/models/translation.py#L70) | `POITranslation` | `PoiID` -> `POI`, `LanguageID` -> `LanguageCode`, `Review_by` -> `User` (`ON DELETE RESTRICT`) |
| [`AudioRepository`](../../MVP/backend/app/repositories/audio_repository.py#L13) | [`POITranslation`](../../MVP/backend/app/models/translation.py#L70) / [`POIAudio`](../../MVP/backend/app/models/audio.py#L13) | `POITranslation` | `POIAudio` là dataclass Python; các cột audio (`Audio_url`, `Duration`, `File_size`) nằm trực tiếp trong bảng `POITranslation` |
| [`TransactionRepository`](../../MVP/backend/app/repositories/transaction_repository.py#L14) | [`Transaction`](../../MVP/backend/app/models/transaction.py#L19) | `Transaction` | Bảng cha của `VisitorSession` thông qua khoá ngoại `TransactionID` |
| [`SessionRepository`](../../MVP/backend/app/repositories/session_repository.py#L12) | [`VisitorSession`](../../MVP/backend/app/models/session.py#L23) | `VisitorSession` | `PreferredLanguage` -> `LanguageCode`, `TransactionID` -> `Transaction` (`ON DELETE RESTRICT`) |
| [`TelemetryRepository`](../../MVP/backend/app/repositories/telemetry_repository.py#L15) | [`POITrigger`](../../MVP/backend/app/models/trigger.py#L11) | `POITrigger` | `SessionID` -> `VisitorSession`, `PoiID` -> `POI` (`ON DELETE RESTRICT`) |

---

## Module 1.0: Xác Thực Quản Trị Viên & Bảo Mật Phiên (DFD 1.0 / UC-02)

### 1.1 Tổng Quan Phân Hệ
- **Mục đích:** Xác thực quản trị viên bằng mật khẩu mã hoá Bcrypt, phát hành JWT HS256 trong Cookie HttpOnly, ngăn chặn tấn công dò mật khẩu (Brute-force) bằng cách khóa tài khoản 15 phút sau 5 lần nhập sai liên tiếp, ghi nhật ký mọi lần đăng nhập/đăng xuất vào bảng `Audit`, thu hồi token khi đăng xuất và tự động đăng xuất sau 30 phút rảnh rỗi trên giao diện.
- **Điểm vào (Entry Points):**
  - Frontend: [`AdminLoginView.jsx`](../../MVP/frontend/src/views/admin/AdminLoginView.jsx#L34) (`/admin/login`), [`AdminRouteGuard.jsx`](../../MVP/frontend/src/components/admin/AdminRouteGuard.jsx#L15), [`AdminNavbar.jsx`](../../MVP/frontend/src/components/admin/AdminNavbar.jsx#L9)
  - Backend: [`auth_controller.py`](../../MVP/backend/app/controllers/auth_controller.py#L24) (`prefix="/api/v1/auth"`)
- **Thư viện phụ thuộc:** `bcrypt`, `PyJWT` (`jwt`), `SlowAPI`, [`AuthContext.jsx`](../../MVP/frontend/src/contexts/AuthContext.jsx#L23), [`useIdleTimer.js`](../../MVP/frontend/src/hooks/useIdleTimer.js#L41).
- **Dữ liệu sở hữu:** `User` ([`user.py`](../../MVP/backend/app/models/user.py#L17)), `Audit` ([`audit.py`](../../MVP/backend/app/models/audit.py#L28)).

### 1.2 Luồng Tiến Trình DFD 1.0 Cấp 2

| Mã DFD | Tiến trình con | Trách nhiệm thực thi | Các tệp chính liên quan |
| :---: | :--- | :--- | :--- |
| **1.1** | Kiểm tra thông tin đăng nhập | Nhận username/email + password, truy vấn `User`, đối soát mã băm Bcrypt (dùng `DUMMY_BCRYPT_HASH` nếu user không tồn tại để chống lộ thời gian so sánh). | [`AdminLoginView.jsx`](../../MVP/frontend/src/views/admin/AdminLoginView.jsx#L34), [`authApi.js`](../../MVP/frontend/src/api/authApi.js#L18), [`auth_controller.py`](../../MVP/backend/app/controllers/auth_controller.py#L43), [`auth_service.py`](../../MVP/backend/app/services/auth_service.py#L70) |
| **1.2** | Khóa tài khoản chống Brute-force | Tăng bộ đếm `FalsedAttempts`, khóa 15 phút khi chạm mốc sai lần 5, ghi nhật ký vào `Audit`. | [`AccountLockoutModal.jsx`](../../MVP/frontend/src/components/admin/AccountLockoutModal.jsx#L36), [`auth_service.py`](../../MVP/backend/app/services/auth_service.py#L193), [`user_repository.py`](../../MVP/backend/app/repositories/user_repository.py#L38) |
| **1.3** | Cấp phát Cookie Phiên | Đặt lại bộ đếm số lần sai về 0, sinh JWT thời hạn 60 phút gắn vào cookie `admin_session` HttpOnly, trả thông tin `/me`. | [`auth_controller.py`](../../MVP/backend/app/controllers/auth_controller.py#L55), [`security.py`](../../MVP/backend/app/core/security.py#L43), [`dependencies.py`](../../MVP/backend/app/core/dependencies.py#L73) |
| **1.4** | Thu hồi quyền & Đăng xuất rảnh | Ghi bản ghi audit `ADMIN_LOGOUT`, xoá cookie trình duyệt, từ chối các token sinh trước thời điểm đăng xuất, tự động logout sau 30p không thao tác. | [`auth_controller.py`](../../MVP/backend/app/controllers/auth_controller.py#L81), [`auth_service.py`](../../MVP/backend/app/services/auth_service.py#L147), [`useIdleTimer.js`](../../MVP/frontend/src/hooks/useIdleTimer.js#L41) |

### 1.3 Quy Tắc Nghiệp Vụ & Ràng Buộc Kiểm Soát (BR & VAL)

| Mã quy tắc | Tên quy tắc & Diễn giải nghiệp vụ | Vị trí định nghĩa mã nguồn | API / Giao diện áp dụng | Đối tượng Database |
|---|---|---|---|---|
| **BR-AUTH-01** | Xác thực mật khẩu Bcrypt (`BCRYPT_ROUNDS = 12` mặc định; dùng chuỗi băm giả khi không tìm thấy tài khoản để phòng ngừa tấn công timing). | [`security.py`](../../MVP/backend/app/core/security.py#L28), [`auth_service.py`](../../MVP/backend/app/services/auth_service.py#L56) | `POST /api/v1/auth/login` | `User.Password_hash` |
| **BR-AUTH-02** | Khóa tài khoản trong `15` phút (`LOCKOUT_DURATION_MINUTES`) sau `5` lần đăng nhập sai liên tiếp (`MAX_FAILED_ATTEMPTS`), trả về HTTP 423 Locked kèm `retry_after_seconds`. | [`auth_service.py`](../../MVP/backend/app/services/auth_service.py#L54) | `POST /api/v1/auth/login` | `User.FalsedAttempts`, `User.Lockeduntil` |
| **BR-AUTH-03** | Token JWT ký bằng thuật toán HS256 (`ACCESS_TOKEN_EXPIRE_MINUTES = 60`), lưu trong cookie `admin_session` (`httponly=True`, `samesite="strict"`). | [`auth_controller.py`](../../MVP/backend/app/controllers/auth_controller.py#L55), [`config.py`](../../MVP/backend/app/core/config.py#L64) | `/login`, `/me`, `/logout` | Cookie `admin_session` |
| **BR-AUTH-04** | Mọi lần thử đăng nhập (thành công, thất bại, tài khoản ngưng hoạt động, bị khóa) đều ghi vào bảng `Audit`; mọi token cấp trước mốc `ADMIN_LOGOUT` cuối cùng đều bị từ chối. | [`auth_service.py`](../../MVP/backend/app/services/auth_service.py#L242), [`audit_repository.py`](../../MVP/backend/app/repositories/audit_repository.py#L68) | Toàn bộ API `/admin/*` | Bảng `Audit` |
| **BR-AUTH-05** | Tự động đăng xuất ở Client sau `30` phút không có thao tác từ người dùng (`IDLE_TIMEOUT_MINUTES = 30`). | [`config.py`](../../MVP/backend/app/core/config.py#L65), [`useIdleTimer.js`](../../MVP/frontend/src/hooks/useIdleTimer.js#L41) | `AuthContext.jsx` | `sessionStorage` |
| **VAL-AUTH-01** | `username` chuỗi được cắt khoảng trắng (`1..255` ký tự; cột DB `UserName` tối đa 20); `password` chuỗi chính xác byte (`1..128` ký tự). | [`auth_schema.py`](../../MVP/backend/app/schemas/auth_schema.py#L12), [`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L24) | `POST /api/v1/auth/login` | Bảng `User` |
| **VAL-AUTH-02** | `JWT_SECRET_KEY` phải là chuỗi hexa 64 ký tự; giới hạn tần suất đăng nhập `RATE_LIMIT_LOGIN = "5/phút"`. | [`config.py`](../../MVP/backend/app/core/config.py#L55), [`auth_controller.py`](../../MVP/backend/app/controllers/auth_controller.py#L42) | Khởi động app / `/login` | Tệp `.env` |

---

## Module 2.0: Danh Mục Điểm Di Tích & Quản Lý Vùng Geofence (DFD 2.0 / UC-03)

### 2.1 Tổng Quan Phân Hệ
- **Mục đích:** Quản lý CRUD điểm di tích lịch sử, bảo vệ toạ độ trong ranh giới Địa đạo Củ Chi (`CU_CHI_BOUNDS`), hiệu chỉnh bán kính kích hoạt Geofence tương tác trên bản đồ Leaflet (`10m–50m`), tải lên ảnh bìa được kiểm tra định dạng an toàn (JPG/PNG/WebP tối đa 5MB qua thư viện Pillow), tự động gieo mầm bản dịch tiếng nước ngoài ở trạng thái `PENDING` và huỷ hiệu lực bản dịch cũ khi nội dung tiếng Việt thay đổi.
- **Điểm vào (Entry Points):**
  - Frontend: [`PoiCatalogPage.jsx`](../../MVP/frontend/src/views/admin/PoiCatalogPage.jsx#L20) (`/admin/pois`), [`GeofenceCalibPage.jsx`](../../MVP/frontend/src/views/admin/GeofenceCalibPage.jsx#L24) (`/admin/geofence`, `/admin/pois/:id/geofence`)
  - Backend: [`poi_controller.py`](../../MVP/backend/app/controllers/poi_controller.py#L26) (`/api/v1/pois*`, `/api/v1/admin/pois*`), [`admin_poi_controller.py`](../../MVP/backend/app/controllers/admin_poi_controller.py#L26) (`/api/v1/admin/pois/*`)
- **Dữ liệu sở hữu:** `POI` ([`poi.py`](../../MVP/backend/app/models/poi.py#L22)), `POITranslation` ([`translation.py`](../../MVP/backend/app/models/translation.py#L70)), `LanguageCode`, `Audit`.

### 2.2 Quy Tắc Nghiệp Vụ & Ràng Buộc Kiểm Soát (BR & VAL)

| Mã quy tắc | Tên quy tắc & Diễn giải nghiệp vụ | Vị trí định nghĩa mã nguồn | API / Giao diện áp dụng | Đối tượng Database |
|---|---|---|---|---|
| **BR-POI-01** | Toạ độ phải nằm trong ranh giới Củ Chi `CU_CHI_BOUNDS` (`lat: 11.136361..11.149306`, `lng: 106.455139..106.467639`) trừ khi bật cờ `ALLOW_GLOBAL_COORDINATES=True`. | [`poi_service.py`](../../MVP/backend/app/services/poi_service.py#L58), [`config.py`](../../MVP/backend/app/core/config.py#L148) | `POST /admin/pois`, `PUT /admin/pois/{id}` | `POI.Latitude`, `POI.Longitude` |
| **BR-POI-02** | Tạo POI mới sẽ gieo mầm bản dịch tiếng Việt `vi` ở trạng thái `PUBLISHED` và các ngôn ngữ đích (`en`, `ja`, `ko`, `zh`, `fr`) ở trạng thái `PENDING`, sau đó tự động khởi chạy hàng đợi dịch nền. | [`poi_service.py`](../../MVP/backend/app/services/poi_service.py#L245) | `POST /api/v1/admin/pois` | `POI`, `POITranslation` |
| **BR-POI-03** | Chỉnh sửa `title`, `short_description` hoặc `description` của POI sẽ cập nhật bản dịch tiếng Việt, đưa các bản dịch ngoại ngữ về lại `PENDING` và đưa vào hàng đợi dịch lại. | [`poi_service.py`](../../MVP/backend/app/services/poi_service.py#L426), [`poi_repository.py`](../../MVP/backend/app/repositories/poi_repository.py#L146) | `PUT /api/v1/admin/pois/{poi_id}` | `POITranslation.Status` |
| **BR-POI-04** | Tệp ảnh tải lên phải vượt qua kiểm tra đuôi mở rộng, MIME (`image/jpeg`, `image/png`, `image/webp`), dung lượng `<= 5 MB`, kiểm tra chống tấn công Decompression Bomb qua Pillow `verify()`/`load()`; trả về kèm header `X-Content-Type-Options: nosniff`. | [`poi_service.py`](../../MVP/backend/app/services/poi_service.py#L88), [`main.py`](../../MVP/backend/app/main.py#L140) | `POST /upload-image` | `POI.Image_Url` |
| **BR-POI-05** | Khách chưa thanh toán chỉ nhận được phần giới thiệu ngắn `short_description` (`description=None`, `audio_url=None`, `is_locked=None`) và tự động lọc bỏ các tiền tố placeholder `[LANG]` bằng hàm `_strip_language_prefix`. | [`poi_service.py`](../../MVP/backend/app/services/poi_service.py#L602) | `GET /api/v1/pois`, `GET /api/v1/pois/{id}` | `POI`, `POITranslation` |
| **VAL-POI-01** | `title` (`1..255`), `short_description` (`<= 255`), `latitude` (`-90..90`), `longitude` (`-180..180`), `radius` (`10..50`, mặc định `30`); cập nhật POI yêu cầu ít nhất 1 trường không rỗng. | [`poi_schema.py`](../../MVP/backend/app/schemas/poi_schema.py#L13), [`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L85) | `PoiCatalogPage.jsx`, `POIFormModal.jsx` | Ràng buộc `CHK_POI_Radius_Range` |

---

## Module 3.0: Dịch Máy Đa Ngữ & Tổng Hợp Âm Thanh Edge-TTS (DFD 3.0 / UC-04)

### 3.1 Tổng Quan Phân Hệ
- **Mục đích:** Vận hành luồng dịch máy bất đồng bộ từ tiếng Việt sang các ngôn ngữ đích (`en`, `ja`, `ko`, `zh`, `fr`) sử dụng mô hình dự phòng 2 tầng (Render OPUS-MT INT8 -> chuyển đổi sang OpenRouter xoay vòng khoá), tổng hợp tệp thuyết minh MP3 qua Microsoft Edge-TTS kèm mã băm SHA-256 để chống sinh trùng lặp, cung cấp giao diện đối soát song ngữ, tái tạo audio và chốt xuất bản an toàn.
- **Điểm vào (Entry Points):**
  - Frontend: [`TranslationPage.jsx`](../../MVP/frontend/src/views/admin/TranslationPage.jsx#L7) (`/admin/translations`) -> [`TranslationAuditView.jsx`](../../MVP/frontend/src/views/admin/TranslationAuditView.jsx#L25)
  - Backend: [`translation_controller.py`](../../MVP/backend/app/controllers/translation_controller.py#L23) (`/api/v1/admin/translations`), [`language_controller.py`](../../MVP/backend/app/controllers/language_controller.py#L11) (`/api/v1/languages`), [`main.py`](../../MVP/backend/app/main.py#L78) (worker khởi chạy trong `lifespan`)
- **Dữ liệu sở hữu:** `POITranslation` ([`translation.py`](../../MVP/backend/app/models/translation.py#L70)), `LanguageCode` ([`language.py`](../../MVP/backend/app/models/language.py#L9)), `Audit`, bộ đệm tệp MP3 (`static/audio/` hoặc Supabase Storage).

### 3.2 Quy Tắc Nghiệp Vụ & Ràng Buộc Kiểm Soát (BR & VAL)

| Mã quy tắc | Tên quy tắc & Diễn giải nghiệp vụ | Vị trí định nghĩa mã nguồn | API / Giao diện áp dụng | Đối tượng Database |
|---|---|---|---|---|
| **BR-TRANS-01** | Luồng dịch dự phòng 2 tầng (`TRANSLATION_PROVIDERS_ORDER = "render_api,openrouter"`): Render OPUS-MT tách chuỗi thành các đoạn `<= 500` ký tự; tự động chuyển sang OpenRouter (`openrouter/free`) và xoay vòng API key khi gặp mã HTTP `401/402/403/429`. | [`deep_translator_client.py`](../../MVP/backend/app/integrations/deep_translator_client.py#L18), [`config.py`](../../MVP/backend/app/core/config.py#L121) | Worker chạy nền | `POITranslation.Status` |
| **BR-TRANS-02** | Chỉnh sửa bất kỳ trường chữ nào trong bản dịch sẽ lập tức chuyển trạng thái sang `Status = "NEEDS_UPDATE"` và khoá nút xuất bản (`publish_translation`) cho đến khi audio được tạo lại khớp với chữ (`READY`). | [`translation_service.py`](../../MVP/backend/app/services/translation_service.py#L116), [`translation_service.py`](../../MVP/backend/app/services/translation_service.py#L172) | `PUT /{id}`, `POST /{id}/publish` | `POITranslation` |
| **BR-TRANS-03** | Ánh xạ giọng đọc Edge-TTS: `vi` -> `vi-VN-HoaiMyNeural`, `en` -> `en-US-AriaNeural`, `ja` -> `ja-JP-NanamiNeural`, `ko` -> `ko-KR-SunHiNeural`, `zh` -> `zh-CN-XiaoxiaoNeural`, `fr` -> `fr-FR-DeniseNeural` kèm giọng dự phòng cấp hai. | [`edge_tts_client.py`](../../MVP/backend/app/integrations/edge_tts_client.py#L59) | `POST /{id}/regenerate-audio`, Worker | `POITranslation.Audio_url` |
| **BR-TRANS-04** | Giới hạn tần suất tạo lại audio thủ công: tối đa `3 lần/phút` (`RATE_LIMIT_AI_TTS`). | [`translation_controller.py`](../../MVP/backend/app/controllers/translation_controller.py#L84), [`config.py`](../../MVP/backend/app/core/config.py#L84) | `POST /{id}/regenerate-audio` | Bộ giới hạn SlowAPI |
| **BR-TRANS-05** | `PipelineQueueManager` sử dụng phiên DB tức thời (JIT), khử trùng lặp các yêu cầu POI đang chờ, giới hạn luồng đồng thời `PIPELINE_MAX_CONCURRENCY = 1`, và tự động khôi phục các hàng `PENDING` khi ứng dụng khởi động. | [`pipeline_queue.py`](../../MVP/backend/app/services/pipeline_queue.py#L48), [`main.py`](../../MVP/backend/app/main.py#L90) | Lifespan khởi động | `POITranslation` |
| **VAL-TRANS-01** | `title` (`1..255` ký tự), `short_description` (`<= 1000` ký tự), `status` thuộc danh sách hợp lệ: `PENDING`, `DRAFT`, `NEEDS_UPDATE`, `PUBLISHED`, `FAILED`. | [`translation_schema.py`](../../MVP/backend/app/schemas/translation_schema.py#L8), [`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L116) | `PUT /api/v1/admin/translations/{id}` | Ràng buộc `CHK_POITranslation_Status` |

---

## Module 4.0: Thanh Toán Vé Số Hóa & Phiên Du Khách 24h (DFD 4.0 / UC-06)

### 4.1 Tổng Quan Phân Hệ
- **Mục đích:** Thực thi cổng tường phí Paywall, khởi tạo đơn thanh toán VietQR trong nước (PayOS hoặc dự phòng Napas247 QR) và cổng quốc tế PayPal Orders V2, bảo vệ việc đổi phiên bằng mã băm SHA-256 `creator_token`, đối soát chữ ký số Webhook PayOS HMAC-SHA256, phát hành bản ghi phiên `VisitorSession` thời hạn 24 giờ (`mã PIN CCT-XXXXXX` + bearer token), giới hạn tần suất khôi phục phiên đa thiết bị và truyền phát âm thanh thuyết minh có kiểm soát quyền.
- **Điểm vào (Entry Points):**
  - Frontend: [`ContentPaywallGate.jsx`](../../MVP/frontend/src/components/visitor/ContentPaywallGate.jsx#L8), [`CheckoutModal.jsx`](../../MVP/frontend/src/components/visitor/CheckoutModal.jsx#L72), [`CheckoutSuccessPage.jsx`](../../MVP/frontend/src/views/visitor/CheckoutSuccessPage.jsx#L1), [`RestoreSessionModal.jsx`](../../MVP/frontend/src/components/visitor/RestoreSessionModal.jsx#L68)
  - Backend: [`payment_controller.py`](../../MVP/backend/app/controllers/payment_controller.py#L29) (`/api/v1/payments`), [`session_controller.py`](../../MVP/backend/app/controllers/session_controller.py#L13) (`/api/v1/sessions`), [`audio_controller.py`](../../MVP/backend/app/controllers/audio_controller.py#L15) (`/api/v1/audio`)
- **Dữ liệu sở hữu:** `Transaction` ([`transaction.py`](../../MVP/backend/app/models/transaction.py#L19)), `VisitorSession` ([`session.py`](../../MVP/backend/app/models/session.py#L23)), `POITranslation`.

### 4.2 Quy Tắc Nghiệp Vụ & Ràng Buộc Kiểm Soát (BR & VAL)

| Mã quy tắc | Tên quy tắc & Diễn giải nghiệp vụ | Vị trí định nghĩa mã nguồn | API / Giao diện áp dụng | Đối tượng Database |
|---|---|---|---|---|
| **BR-PAY-01** | Giá vé tham quan mặc định là `AUDIO_GUIDE_SERVICE_FEE = 50000` VNĐ (tỷ giá quy đổi PayPal `PAYPAL_EXCHANGE_RATE = 25000.0`); khách chọn tiếng Việt mặc định phương thức `VIETQR`, khách nước ngoài mặc định `CARD`/`PAYPAL`. | [`config.py`](../../MVP/backend/app/core/config.py#L112), [`CheckoutModal.jsx`](../../MVP/frontend/src/components/visitor/CheckoutModal.jsx#L36) | `POST /create-checkout` | `Transaction.PayAmount`, `PaymentMethod` |
| **BR-PAY-02** | Hàm `exchange_order_session` kiểm tra mã băm `SHA256(creator_token)` khớp với trường `GatewayPayload["creator_token_hash"]` trong `Transaction` trước khi cấp mã phiên. | [`payment_service.py`](../../MVP/backend/app/services/payment_service.py#L187), [`payment_service.py`](../../MVP/backend/app/services/payment_service.py#L301) | `POST /order/{id}/session` | `Transaction.GatewayPayload` |
| **BR-PAY-03** | Webhook từ PayOS yêu cầu mã phản hồi `code == "00"`, chữ ký HMAC-SHA256 khớp với `PAYOS_CHECKSUM_KEY` (HTTP 401 nếu sai lệch), và số tiền khớp chính xác `PayAmount`. | [`payment_service.py`](../../MVP/backend/app/services/payment_service.py#L580) | `POST /api/v1/payments/webhook` | `Transaction.Status` |
| **BR-PAY-04** | Đơn hàng thanh toán thành công tạo ra một bản ghi `VisitorSession` có hạn đúng 24 tiếng (`now + 24h`) kèm mã phục hồi 6 ký tự dạng `CCT-XXXXXX`. | [`transaction_repository.py`](../../MVP/backend/app/repositories/transaction_repository.py#L107), [`session.py`](../../MVP/backend/app/models/session.py#L14) | Gọi qua `mark_as_paid` | `VisitorSession.Expire_at`, `SessionCode` |
| **BR-PAY-05** | Các endpoint giả lập thanh toán (`/simulate-success`, `/paypal-checkout`, `/paypal/confirm-mock`) trả về HTTP 404 trừ khi môi trường là `development` hoặc bật cờ `ENABLE_PAYMENT_SIMULATION=True`. | [`payment_controller.py`](../../MVP/backend/app/controllers/payment_controller.py#L75), [`config.py`](../../MVP/backend/app/core/config.py#L141) | Chế độ thanh toán Dev | Tệp `.env` |
| **BR-PAY-06** | Khôi phục phiên qua `/sessions/restore` áp dụng bộ giới hạn `SessionRestoreRateLimiter` (cửa sổ 60s: tối đa 5 lần thử/IP và 5 lần thử/mã PIN); endpoint stream audio nhận token qua query `token`, header `X-Session-Token` hoặc `Bearer` (HTTP 403 `CONTENT_LOCKED` nếu sai) và tự động phát tiếng Việt nếu ngôn ngữ đã chọn thiếu audio. | [`session_restore_rate_limit.py`](../../MVP/backend/app/core/session_restore_rate_limit.py#L9), [`audio_service.py`](../../MVP/backend/app/services/audio_service.py#L34), [`audio_repository.py`](../../MVP/backend/app/repositories/audio_repository.py#L145) | `/sessions/restore`, `/audio/{poi_id}` | `VisitorSession`, `POITranslation` |
| **VAL-PAY-01** | `payment_method` phải là `"VIETQR"`, `"CARD"` hoặc `"PAYPAL"`; định dạng mã đơn PayPal mock khớp `^TXN_[0-9A-F]{12}$`; mã `session_code` dài từ 3..36 ký tự được tự động chuẩn hoá về tiền tố `CCT-...`. | [`payment_schema.py`](../../MVP/backend/app/schemas/payment_schema.py#L12), [`payment_controller.py`](../../MVP/backend/app/controllers/payment_controller.py#L30), [`session_schema.py`](../../MVP/backend/app/schemas/session_schema.py#L15) | Các API thanh toán & khôi phục | `Transaction`, `VisitorSession` |

---

## Module 5.0: Bản Đồ Tương Tác, GPS Geofencing & Dẫn Đường OSRM (DFD 5.0 / UC-01)

### 5.1 Tổng Quan Phân Hệ
- **Mục đích:** Cung cấp bản đồ tương tác ngoài trời tối ưu cho di động trên nền OpenStreetMap/Leaflet, theo dõi GPS trực tiếp qua Geolocation API của trình duyệt, tính toán bán kính kích hoạt Haversine theo từng điểm POI (`10m–50m`, mặc định `30m`) kèm khoá thời gian chờ (cooldown) 10 phút (`600s`) trong `localStorage` để chống phát lặp âm thanh, tự động phát thuyết minh trong `AudioPlayerContext`, tính toán đường đi bộ qua OSRM Foot Routing (với cơ chế đường thẳng trực tiếp khi `<= 35m` và nối đường mòn khi `> 20m`), phục vụ ảnh bìa di tích và cung cấp trang Kiosk mã QR lối vào (`/qr`).
- **Điểm vào (Entry Points):**
  - Frontend: [`VisitorTourPage.jsx`](../../MVP/frontend/src/views/visitor/VisitorTourPage.jsx#L70) (`/`, `/visitor`, `/tour`), [`QRCodePage.jsx`](../../MVP/frontend/src/views/QRCodePage.jsx#L29) (`/qr`)
  - Backend: [`tour_controller.py`](../../MVP/backend/app/controllers/tour_controller.py#L12) (`/api/v1/tour/route`), [`media_controller.py`](../../MVP/backend/app/controllers/media_controller.py#L15) (`/api/v1/media/poi-images/{filename}`), [`system_controller.py`](../../MVP/backend/app/controllers/system_controller.py#L71) (`/api/v1/system/public-config`)
- **Dữ liệu sở hữu:** Đọc `POI`, `POITranslation`, `LanguageCode`, `VisitorSession`; lưu vết cooldown ở `localStorage` của Client.

### 5.2 Quy Tắc Nghiệp Vụ & Ràng Buộc Kiểm Soát (BR & VAL)

| Mã quy tắc | Tên quy tắc & Diễn giải nghiệp vụ | Vị trí định nghĩa mã nguồn | API / Giao diện áp dụng | Nơi lưu trữ |
|---|---|---|---|---|
| **BR-MAP-01** | Bán kính kích hoạt Geofence tính bằng công thức khoảng cách mặt cầu Haversine (`EARTH_RADIUS_METERS = 6371000`) so với bán kính từng POI (`10m–50m`, mặc định `30m`). | [`useGeofenceTrigger.js`](../../MVP/frontend/src/hooks/useGeofenceTrigger.js#L13), [`haversine.js`](../../MVP/frontend/src/utils/haversine.js#L8) | `VisitorTourPage.jsx` | State của Client |
| **BR-MAP-02** | Điểm POI sau khi kích hoạt sẽ bước vào thời gian chờ 10 phút (`DEFAULT_COOLDOWN_DURATION_MS = 600 * 1000`) lưu trong `localStorage` (`poi_cooldown_*`) để không kích hoạt pop-up liên tục khi khách đứng yên tại chỗ. | [`cooldownService.js`](../../MVP/frontend/src/services/cooldownService.js#L8) | `useGeofenceTrigger.js` | `localStorage` |
| **BR-MAP-03** | Dẫn đường đi bộ bỏ qua OSRM và vẽ đường thẳng trực tiếp 2 điểm nếu khoảng cách `<= 35.0m`; nếu lớn hơn sẽ gọi OSRM foot routing (`OSRM_TIMEOUT_SECONDS = 0.8s`), tính thời gian đi bộ theo vận tốc `72.0` m/phút (`~1.2 m/s`) và tự động dự phòng về đường thẳng Haversine nếu mạng lỗi. | [`wayfinding_service.py`](../../MVP/backend/app/services/wayfinding_service.py#L34), [`wayfinding_service.py`](../../MVP/backend/app/services/wayfinding_service.py#L106) | `GET /api/v1/tour/route` | Toạ độ của `POI` |
| **BR-MAP-04** | Hàm `resolve_base_url()` kiểm tra tệp `.env` trên ổ đĩa (`BASE_URL`, tiếp theo là `CLOUDFLARE_TUNNEL_URL`) trước khi dự phòng về cấu hình runtime hoặc tuyến `/visitor`. | [`config.py`](../../MVP/backend/app/core/config.py#L207), [`system_controller.py`](../../MVP/backend/app/controllers/system_controller.py#L80) | `GET /api/v1/system/public-config` | Tệp `.env` |
| **VAL-MAP-01** | `origin_lat`, `origin_lng`, và `destination_poi_id` là các tham số query bắt buộc (`RATE_LIMIT_WALKING_ROUTE = "10/phút"`); kết quả trả về là một `GeoJsonRouteFeature` chuẩn RFC 7946 (`LineString`). | [`tour_controller.py`](../../MVP/backend/app/controllers/tour_controller.py#L21), [`tour_schema.py`](../../MVP/backend/app/schemas/tour_schema.py#L47) | `GET /api/v1/tour/route` | Bảng `POI` |

---

## Module 6.0: Dữ Liệu Đo Đạc, Bản Đồ Nhiệt Mật Độ & Sức Khoẻ Hạ Tầng (DFD 6.0 / UC-05)

### 6.1 Tổng Quan Phân Hệ
- **Mục đích:** Ghi nhận sự kiện kích hoạt tiệm cận POI ẩn danh (`POITrigger`), tổng hợp các chỉ số KPI vận hành (tổng lượt khách, tổng lượt nghe, Top 10 di tích thu hút nhất, thời gian tham quan trung bình, cơ cấu ngôn ngữ), chuẩn hoá cường độ nhiệt (`0.0–1.0`) cho lớp bản đồ `leaflet.heat`, xuất dữ liệu báo cáo dạng CSV (có UTF-8 BOM cho Excel tiếng Việt) và JSON, giám sát dung lượng đĩa chứa tệp media so với hạn mức `1 GB` với các mốc cảnh báo `85% / 95%`, đồng thời dọn dẹp các tệp MP3 mồ côi kèm ghi nhật ký audit `ADMIN_STORAGE_CLEANED`.
- **Điểm vào (Entry Points):**
  - Frontend: [`AnalyticsDashboard.jsx`](../../MVP/frontend/src/views/admin/AnalyticsDashboard.jsx#L52) (`/admin`, `/admin/analytics`), [`SystemHealthPage.jsx`](../../MVP/frontend/src/views/admin/SystemHealthPage.jsx#L7) (`/admin/health`), [`StorageHealthBanner.jsx`](../../MVP/frontend/src/components/admin/StorageHealthBanner.jsx#L16)
  - Backend: [`telemetry_controller.py`](../../MVP/backend/app/controllers/telemetry_controller.py#L13) (`/api/v1/telemetry`), [`analytics_controller.py`](../../MVP/backend/app/controllers/analytics_controller.py#L27) (`/api/v1/admin/analytics`), [`system_controller.py`](../../MVP/backend/app/controllers/system_controller.py#L30) (`/api/v1/admin`), [`main.py`](../../MVP/backend/app/main.py#L181) (`/health`)
- **Dữ liệu sở hữu:** `POITrigger` ([`trigger.py`](../../MVP/backend/app/models/trigger.py#L11)), `Audit`, thư mục media cục bộ (`static/audio`, `static/images`).

### 6.2 Quy Tắc Nghiệp Vụ & Ràng Buộc Kiểm Soát (BR & VAL)

| Mã quy tắc | Tên quy tắc & Diễn giải nghiệp vụ | Vị trí định nghĩa mã nguồn | API / Giao diện áp dụng | Nơi lưu trữ / Đối tượng |
|---|---|---|---|---|
| **BR-TEL-01** | Ping tiệm cận (`POST /telemetry/trigger`, `20/phút`) tự động tạo một phiên khách ẩn danh `VisitorSession` nếu tham số `session_id` bị bỏ qua, đảm bảo thu thập đo đạc không xâm phạm quyền riêng tư. | [`telemetry_service.py`](../../MVP/backend/app/services/telemetry_service.py#L70), [`telemetry_repository.py`](../../MVP/backend/app/repositories/telemetry_repository.py#L26) | `POST /api/v1/telemetry/trigger` | `POITrigger`, `VisitorSession` |
| **BR-TEL-02** | Bản đồ nhiệt chuẩn hoá cường độ qua công thức `round(count / max_trigger_count, 3)`; `AnalyticsHeatmap.jsx` phân chia 4 mức dải màu: `0` -> Xám (Không có khách), `< 0.4` -> Xanh lục (Thưa), `0.4–0.7` -> Vàng (Vừa), `>= 0.7` -> Đỏ (Đông đúc). | [`telemetry_service.py`](../../MVP/backend/app/services/telemetry_service.py#L173), [`AnalyticsHeatmap.jsx`](../../MVP/frontend/src/components/admin/AnalyticsHeatmap.jsx#L38) | `GET /admin/analytics/heatmap` | `POITrigger`, `POI` |
| **BR-TEL-03** | Tệp xuất CSV được chèn thêm ký tự UTF-8 BOM (`\xef\xbb\xbf`) ở đầu và mở header `Content-Disposition` qua CORS để Microsoft Excel hiển thị đúng tiếng Việt có dấu mà không bị lỗi font. | [`export_service.py`](../../MVP/backend/app/services/export_service.py#L92), [`analytics_controller.py`](../../MVP/backend/app/controllers/analytics_controller.py#L125) | `GET /admin/analytics/export` | Bảng `POITrigger` |
| **BR-SYS-01** | Ngưỡng giám sát bộ nhớ so sánh tổng dung lượng `audio + ảnh` với định mức `STORAGE_QUOTA_BYTES = 1 GB`: đạt `>= 85%` kích hoạt mức `WARNING` (Cảnh báo vàng), đạt `>= 95%` kích hoạt mức `CRITICAL` (Báo động đỏ). | [`storage_service.py`](../../MVP/backend/app/services/storage_service.py#L24), [`config.py`](../../MVP/backend/app/core/config.py#L93), [`StorageHealthBanner.jsx`](../../MVP/frontend/src/components/admin/StorageHealthBanner.jsx#L4) | `GET /admin/system/health` | Bộ nhớ đĩa / Supabase |
| **BR-SYS-02** | Tiến trình dọn rác tệp mồ côi (`giới hạn 1 lần/5 phút`) quét và xoá bỏ các file audio cục bộ không còn được liên kết trong hàm `AudioRepository.get_all_audio_urls()`, sau đó ghi bản ghi `ADMIN_STORAGE_CLEANED` vào `Audit`. | [`storage_service.py`](../../MVP/backend/app/services/storage_service.py#L178), [`system_controller.py`](../../MVP/backend/app/controllers/system_controller.py#L54) | `POST /admin/storage/clean-orphans` | `POITranslation`, `Audit` |
| **VAL-TEL-01** | `dwell_time >= 0`, `preferred_language` từ `2..20` ký tự; tham số khoảng thời gian `range` phải là `TODAY`, `LAST_7_DAYS` hoặc `LAST_30_DAYS`; định dạng xuất `format` khớp `^(csv|json)$`. | [`telemetry_schema.py`](../../MVP/backend/app/schemas/telemetry_schema.py#L19), [`analytics_schema.py`](../../MVP/backend/app/schemas/analytics_schema.py#L9), [`analytics_controller.py`](../../MVP/backend/app/controllers/analytics_controller.py#L88) | Các API Telemetry & Analytics | Bảng `POITrigger` |

---

## Hạ Tầng Cốt Lõi Dùng Chung (Core & Shared Infrastructure)

### Các Tệp Dùng Chung Đang Hoạt Động
- **Điểm vào Frontend & Định tuyến:** [`main.jsx`](../../MVP/frontend/src/main.jsx#L1), [`App.jsx`](../../MVP/frontend/src/App.jsx#L19) (`VISITOR_ROUTES`, `ADMIN_ROUTES`), [`NotFoundPage.jsx`](../../MVP/frontend/src/views/NotFoundPage.jsx#L3).
- **Vận chuyển HTTP Client:** [`apiClient.js`](../../MVP/frontend/src/api/apiClient.js#L12) (`ApiError`, `buildRequestUrl`, `requestJson`, `requestBlob`, `requestFormData`).
- **Điểm vào Backend & Vòng đời Lifespan:** [`main.py`](../../MVP/backend/app/main.py#L78) (`lifespan`, `create_app`, `DEFAULT_CORS_ORIGINS`, bảo vệ thư mục ảnh tĩnh, `/health`, chuyển tiếp SPA fallback).
- **Mô-đun Cốt lõi Backend:** [`config.py`](../../MVP/backend/app/core/config.py#L38), [`database.py`](../../MVP/backend/app/core/database.py#L21), [`dependencies.py`](../../MVP/backend/app/core/dependencies.py#L34), [`exceptions.py`](../../MVP/backend/app/core/exceptions.py#L21), [`limiter.py`](../../MVP/backend/app/core/limiter.py#L27).
- **Database & Khởi tạo Môi trường:** [`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L1), [`docker-compose.yml`](../../MVP/docker-compose.yml#L1), [`Dockerfile.app`](../../MVP/Dockerfile.app#L1), [`Dockerfile.mysql`](../../MVP/Dockerfile.mysql#L1), [`.env.example`](../../MVP/backend/.env.example#L1).

### Vị Trí Sửa Nhanh Phần Core (Quick-Fix Spots)
- **Thêm một route trang mới trên Frontend:** Chỉnh sửa [`App.jsx#L19`](../../MVP/frontend/src/App.jsx#L19) (`VISITOR_ROUTES` / `ADMIN_ROUTES` & `<Routes>`) và khai báo link trên thanh điều hướng [`AdminNavbar.jsx#L9`](../../MVP/frontend/src/components/admin/AdminNavbar.jsx#L9).
- **Đăng ký router FastAPI mới hoặc đổi cấu hình CORS:** Chỉnh sửa [`main.py#L41`](../../MVP/backend/app/main.py#L41) và [`main.py#L166`](../../MVP/backend/app/main.py#L166).
- **Đổi định dạng vỏ bọc lỗi chuẩn:** Chỉnh sửa [`exceptions.py#L37`](../../MVP/backend/app/core/exceptions.py#L37) (`build_error_envelope`) và [`apiClient.js#L47`](../../MVP/frontend/src/api/apiClient.js#L47) (`buildErrorFromResponse`).
- **Tinh chỉnh hạn mức Rate Limit:** Chỉnh sửa [`config.py#L74`](../../MVP/backend/app/core/config.py#L74) và [`limiter.py#L44`](../../MVP/backend/app/core/limiter.py#L44).

---

## Danh Mục Kiểm Tra Bảo Trì & Thẩm Định (Maintenance Checklist)

1. **Khi thêm mới hoặc thay đổi một trường dữ liệu (Field)**
   - [ ] Cập nhật tệp DDL [`mysql_schema.sql`](../../MVP/backend/scripts/mysql_schema.sql#L1) và tạo lệnh di chuyển `ALTER TABLE` tương ứng nếu cần.
   - [ ] Cập nhật model SQLAlchemy trong thư mục [`models/`](../../MVP/backend/app/models) và câu lệnh query trong [`repositories/`](../../MVP/backend/app/repositories).
   - [ ] Cập nhật Pydantic request/response schema trong thư mục [`schemas/`](../../MVP/backend/app/schemas).
   - [ ] Cập nhật hàm mapper/builder phản hồi trong [`services/`](../../MVP/backend/app/services) (ví dụ: `_to_map_item`, `_build_poi_response`, `_build_response`).
   - [ ] Cập nhật wrapper API trong [`api/`](../../MVP/frontend/src/api) và component hiển thị trên UI cùng các rào chắn độ dài ký tự (`maxLength`).
   - [ ] Cập nhật test case tương ứng trong `MVP/backend/tests/unit/` và Vitest trong `MVP/frontend/src/**/__tests__/`.

2. **Thực thi phân tầng kiến trúc 3 lớp (Chuẩn SISE)**
   - [ ] Giữ toàn bộ việc bóc tách HTTP và mã trạng thái (status code) trong `controllers/` và `services/`; tuyệt đối không import trực tiếp `repositories/` hoặc `models/` trong `controllers/`.
   - [ ] Giữ `repositories/` hoàn toàn tập trung vào việc đọc/ghi cơ sở dữ liệu SQLAlchemy.
   - [ ] Luôn ném lỗi [`ApiError`](../../MVP/backend/app/core/exceptions.py#L21) để phản hồi thất bại tuân thủ đúng định dạng JSON `{ "success": false, "error": { "code", "message", "details" } }`.

3. **Lệnh thẩm định trước khi Commit (Pre-Commit Verification)**
   - [ ] Kiểm tra định dạng & Lint Backend:  
     `cd MVP/backend && ruff check . && black --check --workers 1 .`
   - [ ] Chạy bộ kiểm thử tự động Backend:  
     `cd MVP/backend && pytest`
   - [ ] Chạy bộ kiểm thử tự động Frontend:  
     `cd MVP/frontend && npm test`
