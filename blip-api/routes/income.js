import express from 'express';
import { requireAuth, getUserId} from '../middleware/auth.js';
import { pool } from '../db/client.js';

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res, next) => {
    let client;
    try {
        const { amount, description } = req.body;
        const userId = getUserId(req);

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'A positive amount is required' });
        }

        const parsedAmount = parseFloat(amount);
        client = await pool.connect();
        await client.query('BEGIN');

        const userResult = await client.query(
            `UPDATE users
             SET monthly_budget = monthly_budget + $1
             WHERE id = $2
             RETURNING monthly_budget`,
            [parsedAmount, userId]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        const expResult = await client.query(
            `INSERT INTO expenses (user_id, amount, category, description, date)
             VALUES ($1, $2, 'Income', $3, NOW())
             RETURNING *`,
            [userId, parsedAmount, description || 'Added Funds']
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            new_budget: parseFloat(userResult.rows[0].monthly_budget),
            transaction: expResult.rows[0],
        });
    } catch (err) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackErr) {
                console.error('Failed to rollback income transaction:', rollbackErr);
            }
        }
        next(err);
    } finally {
        if (client) {
            client.release();
        }
    }
});

export default router;
