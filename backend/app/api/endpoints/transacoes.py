from fastapi import APIRouter, HTTPException
from typing import List, Optional
import uuid
from ...schemas.schemas import Transacao, TransacaoCreate
from ...db.session import db_transacoes

router = APIRouter()

@router.get("/", response_model=List[Transacao])
def listar_transacoes(mes: Optional[str] = None):
    if mes:
        return [t for t in db_transacoes if str(t.data).startswith(mes) or t.mesReferencia == mes]
    return db_transacoes

@router.post("/", response_model=Transacao)
def criar_transacao(transacao: TransacaoCreate):
    new_transacao = Transacao(id=str(uuid.uuid4()), **transacao.model_dump())
    db_transacoes.append(new_transacao)
    return new_transacao

@router.delete("/{transacao_id}")
def deletar_transacao(transacao_id: str):
    global db_transacoes
    # Note: In a real DB we would use a session. Here we modify the list.
    # Since it's imported from session.py, we should ideally have a CRUD layer.
    found = False
    for i, t in enumerate(db_transacoes):
        if t.id == transacao_id:
            db_transacoes.pop(i)
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"message": "Transação removida com sucesso"}
