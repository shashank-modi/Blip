export async function notify(query, actorId, recipients, type, detail, metadata = {}) {
    const actor = await query('SELECT name FROM users WHERE id = $1', [actorId]);
    const message = `${actor.rows[0]?.name || 'Someone'} ${detail}`;
    // Store an event snapshot so details still make sense after edits/deletions.
    if (metadata.groupId) metadata = { ...metadata, groupName: (await query('SELECT name FROM groups WHERE id=$1', [metadata.groupId])).rows[0]?.name };
    if (metadata.expenseId && type !== 'expense_deleted') {
        const expense = (await query('SELECT e.paid_by, u.name FROM group_expenses e JOIN users u ON u.id=e.paid_by WHERE e.id=$1', [metadata.expenseId])).rows[0];
        const splits = (await query('SELECT s.user_id AS "userId",u.name,s.amount FROM expense_splits s JOIN users u ON u.id=s.user_id WHERE s.expense_id=$1 ORDER BY u.name', [metadata.expenseId])).rows;
        metadata = { ...metadata, paidBy: expense?.paid_by, paidByName: expense?.name, splits };
    }
    if (metadata.payer && metadata.receiver) {
        const people = (await query('SELECT id,name FROM users WHERE id=ANY($1::text[])', [[metadata.payer,metadata.receiver]])).rows;
        metadata = { ...metadata, payerName:people.find(p=>p.id===metadata.payer)?.name, receiverName:people.find(p=>p.id===metadata.receiver)?.name };
    }

    for (const recipient of new Set([actorId, ...recipients])) {
        if (!recipient) continue;
        const origin = type === 'expense' && metadata.expenseId ? `expense:${metadata.expenseId}` : type === 'settlement' && metadata.paymentId ? `settlement:${metadata.paymentId}` : null;
        await query(`INSERT INTO notifications (user_id, actor_id, type, message, read_at, metadata, origin_key)
            VALUES ($1,$2,$3,$4,CASE WHEN $1=$2 THEN NOW() ELSE NULL END,$5,$6)`, [recipient, actorId, type, message, metadata, origin]);
    }
}
