import express from 'express';
import { query } from '../db/client.js';
import { requireAuth, getUserId } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// Get all shopping items for a user
router.get('/', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const result = await query(
            'SELECT * FROM shopping_items WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// Add a new shopping item
router.post('/', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { name, category } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Item name is required' });
        }

        const result = await query(
            `INSERT INTO shopping_items (user_id, name, category) 
             VALUES ($1, $2, $3) RETURNING *`,
            [userId, name, category || 'Shopping']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// Edit a shopping item
router.put('/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Item name is required' });
        }

        const result = await query(
            `UPDATE shopping_items 
             SET name = $1 
             WHERE id = $2 AND user_id = $3 
             RETURNING *`,
            [name, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shopping item not found or unauthorized' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// Delete a shopping item
router.delete('/:id', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;

        const result = await query(
            `DELETE FROM shopping_items 
             WHERE id = $1 AND user_id = $2 
             RETURNING id`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shopping item not found or unauthorized' });
        }

        res.json({ message: 'Deleted successfully', id });
    } catch (err) {
        next(err);
    }
});

export default router;
