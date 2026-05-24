from fastapi import APIRouter, HTTPException
from typing import List
from ...schemas.schemas import Category, CategoryCreate
from ...db.supabase_client import supabase

router = APIRouter()

@router.get("/", response_model=List[Category], response_model_by_alias=True)
def list_categories():
    try:
        response = supabase.table("categories").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Category, response_model_by_alias=True)
def create_category(category: CategoryCreate):
    try:
        db_data = category.model_dump(mode='json', exclude_none=True, by_alias=False)
        response = supabase.table("categories").insert(db_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Error creating category")
        
        return response.data[0]
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")

@router.put("/{category_id}", response_model=Category, response_model_by_alias=True)
def update_category(category_id: str, category: CategoryCreate):
    try:
        db_data = category.model_dump(mode='json', exclude_none=True, by_alias=False)
        response = supabase.table("categories").update(db_data).eq("id", category_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Category not found or could not be updated")
        
        return response.data[0]
    except Exception as e:
        error_msg = str(e)
        if "violates row-level security policy" in error_msg:
            raise HTTPException(status_code=403, detail="Permission denied: Row Level Security policy prevents updating.")
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")

@router.delete("/{category_id}")
def delete_category(category_id: str):
    try:
        response = supabase.table("categories").delete().eq("id", category_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Category not found or already deleted")
        
        return {"message": "Category removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
