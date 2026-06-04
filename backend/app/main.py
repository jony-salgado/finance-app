import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.api import api_router
from .api.endpoints.open_finance import periodic_pluggy_sync

app = FastAPI(
    title="FinanceApp API", description="API for finance management and Open Finance"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup_event() -> None:
    """
    FastAPI startup event to trigger periodic background tasks.
    """
    asyncio.create_task(periodic_pluggy_sync())


@app.get("/")
def read_root() -> dict:
    """
    Root API endpoint returning API health status and meta information.
    """
    return {"status": "API Online", "version": "1.0", "open_finance": "Disconnected"}
