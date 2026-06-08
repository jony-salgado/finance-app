import io
from unittest.mock import MagicMock
from fastapi.testclient import TestClient


def test_create_asset(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test creating a new asset.
    """
    new_asset = {"name": "FGTS", "type": "manual"}
    mock_data = [
        {
            "id": "asset-123",
            "user_id": "00000000-0000-0000-0000-000000000000",
            "name": "FGTS",
            "type": "manual",
            "created_at": "2026-06-08T00:00:00Z",
        }
    ]
    mock_supabase.table("assets").insert.return_value.execute.return_value.data = (
        mock_data
    )

    response = client.post("/api/assets/", json=new_asset)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["id"] == "asset-123"
    assert res_json["name"] == "FGTS"
    assert res_json["type"] == "manual"


def test_upsert_manual_balance(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test upserting a manual balance.
    """
    balance_payload = {"balance": 150000.0, "referenceDate": "2026-06-08"}

    # Mock asset check to verify it belongs to user
    mock_supabase.table(
        "assets"
    ).select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "asset-123"}
    ]

    # Mock upsert response
    mock_upsert_data = [
        {
            "id": "history-1",
            "asset_id": "asset-123",
            "balance": 150000.0,
            "reference_date": "2026-06-08",
        }
    ]
    mock_supabase.table(
        "asset_balances_history"
    ).upsert.return_value.execute.return_value.data = mock_upsert_data

    response = client.post("/api/assets/asset-123/manual-balance", json=balance_payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["asset_id"] == "asset-123"
    assert res_json["balance"] == 150000.0
    assert res_json["reference_date"] == "2026-06-08"


def test_get_assets_summary(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test retrieving assets summary (combining assets, items for XP, and latest history balance for others).
    """
    # 1. Mock assets list (1 XP and 1 manual)
    mock_assets = [
        {"id": "asset-xp", "name": "XP Investimentos", "type": "xp"},
        {"id": "asset-fgts", "name": "FGTS", "type": "manual"},
    ]
    mock_supabase.table(
        "assets"
    ).select.return_value.eq.return_value.execute.return_value.data = mock_assets

    # 2. Mock items list (only for XP asset)
    mock_items = [
        {
            "id": "item-1",
            "asset_id": "asset-xp",
            "name": "PETR4",
            "quantity": 100.0,
            "unit_price": 35.5,
            "total_value": 3550.0,
            "category": "Ações",
            "created_at": "2026-06-08T00:00:00Z",
            "updated_at": "2026-06-08T00:00:00Z",
        }
    ]

    mock_in_items = MagicMock()
    mock_supabase.table("asset_items").select.return_value.in_ = mock_in_items
    mock_in_items.return_value.execute.return_value.data = mock_items

    # 3. Mock balance history (both assets have history, manual asset has multiple to verify latest is selected)
    mock_balances = [
        {
            "id": "b-fgts-new",
            "asset_id": "asset-fgts",
            "balance": 15000.0,
            "reference_date": "2026-06-08",
        },
        {
            "id": "b-fgts-old",
            "asset_id": "asset-fgts",
            "balance": 14000.0,
            "reference_date": "2026-06-01",
        },
        {
            "id": "b-xp",
            "asset_id": "asset-xp",
            "balance": 3500.0,
            "reference_date": "2026-06-08",
        },
    ]

    mock_order = MagicMock()
    mock_supabase.table(
        "asset_balances_history"
    ).select.return_value.eq.return_value.order = mock_order
    mock_order.return_value.execute.return_value.data = mock_balances

    response = client.get("/api/assets/summary")
    assert response.status_code == 200
    res_json = response.json()
    assert len(res_json) == 2

    # Check XP asset
    xp_summary = next(a for a in res_json if a["id"] == "asset-xp")
    assert xp_summary["name"] == "XP Investimentos"
    assert (
        xp_summary["balance"] == 3550.0
    )  # Sum of items (3550.0) overrides history (3500.0)
    assert len(xp_summary["items"]) == 1
    assert xp_summary["items"][0]["name"] == "PETR4"

    # Check manual asset
    fgts_summary = next(a for a in res_json if a["id"] == "asset-fgts")
    assert fgts_summary["name"] == "FGTS"
    assert (
        fgts_summary["balance"] == 15000.0
    )  # Picks latest balance (2026-06-08 is newer than 2026-06-01)
    assert fgts_summary["items"] is None


def test_import_xp_csv(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test importing XP CSV file.
    """
    csv_content = """Posição de Ativos
Cliente: Jony Salgado
Data: 08/06/2026

Produto,Quantidade,Preço Unitário,Valor Bruto,Categoria
PETR4,100,"R$ 35,50","R$ 3.550,00",Ações
VALE3,50,"R$ 60,00","R$ 3.000,00",Ações
Total,150,,6550.00,
"""
    # 1. Mock asset check or search (return an existing XP asset)
    mock_supabase.table(
        "assets"
    ).select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": "asset-xp",
            "user_id": "00000000-0000-0000-0000-000000000000",
            "name": "XP Investimentos",
            "type": "xp",
        }
    ]

    # 2. Mock items delete
    mock_supabase.table(
        "asset_items"
    ).delete.return_value.eq.return_value.execute.return_value.data = []

    # 3. Mock items insert
    mock_supabase.table("asset_items").insert.return_value.execute.return_value.data = (
        []
    )

    # 4. Mock balances history upsert
    mock_supabase.table(
        "asset_balances_history"
    ).upsert.return_value.execute.return_value.data = []

    file_payload = {"file": ("xp.csv", csv_content, "text/csv")}
    response = client.post("/api/assets/import-xp", files=file_payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["asset_id"] == "asset-xp"
    assert res_json["total_value"] == 6550.0
    assert res_json["items_count"] == 2
