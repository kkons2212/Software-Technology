# Translate API Deployment Guide (from Pull to Calling)

This document explains how to obtain the **pre-built** Docker image from Docker Hub and call the
translation API on any machine — **no source code required, no Internet needed at runtime**.

- Image: `kocoten/offline-translator-api:latest`
- Default port: `8000`
- Default source language: **Vietnamese** (`source_lang="vi"`)
- Target languages: `en` | `ja` | `zh` | `fr` | `ko` | `vi`

---

## 1. Requirements

- The target machine has **Docker** installed (Docker Desktop on Windows/macOS, or `docker.io` on Linux).
- Quick check:

```bash
docker --version
```

---

## 2. Pull the image

```bash
docker pull kocoten/offline-translator-api:latest
```

> If the repository is **private**, log in before pulling:
> ```bash
> docker login
> ```

Verify the image is available locally:

```bash
docker images kocoten/offline-translator-api
```

---

## 3. Run the container

```bash
docker run -d \
  --name translator-api \
  -p 8000:8000 \
  --restart unless-stopped \
  kocoten/offline-translator-api:latest
```

Parameter reference:

| Parameter | Meaning |
| --- | --- |
| `-d` | Run detached (in the background) |
| `--name translator-api` | Name the container for easier management |
| `-p 8000:8000` | Map host port `8000` → container port `8000` |
| `--restart unless-stopped` | Restart automatically when the machine reboots |

---

## 4. Verify it is running

```bash
docker ps --filter "name=translator-api"
```

Expected: a line with status `Up ...` and `0.0.0.0:8000->8000/tcp`.

Check that the service is alive:

```bash
curl http://localhost:8000/health
# => {"status":"ok"}
```

List supported languages:

```bash
curl http://localhost:8000/languages
# => {"supported":["vi","en","ja","zh","fr","ko"],"default_source":"vi","pivot":"en", ...}
```

---

## 5. Call the API

### 5.1. Swagger UI (try it directly in the browser)

Open: `http://localhost:8000/docs`

> When calling from another machine, replace `localhost` with the **IP of the machine running the container**.

### 5.2. curl

```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Xin chào, tôi yêu bạn!","target_lang":"ja"}'
```

Response:

```json
{
  "text": "Xin chào, tôi yêu bạn!",
  "source_lang": "vi",
  "target_lang": "ja",
  "translated": "只今, アイ・ラブ・ユー!"
}
```

### 5.3. Python

```python
import requests

# source_lang defaults to "vi", so it can be omitted
r = requests.post(
    "http://localhost:8000/translate",
    json={"text": "Xin chào, tôi yêu bạn!", "target_lang": "zh"},
    timeout=60,
)
r.raise_for_status()
print(r.json()["translated"])   # 你好, 我愛你!
```

### 5.4. JavaScript (fetch)

```javascript
const r = await fetch("http://localhost:8000/translate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Xin chào", target_lang: "ko" }),
});
const data = await r.json();
console.log(data.translated);
```

---

## 6. Endpoint list

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/translate` | Translate text (recommended) |
| `GET` | `/translate` | GET variant for quick testing |
| `GET` | `/health` | Liveness check |
| `GET` | `/languages` | List supported languages |
| `GET` | `/docs` | Swagger UI |

### `/translate` parameters

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| `text` | ✔ | — | Text to translate |
| `target_lang` | — | `en` | `en`/`ja`/`zh`/`fr`/`ko`/`vi` |
| `source_lang` | — | `vi` | Set to `"auto"` to auto-detect the source language |

GET example:

```bash
curl "http://localhost:8000/translate?text=Con%20m%C3%A8o&target_lang=zh"
# => {"source_lang":"vi","target_lang":"zh","translated":"貓"}
```

---

## 7. Calling from another machine on the LAN

1. Get the IP of the machine running the container:

```bash
# Windows
ipconfig
# Linux/macOS
ifconfig   # or: ip addr
```

2. Make sure port `8000` is open in that machine's firewall.
3. From the other machine, replace `localhost` with the IP you obtained:

```bash
curl -X POST http://192.168.1.50:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Xin chào","target_lang":"fr"}'
```

---

## 8. Container management

```bash
docker logs -f translator-api      # follow logs
docker stop translator-api         # stop the container
docker start translator-api        # start it again
docker restart translator-api      # restart it
docker rm -f translator-api        # remove the container
```

---

## 9. Troubleshooting

| Symptom | Cause & fix |
| --- | --- |
| `port is already allocated` | Port 8000 is in use. Use another port: `-p 8080:8000`, then call `http://localhost:8080`. |
| `curl: connection refused` | The container is not running or has stopped. Check `docker ps`, then `docker logs translator-api`. |
| Calls from another machine fail | Wrong IP, or the firewall blocks port 8000. |
| `manifest unknown` when pulling | Wrong image name/tag, or the repo is private and you have not run `docker login`. |
| Translation returns the input unchanged | The target language is not in `/languages`, or the source sentence has no known words. |
| Translation looks odd | It is dictionary lookup plus English pivot (2 steps), so errors can compound. |

---

## 10. Appendix A — Updating to a new version

When a new build is available, just pull again and recreate the container:

```bash
docker pull kocoten/offline-translator-api:latest
docker rm -f translator-api
docker run -d --name translator-api -p 8000:8000 \
  --restart unless-stopped \
  kocoten/offline-translator-api:latest
```

If you use `docker compose`, point `image: kocoten/offline-translator-api:latest` in `docker-compose.yml`, then:

```bash
docker compose pull
docker compose up -d
```

---

## 11. Appendix B — Moving the image with NO Internet (fully offline)

No registry needed — use `docker save` / `docker load`.

On machine A:

```bash
docker save kocoten/offline-translator-api:latest -o translator-api.tar
```

Copy `translator-api.tar` to machine B (USB, LAN, ...), then:

```bash
docker load -i translator-api.tar
docker run -d --name translator-api -p 8000:8000 \
  kocoten/offline-translator-api:latest
```

---

## 12. Appendix C — Build & push yourself (after code changes)

```bash
# Build
docker build -t kocoten/offline-translator-api:1.0.0 .

# Log in & push (also tag latest if you want it)
docker login
docker tag kocoten/offline-translator-api:1.0.0 kocoten/offline-translator-api:latest
docker push kocoten/offline-translator-api:1.0.0
docker push kocoten/offline-translator-api:latest
```
