import sqlite3
from typing import List, Optional, Dict, Any
from app.database import get_db_connection, db_session

class POIRepository:
    @staticmethod
    def get_all_pois() -> List[Dict[str, Any]]:
        """Lấy danh sách tất cả các POI kèm thông tin tóm tắt."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, title_vi, short_description_vi, description_vi, image_url, x_coord, y_coord, floor, 
                       qr_code_url, translation_status, created_at, updated_at
                FROM pois
                ORDER BY id DESC
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    @staticmethod
    def get_poi_by_id(poi_id: int) -> Optional[Dict[str, Any]]:
        """Lấy thông tin chi tiết một POI kèm bản dịch và audio."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM pois WHERE id = ?", (poi_id,))
            poi_row = cursor.fetchone()
            if not poi_row:
                return None
            
            poi = dict(poi_row)
            
            # Lấy danh sách bản dịch
            cursor.execute("SELECT language_code, title, short_description, description, status FROM poi_translations WHERE poi_id = ?", (poi_id,))
            poi["translations"] = [dict(r) for r in cursor.fetchall()]
            
            # Lấy danh sách audio
            cursor.execute("SELECT language_code, audio_url, status FROM poi_audios WHERE poi_id = ?", (poi_id,))
            poi["audios"] = [dict(r) for r in cursor.fetchall()]
            
            return poi

    @staticmethod
    def create_poi(title_vi: str, description_vi: str, short_description_vi: Optional[str] = None,
                   image_url: Optional[str] = None, x_coord: float = 0.0, y_coord: float = 0.0, floor: int = 1) -> int:
        """Tạo mới một bản ghi POI và trả về id vừa tạo."""
        if not short_description_vi or not short_description_vi.strip():
            # Tự động lấy câu đầu tiên hoặc 140 ký tự đầu
            short_description_vi = description_vi.split(".")[0].strip() + "." if "." in description_vi else description_vi[:140]

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO pois (title_vi, short_description_vi, description_vi, image_url, x_coord, y_coord, floor, translation_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
            """, (title_vi, short_description_vi, description_vi, image_url, x_coord, y_coord, floor))
            return cursor.lastrowid

    @staticmethod
    def update_poi(poi_id: int, title_vi: Optional[str] = None, short_description_vi: Optional[str] = None,
                   description_vi: Optional[str] = None, image_url: Optional[str] = None, 
                   x_coord: Optional[float] = None, y_coord: Optional[float] = None, floor: Optional[int] = None) -> bool:
        """Cập nhật thông tin POI."""
        fields = []
        values = []
        
        if title_vi is not None:
            fields.append("title_vi = ?")
            values.append(title_vi)
        if short_description_vi is not None:
            fields.append("short_description_vi = ?")
            values.append(short_description_vi)
        if description_vi is not None:
            fields.append("description_vi = ?")
            values.append(description_vi)
        if image_url is not None:
            fields.append("image_url = ?")
            values.append(image_url)
        if x_coord is not None:
            fields.append("x_coord = ?")
            values.append(x_coord)
        if y_coord is not None:
            fields.append("y_coord = ?")
            values.append(y_coord)
        if floor is not None:
            fields.append("floor = ?")
            values.append(floor)
            
        if not fields:
            return False
            
        fields.append("updated_at = CURRENT_TIMESTAMP")
        values.append(poi_id)
        
        query = f"UPDATE pois SET {', '.join(fields)} WHERE id = ?"
        
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(values))
            return cursor.rowcount > 0

    @staticmethod
    def update_qr_code_url(poi_id: int, qr_code_url: str):
        """Cập nhật đường dẫn file QR code cho POI."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE pois SET qr_code_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (qr_code_url, poi_id))

    @staticmethod
    def delete_poi(poi_id: int) -> bool:
        """Xoá một POI và cascade xoá translations, audios."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM pois WHERE id = ?", (poi_id,))
            return cursor.rowcount > 0

    @staticmethod
    def upsert_translation(poi_id: int, language_code: str, title: str, description: str, 
                           short_description: Optional[str] = None, status: str = 'COMPLETED'):
        """Thêm hoặc cập nhật bản dịch ngôn ngữ."""
        if not short_description:
            short_description = description.split(".")[0].strip() + "." if "." in description else description[:140]

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO poi_translations (poi_id, language_code, title, short_description, description, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(poi_id, language_code) DO UPDATE SET
                    title = excluded.title,
                    short_description = excluded.short_description,
                    description = excluded.description,
                    status = excluded.status,
                    updated_at = CURRENT_TIMESTAMP
            """, (poi_id, language_code, title, short_description, description, status))

    @staticmethod
    def update_poi_translation_status(poi_id: int, status: str):
        """Cập nhật cờ trạng thái dịch tổng thể của POI."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE pois SET translation_status = ? WHERE id = ?", (status, poi_id))

    @staticmethod
    def upsert_audio(poi_id: int, language_code: str, audio_url: str, text_hash: str, status: str = 'READY'):
        """Thêm hoặc cập nhật thông tin file âm thanh đã sinh."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO poi_audios (poi_id, language_code, audio_url, text_hash, status, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(poi_id, language_code) DO UPDATE SET
                    audio_url = excluded.audio_url,
                    text_hash = excluded.text_hash,
                    status = excluded.status,
                    updated_at = CURRENT_TIMESTAMP
            """, (poi_id, language_code, audio_url, text_hash, status))

    @staticmethod
    def get_audio_by_poi_and_lang(poi_id: int, language_code: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin audio của một ngôn ngữ cụ thể."""
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM poi_audios WHERE poi_id = ? AND language_code = ?", (poi_id, language_code))
            row = cursor.fetchone()
            return dict(row) if row else None
