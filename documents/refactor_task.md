# ENGINEERING REFACTORING TASK BREAKDOWN (REFACTORING SPRINT WBS)
## Predictable Control Flow, Explicit Execution & Single Intent Structured Exit (SISE)
### Focus: Backend Layer 2 (Services) & Layer 3 (Repositories / Integrations) with Layer 1 Compatibility
### Project: Smart Multilingual Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site
*Refactoring task breakdown mapped 1-to-1 against `documents/refactor_rule.md` and `documents/tasks.md`. Specifically targeting Layer 2 (Business Logic Services) and Layer 3 (Data Access Repositories & External Integrations), freezing Layer 1 (Controllers/API Contracts), and concurrently refactoring corresponding unit test suites to guarantee zero regression and mathematical predictability ($M \le 6, K \le 2$).*

---

## 📊 1. REFACTORING SPRINT PROGRESS MATRIX

| Epic / Module ID | Module Title | Primary Focus Layers | Priority | Story Points | Tasks | Progress Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| [**REF-EPIC-01**](#-ref-epic-01-mobile-map-geofencing-engine--wayfinding-navigation-uc-01) | Mobile Map, Geofencing Engine & Wayfinding Navigation | Layer 2 (Service) / Layer 3 (Repo) / Test | Must Have | 6 SP | 4 Tasks | [ ] 0/4 |
| [**REF-EPIC-02**](#-ref-epic-02-administrative-authentication-session-guard--lockout-uc-02) | Admin Authentication, Session Guard & Lockout Invariants | Layer 2 (Service) / Layer 3 (Repo) / Test | Must Have | 6 SP | 4 Tasks | [ ] 0/4 |
| [**REF-EPIC-03**](#-ref-epic-03-poi-spatial-catalog-coordinate-validation--media-upload-uc-03) | POI Catalog, Coordinate Validation & Spatial Queries | Layer 2 (Service) / Layer 3 (Repo) / Test | Must Have | 6 SP | 4 Tasks | [x] 4/4 |
| [**REF-EPIC-04**](#-ref-epic-04-automated-ai-translation-pipeline-tts-engine--audit-curation-uc-04) | AI Translation Pipeline, TTS Engine & Audio Curation | Layer 2 (Service) / Layer 3 (Repo/Client) / Test | Must Have | 10 SP | 6 Tasks | [x] 6/6 |
| [**REF-EPIC-05**](#-ref-epic-05-operational-telemetry-heatmap-aggregation--system-health-uc-05) | Telemetry Ingestion, Heatmap Aggregation & Data Export | Layer 2 (Service) / Layer 3 (Repo) / Test | Should Have | 6 SP | 4 Tasks | [x] 4/4 |
| [**REF-EPIC-06**](#-ref-epic-06-digital-admission-payment-webhook-verification--visiting-session-uc-06) | Payment Webhook Verification, Session Gating & Recovery | Layer 2 (Service) / Layer 3 (Repo/Client) / Test | Must Have | 8 SP | 5 Tasks | [ ] 0/5 |
| [**REF-EPIC-07**](#-ref-epic-07-cross-cutting-infrastructure-orm-schema-defense--ci-gates) | Infrastructure, ORM-DDL Defense & Control Flow CI Gates | Layer 3 (Core/DB) / AST Linter / CI | Must Have | 5 SP | 4 Tasks | [ ] 0/4 |
| **TOTAL** | **7 Refactoring Epics (Layer 2 & 3 Backend + Tests)** | — | — | **47 SP** | **31 Tasks** | **[ ] 14/31 Tasks** |

---

## 📐 2. REFACTORING QUANTITATIVE GATES & DEFINITION OF DONE (DoD)

Every refactoring task in this backlog must strictly comply with the quantitative gates established in `documents/refactor_rule.md` and the Layer 1 Invariant Guarantee:

### 2.1. Mathematical Metric Gates for Production Code
1. **Max Exit Points ($K$):** $K \le 2$ per function/method (at most 1 top-of-scope validation rejection gate, and strictly 1 unified return).
2. **Cyclomatic Complexity ($M$):** $M \le 6$ per function ($M = E - N + 2P$). Any method with $M > 6$ must be decomposed into single-responsibility private helper methods (`_private_helper`).
3. **Maximum Nesting Depth:** $\le 3$ indentation levels (functions with 4+ indentations are strictly rejected).
4. **Ternary Nesting Depth:** Strictly $\le 1$ level (nested ternaries `a if b else (c if d else e)` are 100% prohibited).
5. **No Implicit Returns:** Explicit terminal return variable accumulator (`return resolved_result` / `return response_dto`).
6. **Strict Boolean Coercion:** Explicit `bool(...)` casting instead of short-circuit return chains (`return user and user.is_active`).

### 2.2. Architectural Invariant: Frozen Layer 1 Compatibility
* **Zero Breaking Changes to Controllers:** All public service method signatures (`def method_name(self, param1, param2):`), argument names, parameter orders, and return types (Pydantic schemas / DTOs) currently consumed by `app/controllers/*.py` are **FROZEN**.
* **Zero API Contract Drift:** External HTTP response status codes and `ApiError(status_code, detail/code)` envelopes raised by services remain identical so frontend integrations experience 0% breaking changes.

### 2.3. Unit Test Refactoring DoD (Dual Refactoring Protocol)
* **Arrange-Act-Assert SISE Symmetry:** Test functions must be refactored to eliminate scattered mid-test branching, conditional assertions, and implicit skips.
* **Schema-Harmonized Test Fixtures:** Seed fixtures and mock factories must be modernized to match the MySQL 8.0 DDL (`mysql_schema.sql`):
  - No obsolete columns (e.g., removing `user_name` from POITranslation mocks).
  - Foreign key integrity (e.g., seeding a valid `Transaction` whenever a `VisitorSession` is created).
  - Check constraint validity (e.g., `paid_at` required iff `status == 'PAID'`).
* **Regression Defense:** 100% of existing test assertions must pass without deleting test coverage or lowering the $\ge 80\%$ backend coverage threshold.

---

## 🗺️ REF-EPIC-01: MOBILE MAP, GEOFENCING ENGINE & WAYFINDING NAVIGATION (UC-01)
*Focus: Linearizing greedy TSP wayfinding route calculations, standardizing language catalog resolution, and refactoring navigation unit test suites.*

### 📌 Tasks Breakdown:
- [ ] `REF-01.1` `[Layer 2 - Service]` **Linearize Nearest-Neighbor TSP Routing (`app/services/wayfinding_service.py`)**
  - **Smells & Anti-patterns:** `compute_optimal_tour_route` contains deeply nested while/for loops with mid-loop break/returns and inline distance matrix assertions ($M = 9$).
  - **Refactoring Scope:**
    1. Phase 1 Gate: Validate non-empty POI candidates and start coordinates within Vietnam bounding box (`10.0 <= lat <= 12.0`, `105.0 <= lng <= 108.0`).
    2. Phase 2 Compute: Decompose greedy step into private helper `_find_nearest_unvisited_poi(current_coords, unvisited_pool)` ($M \le 4$).
    3. Phase 3 Exit: Accumulate visited coordinates, total distance in meters, and estimated duration into a single `TourRouteResponse` return statement.
  - **Layer 1 Fit:** Signature `compute_optimal_tour_route(start_lat, start_lng, poi_ids, ...)` and return model remain 100% identical for `tour_controller.py`.
  - **Metric Target:** $K = 2$, $M \le 5$, Nesting Depth $\le 2$.

- [ ] `REF-01.2` `[Layer 2 - Service]` **Refactor Language Catalog Resolution Service (`app/services/language_service.py`)**
  - **Smells & Anti-patterns:** Redundant queries for fallback languages; scattered early returns when checking published languages.
  - **Refactoring Scope:**
    1. Phase 1 Gate: Validate requested language code format.
    2. Phase 2 Compute: Fetch active language catalog via repository; resolve language metadata into intermediate dictionary.
    3. Phase 3 Exit: Return single `LanguageListResponse(languages=resolved_languages)`.
  - **Layer 1 Fit:** Keeps exact method `get_available_languages()` called by `language_controller.py`.
  - **Metric Target:** $K = 1$, $M \le 3$.

- [ ] `REF-01.3` `[Layer 3 - Repository]` **Refactor Language Repository Queries (`app/repositories/language_repository.py`)**
  - **Smells & Anti-patterns:** Implicit `None` return on missing language code; lack of explicit condition accumulation.
  - **Refactoring Scope:** Standardize `get_by_id` and `get_published_languages` with explicit accumulator returns (`return found_language` / `return None`).
  - **Metric Target:** $K = 1$, $M \le 3$.

- [ ] `REF-01.4` `[Test - Unit Suite]` **Refactor Wayfinding & Navigation Unit Tests (`tests/unit/services/test_wayfinding_service.py`)**
  - **Test Smells:** Ad-hoc coordinate tuples hardcoded inside test assertions without shared fixtures; multiple assertions without clear AAA separation.
  - **Refactoring Scope:**
    1. Extract standard test coordinate fixtures (`CU_CHI_MAIN_GATE`, `BEN_DUOC_COORDINATES`).
    2. Restructure test cases into strict Arrange $\rightarrow$ Act $\rightarrow$ Assert phases.
    3. Add boundary test cases for 0 POIs, 1 POI, and out-of-bounds coordinates.
  - **DoD:** 100% tests pass, zero assertions deleted.

---

## 🔐 REF-EPIC-02: ADMINISTRATIVE AUTHENTICATION, SESSION GUARD & LOCKOUT (UC-02)
*Focus: Eliminating scattered returns in credential verification, strictly separating audit logging invariants from failure branches, and hardening repository data access.*

### 📌 Tasks Breakdown:
- [ ] `REF-02.1` `[Layer 2 - Service]` **Refactor Admin Authentication Service (`app/services/auth_service.py`)**
  - **Smells & Anti-patterns:** `login_admin` has 4 distinct `raise ApiError` statements intermingled with audit logging calls, creating risk where failure telemetry fails to record.
  - **Refactoring Scope:**
    1. Phase 1 Gate: Validate non-empty sanitized username and password length constraints.
    2. Phase 2 Compute: Check user presence and lockout status via single linear evaluation. Compute `password_matches = verify_password(...)`.
    3. Branch Invariant: If invalid, record `ADMIN_LOGIN_FAILURE` or `ADMIN_LOCKOUT` audit log before raising standardized `ApiError`.
    4. Phase 3 Exit: On success, record `ADMIN_LOGIN_SUCCESS`, reset `falsed_attempts = 0`, generate token, and return single `AdminProfileResponse`.
  - **Layer 1 Fit:** Controller `auth_controller.py` calls `auth_service.login_admin(credentials, db)` without change.
  - **Metric Target:** $K \le 2$, $M \le 6$, Nesting Depth $\le 2$.

- [ ] `REF-02.2` `[Layer 3 - Repository]` **Refactor User Repository (`app/repositories/user_repository.py`)**
  - **Smells & Anti-patterns:** Implicit `None` return when user not found; redundant session flush calls.
  - **Refactoring Scope:**
    1. Explicit return accumulator: `user = query.first(); return user`.
    2. Encapsulate failure counter updates (`increment_failed_attempts`, `reset_failed_attempts`) with explicit return of updated user model.
  - **Metric Target:** $K = 1$, $M \le 4$.

- [ ] `REF-02.3` `[Layer 3 - Repository]` **Refactor Audit Repository (`app/repositories/audit_repository.py`)**
  - **Smells & Anti-patterns:** Missing transaction commit encapsulation; variable length details column not properly formatted for TEXT type.
  - **Refactoring Scope:** Standardize `create_audit_entry(user_name, status, ip_address, details)` to linear SISE execution with explicit return of created `Audit` instance.
  - **Metric Target:** $K = 1$, $M \le 3$.

- [ ] `REF-02.4` `[Test - Unit Suite]` **Refactor Auth & Security Unit Tests (`tests/unit/services/test_auth_service.py` & `test_user_repository.py`)**
  - **Test Smells:** Tests verify audit side-effects using brittle count checks; inconsistent password hashing mock setups.
  - **Refactoring Scope:**
    1. Standardize user seed fixture with `LOW_COST_BCRYPT_ROUNDS`.
    2. Separate success, lockout, and invalid-password tests into clear AAA structure.
    3. Assert exact audit log status (`SUCCESS`, `FAILED`, `LOCKED`) per test case.
  - **DoD:** 100% tests pass, zero regressions across 28 auth tests.

---

## 🏛️ REF-EPIC-03: POI SPATIAL CATALOG, COORDINATE VALIDATION & MEDIA UPLOAD (UC-03)
*Focus: Removing scattered boundary checks, establishing clean coordinate validation gates, robust image file verification, and linearizing exhibit state toggling.*

*Progress update (2026-10-31, team-confirmed): all REF-03 implementation and test criteria are complete (4/4).*

### 📌 Tasks Breakdown:
- [x] `REF-03.1` `[Layer 2 - Service]` **Refactor POI Service Coordinate & Image Validation (`app/services/poi_service.py`)**
  - **Smells & Anti-patterns:** `validate_coordinates_in_bounds` and `validate_image_file` have multi-level if-branches and raise exceptions from deeply nested blocks ($M = 8$).
  - **Refactoring Scope:**
    1. Phase 1 Gate: Extract coordinate bounds check into clean boolean helper `_is_coordinate_valid(lat, lng)`. Raise single `ApiError(400, GEO_OUT_OF_BOUNDS)` if false.
    2. Image Validation: Sequential validation pipeline (mime-type check $\rightarrow$ file size limit 5MB check $\rightarrow$ magic bytes verification $\rightarrow$ single clean return).
    3. Exhibit State Toggle: Linearize `toggle_poi_status(poi_id, is_active)`: fetch POI $\rightarrow$ update status $\rightarrow$ invalidate cached navigation routes $\rightarrow$ return updated `PoiResponse`.
  - **Layer 1 Fit:** Preserves all method signatures used by `admin_poi_controller.py` and `poi_controller.py`.
  - **Metric Target:** $K \le 2$, $M \le 5$, Nesting Depth $\le 2$.

- [x] `REF-03.2` `[Layer 3 - Repository]` **Refactor POI Repository Query Builder (`app/repositories/poi_repository.py`)**
  - **Smells & Anti-patterns:** Search query filters concatenated with multiple inline `if search:` blocks altering query object in place without predictable exit accumulator.
  - **Refactoring Scope:**
    1. Accumulate SQLAlchemy filter expressions into a `filter_conditions: list = []` array.
    2. Apply `query.filter(*filter_conditions)` once before pagination execution.
    3. Return structured tuple `(items, total_count)` explicitly.
  - **Metric Target:** $K = 1$, $M \le 4$.

- [x] `REF-03.3` `[Test - Unit Suite]` **Refactor POI Service & Repository Unit Tests (`tests/unit/services/test_poi_service.py` & `test_poi_repository.py`)**
  - **Test Smells:** Repetitive creation of mock POI objects; test assertions checking image upload mock details scattered across multiple try/finally blocks.
  - **Refactoring Scope:**
    1. Unify POI factory fixture `_create_poi_fixture(db_session, **kwargs)`.
    2. Refactor test cases to isolate coordinate boundary validation, active toggling, and image upload.
    3. Ensure tests clean up uploaded temp files reliably in teardown.
  - **DoD:** 100% tests pass, code coverage $\ge 85\%$.

- [x] `REF-03.4` `[Test - Unit Suite]` **Refactor Admin POI Controller Unit Tests (`tests/unit/controllers/test_admin_poi_controller.py`)**
  - **Test Smells:** Mocks fail to verify exact DTO payloads passed to Layer 2 services.
  - **Refactoring Scope:** Modernize test client requests with typed multipart form fixtures; verify exact HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`).
  - **DoD:** All 18 tests pass with green assertions.

---

## 🌐 REF-EPIC-04: AUTOMATED AI TRANSLATION PIPELINE, TTS ENGINE & AUDIT CURATION (UC-04)
*Focus: Eliminating unhandled retry loops, standardizing SHA-256 text hashing, linearizing background worker orchestration, and harmonizing ORM models with MySQL DDL.*

*Progress update (2026-10-31, team-confirmed): all REF-04 implementation and test criteria are complete (6/6).*

### 📌 Tasks Breakdown:
- [x] `REF-04.1` `[Layer 3 - Integration]` **Refactor Deep-Translator Client with Explicit Backoff Gate (`app/integrations/deep_translator_client.py`)**
  - **Smells & Anti-patterns:** Deeply nested `try/except` inside `while attempt < max_retries` with multiple mid-loop returns and broad exception suppression ($M = 8$).
  - **Refactoring Scope:**
    1. Phase 1 Gate: Validate non-empty source text and target language code.
    2. Phase 2 Compute: Implement retry loop with explicit exponential backoff (`backoff_delay = initial_delay * (2 ** attempt)`). Store success result in `translated_text = None`.
    3. Phase 3 Exit: Unconditional return of `translated_text`; if loop exhausts without result, raise explicit `TranslationServiceError`.
  - **Metric Target:** $K \le 2$, $M \le 5$, Nesting Depth $\le 2$.

- [x] `REF-04.2` `[Layer 3 - Integration]` **Refactor Edge-TTS Synthesis Client & Audio Caching (`app/integrations/edge_tts_client.py`)**
  - **Smells & Anti-patterns:** File path formatting, content hashing, and TTS voice selection tangled in a single 90-line function with multiple early returns.
  - **Refactoring Scope:**
    1. Decompose into `_resolve_voice_for_language(lang_code)` ($M \le 3$) and `_compute_sha256_hash(text)` ($M \le 2$).
    2. In `synthesize_audio`: Phase 1 Gate (validate text/lang) $\rightarrow$ Phase 2 (synthesize audio stream to disk) $\rightarrow$ Phase 3 (return `AudioMetadataDTO(audio_url, duration, file_size)`).
  - **Metric Target:** $K = 2$, $M \le 5$.

- [x] `REF-04.3` `[Layer 2 - Service]` **Refactor Translation Service & Audio Service (`app/services/translation_service.py` & `audio_service.py`)**
  - **Smells & Anti-patterns:** Direct access to obsolete `UserName` column; scattered status update calls; tangled TTS re-generation triggers.
  - **Refactoring Scope:**
    1. `translation_service.py`: Linearize status transitions (`DRAFT` $\rightarrow$ `NEEDS_UPDATE` $\rightarrow$ `PUBLISHED`). Update reviewer field to `review_by` matching MySQL schema.
    2. `audio_service.py`: Standardize `get_audio_for_poi(poi_id, language)` and `regenerate_audio(translation_id)` to 3-Phase SISE structure.
  - **Layer 1 Fit:** Interfaces consumed by `translation_controller.py` and `audio_controller.py` remain identical.
  - **Metric Target:** $K \le 2$, $M \le 5$.

- [x] `REF-04.4` `[Layer 2 - Service]` **Refactor Background Translation Pipeline Service & Workers (`app/services/translation_pipeline_service.py` & `translation_worker.py`)**
  - **Smells & Anti-patterns:** Background task swallows individual language errors or aborts entire pipeline prematurely on first error.
  - **Refactoring Scope:**
    1. Loop through target languages (`en`, `ja`, `ko`, `zh`) sequentially; accumulate per-language outcomes in `pipeline_results: dict[str, PipelineStatus]`.
    2. If a single translation fails, record status `FAILED` in DB and continue to next language without crashing worker.
    3. Return consolidated `PipelineExecutionSummary` at single terminal exit.
  - **Metric Target:** $K = 1$, $M \le 5$, Nesting Depth $\le 2$.

- [x] `REF-04.5` `[Layer 3 - Repository]` **Refactor Translation & Audio Repositories (`app/repositories/translation_repository.py` & `audio_repository.py`)**
  - **Smells & Anti-patterns:** Querying non-existent `UserName` field; dynamic filter branching modifying query in place.
  - **Refactoring Scope:**
    1. Update queries in `TranslationRepository` to remove `user_name` column reference; query only valid columns (`Review_by`, `PoiID`, `LanguageID`, `Status`).
    2. Standardize filter builder to `filter_conditions: list = []` pattern.
    3. Enforce deterministic returns for all repository lookup methods.
  - **Metric Target:** $K = 1$, $M \le 4$.

- [x] `REF-04.6` `[Test - Unit Suite]` **Refactor Translation & Audio Unit Tests (`tests/unit/repositories/test_translation_repository.py`, `test_audio_repository.py`, `test_translation_service.py`)**
  - **Test Smells:** Test seed fixtures instantiate `POITranslation` with obsolete `user_name` field, causing SQL 1054 errors in CI.
  - **Refactoring Scope:**
    1. Update `_seed_base_data()` and `_create_translation()` to use valid schema attributes.
    2. Refactor mock assertions for `deep_translator_client` and `edge_tts_client` to strict AAA pattern.
    3. Verify that all 10 translation controller tests and 7 repository tests pass cleanly.
  - **DoD:** 100% tests pass, zero SQL syntax/column errors.

---

## 📈 REF-EPIC-05: OPERATIONAL TELEMETRY, HEATMAP AGGREGATION & SYSTEM HEALTH (UC-05)
*Focus: Linearizing disk usage sampling, clean SQL query accumulation for heatmaps, robust orphan file cleanup, and structured CSV/Excel export pipelines.*

*Progress update (2026-10-31, team-confirmed): implementation and test criteria for REF-05 are complete (4/4); the branch is awaiting push/merge into `main`.*

### 📌 Tasks Breakdown:
- [x] `REF-05.1` `[Layer 2 - Service]` **Refactor Heatmap Point Aggregator (`app/services/telemetry_service.py`)**
  - **Smells & Anti-patterns:** Raw SQL aggregation contains string interpolation and early return branches for different time range filters ($M = 7$).
  - **Refactoring Scope:**
    1. Phase 1 Gate: Validate `time_range` parameter against whitelist (`today`, `week`, `month`, `all`).
    2. Phase 2 Compute: Build parameterized SQLAlchemy query using date filter accumulator. Execute query and map rows to `[lat, lng, weight]` tuples.
    3. Phase 3 Exit: Single return of `HeatmapDataResponse(points=points_accumulator)`.
  - **Layer 1 Fit:** Keeps exact method signature consumed by `telemetry_controller.py` and `analytics_controller.py`.
  - **Metric Target:** $K = 2$, $M \le 5$, Nesting Depth $\le 2$.

- [x] `REF-05.2` `[Layer 2 - Service]` **Refactor Orphan Audio Pruning & Disk Storage Service (`app/services/storage_service.py`)**
  - **Smells & Anti-patterns:** Directory scanner deletes files immediately during loop iteration; early returns prevent complete audit recording of deleted files.
  - **Refactoring Scope:**
    1. Two-pass execution: Pass 1 (gather all unreferenced filenames into `orphan_candidates: list[Path]`) $\rightarrow$ Pass 2 (batch delete with try/except logging).
    2. Calculate `is_alert_triggered = usage_percent >= 80.0`.
    3. Accumulate deleted count and reclaimed bytes into single return `PruningSummaryDTO`.
  - **Metric Target:** $K = 1$, $M \le 4$.

- [x] `REF-05.3` `[Layer 2 - Service]` **Refactor Telemetry Structured Data Exporter (`app/services/export_service.py`)**
  - **Smells & Anti-patterns:** CSV generator contains mixed yield statements and scattered encoding checks.
  - **Refactoring Scope:** Standardize CSV/Excel builder into a linear pipeline: fetch records $\rightarrow$ format headers $\rightarrow$ write rows $\rightarrow$ return `StreamingResponse` with unified headers.
  - **Layer 1 Fit:** Consumed by `export_controller.py` without interface change.
  - **Metric Target:** $K \le 2$, $M \le 4$.

- [x] `REF-05.4` `[Layer 3 - Repository & Test]` **Refactor Telemetry Repository & Analytics Unit Tests (`app/repositories/telemetry_repository.py` & `test_telemetry_service.py`)**
  - **Test Smells:** Flaky datetime comparison assertions in dwell-time test cases; inline SQL mock setups.
  - **Refactoring Scope:**
    1. Refactor `TelemetryRepository.record_trigger` and `get_dwell_times` with explicit accumulator returns.
    2. Modernize unit tests with frozen mock timestamps (`freezegun` or fixed UTC datetimes).
    3. Clean up export and storage test suites to verify exact byte calculations.
  - **DoD:** 100% tests pass across telemetry, storage, and export test suites.

---

## 💳 REF-EPIC-06: DIGITAL ADMISSION PAYMENT, WEBHOOK VERIFICATION & VISITING SESSION (UC-06)
*Focus: Eliminating scattered returns in payment checkout, hardening HMAC-SHA256 webhook signature validation, deterministic 24h session creation, and harmonizing Session-Transaction foreign keys.*

### 📌 Tasks Breakdown:
- [ ] `REF-06.1` `[Layer 2 - Service]` **Refactor Payment Webhook Processor (`app/services/payment_service.py`)**
  - **Smells & Anti-patterns:** Webhook handling for PayOS and PayPal contains multiple early returns scattered across signature checking, order lookup, and duplicate event checking ($M = 8$).
  - **Refactoring Scope:**
    1. Phase 1 Gate: Verify signature via `_verify_webhook_signature(...)`. If invalid, raise `ApiError(400, INVALID_WEBHOOK_SIGNATURE)`.
    2. Phase 2 Compute: Locate transaction by `order_code`. Check if already processed (`status == 'PAID'`). If not, update status to `PAID`, record `paid_at = now()`, and invoke `session_service.create_24h_session(...)`.
    3. Phase 3 Exit: Log audit event and return single `WebhookProcessedResponse(status='SUCCESS')`.
  - **Layer 1 Fit:** Controller `payment_controller.py` calls `process_webhook(payload, signature)` unchanged.
  - **Metric Target:** $K = 2$, $M \le 5$, Nesting Depth $\le 2$.

- [ ] `REF-06.2` `[Layer 2 - Service]` **Refactor 24-Hour Session Lifecycle Manager (`app/services/session_service.py`)**
  - **Smells & Anti-patterns:** `restore_session` and `validate_session` have redundant checks for null tokens and expiration timestamps with scattered raises.
  - **Refactoring Scope:**
    1. Linearize `restore_session(restore_token)`: Phase 1 (validate 6-character format) $\rightarrow$ Phase 2 (fetch session by `session_code`, check `expire_at > now()`) $\rightarrow$ Phase 3 (return `SessionRestoreResponse`).
    2. Ensure deterministic single return for `is_session_active(token)`.
  - **Layer 1 Fit:** Methods `create_24h_session`, `restore_session`, `validate_session` preserve exact signatures for `session_controller.py`.
  - **Metric Target:** $K = 2$, $M \le 4$.

- [ ] `REF-06.3` `[Layer 3 - Integration]` **Refactor PayPal / PayOS Integration Clients (`app/integrations/paypal_client.py`)**
  - **Smells & Anti-patterns:** Scattered early returns inside request payload builders; inconsistent exception wrapping.
  - **Refactoring Scope:** Apply SISE: initialize `checkout_payload: dict` $\rightarrow$ populate order parameters linearly $\rightarrow$ execute HTTP call with standard error handling $\rightarrow$ return `PaymentGatewayResponse`.
  - **Metric Target:** $K \le 2$, $M \le 4$.

- [ ] `REF-06.4` `[Layer 3 - Repository]` **Refactor Session & Transaction Repositories (`app/repositories/session_repository.py` & `transaction_repository.py`)**
  - **Smells & Anti-patterns:** `SessionRepository.create_session` omits required `TransactionID` foreign key; `TransactionRepository` still queries dropped `SessionID` column.
  - **Refactoring Scope:**
    1. Update `SessionRepository.create_session(transaction_id, preferred_language, ...)` to supply valid `TransactionID`.
    2. Update `TransactionRepository` queries to remove references to `SessionID` column.
    3. Ensure all lookup methods (`get_by_id`, `get_by_code`, `get_by_token`) use explicit accumulator returns.
  - **Metric Target:** $K = 1$, $M \le 4$.

- [ ] `REF-06.5` `[Test - Unit Suite]` **Refactor Payment & Session Unit Tests (`tests/unit/services/test_payment_service.py` & `test_session_repository.py`)**
  - **Test Smells:** Test helper fixtures create `VisitorSession` without an associated `Transaction`, violating foreign key constraints; `Transaction` mocks with status `PAID` created without `paid_at`.
  - **Refactoring Scope:**
    1. Create standard helper fixture `_create_test_transaction(db_session, status='PAID', ...)` providing valid `paid_at` timestamp.
    2. Update session tests to link valid `transaction_id`.
    3. Restructure test assertions to clear AAA pattern.
  - **DoD:** 100% tests pass across payment controller, payment service, session controller, and session repository.

---

## 🛠️ REF-EPIC-07: CROSS-CUTTING INFRASTRUCTURE, ORM-SCHEMA DEFENSE & CI GATES
*Focus: Aligning SQLAlchemy ORM models with MySQL DDL, automating AST control flow linting, and establishing regression defense.*

### 📌 Tasks Breakdown:
- [ ] `REF-07.1` `[Layer 3 - ORM Models]` **Harmonize SQLAlchemy ORM Models with MySQL 8.0 DDL (`app/models/`)**
  - **Smells & Anti-patterns:** ORM model definitions have drifted from `mysql_schema.sql` (obsolete `POITranslation.UserName`, reversed `VisitorSession.TransactionID` foreign key, `Transaction.PayAmount` integer vs decimal).
  - **Refactoring Scope:**
    1. `app/models/translation.py`: Remove `user_name` column; add `audio_url`, `duration`, `file_size`.
    2. `app/models/session.py`: Add `transaction_id = mapped_column("TransactionID", ForeignKey("Transaction.TransactionID"))`.
    3. `app/models/transaction.py`: Remove `session_id`; update `pay_amount` to `Numeric(12, 2)`.
  - **DoD:** Models match `scripts/mysql_schema.sql` 100%; zero schema incompatibility warnings.

- [ ] `REF-07.2` `[Layer 3 - Core]` **Refactor Application Configuration Singleton (`app/core/config.py`)**
  - **Smells & Anti-patterns:** Class body mixes `os.getenv` fallbacks with calculated properties.
  - **Refactoring Scope:** Consolidate Pydantic `BaseSettings` fields into typed annotations with clear defaults. Provide single deterministic `get_settings()` singleton.
  - **Metric Target:** $K = 1$, $M \le 3$.
  - **Paired Unit Test:** `tests/unit/core/test_config.py`

- [ ] `REF-07.3` `[Backend - Linter]` **Automated AST Control Flow Audit Script (`scripts/check_sise_rules.py`)**
  - **Smells & Anti-patterns:** Manual review cannot catch 100% of newly introduced scattered returns or high cyclomatic complexity.
  - **Refactoring Scope:**
    1. Write an AST-based Python auditor using `ast` module.
    2. Traverse all function definitions in `MVP/backend/app/services/` and `app/repositories/`: count `Return` nodes ($K \le 2$) and branch complexity ($M \le 6$).
    3. Exit with non-zero code if any function violates the SISE standard.
  - **DoD:** Script runs via `python scripts/check_sise_rules.py` and passes with zero violations.

- [ ] `REF-07.4` `[CI/Test]` **End-to-End Regression Defense Suite Execution**
  - **Scope:** Run full Backend test suite against MySQL to verify that the Layer 2 & 3 refactoring introduced zero regressions.
  - **Execution Commands:**
    - `pytest MVP/backend/tests --cov=app --cov-report=term-missing --cov-fail-under=80`
    - `ruff check MVP/backend`
    - `black --check MVP/backend`
  - **DoD:** 100% tests pass (all 406 items green), coverage $\ge 80\%$, zero architectural boundary leaks.

---

## 📋 3. REFACTORING WORKFLOW & DUAL-TEST PROTOCOL

To ensure complete safety and traceability, every developer must follow this step-by-step cycle when refactoring Layer 2 & Layer 3:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. RUN PAIRED UNIT TEST (Establish baseline)                │
│    pytest tests/unit/... -v                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. REFACTOR UNIT TEST FIXTURES & MOCKS                      │
│    - Align test data with MySQL schema (e.g. TransactionID) │
│    - Refactor test helper functions to clear AAA pattern    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. REFACTOR LAYER 2 / LAYER 3 METHOD TO SISE                │
│    - Freeze public method signature (Layer 1 Invariant)     │
│    - Add Phase 1 Precondition Gate (max 1 rejection exit)   │
│    - Flatten Phase 2 linear compute to accumulator          │
│    - Provide single Phase 3 exit return                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RE-RUN PAIRED UNIT TEST (Confirm zero regressions)       │
│    All existing assertions must pass without edits.         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RUN METRIC & LINT GATES                                  │
│    - python scripts/check_sise_rules.py (M <= 6, K <= 2)    │
│    - ruff check . && black --check .                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. ATOMIC GIT COMMIT                                        │
│    git commit -m "refactor(<module>): apply SISE to <task>" │
└─────────────────────────────────────────────────────────────┘
```
