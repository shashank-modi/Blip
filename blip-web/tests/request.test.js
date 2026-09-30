import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../src/lib/request.js';

const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });

test('a stalled authentication token cannot leave the app loading forever', async () => {
    let fetched = false;
    await assert.rejects(requestJson('/api/users/me', {}, {
        getToken: () => new Promise(() => {}), timeoutMs: 10,
        fetchImpl: async () => { fetched = true; return ok(); },
    }), { code: 'REQUEST_TIMEOUT' });
    assert.equal(fetched, false);
});

test('a stalled fetch is aborted and a stalled response body also times out', async () => {
    let signal;
    await assert.rejects(requestJson('/api/users/me', {}, {
        timeoutMs: 10, fetchImpl: async (_, options) => { signal = options.signal; return new Promise(() => {}); },
    }), { code: 'REQUEST_TIMEOUT' });
    assert.equal(signal.aborted, true);
    await assert.rejects(requestJson('/api/users/me', {}, {
        timeoutMs: 10, fetchImpl: async () => ({ ok: true, headers: new Headers({ 'Content-Type': 'application/json' }), json: () => new Promise(() => {}) }),
    }), { code: 'REQUEST_TIMEOUT' });
});

test('read requests retry a waking server and preserve the authentication header', async () => {
    let calls = 0;
    const result = await requestJson('/api/friends', {}, {
        getToken: async () => 'test-token', retryDelayMs: 1,
        fetchImpl: async (_, options) => {
            assert.equal(options.headers.Authorization, 'Bearer test-token');
            return ++calls === 1 ? new Response(null, { status: 503 }) : ok();
        },
    });
    assert.equal(calls, 2);
    assert.deepEqual(result, { ok: true });
});

test('expense mutations are never automatically retried', async () => {
    for (const failure of ['network', 'server']) {
        let calls = 0;
        await assert.rejects(requestJson('/api/expenses', { method: 'POST' }, {
            retryDelayMs: 1, fetchImpl: async () => {
                calls++;
                if (failure === 'network') throw new TypeError('Failed to fetch');
                return new Response(null, { status: 503 });
            },
        }));
        assert.equal(calls, 1);
    }
});

test('an HTML deployment fallback does not masquerade as a successful API response', async () => {
    await assert.rejects(requestJson('/api/friends', {}, {
        fetchImpl: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }),
    }), /unexpected response/);
});
