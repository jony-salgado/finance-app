from pydantic import BaseModel
from typing import Optional
from datetime import date

class TransacaoBase(BaseModel):
    descricao: str
    valor: float
    tipo: str # 'despesa', 'receita', 'pagamento_fatura'
    categoria: str
    conta: Optional[str] = None
    contaOrigem: Optional[str] = None
    contaDestino: Optional[str] = None
    data: date
    mesReferencia: Optional[str] = None

class TransacaoCreate(TransacaoBase):
    pass

class Transacao(TransacaoBase):
    id: str

    class Config:
        from_attributes = True

class ContaBase(BaseModel):
    nome: str
    tipo: str # 'debito', 'credito'
    saldoInicial: Optional[float] = 0.0
    diaFechamento: Optional[int] = None
    diaVencimento: Optional[int] = None
    finalCartao: Optional[str] = None
    corCartao: Optional[str] = None

class ContaCreate(ContaBase):
    pass

class Conta(ContaBase):
    id: str

    class Config:
        from_attributes = True
