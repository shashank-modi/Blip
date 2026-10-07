import { expensePaise, MAX_EXPENSE_PAISE } from './expenseInput.js';
import { suggestCategory } from './categories.js';

export function buildExpenseDraft(parsed, { edits = {}, category = '', history = [], mode = 'separate', name = '' } = {}) {
    const items = parsed.items.map((item, index) => {
        const edit = edits[index] || {};
        const description = edit.description ?? item.title;
        return {
            description,
            amount: edit.amount ?? item.amount,
            category: edit.category || category || suggestCategory(description, history) || 'General',
        };
    });
    const amounts = items.map(item => expensePaise(item.amount));
    const totalPaise = amounts.reduce((total, amount) => total + (amount || 0), 0);
    let error = '';
    if (amounts.includes(null) || items.some(item => !item.description.trim() || item.description.trim().length > 200)) error = 'Each item needs a name and a positive amount with up to two decimals.';
    const combined = mode === 'combined' && items.length > 1;
    if (combined && (!name.trim() || name.trim().length > 200)) error = 'Give the combined expense a name.';
    if (combined && totalPaise > MAX_EXPENSE_PAISE) error = 'The combined total is too large. Save these as separate expenses.';
    const sameCategory = items.length && items.every(item => item.category === items[0].category) ? items[0].category : 'General';
    const entries = combined ? [{ description: name.trim(), amount: totalPaise / 100, category: category || sameCategory }] : items.map(item => ({ ...item, amount: Number(item.amount), description: item.description.trim() }));
    return { items, entries, total: totalPaise / 100, error, valid: parsed.valid && !error, combined };
}
