# HƯỚNG DẪN THIẾT LẬP CỔNG THANH TOÁN SANDBOX (PAYMENT GATEWAY SETUP GUIDE)
### Dự án: Smart Multilingual Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site
*Tài liệu hướng dẫn cấu hình môi trường thanh toán thử nghiệm (Sandbox / Test Mode) cho Quản trị viên và Lập trình viên trong nhóm.*

---

## 1. TỔNG QUAN DỊCH VỤ THANH TOÁN (US 06.1)

Hệ thống cung cấp dịch vụ số hóa: **Dịch vụ Thuyết minh Âm thanh Đa ngôn ngữ Thông minh (Smart Audio Guide Service)**. Khách tham quan (Visitor) thanh toán phí dịch vụ để mở khóa phiên nghe thuyết minh tự động theo định vị GPS và xem nội dung lịch sử chuyên sâu trong vòng 24 giờ.

Hệ thống hỗ trợ 2 cổng thanh toán số dành cho khách tham quan:
1. **PayOS (VietQR nội địa)**: Tự động sinh mã VietQR động chuẩn Napas247, chuyển khoản qua mọi ứng dụng ngân hàng tại Việt Nam.
2. **Stripe (Thẻ quốc tế)**: Thanh toán trực tuyến an toàn chuẩn PCI-DSS dành cho khách quốc tế sử dụng thẻ Visa / Mastercard.

> [!NOTE]
> **Cơ chế Tự bảo vệ (Graceful Fallback - Zero Broken Build):**
> Nếu bạn mới pull mã nguồn về và **chưa kịp cấu hình các khóa API bên dưới**, Backend sẽ **không bị crash hay báo lỗi**. Hệ thống sẽ tự động phát hiện và kích hoạt chế độ **Internal Sandbox Simulator** để giao diện và toàn bộ unit test vẫn chạy mượt mà 100%. Khi bạn điền các khóa API vào file `.env`, hệ thống sẽ tự động chuyển sang gọi trực tiếp server Sandbox của PayOS & Stripe.

---

## 2. DANH SÁCH BIẾN MÔI TRƯỜNG CẦN THIẾT

Các biến sau cần được khai báo trong file `.env` tại thư mục `MVP/backend/.env`:

```env
# ==============================================================================
# 1. PAYOS SANDBOX CREDENTIALS (VIETQR THANH TOÁN NỘI ĐỊA)
# ==============================================================================
PAYOS_CLIENT_ID=your_payos_client_id_here
PAYOS_API_KEY=your_payos_api_key_here
PAYOS_CHECKSUM_KEY=your_payos_checksum_key_here

# ==============================================================================
# 2. STRIPE TEST CREDENTIALS (THẺ QUỐC TẾ VISA/MASTERCARD)
# ==============================================================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here

# ==============================================================================
# 3. CẤU HÌNH PHÍ DỊCH VỤ THUYẾT MINH (AUDIO GUIDE SERVICE FEE)
# ==============================================================================
AUDIO_GUIDE_SERVICE_FEE=50000
SERVICE_FEE_CURRENCY=VND
```

---

## 3. HƯỚNG DẪN 3 BƯỚC LẤY KEY PAYOS SANDBOX (CHỈ MẤT 1 PHÚT)

PayOS cung cấp môi trường Sandbox hoàn toàn miễn phí, không cần giấy phép kinh doanh:

1. **Bước 1: Đăng ký tài khoản Sandbox**
   * Truy cập trang chủ PayOS: [https://payos.vn](https://payos.vn)
   * Nhấn **Đăng ký** (hoặc chọn **Đăng nhập bằng Google** để vào ngay trong 10 giây).

2. **Bước 2: Tạo Kênh thanh toán Thử nghiệm**
   * Tại màn hình quản trị PayOS, chọn chuyển sang chế độ **Môi trường Test (Sandbox)** ở góc trên giao diện.
   * Vào mục menu **Kênh thanh toán** $\rightarrow$ Nhấn **Tạo kênh thanh toán mới**.
   * Nhập tên kênh bất kỳ (Ví dụ: `Cu Chi Tunnels Audio Guide Demo`) và chọn ngân hàng nhận tiền thử nghiệm.

3. **Bước 3: Lấy bộ 3 thông số bí mật**
   * Trong chi tiết kênh vừa tạo, sao chép 3 thông số:
     * `Client ID`
     * `API Key`
     * `Checksum Key`
   * Mở file `MVP/backend/.env` trên máy tính của bạn và dán vào:
     ```env
     PAYOS_CLIENT_ID=e4a5d89f-...
     PAYOS_API_KEY=91c0e3a4-...
     PAYOS_CHECKSUM_KEY=7f281e09-...
     ```

---

## 4. HƯỚNG DẪN LẤY KEY STRIPE TEST MODE (TÙY CHỌN CHO THẺ QUỐC TẾ)

1. Truy cập [https://stripe.com](https://stripe.com) và đăng ký tài khoản miễn phí.
2. Tại thanh điều hướng, bật công tắc **Test mode** (chế độ thử nghiệm).
3. Vào mục **Developers** $\rightarrow$ **API keys**.
4. Sao chép **Publishable key** (`pk_test_...`) và **Secret key** (`sk_test_...`) dán vào `MVP/backend/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_51...
   STRIPE_PUBLIC_KEY=pk_test_51...
   ```
5. Khi thanh toán thử nghiệm trên giao diện, bạn có thể dùng thẻ test chuẩn của Stripe:
   * **Số thẻ**: `4242 4242 4242 4242`
   * **Ngày hết hạn**: Tháng/Năm bất kỳ trong tương lai (Ví dụ: `12/28`)
   * **CVC**: 3 số bất kỳ (Ví dụ: `123`)

---

## 5. QUY TRÌNH KIỂM THỬ MỞ KHÓA DỊCH VỤ (VERIFICATION WORKFLOW)

Sau khi lưu cấu hình vào `MVP/backend/.env`:

1. **Khởi động ứng dụng**:
   * Chạy Backend:
     ```bash
     cd MVP/backend
     python -m uvicorn app.main:app --reload --port 8000
     ```
   * Chạy Frontend:
     ```bash
     cd MVP/frontend
     npm run dev
     ```

2. **Kiểm tra trên trình duyệt**:
   * Truy cập: [http://localhost:5173/tour](http://localhost:5173/tour) (giao diện Visitor).
   * Bấm nút **Unlock audio** trên Header hoặc biểu tượng khóa tại bất kỳ điểm di tích nào.
   * Hộp thoại **Checkout Modal** sẽ xuất hiện, hiển thị:
     * Thông tin dịch vụ: **Dịch vụ Thuyết minh Âm thanh Đa ngôn ngữ (Gói 24 giờ)**.
     * Mức phí dịch vụ: `50,000 VND`.
     * Mã VietQR động được tải trực tiếp từ server PayOS Sandbox.
   * Dùng điện thoại quét mã QR hoặc bấm nút **Mô phỏng thanh toán thành công (Simulate Paid)**.
   * Hệ thống tự động polling kiểm tra trạng thái mỗi 2.5 giây. Khi nhận được trạng thái `PAID`, modal tự động đóng lại và mở khóa toàn bộ thuyết minh âm thanh trong 24 giờ.
