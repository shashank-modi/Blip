import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query } from '../db/client.js';

import { transaction } from '../db/transaction.js';
import { normalizePhone } from '../utils/phone.js';
import { cents, allocateSettlement } from '../utils/money.js';
import { notify } from '../utils/notifications.js';
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const router = express.Router();
router.use(requireAuth);


async function groupForChange(query, groupId, userId) {
    const group = (await query('SELECT * FROM groups WHERE id=$1 FOR UPDATE', [groupId])).rows[0];
    if (!group || !(await query('SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2', [groupId,userId])).rows.length) fail('Access denied', 403);
    if (!group.is_active) fail('This group is archived', 409);
    return group;
}
async function groupRecipients(query, groupId) {
    return (await query('SELECT user_id FROM group_members WHERE group_id=$1', [groupId])).rows.map(row => row.user_id);
}
async function requireSettledGroup(query, groupId, memberId = null) {
    const balances = await query(`SELECT LEAST(e.paid_by,s.user_id), GREATEST(e.paid_by,s.user_id)
        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
        WHERE e.group_id=$1 AND e.paid_by!=s.user_id AND s.is_paid=FALSE
        AND ($2::text IS NULL OR e.paid_by=$2 OR s.user_id=$2)
        GROUP BY LEAST(e.paid_by,s.user_id), GREATEST(e.paid_by,s.user_id)
        HAVING SUM(CASE WHEN e.paid_by<s.user_id THEN s.amount-s.paid_amount ELSE s.paid_amount-s.amount END) != 0`, [groupId,memberId]);
    if (balances.rows.length) fail('Settle outstanding balances before removing a member or archiving this group', 409);
}


router.get('/users/search', async (req, res, next) => {
    try {
        const phone = normalizePhone(req.query.phone);
        const legacyPhone = /^\+91[0-9]{10}$/.test(phone) ? phone.slice(3) : null;
        const result = await query('SELECT id, name, phone FROM users WHERE phone = $1 OR phone = $2', [phone, legacyPhone]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});


//Friends
router.get('/social-summary', async (req, res, next) => {
    try {
        const result = await query(`WITH debts AS (
            SELECT CASE WHEN e.paid_by=$1 THEN s.user_id ELSE e.paid_by END AS other,
                SUM(CASE WHEN e.paid_by=$1 THEN s.amount-s.paid_amount ELSE -(s.amount-s.paid_amount) END) AS net
            FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
            WHERE s.is_paid=FALSE AND s.user_id!=e.paid_by AND (e.paid_by=$1 OR s.user_id=$1)
            GROUP BY 1
        ) SELECT COALESCE(SUM(GREATEST(net,0)),0) AS owed, COALESCE(SUM(GREATEST(-net,0)),0) AS owing FROM debts`, [getUserId(req)]);
        res.json({ owed: Number(result.rows[0].owed), owing: Number(result.rows[0].owing) });
    } catch (error) { next(error); }
});

router.get('/friends', async (req, res, next) => {
    try {
        const userId = getUserId(req);

        const friendsQuery = `
            SELECT 
                f.friend_id as id,
                u.name,
                UPPER(LEFT(u.name, 1) || COALESCE(LEFT(SPLIT_PART(u.name, ' ', 2), 1), '')) as initials,
                (
                    -- 1. Money THEY owe ME (Lent & Unpaid) -> POSITIVE
                    COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.paid_by = $1          -- I paid the bill
                        AND s.user_id = f.friend_id   -- They are the ones who owe
                        AND s.is_paid = FALSE         -- It hasn't been settled yet
                    ), 0)
                    
                    -- 2. Money I owe THEM (Borrowed & Unpaid) -> NEGATIVE
                    - COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.paid_by = f.friend_id -- They paid the bill
                        AND s.user_id = $1            -- I am the one who owes
                        AND s.is_paid = FALSE         -- I haven't settled it yet
                    ), 0)
                ) as total_balance
            FROM friendships f
            JOIN users u ON f.friend_id = u.id
            WHERE f.user_id = $1
        `;

        const result = await query(friendsQuery, [userId]);

        res.json(result.rows.map(r => ({
            id: r.id,
            name: r.name,
            initials: r.initials,
            balance: parseFloat(r.total_balance || 0).toFixed(2)
        })));
    } catch (err) {
        next(err);
    }
});

//Add a friend
router.post('/friends', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { friendId } = req.body;
        if (userId === friendId) return res.status(400).json({ error: 'Cannot add yourself' });

        const friendExists = await query('SELECT id FROM users WHERE id = $1', [friendId]);
        if (friendExists.rows.length === 0) return res.status(404).json({ error: 'Friend not found in system' });

        await transaction(async query => {
            const added = await query('INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id', [userId, friendId]);
            await query('INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [friendId, userId]);
            if (added.rows.length) await notify(query, userId, [friendId], 'friend_added', 'connected with a friend.', { friendId, scope: 'shared' });
        });

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

//Remove Friend
router.delete('/friends/:friendId', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { friendId } = req.params;
        await query('DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2', [userId, friendId]);
        await query('DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2', [friendId, userId]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

//Groups
router.get('/groups', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const result = await query(`
            SELECT 
                g.id, 
                g.name, 
                g.icon, 
                g.type,
                -- 1. FETCH MEMBERS: Stays the same
                (
                    SELECT json_agg(json_build_object(
                        'id', u.id, 
                        'name', u.name, 
                        'initials', UPPER(LEFT(u.name, 1) || COALESCE(LEFT(SPLIT_PART(u.name, ' ', 2), 1), ''))
                    ))
                    FROM group_members gm 
                    JOIN users u ON gm.user_id = u.id
                    WHERE gm.group_id = g.id
                ) as members,
                -- 2. FETCH TOTAL SPENT: Stays the same
                COALESCE((SELECT SUM(amount) FROM group_expenses WHERE group_id = g.id), 0) as total_spent,
                -- 3. ITEMIZED BALANCE CALCULATION
                (
                    -- A. Money OTHERS owe ME in this group (+)
                    COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.group_id = g.id 
                        AND e.paid_by = $1          -- I paid the bill
                        AND s.user_id != $1         -- Someone else owes me
                        AND s.is_paid = FALSE       -- They haven't settled yet
                    ), 0)
                    
                    -- B. Money I owe OTHERS in this group (-)
                    - COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.group_id = g.id 
                        AND e.paid_by != $1         -- Someone else paid
                        AND s.user_id = $1          -- I am the one who owes
                        AND s.is_paid = FALSE       -- I haven't settled yet
                    ), 0)
                ) as net_balance
            FROM groups g
            JOIN group_members my_gm ON my_gm.group_id = g.id
            WHERE my_gm.user_id = $1 AND g.is_active = TRUE
        `, [userId]);

        const groups = result.rows.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.icon,
            type: g.type,
            members: g.members || [],
            balance: parseFloat(g.net_balance || 0).toFixed(2),
            totalSpent: parseFloat(g.total_spent || 0)
        }));

        res.json(groups);
    } catch (err) {
        next(err);
    }
});

router.post('/groups', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { name, icon, type, memberIds } = req.body;
        if (typeof name !== 'string' || !name.trim() || name.length > 100 || !Array.isArray(memberIds)) return res.status(400).json({ error: 'A group name and member list are required' });

        const groupId = await transaction(async query => {
        const known = (await query('SELECT friend_id FROM friendships WHERE user_id=$1', [userId])).rows.map(f => f.friend_id);
        if (memberIds.some(id => id !== userId && !known.includes(id))) fail('Add group members as friends first', 403);
        const gRes = await query('INSERT INTO groups (name, icon, type, created_by) VALUES ($1, $2, $3, $4) RETURNING id', [name, icon || '🏷️', type || 'General', userId]);
        const groupId = gRes.rows[0].id;

        const allMembers = Array.from(new Set([userId, ...(memberIds || [])]));
        for (const mId of allMembers) {
            await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [groupId, mId]);
        }
        await notify(query, userId, allMembers, 'group_created', `created the group “${name}”.`, { groupId, scope: 'shared' });
        return groupId;
        });

        res.json({ id: groupId });
    } catch (err) {
        next(err);
    }
});

router.delete('/groups/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req), id = req.params.id;
        await transaction(async query => {
            const group = await groupForChange(query, id, userId);
            await requireSettledGroup(query, id);
            await query('UPDATE groups SET is_active=FALSE WHERE id=$1', [id]);
            await notify(query, userId, await groupRecipients(query,id), 'group_archived', `archived “${group.name}”.`, { groupId:id, scope:'shared' });
        });
        res.json({ success:true });
    } catch (err) { next(err); }
});

router.get('/groups/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;

        const result = await query(`
            SELECT 
                g.*,
                -- 1. Calculate Total Spent in THIS group (Bills only)
                COALESCE((SELECT SUM(amount) FROM group_expenses WHERE group_id = g.id), 0) as total_spent,
                
                -- 2. ITEMIZED BALANCE: Only look at Unpaid Splits
                (
                    -- Money others owe ME in this group (+)
                    COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.group_id = g.id 
                        AND e.paid_by = $2        -- I paid the bill
                        AND s.user_id != $2       -- Someone else owes
                        AND s.is_paid = FALSE     -- Not yet settled
                    ), 0)
                    
                    -- Money I owe OTHERS in this group (-)
                    - COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.group_id = g.id 
                        AND e.paid_by != $2       -- Someone else paid
                        AND s.user_id = $2        -- I owe
                        AND s.is_paid = FALSE     -- Not yet settled
                    ), 0)
                ) as user_balance,

                -- 3. MEMBERS LIST
                (
                    SELECT json_agg(json_build_object(
                        'id', u.id, 
                        'name', u.name, 
                        'initials', UPPER(LEFT(u.name, 1) || COALESCE(LEFT(SPLIT_PART(u.name, ' ', 2), 1), ''))
                    ))
                    FROM group_members gm 
                    JOIN users u ON gm.user_id = u.id
                    WHERE gm.group_id = g.id
                ) as members,

                -- 4. ACTIVITY FEED: Combined Bills and "Shadow" Settlements
                (
                    SELECT json_agg(activity_item) FROM (
                        -- Actual Bills
                        SELECT 
                            e.id, e.group_id, (SELECT name FROM groups WHERE id=e.group_id) AS group_name, e.description, e.amount, e.created_at, 'expense' as type,
                            u.name as paid_by_name
                        FROM group_expenses e
                        JOIN users u ON e.paid_by = u.id
                        WHERE e.group_id = g.id
                        
                        UNION ALL
                        
                        -- Shadow Settlement Records (The Summary Transactions)
                        SELECT 
                            p.id, p.group_id, (SELECT name FROM groups WHERE id=p.group_id) AS group_name, 'Settlement' as description, p.amount, p.created_at, 'settlement' as type,
                            u.name as paid_by_name
                        FROM group_payments p
                        JOIN users u ON p.paid_by = u.id
                        WHERE p.group_id = g.id 
                        AND p.payment_type = 'shadow' -- ONLY show group-specific summaries
                        
                        ORDER BY created_at DESC
                        LIMIT 20
                    ) activity_item
                ) as activity
            FROM groups g
            JOIN group_members mem ON g.id = mem.group_id
            WHERE g.id = $1 AND mem.user_id = $2
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Group not found or access denied' });
        }

        const g = result.rows[0];
        res.json({
            ...g,
            balance: parseFloat(g.user_balance || 0).toFixed(2),
            totalSpent: parseFloat(g.total_spent || 0),
            activity: g.activity || [],
            members: g.members || [],
        });
    } catch (err) {
        next(err);
    }
});

router.get('/groups/:id/totals', async (req, res, next) => {
    try {
        const userId = getUserId(req), groupId = req.params.id;
        if (!(await query('SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2', [groupId,userId])).rows.length) return res.status(403).json({ error: 'Access denied' });
        const {from,to}=req.query;
        if ((from || to) && (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(from)>=Date.parse(to))) return res.status(400).json({error:'Invalid totals date range'});
        const params=[groupId,from || null,to || null];
        const result = await query(`WITH bills AS (
            SELECT * FROM group_expenses WHERE group_id=$1 AND ($2::timestamptz IS NULL OR date >= $2::timestamptz) AND ($3::timestamptz IS NULL OR date < $3::timestamptz)
        ), payments AS (
            SELECT * FROM group_payments WHERE group_id=$1 AND payment_type='shadow' AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz) AND ($3::timestamptz IS NULL OR created_at < $3::timestamptz)
        ), people AS (
            SELECT user_id FROM group_members WHERE group_id=$1
            UNION SELECT paid_by FROM group_expenses WHERE group_id=$1
            UNION SELECT s.user_id FROM expense_splits s JOIN group_expenses e ON e.id=s.expense_id WHERE e.group_id=$1
        ) SELECT u.id, u.name,
            COALESCE((SELECT SUM(e.amount) FROM bills e WHERE e.group_id=$1 AND e.paid_by=u.id),0) AS paid,
            COALESCE((SELECT SUM(s.amount) FROM expense_splits s JOIN bills e ON e.id=s.expense_id WHERE e.group_id=$1 AND s.user_id=u.id),0) AS share,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.group_id=$1 AND p.payment_type='shadow' AND p.paid_by=u.id),0) AS settlements_paid,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.group_id=$1 AND p.payment_type='shadow' AND p.paid_to=u.id),0) AS settlements_received,
            COALESCE((SELECT SUM(s.amount-s.paid_amount) FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e WHERE e.group_id=$1 AND e.paid_by=u.id AND s.user_id!=u.id AND s.is_paid=FALSE),0)
            - COALESCE((SELECT SUM(s.amount-s.paid_amount) FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e WHERE e.group_id=$1 AND s.user_id=u.id AND e.paid_by!=u.id AND s.is_paid=FALSE),0) AS balance
            FROM people JOIN users u ON u.id=people.user_id ORDER BY u.name`, params);
        const totals = await query('SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM group_expenses WHERE group_id=$1 AND ($2::timestamptz IS NULL OR date >= $2::timestamptz) AND ($3::timestamptz IS NULL OR date < $3::timestamptz)', params);
        res.json({ total: Number(totals.rows[0].total), count: Number(totals.rows[0].count), members: result.rows.map(m => ({ ...m, paid: Number(m.paid), share: Number(m.share), settlements_paid: Number(m.settlements_paid), settlements_received: Number(m.settlements_received), balance: Number(m.balance) })) });
    } catch (error) { next(error); }
});

router.patch('/groups/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req), id = req.params.id;
        const { name, icon } = req.body;
        if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100)) fail('Enter a group name of up to 100 characters');
        if (icon !== undefined && (typeof icon !== 'string' || icon.length > 32)) fail('Invalid group icon');
        await transaction(async query => {
            const group = await groupForChange(query,id,userId);
            const nextName = name === undefined ? group.name : name.trim();
            const nextIcon = icon === undefined ? group.icon : icon;
            if (nextName === group.name && nextIcon === group.icon) return;
            await query('UPDATE groups SET name=$1,icon=$2 WHERE id=$3',[nextName,nextIcon,id]);
            await notify(query,userId,await groupRecipients(query,id),'group_updated',`updated “${nextName}”.`,{groupId:id,scope:'shared'});
        });
        res.json({success:true});
    } catch (err) { next(err); }
});

router.post('/groups/:id/members', async (req, res, next) => {
    try {
        const actorId=getUserId(req), id=req.params.id, userId=req.body.userId;
        await transaction(async query => {
            const group=await groupForChange(query,id,actorId);
            const members=await groupRecipients(query,id);
            if (members.includes(userId)) return;
            if (!(await query('SELECT 1 FROM friendships WHERE user_id=$1 AND friend_id=$2',[actorId,userId])).rows.length) fail('Add this person as a friend first',403);
            const person=(await query('SELECT name FROM users WHERE id=$1',[userId])).rows[0];
            await query('INSERT INTO group_members (group_id,user_id) VALUES ($1,$2)',[id,userId]);
            await notify(query,actorId,[...members,userId],'group_member_added',`added ${person.name} to “${group.name}”.`,{groupId:id,scope:'shared'});
        });
        res.json({success:true});
    } catch (err) { next(err); }
});

router.delete('/groups/:id/members/:userId', async (req, res, next) => {
    try {
        const actorId=getUserId(req), {id,userId}=req.params;
        await transaction(async query => {
            const group=await groupForChange(query,id,actorId);
            const members=await groupRecipients(query,id);
            if (!members.includes(userId)) return;
            if (members.length === 1) fail('Archive the group instead of removing its last member',409);
            await requireSettledGroup(query,id,userId);
            const person=(await query('SELECT name FROM users WHERE id=$1',[userId])).rows[0];
            await query('DELETE FROM group_members WHERE group_id=$1 AND user_id=$2',[id,userId]);
            await notify(query,actorId,members,'group_member_removed',`removed ${person.name} from “${group.name}”.`,{groupId:id,scope:'shared'});
        });
        res.json({success:true});
    } catch (err) { next(err); }
});

// --- EXPENSES ---
const getExpenses = async (groupId, friendId, userId) => {
    // We adjust the payment filter based on whether we are in a Group or Personal view
    const paymentTypeFilter = groupId ? 'shadow' : 'master';

    let q = `
        SELECT 
            e.id, e.group_id, (SELECT name FROM groups WHERE id=e.group_id) AS group_name,
            e.description as desc, 
            e.amount, 
            e.paid_by, 
            u.name as paid_by_name, 
            NULL as paid_to_name, NULL::text as paid_to,
            e.date, e.created_at,
            'expense' as type,
            NULL as payment_type,
            -- Check if MY specific split is paid
            NOT EXISTS (
                SELECT 1 FROM expense_splits s
                WHERE s.expense_id = e.id AND s.is_paid = FALSE AND s.amount > s.paid_amount
                ${groupId ? 'AND s.user_id != e.paid_by' : 'AND ((e.paid_by = $1 AND s.user_id = $2) OR (e.paid_by = $2 AND s.user_id = $1) OR (e.paid_by NOT IN ($1,$2) AND s.user_id IN ($1,$2)))'}
            ) as is_paid,
            (
                SELECT json_agg(json_build_object(
                    'userId', s.user_id, 
                    'amount', s.amount, 
                    'name', u2.name,
                    'paidAmount', s.paid_amount,
                    'isPaid', s.is_paid -- Include is_paid for every member
                ))
                FROM expense_splits s 
                LEFT JOIN users u2 ON s.user_id = u2.id 
                WHERE s.expense_id = e.id
            ) as splits
        FROM group_expenses e
        LEFT JOIN users u ON e.paid_by = u.id
        ${groupId ? 'WHERE e.group_id = $2 AND EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id=e.group_id AND gm.user_id=$1)' : (friendId ? 'WHERE (e.paid_by=$1 OR EXISTS (SELECT 1 FROM expense_splits s WHERE s.expense_id=e.id AND s.user_id=$1)) AND (e.paid_by=$2 OR EXISTS (SELECT 1 FROM expense_splits s WHERE s.expense_id=e.id AND s.user_id=$2))' : '')}

        UNION ALL

        SELECT 
            p.id, p.group_id, (SELECT name FROM groups WHERE id=p.group_id) AS group_name, 'Settlement' as desc, p.amount, p.paid_by,
            u.name as paid_by_name, 
            u2.name as paid_to_name, p.paid_to,
            p.created_at as date, p.created_at, 'payment' as type,
            p.payment_type,
            TRUE as is_paid, -- Payments are always "paid"
            NULL as splits
        FROM group_payments p
        LEFT JOIN users u ON p.paid_by = u.id
        LEFT JOIN users u2 ON p.paid_to = u2.id
        WHERE 
            ${groupId
            ? 'p.group_id = $2 AND p.payment_type = $3'
            : '((p.paid_by = $1 AND p.paid_to = $2) OR (p.paid_by = $2 AND p.paid_to = $1)) AND p.payment_type = $3'}
        
        ORDER BY created_at DESC, id DESC
    `;

    // Adjust params to match the $1, $2 logic
    const params = groupId
        ? [userId, groupId, paymentTypeFilter]
        : (friendId ? [userId, friendId, paymentTypeFilter] : []);

    const result = await query(q, params);

    return result.rows.map(e => {
        const splits = e.splits || [];
        const mySplit = splits.find(s => s.userId === userId);

        return {
            id: e.id,
            groupId: e.group_id, groupName: e.group_name,
            desc: e.desc,
            amount: parseFloat(e.amount),
            paidBy: e.paid_by,
            paidTo: e.paid_to,
            paidByName: e.paid_by === userId ? 'You' : e.paid_by_name,
            paidToName: e.paid_to === userId ? 'You' : (e.paid_to_name || null),
            date: e.date, createdAt: e.created_at,
            type: e.type,
            paymentType: e.payment_type,
            isPaid: e.is_paid, // This tells the UI to show the "Settled" status
            splits: splits.map(s => ({
                ...s,
                amount: parseFloat(s.amount),
                name: s.name || 'Former Member'
            })),
            yourShare: e.type === 'payment'
                ? (e.paid_by === userId ? -parseFloat(e.amount) : (e.paid_to === userId ? parseFloat(e.amount) : 0))
                : (mySplit ? Math.max(0, parseFloat(mySplit.amount) - parseFloat(mySplit.paidAmount || 0)) : 0)
        };
    });
};

router.get('/friends/:friendId/expenses', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const expenses = await getExpenses(null, req.params.friendId, userId);
        res.json(expenses);
    } catch (err) { next(err); }
});

router.get('/groups/:id/expenses', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const memCheck = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, userId]);
        if (memCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

        const expenses = await getExpenses(req.params.id, null, userId);
        res.json(expenses);
    } catch (err) { next(err); }
});

const saveExpense = async (groupId, req, res, next, expenseIdToUpdate = null) => {
    try {
        const userId = getUserId(req);
        const { description, paidBy, date } = req.body;
        const amount = cents(req.body.amount) / 100;
        const payer = paidBy === 'me' ? userId : paidBy;
        if (typeof description !== 'string' || !description.trim()) fail('Description required');
        if (date && !Number.isFinite(Date.parse(date))) fail('Invalid date');
        if (!Array.isArray(req.body.splits) || !req.body.splits.length) fail('Splits required');
        const splits = req.body.splits.map(s => ({ userId: (s.userId || s.user_id) === 'me' ? userId : (s.userId || s.user_id), amount: cents(s.amount, true) / 100 }));
        if (new Set(splits.map(s => s.userId)).size !== splits.length) fail('Duplicate split participant');
        if (splits.reduce((n, s) => n + cents(s.amount, true), 0) !== cents(amount)) fail('Splits must equal the expense total');
        const id = await transaction(async query => {
            let targetGroup = groupId;
            let existing;
            if (expenseIdToUpdate) {
                existing = (await query('SELECT * FROM group_expenses WHERE id = $1 FOR UPDATE', [expenseIdToUpdate])).rows[0];
                if (!existing) fail('Expense not found', 404);
                targetGroup = existing.group_id;
                const participants = await query('SELECT user_id FROM expense_splits WHERE expense_id = $1', [expenseIdToUpdate]);
                if (!targetGroup && existing.paid_by !== userId && !participants.rows.some(s => s.user_id === userId)) fail('Access denied', 403);
                const paid = await query('SELECT 1 FROM expense_splits WHERE expense_id = $1 AND user_id != $2 AND amount > 0 AND (paid_amount > 0 OR is_paid = TRUE)', [expenseIdToUpdate, existing.paid_by]);
                if (paid.rows.length) fail('This bill has payments applied. Undo its payments from the bill history, edit the bill, then record the payments again.', 409);
            }
            let allowed;
            if (targetGroup) {
                await groupForChange(query, targetGroup, userId);
                allowed = (await query('SELECT gm.user_id FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.group_id = $1 AND g.is_active = TRUE', [targetGroup])).rows.map(m => m.user_id);
                if (!allowed.includes(userId)) fail('Access denied', 403);
            } else if (existing) {
                allowed = [existing.paid_by, ...(await query('SELECT user_id FROM expense_splits WHERE expense_id = $1', [expenseIdToUpdate])).rows.map(s => s.user_id)];
            } else {
                const friend = req.params.friendId;
                const relation = await query('SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2', [userId, friend]);
                if (!relation.rows.length) fail('Add this friend first', 403);
                allowed = [userId, ...(await query('SELECT friend_id FROM friendships WHERE user_id = $1', [userId])).rows.map(f => f.friend_id)];
                if (!splits.some(s => s.userId === friend)) fail('Friend must be included in the split');
            }
            if (!allowed.includes(payer) || splits.some(s => !allowed.includes(s.userId))) fail('Invalid expense participant', 403);
            let expenseId = expenseIdToUpdate;
            if (existing) {
                await query('UPDATE group_expenses SET amount = $1, description = $2, paid_by = $3, date = COALESCE($4::timestamptz, date) WHERE id = $5', [amount, description.trim(), payer, date, expenseId]);
                await query('DELETE FROM expense_splits WHERE expense_id = $1', [expenseId]);
            } else {
                expenseId = (await query('INSERT INTO group_expenses (group_id, paid_by, amount, description, date) VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz,NOW())) RETURNING id', [targetGroup, payer, amount, description.trim(), date])).rows[0].id;
            }
            for (const split of splits) {
                const paid = split.userId === payer || split.amount === 0;
                await query('INSERT INTO expense_splits (expense_id, user_id, amount, is_paid, paid_amount) VALUES ($1,$2,$3,$4,$5)', [expenseId, split.userId, split.amount, paid, paid ? split.amount : 0]);
            }
            await notify(query, userId, targetGroup ? await groupRecipients(query,targetGroup) : [payer, ...splits.map(s => s.userId)], existing ? 'expense_updated' : 'expense', `${existing ? 'updated' : 'added'} “${description.trim()}”.`, { expenseId, groupId: targetGroup, amount, description: description.trim(), scope: 'shared' });
            return expenseId;
        });
        res.json({ id });
    } catch (err) { next(err); }
};

router.post('/friends/:friendId/expenses', (req, res, next) => saveExpense(null, req, res, next));
router.post('/groups/:id/expenses', (req, res, next) => saveExpense(req.params.id, req, res, next));

router.patch('/social-expenses/:id', (req, res, next) => {
    const expenseId = req.params.id;
    saveExpense(null, req, res, next, expenseId);
});


router.delete('/social-expenses/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;

        const expRes = await query('SELECT group_id, paid_by FROM group_expenses WHERE id = $1', [id]);

        if (expRes.rows.length === 0) return res.status(404).json({ error: 'Expense not found' });

        const expense = expRes.rows[0];
        let isAuthorized = false;

        if (expense.group_id) {
            const memCheck = await query(
                'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
                [expense.group_id, userId]
            );
            if (memCheck.rows.length > 0) isAuthorized = true;
        } else {
            const splitCheck = await query(
                'SELECT 1 FROM expense_splits WHERE expense_id = $1 AND user_id = $2',
                [id, userId]
            );
            if (expense.paid_by === userId || splitCheck.rows.length > 0) isAuthorized = true;
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: 'You are not part of this transaction' });
        }
        const settled = await query('SELECT 1 FROM expense_splits WHERE expense_id = $1 AND user_id != $2 AND amount > 0 AND (paid_amount > 0 OR is_paid = TRUE)', [id, expense.paid_by]);
        if (settled.rows.length) return res.status(409).json({ error: 'This bill has payments applied. Undo its payments from the bill history before deleting the bill.' });
        await transaction(async query => {
            const entry = (await query('SELECT description, amount FROM group_expenses WHERE id=$1 FOR UPDATE', [id])).rows[0];
            const participants = (await query('SELECT user_id FROM expense_splits WHERE expense_id=$1', [id])).rows.map(s => s.user_id);
            await query('DELETE FROM group_expenses WHERE id = $1', [id]);
            await notify(query, userId, expense.group_id ? await groupRecipients(query,expense.group_id) : [expense.paid_by, ...participants], 'expense_deleted', `deleted “${entry.description}”.`, { expenseId: id, groupId: expense.group_id, amount: Number(entry.amount), description: entry.description, scope: 'shared' });
        });

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.delete('/social-payments/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        await transaction(async query => {
            const payment = (await query('SELECT * FROM group_payments WHERE id = (SELECT COALESCE(parent_payment_id,id) FROM group_payments WHERE id=$1) FOR UPDATE', [req.params.id])).rows[0];
            if (!payment) fail('Settlement not found', 404);
            await query('SELECT pg_advisory_xact_lock(hashtext($1))', [[payment.paid_by,payment.paid_to].sort().join(':')]);
            if (payment.group_id) await groupForChange(query,payment.group_id,userId);
            else if (![payment.paid_by, payment.paid_to, payment.recorded_by].includes(userId)) fail('Unauthorized', 403);
            if (payment.payment_type === 'shadow') fail('Undo this settlement from the friend activity', 409);
            const allocations = await query('SELECT * FROM settlement_allocations WHERE payment_id = $1', [payment.id]);
            if (!allocations.rows.length && !payment.recorded_by) fail('This legacy settlement cannot be safely undone automatically', 409);
            const groups = await query('SELECT DISTINCT e.group_id FROM settlement_allocations a JOIN expense_splits s ON s.id=a.split_id JOIN group_expenses e ON e.id=s.expense_id WHERE a.payment_id=$1 AND e.group_id IS NOT NULL UNION SELECT group_id FROM settlement_credits WHERE payment_id=$1 AND group_id IS NOT NULL ORDER BY group_id',[payment.id]);
            for (const { group_id } of groups.rows) {
                await groupForChange(query,group_id,userId);
                const members=await groupRecipients(query,group_id);
                if (![payment.paid_by,payment.paid_to].every(id=>members.includes(id))) fail('Restore the removed group member before undoing this settlement',409);
            }
            for (const allocation of allocations.rows) {
                await query('UPDATE expense_splits SET paid_amount = GREATEST(0, paid_amount - $1), is_paid = FALSE, settlement_id = NULL WHERE id = $2', [allocation.amount, allocation.split_id]);
            }
            await query('DELETE FROM group_payments WHERE id = $1', [payment.id]);
            await notify(query, userId, payment.group_id ? await groupRecipients(query,payment.group_id) : [payment.paid_by, payment.paid_to], 'settlement_undone', 'undid a settlement. Your balance has been updated.', { amount: Number(payment.amount), paymentId: payment.id, groupId:payment.group_id, payer:payment.paid_by, receiver:payment.paid_to, scope: 'shared' });
        });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// --- BALANCES & SETTLEMENTS ---
router.get('/friends/:friendId/balance', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { friendId } = req.params;

        const q = `
            SELECT 
                (
                    -- 1. Money THEY owe ME (Lent & Unpaid across ALL groups)
                    COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.paid_by = $1          -- I paid
                        AND s.user_id = $2            -- Friend owes
                        AND s.is_paid = FALSE         -- Still pending
                    ), 0)
                    
                    -- 2. MINUS Money I owe THEM (Borrowed & Unpaid across ALL groups)
                    - 
                    COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.paid_by = $2          -- Friend paid
                        AND s.user_id = $1            -- I owe
                        AND s.is_paid = FALSE         -- Still pending
                    ), 0)
                ) as net
        `;

        const result = await query(q, [userId, friendId]);
        res.json({ net: parseFloat(result.rows[0].net || 0).toFixed(2) });
    } catch (err) {
        next(err);
    }
});

router.get('/groups/:id/balances', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const groupId = req.params.id;

        const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
        if (!membership.rows.length) return res.status(403).json({ error: 'Access denied' });

        // 1. Get all other members (to calculate pairwise debts with them)
        const membersRes = await query(`
            SELECT u.id, u.name, 
                   UPPER(LEFT(u.name, 1) || COALESCE(LEFT(SPLIT_PART(u.name, ' ', 2), 1), '')) as initials
            FROM group_members gm 
            JOIN users u ON gm.user_id = u.id 
            WHERE gm.group_id = $1 AND u.id != $2
        `, [groupId, userId]);

        const otherMembers = membersRes.rows;

        // 2. For each member, find the "Direct Debt Bridge"
        const balances = await Promise.all(otherMembers.map(async (m) => {
            const debtRes = await query(`
                SELECT 
                    -- Bucket A: What they owe ME (I paid, they are in split)
                    COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.group_id = $1 AND e.paid_by = $2 AND s.user_id = $3 AND s.is_paid = FALSE
                    ), 0)
                    - 
                    -- Bucket B: What I owe THEM (They paid, I am in split)
                    COALESCE((
                        SELECT SUM(s.amount - s.paid_amount)
                        FROM blip_balance_entries s CROSS JOIN LATERAL (SELECT s.paid_by, s.group_id) e
                        WHERE e.group_id = $1 AND e.paid_by = $3 AND s.user_id = $2 AND s.is_paid = FALSE
                    ), 0) as net
            `, [groupId, userId, m.id]);

            const net = parseFloat(debtRes.rows[0].net || 0);

            return {
                id: m.id,
                name: m.name,
                initials: m.initials,
                net: net.toFixed(2)
            };
        }));

        // 3. Filter out people with no shared debt
        const activeBalances = balances.filter(b => Math.abs(parseFloat(b.net)) >= 0.01);

        res.json({
            balances: activeBalances,
            settlements: []
        });
    } catch (err) { next(err); }
});

const settle = async (req, res, next, groupId = null) => {
    try {
        const userId = getUserId(req);
        const pairUser = groupId ? (req.body.payerId || userId) : userId;
        const friendId = groupId ? (req.body.receiverId || req.body.toUserId) : req.params.friendId;
        const amount = cents(req.body.amount) / 100;
        if (amount > 99999999.99) fail('Enter an amount below 100,000,000 rupees');
        if (!friendId || friendId === pairUser) fail('Choose two different settlement participants');
        if (req.body.payerId && ![pairUser, friendId].includes(req.body.payerId)) fail('Invalid payer');
        const result = await transaction(async query => {
            // Serialize settlements between this pair, including requests across groups.
            await query('SELECT pg_advisory_xact_lock(hashtext($1))', [[pairUser, friendId].sort().join(':')]);
            if (groupId) {
                await groupForChange(query, groupId, userId);
                const members = await groupRecipients(query, groupId);
                if (![pairUser, friendId].every(id => members.includes(id))) fail('Access denied', 403);
            } else {
                const connection = await query('SELECT 1 FROM friendships WHERE user_id=$1 AND friend_id=$2', [userId, friendId]);
                if (!connection.rows.length) fail('Add this person as a friend first', 403);
            }
            const unpaid = await query(`SELECT s.id, s.amount, s.paid_amount, e.group_id, e.paid_by
                FROM expense_splits s JOIN group_expenses e ON s.expense_id = e.id
                WHERE ((e.paid_by = $1 AND s.user_id = $2) OR (e.paid_by = $2 AND s.user_id = $1))
                AND s.is_paid = FALSE AND ($3::uuid IS NULL OR e.group_id = $3)
                ORDER BY e.date, s.id FOR UPDATE OF s`, [pairUser, friendId, groupId]);
            const net = (await query(`SELECT COALESCE(SUM(CASE WHEN paid_by=$1 THEN amount ELSE -amount END),0) AS net
                FROM blip_balance_entries WHERE ((paid_by=$1 AND user_id=$2) OR (paid_by=$2 AND user_id=$1))
                AND ($3::uuid IS NULL OR group_id=$3)`, [pairUser,friendId,groupId])).rows[0].net;
            const payerId = req.body.payerId || (Number(net) > 0 ? friendId : pairUser);
            const plan = allocateSettlement(unpaid.rows, pairUser, friendId, amount, payerId);
            plan.direction = plan.payer === userId ? 'paid' : plan.receiver === userId ? 'received' : 'recorded';
            const masterId = (await query("INSERT INTO group_payments (paid_by, paid_to, amount, payment_type, recorded_by, group_id) VALUES ($1,$2,$3,'master',$4,$5) RETURNING id", [plan.payer, plan.receiver, amount, userId, groupId])).rows[0].id;
            const shadows = new Map();
            for (const allocation of plan.allocations) {
                await query('INSERT INTO settlement_allocations (payment_id, split_id, amount) VALUES ($1,$2,$3)', [masterId, allocation.id, allocation.applied]);
                await query('UPDATE expense_splits SET paid_amount = paid_amount + $1, is_paid = (paid_amount + $1 >= amount), settlement_id = $2 WHERE id = $3', [allocation.applied, masterId, allocation.id]);
                if (allocation.group_id) shadows.set(allocation.group_id, (shadows.get(allocation.group_id) || 0) + cents(allocation.applied));
            }
            const addCredit = async (creditGroup, creditCents) => {
                await query('INSERT INTO settlement_credits (payment_id,group_id,paid_by,paid_to,amount) VALUES ($1,$2,$3,$4,$5)', [masterId,creditGroup,plan.payer,plan.receiver,creditCents/100]);
                if (creditGroup) shadows.set(creditGroup, (shadows.get(creditGroup) || 0) + creditCents);
            };
            let creditLeft = cents(plan.credit,true);
            if (creditLeft && !groupId) {
                // A friend-level payment also clears advances owed inside groups.
                const credits = await query(`SELECT group_id, SUM(CASE WHEN paid_by=$1 THEN amount ELSE -amount END) AS net
                    FROM settlement_credits WHERE ((paid_by=$1 AND paid_to=$2) OR (paid_by=$2 AND paid_to=$1))
                    GROUP BY group_id HAVING SUM(CASE WHEN paid_by=$1 THEN amount ELSE -amount END)>0 ORDER BY group_id NULLS LAST`, [plan.receiver,plan.payer]);
                for (const credit of credits.rows) {
                    if (!creditLeft) break;
                    const applied = Math.min(creditLeft,cents(credit.net));
                    await addCredit(credit.group_id,applied);
                    creditLeft -= applied;
                }
            }
            if (creditLeft) await addCredit(groupId,creditLeft);
            for (const [id, applied] of shadows) {
                await query("INSERT INTO group_payments (paid_by, paid_to, amount, group_id, payment_type, parent_payment_id) VALUES ($1,$2,$3,$4,'shadow',$5)", [plan.payer, plan.receiver, applied / 100, id, masterId]);
            }
            if (req.body.shouldLog && plan.direction !== 'recorded') {
                await query('INSERT INTO expenses (user_id, amount, category, description, date, settlement_payment_id) VALUES ($1,$2,$3,$4,NOW(),$5)', [userId, amount, plan.direction === 'received' ? 'Income' : 'Social', plan.direction === 'received' ? 'Settlement received' : 'Settlement paid', masterId]);
            }
            await notify(query, userId, groupId ? await groupRecipients(query, groupId) : [plan.payer, plan.receiver], 'settlement', `recorded a settlement of Rs. ${amount.toFixed(2)}.`, { paymentId: masterId, groupId, amount, payer: plan.payer, receiver: plan.receiver, scope: 'shared' });
            return { success: true, masterId, direction: plan.direction };
        });
        res.json(result);
    } catch (err) { next(err); }
};
router.post('/friends/:friendId/settle', (req, res, next) => settle(req, res, next));
router.post('/groups/:id/settle', (req, res, next) => settle(req, res, next, req.params.id));

export default router;
