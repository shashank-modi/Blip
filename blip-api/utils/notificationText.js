const titles = {
    friend_added:'Friend added', group_created:'Group created', group_updated:'Group updated',
    group_archived:'Group archived', group_member_added:'Member added', group_member_removed:'Member removed',
    expense:'Expense added', expense_updated:'Expense updated', expense_deleted:'Expense deleted',
    settlement:'Payment recorded', settlement_undone:'Payment undone',
    wallet_insert:'Expense added', wallet_update:'Expense updated', wallet_delete:'Expense deleted', device_test:'Notifications enabled',
};
const rupees = value => `Rs. ${Number(value).toLocaleString('en-IN', {maximumFractionDigits:2})}`;
export function notificationText(event, viewerId) {
    const m = event.metadata || {};
    const actorName = m.actorName || event.actor_name || 'Someone';
    const actor = event.actor_id === viewerId ? 'You' : actorName;
    const person = (id,name) => id === viewerId ? 'you' : name || 'a member';
    const group = m.groupName ? ` in “${m.groupName}”` : '';
    let title = titles[event.type] || 'Activity update';
    let message = event.message || 'There’s an update to your shared expenses.';
    if (event.type === 'friend_added') {
        message = event.actor_id === viewerId ? `You added ${m.friendName || 'a friend'}.` : `${actor} added you as a friend.`;
    } else if (['expense','expense_updated','expense_deleted'].includes(event.type) && m.description) {
        const verb = {expense:'added',expense_updated:'updated',expense_deleted:'deleted'}[event.type];
        message = `${actor} ${verb} “${m.description}”${m.amount != null ? ` (${rupees(m.amount)})` : ''}${group}.`;
        const share = m.splits?.find(split=>split.userId===viewerId);
        if (share && event.type !== 'expense_deleted') message += ` Your share: ${rupees(share.amount)}.`;
    } else if (['settlement','settlement_undone'].includes(event.type) && m.payer && m.receiver && m.amount != null) {
        const verb = event.type === 'settlement' ? 'recorded' : 'undid';
        message = `${actor} ${verb} a payment of ${rupees(m.amount)} from ${person(m.payer,m.payerName)} to ${person(m.receiver,m.receiverName)}${group}.`;
        if (event.type === 'settlement' && m.receiver === viewerId) title = 'Payment received';
    } else if (event.type === 'group_created' && m.groupName) {
        message = `${actor} created “${m.groupName}”${event.actor_id !== viewerId ? ' and added you to the group' : ''}.`;
    } else if (['group_updated','group_archived'].includes(event.type) && m.groupName) {
        message = `${actor} ${event.type === 'group_updated' ? 'updated' : 'archived'} “${m.groupName}”.`;
    } else if (['group_member_added','group_member_removed'].includes(event.type) && m.memberId && m.groupName) {
        const added = event.type === 'group_member_added';
        message = `${actor} ${added ? 'added' : 'removed'} ${person(m.memberId,m.memberName)} ${added ? 'to' : 'from'} “${m.groupName}”.`;
    } else if (event.type.startsWith('wallet_') && m.description) {
        const verb = {wallet_insert:'added',wallet_update:'updated',wallet_delete:'deleted'}[event.type] || 'updated';
        message = `${actor} ${verb} “${m.description}”${m.amount != null ? ` (${rupees(m.amount)})` : ''} in your Wallet.`;
        if (m.category === 'Income') title = {wallet_insert:'Income added',wallet_update:'Income updated',wallet_delete:'Income deleted'}[event.type] || title;
    } else if (event.actor_id === viewerId && message.startsWith(actorName)) {
        message = `You${message.slice(actorName.length)}`;
    }
    return {title,message};
}
