import asyncio
import logging
import urllib.parse
import aiohttp
from typing import Dict, Any, List, Optional
from config import PRIMARY_LANGUAGE, TARGET_LANGUAGES
from app.repositories.poi_repository import POIRepository

logger = logging.getLogger("TranslationService")
logger.setLevel(logging.INFO)

class TranslationService:
    LANG_MAP = {
        "en": "en",
        "ja": "ja",
        "ko": "ko",
        "zh": "zh-CN",
    }

    @staticmethod
    async def translate_text(text: str, target_lang: str, max_retries: int = 3) -> str:
        """
        Dịch chuỗi văn bản tiếng Việt có dấu sang ngôn ngữ đích sử dụng Google Translate GTX Endpoint.
        Hỗ trợ đầy đủ UTF-8 Unicode, dấu thanh tiếng Việt và trả về bản dịch tự nhiên.
        """
        if not text or not text.strip():
            return ""

        mapped_lang = TranslationService.LANG_MAP.get(target_lang, target_lang)
        encoded_text = urllib.parse.quote(text.strip())
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl={mapped_lang}&dt=t&q={encoded_text}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "vi,en;q=0.9",
        }

        for attempt in range(1, max_retries + 1):
            try:
                async with aiohttp.ClientSession(headers=headers) as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data and isinstance(data, list) and len(data) > 0 and data[0]:
                                translated_parts = [part[0] for part in data[0] if part and len(part) > 0 and part[0]]
                                translated_str = "".join(translated_parts).strip()
                                if translated_str:
                                    return translated_str
                        else:
                            logger.warning(f"Lần thử {attempt}/{max_retries} dịch sang '{target_lang}' trả về mã {response.status}")
            except Exception as e:
                logger.warning(f"Lần thử {attempt}/{max_retries} dịch sang '{target_lang}' gặp lỗi kết nối: {e}")
                
            if attempt < max_retries:
                await asyncio.sleep(0.5 * attempt)

        logger.error(f"Dịch sang '{target_lang}' không thành công sau {max_retries} lần thử.")
        return text

    @staticmethod
    async def process_poi_translations(poi_id: int, title_vi: str, description_vi: str, short_description_vi: Optional[str] = None) -> Dict[str, Dict[str, str]]:
        """
        Dịch toàn bộ tiêu đề, mô tả tóm tắt và mô tả chi tiết tiếng Việt của POI sang tất cả các ngôn ngữ mục tiêu (UC-08).
        """
        logger.info(f"[UC-08] Bắt đầu dịch tự động cho POI #{poi_id}: '{title_vi}'...")
        
        final_short_vi = short_description_vi
        if not final_short_vi or not final_short_vi.strip():
            final_short_vi = description_vi.split(".")[0].strip() + "." if "." in description_vi else description_vi[:140]

        results = {
            "vi": {
                "title": title_vi,
                "short_description": final_short_vi,
                "description": description_vi,
                "status": "COMPLETED"
            }
        }
        
        # 1. Lưu bản gốc tiếng Việt (chuẩn có dấu)
        POIRepository.upsert_translation(
            poi_id=poi_id,
            language_code="vi",
            title=title_vi,
            short_description=final_short_vi,
            description=description_vi,
            status="COMPLETED"
        )

        # 2. Dịch sang các ngôn ngữ đích (EN, JA, KO, ZH)
        for lang in TARGET_LANGUAGES:
            try:
                trans_title = await TranslationService.translate_text(title_vi, lang)
                await asyncio.sleep(0.1)
                trans_short = await TranslationService.translate_text(final_short_vi, lang)
                await asyncio.sleep(0.1)
                trans_desc = await TranslationService.translate_text(description_vi, lang)
                await asyncio.sleep(0.1)
                
                POIRepository.upsert_translation(
                    poi_id=poi_id,
                    language_code=lang,
                    title=trans_title,
                    short_description=trans_short,
                    description=trans_desc,
                    status="COMPLETED"
                )
                
                results[lang] = {
                    "title": trans_title,
                    "short_description": trans_short,
                    "description": trans_desc,
                    "status": "COMPLETED"
                }
                logger.info(f"[UC-08] Dịch thành công POI #{poi_id} sang [{lang.upper()}]: '{trans_title}'")
            except Exception as e:
                logger.error(f"[UC-08] Lỗi khi dịch POI #{poi_id} sang [{lang.upper()}]: {e}")
                POIRepository.upsert_translation(
                    poi_id=poi_id,
                    language_code=lang,
                    title=title_vi,
                    short_description=final_short_vi,
                    description=description_vi,
                    status="TRANSLATION_FAILED"
                )
                results[lang] = {
                    "title": title_vi,
                    "short_description": final_short_vi,
                    "description": description_vi,
                    "status": "TRANSLATION_FAILED"
                }

        POIRepository.update_poi_translation_status(poi_id, "COMPLETED")
        return results
