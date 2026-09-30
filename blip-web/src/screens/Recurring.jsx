import { useState } from 'react';
import { useApp } from '../store/AppContext';
import BottomSheet from '../components/BottomSheet';
import SwipeableItem from '../components/SwipeableItem';
import { CalendarClock, CheckCircle, Coffee, Car, ShoppingBag, Home as HomeIcon, Grid } from 'lucide-react';

export default function Recurring() {
    const { recurring, markRecurringPaid, updateRecurringItem, deleteRecurring } = useApp();
    const [editingItem, setEditingItem] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editAmt, setEditAmt] = useState('');
    const [editCat, setEditCat] = useState('');
    const [editDate, setEditDate] = useState('1');

    const catMap = [
        { name: 'Food', icon: <Coffee size={20} /> },
        { name: 'Transport', icon: <Car size={20} /> },
        { name: 'Shopping', icon: <ShoppingBag size={20} /> },
        { name: 'Housing', icon: <HomeIcon size={20} /> },
        { name: 'Bills', icon: <Grid size={20} /> }
    ];

    const handlePay = (id, e) => {
        e.stopPropagation();
        markRecurringPaid(id);
    };

    const handleSwipeRight = (sub) => {
        setEditTitle(sub.title);
        setEditAmt(String(sub.amount));
        setEditCat(sub.category || 'Bills');
        setEditDate(String(sub.dueDate));
        setEditingItem(sub);
    };

    const handleSaveEdit = () => {
        if (!editingItem) return;
        updateRecurringItem(editingItem.templateId, {
            title: editTitle,
            amount: editAmt,
            category: editCat,
            dueDate: editDate
        });
        setEditingItem(null);
    };

    return (
        <div style={{ padding: '24px 20px 0' }}>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem' }}>Recurring Bills</h2>
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    color: 'var(--text-muted)', fontSize: '0.85rem'
                }}>
                    <CalendarClock size={16} /> This Month
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
                {recurring.map(sub => {
                    const isPending = !sub.isPaid;

                    return (
                        <SwipeableItem
                            key={sub.id}
                            onSwipeLeft={() => deleteRecurring(sub.templateId)}
                            onSwipeRight={() => handleSwipeRight(sub)}
                        >
                            <div
                                className="glass-panel"
                                style={{
                                    padding: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: isPending ? '1px solid var(--border-light)' : '1px solid rgba(255,255,255,0.02)',
                                    opacity: isPending ? 1 : 0.6,
                                    transform: isPending ? 'scale(1)' : 'scale(0.98)',
                                    transition: 'all 0.3s ease',
                                    margin: 0
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                                        background: isPending ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isPending ? 'var(--primary-color)' : 'var(--text-muted)',
                                    }}>
                                        {sub.title.charAt(0)}
                                    </div>

                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', textDecoration: !isPending ? 'line-through' : 'none' }}>
                                            {sub.title}
                                        </h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Due: {sub.dueDate}th of month
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>Rs. {Number(sub.amount).toLocaleString()}</span>
                                    {isPending ? (
                                        <button
                                            onClick={(e) => handlePay(sub.id, e)}
                                            style={{
                                                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                                                color: 'white', padding: '6px 16px', borderRadius: 'var(--radius-full)',
                                                fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px',
                                                boxShadow: '0 2px 10px var(--primary-glow)'
                                            }}
                                        >
                                            Tap to Pay
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success-color)', fontSize: '0.8rem', fontWeight: '600' }}>
                                            <CheckCircle size={14} /> Paid
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SwipeableItem>
                    )
                })}
            </div>

            <BottomSheet isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Payment">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-field">
                        <div className="form-label">Title</div>
                        <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    </div>
                    <div className="form-field">
                        <div className="form-label">Amount (Rs. )</div>
                        <input className="form-input" type="number" value={editAmt} onChange={e => setEditAmt(e.target.value)} />
                    </div>
                    <div className="form-field">
                        <div className="form-label">Due Date</div>
                        <input className="form-input" type="number" min="1" max="31" value={editDate} onChange={e => setEditDate(e.target.value)} />
                    </div>
                    <div className="form-field">
                        <div className="form-label">Category</div>
                        <div className="categories-row">
                            {catMap.map(c => (
                                <div
                                    key={c.name}
                                    className={`cat-btn ${editCat === c.name ? 'selected' : ''}`}
                                    onClick={() => setEditCat(editCat === c.name ? '' : c.name)}
                                    style={{
                                        color: editCat === c.name ? 'var(--indigo)' : 'var(--text-2)',
                                        borderColor: editCat === c.name ? 'var(--indigo)' : 'var(--border)',
                                        background: editCat === c.name ? 'var(--indigo-light)' : 'var(--white)'
                                    }}
                                >
                                    <span className="cat-icon">{c.icon}</span>
                                    <span className="cat-label">{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="overlay-submit" onClick={handleSaveEdit}>Save Changes</button>
                </div>
            </BottomSheet>
        </div>
    );
}
