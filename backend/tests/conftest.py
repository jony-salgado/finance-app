import pytest
from unittest.mock import MagicMock, patch
from typing import Generator, Any
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def mock_supabase() -> Generator[MagicMock, None, None]:
    """
    Fixture to mock all supabase database calls across all endpoints,
    isolating mocked tables to prevent cross-contamination.
    """
    # Create the single mock client for this test
    mock_client = MagicMock()
    table_mocks = {}

    def get_table_mock(table_name: str) -> MagicMock:
        if table_name not in table_mocks:
            mock_table = MagicMock()

            # Mock query operations
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select

            mock_insert = MagicMock()
            mock_table.insert.return_value = mock_insert

            mock_update = MagicMock()
            mock_table.update.return_value = mock_update

            mock_delete = MagicMock()
            mock_table.delete.return_value = mock_delete

            mock_upsert = MagicMock()
            mock_table.upsert.return_value = mock_upsert

            # execute mock
            mock_execute = MagicMock()
            mock_select.execute.return_value = mock_execute
            mock_insert.execute.return_value = mock_execute
            mock_upsert.execute.return_value = mock_execute

            # filters
            mock_update_eq = MagicMock()
            mock_table.update.return_value.eq.return_value = mock_update_eq
            mock_update_eq.execute.return_value = mock_execute

            mock_delete_eq = MagicMock()
            mock_table.delete.return_value.eq.return_value = mock_delete_eq
            mock_delete_eq.execute.return_value = mock_execute

            mock_or = MagicMock()
            mock_select.or_.return_value = mock_or
            mock_or.execute.return_value = mock_execute

            mock_execute.data = []
            table_mocks[table_name] = mock_table

        return table_mocks[table_name]

    mock_client.table.side_effect = get_table_mock

    # Patch the module-level imports in all endpoints
    with patch("app.api.endpoints.accounts.supabase", mock_client), patch(
        "app.api.endpoints.categories.supabase", mock_client
    ), patch("app.api.endpoints.transactions.supabase", mock_client), patch(
        "app.api.endpoints.open_finance.supabase", mock_client
    ), patch(
        "app.api.endpoints.open_finance_helpers.supabase", mock_client
    ), patch(
        "app.api.endpoints.weekly_goals.supabase", mock_client
    ):
        yield mock_client


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """
    Fixture providing a TestClient for testing the FastAPI application endpoints.
    """
    from app.main import app
    from app.core.security import get_current_user_email

    # Override the security dependency to return a whitelisted email during tests
    app.dependency_overrides[get_current_user_email] = (
        lambda: "jony.salgado@example.com"
    )

    with TestClient(app) as test_client:
        yield test_client

    # Clear dependency overrides after tests finish
    app.dependency_overrides.clear()
