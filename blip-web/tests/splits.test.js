import test from 'node:test';
import assert from 'node:assert/strict';
import { splitAmount, splitExactAmount } from '../src/utils/splits.js';
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

test('zero weights stay zero and all-zero weights cannot be saved', () => {
    assert.deepEqual(splitAmount(100, people, {a:0,b:1,c:3}).map(s=>s.amount), [0,25,75]);
    assert.deepEqual(splitAmount(.01, people, {a:0,b:1,c:1}).map(s=>s.amount), [0,.01,0]);
    assert.deepEqual(splitAmount(10, people, {a:0,b:0,c:0}), []);
    assert.deepEqual(splitAmount(10, people, {a:Infinity}), []);
});
test('exact amounts fix only entered values and calculate the rest to the cent', () => {
    assert.deepEqual(splitExactAmount(100, people, {a:'20'}).splits.map(s=>s.amount), [20,40,40]);
    assert.deepEqual(splitExactAmount(100.01, people, {a:'20'}).splits.map(s=>s.amount), [20,40.01,40]);
    assert.deepEqual(splitExactAmount(100, people, {a:'0',b:'25'}).splits.map(s=>s.amount), [0,25,75]);
    assert.deepEqual(splitExactAmount(100, people, {a:'100'}).splits.map(s=>s.amount), [100,0,0]);
    assert.deepEqual(splitExactAmount(100, people, {a:''}).splits.map(s=>s.amount), [33.34,33.33,33.33]);
});
test('exact splits recalculate after participant and total changes, ignoring excluded people', () => {
    assert.deepEqual(splitExactAmount(100, people.slice(0,2), {a:20,c:999}).splits.map(s=>s.amount), [20,80]);
    assert.deepEqual(splitExactAmount(120, people, {a:20}).splits.map(s=>s.amount), [20,50,50]);
    assert.deepEqual(splitExactAmount(10, [people[1]], {}).splits, [{userId:'b',amount:10}]);
});
test('invalid or over-allocated exact splits block saving without changing fixed amounts', () => {
    for (const fixed of [{a:-1},{a:100.01},{a:0.001},{a:'nope'},{a:Infinity},{a:10,b:20,c:30}]) {
        assert.ok(splitExactAmount(100,people,fixed).error);
        assert.deepEqual(splitExactAmount(100,people,fixed).splits, []);
    }
    assert.ok(splitExactAmount(0,people,{}).error);
    assert.ok(splitExactAmount(1.001,people,{}).error);
    assert.ok(splitExactAmount(100,[],{}).error);
    assert.equal(splitExactAmount(100,people,{a:0,b:25,c:75}).error, '');
});
