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
    provider_id: Optional[str] = Field(None, alias="providerId")
    provider_account_id: Optional[str] = Field(None, alias="providerAccountId")
    provider_item_id: Optional[str] = Field(None, alias="providerItemId")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: str

# --- Open Finance Schemas ---

class OpenFinanceLinkTokenResponse(BaseModel):
    link_token: str = Field(..., alias="linkToken")
    expires_at: Optional[str] = Field(None, alias="expiresAt")

class PluggyTransactionWebhook(BaseModel):
    id: str
    description: str
    amount: float
    date: date
    category: Optional[str] = None
    account_id: str = Field(..., alias="accountId")
    type: Optional[str] = None

class OpenFinanceWebhookPayload(BaseModel):
    event: str # e.g., 'item/created', 'item/updated', 'transaction/created'
    item_id: Optional[str] = Field(None, alias="itemId")
    transaction: Optional[PluggyTransactionWebhook] = None
