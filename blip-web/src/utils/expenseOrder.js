// History follows when an entry was recorded, not the bill's editable expense date.
export function recordedExpenseTime(entry) {
    for (const value of [entry.createdAt, entry.created_at, entry.date]) {
        const time = Date.parse(value);
        if (Number.isFinite(time)) return time;
    }
    return 0;
}

export function newestExpenseFirst(a, b) {
    // Keep the API's precise timestamp order when JavaScript rounds two entries
    // to the same millisecond. UUIDs do not indicate creation order.
    return recordedExpenseTime(b) - recordedExpenseTime(a);
}

export function groupExpenseHistory(expenses = []) {
    const months = {};
    for (const item of [...expenses].sort(newestExpenseFirst)) {
        const date = new Date(recordedExpenseTime(item));
        const month = date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        const day = date.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' }) + ', ' + date.toLocaleDateString('en-IN', { weekday: 'short' });
        const monthData = months[month] ||= { days: {}, totalSpent: 0 };
        const dayData = monthData.days[day] ||= { items: [], dailyTotal: 0 };
        dayData.items.push(item);
        if (item.type === 'expense') {
            monthData.totalSpent += Number(item.amount) || 0;
            dayData.dailyTotal += Number(item.amount) || 0;
        }
    }
    return months;
}

export function hasAppliedPayments(expense) {
    return (expense?.splits || []).some(split=>split.userId!==expense.paidBy && Number(split.amount)>0 && (Number(split.paidAmount)>0 || split.isPaid===true));
}
