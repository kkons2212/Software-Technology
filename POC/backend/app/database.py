import sqlite3
import os
from contextlib import contextmanager
from config import DATABASE_PATH

def get_db_connection() -> sqlite3.Connection:
    """
    Tạo kết nối SQLite với cấu hình WAL Mode (Write-Ahead Logging)
    để hỗ trợ đọc/ghi đồng thời không bị khoá luồng (non-blocking concurrent reads/writes).
    """
    conn = sqlite3.connect(DATABASE_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    # Thiết lập chế độ WAL và busy_timeout
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

@contextmanager
def db_session():
    """Context manager hỗ trợ tự động commit hoặc rollback khi có lỗi."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Khởi tạo cấu trúc các bảng CSDL cho POC."""
    with db_session() as conn:
        cursor = conn.cursor()
        
        # Bảng pois (Điểm tham quan / Hiện vật) - UC-04
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS pois (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title_vi TEXT NOT NULL,
            short_description_vi TEXT,
            description_vi TEXT NOT NULL,
            image_url TEXT,
            x_coord REAL DEFAULT 0.0,
            y_coord REAL DEFAULT 0.0,
            floor INTEGER DEFAULT 1,
            qr_code_url TEXT,
            translation_status TEXT DEFAULT 'PENDING',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Bảng poi_translations (Bản dịch đa ngôn ngữ) - UC-08
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS poi_translations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poi_id INTEGER NOT NULL,
            language_code TEXT NOT NULL,
            title TEXT NOT NULL,
            short_description TEXT,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'COMPLETED',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (poi_id) REFERENCES pois (id) ON DELETE CASCADE,
            UNIQUE (poi_id, language_code)
        );
        """)

        # Bảng poi_audios (Quản lý file âm thanh .mp3 & Caching) - UC-09
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS poi_audios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poi_id INTEGER NOT NULL,
            language_code TEXT NOT NULL,
            audio_url TEXT NOT NULL,
            text_hash TEXT NOT NULL,
            status TEXT DEFAULT 'READY',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (poi_id) REFERENCES pois (id) ON DELETE CASCADE,
            UNIQUE (poi_id, language_code)
        );
        """)

        # Auto-migration cho database hiện có
        try:
            cursor.execute("ALTER TABLE pois ADD COLUMN short_description_vi TEXT;")
        except Exception:
            pass

        try:
            cursor.execute("ALTER TABLE poi_translations ADD COLUMN short_description TEXT;")
        except Exception:
            pass

        try:
            cursor.execute("ALTER TABLE pois ADD COLUMN latitude REAL;")
        except Exception:
            pass

        try:
            cursor.execute("ALTER TABLE pois ADD COLUMN longitude REAL;")
        except Exception:
            pass

        # Populate short_description_vi nếu đang NULL
        cursor.execute("""
            UPDATE pois 
            SET short_description_vi = SUBSTR(description_vi, 1, 150)
            WHERE short_description_vi IS NULL OR short_description_vi = '';
        """)
        cursor.execute("""
            UPDATE poi_translations 
            SET short_description = SUBSTR(description, 1, 150)
            WHERE short_description IS NULL OR short_description = '';
        """)

        # Tọa độ GPS mặc định xung quanh khuôn viên Dinh Độc Lập / Công viên 30/4
        # (Khoảng cách đi bộ thực tế 30m - 150m)
        default_coords = {
            1: (10.77688, 106.69532),   # Cổng Chính & Đài Phun Nước
            4: (10.77645, 106.69485),   # Xe Tăng Lịch Sử 390 & 843
            5: (10.77735, 106.69470),   # Vườn Cây Cổ Thụ & Không Gian Sinh Thái
            6: (10.77760, 106.69580),   # Khu Pháo Binh Ngoài Trời
            7: (10.77620, 106.69575),   # Tượng Đài & Bia Tưởng Niệm
            8: (10.77710, 106.69610),   # Gian Trưng Bày Chuyên Đề
            9: (10.77600, 106.69450),   # Vườn Điêu Khắc Đá Cổ Điển
            10: (10.77780, 106.69510),  # Điểm Toàn Cảnh & Nghỉ Chân
        }
        for poi_id, (lat, lng) in default_coords.items():
            cursor.execute("""
                UPDATE pois 
                SET latitude = ?, longitude = ? 
                WHERE id = ? AND (latitude IS NULL OR longitude IS NULL);
            """, (lat, lng, poi_id))

        # Nếu có POI nào chưa có tọa độ, tính offset từ DEFAULT_MAP_LAT / DEFAULT_MAP_LNG
        from config import DEFAULT_MAP_LAT, DEFAULT_MAP_LNG
        cursor.execute("""
            UPDATE pois 
            SET latitude = ? + ((COALESCE(y_coord, 200.0) - 200.0) * 0.0006 / 200.0),
                longitude = ? + ((COALESCE(x_coord, 300.0) - 300.0) * 0.0006 / 300.0)
            WHERE latitude IS NULL OR longitude IS NULL;
        """, (DEFAULT_MAP_LAT, DEFAULT_MAP_LNG))

