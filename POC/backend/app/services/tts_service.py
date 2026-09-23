import asyncio
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import edge_tts

from config import AUDIO_DIR, TTS_VOICE_MAPPING
from app.repositories.poi_repository import POIRepository

logger = logging.getLogger("TTSService")
logger.setLevel(logging.INFO)

class TTSService:
    @staticmethod
    def calculate_text_hash(text: str) -> str:
        """Tính mã băm MD5 của chuỗi văn bản phục vụ Audio Caching (UC-09)."""
        return hashlib.md5(text.strip().encode("utf-8")).hexdigest()

    @staticmethod
    async def synthesize_speech(
        poi_id: int, 
        language_code: str, 
        title: str, 
        description: str,
        max_retries: int = 3
    ) -> Optional[str]:
        """
        Sinh file âm thanh .mp3 thuyết minh cho một ngôn ngữ cụ thể (UC-09).
        Kiểm tra Cache Hash trước khi gọi Edge-TTS.
        """
        # Nội dung đọc đầy đủ = Tiêu đề + Dấu ngắt câu + Mô tả
        full_text = f"{title}. {description}".strip()
        if not full_text:
            logger.warning(f"[UC-09] POI #{poi_id} - [{language_code}] Nội dung rỗng, bỏ qua TTS.")
            return None

        text_hash = TTSService.calculate_text_hash(full_text)
        voice = TTS_VOICE_MAPPING.get(language_code, "vi-VN-HoaiMyNeural")
        
        file_name = f"audio_poi_{poi_id}_{language_code}.mp3"
        file_path = AUDIO_DIR / file_name
        relative_url = f"/static/audio/{file_name}"

        # 1. Kiểm tra Audio Cache Hit (UC-09 Alternative Path A1)
        existing_audio = POIRepository.get_audio_by_poi_and_lang(poi_id, language_code)
        if existing_audio and existing_audio.get("text_hash") == text_hash and file_path.exists() and file_path.stat().st_size > 0:
            logger.info(f"[UC-09 CACHE HIT] POI #{poi_id} [{language_code}] Không thay đổi nội dung, tái sử dụng file cũ.")
            return relative_url

        # 2. Gọi Edge-TTS sinh file mới với Retry Logic (UC-09 A2)
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"[UC-09] Đang sinh Audio cho POI #{poi_id} [{language_code}] với giọng [{voice}] (lần {attempt})...")
                communicate = edge_tts.Communicate(text=full_text, voice=voice)
                await communicate.save(str(file_path))
                
                # Kiểm tra file đã tạo thành công
                if file_path.exists() and file_path.stat().st_size > 0:
                    POIRepository.upsert_audio(
                        poi_id=poi_id,
                        language_code=language_code,
                        audio_url=relative_url,
                        text_hash=text_hash,
                        status="READY"
                    )
                    logger.info(f"[UC-09 READY] Đã tạo thành công Audio POI #{poi_id} [{language_code}] -> {relative_url}")
                    return relative_url
            except Exception as e:
                logger.warning(f"[UC-09] Lần thử {attempt}/{max_retries} sinh audio [{language_code}] thất bại: {e}")
                if attempt < max_retries:
                    await asyncio.sleep(2.0 * attempt)
                else:
                    logger.error(f"[UC-09 FAILED] Thất bại hoàn toàn khi sinh audio cho POI #{poi_id} [{language_code}]")
                    POIRepository.upsert_audio(
                        poi_id=poi_id,
                        language_code=language_code,
                        audio_url="",
                        text_hash=text_hash,
                        status="AUDIO_GENERATION_FAILED"
                    )
        return None

    @staticmethod
    async def process_poi_audios(poi_id: int, localized_contents: Dict[str, Dict[str, str]]) -> Dict[str, str]:
        """
        Duyệt qua tất cả các ngôn ngữ của POI để sinh các file thuyết minh .mp3 tương ứng (UC-09).
        """
        logger.info(f"[UC-09] Bắt đầu tổng hợp Audio cho tất cả các ngôn ngữ của POI #{poi_id}...")
        audio_results = {}
        
        for lang_code, content in localized_contents.items():
            title = content.get("title", "")
            description = content.get("description", "")
            
            # Bỏ qua nếu bản dịch bị lỗi hoàn toàn
            if content.get("status") == "TRANSLATION_FAILED" and lang_code != "vi":
                logger.warning(f"[UC-09] Bỏ qua sinh audio cho [{lang_code}] do bản dịch không hợp lệ.")
                continue
                
            audio_url = await TTSService.synthesize_speech(
                poi_id=poi_id,
                language_code=lang_code,
                title=title,
                description=description
            )
            if audio_url:
                audio_results[lang_code] = audio_url

        logger.info(f"[UC-09] Hoàn tất tổng hợp Audio cho POI #{poi_id}. Tổng số file sẵn sàng: {len(audio_results)}")
        return audio_results
