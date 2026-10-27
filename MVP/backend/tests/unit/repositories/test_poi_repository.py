"""Unit tests for POIRepository (TSK-03.1.2 & TSK-03.1.5)."""

from app.models.language import LanguageCode
from app.models.poi import POI
from app.models.translation import POITranslation
from app.repositories.poi_repository import POIRepository


def test_should_create_and_retrieve_poi_when_valid_data(db_session):
    repo = POIRepository(db_session)
    poi = POI(
        PoiID="POI_TEST_001",
        Title="Địa đạo Bến Dược",
        Short_Description="Khu di tích lịch sử Bến Dược",
        Description="Hệ thống địa đạo dài hàng trăm km trong kháng chiến.",
        Latitude=11.1432,
        Longitude=106.4631,
        Radius=30,
        Is_Active=True,
    )
    created = repo.create(poi)
    assert created.PoiID == "POI_TEST_001"
    assert created.Title == "Địa đạo Bến Dược"

    fetched = repo.get_by_id("POI_TEST_001")
    assert fetched is not None
    assert fetched.Title == "Địa đạo Bến Dược"
    assert float(fetched.Latitude) == 11.1432
    assert float(fetched.Longitude) == 106.4631


def test_should_paginate_pois_and_return_accurate_total_count(db_session):
    repo = POIRepository(db_session)
    for i in range(5):
        repo.create(
            POI(
                PoiID=f"POI_PAG_{i}",
                Title=f"Exhibit {i}",
                Latitude=11.1430 + (i * 0.001),
                Longitude=106.4630 + (i * 0.001),
                Radius=25,
                Is_Active=True,
            )
        )

    items, total = repo.get_all(skip=0, limit=3, search="Exhibit")
    assert total == 5
    assert len(items) == 3


def test_should_filter_pois_by_title_search(db_session):
    repo = POIRepository(db_session)
    repo.create(
        POI(
            PoiID="POI_SEARCH_1",
            Title="Hầm chỉ huy",
            Latitude=11.1432,
            Longitude=106.4631,
            Radius=30,
        )
    )
    repo.create(
        POI(
            PoiID="POI_SEARCH_2",
            Title="Bếp Hoàng Cầm",
            Latitude=11.1440,
            Longitude=106.4640,
            Radius=20,
        )
    )

    items, total = repo.get_all(search="Bếp")
    assert total == 1
    assert items[0].Title == "Bếp Hoàng Cầm"


def test_should_create_and_fetch_translations_by_poi_id(db_session):
    existing_langs = {lang.language_id for lang in db_session.query(LanguageCode).all()}
    if "en" not in existing_langs:
        db_session.add(LanguageCode(language_id="en", language_name="English"))
        db_session.flush()

    repo = POIRepository(db_session)
    poi = repo.create(
        POI(
            PoiID="POI_TRANS_TEST",
            Title="Hầm quân y",
            Latitude=11.1435,
            Longitude=106.4635,
            Radius=30,
        )
    )
    trans = POITranslation(
        StranID="TR_001",
        Title="[EN] Field Hospital",
        Short_Description="Underground medical center",
        Description="Used to treat wounded soldiers.",
        Status="PENDING",
        PoiID=poi.PoiID,
        LanguageID="en",
    )
    repo.create_translation(trans)

    translations = repo.get_translations_by_poi_id(poi.PoiID)
    assert len(translations) == 1
    assert translations[0].LanguageID == "en"
    assert translations[0].Status == "PENDING"


def test_should_return_none_when_poi_not_found(db_session):
    repo = POIRepository(db_session)
    result = repo.get_by_id("NONEXISTENT_ID")
    assert result is None


def test_should_update_poi_record_in_repository(db_session):
    repo = POIRepository(db_session)
    poi = repo.create(
        POI(
            PoiID="POI_REPO_UPD_1",
            Title="Gốc cây thông tin",
            Latitude=11.1440,
            Longitude=106.4640,
            Radius=20,
        )
    )

    updated = repo.update(
        poi,
        title="Gốc cây thông tin cập nhật",
        short_description="Mô tả mới",
        description="Nội dung mới",
        image_url="/static/images/tree.jpg",
        latitude=11.1450,
        longitude=106.4650,
        radius=35,
    )

    assert updated.Title == "Gốc cây thông tin cập nhật"
    assert updated.Short_Description == "Mô tả mới"
    assert updated.Description == "Nội dung mới"
    assert updated.Image_Url == "/static/images/tree.jpg"
    assert float(updated.Latitude) == 11.1450
    assert float(updated.Longitude) == 106.4650
    assert updated.Radius == 35


def test_should_sync_vi_and_invalidate_foreign_translations_in_repo(db_session):
    repo = POIRepository(db_session)
    poi = repo.create(
        POI(
            PoiID="POI_REPO_UPD_2",
            Title="Hầm vũ khí",
            Latitude=11.1442,
            Longitude=106.4642,
            Radius=30,
        )
    )

    tr_vi = repo.create_translation(
        POITranslation(
            StranID="TR_VI_1",
            PoiID=poi.PoiID,
            LanguageID="vi",
            Title="Hầm vũ khí",
            Status="PUBLISHED",
        )
    )
    tr_en = repo.create_translation(
        POITranslation(
            StranID="TR_EN_1",
            PoiID=poi.PoiID,
            LanguageID="en",
            Title="Armory",
            Status="PUBLISHED",
        )
    )

    invalidated_count = repo.update_translation_narrative_and_invalidate_foreign(
        poi_id=poi.PoiID,
        title="Kho vũ khí bí mật",
        short_description="Nơi cất giữ vũ khí",
        description="Kho vũ khí ngầm dưới lòng đất",
    )

    assert invalidated_count == 1
    db_session.refresh(tr_vi)
    db_session.refresh(tr_en)
    assert tr_vi.Title == "Kho vũ khí bí mật"
    assert tr_vi.Status == "PUBLISHED"
    assert tr_en.Status == "NEEDS_UPDATE"
