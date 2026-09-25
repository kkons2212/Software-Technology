# Smart Museum — AI Audio Guide & Navigation POC

> **Proof of Concept** — An intelligent museum audio guide and navigation system supporting 5 languages (Vietnamese, English, Japanese, Korean, Chinese) with automatic translation and AI-powered text-to-speech.

---

## Project Structure

```
POC/
├── backend/                  # FastAPI + SQLite + Edge-TTS
│   ├── app/
│   │   ├── routers/          # API endpoints (admin, visitor, poi...)
│   │   ├── services/         # TTS, translation, QR logic
│   │   ├── repositories/     # Database queries
│   │   ├── schemas/          # Pydantic models
│   │   └── database.py       # SQLite connection (WAL mode)
│   ├── config.py             # Global configuration
│   ├── main.py               # FastAPI entry point
│   └── requirements.txt
├── frontend/                 # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── pages/
│   │   │   ├── visitor/      # Visitor UI (Welcome, POI Detail, Map)
│   │   │   └── admin/        # Admin dashboard
│   │   ├── components/       # AudioPlayer, LanguageModal, MapPicker...
│   │   ├── context/          # VisitorSessionContext (language, session)
│   │   ├── i18n/             # UI translations (visitorTranslations.js)
│   │   └── services/         # API clients (visitorApi.js, adminApi.js)
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## System Requirements

| Tool | Min Version | Check |
|---|---|---|
| **Python** | 3.10+ | `python --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | Bundled with Node.js |
| **Git** | any | To clone the repo |
| **Internet** | Required | Edge-TTS and Google Translate require a network connection |

---

## Getting Started (Local Development)

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

---

### 2. Backend Setup (Python / FastAPI)

```bash
cd backend

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Windows (CMD):
.\.venv\Scripts\activate.bat
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Start the Backend

```bash
# Inside the backend/ directory, with .venv activated:
uvicorn main:app --reload --port 8000
```

The backend will be running at: **http://localhost:8000**  
Swagger API docs: **http://localhost:8000/docs**

> **First run:** The SQLite database (`backend/data/data.db`) and the static folders (`static/audio/`, `static/qr/`, `static/images/`) are created automatically.

---

### 3. Frontend Setup (React / Vite)

Open a **new terminal** (keep the backend running):

```bash
cd frontend

# Install Node.js packages
npm install

# Start the development server
npm run dev
```

The frontend will be running at: **http://localhost:5173**

---

### 4. Open in Browser

| URL | Description |
|---|---|
| `http://localhost:5173/` | Visitor UI — audio guide & navigation |
| `http://localhost:5173/admin` | Admin dashboard — manage POIs |
| `http://localhost:8000/docs` | Interactive API documentation (Swagger) |

---

## Environment Variables (Optional)

Create a `.env` file inside the `backend/` directory to override defaults:

```env
# SQLite database path (default: backend/data/data.db)
DATABASE_URL=./data/data.db

# Static files directory (default: backend/static)
STATIC_DIR=./static

# Languages to auto-translate into (default: en,ja,ko,zh)
TARGET_LANGUAGES=en,ja,ko,zh

# Frontend base URL used for QR code generation (default: http://localhost:5173)
FRONTEND_BASE_URL=http://localhost:5173
```

---

## Docker (Optional)

If you have Docker installed:

```bash
# From the root POC/ directory
docker-compose up --build
```

| Service | URL |
|---|---|
| Backend | http://localhost:8000 |
| Frontend | http://localhost:5173 |

---

## User Flows

### Visitor
1. Open `http://localhost:5173` → select a language
2. Scan the QR code on an exhibit → opens the POI detail page
3. Listen to the AI-generated audio guide in the selected language
4. Use the interactive floor map to navigate the museum

### Admin
1. Open `http://localhost:5173/admin`
2. Add / edit / delete POIs (exhibits)
3. Enter a Vietnamese description → the system auto-translates into the other 4 languages
4. Generate TTS audio files and QR codes directly from the UI

---

## Key Features

| Feature | Description |
|---|---|
| AI Text-to-Speech | Microsoft Edge TTS voices — VI, EN, JA, KO, ZH |
| Auto Translation | Google Translate integration |
| Interactive Floor Map | SVG-based map with floor switching |
| Locked / Unlocked Content | Full description revealed only after scanning QR |
| QR Code Generator | Auto-generate and manage QR codes per exhibit |
| Language Selection Modal | Choose language on first visit; switch anytime |

---

## Tech Stack

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) — High-performance Python web framework
- [SQLite](https://www.sqlite.org/) — Lightweight database with WAL mode
- [Edge-TTS](https://github.com/rany2/edge-tts) — Free Microsoft Neural TTS
- [deep-translator](https://github.com/nidhaloff/deep-translator) — Multi-engine translation library

**Frontend:**
- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) — UI framework & build tool
- [TailwindCSS 3](https://tailwindcss.com/) — Utility-first CSS
- [React Router v6](https://reactrouter.com/) — Client-side routing
- [Lucide React](https://lucide.dev/) — Icon library

---

## Troubleshooting

**Backend fails to start:**
```bash
# Make sure .venv is activated
.\.venv\Scripts\Activate.ps1
# Reinstall dependencies
pip install -r requirements.txt
```

**Frontend cannot connect to the API:**
- Ensure the backend is running at `http://localhost:8000`
- Check `frontend/src/services/` — the API base URL must point to `http://localhost:8000`

**Edge-TTS audio generation fails:**
- Check your internet connection (Edge-TTS requires network access)
- Verify the package: `python -c "import edge_tts; print('OK')"`

**`UNIQUE constraint` error when adding a POI:**
- A POI with that ID already exists — use the **Edit** action instead of **Add New**

---

## Use Case Documentation

See the UC files in the project root for detailed use case specifications:

| File | Description |
|---|---|
| `UC-1.md` | Auto audio guide via QR scan |
| `UC-2.md` | Smart in-museum navigation |
| `UC-4.md` | Multilingual content management |
| `UC-5.md` | QR code generation |
| `UC-8.md` | Admin dashboard |
| `UC-9.md` | Text-to-Speech pipeline |
| `ERD.md` | Entity Relationship Diagram & Database Design |

---

> This project is a **Proof of Concept** developed for internal demonstration purposes.
