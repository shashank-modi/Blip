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

const request = async (path, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (tokenGetter) {
        const token = await tokenGetter();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        const error = new Error(payload?.error || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
};

export const api = {
    syncUser: (data) => request('/users/sync', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => request('/users/me'),
    updateBudget: (budget) => request('/users/me/budget', { method: 'PATCH', body: JSON.stringify({ budget }) }),

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

    getDashboardSummary: (month) => request(`/dashboard/summary${toQueryString({ month })}`)
};
