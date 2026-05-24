from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ...schemas.schemas import Transaction, TransactionCreate
from ...db.supabase_client import supabase

router = APIRouter()

@router.get("/", response_model=List[Transaction], response_model_by_alias=True)
def list_transactions(month: Optional[str] = None):
    query = supabase.table("transactions").select("*")
    
    if month:
        # Filtering by reference_month or date starting with the month string (YYYY-MM)
        query = query.or_(f"reference_month.eq.{month},date.ilike.{month}%")
    
    response = query.execute()
    return response.data

@router.post("/", response_model=Transaction, response_model_by_alias=True)
def create_transaction(transaction: TransactionCreate):
    try:
        db_data = transaction.model_dump(mode='json', exclude_none=True, by_alias=False)
        # Convert empty strings to None for UUID fields
        for field in ["category_id", "account_id", "source_account_id", "destination_account_id"]:
            if field in db_data and db_data[field] == "":
                db_data[field] = None
        response = supabase.table("transactions").insert(db_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Error creating transaction: No data returned from database.")
        
        return response.data[0]
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")

@router.put("/{transaction_id}", response_model=Transaction, response_model_by_alias=True)
def update_transaction(transaction_id: str, transaction: TransactionCreate):
    try:
        db_data = transaction.model_dump(mode='json', exclude_none=True, by_alias=False)
        # Convert empty strings to None for UUID fields
        for field in ["category_id", "account_id", "source_account_id", "destination_account_id"]:
            if field in db_data and db_data[field] == "":
                db_data[field] = None
        response = supabase.table("transactions").update(db_data).eq("id", transaction_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Transaction not found or could not be updated")
        
        return response.data[0]
    except Exception as e:
        error_msg = str(e)
        if "violates row-level security policy" in error_msg:
            raise HTTPException(status_code=403, detail="Permission denied: Row Level Security policy prevents updating.")
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: str):
    try:
        response = supabase.table("transactions").delete().eq("id", transaction_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Transaction not found or already deleted")
        
        return {"message": "Transaction removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
