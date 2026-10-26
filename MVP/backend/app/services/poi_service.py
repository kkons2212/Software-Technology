"""POIService encapsulating 100% business logic for POI catalog & spatial validation."""

import os
import uuid

from fastapi import BackgroundTasks, HTTPException, UploadFile, status

from app.core.config import settings
from app.models.poi import POI
from app.models.translation import POITranslation
from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import (
    POICreateRequest,
    POIListResponse,
    POIResponse,
    POITranslationStatusResponse,
)

TARGET_FOREIGN_LANGUAGES = ["en", "ja", "ko", "zh"]


def validate_coordinates_in_bounds(lat: float, lng: float) -> None:
    """Enforce boundary guardrail ensuring POI is within Cu Chi Tunnels complex."""
    bounds = settings.CU_CHI_BOUNDS
    if not (
        bounds["min_lat"] <= lat <= bounds["max_lat"]
        and bounds["min_lng"] <= lng <= bounds["max_lng"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "GEO_OUT_OF_BOUNDS",
                "message": "Coordinates fall outside the permitted perimeter of Cu Chi Tunnels.",
                "details": {
                    "latitude": lat,
                    "longitude": lng,
                    "allowed_bounds": bounds,
                },
            },
        )


def validate_image_file(file: UploadFile, content_bytes: bytes) -> None:
    """Validate image MIME type and file size (< 5MB)."""
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type '{file.content_type}'. Only JPG, PNG, and WebP are allowed.",
        )
    if len(content_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cover image file size exceeds the maximum permitted limit of 5MB.",
        )


class POIService:
    def __init__(self, poi_repo: POIRepository, audit_repo: AuditRepository):
        self.poi_repo = poi_repo
        self.audit_repo = audit_repo

    async def save_cover_image(self, file: UploadFile) -> str:
        """Validate and write uploaded image to disk."""
        content = await file.read()
        validate_image_file(file, content)

        file_ext = os.path.splitext(file.filename or "")[1].lower()
        if not file_ext:
            file_ext = ".jpg"

        filename = f"poi_{uuid.uuid4().hex[:16]}{file_ext}"
        destination_path = os.path.join(settings.IMAGE_UPLOAD_DIR, filename)

        with open(destination_path, "wb") as f:
            f.write(content)

        return f"/static/images/{filename}"

    async def create_new_poi(
        self,
        payload: POICreateRequest,
        admin_username: str,
        background_tasks: BackgroundTasks | None = None,
        ip_address: str | None = None,
    ) -> POIResponse:
        """Execute full business flow: validation, creation, translation seeding, and audit logging."""
        # 1. Spatial perimeter validation
        validate_coordinates_in_bounds(payload.latitude, payload.longitude)

        # 2. Instantiate and persist POI entity via Repository
        poi_id = f"POI_{uuid.uuid4().hex[:12].upper()}"
        poi_entity = POI(
            PoiID=poi_id,
            Title=payload.title,
            Short_Description=payload.short_description,
            Description=payload.description,
            Image_Url=payload.image_url,
            Latitude=payload.latitude,
            Longitude=payload.longitude,
            Radius=payload.radius,
            Is_Active=True,
            Create_by=admin_username,
        )
        created_poi = self.poi_repo.create(poi_entity)

        # 3. Create primary Vietnamese source translation record (Status = PUBLISHED)
        vi_trans = POITranslation(
            StranID=f"TR_{uuid.uuid4().hex[:12].upper()}",
            Title=payload.title,
            Short_Description=payload.short_description,
            Description=payload.description,
            Status="PUBLISHED",
            PoiID=created_poi.PoiID,
            LanguageID="vi",
            UserName=admin_username,
        )
        self.poi_repo.create_translation(vi_trans)

        # 4. Dispatch background foreign language translation pipeline (Status = PENDING)
        translation_responses = [
            POITranslationStatusResponse(
                language_id="vi", status="PUBLISHED", title=payload.title
            )
        ]
        for lang in TARGET_FOREIGN_LANGUAGES:
            foreign_trans = POITranslation(
                StranID=f"TR_{uuid.uuid4().hex[:12].upper()}",
                Title=f"[{lang.upper()}] {payload.title}",
                Short_Description=payload.short_description,
                Description=payload.description,
                Status="PENDING",
                PoiID=created_poi.PoiID,
                LanguageID=lang,
                UserName=admin_username,
            )
            self.poi_repo.create_translation(foreign_trans)
            translation_responses.append(
                POITranslationStatusResponse(language_id=lang, status="PENDING")
            )

        # 5. Log audit entry
        self.audit_repo.log_action(
            username=admin_username,
            status="CREATE_POI",
            ip_address=ip_address,
            details={
                "poi_id": created_poi.PoiID,
                "title": payload.title,
                "radius": payload.radius,
                "coordinates": [float(payload.latitude), float(payload.longitude)],
            },
        )

        return self._build_poi_response(created_poi, translation_responses)

    def list_pois(
        self, page: int = 1, size: int = 50, search: str | None = None
    ) -> POIListResponse:
        """Retrieve paginated POIs with translation status summaries."""
        if page < 1:
            page = 1
        skip = (page - 1) * size

        items, total = self.poi_repo.get_all(skip=skip, limit=size, search=search)
        response_items = []
        for poi in items:
            translations = self.poi_repo.get_translations_by_poi_id(poi.PoiID)
            status_list = [
                POITranslationStatusResponse(
                    language_id=t.LanguageID, status=t.Status, title=t.Title
                )
                for t in translations
            ]
            response_items.append(self._build_poi_response(poi, status_list))

        return POIListResponse(items=response_items, total=total, page=page, size=size)

    def get_poi_details(self, poi_id: str) -> POIResponse:
        """Fetch full POI details including all translation statuses."""
        poi = self.poi_repo.get_by_id(poi_id)
        if not poi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"POI exhibit with id '{poi_id}' was not found.",
            )
        translations = self.poi_repo.get_translations_by_poi_id(poi.PoiID)
        status_list = [
            POITranslationStatusResponse(
                language_id=t.LanguageID, status=t.Status, title=t.Title
            )
            for t in translations
        ]
        return self._build_poi_response(poi, status_list)

    @staticmethod
    def _build_poi_response(
        poi: POI, translations: list[POITranslationStatusResponse]
    ) -> POIResponse:
        return POIResponse(
            poi_id=poi.PoiID,
            title=poi.Title,
            short_description=poi.Short_Description,
            description=poi.Description,
            image_url=poi.Image_Url,
            latitude=float(poi.Latitude),
            longitude=float(poi.Longitude),
            radius=poi.Radius,
            is_active=poi.Is_Active,
            create_at=poi.Create_at,
            update_at=poi.Update_at,
            create_by=poi.Create_by,
            translations=translations,
        )
