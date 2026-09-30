import test from 'node:test';
import assert from 'node:assert/strict';
import { monthKey, expensesForMonth, categoryTotals } from '../src/utils/month.js';
import { phoneNumber } from '../src/utils/phone.js';

test('monthly stats reset across the year boundary and retain all categories', () => {
    const expenses = [
        { date: new Date(2025, 11, 31, 23, 59).toISOString(), amount: 100, category: 'Food' },
        { date: new Date(2026, 0, 1, 0, 1).toISOString(), amount: 20, category: 'Health' },
        { date: new Date(2026, 0, 2).toISOString(), amount: 30, category: 'Entertainment' },
        { date: new Date(2026, 0, 2).toISOString(), amount: 1000, category: 'Income' },
    ];
    assert.equal(monthKey(new Date(2026, 0, 1)), '2026-01');
    const january = expensesForMonth(expenses, '2026-01');
    assert.deepEqual(categoryTotals(january), [{ category: 'Entertainment', total: 30 }, { category: 'Health', total: 20 }]);
    assert.deepEqual(expensesForMonth(expenses, '2026-02'), []);
});
test('country-specific validation and international pasted numbers', () => {
    assert.equal(phoneNumber('+9779841234567'), '+9779841234567');
    assert.equal(phoneNumber('020 7946 0018', 'GB'), '+442079460018');
    assert.equal(phoneNumber('12'), null);
});

test('invalid dates do not contaminate dashboard categories', () => {
    assert.deepEqual(expensesForMonth([{date:'invalid',amount:20,category:'Food'}], '2026-01'), []);
});
