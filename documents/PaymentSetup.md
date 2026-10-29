# HƯỚNG DẪN THIẾT LẬP CỔNG THANH TOÁN SANDBOX (PAYMENT GATEWAY SETUP GUIDE)
### Dự án: Smart Multilingual Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site
*Tài liệu hướng dẫn cấu hình môi trường thanh toán thử nghiệm (Sandbox / Test Mode) cho Quản trị viên và Lập trình viên trong nhóm.*

---

## 1. TỔNG QUAN DỊCH VỤ THANH TOÁN (US 06.1)

Hệ thống cung cấp dịch vụ số hóa: **Dịch vụ Thuyết minh Âm thanh Đa ngôn ngữ Thông minh (Smart Audio Guide Service)**. Khách tham quan (Visitor) thanh toán phí dịch vụ để mở khóa phiên nghe thuyết minh tự động theo định vị GPS và xem nội dung lịch sử chuyên sâu trong vòng 24 giờ.

Hệ thống hỗ trợ 2 cổng thanh toán số dành cho khách tham quan:
1. **PayOS (VietQR nội địa)**: Tự động sinh mã VietQR động chuẩn Napas247, chuyển khoản qua mọi ứng dụng ngân hàng tại Việt Nam.
2. **PayPal Sandbox (Thẻ quốc tế & Tài khoản PayPal)**: Cổng thanh toán quốc tế hỗ trợ thanh toán bảo mật bằng thẻ Visa, Mastercard, JCB hoặc số dư tài khoản PayPal Sandbox.

> [!NOTE]
> **Cơ chế Tự bảo vệ (Graceful Fallback - Zero Broken Build):**
> Nếu bạn mới pull mã nguồn về và **chưa kịp cấu hình các khóa API bên dưới**, Backend sẽ **không bị crash hay báo lỗi**. Hệ thống sẽ tự động phát hiện và kích hoạt chế độ **Internal Sandbox Simulator** để giao diện và toàn bộ unit test vẫn chạy mượt mà 100%. Khi bạn điền các khóa API vào file `.env`, hệ thống sẽ tự động chuyển sang gọi trực tiếp server Sandbox của PayOS & PayPal.

---

## 2. DANH SÁCH BIẾN MÔI TRƯỜNG CẦN THIẾT

Các biến sau cần được khai báo trong file `.env` tại thư mục `MVP/backend/.env` (bạn có thể sao chép từ file mẫu `MVP/backend/.env.example`):

```env
# ==============================================================================
# 1. PAYOS SANDBOX CREDENTIALS (VIETQR THANH TOÁN NỘI ĐỊA)
# ==============================================================================
PAYOS_CLIENT_ID=your_payos_client_id_here
PAYOS_API_KEY=your_payos_api_key_here
PAYOS_CHECKSUM_KEY=your_payos_checksum_key_here

# ==============================================================================
# 2. PAYPAL SANDBOX CREDENTIALS (THẺ QUỐC TẾ & TÀI KHOẢN PAYPAL SANDBOX)
# ==============================================================================
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_MODE=sandbox
PAYPAL_CURRENCY=USD
PAYPAL_EXCHANGE_RATE=25000.0

# ==============================================================================
# 3. CẤU HÌNH PHÍ DỊCH VỤ THUYẾT MINH (AUDIO GUIDE SERVICE FEE)
# ==============================================================================
AUDIO_GUIDE_SERVICE_FEE=50000
SERVICE_FEE_CURRENCY=VND
```

---

## 3. HƯỚNG DẪN 3 BƯỚC LẤY KEY PAYOS SANDBOX (VIETQR NỘI ĐỊA)

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

## 4. HƯỚNG DẪN CHI TIẾT CẤU HÌNH PAYPAL SANDBOX (CHỈ MẤT 2 PHÚT)

Môi trường PayPal Developer Sandbox cho phép thử nghiệm đầy đủ cả 2 hình thức:
- **Thanh toán bằng tài khoản PayPal ảo** (có sẵn số dư \$5,000 USD).
- **Thanh toán trực tiếp bằng Thẻ quốc tế ảo** (Debit/Credit Card Visa/Mastercard test).

### Bước 1: Đăng nhập Cổng PayPal Developer
1. Truy cập trang PayPal Developer: [https://developer.paypal.com](https://developer.paypal.com)
2. Nhấn nút **Log in to Dashboard** ở góc trên bên phải. Bạn có thể sử dụng tài khoản PayPal cá nhân sẵn có hoặc đăng ký mới miễn phí.

### Bước 2: Tạo App Sandbox & Lấy Client ID / Secret Key
1. Sau khi vào Dashboard, trên thanh menu điều hướng bên trái chọn **Apps & Credentials**.
2. Đảm bảo nút chuyển trạng thái đang ở chế độ **Sandbox** (màu xanh dương).
3. Nhấn nút **Create App**:
   * **App Name**: Điền tên ứng dụng, ví dụ: `CuChiTunnelsApp`.
   * **App Type**: Chọn `Merchant` (Người bán).
4. Nhấn **Create App**.
5. Màn hình chi tiết ứng dụng sẽ xuất hiện:
   * **Client ID**: Sao chép chuỗi mã này (dạng: `Af_...`).
   * **Secret**: Nhấn nút `Show` để hiển thị và sao chép mã khóa bí mật.
6. Mở file `MVP/backend/.env` và dán vào:
   ```env
   PAYPAL_CLIENT_ID=Af_Your_PayPal_Sandbox_Client_Id_Here
   PAYPAL_CLIENT_SECRET=EK_Your_PayPal_Sandbox_Secret_Here
   PAYPAL_MODE=sandbox
   PAYPAL_CURRENCY=USD
   PAYPAL_EXCHANGE_RATE=25000.0
   ```

### Bước 3: Lấy Tài khoản Người mua Thử nghiệm (Sandbox Personal Account)
PayPal đã tự động tạo sẵn các tài khoản thử nghiệm đi kèm tài khoản của bạn:
1. Tại menu bên trái PayPal Developer, vào **Testing Tools** $\rightarrow$ chọn **Sandbox Accounts**.
2. Bạn sẽ thấy danh sách tài khoản được tạo tự động:
   * Tài khoản có chữ **Business / Facilitator**: Tài khoản của bên bán nhận tiền.
   * Tài khoản có chữ **Personal / Buyer**: Tài khoản của khách du lịch mua vé (thường có dạng `sb-xxxx@personal.example.com`).
3. Nhấp vào biểu tượng dấu 3 chấm `...` bên phải tài khoản **Personal** $\rightarrow$ chọn **View/edit account**:
   * **Tab Profile**: Chứa **Email ID** và **System Generated Password** (dùng để đăng nhập khi trang PayPal Sandbox mở lên).
   * **Tab Funding**: Chứa số dư ảo (\$5,000 USD) và thông tin **Thẻ Visa test** (Credit Card Number, Expiration Date, CVV).

### Bước 4: Thử nghiệm thanh toán trên giao diện ứng dụng
1. Mở giao diện Tour [http://localhost:5173/tour](http://localhost:5173/tour), bấm **Unlock Audio**.
2. Chọn tab **Thẻ quốc tế**.
3. Bấm nút **Tiếp tục thanh toán qua PayPal Sandbox (50.000 đ)**.
4. Cửa sổ thanh toán PayPal Sandbox sẽ mở ra:
   * **Cách 1 (Tài khoản PayPal)**: Đăng nhập bằng Email và Password từ Bước 3, chọn thanh toán \$2.00 USD và bấm **Complete Purchase** / **Pay Now**.
   * **Cách 2 (Thẻ quốc tế)**: Nhấp **Pay with Debit or Credit Card**, nhập số thẻ ảo ở tab Funding và bấm thanh toán.
5. Ngay sau khi hoàn tất, hệ thống tự động xác nhận và kích hoạt phiên 24h trên giao diện khách tham quan!

> [!TIP]
> **Chế độ Giả lập tương tác (Interactive PayPal Simulator):**
> Nếu bạn chưa có tài khoản PayPal Developer, Backend vẫn cung cấp trang web mô phỏng PayPal Sandbox tích hợp sẵn (`/api/v1/payments/paypal-checkout?order_id=...`). Bạn có thể bấm nút tiếp tục thanh toán và xác nhận ngay lập tức mà không cần tài khoản ngoài!

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
     * Tab 1: **VietQR Napas247** (quét mã VietQR chuyển khoản).
     * Tab 2: **Thẻ quốc tế** $\rightarrow$ Bấm nút **Tiếp tục thanh toán qua PayPal Sandbox (50.000 đ)** để mở cổng thanh toán bảo mật.
   * Hệ thống tự động polling kiểm tra trạng thái mỗi 2.5 giây. Khi nhận được trạng thái `PAID`, modal tự động đóng lại và mở khóa toàn bộ thuyết minh âm thanh trong 24 giờ.
