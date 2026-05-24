from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date

class TransactionBase(BaseModel):
    description: str
    amount: float
    type: str # 'expense', 'income', 'credit_card_payment'
    category_id: Optional[str] = Field(None, alias="category")
    account_id: Optional[str] = Field(None, alias="account")
    source_account_id: Optional[str] = Field(None, alias="sourceAccount")
    destination_account_id: Optional[str] = Field(None, alias="destinationAccount")
    date: date
    reference_month: Optional[str] = Field(None, alias="referenceMonth")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: str

class CategoryBase(BaseModel):
    name: str
    icon_name: str = Field(..., alias="iconName")
    color: str
    type: str # 'expense', 'income'

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: str

class AccountBase(BaseModel):
    name: str
    type: str # 'checking', 'credit_card', 'investment'
    initial_balance: Optional[float] = Field(0.0, alias="initialBalance")
    closing_day: Optional[int] = Field(None, alias="closingDay")
    due_day: Optional[int] = Field(None, alias="dueDay")
    card_last_digits: Optional[str] = Field(None, alias="cardLastDigits")
    card_color: Optional[str] = Field(None, alias="cardColor")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: str
