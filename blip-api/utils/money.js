export function cents(value, allowZero = false) {
    if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') throw Object.assign(new Error('Invalid amount'), { status: 400 });
    const amount = Number(value);
    const result = Math.round(amount * 100);
    if (!Number.isFinite(amount) || !Number.isSafeInteger(result) || result < (allowZero ? 0 : 1) || Math.abs(amount * 100 - result) > 0.000001) {
        throw Object.assign(new Error('Enter a valid amount with at most two decimal places'), { status: 400 });
    }
    return result;
}

export function allocateSettlement(splits, userId, friendId, amount, explicitPayer) {
    const requested = cents(amount);
    const net = splits.reduce((sum, s) => sum + (s.paid_by === userId ? 1 : -1) * (cents(s.amount, true) - cents(s.paid_amount || 0, true)), 0);
    if (explicitPayer && ![userId, friendId].includes(explicitPayer)) throw Object.assign(new Error('Invalid payer'), { status: 400 });
    const payer = explicitPayer || (net > 0 ? friendId : userId);
    const receiver = payer === userId ? friendId : userId;
    let remaining = requested;
    const allocations = [];
    for (const split of splits) {
        if (!remaining) break;
        if (split.paid_by !== receiver) continue;
        const applied = Math.min(remaining, cents(split.amount, true) - cents(split.paid_amount || 0, true));
        if (applied <= 0) continue;
        allocations.push({ ...split, applied: applied / 100 });
        remaining -= applied;
    }
    return { payer, receiver, allocations, credit: remaining / 100, direction: payer === userId ? 'paid' : 'received' };
}
