import test from 'node:test';
import assert from 'node:assert/strict';
import { splitAmount } from '../src/utils/splits.js';
const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
test('equal splits distribute rounding without negative shares', () => {
    assert.deepEqual(splitAmount(0.01, people).map(s => s.amount), [0.01,0,0]);
    assert.deepEqual(splitAmount(100, people).map(s => s.amount), [33.34,33.33,33.33]);
});
test('weighted splits exactly conserve the bill amount', () => {
    for (const amount of [0.02, 1.01, 100.99]) {
        const result = splitAmount(amount, people, { a: 1, b: 2, c: 3 });
        assert.equal(result.reduce((sum,s) => sum + Math.round(s.amount*100),0), Math.round(amount*100));
    }
    assert.deepEqual(splitAmount(10,people,{ a: -1 }), []);
});
