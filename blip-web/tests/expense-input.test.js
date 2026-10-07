import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpenseInput, expensePaise } from '../src/utils/expenseInput.js';
import { buildExpenseDraft } from '../src/utils/expenseDraft.js';

test('parses the four-item example in either order and totals exactly', () => {
    for (const input of ['40 bread, 100 tea, 200 pizza, 20 cookie', 'bread 40; tea 100\npizza 200; cookie 20']) {
        const parsed = parseExpenseInput(input);
        assert.equal(parsed.valid, true);
        assert.equal(parsed.total, 360);
        assert.deepEqual(parsed.items.map(({ title, amount }) => [title, amount]), [['bread', 40], ['tea', 100], ['pizza', 200], ['cookie', 20]]);
    }
});

test('addition expressions work in either order, including within a batch', () => {
    for (const input of ['40 + 100 + 200 + 20 snacks', 'snacks 40+100+200+20']) {
        const parsed = parseExpenseInput(input);
        assert.equal(parsed.valid, true);
        assert.equal(parsed.items.length, 1);
        assert.equal(parsed.items[0].amount, 360);
        assert.equal(parsed.items[0].title, 'snacks');
    }
    assert.equal(parseExpenseInput('0.10 + 0.20 tea, 2.45 cookie').total, 2.75);
    assert.equal(expensePaise('0.29'), 29);
});

test('preserves single-entry input and accepts thousands separators and product names', () => {
    assert.equal(parseExpenseInput('150 pizza').items[0].amount, 150);
    assert.equal(parseExpenseInput('pizza 150').items[0].amount, 150);
    assert.equal(parseExpenseInput('150').items[0].title, 'Manual Entry');
    assert.equal(parseExpenseInput('1,200.50 groceries, taxi 2,000').total, 3200.50);
    assert.equal(parseExpenseInput('1,20,000 laptop').total, 120000);
    assert.equal(parseExpenseInput('1,000,000 car').total, 1000000);
    assert.equal(parseExpenseInput('40 7up').valid, true);
});

test('never silently accepts malformed amounts or drops an invalid item', () => {
    for (const input of ['', 'bread', '40 bread, tea, 200 pizza', '40 bread 100 tea', '40 bread and 100 tea', '40 bread,', '40 bread,,100 tea', '0 bread', '-20 bread', '1.234 bread', '40 + snacks', '40 + + 20 snacks', '40 - 20 snacks', '40 * 20 snacks', '40 / 20 snacks', '40 + 20', '1e3 bread', 'Infinity bread', '100000000 bread']) {
        assert.equal(parseExpenseInput(input).valid, false, input);
    }
    assert.equal(parseExpenseInput(Array(51).fill('1 tea').join('\n')).valid, false);
    assert.equal(parseExpenseInput(Array(50).fill('1 tea').join('\n')).valid, true);
});

test('separate mode categorizes each item and supports editable previews', () => {
    const parsed = parseExpenseInput('40 bread, 100 tea, 200 pizza, 20 cookie');
    const draft = buildExpenseDraft(parsed);
    assert.equal(draft.valid, true);
    assert.equal(draft.entries.length, 4);
    assert.ok(draft.entries.every(item => item.category === 'Food'));
    const edited = buildExpenseDraft(parsed, { edits: { 0: { amount: '45.25', description: 'bus', category: 'Transport' } } });
    assert.equal(edited.total, 365.25);
    assert.deepEqual(edited.entries[0], { description: 'bus', amount: 45.25, category: 'Transport' });
    assert.equal(buildExpenseDraft(parsed, { edits: { 0: { amount: '' } } }).valid, false);
});

test('combined mode creates exactly one named expense and handles mixed categories', () => {
    const parsed = parseExpenseInput('40 bread, 100 tea, 200 pizza, 20 cookie');
    const draft = buildExpenseDraft(parsed, { mode: 'combined', name: 'Evening snacks' });
    assert.deepEqual(draft.entries, [{ description: 'Evening snacks', amount: 360, category: 'Food' }]);
    assert.equal(buildExpenseDraft(parsed, { mode: 'combined' }).valid, false);
    const mixed = parseExpenseInput('100 taxi, 50 lunch');
    assert.equal(buildExpenseDraft(mixed, { mode: 'combined', name: 'Day out' }).entries[0].category, 'General');
    assert.equal(buildExpenseDraft(mixed, { mode: 'combined', name: 'Day out', category: 'Travel' }).entries[0].category, 'Travel');
    const large = parseExpenseInput('99999999 bread, 99999999 tea');
    assert.equal(buildExpenseDraft(large).valid, true);
    assert.equal(buildExpenseDraft(large, { mode: 'combined', name: 'Food' }).valid, false);
});
