# Database Schema & ERD Design (Smart Museum POC)


---

## 1. Database Architecture Overview

During the Proof of Concept (POC) phase, the system leverages **SQLite** configured in **WAL (Write-Ahead Logging)** mode with `PRAGMA foreign_keys = ON;` to ensure, after that we switch to MySQL 8.0+ (InnoDB) for production use:
- **High Performance & Non-blocking Concurrency:** Mobile visitor reads can occur simultaneously without being locked by backend write jobs (Google Translation & Edge-TTS synthesis background tasks).
- **Data Integrity:** Cascade deletion automatically cleans up related translations and audio records when a POI is deleted.

---

## 2. Entity Relationship Diagram now with MYSQL (ERD)

<img width="2246" height="1563" alt="Untitled (2)" src="https://github.com/user-attachments/assets/c8c96762-d194-4539-a52a-4a6fc08b7aa8" />


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
-- 1. TABLE `User` (Internal Administration & Staff Accounts)
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
-- 2. TABLE `Audit` (Audit Logs & Authentication Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Audit` (
    `AuditID` VARCHAR(20) NOT NULL,
    `Status` NVARCHAR(255) NOT NULL,
    `Ip_address` VARCHAR(45) NULL,
    `Details` NVARCHAR(255) NULL,
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
-- 3. TABLE `LanguageCode` (Supported Languages Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LanguageCode` (
    `LanguageID` VARCHAR(20) NOT NULL, -- 'vi', 'en', 'ja', 'ko', 'zh'
    `LanguageName` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`LanguageID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLE `POI` (Historical Relic / Point of Interest)
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
-- 5. TABLE `POITranslation` (Multilingual POI Translations)
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
-- 6. TABLE `POIAudio` (AI Narration Audio Files - Neural TTS)
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
-- 7. TABLE `VisitorSession` (24h Visitor Session & Cross-device Recovery)
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
-- 8. TABLE `Transaction` (Digital Ticket Payment Transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Transaction` (
    `TransactionID` VARCHAR(20) NOT NULL,
    `PayAmount` INT NOT NULL CHECK (`PayAmount` >= 0),
    `Currency` VARCHAR(20) NOT NULL DEFAULT 'VND',
    `PaymentGateway` VARCHAR(255) NOT NULL,
    `PaymentMethod` VARCHAR(255) NULL,
    `Status` NVARCHAR(255) NOT NULL DEFAULT 'PENDING',
    `GatewayTransactionID` VARCHAR(255) NULL,
    `GatewayPayload` JSON NULL,
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
-- 9. TABLE `POITrigger` (Narration Trigger Events & Dwell Time)
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

The full MySQL initialization DDL script is provided in section [2.1. MySQL Schema DDL Script](#21-mysql-schema-ddl-script) above.

### 3.1. Table `users` (Administration & Staff Accounts)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `user_name` | `VARCHAR(255)` | `PRIMARY KEY` | Account username / unique login identifier |
| `email` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Contact email address |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Password hash string (Bcrypt/Argon2id) |
| `full_name` | `VARCHAR(255)` | `NULL` | Full name of staff member |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Account active status |
| `failed_attempts` | `INTEGER` | `DEFAULT 0` | Consecutive failed login attempts |
| `locked_until` | `TIMESTAMPTZ` | `NULL` | Lockout expiration timestamp (after 15-min lockout) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |
| `update_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Last profile update timestamp |

---

### 3.2. Table `audit` (Audit & Login Logs)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `audit_id` | `VARCHAR(20)` | `PRIMARY KEY` | Unique audit record identifier |
| `user_name` | `VARCHAR(255)` | `NOT NULL, FK -> users(user_name)` | Associated username (ON DELETE CASCADE) |
| `status` | `VARCHAR(255)` | `NOT NULL` | Status (SUCCESS, FAILED, LOCKED) |
| `ip_address` | `VARCHAR(45)` | `NULL` | Client IP address (IPv4/IPv6) that produced the audited action |
| `details` | `VARCHAR(255)` | `NULL` | Contextual payload describing the audited action (action name, target entity, JSON summary) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Audit log entry timestamp |

---

### 3.3. Table `language_code` (Supported Languages Catalog)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `language_id` | `VARCHAR(20)` | `PRIMARY KEY` | ISO language code (`vi`, `en`, `ja`, `ko`, `zh`) |
| `language_name` | `VARCHAR(255)` | `NOT NULL` | Display name of the language |

---

### 3.4. Table `pois` (Cu Chi Historic Points of Interest)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `poi_id` | `VARCHAR(20)` | `PRIMARY KEY` | Unique POI identifier |
| `title` | `VARCHAR(255)` | `NOT NULL` | Original Vietnamese POI name |
| `short_description` | `VARCHAR(255)` | `NULL` | Short preview summary before unlocking |
| `description` | `TEXT` | `NOT NULL` | Detailed narration content |
| `image_url` | `VARCHAR(255)` | `NULL` | POI cover image URL |
| `latitude` | `NUMERIC(10, 7)` | `NOT NULL, CHECK (-90..90)` | Outdoor GPS latitude |
| `longitude` | `NUMERIC(10, 7)` | `NOT NULL, CHECK (-180..180)` | Outdoor GPS longitude |
| `radius` | `INTEGER` | `DEFAULT 30, CHECK (> 0)` | Automatic trigger geofence radius (meters) |
| `area_zone` | `VARCHAR(255)` | `DEFAULT 'GROUND'` | Terrain zone / tunnel level classification |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Visibility flag for visitors |
| `create_by` | `VARCHAR(255)` | `FK -> users(user_name)` | POI creator username (ON DELETE SET NULL) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |
| `update_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Last update timestamp |

---

### 3.5. Table `poi_translation` (Multilingual POI Translations)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `stran_id` | `VARCHAR(20)` | `PRIMARY KEY` | Unique translation identifier |
| `poi_id` | `VARCHAR(20)` | `NOT NULL, FK -> pois(poi_id)` | Associated POI (ON DELETE CASCADE) |
| `language_id` | `VARCHAR(20)` | `NOT NULL, FK -> language_code(language_id)` | Target language code |
| `user_name` | `VARCHAR(255)` | `FK -> users(user_name)` | Curator / reviewer username |
| `title` | `VARCHAR(255)` | `NOT NULL` | Translated title |
| `short_description` | `VARCHAR(255)` | `NULL` | Translated preview summary |
| `description` | `TEXT` | `NOT NULL` | Translated full narration text |
| `status` | `VARCHAR(255)` | `DEFAULT 'PENDING'` | Workflow status (`PENDING`, `APPROVED`, `PUBLISHED`) |
| `review_by` | `VARCHAR(20)` | `NULL` | Reviewer identifier |
| `review_at` | `TIMESTAMPTZ` | `NULL` | Review approval timestamp |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Translation creation timestamp |
| `update_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Last translation update timestamp |

* **Unique Constraint:** `UNIQUE (poi_id, language_id)`

---

### 3.6. Table `poi_audio` (AI Narration Audio Files - Edge-TTS)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `audio_id` | `VARCHAR(20)` | `PRIMARY KEY` | Unique audio record identifier |
| `stran_id` | `VARCHAR(20)` | `NOT NULL, FK -> poi_translation(stran_id)` | Associated translation (ON DELETE CASCADE) |
| `audio_url` | `TEXT` | `NOT NULL` | Static `.mp3` file URL / path on server |
| `duration_seconds` | `NUMERIC(6, 1)` | `NULL` | Playback duration (seconds) |
| `file_size` | `BIGINT` | `NULL` | File size (bytes) for >85% storage warning |
| `status` | `VARCHAR(255)` | `DEFAULT 'READY'` | TTS synthesis status (`GENERATING`, `READY`, `NEEDS_UPDATE`) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Audio record creation timestamp |
| `update_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Last re-synthesis timestamp |

---

### 3.7. Table `visitor_session` (24-Hour Visitor Session)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `session_id` | `VARCHAR(20)` | `PRIMARY KEY` | Unique visitor session identifier |
| `session_code` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Session recovery code (for device switching) |
| `session_token` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | JWT/Bearer access token for audio playback |
| `device_fingerprint` | `VARCHAR(255)` | `NULL` | Visitor device fingerprint |
| `preferred_language` | `VARCHAR(20)` | `NOT NULL, FK -> language_code` | Selected preferred language |
| `status` | `VARCHAR(255)` | `DEFAULT 'ACTIVE'` | Session status (`ACTIVE`, `EXPIRED`) |
| `activate_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Session activation timestamp |
| `expire_at` | `TIMESTAMPTZ` | `NOT NULL` | Session expiration timestamp (24 hours) |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Initial session creation timestamp |

---

### 3.8. Table `transaction` (Digital Ticket Payment Transactions)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `transaction_id` | `VARCHAR(20)` | `PRIMARY KEY` | Internal payment transaction identifier |
| `session_id` | `VARCHAR(20)` | `FK -> visitor_session(session_id)` | Unlocked visitor session |
| `pay_amount` | `INTEGER` | `NOT NULL, CHECK (pay_amount >= 0)` | Ticket payment amount (VND) |
| `currency` | `VARCHAR(20)` | `DEFAULT 'VND'` | Currency code |
| `payment_gateway` | `VARCHAR(255)` | `NOT NULL` | Payment gateway (`VIETQR`, `PAYOS`, `STRIPE`) |
| `payment_method` | `VARCHAR(255)` | `NULL` | Payment method (QR, Card, ATM) |
| `status` | `VARCHAR(255)` | `DEFAULT 'PENDING'` | Status (`PENDING`, `PAID`, `FAILED`) |
| `gateway_transaction_id` | `VARCHAR(255)` | `NULL` | Transaction ID issued by payment gateway |
| `gateway_payload` | `TEXT` | `NULL` | Webhook reconciliation response payload |
| `paid_at` | `TIMESTAMPTZ` | `NULL` | Successful payment timestamp |
| `create_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Transaction initialization timestamp |

---

### 3.9. Table `poi_trigger` (Geofence Narration Trigger Events)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `trigger_id` | `VARCHAR(20)` | `PRIMARY KEY` | Unique trigger event identifier |
| `session_id` | `VARCHAR(20)` | `NOT NULL, FK -> visitor_session` | Visitor session (ON DELETE CASCADE) |
| `poi_id` | `VARCHAR(20)` | `NOT NULL, FK -> pois` | Triggered POI (ON DELETE CASCADE) |
| `dwell_time` | `INTEGER` | `DEFAULT 0, CHECK (dwell_time >= 0)` | Dwell time at POI (seconds) |
| `trigger_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Narration playback trigger timestamp |
