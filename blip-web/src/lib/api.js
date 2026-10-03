import { monthKey } from '../utils/month';
import { requestJson } from './request.js';
const rawBaseUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '')).replace(/\/$/, '');
const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;

let tokenGetter = null;

export const setApiTokenGetter = (getter) => {
    tokenGetter = getter;
};

const toQueryString = (params) => {
    const searchParams = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, value);
        }
    });

    const serialized = searchParams.toString();
    return serialized ? `?${serialized}` : '';
};

const request = (path, options = {}) => {
    if (!rawBaseUrl) {
        console.error('VITE_API_URL is required for the production frontend.');
        return Promise.reject(new Error('Blip’s server address is not configured. Please try again later.'));
    }
    return requestJson(`${API_BASE_URL}${path}`, options, { getToken: tokenGetter });
};

export const api = {
    wakeup: () => request('/health'),

    syncUser: (data) => request('/users/sync', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => request('/users/me'),
    getBudgets: () => request(`/users/me/budgets?month=${monthKey()}`),
    claimBudgetCheckIn: () => request('/users/me/budget-check-in', {method:'POST',body:JSON.stringify({month:monthKey()})}),
    updateBudget: (budget, phone) => request('/users/me/budget', {
        method: 'PATCH',
        body: JSON.stringify({ budget, phone, month:monthKey() })
    }),

    updatePhone: (phone) => request('/users/me/phone', { method: 'PATCH', body: JSON.stringify({ phone }) }),
    updateUserVersion: (version) => request('/users/me/version', { method: 'PATCH', body: JSON.stringify({ version }) }),
    updateOnboardingStatus: () => request('/users/me/onboarding', { method: 'PATCH' }),

    getExpenses: (month) => request(`/expenses${toQueryString({ month })}`),
    createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

    generateRecurringLogs: month => request('/recurring/logs/generate', { method: 'POST', body: JSON.stringify({ month }) }),
    getRecurringLogs: (month) => request(`/recurring/logs${toQueryString({ month })}`),
    markRecurringPaid: (id, amount_paid) => request(`/recurring/logs/${id}`, { method: 'PATCH', body: JSON.stringify({ amount_paid }) }),
    getRecurringTemplates: () => request('/recurring'),
    createRecurringTemplate: (data) => request('/recurring', { method: 'POST', body: JSON.stringify(data) }),
    updateRecurringTemplate: (id, data) => request(`/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteRecurringTemplate: (id) => request(`/recurring/${id}`, { method: 'DELETE' }),

    getInvestments: () => request('/investments'),
    createInvestment: (data) => request('/investments', { method: 'POST', body: JSON.stringify(data) }),
    updateInvestment: (id, data) => request(`/investments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteInvestment: (id) => request(`/investments/${id}`, { method: 'DELETE' }),

    addIncome: (data) => request('/income', { method: 'POST', body: JSON.stringify(data) }),

    getShoppingItems: () => request('/shopping'),
    createShoppingItem: (data) => request('/shopping', { method: 'POST', body: JSON.stringify(data) }),
    updateShoppingItem: (id, data) => request(`/shopping/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteShoppingItem: (id) => request(`/shopping/${id}`, { method: 'DELETE' }),

    getDashboardSummary: (month) => request(`/dashboard/summary${toQueryString({ month })}`),

    getNotifications: before => request(`/notifications${toQueryString({ before: before?.created_at, beforeId: before?.id })}`),
    markNotificationsRead: ids => request('/notifications/read', { method: 'PATCH', body: JSON.stringify({ ids }) }),

    // Friends API methods
    searchByPhone: (phone) => request(`/users/search${toQueryString({ phone })}`),


    getSocialSummary: () => request('/social-summary'),
    getFriends: () => request('/friends'),
    addFriend: (friendId) => request('/friends', { method: 'POST', body: JSON.stringify({ friendId }) }),
    removeFriend: (friendId) => request(`/friends/${friendId}`, { method: 'DELETE' }),

    getPushConfig: () => request('/notifications/push-config'),
    subscribePush: subscription => request('/notifications/subscriptions', { method: 'POST', body: JSON.stringify(subscription) }),
    unsubscribePush: endpoint => request('/notifications/subscriptions', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
    getGroupTotals: (id, range = {}) => request(`/groups/${id}/totals?${new URLSearchParams(range)}`),
    getGroups: () => request('/groups'),
    createGroup: (data) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
    getGroup: (groupId) => request(`/groups/${groupId}`),
    updateGroup: (groupId, data) => request(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteGroup: (groupId) => request(`/groups/${groupId}`, { method: 'DELETE' }),
    addMember: (groupId, userId) => request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeMember: (groupId, userId) => request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),

    getFriendExpenses: (friendId) => request(`/friends/${friendId}/expenses`),
    addFriendExpense: (friendId, data) => request(`/friends/${friendId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
    getGroupExpenses: (groupId) => request(`/groups/${groupId}/expenses`),
    addGroupExpense: (groupId, data) => request(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
    editExpense: (expenseId, data) => request(`/social-expenses/${expenseId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteSocialExpense: (expenseId) => request(`/social-expenses/${expenseId}`, { method: 'DELETE' }),
    deleteSocialPayment: (paymentId) => request(`/social-payments/${paymentId}`, { method: 'DELETE' }),

    getFriendBalance: (friendId) => request(`/friends/${friendId}/balance`),
    getGroupBalances: (groupId) => request(`/groups/${groupId}/balances`),

    settleFriend: (friendId, amount, shouldLog = false, payerId) => request(`/friends/${friendId}/settle`, { method: 'POST', body: JSON.stringify({ amount, shouldLog, payerId }) }),
    settleGroup: (groupId, toUserId, amount, shouldLog = false, payerId, receiverId) => request(`/groups/${groupId}/settle`, { method: 'POST', body: JSON.stringify({ toUserId, amount, shouldLog, payerId, receiverId }) }),
};
