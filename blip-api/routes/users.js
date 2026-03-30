
import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query } from '../db/client.js';

const router = express.Router();
router.use(requireAuth);

router.post('/sync', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        console.log('userId:', userId);
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
        next(err);
    }
});


router.patch('/me/budget', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        let { budget, phone } = req.body;

        const cleanBudget = parseFloat(budget);
        if (isNaN(cleanBudget)) {
            return res.status(400).json({ error: 'Valid budget amount is required' });
        }

        const result = await query(
            `UPDATE users 
             SET monthly_budget = $1, 
                 phone = COALESCE($2, phone),
                 is_onboarded = TRUE
             WHERE id = $3 
             RETURNING *`,
            [cleanBudget, phone || null, userId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.patch('/me/phone', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { phone } = req.body;
        if (!phone || phone.length !== 10) return res.status(400).json({ error: 'Invalid phone' });

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
        next(err);
    }
});

router.patch('/me/onboarding', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        await query('UPDATE users SET is_onboarded = TRUE WHERE id = $1', [userId]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
