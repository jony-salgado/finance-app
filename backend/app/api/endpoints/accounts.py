from fastapi import APIRouter, HTTPException
from typing import List
from ...schemas.schemas import Account, AccountCreate
from ...db.supabase_client import supabase

router = APIRouter()

@router.get("/", response_model=List[Account], response_model_by_alias=True)
def list_accounts():
    try:
        response = supabase.table("accounts").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Account, response_model_by_alias=True)
def create_account(account: AccountCreate):
    try:
        # by_alias=False (default) gives us the snake_case keys for the database
        db_data = account.model_dump(mode='json', exclude_none=True, by_alias=False)
        response = supabase.table("accounts").insert(db_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Error creating account: No data returned.")
        
        return response.data[0]
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")

@router.put("/{account_id}", response_model=Account, response_model_by_alias=True)
def update_account(account_id: str, account: AccountCreate):
    try:
        db_data = account.model_dump(mode='json', exclude_none=True, by_alias=False)
        response = supabase.table("accounts").update(db_data).eq("id", account_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Account not found or could not be updated")
        
        return response.data[0]
    except Exception as e:
        error_msg = str(e)
        if "violates row-level security policy" in error_msg:
            raise HTTPException(status_code=403, detail="Permission denied: Row Level Security policy prevents updating.")
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")

@router.delete("/{account_id}")
def delete_account(account_id: str):
    try:
        response = supabase.table("accounts").delete().eq("id", account_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Account not found or already deleted")
        
        return {"message": "Account removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
