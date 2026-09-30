BEGIN;
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
COMMIT;
