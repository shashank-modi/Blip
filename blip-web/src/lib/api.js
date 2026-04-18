const rawBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const request = async (path, options = {}, retries = 6) => { // 6 retries * 5s = 30s total patience
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (tokenGetter) {
        const token = await tokenGetter();
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers
        });
        if (!response.ok && [502, 503, 504].includes(response.status) && retries > 0) {
            console.log(`Render waking up (Status ${response.status}). Retrying in 5s...`);
            await sleep(5000);
            return request(path, options, retries - 1);
        }

        const isJson = response.headers.get('content-type')?.includes('application/json');
        const payload = isJson ? await response.json() : null;

        if (!response.ok) {
            const error = new Error(payload?.error || `Request failed with status ${response.status}`);
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload;

    } catch (err) {
        if (retries > 0 && (err.message === 'Failed to fetch' || err.code === 'ECONNREFUSED')) {
            console.log("Network error (server likely asleep). Retrying in 5s...");
            await sleep(5000);
            return request(path, options, retries - 1);
        }
        throw err;
    }
};

export const api = {
    wakeup: () => request('/health'),

    syncUser: (data) => request('/users/sync', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => request('/users/me'),
    updateBudget: (budget, phone) => request('/users/me/budget', {
        method: 'PATCH',
        body: JSON.stringify({ budget, phone })
    }),

    updatePhone: (phone) => request('/users/me/phone', { method: 'PATCH', body: JSON.stringify({ phone }) }),
    updateUserVersion: (version) => request('/users/me/version', { method: 'PATCH', body: JSON.stringify({ version }) }),
    updateOnboardingStatus: () => request('/users/me/onboarding', { method: 'PATCH' }),

    getExpenses: (month) => request(`/expenses${toQueryString({ month })}`),
    createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

    generateRecurringLogs: () => request('/recurring/logs/generate', { method: 'POST' }),
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

    // Friends API methods
    searchByPhone: (phone) => request(`/users/search?phone=${phone}`),


    getFriends: () => request('/friends'),
    addFriend: (friendId) => request('/friends', { method: 'POST', body: JSON.stringify({ friendId }) }),
    removeFriend: (friendId) => request(`/friends/${friendId}`, { method: 'DELETE' }),

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

    settleFriend: (friendId, amount) => request(`/friends/${friendId}/settle`, { method: 'POST', body: JSON.stringify({ amount }) }),
    settleGroup: (groupId, toUserId, amount) => request(`/groups/${groupId}/settle`, { method: 'POST', body: JSON.stringify({ toUserId, amount }) }),
};
