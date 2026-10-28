"""POIService encapsulating business logic for POI catalog, spatial validation

and Admin geofence writes.

"""

import os
import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import BackgroundTasks, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ApiError
from app.models.audit import AUDIT_STATUS_SUCCESS
from app.models.poi import POI
from app.models.translation import POITranslation
from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import (
    POICreateRequest,
    POIListResponse,
    POIMapItem,
    POIResponse,
    POITranslationStatusResponse,
    POIUpdateRequest,
)

GEO_OUT_OF_BOUNDS_ERROR_CODE = "GEO_OUT_OF_BOUNDS"

GEO_OUT_OF_BOUNDS_ERROR_MESSAGE = (
    "Coordinates must fall inside the Cu Chi Tunnels boundary."
)

POI_NOT_FOUND_ERROR_CODE = "POI_NOT_FOUND"

POI_NOT_FOUND_ERROR_MESSAGE = "The requested exhibit does not exist."

POI_GEOFENCE_UPDATED_DETAILS = "ADMIN_POI_GEOFENCE_UPDATED"
POI_DEACTIVATED_DETAILS = "ADMIN_POI_DEACTIVATED"
POI_ACTIVATED_DETAILS = "ADMIN_POI_ACTIVATED"


TARGET_FOREIGN_LANGUAGES = ["en", "ja", "ko", "zh"]


def _is_within_cu_chi_bounds(latitude: float, longitude: float) -> bool:
    """Single perimeter predicate shared by the create and geofence flows.



    The bounds live in `settings.CU_CHI_BOUNDS` and are kept in sync with the

    frontend constant in `src/utils/museumBounds.js`.

    """

    bounds = settings.CU_CHI_BOUNDS

    return (
        bounds["min_lat"] <= latitude <= bounds["max_lat"]
        and bounds["min_lng"] <= longitude <= bounds["max_lng"]
    )


def validate_coordinates_in_bounds(lat: float, lng: float) -> None:
    """Enforce boundary guardrail ensuring POI is within Cu Chi Tunnels complex.



    Used by the exhibit creation flow, which reports the rejected position and

    the permitted perimeter back to the caller.

    """

    if not _is_within_cu_chi_bounds(lat, lng):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": GEO_OUT_OF_BOUNDS_ERROR_CODE,
                "message": "Coordinates fall outside the permitted perimeter of Cu Chi Tunnels.",
                "details": {
                    "latitude": lat,
                    "longitude": lng,
                    "allowed_bounds": settings.CU_CHI_BOUNDS,
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


def get_poi_service(
    db: Annotated[Session, Depends(get_db)],
) -> "POIService":

    return POIService(poi_repo=POIRepository(db), audit_repo=AuditRepository(db))


class POIService:

    def __init__(
        self,
        poi_repo: POIRepository | None = None,
        audit_repo: AuditRepository | None = None,
        repository: POIRepository | None = None,
        audit_repository: AuditRepository | None = None,
    ):

        # `poi_repo`/`audit_repo` are the dependency-injection names, while

        # `repository`/`audit_repository` are the explicit constructor names

        # used by the geofence calibration suite. Both are accepted so no

        # caller has to know which convention the other one picked.

        self.poi_repo = poi_repo or repository

        self.repository = self.poi_repo

        self.audit_repo = audit_repo or audit_repository

        self.audit_repository = self.audit_repo

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
            poi_id=poi_id,
            title=payload.title,
            short_description=payload.short_description,
            description=payload.description,
            image_url=payload.image_url,
            latitude=Decimal(str(payload.latitude)),
            longitude=Decimal(str(payload.longitude)),
            radius=payload.radius,
            is_active=True,
            create_by=admin_username,
        )

        created_poi = self.poi_repo.create(poi_entity)

        # 3. Create primary Vietnamese source translation record (Status = PUBLISHED)

        vi_trans = POITranslation(
            stran_id=f"TR_{uuid.uuid4().hex[:12].upper()}",
            title=payload.title,
            short_description=payload.short_description,
            description=payload.description,
            status="PUBLISHED",
            poi_id=created_poi.poi_id,
            language_id="vi",
            user_name=admin_username,
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
                stran_id=f"TR_{uuid.uuid4().hex[:12].upper()}",
                title=f"[{lang.upper()}] {payload.title}",
                short_description=payload.short_description,
                description=payload.description,
                status="PENDING",
                poi_id=created_poi.poi_id,
                language_id=lang,
                user_name=admin_username,
            )

            self.poi_repo.create_translation(foreign_trans)

            translation_responses.append(
                POITranslationStatusResponse(language_id=lang, status="PENDING")
            )

        # 5. Log audit entry if audit repository is available

        if self.audit_repo:

            self.audit_repo.log_action(
                username=admin_username,
                status="CREATE_POI",
                ip_address=ip_address,
                details={
                    "poi_id": created_poi.poi_id,
                    "title": payload.title,
                    "radius": payload.radius,
                    "coordinates": [float(payload.latitude), float(payload.longitude)],
                },
            )

        if background_tasks is not None:
            from app.services.translation_pipeline_service import (
                execute_poi_pipeline_background_task,
            )

            background_tasks.add_task(
                execute_poi_pipeline_background_task, created_poi.poi_id
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

            translations = self.poi_repo.get_translations_by_poi_id(poi.poi_id)

            status_list = [
                POITranslationStatusResponse(
                    language_id=t.language_id, status=t.status, title=t.title
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

        translations = self.poi_repo.get_translations_by_poi_id(poi.poi_id)

        status_list = [
            POITranslationStatusResponse(
                language_id=t.language_id, status=t.status, title=t.title
            )
            for t in translations
        ]

        return self._build_poi_response(poi, status_list)

    def list_map_pois(self, language_code: str | None = None) -> list[POIMapItem]:
        """List active POIs for visitor map, localized for the requested language."""

        return [
            self._to_map_item(poi, translation)
            for poi, translation in self.repository.list_active_pois(language_code)
        ]

    def update_poi(
        self,
        poi_id: str,
        payload: POIUpdateRequest,
        admin_user_name: str,
        client_ip: str | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> POIMapItem:
        """Validate, persist POI changes, and synchronize translation statuses (US 03.4).



        # ARCH-BOUNDARY: Service coordinates validation and delegates database operations to repository.

        # SECURITY-INVARIANT: Narrative changes cascade NEEDS_UPDATE status to foreign translations.

        """

        poi = self.repository.get_by_id(poi_id)

        if poi is None:

            raise ApiError(
                status_code=status.HTTP_404_NOT_FOUND,
                code=POI_NOT_FOUND_ERROR_CODE,
                message=POI_NOT_FOUND_ERROR_MESSAGE,
            )

        # Validate coordinates if either latitude or longitude is provided

        target_latitude = (
            payload.latitude if payload.latitude is not None else float(poi.latitude)
        )

        target_longitude = (
            payload.longitude if payload.longitude is not None else float(poi.longitude)
        )

        if payload.latitude is not None or payload.longitude is not None:

            self.validate_coordinates_in_bounds(target_latitude, target_longitude)

        # Detect whether Vietnamese narrative content changed

        title_changed = payload.title is not None and payload.title != poi.title

        short_desc_changed = (
            payload.short_description is not None
            and payload.short_description != poi.short_description
        )

        desc_changed = (
            payload.description is not None and payload.description != poi.description
        )

        narrative_changed = title_changed or short_desc_changed or desc_changed

        self.repository.update(
            poi,
            title=payload.title,
            short_description=payload.short_description,
            description=payload.description,
            image_url=payload.image_url,
            latitude=payload.latitude,
            longitude=payload.longitude,
            radius=payload.radius,
        )

        if narrative_changed:

            self.repository.update_translation_narrative_and_invalidate_foreign(
                poi_id=poi_id,
                title=payload.title,
                short_description=payload.short_description,
                description=payload.description,
            )

            if background_tasks is not None:
                from app.services.translation_pipeline_service import (
                    execute_poi_pipeline_background_task,
                )

                background_tasks.add_task(execute_poi_pipeline_background_task, poi_id)

        # Audit logging (dev_rules Section 3.3)

        audit_details = (
            POI_GEOFENCE_UPDATED_DETAILS
            if (
                payload.title is None
                and payload.short_description is None
                and payload.description is None
                and payload.image_url is None
            )
            else "ADMIN_POI_UPDATED"
        )

        self.audit_repository.create_log_entry(
            user_name=admin_user_name,
            status=AUDIT_STATUS_SUCCESS,
            ip_address=client_ip,
            details=audit_details,
        )

        return self._to_map_item(poi)

    def update_poi_geofence(
        self,
        poi_id: str,
        payload: POIUpdateRequest,
        admin_user_name: str,
        client_ip: str | None = None,
    ) -> POIMapItem:
        """Validate and persist new coordinates and/or radius for one exhibit."""

        return self.update_poi(poi_id, payload, admin_user_name, client_ip)

    @staticmethod
    def validate_coordinates_in_bounds(latitude: float, longitude: float) -> None:
        """Reject coordinates outside the perimeter with the Admin error envelope.



        Unlike the module-level helper (used by exhibit creation, which returns

        the permitted bounds), this one raises the standardized `ApiError` the

        Admin Portal renders for a rejected geofence write.

        """

        if not _is_within_cu_chi_bounds(latitude, longitude):

            raise ApiError(
                status_code=status.HTTP_400_BAD_REQUEST,
                code=GEO_OUT_OF_BOUNDS_ERROR_CODE,
                message=GEO_OUT_OF_BOUNDS_ERROR_MESSAGE,
            )

    def set_poi_visibility(
        self,
        poi_id: str,
        is_active: bool,
        admin_user_name: str,
        client_ip: str | None = None,
    ) -> POIResponse:
        """Toggle an exhibit's active visibility status and record in Audit (US 03.3).

        # ARCH-BOUNDARY: Service coordinates validation, state toggle, and audit logging.
        # SECURITY-INVARIANT: Inactive exhibits are hidden from visitor discovery while preserving historical telemetry.
        """
        poi = self.repository.get_by_id(poi_id)
        if poi is None:
            raise ApiError(
                status_code=status.HTTP_404_NOT_FOUND,
                code=POI_NOT_FOUND_ERROR_CODE,
                message=POI_NOT_FOUND_ERROR_MESSAGE,
            )

        updated_poi = self.repository.set_visibility(poi, is_active=is_active)

        audit_details = (
            POI_ACTIVATED_DETAILS if is_active else POI_DEACTIVATED_DETAILS
        )
        if hasattr(self.audit_repository, "create_log_entry"):
            self.audit_repository.create_log_entry(
                user_name=admin_user_name,
                status=AUDIT_STATUS_SUCCESS,
                ip_address=client_ip,
                details=audit_details,
            )
        elif hasattr(self.audit_repository, "log_action"):
            self.audit_repository.log_action(
                username=admin_user_name,
                status=AUDIT_STATUS_SUCCESS,
                ip_address=client_ip,
                details=audit_details,
            )

        translations = self.repository.get_translations_by_poi_id(poi_id)
        status_list = [
            POITranslationStatusResponse(
                language_id=t.language_id, status=t.status, title=t.title
            )
            for t in translations
        ]
        return self._build_poi_response(updated_poi, status_list)




    @staticmethod
    def _to_map_item(poi: POI, translation: POITranslation | None = None) -> POIMapItem:

        return POIMapItem(
            id=poi.poi_id,
            title=translation.title if translation else poi.title,
            short_description=(
                translation.short_description if translation else poi.short_description
            ),
            image_url=poi.image_url,
            latitude=float(poi.latitude),
            longitude=float(poi.longitude),
            trigger_radius=poi.radius,
        )

    @staticmethod
    def _build_poi_response(
        poi: POI, translations: list[POITranslationStatusResponse]
    ) -> POIResponse:

        return POIResponse(
            poi_id=poi.poi_id,
            title=poi.title,
            short_description=poi.short_description,
            description=poi.description,
            image_url=poi.image_url,
            latitude=float(poi.latitude),
            longitude=float(poi.longitude),
            radius=poi.radius,
            is_active=poi.is_active,
            create_at=poi.create_at,
            update_at=poi.update_at,
            create_by=poi.create_by,
            translations=translations,
        )
