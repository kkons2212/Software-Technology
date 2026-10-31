# Database Schema & ERD Design (Smart Museum POC)


---

## 1. Database Architecture Overview

The system runs exclusively on **MySQL 8.0+ (InnoDB)** for local development, testing, and production. The Docker database image documented in `DatabaseSetup.md` (`kocoten/smart-museum-db:v1`) provisions this schema:
- **High Performance & Non-blocking Concurrency:** Mobile visitor reads can occur simultaneously without being locked by backend write jobs (Google Translation & Edge-TTS synthesis background tasks).
- **Data Integrity:** Deleting a POI cascades to its translations (including their audio metadata) and POI trigger records.

---

## 2. Entity Relationship Diagram now with MYSQL (ERD)
<img width="2462" height="1496" alt="Untitled (5)" src="https://github.com/user-attachments/assets/70ed32c8-198f-47b8-b058-53197cb219e8" />

The DDL and data dictionary below define the authoritative schema, including the optional transaction-to-session relationship and the merged audio metadata.


### 2.1. MySQL Schema DDL Script

```sql
-- ==============================================================================
-- Schema DDL: Cu Chi Tunnels Smart Multilingual Guide
-- Database Engine: MySQL 8.0+ (InnoDB)
-- Source: dbdiagram.io ERD Specification
-- DATETIME values use the application's UTC+07:00 convention.
-- CHECK constraints are enforced by MySQL 8.0.16 and later.
-- Features:
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `smart_museum` 
    DEFAULT CHARACTER SET utf8mb4 
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `smart_museum`;
SET time_zone = '+07:00';

-- ------------------------------------------------------------------------------
-- 1. TABLE `User` (Internal Administration & Staff Accounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
    `UserName` VARCHAR(20) NOT NULL,
    `Email` VARCHAR(255) NOT NULL,
    `Password_hash` VARCHAR(255) NOT NULL,
    `FullName` NVARCHAR(255) NULL,
    `Is_Active` BOOLEAN NOT NULL DEFAULT TRUE,
    `FalsedAttempts` INT NOT NULL DEFAULT 0 CHECK (`FalsedAttempts` >= 0),
    `Lockeduntil` DATETIME NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Update_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`UserName`),
    UNIQUE KEY `UQ_User_Email` (`Email`),
    CONSTRAINT `CHK_User_Is_Active` CHECK (`Is_Active` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABLE `Audit` (Audit Logs & Authentication Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Audit` (
    `AuditID` VARCHAR(20) NOT NULL,
    `Status` NVARCHAR(255) NOT NULL,
    `Ip_address` VARCHAR(45) NULL,
    `Details` TEXT NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UserName` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`AuditID`),
    INDEX `idx_Audit_UserName` (`UserName`),
    INDEX `idx_Audit_Create_at` (`Create_at` DESC),
    CONSTRAINT `CHK_Audit_Status` CHECK (`Status` IN ('SUCCESS', 'FAILED', 'LOCKED')),
    CONSTRAINT `FK_Audit_User` FOREIGN KEY (`UserName`)
        REFERENCES `User` (`UserName`)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLE `LanguageCode` (Supported Languages Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LanguageCode` (
    `LanguageID` VARCHAR(20) NOT NULL, -- 'vi', 'en', 'ja', 'ko', 'zh'
    `LanguageName` NVARCHAR(255) NOT NULL,
    PRIMARY KEY (`LanguageID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLE `POI` (Historical Relic / Point of Interest)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `POI` (
    `PoiID` VARCHAR(20) NOT NULL,
    `Title` NVARCHAR(255) NOT NULL,
    `Short_Description` NVARCHAR(255) NULL,
    `Description` TEXT NULL,
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
    CONSTRAINT `CHK_POI_Is_Active` CHECK (`Is_Active` IN (0, 1)),
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
    `Description` TEXT NULL,
    `Status` NVARCHAR(255) NOT NULL DEFAULT 'PENDING',
    `Audio_url` TEXT NULL,
    `Duration` DECIMAL(6, 1) NULL,
    `File_size` BIGINT NULL,
    `Review_at` DATETIME NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Update_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `Review_by` VARCHAR(20) NULL,
    `PoiID` VARCHAR(20) NOT NULL,
    `LanguageID` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`StranID`),
    UNIQUE KEY `UQ_POITranslation_PoiID_LanguageID` (`PoiID`, `LanguageID`),
    INDEX `idx_POITranslation_PoiID` (`PoiID`),
    INDEX `idx_POITranslation_LanguageID` (`LanguageID`),
    INDEX `idx_POITranslation_Review_by` (`Review_by`),
    INDEX `idx_POITranslation_Status` (`Status`),
    CONSTRAINT `CHK_POITranslation_Status` CHECK (`Status` IN ('PENDING', 'DRAFT', 'NEEDS_UPDATE', 'PUBLISHED', 'FAILED')),
    CONSTRAINT `CHK_POITranslation_Duration` CHECK (`Duration` IS NULL OR `Duration` >= 0),
    CONSTRAINT `CHK_POITranslation_File_size` CHECK (`File_size` IS NULL OR `File_size` >= 0),
    CONSTRAINT `FK_POITranslation_POI` FOREIGN KEY (`PoiID`)
        REFERENCES `POI` (`PoiID`)
        ON DELETE CASCADE,
    CONSTRAINT `FK_POITranslation_LanguageCode` FOREIGN KEY (`LanguageID`)
        REFERENCES `LanguageCode` (`LanguageID`)
        ON DELETE RESTRICT,
    CONSTRAINT `FK_POITranslation_Reviewer` FOREIGN KEY (`Review_by`)
        REFERENCES `User` (`UserName`)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLE `Transaction` (Digital Ticket Payment Transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Transaction` (
    `TransactionID` VARCHAR(20) NOT NULL,
    `PayAmount` DECIMAL(12, 2) NOT NULL CHECK (`PayAmount` >= 0),
    `Currency` VARCHAR(3) NOT NULL DEFAULT 'VND',
    `PaymentGateway` VARCHAR(255) NOT NULL,
    `PaymentMethod` VARCHAR(255) NULL,
    `Status` NVARCHAR(255) NOT NULL DEFAULT 'PENDING',
    `GatewayTransactionID` VARCHAR(255) NULL,
    `GatewayPayload` JSON NULL,
    `Paid_at` DATETIME NULL,
    `Create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`TransactionID`),
    INDEX `idx_Transaction_Status_Create_at` (`Status`, `Create_at` DESC),
    CONSTRAINT `CHK_Transaction_Currency` CHECK (`Currency` IN ('VND', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'THB', 'AUD', 'CAD')),
    CONSTRAINT `CHK_Transaction_Status` CHECK (`Status` IN ('PENDING', 'PAID', 'EXPIRED', 'FAILED')),
    CONSTRAINT `CHK_Transaction_Paid_at` CHECK (
        (`Status` = 'PAID' AND `Paid_at` IS NOT NULL)
        OR (`Status` <> 'PAID' AND `Paid_at` IS NULL)
    )
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
    `TransactionID` VARCHAR(20) NOT NULL,
    PRIMARY KEY (`SessionID`),
    UNIQUE KEY `UQ_VisitorSession_SessionCode` (`SessionCode`),
    UNIQUE KEY `UQ_VisitorSession_SessionToken` (`SessionToken`),
    UNIQUE KEY `UQ_VisitorSession_TransactionID` (`TransactionID`),
    INDEX `idx_VisitorSession_PreferredLanguage` (`PreferredLanguage`),
    INDEX `idx_VisitorSession_Status_Expire` (`Status`, `Expire_at`),
    CONSTRAINT `CHK_VisitorSession_Status` CHECK (`Status` IN ('ACTIVE', 'EXPIRED')),
    CONSTRAINT `CHK_VisitorSession_Expire_after_Activate` CHECK (`Expire_at` > `Activate_at`),
    CONSTRAINT `FK_VisitorSession_LanguageCode` FOREIGN KEY (`PreferredLanguage`)
        REFERENCES `LanguageCode` (`LanguageID`)
        ON DELETE RESTRICT,
    CONSTRAINT `FK_VisitorSession_Transaction` FOREIGN KEY (`TransactionID`)
        REFERENCES `Transaction` (`TransactionID`)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLE `POITrigger` (Narration Trigger Events & Dwell Time)
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
        ON DELETE RESTRICT,
    CONSTRAINT `FK_POITrigger_POI` FOREIGN KEY (`PoiID`)
        REFERENCES `POI` (`PoiID`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Data Dictionary (MySQL 8.0+ Schema)

The full MySQL initialization DDL script is provided in section [2.1. MySQL Schema DDL Script](#21-mysql-schema-ddl-script) above.

### 3.1. Table `User` (Administration & Staff Accounts)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `UserName` | `VARCHAR(20)` | `PRIMARY KEY` | Account username / unique login identifier |
| `Email` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Contact email address |
| `Password_hash` | `VARCHAR(255)` | `NOT NULL` | Password hash string |
| `FullName` | `NVARCHAR(255)` | `NULL` | Full name of staff member |
| `Is_Active` | `BOOLEAN` | `DEFAULT TRUE, CHECK (0 OR 1)` | Account active status |
| `FalsedAttempts` | `INT` | `DEFAULT 0, CHECK (>= 0)` | Consecutive failed login attempts |
| `Lockeduntil` | `DATETIME` | `NULL` | Account lock expiration timestamp |
| `Create_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp (UTC+07:00 convention) |
| `Update_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last profile update timestamp |

---

### 3.2. Table `Audit` (Audit & Login Logs)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `AuditID` | `VARCHAR(20)` | `PRIMARY KEY` | Unique audit record identifier |
| `Status` | `NVARCHAR(255)` | `NOT NULL, CHECK (SUCCESS, FAILED, LOCKED)` | Audit/authentication result |
| `Ip_address` | `VARCHAR(45)` | `NULL` | Client IP address (IPv4/IPv6) |
| `Details` | `TEXT` | `NULL` | Contextual audit details |
| `Create_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Audit timestamp (UTC+07:00 convention) |
| `UserName` | `VARCHAR(20)` | `NOT NULL, FK -> User(UserName), ON DELETE RESTRICT` | Associated account; deletion is blocked while referenced |

---

### 3.3. Table `LanguageCode` (Supported Languages Catalog)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `LanguageID` | `VARCHAR(20)` | `PRIMARY KEY` | Language code |
| `LanguageName` | `NVARCHAR(255)` | `NOT NULL` | Display name of the language |

---

### 3.4. Table `POI` (Cu Chi Historic Points of Interest)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `PoiID` | `VARCHAR(20)` | `PRIMARY KEY` | Unique POI identifier |
| `Title` | `NVARCHAR(255)` | `NOT NULL` | Original Vietnamese POI name |
| `Short_Description` | `NVARCHAR(255)` | `NULL` | Short preview summary |
| `Description` | `TEXT` | `NULL` | Detailed POI description |
| `Image_Url` | `VARCHAR(255)` | `NULL` | POI cover image URL |
| `Latitude` | `DECIMAL(10,7)` | `NOT NULL, CHECK (-90..90)` | GPS latitude |
| `Longitude` | `DECIMAL(10,7)` | `NOT NULL, CHECK (-180..180)` | GPS longitude |
| `Radius` | `INT` | `DEFAULT 30, CHECK (> 0)` | Geofence radius in meters |
| `Is_Active` | `BOOLEAN` | `DEFAULT TRUE, CHECK (0 OR 1)` | Visibility flag |
| `Create_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `Update_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last update timestamp |
| `Create_by` | `VARCHAR(20)` | `NULL, FK -> User(UserName), ON DELETE SET NULL` | POI creator |

---

### 3.5. Table `POITranslation` (Multilingual POI Translations and Audio Metadata)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `StranID` | `VARCHAR(20)` | `PRIMARY KEY` | Unique translation identifier |
| `Title` | `NVARCHAR(255)` | `NOT NULL` | Translated title |
| `Short_Description` | `NVARCHAR(255)` | `NULL` | Translated preview |
| `Description` | `TEXT` | `NULL` | Translated description |
| `Status` | `NVARCHAR(255)` | `DEFAULT 'PENDING', CHECK (PENDING, DRAFT, NEEDS_UPDATE, PUBLISHED, FAILED)` | Translation workflow status |
| `Audio_url` | `TEXT` | `NULL` | Narration audio URL/path |
| `Duration` | `DECIMAL(6,1)` | `NULL, CHECK (>= 0)` | Audio duration in seconds |
| `File_size` | `BIGINT` | `NULL, CHECK (>= 0)` | Audio size in bytes |
| `Review_at` | `DATETIME` | `NULL` | Review timestamp |
| `Create_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `Update_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last update timestamp |
| `Review_by` | `VARCHAR(20)` | `NULL, FK -> User(UserName), ON DELETE RESTRICT` | Reviewer account |
| `PoiID` | `VARCHAR(20)` | `NOT NULL, FK -> POI(PoiID), ON DELETE CASCADE` | Associated POI |
| `LanguageID` | `VARCHAR(20)` | `NOT NULL, FK -> LanguageCode(LanguageID), ON DELETE RESTRICT` | Target language |

* **Unique Constraint:** `UNIQUE (PoiID, LanguageID)`; one current translation per POI and language.
* Audio metadata is stored on the translation row; there is no separate `POIAudio` table.

---

### 3.6. Table `VisitorSession` (24-Hour Visitor Session)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `SessionID` | `VARCHAR(20)` | `PRIMARY KEY` | Unique visitor session identifier |
| `SessionCode` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Session recovery code |
| `session_token` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | JWT/Bearer access token for audio playback |
| `DeviceFingerPrint` | `VARCHAR(255)` | `NULL` | Visitor device fingerprint |
| `PreferredLanguage` | `VARCHAR(20)` | `NOT NULL, FK -> LanguageCode(LanguageID), ON DELETE RESTRICT` | Selected preferred language |
| `Status` | `NVARCHAR(255)` | `DEFAULT 'ACTIVE', CHECK (ACTIVE, EXPIRED)` | Session status |
| `Activate_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Session activation timestamp |
| `Expire_at` | `DATETIME` | `NOT NULL, CHECK (> Activate_at)` | Session expiration timestamp |
| `Create_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Session creation timestamp |
| `TransactionID` | `VARCHAR(20)` | `NOT NULL, UNIQUE, FK -> Transaction(TransactionID), ON DELETE RESTRICT` | Payment transaction that created this session |

* **Relationship:** A transaction can have zero or one session; every session belongs to exactly one transaction.
* The foreign key does not enforce that the transaction is `PAID`; the application must verify payment before creating a session.
* The token column's exact DDL name is `SessionToken`.

---

### 3.7. Table `Transaction` (Digital Payment Transactions)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `TransactionID` | `VARCHAR(20)` | `PRIMARY KEY` | Internal payment transaction identifier |
| `PayAmount` | `DECIMAL(12,2)` | `NOT NULL, CHECK (>= 0)` | Payment amount |
| `Currency` | `VARCHAR(3)` | `DEFAULT 'VND', CHECK (VND, USD, EUR, GBP, JPY, SGD, THB, AUD, CAD)` | Supported currency |
| `PaymentGateway` | `VARCHAR(255)` | `NOT NULL` | Payment gateway |
| `PaymentMethod` | `VARCHAR(255)` | `NULL` | Payment method |
| `Status` | `NVARCHAR(255)` | `DEFAULT 'PENDING', CHECK (PENDING, PAID, EXPIRED, FAILED)` | Payment status |
| `GatewayTransactionID` | `VARCHAR(255)` | `NULL` | Gateway transaction identifier; not unique-constrained |
| `GatewayPayload` | `JSON` | `NULL` | Gateway/webhook payload |
| `Paid_at` | `DATETIME` | `NULL`; required iff `Status = 'PAID'` | Successful payment timestamp |
| `Create_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Transaction creation timestamp |

---

### 3.8. Table `POITrigger` (Geofence Narration Trigger Events)
| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `TriggerID` | `VARCHAR(20)` | `PRIMARY KEY` | Unique trigger event identifier |
| `DwellTime` | `INT` | `DEFAULT 0, CHECK (>= 0)` | Dwell time in seconds |
| `Trigger_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Trigger timestamp |
| `SessionID` | `VARCHAR(20)` | `NOT NULL, FK -> VisitorSession(SessionID), ON DELETE RESTRICT` | Session; deletion blocked while referenced |
| `PoiID` | `VARCHAR(20)` | `NOT NULL, FK -> POI(PoiID), ON DELETE CASCADE` | Triggered POI |
