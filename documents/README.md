# CU CHI TUNNELS SMART AUDIO GUIDE SYSTEM — DOCUMENTATION
## Smart Multilingual Audio Guide & Interactive Map System

Welcome to the central technical documentation hub for the **Smart Multilingual Audio Guide & Exhibit Management System**.  
All documents are organized following standard software engineering layers, clearly categorized by role and development lifecycle.

---

## 🗺️ 1. ROLE-BASED ONBOARDING

| Your Role | Recommended Reading Order | Key Objectives |
|---|---|---|
| **Product Manager / Business Analyst** | 1. [`PRD.md`](./01-requirements/PRD.md)<br/>2. [`use-cases/`](./01-requirements/use-cases/) | Understand business goals, 23 User Stories, the 2-actor model, and acceptance scope. |
| **Software Architect / Tech Lead** | 1. [`System-Architecture.md`](./02-architecture-and-mapping/System-Architecture.md)<br/>2. [`Database-Schema-ERD.md`](./02-architecture-and-mapping/Database-Schema-ERD.md)<br/>3. [`DFD.md`](./02-architecture-and-mapping/DFD.md)<br/>4. [`Code-mapping.md`](./02-architecture-and-mapping/Code-mapping.md) | Understand overall system architecture, 8 DB tables, 3-layer data flow, and source code mapping matrix. |
| **Backend / Frontend Developer** | 1. [`Code-mapping.md`](./02-architecture-and-mapping/Code-mapping.md) ([VI](./02-architecture-and-mapping/Code-mapping-vi.md))<br/>2. [`dev-rules.md`](./03-guidelines/dev-rules.md)<br/>3. [`refactor-rules.md`](./03-guidelines/refactor-rules.md)<br/>4. [`API-Documentation.md`](./02-architecture-and-mapping/API-Documentation.md) | Understand codebase structure, naming conventions, SISE rules ($M \le 6, K \le 2$), and API contracts. |
| **UI / UX Designer** | 1. [`ui-rules.md`](./03-guidelines/ui-rules.md)<br/>2. [`ux-rules.md`](./03-guidelines/ux-rules.md) | Master outdoor mobile PWA design standards, color palette, Tailwind CSS, and accessibility rules. |
| **DevOps / SysAdmin** | 1. [`Database-Setup.md`](./04-infrastructure-and-setup/Database-Setup.md)<br/>2. [`Translation-Setup.md`](./04-infrastructure-and-setup/Translation-Setup.md)<br/>3. [`Payment-Setup.md`](./04-infrastructure-and-setup/Payment-Setup.md)<br/>4. [`Deployment-Plan.md`](./04-infrastructure-and-setup/Deployment-Plan.md) | Provision Docker environments, configure payment gateways, AI translation, TTS, and deployment pipelines. |
| **QA / Tester / Scrum Master** | 1. [`tasks.md`](./05-tasks-and-sprints/tasks.md)<br/>2. [`refactor-tasks.md`](./05-tasks-and-sprints/refactor-tasks.md) | Track Sprint WBS progress, 1-to-1 unit test matrices, and Definition of Done (DoD) criteria. |
| **AI Coding Agent / Copilot** | 1. [`Code-mapping(for-agent).md`](./02-architecture-and-mapping/Code-mapping(for-agent).md) | Rapidly locate source files, configuration constants, bug fix targets, and impact matrices. |

---

## 📂 2. DETAILED DIRECTORY STRUCTURE

### 📌 [01-requirements/](./01-requirements/) — Product Requirements & Use Cases
* [`PRD.md`](./01-requirements/PRD.md): Comprehensive Product Requirements Document (Business Context, 23 User Stories, Component Diagram, Deployment Diagram).
* [`UC-FRAME.md`](./01-requirements/UC-FRAME.md): Standard Use Case specification template.
* **[use-cases/](./01-requirements/use-cases/):** Detailed specifications for the 6 active Use Cases:
  * [`UC-01-interactive-map.md`](./01-requirements/use-cases/UC-01-interactive-map.md): Interactive map, outdoor GPS tracking & route navigation.
  * [`UC-02-admin-auth.md`](./01-requirements/use-cases/UC-02-admin-auth.md): Admin authentication, session protection & brute-force prevention.
  * [`UC-03-poi-catalog.md`](./01-requirements/use-cases/UC-03-poi-catalog.md): Digital POI exhibit catalog, geofence zones & cover image uploads.
  * [`UC-04-translation-tts.md`](./01-requirements/use-cases/UC-04-translation-tts.md): Multilingual AI translation & Edge-TTS audio synthesis.
  * [`UC-05-analytics-telemetry.md`](./01-requirements/use-cases/UC-05-analytics-telemetry.md): Telemetry collection, density heatmaps & system health monitoring.
  * [`UC-06-digital-payment.md`](./01-requirements/use-cases/UC-06-digital-payment.md): Digital ticket payment & 24-hour visitor session activation.

---

### 🏛️ [02-architecture-and-mapping/](./02-architecture-and-mapping/) — System Architecture & Code Mapping
* [`System-Architecture.md`](./02-architecture-and-mapping/System-Architecture.md): Cloud deployment architecture (Vercel CDN + Render Backend + Aiven MySQL + Supabase Storage).
* [`Database-Schema-ERD.md`](./02-architecture-and-mapping/Database-Schema-ERD.md): Detailed database schema, DDL, and MySQL 8.0 InnoDB ERD (8 tables).
* [`DFD.md`](./02-architecture-and-mapping/DFD.md): Global Data Flow Diagrams (Level 0, Level 1, and Level 2 per module).
* [`API-Documentation.md`](./02-architecture-and-mapping/API-Documentation.md): RESTful API contract specifications (Requests, Responses, Rate Limits, Auth Gates).
* [`Visitor-Sequence-Diagram.md`](./02-architecture-and-mapping/Visitor-Sequence-Diagram.md): End-to-end visitor journey sequence diagram.
* **Codebase Navigation Triad:**
  * [`Code-mapping.md`](./02-architecture-and-mapping/Code-mapping.md): Detailed source code mapping in English (Source of Truth).
  * [`Code-mapping-vi.md`](./02-architecture-and-mapping/Code-mapping-vi.md): Detailed source code mapping in Vietnamese with domain explanations.
  * [`Code-mapping(for-agent).md`](./02-architecture-and-mapping/Code-mapping(for-agent).md): Compact codebase mapping optimized for AI Agent line-level lookups.
* [`assets/component_diagram.jpg`](./02-architecture-and-mapping/assets/component_diagram.jpg): High-level system Component Diagram.

---

### 📏 [03-guidelines/](./03-guidelines/) — Engineering Standards & UI/UX Rules
* [`dev-rules.md`](./03-guidelines/dev-rules.md): Mandatory engineering standards: 3-tier architecture, 2-actor model, JIT DB connections, `# SECURITY-INVARIANT`, `# PERF-CRITICAL`, and `# FALLBACK-LOGIC` tags.
* [`refactor-rules.md`](./03-guidelines/refactor-rules.md): Single Intent Structured Exit (SISE) rules, Cyclomatic Complexity $M \le 6$, maximum 2 exit points ($K \le 2$).
* [`ui-rules.md`](./03-guidelines/ui-rules.md): User interface rules, Tailwind color palettes, typography, and mobile responsiveness.
* [`ux-rules.md`](./03-guidelines/ux-rules.md): Outdoor field UX rules, audio anti-repetition, and offline resilience feedback.

---

### ⚙️ [04-infrastructure-and-setup/](./04-infrastructure-and-setup/) — Environment Setup & Deployment
* [`Database-Setup.md`](./04-infrastructure-and-setup/Database-Setup.md): Initializing MySQL 8.0 via Docker Compose or connecting to Aiven Cloud.
* [`Payment-Setup.md`](./04-infrastructure-and-setup/Payment-Setup.md): Configuring VietQR (PayOS) secret keys and PayPal Sandbox environments.
* [`Translation-Setup.md`](./04-infrastructure-and-setup/Translation-Setup.md): Configuring automated translation (Render OPUS-MT / OpenRouter) and Microsoft Edge-TTS voices.
* [`Deployment-Plan.md`](./04-infrastructure-and-setup/Deployment-Plan.md): Release plan and deployment workflows for Vercel Edge and Render Web Services.

---

### 📊 [05-tasks-and-sprints/](./05-tasks-and-sprints/) — Sprint Planning & Task Tracking
* [`tasks.md`](./05-tasks-and-sprints/tasks.md): Work Breakdown Structure (WBS) covering 23 User Stories, 92 engineering tasks, and 1-to-1 unit test mappings ($\ge 80\%$ coverage).
* [`refactor-tasks.md`](./05-tasks-and-sprints/refactor-tasks.md): Breakdown of 31 Layer 2 (Service) & Layer 3 (Repository) refactoring tasks complying with SISE.

---

### 📦 [archive/](./archive/) — Archived & Deprecated Documents
Contains legacy design documents or out-of-scope features preserved for historical reference while keeping the active workspace clean:
* [`UC-07(removed).md`](./archive/UC-07(removed).md) & [`UC-08(removed).md`](./archive/UC-08(removed).md): Removed Use Cases.
* [`DEPRECATED_SYSTEM_CONTROL_MAP.md`](./archive/DEPRECATED_SYSTEM_CONTROL_MAP.md): Legacy control map (superseded by `Code-mapping.md`).
* [`DEPRECATED_SYSTEM_MAPPING.md`](./archive/DEPRECATED_SYSTEM_MAPPING.md): Legacy system analysis map.
* [`DEPRECATED_MVP-Codebase-Mapping.md`](./archive/DEPRECATED_MVP-Codebase-Mapping.md) & [`DEPRECATED_DOC_MVP-Codebase-Mapping.md`](./archive/DEPRECATED_DOC_MVP-Codebase-Mapping.md): Legacy codebase mappings.
