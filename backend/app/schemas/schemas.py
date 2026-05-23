from pydantic import BaseModel
from typing import Optional
from datetime import date

class TransactionBase(BaseModel):
    description: str
    amount: float
    type: str # 'expense', 'income', 'credit_card_payment'
    category: str
    account: Optional[str] = None
    sourceAccount: Optional[str] = None
    destinationAccount: Optional[str] = None
    date: date
    referenceMonth: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: str

    class Config:
        from_attributes = True

class AccountBase(BaseModel):
    name: str
    type: str # 'debit', 'credit'
    initialBalance: Optional[float] = 0.0
    closingDay: Optional[int] = None
    dueDay: Optional[int] = None
    cardLastDigits: Optional[str] = None
    cardColor: Optional[str] = None

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: str

    class Config:
        from_attributes = True
