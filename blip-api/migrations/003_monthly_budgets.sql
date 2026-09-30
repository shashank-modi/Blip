BEGIN;
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
COMMIT;
