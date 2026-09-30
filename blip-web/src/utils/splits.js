export function splitAmount(amount, people, weights = {}) {
    const total = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(total) || total < 1 || !people.length) return [];
    const values = people.map(person => Number(weights[person.id] ?? 1));
    if (values.some(value => !Number.isFinite(value) || value <= 0)) return [];
    const weightTotal = values.reduce((sum, value) => sum + value, 0);
    const shares = values.map((value, index) => ({ index, cents: Math.floor(total * value / weightTotal), fraction: (total * value / weightTotal) % 1 }));
    let remainder = total - shares.reduce((sum, share) => sum + share.cents, 0);
    for (const share of [...shares].sort((a, b) => b.fraction - a.fraction || a.index - b.index)) {
        if (remainder-- <= 0) break;
        share.cents++;
    }
    return people.map((person, index) => ({ userId: person.id, amount: shares[index].cents / 100 }));
}
export const localDate = value => {
    const d = value ? new Date(value) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
