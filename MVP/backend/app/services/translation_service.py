"""TranslationService containing business logic for Multilingual Translation Audit (US 04.1)."""

from fastapi import HTTPException, status

from app.repositories.audit_repository import AuditRepository
from app.repositories.poi_repository import POIRepository
from app.repositories.translation_repository import TranslationRepository
from app.schemas.translation_schema import (
    TranslationListResponse,
    TranslationResponse,
    TranslationUpdateRequest,
)


class TranslationService:
    def __init__(
        self,
        translation_repo: TranslationRepository,
        audit_repo: AuditRepository | None = None,
        poi_repo: POIRepository | None = None,
    ):
        self.translation_repo = translation_repo
        self.audit_repo = audit_repo
        self.poi_repo = poi_repo

    def _build_response(self, item) -> TranslationResponse:
        """Construct a standardized TranslationResponse with source Vietnamese text."""
        source = self.translation_repo.get_source_translation(item.poi_id)

        source_title = (
            source.title if source else (item.poi.title if item.poi else None)
        )
        source_short = (
            source.short_description
            if source
            else (item.poi.short_description if item.poi else None)
        )
        source_desc = (
            source.description
            if source
            else (item.poi.description if item.poi else None)
        )

        audio_url = item.audio.audio_url if item.audio else None
        audio_status = item.audio.status if item.audio else None
        language_name = item.language.language_name if item.language else None
        poi_title = item.poi.title if item.poi else None

        return TranslationResponse(
            stran_id=item.stran_id,
            poi_id=item.poi_id,
            poi_title=poi_title,
            language_id=item.language_id,
            language_name=language_name,
            title=item.title,
            short_description=item.short_description,
            description=item.description,
            status=item.status,
            audio_url=audio_url,
            audio_status=audio_status,
            source_title=source_title,
            source_short_description=source_short,
            source_description=source_desc,
            review_by=item.review_by,
            review_at=item.review_at,
            user_name=item.user_name,
            create_at=item.create_at,
            update_at=item.update_at,
        )

    def list_translations(
        self,
        poi_id: str | None = None,
        language_id: str | None = None,
        status_filter: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> TranslationListResponse:
        """Fetch paginated translations with source comparison metadata."""
        items, total = self.translation_repo.get_translations(
            poi_id=poi_id,
            language_id=language_id,
            status=status_filter,
            skip=skip,
            limit=limit,
        )
        response_items = [self._build_response(item) for item in items]
        return TranslationListResponse(items=response_items, total=total)

    def get_translation_by_id(self, stran_id: str) -> TranslationResponse:
        """Retrieve single translation by ID."""
        item = self.translation_repo.get_by_id(stran_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Translation '{stran_id}' not found.",
            )
        return self._build_response(item)

    def update_translation(
        self,
        stran_id: str,
        payload: TranslationUpdateRequest,
        admin_username: str,
        ip_address: str | None = None,
    ) -> TranslationResponse:
        """Update translation text and enforce NEEDS_UPDATE status (AC-04.1.3 & Section 5.1)."""
        existing = self.translation_repo.get_by_id(stran_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Translation '{stran_id}' not found.",
            )

        # Invariant (AC-04.1.3 & Rule 5.1): Editing text immediately forces NEEDS_UPDATE
        is_text_changed = (
            (payload.title is not None and payload.title != existing.title)
            or (
                payload.short_description is not None
                and payload.short_description != existing.short_description
            )
            or (
                payload.description is not None
                and payload.description != existing.description
            )
        )

        if is_text_changed:
            target_status = "NEEDS_UPDATE"
        elif payload.status:
            target_status = payload.status.upper()
        else:
            target_status = existing.status

        updated = self.translation_repo.update_translation(
            stran_id=stran_id,
            title=payload.title,
            short_description=payload.short_description,
            description=payload.description,
            status=target_status,
            user_name=admin_username,
        )

        if self.audit_repo:
            self.audit_repo.log_action(
                username=admin_username,
                status="SUCCESS",
                ip_address=ip_address,
                details=(
                    f"UPDATE_TRANSLATION: {stran_id} (Status: {target_status}, "
                    f"POI: {existing.poi_id}, Lang: {existing.language_id})"
                ),
            )

        return self._build_response(updated)
