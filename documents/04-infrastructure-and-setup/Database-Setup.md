# Smart Museum Database Setup (Docker & Cloud)

This guide provides instructions on how to set up, run, and manage the MySQL 8.0 database for the **Cu Chi Tunnels Smart Multilingual Guide** project.

---

## 🛠 Prerequisites

Before starting, ensure your local environment has the following installed:

* **Docker Desktop** (with the Docker daemon running).
* **Python 3.10+** (with virtual environment in `MVP/backend/.venv`).
* Database Management Tool (Optional): **DBeaver**, **MySQL Workbench**, or the **Database Client** extension in VS Code.

---

## 🚀 Option 1: One-Click Runner (Fastest & Recommended)

The project includes pre-configured automation scripts that automatically detect, start, or pull the official GitHub Docker image:

* **For Local Development**:
  Double-click or run:
  ```powershell
  cd MVP
  .\start-local.bat
  ```
* **For Mobile Testing (Cloudflare Tunnel HTTPS)**:
  Double-click or run:
  ```powershell
  cd MVP
  .\start-tunnel.bat
  ```

Both runners automatically inspect Docker for `smart-museum-db` and spin it up with full volume persistence if stopped or missing.

---

## 🐳 Option 2: Docker Compose

You can start only the database container using `docker-compose.yml`:

```powershell
cd MVP
docker compose up -d db
```

To stop the database:
```powershell
docker compose stop db
```

---

## 📦 Option 3: Manual Docker Run (GitHub Container Registry)

The database image is built and published automatically via GitHub Actions CI/CD to **GitHub Container Registry (GHCR)**.

### 1. Pull the Image

```bash
docker pull ghcr.io/kkons2212/software-technology-db:latest
```

### 2. Run the Container

Run the following command to initialize the container with the dedicated non-root application user, persistent data volume, and UTF-8 encoding:

#### 🔹 Windows (PowerShell):

```powershell
docker run -d -p 3306:3306 `
  --name smart-museum-db `
  -e MYSQL_DATABASE=smart_museum `
  -e MYSQL_USER=museum_app_user `
  -e MYSQL_PASSWORD=app_password_456 `
  -e MYSQL_ROOT_PASSWORD=root_secure_pass_123 `
  -v museum_mysql_data:/var/lib/mysql `
  --restart always `
  ghcr.io/kkons2212/software-technology-db:latest `
  --character-set-server=utf8mb4 `
  --collation-server=utf8mb4_unicode_ci
```

#### 🔹 macOS / Linux (Bash):

```bash
docker run -d -p 3306:3306 \
  --name smart-museum-db \
  -e MYSQL_DATABASE=smart_museum \
  -e MYSQL_USER=museum_app_user \
  -e MYSQL_PASSWORD=app_password_456 \
  -e MYSQL_ROOT_PASSWORD=root_secure_pass_123 \
  -v museum_mysql_data:/var/lib/mysql \
  --restart always \
  ghcr.io/kkons2212/software-technology-db:latest \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci
```

---

## 🔍 Verify Initialization Status

The custom Docker image packages two initialization scripts in `/docker-entrypoint-initdb.d/`:
1. `01_mysql_schema.sql` (Creates all 8 tables and constraints from `MVP/backend/scripts/mysql_schema.sql`)
2. `02_seed_data.sql` (Seeds default admins and supported languages from `MVP/backend/scripts/seed_data.sql`)

Check container logs to verify that the initialization completed:

```bash
docker logs -f smart-museum-db
```

When you see:

```text
[System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. ... port: 3306
```

Press `Ctrl + C` to exit. Your database is now ready!

---

## 🔑 Database Connection Details

### 1. Local Docker Database

Configure your `MVP/backend/.env` with the following parameters:

```env
DATABASE_URL="mysql+pymysql://museum_app_user:app_password_456@127.0.0.1:3306/smart_museum?charset=utf8mb4"
```

| Parameter | Local Docker Value |
| :--- | :--- |
| **Host / Server** | `localhost` (or `127.0.0.1`) |
| **Port** | `3306` |
| **Database Name** | `smart_museum` |
| **Username** | `museum_app_user` |
| **Password** | `app_password_456` |
| **Root Password** | `root_secure_pass_123` |

### 2. Cloud Database (Aiven Managed MySQL)

For staging/production or remote connectivity without Docker:

```env
DATABASE_URL="mysql+pymysql://avnadmin:<PASSWORD>@mysql-218752f0-self-hosting.f.aivencloud.com:21340/smart_museum?charset=utf8mb4"
```

*SSL Mode is automatically negotiated with TLS over port 21340.*

---

## 👥 Pre-Seeded Default Accounts & Languages

The initial seed provides the following baseline records:

### 1. Administrator Accounts (Cost factor >= 12 Bcrypt hash)
* **Default Password**: `Admin@12345`

| Username | Email | Full Name | Status |
| :--- | :--- | :--- | :---: |
| `admin` | `admin@cuchi.vn` | Quản trị viên Hệ thống | Active |
| `admin1` | `admin1@cuchi.vn` | Quản trị viên Hệ thống 1 | Active |
| `admin2` | `admin2@cuchi.vn` | Quản trị viên Hệ thống 2 | Active |

### 2. Supported Languages Catalog
* `vi` (Tiếng Việt)
* `en` (English)
* `ja` (日本語)
* `ko` (한국어)
* `fr` (Français)
* `zh` (中文)

*All other tables (`POI`, `POITranslation`, `VisitorSession`, `POITrigger`, `Transaction`, `Audit`) are initialized with 0 records.*

---

## ⚡ Useful Maintenance Commands

* **Stop the Database:**
  ```bash
  docker stop smart-museum-db
  ```

* **Start the Database:**
  ```bash
  docker start smart-museum-db
  ```

* **Completely Reset Local Database (Wipe & Re-seed from Image):**
  ```powershell
  docker stop smart-museum-db
  docker rm smart-museum-db
  docker volume rm museum_mysql_data
  ```
  *(Running `start-local.bat` again will re-create a clean database seeded from scratch).*

* **Manually Re-run Schema & Seed via Python:**
  From `MVP/backend`:
  ```powershell
  .\.venv\Scripts\python.exe scripts/seed_admin.py
  ```

  *(Running `start-local.bat` again will re-create a clean database seeded from scratch).*

* **Manually Re-run Schema & Seed via Python:**
  From `MVP/backend`:
  ```powershell
  .\.venv\Scripts\python.exe scripts/seed_admin.py
  ```