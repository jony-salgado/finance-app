from unittest.mock import MagicMock
from fastapi.testclient import TestClient


def test_list_transactions(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test listing all transactions via the GET endpoint.
    """
    mock_data = [
        {
            "id": "txn-1",
            "description": "Restaurante",
            "amount": 45.90,
            "type": "expense",
            "date": "2026-06-01",
            "category_id": "cat-1",
            "account_id": "acc-123",
        }
    ]
    mock_supabase.table(
        "transactions"
    ).select.return_value.execute.return_value.data = mock_data

    response = client.get("/api/transactions/")
    assert response.status_code == 200
    res_json = response.json()
    assert len(res_json) == 1
    assert res_json[0]["id"] == "txn-1"
    assert res_json[0]["category"] == "cat-1"
    assert res_json[0]["account"] == "acc-123"


def test_list_transactions_with_filter(
    client: TestClient, mock_supabase: MagicMock
) -> None:
    """
    Test listing transactions filtered by month.
    """
    mock_supabase.table(
        "transactions"
    ).select.return_value.or_.return_value.execute.return_value.data = []

    response = client.get("/api/transactions/?month=2026-06")
    assert response.status_code == 200
    mock_supabase.table("transactions").select.return_value.or_.assert_called_with(
        "reference_month.eq.2026-06,date.ilike.2026-06%"
    )


def test_create_transaction(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test creating a transaction via the POST endpoint.
    """
    new_txn = {
        "description": "Salário",
        "amount": 5000.0,
        "type": "income",
        "date": "2026-06-01",
        "account": "acc-123",
    }
    mock_data = [
        {
            "id": "txn-2",
            "description": "Salário",
            "amount": 5000.0,
            "type": "income",
            "date": "2026-06-01",
            "account_id": "acc-123",
        }
    ]
    mock_supabase.table(
        "transactions"
    ).insert.return_value.execute.return_value.data = mock_data

    response = client.post("/api/transactions/", json=new_txn)
    assert response.status_code == 200
    assert response.json()["description"] == "Salário"


def test_update_transaction(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test updating a transaction via the PUT endpoint.
    """
    txn_id = "txn-1"
    updated_txn = {
        "description": "Almoço de Negócios",
        "amount": 80.0,
        "type": "expense",
        "date": "2026-06-01",
        "account": "acc-123",
    }
    mock_data = [
        {
            "id": txn_id,
            "description": "Almoço de Negócios",
            "amount": 80.0,
            "type": "expense",
            "date": "2026-06-01",
            "account_id": "acc-123",
        }
    ]
    mock_supabase.table(
        "transactions"
    ).update.return_value.eq.return_value.execute.return_value.data = mock_data

    response = client.put(f"/api/transactions/{txn_id}", json=updated_txn)
    assert response.status_code == 200
    assert response.json()["description"] == "Almoço de Negócios"


def test_delete_transaction(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test deleting a transaction via the DELETE endpoint.
    """
    txn_id = "txn-1"
    mock_supabase.table(
        "transactions"
    ).delete.return_value.eq.return_value.execute.return_value.data = [{"id": txn_id}]

    response = client.delete(f"/api/transactions/{txn_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Transaction removed successfully"
