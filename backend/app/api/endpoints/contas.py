from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from ...schemas.schemas import Conta, ContaCreate
from ...db.session import db_contas

router = APIRouter()

@router.get("/", response_model=List[Conta])
def listar_contas():
    return db_contas

@router.post("/", response_model=Conta)
def criar_conta(conta: ContaCreate):
    new_conta = Conta(id=str(uuid.uuid4()), **conta.model_dump())
    db_contas.append(new_conta)
    return new_conta
