
import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query } from '../db/client.js';

import { normalizePhone } from '../utils/phone.js';
import { cents } from '../utils/money.js';
import { transaction } from '../db/transaction.js';
import { currentBudgetMonth, ensureBudget, budgetState } from '../utils/budgets.js';

const router = express.Router();
router.use(requireAuth);

router.post('/sync', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { name, email, phone } = req.body;

        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            await query(
                'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)',
                [userId, name, email || null]
            );
            return res.json({ created: true });
        }
        res.json({ created: false, user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Phone number already in use' });
        next(err);
    }
});

router.get('/me', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const result = await query('SELECT id, name, phone, email, monthly_budget, is_onboarded, last_seen_version FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Phone number already in use' });
        next(err);
    }
});


router.get('/me/budgets', async (req,res,next) => {
    try { res.json(await budgetState(query,getUserId(req),currentBudgetMonth(req.query.month))); }
    catch(err) { next(err); }
});
router.post('/me/budget-check-in', async (req,res,next) => {
    try {
        const userId=getUserId(req), month=currentBudgetMonth(req.body.month);
        await ensureBudget(query,userId,month);
        const result=await query(`UPDATE monthly_budgets SET checked_in_at=NOW() WHERE user_id=$1 AND month=$2 AND checked_in_at IS NULL RETURNING amount`,[userId,month]);
        res.json({showPrompt:result.rows.length===1, ...(await budgetState(query,userId,month))});
    } catch(err) { next(err); }
});
router.patch('/me/budget', async (req, res, next) => {
    try {
        const userId = getUserId(req), month = currentBudgetMonth(req.body.month);
        const cleanBudget = cents(req.body.budget, true) / 100;
        const phone = req.body.phone ? normalizePhone(req.body.phone) : null;
        const saved = await transaction(async query => {
            const result = await query(`UPDATE users SET monthly_budget=$1,phone=COALESCE($2,phone),is_onboarded=TRUE WHERE id=$3 RETURNING *`,[cleanBudget,phone,userId]);
            if (!result.rows.length) throw Object.assign(new Error('User not found'),{status:404});
            await query(`INSERT INTO monthly_budgets(user_id,month,amount,checked_in_at) VALUES($1,$2,$3,NOW())
                ON CONFLICT(user_id,month) DO UPDATE SET amount=EXCLUDED.amount,checked_in_at=NOW(),updated_at=NOW()`,[userId,month,cleanBudget]);
            return {...result.rows[0],budgets:await budgetState(query,userId,month)};
        });
        res.json(saved);
    } catch(err) {
        if(err.code==='23505') return res.status(400).json({error:'Phone number already in use'});
        next(err);
    }
});

router.patch('/me/phone', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const phone = normalizePhone(req.body.phone);

        const result = await query('UPDATE users SET phone = $1 WHERE id = $2 RETURNING id, name, phone', [phone, userId]);
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Phone number already in use' });
        next(err);
    }
});

router.patch('/me/version', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { version } = req.body; // e.g., '1.2.0'

        if (!version) return res.status(400).json({ error: 'Version is required' });

        await query(
            'UPDATE users SET last_seen_version = $1 WHERE id = $2',
            [version, userId]
        );

        res.json({ success: true, version });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Phone number already in use' });
        next(err);
    }
});

router.patch('/me/onboarding', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        await query('UPDATE users SET is_onboarded = TRUE WHERE id = $1', [userId]);
        res.json({ success: true });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Phone number already in use' });
        next(err);
    }
});

export default router;
