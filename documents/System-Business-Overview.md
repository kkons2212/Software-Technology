# System Business Overview
## Business Scope Matrix

> **Project:** Smart Museum Multilingual AI Audio Guide & Navigation System  
> **Document Purpose:** High-level operational scope breakdown mapping business themes, functional epics, referenced use cases, detailed user story identifiers, and core strategic objectives.

---

### Scope Breakdown Matrix

| Theme (Business Domain) | Epic (Referenced Use Case ID) | Detailed User Story Codes | Epic Business Objectives |
| :--- | :--- | :--- | :--- |
| **Theme 1: System Governance, Security & Access Control** | **Epic 01: Identity Authentication & Role-Based Access Control**<br>*(UC-02)* | • US02.1<br>• US02.2<br>• US02.3 | Establish a robust administrative security perimeter: Authenticate staff via cryptographic password hashing (Bcrypt/Argon2id), enforce anti-brute-force rate limiting (temporary 15-min lockout after 5 failed attempts), maintain secure session lifetimes (60 mins), and route personnel to role-specific workspaces (Admin / Curator / Staff). |
| **Theme 2: Exhibit Cataloging & Spatial Positioning** | **Epic 02: Exhibit & POI Catalog Management**<br>*(UC-03)* | • US03.1<br>• US03.2<br>• US03.3 | Standardize and centralize the digital heritage asset catalog: Create, update source exhibit records (Vietnamese), high-resolution imagery, and floor designations; support exhibit deletion with cascade purging (Cascade Deletion) of dependent translations and audio files to preserve database integrity. |
| | **Epic 03: GPS Geofence Positioning & Proximity Calibration**<br>*(UC-04)* | • US04.1<br>• US04.2<br>• US04.3 | Digitize physical grounds for automated spatial detection: Enable staff to visually pin/drag GPS coordinates (latitude, longitude) on interactive maps, calibrate proximity geofence trigger radii (default 30m) for automated visitor detection, validate site perimeter boundaries, and refresh routing caches. |
| **Theme 3: Multilingual AI Automation & Curatorial Review** | **Epic 04: Automated Multilingual Translation & Voice Synthesis**<br>*(UC-07 & UC-08)* | • US07.1<br>• US08.1<br>• US08.2<br>• US08.3 | Automate multilingual content production: Ingest source descriptions and dispatch asynchronous translation jobs across 4 target languages (`en`, `ja`, `ko`, `zh`) with exponential backoff retries; synthesize natural `.mp3` audio files via AI Neural TTS; validate text hashes (Text Hashing) to reuse cached audio (Audio Cache Hit); and provide browser-based Web Speech API fallback upon offline outages. |
| | **Epic 05: Curatorial Review, Linguistic Curation & Publishing**<br>*(UC-05)* | • US05.1<br>• US05.2<br>• US05.3 | Serve as quality control checkpoint for historical and cultural accuracy: Provide tools for Curators to audit translations, preview audio files, refine scholarly terminology (automatically flagging audio for re-synthesis), and grant final publication approval (`Published`) before content is synchronized to visitors. |
| **Theme 4: Visitor Services, Digital Payment & On-Site Navigation** | **Epic 06: Digital Admission Payment & Tour Session Activation**<br>*(UC-09)* | • US09.1<br>• US09.2<br>• US09.3 | Commercialize smart tour services and eliminate revenue loss: Allow visitors to purchase digital admission passes via domestic VietQR or international cards (PayOS / Stripe); process automated Webhook confirmations to activate 24-hour Visiting Sessions, decrypt audio guides, and enable session recovery via Session Codes. |
| | **Epic 07: Interactive Map, GPS Geofencing & Smart Wayfinding**<br>*(UC-01)* | • US01.1<br>• US01.2<br>• US01.3<br>• US01.4 | Optimize on-site self-guided exploration: Render interactive site maps displaying the visitor's real-time GPS position; automatically trigger voice narrations upon entering an exhibit's GPS Geofence Radius; plot dynamic Recommended Walking Routes to sequential exhibits; and enable interactive tapping on preview cards. |
| **Theme 5: Operational Analytics, Field Telemetry & System Health** | **Epic 08: Visitor Flow Analytics & Spatial Telemetry**<br>*(UC-06)* | • US06.1<br>• US06.2<br>• US06.3 | Provide actionable operational intelligence: Render real-time visitor density heatmaps, track hourly GPS proximity triggers, rank top-visited artifacts, evaluate average dwell times, analyze international language demographics, and export analytics logs to CSV/JSON formats. |
| | **Epic 09: Infrastructure Health Monitoring & System Diagnostics**<br>*(UC-06)* | • US06.4<br>• US06.5<br>• US06.6 | Ensure high system availability and technical resilience: Monitor telemetry API latency, 4G/5G mobile audio streaming throughput, database query efficiency; track audio cache storage with automated visual alerts (>85% capacity); and monitor external AI service availability with live auto-refresh modes. |

---

### Scope Summary Statistics

* **Themes:** 5 Core Business Domains
* **Epics:** 9 Structured Operational Frameworks (Directly referencing Use Cases UC-01 through UC-09)
* **Detailed User Stories:** 27 User Stories specifying functional requirements, user behaviors, and acceptance criteria
