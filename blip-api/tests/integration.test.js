import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import express from 'express';

const url = process.env.BLIP_TEST_DATABASE_URL;
test('social routes and migration against isolated PostgreSQL', { skip: !url }, async t => {
    const parsed = new URL(url);
    assert.ok(['localhost', '127.0.0.1'].includes(parsed.hostname), 'Tests require a local database');
    const schema = `blip_test_${Date.now()}`;
    const admin = new pg.Client({ connectionString: url });
    await admin.connect();
    await admin.query(`CREATE SCHEMA ${schema}`);
    parsed.searchParams.set('options', `-c search_path=${schema},public`);
    process.env.DATABASE_URL = parsed.toString();
    // Keep test push delivery entirely local, regardless of developer .env values.
    const { default: webpush } = await import('web-push');
    const keys = webpush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    process.env.VAPID_SUBJECT = 'https://example.test';
    const delivered = [];
    webpush.sendNotification = async (subscription,payload) => { delivered.push({ subscription, payload:JSON.parse(payload) }); return {statusCode:201}; };
    const { pool } = await import('../db/client.js');
    let server;
    try {
        await pool.query(`
            CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, last_seen_version TEXT, phone VARCHAR(15) UNIQUE, monthly_budget NUMERIC DEFAULT 1000, is_onboarded BOOLEAN DEFAULT TRUE);
            CREATE TABLE friendships (user_id TEXT REFERENCES users(id), friend_id TEXT REFERENCES users(id), UNIQUE(user_id,friend_id));
            CREATE TABLE groups (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, icon TEXT, type TEXT, created_by TEXT, is_active BOOLEAN DEFAULT TRUE);
            CREATE TABLE group_members (group_id UUID REFERENCES groups(id), user_id TEXT REFERENCES users(id), UNIQUE(group_id,user_id));
            CREATE TABLE group_expenses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), group_id UUID REFERENCES groups(id), paid_by TEXT REFERENCES users(id), amount NUMERIC(10,2), description TEXT, date TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW());
            CREATE TABLE expense_splits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), expense_id UUID REFERENCES group_expenses(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id), amount NUMERIC(10,2), UNIQUE(expense_id,user_id));
            CREATE TABLE group_payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), group_id UUID REFERENCES groups(id), paid_by TEXT REFERENCES users(id), paid_to TEXT REFERENCES users(id), amount NUMERIC(10,2), created_at TIMESTAMPTZ DEFAULT NOW());
            CREATE TABLE expenses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT REFERENCES users(id), amount NUMERIC(10,2), category TEXT, description TEXT, date TIMESTAMPTZ DEFAULT NOW());
            CREATE TABLE recurring_expenses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT, title TEXT, category TEXT, amount NUMERIC, due_day INT, created_at TIMESTAMPTZ DEFAULT NOW());
            CREATE TABLE recurring_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), recurring_id UUID REFERENCES recurring_expenses(id), user_id TEXT, month DATE, amount_paid NUMERIC, paid_at TIMESTAMPTZ);
            INSERT INTO users (id,name,phone) VALUES ('a','Alice','9876543210'),('b','Bob','+9779841234567'),('x','Outsider',NULL);
            INSERT INTO friendships VALUES ('a','b'),('b','a');
        `);
        const migration = await readFile(new URL('../migrations/001_social_fixes.sql', import.meta.url), 'utf8');
        const manualMigration = await readFile(new URL('../migrations/neon-manual.sql', import.meta.url), 'utf8');
        await pool.query(manualMigration);
        await pool.query(manualMigration);
        assert.equal((await pool.query("SELECT phone FROM users WHERE id='a'")).rows[0].phone, '9876543210');
        const app = express();
        app.use(express.json());
        // Authentication is stubbed only inside this isolated test harness.
        app.use((req, res, next) => { req.auth = () => ({ userId: req.headers['x-test-user'] || 'a' }); next(); });
        for (const [path, module] of [['/api','friends'],['/api/notifications','notifications'],['/api/recurring','recurring'],['/api/users','users'],['/api/expenses','expenses'],['/api/income','income']]) {
            const router = (await import(`../routes/${module}.js`)).default;
            router.stack = router.stack.filter(layer => layer.route);
            app.use(path, router);
        }
        app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
        server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
        const request = async (path, body, user = 'a', method = body ? 'POST' : 'GET') => {
            const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Test-User': user }, body: body ? JSON.stringify(body) : undefined });
            return { status: response.status, data: await response.json() };
        };
        assert.equal((await request('/users/search?phone=%2B919876543210', null, 'b')).data.id, 'a');
        assert.equal((await request('/users/search?phone=%2B9779841234567')).data.id, 'b');
        const group = await request('/groups', { name: 'Trip', memberIds: ['b'] });
        assert.equal(group.status, 200);
        const id = group.data.id;
        const expense = { description: 'Dinner', amount: 100, paidBy: 'a', splits: [{ userId: 'a', amount: 0 }, { userId: 'b', amount: 100 }] };
        let expenseId;
        await t.test('expense activity persists for everyone; actor is already read', async () => {
            const result = await request(`/groups/${id}/expenses`, expense);
            assert.equal(result.status, 200, JSON.stringify(result.data));
            expenseId = result.data.id;
            assert.equal((await request('/notifications', null, 'b')).data.filter(n => n.type === 'expense').length, 1);
            assert.equal((await request('/notifications')).data.filter(n => n.type === 'expense').length, 1);
            assert.ok((await request('/notifications')).data[0].read_at);
        });
        await t.test('new group details and expense list load immediately, including mixed settlement activity', async () => {
            const detail=await request(`/groups/${id}`);
            assert.equal(detail.status,200,JSON.stringify(detail.data));
            assert.equal(detail.data.activity[0].description,'Dinner');
            const list=await request(`/groups/${id}/expenses`);
            assert.equal(list.status,200,JSON.stringify(list.data));
            assert.ok(list.data.some(item=>item.id===expenseId));
            assert.equal(detail.data.totalSpent,100);
        });
        await t.test('monthly budget check-ins are once per account and retain previous months', async () => {
            const month=new Date().toISOString().slice(0,7);
            const previous=new Date();previous.setUTCDate(1);previous.setUTCMonth(previous.getUTCMonth()-1);
            const previousMonth=previous.toISOString().slice(0,7);
            await pool.query(`INSERT INTO monthly_budgets(user_id,month,amount,checked_in_at) VALUES('a',$1,700,NOW()) ON CONFLICT DO NOTHING`,[previousMonth+'-01']);
            await pool.query(`UPDATE monthly_budgets SET checked_in_at=NULL WHERE user_id='a' AND month=$1`,[month+'-01']);
            const claims=await Promise.all([request('/users/me/budget-check-in',{month}),request('/users/me/budget-check-in',{month})]);
            assert.deepEqual(claims.map(r=>r.data.showPrompt).sort(),[false,true]);
            assert.equal((await request('/users/me/budget-check-in',{month})).data.showPrompt,false);
            assert.equal((await request('/users/me/budget',{budget:2500,month},'a','PATCH')).status,200);
            const history=(await request(`/users/me/budgets?month=${month}`)).data;
            assert.equal(history.current.amount,2500);
            assert.equal(history.history.find(row=>row.month===previousMonth).amount,700);
            assert.equal((await request('/users/me/budget',{budget:900,month:'2000-01'},'a','PATCH')).status,400);
            const {budgetState}=await import('../utils/budgets.js');
            const next=new Date();next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+1);
            const nextState=await budgetState(pool.query.bind(pool),'a',next.toISOString().slice(0,7)+'-01');
            assert.equal(nextState.current.amount,2500);
            assert.equal(nextState.current.checked_in_at,null);
            const other=(await request(`/users/me/budgets?month=${month}`,null,'b')).data;
            assert.equal(other.history.some(row=>row.amount===2500),false);
        });
        await t.test('group totals filter bill dates, preserve shares, and exclude other periods', async () => {
            const group=(await request('/groups',{name:'Totals check',memberIds:['b']})).data.id;
            for (const [date,amount] of [['2025-12-31T23:59:59Z',100],['2026-01-01T00:00:00Z',200],['2026-02-01T00:00:00Z',300]]) {
                assert.equal((await request(`/groups/${group}/expenses`,{...expense,date,amount,splits:[{userId:'a',amount:amount/2},{userId:'b',amount:amount/2}]})).status,200);
            }
            const month=await request(`/groups/${group}/totals?from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z`);
            assert.equal(month.status,200,JSON.stringify(month.data));
            assert.equal(month.data.total,200);assert.equal(month.data.count,1);
            assert.equal(month.data.members.find(m=>m.id==='b').share,100);
            assert.equal(month.data.members.find(m=>m.id==='a').paid,200);
            assert.equal((await request(`/groups/${group}/totals?from=2026-01-01T00:00:00Z&to=2027-01-01T00:00:00Z`)).data.total,500);
            assert.equal((await request(`/groups/${group}/totals`)).data.total,600);
            assert.equal((await request(`/groups/${group}/totals?from=bad&to=bad`)).status,400);
            assert.equal((await request(`/groups/${group}/totals`,null,'x')).status,403);
            // Remove only this test's isolated data so cross-group settlement tests remain unchanged.
            await pool.query('DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM group_expenses WHERE group_id=$1)',[group]);
            await pool.query('DELETE FROM group_expenses WHERE group_id=$1',[group]);
        });
        await t.test('outsiders cannot create, edit or read group balances', async () => {
            assert.equal((await request(`/groups/${id}/expenses`, expense, 'x')).status, 403);
            assert.equal((await request(`/social-expenses/${expenseId}`, expense, 'x', 'PATCH')).status, 403);
            assert.equal((await request(`/groups/${id}/balances`, null, 'x')).status, 403);
        });
        await t.test('invalid split data fails atomically without notifications', async () => {
            const count = (await pool.query('SELECT count(*) FROM notifications')).rows[0].count;
            for (const splits of [[{ userId: 'b', amount: -100 }], [{ userId: 'b', amount: 50 }, { userId: 'b', amount: 50 }], [{ userId: 'x', amount: 100 }]]) {
                const result = await request(`/groups/${id}/expenses`, { ...expense, splits });
                assert.ok([400,403].includes(result.status));
            }
            assert.equal((await pool.query('SELECT count(*) FROM notifications')).rows[0].count, count);
            assert.equal((await pool.query('SELECT count(*) FROM group_expenses')).rows[0].count, '1');
        });
        await t.test('group changes preserve activity and cannot hide outstanding debts', async () => {
            assert.equal((await request(`/groups/${id}`, { name:'Weekend trip' }, 'a', 'PATCH')).status,200);
            assert.equal((await request('/notifications',null,'b')).data.filter(n=>n.type==='group_updated').length,1);
            assert.equal((await request(`/groups/${id}`,null,'a','DELETE')).status,409);
            assert.equal((await request(`/groups/${id}/members/b`,null,'a','DELETE')).status,409);
            assert.equal((await request(`/groups/${id}/members`,{userId:'x'})).status,403);
        });
        let first, second;
        await t.test('partial payments leave exact outstanding balance and direction', async () => {
            first = await request(`/groups/${id}/settle`, { toUserId: 'a', amount: 30, shouldLog: true }, 'b');
            assert.equal(first.status, 200, JSON.stringify(first.data));
            assert.equal(first.data.direction, 'paid');
            const groupDetail=await request(`/groups/${id}`);
            assert.equal(groupDetail.status,200,JSON.stringify(groupDetail.data));
            assert.ok(groupDetail.data.activity.some(item=>item.type==='settlement'));
            assert.ok(groupDetail.data.activity.some(item=>item.type==='expense'));
            assert.equal((await request('/friends/b/balance')).data.net, '70.00');
            const borrowerHistory = (await request('/friends/a/expenses', null, 'b')).data;
            assert.equal(borrowerHistory.find(e => e.id === expenseId).yourShare, 70);
            const lenderHistory = (await request('/friends/b/expenses')).data;
            assert.equal(lenderHistory.find(e => e.id === expenseId).isPaid, false);
            assert.equal((await request(`/groups/${id}/balances`)).data.balances[0].net, '70.00');

            second = await request('/friends/b/settle', { amount: 20 });
            assert.equal(second.data.direction, 'received');
            assert.equal((await request('/friends/b/balance')).data.net, '50.00');
        });
        await t.test('paid expense edits and deletion are rejected', async () => {
            assert.equal((await request(`/social-expenses/${expenseId}`, expense, 'a', 'PATCH')).status, 409);
            assert.equal((await request(`/social-expenses/${expenseId}`, null, 'a', 'DELETE')).status, 409);
        });
        await t.test('undo removes only its allocations, shadows and wallet entry', async () => {
            assert.equal((await request(`/social-payments/${first.data.masterId}`, null, 'b', 'DELETE')).status, 200);
            assert.equal((await request('/friends/b/balance')).data.net, '80.00');
            assert.equal((await pool.query('SELECT * FROM group_payments WHERE parent_payment_id = $1', [second.data.masterId])).rows.length, 1);
            assert.equal((await pool.query('SELECT * FROM expenses')).rows.length, 0);
            const history = await request('/friends/b/expenses');
            assert.equal(history.status, 200);
            const receipt = history.data.find(item => item.id === second.data.masterId);
            assert.equal(receipt.paidToName, 'You');
            assert.equal(receipt.yourShare, 20);
        });
        await t.test('social overview includes all outstanding pairwise balances', async () => {
            assert.deepEqual((await request('/social-summary')).data, { owed:80, owing:0 });
        });
        await t.test('group totals distinguish bill payments, shares and settlements', async () => {
            const totals = (await request(`/groups/${id}/totals`)).data;
            assert.equal(totals.total, 100);
            assert.equal(totals.count, 1);
            assert.equal(totals.members.find(m => m.id === 'a').paid, 100);
            assert.equal(totals.members.find(m => m.id === 'b').share, 100);
            assert.equal(totals.members.find(m => m.id === 'b').settlements_paid, 20);
            assert.equal((await request(`/groups/${id}/totals`, null, 'x')).status, 403);
        });
        await t.test('concurrent payments preserve allocations and carry excess as credit', async () => {
            const results = await Promise.all([request('/friends/b/settle', { amount: 60, payerId:'b' }), request('/friends/b/settle', { amount: 60, payerId:'b' })]);
            assert.deepEqual(results.map(r => r.status).sort(), [200,200]);
            assert.equal((await request('/friends/b/balance')).data.net, '-40.00');
            assert.equal((await pool.query("SELECT SUM(amount) AS amount FROM settlement_credits")).rows[0].amount,'40.00');
        });
        await t.test('any group member can record advances, reverse payments and undo without changing spending totals', async () => {
            await pool.query("INSERT INTO users(id,name) VALUES ('c','Cara'); INSERT INTO friendships VALUES ('a','c'),('c','a')");
            const group=(await request('/groups',{name:'Advances',memberIds:['b','c']})).data.id;
            assert.equal((await request(`/groups/${group}/settle`,{payerId:'b',receiverId:'c',amount:12.34},'x')).status,403);
            assert.equal((await request(`/groups/${group}/settle`,{payerId:'b',receiverId:'x',amount:12.34})).status,403);
            const paid=await request(`/groups/${group}/settle`,{payerId:'b',receiverId:'c',amount:120,shouldLog:true});
            assert.equal(paid.status,200,JSON.stringify(paid.data));
            assert.equal(paid.data.direction,'recorded');
            assert.equal((await pool.query('SELECT * FROM expenses WHERE settlement_payment_id=$1',[paid.data.masterId])).rows.length,0);
            let totals=(await request(`/groups/${group}/totals`)).data;
            assert.equal(totals.total,0);
            assert.equal(totals.members.find(m=>m.id==='b').balance,120);
            assert.equal(totals.members.find(m=>m.id==='c').balance,-120);
            assert.equal(totals.members.find(m=>m.id==='b').settlements_paid,120);
            assert.equal((await request(`/groups/${group}/members/b`,null,'a','DELETE')).status,409);
            const partial=await request(`/groups/${group}/settle`,{payerId:'c',receiverId:'b',amount:20},'b');
            assert.equal(partial.status,200,JSON.stringify(partial.data));
            assert.equal((await request(`/groups/${group}/balances`,null,'b')).data.balances[0].net,'100.00');
            assert.equal((await request(`/social-payments/${paid.data.masterId}`,null,'a','DELETE')).status,200);
            totals=(await request(`/groups/${group}/totals`)).data;
            assert.equal(totals.members.find(m=>m.id==='b').balance,-20);
            assert.equal((await request(`/social-payments/${partial.data.masterId}`,null,'b','DELETE')).status,200);
            assert.equal((await request(`/groups/${group}/balances`,null,'b')).data.balances.length,0);
        });
        await t.test('friend payments clear advances across groups and group undo reverses the whole recorded payment', async () => {
            const g1=(await request('/groups',{name:'First advance',memberIds:['b']})).data.id;
            const g2=(await request('/groups',{name:'Second advance',memberIds:['b']})).data.id;
            for (const group of [g1,g2]) assert.equal((await request(`/groups/${group}/settle`,{payerId:'a',receiverId:'b',amount:25})).status,200);
            const payment=await request('/friends/b/settle',{payerId:'b',amount:50});
            assert.equal(payment.status,200,JSON.stringify(payment.data));
            for (const group of [g1,g2]) {
                assert.equal((await request(`/groups/${group}/balances`)).data.balances.length,0);
                assert.equal((await request(`/groups/${group}`)).data.balance,'0.00');
            }
            const shadow=(await pool.query('SELECT id FROM group_payments WHERE parent_payment_id=$1 LIMIT 1',[payment.data.masterId])).rows[0].id;
            assert.equal((await request(`/social-payments/${shadow}`,null,'a','DELETE')).status,200);
            for (const group of [g1,g2]) assert.equal((await request(`/groups/${group}/balances`)).data.balances[0].net,'25.00');
        });
        await t.test('notifications are scoped to recipient and read state persists', async () => {
            const items = (await request('/notifications', null, 'b')).data;
            const ids = items.map(n => n.id);
            await request('/notifications/read', { ids }, 'a', 'PATCH');
            assert.ok((await request('/notifications', null, 'b')).data.filter(n => n.actor_id !== 'b').every(n => !n.read_at));
            await request('/notifications/read', { ids }, 'b', 'PATCH');
            assert.ok((await request('/notifications', null, 'b')).data.every(n => n.read_at));
        });
        await t.test('recurring generation and payment are safe under duplicate requests', async () => {
            await pool.query("INSERT INTO recurring_expenses (user_id,title,category,amount,due_day) VALUES ('a','Rent','Bills',100,1)");
            await Promise.all([request('/recurring/logs/generate', { month: '2026-10' }),request('/recurring/logs/generate', { month: '2026-10' })]);
            const logs = (await request('/recurring/logs?month=2026-10')).data;
            assert.equal(logs.length,1);
            const results = await Promise.all([request(`/recurring/logs/${logs[0].id}`, { amount_paid: 100 }, 'a','PATCH'),request(`/recurring/logs/${logs[0].id}`, { amount_paid: 100 }, 'a','PATCH')]);
            assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
            assert.equal((await pool.query("SELECT * FROM expenses WHERE description='Rent'")).rows.length,1);
            assert.equal((await pool.query("SELECT * FROM notifications WHERE type='wallet_insert' AND metadata->>'description'='Rent'")).rows.length,1);
        });
        await t.test('Web Push is queued with the event and sent without the recipient opening the app', async () => {
            const { createECDH, randomBytes } = await import('node:crypto');
            const device = createECDH('prime256v1'); device.generateKeys();
            const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test-device', keys: { p256dh: device.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
            assert.equal((await request('/notifications/subscriptions', subscription, 'b')).status, 200);
            const count = delivered.length;
            assert.equal((await request(`/groups/${id}/expenses`, { ...expense, description:'Breakfast' })).status,200);
            await (await import('../utils/push.js')).flushPush();
            assert.equal(delivered.length, count + 1);
            assert.match(delivered.at(-1).payload.body, /Breakfast/);
            assert.equal(delivered.at(-1).payload.title, "Expense added");
            assert.match(delivered.at(-1).payload.body, /Your share:/);
            assert.equal(delivered.at(-1).payload.url, '/?tab=activity');
            assert.ok((await pool.query('SELECT delivered_at FROM push_deliveries')).rows.every(row => row.delivered_at));
            assert.equal((await request('/notifications/subscriptions', {endpoint:subscription.endpoint},'b','DELETE')).status,200);
            assert.equal((await pool.query('SELECT * FROM push_subscriptions')).rows.length,0);
        });
        await t.test('personal expense and income writes are immediately available in private Activity', async () => {
            const result=await request('/expenses',{amount:17.50,description:'Wallet API test',category:'Food',date:new Date().toISOString()});
            assert.equal(result.status,200,JSON.stringify(result.data));
            const entry=(await request('/notifications')).data.find(n=>n.metadata?.expenseId===result.data.id);
            assert.equal(entry.type,'wallet_insert');
            assert.equal(entry.metadata.scope,'wallet');
            assert.ok(entry.read_at);
            assert.ok(!(await request('/notifications',null,'b')).data.some(n=>n.metadata?.expenseId===result.data.id));
            assert.equal((await request(`/expenses/${result.data.id}`,{amount:18},'a','PATCH')).status,200);
            assert.ok((await request('/notifications')).data.some(n=>n.type==='wallet_update'&&n.metadata?.expenseId===result.data.id));
            const income=await request('/income',{amount:5,description:'Income API test'});
            assert.equal(income.status,200);
            assert.ok((await request('/notifications')).data.some(n=>n.type==='wallet_insert'&&n.metadata?.expenseId===income.data.transaction.id));
        });
        await t.test('wallet edits and deletes remain in private activity history', async () => {
            const expense = (await pool.query("INSERT INTO expenses (user_id,amount,category,description) VALUES ('a',50,'Food','Lunch') RETURNING id")).rows[0];
            await pool.query('UPDATE expenses SET amount=60 WHERE id=$1',[expense.id]);
            await pool.query('DELETE FROM expenses WHERE id=$1',[expense.id]);
            const history = (await pool.query("SELECT type,user_id FROM notifications WHERE metadata->>'expenseId'=$1",[expense.id])).rows;
            assert.deepEqual(history.map(item=>item.type).sort(),['wallet_delete','wallet_insert','wallet_update']);
            assert.ok(history.every(item=>item.user_id==='a'));
        });
        await t.test('shared edits and deletes remain in activity after the bill is gone', async () => {
            const entry=await request('/friends/b/expenses',{...expense,description:'Coffee',amount:2,splits:[{userId:'a',amount:1},{userId:'b',amount:1}]});
            assert.equal(entry.status,200);
            assert.equal((await request(`/social-expenses/${entry.data.id}`,{...expense,description:'Coffee and tea',amount:4,splits:[{userId:'a',amount:2},{userId:'b',amount:2}]},'a','PATCH')).status,200);
            assert.equal((await request(`/social-expenses/${entry.data.id}`,null,'a','DELETE')).status,200);
            const history=(await pool.query("SELECT type FROM notifications WHERE user_id='b' AND metadata->>'expenseId'=$1",[entry.data.id])).rows.map(n=>n.type);
            assert.deepEqual(history.sort(),['expense','expense_deleted','expense_updated']);
        });
        await t.test('settled group archival keeps its historical bills', async () => {
            const empty=(await request('/groups',{name:'Finished trip',memberIds:['b']})).data.id;
            assert.equal((await request(`/groups/${empty}`,null,'a','DELETE')).status,200);
            assert.equal((await pool.query('SELECT is_active FROM groups WHERE id=$1',[empty])).rows[0].is_active,false);
            assert.equal((await request('/notifications',null,'b')).data.filter(n=>n.type==='group_archived').length,1);
        });
        await t.test('friend history includes shared bills paid by another group member without exposing unrelated bills', async () => {
            const group=(await request('/groups',{name:'Shared rides',memberIds:['b','c']})).data.id;
            const bill=await request(`/groups/${group}/expenses`,{description:'Taxi paid by Cara',amount:60,paidBy:'c',splits:[{userId:'a',amount:20},{userId:'b',amount:20},{userId:'c',amount:20}]});
            assert.equal(bill.status,200,JSON.stringify(bill.data));
            const list=(await request('/friends/b/expenses')).data;
            const entry=list.find(e=>e.id===bill.data.id);
            assert.ok(entry,'The shared bill appears immediately in friend history');
            assert.equal(entry.paidByName,'Cara');
            assert.equal(entry.isPaid,false);
            assert.equal(entry.yourShare,20);
            assert.ok(!(await request('/friends/b/expenses',null,'x')).data.some(e=>e.id===bill.data.id));
            const unrelated=await request(`/groups/${group}/expenses`,{description:'Only Alice and Cara',amount:10,paidBy:'a',splits:[{userId:'a',amount:5},{userId:'c',amount:5}]});
            assert.equal(unrelated.status,200);
            assert.ok(!(await request('/friends/b/expenses')).data.some(e=>e.id===unrelated.data.id));
        });
        await t.test('600 bill correction: preserve partial payments, explain the lock, then allow undo/edit/re-record', async () => {
            const group=(await request('/groups',{name:'Correction example',memberIds:['b']})).data.id;
            const original={description:'Dinner correction',amount:600,paidBy:'a',date:'2026-09-30T12:00:00Z',splits:[{userId:'a',amount:250},{userId:'b',amount:350}]};
            const bill=await request(`/groups/${group}/expenses`,original);
            assert.equal(bill.status,200);
            const payment=await request(`/groups/${group}/settle`,{payerId:'b',receiverId:'a',amount:300});
            assert.equal(payment.status,200);
            assert.equal((await request(`/groups/${group}/balances`)).data.balances[0].net,'50.00');
            const corrected={...original,splits:[{userId:'a',amount:300},{userId:'b',amount:300}]};
            const blocked=await request(`/social-expenses/${bill.data.id}`,corrected,'a','PATCH');
            assert.equal(blocked.status,409);
            assert.match(blocked.data.error,/Undo its payments/);
            assert.equal((await request(`/social-expenses/${bill.data.id}`,null,'a','DELETE')).status,409);
            assert.equal((await request(`/social-payments/${payment.data.masterId}`,null,'a','DELETE')).status,200);
            assert.equal((await request(`/social-expenses/${bill.data.id}`,corrected,'a','PATCH')).status,200);
            const rerecorded=await request(`/groups/${group}/settle`,{payerId:'b',receiverId:'a',amount:300});
            assert.equal((await request(`/groups/${group}/balances`)).data.balances.length,0);
            assert.equal((await request(`/social-payments/${rerecorded.data.masterId}`,null,'a','DELETE')).status,200);
            assert.equal((await request(`/social-expenses/${bill.data.id}`,null,'a','DELETE')).status,200);
            assert.equal((await request(`/groups/${group}/totals`)).data.total,0);
        });
        await t.test('same-day bills return newest recorded first; zero-value shares do not lock edits', async () => {
            const payload={description:'Older bill',amount:10,paidBy:'a',date:'2026-09-30T12:00:00Z',splits:[{userId:'a',amount:10},{userId:'b',amount:0}]};
            const older=await request('/friends/b/expenses',payload);
            const newer=await request('/friends/b/expenses',{...payload,description:'Newer bill'});
            const list=(await request('/friends/b/expenses')).data;
            assert.ok(list.findIndex(e=>e.id===newer.data.id)<list.findIndex(e=>e.id===older.data.id));
            assert.ok(list.find(e=>e.id===newer.data.id).createdAt);
            assert.equal((await request(`/social-expenses/${older.data.id}`,{...payload,description:'Corrected zero split'},'a','PATCH')).status,200);
            assert.equal((await request(`/social-expenses/${older.data.id}`,null,'a','DELETE')).status,200);
        });
        await t.test('activity pagination retains events sharing a timestamp without duplicates', async () => {
            await pool.query("INSERT INTO notifications(user_id,actor_id,type,message,read_at) SELECT 'x','x','test','Pagination test',NOW() FROM generate_series(1,55)");
            const first=(await request('/notifications',null,'x')).data;
            assert.equal(first.length,50);
            const last=first.at(-1);
            const second=(await request(`/notifications?before=${encodeURIComponent(last.created_at)}&beforeId=${last.id}`,null,'x')).data;
            assert.equal(second.length,5);
            assert.equal(new Set([...first,...second].map(n=>n.id)).size,55);
        });
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        await pool.end();
        await admin.query(`DROP SCHEMA ${schema} CASCADE`);
        await admin.end();
    }
});
