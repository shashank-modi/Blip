import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query } from '../db/client.js';

const router = express.Router();
router.use(requireAuth);


router.get('/users/search', async (req, res, next) => {
    try {
        const { phone } = req.query;
        if (!phone || phone.length !== 10) {
            return res.status(400).json({ error: 'Valid 10-digit phone required' });
        }
        const result = await query('SELECT id, name, phone FROM users WHERE phone = $1', [phone]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});


//Friends
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
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
                        WHERE e.paid_by = $1          -- I paid the bill
                        AND s.user_id = f.friend_id   -- They are the ones who owe
                        AND s.is_paid = FALSE         -- It hasn't been settled yet
                    ), 0)
                    
                    -- 2. Money I owe THEM (Borrowed & Unpaid) -> NEGATIVE
                    - COALESCE((
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
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

        await query('INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, friendId]);
        await query('INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [friendId, userId]);

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
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
                        WHERE e.group_id = g.id 
                        AND e.paid_by = $1          -- I paid the bill
                        AND s.user_id != $1         -- Someone else owes me
                        AND s.is_paid = FALSE       -- They haven't settled yet
                    ), 0)
                    
                    -- B. Money I owe OTHERS in this group (-)
                    - COALESCE((
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
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

        await query('BEGIN');
        const gRes = await query('INSERT INTO groups (name, icon, type, created_by) VALUES ($1, $2, $3, $4) RETURNING id', [name, icon || '🏷️', type || 'General', userId]);
        const groupId = gRes.rows[0].id;

        const allMembers = Array.from(new Set([userId, ...(memberIds || [])]));
        for (const mId of allMembers) {
            await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [groupId, mId]);
        }
        await query('COMMIT');

        res.json({ id: groupId });
    } catch (err) {
        await query('ROLLBACK');
        next(err);
    }
});

router.delete('/groups/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;

        const memCheck = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [id, userId]);
        if (memCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

        await query('UPDATE groups SET is_active = FALSE WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
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
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
                        WHERE e.group_id = g.id 
                        AND e.paid_by = $2        -- I paid the bill
                        AND s.user_id != $2       -- Someone else owes
                        AND s.is_paid = FALSE     -- Not yet settled
                    ), 0)
                    
                    -- Money I owe OTHERS in this group (-)
                    - COALESCE((
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
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
                            e.id, e.description, e.amount, e.created_at, 'expense' as type,
                            u.name as paid_by_name
                        FROM group_expenses e
                        JOIN users u ON e.paid_by = u.id
                        WHERE e.group_id = g.id
                        
                        UNION ALL
                        
                        -- Shadow Settlement Records (The Summary Transactions)
                        SELECT 
                            p.id, 'Settlement' as description, p.amount, p.created_at, 'settlement' as type,
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

router.patch('/groups/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const { name, icon } = req.body;

        const memCheck = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [id, userId]);
        if (memCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

        const updates = [];
        const params = [];
        if (name) { updates.push(`name = $${params.length + 1}`); params.push(name); }
        if (icon) { updates.push(`icon = $${params.length + 1}`); params.push(icon); }

        if (updates.length > 0) {
            params.push(id);
            await query(`UPDATE groups SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.post('/groups/:id/members', async (req, res, next) => {
    try {
        const reqUserId = getUserId(req);
        const { id } = req.params;
        const { userId } = req.body;

        const memCheck = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [id, reqUserId]);
        if (memCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

        await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, userId]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.delete('/groups/:id/members/:userId', async (req, res, next) => {
    try {
        const reqUserId = getUserId(req);
        const { id, userId } = req.params;

        const memCheck = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [id, reqUserId]);
        if (memCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

        await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [id, userId]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// --- EXPENSES ---
const getExpenses = async (groupId, friendId, userId) => {
    // We adjust the payment filter based on whether we are in a Group or Personal view
    const paymentTypeFilter = groupId ? 'shadow' : 'master';

    let q = `
        SELECT 
            e.id, 
            e.description as desc, 
            e.amount, 
            e.paid_by, 
            u.name as paid_by_name, 
            NULL as paid_to_name, 
            e.date, 
            'expense' as type,
            NULL as payment_type,
            -- Check if MY specific split is paid
            EXISTS (
                SELECT 1 FROM expense_splits s 
                WHERE s.expense_id = e.id AND s.user_id = $1 AND s.is_paid = TRUE
            ) as is_paid,
            (
                SELECT json_agg(json_build_object(
                    'userId', s.user_id, 
                    'amount', s.amount, 
                    'name', u2.name,
                    'isPaid', s.is_paid -- Include is_paid for every member
                ))
                FROM expense_splits s 
                LEFT JOIN users u2 ON s.user_id = u2.id 
                WHERE s.expense_id = e.id
            ) as splits
        FROM group_expenses e
        LEFT JOIN users u ON e.paid_by = u.id
        ${groupId ? 'WHERE e.group_id = $2' : (friendId ? 'WHERE ((e.paid_by = $1 AND EXISTS (SELECT 1 FROM expense_splits s WHERE s.expense_id = e.id AND s.user_id = $2)) OR (e.paid_by = $2 AND EXISTS (SELECT 1 FROM expense_splits s WHERE s.expense_id = e.id AND s.user_id = $1)))' : '')}

        UNION ALL

        SELECT 
            p.id, 'Settlement' as desc, p.amount, p.paid_by, 
            u.name as paid_by_name, 
            u2.name as paid_to_name, 
            p.created_at as date, 'payment' as type,
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
        
        ORDER BY date DESC
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
            desc: e.desc,
            amount: parseFloat(e.amount),
            paidBy: e.paid_by,
            paidByName: e.paid_by === userId ? 'You' : e.paid_by_name,
            paidToName: e.paid_to_name === userId ? 'You' : (e.paid_to_name || null),
            date: e.date,
            type: e.type,
            paymentType: e.payment_type,
            isPaid: e.is_paid, // This tells the UI to show the "Settled" status
            splits: splits.map(s => ({
                ...s,
                amount: parseFloat(s.amount),
                name: s.name || 'Former Member'
            })),
            yourShare: e.type === 'payment'
                ? (e.paid_by === userId ? -parseFloat(e.amount) : (e.paid_to_name === userId ? parseFloat(e.amount) : 0))
                : (mySplit ? parseFloat(mySplit.amount) : 0)
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
        let { description, amount, paidBy, date, splits } = req.body;

        const resolvedPaidBy = (paidBy === 'me' || paidBy === userId) ? userId : paidBy;
        amount = parseFloat(amount);

        // 1. Basic Validation (Stays same)
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
        if (!splits || splits.length === 0) return res.status(400).json({ error: 'Splits required' });

        const splitsSum = splits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        if (Math.abs(splitsSum - amount) > 0.01) {
            return res.status(400).json({ error: `Math error: Splits sum (${splitsSum}) != Total (${amount})` });
        }

        await query('BEGIN');

        let expId = expenseIdToUpdate;
        let targetGroupId = groupId;

        // 2. Authorization & Header Logic (Stays same)
        if (expId) {
            const existing = await query('SELECT group_id FROM group_expenses WHERE id = $1', [expId]);
            if (existing.rows.length === 0) throw new Error('Expense not found');
            targetGroupId = existing.rows[0].group_id;

            await query(
                'UPDATE group_expenses SET amount = $1, description = $2, paid_by = $3, date = COALESCE($4::timestamptz, NOW()) WHERE id = $5',
                [amount, description, resolvedPaidBy, date, expId]
            );
            await query('DELETE FROM expense_splits WHERE expense_id = $1', [expId]);
        } else {
            const q = 'INSERT INTO group_expenses (group_id, paid_by, amount, description, date) VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW())) RETURNING id';
            const resInit = await query(q, [targetGroupId || null, resolvedPaidBy, amount, description, date]);
            expId = resInit.rows[0].id;
        }

        // 3. THE ITEMIZATION LOGIC (Updated for is_paid)
        // We now insert 4 values per split: [expense_id, user_id, amount, is_paid]
        const valuesTemplates = [];
        const flatValues = [];

        splits.forEach((s, i) => {
            const splitUserId = (s.userId === 'me' || s.user_id === 'me' || s.userId === userId) ? userId : (s.userId || s.user_id);

            // SELF-SETTLEMENT RULE: If I paid the bill, my share is already 'paid'.
            const isPaid = (splitUserId === resolvedPaidBy);

            const offset = i * 4; // Now shifting by 4 columns
            valuesTemplates.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
            flatValues.push(expId, splitUserId, s.amount, isPaid);
        });

        const bulkQuery = `
            INSERT INTO expense_splits (expense_id, user_id, amount, is_paid) 
            VALUES ${valuesTemplates.join(', ')}
        `;

        await query(bulkQuery, flatValues);

        await query('COMMIT');
        res.json({ id: expId });

    } catch (err) {
        await query('ROLLBACK');
        next(err);
    }
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
        await query('DELETE FROM group_expenses WHERE id = $1', [id]);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.delete('/social-payments/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;

        const payRes = await query(
            'SELECT id, paid_by, paid_to, payment_type, amount FROM group_payments WHERE id = $1',
            [id]
        );

        if (payRes.rows.length === 0) return res.status(404).json({ error: 'Settlement not found' });

        const payment = payRes.rows[0];
        if (userId !== payment.paid_by && userId !== payment.paid_to) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await query('BEGIN');

        if (payment.payment_type === 'master') {
            await query(`
                UPDATE expense_splits 
                SET is_paid = FALSE, settlement_id = NULL 
                WHERE settlement_id = $1
            `, [id]);

            await query(`
                DELETE FROM group_payments 
                WHERE (paid_by = $1 AND paid_to = $2 AND amount <= $3 AND payment_type = 'shadow')
                OR id = $4
            `, [payment.paid_by, payment.paid_to, payment.amount, id]);

        } else {
            await query('DELETE FROM group_payments WHERE id = $1', [id]);
        }

        await query('COMMIT');
        res.json({ success: true });

    } catch (err) {
        await query('ROLLBACK');
        next(err);
    }
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
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
                        WHERE e.paid_by = $1          -- I paid
                        AND s.user_id = $2            -- Friend owes
                        AND s.is_paid = FALSE         -- Still pending
                    ), 0)
                    
                    -- 2. MINUS Money I owe THEM (Borrowed & Unpaid across ALL groups)
                    - 
                    COALESCE((
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
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
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
                        WHERE e.group_id = $1 AND e.paid_by = $2 AND s.user_id = $3 AND s.is_paid = FALSE
                    ), 0)
                    - 
                    -- Bucket B: What I owe THEM (They paid, I am in split)
                    COALESCE((
                        SELECT SUM(s.amount) 
                        FROM expense_splits s 
                        JOIN group_expenses e ON s.expense_id = e.id 
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
        const activeBalances = balances.filter(b => Math.abs(parseFloat(b.net)) > 0.01);

        res.json({
            balances: activeBalances,
            settlements: []
        });
    } catch (err) { next(err); }
});

router.post('/friends/:friendId/settle', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { friendId } = req.params;
        const { amount } = req.body; // The amount being paid now

        if (amount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

        await query('BEGIN');

        // 1. FETCH ALL UNPAID SPLITS (The "Target List")
        // We get every unpaid split between these two people across ALL groups.
        const unpaidRes = await query(`
            SELECT s.id, s.amount, e.group_id, e.paid_by, e.description
            FROM expense_splits s
            JOIN group_expenses e ON s.expense_id = e.id
            WHERE (
                (e.paid_by = $1 AND s.user_id = $2) OR 
                (e.paid_by = $2 AND s.user_id = $1)
            )
            AND s.is_paid = FALSE
            ORDER BY e.date ASC -- Settle oldest bills first
        `, [userId, friendId]);

        const splits = unpaidRes.rows;

        // 2. CALCULATE DIRECTION
        // We need to know who owes whom to ensure the 'Master' payment is recorded correctly.
        let netOwedToMe = 0;
        let netOwedByMe = 0;
        splits.forEach(s => {
            if (s.paid_by === userId) netOwedToMe += parseFloat(s.amount);
            else netOwedByMe += parseFloat(s.amount);
        });

        const globalNet = netOwedToMe - netOwedByMe;

        // Direction check: You can only pay if you owe, or receive if you are owed.
        const isUserPaying = globalNet < 0;
        const payer = isUserPaying ? userId : friendId;
        const receiver = isUserPaying ? friendId : userId;

        if (parseFloat(amount) > Math.abs(globalNet) + 0.01) {
            await query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot settle more than outstanding balance' });
        }

        // 3. CREATE THE MASTER RECORD (The Global Truth)
        const masterRes = await query(`
            INSERT INTO group_payments (paid_by, paid_to, amount, payment_type, group_id)
            VALUES ($1, $2, $3, 'master', NULL)
            RETURNING id
        `, [payer, receiver, amount]);
        const masterId = masterRes.rows[0].id;

        // 4. ITEMIZATION: Link specific splits to this payment
        // We track how much of this payment goes to which group for the "Shadow" records.
        let remainingToApply = parseFloat(amount);
        const splitsToMarkPaid = [];
        const groupShadows = {}; // { group_id: total_amount }

        for (const split of splits) {
            if (remainingToApply <= 0) break;

            // We only settle splits where the payer of the settlement was the debtor
            if (split.paid_by === receiver) {
                const splitAmount = parseFloat(split.amount);
                const applied = Math.min(remainingToApply, splitAmount);

                remainingToApply -= applied;
                splitsToMarkPaid.push(split.id);

                if (split.group_id) {
                    groupShadows[split.group_id] = (groupShadows[split.group_id] || 0) + applied;
                }
            }
        }

        // 5. UPDATE SPLITS & CREATE SHADOWS
        if (splitsToMarkPaid.length > 0) {
            await query(`
                UPDATE expense_splits 
                SET is_paid = TRUE, settlement_id = $1 
                WHERE id = ANY($2)
            `, [masterId, splitsToMarkPaid]);
        }

        for (const [groupId, shadowAmount] of Object.entries(groupShadows)) {
            await query(`
                INSERT INTO group_payments (paid_by, paid_to, amount, group_id, payment_type)
                VALUES ($1, $2, $3, $4, 'shadow')
            `, [payer, receiver, shadowAmount, groupId]);
        }

        await query('COMMIT');
        res.json({ success: true, masterId });

    } catch (err) {
        await query('ROLLBACK');
        next(err);
    }
});

router.post('/groups/:id/settle', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { id: groupId } = req.params;
        const { toUserId, amount } = req.body;

        if (amount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

        await query('BEGIN');

        // 1. DETERMINE DIRECTION OF DEBT
        // Calculate: (Money they owe me) - (Money I owe them)
        const directionRes = await query(`
            SELECT (
                -- Money they owe me in this group (+)
                COALESCE((
                    SELECT SUM(s.amount) FROM expense_splits s 
                    JOIN group_expenses e ON s.expense_id = e.id 
                    WHERE e.group_id = $1 AND e.paid_by = $2 AND s.user_id = $3 AND s.is_paid = FALSE
                ), 0)
                - 
                -- Money I owe them in this group (-)
                COALESCE((
                    SELECT SUM(s.amount) FROM expense_splits s 
                    JOIN group_expenses e ON s.expense_id = e.id 
                    WHERE e.group_id = $1 AND e.paid_by = $3 AND s.user_id = $2 AND s.is_paid = FALSE
                ), 0)
            ) as net
        `, [groupId, userId, toUserId]);

        const net = parseFloat(directionRes.rows[0].net || 0);

        // If net > 0: They owe me money. (They are the Payer, I am Receiver)
        // If net < 0: I owe them money. (I am the Payer, They are Receiver)
        const payerId = net > 0 ? toUserId : userId;
        const receiverId = net > 0 ? userId : toUserId;

        // 2. FETCH UNPAID SPLITS (Direction Aware)
        // We only target splits where the identified Payer owes the Receiver
        const unpaidRes = await query(`
            SELECT s.id, s.amount
            FROM expense_splits s
            JOIN group_expenses e ON s.expense_id = e.id
            WHERE e.group_id = $1 
            AND e.paid_by = $2   -- The person receiving the cash
            AND s.user_id = $3   -- The person paying the cash
            AND s.is_paid = FALSE
            ORDER BY e.date ASC
        `, [groupId, receiverId, payerId]);

        const splits = unpaidRes.rows;

        // 3. CREATE MASTER RECORD
        const masterRes = await query(`
            INSERT INTO group_payments (paid_by, paid_to, amount, payment_type, group_id)
            VALUES ($1, $2, $3, 'master', NULL)
            RETURNING id
        `, [payerId, receiverId, amount]);
        const masterId = masterRes.rows[0].id;

        // 4. CREATE SHADOW RECORD (The Group Receipt)
        await query(`
            INSERT INTO group_payments (paid_by, paid_to, amount, payment_type, group_id)
            VALUES ($1, $2, $3, 'shadow', $4)
        `, [payerId, receiverId, amount, groupId]);

        // 5. ITEMIZATION: Apply the amount to oldest group bills first
        let remainingToApply = parseFloat(amount);
        const splitsToMarkPaid = [];

        for (const split of splits) {
            if (remainingToApply <= 0) break;
            const splitAmount = parseFloat(split.amount);

            // Note: We mark the split as paid if it's covered by this transaction
            remainingToApply -= splitAmount;
            splitsToMarkPaid.push(split.id);
        }

        if (splitsToMarkPaid.length > 0) {
            await query(`
                UPDATE expense_splits 
                SET is_paid = TRUE, settlement_id = $1 
                WHERE id = ANY($2)
            `, [masterId, splitsToMarkPaid]);
        }

        await query('COMMIT');
        res.json({ success: true, masterId, direction: net > 0 ? 'received' : 'paid' });

    } catch (err) {
        await query('ROLLBACK');
        next(err);
    }
});

export default router;
