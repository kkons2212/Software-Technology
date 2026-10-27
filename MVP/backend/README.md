# Visitor API

The visitor API implements the public language catalog and map POI endpoints.
It follows the controller → service → repository → database structure and uses
the MySQL schema in `scripts/mysql_schema.sql`.

## Run locally with the Docker database

1. Start Docker Desktop, then create the MySQL container using the project
   database image. The image initializes the schema on its first start:

   ```powershell
   docker pull kocoten/smart-museum-db:v1
   docker run -d -p 3306:3306 --name smart_museum_db `
     -e MYSQL_ROOT_PASSWORD=root_secure_pass_123 `
     -e MYSQL_USER=museum_app_user `
     -e MYSQL_PASSWORD=app_password_456 `
     -e MYSQL_DATABASE=smart_museum `
     kocoten/smart-museum-db:v1
   ```

   Wait until MySQL reports that it is ready:

   ```powershell
   docker logs -f smart_museum_db
   ```

   Stop following the logs with `Ctrl+C` after you see that MySQL is ready for
   connections. The Docker image runs the database initialization itself; you
   do not need to run `scripts/mysql_schema.sql` manually for a fresh database.

2. In a second PowerShell window, install and start the backend. Use the Python
   version specified by the backend requirements:

   ```powershell
   cd MVP\backend
   python -m pip install -r requirements.txt
   $env:DATABASE_URL = "mysql+pymysql://museum_app_user:app_password_456@localhost:3306/smart_museum"
   $env:CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
   python -m uvicorn app.main:app --reload --port 8000
   ```

3. In `MVP/frontend`, set `VITE_API_BASE_URL=http://localhost:8000` in the
   frontend environment before starting Vite, then run `npm.cmd run dev`.

This starts the MySQL database in Docker, but runs the MVP backend and frontend
as local development processes. The existing `POC/docker-compose.yml` belongs
to the legacy proof-of-concept folder and does not run the MVP stack.

Interactive API documentation is available at `http://localhost:8000/docs`.

## Endpoints

- `GET /api/v1/languages` returns languages that have at least one active POI
  with a `PUBLISHED` translation and `READY` audio.
- `GET /api/v1/pois` returns active map POIs using their source-language text.
- `GET /api/v1/pois?language=en` returns active POIs with a `PUBLISHED`
  translation and `READY` audio for that language.

The language-specific POI response contains map summaries and coordinates only;
it does not expose full narration or audio URLs. The API does not create tables
or sample content automatically: apply the project schema and populate it with
published content before testing against MySQL.

To add repeatable visitor-map demo content to the running project database, run
this from the repository root in PowerShell:

```powershell
$OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Get-Content -Raw -Encoding UTF8 MVP\backend\scripts\seed_demo.sql |
  docker exec -i smart_museum_db mysql --default-character-set=utf8mb4 -umuseum_app_user -papp_password_456 smart_museum
```

The seed script adds four demo POIs and published, audio-ready demo entries for
Vietnamese, English, Japanese, and Korean. It only inserts or updates records
whose IDs begin with `DEMO`; its audio URLs are placeholders, not playable
narrations.

Run the backend tests from this directory with `python -m pytest`. The suite
runs against the MySQL container above (`smart_museum`): each test opens its own
transaction, which is always rolled back, so existing development data is never
modified. Start the container before running the tests.
