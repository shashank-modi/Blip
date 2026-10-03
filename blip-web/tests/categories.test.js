import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestCategory } from '../src/utils/categories.js';
test('recognizes common local foods, transport, merchants and everyday expenses', () => {
    for (const [description, category] of [
        ['chicken momos', 'Food'], ['Chiya and khaja', 'Food'], ['dal-bhat', 'Food'], ['Café lunch', 'Food'], ['Bhat Bhateni groceries', 'Food'],
        ['Pathao to office', 'Transport'], ['inDrive', 'Transport'], ['Taxi fare', 'Transport'], ['scooter repair', 'Transport'],
        ['Daraz shoes', 'Shopping'], ['monthly room rent', 'Housing'], ['dentist check-up', 'Medical'], ['Worldlink recharge', 'Bills'], ['haircut', 'Personal Care'], ['gym subscription', 'Personal Care'], ['cable', 'Shopping'], ['chocolate', 'Food'],
        ['QFX movie tickets', 'Entertainment'], ['Amazon Prime subscription', 'Entertainment'], ['Amazon charger', 'Shopping'],
        ['water bottle', 'Food'], ['water bill', 'Bills'], ['phone case', 'Shopping'], ['phone bill', 'Bills'],
    ]) assert.equal(suggestCategory(description), category, description);
});
test('does not match fragments inside unrelated words or guess unknown descriptions', () => {
    for (const description of ['corporate', 'steamroller', 'parents', 'cabinet', 'something unfamiliar', '']) assert.equal(suggestCategory(description), null, description);
});
test('reuses the latest matching expense category, including custom corrections', () => {
    const history = [{description:'Lunch at work',category:'Food',date:'2026-09-01'}, {description:'Lunch at work',category:'Work meals',date:'2026-10-01'}];
    assert.equal(suggestCategory('LUNCH AT WORK!', history), 'Work meals');
    assert.equal(suggestCategory('coffee', [{description:'coffee',category:'Income'}]), 'Food');
    assert.equal(suggestCategory('rice', [{description:'rice',category:'General'}]), 'Food');
    assert.equal(suggestCategory('rent', [{description:'rental car',category:'Transport'}]), 'Housing');
});
