import { waitUntil } from '@vercel/functions';
import { pushAfterResponse } from './utils/pushLifecycle.js';
import { flushPush } from './utils/push.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { query } from './db/client.js';

import notificationsRouter from './routes/notifications.js';
import usersRouter from './routes/users.js';
import expensesRouter from './routes/expenses.js';
import recurringRouter from './routes/recurring.js';
import dashboardRouter from './routes/dashboard.js';
import investmentsRouter from './routes/investments.js';
import incomeRouter from './routes/income.js';
import shoppingRouter from './routes/shopping.js';
import friendsRouter from './routes/friends.js';

process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(pushAfterResponse(flushPush, process.env.VERCEL ? waitUntil : undefined));
// Timers only run reliably in the persistent local/server process.
if (!process.env.VERCEL) {
    const pushTimer = setInterval(() => void flushPush(), 30000);
    pushTimer.unref();
}

app.use('/api/notifications', notificationsRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/users', usersRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/investments', investmentsRouter);
app.use('/api/income', incomeRouter);
app.use('/api/shopping', shoppingRouter);
app.use('/api', friendsRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/health/db', async (req, res, next) => {
    try {
        await query('SELECT 1');
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        next(err);

    }
});

app.use(errorHandler);

export default app;

if (!process.env.VERCEL) {
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[ERROR] Port ${PORT} is already in use.\nRun: \`kill $(lsof -t -i:${PORT})\` to free it, then restart.\n`);
    } else {
        console.error('[SERVER ERROR]', err);
    }
    process.exit(1);
});

}
