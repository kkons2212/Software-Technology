Frontend:

Using UC-1, 2

Backend:

Using UC-8, 9

Use case that build minimum for at least running:

UC-4, 5

tech stack: (can be edit/ remove any component if not suitable)

1. Infrastructure & Operations
Docker & Docker Compose: Containerizes the Python Backend and Cloudflare Tunnel into isolated, reproducible services. Uses Docker Volumes to ensure persistent storage for SQLite data and generated .mp3 files across container restarts.

Cloudflare Tunnel (cloudflared): Establishes a secure, public HTTPS tunnel allowing real mobile devices to access the local app via QR code scans without intermediate browser warning pages.

Node.js & npm: Development runtime environment used to build and serve the ReactJS Frontend on the host machine.

2. Backend Stack & Execution Model (requirements.txt)
fastapi: Asynchronous Python web framework for constructing RESTful endpoints (/api/poi/{id}) and mounting static asset directories.

FastAPI BackgroundTasks: Native asynchronous execution mechanism used to offload translation (UC-08) and audio synthesis (UC-09) to non-blocking background threads. Returns instant HTTP 200 OK responses to client requests without freezing the UI.

uvicorn: High-performance ASGI web server used to execute the FastAPI application inside the Docker container.

deep-translator: Python library connecting to Google Translate API (without requiring an API key) to translate POI content into target languages (EN, JA, KO, ZH) for UC-08.

edge-tts: Asynchronous library interfacing with Microsoft Edge Speech Engine to synthesize natural-sounding .mp3 audio files for UC-09.

qrcode & Pillow: Image processing utilities used to dynamically generate .png QR code images pointing to POI detail URLs for UC-05.

3. Frontend Stack (Mobile-First Web App)
ReactJS + Vite: Fast Single Page Application (SPA) setup optimized for mobile browser rendering and lightweight user interactions.

Vite Dev Server Proxy: Forwards client requests containing /api and /static from Port 5173 (FE) to Port 8000 (Docker BE), resolving CORS issues over a single public tunnel.

Tailwind CSS + Lucide React: Utility-first CSS framework combined with SVG icons to quickly build a responsive Audio Player UI and Language Switcher component.

React Router DOM: Client-side routing library handling dynamic URL parameters parsed from scanned QR codes (/poi/:id).

4. Database & Concurrency Strategy
SQLite (WAL Mode): Lightweight, file-based relational database configured with PRAGMA journal_mode=WAL; (Write-Ahead Logging). Enables non-blocking concurrent reads from mobile visitor requests while background tasks execute database writes.

Docker Volume: Mounts the ./backend/static/ directory (containing .mp3 audio and .png QR files) and data.db to the host filesystem to prevent data loss upon container teardowns.

update on 9-22-2026 19:23 PM

@kkons2212 @phamquang10102006-hash 