"""Tests for the energy optimizer core logic and the API endpoint."""

import math

from fastapi.testclient import TestClient

from main import app, energy_optimizer

client = TestClient(app)


def _sample():
    M, Z = 10, 3
    D = [2, 2, 2, 2, 2, 3, 4, 5, 4, 3, 3, 3, 3, 3, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2]
    X = [0, 0, 0, 0, 0, 0, 1, 3, 5, 6, 7, 8, 8, 7, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0]
    Y = [1, 1, 1, 1, 1, 2, 3, 3, 2, 2, 2, 2, 2, 3, 4, 5, 8, 10, 10, 8, 5, 3, 2, 1]
    return M, Z, D, X, Y


def test_sample_scenario_returns_finite_bill():
    bill, plan = energy_optimizer(*_sample())
    assert math.isfinite(bill)
    assert len(plan) == 24


def test_battery_constraints_respected():
    M, Z, D, X, Y = _sample()
    _, plan = energy_optimizer(M, Z, D, X, Y)
    level = 0
    for row in plan:
        assert 0 <= row["Battery_Level"] <= M
        assert row["Charged"] <= Z
        assert row["Discharged"] <= Z
        assert row["Bought"] >= 0 and row["Sold"] >= 0
        # battery bookkeeping is consistent
        level += row["Charged"] - row["Discharged"]
        assert level == row["Battery_Level"]


def test_optimizer_beats_or_matches_naive_no_battery():
    """With a battery available, the bill must not exceed the no-battery bill."""
    M, Z, D, X, Y = _sample()
    naive = sum((d - x) * y for d, x, y in zip(D, X, Y))
    bill, _ = energy_optimizer(M, Z, D, X, Y)
    assert bill <= naive + 1e-9


def test_zero_battery_matches_naive():
    M, Z = 0, 0
    D = [1] * 24
    X = [0] * 24
    Y = [2] * 24
    bill, plan = energy_optimizer(M, Z, D, X, Y)
    assert bill == sum((d - x) * y for d, x, y in zip(D, X, Y))
    assert all(row["Charged"] == 0 and row["Discharged"] == 0 for row in plan)


def test_surplus_solar_can_be_sold():
    """When solar exceeds demand and prices are positive, optimizer sells surplus."""
    M, Z = 5, 5
    D = [0] * 24
    X = [10] * 24
    Y = [1] * 24
    bill, plan = energy_optimizer(M, Z, D, X, Y)
    assert bill < 0  # net revenue from selling
    assert sum(row["Sold"] for row in plan) > 0


def test_api_optimize_endpoint():
    M, Z, D, X, Y = _sample()
    resp = client.post("/api/optimize", json={"M": M, "Z": Z, "D": D, "X": X, "Y": Y})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert len(data["schedule"]) == 24
    assert math.isfinite(data["total_cost"])
    row = data["schedule"][0]
    for key in ("hour", "demand", "solar", "price", "B_bought", "B_sold",
                "B_charged", "B_discharged", "SOC"):
        assert key in row


def test_api_rejects_bad_payload():
    resp = client.post("/api/optimize", json={"M": 10})
    assert resp.status_code == 422
