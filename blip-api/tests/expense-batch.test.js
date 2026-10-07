import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateExpenseBatch } from '../utils/expenseBatch.js';

const entry = { amount: 40, description: 'bread', category: 'Food', date: '2026-10-07T12:00:00+05:45' };
test('batch validation normalizes names and dates and allows custom expense categories', () => {
    const result = validateExpenseBatch({ requestId: randomUUID(), expenses: [entry, { ...entry, category: 'Snacks' }] });
    assert.equal(result.entries[0].description, 'Bread');
    assert.equal(result.entries[0].date, '2026-10-07T06:15:00.000Z');
    assert.equal(result.entries[1].category, 'Snacks');
});

test('batch rejects malformed requests before writing any expenses', () => {
    const check = body => assert.throws(() => validateExpenseBatch(body), error => error.status === 400);
    for (const body of [null, {}, { requestId: 'x', expenses: [entry] }, { requestId: randomUUID(), expenses: [] }, { requestId: randomUUID(), expenses: Array(51).fill(entry) }]) check(body);
    for (const patch of [{ amount: 0 }, { amount: -1 }, { amount: '1.001' }, { amount: Infinity }, { amount: 100000000 }, { description: '' }, { description: 'a'.repeat(201) }, { description: 12 }, { category: ' Income ' }, { category: '' }, { category: 'a'.repeat(51) }, { date: 'bad' }, { date: null }]) {
        check({ requestId: randomUUID(), expenses: [entry, { ...entry, ...patch }] });
    }
});
