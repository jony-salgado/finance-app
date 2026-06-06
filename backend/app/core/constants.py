# Open Finance and Application Constants

# Account Types
ACCOUNT_TYPE_CHECKING = "checking"
ACCOUNT_TYPE_CREDIT_CARD = "credit_card"
ACCOUNT_TYPE_INVESTMENT = "investment"

# Transaction Types
TRANSACTION_TYPE_EXPENSE = "expense"
TRANSACTION_TYPE_INCOME = "income"
TRANSACTION_TYPE_CREDIT_CARD_PAYMENT = "credit_card_payment"

# Category Types
CATEGORY_TYPE_EXPENSE = "expense"
CATEGORY_TYPE_INCOME = "income"

# Provider Constants
PROVIDER_ID_PLUGGY = "pluggy"
PLUGGY_API_HOST = "https://api.pluggy.ai"
PLUGGY_TRANSACTIONS_URL = "https://api.pluggy.ai/transactions"

# Pluggy API Types/Subtypes
PLUGGY_TYPE_CREDIT = "CREDIT"
PLUGGY_SUBTYPE_CREDIT_CARD = "CREDIT_CARD"
PLUGGY_TYPE_INVESTMENT = "INVESTMENT"
PLUGGY_SUBTYPE_INVESTMENT_ACCOUNT = "INVESTMENT_ACCOUNT"
PLUGGY_TXN_TYPE_DEBIT = "DEBIT"

# Supported Open Finance Brands for Matching
SUPPORTED_BRANDS = ["nubank", "xp", "itau", "bradesco", "santander", "inter"]

# Brand Specific Naming Details
BRAND_NUBANK = "nubank"
BRAND_NU_PAGAMENTOS = "nu pagamentos"

# Account Name Generation Keywords (Portuguese)
KEYWORD_CREDITO = "crédito"
KEYWORD_CARTAO = "cartão"
KEYWORD_CORRENTE = "corrente"
KEYWORD_CONTA = "conta"
KEYWORD_INVESTIMENTO = "investimento"

# Account Name Suffixes
SUFFIX_CREDITO = "Crédito"
SUFFIX_CORRENTE = "Corrente"
SUFFIX_INVESTIMENTO = "Investimento"

# Default Account & Credit Card Settings
DEFAULT_CARD_COLOR = "bg-slate-800"
DEFAULT_CARD_LAST_DIGITS = "9999"
DEFAULT_DUE_DAY = 10
DEFAULT_CLOSING_DAY_OFFSET = 7
DEFAULT_CLOSING_DAY_FALLBACK = 28

# Pluggy category mapping
PLUGGY_CATEGORY_MAP = {
    "transfers": "Outros",
    "same person transfer": "Outros",
    "telecommunications": "Serviços",
    "investments": "Investimento",
    "food": "Alimentação",
    "groceries": "Supermercado",
    "restaurants": "Alimentação",
    "health": "Saúde",
    "transport": "Transporte",
    "travel": "Viagem",
    "shopping": "Compras",
    "utilities": "Casa",
    "services": "Serviços",
    "education": "Educação",
    "entertainment": "Lazer",
}
