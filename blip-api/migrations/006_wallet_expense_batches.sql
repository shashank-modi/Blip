BEGIN;

-- Durable receipts prevent duplicate Wallet entries after a lost response/retry.
CREATE TABLE IF NOT EXISTS wallet_expense_batches (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,
    payload JSONB NOT NULL,
    expense_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, request_id)
);

COMMIT;
