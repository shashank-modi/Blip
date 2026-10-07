import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const target = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1] || 'dev';
if (!['dev', 'neon'].includes(target)) throw new Error('Target must be dev or neon');
if (target === 'neon') {
    const connection = process.env.NEON_DATABASE_URL;
    if (!connection) throw new Error('Set NEON_DATABASE_URL in blip-api/.env first');
    if (!new URL(connection).hostname.endsWith('.neon.tech')) throw new Error('NEON_DATABASE_URL must point to Neon');
    process.env.DATABASE_URL = connection;
}
let pool;
if (target === 'neon') {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { default: WebSocket } = await import('ws');
    neonConfig.webSocketConstructor = WebSocket;
    pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30000 });
} else {
    ({ pool } = await import('./db/client.js'));
}
let client;
try {
    client = await pool.connect();
    if (process.argv.includes('--check')) {
        const schema = await client.query(`SELECT table_name, column_name, data_type
            FROM information_schema.columns WHERE table_schema = 'public'
            AND table_name IN ('users','expenses','expense_splits','group_payments','group_expenses')
            ORDER BY table_name, ordinal_position`);
        console.log(JSON.stringify({ target, columns: schema.rows }, null, 2));
        const collisions = await client.query(`SELECT count(*) AS collisions FROM (
            SELECT CASE WHEN phone ~ '^[0-9]{10}$' THEN '+91' || phone ELSE phone END
            FROM users WHERE phone IS NOT NULL GROUP BY 1 HAVING count(*) > 1
        ) duplicate_numbers`);
        console.log('Phone identity collisions:', collisions.rows[0].collisions);
    } else {
        for (const file of ['001_social_fixes.sql', '002_activity_push.sql', '003_monthly_budgets.sql', '004_payment_credits.sql', '005_multiple_payers.sql', '006_wallet_expense_batches.sql']) {
            await client.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
        }
        console.log(`Social fixes migration complete (${target})`);
    }
} catch (error) {
    console.error(`Migration ${target} failed: ${error.message}`);
    process.exitCode = 1;
} finally {
    client?.release();
    await pool.end();
}
