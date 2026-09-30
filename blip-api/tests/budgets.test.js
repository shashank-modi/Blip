import test from 'node:test';
import assert from 'node:assert/strict';
import { currentBudgetMonth } from '../utils/budgets.js';

test('budget month follows local calendar boundaries without allowing historical rewrites', () => {
    const edge=new Date('2026-12-31T20:00:00Z');
    assert.equal(currentBudgetMonth('2027-01',edge),'2027-01-01');
    assert.equal(currentBudgetMonth('2026-12',edge),'2026-12-01');
    assert.throws(()=>currentBudgetMonth('2026-11',edge),{status:400});
    assert.throws(()=>currentBudgetMonth('2027-13',edge),{status:400});
    const january=new Date('2027-01-15T12:00:00Z');
    assert.equal(currentBudgetMonth(undefined,january),'2027-01-01');
    assert.throws(()=>currentBudgetMonth('2026-12',january),{status:400});
});
