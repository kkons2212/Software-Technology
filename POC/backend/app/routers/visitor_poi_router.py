from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import VisitorPOIDetail
from config import ALL_LANGUAGES

router = APIRouter(prefix="/api/visitor/pois", tags=["Visitor POI Details & Audio (UC-01)"])

@router.get("", response_model=List[dict])
def get_visitor_poi_list(
    lang: str = Query("vi", description="Mã ngôn ngữ: vi, en, ja, ko, zh"),
    floor: Optional[int] = Query(None, description="Lọc theo tầng")
):
    """
    Lấy danh sách tất cả các hiện vật cho khách tham quan (hiển thị trong tab Danh Sách).
    Trả về tiêu đề và mô tả ngắn theo ngôn ngữ đã chọn.
    """
    all_pois = POIRepository.get_all_pois()
    result = []
    for poi in all_pois:
        if floor is not None and poi.get("floor") != floor:
            continue
        
        # Get full POI with translations to resolve language
        full_poi = POIRepository.get_poi_by_id(poi["id"])
        translations = {t["language_code"]: t for t in full_poi.get("translations", [])} if full_poi else {}
        selected = translations.get(lang)
        
        title = selected["title"] if selected else poi["title_vi"]
        short_desc = (selected.get("short_description") if selected else None) or poi.get("short_description_vi") or ""
        
        # Check audio availability
        audios = full_poi.get("audios", []) if full_poi else []
        has_audio = any(a["language_code"] == lang and a.get("status") == "READY" for a in audios)
        
        result.append({
            "id": poi["id"],
            "title": title,
            "short_description": short_desc,
            "image_url": poi.get("image_url"),
            "floor": poi.get("floor", 1),
            "has_audio": has_audio,
        })
    
    # Sort by ID ascending for consistent display
    result.sort(key=lambda x: x["id"])
    return result

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
