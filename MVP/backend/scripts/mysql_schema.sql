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
    `GatewayTransactionID` TEXT NULL, -- Corresponding to varchar(MAX) in ERD
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
        ON DELETE CASCADE)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;