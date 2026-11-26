# TÀI LIỆU DỰ ÁN HỆ THỐNG THUYẾT MINH THÔNG MINH ĐỊA ĐẠO CỦ CHI
## Smart Multilingual Audio Guide & Interactive Map System

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật của dự án **Smart Multilingual Audio Guide & Exhibit Management System**.  
Toàn bộ tài liệu được chuẩn hóa theo mô hình phân tầng kỹ thuật phần mềm, phân loại rõ ràng theo vai trò và vòng đời phát triển.

---

## 🗺️ 1. LỘ TRÌNH ĐỌC TÀI LIỆU THEO VAI TRÒ (ROLE-BASED ONBOARDING)

| Vai trò của bạn | Thứ tự tài liệu nên đọc | Mục tiêu cần đạt |
|---|---|---|
| **Product Manager / Business Analyst** | 1. [`PRD.md`](./01-requirements/PRD.md)<br/>2. [`use-cases/`](./01-requirements/use-cases/) | Nắm vững bài toán nghiệp vụ, 23 User Stories, mô hình 2 actor và phạm vi nghiệm thu. |
| **Software Architect / Tech Lead** | 1. [`System-Architecture.md`](./02-architecture-and-mapping/System-Architecture.md)<br/>2. [`Database-Schema-ERD.md`](./02-architecture-and-mapping/Database-Schema-ERD.md)<br/>3. [`DFD.md`](./02-architecture-and-mapping/DFD.md)<br/>4. [`Code-mapping.md`](./02-architecture-and-mapping/Code-mapping.md) | Nắm kiến trúc tổng thể, 8 bảng CSDL, luồng dữ liệu 3 tầng và ma trận ánh xạ mã nguồn. |
| **Backend / Frontend Developer** | 1. [`Code-mapping-vi.md`](./02-architecture-and-mapping/Code-mapping-vi.md)<br/>2. [`dev-rules.md`](./03-guidelines/dev-rules.md)<br/>3. [`refactor-rules.md`](./03-guidelines/refactor-rules.md)<br/>4. [`API-Documentation.md`](./02-architecture-and-mapping/API-Documentation.md) | Hiểu cấu trúc code, quy tắc đặt tên, chuẩn luồng đơn thoát SISE ($M \le 6, K \le 2$), và API. |
| **UI / UX Designer** | 1. [`ui-rules.md`](./03-guidelines/ui-rules.md)<br/>2. [`ux-rules.md`](./03-guidelines/ux-rules.md) | Nắm chuẩn thiết kế di động PWA ngoài trời, bảng màu, Tailwind CSS và khả năng tiếp cận. |
| **DevOps / SysAdmin** | 1. [`Database-Setup.md`](./04-infrastructure-and-setup/Database-Setup.md)<br/>2. [`Translation-Setup.md`](./04-infrastructure-and-setup/Translation-Setup.md)<br/>3. [`Payment-Setup.md`](./04-infrastructure-and-setup/Payment-Setup.md)<br/>4. [`Deployment-Plan.md`](./04-infrastructure-and-setup/Deployment-Plan.md) | Dựng môi trường Docker, cấu hình cổng thanh toán, AI dịch máy, TTS và pipeline triển khai. |
| **QA / Tester / Scrum Master** | 1. [`tasks.md`](./05-tasks-and-sprints/tasks.md)<br/>2. [`refactor-tasks.md`](./05-tasks-and-sprints/refactor-tasks.md) | Theo dõi tiến độ Sprint WBS, ma trận kiểm thử ghép cặp và tiêu chí Definition of Done (DoD). |
| **AI Coding Agent / Copilot** | 1. [`Code-mapping(for-agent).md`](./02-architecture-and-mapping/Code-mapping(for-agent).md) | Tra cứu nhanh file mã nguồn, hằng số cấu hình, vị trí sửa lỗi và ma trận ảnh hưởng. |

---

## 📂 2. BẢN ĐỒ CẤU TRÚC THƯ MỤC CHI TIẾT

### 📌 [01-requirements/](./01-requirements/) — Nghiệp Vụ & Yêu Cầu Hệ Thống
* [`PRD.md`](./01-requirements/PRD.md): Product Requirements Document tổng hợp toàn diện (Business Context, 23 User Stories, Component Diagram, Deployment Diagram).
* [`UC-FRAME.md`](./01-requirements/UC-FRAME.md): Khung mẫu chuẩn đặc tả Use Case.
* **[use-cases/](./01-requirements/use-cases/):** Chi tiết 6 Use Case đang hoạt động:
  * [`UC-01-interactive-map.md`](./01-requirements/use-cases/UC-01-interactive-map.md): Bản đồ tương tác, GPS ngoại cảnh & Điều hướng lộ trình.
  * [`UC-02-admin-auth.md`](./01-requirements/use-cases/UC-02-admin-auth.md): Xác thực quản trị viên, bảo vệ phiên & Chống brute-force.
  * [`UC-03-poi-catalog.md`](./01-requirements/use-cases/UC-03-poi-catalog.md): Hồ sơ số hóa điểm di tích, vùng Geofence & Tải ảnh bìa.
  * [`UC-04-translation-tts.md`](./01-requirements/use-cases/UC-04-translation-tts.md): Dịch máy đa ngữ AI & Tổng hợp âm thanh Edge-TTS.
  * [`UC-05-analytics-telemetry.md`](./01-requirements/use-cases/UC-05-analytics-telemetry.md): Dữ liệu đo đạc, Bản đồ nhiệt mật độ & Sức khỏe hệ thống.
  * [`UC-06-digital-payment.md`](./01-requirements/use-cases/UC-06-digital-payment.md): Thanh toán vé số trực tuyến & Phiên tham quan 24h.

---

### 🏛️ [02-architecture-and-mapping/](./02-architecture-and-mapping/) — Kiến Trúc & Ánh Xạ Mã Nguồn
* [`System-Architecture.md`](./02-architecture-and-mapping/System-Architecture.md): Kiến trúc triển khai đám mây (Vercel CDN + Render Backend + Aiven MySQL + Supabase Storage).
* [`Database-Schema-ERD.md`](./02-architecture-and-mapping/Database-Schema-ERD.md): Lược đồ CSDL chi tiết, DDL và sơ đồ quan hệ thực thể ERD MySQL 8.0 InnoDB (8 bảng).
* [`DFD.md`](./02-architecture-and-mapping/DFD.md): Biểu đồ luồng dữ liệu toàn cục (DFD Cấp 0, Cấp 1, Cấp 2 cho từng module).
* [`API-Documentation.md`](./02-architecture-and-mapping/API-Documentation.md): Đặc tả hợp đồng API RESTful (Request, Response, Rate Limit, Auth Gates).
* [`Visitor-Sequence-Diagram.md`](./02-architecture-and-mapping/Visitor-Sequence-Diagram.md): Sơ đồ tuần tự hành trình trải nghiệm của du khách.
* **Bộ Ba Bản Đồ Mã Nguồn (Codebase Navigation Triad):**
  * [`Code-mapping.md`](./02-architecture-and-mapping/Code-mapping.md): Bản đồ mã nguồn chi tiết tiếng Anh (Source of Truth).
  * [`Code-mapping-vi.md`](./02-architecture-and-mapping/Code-mapping-vi.md): Bản đồ mã nguồn chi tiết tiếng Việt kèm giải thích nghiệp vụ.
  * [`Code-mapping(for-agent).md`](./02-architecture-and-mapping/Code-mapping(for-agent).md): Bản đồ mã nguồn tóm tắt tối ưu cho AI Agent tra cứu dòng code.
* [`assets/component_diagram.jpg`](./02-architecture-and-mapping/assets/component_diagram.jpg): Sơ đồ thành phần kiến trúc hệ thống (Component Diagram).

---

### 📏 [03-guidelines/](./03-guidelines/) — Quy Chuẩn Kỹ Thuật & Lập Trình
* [`dev-rules.md`](./03-guidelines/dev-rules.md): Tiêu chuẩn kỹ thuật bắt buộc: Kiến trúc 3 lớp, mô hình 2 actor, kết nối JIT Database, thẻ `# SECURITY-INVARIANT`, `# PERF-CRITICAL`, `# FALLBACK-LOGIC`.
* [`refactor-rules.md`](./03-guidelines/refactor-rules.md): Tiêu chuẩn Single Intent Structured Exit (SISE), kiểm soát độ phức tạp Cyclomatic $M \le 6$, tối đa 2 điểm thoát ($K \le 2$).
* [`ui-rules.md`](./03-guidelines/ui-rules.md): Quy chuẩn giao diện người dùng, bảng màu Tailwind, typography, responsive di động.
* [`ux-rules.md`](./03-guidelines/ux-rules.md): Quy chuẩn trải nghiệm người dùng ngoài thực địa, phòng ngừa lặp âm thanh, phản hồi ngoại tuyến.

---

### ⚙️ [04-infrastructure-and-setup/](./04-infrastructure-and-setup/) — Hướng Dẫn Cài Đặt & Triển Khai
* [`Database-Setup.md`](./04-infrastructure-and-setup/Database-Setup.md): Khởi tạo MySQL 8.0 qua Docker Compose hoặc kết nối đám mây Aiven.
* [`Payment-Setup.md`](./04-infrastructure-and-setup/Payment-Setup.md): Cấu hình khóa bí mật VietQR (PayOS) và môi trường PayPal Sandbox.
* [`Translation-Setup.md`](./04-infrastructure-and-setup/Translation-Setup.md): Cấu hình dịch tự động (Render OPUS-MT / OpenRouter) và giọng đọc Microsoft Edge-TTS.
* [`Deployment-Plan.md`](./04-infrastructure-and-setup/Deployment-Plan.md): Kế hoạch và quy trình phát hành dịch vụ lên Vercel Edge và Render Web Service.

---

### 📊 [05-tasks-and-sprints/](./05-tasks-and-sprints/) — Quản Lý Tiến Độ & Nhiệm Vụ Kỹ Thuật
* [`tasks.md`](./05-tasks-and-sprints/tasks.md): Bản phân rã công việc WBS 23 User Stories, 92 nhiệm vụ kỹ thuật kèm ma trận kiểm thử 1-to-1 ($\ge 80\%$ coverage).
* [`refactor-tasks.md`](./05-tasks-and-sprints/refactor-tasks.md): Bản phân rã 31 nhiệm vụ refactor Layer 2 (Service) & Layer 3 (Repository) chuẩn SISE.

---

### 📦 [archive/](./archive/) — Tài Liệu Lưu Trữ (Bãi Bỏ / Thay Thế)
Chứa các tài liệu thiết kế ban đầu hoặc các tính năng đã được lược bỏ khỏi phạm vi hiện tại nhằm giữ cho không gian làm việc chính luôn sạch sẽ:
* [`UC-07(removed).md`](./archive/UC-07(removed).md) & [`UC-08(removed).md`](./archive/UC-08(removed).md): Các Use Case cũ đã gỡ bỏ.
* [`DEPRECATED_SYSTEM_CONTROL_MAP.md`](./archive/DEPRECATED_SYSTEM_CONTROL_MAP.md): Bản đồ kiểm soát cũ (được thay thế bởi `Code-mapping.md`).
* [`DEPRECATED_SYSTEM_MAPPING.md`](./archive/DEPRECATED_SYSTEM_MAPPING.md): Bản đồ phân tích cũ.
* [`DEPRECATED_MVP-Codebase-Mapping.md`](./archive/DEPRECATED_MVP-Codebase-Mapping.md) & [`DEPRECATED_DOC_MVP-Codebase-Mapping.md`](./archive/DEPRECATED_DOC_MVP-Codebase-Mapping.md): Mapping cũ.
