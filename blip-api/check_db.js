import { query } from './db/client.js';

async function check() {
    try {
        const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log("TABLES:");
        console.dir(res.rows, { depth: null });
        
        for (const row of res.rows) {
            const cols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [row.table_name]);
            console.log(`\nTABLE ${row.table_name}:`);
            console.dir(cols.rows, { depth: null });
        }
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}

check();
