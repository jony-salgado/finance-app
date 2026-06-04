from unittest.mock import MagicMock, patch
from typing import Any, Optional
from fastapi.testclient import TestClient
from app.api.endpoints.open_finance_helpers import (
    map_pluggy_account_type,
    find_matching_account,
    generate_unique_account_name,
    extract_credit_card_due_day,
    map_pluggy_txn_dict_to_db,
)
from app.core.constants import (
    ACCOUNT_TYPE_CHECKING,
    ACCOUNT_TYPE_CREDIT_CARD,
    ACCOUNT_TYPE_INVESTMENT,
    TRANSACTION_TYPE_EXPENSE,
)


class MockPluggyAccount:
    """
    Mock class representing a Pluggy API account object for testing mapping and matching algorithms.
    """

    def __init__(
        self,
        id: str,
        name: str,
        type: str,
        balance: float,
        number: str = "",
        subtype: Optional[str] = None,
        credit_data: Any = None,
    ) -> None:
        self.id = id
        self.name = name
        self.type = type
        self.balance = balance
        self.number = number
        self.subtype = subtype
        self.credit_data = credit_data


def test_map_pluggy_account_type() -> None:
    """
    Test mapping Pluggy account types to local db schema types.
    """
    checking_acc = MockPluggyAccount("1", "Checking Account", "CHECKING", 100.0)
    assert map_pluggy_account_type(checking_acc) == ACCOUNT_TYPE_CHECKING

    credit_acc = MockPluggyAccount("2", "Credit Account", "CREDIT", 0.0)
    assert map_pluggy_account_type(credit_acc) == ACCOUNT_TYPE_CREDIT_CARD

    invest_acc = MockPluggyAccount("3", "Investment Account", "INVESTMENT", 500.0)
    assert map_pluggy_account_type(invest_acc) == ACCOUNT_TYPE_INVESTMENT


def test_find_matching_account_by_digits() -> None:
    """
    Test finding a matching account using the last card digits.
    """
    p_account = MockPluggyAccount("1", "Nu Conta", "CREDIT", 0.0, number="123456781234")
    existing_accounts = [
        {
            "id": "acc-1",
            "name": "Nubank",
            "type": "credit_card",
            "card_last_digits": "1234",
        },
        {"id": "acc-2", "name": "Itau", "type": "checking"},
    ]

    matched = find_matching_account(p_account, existing_accounts)
    assert matched is not None
    assert matched["id"] == "acc-1"


def test_find_matching_account_by_provider_id() -> None:
    """
    Test finding a matching account using the provider_account_id.
    """
    p_account = MockPluggyAccount(
        "pluggy-id-99", "XP Investimentos", "INVESTMENT", 1000.0
    )
    existing_accounts = [
        {
            "id": "acc-1",
            "name": "XP",
            "type": "investment",
            "provider_account_id": "pluggy-id-99",
        }
    ]

    matched = find_matching_account(p_account, existing_accounts)
    assert matched is not None
    assert matched["id"] == "acc-1"


def test_generate_unique_account_name() -> None:
    """
    Test generating unique, friendly names for new accounts.
    """
    p_account = MockPluggyAccount("1", "Nubank", "CREDIT", 0.0)
    existing_accounts = []

    # 1. New name should append suffix if missing
    new_name = generate_unique_account_name(
        p_account, ACCOUNT_TYPE_CREDIT_CARD, existing_accounts
    )
    assert new_name == "Nubank Crédito"

    # 2. Existing name conflict should append a suffix
    existing_accounts = [{"name": "Nubank Crédito"}]
    new_name = generate_unique_account_name(
        p_account, ACCOUNT_TYPE_CREDIT_CARD, existing_accounts
    )
    assert new_name == "Nubank Crédito (2)"


def test_extract_credit_card_due_day() -> None:
    """
    Test extracting due day from credit data.
    """

    class MockCreditData:
        balance_due_date = "2026-06-15 00:00:00"

    p_account = MockPluggyAccount(
        "1", "Card", "CREDIT", 0.0, credit_data=MockCreditData()
    )
    due_day = extract_credit_card_due_day(p_account)
    assert due_day == 15


def test_map_pluggy_txn_dict_to_db() -> None:
    """
    Test mapping Pluggy transaction dictionary structure to DB format.
    """
    p_txn = {
        "id": "txn-pluggy-1",
        "description": "Starbucks",
        "amount": 25.50,
        "type": "DEBIT",
        "date": "2026-06-01T12:00:00Z",
    }

    db_txn = map_pluggy_txn_dict_to_db(p_txn, "acc-internal-123")
    assert db_txn["description"] == "Starbucks"
    assert db_txn["amount"] == 25.50
    assert db_txn["type"] == TRANSACTION_TYPE_EXPENSE
    assert db_txn["date"] == "2026-06-01"
    assert db_txn["account_id"] == "acc-internal-123"
    assert db_txn["provider_transaction_id"] == "txn-pluggy-1"


def test_link_token_endpoint(client: TestClient) -> None:
    """
    Test link-token FastAPI endpoint under mocks.
    """
    with patch("app.api.endpoints.open_finance.pluggy_mgr") as mock_mgr:
        mock_client = MagicMock()
        mock_mgr.get_api_client.return_value = mock_client
        mock_auth = MagicMock()
        mock_auth.connect_token_create.return_value.access_token = "token-123"

        with patch("app.api.endpoints.open_finance.AuthApi", return_value=mock_auth):
            response = client.post("/api/open-finance/link-token")
            assert response.status_code == 200
            assert response.json()["linkToken"] == "token-123"


def test_webhook_endpoint(client: TestClient, mock_supabase: MagicMock) -> None:
    """
    Test Webhook FastAPI endpoint.
    """
    payload = {
        "event": "transaction/created",
        "transaction": {
            "id": "txn-webhook-99",
            "description": "Supermercado",
            "amount": 120.0,
            "date": "2026-06-01",
            "accountId": "pluggy-acc-abc",
            "type": "DEBIT",
        },
    }

    # Mock finding the account ID
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "acc-internal-abc"}
    ]

    response = client.post("/api/open-finance/webhook", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    mock_supabase.table.assert_any_call("accounts")
    mock_supabase.table.assert_any_call("transactions")
