import { pool } from '../db/client.js';
import { databaseErrorSummary } from '../db/config.js';

const host = new URL(process.env.DATABASE_URL).hostname;
const target = host.endsWith('.neon.tech') ? 'Neon' : host.includes('supabase') ? 'Supabase' : ['localhost', '127.0.0.1', '[::1]'].includes(host) ? 'local PostgreSQL' : 'PostgreSQL';
console.log(`Checking DATABASE_URL (${target}); read-only, credentials hidden.`);
try {
    const result = await pool.query({
        text: `SELECT to_regclass('public.wallet_expense_batches') IS NOT NULL AS wallet_expense_batches,
            to_regclass('public.expense_payers') IS NOT NULL AS expense_payers,
            to_regclass('public.expense_debts') IS NOT NULL AS expense_debts,
            to_regclass('public.debt_settlement_allocations') IS NOT NULL AS debt_settlement_allocations,
            to_regclass('public.settlement_credits') IS NOT NULL AS settlement_credits,
            to_regclass('public.blip_balance_entries') IS NOT NULL AS balance_ledger,
            EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='blip_wallet_activity' AND NOT tgisinternal AND tgenabled<>'D') AS wallet_activity_trigger,
            to_regclass('public.monthly_budgets') IS NOT NULL AS monthly_budgets,
            to_regclass('public.notifications') IS NOT NULL AS notifications,
            to_regclass('public.push_subscriptions') IS NOT NULL AS push_subscriptions,
            to_regclass('public.push_deliveries') IS NOT NULL AS push_deliveries,
            to_regclass('public.settlement_allocations') IS NOT NULL AS settlement_allocations,
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expense_splits' AND column_name='paid_amount') AS partial_settlement_column,
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='metadata') AS activity_metadata`,
        query_timeout: 10000,
    });
    const missing = Object.entries(result.rows[0]).filter(([, present]) => !present).map(([name]) => name);
    if (missing.length) {
        console.error(`Connected, but migration objects are missing: ${missing.join(', ')}. Run migrations/neon-manual.sql against this database.`);
        process.exitCode = 1;
    } else console.log('Connected. Required monthly budget, activity, push, and settlement schema objects are present.');
} catch (error) {
    console.error(databaseErrorSummary(error));
    process.exitCode = 1;
} finally { await pool.end(); }
