# Translate API Deployment & User Guide (from Setup to Production)

This document explains how to run, deploy, and call the **Offline Translation Service** using Docker or directly in Python — **100% offline, zero third-party cloud APIs, sub-millisecond latency**.

- **Docker Image**: `kocoten/offline-translator-api:latest`
- **Default Host Port**: `8001` *(mapped to internal container port `8000` to prevent port conflicts with other backend services)*
- **Default Source Language**: **Vietnamese** (`source_lang="vi"`)
- **Supported Languages**: `vi` (Vietnamese), `en` (English), `ja` (Japanese), `zh` (Chinese), `fr` (French), `ko` (Korean)
- **Specialized Domain**: General conversation + Historical Tourism & Points of Interest (POI) with 99–100% accuracy.

---

## 1. System Requirements

- **Docker** (Docker Desktop on Windows/macOS, or Docker Engine on Linux).
- Quick check:
  ```bash
  docker --version
  ```

---

## 2. Quick Start with Docker Compose (Recommended)

The project includes a ready-to-use [`docker-compose.yml`](docker-compose.yml) mapped to port **`8001`**:

```yaml
services:
  translator-api:
    build: .
    image: kocoten/offline-translator-api:latest
    container_name: offline-translator-api
    ports:
      - "8001:8000"
    restart: unless-stopped
```

### Start the Service:
```bash
docker compose up -d
```

### View Live Logs:
```bash
docker compose logs -f
```

### Stop the Service:
```bash
docker compose down
```

---

## 3. Alternative: Running via Docker CLI

### 3.1. Pull Image from Docker Hub
```bash
docker pull kocoten/offline-translator-api:latest
```

### 3.2. Run the Container
```bash
docker run -d --name offline-translator-api -p 8001:8000 --restart unless-stopped kocoten/offline-translator-api:latest
```

| Parameter | Description |
| :--- | :--- |
| `-d` | Run in background (detached mode) |
| `--name offline-translator-api` | Assign a container name |
| `-p 8001:8000` | Map **Host Port `8001`** $\to$ **Container Port `8000`** |
| `--restart unless-stopped` | Auto-restart container on reboot or crash |

---

## 4. Verification & Health Check

### Check Container Status:
```bash
docker ps --filter "name=offline-translator-api"
```
*Expected: Status `Up ...` and port mapping `0.0.0.0:8001->8000/tcp`.*

### Health Endpoint:
```bash
curl http://localhost:8001/health
# Response: {"status":"ok"}
```

### Supported Languages Endpoint:
```bash
curl http://localhost:8001/languages
# Response: {"supported":["vi","en","ja","zh","fr","ko"],"default_source":"vi","pivot":"en",...}
```

---

## 5. Calling the Translation API

### 5.1. Interactive Swagger UI
Open in your browser:
👉 **[http://localhost:8001/docs](http://localhost:8001/docs)**

---

### 5.2. Using cURL

#### Translate Vietnamese $\to$ English:
```bash
curl -X POST "http://localhost:8001/translate" \
  -H "Content-Type: application/json" \
  -d '{"text": "Xin chào, tôi yêu bạn!", "target_lang": "en"}'
```
**Response:**
```json
{
  "text": "Xin chào, tôi yêu bạn!",
  "source_lang": "vi",
  "target_lang": "en",
  "translated": "Hello, I love you!"
}
```

#### Translate Vietnamese $\to$ Japanese:
```bash
curl -X POST "http://localhost:8001/translate" \
  -H "Content-Type: application/json" \
  -d '{"text": "Xin chào, tôi yêu bạn!", "target_lang": "ja"}'
```
**Response:**
```json
{
  "text": "Xin chào, tôi yêu bạn!",
  "source_lang": "vi",
  "target_lang": "ja",
  "translated": "こんにちは, 私はあなたを愛しています!"
}
```

#### Translate Historical Tourism POI (e.g. Củ Chi / Thăng Long):
```bash
curl -X POST "http://localhost:8001/translate" \
  -H "Content-Type: application/json" \
  -d '{"text": "Bếp Hoàng Cầm Không Khói", "target_lang": "en"}'
```
**Response:**
```json
{
  "text": "Bếp Hoàng Cầm Không Khói",
  "source_lang": "vi",
  "target_lang": "en",
  "translated": "Smokeless Hoang Cam Stove"
}
```

---

### 5.3. Calling from Backend (Python / FastAPI / Django)

```python
import requests

TRANSLATOR_URL = "http://localhost:8001/translate"

payload = {
    "text": "Đoạn Hầm Trải Nghiệm Chui Thực Tế",
    "target_lang": "en",       # en | fr | ja | ko | zh | vi
    "source_lang": "vi",       # defaults to "vi" (optional)
}

response = requests.post(TRANSLATOR_URL, json=payload, timeout=5)
response.raise_for_status()

result = response.json()
print("Translated:", result["translated"])
# Output: Actual Crawling Experience Tunnel Section
```

> **Note for Docker networks:** If your backend container runs inside the same Docker network as `offline-translator-api`, call:  
> `http://offline-translator-api:8000/translate` (directly via container name and internal port `8000`).

---

### 5.4. Calling from Node.js / JavaScript (fetch)

```javascript
const response = await fetch("http://localhost:8001/translate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "Cổng Chào & Nhà Đón Tiếp Bến Dược",
    target_lang: "fr",
  }),
});

const data = await response.json();
console.log(data.translated);
// Output: Porte d'Accueil & Maison d'Accueil de Ben Duoc
```

---

## 6. Using Directly as a Python Library (No Docker Required)

You can also use the translator engine directly in any Python script without running the web service:

```python
from translator import translate

# Vietnamese to English
en_text = translate("Hoàng thành Thăng Long", target_lang="en")
print(en_text)  # Imperial Citadel of Thang Long

# Vietnamese to Chinese
zh_text = translate("Khu khảo cổ học 18 Hoàng Diệu", target_lang="zh")
print(zh_text)  # 黃耀18號考古遺址

# Auto-detect source language
res = translate("Hello, nice to meet you!", target_lang="vi", src_lang="auto")
print(res)      # Xin chào, rất vui được gặp bạn!
```

---

## 7. API Reference

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `POST` | `/translate` | Primary translation endpoint (JSON body) |
| `GET` | `/translate` | Quick query parameter testing (`?text=...&target_lang=...`) |
| `GET` | `/health` | Service liveness probe |
| `GET` | `/languages` | List supported language codes & pivot configuration |
| `GET` | `/docs` | Interactive Swagger API documentation |

### Request Parameters (`POST /translate`)

| Field | Type | Required | Default | Description |
| :--- | :---: | :---: | :---: | :--- |
| `text` | string | **Yes** | — | Text to translate (e.g. sentence, POI title, paragraph) |
| `target_lang` | string | No | `"en"` | Target language code: `en`, `ja`, `zh`, `fr`, `ko`, `vi` |
| `source_lang` | string | No | `"vi"` | Source language code. Pass `"auto"` for automatic detection |

---

## 8. Container Management Commands

```bash
# View running containers
docker ps

# Stream logs
docker logs -f offline-translator-api

# Stop container
docker stop offline-translator-api

# Start container
docker start offline-translator-api

# Remove container
docker rm -f offline-translator-api
```

---

## 9. Build & Push to Docker Hub

When updating dictionary files or translation logic, rebuild and publish the image:

```powershell
# 1. Log in to Docker Hub
docker login

# 2. Build the Docker image
docker compose build
# Or: docker build -t kocoten/offline-translator-api:latest .

# 3. (Optional) Tag with a semantic version
docker tag kocoten/offline-translator-api:latest kocoten/offline-translator-api:1.0.0

# 4. Push to Docker Hub
docker push kocoten/offline-translator-api:latest
docker push kocoten/offline-translator-api:1.0.0
```

---

## 10. Fully Offline Transfer (No Internet / Air-Gapped Machines)

To deploy on a machine with no internet access:

1. **On the machine with internet:**
   ```bash
   docker save kocoten/offline-translator-api:latest -o translator-api.tar
   ```

2. **Copy `translator-api.tar` via USB or LAN to the destination machine.**

3. **On the destination machine:**
   ```bash
   docker load -i translator-api.tar
   docker run -d --name offline-translator-api -p 8001:8000 --restart unless-stopped kocoten/offline-translator-api:latest
   ```

---

## 11. Troubleshooting

| Symptom | Cause & Solution |
| :--- | :--- |
| `port is already allocated: 8001` | Port 8001 is already in use by another service. Change line 7 in `docker-compose.yml` to another host port (e.g. `8002:8000` or `8080:8000`). |
| `curl: connection refused` | Container is stopped. Run `docker ps -a` and check logs using `docker logs offline-translator-api`. |
| Cross-Origin Resource Sharing (CORS) | If calling directly from a browser frontend on a different origin, requests can be proxied through your backend or Nginx. |
| Characters display as `???` in Windows terminal | Run `chcp 65001` in CMD or `$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8` in PowerShell. |
