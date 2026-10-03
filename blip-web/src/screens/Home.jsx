import { suggestCategory } from '../utils/categories';
import PageHeader from '../components/PageHeader';
import DatePicker from '../components/DatePicker';
import { localDate } from '../utils/splits';
import { History } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import SwipeableItem from '../components/SwipeableItem';
import BottomSheet from '../components/BottomSheet';
import DayInput from '../components/DayInput';
import EditExpenseSheet from '../components/EditExpenseSheet';
import EditRecurringSheet from '../components/EditRecurringSheet';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
// import GuidedTour from '../components/GuidedTour';

import { CalendarDays, Receipt, Repeat, Coffee, Car, ShoppingBag, Grid, CheckCircle2, Home as HomeIcon, HeartCrack, Briefcase, Gift, ArrowUpCircle, Plus, ArrowUpRight, LayoutDashboard, ChevronRight, Clapperboard, BookHeart, Hospital, ChevronDownIcon} from 'lucide-react';

const parseExpenseInput = (input) => {
    const parts = input.trim().split(/\s+/);
    if (parts.length === 0) return null;
    const first = parseFloat(parts[0]);
    if (!isNaN(first) && first > 0) return { amount: first, title: parts.slice(1).join(' ') };
    const last = parseFloat(parts[parts.length - 1]);
    if (!isNaN(last) && last > 0) return { amount: last, title: parts.slice(0, -1).join(' ') };
    return null;
};

export default function Home() {
    const {
        user, expenses, monthlyExpenses, activeMonth, updateUserBudget, claimMonthlyBudgetPrompt,
        addExpenseNLP, recurring, markRecurringPaid,
        deleteRecurring, updateRecurringItem,
        addRecurring, setCurrentScreen,
        getSpentThisMonth, deleteExpense, updateExpense, addIncome,
        shoppingList, addShoppingItem, updateShoppingItem, deleteShoppingItem
    } = useApp();


    const [showTour, setShowTour] = useState(true);


    const [nlpInput, setNlpInput] = useState('');
    const [selectedCat, setSelectedCat] = useState('');
    const [isPromptMonthOpen, setIsPromptMonthOpen] = useState(false);
    const [promptBudget, setPromptBudget] = useState('');
    const [budgetSaving, setBudgetSaving] = useState(false);
    const [budgetError, setBudgetError] = useState('');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isIncomeOpen, setIsIncomeOpen] = useState(false);
    const [incomeAmt, setIncomeAmt] = useState('');
    const [incomeSource, setIncomeSource] = useState('');
    const [payingRecurring, setPayingRecurring] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    const [editingRecurring, setEditingRecurring] = useState(null);

    // Shopping States
    const [isShoppingOpen, setIsShoppingOpen] = useState(false);
    const [isAddingShopping, setIsAddingShopping] = useState(false);
    const [newShoppingItem, setNewShoppingItem] = useState('');
    const [purchaseItem, setPurchaseItem] = useState(null);
    const [purchasePrice, setPurchasePrice] = useState('');
    const [editingShoppingId, setEditingShoppingId] = useState(null);
    const [editShoppingName, setEditShoppingName] = useState('');
    const [swooshingOutShoppingId, setSwooshingOutShoppingId] = useState(null);
    const [inputFocused, setInputFocused] = useState(false);
    const [isCatSheetOpen, setIsCatSheetOpen] = useState(false);
    const [customCatInput, setCustomCatInput] = useState('');

    const [recName,setRecName] = useState('');
    const [recAmount,setRecAmount] = useState('');
    const [savingSchedule,setSavingSchedule] = useState(false);
    const [recCat, setRecCat] = useState('');
    const [recDate, setRecDate] = useState('1');
    const [recParseError, setRecParseError] = useState('');

    const mainPreview = parseExpenseInput(nlpInput);
    const suggestedCategory = suggestCategory(mainPreview?.title || nlpInput, expenses);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);

    const spent = getSpentThisMonth();
    const budget = user.budget || 0;
    const remaining = budget - spent;
    const nowLocal = new Date();
    const today = nowLocal.getDate();
    const maxDay = new Date(nowLocal.getFullYear(), nowLocal.getMonth() + 1, 0).getDate();
    const expectedSpentByToday = (budget / maxDay) * today;
    const isOverAverage = spent > expectedSpentByToday;

    useEffect(() => {
        if (!user.id) return;
        claimMonthlyBudgetPrompt().then(show => {
            if (show) { setPromptBudget(String(user.budget || 0)); setIsPromptMonthOpen(true); }
        });
    }, [user.id, activeMonth, claimMonthlyBudgetPrompt]);

    const handleSaveMonthBudget = async () => {
        setBudgetSaving(true);setBudgetError('');
        try {
            if(await updateUserBudget(Number(promptBudget))) setIsPromptMonthOpen(false);
            else setBudgetError('Could not save your budget. Please try again.');
        } finally { setBudgetSaving(false); }
    };

    const remainingDisplay = remaining >= 0
        ? `Rs. ${Math.round(remaining).toLocaleString('en-IN')} left`
        : `Rs. ${Math.abs(Math.round(remaining)).toLocaleString('en-IN')} over`;
    const remainingOver = remaining < 0;

    const recentExpenses = [...expenses].filter(e => e.category !== 'Income').slice(0, 4);
    const topExpenses = [...monthlyExpenses].filter(e => e.category !== 'Income').sort((a, b) => b.amount - a.amount).slice(0, 4);
    const unpaidRecurring = recurring.filter(r => !r.isPaid);
    const allPaid = recurring.length > 0 && unpaidRecurring.length === 0;

    const handleSwipeLeftRecent = (id) => {
        deleteExpense(id);
    };

    const handleSwipeRightRecent = (exp) => {
        setEditingExpense(exp); // Opens the EditExpenseSheet
    };

    // --- Swipe Handlers for Scheduled Payments ---
    const handleRecSwipeLeft = (id) => {
        deleteRecurring(id);
    };

    const handleRecSwipeRight = (rec) => {
        setEditingRecurring(rec); // Opens the EditRecurringSheet
    };

    const [savingExpense,setSavingExpense] = useState(false);
    const [savingIncome,setSavingIncome] = useState(false);
    const handleAddExpense = async () => {
        if (!nlpInput.trim() || savingExpense) return;
        setSavingExpense(true);
        let saved;
        try { saved = await addExpenseNLP(nlpInput, selectedCat, selectedDate); }
        finally { setSavingExpense(false); }
        if (!saved) return;
        setNlpInput('');
        setSelectedCat('');
        setSelectedDate(new Date());
    };

    const handleAddIncome = async () => {
        if (!incomeAmt || savingIncome) return;
        setSavingIncome(true);
        let saved;
        try { saved = await addIncome(incomeAmt, incomeSource); }
        finally { setSavingIncome(false); }
        if (!saved) return;
        setIsIncomeOpen(false);
        setIncomeAmt('');
    };

    const handlePayRecurring = (id) => {
        markRecurringPaid(id);
        setPayingRecurring(null);
    };

    const handlePurchaseShoppingSubmit = () => {
        const amount = parseFloat(purchasePrice);
        if (!amount || amount <= 0 || !purchaseItem) return;
        addExpenseNLP(`${purchaseItem.name} ${amount}`, 'Shopping');
        setSwooshingOutShoppingId(purchaseItem.id);
        setTimeout(() => {
            deleteShoppingItem(purchaseItem.id);
            setSwooshingOutShoppingId(null);
            setPurchaseItem(null);
            setPurchasePrice('');
        }, 350);
    };

    const handleAddRecurring = async () => {
        const amount=Number(recAmount);
        if(savingSchedule)return;
        if(!recName.trim() || !Number.isFinite(amount) || amount<=0 || Math.abs(amount*100-Math.round(amount*100))>0.000001 || !Number.isInteger(Number(recDate)) || Number(recDate)<1 || Number(recDate)>31){setRecParseError('Enter a name, a valid amount, and a day from 1 to 31.');return;}
        setSavingSchedule(true);setRecParseError('');
        try {
            const saved=await addRecurring(recName.trim(),amount,recCat || 'Bills',recDate);
            if(saved){setIsSheetOpen(false);setRecName('');setRecAmount('');}
            else setRecParseError('Could not schedule this payment. Please try again.');
        } finally {setSavingSchedule(false);}
    };

    const handleAddShoppingItem = () => {
        if (!newShoppingItem.trim()) {
            setIsAddingShopping(false);
            return;
        }
        addShoppingItem(newShoppingItem.trim());
        setNewShoppingItem('');
        setIsAddingShopping(false);
    };

    const handleShoppingSwipeLeft = (id) => {
        deleteShoppingItem(id);
    };

    const handleShoppingSwipeRight = (item) => {
        setEditingShoppingId(item.id);
        setEditShoppingName(item.name);
    };

    const handleSaveShoppingEdit = () => {
        if (!editShoppingName.trim()) return;
        updateShoppingItem(editingShoppingId, editShoppingName.trim());
        setEditingShoppingId(null);
        setEditShoppingName('');
    };

    const formatDateLabel = (date) => {
        const d = new Date(date);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const compareDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (compareDate.getTime() === today.getTime()) return 'Today';
        if (compareDate.getTime() === yesterday.getTime()) return 'Yesterday';
        
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const incomeSources = [
        { name: 'Salary', icon: <Briefcase size={16} /> },
        { name: 'Passive', icon: <ArrowUpRight size={16} /> },
        { name: 'Refund', icon: <Gift size={16} /> },
        { name: 'Other', icon: <ArrowUpCircle size={16} /> }
    ];

    const catBtnStyle = {
        flexShrink: 0,
        width: '92px',
        height: '72px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        borderRadius: '16px',
        transition: 'all 0.2s ease',
    };

    const catMap = [
    { name: 'Food', icon: <Coffee size={20} /> },
    { name: 'Transport', icon: <Car size={20} /> },
    { name: 'Shopping', icon: <ShoppingBag size={20} /> },
    { name: 'Housing', icon: <HomeIcon size={20} /> },
    { name: 'Entertainment', icon: <Clapperboard size={20} /> },
    { name: 'Medical', icon: <Hospital size={20} /> },
    { name: 'Bills', icon: <Receipt size={20} /> },
    { name: 'Personal Care', icon: <BookHeart size={20} /> }
    ];

    const getCategoryIcon = (catName) => {
        const found = catMap.find(c => c.name === catName);
        if (found) return found.icon;
        return <Grid size={20} />;
    };

    return (
        <>
            <PageHeader title="Wallet" subtitle={`Your personal spending, ${user.name?.split(' ')[0] || 'at a glance'}.`} actions={<><button id="tour-transaction-console" aria-label="Transactions" className="button-secondary" onClick={() => setCurrentScreen('logs')}><History size={18}/><span>Transactions</span></button><button id="tour-dashboard" aria-label="Dashboard" className="button-secondary" onClick={() => setCurrentScreen('dashboard')}><LayoutDashboard size={18}/><span>Dashboard</span></button></>}/>

            <div className="home-content">
                {/* LOG EXPENSE CARD */}
                <div className="log-card" id="tour-nlp"><span className="eyebrow" style={{color:'#a8b197',marginBottom:16}}>A LITTLE SOMETHING TO LOG</span>
                    <div className="amount-input-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
                            <span className="rupee-sign">Rs. </span>
                            <input
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                type="text"
                                className="super-amount-input"
                                placeholder="150 pizza"
                                aria-label="Expense amount and description"
                                value={nlpInput}
                                onChange={e => setNlpInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddExpense(e)}
                                style={{ flex: 1, minWidth: 0 }}
                            />

                        </div>
                        {nlpInput.trim() && (
                            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: (mainPreview && mainPreview.title) ? '#557529' : '#202020' }}>
                                {mainPreview && mainPreview.title
                                    ? `✓ Rs. ${mainPreview.amount.toLocaleString('en-IN')} · ${mainPreview.title}`
                                    : mainPreview && !mainPreview.title
                                        ? `Rs. ${mainPreview.amount.toLocaleString('en-IN')} — add a description`
                                        : `Type amount + name in any order`}
                            </div>
                        )}
                    </div>
                    <div className="expense-options">
                        <button type="button" onClick={()=>setIsCatSheetOpen(true)} aria-haspopup="dialog" aria-label="Choose expense category"><Grid size={18}/><span><small>{selectedCat ? 'Category' : 'Auto category'}</small>{selectedCat || suggestedCategory || 'Automatic'}</span><ChevronDownIcon size={15}/></button>
                    </div>

                    <div className="expense-submit-row"><button type="button" className="compact-calendar" onClick={()=>setIsDateSheetOpen(true)} aria-haspopup="dialog" aria-label={`Expense date: ${formatDateLabel(selectedDate)}`} title={formatDateLabel(selectedDate)}><CalendarDays size={20}/><span>{formatDateLabel(selectedDate)}</span></button><button className="log-btn" onClick={handleAddExpense} disabled={savingExpense || !nlpInput.trim()}>
                        Add expense
                    </button></div>
                </div>

                <section className="wallet-overview"><span className="eyebrow">{new Date().toLocaleDateString('en-IN',{month:'long'})} AT A GLANCE</span><div className="wallet-number">Rs. {spent.toLocaleString('en-IN',{maximumFractionDigits:2})}</div><div className="wallet-overview-footer"><span>Spent this month</span><span>{budget ? remainingDisplay : 'No budget set'}</span></div><div className="budget-track"><span style={{width:`${budget?Math.min(100,spent/budget*100):0}%`,background:remainingOver?'#bb7354':undefined}}/></div><p className="field-help" style={{marginBottom:0}}>{budget?`Your monthly limit is Rs. ${budget.toLocaleString('en-IN')}.`:'Set a spending limit in Profile when you’re ready.'}</p><div className="wallet-links"><button onClick={()=>setCurrentScreen('logs')}>View transactions <ArrowUpRight size={16} aria-hidden="true"/></button><button onClick={()=>setCurrentScreen('dashboard')}>See spending insights <ArrowUpRight size={16} aria-hidden="true"/></button></div></section>

                <BottomSheet isOpen={isCatSheetOpen} onClose={()=>setIsCatSheetOpen(false)} title="Choose category">
                    <div className="category-picker">
                        <div className="category-grid">{[{name:'',label:'Automatic',icon:<Grid size={20}/>},...catMap].map(category=><button type="button" key={category.name} aria-pressed={(isSheetOpen?recCat:selectedCat)===category.name} onClick={()=>{if(isSheetOpen)setRecCat(category.name);else setSelectedCat(category.name);setIsCatSheetOpen(false);}}><span>{category.icon}</span>{category.label || category.name}</button>)}</div>
                        <div className="custom-category"><label className="panel-field"><span>Or create a category</span><input aria-label="Custom category" placeholder="e.g. Gifts or Travel" maxLength={50} value={customCatInput} onChange={event=>setCustomCatInput(event.target.value)}/></label><button type="button" className="button-primary" disabled={!customCatInput.trim()} onClick={()=>{if(isSheetOpen)setRecCat(customCatInput.trim());else setSelectedCat(customCatInput.trim());setCustomCatInput('');setIsCatSheetOpen(false);}}>Use category</button></div>
                    </div>
                </BottomSheet>
                <BottomSheet isOpen={isDateSheetOpen} onClose={()=>setIsDateSheetOpen(false)} title="Expense date">
                    <DatePicker value={localDate(selectedDate)} onChange={value=>{setSelectedDate(new Date(`${value}T12:00:00`));setIsDateSheetOpen(false);}}/>
                </BottomSheet>

                <div className="section-title" style={{ marginTop: '20px' }}>Explore</div>
                <div className="card-scroll-container">
                    <div
                        className="card-scroll"
                        onClick={() => setIsIncomeOpen(true)}
                        style={{
                            minWidth: '80%',
                            scrollSnapAlign: 'start',
                            flexShrink: 0,
                            height: 160,
                            borderRadius: 30,
                            background: 'linear-gradient(135deg, #b9ed27ff 0%, #7d9e24cd 50%, #c9f158 100%)',
                            padding: '20px 20px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 20, pointerEvents: 'none',
                        }}>
                            <div style={{
                                position: 'absolute', top: '-50%', left: '-50%',
                                width: '40%', height: '200%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                                animation: 'cardShine 3s ease-in-out infinite',
                            }} />
                        </div>
                        <div style={{
                            position: 'absolute', top: -30, right: -30,
                            width: 120, height: 120, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.04)',
                        }} />
                        <div style={{
                            position: 'absolute', top: 20, right: -50,
                            width: 140, height: 140, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.03)',
                        }} />

                        {/* Top row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#202020', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
                                    Add Money
                                </div>
                            </div>
                            <div style={{
                                width: 34, height: 26, borderRadius: 5,
                                background: 'linear-gradient(135deg, #b6b3abff 0%, #716b6bff 25%, #eae9e7ff 100%)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            }}>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ fontSize: 10, color: '#202020', letterSpacing: '0.5px', marginBottom: 3 }}>
                                    Add money to your Wallet
                                </div>
                                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{ display: 'flex', gap: 3 }}>
                                            {[0, 1, 2, 3].map(j => (
                                                <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: '#20202039' }} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: '#f2f3f5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                backdropFilter: 'blur(4px)',
                            }}>
                                <ArrowUpRight size={17} color="#202020" />
                            </div>
                        </div>
                    </div>
                    {/* ── Shopping Card ── */}
                    <div
                        onClick={() => setIsShoppingOpen(true)}
                        style={{
                            minWidth: '80%',
                            scrollSnapAlign: 'start',
                            flexShrink: 0,
                            height: 160,
                            borderRadius: 20,
                            background: 'linear-gradient(135deg, #191717ff 0%, #202020 50%, #202020 100%)',
                            padding: '20px 20px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Shine */}
                        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 20, pointerEvents: 'none' }}>
                            <div style={{
                                position: 'absolute', top: '-50%', left: '-50%',
                                width: '40%', height: '200%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                                animation: 'cardShine 3.5s ease-in-out 0.5s infinite',
                            }} />
                        </div>
                        {/* BG circles */}
                        <div style={{
                            position: 'absolute', top: -30, right: -30,
                            width: 120, height: 120, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.04)',
                        }} />
                        <div style={{
                            position: 'absolute', top: 20, right: -50,
                            width: 140, height: 140, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.03)',
                        }} />

                        {/* Top row */}
                        <div id="tour-shopping-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#f2f3f5', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
                                    Shopping Bag
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 400, color: '#ffffff', fontFamily: 'Montserrat, sans-serif', letterSpacing: 0.3 }}>
                                    {shoppingList.length === 0 ? 'Nothing added' : `${shoppingList.length} item${shoppingList.length !== 1 ? 's' : ''} pending`}
                                </div>
                            </div>
                            {/* EMV chip */}
                            <div style={{
                                width: 34, height: 26, borderRadius: 5,
                                background: 'linear-gradient(135deg, #a0a0a0ff 0%, #b4b3afff 40%, #ffffffff 100%)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            }}>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ fontSize: 10, color: '#f2f3f58d', letterSpacing: '0.5px', marginBottom: 3 }}>
                                    Log Items as Expenses
                                </div>
                                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{ display: 'flex', gap: 3 }}>
                                            {[0, 1, 2, 3].map(j => (
                                                <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Arrow button */}
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: '#f2f3f5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backdropFilter: 'blur(4px)',
                            }}>
                                <ShoppingBag size={17} color="#202020" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FIXED PAYMENTS */}
                <div className="section-header" style={{ marginTop: '24px' }}>
                    <div className="section-title">Scheduled Payments</div>
                    <div
                        id="tour-scheduled-payment"
                        className="add-recurring-btn"
                        onClick={() => setIsSheetOpen(true)}
                        style={{ background: 'var(--indigo-light)', color: 'var(--indigo)', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <Plus size={14} strokeWidth={3} /> Add
                    </div>
                </div>

                {allPaid ? (
                    <div style={{
                        background: 'var(--white)', borderRadius: '24px', padding: '24px',
                        display: 'flex', alignItems: 'center', gap: 16
                    }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--lime-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lime-dark)' }}>
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)' }}>You're all clear!</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>All fixed payments for this month are paid.</div>
                        </div>
                    </div>
                ) : (
                    <div className={`wallet-list-card${recurring.length === 0 ? ' wallet-empty-card' : ''}`} style={{
                        background: '#f8f8f6',
                        border: '1px solid #e9e9e5',
                        borderRadius: '24px',
                        padding: '8px 16px',
                        boxShadow: 'var(--shadow)'
                    }}>
                        {recurring.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    padding: '20px 24px',
                                    textAlign: 'center', marginTop: 12
                                }}
                            >
                                <div style={{
                                    background: '#c9f158', width: 48, height: 48, borderRadius: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                                    boxShadow: '0 8px 20px rgba(201, 241, 88, 0.2)'
                                }}>
                                    <Repeat size={22} color="#202020" strokeWidth={2.5} />
                                </div>

                                <div style={{ fontSize: 16, fontWeight: 800, color: '#202020', marginBottom: 6, fontFamily: "'Montserrat', sans-serif" }}>
                                    Nothing scheduled yet
                                </div>

                                <div style={{ fontSize: 13, color: '#666', fontWeight: 500, lineHeight: 1.5, maxWidth: 220 }}>
                                    Add your rent or subscriptions to see them tracked automatically.
                                </div>
                            </motion.div>
                        ) : unpaidRecurring.map((r, idx) => {
                            const isUrgent = Number(r.dueDate) < new Date().getDate();
                            return (
                                <SwipeableItem
                                    key={r.id}
                                    onSwipeLeft={() => handleRecSwipeLeft(r.id)}
                                    onSwipeRight={() => handleRecSwipeRight(r)}
                                >
                                    <div
                                        onClick={() => setPayingRecurring(r)}
                                        className="wallet-payment-row"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '16px 0',
                                            cursor: 'pointer',
                                            borderBottom: idx !== unpaidRecurring.length - 1 ? '1px solid var(--border)' : 'none'
                                        }}
                                    >
                                        <div style={{
                                            width: 42, height: 42, borderRadius: '12px',
                                            background: isUrgent ? '#FEF2F2' : 'var(--bg)',
                                            border: '1px solid var(--border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isUrgent ? 'var(--danger)' : 'var(--indigo)',
                                            fontWeight: 800, marginRight: 14, flexShrink: 0
                                        }}>
                                            {r.title.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info Section */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', marginBottom: 2 }}>{r.title}</div>
                                            {isUrgent ? (
                                                <div style={{
                                                    display: 'inline-flex', padding: '2px 6px', background: '#FEF2F2',
                                                    color: 'var(--danger)', borderRadius: '8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px'
                                                }}>
                                                    Overdue
                                                </div>
                                            ) : (
                                                <div style={{
                                                    display: 'inline-flex', padding: '2px 6px', background: '#c9f158',
                                                    color: '#ffffff', borderRadius: '8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px'
                                                }}>
                                                    Due on Day {r.dueDate}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                                                Rs. {Number(r.amount).toLocaleString()}
                                            </div>
                                            <ChevronRight size={22} color="var(--text-3)" />
                                        </div>
                                    </div>
                                </SwipeableItem>
                            );
                        })}
                    </div>
                )}

                {/* RECENT EXPENSES */}
                <div className='recent-expenses' style={{ marginTop: '35px' }}>
                    <div className="section-header" style={{ marginTop: 'auto' }}>
                        <div className="section-title">Recent Payments</div>
                        <div className="section-action" onClick={() => setCurrentScreen('logs')} style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '13px' }}>See all</div>
                    </div>

                    {recentExpenses.length > 0 ? (
                        <div className="wallet-list-card">
                            {recentExpenses.map((e, index) => (
                                <SwipeableItem
                                    key={e.id}
                                    onSwipeLeft={() => handleSwipeLeftRecent(e.id)}
                                    onSwipeRight={() => handleSwipeRightRecent(e)}
                                >
                                    <div
                                        className="profile-row wallet-payment-row"
                                        style={{
                                            cursor: 'default',
                                            margin: 0,
                                            background: 'transparent',
                                            border: 'none',
                                            boxShadow: 'none',
                                            borderRadius: 0,
                                            padding: '14px 5px',
                                            borderBottom: index !== recentExpenses.length - 1 ? '1px solid var(--border)' : 'none'
                                        }}
                                    >
                                        <div style={{ 
                                            background: '#ffffff', 
                                            color: 'var(--indigo)', 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: '12px', // Consistency with other UI elements
                                            border: '1px solid var(--border)', 
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginRight: '12px'
                                        }}>
                                            {getCategoryIcon(e.category)}
                                        </div>

                                        <div className="profile-row-text">
                                            <div className="profile-row-label" style={{ fontWeight: 600, fontSize: '16px' }}>
                                                {e.description}
                                            </div>
                                            <div className="profile-row-sub" style={{ fontSize: '12px', display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <span style={{ color: '#202020a3', fontSize: '13px' }}>{e.category}</span>
                                                <span style={{ color: '#202020a3', fontSize: '13px' }}>,</span>
                                                <span style={{ color: '#202020a3', fontSize: '13px' }}>
                                                    {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                                                </span>
                                            </div>
                                        </div>

                                        <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                                            Rs. {Number(e.amount).toLocaleString()}
                                        </span>
                                    </div>
                                </SwipeableItem>
                            ))}
                        </div>
                    ) : (
                        <motion.div className="wallet-empty-card"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                padding: '24px', background:'#f8f8f6', border:'1px solid #e9e9e5', borderRadius:24,
                                textAlign: 'center', marginTop: 12
                            }}
                        >
                            <div style={{
                                background: '#c9f158', width: 48, height: 48, borderRadius: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                                boxShadow: '0 8px 20px rgba(201, 241, 88, 0.2)'
                            }}>
                                <Receipt size={22} color="#202020" strokeWidth={2.5} />
                            </div>

                            <div style={{
                                fontSize: 16, fontWeight: 800, color: '#202020',
                                marginBottom: 6, fontFamily: "'Montserrat', sans-serif"
                            }}>
                                Quiet in here
                            </div>

                            <div style={{
                                fontSize: 13, color: '#666', fontWeight: 500,
                                lineHeight: 1.5, maxWidth: 220
                            }}>
                                Start spending or settle up with friends to see your activity history.
                            </div>
                        </motion.div>
                    )}
                </div>


                {/* TOP EXPENSES */}
                <div className="section-header" style={{ marginTop: '22px' }}>
                    <div className="section-title">Top Expenses</div>
                </div>

                {topExpenses.length > 0 ? (
                    <div className="wallet-list-card wallet-top-expenses">
                        {topExpenses.slice(0, 4).map((expense, index) => <div className="wallet-payment-row wallet-top-row" key={expense.id}><span className="wallet-rank">{index + 1}</span><div><strong>{expense.description}</strong><small>{expense.category}</small></div><b>Rs. {expense.amount.toLocaleString()}</b></div>)}
                    </div>
                ) : (
                    <section className="wallet-empty-card"><span aria-hidden="true"><ArrowUpRight size={24}/></span><h3>A fresh month, a clear picture.</h3><p>No expenses recorded this month.</p><small>Your biggest expenses will appear here as you log them above.</small></section>
                )}

                <div style={{ height: '16px' }}></div>
            </div >

            <BottomSheet isOpen={isSheetOpen} onClose={()=>{setIsSheetOpen(false);setRecParseError('');}} title="Schedule a payment">
                <div className="wallet-panel">
                    <div className="panel-intro"><span className="panel-icon"><Repeat size={22}/></span><div><h3>Make the regular things easy</h3><p>Track a monthly bill. Mark it paid when you pay it.</p></div></div>
                    <label className="panel-field"><span>Payment name</span><input aria-label="Scheduled payment name" value={recName} onChange={event=>setRecName(event.target.value)} placeholder="e.g. Rent or Netflix" maxLength={100}/></label>
                    <label className="payment-amount"><span>Amount · Rupees</span><div><b>Rs.</b><input aria-label="Scheduled payment amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={recAmount} onChange={event=>setRecAmount(event.target.value)}/></div></label>
                    <details className="panel-disclosure"><summary><span>Category</span><strong>{recCat || 'Bills'}</strong><ChevronDownIcon size={16}/></summary><div className="panel-choices">{catMap.map(category=><button key={category.name} aria-pressed={(recCat || 'Bills')===category.name} onClick={()=>setRecCat(category.name)}>{category.icon}<span>{category.name}</span></button>)}</div></details>
                    <div><DayInput value={recDate} onChange={setRecDate}/><div className="panel-days">{[1,5,10,15,25].map(day=><button key={day} aria-pressed={Number(recDate)===day} onClick={()=>setRecDate(String(day))}>{day}</button>)}</div></div>
                    {recParseError && <p className="form-error" role="alert">{recParseError}</p>}
                    <button className="button-primary" disabled={savingSchedule || !recName.trim() || !recAmount} onClick={handleAddRecurring}>{savingSchedule?'Saving…':'Schedule payment'}</button>
                </div>
            </BottomSheet>

            <BottomSheet isOpen={isIncomeOpen} onClose={()=>setIsIncomeOpen(false)} title="Add money">
                <div className="wallet-panel">
                    <div className="panel-intro"><span className="panel-icon"><ArrowUpCircle size={22}/></span><div><h3>A little more room</h3><p>Record money you’ve received in your Wallet.</p></div></div>
                    <label className="payment-amount"><span>Amount received · Rupees</span><div><b>Rs.</b><input aria-label="Amount received" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={incomeAmt} onChange={event=>setIncomeAmt(event.target.value)}/></div></label>
                    <div><label className="input-label">Where did it come from?</label><div className="panel-choices income-choices">{incomeSources.map(source=><button key={source.name} aria-pressed={incomeSource===source.name} onClick={()=>setIncomeSource(source.name)}>{source.icon}<span>{source.name}</span></button>)}</div></div>
                    <button className="button-primary" disabled={savingIncome || !incomeAmt || Number(incomeAmt)<=0 || !incomeSource} onClick={handleAddIncome}>{savingIncome?'Saving…':'Add money'}</button>
                </div>
            </BottomSheet>

            <EditExpenseSheet
                isOpen={!!editingExpense}
                onClose={() => setEditingExpense(null)}
                expense={editingExpense}
                onSave={(updates) => {
                    return updateExpense(editingExpense.id, updates);
                }}
            />

            <EditRecurringSheet
                isOpen={!!editingRecurring}
                onClose={() => setEditingRecurring(null)}
                item={editingRecurring}
                onSave={(updates) => {
                    updateRecurringItem(editingRecurring.templateId, updates);
                }}
            />

            {/* PAY RECURRING CONFIRMATION */}
            <BottomSheet
                isOpen={!!payingRecurring}
                onClose={() => setPayingRecurring(null)}
                title="Confirm Payment"
            >
                {payingRecurring && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '10px' }}>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '12px', color: '#202020', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>Paying for {payingRecurring.title}</div>
                            <div style={{ fontSize: '36px', fontWeight: 700, marginTop: '14px' }}>Rs. {Number(payingRecurring.amount).toLocaleString()}</div>
                        </div>

                        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: 15 }}>Schedule Date</span>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>Day {payingRecurring.dueDate} of every month</span>
                        </div>

                        <button
                            className="overlay-submit"
                            onClick={() => {
                                handlePayRecurring(payingRecurring.id);
                                setPayingRecurring(null);
                            }}
                            style={{ background: '#202020', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            Pay Rs. {Number(payingRecurring.amount).toLocaleString()}
                        </button>
                        <button
                            className="overlay-submit"
                            onClick={() => setPayingRecurring(null)}
                            style={{ background: '#f2f3f5', color: '#202020', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '-10px' }}
                        >
                            Maybe Later
                        </button>
                    </div>
                )}
            </BottomSheet>

            <BottomSheet isOpen={isPromptMonthOpen} onClose={()=>{if(!budgetSaving)setIsPromptMonthOpen(false);}} title="Your monthly check-in">
                <p className="field-help">Your budget for {new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})} is Rs. {Number(user.budget||0).toLocaleString('en-IN')}. Keep it or make a change. We’ll ask just once this month; you can always edit it in Profile.</p>
                <label className="input-label" htmlFor="monthly-budget">Monthly spending limit</label><div className="budget-input"><span>Rs. </span><input id="monthly-budget" type="number" min="0" step="0.01" inputMode="decimal" value={promptBudget} onChange={e=>setPromptBudget(e.target.value)}/></div>
                {budgetError && <p className="form-error" role="alert">{budgetError}</p>}
                <div className="budget-check-actions"><button className="button-secondary" disabled={budgetSaving} onClick={()=>setIsPromptMonthOpen(false)}>Keep current budget</button><button className="button-primary" disabled={budgetSaving || promptBudget==='' || !Number.isFinite(Number(promptBudget)) || Number(promptBudget)<0} onClick={handleSaveMonthBudget}>{budgetSaving?'Saving…':'Save budget'}</button></div>
            </BottomSheet>

            {/* SHOPPING LIST SHEET */}
            <BottomSheet isOpen={isShoppingOpen} onClose={() => setIsShoppingOpen(false)} title="Shopping List">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: '350px' }}>
                    {shoppingList.length === 0 && !isAddingShopping && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 20px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: 80, height: 80,
                                background: 'var(--bg)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 20,
                                color: 'var(--text-3)'
                            }}>
                                <ShoppingBag size={40} strokeWidth={1.5} />
                            </div>
                            <h3 style={{ fontFamily: 'Montserrat', fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
                                Your bag is empty
                            </h3>
                            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.5, maxWidth: '200px' }}>
                                Plan your next spend here and log it with one tap.
                            </p>
                        </div>
                    )}
                    <div className="fixed-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '60vh', paddingRight: '4px', paddingBottom: '24px' }}>
                        {shoppingList.map(item => (
                            <SwipeableItem
                                key={item.id}
                                onSwipeLeft={() => handleShoppingSwipeLeft(item.id)}
                                onSwipeRight={() => handleShoppingSwipeRight(item)}
                            >
                                <div
                                    className={`fixed-item ${swooshingOutShoppingId === item.id ? 'swooshing-out' : ''}`}
                                    data-clickable="true"
                                    onClick={() => editingShoppingId !== item.id && setPurchaseItem(item)}
                                    style={{
                                        position: 'relative',
                                        background: 'transparent', // Remove box
                                        border: 'none',             // Remove box border
                                        boxShadow: 'none',          // Remove shadow
                                        borderRadius: 0,
                                        height: 'auto',
                                        padding: '14px 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        /* Horizontal line below each item */
                                        borderBottom: '1px solid var(--border)'
                                    }}
                                >
                                    <div
                                        className="fixed-item-icon"
                                        style={{
                                            background: 'transparent',
                                            border: `2px solid ${swooshingOutShoppingId === item.id ? 'var(--success)' : 'var(--border)'}`,
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            marginLeft: '8px',
                                            flexShrink: 0,
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transform: swooshingOutShoppingId === item.id ? 'scale(0)' : 'scale(1)'
                                        }}
                                    />

                                    {editingShoppingId === item.id ? (
                                        <input
                                            autoFocus
                                            value={editShoppingName}
                                            onChange={e => setEditShoppingName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveShoppingEdit();
                                                if (e.key === 'Escape') setEditingShoppingId(null);
                                            }}
                                            onBlur={handleSaveShoppingEdit}
                                            style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: '8px', padding: '6px 10px', fontSize: '14px', outline: 'none', background: 'white' }}
                                        />

                                    ) : (
                                        <>
                                            <div className="fixed-item-name" style={{
                                                fontSize: '15px',
                                                color: swooshingOutShoppingId === item.id ? 'var(--text-muted)' : 'var(--text)',
                                                textDecoration: swooshingOutShoppingId === item.id ? 'line-through' : 'none'
                                            }}>
                                                {item.name}
                                            </div>
                                        </>
                                    )}
                                    {/* </div> */}
                                </div>
                            </SwipeableItem>
                        ))}

                        {/* ADD ITEM ROW */}
                        <div style={{
                            marginTop: shoppingList.length === 0 ? '0' : '4px',
                            display: 'flex',
                            justifyContent: 'center',
                            width: '100%',
                            paddingBottom: '8px'
                        }}>
                            {isAddingShopping ? (
                                <div className="fixed-item-wrap" style={{
                                    width: '100%',
                                    height: '56px',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: '14px',
                                    background: 'var(--card)',
                                    boxShadow: 'var(--shadow)'
                                }}>
                                    <div className="fixed-item" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                                        <div className="fixed-item-icon" style={{ background: 'var(--indigo-light)', color: 'var(--indigo)', width: 30, height: 30 }}>
                                            <Plus size={14} strokeWidth={3} />
                                        </div>
                                        <div style={{ display: 'flex', flex: 1, gap: 8, alignItems: 'center' }}>
                                            <input
                                                autoFocus
                                                value={newShoppingItem}
                                                onChange={e => setNewShoppingItem(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddShoppingItem();
                                                    if (e.key === 'Escape') setIsAddingShopping(false);
                                                }}
                                                onBlur={() => {
                                                    if (!newShoppingItem.trim()) setIsAddingShopping(false);
                                                    else handleAddShoppingItem();
                                                }}
                                                placeholder="What are we buying?"
                                                style={{ flex: 1, border: 'none', background: 'transparent', padding: '6px 10px', fontSize: '15px', outline: 'none', fontWeight: 500 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="bouncy-tap"
                                    onClick={() => setIsAddingShopping(true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginTop: '60px',
                                        background: '#f2f3f5',
                                        color: '#202020',
                                        padding: '12px 24px',
                                        borderRadius: '10px',
                                        border: '1.5px solid var(--border)',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Plus size={18} strokeWidth={3} /> Add item
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* PURCHASE ITEM POPUP */}
            {
                purchaseItem && createPortal(
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24, animation: 'sheetFadeIn 0.25s ease'
                    }} onClick={() => setPurchaseItem(null)}>
                        <div
                            style={{
                                background: 'white', padding: 24, borderRadius: 24, width: '100%', maxWidth: 360,
                                boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                                animation: 'sheetSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 20, marginBottom: 8, color: 'var(--text)' }}>Log Purchase</h3>
                            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>
                                How much did you pay for <strong>{purchaseItem.name}</strong>?
                            </p>

                            <div className="amount-input-row" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '0 16px', marginBottom: 20 }}>
                                <span style={{ fontSize: 24, color: 'var(--text-2)', marginRight: 8, fontWeight: 600 }}>Rs. </span>
                                <input
                                    type="number"
                                    autoFocus
                                    value={purchasePrice}
                                    onChange={e => setPurchasePrice(e.target.value)}
                                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 28, fontFamily: 'Montserrat, sans-serif', fontWeight: 700, outline: 'none', padding: '12px 0', color: 'var(--text)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => setPurchaseItem(null)}
                                    style={{ flex: 1, padding: 14, background: 'var(--bg)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePurchaseShoppingSubmit}
                                    disabled={!purchasePrice || parseFloat(purchasePrice) <= 0}
                                    style={{ flex: 1, padding: 14, background: 'var(--lime)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, color: '#202020', cursor: parseFloat(purchasePrice) > 0 ? 'pointer' : 'not-allowed', opacity: parseFloat(purchasePrice) > 0 ? 1 : 0.5 }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>, document.body
                )
            }
            </BottomSheet>

            {/* {showTour && (
                <GuidedTour onComplete={() => setShowTour(false)} />
            )} */}
        </>
    );
}