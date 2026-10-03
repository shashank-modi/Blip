export function splitAmount(amount, people, weights = {}) {
    const total = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(total) || total < 1 || !people.length) return [];
    const values = people.map(person => Number(weights[person.id] ?? 1));
    if (values.some(value => !Number.isFinite(value) || value < 0)) return [];
    const weightTotal = values.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(weightTotal) || weightTotal <= 0) return [];
    const shares = values.map((value, index) => ({ index, cents: Math.floor(total * (value / weightTotal)), fraction: (total * (value / weightTotal)) % 1 }));
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

// Empty fields are automatic; explicit zero is a fixed amount. Work in cents.
export function splitExactAmount(amount, people, fixed = {}) {
    const total = Math.round(Number(amount) * 100);
    const invalid = error => ({ splits: [], error });
    if (!Number.isSafeInteger(total) || total < 1 || Math.abs(Number(amount) * 100 - total) > 0.000001) return invalid('Enter a valid bill amount.');
    if (!people.length) return invalid('Choose at least one person.');
    const amounts = new Map();
    let used = 0;
    for (const person of people) {
        const value = fixed[person.id];
        if (value === undefined || value === null || String(value).trim() === '') continue;
        const number = Number(value), cents = Math.round(number * 100);
        if (!Number.isSafeInteger(cents) || cents < 0 || Math.abs(number * 100 - cents) > 0.000001) return invalid('Use positive amounts or zero, with up to two decimal places.');
        amounts.set(person.id, cents);
        used += cents;
    }
    const remaining = total - used;
    if (remaining < 0) return invalid(`Rs. ${(-remaining / 100).toFixed(2)} over the bill total. Reduce a fixed amount.`);
    const automatic = people.filter(person => !amounts.has(person.id));
    if (!automatic.length && remaining) return invalid(`Rs. ${(remaining / 100).toFixed(2)} left. Clear an amount to calculate it automatically.`);
    const base = automatic.length ? Math.floor(remaining / automatic.length) : 0;
    let extra = automatic.length ? remaining % automatic.length : 0;
    for (const person of automatic) amounts.set(person.id, base + (extra-- > 0 ? 1 : 0));
    return { splits: people.map(person => ({ userId: person.id, amount: amounts.get(person.id) / 100 })), error: '' };
}
