import pg from 'pg';
import dotenv from 'dotenv';
import { databaseConfig, databaseErrorSummary } from './config.js';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool(databaseConfig(process.env.DATABASE_URL));

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', databaseErrorSummary(err));
});

export const query = (text, params) => pool.query(text, params);
