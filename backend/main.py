import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.api import api_router
from app.api.endpoints.open_finance import periodic_pluggy_sync

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


# Define frontend static files directory path
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

# Mount static files to serve assets, JS, CSS directly under /static
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Catch-All Route to serve frontend assets and fallback to index.html for SPA routing
@app.get("/{catchall:path}")
def catch_all_fallback(catchall: str):
    """
    Catch-all endpoint to serve static files directly or fallback to index.html for Angular routes.
    """
    # Prevent intercepting non-existent API or docs routes
    if (
        catchall.startswith("api")
        or catchall.startswith("docs")
        or catchall.startswith("redoc")
        or catchall == "openapi.json"
    ):
        return {"error": "Not Found"}

    if os.path.exists(STATIC_DIR):
        # Check if the requested path corresponds to a real file in the static directory
        file_path = os.path.join(STATIC_DIR, catchall)
        if catchall and os.path.isfile(file_path):
            return FileResponse(file_path)

        # Fallback to serving index.html for Angular SPA routes
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)

    # Default fallback response (API online indicator)
    return {"status": "API Online", "version": "1.0", "open_finance": "Disconnected"}
