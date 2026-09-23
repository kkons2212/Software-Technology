from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import VisitorPOIDetail
from config import ALL_LANGUAGES

router = APIRouter(prefix="/api/visitor/pois", tags=["Visitor POI Details & Audio (UC-01)"])

@router.get("/{poi_id}", response_model=VisitorPOIDetail)
def get_visitor_poi_detail(
    poi_id: int,
    lang: str = Query("vi", description="Mã ngôn ngữ: vi, en, ja, ko, zh"),
    unlocked: bool = Query(True, description="Trạng thái đã quét QR mở khoá thuyết minh đầy đủ")
):
    """
    Lấy thông tin hiện vật: mô tả ngắn (short_description) hoặc thuyết minh đầy đủ (description + audio)
    khi khách quét mã QR (UC-01).
    """
    poi = POIRepository.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy hiện vật tương ứng với mã QR này (E1)."
        )

    # 1. Tìm bản dịch tương ứng với ngôn ngữ yêu cầu (hoặc fallback tiếng Việt)
    translations = {t["language_code"]: t for t in poi.get("translations", [])}
    selected_trans = translations.get(lang) or translations.get("vi")
    
    title = selected_trans["title"] if selected_trans else poi["title_vi"]
    
    # Short description
    short_desc = (selected_trans.get("short_description") if selected_trans else None) or poi.get("short_description_vi")
    if not short_desc:
        full_raw = (selected_trans["description"] if selected_trans else poi["description_vi"]) or ""
        short_desc = full_raw.split(".")[0].strip() + "." if "." in full_raw else full_raw[:140]

    # Full description
    full_desc = selected_trans["description"] if selected_trans else poi["description_vi"]

    # 2. Tìm audio tương ứng với ngôn ngữ
    audios = {a["language_code"]: a for a in poi.get("audios", [])}
    selected_audio = audios.get(lang)
    audio_url = selected_audio["audio_url"] if (selected_audio and selected_audio.get("status") == "READY") else None

    # 3. Danh sách ngôn ngữ khả dụng
    available_langs = [t["language_code"] for t in poi.get("translations", []) if t.get("status") == "COMPLETED"]
    if not available_langs:
        available_langs = ["vi"]

    return VisitorPOIDetail(
        id=poi["id"],
        language_code=lang,
        title=title,
        short_description=short_desc,
        description=full_desc if unlocked else None,
        is_unlocked=unlocked,
        image_url=poi["image_url"],
        audio_url=audio_url if unlocked else None,
        x_coord=poi["x_coord"],
        y_coord=poi["y_coord"],
        floor=poi["floor"],
        available_languages=available_langs
    )
