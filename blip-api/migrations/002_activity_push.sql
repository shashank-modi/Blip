BEGIN;
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
COMMIT;
