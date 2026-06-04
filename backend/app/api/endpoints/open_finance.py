from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from pluggy_sdk import ApiClient, Configuration, AuthApi, AccountApi, TransactionApi
from pluggy_sdk.models import AuthRequest
import os
import datetime
import asyncio
from dotenv import load_dotenv
from ...schemas.schemas import OpenFinanceLinkTokenResponse, OpenFinanceWebhookPayload
from ...db.supabase_client import supabase
from .open_finance_helpers import (
    sync_single_account,
    sync_single_account_transactions,
    process_webhook_transaction,
)
from ...core.constants import PLUGGY_API_HOST, PROVIDER_ID_PLUGGY

# Load environment variables
load_dotenv()

router = APIRouter()

# Initialize Pluggy Config
PLUGGY_CLIENT_ID = os.getenv("PLUGGY_CLIENT_ID")
PLUGGY_CLIENT_SECRET = os.getenv("PLUGGY_CLIENT_SECRET")


class PluggyManager:
    """
    Helper class to manage Pluggy API interactions using the official SDK pattern.
    """

    config: Configuration
    api_client: ApiClient
    _api_key: Optional[str]

    def __init__(self) -> None:
        """
        Initialize the Pluggy Configuration and ApiClient.
        """
        self.config = Configuration(host=PLUGGY_API_HOST)
        self.api_client = ApiClient(self.config)
        self._api_key = None

    def _authenticate(self) -> bool:
        """
        Authenticates against the Pluggy API using Client ID and Secret from environment.
        Sets the API Key in configuration and returns True if successful, False otherwise.
        """
        # Always check if we have the credentials
        cid = os.getenv("PLUGGY_CLIENT_ID")
        cs = os.getenv("PLUGGY_CLIENT_SECRET")

        if not cid or not cs:
            print("Pluggy credentials missing in environment.")
            return False

        try:
            auth_api = AuthApi(self.api_client)
            auth_req = AuthRequest(clientId=cid, clientSecret=cs)
            auth_res = auth_api.auth_create(auth_req)
            self._api_key = auth_res.api_key
            # The official auto-generated SDK usually expects 'ApiKeyAuth'
            self.api_client.configuration.api_key["ApiKeyAuth"] = self._api_key
            # Set it in default as well just in case
            self.api_client.configuration.api_key["default"] = self._api_key
            return True
        except Exception as e:
            print(f"Pluggy Auth Error: {e}")
            return False

    def get_api_client(self) -> Optional[ApiClient]:
        """
        Returns authenticated Pluggy API client, performing initial/re-authentication as needed.
        """
        # In sandbox, the API Key is short-lived. Re-auth if needed.
        # For simplicity in this demo, we re-auth if _api_key is None
        if not self._api_key:
            if not self._authenticate():
                return None
        return self.api_client


# Singleton manager
pluggy_mgr = PluggyManager()


@router.post("/link-token", response_model=OpenFinanceLinkTokenResponse)
async def create_link_token():
    """Generates a real Link Token from Pluggy API"""
    api_client = pluggy_mgr.get_api_client()
    if not api_client:
        raise HTTPException(
            status_code=500,
            detail="Pluggy credentials not found or invalid. Check your .env file.",
        )

    try:
        auth_api = AuthApi(api_client)
        response = auth_api.connect_token_create()
        return {"linkToken": response.access_token}
    except Exception as e:
        print(f"Error calling Pluggy API: {e}")
        # If we get a 403, try to re-authenticate once
        if "403" in str(e):
            pluggy_mgr._api_key = None
            api_client = pluggy_mgr.get_api_client()
            if api_client:
                auth_api = AuthApi(api_client)
                response = auth_api.connect_token_create()
                return {"linkToken": response.access_token}

        raise HTTPException(status_code=500, detail=f"Pluggy API Error: {str(e)}")


async def perform_sync_for_item(item_id: str) -> dict:
    """
    Triggers a synchronous sync of accounts and transactions for a given Pluggy item ID.
    Reused by both the manual HTTP endpoint and the periodic background task.
    """
    api_client = pluggy_mgr.get_api_client()
    if not api_client:
        raise Exception("Pluggy client not configured")

    api_key = pluggy_mgr._api_key
    if not api_key:
        pluggy_mgr.get_api_client()
        api_key = pluggy_mgr._api_key

    account_api = AccountApi(api_client)

    # Calculate last 30 days filter
    from_date = datetime.datetime.now() - datetime.timedelta(days=30)

    # Fetch all existing accounts to perform matching
    existing_res = supabase.table("accounts").select("*").execute()
    all_existing_accounts = existing_res.data if existing_res.data else []

    # 1. Fetch accounts for this item
    accounts = account_api.accounts_list(item_id=item_id)

    transactions_added = 0
    is_new_connection = False
    accounts_synced = []
    matched_ids = set()

    for p_account in accounts.results:
        # Sync the account to Supabase
        sync_res = sync_single_account(
            p_account=p_account,
            all_existing_accounts=all_existing_accounts,
            matched_ids=matched_ids,
            item_id=item_id,
        )
        if not sync_res:
            continue

        internal_account_id = sync_res["internal_account_id"]
        accounts_synced.append(sync_res["account_name"])
        if sync_res["is_new"]:
            is_new_connection = True

        # Sync transactions for this account
        added_count = sync_single_account_transactions(
            p_account_id=p_account.id,
            internal_account_id=internal_account_id,
            from_date=from_date,
            api_key=api_key,
        )
        transactions_added += added_count

    print(
        f"Sync completed successfully for item {item_id}. Added {transactions_added} transactions."
    )
    return {
        "status": "success",
        "is_new": is_new_connection,
        "transactions_added": transactions_added,
        "accounts_synced": accounts_synced,
    }


@router.post("/sync-item/{item_id}")
async def sync_pluggy_item(item_id: str):
    """
    Called after the widget finishes successfully or when updating/refreshing.
    Triggers a synchronous sync of accounts and transactions.
    """
    api_client = pluggy_mgr.get_api_client()
    if not api_client:
        raise HTTPException(status_code=500, detail="Pluggy client not configured")

    try:
        res = await perform_sync_for_item(item_id)
        return res
    except Exception as e:
        print(f"Error during sync for item {item_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def periodic_pluggy_sync():
    """
    Background worker that runs every 5 minutes and updates accounts
    linked with Pluggy.
    """
    print("Starting periodic Pluggy sync background task...")
    # Initial sleep of 10 seconds to allow the app to fully boot up
    await asyncio.sleep(10)

    while True:
        try:
            print("Running periodic Pluggy sync...")
            # Fetch all accounts linked with pluggy
            res = (
                supabase.table("accounts")
                .select("provider_item_id")
                .eq("provider_id", PROVIDER_ID_PLUGGY)
                .execute()
            )
            if res.data:
                # Get unique item ids
                item_ids = {
                    item["provider_item_id"]
                    for item in res.data
                    if item.get("provider_item_id")
                }
                for item_id in item_ids:
                    print(f"Periodic sync starting for item: {item_id}")
                    try:
                        await perform_sync_for_item(item_id)
                        print(f"Periodic sync finished for item: {item_id}")
                    except Exception as e:
                        print(f"Error doing periodic sync for item {item_id}: {e}")
        except Exception as e:
            print(f"Error in periodic_pluggy_sync loop: {e}")

        # Wait for 5 minutes (300 seconds)
        await asyncio.sleep(300)


@router.post("/webhook")
async def open_finance_webhook(payload: OpenFinanceWebhookPayload):
    """Handles incoming webhooks from Pluggy"""
    if payload.event == "transaction/created" and payload.transaction:
        process_webhook_transaction(payload.transaction)
    return {"status": "ok"}
