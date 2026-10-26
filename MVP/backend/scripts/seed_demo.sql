-- Idempotent visitor-map demo data; only DEMO* records are inserted/updated.
SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO LanguageCode (LanguageID, LanguageName)
VALUES
    ('vi', 'Tiếng Việt'),
    ('en', 'English'),
    ('ja', '日本語'),
    ('ko', '한국어')
ON DUPLICATE KEY UPDATE LanguageName = VALUES(LanguageName);

INSERT INTO POI
    (PoiID, Title, Short_Description, Latitude, Longitude, Radius, Is_Active)
VALUES
    ('DEMOPOI02', 'Hầm chỉ huy demo', 'Khu vực chỉ huy mô phỏng', 11.1440, 106.4622, 30, TRUE),
    ('DEMOPOI03', 'Hố bom demo', 'Dấu tích hố bom mô phỏng', 11.1420, 106.4642, 30, TRUE),
    ('DEMOPOI04', 'Bẫy tre demo', 'Mô hình bẫy tre', 11.1450, 106.4648, 30, TRUE),
    ('DEMOPOI05', 'Phòng trưng bày demo', 'Khu trưng bày mô phỏng', 11.1415, 106.4615, 30, TRUE)
ON DUPLICATE KEY UPDATE
    Title = VALUES(Title),
    Short_Description = VALUES(Short_Description),
    Latitude = VALUES(Latitude),
    Longitude = VALUES(Longitude),
    Radius = VALUES(Radius),
    Is_Active = VALUES(Is_Active);

INSERT INTO POITranslation
    (StranID, Title, Short_Description, Status, PoiID, LanguageID)
VALUES
    ('D01EN', 'Demo visitor attraction', 'Demo map location', 'PUBLISHED', 'DEMOPOI01', 'en'),
    ('D01JA', 'デモ見学スポット', 'デモ地図スポット', 'PUBLISHED', 'DEMOPOI01', 'ja'),
    ('D01KO', '데모 관람 지점', '데모 지도 위치', 'PUBLISHED', 'DEMOPOI01', 'ko'),
    ('D02VI', 'Hầm chỉ huy demo', 'Khu vực chỉ huy mô phỏng', 'PUBLISHED', 'DEMOPOI02', 'vi'),
    ('D02EN', 'Command bunker', 'Demo command area', 'PUBLISHED', 'DEMOPOI02', 'en'),
    ('D02JA', '司令部の跡', 'デモ指揮エリア', 'PUBLISHED', 'DEMOPOI02', 'ja'),
    ('D02KO', '지휘 벙커', '데모 지휘 구역', 'PUBLISHED', 'DEMOPOI02', 'ko'),
    ('D03VI', 'Hố bom demo', 'Dấu tích hố bom mô phỏng', 'PUBLISHED', 'DEMOPOI03', 'vi'),
    ('D03EN', 'B52 crater', 'Demo bomb crater', 'PUBLISHED', 'DEMOPOI03', 'en'),
    ('D03JA', 'B52爆弾跡', 'デモ爆弾跡', 'PUBLISHED', 'DEMOPOI03', 'ja'),
    ('D03KO', 'B52 폭탄 구덩이', '데모 폭탄 흔적', 'PUBLISHED', 'DEMOPOI03', 'ko'),
    ('D04VI', 'Bẫy tre demo', 'Mô hình bẫy tre', 'PUBLISHED', 'DEMOPOI04', 'vi'),
    ('D04EN', 'Bamboo trap', 'Demo bamboo trap', 'PUBLISHED', 'DEMOPOI04', 'en'),
    ('D04JA', '竹の罠', 'デモ竹の罠', 'PUBLISHED', 'DEMOPOI04', 'ja'),
    ('D04KO', '대나무 함정', '데모 대나무 함정', 'PUBLISHED', 'DEMOPOI04', 'ko'),
    ('D05VI', 'Phòng trưng bày demo', 'Khu trưng bày mô phỏng', 'PUBLISHED', 'DEMOPOI05', 'vi'),
    ('D05EN', 'Exhibition gallery', 'Demo exhibition area', 'PUBLISHED', 'DEMOPOI05', 'en'),
    ('D05JA', '展示ギャラリー', 'デモ展示エリア', 'PUBLISHED', 'DEMOPOI05', 'ja'),
    ('D05KO', '전시 갤러리', '데모 전시 구역', 'PUBLISHED', 'DEMOPOI05', 'ko')
ON DUPLICATE KEY UPDATE
    Title = VALUES(Title),
    Short_Description = VALUES(Short_Description),
    Status = VALUES(Status);

INSERT INTO POIAudio (AudioID, Audio_url, Status, StranID)
VALUES
    ('DA01EN', 'demo-placeholder.mp3', 'READY', 'D01EN'),
    ('DA01JA', 'demo-placeholder.mp3', 'READY', 'D01JA'),
    ('DA01KO', 'demo-placeholder.mp3', 'READY', 'D01KO'),
    ('DA02VI', 'demo-placeholder.mp3', 'READY', 'D02VI'),
    ('DA02EN', 'demo-placeholder.mp3', 'READY', 'D02EN'),
    ('DA02JA', 'demo-placeholder.mp3', 'READY', 'D02JA'),
    ('DA02KO', 'demo-placeholder.mp3', 'READY', 'D02KO'),
    ('DA03VI', 'demo-placeholder.mp3', 'READY', 'D03VI'),
    ('DA03EN', 'demo-placeholder.mp3', 'READY', 'D03EN'),
    ('DA03JA', 'demo-placeholder.mp3', 'READY', 'D03JA'),
    ('DA03KO', 'demo-placeholder.mp3', 'READY', 'D03KO'),
    ('DA04VI', 'demo-placeholder.mp3', 'READY', 'D04VI'),
    ('DA04EN', 'demo-placeholder.mp3', 'READY', 'D04EN'),
    ('DA04JA', 'demo-placeholder.mp3', 'READY', 'D04JA'),
    ('DA04KO', 'demo-placeholder.mp3', 'READY', 'D04KO'),
    ('DA05VI', 'demo-placeholder.mp3', 'READY', 'D05VI'),
    ('DA05EN', 'demo-placeholder.mp3', 'READY', 'D05EN'),
    ('DA05JA', 'demo-placeholder.mp3', 'READY', 'D05JA'),
    ('DA05KO', 'demo-placeholder.mp3', 'READY', 'D05KO')
ON DUPLICATE KEY UPDATE
    Audio_url = VALUES(Audio_url),
    Status = VALUES(Status),
    StranID = VALUES(StranID);

COMMIT;
