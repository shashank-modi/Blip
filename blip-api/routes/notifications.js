import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { pushConfigured, validSubscription, flushPush } from '../utils/push.js';
const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res, next) => {
    try {
        const limit = 50;
        const before = req.query.before;
        const beforeId = req.query.beforeId;
        if (beforeId && !/^[0-9a-f-]{36}$/i.test(beforeId)) return res.status(400).json({ error: 'Invalid cursor' });
        if (before && !Number.isFinite(Date.parse(before))) return res.status(400).json({ error: 'Invalid cursor' });
        const result = await query(`SELECT n.id, n.actor_id, u.name AS actor_name, n.type, n.message, n.read_at, to_char(n.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at, n.metadata
            FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
            WHERE n.user_id = $1 AND ($2::timestamptz IS NULL OR (n.created_at, n.id) < ($2::timestamptz, COALESCE($4::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
            ORDER BY n.created_at DESC, n.id DESC LIMIT $3`, [getUserId(req), before || null, limit, beforeId || null]);
        res.json(result.rows);
    } catch (error) { next(error); }
});
router.patch('/read', async (req, res, next) => {
    try {
        const ids = req.body.ids;
        if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))) return res.status(400).json({ error: 'Invalid notification IDs' });
        await query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND id = ANY($2::uuid[]) AND read_at IS NULL', [getUserId(req), ids]);
        res.json({ success: true });
    } catch (error) { next(error); }
});
router.get('/push-config', (req, res) => res.json({ enabled: pushConfigured(), publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null }));
router.post('/subscriptions', async (req, res, next) => {
    try {
        if (!pushConfigured()) return res.status(503).json({ error: 'Device notifications are not configured yet' });
        const subscription = req.body;
        if (!validSubscription(subscription)) return res.status(400).json({ error: 'Invalid push subscription' });
        await query(`INSERT INTO push_subscriptions (user_id, endpoint, subscription) VALUES ($1,$2,$3)
            ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, subscription = EXCLUDED.subscription`, [getUserId(req), subscription.endpoint, subscription]);
        res.json({ success: true });
    } catch (error) { next(error); }
});
router.delete('/subscriptions', async (req, res, next) => {
    try {
        await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [getUserId(req), req.body.endpoint]);
        res.json({ success: true });
    } catch (error) { next(error); }
});
router.post('/push-test', async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const subscribed = await query('SELECT 1 FROM push_subscriptions WHERE user_id = $1', [userId]);
        if (!subscribed.rows.length) return res.status(400).json({ error: 'Enable notifications on this device first' });
        // The actor is NULL so this explicit test can send to the current user.
        await query("INSERT INTO notifications (user_id,type,message,metadata) VALUES ($1,'device_test','Device notifications are ready. Your next shared expense will appear here.','{}')", [userId]);
        await flushPush();
        res.json({ success: true });
    } catch (error) { next(error); }
});
export default router;
