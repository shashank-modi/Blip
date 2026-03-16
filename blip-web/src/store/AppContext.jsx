import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { api, setApiTokenGetter } from '../lib/api';
import toast from 'react-hot-toast';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

// ── Helpers ───────────────────────────────────────────────────────────────────
const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const CATEGORY_RULES = [
    { category: 'Food', keywords: ['pizza', 'burger', 'chai', 'coffee', 'lunch', 'dinner', 'breakfast', 'zomato', 'swiggy', 'food', 'eat', 'restaurant', 'biryani', 'dosa', 'maggi', 'snack', 'juice', 'milk', 'groceries', 'blinkit', 'zepto', 'instamart'] },
    { category: 'Transport', keywords: ['uber', 'ola', 'cab', 'auto', 'bus', 'metro', 'train', 'fuel', 'petrol', 'diesel', 'rapido', 'rickshaw', 'ticket', 'flight', 'irctc'] },
    { category: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'clothes', 'shirt', 'shoes', 'dress', 'jeans', 'meesho', 'nykaa', 'purse', 'bag'] },
    { category: 'Entertainment', keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'movie', 'cinema', 'pvr', 'inox', 'game', 'youtube'] },
    { category: 'Bills', keywords: ['electricity', 'wifi', 'internet', 'broadband', 'phone', 'recharge', 'water', 'gas', 'rent', 'maintenance'] },
    { category: 'Health', keywords: ['medicine', 'doctor', 'pharmacy', 'hospital', 'gym', 'yoga', 'medic', 'tablet', 'chemist'] },
];

const autoCategory = (text) => {
    const lower = text.toLowerCase();
    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.some(kw => lower.includes(kw))) return rule.category;
    }
    return null;
};

const normalizeExpense = (e) => ({ ...e, amount: Number(e.amount) });
const normalizeInvestment = (i) => ({ ...i, amount: Number(i.amount) });

const mergeRecurringForMonth = (templates, logs) => {
    const logByTemplateId = new Map(logs.map(log => [String(log.recurring_id), log]));
    return templates
        .map(template => {
            const log = logByTemplateId.get(String(template.id));
            return {
                id: String(template.id),
                templateId: String(template.id),
                logId: log ? String(log.id) : null,
                title: template.title,
                amount: Number(template.amount),
                category: template.category || 'Bills',
                dueDate: Number(template.due_day || 1),
                isPaid: Boolean(log?.paid_at),
            };
        })
        .sort((a, b) => a.dueDate - b.dueDate);
};

// ── Styled toasts ─────────────────────────────────────────────────────────────
const toastStyle = {
    background: '#202020', color: '#ffffff',
    border: 'none', borderRadius: '99px',
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '13px', fontWeight: 600,
    padding: '10px 20px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
};

const showToast = {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
    const { isLoaded: authLoaded, isSignedIn, getToken, signOut } = useAuth();
    const { user: clerkUser } = useUser();

    const [user, setUser] = useState({ name: '', budget: 0, isNewUser: true, email: '' });
    const [currentScreen, setCurrentScreen] = useState('home');
    const [expenses, setExpenses] = useState([]);
    const [recurring, setRecurring] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [shoppingList, setShoppingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const categories = useMemo(() => ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'General'], []);

    // ── Feedback state ────────────────────────────────────────────────────────
    // Rule: trigger animations/toasts BEFORE await — same tick as optimistic UI update.
    const [flowAnim, setFlowAnim] = useState({ show: false, type: 'expense', amount: 0 });
    const [celebration, setCelebration] = useState({ show: false, type: 'paid', amount: 0, label: '' });

    const triggerFlow = (type, amount) => setFlowAnim({ show: true, type, amount });
    const triggerCelebration = (type, amount, label) => setCelebration({ show: true, type, amount, label });
    const dismissFlow = () => setFlowAnim(p => ({ ...p, show: false }));
    const dismissCelebration = () => setCelebration(p => ({ ...p, show: false }));

    // ── Error handling ────────────────────────────────────────────────────────
    const setErrorFrom = useCallback((err, fallback) => {
        setError(err?.message || fallback);
        console.error(fallback, err);
    }, []);

    const clearError = () => setError('');

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    const bootstrapData = useCallback(async () => {
        if (!isSignedIn || !clerkUser) return;
        setLoading(true);
        setError('');
        try {
            const name = clerkUser.fullName || clerkUser.firstName || '';
            const email = clerkUser.primaryEmailAddress?.emailAddress || '';

            const syncResult = await api.syncUser({ name, email });
            const me = await api.getMe();
            const isNewUser = syncResult.created === true;

            setUser({
                name: me.name || name,
                budget: Number(me.monthly_budget || 0),
                isNewUser,
                email: me.email || email,
            });

            if (isNewUser) { setCurrentScreen('onboarding'); setLoading(false); return; }

            setCurrentScreen('home');
            await api.generateRecurringLogs();

            const [expensesData, recurringTemplates, recurringLogs, investmentsResponse, shoppingData] = await Promise.all([
                api.getExpenses(),
                api.getRecurringTemplates(),
                api.getRecurringLogs(currentMonth()),
                api.getInvestments(),
                api.getShoppingItems(),
            ]);

            setExpenses(expensesData.map(normalizeExpense));
            setRecurring(mergeRecurringForMonth(recurringTemplates, recurringLogs));
            setInvestments((investmentsResponse.investments || []).map(normalizeInvestment));
            setShoppingList(shoppingData || []);
        } catch (err) {
            setErrorFrom(err, 'Failed to load app data');
        } finally {
            setLoading(false);
        }
    }, [isSignedIn, clerkUser, setErrorFrom]);

    useEffect(() => {
        if (!authLoaded) return;
        if (!isSignedIn) {
            setApiTokenGetter(null);
            setUser({ name: '', budget: 0, isNewUser: true, email: '' });
            setExpenses([]); setRecurring([]); setInvestments([]); setShoppingList([]);
            setCurrentScreen('home'); setLoading(false);
            return;
        }
        setApiTokenGetter(getToken);
        bootstrapData();
    }, [authLoaded, isSignedIn, getToken, bootstrapData]);

    // ── Refresh helpers ───────────────────────────────────────────────────────
    const refreshRecurring = useCallback(async () => {
        try {
            const [templates, logs] = await Promise.all([
                api.getRecurringTemplates(),
                api.getRecurringLogs(currentMonth()),
            ]);
            setRecurring(mergeRecurringForMonth(templates, logs));
        } catch (err) { setErrorFrom(err, 'Failed to refresh recurring payments'); }
    }, [setErrorFrom]);

    const refreshInvestments = useCallback(async () => {
        try {
            const res = await api.getInvestments();
            setInvestments((res.investments || []).map(normalizeInvestment));
        } catch (err) { setErrorFrom(err, 'Failed to refresh investments'); }
    }, [setErrorFrom]);

    // ── NLP parser ────────────────────────────────────────────────────────────
    const parseExpenseInput = (input) => {
        const parts = input.trim().split(/\s+/);
        if (!parts.length) return null;
        const first = parseFloat(parts[0]);
        if (!isNaN(first) && first > 0) return { amount: first, title: parts.slice(1).join(' ') };
        const last = parseFloat(parts[parts.length - 1]);
        if (!isNaN(last) && last > 0) return { amount: last, title: parts.slice(0, -1).join(' ') };
        return null;
    };

    // ── EXPENSES ──────────────────────────────────────────────────────────────

    const addExpenseNLP = async (inputStr, selectedCategory) => {
        const parsed = parseExpenseInput(inputStr);
        if (!parsed) return;
        let { amount, title: description } = parsed;
        description = toTitleCase(description || 'Manual Entry');
        const bestCat = selectedCategory || autoCategory(description) || 'General';
        const tempId = `temp-${Date.now()}`;
        const tempExp = { id: tempId, amount, description, category: bestCat, date: new Date().toISOString() };

        if (!window.navigator.onLine) {
            toast.error("Can't save while offline. Please reconnect.");
            return;
        }
        setExpenses(prev => [tempExp, ...prev]);
        triggerFlow('expense', amount);

        try {
            const created = await api.createExpense({ amount, description, category: bestCat });
            setExpenses(prev => prev.map(e => e.id === tempId ? normalizeExpense(created) : e));
        } catch (err) {
            setErrorFrom(err, 'Failed to add expense');
            setExpenses(prev => prev.filter(e => e.id !== tempId));
        }
    };

    const deleteExpense = async (id) => {
        // Optimistic + toast — before await
        setExpenses(prev => prev.filter(e => String(e.id) !== String(id)));
        showToast.success('Transaction removed');
        try {
            await api.deleteExpense(id);
        } catch (err) {
            setErrorFrom(err, 'Failed to delete expense');
            await bootstrapData();
        }
    };

    const updateExpense = async (id, updates) => {
        // Optimistic + toast — before await
        setExpenses(prev => prev.map(e => String(e.id) === String(id) ? { ...e, ...updates } : e));
        showToast.success('Changes saved');
        try {
            const payload = {};
            if (updates.amount !== undefined) payload.amount = parseFloat(updates.amount);
            if (updates.description !== undefined) payload.description = updates.description;
            if (updates.category !== undefined) payload.category = updates.category;
            if (updates.date !== undefined) payload.date = updates.date;
            const updated = await api.updateExpense(id, payload);
            setExpenses(prev => prev.map(e => String(e.id) === String(id) ? normalizeExpense(updated) : e));
        } catch (err) {
            setErrorFrom(err, 'Failed to update expense');
        }
    };

    // ── INCOME ────────────────────────────────────────────────────────────────

    const addIncome = async (amount, source) => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) return;
        const tempId = `temp-${Date.now()}`;
        const tempExp = { id: tempId, amount: parsedAmount, description: source || 'Added Funds', category: 'Income', date: new Date().toISOString() };

        // Optimistic + animation — before await
        setUser(prev => ({ ...prev, budget: prev.budget + parsedAmount }));
        setExpenses(prev => [tempExp, ...prev]);
        triggerFlow('income', parsedAmount);

        try {
            const result = await api.addIncome({ amount: parsedAmount, description: source || 'Added Funds' });
            setUser(prev => ({ ...prev, budget: Number(result.new_budget) }));
            if (result.transaction) {
                setExpenses(prev => prev.map(e => e.id === tempId ? normalizeExpense(result.transaction) : e));
            }
        } catch (err) {
            setErrorFrom(err, 'Failed to add income');
            await bootstrapData();
        }
    };

    // ── BUDGET ────────────────────────────────────────────────────────────────

    const updateUserBudget = async (newBudget) => {
        const parsed = parseFloat(newBudget);
        if (!parsed || parsed <= 0) return;

        // Optimistic + toast — before await
        setUser(prev => ({ ...prev, budget: parsed }));
        showToast.success(`Budget updated to ₹${parsed.toLocaleString('en-IN')}`);

        try {
            await api.updateBudget(parsed);
        } catch (err) {
            setErrorFrom(err, 'Failed to update budget');
            await bootstrapData();
        }
    };

    // ── ONBOARDING ────────────────────────────────────────────────────────────

    const completeOnboarding = async (name, budget, source) => {
        try {
            const email = clerkUser?.primaryEmailAddress?.emailAddress || '';
            const updated = await api.updateBudget(parseFloat(budget));
            if (source) {
                try { await api.createExpense({ amount: parseFloat(budget), description: source, category: 'Income' }); }
                catch (e) { console.error('Failed to log initial income', e); }
            }
            setUser(prev => ({
                ...prev,
                name: updated.name || name,
                budget: Number(updated.monthly_budget || budget),
                isNewUser: false,
                email: updated.email || email,
            }));
            await api.generateRecurringLogs();
            const [expensesData, recurringTemplates, recurringLogs, investmentsResponse] = await Promise.all([
                api.getExpenses(),
                api.getRecurringTemplates(),
                api.getRecurringLogs(currentMonth()),
                api.getInvestments(),
            ]);
            setExpenses(expensesData.map(normalizeExpense));
            setRecurring(mergeRecurringForMonth(recurringTemplates, recurringLogs));
            setInvestments((investmentsResponse.investments || []).map(normalizeInvestment));
            setCurrentScreen('home');
        } catch (err) {
            setErrorFrom(err, 'Failed to complete onboarding');
        }
    };

    // ── RECURRING ─────────────────────────────────────────────────────────────

    const addRecurring = async (title, amount, category, dueDate) => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) return;
        const cTitle = toTitleCase(title);
        const bestCat = category || autoCategory(cTitle) || 'Bills';
        const tempItem = {
            id: `temp-${Date.now()}`, templateId: `temp-${Date.now()}`,
            logId: null, title: cTitle, amount: parsedAmount,
            category: bestCat, dueDate: parseInt(dueDate, 10) || 1, isPaid: false,
        };

        // Optimistic + toast — before await
        setRecurring(prev => [...prev, tempItem].sort((a, b) => a.dueDate - b.dueDate));
        showToast.success('Payment scheduled');

        try {
            await api.createRecurringTemplate({ title: cTitle, amount: parsedAmount, category: bestCat, due_day: parseInt(dueDate, 10) || 1 });
            refreshRecurring();
        } catch (err) {
            setErrorFrom(err, 'Failed to add recurring payment');
            refreshRecurring();
        }
    };

    const deleteRecurring = async (id) => {
        // Optimistic + toast — before await
        setRecurring(prev => prev.filter(item => String(item.templateId) !== String(id)));
        showToast.success('Payment removed');

        try {
            await api.deleteRecurringTemplate(id);
            refreshRecurring();
        } catch (err) {
            if (err.status === 404) return; // already deleted — fine
            setErrorFrom(err, 'Failed to delete recurring payment');
            refreshRecurring();
        }
    };

    const updateRecurringItem = async (id, updates) => {
        // Optimistic + toast — before await
        setRecurring(prev => prev.map(item =>
            String(item.templateId) === String(id) ? { ...item, ...updates } : item
        ));
        showToast.success('Payment updated');

        try {
            const payload = {};
            if (updates.amount !== undefined) payload.amount = parseFloat(updates.amount);
            if (updates.title !== undefined) payload.title = updates.title;
            if (updates.dueDate !== undefined) payload.due_day = parseInt(updates.dueDate, 10);
            if (updates.category !== undefined) payload.category = updates.category;
            await api.updateRecurringTemplate(id, payload);
            refreshRecurring();
        } catch (err) {
            setErrorFrom(err, 'Failed to update recurring payment');
            refreshRecurring();
        }
    };

    const markRecurringPaid = async (templateId) => {
        try {
            let recurringItem = recurring.find(item => String(item.templateId) === String(templateId));
            if (!recurringItem) return;

            if (!recurringItem.logId) {
                await api.generateRecurringLogs();
                const [freshTemplates, freshLogs] = await Promise.all([
                    api.getRecurringTemplates(),
                    api.getRecurringLogs(currentMonth()),
                ]);
                const merged = mergeRecurringForMonth(freshTemplates, freshLogs);
                setRecurring(merged);
                recurringItem = merged.find(item => String(item.templateId) === String(templateId));
                if (!recurringItem?.logId) return;
            }

            const tempId = `temp-${Date.now()}`;
            const tempExp = {
                id: tempId,
                amount: Number(recurringItem.amount),
                description: recurringItem.title,
                category: recurringItem.category || 'Bills',
                date: new Date().toISOString(),
            };

            // Optimistic + animation — before await
            setRecurring(prev => prev.map(item =>
                String(item.templateId) === String(templateId) ? { ...item, isPaid: true } : item
            ));
            setExpenses(prev => [tempExp, ...prev]);
            triggerCelebration('paid', recurringItem.amount, recurringItem.title);

            const result = await api.markRecurringPaid(recurringItem.logId, recurringItem.amount);

            if (result?.expense) {
                setExpenses(prev => prev.map(e => e.id === tempId ? normalizeExpense(result.expense) : e));
            } else {
                const expData = await api.getExpenses();
                setExpenses(expData.map(normalizeExpense));
            }

            const [templates, logs] = await Promise.all([
                api.getRecurringTemplates(),
                api.getRecurringLogs(currentMonth()),
            ]);
            setRecurring(mergeRecurringForMonth(templates, logs));
        } catch (err) {
            setErrorFrom(err, 'Failed to mark recurring payment as paid');
            await refreshRecurring();
        }
    };

    // ── INVESTMENTS ───────────────────────────────────────────────────────────

    const addInvestment = async (title, amount, type) => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) return;
        const cTitle = toTitleCase(title);

        // Animation — before await (optimistic, no UI item yet since we need real ID)
        triggerCelebration('investment', parsedAmount, cTitle);

        try {
            const created = await api.createInvestment({ title: cTitle, amount: parsedAmount, type });
            setInvestments(prev => [normalizeInvestment(created), ...prev]);
        } catch (err) {
            setErrorFrom(err, 'Failed to add investment');
        }
    };

    const deleteInvestment = async (id) => {
        // Optimistic + toast — before await
        setInvestments(prev => prev.filter(i => String(i.id) !== String(id)));
        showToast.success('Investment removed');

        try {
            await api.deleteInvestment(id);
            refreshInvestments();
        } catch (err) {
            setErrorFrom(err, 'Failed to delete investment');
            refreshInvestments();
        }
    };

    const updateInvestmentItem = async (id, updates) => {
        // Optimistic + toast — before await
        setInvestments(prev => prev.map(i => String(i.id) === String(id) ? { ...i, ...updates } : i));
        showToast.success('Investment updated');

        try {
            const payload = {};
            if (updates.amount !== undefined) payload.amount = parseFloat(updates.amount);
            if (updates.title !== undefined) payload.title = updates.title;
            if (updates.sip_date !== undefined) payload.sip_date = parseInt(updates.sip_date, 10);
            const updated = await api.updateInvestment(id, payload);
            setInvestments(prev => prev.map(i => String(i.id) === String(id) ? normalizeInvestment(updated) : i));
        } catch (err) {
            setErrorFrom(err, 'Failed to update investment');
            refreshInvestments();
        }
    };

    // ── SHOPPING ──────────────────────────────────────────────────────────────

    const addShoppingItem = async (name) => {
        if (!name?.trim()) return;
        const tempItem = { id: `temp-${Date.now()}`, name };

        // Optimistic + toast — before await
        setShoppingList(prev => [tempItem, ...prev]);
        showToast.success('Added to bag');

        try {
            const created = await api.createShoppingItem({ name });
            setShoppingList(prev => prev.map(i => i.id === tempItem.id ? created : i));
        } catch (err) {
            setErrorFrom(err, 'Failed to add shopping item');
            const data = await api.getShoppingItems();
            setShoppingList(data || []);
        }
    };

    const updateShoppingItem = async (id, name) => {
        if (!name?.trim()) return;

        // Optimistic + toast — before await
        setShoppingList(prev => prev.map(i => String(i.id) === String(id) ? { ...i, name } : i));
        showToast.success('Item updated');

        if (String(id).startsWith('temp-')) return;
        try {
            const updated = await api.updateShoppingItem(id, { name });
            setShoppingList(prev => prev.map(i => String(i.id) === String(id) ? updated : i));
        } catch (err) {
            setErrorFrom(err, 'Failed to update shopping item');
            const data = await api.getShoppingItems();
            setShoppingList(data || []);
        }
    };

    const deleteShoppingItem = async (id) => {
        // Optimistic + toast — before await
        setShoppingList(prev => prev.filter(i => String(i.id) !== String(id)));
        showToast.success('Removed from bag');

        if (String(id).startsWith('temp-')) return;
        try {
            await api.deleteShoppingItem(id);
        } catch (err) {
            setErrorFrom(err, 'Failed to delete shopping item');
            const data = await api.getShoppingItems();
            setShoppingList(data || []);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const getSpentThisMonth = () => {
        const now = new Date();
        return expenses.reduce((total, expense) => {
            const d = new Date(expense.date);
            if (
                expense.category !== 'Income' &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
            ) return total + Number(expense.amount);
            return total;
        }, 0);
    };

    const logout = async () => await signOut();

    // ── Context value ─────────────────────────────────────────────────────────
    const value = {
        user,
        currentScreen, setCurrentScreen,
        categories,
        expenses,
        recurring,
        investments,
        shoppingList,
        loading,
        error, clearError,
        isSignedIn,

        // Feedback — consumed by FeedbackRenderer in App.jsx
        flowAnim, dismissFlow,
        celebration, dismissCelebration,

        // Mutations
        addExpenseNLP,
        addIncome,
        deleteExpense,
        updateExpense,

        completeOnboarding,
        updateUserBudget,

        markRecurringPaid,
        deleteRecurring,
        updateRecurringItem,
        addRecurring,

        addInvestment,
        deleteInvestment,
        updateInvestmentItem,

        addShoppingItem,
        updateShoppingItem,
        deleteShoppingItem,

        // Utilities
        getSpentThisMonth,
        refreshRecurring,
        refreshInvestments,
        bootstrapData,
        logout,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};