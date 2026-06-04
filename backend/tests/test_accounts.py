from unittest.mock import MagicMock
from fastapi.testclient import TestClient


def test_list_accounts(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test listing all accounts via the GET endpoint.
    """
    mock_data = [
        {
            "id": "acc-123",
            "name": "Nubank Corrente",
            "type": "checking",
            "initial_balance": 1500.0,
        }
    ]
    mock_supabase.table("accounts").select.return_value.execute.return_value.data = (
        mock_data
    )

    response = client.get("/api/accounts/")
    assert response.status_code == 200
    res_json = response.json()
    assert len(res_json) == 1
    assert res_json[0]["id"] == "acc-123"
    assert res_json[0]["name"] == "Nubank Corrente"
    assert res_json[0]["type"] == "checking"
    assert res_json[0]["initialBalance"] == 1500.0


def test_create_account(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test creating an account via the POST endpoint.
    """
    new_account = {
        "name": "XP Investimentos",
        "type": "investment",
        "initialBalance": 5000.0,
    }
    mock_data = [
        {
            "id": "acc-456",
            "name": "XP Investimentos",
            "type": "investment",
            "initial_balance": 5000.0,
        }
    ]
    mock_supabase.table("accounts").insert.return_value.execute.return_value.data = (
        mock_data
    )

    response = client.post("/api/accounts/", json=new_account)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["id"] == "acc-456"
    assert res_json["name"] == "XP Investimentos"
    assert res_json["initialBalance"] == 5000.0


def test_update_account(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test updating an account via the PUT endpoint.
    """
    account_id = "acc-123"
    updated_account = {
        "name": "Nubank Gold",
        "type": "credit_card",
        "initialBalance": 0.0,
    }
    mock_data = [
        {
            "id": account_id,
            "name": "Nubank Gold",
            "type": "credit_card",
            "initial_balance": 0.0,
        }
    ]
    mock_supabase.table(
        "accounts"
    ).update.return_value.eq.return_value.execute.return_value.data = mock_data

    response = client.put(f"/api/accounts/{account_id}", json=updated_account)
    assert response.status_code == 200
    assert response.json()["name"] == "Nubank Gold"


def test_delete_account(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test deleting an account via the DELETE endpoint.
    """
    account_id = "acc-123"
    mock_supabase.table(
        "accounts"
    ).delete.return_value.eq.return_value.execute.return_value.data = [
        {"id": account_id}
    ]

    response = client.delete(f"/api/accounts/{account_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Account removed successfully"
