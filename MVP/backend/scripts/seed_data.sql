-- ==============================================================================
-- Seed data for Cu Chi Tunnels - Ben Duoc Relic Area
-- Database: smart_museum (MySQL 8.0+)
-- POITranslation is intentionally not seeded.
-- ==============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE `smart_museum`;

-- ------------------------------------------------------------------------------
-- 1. SEED DEFAULT ADMINISTRATOR ACCOUNT
-- Username: admin
-- Password: Admin@12345 (Bcrypt hash cost=12)
-- ------------------------------------------------------------------------------
INSERT INTO `User` (
    `UserName`,
    `Email`,
    `Password_hash`,
    `FullName`,
    `Is_Active`,
    `FalsedAttempts`,
    `Lockeduntil`,
    `Create_at`,
    `Update_at`
) VALUES (
    'admin',
    'admin@cuchi.vn',
    '$2b$12$403XC4Nr53UXQ3CFzxtP7O4yADw4oA7QuWRY/SqnXhiYp2HHUytoC',
    'Quản trị viên Hệ thống',
    TRUE,
    0,
    NULL,
    NOW(),
    NOW()
), (
    'admin1',
    'admin1@cuchi.vn',
    '$2b$12$403XC4Nr53UXQ3CFzxtP7O4yADw4oA7QuWRY/SqnXhiYp2HHUytoC',
    'Quản trị viên Hệ thống 1',
    TRUE,
    0,
    NULL,
    NOW(),
    NOW()
), (
    'admin2',
    'admin2@cuchi.vn',
    '$2b$12$403XC4Nr53UXQ3CFzxtP7O4yADw4oA7QuWRY/SqnXhiYp2HHUytoC',
    'Quản trị viên Hệ thống 2',
    TRUE,
    0,
    NULL,
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    `Password_hash` = VALUES(`Password_hash`),
    `FullName` = VALUES(`FullName`),
    `Is_Active` = TRUE;

-- ------------------------------------------------------------------------------
-- 2. SEED SUPPORTED LANGUAGES CATALOG
-- ------------------------------------------------------------------------------
INSERT INTO `LanguageCode` (`LanguageID`, `LanguageName`) VALUES
    ('vi', 'Tiếng Việt'),
    ('en', 'English'),
    ('ja', '日本語'),
    ('ko', '한국어'),
    ('fr', 'Français'),
    ('zh', '中文')
ON DUPLICATE KEY UPDATE
    `LanguageName` = VALUES(`LanguageName`);

