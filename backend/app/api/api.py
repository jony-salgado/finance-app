from fastapi import APIRouter
from .endpoints import transacoes, contas

api_router = APIRouter()
api_router.include_router(transacoes.router, prefix="/transacoes", tags=["transacoes"])
api_router.include_router(contas.router, prefix="/contas", tags=["contas"])
