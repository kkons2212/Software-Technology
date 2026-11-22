# Auto_Translate: Live API Integration Guide

Welcome to the **Auto_Translate Live API** documentation. This service is a public, ultra-lightweight neural translation API designed to translate **Vietnamese into any major world language** with low latency and minimal resource overhead.

External applications (web apps, mobile apps, chatbots, background workers, microservices) can connect directly to this live endpoint **without setting up or deploying any code**.

---

## 1. Quick Connection Details

| Attribute | Value |
| :--- | :--- |
| **Live Base URL** | `https://translation-temporary.onrender.com` |
| **Interactive Swagger UI** | `https://translation-temporary.onrender.com/docs` |
| **Authentication** | **None required (Public & Open)** |
| **CORS Policy** | **`allow_origins=["*"]` (Directly callable from any frontend/browser)** |
| **Content-Type** | `application/json; charset=utf-8` |

---

## 2. Supported Target Languages

The service currently supports translating from Vietnamese (`vi`) into the following target languages:

| Target Language | Language Code | Model Architecture | Direct / Pivot |
| :--- | :--- | :--- | :--- |
| **English** | `en` or `English` | OPUS-MT INT8 | Direct (`vi` $\rightarrow$ `en`) |
| **French** | `fr` or `French` | OPUS-MT INT8 | Pivot (`vi` $\rightarrow$ `en` $\rightarrow$ `fr`) |
| **German** | `de` or `German` | OPUS-MT INT8 | Pivot (`vi` $\rightarrow$ `en` $\rightarrow$ `de`) |
| **Spanish** | `es` or `Spanish` | OPUS-MT INT8 | Pivot (`vi` $\rightarrow$ `en` $\rightarrow$ `es`) |
| **Japanese** | `ja` or `Japanese` | OPUS-MT INT8 | Pivot (`vi` $\rightarrow$ `en` $\rightarrow$ `ja`) |
| **Chinese** | `zh` or `Chinese` | OPUS-MT INT8 | Pivot (`vi` $\rightarrow$ `en` $\rightarrow$ `zh`) |
| **Korean** | `ko` or `Korean` | OPUS-MT INT8 | Pivot (`vi` $\rightarrow$ `en` $\rightarrow$ `ko`) |
| **Russian** | `ru` or `Russian` | OPUS-MT INT8 | Pivot (`vi` $\rightarrow$ `en` $\rightarrow$ `ru`) |

*Target language names are case-insensitive (e.g. `"english"`, `"English"`, `"EN"` are all valid).*

---

## 3. API Endpoints Reference

### 3.1. Translate Text (`POST /translate`)

Translates Vietnamese text into the selected target language.

#### Endpoint
`POST https://translation-temporary.onrender.com/translate`

#### Request Headers
```http
Content-Type: application/json; charset=utf-8
```

#### Request Body
```json
{
  "text": "Xin chào, hôm nay công việc của bạn thế nào?",
  "target": "English"
}
```

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `text` | string | **Yes** | Vietnamese text to translate (cannot be empty) | `"Chúc bạn một ngày tốt lành!"` |
| `target` | string | No | Desired target language (defaults to `"English"`) | `"Japanese"` |

#### Successful Response (`200 OK`)
```json
{
  "original_text": "Xin chào, hôm nay công việc của bạn thế nào?",
  "translated_text": "Hello, how's your work today?",
  "target_language": "English",
  "latency_ms": 124.5,
  "current_ram_mb": 182.4,
  "ram_limit_mb": 512.0
}
```

| Response Field | Type | Description |
| :--- | :--- | :--- |
| `original_text` | string | The original Vietnamese text sent in the request |
| `translated_text` | string | The neural translated text |
| `target_language` | string | The target language used |
| `latency_ms` | float | Execution duration in milliseconds |
| `current_ram_mb` | float | Live server RAM usage (MB) |
| `ram_limit_mb` | float | Hard container RAM ceiling (512.0 MB) |

#### Error Responses
* **`400 Bad Request`**: Empty text payload or unsupported language name.
  ```json
  {"detail": "Text cannot be empty."}
  ```
* **`500 Internal Server Error`**: Translation execution failure.

---

### 3.2. Health Check & RAM Telemetry (`GET /health`)

Returns the current uptime status and live RAM telemetry.

#### Endpoint
`GET https://translation-temporary.onrender.com/health`

#### Successful Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "auto-translate",
  "current_ram_mb": 66.5,
  "ram_limit_mb": 512.0
}
```

---

### 3.3. List Supported Languages (`GET /languages`)

Returns the list of currently supported target languages.

#### Endpoint
`GET https://translation-temporary.onrender.com/languages`

#### Successful Response (`200 OK`)
```json
{
  "supported_languages": [
    "Chinese",
    "English",
    "French",
    "German",
    "Japanese",
    "Korean",
    "Russian",
    "Spanish"
  ],
  "count": 8
}
```

---

## 4. Ready-to-Use Code Snippets

### 4.1. JavaScript / TypeScript (Frontend / React / Vue / Vanilla JS)
*Because CORS is fully enabled, you can call this directly from the browser without a proxy:*

```javascript
async function translateVietnamese(text, targetLang = "English") {
  const url = "https://translation-temporary.onrender.com/translate";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      text: text,
      target: targetLang,
    }),
  });

  if (!response.ok) {
    throw new Error(`Translation error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.translated_text;
}

// Example usage:
translateVietnamese("Trí tuệ nhân tạo đang thay đổi thế giới.", "Japanese")
  .then(output => console.log("Output:", output))
  .catch(err => console.error("Error:", err));
```

---

### 4.2. Node.js (Backend / Express / Next.js API Routes)

```javascript
const axios = require("axios");

async function translate(text, target = "English") {
  try {
    const res = await axios.post(
      "https://translation-temporary.onrender.com/translate",
      { text, target },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data.translated_text;
  } catch (error) {
    console.error("API error:", error.response?.data || error.message);
    throw error;
  }
}

// Example usage:
translate("Cảm ơn bạn rất nhiều vì sự giúp đỡ.", "French")
  .then(console.log);
```

---

### 4.3. Python (`requests` & `httpx`)

#### Synchronous with `requests`:
```python
import requests

def translate(text: str, target: str = "English") -> str:
    url = "https://translation-temporary.onrender.com/translate"
    payload = {"text": text, "target": target}
    
    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    
    return response.json()["translated_text"]

# Example:
result = translate("Dự án này chạy rất ổn định và tiết kiệm tài nguyên.", target="German")
print("Translated:", result)
```

#### Asynchronous with `httpx` (FastAPI, background workers, chatbots):
```python
import httpx

async def translate_async(text: str, target: str = "English") -> str:
    url = "https://translation-temporary.onrender.com/translate"
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, json={"text": text, "target": target})
        res.raise_for_status()
        return res.json()["translated_text"]
```

---

### 4.4. cURL / Shell (Terminal, Linux, macOS, Windows)

#### Windows PowerShell:
```powershell
curl.exe -s -X POST https://translation-temporary.onrender.com/translate `
  -H "Content-Type: application/json; charset=utf-8" `
  -d '{\"text\": \"Hôm nay thời tiết rất dễ chịu.\", \"target\": \"French\"}'
```

#### Linux / macOS Bash:
```bash
curl -s -X POST "https://translation-temporary.onrender.com/translate" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "text": "Hôm nay thời tiết rất dễ chịu.",
    "target": "French"
  }'
```

---

### 4.5. Dart / Flutter (Mobile Apps)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<String> translateText(String text, String target) async {
  final url = Uri.parse('https://translation-temporary.onrender.com/translate');
  final response = await http.post(
    url,
    headers: {'Content-Type': 'application/json; charset=utf-8'},
    body: jsonEncode({'text': text, 'target': target}),
  );

  if (response.statusCode == 200) {
    final body = jsonDecode(utf8.decode(response.bodyBytes));
    return body['translated_text'];
  } else {
    throw Exception('Failed to translate: ${response.statusCode}');
  }
}
```

---

### 4.6. Golang

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type TranslateRequest struct {
	Text   string `json:"text"`
	Target string `json:"target"`
}

type TranslateResponse struct {
	TranslatedText string `json:"translated_text"`
}

func Translate(text, target string) (string, error) {
	url := "https://translation-temporary.onrender.com/translate"
	payload, _ := json.Marshal(TranslateRequest{Text: text, Target: target})

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result TranslateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.TranslatedText, nil
}

func main() {
	translated, err := Translate("Xin chào thế giới!", "Spanish")
	if err == nil {
		fmt.Println("Result:", translated)
	}
}
```

---

## 5. Important Production Tips & Best Practices

### 5.1. Free Tier Cold-Start Handling (Wake-Up Delay)
* **What happens:** On Render's Free tier, if the API receives no traffic for 15 minutes, it automatically goes to sleep to conserve resources.
* **First request behavior:** When the next request arrives, Render takes **~15–20 seconds** to wake up the container. Once awake, requests respond in **~100 ms – 300 ms**.
* **Recommended client strategy:**
  1. Set client timeout to at least **30–45 seconds**.
  2. Implement a simple ping or retry:
     ```javascript
     // Optional: Ping /health on application startup to ensure the server is warm
     fetch("https://translation-temporary.onrender.com/health").catch(() => {});
     ```

### 5.2. Concurrency & Queueing
* The service runs on **0.1 CPU** with strict memory containment ($< 512\text{ MB RAM}$).
* A built-in thread synchronization queue (`self._lock`) coordinates requests safely.
* **Best practice for callers:**
  * For batch translations, send requests **sequentially** (one after another) rather than 10 requests at the exact same millisecond.
  * Normal UI usage (users typing or clicking translate) processes seamlessly with zero delay.

---

## 6. Architecture & Future Scaling Roadmap

For high-volume production needs in the future, the architecture is designed to expand without breaking API compatibility:

```
[External Apps / Frontends]
             │
             ▼
   [Cloudflare Load Balancer] (Free - 100k requests/day)
             │
     ┌───────┴────────────────────────┐
     ▼                                ▼
[Render Free Tier]         [Hugging Face Spaces]
 (0.1 CPU, 512 MB)          (2 vCPUs, 16 GB RAM - Free)
```

1. **Phase 1 (Current):** Standalone Render Free Tier deployment serving public requests with sub-512MB RAM containment.
2. **Phase 2 (Planned Zero-Cost Scaling):** Deploy identical Docker container to **Hugging Face Spaces (2 vCPUs, 16 GB RAM free)**.
3. **Phase 3 (Load Balancing):** Add a **Cloudflare Worker** to route requests dynamically to whichever instance is idle and healthy.
