import test from 'node:test';
import assert from 'node:assert/strict';
import { cents, allocateSettlement } from '../utils/money.js';
import { normalizePhone } from '../utils/phone.js';

test('reject invalid, negative, nonfinite and fractional-cent money', () => {
    for (const value of [null, '', '10x', NaN, Infinity, -1, 0, 1.001]) assert.throws(() => cents(value));
    assert.equal(cents('10.25'), 1025);
});
test('partial settlement applies only the amount paid', () => {
    const plan = allocateSettlement([{ id: 's', amount: '100', paid_amount: '20', paid_by: 'b' }], 'a', 'b', 30);
    assert.equal(plan.allocations[0].applied, 30);
    assert.equal(plan.direction, 'paid');
});
test('overpayment preserves excess as credit without overallocating splits', () => {
    const splits = [{ amount: 100, paid_by: 'b' }, { amount: 40, paid_by: 'a' }];
    const over = allocateSettlement(splits, 'a', 'b', 120);
    assert.equal(over.credit,20);
    assert.equal(over.allocations[0].applied,100);
    assert.equal(allocateSettlement(splits, 'a', 'b', 60).allocations[0].applied, 60);
});
test('received settlements have correct payer and exact cent allocation', () => {
    const plan = allocateSettlement([{ amount: '0.10', paid_by: 'a' }, { amount: '0.20', paid_by: 'a' }], 'a', 'b', '0.30');
    assert.equal(plan.direction, 'received');
    assert.equal(plan.payer, 'b');
    assert.deepEqual(plan.allocations.map(s => s.applied), [0.1, 0.2]);
});
test('phone normalization supports existing Indian accounts and international numbers', () => {
    assert.equal(normalizePhone('9876543210'), '+919876543210');
    assert.equal(normalizePhone('+977 9841234567'), '+9779841234567');
    assert.equal(normalizePhone('+1 202 555 0123'), '+12025550123');
    assert.throws(() => normalizePhone('+91 12'));
});

test('advance payments allow either participant to pay without any existing debt', () => {
    const plan=allocateSettlement([], 'a', 'b', 42.25, 'b');
    assert.equal(plan.credit,42.25);
    assert.equal(plan.payer,'b');
    assert.equal(plan.receiver,'a');
    assert.deepEqual(plan.allocations,[]);
    assert.throws(()=>allocateSettlement([], 'a','b',10,'x'));
});
