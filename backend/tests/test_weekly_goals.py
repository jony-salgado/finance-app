from unittest.mock import MagicMock
from fastapi.testclient import TestClient


def test_list_weekly_goals(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test listing all weekly goals via the GET endpoint.
    """
    mock_data = [
        {
            "id": "goal-1",
            "week_start_date": "2026-06-08",
            "amount": 1000.0,
        }
    ]
    mock_supabase.table(
        "weekly_goals"
    ).select.return_value.execute.return_value.data = mock_data

    response = client.get("/api/weekly-goals/")
    assert response.status_code == 200
    res_json = response.json()
    assert len(res_json) == 1
    assert res_json[0]["id"] == "goal-1"
    assert res_json[0]["weekStartDate"] == "2026-06-08"
    assert res_json[0]["amount"] == 1000.0


def test_create_weekly_goal(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test creating a weekly goal via the POST endpoint.
    """
    new_goal = {
        "weekStartDate": "2026-06-15",
        "amount": 1200.0,
    }
    mock_data = [
        {
            "id": "goal-2",
            "week_start_date": "2026-06-15",
            "amount": 1200.0,
        }
    ]
    mock_supabase.table(
        "weekly_goals"
    ).insert.return_value.execute.return_value.data = mock_data

    response = client.post("/api/weekly-goals/", json=new_goal)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["id"] == "goal-2"
    assert res_json["weekStartDate"] == "2026-06-15"
    assert res_json["amount"] == 1200.0


def test_update_weekly_goal(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test updating a weekly goal via the PUT endpoint.
    """
    goal_id = "goal-1"
    updated_goal = {
        "weekStartDate": "2026-06-08",
        "amount": 1500.0,
    }
    mock_data = [
        {
            "id": goal_id,
            "week_start_date": "2026-06-08",
            "amount": 1500.0,
        }
    ]
    mock_supabase.table(
        "weekly_goals"
    ).update.return_value.eq.return_value.execute.return_value.data = mock_data

    response = client.put(f"/api/weekly-goals/{goal_id}", json=updated_goal)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["id"] == goal_id
    assert res_json["amount"] == 1500.0


def test_delete_weekly_goal(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test deleting a weekly goal via the DELETE endpoint.
    """
    goal_id = "goal-1"
    mock_supabase.table(
        "weekly_goals"
    ).delete.return_value.eq.return_value.execute.return_value.data = [{"id": goal_id}]

    response = client.delete(f"/api/weekly-goals/{goal_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Weekly goal removed successfully"
