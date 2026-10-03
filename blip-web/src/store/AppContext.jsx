import { suggestCategory, expenseCategories } from '../utils/categories';
import { disablePush } from '../lib/pwa';
import { monthKey, expensesForMonth } from '../utils/month';
import { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { api, setApiTokenGetter } from '../lib/api';
import toast from 'react-hot-toast';


const CURRENT_APP_VERSION = '3.0.0';

export const AppContext = createContext();
export const useApp = () => useContext(AppContext);

// ── Helpers ───────────────────────────────────────────────────────────────────
const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};


const isNewerVersion = (v1, v2) => {
    if (!v2) return true;
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < parts1.length; i++) {
        if (parts1[i] > (parts2[i] || 0)) return true;
        if (parts1[i] < (parts2[i] || 0)) return false;
    }
    return false;
};


const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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

const showToast = {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
    const { isLoaded: authLoaded, isSignedIn, getToken, signOut } = useAuth();
    const { user: clerkUser } = useUser();

    const version = CURRENT_APP_VERSION;

    const [user, setUser] = useState({ id: null, name: '', budget: 0, isNewUser: true, email: '', phone: '' });
    const [currentScreen, setCurrentScreen] = useState(() => new URLSearchParams(window.location.search).get('tab') === 'activity' ? 'activity' : 'friends');
    const [activeMonth, setActiveMonth] = useState(monthKey);
    const [expenses, setExpenses] = useState([]);
    const [budgetHistory, setBudgetHistory] = useState([]);
    const budgetClaimPending = useRef(null);
    const [recurring, setRecurring] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [shoppingList, setShoppingList] = useState([]);
    const [friends, setFriends] = useState([]);
    const [socialSummary, setSocialSummary] = useState({ owed: 0, owing: 0 });
    const [groups, setGroups] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [notificationError, setNotificationError] = useState('');
    const seenNotifications = useRef(null);
    const notificationBusy = useRef(false);
    const notificationRevision = useRef(0);
    const [loading, setLoading] = useState(true);
    const [startupError, setStartupError] = useState('');
    const initialized = useRef(false);
    const bootstrappedAccount = useRef(null);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshPending = useRef(null);

    const categories = useMemo(() => expenseCategories, []);

    // ── Feedback state ────────────────────────────────────────────────────────
    const [flowAnim, setFlowAnim] = useState({ show: false, type: 'expense', amount: 0 });
    const [celebration, setCelebration] = useState({ show: false, type: 'paid', amount: 0, label: '' });
    const [showWhatsNew, setShowWhatsNew] = useState(false);

    const triggerFlow = (type, amount) => setFlowAnim({ show: true, type, amount });
    const triggerCelebration = (type, amount, label) => setCelebration({ show: true, type, amount, label });
    const dismissFlow = () => setFlowAnim(p => ({ ...p, show: false }));
    const dismissCelebration = () => setCelebration(p => ({ ...p, show: false }));

    const [activeFriendContext, setActiveFriendContext] = useState({
        details: null,
        expenses: [],   // From api.getFriendExpenses
        balance: 0      // From api.getFriendBalance
    });

    const [activeGroupContext, setActiveGroupContext] = useState({
        metadata: null, // From api.getGroup (name, members, icon)
        expenses: [],   // From api.getGroupExpenses
        balances: [],    // From api.getGroupBalances
        suggestions: []
    });

    const setErrorFrom = useCallback((err, fallback) => {
        setError(err?.message || fallback);
        console.error(fallback, err);
    }, []);


    const checkVersionOnLoad = useCallback((userFromDb) => {
        const lastSeen = userFromDb.last_seen_version;

        if (isNewerVersion(CURRENT_APP_VERSION, lastSeen)) {
            setShowWhatsNew(true);
        }
    }, []);

    const dismissWhatsNew = async () => {
        setShowWhatsNew(false);
        try {
            await api.updateUserVersion(CURRENT_APP_VERSION);
            setUser(prev => ({ ...prev, last_seen_version: CURRENT_APP_VERSION }));
        } catch (e) {
            console.error("Failed to update version stamp", e);
        }
    };

    const friendDetailRevision = useRef(0);
    const syncFriendDetail = useCallback(async (friendId) => {
        if (!friendId) return;
        const revision = ++friendDetailRevision.current;
        try {
            const [exps, friendsData] = await Promise.all([
                api.getFriendExpenses(friendId),
                api.getFriends()
            ]);

            if (revision !== friendDetailRevision.current) return;
            const normalizedFriends = (friendsData || []).map(f => ({ ...f, balance: parseFloat(f.balance || 0) }));
            setFriends(normalizedFriends);

            const friendBal = normalizedFriends.find(f => f.id === friendId)?.balance ?? 0;

            setActiveFriendContext(prev => ({
                ...prev,
                details: normalizedFriends.find(friend => friend.id === friendId) || { id:friendId },
                expenses: exps,
                balance: friendBal
            }));
            return true;
        } catch (err) {
            setErrorFrom(err, 'Failed to sync friend details');
            return false;
        }
    }, [setFriends, setErrorFrom]);

    const syncGroupDetail = useCallback(async (groupId) => {
        if (!groupId) return;
        try {
            const [meta, exps, bals, totals] = await Promise.all([
                api.getGroup(groupId),
                api.getGroupExpenses(groupId),
                api.getGroupBalances(groupId),
                api.getGroupTotals(groupId)
            ]);

            const groupData = {
                metadata: meta,
                totals,
                expenses: exps,
                balances: bals.balances || [],
                suggestions: bals.settlements || []
            };

            setActiveGroupContext(groupData);
            setGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                balance: parseFloat(meta.balance || 0),
                totalSpent: Number(meta.totalSpent || 0),
                name: meta.name,
                icon: meta.icon,
                members: meta.members
            } : g));

            return groupData;
        } catch (err) {
            setErrorFrom(err, 'Failed to sync group details');
            return false;
        }
    }, [setErrorFrom]);

    const clearError = () => setError('');

    const bootstrapData = useCallback(async (isRefresh = false) => {
        if (!isSignedIn || !clerkUser) return;
        if (!isRefresh && !initialized.current) setLoading(true);
        setStartupError('');
        setError('');

        try {
            const name = clerkUser.fullName || clerkUser.firstName || '';
            const email = clerkUser.primaryEmailAddress?.emailAddress || '';

            const syncResult = await api.syncUser({ name, email });
            const userData = syncResult.user || await api.getMe();
            if (bootstrappedAccount.current !== clerkUser.id) return;
            const isNewUser = syncResult.created === true;

            setUser({
                id: clerkUser?.id,
                name: userData.name || name,
                budget: Number(userData.monthly_budget || 0),
                phone: userData.phone || '',
                suggestedPhone: clerkUser.primaryPhoneNumber?.phoneNumber || '',
                email: userData.email || email,
                isNewUser,
                isOnboarded: !!userData.is_onboarded,
                lastSeenVersion: userData.last_seen_version || '1.0.0'
            });

            if (!userData.is_onboarded) {
                initialized.current = true;
                setCurrentScreen('onboarding');
                setLoading(false);
                return;
            }

            if (isNewerVersion(CURRENT_APP_VERSION, userData.last_seen_version)) {
                setShowWhatsNew(true);
            }

            const [
                expensesData,
                recurringTemplates,
                recurringLogs,
                shoppingData,
                friendsData,
                groupsData,
                summaryData,
                budgets
            ] = await Promise.all([
                api.getExpenses(),
                api.getRecurringTemplates(),
                api.generateRecurringLogs(currentMonth()).then(()=>api.getRecurringLogs(currentMonth())),
                api.getShoppingItems(),
                api.getFriends(),
                api.getGroups(),
                api.getSocialSummary(),
                api.getBudgets(),
            ]);

            if (bootstrappedAccount.current !== clerkUser.id) return;
            setBudgetHistory(budgets.history);
            setUser(previous => ({...previous,budget:budgets.current?.amount ?? previous.budget}));
            setSocialSummary(summaryData);
            setExpenses(expensesData.map(normalizeExpense));
            setRecurring(mergeRecurringForMonth(recurringTemplates, recurringLogs));
            setShoppingList(shoppingData || []);

            setFriends((friendsData || []).map(f => ({ ...f, balance: parseFloat(f.balance || 0) })));
            setGroups((groupsData || []).map(g => ({
                ...g,
                totalSpent: Number(g.totalSpent || 0),
                balance: g.balance || "0.00"
            })));

            initialized.current = true;
            return true;
        } catch (err) {
            if (bootstrappedAccount.current !== clerkUser.id) return;
            if (!initialized.current) setStartupError(err.message || 'Could not load your account. Please try again.');
            setErrorFrom(err, 'Failed to load app data');
            return false;
        } finally {
            if (bootstrappedAccount.current === clerkUser.id) setLoading(false);
        }
    }, [isSignedIn, clerkUser, setErrorFrom]);

    useEffect(()=>{setApiTokenGetter(isSignedIn ? getToken : null);},[isSignedIn,getToken]);
    useEffect(() => {
        if (!authLoaded) return;
        if (!isSignedIn) {
            bootstrappedAccount.current = null;
            initialized.current = false;
            setStartupError('');
            setApiTokenGetter(null);
            setUser({ name: '', phone: '', budget: 0, isNewUser: true, email: '' });
            setExpenses([]); setRecurring([]); setInvestments([]); setShoppingList([]); setFriends([]); setGroups([]);
            setSocialSummary({ owed: 0, owing: 0 });
            setCurrentScreen('friends'); setLoading(false);
            return;
        }
        if (!clerkUser?.id || bootstrappedAccount.current === clerkUser.id) return;
        bootstrappedAccount.current = clerkUser.id;
        initialized.current = false;
        setActiveFriendContext({details:null,expenses:[],balance:0});
        setActiveGroupContext({metadata:null,expenses:[],balances:[],totals:null});
        bootstrapData();
    }, [authLoaded, isSignedIn, clerkUser?.id, bootstrapData]);

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

    const refreshSocial = useCallback(async () => {
        const revision=++notificationRevision.current;
        try {
            const [fRes, gRes, summary] = await Promise.all([
                api.getFriends(),
                api.getGroups(),
                api.getSocialSummary(),
                api.getNotifications().then(items=>{if(revision===notificationRevision.current){setNotifications(items);setNotificationError('');}}).catch(err=>{if(revision===notificationRevision.current)setNotificationError(err.message || 'Could not load activity');})
            ]);
            setSocialSummary(summary);
            setFriends((fRes || []).map(f => ({ ...f, balance: parseFloat(f.balance || 0) })));
            setGroups((gRes || []).map(g => ({
                ...g,
                totalSpent: Number(g.totalSpent || 0),
                balance: parseFloat(g.balance || 0)
            })));
        } catch (err) { setErrorFrom(err, 'Failed to refresh social data'); }
    }, [setErrorFrom]);

    const refreshNotifications = useCallback(async (force = false) => {
        if (force !== true && (notificationBusy.current || document.visibilityState === 'hidden')) return;
        notificationBusy.current = true;
        const revision=++notificationRevision.current;
        try {
            const items = await api.getNotifications();
            if(revision!==notificationRevision.current) return;
            const previousSeen = seenNotifications.current;
            seenNotifications.current = new Set(items.map(item => item.id));
            if (previousSeen) {
                const added = items.filter(item => !previousSeen.has(item.id) && !item.read_at && item.actor_id !== user.id);
                if (added.length) {
                    toast(added.length === 1 ? added[0].message : `${added.length} new expense updates`, { icon: '🔔' });
                    await refreshSocial();
                    if (activeFriendContext.details?.id) await syncFriendDetail(activeFriendContext.details.id);
                    if (activeGroupContext.metadata?.id) await syncGroupDetail(activeGroupContext.metadata.id);
                }
            }
            if(revision!==notificationRevision.current) return;
            seenNotifications.current = new Set(items.map(item => item.id));
            setNotifications(items);
            setNotificationError('');
            return true;
        } catch (err) { setNotificationError(err.message || 'Could not load notifications'); return false; }
        finally { notificationBusy.current = false; }
    }, [refreshSocial, syncFriendDetail, syncGroupDetail, activeFriendContext.details?.id, activeGroupContext.metadata?.id, user.id]);

    useEffect(() => {
        notificationRevision.current++;
        seenNotifications.current = null;
        setNotifications([]);
    }, [user.id]);

    useEffect(() => {
        if (!isSignedIn || !user.isOnboarded) return;
        refreshNotifications();
        const timer = setInterval(refreshNotifications, 15000);
        window.addEventListener('focus', refreshNotifications);
        document.addEventListener('visibilitychange', refreshNotifications);
        return () => { clearInterval(timer); window.removeEventListener('focus', refreshNotifications); document.removeEventListener('visibilitychange', refreshNotifications); };
    }, [user.id, user.isOnboarded, isSignedIn, refreshNotifications]);

    const markNotificationsRead = async ids => {
        try {
            await api.markNotificationsRead(ids);
            setNotifications(items => items.map(item => ids.includes(item.id) ? { ...item, read_at: new Date().toISOString() } : item));
            return true;
        } catch (err) { setNotificationError(err.message); return false; }
    };

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

    const addExpenseNLP = async (inputStr, selectedCategory, selectedDate) => {
        const parsed = parseExpenseInput(inputStr);
        if (!parsed) return false;
        let { amount, title: description } = parsed;
        description = toTitleCase(description || 'Manual Entry');
        const bestCat = selectedCategory || suggestCategory(description, expenses) || 'General';
        const dateStr = selectedDate ? new Date(selectedDate).toISOString() : new Date().toISOString();

        const tempId = `temp-${Date.now()}`;
        const tempExp = { id: tempId, amount, description, category: bestCat, date: dateStr};

        if (!window.navigator.onLine) {
            toast.error("Can't save while offline. Please reconnect.");
            return false;
        }
        setExpenses(prev => [tempExp, ...prev]);

        try {
            const created = await api.createExpense({ amount, description, category: bestCat, date: dateStr });
            setExpenses(prev => prev.map(e => e.id === tempId ? normalizeExpense(created) : e));
            void refreshNotifications(true);
            triggerFlow('expense', amount);
            return true;
        } catch (err) {
            setErrorFrom(err, 'Failed to add expense');
            setExpenses(prev => prev.filter(e => e.id !== tempId));
            return false;
        }
    };

    const deleteExpense = async (id) => {
        try {
            await api.deleteExpense(id);
            setExpenses(prev => prev.filter(e => String(e.id) !== String(id)));
            void refreshNotifications(true);
            showToast.success('Transaction removed');
            return true;
        } catch (err) {
            setErrorFrom(err, 'Failed to delete expense');
            showToast.error('Could not delete this entry. Please try again.');
            return false;
        }
    };

    const updateExpense = async (id, updates) => {
        try {
            const payload = {};
            if (updates.amount !== undefined) payload.amount = parseFloat(updates.amount);
            if (updates.description !== undefined) payload.description = updates.description;
            if (updates.category !== undefined) payload.category = updates.category;
            if (updates.date !== undefined) payload.date = updates.date;
            const updated = await api.updateExpense(id, payload);
            setExpenses(prev => prev.map(e => String(e.id) === String(id) ? normalizeExpense(updated) : e));
            void refreshNotifications(true);
            showToast.success('Changes saved');
            return true;
        } catch (err) {
            setErrorFrom(err, 'Failed to update expense');
            return false;
        }
    };

    // ── INCOME ────────────────────────────────────────────────────────────────

    const addIncome = async (amount, source) => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) return false;
        const tempId = `temp-${Date.now()}`;
        const tempExp = { id: tempId, amount: parsedAmount, description: source || 'Added Funds', category: 'Income', date: new Date().toISOString() };

        // Optimistic + animation — before await
        setUser(prev => ({ ...prev, budget: prev.budget + parsedAmount }));
        setExpenses(prev => [tempExp, ...prev]);

        try {
            const result = await api.addIncome({ amount: parsedAmount, description: source || 'Added Funds' });
            void refreshNotifications(true);
            setUser(prev => ({ ...prev, budget: Number(result.new_budget) }));
            if (result.transaction) {
                setExpenses(prev => prev.map(e => e.id === tempId ? normalizeExpense(result.transaction) : e));
            }
            triggerFlow('income', parsedAmount);
            return true;
        } catch (err) {
            setErrorFrom(err, 'Failed to add income');
            await bootstrapData();
            return false;
        }
    };

    // ── BUDGET ────────────────────────────────────────────────────────────────

    const claimMonthlyBudgetPrompt = useCallback(async () => {
        if (budgetClaimPending.current) return false;
        budgetClaimPending.current = true;
        try {
            const state = await api.claimBudgetCheckIn();
            setBudgetHistory(state.history);
            return state.showPrompt;
        } catch (err) { setErrorFrom(err,'Could not check this month’s budget'); return false; }
        finally { budgetClaimPending.current = null; }
    }, [setErrorFrom]);

    const updateUserBudget = async newBudget => {
        const parsed=Number(newBudget);
        if (!Number.isFinite(parsed) || parsed < 0) return false;
        try {
            const saved=await api.updateBudget(parsed);
            setUser(previous=>({...previous,budget:Number(saved.monthly_budget)}));
            setBudgetHistory(saved.budgets.history);
            showToast.success('Monthly budget saved');
            return true;
        } catch(err) { setErrorFrom(err,'Could not save budget'); return false; }
    };

    const updatePhone = async (phone) => {
        try {
            const saved = await api.updatePhone(phone);
            setUser(prev => ({ ...prev, phone: saved.phone }));
            showToast.success('Phone number updated');
        } catch (err) { setErrorFrom(err, 'Failed to update phone'); throw err; }
    };

    const completeOnboarding = async (name, budget, source, phone) => {
        try {
            const parsedAmount = parseFloat(budget) || 0;
            await api.updateBudget(parsedAmount, phone);
            await api.updateOnboardingStatus(true);
            await api.updateUserVersion(CURRENT_APP_VERSION);
            if (source && parsedAmount > 0) {
                try {
                    await api.createExpense({
                        amount: parsedAmount,
                        description: `Initial Budget: ${source}`,
                        category: 'Income'
                    });
                } catch (e) { console.error('Income log failed', e); }
            }

            await bootstrapData(true);

            setCurrentScreen('friends');
            showToast.success('Welcome to blip.');
        } catch (err) {
            setErrorFrom(err, 'Onboarding failed');
            showToast.error('Could not save your profile.');
            throw err;
        }
    };

    // ── RECURRING ─────────────────────────────────────────────────────────────
    const addRecurring = async (title, amount, category, dueDate) => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) return false;
        const cTitle = toTitleCase(title);
        const bestCat = category || suggestCategory(cTitle, expenses) || 'Bills';
        const tempItem = {
            id: `temp-${Date.now()}`, templateId: `temp-${Date.now()}`,
            logId: null, title: cTitle, amount: parsedAmount,
            category: bestCat, dueDate: parseInt(dueDate, 10) || 1, isPaid: false,
        };

        // Optimistic + toast — before await
        setRecurring(prev => [...prev, tempItem].sort((a, b) => a.dueDate - b.dueDate));

        try {
            await api.createRecurringTemplate({ title: cTitle, amount: parsedAmount, category: bestCat, due_day: parseInt(dueDate, 10) || 1 });
            await refreshRecurring();
            showToast.success('Payment scheduled');
            return true;
        } catch (err) {
            setErrorFrom(err, 'Failed to add recurring payment');
            await refreshRecurring();
            return false;
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
                const budgets = await api.getBudgets();
            setBudgetHistory(budgets.history);
            setUser(previous => ({...previous,budget:budgets.current?.amount ?? previous.budget}));
            await api.generateRecurringLogs(currentMonth());
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


            const result = await api.markRecurringPaid(recurringItem.logId, recurringItem.amount);
            triggerCelebration('paid', recurringItem.amount, recurringItem.title);
            void refreshNotifications(true);

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
            setExpenses((await api.getExpenses()).map(normalizeExpense));
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


    // ── SOCIAL (FRIENDS & GROUPS) ─────────────────────────────────────────────

    const searchByPhone = async (phone) => {
        try {
            return await api.searchByPhone(phone);
        } catch (err) {
            if (err.status === 404) return null;
            throw err;
        }
    };

    const addFriend = async (friendId) => {
        try {
            await api.addFriend(friendId);
            showToast.success('Friend added!');
            await refreshSocial();
        } catch (err) { setErrorFrom(err, 'Failed to add friend'); throw err; }
    };

    const removeFriend = async (friendId) => {
        const oldFriends = [...friends];
        setFriends(prev => prev.filter(f => f.id !== friendId));
        showToast.success('Friend removed');

        try {
            await api.removeFriend(friendId);
        } catch (err) {
            setFriends(oldFriends);
            setErrorFrom(err, 'Could not remove friend');
        }
    };

    const createGroup = async (data) => {
        try {
            await api.createGroup(data);
            showToast.success('Group created');
            await refreshSocial();
        } catch (err) { setErrorFrom(err, 'Failed to create group'); throw err; }
    };

    const addFriendExpense = async (friendId, data) => {
        try {
            await api.addFriendExpense(friendId, data);
            triggerFlow('expense', data.amount);
            await Promise.all([refreshSocial(),syncFriendDetail(friendId)]);
        } catch (err) { setErrorFrom(err, 'Failed to add expense'); throw err; }
    };

    const addGroupExpense = async (groupId, data) => {
        try {
            await api.addGroupExpense(groupId, data);
            triggerFlow('expense', data.amount);
            await Promise.all([refreshSocial(),syncGroupDetail(groupId)]);
        } catch (err) { setErrorFrom(err, 'Failed to add group expense'); throw err; }
    };

    const editSocialExpense = async (expenseId, data) => {
        try {
            await api.editExpense(expenseId, data);
            showToast.success('Expense updated');
            await refreshSocial();
        } catch (err) { setErrorFrom(err, 'Failed to edit expense'); throw err; }
    };

    const deleteSocialExpense = async (expenseId) => {
        try {
            await api.deleteSocialExpense(expenseId);
            showToast.success('Expense deleted');
            await refreshSocial();
        } catch (err) { setErrorFrom(err, 'Failed to delete expense'); throw err; }
    };

    const deleteSocialPayment = async (paymentId) => {
        try {
            await api.deleteSocialPayment(paymentId);
            setExpenses((await api.getExpenses()).map(normalizeExpense));
            showToast.success('Payment deleted');
            await refreshSocial();
        } catch (err) { setErrorFrom(err, 'Failed to delete payment'); throw err; }
    };

    const settleFriend = async (friendId, amount, name, shouldLog = false, payerId) => {
        try {
            const result = await api.settleFriend(friendId, amount, shouldLog, payerId);
            if (shouldLog) setExpenses((await api.getExpenses()).map(normalizeExpense));
            triggerFlow('settlement', amount);
            await refreshSocial();
        } catch (err) { setErrorFrom(err, 'Failed to settle with friend'); throw err; }
    };

    const settleGroup = async (groupId, toUserId, amount, name, owes, shouldLog = false, payerId, receiverId) => {
        try {
            const result = await api.settleGroup(groupId, toUserId, amount, shouldLog, payerId, receiverId);
            if (shouldLog) setExpenses((await api.getExpenses()).map(normalizeExpense));
            triggerFlow('settlement', amount);
            await refreshSocial();
        } catch (err) { setErrorFrom(err, 'Failed to settle in group'); throw err; }
    };

    const deleteGroup = async (groupId) => {
        try {
            await api.deleteGroup(groupId);
            await refreshSocial();
            showToast.success('Group archived');
        } catch (err) { setErrorFrom(err, 'Failed to archive group'); throw err; }
    };

    const updateGroupSettings = async (groupId, updates) => {
        try {
            await api.updateGroup(groupId, updates);
            await Promise.all([syncGroupDetail(groupId), refreshSocial()]);
            showToast.success('Group updated');
        } catch (err) { setErrorFrom(err, 'Failed to update group'); throw err; }
    };

    const addGroupMember = async (groupId, userId) => {
        try {
            await api.addMember(groupId, userId);
            await Promise.all([syncGroupDetail(groupId), refreshSocial()]);
            showToast.success('Member added');
        } catch (err) { setErrorFrom(err, 'Failed to add member'); throw err; }
    };

    const removeGroupMember = async (groupId, userId) => {
        try {
            await api.removeMember(groupId, userId);
            await Promise.all([syncGroupDetail(groupId), refreshSocial()]);
            showToast.success('Member removed');
        } catch (err) { setErrorFrom(err, 'Failed to remove member'); throw err; }
    };

    const monthlyExpenses = useMemo(() => expensesForMonth(expenses, activeMonth), [expenses, activeMonth]);
    const getSpentThisMonth = () => monthlyExpenses.reduce((sum, e) => sum + (e.category === 'Income' ? 0 : Number(e.amount)), 0);

    useEffect(() => {
        if (!isSignedIn || !user.isOnboarded) return;
        const checkMonth = () => {
            const nextMonth = monthKey();
            if (nextMonth !== activeMonth) {
                setActiveMonth(nextMonth);
                bootstrapData(true);
            }
        };
        const interval = setInterval(checkMonth, 30000);
        window.addEventListener('focus', checkMonth);
        document.addEventListener('visibilitychange', checkMonth);
        checkMonth();
        return () => { clearInterval(interval); window.removeEventListener('focus', checkMonth); document.removeEventListener('visibilitychange', checkMonth); };
    }, [activeMonth, isSignedIn, user.isOnboarded, bootstrapData]);

    useEffect(() => {
        const handleMessage = event => { if (event.data?.type === 'OPEN_ACTIVITY') setCurrentScreen('activity'); };
        navigator.serviceWorker?.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
    }, []);

    const logout = async () => {
        await disablePush().catch(() => {});
        await signOut();
    };

    const handleRefresh = useCallback(() => {
        if (refreshPending.current) return refreshPending.current;
        setIsRefreshing(true);
        const work = Promise.all([
            bootstrapData(true),
            refreshNotifications(true),
            ...(currentScreen === 'friends' && activeFriendContext.details?.id ? [syncFriendDetail(activeFriendContext.details.id)] : []),
            ...(currentScreen === 'friends' && activeGroupContext.metadata?.id ? [syncGroupDetail(activeGroupContext.metadata.id)] : []),
        ]).then(results => results.every(result => result !== false))
          .finally(() => { refreshPending.current = null; setIsRefreshing(false); });
        refreshPending.current = work;
        return work;
    }, [bootstrapData, refreshNotifications, currentScreen, activeFriendContext.details?.id, activeGroupContext.metadata?.id, syncFriendDetail, syncGroupDetail]);

    const value = {
        user,
        version,
        showWhatsNew,
        dismissWhatsNew,
        currentScreen,
        setCurrentScreen,
        categories,
        startupError,
        activeMonth, monthlyExpenses, budgetHistory, claimMonthlyBudgetPrompt,
        notifications, notificationError, refreshNotifications, markNotificationsRead,
        expenses,
        recurring,
        investments,
        shoppingList,
        friends, socialSummary,
        groups,
        loading,
        error, clearError,
        isSignedIn,

        flowAnim, dismissFlow,
        celebration, dismissCelebration,

        addExpenseNLP,
        addIncome,
        deleteExpense,
        updateExpense,

        completeOnboarding,
        updateUserBudget,
        updatePhone,

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

        searchByPhone,
        addFriend,
        removeFriend,
        createGroup,
        addFriendExpense,
        addGroupExpense,
        editSocialExpense,
        deleteSocialExpense,
        deleteSocialPayment,
        settleFriend,
        settleGroup,
        deleteGroup,
        updateGroupSettings,
        addGroupMember,
        removeGroupMember,

        getSpentThisMonth,
        isRefreshing,
        handleRefresh,
        activeFriendContext,
        setActiveFriendContext,
        syncFriendDetail,
        activeGroupContext,
        setActiveGroupContext,
        syncGroupDetail,
        refreshRecurring,
        refreshInvestments,
        refreshSocial,
        bootstrapData,
        logout,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};