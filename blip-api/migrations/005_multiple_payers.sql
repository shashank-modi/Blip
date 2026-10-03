BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
-- Original expense_splits remain the consumption shares. Multi-payer bills
-- keep contributions and net debts separately so a bill is counted only once.
CREATE TABLE IF NOT EXISTS expense_payers (
    expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    PRIMARY KEY (expense_id, user_id)
);
CREATE TABLE IF NOT EXISTS expense_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    paid_by TEXT NOT NULL REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= amount),
    CHECK (user_id <> paid_by),
    UNIQUE (expense_id, user_id, paid_by)
);
CREATE TABLE IF NOT EXISTS debt_settlement_allocations (
    payment_id UUID NOT NULL REFERENCES group_payments(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES expense_debts(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    PRIMARY KEY (payment_id, debt_id)
);
CREATE OR REPLACE VIEW blip_balance_entries AS
SELECT s.user_id, e.paid_by, e.group_id, s.amount-s.paid_amount AS amount,
    0::numeric AS paid_amount, FALSE AS is_paid
FROM expense_splits s JOIN group_expenses e ON e.id=s.expense_id
WHERE s.user_id<>e.paid_by AND s.is_paid=FALSE
AND NOT EXISTS (SELECT 1 FROM expense_payers p WHERE p.expense_id=e.id)
UNION ALL
SELECT d.user_id, d.paid_by, e.group_id, d.amount-d.paid_amount, 0::numeric, FALSE
FROM expense_debts d JOIN group_expenses e ON e.id=d.expense_id
WHERE d.amount>d.paid_amount
UNION ALL
SELECT paid_to AS user_id, paid_by, group_id, amount, 0::numeric, FALSE
FROM settlement_credits;
COMMIT;
