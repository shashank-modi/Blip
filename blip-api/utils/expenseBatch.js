import { cents } from './money.js';
import { toTitleCase } from './format.js';

const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };

export function validateExpenseBatch(body = {}) {
    const { requestId, expenses } = body || {};
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) invalid('A valid request ID is required');
    if (!Array.isArray(expenses) || expenses.length < 1 || expenses.length > 50) invalid('Add between 1 and 50 expenses');
    const entries = expenses.map((entry, index) => {
        if (!entry || typeof entry !== 'object') invalid(`Invalid expense at item ${index + 1}`);
        const amount = cents(entry.amount) / 100;
        if (amount > 99999999.99) invalid(`Amount too large at item ${index + 1}`);
        if (typeof entry.description !== 'string' || !entry.description.trim() || entry.description.trim().length > 200) invalid(`Enter a name of 1–200 characters at item ${index + 1}`);
        const category = entry.category === undefined ? 'General' : entry.category;
        if (typeof category !== 'string' || !category.trim() || category.trim().length > 50 || category.trim().toLowerCase() === 'income') invalid(`Invalid expense category at item ${index + 1}`);
        if (typeof entry.date !== 'string' || !Number.isFinite(Date.parse(entry.date))) invalid(`Invalid date at item ${index + 1}`);
        return { amount, description: toTitleCase(entry.description.trim()), category: category.trim(), date: new Date(entry.date).toISOString() };
    });
    return { requestId, entries };
}

export async function saveExpenseBatch(query, userId, requestId, entries) {
    // The receipt and expenses commit together. The unique key serializes retries.
    const receipt = await query(`INSERT INTO wallet_expense_batches (user_id, request_id, payload)
        VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING RETURNING request_id`, [userId, requestId, JSON.stringify(entries)]);
    if (!receipt.rows.length) {
        const previous = (await query(`SELECT payload = $3::jsonb AS matches, expense_ids
            FROM wallet_expense_batches WHERE user_id = $1 AND request_id = $2`, [userId, requestId, JSON.stringify(entries)])).rows[0];
        if (!previous?.matches) throw Object.assign(new Error('This request ID was already used for different expenses'), { status: 409 });
        // Return current rows, so retries cannot undo later edits or resurrect deletions.
        return (await query('SELECT * FROM expenses WHERE user_id = $1 AND id = ANY($2::uuid[]) ORDER BY array_position($2::uuid[], id)', [userId, previous.expense_ids])).rows;
    }
    const created = (await query(`INSERT INTO expenses (user_id, amount, category, description, date)
        SELECT $1, item.amount, item.category, item.description, item.date
        FROM jsonb_to_recordset($2::jsonb) AS item(amount numeric, category text, description text, date timestamptz)
        RETURNING *`, [userId, JSON.stringify(entries)])).rows;
    await query('UPDATE wallet_expense_batches SET expense_ids = $3::uuid[] WHERE user_id = $1 AND request_id = $2', [userId, requestId, created.map(entry => entry.id)]);
    return created;
}
