# Project Overview & Architecture

## 1. Tech Stack

### Frontend & Client
* **Framework:** React.js (Mobile-first Web Application / PWA)
* **Interactive Mapping:** OpenStreetMap.js (Leaflet / MapLibre GL integration)

### Backend & API
* **Framework:** Python FastAPI (Structured using 3-Layer Architecture: Router -> Service -> Repository)
* **Database:** SQLite (MVP / Initial phase) / PostgreSQL (Production ready)

### AI Services & Media Pipeline
* **Text Translation:** `deep-translator` / Google Translate API integration
* **Text-to-Speech (TTS):** Python `edge-tts` library (Pre-rendered and cached MP3 static files)

### Infrastructure & Deployment
* **Containerization:** Docker & Docker Compose (To be confirmed with Instructor)
* **Storage & Caching:** Local Static File Server / Caching for pre-generated audio

---
## 2. Core Features

1. **QR Code POI Access:** Visitors scan QR codes placed at exhibits or galleries to access localized content and audio guides without downloading an application.
2. **Interactive Map & Route Guidance:** Recommended exhibit sequences and walking directions powered by OpenStreetMap.js to guide visitors through rooms.
3. **Automated Translation & Audio Pipeline:** Background pipeline translating exhibit text into 15+ languages and generating natural voice audio using `edge-tts`.
4. **Centralized Exhibit Database:** Structured storage for localized text descriptions, QR code mappings, audio file URLs, and thumbnail images.
5. **Admin Management Dashboard:** Web interface allowing museum personnel to manage exhibits, review AI-translated text, and upload media files.
6. **System Health & Usage Monitoring:** Basic logging and monitoring interface to observe server loads, traffic, and visitor usage analytics.

---
## 3. User Stories

### Museum Visitor & Tourist
* **US01 - Instant QR Code Access:** As a museum visitor, I want to scan QR codes placed at exhibits using my smartphone browser, so that I can immediately access localized content and audio guides without downloading an application.
* **US02 - Interactive Map & Route Guidance:** As a museum visitor, I want to view an interactive map with recommended walking routes, so that I can easily navigate through rooms and locate specific exhibits.
* **US03 - Multilingual Audio Guides:** As an international tourist, I want to read and listen to exhibit descriptions in my native language, so that I can fully understand the historical and cultural context of each artifact.

### Museum Staff & Curator
* **US04 - Content & Media Management:** As a museum staff member, I want to manage exhibit information, QR code mappings, and media files through an admin dashboard, so that visitor-facing content is always organized and up to date.
* **US05 - AI Translation & Audio Review:** As a museum curator, I want to review and edit AI-generated text translations before they are pre-rendered into audio, so that the published guide maintains high translation accuracy.

### System Administrator
* **US06 - System Health & Analytics Monitoring:** As a system administrator, I want to monitor server load, traffic patterns, and visitor analytics on a dashboard, so that I can ensure system performance and reliability during peak operating hours.