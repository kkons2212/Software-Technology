import asyncio
import json
import logging
import re
import urllib.parse
import aiohttp
from typing import Dict, Any, List, Optional
from config import PRIMARY_LANGUAGE, TARGET_LANGUAGES, get_gemini_api_key, get_gemini_model
from app.repositories.poi_repository import POIRepository

logger = logging.getLogger("TranslationService")
logger.setLevel(logging.INFO)

class TranslationService:
    DELIMITER = "\n\n<<<SPLIT>>>\n\n"
    
    LANG_MAP = {
        "en": "en",
        "ja": "ja",
        "ko": "ko",
        "zh": "zh-CN",
    }

    @classmethod
    async def translate_with_gemini(
        cls, 
        title_vi: str, 
        short_desc_vi: str, 
        desc_vi: str, 
        target_langs: List[str]
    ) -> Optional[Dict[str, Dict[str, str]]]:
        """
        Dịch toàn bộ thông tin POI sang tất cả ngôn ngữ chỉ với đúng 1 request bằng Google Gemini AI (UC-08).
        """
        api_key = get_gemini_api_key()
        if not api_key:
            return None

        prompt = f"""Bạn là chuyên gia dịch thuật và thuyết minh di sản, bảo tàng lịch sử văn hóa.
Nhiệm vụ: Dịch tiêu đề, tóm tắt và mô tả chi tiết của địa điểm sau từ tiếng Việt sang các ngôn ngữ: {', '.join(target_langs)}.

Nội dung gốc (Tiếng Việt):
- Tiêu đề: {title_vi}
- Mô tả tóm tắt: {short_desc_vi}
- Mô tả chi tiết: {desc_vi}

Yêu cầu:
- Trả về DUY NHẤT một chuỗi JSON hợp lệ với cấu trúc tương ứng mỗi ngôn ngữ là một object chứa các trường: "title", "short_description", "description".
Ví dụ định dạng mong muốn:
{{
  "en": {{ "title": "...", "short_description": "...", "description": "..." }},
  "ja": {{ "title": "...", "short_description": "...", "description": "..." }},
  "ko": {{ "title": "...", "short_description": "...", "description": "..." }},
  "zh": {{ "title": "...", "short_description": "...", "description": "..." }}
}}
Văn phong cần trang trọng, mượt mà, chính xác theo thuật ngữ bảo tàng du lịch."""

        configured_model = get_gemini_model()
        candidate_models = [configured_model, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"]
        models = [m for i, m in enumerate(candidate_models) if m and m not in candidate_models[:i]]
        
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "responseMimeType": "application/json"
                }
            }

            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=25)) as response:
                        if response.status == 200:
                            data = await response.json()
                            candidates = data.get("candidates", [])
                            if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                                parts = candidates[0]["content"]["parts"]
                                text_content = ""
                                for part in parts:
                                    if not part.get("thought", False) and "text" in part:
                                        text_content += part["text"]
                                if not text_content and parts:
                                    text_content = parts[-1].get("text", "")

                                cleaned_text = text_content.strip()
                                if cleaned_text.startswith("```"):
                                    cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text, flags=re.MULTILINE)
                                    cleaned_text = re.sub(r"\s*```$", "", cleaned_text, flags=re.MULTILINE)

                                parsed = json.loads(cleaned_text.strip())
                                if isinstance(parsed, dict) and any(lang in parsed for lang in target_langs):
                                    logger.info(f"[Gemini AI] Dịch thành công toàn bộ POI sang {target_langs} bằng model '{model}'!")
                                    return parsed
                        else:
                            error_text = await response.text()
                            logger.warning(f"[Gemini AI] Model '{model}' trả về HTTP {response.status}: {error_text[:200]}")
            except Exception as e:
                logger.warning(f"[Gemini AI] Lỗi khi gọi model '{model}': {e}")

        return None

    @classmethod
    async def translate_text_google(cls, text: str, target_lang: str, timeout_sec: int = 8) -> Optional[str]:
        """Dịch văn bản sử dụng Google Translate GTX Endpoint."""
        if not text or not text.strip():
            return ""

        mapped_lang = cls.LANG_MAP.get(target_lang, target_lang)
        encoded_text = urllib.parse.quote(text.strip())
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl={mapped_lang}&dt=t&q={encoded_text}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "vi,en;q=0.9",
        }

        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout_sec)) as response:
                if response.status == 200:
                    data = await response.json()
                    if data and isinstance(data, list) and len(data) > 0 and data[0]:
                        parts = [part[0] for part in data[0] if part and len(part) > 0 and part[0]]
                        translated_str = "".join(parts).strip()
                        if translated_str:
                            return translated_str
                elif response.status == 429:
                    logger.warning(f"Google Translate trả về mã 429 (Rate Limit) cho ngôn ngữ '{target_lang}'")
                    return None
                else:
                    logger.warning(f"Google Translate trả về mã {response.status} cho ngôn ngữ '{target_lang}'")
                    return None
        return None

    @classmethod
    async def _mymemory_translate_chunk(cls, chunk: str, mapped_lang: str) -> Optional[str]:
        if not chunk or not chunk.strip():
            return ""
        encoded_text = urllib.parse.quote(chunk.strip())
        url = f"https://api.mymemory.translated.net/get?q={encoded_text}&langpair=vi|{mapped_lang}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as response:
                if response.status == 200:
                    data = await response.json()
                    if data and "responseData" in data and "translatedText" in data["responseData"]:
                        res = data["responseData"]["translatedText"]
                        if res and res.strip() and not res.startswith("MYMEMORY WARNING"):
                            return res.strip()
        return None

    @classmethod
    async def translate_text_fallback(cls, text: str, target_lang: str) -> Optional[str]:
        """
        Dự phòng đa tầng khi Google Translate bị chặn Rate Limit:
        1. Thử MyMemory API (hỗ trợ phân đoạn nếu văn bản dài > 400 ký tự).
        2. Thử thư viện deep_translator.
        """
        if not text or not text.strip():
            return ""
        
        mapped_lang = "zh-CN" if target_lang == "zh" else target_lang

        # 1. Thử MyMemory API qua aiohttp
        try:
            if len(text) <= 400:
                res = await cls._mymemory_translate_chunk(text, mapped_lang)
                if res:
                    logger.info(f"[Fallback MyMemory API] Dịch thành công sang '{target_lang}'")
                    return res
            else:
                sentences = re.split(r"(?<=[.!?\n])\s+", text)
                translated_parts = []
                current_chunk = ""
                for s in sentences:
                    if len(current_chunk) + len(s) < 380:
                        current_chunk += (" " if current_chunk else "") + s
                    else:
                        if current_chunk:
                            p = await cls._mymemory_translate_chunk(current_chunk, mapped_lang)
                            translated_parts.append(p if p else current_chunk)
                        current_chunk = s
                if current_chunk:
                    p = await cls._mymemory_translate_chunk(current_chunk, mapped_lang)
                    translated_parts.append(p if p else current_chunk)
                
                full_res = " ".join(translated_parts).strip()
                if full_res:
                    logger.info(f"[Fallback MyMemory API] Dịch thành công chuỗi dài sang '{target_lang}'")
                    return full_res
        except Exception as e:
            logger.warning(f"[Fallback MyMemory API] Lỗi: {e}")

        # 2. Thử qua thư viện deep_translator
        try:
            from deep_translator import MyMemoryTranslator
            res = await asyncio.to_thread(MyMemoryTranslator(source="vi", target=mapped_lang).translate, text[:450])
            if res and res.strip():
                logger.info(f"[Fallback deep_translator] Dịch thành công sang '{target_lang}'")
                return res.strip()
        except Exception as e:
            logger.warning(f"[Fallback deep_translator] Lỗi: {e}")

        return None

    @classmethod
    async def translate_text(cls, text: str, target_lang: str, max_retries: int = 2) -> str:
        """
        Dịch chuỗi đơn lẻ với cơ chế Fallback tự động khi bị lỗi kết nối hoặc 429.
        """
        if not text or not text.strip():
            return ""

        # 1. Thử dịch bằng Google Translate GTX
        for attempt in range(1, max_retries + 1):
            try:
                res = await cls.translate_text_google(text, target_lang)
                if res:
                    return res
                # Nếu trả về None (ví dụ gặp mã 429), không spam retry Google nữa mà thoát để chuyển sang Fallback
                break
            except Exception as e:
                logger.warning(f"Lần thử {attempt}/{max_retries} Google GTX dịch sang '{target_lang}' gặp lỗi kết nối: {e}")
                if attempt < max_retries:
                    await asyncio.sleep(1.0 * attempt)

        # 2. Chuyển sang Fallback Engine
        logger.info(f"Kích hoạt Fallback Engine dự phòng dịch sang '{target_lang}'...")
        fb_res = await cls.translate_text_fallback(text, target_lang)
        if fb_res:
            return fb_res

        logger.error(f"Dịch sang '{target_lang}' không thành công ở cả Google và Fallback. Giữ nguyên text gốc.")
        return text

    @classmethod
    async def translate_batch(cls, texts: List[str], target_lang: str) -> List[str]:
        """
        Gộp nhiều chuỗi văn bản (title, short_desc, desc) thành 1 payload duy nhất để dịch (Batching).
        Giảm số lượng HTTP request gửi lên dịch vụ từ 3 request xuống 1 request.
        """
        if not texts:
            return []

        if len(texts) == 1:
            t = await cls.translate_text(texts[0], target_lang)
            return [t]

        # Gộp thành 1 chuỗi với Delimiter đặc biệt
        combined = cls.DELIMITER.join(t.strip() for t in texts)
        translated_combined = await cls.translate_text(combined, target_lang)

        # Tách lại theo delimiter bằng Regex (chịu lỗi khoảng trắng hoặc chữ hoa/thường)
        parts = re.split(r"\s*<{1,3}\s*SPLIT\s*>{1,3}\s*", translated_combined, flags=re.IGNORECASE)
        parts = [p.strip() for p in parts if p.strip()]

        if len(parts) == len(texts):
            return parts

        # Nếu engine dịch làm mất delimiter, fallback dịch từng phần lẻ với giãn cách
        logger.warning(f"Batch delimiter mismatch cho '{target_lang}' (cần {len(texts)}, tách được {len(parts)}). Chuyển sang dịch từng trường...")
        fallback_results = []
        for t in texts:
            r = await cls.translate_text(t, target_lang)
            fallback_results.append(r)
            await asyncio.sleep(0.4)
        return fallback_results

    @staticmethod
    async def process_poi_translations(poi_id: int, title_vi: str, description_vi: str, short_description_vi: Optional[str] = None) -> Dict[str, Dict[str, str]]:
        """
        Dịch toàn bộ tiêu đề, mô tả tóm tắt và mô tả chi tiết tiếng Việt của POI sang tất cả các ngôn ngữ mục tiêu (UC-08).
        Ưu tiên số 1: Google Gemini AI (chỉ 1 request duy nhất cho tất cả các ngôn ngữ).
        Dự phòng: Batching + Google GTX / MyMemory / deep-translator.
        """
        logger.info(f"[UC-08] Bắt đầu dịch đa ngôn ngữ cho POI #{poi_id}: '{title_vi}'...")
        
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

        # 2. ƯU TIÊN 1: Dịch trọn gói bằng Google Gemini AI (Chỉ 1 request cho cả 4 ngôn ngữ)
        gemini_result = await TranslationService.translate_with_gemini(
            title_vi=title_vi,
            short_desc_vi=final_short_vi,
            desc_vi=description_vi,
            target_langs=TARGET_LANGUAGES
        )

        if gemini_result:
            all_success = True
            for lang in TARGET_LANGUAGES:
                lang_data = gemini_result.get(lang) or gemini_result.get(lang.lower())
                if lang_data and isinstance(lang_data, dict):
                    trans_title = (lang_data.get("title") or title_vi).strip()
                    trans_short = (lang_data.get("short_description") or final_short_vi).strip()
                    trans_desc = (lang_data.get("description") or description_vi).strip()
                    
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
                    logger.info(f"[UC-08 Gemini AI] Dịch thành công POI #{poi_id} sang [{lang.upper()}]: '{trans_title}'")
                else:
                    all_success = False

            if all_success:
                POIRepository.update_poi_translation_status(poi_id, "COMPLETED")
                logger.info(f"[UC-08] Hoàn tất dịch đa ngôn ngữ bằng Gemini AI cho POI #{poi_id}!")
                return results

        # 3. DỰ PHÒNG: Nếu không có Gemini hoặc Gemini gặp sự cố, dùng Batching + Fallback MyMemory
        logger.info(f"[UC-08 Fallback] Đang dịch POI #{poi_id} bằng cơ chế Batching & Fallback Engine...")
        for lang in TARGET_LANGUAGES:
            # Bỏ qua nếu ngôn ngữ này đã được dịch thành công bởi Gemini ở trên
            if lang in results and results[lang].get("status") == "COMPLETED":
                continue

            try:
                translated_list = await TranslationService.translate_batch(
                    texts=[title_vi, final_short_vi, description_vi],
                    target_lang=lang
                )
                
                trans_title = translated_list[0] if len(translated_list) > 0 else title_vi
                trans_short = translated_list[1] if len(translated_list) > 1 else final_short_vi
                trans_desc = translated_list[2] if len(translated_list) > 2 else description_vi
                
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

            await asyncio.sleep(0.8)

        POIRepository.update_poi_translation_status(poi_id, "COMPLETED")
        return results
