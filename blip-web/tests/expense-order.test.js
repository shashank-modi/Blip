import test from 'node:test';
import assert from 'node:assert/strict';
import {newestExpenseFirst, groupExpenseHistory, hasAppliedPayments} from '../src/utils/expenseOrder.js';

const entries = [
    {id:'old-bill',type:'expense',amount:600,date:'2026-09-30T12:00:00Z',createdAt:'2026-09-30T09:00:00Z'},
    {id:'payment',type:'payment',amount:300,date:'2026-09-30T10:00:00Z',createdAt:'2026-09-30T10:00:00Z'},
    {id:'backdated-bill',type:'expense',amount:200,date:'2026-08-01T12:00:00Z',createdAt:'2026-09-30T11:00:00Z'},
    {id:'latest-payment',type:'payment',amount:50,date:'2026-10-01T09:00:00Z',createdAt:'2026-10-01T09:00:00Z'},
    {id:'latest-bill',type:'expense',amount:100,date:'2026-09-29T12:00:00Z',createdAt:'2026-10-01T10:00:00Z'},
];
const expected = ['latest-bill','latest-payment','backdated-bill','payment','old-bill'];

test('bills and settlements appear in recording order regardless of their expense dates',()=>{
    assert.deepEqual([...entries].sort(newestExpenseFirst).map(entry=>entry.id),expected);
    const edited = entries.map(entry=>entry.id==='old-bill'?{...entry,date:'2026-12-31T12:00:00Z'}:entry);
    assert.deepEqual(edited.sort(newestExpenseFirst).map(entry=>entry.id),expected);
});

test('day and month grouping preserve interleaved recording order and exclude settlements from bill totals',()=>{
    const groups=groupExpenseHistory(entries);
    const flattened=Object.values(groups).flatMap(month=>Object.values(month.days).flatMap(day=>day.items));
    assert.deepEqual(flattened.map(entry=>entry.id),expected);
    assert.deepEqual(Object.values(groups).map(month=>month.totalSpent),[100,800]);
    assert.equal(entries[2].date,'2026-08-01T12:00:00Z');
});

test('equal timestamps preserve API order rather than using random UUID order',()=>{
    const tied=[{id:'a',createdAt:'2026-09-30T10:00:00Z'},{id:'z',createdAt:'2026-09-30T10:00:00Z'}];
    assert.deepEqual([...tied].sort(newestExpenseFirst),tied);
    assert.deepEqual([{id:'legacy',date:'2026-09-29T12:00:00Z'},{id:'new',created_at:'2026-09-30T10:00:00Z'}].sort(newestExpenseFirst).map(entry=>entry.id),['new','legacy']);
});

test('only payments against nonzero borrowed shares lock a bill',()=>{
 const bill={paidBy:'a',splits:[{userId:'a',amount:250,paidAmount:250,isPaid:true},{userId:'b',amount:350,paidAmount:300,isPaid:false}]};
 assert.equal(hasAppliedPayments(bill),true);
 assert.equal(hasAppliedPayments({...bill,splits:[bill.splits[0],{userId:'b',amount:0,paidAmount:0,isPaid:true}]}),false);
});
