# SYSTEM DEVELOPMENT GUIDELINES (DEVELOPER RULES & GUIDELINES)
### Project: Smart Multilingual Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site
*Mandatory engineering standards for Frontend, Backend, Database, and AI Pipeline development teams.*

---

## 1. CORE PRINCIPLES & SYSTEM ARCHITECTURE MODEL

### 1.1. Strict 2-Actor Model
The system is designed and operated around **strictly two actors**. Developers must never introduce intermediary roles such as `Curator`, `Staff`, or `Operations Manager`:
1. **Visitor (Museum Visitor):**
   - No account creation or password authentication required (Zero-friction access).
   - Direct access via mobile browsers (PWA/Web App) by scanning QR codes at the entrance or exhibits.
   - Identified by a 24-hour `session_code` (formatted as `CCT-XXXXXX`) activated upon service unlock payment.
2. **Admin (System Administrator):**
   - Supports multiple independent administrator accounts in the `User` table. **No `role` column is used** (all internal accounts in the system are Administrators; omitting the role column avoids over-engineering).
   - Authenticated via username/email and cryptographic password hashes (`password_hash`).
   - Manages all system operations: POIs, GPS coordinates, multilingual translations, AI/TTS audio generation, storage thresholds, and system health.

### 1.2. Physical Environment: Outdoor Unified Complex
- The Cu Chi Tunnels historical site is an expansive outdoor environment with **no concept of floors (`floor`)**, and all complex area partitioning (`Area_zone`) has been **completely eliminated**.
- All Points of Interest (POIs) reside on a single, unified flat geographic coordinate system (WGS84: `latitude`, `longitude`) with individual dynamic activation radiuses (`trigger_radius`) configured between $10\text{m}$ and $50\text{m}$ (default $30\text{m}$).

### 1.3. Engineering Principles
- **KISS (Keep It Simple, Stupid):** Prioritize straightforward, robust solutions; avoid over-abstraction and unnecessary layers.
- **Separation of Concerns (SoC):** Strictly decouple UI rendering (Frontend Presentation), business logic (Services), database persistence (Repositories), and storage (Database).
- **Graceful Degradation:** When outdoor cellular reception (3G/4G) is weak or GPS signals fluctuate, the system must automatically fall back to cached data or browser Web Speech API, preventing screen freezes or broken layouts.

### 1.4. System-Wide Naming Conventions & Contextual Clarity

To ensure the codebase is **readable, self-explanatory, and contextually clear at a glance** without needing to inspect file implementations, all project artifacts must adhere strictly to the following conventions:

#### 1. Directory & Folder Naming
- **All Lowercase:**
  - **Backend (Python package standards):** Use `snake_case` (e.g., `app/controllers`, `app/services`, `app/repositories`, `app/models`, `app/schemas`, `app/integrations`).
  - **Frontend (Web standards):** Use lowercase plural nouns or `kebab-case` (e.g., `components/common`, `components/visitor`, `components/admin`, `contexts`, `hooks`, `views`, `utils`).
- **Contextual Domain Separation:** Directories must clearly designate business domains or actor boundaries (e.g., `components/visitor` houses visitor UI, `components/admin` houses admin UI).

#### 2. File & Module Naming
| Layer / Platform | Naming Convention | Pattern Syntax | Standard Examples |
|---|---|---|---|
| **React Component / View** | `PascalCase.jsx` | `<ComponentName><Role>.jsx` | `VisitorMapView.jsx`, `MiniAudioPlayer.jsx`, `POICardPreview.jsx`, `LanguageSelectorModal.jsx` |
| **React Custom Hook** | `camelCase.js` | `use<Action/Context>.js` | `useGeolocation.js`, `useAudioSync.js`, `useDebounce.js`, `useVisitorSession.js` |
| **React Context** | `PascalCase.jsx` | `<ContextName>Context.jsx` | `LanguageContext.jsx`, `AudioPlayerContext.jsx`, `VisitorSessionContext.jsx` |
| **Frontend API Client** | `camelCase.js` | `<domain>Api.js` | `poiApi.js`, `audioApi.js`, `authApi.js`, `paymentApi.js` |
| **Frontend Utility** | `camelCase.js` | `<feature>.js` | `haversine.js`, `formatters.js`, `storage.js` |
| **Backend Controller** | `snake_case.py` | `<domain>_controller.py` | `poi_controller.py`, `auth_controller.py`, `payment_controller.py`, `admin_storage_controller.py` |
| **Backend Service** | `snake_case.py` | `<domain>_service.py` | `poi_service.py`, `audio_service.py`, `translation_service.py`, `session_service.py` |
| **Backend Repository** | `snake_case.py` | `<domain>_repository.py` | `poi_repository.py`, `audit_repository.py`, `transaction_repository.py` |
| **Backend Model (ORM)** | `snake_case.py` | `<domain>.py` | `poi.py`, `user.py`, `visitor_session.py`, `transaction.py` |
| **Backend Schema** | `snake_case.py` | `<domain>_schema.py` | `poi_schema.py`, `auth_schema.py`, `audio_schema.py`, `payment_schema.py` |
| **Backend Unit Test** | `snake_case.py` | `test_<module_name>.py` | `test_poi_service.py`, `test_audio_service.py`, `test_poi_repository.py`, `test_poi_controller.py` |
| **Frontend Component Test** | `PascalCase.test.jsx` | `<ComponentName>.test.jsx` | `MiniAudioPlayer.test.jsx`, `VisitorMapView.test.jsx`, `POICardPreview.test.jsx` |
| **Frontend Hook / Util Test** | `camelCase.test.js` | `<hook/util>.test.js` | `useGeolocation.test.js`, `useAudioSync.test.js`, `haversine.test.js` |

#### 3. Class, Schema & Type Naming
- **Classes & ORM Models (Python):** Use `PascalCase` entity nouns: `User`, `POI`, `POITranslation`, `POIAudio`, `VisitorSession`, `Transaction`.
- **Service & Repository Classes:** Use `PascalCase` with explicit layer suffixes: `POIService`, `POIRepository`, `AudioService`, `AuditRepository`.
- **Pydantic Schemas (Request / Response / DTO):** Must include clear directional suffixes:
  - Client incoming payload: `*Request` (e.g., `POICreateRequest`, `POIUpdateRequest`, `AdminLoginRequest`).
  - Backend outgoing payload: `*Response` (e.g., `POIResponse`, `POISummaryResponse`, `AudioPlaybackResponse`).
  - Internal data transfer object: `*DTO` (e.g., `AudioMetadataDTO`, `GeofenceTriggerDTO`).

#### 4. Variable & Function Naming Conventions
- **Backend (Python - `snake_case`):**
  - **Functions:** Must be **Verb + Noun** describing specific actions:
    - Queries: `get_poi_by_id()`, `list_active_pois()`, `find_session_by_code()`.
    - Mutations: `create_new_poi()`, `update_translation_status()`, `deactivate_poi()`.
    - Calculations: `calculate_haversine_distance()`, `synthesize_tts_speech()`.
  - **Variables:** Must be descriptive (e.g., `current_visitor_location`, `remaining_lockout_seconds`, `audio_file_path`).
  - **Boolean Variables:** Must use state prefixes `is_`, `has_`, `can_`, `should_`:
    - `is_active`, `is_published`, `has_session_expired`, `can_trigger_audio`.
- **Frontend (JavaScript / React - `camelCase`):**
  - **Functions:** `fetchActivePOIs()`, `formatRemainingTime()`, `validateGeofenceRadius()`.
  - **Event Handlers:** Must start with prefix `handle` + Action name:
    - `handlePlayAudio()`, `handleSelectPOI()`, `handleLanguageChange()`, `handleRestoreSession()`.
  - **Callback Props:** Must start with prefix `on` + Event name:
    - `<MapComponent onLocationUpdate={...} onMarkerClick={...} />`.
  - **Boolean States / Props:** Must start with `is`, `has`, `should`:
    - `isPlaying`, `isLoading`, `hasGeoPermission`, `isModalOpen`.
- **Constants & Enums:** Must use uppercase with underscores (`UPPER_SNAKE_CASE`):
  - Constants: `MAX_FAILED_LOGIN_ATTEMPTS = 5`, `LOCKOUT_DURATION_SECONDS = 900`, `STREAM_TIMEOUT_MS = 3500`.
  - Enum Values: `'PENDING'`, `'DRAFT'`, `'NEEDS_UPDATE'`, `'PUBLISHED'`, `'FAILED'`, `'READY'`.

#### 5. Top-of-File & Top-of-Scope Variable Declaration Rule
To keep code orderly and configurable, variables must follow a strict top-down structure:

1. **Top-of-File Constants & Configs:**
   - All module-level constants (`CONSTANTS`), default configurations (`DEFAULT_CONFIG`), regex patterns, base URLs, enums, and thresholds (`THRESHOLDS`, `COOLDOWN_SECONDS`, `MAX_FAILED_ATTEMPTS`) **must be declared at the TOP OF THE FILE**, immediately following the `import` statements.
   - ❌ **STRICTLY BANNED:** Scattering constants between functions, placing configuration values at the bottom of the file, or hardcoding magic numbers inside function bodies.
   - **Standard File Ordering:**
     1. `import` block (grouped: standard library $\rightarrow$ third-party packages $\rightarrow$ internal modules).
     2. **Module-level Constants & Variables** (Constants, Default Configs, Enums, Regex).
     3. **Type Definitions / Schemas / Interfaces** (if applicable).
     4. **Primary Functions / Components / Classes**.
     5. **Export Statements** (for JavaScript/TypeScript).

2. **Top-of-Scope Rule (Functions & Components):**
   - **Inside React Components:** All hooks (`useState`, `useRef`, `useContext`), custom hooks, and preliminary computed variables **must reside at the very top of the component body**, preceding event handlers (`handle*`), `useEffect` hooks, and JSX `return` statements.
   - **Inside Python Functions:** Default initialization flags and shared local variables must be declared at the top of the function body rather than scattered inside deeply nested `if/else` or `try/except` blocks.

#### 6. Strictly Banned Anti-Patterns
1. ❌ **BANNED: 1-character or lazy abbreviations:**
   - Prohibited: `a`, `b`, `x`, `p`, `temp`, `data`, `res`, `item`, `val`, `obj`.
   - *Sole Exceptions:* Short loop counters (`i`, `j`) and standard geographic coordinates (`lat`, `lng`).
2. ❌ **BANNED: Generic, vague function names:**
   - Prohibited: `process()`, `handle()`, `doSomething()`, `run()`, `execute()`, `getData()`.
   - *Required Alternatives:* `process_tts_generation()`, `handleAudioPlaybackError()`, `fetchPOIDetails()`.
3. ❌ **BANNED: Catch-all junk files:**
   - Prohibited: creating generic dumping files such as `helper.py`, `utils.py`, `manager.py`, `common.js`. Code must be separated by domain: `geo_utils.py`, `crypto_utils.py`, `time_formatter.js`.
4. ❌ **BANNED: Ad-hoc variable declarations in the middle of files:**
   - Prohibited: defining configuration constants adrift between functions or at the bottom of files. All module constants must be hoisted to the top directly below imports.

### 1.5. Git Branch Naming & Commit Message Conventions

To ensure smooth CI integration, clear traceability to User Stories, and prevent file path length limitations on Windows systems, all developers and AI Agents must adhere strictly to the following Git standards:

#### 1. Branch Naming Standard

All feature branches must follow the standard hierarchical pattern:
$$\text{<type>/<story-id>-<short-description>}$$

* **Valid Types (`<type>`):**
  * `feat/`: New feature implementation (e.g. `feat/us-01.3-audio-geofence`, `feat/us-02.1-admin-login`).
  * `fix/`: Bug fix or patch (e.g. `fix/us-01.3-audio-timeout-fallback`, `fix/login-lockout-timer`).
  * `test/`: Adding or updating test suites without business code change (e.g. `test/us-01.3-audio-context`).
  * `refactor/`: Code refactoring without changing functionality (e.g. `refactor/frontend-singleton-audio`).
  * `chore/`: Tooling, CI/CD, dependencies, or repository maintenance (e.g. `chore/ci-workflow-node20`).
  * `docs/`: Documentation updates only (e.g. `docs/dev-rules-update`).
* **Story Identifier (`<story-id>`):** Must reference the exact Agile User Story (e.g., `us-01.3`, `us-02.1`, `us-03.2`).
* **Description (`<short-description>`):** 2 to 4 lowercase hyphen-separated words describing the core scope.
* ❌ **STRICTLY BANNED:** Using full file paths as branch names (e.g., `feat/mvp/frontend/src/hooks/useGeofenceTrigger.js`). Long path names exceed the Windows 260-character path limit, break Git terminal ergonomics, and fail to convey the overall User Story domain.
* ❌ **STRICTLY BANNED:** Generic or uninformative branch names (e.g., `update`, `patch`, `test1`, `my-branch`).

#### 2. Commit Message Standard (Conventional Commits)
All commit messages must follow the Conventional Commits format:
$$\text{<type>(<scope>): <short imperative description>}$$

* **Format Examples:**
  * `feat(us-01.3): implement geofence trigger and floating mini audio player`
  * `fix(us-01.3): resolve cooldown debounce edge case on component unmount`
  * `test(us-01.3): add vitest suites for audio context 3.5s web speech fallback`
  * `refactor(audio): clean up unused variables in audio player context`
  * `chore(ci): enable strict eslint and frontend domain rules gate`
* **Rules:** The description must be in the imperative mood ("add", "implement", "fix", not "added", "fixing"), concise (< 72 characters), and without a trailing period.

---

## 2. FRONTEND DEVELOPMENT STANDARDS (REACT / VITE / LEAFLET)

### 2.1. 3-Tier Layered Frontend Architecture (`MVP/frontend/src/`)
The frontend strictly adheres to a unidirectional 3-tier layering model:
$$\text{[Tier 1 - Presentation: views/components]} \longrightarrow \text{[Tier 2 - Logic/State: hooks/contexts]} \longrightarrow \text{[Tier 3 - API Client: api/]}$$

```text
src/
├── api/            # [Tier 3 - API Client]: Axios/Fetch HTTP calls, endpoints, and interceptors
├── components/     # [Tier 1 - Presentation]: Reusable visual UI components (Button, Modal, Toast, Drawer, Slider)
│   ├── common/     # Shared generic components
│   ├── visitor/    # Player bar, POI Card preview, Language Selector, Route Panel
│   └── admin/      # Coordinate Picker Map, Translation Editor, Health Meter
├── contexts/       # [Tier 2 - State Management]: React Contexts (LanguageContext, AudioPlayerContext, VisitorSessionContext)
├── hooks/          # [Tier 2 - Business Logic]: Custom hooks (useGeolocation, useAudioSync, useDebounce, useIdleTimer)
├── views/          # [Tier 1 - Presentation]: Primary screen views (VisitorMapView, ExhibitDetailView, AdminDashboardView)
└── utils/          # Pure helper utilities (haversine.js, formatters.js, storage.js)
```

> [!IMPORTANT]
> **Strict Presentation Layer Rule:**
> Files in Tier 1 (`views/`, `components/`) **must NEVER directly call `axios`, `fetch`, or direct Backend endpoint URLs**.
> All network communication and data fetching must pass through Tier 3 (`api/`) or through Tier 2 custom hooks/contexts.

### 2.2. React Performance Guidelines (Vercel React Best Practices)
- **Eliminate Request Waterfalls:** Fetch initial data in parallel via `Promise.all()` or query caching when loading the map view (e.g., load site config, POIs, and session status concurrently).
- **Optimize Map Re-renders:**
  - Do not inject rapidly changing visitor GPS coordinates into global root contexts that trigger full-tree re-renders.
  - Use local component state or Leaflet layer refs (`mapRef`, `markerRef.setLatLng()`) to update the visitor marker smoothly without redrawing the map canvas.
- **Lazy Loading & Dynamic Imports:** Separate the Admin Portal bundle from the Visitor Web App bundle to ensure minimal initial load times (FCP < 1.2s on mobile networks).

### 2.3. Interactive Leaflet Map & Continuous GPS Tracking
- **Map Initialization:**
  - Boundary constraint: `maxBounds` enclosing the Cu Chi site perimeter, preventing visitors from panning outside the grounds.
  - Zoom configuration: `minZoom: 15`, `maxZoom: 19`, `zoomControl: false` (use custom mobile floating zoom controls).
- **Continuous Footstep Tracking Algorithm (watchPosition & clearWatch):**
  Visitors walk continuously outdoors. Therefore, **using `getCurrentPosition` (single check) is strictly prohibited**. Developers must use `watchPosition` and cleanly release it via `clearWatch` on unmount:
  ```javascript
  const DEFAULT_COORDS = { lat: 11.1432, lng: 106.4631 }; // Cu Chi Tunnels Main Entrance

  export function startVisitorTracking(onLocationUpdate, onFallback) {
    if (!navigator.geolocation) {
      onFallback(DEFAULT_COORDS, "Browser does not support geolocation.");
      return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onLocationUpdate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        console.warn("GPS signal lost or permission denied:", err);
        onFallback(DEFAULT_COORDS, "Unable to retrieve GPS. Displaying from Main Entrance.");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000
      }
    );

    // Mandatory cleanup return to invoke clearWatch when unmounted
    return () => navigator.geolocation.clearWatch(watchId);
  }
  ```
- **Dynamic Geofence Radius & 10-Minute Cooldown Anti-Spam:**
  - Radius field name is standardized as `trigger_radius` (between $10\text{m}$ and $50\text{m}$, default $30\text{m}$).
  - Compute Haversine distance between the visitor coordinates and each active POI (`is_active = TRUE`).
  - When distance $\le$ `poi.trigger_radius`:
    - Check `localStorage.getItem(`poi_cooldown_${poi.id}`)`.
    - If the last trigger timestamp is within 600 seconds (10 minutes): **Skip auto-playback**, preventing audio spam while visitors linger at an exhibit.
    - If cooldown has elapsed: Trigger the proximity prompt/audio and record the new cooldown timestamp.

### 2.4. Audio Player Singleton & Weak Network Fallback
- **Singleton AudioInstance in `AudioPlayerContext`:**
  - Strictly prohibit instantiating arbitrary `new Audio(audioUrl)` in components to avoid overlapping voices.
  - The entire application shares a single `audioInstance` singleton managed by `AudioPlayerContext`.
- **3.5s Stream Timeout & Seamless Web Speech API Fallback:**
  - Under dense jungle foliage at Cu Chi, cellular connections can stall audio streaming without firing `.catch()` immediately.
  - Maintain a 3.5-second timer (`setTimeout` 3500ms). If playback has not started within 3.5s (`readyState < 2` or not playing), abort the stream and switch seamlessly to the browser's `Web Speech API` using the target language's BCP-47 code:
  ```javascript
  export function playAudioWithTimeoutFallback(audioInstance, audioUrl, fallbackText, bcp47Code) {
    let isStreamingStarted = false;
    audioInstance.pause();
    audioInstance.src = audioUrl;

    const timeoutId = setTimeout(() => {
      if (!isStreamingStarted) {
        console.warn("Audio stream timed out after 3.5s. Falling back to Web Speech API.");
        audioInstance.removeAttribute("src");
        audioInstance.load();
        triggerWebSpeechFallback(fallbackText, bcp47Code);
      }
    }, 3500);

    audioInstance.onplaying = () => {
      isStreamingStarted = true;
      clearTimeout(timeoutId);
    };

    audioInstance.play().catch((err) => {
      clearTimeout(timeoutId);
      if (!isStreamingStarted) {
        console.warn("Audio playback failed. Triggering Web Speech API:", err);
        triggerWebSpeechFallback(fallbackText, bcp47Code);
      }
    });
  }

  function triggerWebSpeechFallback(text, bcp47Code) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = bcp47Code; // e.g., 'vi-VN', 'en-US', 'zh-CN', 'ja-JP'
      window.speechSynthesis.speak(utterance);
    } else {
      showToast("Unable to play narration. Please check your connection.");
    }
  }
  ```
- **Floating Mini Player:**
  - Fixed height $64\text{px}$, pinned above mobile safe areas.
  - Required controls: Play/Pause, Skip backward `-10s`, Skip forward `+10s`, Speed toggle (`0.8x`, `1.0x`, `1.2x`), and interactive seek scrubber.

### 2.5. Zero-Reload Multilingual Switching (i18n)
- Manage active language state via `LanguageContext`.
- Strictly prohibit `window.location.reload()`. Language changes must update via React state to instantly re-render POI card text and audio URLs.
- **Dynamic Language Filter:** Language dropdown only displays languages that are active and have published content (`is_active = TRUE`, `status = 'PUBLISHED'`).

### 2.6. Outdoor Accessibility & Touch Standards
- **Touch Targets:** All buttons, icons, and toggles must meet a minimum size of $44\text{px} \times 44\text{px}$ with ≥ $8\text{px}$ padding.
- **Mobile Typography:** Body font size ≥ $16\text{px}$, line-height $1.5$ for high outdoor sunlight readability.
- **Color Contrast:**
  - Primary background: `#FFFFFF` / `#F8FAFC`.
  - Cards/Surfaces: `#F1F5F9`, border `1px solid #E2E8F0`.
  - Text primary: `#0F172A` (WCAG AAA contrast compliant).
  - Primary accent: `#1E293B` or `#1D4ED8`.
### 2.7. Mandatory Route & Shell Registration Rule (Hierarchical Page & Route Tree)

To ensure all frontend developments are immediately accessible, testable on localhost, and integrated into the user flow without leaving orphaned code, all developers and AI Agents must strictly adhere to the central page tree and registration protocol:

#### 1. Hierarchical Page & Route Tree Structure

The entire frontend routing system is organized under the following centralized hierarchy. When implementing any User Story, developers and AI Agents **must reference this tree to use the exact route path, view component file, and route guard**:

```text
App Shell (Root: AuthProvider ──> AudioPlayerProvider ──> Suspense)
│
├── 🌐 VISITOR WEB APP (Mobile-First Viewport: 375px–430px, Public Access)
│   ├── /                                ──> [Redirect] ──> /admin (MVP Dev) or /visitor (Production)
│   ├── /visitor                         ──> VisitorTourPage [US 01.1 - 01.4]
│   │   ├── [Header]                     ──> VisitorHeader (Language Selector & 24h Pass Status Badge)
│   │   ├── [Interactive Map]            ──> VisitorMapView (Leaflet OSM, continuous GPS watchPosition, POI Markers)
│   │   ├── [Dynamic Geofence Circles]   ──> L.circle according to individual trigger_radius (10m–50m)
│   │   ├── [Teaser Preview Sheet]       ──> PoiPreviewCard (Thumbnail, Title, Distance, Free Summary, Play CTA)
│   │   ├── [Unlock / Paywall Modal]     ──> PaymentModal (VietQR Transfer / Card Form, Session Restore) [US 06.1]
│   │   └── [Session Recovery Modal]     ──> RestoreSessionModal (CCT-XXXXXX session recovery) [US 06.3]
│   ├── /tour                            ──> [Alias Redirect] ──> /visitor
│   ├── /visitor/checkout/success        ──> CheckoutSuccessPage (Payment verification & session pass) [US 06.1, 06.2]
│   └── /checkout/success                ──> [Alias Redirect] ──> /visitor/checkout/success
│
├── 🛡️ ADMIN WEB PORTAL (Desktop-First Viewport: min-w-[1024px])
│   ├── /admin/login                     ──> AdminLoginView (Public: Username/Password, Lockout 423 Countdown) [US 02.1, 02.2]
│   └── /admin/*                         ──> [Protected Shell: Wrapped inside <AdminRouteGuard>]
│       ├── /admin                       ──> AnalyticsDashboard (Executive Overview, Real-time telemetry) [US 05.1-05.4]
│       ├── /admin/analytics             ──> AnalyticsDashboard (Visitor Density Heatmap, Dwell Time, Export) [US 05.1, 05.2, 05.4]
│       ├── /admin/pois                  ──> PoiCatalogPage (POI Data Table, Create/Edit Form, Safe Deletion) [US 03.1, 03.3, 03.4]
│       │   └── /admin/pois/:id/geofence ──> GeofenceCalibPage (Interactive GPS Geolocation & Geofence Calibration) [US 03.2]
│       ├── /admin/geofence              ──> GeofenceCalibPage (Direct Geofence Calibration Map View) [US 03.2]
│       ├── /admin/translations          ──> TranslationPage (Side-by-Side Audit, NEEDS_UPDATE status, Edge-TTS Regen) [US 04.1-04.4]
│       └── /admin/health                ──> SystemHealthPage (Storage Meter 85%/95%, Clean Orphans, API Status) [US 05.3]
│
├── 🧪 DEMO & STANDALONE PREVIEWS (Isolated Sandbox for Story Development & Independent Testing)
│   └── /demo/:storyId                   ──> Independent Story Preview (e.g., /demo/us-01.3)
│
├── 🔊 PERSISTENT SHELL WIDGETS (Mounted Globally at App Shell Outside <Routes>)
│   ├── MiniAudioPlayer                  ──> Fixed bottom mini player (Play/Pause, Seek ±10s, Speed, 3.5s Fallback) [US 01.3]
│   ├── StickyStorageBanner              ──> Storage warning banner on Admin Portal (≥85% Amber, ≥95% Red) [US 05.3]
│   └── GlobalToastContainer             ──> Notification toast for network loss, GPS errors, session recovery
│
└── 🚫 CATCH-ALL WILDCARD
    └── *                                ──> [Redirect] ──> /admin (or NotFound fallback)
```

#### 2. Master Route Registry Specifications Table

All screens within the system must adhere strictly to the following central registry:

| Route Path | Constant in `App.jsx` | View Component File | Subsystem Domain | Access Control | User Story | UI Description & Core Components |
|:---|:---|:---|:---:|:---:|:---:|:---|
| `/` | — | `Navigate to ADMIN_ROUTES.DASHBOARD` | Redirect | Public | — | Default initial redirect pointing to Administrative Workspace (or `/visitor` in production). |
| `/visitor` | `VISITOR_ROUTES.HOME` | `src/views/visitor/VisitorTourPage.jsx` | Visitor | Public | US 01.1, 01.2, 01.3, 01.4 | Primary outdoor interactive digital map. Integrates `VisitorHeader`, `VisitorMapView`, `PoiPreviewCard`, `PaymentModal`. |
| `/tour` | `VISITOR_ROUTES.TOUR` | `Navigate to VISITOR_ROUTES.HOME` | Visitor | Public | US 01.1 | Friendly alias path redirecting to `/visitor`. |
| `/visitor/checkout/success` | `VISITOR_ROUTES.CHECKOUT_SUCCESS` | `src/views/visitor/CheckoutSuccessPage.jsx` | Visitor | Public | US 06.1, 06.2 | Digital admission checkout confirmation screen, issuing the 24-hour `session_code`. |
| `/checkout/success` | — | `Navigate to VISITOR_ROUTES.CHECKOUT_SUCCESS` | Visitor | Public | US 06.1 | Webhook redirect compatibility alias from VietQR / PayOS payment gateways. |
| `/admin/login` | `ADMIN_ROUTES.LOGIN` | `src/views/admin/AdminLoginView.jsx` | Admin | Public | US 02.1, 02.2 | Administrator authentication screen with credential form and 15-minute brute-force lockout countdown on `HTTP 423 Locked`. |
| `/admin` | `ADMIN_ROUTES.DASHBOARD` | `src/views/admin/AnalyticsDashboard.jsx` | Admin | Protected (`AdminRouteGuard`) | US 05.1–05.4 | Executive administrative dashboard: KPI cards, live visitor density, and audio storage alerts. |
| `/admin/analytics` | `ADMIN_ROUTES.ANALYTICS` | `src/views/admin/AnalyticsDashboard.jsx` | Admin | Protected (`AdminRouteGuard`) | US 05.1, 05.2, 05.4 | Detailed analytics: Visitor density heatmap (`Leaflet.heat`), exhibit rankings, dwell times, CSV/JSON export. |
| `/admin/pois` | `ADMIN_ROUTES.POIS` | `src/views/admin/PoiCatalogPage.jsx` | Admin | Protected (`AdminRouteGuard`) | US 03.1, 03.3, 03.4 | Exhibit catalog table, POI creation/edit form, Dynamic Radius Slider (`10m–50m`), hybrid safe deletion. |
| `/admin/pois/:id/geofence` | — | `src/views/admin/GeofenceCalibPage.jsx` | Admin | Protected (`AdminRouteGuard`) | US 03.2 | Exhibit-specific GPS coordinate calibration and dynamic trigger radius tuning on interactive Leaflet map. |
| `/admin/geofence` | `ADMIN_ROUTES.GEOFENCE` | `src/views/admin/GeofenceCalibPage.jsx` | Admin | Protected (`AdminRouteGuard`) | US 03.2 | Direct geofence calibration view across all site points of interest. |
| `/admin/translations` | `ADMIN_ROUTES.TRANSLATIONS` | `src/views/admin/TranslationPage.jsx` | Admin | Protected (`AdminRouteGuard`) | US 04.1–04.4 | Side-by-side multilingual translation audit, `NEEDS_UPDATE` status tracking, Edge-TTS audio regeneration. |
| `/admin/health` | `ADMIN_ROUTES.HEALTH` | `src/views/admin/SystemHealthPage.jsx` | Admin | Protected (`AdminRouteGuard`) | US 05.3 | Disk storage meter for `/static/audio`, 3-tier capacity thresholds (85%/95%), orphan audio cleanup button. |
| `/demo/:storyId` | — | Standalone Story View | Sandbox | Public | All Stories | Isolated sandbox environment for previewing and verifying individual User Stories independently. |
| `*` | — | `Navigate to ADMIN_ROUTES.DASHBOARD` | Fallback | Public | — | Wildcard catch-all safely redirecting invalid routes back to the administrative dashboard. |

#### 3. Standard 5-Step Page Registration Protocol for Tasks & AI Agents

Whenever implementing new screens or features, all developers and AI Agents **must follow these 5 steps in order**:

1. **Step 1 — Consult the Page Tree:** Check the Master Route Registry above against the current User Story to determine the exact `route path` and view component file name (never invent arbitrary URLs).
2. **Step 2 — Implement View Component:** Create or refine the view component file in `src/views/visitor/` (for visitor UI) or `src/views/admin/` (for administrative UI). Adhere to Mobile-First or Desktop-First guidelines per [ui_rules.md](file:///c:/Users/ASUS/OneDrive/Desktop/Software-Technology/documents/ui_rules.md).
3. **Step 3 — Declare Route Constant in [`App.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Software-Technology/MVP/frontend/src/App.jsx):** Every URL must be declared as a constant in `VISITOR_ROUTES` or `ADMIN_ROUTES` at the top of [`App.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Software-Technology/MVP/frontend/src/App.jsx). Scattering hardcoded route strings across files is strictly prohibited.
4. **Step 4 — Register Code-Split Route:** Use `React.lazy()` to dynamically import the view component and declare the `<Route path={...} element={...} />`.
   - If the route belongs to the Admin Portal: **It MUST be wrapped inside `<AdminRouteGuard>`** to enforce session authentication.
   - If the view is still under active development: Provide a clean, valid placeholder component rather than leaving an orphaned view or breaking route resolution.
5. **Step 5 — Update & Run Route Tests ([`App.test.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Software-Technology/MVP/frontend/src/__tests__/App.test.jsx)):** Add test cases verifying that the new route mounts correctly without white-screen crashes, and verify that the full test suite passes via `npm test`.

> [!CAUTION]
> **Strict Prohibition on "Orphaned Views":**
> Creating a view file in `src/views/` without registering a corresponding route in [`App.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/Software-Technology/MVP/frontend/src/App.jsx) is a critical violation of the Definition of Done (DoD). PRs containing unrouted views will be automatically rejected.

---

## 3. BACKEND API DEVELOPMENT STANDARDS (FASTAPI / PYTHON 3.10+)

### 3.1. Strict 3-Tier Layered Architecture
Backend source code strictly follows unidirectional flow: **Router/Controller $\rightarrow$ Service $\rightarrow$ Repository $\rightarrow$ Database**:
```text
MVP/backend/app/
├── core/           # Pydantic Settings, JWT security, database engine
├── controllers/    # API Routers: endpoints, request validation, permissions, HTTP response
├── services/       # 100% Business Logic: Geofencing, AI translation, TTS audio generation, Payment webhook
├── repositories/   # 100% Data Access: SQLAlchemy queries, ORM operations, transactions
├── models/         # SQLAlchemy ORM Models matching the 9 database tables
├── schemas/        # Pydantic Schemas (POICreateRequest, POIResponse, etc.)
└── integrations/   # External integrations: Edge-TTS, Deep-Translator, VietQR, Stripe/PayOS
```

### 3.2. Mandatory Layer Boundaries & Canonical 3-Tier Flow Code Sample

To eliminate boundary bypasses (such as writing business logic in Controllers, writing SQL queries in Services, or raising HTTP exceptions in Repositories), developers must enforce:

| Architectural Layer | Directory | Mandatory Responsibilities | Strictly Prohibited (Strict Ban) |
|---|---|---|---|
| **Layer 1: Controller** | `app/controllers/` | • Receive HTTP requests.<br>• Validate input via Pydantic schemas.<br>• Invoke Service methods via Dependency Injection.<br>• Return HTTP responses with standard status codes (200, 201, 400, 401, 423...). | ❌ **STRICTLY BANNED from importing `repositories/` or `models/`.**<br>❌ BANNED from writing SQL/ORM queries (`db.query()`, `select()`).<br>❌ BANNED from computing business calculations. |
| **Layer 2: Service** | `app/services/` | • Encapsulate **100% business logic** (Geofence distance calculations, bounding box validation, translation orchestration, TTS triggers, Webhook signatures, session codes).<br>• Coordinate Repositories via Dependency Injection. | ❌ **STRICTLY BANNED from calling `db.query()`, `select()`, `db.add()`, `db.commit()`.**<br>❌ Must delegate all persistence operations to Repository classes. |
| **Layer 3: Repository** | `app/repositories/` | • Encapsulate **100% SQLAlchemy ORM / SQL operations** (`db.query()`, `db.add()`, `db.commit()`, `db.rollback()`).<br>• Execute transactions and manage database sessions. | ❌ **STRICTLY BANNED from containing business logic.**<br>❌ **STRICTLY BANNED from raising `HTTPException`** (return `None` or raise Domain Exceptions so Services determine HTTP status codes). |

#### Canonical 3-Tier Flow Code Sample: Controller $\rightarrow$ Service $\rightarrow$ Repository

```python
# ==============================================================================
# 1. CONTROLLER LAYER: MVP/backend/app/controllers/poi_controller.py
# ==============================================================================
from fastapi import APIRouter, Depends, status
from app.schemas.poi_schema import POICreateRequest, POIResponse
from app.services.poi_service import POIService
from app.core.dependencies import get_poi_service, get_current_admin
from app.models.user import User

router = APIRouter(prefix="/pois", tags=["POI Management"])

@router.post("", response_model=POIResponse, status_code=status.HTTP_201_CREATED)
async def create_poi(
    payload: POICreateRequest,
    current_admin: User = Depends(get_current_admin),
    poi_service: POIService = Depends(get_poi_service)
):
    # Only receive request, validate via Pydantic, and delegate to Service.
    # Strictly NEVER import or call Repositories/Database directly.
    return await poi_service.create_new_poi(payload, admin_id=current_admin.id)


# ==============================================================================
# 2. SERVICE LAYER: MVP/backend/app/services/poi_service.py
# ==============================================================================
from fastapi import HTTPException, status
from app.schemas.poi_schema import POICreateRequest, POIResponse
from app.repositories.poi_repository import POIRepository
from app.repositories.audit_repository import AuditRepository
from app.utils.geo import validate_coordinates_in_bounds

class POIService:
    def __init__(self, poi_repo: POIRepository, audit_repo: AuditRepository):
        self.poi_repo = poi_repo
        self.audit_repo = audit_repo

    async def create_new_poi(self, payload: POICreateRequest, admin_id: int) -> POIResponse:
        # 1. Execute 100% business logic within Service layer
        validate_coordinates_in_bounds(payload.latitude, payload.longitude)

        # 2. Delegate persistence to Repository (DO NOT call db.add() or db.commit())
        new_poi = self.poi_repo.create(payload)

        # 3. Log administrative audit trail via AuditRepository
        self.audit_repo.log_action(
            user_id=admin_id,
            action="CREATE_POI",
            target_entity="POI",
            target_id=new_poi.id,
            details={"title": payload.title, "trigger_radius": payload.trigger_radius}
        )

        return POIResponse.model_validate(new_poi)


# ==============================================================================
# 3. REPOSITORY LAYER: MVP/backend/app/repositories/poi_repository.py
# ==============================================================================
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.poi import POI
from app.schemas.poi_schema import POICreateRequest

class POIRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, poi_id: int) -> Optional[POI]:
        # 100% ORM operations live here. Never raise HTTPException if not found.
        return self.db.query(POI).filter(POI.id == poi_id).first()

    def get_active_pois(self) -> List[POI]:
        return self.db.query(POI).filter(POI.is_active == True).all()

    def create(self, payload: POICreateRequest) -> POI:
        poi = POI(
            title=payload.title,
            short_description=payload.short_description,
            description=payload.description,
            latitude=payload.latitude,
            longitude=payload.longitude,
            trigger_radius=payload.trigger_radius,
            is_active=True
        )
        self.db.add(poi)
        self.db.commit()
        self.db.refresh(poi)
        return poi
```

### 3.3. Authentication, Brute-Force Lockout & Specific HTTP Status Codes
- **Password Hashing:** Use `passlib` with `bcrypt` or `argon2`. Plaintext passwords are strictly banned.
- **Distinct HTTP Error Codes for Admin Authentication:**
  1. **Failed attempts < 5:** Return **`HTTP 401 Unauthorized`** with generic message: `"Invalid username or password"`. Increment `failed_login_attempts += 1`.
  2. **Failed attempts $\ge 5$ (or account currently within `locked_until`):** MUST return **`HTTP 423 Locked`** with remaining duration (`retry_after_seconds`) so the UI displays the 15-minute countdown timer:
  ```json
  {
    "success": false,
    "error": {
      "code": "ACCOUNT_LOCKED",
      "message": "Account temporarily locked for 15 minutes due to excessive failed attempts.",
      "details": {
        "retry_after_seconds": 850,
        "locked_until": "2026-10-24T13:45:00Z"
      }
    }
  }
  ```
  3. **Successful login:** Reset `failed_login_attempts = 0` and `locked_until = None`.
- **JWT & Session Lifecycle:**
  - Token signed with `HS256`, hard expiration of 60 minutes.
  - Idle timeout: 30 minutes of inactivity prompts session termination.
- **Audit Logging:** Every mutating administrator action (create POI, update coordinates, edit translation, trigger TTS, toggle active status) must insert a record into `Audit` with `ip_address` and `details` JSON.

### 3.4. Visitor Session & Payment Activation
- Sessions activated upon payment confirmation (or code restore).
- Secure random session code generation: `session_code` prefix `CCT-` + 6 uppercase alphanumeric characters (e.g., `CCT-7X9K2M`).
- Session expiration: `expires_at = now() + timedelta(hours=24)`.
- **Freemium Content Permissions:**
  - Unlocked / expired sessions: API returns only `short_description` and thumbnail images; full `description` and audio streams are omitted.
  - Valid 24h sessions: API unlocks full `description` and `audio_url`.

### 3.5. Payment Gateways & Webhook Idempotency
- **Order Creation:** Record `Transaction` with status `PENDING`.
- **Webhook Processing:**
  - **Mandatory Signature Verification:** Use shared secret keys to verify payload signatures from PayOS, Stripe, or VietQR. Reject immediately (HTTP 400/401) on mismatch.
  - **Enforce Idempotency:** Check status via `transaction_ref`. If already `PAID`, return HTTP 200 OK immediately without activating duplicate sessions.
  - On successful payment: Set `Transaction.status = 'PAID'`, activate 24-hour `VisitorSession`, and link `session_id`.

---

## 4. DATABASE & ORM STANDARDS (MYSQL 8.0 / SQLALCHEMY)

### 4.1. Standardized 9-Table Schema & Uppercase Enums
Database structure strictly conforms to the verified architecture ERD:
1. `User`: Internal Administrator accounts (**no `role` column**).
2. `Audit`: Audit log tracking Administrator actions.
3. `LanguageCode`: Supported language catalog (ISO `code` primary key). Status: `'ACTIVE'`, `'INACTIVE'`.
4. `POI`: Exhibition points (`trigger_radius`, `short_description`, `description`, `latitude`, `longitude`, `is_active`).
5. `POITranslation`: Multilingual translations per POI (`title`, `short_description`, `description`, `status`).
6. `POIAudio`: Narration audio files (`audio_url`, `audio_hash`, `duration_seconds`, `status`).
7. `VisitorSession`: 24-hour visitor session pass (`session_code`, `expires_at`, `is_active`).
8. `Transaction`: Payment transactions for tour passes (`amount`, `payment_gateway`, `status`).
9. `POITrigger`: Telemetry logs of audio triggers (`trigger_type`, `visitor_latitude`, `visitor_longitude`, `triggered_at`).

**Standardized UPPERCASE Enums:**
- `POITranslation.status`: `'PENDING'`, `'DRAFT'`, `'NEEDS_UPDATE'`, `'PUBLISHED'`, `'FAILED'`.
- `POIAudio.status`: `'PENDING'`, `'READY'`, `'FAILED'`.
- `Transaction.status`: `'PENDING'`, `'PAID'`, `'FAILED'`, `'EXPIRED'`.
- `POITrigger.trigger_type`: `'MANUAL'`, `'GPS_PROXIMITY'`, `'QR_SCAN'`.

### 4.2. Hybrid Safe Deletion Pattern
Resolves the conflict between retaining historical telemetry and releasing disk space:
1. **Logical Preservation in DB:**
   - Raw physical deletion (`DELETE FROM POI WHERE id = ...`) is **strictly prohibited**.
   - Deleting a POI updates `POI.is_active = FALSE`.
   - Preserves all foreign key references in `POITrigger`, `VisitorSession`, and `Audit` for historical reporting.
2. **Physical Storage Cleanup:**
   - When a POI is deactivated (`is_active = FALSE`), the backend immediately deletes all associated physical `.mp3` files from disk/storage to reclaim space.
   - Associated `POIAudio.audio_url` is unlinked and status set to `'FAILED'`.
3. **Orphan Cleanup Endpoint:**
   - Endpoint: **`POST /api/v1/admin/storage/clean-orphans`**
   - Scans storage folders against active POIs (`is_active = TRUE`) and purges orphaned audio files.

### 4.3. Indexing Strategy
- Geographic Coordinates: Composite B-Tree or Spatial Index on `(latitude, longitude)` in `POI`.
- Unique Constraints:
  - `POITranslation`: `UNIQUE(poi_id, language_code)`.
  - `POIAudio`: `UNIQUE(poi_translation_id)`.
  - `VisitorSession`: `UNIQUE(session_code)`.
- Query Lookup Indices:
  - `Transaction(transaction_ref)`, `Transaction(session_id, status)`.
  - `POITrigger(poi_id, triggered_at)`.

### 4.4. Just-In-Time Database Connection Lifecycle (Open-Query-Close Immediately)

- **Mandatory Connection Principle: "Open Only to Query — Close Immediately":**
  1. **No lingering open connections:**
     Database sessions (`db: Session`) must be opened immediately before executing SQL/ORM queries and **closed immediately (releasing connections back to the Pool)** upon completion.
  2. **In HTTP Requests (FastAPI Dependency `get_db`):**
     Use a `try ... yield db ... finally: db.close()` pattern ensuring the session is always closed and released back to the pool, regardless of exceptions:
     ```python
     def get_db():
         db = SessionLocal()
         try:
             yield db
         finally:
             db.close()  # Mandatory session closure returning connection to Pool
     ```
  3. **In Background Tasks & Workers:**
     Must open sessions via Context Manager `with SessionLocal() as db:` to ensure automatic closure upon exiting the block.
  4. **STRICTLY PROHIBITED: Holding DB connections during external I/O:**
     Never keep a DB session open while waiting for external network APIs (Deep-Translator, Edge-TTS, Payment Webhooks).
     - ❌ **INCORRECT:** Open DB session $\rightarrow$ Hold session during 5-second Edge-TTS generation $\rightarrow$ Write DB $\rightarrow$ Close. (Causes MySQL pool exhaustion).
     - ✅ **CORRECT:** Open DB session $\rightarrow$ Read text $\rightarrow$ **Close DB session immediately** $\rightarrow$ Call Edge-TTS to synthesize audio $\rightarrow$ Open new DB session $\rightarrow$ Save audio metadata $\rightarrow$ **Close DB session immediately**.

- **SQLAlchemy Connection Pool Configuration with MySQL 8.0:**
  ```python
  engine = create_engine(
      settings.DATABASE_URL,
      pool_size=10,
      max_overflow=20,
      pool_recycle=1800,  # Recycle connections after 30 minutes to prevent stale 'MySQL server has gone away'
      pool_pre_ping=True   # Ping check connection liveness before checkout
  )
  ```

---

## 5. AI TRANSLATION & TEXT-TO-SPEECH (TTS) PIPELINE STANDARDS

### 5.1. Strict Text-Audio Synchronization Rule
An immutable business invariant preventing discrepancies between text and audio narration:
1. When an Admin creates or edits any character in `title`, `short_description`, or `description` of `POITranslation`:
   - The system **immediately sets status** `POITranslation.status = 'NEEDS_UPDATE'`.
   - The `"Approve & Publish"` button on Admin Portal **is strictly disabled**.
2. The publish button re-enables only after the Admin clicks `"Regenerate Audio Guide"`, Edge-TTS succeeds, the new audio is saved, and status becomes `'DRAFT'`. Only then can the Admin review and publish.

### 5.2. Intelligent Audio Caching via Content Hashing (SHA-256)
- Prevent redundant TTS calls by generating a content hash:
  $$\text{audio\_hash} = \text{SHA256}(\text{title} + "::" + \text{description} + "::" + \text{language\_code} + "::" + \text{voice\_id})$$
- Before invoking TTS:
  - Check if an audio file with identical `audio_hash` exists on storage.
  - If found: Link the existing `audio_url` directly, bypassing synthesis.

### 5.3. Background Task Processing & Short-Lived DB Session Pattern
- **Audio Specification:** `.mp3` format, bitrate $64\text{kbps}$ to $96\text{kbps}$ (compact file size $\approx 500\text{KB} - 1.5\text{MB}$ per 2-minute narration).
- **Session Lifecycle in BackgroundTasks:**
  Passing request `db: Session` into `BackgroundTasks` will cause `DetachedInstanceError` because the HTTP request closes its session before the background task completes.
  **Mandatory:** Background workers must create isolated sessions and follow the Open-Read-Close $\rightarrow$ TTS $\rightarrow$ Open-Write-Close pattern:
  ```python
  from app.core.database import SessionLocal
  from app.repositories.poi_repository import POIRepository
  from app.services.audio_service import AudioService

  def generate_audio_background_task(translation_id: int):
      # STEP 1: Open session to retrieve text data, then CLOSE IMMEDIATELY
      with SessionLocal() as db:
          poi_repo = POIRepository(db)
          translation = poi_repo.get_translation_by_id(translation_id)
          if not translation:
              return
          text_to_speak = translation.description
          language_code = translation.language_code
      # -> DB connection is closed and released to Pool during external TTS call

      # STEP 2: Synthesize speech via external Edge-TTS (holding NO DB connection)
      audio_service = AudioService()
      audio_metadata = audio_service.synthesize_speech(text_to_speak, language_code)

      # STEP 3: Open fresh session to save results, then CLOSE IMMEDIATELY
      with SessionLocal() as db:
          poi_repo = POIRepository(db)
          poi_repo.save_generated_audio(translation_id, audio_metadata)
      # -> DB connection closed immediately
  ```

### 5.4. Storage Monitoring & Clean Orphaned Audio
- The system monitors `/static/audio` disk capacity:
  - At $\ge 85\%$: Log audit warning and display amber Sticky Alert Banner on Admin Dashboard with `"Clean Orphaned Audio"` button (`POST /api/v1/admin/storage/clean-orphans`).
  - At $\ge 95\%$: Display red Critical Storage Alert, temporarily blocking uploads of large media.

---

## 6. ERROR HANDLING, LOGGING & MONITORING STANDARDS

### 6.1. Consistent Error Response Format
All API error responses (4xx, 5xx) must follow a standard JSON schema:
```json
{
  "success": false,
  "error": {
    "code": "GEO_OUT_OF_BOUNDS",
    "message": "Selected GPS coordinates fall outside the Cu Chi Tunnels historical site perimeter.",
    "details": {
      "latitude": 10.5000,
      "longitude": 105.2000,
      "allowed_bounds": "CuChi_Polygon_GeoJSON"
    }
  }
}
```

### 6.2. Geographic Bounding Box Validation
When creating or editing POI coordinates, the backend enforces bounding box checks:
```python
CU_CHI_BOUNDS = {
    "min_lat": 11.1350, "max_lat": 11.1550,
    "min_lng": 106.4500, "max_lng": 106.4750
}

def validate_coordinates_in_bounds(lat: float, lng: float):
    if not (CU_CHI_BOUNDS["min_lat"] <= lat <= CU_CHI_BOUNDS["max_lat"] and
            CU_CHI_BOUNDS["min_lng"] <= lng <= CU_CHI_BOUNDS["max_lng"]):
        raise HTTPException(
            status_code=400,
            detail="Coordinates fall outside the permitted perimeter of Cu Chi Tunnels."
        )
```

---

## 7. TESTING STANDARDS & DEFINITION OF DONE (DOD)

### 7.1. Mandatory 1-to-1 Module & UI Component Unit Test Rule
To eliminate untested code and regression bugs, developers and AI Agents must follow the **Strict 1-to-1 Unit Testing Rule**:
> **Every completed module, service, repository, utility, custom hook, or UI component MUST be paired with its dedicated Unit Test file upon completion.**
> No module is considered "Done" without an accompanying unit test file containing comprehensive test coverage.

#### 1. Unit Test File Placement & Naming Standard
Unit test files must be explicitly named to match their target module 1-to-1:

```text
MVP/backend/
├── app/
│   ├── services/
│   │   ├── poi_service.py              <── Target Backend Module
│   │   └── audio_service.py
│   └── repositories/
│       └── poi_repository.py
└── tests/
    ├── conftest.py                      # Global fixtures (test DB session, mock clients)
    └── unit/
        ├── services/
        │   ├── test_poi_service.py      <── Paired Unit Test (1-to-1)
        │   └── test_audio_service.py    <── Paired Unit Test (1-to-1)
        └── repositories/
            └── test_poi_repository.py   <── Paired Unit Test (1-to-1)

MVP/frontend/src/
├── components/
│   ├── visitor/
│   │   ├── MiniAudioPlayer.jsx          <── Target UI Component Module
│   │   └── __tests__/
│   │       └── MiniAudioPlayer.test.jsx <── Paired UI Component Test (1-to-1)
│   └── admin/
│       ├── POIEditModal.jsx
│       └── __tests__/
│           └── POIEditModal.test.jsx
├── hooks/
│   ├── useGeolocation.js                <── Target Custom Hook Module
│   └── __tests__/
│       └── useGeolocation.test.js       <── Paired Hook Test (1-to-1)
└── utils/
    ├── haversine.js                     <── Target Utility Module
    └── __tests__/
        └── haversine.test.js            <── Paired Utility Test (1-to-1)
```

#### 2. Unit Test Acceptance Criteria
Each unit test file must satisfy the following 4 engineering criteria:
1. **Clear, Self-Explanatory Test Names:**
   - Python: `def test_should_calculate_correct_distance_when_coordinates_valid():`
   - Vitest: `it('renders locked paywall badge when visitor session is unpaid', () => {})`
2. **Isolation & Strict Mocking of External I/O:**
   - All external network calls (Deep-Translator API, Edge-TTS synthesis, Stripe/VietQR gateways) must be completely mocked using `pytest-mock` (`mocker.patch`) or Vitest mocks (`vi.fn()`, `vi.spyOn()`).
   - Zero live HTTP requests or live third-party API calls permitted during unit test execution.
3. **Triad Coverage (Happy Path, Boundary/Edge Case, Error Handling):**
   - Each unit test file must test at least:
     1. Positive scenario (Happy path).
     2. Boundary condition (e.g., zero distance, coordinate at exact bounding edge, empty string).
     3. Negative / Error handling (e.g., entity not found `404`, audio stream timeout after 3.5s, rate limit lock `423`).
4. **Execution Speed:** Unit test suites must run in-memory or against mock objects, completing in under 5 seconds locally.

### 7.2. Definition of Done (DoD) Checklist

Before opening Pull Requests or marking any feature complete, developers must verify compliance with this checklist:

| No. | Verification Item | Acceptance Criteria |
|---|---|---|
| 1 | **Roles & Permissions** | Strictly 2 actors (`Visitor`, `Admin`). Zero residual code referencing `Staff` or `Curator`. |
| 2 | **3-Tier Architecture** | **Backend:** Controller never imports Repository/Model; Service contains 100% logic and no `db.query()`; Repository contains 100% ORM and never raises `HTTPException`.<br>**Frontend:** Decoupled Presentation (`views/components`) $\rightarrow$ Logic/State (`hooks/contexts`) $\rightarrow$ API (`api/`); components strictly banned from calling `axios`/`fetch` directly. |
| 3 | **Physical Environment** | No `floor` or `Area_zone` fields. Unified flat WGS84 coordinates and individual `trigger_radius`. |
| 4 | **GPS Geolocation** | Continuous tracking via `watchPosition` with `clearWatch` on unmount. Fallback gracefully to Main Entrance. |
| 5 | **Audio & Weak Network** | Singleton `audioInstance`. Auto-abort stream after 3.5s timeout and fallback to Web Speech API with BCP-47 code. |
| 6 | **Audio-Text Sync** | Modifying translation text forces `NEEDS_UPDATE` status and locks Publish until TTS is regenerated. |
| 7 | **Authentication Security** | 5 consecutive failed logins return `HTTP 423 Locked` with `retry_after_seconds`. Idle timeout at 30 minutes. |
| 8 | **Hybrid Safe Deletion** | POI deactivation sets `is_active = FALSE` while purging physical `.mp3` files. Endpoint `/storage/clean-orphans` supported. |
| 9 | **Database Connection Lifecycle** | Open DB session only when querying and close immediately (`try...finally: db.close()` or `with SessionLocal()`). Never hold DB sessions open during external I/O (AI/TTS/Payment). |
| 10 | **1-to-1 Module Unit Testing** | Every module/component has its paired unit test file (`test_<module>.py` or `<Component>.test.jsx`) with ≥ 80% code coverage, 0 mock leaks, and 0 linter errors. |

---

## 8. WORKSPACE AGENT SKILLS & RULES CONFIGURATION

To ensure the AI Coding Assistant (Antigravity) automatically adheres to these standards during every turn, developers must verify the following workspace configuration under `.agents/`:

1. **Workspace Rule (`.agents/rules/dev_rules.md`):** Loaded unconditionally into agent context.
2. **FastAPI Skill (`.agents/skills/fastapi`):** Provides patterns for Dependency Injection, Async endpoints, and Pydantic schemas.
3. **React Best Practices Skill (`.agents/skills/vercel-react-best-practices`):** Guides map re-render optimization, state decoupling, and bundle performance.
4. **Database Best Practices Skill (`supabase-postgres-best-practices`):** Guides connection pooling, transaction isolation, and indexing strategies.
