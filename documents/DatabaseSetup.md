# Smart Museum Database Setup (Docker)

This guide provides instructions on how to pull and run the pre-packaged MySQL database for the **Cu Chi Tunnels Smart Multilingual Guide** project using Docker.

## 🛠 Prerequisites

Before starting, ensure your local environment has the following installed:

* **Docker Desktop** (with the Docker daemon running).
* Database Management Tool (Optional): **DBeaver**, **MySQL Workbench**, or the **Database** extension in VS Code.

## 🚀 Quick Start

### 1. Pull the Image

Open your Terminal / PowerShell and run the following command to download the image from Docker Hub:

```bash
docker pull kocoten/smart-museum-db:v1
```

### 2. Run the Container with a Non-Root User (Recommended)

Run the following command to initialize the container with a standard user account specifically dedicated for Backend application connections:

#### 🔹 Windows (PowerShell / Command Prompt):

```powershell
docker run -d -p 3306:3306 --name smart_museum_db -e MYSQL_ROOT_PASSWORD=root_secure_pass_123 -e MYSQL_USER=museum_app_user -e MYSQL_PASSWORD=app_password_456 -e MYSQL_DATABASE=smart_museum kocoten/smart-museum-db:v1
```

#### 🔹 macOS / Linux (Bash Terminal):

```bash
docker run -d \
  -p 3306:3306 \
  --name smart_museum_db \
  -e MYSQL_ROOT_PASSWORD=root_secure_pass_123 \
  -e MYSQL_USER=museum_app_user \
  -e MYSQL_PASSWORD=app_password_456 \
  -e MYSQL_DATABASE=smart_museum \
  kocoten/smart-museum-db:v1
```

> **Note:** You can freely customize `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, and `MYSQL_PASSWORD` to your own preferences when running the command for the first time.

## 🔍 Verify Initialization Status

Because the container automatically executes the schema (`schema.sql`) on its initial run, check the logs to verify that the database is ready:

```bash
docker logs -f smart_museum_db
```

When you see the following line near the end of the log output:

```text
[System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. ... port: 3306
```

Press `Ctrl + C` to exit the log view. Your database is now fully initialized!

## 🔑 Database Connection Details

Use the following parameters to configure your Backend application (`appsettings.json`, `.env`, etc.) or GUI client (DBeaver, Workbench):

| Parameter | Value |
| ----- | ----- |
| **Host / Server** | `localhost` (or `127.0.0.1`) |
| **Port** | `3306` |
| **Database Name** | `smart_museum` |
| **Username** | `museum_app_user` *(or your custom `-e MYSQL_USER` value)* |
| **Password** | `app_password_456` *(or your custom `-e MYSQL_PASSWORD` value)* |

## ⚡ Useful Container Commands

* **Stop the Database:**
  ```bash
  docker stop smart_museum_db
  ```

* **Start a Stopped Database:**
  ```bash
  docker start smart_museum_db
  ```

* **Remove Container (to start fresh):**
  ```bash
  docker rm -f smart_museum_db
  ```