import asyncio
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
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


# Define frontend static files directory path
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "static")


# Custom 404 handler to support Angular SPA routing (serve index.html for non-API routes)
@app.exception_handler(StarletteHTTPException)
async def spa_route_fallback(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        # Avoid intercepting API requests, API docs, or OpenAPI schemas
        if not any(
            request.url.path.startswith(p)
            for p in ["/api", "/docs", "/redoc", "/openapi.json"]
        ):
            index_path = os.path.join(FRONTEND_DIR, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
    from fastapi.exception_handlers import http_exception_handler

    return await http_exception_handler(request, exc)


# Mount static files to serve frontend client-side files
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
else:

    @app.get("/")
    def read_root() -> dict:
        """
        Root API endpoint returning API health status and meta information.
        """
        return {
            "status": "API Online",
            "version": "1.0",
            "open_finance": "Disconnected",
        }
