"""Unit tests for POIController (TSK-03.1.3 & TSK-03.1.5)."""

import io

from app.models.language import LanguageCode
from app.models.user import User


def _ensure_admin_user(db_session):
    admin = db_session.query(User).filter_by(UserName="admin").first()
    if not admin:
        admin = User(
            UserName="admin",
            Email="admin@cuchi.gov.vn",
            Password_hash="hash",
            Is_Active=True,
        )
        db_session.add(admin)
    existing_langs = {lang.LanguageID for lang in db_session.query(LanguageCode).all()}
    for code, name in [
        ("vi", "Tiếng Việt"),
        ("en", "English"),
        ("ja", "Japanese"),
        ("ko", "Korean"),
        ("zh", "Chinese"),
    ]:
        if code not in existing_langs:
            db_session.add(LanguageCode(LanguageID=code, LanguageName=name))
    db_session.flush()
    return admin


def test_should_create_poi_via_json_payload(client, db_session):
    _ensure_admin_user(db_session)

    payload = {
        "title": "Hầm chông tự tạo",
        "short_description": "Vũ khí thô sơ bảo vệ căn cứ",
        "description": "Các loại hầm chông tre, chông sắt độc đáo của du kích Củ Chi.",
        "latitude": 11.1445,
        "longitude": 106.4625,
        "radius": 25,
    }
    response = client.post("/api/v1/admin/pois", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Hầm chông tự tạo"
    assert data["radius"] == 25
    assert data["latitude"] == 11.1445
    assert data["longitude"] == 106.4625
    assert data["poi_id"].startswith("POI_")
    assert len(data["translations"]) == 5


def test_should_create_poi_via_multipart_form_data_with_image(client, db_session):
    _ensure_admin_user(db_session)

    image_content = b"\xFF\xD8\xFF\xE0" + b"0" * 500  # Minimal valid JPG header bytes
    files = {"image": ("test_cover.jpg", io.BytesIO(image_content), "image/jpeg")}
    data = {
        "title": "Địa đạo Bến Dược",
        "short_description": "Căn cứ địa cách mạng",
        "description": "Trung tâm đầu não kháng chiến.",
        "latitude": "11.1432",
        "longitude": "106.4631",
        "radius": "35",
    }

    response = client.post("/api/v1/admin/pois", data=data, files=files)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["title"] == "Địa đạo Bến Dược"
    assert res_data["radius"] == 35
    assert res_data["image_url"] is not None
    assert "/static/images/" in res_data["image_url"]


def test_should_return_400_when_coordinates_out_of_bounds(client, db_session):
    _ensure_admin_user(db_session)

    payload = {
        "title": "Out of Bounds POI",
        "latitude": 10.0000,  # Invalid: outside Cu Chi boundary
        "longitude": 106.4631,
        "radius": 30,
    }
    response = client.post("/api/v1/admin/pois", json=payload)
    assert response.status_code == 400


def test_should_list_pois_with_pagination_and_search(client, db_session):
    _ensure_admin_user(db_session)

    initial_total = client.get("/api/v1/admin/pois").json()["total"]

    # Create 2 POIs
    client.post(
        "/api/v1/admin/pois",
        json={
            "title": "Hầm thông tin",
            "latitude": 11.1435,
            "longitude": 106.4635,
            "radius": 30,
        },
    )
    client.post(
        "/api/v1/admin/pois",
        json={
            "title": "Hầm may quân trang",
            "latitude": 11.1440,
            "longitude": 106.4640,
            "radius": 30,
        },
    )

    # List all
    list_res = client.get("/api/v1/admin/pois?page=1&size=10")
    assert list_res.status_code == 200
    res_json = list_res.json()
    assert res_json["total"] == initial_total + 2

    # Search filter
    search_res = client.get("/api/v1/admin/pois?search=thông tin")
    assert search_res.status_code == 200
    search_json = search_res.json()
    assert search_json["total"] == 1
    assert search_json["items"][0]["title"] == "Hầm thông tin"


def test_should_get_poi_by_id_and_return_404_when_missing(client, db_session):
    _ensure_admin_user(db_session)

    create_res = client.post(
        "/api/v1/admin/pois",
        json={
            "title": "Hầm họp",
            "latitude": 11.1438,
            "longitude": 106.4638,
            "radius": 20,
        },
    )
    poi_id = create_res.json()["poi_id"]

    get_res = client.get(f"/api/v1/admin/pois/{poi_id}")
    assert get_res.status_code == 200
    assert get_res.json()["poi_id"] == poi_id

    missing_res = client.get("/api/v1/admin/pois/NONEXISTENT_POI")
    assert missing_res.status_code == 404


def _login_admin_client(client, db_session):
    admin = _ensure_admin_user(db_session)
    from app.core.config import get_settings
    from app.core.security import create_admin_access_token

    token = create_admin_access_token(admin_user_name=admin.user_name)
    client.cookies.set(get_settings().ADMIN_SESSION_COOKIE_NAME, token)
    return admin


def test_should_update_poi_and_invalidate_foreign_translations(client, db_session):
    _login_admin_client(client, db_session)

    # 1. Create initial POI
    create_res = client.post(
        "/api/v1/admin/pois",
        json={
            "title": "Hầm giải phẫu ban đầu",
            "short_description": "Mô tả ngắn ban đầu",
            "description": "Nội dung lịch sử ban đầu",
            "latitude": 11.1435,
            "longitude": 106.4635,
            "radius": 25,
        },
    )
    assert create_res.status_code == 201
    poi_id = create_res.json()["poi_id"]

    # 2. Mark foreign translations as PUBLISHED to verify invalidation
    from app.models.translation import POITranslation

    foreign_trans = (
        db_session.query(POITranslation)
        .filter(POITranslation.poi_id == poi_id, POITranslation.language_id != "vi")
        .all()
    )
    assert len(foreign_trans) == 4
    for ft in foreign_trans:
        ft.status = "PUBLISHED"
    db_session.commit()

    # 3. Update Vietnamese narrative via PUT /api/v1/admin/pois/{id}
    update_res = client.put(
        f"/api/v1/admin/pois/{poi_id}",
        json={
            "title": "Hầm giải phẫu dã chiến nâng cao",
            "description": "Nội dung lịch sử đã được cập nhật chi tiết.",
        },
    )
    assert update_res.status_code == 200
    res_data = update_res.json()["data"]
    assert res_data["title"] == "Hầm giải phẫu dã chiến nâng cao"

    # 4. Verify primary Vietnamese translation was updated
    vi_trans = (
        db_session.query(POITranslation)
        .filter(POITranslation.poi_id == poi_id, POITranslation.language_id == "vi")
        .one()
    )
    assert vi_trans.title == "Hầm giải phẫu dã chiến nâng cao"
    assert vi_trans.description == "Nội dung lịch sử đã được cập nhật chi tiết."

    # 5. Verify all linked foreign translations are set to NEEDS_UPDATE (AC-03.4.2)
    updated_foreign = (
        db_session.query(POITranslation)
        .filter(POITranslation.poi_id == poi_id, POITranslation.language_id != "vi")
        .all()
    )
    assert len(updated_foreign) == 4
    for ft in updated_foreign:
        assert ft.status == "NEEDS_UPDATE"


def test_should_update_coordinates_without_invalidating_foreign_translations(
    client, db_session
):
    _login_admin_client(client, db_session)

    create_res = client.post(
        "/api/v1/admin/pois",
        json={
            "title": "Hầm chữ A",
            "latitude": 11.1440,
            "longitude": 106.4640,
            "radius": 30,
        },
    )
    poi_id = create_res.json()["poi_id"]

    # Mark foreign translations as PUBLISHED
    from app.models.translation import POITranslation

    foreign_trans = (
        db_session.query(POITranslation)
        .filter(POITranslation.poi_id == poi_id, POITranslation.language_id != "vi")
        .all()
    )
    for ft in foreign_trans:
        ft.status = "PUBLISHED"
    db_session.commit()

    # Update only geofence
    update_res = client.put(
        f"/api/v1/admin/pois/{poi_id}",
        json={
            "latitude": 11.1450,
            "radius": 40,
        },
    )
    assert update_res.status_code == 200

    # Foreign translations must still be PUBLISHED
    refreshed_foreign = (
        db_session.query(POITranslation)
        .filter(POITranslation.poi_id == poi_id, POITranslation.language_id != "vi")
        .all()
    )
    for ft in refreshed_foreign:
        assert ft.status == "PUBLISHED"


def test_should_return_400_when_updating_coordinates_out_of_bounds(client, db_session):
    _login_admin_client(client, db_session)
    create_res = client.post(
        "/api/v1/admin/pois",
        json={
            "title": "Hầm rơm",
            "latitude": 11.1440,
            "longitude": 106.4640,
            "radius": 30,
        },
    )
    poi_id = create_res.json()["poi_id"]

    res = client.put(
        f"/api/v1/admin/pois/{poi_id}",
        json={"latitude": 10.0000},
    )
    assert res.status_code == 400


def test_should_return_404_when_updating_nonexistent_poi(client, db_session):
    _login_admin_client(client, db_session)
    res = client.put(
        "/api/v1/admin/pois/NONEXISTENT_POI_ID",
        json={"title": "Non-existent"},
    )
    assert res.status_code == 404
