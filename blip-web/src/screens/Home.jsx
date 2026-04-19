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

import { Receipt, Repeat, Coffee, Car, ShoppingBag, Grid, CheckCircle2, Home as HomeIcon, HeartCrack, Briefcase, Gift, ArrowUpCircle, Plus, ArrowUpRight, LayoutDashboard, ChevronRight, Clapperboard, BookHeart, Hospital, ChevronDownIcon} from 'lucide-react';

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
        user, expenses, updateUserBudget,
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

    const [recInput, setRecInput] = useState('');
    const [recCat, setRecCat] = useState('');
    const [recDate, setRecDate] = useState('1');
    const [recParseError, setRecParseError] = useState('');

    const mainPreview = parseExpenseInput(nlpInput);
    const sheetPreview = parseExpenseInput(recInput);

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
        const monthKey = `blip_budget_prompt_${nowLocal.getFullYear()}_${nowLocal.getMonth() + 1}`;
        if (!localStorage.getItem(monthKey) && user && user.budget > 0) {
            setPromptBudget(user.budget.toString());
            setIsPromptMonthOpen(true);
        }
    }, [user?.budget]);

    const handleSaveMonthBudget = () => {
        const monthKey = `blip_budget_prompt_${nowLocal.getFullYear()}_${nowLocal.getMonth() + 1}`;
        localStorage.setItem(monthKey, 'done');
        updateUserBudget(Number(promptBudget));
        setIsPromptMonthOpen(false);
    };

    const remainingDisplay = remaining >= 0
        ? `₹${Math.round(remaining).toLocaleString('en-IN')} left`
        : `₹${Math.abs(Math.round(remaining)).toLocaleString('en-IN')} over`;
    const remainingOver = remaining < 0;

    const recentExpenses = [...expenses].filter(e => e.category !== 'Income').slice(0, 4);
    const topExpenses = [...expenses].filter(e => e.category !== 'Income').sort((a, b) => b.amount - a.amount).slice(0, 4);
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

    const handleAddExpense = (e) => {
        if (!nlpInput.trim()) return;
        addExpenseNLP(nlpInput, selectedCat, selectedDate);
        setNlpInput('');
        setSelectedCat('');
        setSelectedDate(new Date());
    };

    const handleAddIncome = () => {
        if (!incomeAmt) return;
        addIncome(incomeAmt, incomeSource);
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

    const handleAddRecurring = () => {
        const parsed = parseExpenseInput(recInput);
        if (!parsed || !parsed.title.trim()) {
            setRecParseError('Try "1200 rent"');
            return;
        }
        addRecurring(parsed.title.trim(), parsed.amount, recCat || 'General', recDate);
        setIsSheetOpen(false);
        setRecInput('');
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
        if (compareDate.getTime() === yesterday.getTime()) return 'Yest';
        
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
            <div className="top-bar">
                <div>
                    <div className="greeting" style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        color: remainingOver || isOverAverage ? 'var(--danger)' : 'inherit',
                        textShadow: isOverAverage && !remainingOver ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none',
                        transition: 'all 0.3s'
                    }}>
                        {remainingOver ? <HeartCrack size={22} color="currentColor" /> : <span>Hi,</span>}
                        <span>{user.name?.split(' ')[0]}</span>
                    </div>
                    {/* Live budget remaining chip */}
                    <div id='tour-budget' style={{
                        marginTop: 4,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#f2f3f5',
                        padding: '3px 10px', borderRadius: '7px',
                        border: `1px solid ${remainingOver ? '#FECACA' : 'var(--indigo-mid)'}`,
                    }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: remainingOver ? 'var(--danger)' : '#202020', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: remainingOver ? 'var(--danger)' : 'var(--indigo)' }}>
                            {remainingDisplay} this {new Date().toLocaleString('en-US', { month: 'long' })}
                        </span>
                    </div>
                </div>
                <div className="top-bar-icons">
                    <div id='tour-transaction-console' className="icon-btn" onClick={() => setCurrentScreen('logs')}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <div id='tour-dashboard' className="icon-btn" onClick={() => setCurrentScreen('dashboard')}>
                        <LayoutDashboard size={24} />
                    </div>
                </div>
            </div>

            <div className="home-content">
                {/* LOG EXPENSE CARD */}
                <div className="log-card" id="tour-nlp">
                    <div className="amount-input-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
                            <span className="rupee-sign">₹</span>
                            <input
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                type="text"
                                className="super-amount-input"
                                placeholder="150 pizza  or  pizza 150"
                                value={nlpInput}
                                onChange={e => setNlpInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddExpense(e)}
                                style={{ flex: 1, paddingRight: '85px' }}
                            />
                            <div 
                                onClick={() => setIsDateSheetOpen(true)}
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    background: '#f2f3f5',
                                    padding: '8px 10px',
                                    borderRadius: '15px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s',
                                }}
                                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <ChevronDownIcon size={14} color="#202020" />
                                <span style={{ 
                                    fontSize: '12px', 
                                    fontWeight: '700', 
                                    color: '#202020', 
                                    
                                    letterSpacing: '0.5px' 
                                }}>
                                    {formatDateLabel(selectedDate)}
                                </span>
                            </div>
                        </div>
                        {nlpInput.trim() && (
                            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: (mainPreview && mainPreview.title) ? '#c9f158' : '#202020' }}>
                                {mainPreview && mainPreview.title
                                    ? `✓ ₹${mainPreview.amount.toLocaleString('en-IN')} · ${mainPreview.title}`
                                    : mainPreview && !mainPreview.title
                                        ? `₹${mainPreview.amount.toLocaleString('en-IN')} — add a description`
                                        : `Type amount + name in any order`}
                            </div>
                        )}
                    </div>
                    {(inputFocused || selectedCat || isCatSheetOpen) && (
                    <div 
                        className="categories-row" 
                        style={{ 
                            display: 'flex', 
                            overflowX: 'auto', 
                            padding: '12px 0',
                            paddingBottom: '8px', 
                            gap: '8px',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none' 
                        }}
                    >
                        <style>{`.categories-row::-webkit-scrollbar { display: none; }`}</style>
                        
                        {catMap.map(c => (
                            <div
                                key={c.name}
                                className={`cat-btn ${selectedCat === c.name ? 'selected' : ''}`}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => setSelectedCat(selectedCat === c.name ? '' : c.name)}
                                style={catBtnStyle}
                            >
                                <span className="cat-icon">{c.icon}</span>
                                <span className="cat-label">{c.name}</span>
                            </div>
                        ))}

                        {selectedCat && !catMap.find(c => c.name === selectedCat) && (
                            <div
                                className="cat-btn selected"
                                onClick={() => setSelectedCat('')}
                                style={{...catBtnStyle,flexShrink: 0 }}
                            >
                                <span className="cat-icon"><Grid size={20} /></span>
                                <span className="cat-label">{selectedCat}</span>
                            </div>
                        )}

                        <div
                            className="cat-btn"
                            onClick={() => setIsCatSheetOpen(true)}
                            onMouseDown={e => e.preventDefault()}
                            style={{...catBtnStyle}}
                        >
                            <span className="cat-icon"><Plus size={20} /></span>
                            <span className="cat-label">More</span>
                        </div>
                    </div>
                )}

                    <button className="log-btn" onClick={handleAddExpense} disabled={!nlpInput.trim()}>
                        blip.
                    </button>
                </div>

                <BottomSheet 
                    isOpen={isCatSheetOpen} 
                    onClose={() => setIsCatSheetOpen(false)} 
                    title="Custom Category"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: '1.5' }}>
                            Can't find a category? Type a custom one below.
                        </p>
                        
                        <div className="form-field">
                            <input
                                autoFocus
                                type="text"
                                className="form-input"
                                placeholder="e.g. Gift, Vacation, Petty Cash"
                                value={customCatInput}
                                onChange={e => setCustomCatInput(e.target.value)}
                                style={{ fontSize: '16px', fontWeight: '600', borderRadius: 30 }}
                            />
                        </div>

                        <button 
                            className="overlay-submit" 
                            onClick={() => {
                                if (customCatInput.trim()) {
                                    const finalValue = customCatInput.trim();
                                    
                                    if (isSheetOpen) {
                                        setRecCat(finalValue);
                                    } 
                                    else {
                                        setSelectedCat(finalValue);
                                    }

                                    setIsCatSheetOpen(false);
                                    setCustomCatInput('');
                                }
                            }}
                            disabled={!customCatInput.trim()}
                        >
                            Apply Category
                        </button>
                    </div>
                </BottomSheet>
                
                <BottomSheet 
                    isOpen={isDateSheetOpen} 
                    onClose={() => setIsDateSheetOpen(false)} 
                    title="Select Date"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 4px 30px 4px' }}>
                        <input 
                            type="date" 
                            className="form-input"
                            style={{ 
                                width: '100%', fontSize: '18px', fontWeight: '600', border: '1px solid #e2e4e8',
                                background: '#ffffff',
                                borderRadius: '36px', padding: '14px', color: '#202020'
                            }}
                            value={selectedDate.toISOString().split('T')[0]}
                            onChange={(e) => {
                                setSelectedDate(new Date(e.target.value));
                                setTimeout(() => setIsDateSheetOpen(false), 300);
                            }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {['Today', 'Yesterday'].map((label) => {
                                const targetDate = new Date();
                                if (label === 'Yesterday') targetDate.setDate(targetDate.getDate() - 1);
                                
                                const isSelected = selectedDate.toDateString() === targetDate.toDateString();

                                return (
                                    <button 
                                        key={label}
                                        onClick={() => {
                                            setSelectedDate(targetDate);
                                            setTimeout(() => setIsDateSheetOpen(false), 300);
                                        }}
                                        style={{ 
                                            height: '65px', 
                                            borderRadius: '42px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            background: isSelected ? '#202020' : '#ffffff',
                                            border: isSelected ? '2px solid #ffffff' : '1.5px solid #202020', 
                                            color: isSelected ? '#ffffff' : '#202020',
                                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                        }}
                                    >
                                        <span style={{ 
                                            fontSize: '10px', 
                                            fontWeight: '800', 
                                            textTransform: 'uppercase', 
                                            letterSpacing: '1px', 
                                            opacity: isSelected ? 1 : 0.5, 
                                            marginBottom: '4px'
                                        }}>
                                            {isSelected ? 'Current' : 'Set to'}
                                        </span>
                                        <span style={{ fontSize: '15px', fontWeight: '600'}}>
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
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
                    <div style={{
                        background: 'var(--white)',
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
                                                ₹{Number(r.amount).toLocaleString()}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {recentExpenses.map((e, index) => (
                                <SwipeableItem
                                    key={e.id}
                                    onSwipeLeft={() => handleSwipeLeftRecent(e.id)}
                                    onSwipeRight={() => handleSwipeRightRecent(e)}
                                >
                                    <div
                                        className="profile-row"
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
                                            ₹{Number(e.amount).toLocaleString()}
                                        </span>
                                    </div>
                                </SwipeableItem>
                            ))}
                        </div>
                    ) : (
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
                    <div className="mosaic-outer">
                        {topExpenses.length >= 1 && (
                            <div className="mosaic-left">
                                <div className="mosaic-label">{topExpenses[0].category}</div>
                                <div className="mosaic-amount">₹{topExpenses[0].amount.toLocaleString()}</div>
                                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', marginTop: '4px', fontWeight: 600 }}>{topExpenses[0].description}</div>
                            </div>
                        )}
                        <div className="mosaic-right">
                            {topExpenses.slice(1, 4).map((e) => (
                                <div className="mosaic-cell" key={e.id}>
                                    <div className="mosaic-label">{e.category}</div>
                                    <div className="mosaic-amount">₹{e.amount.toLocaleString()}</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', marginTop: '2px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontWeight: 500 }}>No expenses recorded this month.</p>
                )}

                <div style={{ height: '16px' }}></div>
            </div >

            {/* SCHEDULE PAYMENT SHEET */}
            < BottomSheet
                isOpen={isSheetOpen}
                onClose={() => { setIsSheetOpen(false); setRecInput(''); setRecParseError(''); }
                }
                title="Schedule a Payment"
            >
                <div className="form-field">
                    <div className="amount-input-row" style={{
                        borderRadius: '45px', padding: '0 14px',
                        display: 'flex', alignItems: 'center',
                    }}>
                        <span style={{ fontSize: 22, color: 'var(--text-3)', fontWeight: 600, marginRight: 6 }}>₹</span>
                        <input
                            style={{ flex: 1, fontSize: 20, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, background: 'transparent', border: 'none', outline: 'none', padding: '13px 0', color: 'var(--text)' }}
                            placeholder='1200 rent  or  netflix 499'
                            value={recInput}
                            onChange={e => { setRecInput(e.target.value); setRecParseError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleAddRecurring()}
                            autoFocus
                        />
                    </div>
                    {recInput.trim() && (
                        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: (sheetPreview && sheetPreview.title) ? 'var(--indigo)' : 'var(--text-3)' }}>
                            {sheetPreview && sheetPreview.title
                                ? `✓  ₹${sheetPreview.amount.toLocaleString('en-IN')}  ·  ${sheetPreview.title}`
                                : sheetPreview && !sheetPreview.title
                                    ? `₹${sheetPreview.amount.toLocaleString('en-IN')} — add a name`
                                    : `Type amount + name in any order`}
                        </div>
                    )}
                    {recParseError && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>{recParseError}</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                    <div className="form-field">
                        <div 
                            className="categories-row" 
                            style={{ 
                                display: 'flex', 
                                overflowX: 'auto', 
                                padding: '12px 0',
                                paddingBottom: '8px', 
                                gap: '8px',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none' 
                            }}
                        >
                            <style>{`.categories-row::-webkit-scrollbar { display: none; }`}</style>
                            
                            {/* 1. Standard categories loop */}
                            {catMap.map(c => (
                                <div
                                    key={c.name}
                                    className={`cat-btn ${recCat === c.name ? 'selected' : ''}`}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => setRecCat(recCat === c.name ? '' : c.name)}
                                    style={catBtnStyle}
                                >
                                    <span className="cat-icon">{c.icon}</span>
                                    <span className="cat-label" style={{ fontSize: '10px', fontWeight: '700' }}>{c.name}</span>
                                </div>
                            ))}

                            {/* 2. Custom category display (if recCat is not in catMap) */}
                            {recCat && !catMap.find(c => c.name === recCat) && (
                                <div
                                    className="cat-btn selected"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => setRecCat('')}
                                    style={{...catBtnStyle, flexShrink: 0 }}
                                >
                                    <span className="cat-icon"><Grid size={20} /></span>
                                    <span className="cat-label" style={{ 
                                        fontSize: '10px', 
                                        fontWeight: '700',
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {recCat}
                                    </span>
                                </div>
                            )}

                            {/* 3. The More button */}
                            <div
                                className="cat-btn"
                                onClick={() => setIsCatSheetOpen(true)}
                                onMouseDown={e => e.preventDefault()}
                                style={{...catBtnStyle}}
                            >
                                <span className="cat-icon"><Plus size={20} /></span>
                                <span className="cat-label" style={{ fontSize: '10px', fontWeight: '700' }}>More</span>
                            </div>
                        </div>
                    </div>
                    <DayInput value={recDate} onChange={setRecDate} />
                </div>

                <button
                    className="overlay-submit"
                    onClick={handleAddRecurring}
                    disabled={!recInput.trim()}
                    style={{ marginTop: 16, opacity: !recInput.trim() ? 0.45 : 1 }}
                >
                    Save Payment
                </button>
            </BottomSheet >

            {/* ADD INCOME SHEET */}
            < BottomSheet isOpen={isIncomeOpen} onClose={() => setIsIncomeOpen(false)} title="Add Money to Wallet" >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-field">
                        <div className="form-label">Amount Received (₹)</div>
                        <input
                            type="number"
                            min="0"
                            className="form-input"
                            placeholder="₹0"
                            value={incomeAmt}
                            onChange={e => setIncomeAmt(Math.max(0, e.target.value))}
                            style={{ fontSize: '20px', fontFamily: 'Montserrat, sans-serif', fontWeight: '700', borderRadius: 36 }}
                        />
                    </div>

                    <div className="form-field">
                        <div className="form-label">Income Source</div>
                        <div className="categories-row" style={{ margin: 'auto 3px' }}>
                            {incomeSources.map(s => (
                                <div
                                    key={s.name}
                                    className={`cat-btn ${incomeSource === s.name ? 'selected' : ''}`}
                                    onClick={() => setIncomeSource(incomeSource === s.name ? '' : s.name)}
                                >
                                    <span className="cat-icon">{s.icon}</span>
                                    <span className="cat-label">{s.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="overlay-submit" onClick={handleAddIncome} disabled={!incomeAmt || !incomeSource} style={{ opacity: (!incomeAmt || !incomeSource) ? 0.45 : 1 }}>
                        Add Money
                    </button>
                </div>
            </BottomSheet >

            <EditExpenseSheet
                isOpen={!!editingExpense}
                onClose={() => setEditingExpense(null)}
                expense={editingExpense}
                onSave={(updates) => {
                    updateExpense(editingExpense.id, updates);
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
                            <div style={{ fontSize: '36px', fontWeight: 700, marginTop: '14px' }}>₹{Number(payingRecurring.amount).toLocaleString()}</div>
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
                            Pay ₹{Number(payingRecurring.amount).toLocaleString()}
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

            <BottomSheet
                isOpen={isPromptMonthOpen}
                onClose={() => { }}
                title="New Month, New Budget?"
                dismissible={false}
                showCloseButton={false}
            >
                <div style={{ paddingBottom: '16px' }}>
                    <p style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '20px' }}>
                        Welcome to a new month! Your previous month's budget was <strong>₹{user?.budget?.toLocaleString()}</strong>. You must set a budget to continue.
                    </p>

                    <div className="form-field">
                        <div className="form-label">This Month's Budget (₹)</div>
                        <input
                            type="number"
                            min="1" // Ensure they can't submit 0
                            className="form-input"
                            value={promptBudget}
                            onChange={e => setPromptBudget(e.target.value)}
                            style={{ fontSize: '20px', fontFamily: 'Montserrat, sans-serif', fontWeight: '700' }}
                        />
                    </div>

                    <button
                        className="overlay-submit"
                        onClick={handleSaveMonthBudget}
                        disabled={!promptBudget || Number(promptBudget) <= 0}
                        style={{
                            marginTop: '16px',
                            opacity: (!promptBudget || Number(promptBudget) <= 0) ? 0.45 : 1,
                            cursor: (!promptBudget || Number(promptBudget) <= 0) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Confirm & Start Month
                    </button>
                </div>
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
                                <span style={{ fontSize: 24, color: 'var(--text-2)', marginRight: 8, fontWeight: 600 }}>₹</span>
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