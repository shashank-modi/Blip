BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
-- Any part of a recorded payment not applied to a bill stays as a credit.
-- Credits are immutable; later payments offset them through the balance ledger.
CREATE TABLE IF NOT EXISTS settlement_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES group_payments(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id),
    paid_by TEXT NOT NULL REFERENCES users(id),
    paid_to TEXT NOT NULL REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    CHECK (paid_by <> paid_to)
);
CREATE INDEX IF NOT EXISTS settlement_credits_payment ON settlement_credits(payment_id);
ALTER TABLE group_payments ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id);
CREATE OR REPLACE VIEW blip_balance_entries AS
SELECT s.user_id, e.paid_by, e.group_id, s.amount-s.paid_amount AS amount,
    0::numeric AS paid_amount, FALSE AS is_paid
FROM expense_splits s JOIN group_expenses e ON e.id=s.expense_id
WHERE s.user_id<>e.paid_by AND s.is_paid=FALSE
UNION ALL
SELECT paid_to AS user_id, paid_by, group_id, amount, 0::numeric, FALSE
FROM settlement_credits;
COMMIT;
