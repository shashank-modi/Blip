import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { databaseConfig, databaseErrorSummary } from '../db/config.js';

test('legacy SSL aliases retain certificate verification without deprecated modes', () => {
    for (const mode of ['prefer', 'require', 'verify-ca', 'verify-full']) {
        const config = databaseConfig(`postgresql://test:fake@example.test/db?sslmode=${mode}&application_name=blip`);
        const url = new URL(config.connectionString);
        assert.equal(url.searchParams.get('sslmode'), 'verify-full');
        assert.equal(url.searchParams.get('application_name'), 'blip');
        const client = new pg.Client(config);
        assert.ok(client.ssl);
        assert.notEqual(client.ssl.rejectUnauthorized, false);
    }
});

test('local test databases remain non-TLS while remote defaults verify certificates', () => {
    assert.equal(new pg.Client(databaseConfig('postgresql://test@localhost/db?sslmode=disable')).ssl, false);
    assert.equal(new URL(databaseConfig('postgresql://test@example.test/db').connectionString).searchParams.get('sslmode'), 'verify-full');
    assert.throws(() => databaseConfig('secret invalid URL'), { message: 'DATABASE_URL must be a valid PostgreSQL URL' });
});

test('database errors distinguish reachability, missing migrations, and authentication without leaking secrets', () => {
    assert.match(databaseErrorSummary(new Error('timeout expired')), /unreachable/);
    assert.match(databaseErrorSummary({ errors: [{ code: 'ETIMEDOUT' }] }), /unreachable/);
    assert.match(databaseErrorSummary({ code: '42P01' }), /migrations\/neon-manual.sql/);
    assert.match(databaseErrorSummary({ code: '28P01' }), /authentication failed/);
    assert.doesNotMatch(databaseErrorSummary(new Error('postgresql://secret:password@host/db')), /secret|password@/);
});
