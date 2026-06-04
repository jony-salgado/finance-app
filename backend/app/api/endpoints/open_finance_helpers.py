from typing import Optional, List
import datetime
import requests
from ...db.supabase_client import supabase
from ...core.constants import *


def map_pluggy_account_type(p_account) -> str:
    """
    Map Pluggy types to our local schema types ('checking', 'credit_card', 'investment')
    """
    p_local_type = ACCOUNT_TYPE_CHECKING
    if (
        p_account.type == PLUGGY_TYPE_CREDIT
        or getattr(p_account, "subtype", None) == PLUGGY_SUBTYPE_CREDIT_CARD
    ):
        p_local_type = ACCOUNT_TYPE_CREDIT_CARD
    elif (
        p_account.type == PLUGGY_TYPE_INVESTMENT
        or getattr(p_account, "subtype", None) == PLUGGY_SUBTYPE_INVESTMENT_ACCOUNT
    ):
        p_local_type = ACCOUNT_TYPE_INVESTMENT
    return p_local_type


def match_credit_card_by_digits(
    p_account, existing_accounts: List[dict], matched_ids: set, local_type: str
) -> Optional[dict]:
    """
    1. If it is a credit card, match by last digits
    """
    if local_type != ACCOUNT_TYPE_CREDIT_CARD:
        return None
    last_digits = p_account.number[-4:] if p_account.number else ""
    if not last_digits:
        return None
    for acc in existing_accounts:
        if acc["id"] in matched_ids:
            continue
        if (
            acc.get("type") == ACCOUNT_TYPE_CREDIT_CARD
            and acc.get("card_last_digits") == last_digits
        ):
            return acc
    return None


def match_by_provider_id(
    p_account, existing_accounts: List[dict], matched_ids: set
) -> Optional[dict]:
    """
    2. Match by exact provider_account_id
    """
    for acc in existing_accounts:
        if acc["id"] in matched_ids:
            continue
        if acc.get("provider_account_id") == p_account.id:
            return acc
    return None


def match_by_name_similarity(
    p_account, existing_accounts: List[dict], matched_ids: set, local_type: str
) -> Optional[dict]:
    """
    3. Match by name similarity or brand keywords
    """
    p_name_norm = p_account.name.lower()
    for acc in existing_accounts:
        if acc["id"] in matched_ids:
            continue
        acc_name_norm = acc.get("name", "").lower()
        if acc_name_norm == p_name_norm:
            if acc.get("type") == local_type:
                return acc

        # Brand keywords matching
        for brand in SUPPORTED_BRANDS:
            if brand in acc_name_norm and (
                brand in p_name_norm
                or (brand == BRAND_NUBANK and BRAND_NU_PAGAMENTOS in p_name_norm)
            ):
                if acc.get("type") == local_type:
                    return acc
    return None


def find_matching_account(
    p_account, existing_accounts: List[dict], matched_ids: Optional[set] = None
) -> Optional[dict]:
    """
    Finds a matching account in the list of existing accounts from Supabase.
    """
    if matched_ids is None:
        matched_ids = set()

    local_type = map_pluggy_account_type(p_account)

    # 1. Match credit card by last digits
    matched = match_credit_card_by_digits(
        p_account, existing_accounts, matched_ids, local_type
    )
    if matched:
        return matched

    # 2. Match by exact provider_account_id
    matched = match_by_provider_id(p_account, existing_accounts, matched_ids)
    if matched:
        return matched

    # 3. Match by name similarity
    matched = match_by_name_similarity(
        p_account, existing_accounts, matched_ids, local_type
    )
    if matched:
        return matched

    return None


def generate_unique_account_name(
    p_account, local_type: str, all_existing_accounts: List[dict]
) -> str:
    """
    Generates a unique name for the new account, appending suffix if name exists
    """
    base_name = p_account.name
    if (
        local_type == ACCOUNT_TYPE_CREDIT_CARD
        and KEYWORD_CREDITO not in base_name.lower()
        and KEYWORD_CARTAO not in base_name.lower()
    ):
        base_name = f"{base_name} {SUFFIX_CREDITO}"
    elif (
        local_type == ACCOUNT_TYPE_CHECKING
        and KEYWORD_CORRENTE not in base_name.lower()
        and KEYWORD_CONTA not in base_name.lower()
    ):
        base_name = f"{base_name} {SUFFIX_CORRENTE}"
    elif (
        local_type == ACCOUNT_TYPE_INVESTMENT
        and KEYWORD_INVESTIMENTO not in base_name.lower()
    ):
        base_name = f"{base_name} {SUFFIX_INVESTIMENTO}"

    # Check if this name already exists in the database
    name_exists = any(
        acc["name"].lower() == base_name.lower() for acc in all_existing_accounts
    )
    if name_exists:
        digits = (
            "".join(c for c in p_account.number if c.isdigit())
            if p_account.number
            else ""
        )
        last_digits = digits[-4:] if digits else ""
        if last_digits:
            base_name = f"{base_name} ({last_digits})"
        else:
            base_name = f"{base_name} (2)"
    return base_name


def extract_credit_card_due_day(p_account) -> int:
    """
    Extracts the due day of a credit card account from Pluggy account data
    """
    due_day = DEFAULT_DUE_DAY
    credit_data = getattr(p_account, "credit_data", None)
    if credit_data:
        due_date = getattr(credit_data, "balance_due_date", None)
        if due_date:
            try:
                if hasattr(due_date, "day"):
                    due_day = due_date.day
                elif isinstance(due_date, str):
                    due_day = int(due_date.split(" ")[0].split("-")[2])
            except Exception:
                due_day = DEFAULT_DUE_DAY
    return due_day


def prepare_existing_account_data(
    p_account, existing_record: dict, local_type: str, item_id: str
) -> dict:
    """
    Prepares account data dictionary for an existing account matching in Supabase
    """
    account_data = {
        "id": existing_record["id"],
        "name": existing_record["name"],
        "type": existing_record["type"],
        "initial_balance": float(p_account.balance),
        "provider_id": PROVIDER_ID_PLUGGY,
        "provider_account_id": p_account.id,
        "provider_item_id": item_id,
    }
    if local_type == ACCOUNT_TYPE_CREDIT_CARD:
        if not existing_record.get("card_last_digits"):
            account_data["card_last_digits"] = (
                p_account.number[-4:] if p_account.number else DEFAULT_CARD_LAST_DIGITS
            )
        if not existing_record.get("card_color"):
            account_data["card_color"] = DEFAULT_CARD_COLOR
    return account_data


def prepare_new_account_data(
    p_account, all_existing_accounts: List[dict], local_type: str, item_id: str
) -> dict:
    """
    Prepares account data dictionary for a new account to be created in Supabase
    """
    base_name = generate_unique_account_name(
        p_account, local_type, all_existing_accounts
    )

    account_data = {
        "name": base_name,
        "type": local_type,
        "initial_balance": float(p_account.balance),
        "provider_id": PROVIDER_ID_PLUGGY,
        "provider_account_id": p_account.id,
        "provider_item_id": item_id,
    }
    if local_type == ACCOUNT_TYPE_CREDIT_CARD:
        due_day = extract_credit_card_due_day(p_account)
        account_data["due_day"] = due_day
        account_data["closing_day"] = (
            due_day - DEFAULT_CLOSING_DAY_OFFSET
            if due_day > DEFAULT_CLOSING_DAY_OFFSET
            else DEFAULT_CLOSING_DAY_FALLBACK
        )
        account_data["card_last_digits"] = (
            p_account.number[-4:] if p_account.number else DEFAULT_CARD_LAST_DIGITS
        )
        account_data["card_color"] = DEFAULT_CARD_COLOR
    return account_data


def map_pluggy_txn_dict_to_db(p_txn: dict, internal_account_id: str) -> dict:
    """
    Maps a Pluggy transaction dictionary (from REST API) to the local database format
    """
    is_debit = p_txn.get("type") == PLUGGY_TXN_TYPE_DEBIT
    return {
        "description": p_txn["description"],
        "amount": abs(float(p_txn["amount"])),
        "type": TRANSACTION_TYPE_EXPENSE if is_debit else TRANSACTION_TYPE_INCOME,
        "date": str(p_txn["date"])[:10],
        "account_id": internal_account_id,
        "provider_transaction_id": p_txn["id"],
    }


def map_pluggy_txn_webhook_to_db(txn, internal_account_id: str) -> dict:
    """
    Maps a Pluggy webhook transaction object (Pydantic model) to the local database format
    """
    is_debit = txn.type == PLUGGY_TXN_TYPE_DEBIT if txn.type else txn.amount < 0
    return {
        "description": txn.description,
        "amount": abs(float(txn.amount)),
        "type": TRANSACTION_TYPE_EXPENSE if is_debit else TRANSACTION_TYPE_INCOME,
        "date": txn.date.isoformat(),
        "account_id": internal_account_id,
        "provider_transaction_id": txn.id,
    }


def fetch_pluggy_transactions(
    account_id: str, from_date: datetime.datetime, api_key: str
) -> list:
    """
    Fetches transactions from Pluggy API using X-API-KEY header
    """
    url = PLUGGY_TRANSACTIONS_URL
    headers = {"accept": "application/json", "X-API-KEY": api_key}
    params = {"accountId": account_id, "from": from_date.strftime("%Y-%m-%d")}

    try:
        res = requests.get(url, headers=headers, params=params)
        if res.status_code != 200:
            print(
                f"Error fetching transactions from Pluggy API: {res.status_code} {res.text}"
            )
            return []
        data = res.json()
        return data.get("results", [])
    except Exception as e:
        print(f"Failed to fetch transactions from Pluggy: {e}")
        return []


def sync_single_account(
    p_account, all_existing_accounts: List[dict], matched_ids: set, item_id: str
) -> Optional[dict]:
    """
    Syncs a single account to Supabase, matching it if it exists or creating a new record if it doesn't.
    Updates the matched_ids set in place.
    Returns a dict with internal_account_id, account_name, and is_new boolean, or None if creation failed.
    """
    existing_record = find_matching_account(
        p_account, all_existing_accounts, matched_ids
    )
    local_type = map_pluggy_account_type(p_account)
    is_new = False

    if existing_record:
        matched_ids.add(existing_record["id"])
        account_data = prepare_existing_account_data(
            p_account, existing_record, local_type, item_id
        )
        account_name = existing_record["name"]
    else:
        is_new = True
        account_data = prepare_new_account_data(
            p_account, all_existing_accounts, local_type, item_id
        )
        account_name = p_account.name

    res = supabase.table("accounts").upsert(account_data).execute()
    if not res.data:
        return None

    return {
        "internal_account_id": res.data[0]["id"],
        "account_name": account_name,
        "is_new": is_new,
    }


def sync_single_account_transactions(
    p_account_id: str,
    internal_account_id: str,
    from_date: datetime.datetime,
    api_key: str,
) -> int:
    """
    Fetches Pluggy transactions for an account from the last 30 days and syncs them to Supabase.
    Returns the number of new transactions added.
    """
    results = fetch_pluggy_transactions(p_account_id, from_date, api_key)
    transactions_added = 0

    for p_txn in results:
        # Check if transaction already exists by provider_transaction_id
        txn_exist = (
            supabase.table("transactions")
            .select("id")
            .eq("provider_transaction_id", p_txn["id"])
            .execute()
        )

        if not txn_exist.data:
            txn_data = map_pluggy_txn_dict_to_db(p_txn, internal_account_id)
            # Upsert transaction
            supabase.table("transactions").upsert(
                txn_data, on_conflict="provider_transaction_id"
            ).execute()
            transactions_added += 1

    return transactions_added


def process_webhook_transaction(txn) -> bool:
    """
    Processes a transaction received via Open Finance webhook and inserts/updates it in Supabase.
    Returns True if processed successfully, False otherwise.
    """
    res = (
        supabase.table("accounts")
        .select("id")
        .eq("provider_account_id", txn.account_id)
        .execute()
    )

    if not res.data:
        return False

    internal_account_id = res.data[0]["id"]
    txn_data = map_pluggy_txn_webhook_to_db(txn, internal_account_id)

    supabase.table("transactions").upsert(
        txn_data, on_conflict="provider_transaction_id"
    ).execute()
    return True
