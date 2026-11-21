"""
tests/test_p08_t02.py — P08-T02
Contract tests: Python geometry solver vs shared fixtures (geometry_cases.json).
Every fixture case must match within tolerance.
"""
import json
import math
import os

import pytest
from fastapi.testclient import TestClient

from main import app

FIXTURES_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "geometry_cases.json")
SECRET = "changeme-dev-secret"
HEADERS = {"X-Internal-Secret": SECRET}

client = TestClient(app)


def load_fixtures():
    with open(FIXTURES_PATH) as f:
        return json.load(f)


FIXTURES = load_fixtures()


# ---------------------------------------------------------------------------
# 1. Geometry endpoint: each fixture case passes within tolerance
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("case", FIXTURES, ids=[c["id"] for c in FIXTURES])
def test_geometry_solve_contract(case):
    """Each shared fixture case: Python solver must match expected values within tolerance."""
    resp = client.post("/ai/geometry/solve", json={"params": case["params"]}, headers=HEADERS)
    assert resp.status_code == 200, f"Unexpected {resp.status_code}: {resp.text}"
    data = resp.json()
    tol = case["tolerance"]
    assert math.isclose(data["volume"], case["expected"]["volume"], rel_tol=tol), (
        f"Volume mismatch for {case['id']}: got {data['volume']}, expected {case['expected']['volume']}"
    )
    assert math.isclose(data["surface_area"], case["expected"]["surface_area"], rel_tol=tol), (
        f"Surface area mismatch for {case['id']}: got {data['surface_area']}, expected {case['expected']['surface_area']}"
    )


# ---------------------------------------------------------------------------
# 2. Unknown solid type returns 422
# ---------------------------------------------------------------------------

def test_geometry_solve_unknown_type():
    resp = client.post("/ai/geometry/solve", json={"params": {"type": "donut", "r": 5}}, headers=HEADERS)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 3. Invalid params (zero radius) returns 422
# ---------------------------------------------------------------------------

def test_geometry_solve_invalid_param():
    resp = client.post("/ai/geometry/solve", json={"params": {"type": "sphere", "r": 0}}, headers=HEADERS)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 4. Auth: missing secret returns 422 (FastAPI missing required header)
# ---------------------------------------------------------------------------

def test_geometry_solve_no_auth():
    resp = client.post("/ai/geometry/solve", json={"params": {"type": "cube", "s": 3}})
    assert resp.status_code in (401, 422)


# ---------------------------------------------------------------------------
# 5. Auth: wrong secret returns 401
# ---------------------------------------------------------------------------

def test_geometry_solve_wrong_auth():
    resp = client.post("/ai/geometry/solve", json={"params": {"type": "cube", "s": 3}},
                       headers={"X-Internal-Secret": "wrong"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 6. Result includes formula strings
# ---------------------------------------------------------------------------

def test_geometry_result_has_formulas():
    resp = client.post("/ai/geometry/solve", json={"params": {"type": "cube", "s": 4}}, headers=HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert "formula_volume" in data and len(data["formula_volume"]) > 0
    assert "formula_surface_area" in data and len(data["formula_surface_area"]) > 0
    assert "label_volume" in data
    assert "label_surface_area" in data


# ---------------------------------------------------------------------------
# 7. Prism: triangle-inequality violation returns 422
# ---------------------------------------------------------------------------

def test_geometry_prism_invalid_triangle():
    resp = client.post(
        "/ai/geometry/solve",
        json={"params": {"type": "prism", "a": 1, "b": 2, "c": 10, "h": 5}},
        headers=HEADERS,
    )
    assert resp.status_code == 422
