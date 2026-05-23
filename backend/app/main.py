from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.api import api_router

app = FastAPI(title="FinanceApp API", description="API for finance management and Open Finance")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "API Online", "version": "1.0", "open_finance": "Disconnected"}
