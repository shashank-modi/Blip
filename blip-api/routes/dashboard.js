import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query } from '../db/client.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/summary?month=2025-03
// Returns everything the Dashboard screen needs in one call
router.get('/summary', async (req, res, next) => {
    try {
        const userId = getUserId(req);

        // Default to current month if not provided
        const now = new Date();
        const month = req.query.month ||
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: 'Invalid month' });
        const monthStr = `${month}-01`;

        // 1. Get user budget
        const userResult = await query(
            'SELECT monthly_budget FROM users WHERE id = $1',
            [userId]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const budget = parseFloat(userResult.rows[0].monthly_budget);

        // 2. All expenses this month (excluding Income category)
        const expensesResult = await query(
            `SELECT category, amount FROM expenses
             WHERE user_id = $1
               AND category != 'Income'
               AND date >= $2::date
               AND date < ($2::date + interval '1 month')`,
            [userId, monthStr]
        );

        const total_spent = expensesResult.rows.reduce(
            (sum, e) => sum + parseFloat(e.amount), 0
        );

        // 3. Category breakdown — sorted by total descending
        const categoryMap = {};
        for (const e of expensesResult.rows) {
            categoryMap[e.category] = (categoryMap[e.category] || 0) + parseFloat(e.amount);
        }
        const by_category = Object.entries(categoryMap)
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);

        // 4. Fixed spend = sum of paid recurring logs this month
        const fixedResult = await query(
            `SELECT COALESCE(SUM(amount_paid), 0) as fixed_spent
             FROM recurring_logs
             WHERE user_id = $1
               AND month = $2
               AND paid_at IS NOT NULL`,
            [userId, monthStr]
        );
        const fixed_spent = parseFloat(fixedResult.rows[0].fixed_spent);

        // 5. Variable = everything else
        const variable_spent = Math.max(0, total_spent - fixed_spent);

        // 6. Remaining budget
        const remaining = Math.max(0, budget - total_spent);
        const percent_used = budget > 0
            ? Math.min(Math.round((total_spent / budget) * 100), 100)
            : 0;

        res.json({
            month,
            budget,
            total_spent,
            fixed_spent,
            variable_spent,
            remaining,
            percent_used,
            by_category,
        });
    } catch (err) {
        next(err);
    }
});

export default router;