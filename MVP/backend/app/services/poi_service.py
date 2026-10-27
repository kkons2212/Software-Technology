"""POI application service: public map reads and Admin geofence writes."""

from fastapi import Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ApiError
from app.models.audit import AUDIT_STATUS_SUCCESS
from app.models.poi import POI
from app.models.translation import POITranslation
from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.schemas.poi_schema import POIMapItem, POIUpdateRequest

# Cu Chi Tunnels perimeter. Kept in sync with the frontend constant in
# `src/utils/museumBounds.js` so the map picker and the API agree.
CU_CHI_BOUNDS = {
    "min_lat": 11.135,
    "max_lat": 11.155,
    "min_lng": 106.45,
    "max_lng": 106.475,
}
GEO_OUT_OF_BOUNDS_ERROR_CODE = "GEO_OUT_OF_BOUNDS"
GEO_OUT_OF_BOUNDS_ERROR_MESSAGE = (
    "Coordinates must fall inside the Cu Chi Tunnels boundary."
)
POI_NOT_FOUND_ERROR_CODE = "POI_NOT_FOUND"
POI_NOT_FOUND_ERROR_MESSAGE = "The requested exhibit does not exist."
POI_GEOFENCE_UPDATED_DETAILS = "ADMIN_POI_GEOFENCE_UPDATED"


def get_poi_service(db: Session = Depends(get_db)) -> "POIService":
    return POIService(
        repository=POIRepository(db),
        audit_repository=AuditRepository(db),
    )


class POIService:
    def __init__(
        self,
        repository: POIRepository,
        audit_repository: AuditRepository,
    ):
        self.repository = repository
        self.audit_repository = audit_repository

    def list_map_pois(self, language_code: str | None = None) -> list[POIMapItem]:
        return [
            self._to_map_item(poi, translation)
            for poi, translation in self.repository.list_active_pois(language_code)
        ]

    def update_poi_geofence(
        self,
        poi_id: str,
        payload: POIUpdateRequest,
        admin_user_name: str,
        client_ip: str | None = None,
    ) -> POIMapItem:
        """Validate and persist new coordinates and/or radius for one exhibit."""
        poi = self.repository.get_by_id(poi_id)
        if poi is None:
            raise ApiError(
                status_code=status.HTTP_404_NOT_FOUND,
                code=POI_NOT_FOUND_ERROR_CODE,
                message=POI_NOT_FOUND_ERROR_MESSAGE,
            )

        # Validate the resulting position while keeping the untouched axis when
        # the payload changes only one of latitude/longitude.
        target_latitude = (
            payload.latitude if payload.latitude is not None else float(poi.latitude)
        )
        target_longitude = (
            payload.longitude if payload.longitude is not None else float(poi.longitude)
        )
        self.validate_coordinates_in_bounds(target_latitude, target_longitude)

        self.repository.update_geofence(
            poi,
            latitude=payload.latitude,
            longitude=payload.longitude,
            radius=payload.radius,
        )
        # dev_rules Section 3.3: every mutating Admin action is audited.
        self.audit_repository.create_log_entry(
            user_name=admin_user_name,
            status=AUDIT_STATUS_SUCCESS,
            ip_address=client_ip,
            details=POI_GEOFENCE_UPDATED_DETAILS,
        )
        return self._to_map_item(poi)

    @staticmethod
    def validate_coordinates_in_bounds(latitude: float, longitude: float) -> None:
        """Reject coordinates that fall outside the Cu Chi Tunnels perimeter."""
        is_inside = (
            CU_CHI_BOUNDS["min_lat"] <= latitude <= CU_CHI_BOUNDS["max_lat"]
            and CU_CHI_BOUNDS["min_lng"] <= longitude <= CU_CHI_BOUNDS["max_lng"]
        )
        if not is_inside:
            raise ApiError(
                status_code=status.HTTP_400_BAD_REQUEST,
                code=GEO_OUT_OF_BOUNDS_ERROR_CODE,
                message=GEO_OUT_OF_BOUNDS_ERROR_MESSAGE,
            )

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
