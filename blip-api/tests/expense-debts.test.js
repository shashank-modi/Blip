import test from 'node:test';
import assert from 'node:assert/strict';
import { expenseDebts } from '../utils/expenseDebts.js';
const shares = [{userId:'a',amount:300},{userId:'b',amount:300},{userId:'c',amount:300}];
test('multiple payers owe or receive only their net contribution', () => {
    assert.deepEqual(expenseDebts(900, shares, [{userId:'a',amount:600},{userId:'b',amount:300}]), [{userId:'c',paidBy:'a',amount:300}]);
    assert.deepEqual(expenseDebts(900, shares, [{userId:'a',amount:500},{userId:'b',amount:400}]), [{userId:'c',paidBy:'a',amount:200},{userId:'c',paidBy:'b',amount:100}]);
    assert.deepEqual(expenseDebts(900, shares, shares), []);
});
test('zero-share payer and fractional amounts conserve every cent', () => {
    assert.deepEqual(expenseDebts(.07,[{userId:'a',amount:.03},{userId:'b',amount:.04}],[{userId:'c',amount:.06},{userId:'a',amount:.01}]),[{userId:'a',paidBy:'c',amount:.02},{userId:'b',paidBy:'c',amount:.04}]);
});
test('invalid totals, negative contributions and duplicates cannot become debts', () => {
    for (const payers of [[],[{userId:'a',amount:899}],[{userId:'a',amount:-1},{userId:'b',amount:901}],[{userId:'a',amount:400},{userId:'a',amount:500}],[{userId:'a',amount:900.001}]]) assert.throws(() => expenseDebts(900,shares,payers));
});
