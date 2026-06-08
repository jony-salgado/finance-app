from fastapi import APIRouter, HTTPException
from typing import List
from ...schemas.schemas import WeeklyGoal, WeeklyGoalCreate
from ...db.supabase_client import supabase

router = APIRouter()


@router.get("/", response_model=List[WeeklyGoal], response_model_by_alias=True)
def list_weekly_goals() -> List[dict]:
    """
    List all weekly goals from the database.
    """
    try:
        response = supabase.table("weekly_goals").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=WeeklyGoal, response_model_by_alias=True)
def create_weekly_goal(weekly_goal: WeeklyGoalCreate) -> dict:
    """
    Create a new weekly goal in the database.
    """
    try:
        db_data = weekly_goal.model_dump(mode="json", exclude_none=True, by_alias=False)
        response = supabase.table("weekly_goals").insert(db_data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Error creating weekly goal")

        return response.data[0]
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")


@router.put(
    "/{weekly_goal_id}", response_model=WeeklyGoal, response_model_by_alias=True
)
def update_weekly_goal(weekly_goal_id: str, weekly_goal: WeeklyGoalCreate) -> dict:
    """
    Update an existing weekly goal by its ID.
    """
    try:
        db_data = weekly_goal.model_dump(mode="json", exclude_none=True, by_alias=False)
        response = (
            supabase.table("weekly_goals")
            .update(db_data)
            .eq("id", weekly_goal_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404, detail="Weekly goal not found or could not be updated"
            )

        return response.data[0]
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")


@router.delete("/{weekly_goal_id}")
def delete_weekly_goal(weekly_goal_id: str) -> dict:
    """
    Delete a weekly goal by its ID.
    """
    try:
        response = (
            supabase.table("weekly_goals").delete().eq("id", weekly_goal_id).execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404, detail="Weekly goal not found or already deleted"
            )

        return {"message": "Weekly goal removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
