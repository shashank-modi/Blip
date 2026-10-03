import { cents } from './money.js';

// Match each person's net contribution against their share, in integer cents.
// This avoids circular debts when several people paid for the same bill.
export function expenseDebts(amount, shares, contributions) {
    const total = cents(amount);
    if (!Array.isArray(contributions) || !contributions.length) throw Object.assign(new Error('Choose at least one payer'), { status: 400 });
    const seen = new Set();
    const net = new Map();
    let paid = 0;
    for (const payer of contributions) {
        if (typeof payer.userId !== 'string' || !payer.userId || seen.has(payer.userId)) throw Object.assign(new Error('Invalid or duplicate payer'), { status: 400 });
        seen.add(payer.userId);
        const value = cents(payer.amount);
        paid += value;
        net.set(payer.userId, value);
    }
    if (paid !== total) throw Object.assign(new Error('Payer amounts must equal the expense total'), { status: 400 });
    if (shares.reduce((sum, share) => sum + cents(share.amount, true), 0) !== total) throw Object.assign(new Error('Shares must equal the expense total'), { status: 400 });
    for (const share of shares) net.set(share.userId, (net.get(share.userId) || 0) - cents(share.amount, true));
    const creditors = [...net].filter(([, value]) => value > 0).map(([id, value]) => ({ id, value }));
    const debtors = [...net].filter(([, value]) => value < 0).map(([id, value]) => ({ id, value: -value }));
    const debts = [];
    let index = 0;
    for (const debtor of debtors) {
        while (debtor.value > 0) {
            const creditor = creditors[index];
            const value = Math.min(debtor.value, creditor.value);
            debts.push({ userId: debtor.id, paidBy: creditor.id, amount: value / 100 });
            debtor.value -= value;
            creditor.value -= value;
            if (!creditor.value) index++;
        }
    }
    return debts;
}
