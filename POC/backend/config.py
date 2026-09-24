import os
from pathlib import Path

# Thư mục gốc backend
BASE_DIR = Path(__file__).resolve().parent

# Nạp cấu hình từ .env nếu tồn tại
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except Exception:
    pass

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

# Hàm lấy Base URL động từ .env (tự động cập nhật không cần khởi động lại server)
def get_frontend_base_url() -> str:
    try:
        from dotenv import load_dotenv
        load_dotenv(BASE_DIR / ".env", override=True)
    except Exception:
        pass
    return os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

FRONTEND_BASE_URL = get_frontend_base_url()

# Hàm lấy Gemini API Key động từ .env
def get_gemini_api_key() -> str:
    try:
        from dotenv import load_dotenv
        load_dotenv(BASE_DIR / ".env", override=True)
    except Exception:
        pass
    return os.getenv("GEMINI_API_KEY", "").strip()

GEMINI_API_KEY = get_gemini_api_key()

# Hàm lấy Gemini Model động từ .env (mặc định gemini-3.6-flash)
def get_gemini_model() -> str:
    try:
        from dotenv import load_dotenv
        load_dotenv(BASE_DIR / ".env", override=True)
    except Exception:
        pass
    return os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()

