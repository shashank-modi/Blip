import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationText} from '../utils/notificationText.js';
const event=(type,metadata={})=>({type,actor_id:'a',actor_name:'Alex',metadata,message:'Alex did something.'});
test('friend activity is personal to each recipient, including old received events',()=>{
 const e=event('friend_added',{friendId:'b',friendName:'Sam'});
 assert.deepEqual(notificationText(e,'b'),{title:'Friend added',message:'Alex added you as a friend.'});
 assert.equal(notificationText(e,'a').message,'You added Sam.');
 assert.equal(notificationText(event('friend_added'),'b').message,'Alex added you as a friend.');
});
test('bills show group, total and only the viewers share',()=>{
 const e=event('expense',{description:'Dinner',amount:600,groupName:'Trip',splits:[{userId:'a',amount:250},{userId:'b',amount:350}]});
 assert.equal(notificationText(e,'b').message,'Alex added “Dinner” (Rs. 600) in “Trip”. Your share: Rs. 350.');
 assert.equal(notificationText({...e,type:'expense_updated'},'a').title,'Expense updated');
 assert.equal(notificationText({...e,type:'expense_deleted'},'b').message,'Alex deleted “Dinner” (Rs. 600) in “Trip”.');
 assert.doesNotMatch(notificationText(e,'c').message,/Your share/);
});
test('payments identify payer and recipient even when recorded by someone else',()=>{
 const e=event('settlement',{payer:'b',payerName:'Sam',receiver:'c',receiverName:'Riya',amount:300});
 assert.equal(notificationText(e,'b').message,'Alex recorded a payment of Rs. 300 from you to Riya.');
 assert.equal(notificationText(e,'c').message,'Alex recorded a payment of Rs. 300 from Sam to you.');
 assert.equal(notificationText(e,'c').title,'Payment received');
 assert.equal(notificationText(e,'a').message,'You recorded a payment of Rs. 300 from Sam to Riya.');
 assert.equal(notificationText({...e,type:'settlement_undone'},'b').message,'Alex undid a payment of Rs. 300 from you to Riya.');
});
test('membership, wallet and fallback titles reflect the event without repeating the brand',()=>{
 assert.equal(notificationText(event('group_created',{groupName:'Trip'}),'b').message,'Alex created “Trip” and added you to the group.');
 assert.equal(notificationText(event('group_member_added',{memberId:'b',memberName:'Sam',groupName:'Trip'}),'b').message,'Alex added you to “Trip”.');
 assert.equal(notificationText(event('group_member_removed',{memberId:'c',memberName:'Riya',groupName:'Trip'}),'b').message,'Alex removed Riya from “Trip”.');
 assert.equal(notificationText(event('wallet_insert',{description:'Salary',amount:500,category:'Income'}),'a').title,'Income added');
 assert.equal(notificationText(event('unknown'),'b').title,'Activity update');
 assert.equal(notificationText(event('device_test'),'a').title,'Notifications enabled');
});
