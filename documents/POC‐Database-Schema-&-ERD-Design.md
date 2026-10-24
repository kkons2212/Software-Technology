# Database Schema & ERD Design (Smart Museum POC)


---

## 1. Database Architecture Overview

During the Proof of Concept (POC) phase, the system leverages **SQLite** configured in **WAL (Write-Ahead Logging)** mode with `PRAGMA foreign_keys = ON;` to ensure:
- **High Performance & Non-blocking Concurrency:** Mobile visitor reads can occur simultaneously without being locked by backend write jobs (Google Translation & Edge-TTS synthesis background tasks).
- **Data Integrity:** Cascade deletion automatically cleans up related translations and audio records when a POI is deleted.

---

## 2. Entity Relationship Diagram (ERD)

<img width="2237" height="1595" alt="Untitled" src="https://github.com/user-attachments/assets/73e75e56-7e8f-4308-b3b0-ab32b30b8901" />

### 2.1. MySQL Schema DDL Script

```sql
-- ==============================================================================
-- Schema DDL: Cu Chi Tunnels Smart Multilingual Guide
-- Database Engine: MySQL 8.0+ (InnoDB)
-- Source: dbdiagram.io ERD Specification
-- Features:
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `smart_museum` 
    DEFAULT CHARACTER SET utf8mb4 
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `smart_museum`;

-- ------------------------------------------------------------------------------
-- 1. BẢNG `User` (Tài khoản Quản trị & Nhân sự nội bộ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
    `UserName` VARCHAR(20) NOT NULL,
    `Email` VARCHAR(255) NOT NULL,
    `Password_hash` VARCHAR(255) NOT NULL,
    `FullName` NVARCHAR(255) NULL,
    `Is_Active` BOOLEAN NOT NULL DEFAULT TRUE,
    `FalsedAttempts` INT NOT NULL DEFAULT 0,
    `Lockeduntil` DATETIME NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Update_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`UserName`),
    UNIQUE KEY `UQ_User_Email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. BẢNG `Audit` (Nhật ký Kiểm toán & Đăng nhập)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Audit` (
    `AuditID` VARCHAR(20) NOT NULL,
    `Status` NVARCHAR(255) NOT NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UserName` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`AuditID`),
    INDEX `idx_Audit_UserName` (`UserName`),
    INDEX `idx_Audit_Create_at` (`Create_at` DESC),
    CONSTRAINT `FK_Audit_User` FOREIGN KEY (`UserName`)
        REFERENCES `User` (`UserName`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. BẢNG `LanguageCode` (Danh mục Ngôn ngữ hỗ trợ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LanguageCode` (
    `LanguageID` VARCHAR(20) NOT NULL, -- 'vi', 'en', 'ja', 'ko', 'zh'
    `LanguageName` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`LanguageID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. BẢNG `POI` (Điểm Di tích / Hiện vật Lịch sử Địa đạo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `POI` (
    `PoiID` VARCHAR(20) NOT NULL,
    `Title` NVARCHAR(255) NOT NULL,
    `Short_Description` NVARCHAR(255) NULL,
    `Description` NVARCHAR(255) NULL,
    `Image_Url` VARCHAR(255) NULL,
    `Latitude` DECIMAL(10, 7) NOT NULL CHECK (`Latitude` BETWEEN -90 AND 90),
    `Longitude` DECIMAL(10, 7) NOT NULL CHECK (`Longitude` BETWEEN -180 AND 180),
    `Radius` INT NOT NULL DEFAULT 30 CHECK (`Radius` > 0),
    `Area_zone` VARCHAR(255) NOT NULL DEFAULT 'GROUND',
    `Is_Active` BOOLEAN NOT NULL DEFAULT TRUE,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Update_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `Create_by` VARCHAR(20) NULL,
    PRIMARY KEY (`PoiID`),
    INDEX `idx_POI_Create_by` (`Create_by`),
    INDEX `idx_POI_Coordinates` (`Latitude`, `Longitude`),
    CONSTRAINT `FK_POI_User` FOREIGN KEY (`Create_by`)
        REFERENCES `User` (`UserName`)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. BẢNG `POITranslation` (Bản dịch Đa ngôn ngữ của Di tích)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `POITranslation` (
    `StranID` VARCHAR(20) NOT NULL,
    `Title` NVARCHAR(255) NOT NULL,
    `Short_Description` NVARCHAR(255) NULL,
    `Description` NVARCHAR(255) NULL,
    `Status` NVARCHAR(255) NOT NULL DEFAULT 'PENDING',
    `Review_at` DATETIME NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Update_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `Review_by` VARCHAR(20) NULL,
    `PoiID` VARCHAR(20) NOT NULL,
    `LanguageID` VARCHAR(20) NOT NULL,
    `UserName` VARCHAR(20) NULL,
    PRIMARY KEY (`StranID`),
    UNIQUE KEY `UQ_POITranslation_PoiID_LanguageID` (`PoiID`, `LanguageID`),
    INDEX `idx_POITranslation_PoiID` (`PoiID`),
    INDEX `idx_POITranslation_LanguageID` (`LanguageID`),
    INDEX `idx_POITranslation_UserName` (`UserName`),
    INDEX `idx_POITranslation_Status` (`Status`),
    CONSTRAINT `FK_POITranslation_POI` FOREIGN KEY (`PoiID`)
        REFERENCES `POI` (`PoiID`)
        ON DELETE CASCADE,
    CONSTRAINT `FK_POITranslation_LanguageCode` FOREIGN KEY (`LanguageID`)
        REFERENCES `LanguageCode` (`LanguageID`)
        ON DELETE RESTRICT,
    CONSTRAINT `FK_POITranslation_User` FOREIGN KEY (`UserName`)
        REFERENCES `User` (`UserName`)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. BẢNG `POIAudio` (Tệp Âm thanh Thuyết minh AI - Neural TTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `POIAudio` (
    `AudioID` VARCHAR(20) NOT NULL,
    `Audio_url` TEXT NOT NULL,
    `Duration` DECIMAL(6, 1) NULL,
    `File_size` BIGINT NULL,
    `Status` NVARCHAR(255) NOT NULL DEFAULT 'READY',
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Update_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `StranID` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`AudioID`),
    INDEX `idx_POIAudio_StranID` (`StranID`),
    CONSTRAINT `FK_POIAudio_POITranslation` FOREIGN KEY (`StranID`)
        REFERENCES `POITranslation` (`StranID`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. BẢNG `VisitorSession` (Phiên Tham quan 24h & Khôi phục Đa thiết bị)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `VisitorSession` (
    `SessionID` VARCHAR(20) NOT NULL,
    `SessionCode` VARCHAR(255) NOT NULL,
    `SessionToken` VARCHAR(255) NOT NULL,
    `DeviceFingerPrint` VARCHAR(255) NULL,
    `Status` NVARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
    `Activate_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Expire_at` DATETIME NOT NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `PreferredLanguage` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`SessionID`),
    UNIQUE KEY `UQ_VisitorSession_SessionCode` (`SessionCode`),
    UNIQUE KEY `UQ_VisitorSession_SessionToken` (`SessionToken`),
    INDEX `idx_VisitorSession_PreferredLanguage` (`PreferredLanguage`),
    INDEX `idx_VisitorSession_Status_Expire` (`Status`, `Expire_at`),
    CONSTRAINT `FK_VisitorSession_LanguageCode` FOREIGN KEY (`PreferredLanguage`)
        REFERENCES `LanguageCode` (`LanguageID`)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. BẢNG `Transaction` (Giao dịch Thanh toán Mua vé Số)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Transaction` (
    `TransactionID` VARCHAR(20) NOT NULL,
    `PayAmount` INT NOT NULL CHECK (`PayAmount` >= 0),
    `Currency` VARCHAR(20) NOT NULL DEFAULT 'VND',
    `PaymentGateway` VARCHAR(255) NOT NULL,
    `PaymentMethod` VARCHAR(255) NULL,
    `Status` NVARCHAR(255) NOT NULL DEFAULT 'PENDING',
    `GatewayTransactionID` TEXT NULL, -- Tương ứng varchar(MAX) trên ERD
    `GatewayPayload` TEXT NULL,
    `Paid_at` DATETIME NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `SessionID` VARCHAR(20) NULL,
    PRIMARY KEY (`TransactionID`),
    INDEX `idx_Transaction_SessionID` (`SessionID`),
    INDEX `idx_Transaction_Status_Create_at` (`Status`, `Create_at` DESC),
    CONSTRAINT `FK_Transaction_VisitorSession` FOREIGN KEY (`SessionID`)
        REFERENCES `VisitorSession` (`SessionID`)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. BẢNG `POITrigger` (Sự kiện Kích hoạt Thuyết minh & Thời gian dừng chân)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `POITrigger` (
    `TriggerID` VARCHAR(20) NOT NULL,
    `DwellTime` INT NOT NULL DEFAULT 0 CHECK (`DwellTime` >= 0),
    `Trigger_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `SessionID` VARCHAR(20) NOT NULL,
    `PoiID` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`TriggerID`),
    INDEX `idx_POITrigger_SessionID` (`SessionID`),
    INDEX `idx_POITrigger_PoiID` (`PoiID`),
    INDEX `idx_POITrigger_Trigger_at` (`Trigger_at` DESC),
    CONSTRAINT `FK_POITrigger_VisitorSession` FOREIGN KEY (`SessionID`)
        REFERENCES `VisitorSession` (`SessionID`)
        ON DELETE CASCADE,
    CONSTRAINT `FK_POITrigger_POI` FOREIGN KEY (`PoiID`)
        REFERENCES `POI` (`PoiID`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Data Dictionary (MySQL 8.0+ Schema)

Chi tiết mã nguồn DDL script MySQL khởi tạo CSDL đã được tích hợp tại mục [2.1. MySQL Schema DDL Script](#21-mysql-schema-ddl-script) ở trên.

### 3.1. Bảng `users` (Tài khoản Quản trị & Nhân sự)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `user_name` | `VARCHAR(255)` | `PRIMARY KEY` | Tên đăng nhập của tài khoản |
| `email` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Địa chỉ email liên hệ |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Chuỗi băm mật khẩu (Bcrypt/Argon2id) |
| `full_name` | `VARCHAR(255)` | `NULL` | Họ và tên nhân sự |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Trạng thái hoạt động |
| `failed_attempts` | `INTEGER` | `DEFAULT 0` | Số lần đăng nhập sai liên tiếp |
| `locked_until` | `TIMESTAMPTZ` | `NULL` | Thời điểm mở khóa sau khi bị khóa 15p |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm tạo tài khoản |
| `update_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm cập nhật thông tin |

---

### 3.2. Bảng `audit` (Nhật ký Kiểm toán / Đăng nhập)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `audit_id` | `VARCHAR(20)` | `PRIMARY KEY` | Định danh bản ghi kiểm toán |
| `user_name` | `VARCHAR(255)` | `NOT NULL, FK -> users(user_name)` | Tên đăng nhập tương ứng (ON DELETE CASCADE) |
| `status` | `VARCHAR(255)` | `NOT NULL` | Trạng thái (SUCCESS, FAILED, LOCKED) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm ghi nhận log |

---

### 3.3. Bảng `language_code` (Danh mục Ngôn ngữ Hỗ trợ)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `language_id` | `VARCHAR(20)` | `PRIMARY KEY` | Mã ngôn ngữ (`vi`, `en`, `ja`, `ko`, `zh`) |
| `language_name` | `VARCHAR(255)` | `NOT NULL` | Tên hiển thị của ngôn ngữ |

---

### 3.4. Bảng `pois` (Điểm Di tích Lịch sử Củ Chi)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `poi_id` | `VARCHAR(20)` | `PRIMARY KEY` | Mã định danh di tích |
| `title` | `VARCHAR(255)` | `NOT NULL` | Tên di tích tiếng Việt gốc |
| `short_description` | `VARCHAR(255)` | `NULL` | Đoạn tóm tắt xem trước trước khi mở khóa |
| `description` | `TEXT` | `NOT NULL` | Nội dung thuyết minh chi tiết |
| `image_url` | `VARCHAR(255)` | `NULL` | Đường dẫn ảnh bìa di tích |
| `latitude` | `NUMERIC(10, 7)` | `NOT NULL, CHECK (-90..90)` | Vĩ độ GPS ngoài trời |
| `longitude` | `NUMERIC(10, 7)` | `NOT NULL, CHECK (-180..180)` | Kinh độ GPS ngoài trời |
| `radius` | `INTEGER` | `DEFAULT 30, CHECK (> 0)` | Bán kính Geofence tự động kích hoạt (m) |
| `area_zone` | `VARCHAR(255)` | `DEFAULT 'GROUND'` | Khu vực địa hình / hầm địa đạo |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Cờ kích hoạt hiển thị cho khách |
| `create_by` | `VARCHAR(255)` | `FK -> users(user_name)` | Người tạo di tích (ON DELETE SET NULL) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm tạo bản ghi |
| `update_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm cập nhật gần nhất |

---

### 3.5. Bảng `poi_translation` (Bản dịch Đa ngôn ngữ)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `stran_id` | `VARCHAR(20)` | `PRIMARY KEY` | Định danh bản dịch |
| `poi_id` | `VARCHAR(20)` | `NOT NULL, FK -> pois(poi_id)` | Di tích được dịch (ON DELETE CASCADE) |
| `language_id` | `VARCHAR(20)` | `NOT NULL, FK -> language_code(language_id)` | Mã ngôn ngữ dịch sang |
| `user_name` | `VARCHAR(255)` | `FK -> users(user_name)` | Giám tuyển / người duyệt |
| `title` | `VARCHAR(255)` | `NOT NULL` | Tiêu đề đã dịch |
| `short_description` | `VARCHAR(255)` | `NULL` | Mô tả tóm tắt đã dịch |
| `description` | `TEXT` | `NOT NULL` | Toàn văn thuyết minh đã dịch |
| `status` | `VARCHAR(255)` | `DEFAULT 'PENDING'` | Trạng thái (`PENDING`, `APPROVED`, `PUBLISHED`) |
| `review_by` | `VARCHAR(20)` | `NULL` | Người phê duyệt |
| `review_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm phê duyệt |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm tạo bản dịch |
| `update_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm cập nhật bản dịch |

* **Unique Constraint:** `UNIQUE (poi_id, language_id)`

---

### 3.6. Bảng `poi_audio` (Tệp Âm thanh AI - Edge-TTS)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `audio_id` | `VARCHAR(20)` | `PRIMARY KEY` | Định danh tệp âm thanh |
| `stran_id` | `VARCHAR(20)` | `NOT NULL, FK -> poi_translation(stran_id)` | Bản dịch tương ứng (ON DELETE CASCADE) |
| `audio_url` | `TEXT` | `NOT NULL` | Đường dẫn file `.mp3` tĩnh trên server |
| `duration_seconds` | `NUMERIC(6, 1)` | `NULL` | Thời lượng phát (giây) |
| `file_size` | `BIGINT` | `NULL` | Dung lượng tệp (bytes) phục vụ cảnh báo >85% |
| `status` | `VARCHAR(255)` | `DEFAULT 'READY'` | Trạng thái TTS (`GENERATING`, `READY`, `NEEDS_UPDATE`) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm tạo file |
| `update_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm tái tổng hợp gần nhất |

---

### 3.7. Bảng `visitor_session` (Phiên Tham quan Du khách 24h)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `session_id` | `VARCHAR(20)` | `PRIMARY KEY` | Định danh phiên tham quan |
| `session_code` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Mã khôi phục phiên (dùng đổi thiết bị) |
| `session_token` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Token JWT/Bearer mở khóa nghe audio |
| `device_fingerprint` | `VARCHAR(255)` | `NULL` | Dấu vân tay thiết bị du khách |
| `preferred_language` | `VARCHAR(20)` | `NOT NULL, FK -> language_code` | Ngôn ngữ du khách đã chọn |
| `status` | `VARCHAR(255)` | `DEFAULT 'ACTIVE'` | Trạng thái phiên (`ACTIVE`, `EXPIRED`) |
| `activate_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm kích hoạt phiên |
| `expire_at` | `TIMESTAMPTZ` | `NOT NULL` | Thời điểm hết hạn phiên (24 giờ) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm tạo phiên ban đầu |

---

### 3.8. Bảng `transaction` (Giao dịch Thanh toán Vé Số)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `transaction_id` | `VARCHAR(20)` | `PRIMARY KEY` | Mã giao dịch nội bộ |
| `session_id` | `VARCHAR(20)` | `FK -> visitor_session(session_id)` | Phiên du khách được mở khóa |
| `pay_amount` | `INTEGER` | `NOT NULL, CHECK (pay_amount >= 0)` | Số tiền vé tham quan (VND) |
| `currency` | `VARCHAR(20)` | `DEFAULT 'VND'` | Đơn vị tiền tệ |
| `payment_gateway` | `VARCHAR(255)` | `NOT NULL` | Cổng thanh toán (`VIETQR`, `PAYOS`, `STRIPE`) |
| `payment_method` | `VARCHAR(255)` | `NULL` | Phương thức thanh toán (QR, Thẻ, ATM) |
| `status` | `VARCHAR(255)` | `DEFAULT 'PENDING'` | Trạng thái (`PENDING`, `PAID`, `FAILED`) |
| `gateway_transaction_id` | `VARCHAR(255)` | `NULL` | Mã giao dịch phía cổng thanh toán cấp |
| `gateway_payload` | `TEXT` | `NULL` | Dữ liệu phản hồi Webhook đối soát |
| `paid_at` | `TIMESTAMPTZ` | `NULL` | Thời điểm thanh toán thành công |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm khởi tạo giao dịch |

---

### 3.9. Bảng `poi_trigger` (Sự kiện Kích hoạt Thuyết minh Geofence)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `trigger_id` | `VARCHAR(20)` | `PRIMARY KEY` | Định danh sự kiện kích hoạt |
| `session_id` | `VARCHAR(20)` | `NOT NULL, FK -> visitor_session` | Phiên du khách (ON DELETE CASCADE) |
| `poi_id` | `VARCHAR(20)` | `NOT NULL, FK -> pois` | Điểm di tích được nghe (ON DELETE CASCADE) |
| `dwell_time` | `INTEGER` | `DEFAULT 0, CHECK (dwell_time >= 0)` | Thời gian dừng chân tại di tích (giây) |
| `trigger_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Mốc thời gian kích hoạt phát thuyết minh |
