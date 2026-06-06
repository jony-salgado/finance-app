-- Supabase SQL Setup
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    initial_balance DECIMAL(12,2) DEFAULT 0.00,
    closing_day INT,
    due_day INT,
    card_last_digits TEXT,
    card_color TEXT,
    provider_id TEXT,
    provider_account_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'credit_card_payment', 'transfer')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    source_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    installment_current INT,
    installment_total INT,
    is_paid BOOLEAN DEFAULT true,
    tags TEXT[],
    ignore_in_analytics BOOLEAN DEFAULT false,
    spending_group TEXT NOT NULL DEFAULT 'weekly' CHECK (spending_group IN ('weekly', 'fixed', 'emergency')),
    date DATE NOT NULL,
    reference_month TEXT,
    provider_transaction_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for faster lookups during webhooks
CREATE INDEX IF NOT EXISTS idx_accounts_provider_account_id ON accounts(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_transaction_id ON transactions(provider_transaction_id);

-- Enable Row Level Security (RLS) - Optional for now, but recommended for production
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
