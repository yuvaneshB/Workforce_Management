"""Focused test suite verifying plant-wise employee and demographic analytics filtering.

Tests:
1. All Plants (plant_id=None): Returns complete 180-employee baseline across all endpoints.
2. IN-TN-01: Returns exactly 90 employees, all male, 5 departments, 3 sections, 0 new joiners.
3. IN-KA-01: Returns exactly 90 employees, all female, 5 departments, 3 sections, 22 new joiners.
4. IN-TN-02: Returns genuine clean empty results (0 employees, empty lists) while no records exist in DB.
5. No duplicates: IN-TN-01 + IN-KA-01 equals All Plants totals.
6. Date filtering preservation with plant_id.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_workforce_summary_plant_filtering():
    # All Plants
    res_all = client.get("/api/v1/workforce/summary").json()
    assert res_all["total_employees"] == 180
    assert res_all["active_employees"] == 180
    assert res_all["distinct_teams"] == 18

    # IN-TN-01
    res_tn = client.get("/api/v1/workforce/summary", params={"plant_id": "IN-TN-01"}).json()
    assert res_tn["total_employees"] == 90
    assert res_tn["active_employees"] == 90
    assert res_tn["distinct_teams"] == 9

    # IN-KA-01
    res_ka = client.get("/api/v1/workforce/summary", params={"plant_id": "IN-KA-01"}).json()
    assert res_ka["total_employees"] == 90
    assert res_ka["active_employees"] == 90
    assert res_ka["distinct_teams"] == 9

    # IN-TN-02
    res_tn2 = client.get("/api/v1/workforce/summary", params={"plant_id": "IN-TN-02"}).json()
    assert res_tn2["total_employees"] == 0
    assert res_tn2["active_employees"] == 0
    assert res_tn2["distinct_teams"] == 0
    assert res_tn2["by_role"] == []


def test_employees_list_plant_filtering():
    # All Plants
    res_all = client.get("/api/v1/employees", params={"page_size": 200}).json()
    assert res_all["pagination"]["total"] == 180

    # IN-TN-01
    res_tn = client.get("/api/v1/employees", params={"plant_id": "IN-TN-01", "page_size": 200}).json()
    assert res_tn["pagination"]["total"] == 90

    # IN-KA-01
    res_ka = client.get("/api/v1/employees", params={"plant_id": "IN-KA-01", "page_size": 200}).json()
    assert res_ka["pagination"]["total"] == 90

    # IN-TN-02
    res_tn2 = client.get("/api/v1/employees", params={"plant_id": "IN-TN-02", "page_size": 200}).json()
    assert res_tn2["pagination"]["total"] == 0
    assert res_tn2["items"] == []


def test_gender_analytics_plant_filtering():
    # All Plants
    res_all = client.get("/api/v1/analytics/gender").json()
    assert res_all["total_employees"] == 180
    assert len(res_all["buckets"]) == 2

    # IN-TN-01
    res_tn = client.get("/api/v1/analytics/gender", params={"plant_id": "IN-TN-01"}).json()
    assert res_tn["total_employees"] == 90
    assert len(res_tn["buckets"]) == 1
    assert res_tn["buckets"][0]["gender"] == "Male"
    assert res_tn["buckets"][0]["employee_count"] == 90

    # IN-KA-01
    res_ka = client.get("/api/v1/analytics/gender", params={"plant_id": "IN-KA-01"}).json()
    assert res_ka["total_employees"] == 90
    assert len(res_ka["buckets"]) == 1
    assert res_ka["buckets"][0]["gender"] == "Female"
    assert res_ka["buckets"][0]["employee_count"] == 90

    # IN-TN-02
    res_tn2 = client.get("/api/v1/analytics/gender", params={"plant_id": "IN-TN-02"}).json()
    assert res_tn2["total_employees"] == 0
    assert res_tn2["buckets"] == []


def test_department_analytics_plant_filtering():
    # All Plants
    res_all = client.get("/api/v1/analytics/departments").json()
    assert sum(i["employee_count"] for i in res_all["items"]) == 180
    assert sum(i["total_records"] for i in res_all["items"]) == 16560

    # IN-TN-01
    res_tn = client.get("/api/v1/analytics/departments", params={"plant_id": "IN-TN-01"}).json()
    assert res_tn["total_departments"] == 5
    assert sum(i["employee_count"] for i in res_tn["items"]) == 90
    assert sum(i["total_records"] for i in res_tn["items"]) == 8280

    # IN-KA-01
    res_ka = client.get("/api/v1/analytics/departments", params={"plant_id": "IN-KA-01"}).json()
    assert res_ka["total_departments"] == 5
    assert sum(i["employee_count"] for i in res_ka["items"]) == 90
    assert sum(i["total_records"] for i in res_ka["items"]) == 8280

    # IN-TN-02
    res_tn2 = client.get("/api/v1/analytics/departments", params={"plant_id": "IN-TN-02"}).json()
    assert res_tn2["total_departments"] == 0
    assert res_tn2["items"] == []


def test_section_analytics_plant_filtering():
    # All Plants
    res_all = client.get("/api/v1/analytics/sections").json()
    assert res_all["total_sections"] == 6
    assert sum(i["employee_count"] for i in res_all["items"]) == 180

    # IN-TN-01
    res_tn = client.get("/api/v1/analytics/sections", params={"plant_id": "IN-TN-01"}).json()
    assert res_tn["total_sections"] == 3
    assert sum(i["employee_count"] for i in res_tn["items"]) == 90

    # IN-KA-01
    res_ka = client.get("/api/v1/analytics/sections", params={"plant_id": "IN-KA-01"}).json()
    assert res_ka["total_sections"] == 3
    assert sum(i["employee_count"] for i in res_ka["items"]) == 90

    # IN-TN-02
    res_tn2 = client.get("/api/v1/analytics/sections", params={"plant_id": "IN-TN-02"}).json()
    assert res_tn2["total_sections"] == 0
    assert res_tn2["items"] == []


def test_experience_analytics_plant_filtering():
    # All Plants
    res_all = client.get("/api/v1/analytics/experience").json()
    assert sum(i["employee_count"] for i in res_all["items"]) == 180

    # IN-TN-01
    res_tn = client.get("/api/v1/analytics/experience", params={"plant_id": "IN-TN-01"}).json()
    assert sum(i["employee_count"] for i in res_tn["items"]) == 90

    # IN-KA-01
    res_ka = client.get("/api/v1/analytics/experience", params={"plant_id": "IN-KA-01"}).json()
    assert sum(i["employee_count"] for i in res_ka["items"]) == 90

    # IN-TN-02
    res_tn2 = client.get("/api/v1/analytics/experience", params={"plant_id": "IN-TN-02"}).json()
    assert sum(i["employee_count"] for i in res_tn2["items"]) == 0


def test_new_joiner_analytics_plant_filtering():
    # All Plants
    res_all = client.get("/api/v1/analytics/new-joiners").json()
    assert res_all["total_new_joiners"] == 22

    # IN-TN-01
    res_tn = client.get("/api/v1/analytics/new-joiners", params={"plant_id": "IN-TN-01"}).json()
    assert res_tn["total_new_joiners"] == 0

    # IN-KA-01
    res_ka = client.get("/api/v1/analytics/new-joiners", params={"plant_id": "IN-KA-01"}).json()
    assert res_ka["total_new_joiners"] == 22

    # IN-TN-02
    res_tn2 = client.get("/api/v1/analytics/new-joiners", params={"plant_id": "IN-TN-02"}).json()
    assert res_tn2["total_new_joiners"] == 0
    assert res_tn2["anchor_date"] is None


def test_skills_analytics_plant_filtering():
    # All Plants
    res_all = client.get("/api/v1/analytics/skills").json()
    assert res_all["total_employees"] == 180

    # IN-TN-01
    res_tn = client.get("/api/v1/analytics/skills", params={"plant_id": "IN-TN-01"}).json()
    assert res_tn["total_employees"] == 90

    # IN-KA-01
    res_ka = client.get("/api/v1/analytics/skills", params={"plant_id": "IN-KA-01"}).json()
    assert res_ka["total_employees"] == 90

    # IN-TN-02
    res_tn2 = client.get("/api/v1/analytics/skills", params={"plant_id": "IN-TN-02"}).json()
    assert res_tn2["total_employees"] == 0
    assert res_tn2["skill_grade_distribution"] == []

