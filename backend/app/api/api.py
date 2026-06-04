from fastapi import APIRouter
from .endpoints import transactions, accounts, categories, open_finance

api_router = APIRouter()
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(open_finance.router, prefix="/open-finance", tags=["open-finance"])
