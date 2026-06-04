from unittest.mock import MagicMock
from fastapi.testclient import TestClient


def test_list_categories(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test listing all categories via the GET endpoint.
    """
    mock_data = [
        {
            "id": "cat-1",
            "name": "Alimentação",
            "icon_name": "Utensils",
            "color": "text-red-600",
            "type": "expense",
        }
    ]
    mock_supabase.table("categories").select.return_value.execute.return_value.data = (
        mock_data
    )

    response = client.get("/api/categories/")
    assert response.status_code == 200
    res_json = response.json()
    assert len(res_json) == 1
    assert res_json[0]["id"] == "cat-1"
    assert res_json[0]["iconName"] == "Utensils"


def test_create_category(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test creating a category via the POST endpoint.
    """
    new_category = {
        "name": "Transporte",
        "iconName": "Car",
        "color": "text-blue-600",
        "type": "expense",
    }
    mock_data = [
        {
            "id": "cat-2",
            "name": "Transporte",
            "icon_name": "Car",
            "color": "text-blue-600",
            "type": "expense",
        }
    ]
    mock_supabase.table("categories").insert.return_value.execute.return_value.data = (
        mock_data
    )

    response = client.post("/api/categories/", json=new_category)
    assert response.status_code == 200
    assert response.json()["name"] == "Transporte"


def test_update_category(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test updating a category via the PUT endpoint.
    """
    category_id = "cat-1"
    updated_category = {
        "name": "Supermercado",
        "iconName": "ShoppingCart",
        "color": "text-green-600",
        "type": "expense",
    }
    mock_data = [
        {
            "id": category_id,
            "name": "Supermercado",
            "icon_name": "ShoppingCart",
            "color": "text-green-600",
            "type": "expense",
        }
    ]
    mock_supabase.table(
        "categories"
    ).update.return_value.eq.return_value.execute.return_value.data = mock_data

    response = client.put(f"/api/categories/{category_id}", json=updated_category)
    assert response.status_code == 200
    assert response.json()["name"] == "Supermercado"


def test_delete_category(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test deleting a category via the DELETE endpoint.
    """
    category_id = "cat-1"
    mock_supabase.table(
        "categories"
    ).delete.return_value.eq.return_value.execute.return_value.data = [
        {"id": category_id}
    ]

    response = client.delete(f"/api/categories/{category_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Category removed successfully"
