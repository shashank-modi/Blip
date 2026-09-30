export const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export const expensesForMonth = (expenses, month = monthKey()) => expenses.filter(expense => {
    const date = new Date(expense.date);
    return Number.isFinite(date.getTime()) && monthKey(date) === month;
});
export const categoryTotals = expenses => Object.entries(expenses.reduce((totals, expense) => {
    if (expense.category !== 'Income') totals[expense.category || 'General'] = (totals[expense.category || 'General'] || 0) + Number(expense.amount);
    return totals;
}, {})).map(([category, total]) => ({ category, total })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
