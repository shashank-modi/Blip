import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL ||= 'postgresql://test@localhost/test';
const { validSubscription } = await import('../utils/push.js');
const keys = { p256dh: Buffer.alloc(65).toString('base64url'), auth: Buffer.alloc(16).toString('base64url') };
test('push subscriptions allow browser services and reject private or attacker endpoints', () => {
    assert.equal(validSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys }), true);
    assert.equal(validSubscription({ endpoint: 'https://web.push.apple.com/abc', keys }), true);
    for (const endpoint of ['http://localhost', 'https://127.0.0.1', 'https://evil.test', 'https://fcm.googleapis.com.evil.test', 'https://fcm.googleapis.com:444/abc']) assert.equal(validSubscription({ endpoint, keys }), false);
    assert.equal(validSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: {} }), false);
});
