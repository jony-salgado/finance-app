from fastapi import APIRouter, HTTPException
from typing import List, Optional
import uuid
from ...schemas.schemas import Transaction, TransactionCreate
from ...db.session import db_transactions

router = APIRouter()

@router.get("/", response_model=List[Transaction])
def list_transactions(month: Optional[str] = None):
    if month:
        return [t for t in db_transactions if str(t.date).startswith(month) or t.referenceMonth == month]
    return db_transactions

@router.post("/", response_model=Transaction)
def create_transaction(transaction: TransactionCreate):
    new_transaction = Transaction(id=str(uuid.uuid4()), **transaction.model_dump())
    db_transactions.append(new_transaction)
    return new_transaction

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: str):
    global db_transactions
    # Note: In a real DB we would use a session. Here we modify the list.
    # Since it's imported from session.py, we should ideally have a CRUD layer.
    found = False
    for i, t in enumerate(db_transactions):
        if t.id == transaction_id:
            db_transactions.pop(i)
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction removed successfully"}
