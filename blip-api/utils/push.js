import { notificationText } from './notificationText.js';
import webpush from 'web-push';
import { pool } from '../db/client.js';
import { databaseErrorSummary } from '../db/config.js';

export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
export function validSubscription(subscription) {
    try {
        const url = new URL(subscription?.endpoint);
        const hosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
        const trusted = hosts.includes(url.hostname) || url.hostname.endsWith('.push.services.mozilla.com') || url.hostname.endsWith('.notify.windows.com') || url.hostname.endsWith('.push.apple.com');
        const key = subscription?.keys;
        return url.protocol === 'https:' && !url.port && !url.username && !url.password && trusted &&
            typeof key?.p256dh === 'string' && /^[A-Za-z0-9_-]+={0,2}$/.test(key.p256dh) && Buffer.from(key.p256dh, 'base64url').length === 65 &&
            typeof key?.auth === 'string' && /^[A-Za-z0-9_-]+={0,2}$/.test(key.auth) && Buffer.from(key.auth, 'base64url').length === 16;
    } catch { return false; }
}

let running = false;
export async function flushPush() {
    if (running || !pushConfigured()) return;
    running = true;
    let client;
    try {
        client = await pool.connect();
        // Claim jobs briefly; the lease also prevents two API instances sending them together.
        await client.query('BEGIN');
        const jobs = await client.query(`SELECT d.notification_id, d.subscription_id, s.subscription, n.message, n.type, n.metadata, n.actor_id, n.user_id, u.name AS actor_name, d.attempts
            FROM push_deliveries d JOIN push_subscriptions s ON s.id = d.subscription_id JOIN notifications n ON n.id = d.notification_id LEFT JOIN users u ON u.id=n.actor_id
            WHERE s.user_id = n.user_id AND d.delivered_at IS NULL AND d.attempts < 8 AND d.next_attempt_at <= NOW()
            ORDER BY d.next_attempt_at LIMIT 25 FOR UPDATE OF d SKIP LOCKED`);
        for (const job of jobs.rows) await client.query("UPDATE push_deliveries SET attempts = attempts + 1, next_attempt_at = NOW() + interval '2 minutes' WHERE notification_id = $1 AND subscription_id = $2", [job.notification_id, job.subscription_id]);
        await client.query('COMMIT');
        client.release(); client = null;
        await Promise.allSettled(jobs.rows.map(async job => {
            if (!validSubscription(job.subscription)) return;
            try {
                const text = notificationText(job,job.user_id);
                await webpush.sendNotification(job.subscription, JSON.stringify({ title: text.title, body: text.message, id: job.notification_id, url: '/?tab=activity' }), {
                    vapidDetails: { subject: process.env.VAPID_SUBJECT, publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY },
                    TTL: 86400, timeout: 8000,
                });
                await pool.query('UPDATE push_deliveries SET delivered_at = NOW() WHERE notification_id = $1 AND subscription_id = $2', [job.notification_id, job.subscription_id]);
            } catch (error) {
                if ([404, 410].includes(error.statusCode)) await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [job.subscription_id]);
                else await pool.query("UPDATE push_deliveries SET next_attempt_at = NOW() + ($3 * interval '1 second') WHERE notification_id = $1 AND subscription_id = $2", [job.notification_id, job.subscription_id, Math.min(3600, 30 * (2 ** job.attempts))]);
            }
        }));
    } catch (error) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        console.error('Push queue processing failed:', databaseErrorSummary(error));
    } finally { client?.release(); running = false; }
}
