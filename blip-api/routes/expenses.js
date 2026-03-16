import express from 'express';
import { getUserId, requireAuth } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { toTitleCase } from '../utils/format.js';

const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { month } = req.query; // format YYYY-MM
        let sql = 'SELECT * FROM expenses WHERE user_id = $1';
        const params = [userId];

        if (month) {
            sql += ` AND date >= $2::date AND date < ($2::date + interval '1 month')`;
            params.push(`${month}-01`);
        }

        sql += ' ORDER BY date DESC';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.get('/recents', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        // DISTINCT ON gets the exact last 5 combos
        const result = await query(
            `SELECT DISTINCT ON (category, description) category, description, amount, date 
       FROM expenses 
       WHERE user_id = $1 
       ORDER BY category, description, date DESC
       LIMIT 15`,
            [userId]
        );
        // JS sort to actually get most recent globally 5 items out of the distinct sets
        const top5 = result.rows.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        res.json(top5);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        let { amount, category, description, date } = req.body;
        description = toTitleCase(description);

        const result = await query(
            `INSERT INTO expenses (user_id, amount, category, description, date)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
       RETURNING *`,
            [userId, amount, category || 'General', description, date]
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
            'DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING *',
            [req.params.id, userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, deleted: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { amount, description, category, date } = req.body;

        const current = await query('SELECT * FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const newAmount = amount !== undefined ? amount : current.rows[0].amount;
        const newDesc = description !== undefined ? description : current.rows[0].description;
        const newCat = category !== undefined ? category : current.rows[0].category;
        const newDate = date !== undefined ? date : current.rows[0].date;

        const result = await query(
            'UPDATE expenses SET amount = $1, description = $2, category = $3, date = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
            [newAmount, newDesc, newCat, newDate, req.params.id, userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

export default router;
