import os
from pathlib import Path

# Thư mục gốc backend
BASE_DIR = Path(__file__).resolve().parent

# Đường dẫn CSDL SQLite & Thư mục static
DATABASE_PATH = os.getenv("DATABASE_URL", str(BASE_DIR / "data" / "data.db"))
STATIC_DIR = Path(os.getenv("STATIC_DIR", str(BASE_DIR / "static")))

# Các thư mục tĩnh con
AUDIO_DIR = STATIC_DIR / "audio"
QR_DIR = STATIC_DIR / "qr"
IMAGE_DIR = STATIC_DIR / "images"

# Đảm bảo các thư mục luôn tồn tại
for folder in [STATIC_DIR, AUDIO_DIR, QR_DIR, IMAGE_DIR, Path(DATABASE_PATH).parent]:
    folder.mkdir(parents=True, exist_ok=True)

# Cấu hình ngôn ngữ hỗ trợ
PRIMARY_LANGUAGE = "vi"
TARGET_LANGUAGES = [lang.strip() for lang in os.getenv("TARGET_LANGUAGES", "en,ja,ko,zh").split(",") if lang.strip()]
ALL_LANGUAGES = [PRIMARY_LANGUAGE] + TARGET_LANGUAGES

# Cấu hình giọng đọc Edge-TTS tương ứng từng ngôn ngữ (UC-09)
TTS_VOICE_MAPPING = {
    "vi": "vi-VN-HoaiMyNeural",
    "en": "en-US-AriaNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-SunHiNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
}

# Domain hoặc base URL của Frontend để sinh mã QR
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
