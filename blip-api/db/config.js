// Make pg's current certificate-verifying behavior explicit. Do not silence the
// deprecation by disabling certificate verification or opting into weaker TLS.
export function databaseConfig(connectionString) {
    if (!connectionString) throw new Error('DATABASE_URL is required');
    let url;
    try { url = new URL(connectionString); }
    catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL URL');
    const mode = url.searchParams.get('sslmode');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.searchParams.get('uselibpqcompat') !== 'true' && ['prefer', 'require', 'verify-ca'].includes(mode)) {
        url.searchParams.set('sslmode', 'verify-full');
    } else if (!local && !mode && !url.searchParams.has('ssl')) {
        url.searchParams.set('sslmode', 'verify-full');
    }
    return {
        connectionString: url.toString(),
        max: 10,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
    };
}

// Use known, actionable messages instead of printing connection strings, host
// details, SQL parameters, or arbitrary error objects into logs.
export function databaseErrorSummary(error) {
    const failures = [error, error?.cause, ...(error?.errors || [])].filter(Boolean);
    const hasCode = (...codes) => failures.some(item => codes.includes(item.code));
    if (hasCode('ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH') || failures.some(item => /timeout|timed out/i.test(item.message || ''))) {
        return 'Database connection timed out or is unreachable. Check DATABASE_URL, the network/VPN/firewall, and database access restrictions. Run npm run check:db.';
    }
    if (hasCode('ENOTFOUND', 'EAI_AGAIN')) return 'Database hostname could not be resolved. Check DATABASE_URL and DNS/network access. Run npm run check:db.';
    if (hasCode('42P01', '42703')) return 'Required database tables or columns are missing. Apply migrations/neon-manual.sql to the database selected by DATABASE_URL.';
    if (hasCode('28P01', '28000')) return 'Database authentication failed. Check the credentials in DATABASE_URL.';
    if (hasCode('CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'ERR_TLS_CERT_ALTNAME_INVALID')) {
        return 'Database TLS certificate verification failed. Check the database hostname and trusted CA configuration; do not disable certificate verification.';
    }
    const code = failures.find(item => /^[A-Z0-9_]{2,50}$/.test(item.code || ''))?.code;
    return `Database operation failed${code ? ` (${code})` : ''}. Run npm run check:db.`;
}
