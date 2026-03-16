import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query, pool } from '../db/client.js';
import { toTitleCase } from '../utils/format.js';

const router = express.Router();
router.use(requireAuth);

router.post('/logs/generate', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        // Current month first day (yyyy-mm-01)
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        // Get all recurring templates for user
        const templates = await query('SELECT * FROM recurring_expenses WHERE user_id = $1', [userId]);

        for (const t of templates.rows) {
            // Check if log exists for this month
            const logCheck = await query(
                'SELECT id FROM recurring_logs WHERE recurring_id = $1 AND user_id = $2 AND month = $3',
                [t.id, userId, monthStr]
            );

            if (logCheck.rows.length === 0) {
                try {
                    await query(
                        'INSERT INTO recurring_logs (recurring_id, user_id, month, amount_paid) VALUES ($1, $2, $3, $4)',
                        [t.id, userId, monthStr, t.amount]
                    );
                } catch (insertErr) {
                    // 23503 = foreign_key_violation — template was deleted between SELECT and INSERT
                    // This is a benign race condition; skip this entry silently
                    if (insertErr.code === '23503') continue;
                    throw insertErr;
                }
            }
        }
        res.json({ success: true, month: monthStr });
    } catch (err) {
        next(err);
    }
});

router.get('/logs', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { month } = req.query;
        if (!month) return res.status(400).json({ error: 'month query param required (YYYY-MM)' });

        const monthStr = `${month}-01`;

        const result = await query(
            `SELECT l.*, r.title, r.category, r.due_day 
       FROM recurring_logs l
       JOIN recurring_expenses r ON l.recurring_id = r.id
       WHERE l.user_id = $1 AND l.month = $2
       ORDER BY r.due_day ASC`,
            [userId, monthStr]
        );

        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.patch('/logs/:id', async (req, res, next) => {
    let client;
    try {
        const { amount_paid } = req.body;
        const userId = getUserId(req);

        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Mark the recurring log as paid
        const logResult = await client.query(
            `UPDATE recurring_logs
             SET amount_paid = $1, paid_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [amount_paid, req.params.id, userId]
        );

        if (logResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not found' });
        }
        const log = logResult.rows[0];

        // 2. Fetch template title/category for the expense record
        const tplResult = await client.query(
            'SELECT title, category FROM recurring_expenses WHERE id = $1',
            [log.recurring_id]
        );
        const tpl = tplResult.rows[0];

        // 3. Insert into expenses so it shows up in the transaction log
        const expResult = await client.query(
            `INSERT INTO expenses (user_id, amount, category, description, date)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [userId, amount_paid, tpl?.category || 'Bills', tpl?.title || 'Recurring Payment']
        );

        await client.query('COMMIT');
        res.json({ log: log, expense: expResult.rows[0] });
    } catch (err) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch (_) { }
        }
        next(err);
    } finally {
        if (client) client.release();
    }
});

// Base templates endpoints
router.get('/', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const result = await query('SELECT * FROM recurring_expenses WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        let { title, amount, category, due_day } = req.body;
        title = toTitleCase(title);

        const result = await query(
            `INSERT INTO recurring_expenses (user_id, title, amount, category, due_day)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, title, amount, category || 'Bills', due_day || 1]
        );
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { title, amount, category, due_day } = req.body;

        const current = await query('SELECT * FROM recurring_expenses WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const t = title !== undefined ? title : current.rows[0].title;
        const a = amount !== undefined ? amount : current.rows[0].amount;
        const c = category !== undefined ? category : current.rows[0].category;
        const d = due_day !== undefined ? due_day : current.rows[0].due_day;

        const result = await query(
            'UPDATE recurring_expenses SET title = $1, amount = $2, category = $3, due_day = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
            [t, a, c, d, req.params.id, userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const result = await query(
            'DELETE FROM recurring_expenses WHERE id = $1 AND user_id = $2 RETURNING *',
            [req.params.id, userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, deleted: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

export default router;
