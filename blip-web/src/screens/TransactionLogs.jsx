import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import SwipeableItem from '../components/SwipeableItem';
import EditExpenseSheet from '../components/EditExpenseSheet';
import { formatCurrency } from '../utils/format';
import { Coffee, Car, ShoppingBag, Home, Grid, Plus, ChevronLeft } from 'lucide-react';

export default function TransactionLogs() {
    const { expenses, setCurrentScreen, deleteExpense, updateExpense } = useApp();
    const [editingExpense, setEditingExpense] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');

    const handleDelete = (id) => {
        deleteExpense(id);
    };

    const groupedData = useMemo(() => {
        const months = {};
        const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

        sorted.forEach(exp => {
            const d = new Date(exp.date);
            const monthKey = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const dayKey = d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' }) + ', ' + d.toLocaleDateString('en-IN', { weekday: 'short' });

            if (!months[monthKey]) months[monthKey] = { days: {}, totalSpent: 0 };
            if (!months[monthKey].days[dayKey]) months[monthKey].days[dayKey] = { items: [], dailyTotal: 0 };

            months[monthKey].days[dayKey].items.push(exp);
            if (exp.category !== 'Income') {
                months[monthKey].totalSpent += Number(exp.amount) || 0;
                months[monthKey].days[dayKey].dailyTotal += Number(exp.amount) || 0;
            }
        });
        return months;
    }, [expenses]);

    const filteredData = useMemo(() => {
        if (!search.trim() && !filterCat) return groupedData;

        const q = search.toLowerCase().trim();
        const result = {};

        Object.entries(groupedData).forEach(([monthStr, monthData]) => {
            const filteredDays = {};

            Object.entries(monthData.days).forEach(([dayStr, dayData]) => {
                const items = dayData.items.filter(exp => {
                    const matchesSearch = !q || exp.description.toLowerCase().includes(q);
                    const matchesCat = !filterCat || exp.category === filterCat;
                    return matchesSearch && matchesCat;
                });

                if (items.length > 0) {
                    filteredDays[dayStr] = {
                        ...dayData,
                        items,
                        dailyTotal: items
                            .filter(e => e.category !== 'Income')
                            .reduce((s, e) => s + Number(e.amount), 0),
                    };
                }
            });

            if (Object.keys(filteredDays).length > 0) {
                result[monthStr] = { ...monthData, days: filteredDays };
            }
        });

        return result;
    }, [groupedData, search, filterCat]);

    const icons = {
        Food: <Coffee size={20} />,
        Transport: <Car size={20} />,
        Shopping: <ShoppingBag size={20} />,
        Housing: <Home size={20} />,
        Bills: <Home size={20} />,
        General: <Grid size={20} />,
        Income: <Plus size={20} />
    };

    return (
        <>
            <div className="top-bar" style={{ position: 'relative', justifyContent: 'center', marginTop: '10px' }}>
                <div className="icon-btn" onClick={() => setCurrentScreen('home')} style={{ position: 'absolute', left: 20 }}>
                    <ChevronLeft size={20} />
                </div>
                <div className="greeting" style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center', fontFamily: 'Montserrat' }}>
                    Transactions
                </div>
            </div>

            <div className="txn-content">
                <div style={{ height: '20px' }}></div>

                <div style={{ marginBottom: 20 }}>
                    {/* Search input */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: '#ffffff',
                        borderRadius: 24, padding: '16px 14px', marginBottom: 10,
                    }}>
                        <svg width="16" height="16" fill="none" stroke="var(--text-3)" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                flex: 1, border: 'none', outline: 'none',
                                fontSize: 14, fontWeight: 500,
                                fontFamily: "'Montserrat', sans-serif",
                                color: '#202020', background: 'transparent',
                            }}
                        />
                        {search && (
                            <div onClick={() => setSearch('')} style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, lineHeight: 1 }}>✕</div>
                        )}
                    </div>

                    {/* Category filter pills */}
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none', marginRight: '-16px', marginLeft: '-16px', paddingLeft: '16px' }}>
                        {['', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Income', 'General'].map(cat => (
                            <div
                                key={cat}
                                onClick={() => setFilterCat(cat === filterCat ? '' : cat)}
                                style={{
                                    flexShrink: 0,
                                    padding: '8px 12px', borderRadius: 99,
                                    fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer',
                                    background: filterCat === cat ? '#202020' : '#ffffff',
                                    color: filterCat === cat ? '#ffffff' : 'var(--text-3)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {cat === '' ? 'All' : cat}
                            </div>
                        ))}
                    </div>
                </div>

                {Object.keys(filteredData).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <p style={{ color: 'var(--text-3)', fontSize: '15px' }}>
                            {search || filterCat ? 'No transactions match your search.' : 'No transactions recorded yet.'}
                        </p>
                        {(search || filterCat) && (
                            <div
                                onClick={() => { setSearch(''); setFilterCat(''); }}
                                style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: '#202020', cursor: 'pointer' }}
                            >
                                Clear filters
                            </div>
                        )}
                    </div>
                ) : (
                    Object.entries(filteredData).map(([monthStr, monthData]) => (
                        <div key={monthStr} style={{ marginBottom: '40px' }}>

                            {/* MONTH HEADER */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', padding: '0 4px' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Montserrat', color: 'var(--indigo)' }}>{monthStr}</div>
                                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-3)' }}>
                                    Total  <div style={{ color: '#202020', fontSize: '14px', fontWeight: 700 }}>₹{formatCurrency(monthData.totalSpent)}</div>
                                </div>
                            </div>

                            {Object.entries(monthData.days).map(([dayStr, dayData]) => (
                                <div key={dayStr} style={{ marginBottom: '24px', fontFamily: 'Montserrat' }}>

                                    {/* WHITE BOX FOR THE DAY */}
                                    <div style={{
                                        background: 'var(--white)',
                                        borderRadius: '30px',
                                        padding: '16px 20px 8px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                    }}>
                                        {/* INTERNAL DATE & TOTAL HEADER */}
                                        <div style={{
                                            marginBottom: '10px',
                                            paddingBottom: '6px'
                                        }}>
                                            {/* Header Labels Row */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.8px' }}>
                                                    Date
                                                </div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.8px' }}>
                                                    Total
                                                </div>
                                            </div>

                                            {/* Values Row */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--indigo)' }}>
                                                    {dayStr}
                                                </div>
                                                <div style={{
                                                    fontSize: '15px',
                                                    fontWeight: 700,
                                                    color: 'var(--text-1)',
                                                    fontFamily: 'Montserrat, sans-serif'
                                                }}>
                                                    ₹{formatCurrency(dayData.dailyTotal)}
                                                </div>
                                            </div>
                                        </div>

                                        {dayData.items.map((exp, expIdx) => {
                                            const isIncome = exp.category === 'Income';
                                            const isLastOfBox = expIdx === dayData.items.length - 1;

                                            return (
                                                <SwipeableItem
                                                    key={exp.id}
                                                    onSwipeLeft={() => handleDelete(exp.id)}
                                                    onSwipeRight={() => setEditingExpense(exp)}
                                                >
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '14px 7px',
                                                        borderBottom: isLastOfBox ? 'none' : '1px solid var(--border)'
                                                    }}>
                                                        <div style={{
                                                            width: 42, height: 42, borderRadius: '12px',
                                                            background: '#ffffff',
                                                            border: '1px solid var(--border)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: '#202020', marginRight: 14, flexShrink: 0
                                                        }}>
                                                            {icons[exp.category] || <Grid size={20} />}
                                                        </div>

                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                                                                {exp.description}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: '#ffffffff', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 8px', display: 'inline-block', backgroundColor: '#c9f158', fontWeight: 600 }}>
                                                                {exp.category}
                                                            </div>
                                                        </div>

                                                        <div style={{
                                                            fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 700,
                                                            color: isIncome ? 'var(--success)' : 'var(--text-1)'
                                                        }}>
                                                            {isIncome ? '+' : ''}₹{formatCurrency(exp.amount)}
                                                        </div>
                                                    </div>
                                                </SwipeableItem>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
                <div style={{ height: '40px' }}></div>
            </div >

            <EditExpenseSheet
                isOpen={!!editingExpense}
                onClose={() => setEditingExpense(null)}
                expense={editingExpense}
                onSave={(updates) => {
                    updateExpense(editingExpense.id, updates);
                }}
            />
        </>
    );
}