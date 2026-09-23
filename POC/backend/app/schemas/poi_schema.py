from pydantic import BaseModel, Field
from typing import Optional, List, Dict

# Schema tạo mới POI
class POICreate(BaseModel):
    title_vi: str = Field(..., description="Tiêu đề tiếng Việt của hiện vật/POI")
    short_description_vi: Optional[str] = Field(None, description="Mô tả tóm tắt tiếng Việt (hiển thị trước khi quét QR)")
    description_vi: str = Field(..., description="Mô tả chi tiết đầy đủ tiếng Việt")
    x_coord: float = Field(default=0.0, description="Toạ độ X trên sơ đồ")
    y_coord: float = Field(default=0.0, description="Toạ độ Y trên sơ đồ")
    floor: int = Field(default=1, description="Tầng của bảo tàng")

# Schema cập nhật POI
class POIUpdate(BaseModel):
    title_vi: Optional[str] = None
    short_description_vi: Optional[str] = None
    description_vi: Optional[str] = None
    x_coord: Optional[float] = None
    y_coord: Optional[float] = None
    floor: Optional[int] = None

# Schema bản dịch
class TranslationItem(BaseModel):
    language_code: str
    title: str
    short_description: Optional[str] = None
    description: str
    status: str

# Schema audio
class AudioItem(BaseModel):
    language_code: str
    audio_url: str
    status: str

# Schema thông tin POI đầy đủ (Admin view)
class POIResponse(BaseModel):
    id: int
    title_vi: str
    short_description_vi: Optional[str] = None
    description_vi: str
    image_url: Optional[str] = None
    x_coord: float
    y_coord: float
    floor: int
    qr_code_url: Optional[str] = None
    translation_status: str
    created_at: str
    updated_at: str
    translations: Optional[List[TranslationItem]] = []
    audios: Optional[List[AudioItem]] = []

# Schema chi tiết cho Visitor (UC-01)
class VisitorPOIDetail(BaseModel):
    id: int
    language_code: str
    title: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    is_unlocked: bool = True
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    x_coord: float
    y_coord: float
    floor: int
    available_languages: List[str]

# Schema Marker bản đồ (UC-02)
class MapMarker(BaseModel):
    id: int
    title: str
    short_description: Optional[str] = None
    x_coord: float
    y_coord: float
    floor: int
    image_url: Optional[str] = None

# Schema gợi ý lộ trình (UC-02)
class RouteRecommendation(BaseModel):
    current_poi_id: Optional[int]
    next_poi: Optional[MapMarker]
    all_markers: List[MapMarker]
