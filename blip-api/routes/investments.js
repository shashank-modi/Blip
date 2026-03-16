import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { toTitleCase } from '../utils/format.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/investments
// Returns all investments for the user, plus computed summary
router.get('/', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const result = await query(
            'SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        const investments = result.rows;

        // Compute summary totals so frontend doesn't have to
        const total_invested = investments.reduce(
            (sum, i) => sum + parseFloat(i.amount), 0
        );
        const monthly_sips = investments
            .filter(i => i.type === 'Monthly')
            .reduce((sum, i) => sum + parseFloat(i.amount), 0);
        const lump_sum = investments
            .filter(i => i.type === 'Lumpsum')
            .reduce((sum, i) => sum + parseFloat(i.amount), 0);

        res.json({
            investments,
            summary: {
                total_invested,
                monthly_sips,
                lump_sum,
            }
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/investments
// Body: { title, amount, type, sip_date? }
// type must be 'Monthly' or 'Lumpsum'
router.post('/', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        let { title, amount, type, sip_date } = req.body;
        title = toTitleCase(title);

        if (!title || !amount || !type) {
            return res.status(400).json({ error: 'title, amount, and type are required' });
        }
        if (!['Monthly', 'Lumpsum'].includes(type)) {
            return res.status(400).json({ error: 'type must be Monthly or Lumpsum' });
        }

        const result = await query(
            `INSERT INTO investments (user_id, title, amount, type, sip_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                userId,
                title,
                parseFloat(amount),
                type,
                type === 'Monthly' ? (sip_date || 1) : null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { amount, title, sip_date } = req.body;

        // Fetch current record — ensures user owns it
        const current = await query(
            'SELECT * FROM investments WHERE id = $1 AND user_id = $2',
            [req.params.id, userId]
        );
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Investment not found' });
        }

        const inv = current.rows[0];
        const newAmount = amount !== undefined ? parseFloat(amount) : inv.amount;
        const newTitle = title !== undefined ? title : inv.title;
        const newSipDate = sip_date !== undefined ? sip_date : inv.sip_date;

        const result = await query(
            `UPDATE investments
             SET amount = $1, title = $2, sip_date = $3
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
            [newAmount, newTitle, newSipDate, req.params.id, userId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/investments/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const result = await query(
            'DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING *',
            [req.params.id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Investment not found' });
        }
        res.json({ success: true, deleted: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

export default router;