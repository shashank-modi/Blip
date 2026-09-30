// Accept the user's local calendar month, including UTC month-boundary offsets.
export function currentBudgetMonth(value, now = new Date()) {
    const month = value || now.toISOString().slice(0, 7);
    const possible = [-14, 0, 14].map(hours => new Date(now.getTime() + hours * 3600000).toISOString().slice(0, 7));
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !possible.includes(month)) {
        throw Object.assign(new Error('Budget changes must be for the current month'), { status: 400 });
    }
    return `${month}-01`;
}
export async function ensureBudget(query, userId, month) {
    await query(`INSERT INTO monthly_budgets(user_id,month,amount)
        SELECT id,$2::date,COALESCE(monthly_budget,0) FROM users WHERE id=$1
        ON CONFLICT (user_id,month) DO NOTHING`, [userId, month]);
}
export async function budgetState(query, userId, month) {
    await ensureBudget(query, userId, month);
    const rows = (await query(`SELECT to_char(month,'YYYY-MM') AS month, amount, checked_in_at FROM monthly_budgets WHERE user_id=$1 ORDER BY month DESC`, [userId])).rows.map(row => ({...row, amount:Number(row.amount)}));
    return { current:rows.find(row => row.month === month.slice(0,7)), history:rows };
}
