
import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query } from '../db/client.js';

const router = express.Router();
router.use(requireAuth);

router.post('/sync', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        console.log('userId:', userId);
        const { name, email } = req.body;

        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            await query(
                'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)',
                [userId, name, email]
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
        const result = await query('SELECT id, name, email, monthly_budget FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});


router.patch('/me/budget', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { budget } = req.body;
        const result = await query(
            'UPDATE users SET monthly_budget = $1 WHERE id = $2 RETURNING *',
            [budget, userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

export default router;
