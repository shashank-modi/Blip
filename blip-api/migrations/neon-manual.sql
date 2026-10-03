-- Paste this entire file into the Neon SQL Editor and run it together.
-- It also works with the Supabase development database. No code push is required.
BEGIN;

-- 001_social_fixes.sql
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(16);
-- Preserve national numbers while the old app is still running. Prevent duplicate
-- identities across legacy Indian numbers and their international equivalents.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_international_unique ON users
    ((CASE WHEN phone ~ '^[0-9]{10}$' THEN '+91' || phone ELSE phone END))
    WHERE phone IS NOT NULL;
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS settlement_id UUID;
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
UPDATE expense_splits SET paid_amount = amount WHERE is_paid = TRUE AND paid_amount = 0;
ALTER TABLE group_payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'master';
ALTER TABLE group_payments ADD COLUMN IF NOT EXISTS parent_payment_id UUID REFERENCES group_payments(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS settlement_payment_id UUID REFERENCES group_payments(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS settlement_allocations (
    payment_id UUID REFERENCES group_payments(id) ON DELETE CASCADE,
    split_id UUID REFERENCES expense_splits(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    PRIMARY KEY (payment_id, split_id)
);
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_created ON notifications(user_id, created_at DESC);

-- 002_activity_push.sql
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS origin_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_origin ON notifications(user_id, origin_key) WHERE origin_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS push_deliveries (
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE CASCADE,
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    PRIMARY KEY(notification_id, subscription_id)
);
CREATE OR REPLACE FUNCTION queue_blip_push() RETURNS trigger AS $$
BEGIN
    IF NEW.user_id IS DISTINCT FROM NEW.actor_id AND NEW.read_at IS NULL THEN
        INSERT INTO push_deliveries (notification_id, subscription_id)
        SELECT NEW.id, id FROM push_subscriptions WHERE user_id = NEW.user_id
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS blip_queue_push ON notifications;
CREATE TRIGGER blip_queue_push AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION queue_blip_push();

-- Wallet events are written in the same transaction as expenses, including income
-- and recurring payments. They stay private to the owner.
CREATE OR REPLACE FUNCTION log_blip_wallet_activity() RETURNS trigger AS $$
DECLARE item expenses%ROWTYPE; verb TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN item := OLD; ELSE item := NEW; END IF;
    IF item.settlement_payment_id IS NOT NULL THEN RETURN NULL; END IF;
    verb := CASE TG_OP WHEN 'INSERT' THEN 'added' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END;
    INSERT INTO notifications (user_id, actor_id, type, message, read_at, metadata, origin_key)
    SELECT item.user_id, item.user_id, 'wallet_' || lower(TG_OP),
        COALESCE(u.name, 'You') || ' ' || verb || ' “' || COALESCE(item.description, 'Expense') || '” in Wallet.', NOW(),
        jsonb_build_object('amount', item.amount, 'description', item.description, 'category', item.category, 'expenseId', item.id, 'scope', 'wallet'),
        CASE WHEN TG_OP = 'INSERT' THEN 'wallet:' || item.id::text ELSE NULL END
    FROM users u WHERE u.id = item.user_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS blip_wallet_activity ON expenses;
CREATE TRIGGER blip_wallet_activity AFTER INSERT OR UPDATE OR DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION log_blip_wallet_activity();

-- Existing records form the initial history and do not generate push alerts.
INSERT INTO notifications (user_id, actor_id, type, message, read_at, created_at, metadata, origin_key)
SELECT e.user_id, e.user_id, 'wallet_insert', COALESCE(u.name, 'You') || ' added “' || COALESCE(e.description, 'Expense') || '” in Wallet.', NOW(), COALESCE(e.date, NOW()),
    jsonb_build_object('amount', e.amount, 'description', e.description, 'category', e.category, 'expenseId', e.id, 'scope', 'wallet'), 'wallet:' || e.id::text
FROM expenses e JOIN users u ON u.id = e.user_id WHERE e.settlement_payment_id IS NULL
ON CONFLICT DO NOTHING;
INSERT INTO notifications (user_id, actor_id, type, message, read_at, created_at, metadata, origin_key)
SELECT participants.user_id, e.paid_by, 'expense', COALESCE(u.name, 'Someone') || ' added “' || e.description || '”.', NOW(), COALESCE(e.created_at, e.date, NOW()),
    jsonb_build_object('amount', e.amount, 'description', e.description, 'expenseId', e.id, 'groupId', e.group_id, 'scope', 'shared'), 'expense:' || e.id::text
FROM group_expenses e JOIN users u ON u.id = e.paid_by
CROSS JOIN LATERAL (SELECT e.paid_by AS user_id UNION SELECT s.user_id FROM expense_splits s WHERE s.expense_id = e.id) participants
ON CONFLICT DO NOTHING;
INSERT INTO notifications (user_id, actor_id, type, message, read_at, created_at, metadata, origin_key)
SELECT participants.user_id, p.paid_by, 'settlement', COALESCE(u.name, 'Someone') || ' recorded a settlement.', NOW(), p.created_at,
    jsonb_build_object('amount', p.amount, 'paymentId', p.id, 'scope', 'shared'), 'settlement:' || p.id::text
FROM group_payments p JOIN users u ON u.id = p.paid_by
CROSS JOIN LATERAL (SELECT p.paid_by AS user_id UNION SELECT p.paid_to) participants
WHERE p.payment_type = 'master' OR p.payment_type IS NULL
ON CONFLICT DO NOTHING;

-- 003_monthly_budgets.sql
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
CREATE TABLE IF NOT EXISTS monthly_budgets (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    checked_in_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, month)
);
-- Only the current value is known. Never invent historical monthly budgets.
-- Existing onboarded users have already chosen this month's budget: don't
-- prompt again when this update is installed. Next month gets a fresh check-in.
INSERT INTO monthly_budgets (user_id, month, amount, checked_in_at)
SELECT id, date_trunc('month', CURRENT_DATE)::date, GREATEST(COALESCE(monthly_budget,0),0),
    CASE WHEN is_onboarded THEN NOW() ELSE NULL END
FROM users ON CONFLICT (user_id, month) DO NOTHING;


-- 004_payment_credits.sql
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
