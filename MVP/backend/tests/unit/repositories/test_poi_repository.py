"""Unit tests for POIRepository (TSK-03.1.2 & TSK-03.1.5)."""

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

    items, total = repo.get_all(skip=0, limit=3)
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
