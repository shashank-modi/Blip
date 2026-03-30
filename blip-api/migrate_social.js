import { query } from './db/client.js';

async function migrate() {
    try {
        await query(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(15) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;
UPDATE users SET is_onboarded = TRUE WHERE created_at < NOW();

CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    friend_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    type VARCHAR DEFAULT 'trip',
    icon VARCHAR DEFAULT '🏷️',
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    paid_by TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID REFERENCES group_expenses(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    paid_by TEXT REFERENCES users(id) ON DELETE CASCADE,
    paid_to TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    note VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
        `);
        console.log("Migration successful");
    } catch(err) {
        console.error("Migration failed", err);
        process.exit(1);
    }
    process.exit(0);
}

migrate();
