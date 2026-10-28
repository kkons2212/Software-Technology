"""Administrative system health and audio storage controllers (US 05.3).

Exposes:
- GET  /api/v1/admin/system/health
- POST /api/v1/admin/storage/clean-orphans

Adheres strictly to 3-tier boundary rules: delegates all file system,
database telemetry, and business logic to `StorageService`.
"""

from fastapi import APIRouter, Depends, Request

from app.core.dependencies import get_current_admin_profile, get_storage_service
from app.schemas.auth_schema import AdminProfileResponse
from app.schemas.system_schema import CleanOrphansResponse, SystemHealthResponse
from app.services.storage_service import StorageService

SYSTEM_ROUTE_PREFIX = "/api/v1/admin"
X_FORWARDED_FOR_HEADER = "x-forwarded-for"

router = APIRouter(prefix=SYSTEM_ROUTE_PREFIX, tags=["System Health & Storage"])


def resolve_client_ip(request: Request) -> str | None:
    """Resolve the originating client IP, honouring reverse proxy hops."""
    forwarded_for = request.headers.get(X_FORWARDED_FOR_HEADER)
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return None


@router.get("/system/health", response_model=SystemHealthResponse)
def get_system_health(
    admin: AdminProfileResponse = Depends(get_current_admin_profile),
    storage_service: StorageService = Depends(get_storage_service),
) -> SystemHealthResponse:
    """Return storage metrics, 3-tier capacity threshold alerts, and DB latency."""
    health_data = storage_service.get_system_health()
    return SystemHealthResponse(success=True, data=health_data)


@router.post("/storage/clean-orphans", response_model=CleanOrphansResponse)
def clean_orphaned_audio(
    request: Request,
    admin: AdminProfileResponse = Depends(get_current_admin_profile),
    storage_service: StorageService = Depends(get_storage_service),
) -> CleanOrphansResponse:
    """Prune unreferenced MP3 audio files from cache and log administrative audit trail."""
    client_ip = resolve_client_ip(request)
    result = storage_service.prune_orphaned_audio_files(
        admin_username=admin.user_name,
        client_ip=client_ip,
    )
    return CleanOrphansResponse(success=True, data=result)
