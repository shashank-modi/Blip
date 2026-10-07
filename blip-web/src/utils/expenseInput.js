export const MAX_EXPENSE_ITEMS = 50;
export const MAX_EXPENSE_PAISE = 9999999999;

const number = String.raw`\d+(?:\.\d{1,2})?`;
const expression = `${number}(?:\\s*\\+\\s*${number})*`;
const amountFirst = new RegExp(`^(${expression})(?:\\s+(.+))?$`);
const amountLast = new RegExp(`^(.+?)\\s+(${expression})$`);

export function expensePaise(value) {
    const text = String(value).trim();
    if (!new RegExp(`^${number}$`).test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(paise) && paise > 0 && paise <= MAX_EXPENSE_PAISE ? paise : null;
}

// This grammar deliberately supports addition only; never execute input as code.
export function parseExpenseInput(input = '') {
    const text = String(input).trim();
    if (!text) return { items: [], errors: [], total: 0, valid: false };
    // Keep standard and Indian thousands separators inside an amount.
    const normalized = text.replace(/(?<![\d,])(?:\d{1,2}(?:,\d{2})+,\d{3}|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?(?![\d,])/g, amount => amount.replaceAll(',', ''));
    const parts = normalized.split(/[,;\n]/);
    const items = [];
    const errors = [];
    if (parts.length > MAX_EXPENSE_ITEMS) return { items, errors: ['Add up to 50 expenses at a time.'], total: 0, valid: false };
    parts.forEach((part, index) => {
        const source = part.trim();
        const first = source.match(amountFirst);
        const last = first ? null : source.match(amountLast);
        const sum = first?.[1] || last?.[2];
        const title = (first?.[2] || last?.[1] || '').trim();
        // Extra numeric words usually mean a missing separator between expenses.
        if (!sum || /(?:^|\s)(?:[+*/=]|-?\d+(?:\.\d+)?(?:\s|$))/.test(title) || (!title && (parts.length > 1 || sum.includes('+')))) {
            errors.push(`Item ${index + 1}: use an amount and name, e.g. “40 bread”. Separate items with commas or new lines.`);
            return;
        }
        const amounts = sum.split('+').map(value => expensePaise(value.trim()));
        const paise = amounts.reduce((total, value) => total + (value || 0), 0);
        if (amounts.includes(null) || paise > MAX_EXPENSE_PAISE || title.length > 200) {
            errors.push(`Item ${index + 1}: use positive amounts with up to two decimals and a name under 201 characters.`);
            return;
        }
        items.push({ amount: paise / 100, title: title || 'Manual Entry', calculation: amounts.length > 1 ? sum : null });
    });
    const totalPaise = items.reduce((total, item) => total + Math.round(item.amount * 100), 0);
    return { items, errors, total: totalPaise / 100, valid: items.length > 0 && errors.length === 0 };
}
