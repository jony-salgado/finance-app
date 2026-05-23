from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from ...schemas.schemas import Account, AccountCreate
from ...db.session import db_accounts

router = APIRouter()

@router.get("/", response_model=List[Account])
def list_accounts():
    return db_accounts

@router.post("/", response_model=Account)
def create_account(account: AccountCreate):
    new_account = Account(id=str(uuid.uuid4()), **account.model_dump())
    db_accounts.append(new_account)
    return new_account
