# Hướng Dẫn Triển Khai Hosting Qua Cloudflare Tunnel Cho Dự Án Smart Museum POC

Tài liệu này hướng dẫn chi tiết cách đưa toàn bộ hệ thống (Frontend React + Backend FastAPI + Âm thanh TTS + Quét mã QR) từ `localhost` lên Internet thông qua **Cloudflare Tunnel** để kiểm thử thực tế trên điện thoại hoặc chia sẻ từ xa mà **không cần mở port mạng (Port Forwarding)** và **có sẵn chứng chỉ HTTPS bảo mật**.

---

## 1. Cơ Chế Hoạt Động Của Cloudflare Tunnel Trong Dự Án

Hệ thống của bạn có kiến trúc rất thuận tiện:
- **Frontend (Vite - React)** chạy ở cổng `http://localhost:5173`.
- **Backend (FastAPI)** chạy ở cổng `http://localhost:8000`.
- File cấu hình `frontend/vite.config.js` đã thiết lập sẵn cơ chế **Reverse Proxy**: mọi request tới `/api` và `/static` (âm thanh `.mp3`, ảnh mã QR) đều tự động chuyển tiếp tới cổng `8000`.

> **Ưu điểm lớn:** Bạn **chỉ cần mở Tunnel trỏ vào cổng `5173`**, Cloudflare sẽ tự động đưa cả giao diện người dùng, API và file thuyết minh ra Internet thông qua 1 đường link HTTPS duy nhất.

---

## 2. Lựa Chọn Phương Án Phù Hợp

| Tiêu chí | Cách 1: Quick Tunnel (Khuyên dùng) | Cách 2: Named Tunnel (Domain riêng) |
|---|---|---|
| **Chi phí** | Miễn phí 100% | Miễn phí 100% |
| **Yêu cầu** | **Không cần** tài khoản, **không cần** mua domain | Cần tài khoản Cloudflare & sở hữu 1 tên miền |
| **Tên miền** | Ngẫu nhiên (dạng `https://*.trycloudflare.com`) | Cố định theo ý muốn (vd: `https://museum.yourdomain.com`) |
| **Mục đích** | Thuyết trình, test nhanh trên điện thoại, demo đồ án | Chạy ổn định lâu dài, triển khai chính thức |

---

## 3. Cách 1: Hướng Dẫn Quick Tunnel (Nhanh Nhất, Không Cần Domain)

### Bước 1: Chuẩn bị file `cloudflared.exe` trên Windows

1. Tải bản **`cloudflared-windows-amd64.exe`** từ GitHub Releases của Cloudflare.
2. Đổi tên file vừa tải thành `cloudflared.exe`.
3. Di chuyển file `cloudflared.exe` vào thư mục dự án `POC/` (cùng chỗ với file `start_tunnel.bat`).

---

### Bước 2: Khởi động Backend & Frontend ở máy tính (Local)

Giữ 2 cửa sổ terminal chạy song song như bình thường:

1. **Terminal 1 (Backend):**
   ```powershell
   cd c:\Users\ASUS\OneDrive\Desktop\Software-Technology\POC\backend
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --reload --port 8000
   ```

2. **Terminal 2 (Frontend):**
   ```powershell
   cd c:\Users\ASUS\OneDrive\Desktop\Software-Technology\POC\frontend
   npm run dev
   ```

---

### Bước 3: Mở Tunnel kết nối cổng 5173

Nhấp đúp chuột vào file **`start_tunnel.bat`** (hoặc mở Terminal thứ 3 và gõ `.\cloudflared.exe tunnel --url http://localhost:5173`).

Trong cửa sổ hiện lên, bạn sẽ nhìn thấy một đường link HTTPS có dạng:
```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://xxxx-xxxx-xxxx-xxxx.trycloudflare.com                                             |
+--------------------------------------------------------------------------------------------+
```
👉 Hãy copy đường dẫn `https://xxxx-xxxx-xxxx-xxxx.trycloudflare.com` này.

---

### Bước 4: Cập nhật biến môi trường cho Backend để tạo mã QR chuẩn

Mã QR của hiện vật chứa đường dẫn truy cập chi tiết. Nếu không cấu hình, mã QR sẽ chứa link `http://localhost:5173` và điện thoại quét sẽ không vào được.

1. Tạo file `POC/backend/.env`:
   ```env
   # Đổi thành đường link Cloudflare Tunnel bạn vừa nhận được ở Bước 3
   FRONTEND_BASE_URL=https://xxxx-xxxx-xxxx-xxxx.trycloudflare.com
   ```
2. Lưu file. Backend sẽ tự động reload lại với cấu hình mới.

---

### Bước 5: Sinh lại mã QR & Kiểm thử thực tế trên điện thoại di động

1. Mở trình duyệt trên máy tính hoặc điện thoại, truy cập trang quản trị:
   `https://xxxx-xxxx-xxxx-xxxx.trycloudflare.com/admin`
2. Tại danh sách hiện vật (POIs):
   - Bấm nút **"Tạo mã QR" / "Sinh lại QR"** cho các hiện vật để mã QR được gắn link Cloudflare Tunnel mới.
   - Bấm xem hoặc tải ảnh mã QR.
3. Dùng điện thoại (sử dụng 4G hoặc mạng WiFi bất kỳ):
   - Mở Camera điện thoại hoặc Zalo quét mã QR trên màn hình.
   - Điện thoại sẽ mở ngay trang thuyết minh hiện vật dạng `https://xxxx-xxxx-xxxx-xxxx.trycloudflare.com/poi/1`.
   - Chọn ngôn ngữ (Tiếng Việt, English, 日本語, 한국어, 中文), nhấn **Phát Audio Guide** để nghe giọng đọc AI.
   - Thử nghiệm tính năng xem bản đồ và lộ trình tham quan.

---

## 4. Xử Lý Các Sự Cố Thường Gặp (Troubleshooting)

### 1. Báo lỗi `ERR_CONNECTION_REFUSED` hoặc `502 Bad Gateway`
- **Nguyên nhân:** Frontend Vite chưa được bật ở cổng `5173` trước khi mở Tunnel.
- **Cách khắc phục:** Đảm bảo `npm run dev` trong thư mục `frontend` đang chạy và terminal hiển thị `Local: http://localhost:5173/`.

### 2. Quét QR trên điện thoại vẫn ra `http://localhost:5173/poi/...`
- **Nguyên nhân:** Mã QR cũ được sinh ra trước khi bạn đổi biến `FRONTEND_BASE_URL`.
- **Cách khắc phục:** 
  1. Kiểm tra lại giá trị `FRONTEND_BASE_URL` trong `backend/.env`.
  2. Vào giao diện Admin `https://.../admin`, nhấn nút **"Tạo lại QR"** của hiện vật để hệ thống vẽ lại mã QR với link HTTPS mới.

### 3. Âm thanh TTS trên điện thoại không phát được
- **Nguyên nhân:** Trình duyệt di động (iOS Safari / Chrome Android) yêu cầu trang web chạy trên giao thức an toàn `https://` và cần thao tác chạm từ người dùng để phát âm thanh.
- **Cách khắc phục:** Cloudflare Tunnel đã tự động cấp chứng chỉ HTTPS xanh, bạn chỉ cần bấm nút Play trực tiếp trên màn hình điện thoại là âm thanh sẽ phát bình thường.
