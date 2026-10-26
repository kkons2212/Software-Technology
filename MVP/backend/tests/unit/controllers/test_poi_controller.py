"""Unit tests for POIController (TSK-03.1.3 & TSK-03.1.5)."""

import io
from app.models.user import User


def test_should_create_poi_via_json_payload(client, db_session):
    # Ensure admin user exists in DB
    admin = User(UserName="admin", Email="admin@cuchi.gov.vn", Password_hash="hash", Is_Active=True)
    db_session.add(admin)
    db_session.commit()

    payload = {
        "title": "Hầm chông tự tạo",
        "short_description": "Vũ khí thô sơ bảo vệ căn cứ",
        "description": "Các loại hầm chông tre, chông sắt độc đáo của du kích Củ Chi.",
        "latitude": 11.1445,
        "longitude": 106.4625,
        "radius": 25
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
    admin = User(UserName="admin", Email="admin@cuchi.gov.vn", Password_hash="hash", Is_Active=True)
    db_session.add(admin)
    db_session.commit()

    image_content = b"\xFF\xD8\xFF\xE0" + b"0" * 500  # Minimal valid JPG header bytes
    files = {
        "image": ("test_cover.jpg", io.BytesIO(image_content), "image/jpeg")
    }
    data = {
        "title": "Địa đạo Bến Dược",
        "short_description": "Căn cứ địa cách mạng",
        "description": "Trung tâm đầu não kháng chiến.",
        "latitude": "11.1432",
        "longitude": "106.4631",
        "radius": "35"
    }

    response = client.post("/api/v1/admin/pois", data=data, files=files)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["title"] == "Địa đạo Bến Dược"
    assert res_data["radius"] == 35
    assert res_data["image_url"] is not None
    assert "/static/images/" in res_data["image_url"]


def test_should_return_400_when_coordinates_out_of_bounds(client, db_session):
    admin = User(UserName="admin", Email="admin@cuchi.gov.vn", Password_hash="hash", Is_Active=True)
    db_session.add(admin)
    db_session.commit()

    payload = {
        "title": "Out of Bounds POI",
        "latitude": 10.0000,  # Invalid: outside Cu Chi boundary
        "longitude": 106.4631,
        "radius": 30
    }
    response = client.post("/api/v1/admin/pois", json=payload)
    assert response.status_code == 400


def test_should_list_pois_with_pagination_and_search(client, db_session):
    admin = User(UserName="admin", Email="admin@cuchi.gov.vn", Password_hash="hash", Is_Active=True)
    db_session.add(admin)
    db_session.commit()

    # Create 2 POIs
    client.post(
        "/api/v1/admin/pois",
        json={"title": "Hầm thông tin", "latitude": 11.1435, "longitude": 106.4635, "radius": 30}
    )
    client.post(
        "/api/v1/admin/pois",
        json={"title": "Hầm may quân trang", "latitude": 11.1440, "longitude": 106.4640, "radius": 30}
    )

    # List all
    list_res = client.get("/api/v1/admin/pois?page=1&size=10")
    assert list_res.status_code == 200
    res_json = list_res.json()
    assert res_json["total"] == 2

    # Search filter
    search_res = client.get("/api/v1/admin/pois?search=thông tin")
    assert search_res.status_code == 200
    search_json = search_res.json()
    assert search_json["total"] == 1
    assert search_json["items"][0]["title"] == "Hầm thông tin"


def test_should_get_poi_by_id_and_return_404_when_missing(client, db_session):
    admin = User(UserName="admin", Email="admin@cuchi.gov.vn", Password_hash="hash", Is_Active=True)
    db_session.add(admin)
    db_session.commit()

    create_res = client.post(
        "/api/v1/admin/pois",
        json={"title": "Hầm họp", "latitude": 11.1438, "longitude": 106.4638, "radius": 20}
    )
    poi_id = create_res.json()["poi_id"]

    get_res = client.get(f"/api/v1/admin/pois/{poi_id}")
    assert get_res.status_code == 200
    assert get_res.json()["poi_id"] == poi_id

    missing_res = client.get("/api/v1/admin/pois/NONEXISTENT_POI")
    assert missing_res.status_code == 404
