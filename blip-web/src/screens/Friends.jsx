import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../store/AppContext';
import toast from 'react-hot-toast';
import BottomSheet from '../components/BottomSheet';
import SwipeableItem from '../components/SwipeableItem';
import {
    UserPlus, Plus, ChevronRight, Search, Check,
    ArrowUpRight, ArrowDownLeft, ChevronLeft,
    Wallet, X, Settings, UserMinus,
    SlidersHorizontal, CheckCircle2, Calendar, Lightbulb,
    TrendingDown, TrendingUp, Loader2, Users, AlertCircle, Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 }, transition: { duration: 0.22 } };
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const slideUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } };

const GROUP_ICONS = ['🏖️', '🏠', '🍱', '✈️', '🎉', '🏕️', '🛵', '🎓', '💼', '🎮', '🏋️', '🎬'];

const fmt = n => Math.abs(n).toLocaleString('en-IN');

function Avatar({ initials, size = 40, dark = false }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: size * 0.28,
            background: dark ? '#202020' : '#ffffff',
            color: dark ? '#c9f158' : '#202020',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: size * 0.38, fontWeight: 800, flexShrink: 0,
            border: '1px solid var(--border)',
        }}>{initials}</div>
    );
}

function BalanceTag({ amount }) {
    const bal = parseFloat(amount || 0);
    const isSettled = Math.abs(bal) <= 0.01;
    const isOwed = bal > 0.01;

    if (isSettled) return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            background: '#f2f3f5',
            borderRadius: 99,
            color: 'var(--text-3)',
            border: '1px solid rgba(0,0,0,0.03)'
        }}>
            <Check size={11} strokeWidth={3} />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Settled
            </span>
        </div>
    );

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 12px',
            background: isOwed ? '#c8f1581a' : '#EF44441a',
            borderRadius: 12,
            border: `1px solid ${isOwed ? '#c8f1589b' : '#EF44441a'}`,
            transition: 'all 0.2s ease'
        }}>
            <div style={{ color: isOwed ? '#c9f158' : '#EF4444', display: 'flex' }}>
                {isOwed ? <ArrowDownLeft size={13} strokeWidth={2.5} /> : <ArrowUpRight size={13} strokeWidth={2.5} />}
            </div>

            <span style={{
                fontSize: 13,
                fontWeight: 800,
                color: isOwed ? '#c9f158' : '#EF4444',
                fontFamily: "'Montserrat', sans-serif",
                letterSpacing: '-0.3px'
            }}>
                ₹{fmt(Math.abs(bal))}
            </span>
        </div>
    );
}

function ProTip({ text }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
                background: '#ffffff',
                borderRadius: 24,
                padding: '24px 32px',
                marginTop: 12,
                marginBottom: 24,
                position: 'relative',
                overflow: 'hidden',

                border: '1px solid #e5e7eb',

                boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
            }}
        >
            <div style={{
                position: 'absolute',
                right: -30,
                bottom: -30,
                opacity: 0.27,
                color: '#c9f158',
                pointerEvents: 'none',
                transform: 'rotate(-15deg)'
            }}>
                <Lightbulb size={160} strokeWidth={1} />
            </div>

            <div style={{ maxWidth: '82%', position: 'relative', zIndex: 1 }}>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10
                }}>
                    <div style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#c9f158',
                        boxShadow: '0 0 10px rgba(201, 241, 88, 0.6)'
                    }} />

                    <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: 'rgba(32, 32, 32, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '1.8px',
                        fontFamily: "'Montserrat', sans-serif"
                    }}>
                        Blip Pro Tip
                    </span>
                </div>

                <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#202020',
                    lineHeight: 1.6,
                    fontFamily: "'Montserrat', sans-serif"
                }}>
                    {text}
                </div>
            </div>
        </motion.div>
    );
}

function parseInput(input) {
    const parts = input.trim().split(/\s+/);
    if (!parts.length) return null;
    const first = parseFloat(parts[0]);
    if (!isNaN(first) && first > 0) return { amount: first, desc: parts.slice(1).join(' ') };
    const last = parseFloat(parts[parts.length - 1]);
    if (!isNaN(last) && last > 0) return { amount: last, desc: parts.slice(0, -1).join(' ') };
    return null;
}

function FriendSearchInput({ friends, selected, onAdd, onRemove, placeholder = 'Search friends?' }) {
    const [query, setQuery] = useState('');
    const [focused, setFocused] = useState(false);
    const suggestions = query.length > 0
        ? friends.filter(f => f.name.toLowerCase().includes(query.toLowerCase()) && !selected.find(s => s.id === f.id))
        : [];

    return (
        <div style={{ position: 'relative' }}>
            {selected.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {selected.map(f => (
                        <motion.div key={f.id} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#202020', color: '#fff', borderRadius: 99, padding: '8px 12px 8px 10px', fontSize: 14, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                            <Avatar initials={f.initials} size={20} dark />
                            {f.name.split(' ')[0]}
                            <X size={11} color="rgba(255, 255, 255, 0.69)" style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => onRemove(f.id)} />
                        </motion.div>
                    ))}
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', borderRadius: 25, padding: '17px 14px', border: `1.5px solid ${focused ? '#202020' : '#6b6b6b57'}`, transition: 'border-color 0.2s' }}>
                <Search size={20} color="var(--text-3)" />
                <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} placeholder={placeholder}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, fontFamily: "'Montserrat', sans-serif", color: '#202020', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }} />
                {query && <X size={20} color="var(--text-3)" style={{ cursor: 'pointer' }} onClick={() => setQuery('')} />}
            </div>
            <AnimatePresence>
                {suggestions.length > 0 && (
                    <motion.div {...fadeUp} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#ffffff', border: '1px solid var(--border)', borderRadius: 25, overflow: 'hidden', marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                        {suggestions.map((f, idx) => (
                            <div key={f.id} onMouseDown={() => { onAdd(f); setQuery(''); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 14px', borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                                <Avatar initials={f.initials} size={35} />
                                <span style={{ fontSize: 15, fontWeight: 600, color: '#202020' }}>{f.name}</span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function useExpenseForm(initialExpense, initialPeople, mode) {
    const [nlp, setNlp] = useState(initialExpense ? `${initialExpense.desc} ${initialExpense.amount}` : '');
    const [date, setDate] = useState(initialExpense?.date || new Date().toISOString().split('T')[0]);
    const [splitType, setSplitType] = useState('equal');
    const [shares, setShares] = useState({});
    const [unequal, setUnequal] = useState({});
    const [paidBy, setPaidBy] = useState(initialExpense?.paidBy || 'me');
    const [selectedPpl, setSelectedPpl] = useState(initialPeople || []);

    const parsed = parseInput(nlp);
    const total = parsed?.amount || 0;
    const desc = parsed?.desc || '';

    const reset = () => { setNlp(''); setDate(new Date().toISOString().split('T')[0]); setSplitType('equal'); setShares({}); setUnequal({}); setPaidBy('me'); setSelectedPpl([]); };

    return { nlp, setNlp, date, setDate, splitType, setSplitType, shares, setShares, unequal, setUnequal, paidBy, setPaidBy, selectedPpl, setSelectedPpl, parsed, total, desc, reset };
}

function ExpenseSheet({ isOpen, onClose, mode, allFriends, allGroups, preFriends = [], preGroup = null, editingExpense = null, groupMembers = null, onSaved }) {
    const { editSocialExpense, addGroupExpense, addFriendExpense } = useApp();
    const [submitting, setSubmitting] = useState(false);
    const isEditing = !!editingExpense;

    const form = useExpenseForm(editingExpense, preFriends, mode);
    const [selectedGrp, setSelectedGrp] = useState(preGroup || '');

    const grpMembers = allGroups?.find(g => g.id === selectedGrp)?.members || groupMembers || [];
    const people = mode === 'group'
        ? (grpMembers.length > 0 ? grpMembers : [{ id: 'me', name: 'You', initials: 'YO' }])
        : [{ id: 'me', name: 'You', initials: 'YO' }, ...form.selectedPpl];

    const unequalUsed = people.reduce((sum, person) => {
        return sum + parseFloat(form.unequal[person.id] || 0);
    }, 0);

    const unequalDiff = parseFloat((form.total - unequalUsed).toFixed(2));
    const isUnequalSplitValid = Math.abs(unequalDiff) < 0.01;

    const canSubmit = form.total > 0 &&
        form.desc &&
        (form.splitType === 'unequal' ? isUnequalSplitValid : true) &&
        (mode === 'friend' ? form.selectedPpl.length > 0 : !!selectedGrp);

    const handleClose = () => { form.reset(); onClose(); };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            let splits = [];
            if (form.splitType === 'equal') {
                const sq = form.total / people.length;
                splits = people.map(p => ({ userId: p.id, amount: sq }));
            } else if (form.splitType === 'shares') {
                const totalShares = people.reduce((s, p) => s + parseInt(form.shares[p.id] || 1), 0);
                splits = people.map(p => ({ userId: p.id, amount: (parseInt(form.shares[p.id] || 1) / totalShares) * form.total }));
            } else {
                splits = people.map(p => ({ userId: p.id, amount: parseFloat(form.unequal[p.id] || 0) }));
            }

            let sum = 0;
            splits = splits.map(s => {
                const a = parseFloat(s.amount.toFixed(2));
                sum += a;
                return { ...s, amount: a };
            });
            const diff = form.total - sum;
            if (Math.abs(diff) > 0.001 && splits.length > 0) {
                const payerIdx = splits.findIndex(s => s.userId === form.paidBy);
                if (payerIdx >= 0) {
                    splits[payerIdx].amount = parseFloat((splits[payerIdx].amount + diff).toFixed(2));
                } else {
                    splits[0].amount = parseFloat((splits[0].amount + diff).toFixed(2));
                }
            }

            const payload = { description: form.desc, amount: form.total, paidBy: form.paidBy, date: form.date, splits: splits.map(s => ({ userId: s.userId, amount: s.amount })) };

            if (isEditing) { await editSocialExpense(editingExpense.id, payload); }
            else if (mode === 'group') { await addGroupExpense(selectedGrp, payload); }
            else { const friendId = form.selectedPpl[0]?.id || preFriends[0]?.id; await addFriendExpense(friendId, payload); }

            form.reset();
            if (onSaved) onSaved();
            onClose();
        } catch (err) { toast.error(err.message || 'Failed to save'); }
        finally { setSubmitting(false); }
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Edit Expense' : 'Add Expense'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 12 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 4px' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                        {mode === 'group' ? 'Select Group' : 'Split With'}
                    </div>
                    <div style={{
                        marginBottom: 8, position: 'relative', display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '10px 12px', borderRadius: 18, border: '1px solid #c4c5c8ff'
                    }}>
                        < Calendar size={12} color="#202020" />
                        <input
                            type="date"
                            value={form.date}
                            onChange={e => form.setDate(e.target.value)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#202020' }}>
                            {new Date(form.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                    </div>
                </div>

                {mode === 'group' && !isEditing ? (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {(allGroups || []).map(g => (
                            <div key={g.id} onClick={() => setSelectedGrp(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 18, cursor: 'pointer', flexShrink: 0, background: selectedGrp === g.id ? '#202020' : '#ffffff', color: selectedGrp === g.id ? '#ffffff' : '#202020', border: `1px solid ${selectedGrp === g.id ? '#202020' : '#e5e7eb'}`, transition: 'all 0.2s' }}>
                                <span>{g.icon}</span><span style={{ fontWeight: 700, fontSize: 13 }}>{g.name}</span>
                            </div>
                        ))}
                    </div>
                ) : mode === 'friend' && !isEditing && (
                    <FriendSearchInput friends={allFriends} selected={form.selectedPpl} onAdd={f => form.setSelectedPpl(p => [...p, f])} onRemove={id => form.setSelectedPpl(p => p.filter(f => f.id !== id))} />
                )}

                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                    Expense Name and Amount
                </div>
                <div style={{
                    background: '#ffffff',
                    borderRadius: 24,
                    padding: '0 20px',
                    height: 55,
                    display: 'flex',
                    alignItems: 'center',
                    border: `1.5px solid ${form.nlp && form.parsed ? '#c9f158' : '#c4c5c893'}`,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                    <input
                        autoFocus
                        value={form.nlp}
                        onChange={e => form.setNlp(e.target.value)}
                        placeholder="Dinner 1200"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '18px', fontWeight: 800, color: '#202020', fontFamily: "'Montserrat', sans-serif" }}
                    />
                </div>
                {form.nlp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, margin: '-6px 8px 10px', color: form.parsed ? '#059669' : '#EF4444', fontSize: 12, fontWeight: 600 }}>
                        {form.parsed ? <><Check size={14} /> ₹{form.parsed.amount.toLocaleString('en-IN')} for {form.parsed.desc || '...'}</> : 'Enter amount and name'}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginLeft: 4 }}>
                        Paid By
                    </div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {people.map(p => {
                            const isSelected = form.paidBy === p.id;
                            return (
                                <motion.div
                                    key={p.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => form.setPaidBy(p.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 14px',
                                        borderRadius: 25,
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        background: isSelected ? '#202020' : '#ffffff',
                                        color: isSelected ? '#ffffff' : '#202020',
                                        border: `1px solid ${isSelected ? '#202020' : '#e5e7eb'}`,
                                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Avatar initials={p.initials} size={20} />
                                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                                        {p.id === 'me' ? 'You' : p.name.split(' ')[0]}
                                    </span>
                                    {isSelected && <Check size={14} color="#c9f158" strokeWidth={3} />}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {people.length >= 2 && form.total > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', position: 'relative' }}>
                            {['equal', 'shares', 'unequal'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => form.setSplitType(type)}
                                    style={{
                                        flex: 1, padding: '14px 0', border: 'none', background: 'transparent',
                                        fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                        color: form.splitType === type ? '#202020' : 'rgba(32,32,32,0.3)',
                                        textTransform: 'uppercase', transition: 'color 0.2s'
                                    }}
                                >
                                    {type}
                                    {form.splitType === type && (
                                        <motion.div
                                            layoutId="splitTab"
                                            style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 3.5, background: '#202020', width: '33.33%', marginLeft: type === 'equal' ? '0%' : type === 'shares' ? '33.33%' : '66.66%' }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div style={{ background: '#f8f9fa', borderRadius: 25, padding: '14px 16px' }}>
                            {people.map(p => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                                    <Avatar initials={p.initials} size={42} />
                                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#202020' }}>{p.name}</span>
                                    {form.splitType === 'shares' ? (
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={form.shares[p.id] === undefined ? 1 : form.shares[p.id]}
                                            onChange={e => {
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                const val = rawValue === '' ? '' : parseInt(rawValue);

                                                form.setShares({ ...form.shares, [p.id]: val });
                                            }}
                                            onBlur={() => {
                                                if (form.shares[p.id] === '' || form.shares[p.id] === 0) {
                                                    form.setShares({ ...form.shares, [p.id]: 1 });
                                                }
                                            }}
                                            style={{
                                                width: 50,
                                                textAlign: 'center',
                                                padding: '8px',
                                                borderRadius: 10,
                                                border: '1px solid #e5e7eb',
                                                fontSize: 14,
                                                fontWeight: 800,
                                                outline: 'none',
                                                background: form.shares[p.id] === 0 || form.shares[p.id] === '' ? '#fff5f5' : 'transparent'
                                            }}
                                        />
                                    ) : form.splitType === 'unequal' ? (
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700 }}>₹</span>
                                            <input
                                                type="number"
                                                value={form.unequal[p.id] || ''}
                                                onChange={e => form.setUnequal({ ...form.unequal, [p.id]: e.target.value })}
                                                placeholder="0"
                                                style={{ width: 80, textAlign: 'right', padding: '8px 10px 8px 20px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, fontWeight: 800 }}
                                            />
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>₹{(form.total / people.length).toFixed(1)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <AnimatePresence>
                    {form.splitType === 'unequal' && !isUnequalSplitValid && (
                        <motion.div {...fadeUp} style={{ background: '#fff5f5', borderRadius: 24, padding: '14px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <AlertCircle size={18} color="#ef4444" />
                            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>
                                Mismatch : ₹{Math.abs(unequalDiff).toFixed(2)} remaining
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmit}
                    style={{
                        background: canSubmit ? '#202020' : '#bab9b9ff', color: canSubmit ? '#ffffff' : '#ffffff', letterSpacing: '1.5px',
                        border: 'none', borderRadius: 25, padding: '18px', fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: canSubmit ? '0 10px 30px rgba(0,0,0,0.15)' : 'none'
                    }}
                >
                    {submitting ? <Loader2 size={25} className="animate-spin" /> : <>Confirm Expense</>}
                </motion.button>
            </div>
        </BottomSheet >
    );
}


function SettleSheet({ isOpen, onClose, name, totalOwed, onConfirm }) {
    const [submitting, setSubmitting] = useState(false);
    const [syncWithBudget, setSyncWithBudget] = useState(false);
    const abs = Math.abs(totalOwed);
    const [amt, setAmt] = useState(String(abs));
    const parsed = parseFloat(amt) || 0;
    const isPartial = parsed < abs && parsed > 0;
    const canPay = parsed > 0 && parsed <= abs;

    const chips = [100, 200, 500, 1000].filter(v => v < abs);

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Settle Up">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>

                {/* Context line */}
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, lineHeight: 1.5 }}>
                    {totalOwed > 0
                        ? <>{name} owes you a total of <strong style={{ color: '#c9f158' }}>₹{fmt(abs)}</strong>. How much are they paying now?</>
                        : <>You owe {name} a total of <strong style={{ color: '#EF4444' }}>₹{fmt(abs)}</strong>. How much are you paying now?</>
                    }
                </div>

                {/* Big amount input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', borderRadius: 28, padding: '12px 14px', border: `1.5px solid ${canPay ? '#202020' : '#2020206a'}`, transition: 'border-color 0.2s' }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-3)' }}>₹</span>
                    <input inputMode='decimal' type="number" value={amt} onChange={e => setAmt(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 27, fontWeight: 800, fontFamily: "'Montserrat', sans-serif", color: '#202020', letterSpacing: '-1px' }} />
                </div>

                {/* Quick chips */}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {chips.map(v => (
                        <div key={v} onClick={() => setAmt(String(v))} style={{ padding: '6px 13px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", background: parsed === v ? '#202020' : '#f2f3f5', color: parsed === v ? '#ffffff' : 'var(--text-3)', transition: 'all 0.15s' }}>
                            ₹{v.toLocaleString('en-IN')}
                        </div>
                    ))}
                    <div onClick={() => setAmt(String(abs))} style={{ padding: '6px 13px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", background: parsed === abs ? '#c9f158' : '#f2f3f5', color: parsed === abs ? '#202020' : 'var(--text-3)', transition: 'all 0.15s' }}>
                        Full ₹{fmt(abs)}
                    </div>
                </div>
                    
                <div //toggle
                    onClick={() => setSyncWithBudget(!syncWithBudget)}
                    style={{
                        padding: '14px 16px', borderRadius: '30px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', marginTop: '4px'
                    }}
                >
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#202020', fontFamily: 'Montserrat' }}>Log this as an Expense?</div>
                    </div>
                    <div style={{
                        width: '55px', height: '25px', background: syncWithBudget ? '#202020' : '#ebecef',
                        borderRadius: '20px', position: 'relative', transition: '0.3s'
                    }}>
                        <div style={{
                            width: '19px', height: '19px', background: '#fff', borderRadius: '50%',
                            position: 'absolute', top: '3px', left: syncWithBudget ? '33px' : '3px',
                            transition: '0.3s cubic-bezier(0.175, 0.885, 0.32, 1.2)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }} />
                    </div>
                </div>

                <AnimatePresence>
                    {isPartial && (
                        <motion.div {...fadeUp} style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 11, padding: '10px 14px', fontSize: 12, color: '#92400E', fontWeight: 500, lineHeight: 1.5 }}>
                            Partial payment — <strong>₹{fmt(abs - parsed)}</strong> will remain outstanding after this.
                        </motion.div>
                    )}
                </AnimatePresence>

                {parsed > abs && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 11, padding: '10px 14px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                        Amount exceeds the outstanding balance of ₹{fmt(abs)}.
                    </div>
                )}

                <button disabled={!canPay || submitting} onClick={async () => {
                    setSubmitting(true);
                    try {
                        await onConfirm(parsed, syncWithBudget);
                    } finally {
                        setSubmitting(false);
                    }
                }} style={{ background: canPay ? '#202020' : '#f2f3f5', color: canPay ? '#ffffff' : 'var(--text-3)', border: 'none', borderRadius: 24, padding: '15px', fontSize: 14, fontWeight: 800, fontFamily: "'Montserrat', sans-serif", cursor: canPay ? 'pointer' : 'not-allowed', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {submitting ? 'Saving...' : (!isPartial && canPay ? <><CheckCircle2 size={16} /> Mark Fully Settled</> : 'Record Partial Payment')}
                </button>
            </div>
        </BottomSheet>
    );
}

function ExpenseList({ expenses, onDelete, onEdit, emptyTip, user }) {
    if (!expenses || expenses.length === 0) return <ProTip text={emptyTip} />;

    const groupedData = useMemo(() => {
        const months = {};
        const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

        sorted.forEach(item => {
            const d = new Date(item.date);
            const monthKey = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
            const dayKey = d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' }) + ', ' + d.toLocaleDateString('en-IN', { weekday: 'short' });

            if (!months[monthKey]) months[monthKey] = { days: {}, totalSpent: 0 };
            if (!months[monthKey].days[dayKey]) months[monthKey].days[dayKey] = { items: [], dailyTotal: 0 };

            months[monthKey].days[dayKey].items.push(item);

            if (item.type === 'expense') {
                months[monthKey].totalSpent += parseFloat(item.amount || 0);
                months[monthKey].days[dayKey].dailyTotal += parseFloat(item.amount || 0);
            }
        });
        return months;
    }, [expenses]);

    return (
        <motion.div variants={stagger} initial="initial" animate="animate">
            {Object.entries(groupedData).map(([monthStr, monthData]) => (
                <div key={monthStr} style={{ marginBottom: 32 }}>

                    {/* MONTH HEADER */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: '0 4px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {monthStr}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '1px', marginTop: '3px' }}>
                            TOTAL <span style={{ color: '#202020' }}>₹{monthData.totalSpent.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    {Object.entries(monthData.days).map(([dayStr, dayData]) => (
                        <div key={dayStr} style={{ marginBottom: 16 }}>

                            <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden' }}>

                                <div style={{ padding: '12px 16px 4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#202020' }}>{dayStr}</span>
                                    {dayData.dailyTotal > 0 && (
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>₹{dayData.dailyTotal.toLocaleString('en-IN')}</span>
                                    )}
                                </div>

                                {dayData.items.map((item, idx) => {
                                    const isPayment = item.type === 'payment' || item.type === 'settlement';
                                    const isMe = item.paidBy === user?.id || item.paidBy === 'me';
                                    const isSettled = !isPayment && item.isPaid;

                                    return (
                                        <motion.div key={item.id} variants={slideUp}>
                                            <SwipeableItem
                                                onSwipeLeft={() => onDelete(item.id)}
                                                onSwipeRight={isPayment ? null : () => onEdit(item)}
                                                leftLabel="Delete"
                                                rightLabel={isPayment ? null : "Edit"}
                                            >
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px',
                                                    borderBottom: idx < dayData.items.length - 1 ? '1px solid #f2f3f5' : 'none',
                                                    background: '#ffffff',
                                                    opacity: isSettled ? 0.75 : 1
                                                }}>
                                                    <div style={{
                                                        width: 40, height: 40, borderRadius: 14,
                                                        background: isPayment ? '#c9f158' : '#f2f3f5',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 15,
                                                        color: '#202020', flexShrink: 0
                                                    }}>
                                                        {isPayment ? <Check size={22} strokeWidth={3} /> : item.desc?.charAt(0).toUpperCase()}
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#202020', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {isPayment ? 'Settlement' : item.desc}
                                                            </div>
                                                            {isSettled && (
                                                                <div style={{ fontSize: 10, fontWeight: 800, color: '#c9f158', background: 'rgba(201, 241, 88, 0.1)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' }}>
                                                                    PAID
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                                            {isPayment ? (
                                                                <span style={{ fontWeight: 600 }}>
                                                                    {item.paidByName} → {item.paidToName}
                                                                </span>
                                                            ) : (
                                                                <>{item.paidByName} paid · <span style={{ opacity: 0.7 }}>{item.groupName || 'Private'}</span></>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{
                                                            fontSize: 17, fontWeight: 800,
                                                            color: isPayment ? '#6366f1' : '#202020',
                                                            fontFamily: "'Montserrat', sans-serif",
                                                            textDecoration: isSettled ? 'line-through' : 'none',
                                                            opacity: isSettled ? 0.5 : 1
                                                        }}>
                                                            ₹{parseFloat(item.amount).toLocaleString('en-IN')}
                                                        </div>

                                                        {!isPayment && !isSettled && item.yourShare > 0 && (
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#c9f158', background: '#202020', padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginTop: 4 }}>
                                                                you owe ₹{parseFloat(item.yourShare).toLocaleString('en-IN')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </SwipeableItem>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </motion.div>
    );
}


function AddFriendSheet({ isOpen, onClose, onAdded }) {
    const { searchByPhone, addFriend } = useApp();
    const [phone, setPhone] = useState('');
    const [result, setResult] = useState(null);
    const [added, setAdded] = useState(false);
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (phone.length < 10) return;
        setSearching(true);
        setResult(null);

        try {
            const res = await searchByPhone(phone);
            if (res && res.name) {
                setResult({ found: true, user: res });
            } else {
                setResult({ found: false });
            }
        } catch (e) {
            setResult({ found: false });
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async () => {
        setAdded(true);
        try {
            await addFriend(result.user.id);
            if (onAdded) onAdded();
            setTimeout(() => {
                onClose();
                setPhone('');
                setResult(null);
                setAdded(false);
            }, 800);
        } catch (e) {
            setAdded(false);
        }
    };

    const inviteLink = `https://blip-eta.vercel.app/join`;

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Friend">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: 4 }}>
                        Find by Phone
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: '#ffffff',
                        borderRadius: 32,
                        padding: '12px 16px',
                        border: `1px solid ${phone.length === 10 ? '#202020' : '#e5e7eb'}`,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#202020', opacity: 0.4 }}>+91</span>
                            <div style={{ width: '1px', height: '16px', background: '#e5e7eb' }} />
                        </div>

                        <input
                            type="tel"
                            maxLength={10}
                            value={phone}
                            onChange={e => {
                                setPhone(e.target.value.replace(/\D/g, ''));
                                setResult(null);
                                setAdded(false);
                            }}
                            placeholder="99887 45678"
                            style={{
                                flex: 1,
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontSize: '17px',
                                fontWeight: 700,
                                fontFamily: "'Montserrat', sans-serif",
                                color: '#202020',
                                letterSpacing: '1.5px'
                            }}
                        />
                        {phone.length === 10 && (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSearch}
                                disabled={searching}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 20,
                                    background: '#202020',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    border: 'none'
                                }}
                            >
                                {searching ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    >
                                        <Loader2 size={20} />
                                    </motion.div>
                                ) : (
                                    <Search size={20} color="#c9f158" strokeWidth={3} />
                                )}
                            </motion.button>
                        )}
                    </div>
                </div>
                <AnimatePresence mode="wait">
                    {result?.found && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                border: '1px solid rgba(5, 150, 105, 0.1)',
                                borderRadius: 28,
                                padding: '18px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14
                            }}
                        >
                            <Avatar initials={result.user.name.substring(0, 2)} size={48} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 17, fontWeight: 700, color: '#202020', fontFamily: "'Montserrat', sans-serif" }}>
                                    {result.user.name}
                                </div>
                                <div style={{ fontSize: 11, color: '#059669', fontWeight: 500, marginTop: 1 }}>
                                    Member since {new Date().getFullYear()}
                                </div>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleAdd}
                                style={{
                                    background: added ? '#059669' : '#202020',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 16,
                                    padding: '10px 16px',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    fontFamily: "'Montserrat', sans-serif",
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                            >
                                {added ? <><Check size={14} strokeWidth={3} /> DONE</> : <><UserPlus size={14} /> ADD</>}
                            </motion.button>
                        </motion.div>
                    )}

                    {result?.found === false && (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: 28,
                            padding: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 16,
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{
                                padding: 5,
                                background: '#fff',
                                borderRadius: 32,
                                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                                border: '1px solid #f0f0f0'
                            }}>
                                <QRCodeSVG
                                    value={inviteLink}
                                    size={150}
                                    bgColor={"#ffffff"}
                                    fgColor={"#202020"}
                                    level={"H"}
                                    includeMargin={true}
                                />
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#202020', fontFamily: "'Montserrat', sans-serif" }}>
                                    Not on Blip? Scan to Join!
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, marginTop: 4 }}>
                                    Your unique invite link
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </BottomSheet>
    );
}


function CreateGroupSheet({ isOpen, onClose, allFriends, onGroupCreated }) {
    const { createGroup } = useApp();
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('🏠');
    const [searchQuery, setSearchQuery] = useState('');
    const [sel, setSel] = useState([]);
    const [isCreating, setIsCreating] = useState(false);

    const filteredFriends = useMemo(() => {
        return (allFriends || []).filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allFriends, searchQuery]);

    const selectedMembers = (allFriends || []).filter(f => sel.includes(f.id));

    const toggleMember = (id) => {
        setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    };

    const handleCreate = async () => {
        if (!name.trim() || isCreating) return;

        setIsCreating(true);
        try {
            await createGroup({ name, icon, memberIds: sel });
            if (onGroupCreated) onGroupCreated();
            setName(''); setIcon('🏷️'); setSel([]); setSearchQuery('');
            onClose();
        } catch (e) {
            setIsCreating(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Create Group">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 16 }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20, background: '#f8f9fa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 30, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Group Name
                        </div>
                        <input
                            placeholder="e.g. Goa Trip"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{
                                width: '100%', border: 'none', borderBottom: '2px solid #202020',
                                background: 'transparent', padding: '8px 0', fontSize: 18,
                                fontWeight: 700, fontFamily: "'Montserrat', sans-serif", color: '#202020', outline: 'none'
                            }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, margin: '0 -4px' }}>
                    {GROUP_ICONS.map(ic => (
                        <motion.div
                            key={ic}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIcon(ic)}
                            style={{
                                minWidth: 58, height: 58, borderRadius: 18, fontSize: 20,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', background: icon === ic ? '#202020' : '#f2f3f553',
                                border: `1px solid ${icon === ic ? '#202020' : '#585858ff'}`,
                                transition: 'all 0.2s'
                            }}
                        >
                            {ic}
                        </motion.div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Add Members ({sel.length})
                        </div>
                    </div>

                    <AnimatePresence>
                        {selectedMembers.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    overflowX: 'auto',
                                    padding: '4px 0',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}
                            >
                                {selectedMembers.map(m => (
                                    <motion.div
                                        key={m.id}
                                        layout
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        onClick={() => toggleMember(m.id)}
                                        style={{
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            background: '#ffffff',
                                            border: '1px solid #8e8e8eff',
                                            padding: '6px 6px 6px 10px',
                                            borderRadius: 99,
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                        }}
                                    >
                                        <Avatar initials={m.initials} size={24} />
                                        <span style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#202020',
                                            fontFamily: "'Montserrat', sans-serif"
                                        }}>
                                            {m.name.split(' ')[0]}
                                        </span>
                                        <div style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: '#202020',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <X size={10} color="#fff" strokeWidth={3} />
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', height: 54,
                        borderRadius: 25, padding: '12px 16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: 12
                    }}>
                        <Search size={20} color="var(--text-3)" />
                        <input
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}
                        />
                    </div>

                    <div style={{
                        maxHeight: 200, overflowY: 'auto', background: '#ffffff',
                        borderRadius: 25, border: searchQuery ? '1px solid #e5e7eb' : 'none'
                    }}>
                        {searchQuery && filteredFriends.map((f, idx) => (
                            <div
                                key={f.id}
                                onClick={() => toggleMember(f.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px',
                                    borderBottom: idx < filteredFriends.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    background: sel.includes(f.id) ? 'rgba(201, 241, 88, 0.05)' : 'transparent'
                                }}
                            >
                                <Avatar initials={f.initials} size={35} />
                                <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#202020' }}>{f.name}</div>
                                {sel.includes(f.id) ? (
                                    <Check size={16} color="#059669" strokeWidth={4} />
                                ) : (
                                    <Plus size={16} color="var(--text-3)" strokeWidth={4} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <motion.button
                    whileTap={{ scale: isCreating ? 1 : 0.97 }}
                    disabled={!name.trim() || isCreating}
                    onClick={handleCreate}
                    style={{
                        background: name.trim() && !isCreating ? '#202020' : '#c4c4c5c4',
                        color: name.trim() && !isCreating ? '#ffffff' : '#ffffff',
                        border: 'none',
                        borderRadius: 25,
                        padding: '18px',
                        fontSize: 14,
                        fontWeight: 800,
                        fontFamily: "'Montserrat', sans-serif",
                        cursor: name.trim() && !isCreating ? 'pointer' : 'not-allowed',
                        boxShadow: name.trim() && !isCreating ? '0 10px 25px rgba(0,0,0,0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10
                    }}
                >
                    {isCreating ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                style={{ display: 'flex' }}
                            >
                                <Loader2 size={25} />
                            </motion.div>
                        </>
                    ) : (
                        "CREATE GROUP"
                    )}
                </motion.button>
            </div>
        </BottomSheet>
    );
}

// ── Group settings sheet ──────────────────────────────────────────────────────
function GroupSettingsSheet({ isOpen, onClose, group, allFriends, onSave, onRemoveMember, onAddMember, onDeleteGroup }) {
    const [name, setName] = useState(group?.name || '');
    const [icon, setIcon] = useState(group?.icon || '🏷️');
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Keep in sync when group prop changes
    useEffect(() => {
        if (group) {
            setName(group.name || '');
            setIcon(group.icon || '🏷️');
        }
    }, [group]);

    const members = group?.members || [];

    const handleSave = async () => {
        if (!group || !name.trim()) return;
        setSaving(true);
        try {
            await onSave(group.id, { name: name.trim(), icon });
            onClose();
        } catch (e) {
            toast.error(e.message || 'Failed to update group');
        } finally {
            setSaving(false);
        }
    };
    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Group Settings">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 16 }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 22, background: '#f8f9fa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 30, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Group Name
                        </div>
                        <input
                            placeholder="e.g. Goa Trip"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{
                                width: '100%', border: 'none', borderBottom: '2px solid #202020',
                                background: 'transparent', padding: '8px 0', fontSize: 20,
                                fontWeight: 700, fontFamily: "'Montserrat', sans-serif", color: '#202020', outline: 'none'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, margin: '0 -4px', scrollbarWidth: 'none' }}>
                    {GROUP_ICONS.map(ic => (
                        <motion.div
                            key={ic}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIcon(ic)}
                            style={{
                                minWidth: 58, height: 58, borderRadius: 22, fontSize: 20,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', background: icon === ic ? '#202020' : '#f2f3f553',
                                border: `1px solid ${icon === ic ? '#202020' : '#585858ff'}`,
                                transition: 'all 0.2s'
                            }}
                        >
                            {ic}
                        </motion.div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Current Members ({members.length})
                    </div>

                    <div style={{
                        display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0',
                        scrollbarWidth: 'none', msOverflowStyle: 'none'
                    }}>
                        <AnimatePresence>
                            {members.map(m => (
                                <motion.div
                                    key={m.id}
                                    layout
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    onClick={() => m.id !== 'me' && group?.id && onRemoveMember(group.id, m.id)}
                                    style={{
                                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                                        background: '#ffffff', border: '1px solid #e5e7eb',
                                        padding: '6px 6px 6px 10px', borderRadius: 99,
                                        cursor: m.id === 'me' ? 'default' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    <Avatar initials={m.initials} size={24} />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#202020', fontFamily: "'Montserrat', sans-serif" }}>
                                        {m.name.split(' ')[0]} {m.id === 'me' ? '(You)' : ''}
                                    </span>
                                    {m.id !== 'me' && (
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <X size={10} color="#fff" strokeWidth={3} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', height: 54,
                        borderRadius: 25, padding: '12px 16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                        <Search size={20} color="var(--text-3)" />
                        <input
                            placeholder="Add Members?"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}
                        />
                    </div>

                    {searchQuery && (
                        <div style={{ maxHeight: 200, overflowY: 'auto', background: '#ffffff', borderRadius: 25, border: '1px solid #e5e7eb' }}>
                            {allFriends.filter(f =>
                                f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                                !members.find(m => m.id === f.id)
                            ).map((f, idx, arr) => (
                                <div
                                    key={f.id}
                                    onClick={() => {
                                        onAddMember(group.id, f.id);
                                        setSearchQuery('');
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px',
                                        borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none'
                                    }}
                                >
                                    <Avatar initials={f.initials} size={35} />
                                    <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#202020' }}>{f.name}</div>
                                    <Plus size={16} color="#202020" strokeWidth={4} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    <motion.button
                        whileTap={{ scale: saving ? 1 : 0.97 }}
                        disabled={!name.trim() || saving}
                        onClick={handleSave}
                        style={{
                            background: '#202020', color: '#ffffff', border: 'none', borderRadius: 25,
                            padding: '18px', fontSize: 14, fontWeight: 800, fontFamily: "'Montserrat', sans-serif",
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                        }}
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : "SAVE CHANGES"}
                    </motion.button>

                    {onDeleteGroup && (
                        <motion.div
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                                if (window.confirm("Delete this group and all its history?")) {
                                    group?.id && onDeleteGroup(group.id);
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '16px', background: '#fff5f5', borderRadius: 25,
                                cursor: 'pointer', border: '1px solid #fee2e2'
                            }}
                        >
                            <Trash2 size={16} color="#ef4444" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', fontFamily: "'Montserrat', sans-serif" }}>
                                DELETE GROUP
                            </span>
                        </motion.div>
                    )}
                </div>
            </div>
        </BottomSheet>
    );
}

function FilterSheet({ isOpen, onClose, filter, setFilter }) {
    const options = [
        {
            id: 'all',
            label: 'Everyone',
            sub: 'View all active social circles',
            icon: <Users size={18} />,
            color: '#202020'
        },
        {
            id: 'owes_me',
            label: 'Owes me',
            sub: 'Friends who need to pay you',
            icon: <TrendingUp size={18} />,
            color: '#059669' // Emerald
        },
        {
            id: 'i_owe',
            label: 'I owe',
            sub: 'Expenses you need to clear',
            icon: <TrendingDown size={18} />,
            color: '#EF4444' // Rose
        },
        {
            id: 'settled',
            label: 'Settled',
            sub: 'See your completed history',
            icon: <CheckCircle2 size={18} />,
            color: 'var(--text-3)'
        }
    ];

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Filter By">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>

                {options.map((opt) => {
                    const isActive = filter === opt.id;

                    return (
                        <motion.div
                            key={opt.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setFilter(opt.id); onClose(); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '16px 20px',
                                // ─── DYNAMIC STYLING ───
                                background: '#ffffff',
                                borderRadius: 20,
                                cursor: 'pointer',
                                border: `1px solid ${isActive ? '#202020' : '#e5e7eb'}`,
                                boxShadow: isActive ? '0 8px 20px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                width: 42,
                                height: 42,
                                borderRadius: 12,
                                background: isActive ? `${opt.color}10` : '#f8f9fa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isActive ? opt.color : 'var(--text-3)',
                                transition: 'all 0.2s'
                            }}>
                                {opt.icon}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: 15,
                                    fontWeight: 800,
                                    color: '#202020',
                                    fontFamily: "'Montserrat', sans-serif",
                                    letterSpacing: '-0.3px'
                                }}>
                                    {opt.label}
                                </div>
                                <div style={{
                                    fontSize: 11,
                                    color: 'var(--text-3)',
                                    fontWeight: 500,
                                    marginTop: 2
                                }}>
                                    {opt.sub}
                                </div>
                            </div>

                            <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isActive && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    >
                                        <div style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            background: '#202020',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Check size={12} color="#c9f158" strokeWidth={4} />
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </BottomSheet>
    );
}

function ListSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{
                    height: 64,
                    background: '#ffffff',
                    borderRadius: 18,
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
                    opacity: 0.6
                }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f2f3f5' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ width: '40%', height: 12, background: '#f2f3f5', borderRadius: 4, marginBottom: 6 }} />
                        <div style={{ width: '20%', height: 8, background: '#f2f3f5', borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 50, height: 14, background: '#f2f3f5', borderRadius: 4 }} />
                </div>
            ))}
        </div>
    );
}

// ── Friend detail ─────────────────────────────────────────────────────────────
function FriendDetail({ friend, allFriends, onBack, onRemoveFriend, onRefresh }) {
    const { deleteSocialExpense, deleteSocialPayment, settleFriend, syncFriendDetail, activeFriendContext, user } = useApp();
    const [loading, setLoading] = useState(true);
    const [showSettle, setShowSettle] = useState(false);
    const [showAddExp, setShowAddExp] = useState(false);
    const [editingExp, setEditingExp] = useState(null);
    const [showSettled, setShowSettled] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await syncFriendDetail(friend.id);
            setLoading(false);
        };
        load();
    }, [friend.id]);

    const { expenses, balance: syncedBalance } = activeFriendContext;

    const currentBalance = parseFloat(syncedBalance || 0);
    const settledExpenses = (expenses || []).filter(e => e.isPaid);
    const activeExpenses = (expenses || []).filter(e => !e.isPaid);
    const visibleExpenses = showSettled ? expenses : activeExpenses;

    const enrichedExpenses = useMemo(() => {
        return visibleExpenses.map(e => {
            const isMe = e.paidBy === user?.id || e.paidBy === 'me';

            const isToMe = e.paidToName === 'You' || e.paidToName === user?.id;

            return {
                ...e,
                paidByName: isMe ? 'You' : friend.name,
                displayTitle: e.type === 'payment'
                    ? (isMe ? `You paid ${friend.name}` : `${friend.name} paid You`)
                    : e.desc,
                isSettlement: e.type === 'payment'
            };
        });
    }, [visibleExpenses, friend.name, user?.id]);

    const handleSettle = async (amount, shouldLog) => {
        setShowSettle(false);
        try {
            await settleFriend(friend.id, amount, friend.name, shouldLog);
            await syncFriendDetail(friend.id);
        } catch (e) {
            toast.error(e.message || "Settlement failed");
        }
    };

    const handleDelete = async (item) => {
        try {
            if (item.type === 'payment' || item.isSettlement) {
                await deleteSocialPayment(item.id);
            } else {
                await deleteSocialExpense(item.id);
            }
            await syncFriendDetail(friend.id);
        } catch (e) {
            toast.error(e.message || "Delete failed");
        }
    };

    return (
        <>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: 'transparent'
            }}>
                <div onClick={onBack} style={{ padding: 8, cursor: 'pointer' }}><ChevronLeft size={25} /></div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                        {friend.name}
                    </div>
                </div>
                <div style={{ width: 38 }} />
            </div>

            <div style={{ padding: '0 16px', paddingBottom: 110 }}>
                <motion.div
                    {...fadeUp}
                    style={{
                        background: '#ffffff', borderRadius: 32, padding: '24px',
                        marginTop: 10, marginBottom: 20, position: 'relative',
                        overflow: 'hidden', border: '1px solid #e5e7eb',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.04)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <Avatar initials={friend.initials} size={56} />
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: 10, fontWeight: 800, color: 'var(--text-3)',
                                textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4
                            }}>
                                {loading ? 'Syncing...' : (Math.abs(currentBalance) < 0.01 ? 'Status' : currentBalance > 0 ? 'Owes you' : 'You owe')}
                            </div>
                            <div style={{
                                fontSize: 32, fontWeight: 800,
                                color: Math.abs(currentBalance) < 0.01 ? '#202020' : currentBalance > 0 ? '#c9f158' : '#ef4444',
                                fontFamily: "'Montserrat', sans-serif", letterSpacing: '-1px'
                            }}>
                                {Math.abs(currentBalance) < 0.01 ? 'Settled.' : `₹${fmt(Math.abs(currentBalance))}`}
                            </div>
                        </div>

                        {Math.abs(currentBalance) > 0.01 && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowSettle(true)}
                                style={{
                                    background: '#202020', color: '#ffffff', border: 'none',
                                    borderRadius: 12, padding: '8px 12px', fontSize: 12,
                                    fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                                }}
                            >
                                Settle
                            </motion.button>
                        )}
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowAddExp(true)}
                        style={{
                            width: '100%', height: 52, background: '#202020', color: '#ffffff',
                            borderRadius: 26, border: 'none', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 10, cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Plus size={18} strokeWidth={3} color="#c9f158" />
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Montserrat', sans-serif" }}>
                            Add Expense
                        </span>
                    </motion.button>
                </motion.div>

                <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'end', marginBottom: 16, padding: '0 4px' }}>
                    {settledExpenses.length > 0 && (
                        <div onClick={() => setShowSettled(p => !p)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo)', cursor: 'pointer', background: 'var(--indigo-light)', border: '1px solid #f2f3f5', borderRadius: 10, padding: '6px 8px' }}>
                            {showSettled ? 'Hide settled' : `Show all (${expenses.length})`}
                        </div>
                    )}
                </div>

                {loading ? (
                    <ListSkeleton />
                ) : (
                    <ExpenseList
                        expenses={enrichedExpenses}
                        onDelete={(id) => {
                            const item = enrichedExpenses.find(e => e.id === id);
                            handleDelete(item);
                        }}
                        onEdit={setEditingExp}
                        emptyTip="No active debts. Tap above to add an expense."
                    />
                )}

                <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                        await onRemoveFriend(friend.id);
                        onBack();
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        marginTop: 32, padding: '16px', background: '#a9282804',
                        borderRadius: 18, cursor: 'pointer', border: '1px solid #e5e7eb'
                    }}
                >
                    <UserMinus size={16} color="#ef4444" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', fontFamily: "'Montserrat', sans-serif" }}>
                        Remove Friend
                    </span>
                </motion.div>
            </div>

            <SettleSheet isOpen={showSettle} onClose={() => setShowSettle(false)} name={friend.name} totalOwed={currentBalance} onConfirm={handleSettle} />
            <ExpenseSheet
                isOpen={showAddExp}
                onClose={() => setShowAddExp(false)}
                mode="friend"
                allFriends={allFriends}
                preFriends={[friend]}
                onSaved={() => syncFriendDetail(friend.id)}
            />
            {editingExp && (
                <ExpenseSheet
                    isOpen={!!editingExp}
                    onClose={() => setEditingExp(null)}
                    mode="friend"
                    allFriends={allFriends}
                    preFriends={[friend]}
                    editingExpense={editingExp}
                    onSaved={() => syncFriendDetail(friend.id)}
                />
            )}
        </>
    );
}

// ── Group detail ──────────────────────────────────────────────────────────────
function GroupDetail({ group: initialGroup, allFriends = [], onBack, onRefresh }) {
    const { user, deleteSocialExpense, deleteSocialPayment, settleGroup, activeGroupContext, syncGroupDetail, deleteGroup, updateGroupSettings, addGroupMember, removeGroupMember } = useApp();
    const [showAddExp, setShowAddExp] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [editingExp, setEditingExp] = useState(null);
    const [settlingMember, setSettlingMember] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await syncGroupDetail(initialGroup.id);
            setLoading(false);
        };
        load();
    }, [initialGroup.id]);

    const { metadata, expenses, balances } = activeGroupContext;

    const currentGroup = metadata || initialGroup;
    const groupBalance = parseFloat(currentGroup.balance || 0);

    const enrichedBalances = useMemo(() => {
        return (balances || []).map(b => {
            const netValue = parseFloat(b.net || 0);
            return {
                ...b,
                net: netValue,
                absNet: Math.abs(netValue),
                isTheyOweMe: netValue > 0.01,
                isIOweThem: netValue < -0.01
            };
        }).filter(b => Math.abs(b.net) > 0.01);
    }, [balances]);

    const enrichedExpenses = useMemo(() => {
        return expenses.map(e => {
            const isSettlement = e.type === 'payment' || e.type === 'settlement';

            const isMe = e.paidBy === user?.id || e.paidBy === 'me';
            const payerInGroup = currentGroup.members?.find(m => m.id === e.paidBy);
            const resolvedPayerName = isMe ? 'You' : (payerInGroup?.name || e.paidByName || 'Member');

            const receiverInGroup = currentGroup.members?.find(m => m.id === e.paidTo);
            const resolvedReceiverName = e.paidTo === user?.id ? 'You' : (receiverInGroup?.name || e.paidToName || 'Member');

            return {
                ...e,
                paidByName: resolvedPayerName,
                paidToName: resolvedReceiverName,
                isSettlement,
                amount: parseFloat(e.amount || 0),
                isPaid: e.isPaid
            };
        });
    }, [expenses, currentGroup.members, user?.id]);

    return (
        <>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: 'transparent'
            }}>
                <div onClick={onBack} style={{ padding: 8, cursor: 'pointer' }}><ChevronLeft size={25} /></div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Montserrat', sans-serif" }}>
                        {currentGroup.icon} {currentGroup.name}
                    </div>
                </div>
                <div
                    onClick={() => setShowSettings(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        cursor: 'pointer',
                        border: '1px solid #e5e7eb',
                        borderRadius: 14,
                        width: 52,
                        height: 52
                    }}
                >
                    <Settings size={24} strokeWidth={2} />
                </div>
            </div>

            <div style={{ padding: '0 16px', paddingBottom: 110 }}>
                <motion.div
                    {...fadeUp}
                    style={{
                        background: '#ffffff', borderRadius: 32, padding: '24px',
                        marginTop: 10, marginBottom: 20, position: 'relative',
                        overflow: 'hidden', border: '1px solid #e5e7eb',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.04)'
                    }}
                >
                    <div style={{ position: 'relative', zIndex: 1, marginBottom: 20 }}>
                        <div style={{
                            fontSize: 12, fontWeight: 800, color: 'var(--text-3)',
                            textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 6
                        }}>
                            {loading ? 'Syncing...' : 'Your standing'}
                        </div>
                        <div style={{
                            fontSize: 34, fontWeight: 800,
                            color: groupBalance === 0 ? '#202020' : groupBalance > 0 ? '#c9f158' : '#ef4444',
                            fontFamily: "'Montserrat', sans-serif", letterSpacing: '-1px'
                        }}>
                            {groupBalance === 0 ? 'Settled.' : (groupBalance > 0 ? `+₹${fmt(groupBalance)}` : `-₹${fmt(Math.abs(groupBalance))}`)}
                        </div>
                    </div>

                    {enrichedBalances.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                            {enrichedBalances.map(b => (
                                <div key={b.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    background: '#f2f3f527', borderRadius: 20, padding: '14px 16px',
                                    border: '1px solid #f0f0f0'
                                }}>
                                    <Avatar initials={b.initials} size={42} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#202020' }}>{b.name}</div>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: b.isTheyOweMe ? '#c9f158' : '#EF4444' }}>
                                            {b.isTheyOweMe ? `owes you ₹${fmt(b.absNet)}` : `you owe ₹${fmt(b.absNet)}`}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSettlingMember(b)}
                                        style={{
                                            background: '#202020', color: '#fff', border: 'none',
                                            borderRadius: 10, padding: '6px 12px', fontSize: 11,
                                            fontWeight: 800, cursor: 'pointer'
                                        }}
                                    >
                                        Settle
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowAddExp(true)}
                        style={{
                            width: '100%', height: 52, background: '#202020', color: '#ffffff',
                            borderRadius: 28, border: 'none', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 10, cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Plus size={18} strokeWidth={3} color="#c9f158" />
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Montserrat', sans-serif" }}>
                            Add Group Expense
                        </span>
                    </motion.button>
                </motion.div>

                {loading ? (
                    <ListSkeleton />
                ) : (
                    <ExpenseList
                        expenses={enrichedExpenses}
                        onDelete={async (id) => {
                            const item = enrichedExpenses.find(e => e.id === id);
                            try {
                                if (item.isSettlement || item.type === 'payment') {
                                    await deleteSocialPayment(id);
                                } else {
                                    await deleteSocialExpense(id);
                                }
                                await syncGroupDetail(currentGroup.id);
                            } catch (e) { toast.error("Delete failed"); }
                        }}
                        onEdit={setEditingExp}
                        emptyTip="No group activity yet."
                    />
                )}
            </div>

            <GroupSettingsSheet
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                group={currentGroup}
                allFriends={allFriends}
                onSave={updateGroupSettings}
                onRemoveMember={removeGroupMember}
                onAddMember={addGroupMember}
                onDeleteGroup={async (id) => { await deleteGroup(id); onBack(); }}
            />

            {settlingMember && (
                <SettleSheet
                    isOpen={!!settlingMember}
                    onClose={() => setSettlingMember(null)}
                    name={settlingMember.name}
                    totalOwed={settlingMember.net}
                    onConfirm={async (amount, shouldLog) => {
                        setSettlingMember(null);
                        try {
                            await settleGroup(currentGroup.id, settlingMember.id, amount, settlingMember.name, settlingMember.net<0,shouldLog);
                            await syncGroupDetail(currentGroup.id);
                        } catch (e) { toast.error('Settlement failed'); }
                    }}
                />
            )}

            <ExpenseSheet
                isOpen={showAddExp}
                onClose={() => setShowAddExp(false)}
                mode="group"
                preGroup={currentGroup.id}
                groupMembers={currentGroup.members}
                onSaved={() => syncGroupDetail(currentGroup.id)}
            />

            {editingExp && (
                <ExpenseSheet
                    isOpen={!!editingExp}
                    onClose={() => setEditingExp(null)}
                    mode="group"
                    preGroup={currentGroup.id}
                    groupMembers={currentGroup.members}
                    editingExpense={editingExp}
                    onSaved={() => syncGroupDetail(currentGroup.id)}
                />
            )}
        </>
    );
}

export default function Friends() {
    const { friends, groups, refreshSocial, removeFriend } = useApp();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!friends.length && !groups.length) refreshSocial();
    }, [refreshSocial]);

    const onRefresh = refreshSocial;
    const [tab, setTab] = useState('friends');
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [activeFriend, setActiveFriend] = useState(null);
    const [activeGroup, setActiveGroup] = useState(null);
    const [showAllSettled, setShowAllSettled] = useState(true);
    const [isFocused, setIsFocused] = useState(false);

    const visibleFriends = useMemo(() => {
        let list = friends || [];
        return list.filter(f => {
            const bal = parseFloat(f.balance || 0);
            const isSearchMatch = searchQuery
                ? f.name.toLowerCase().includes(searchQuery.toLowerCase())
                : true;

            if (!isSearchMatch) return false;

            if (filter === 'owes_me') return bal > 0.01;
            if (filter === 'i_owe') return bal < -0.01;
            if (filter === 'settled') return Math.abs(bal) <= 0.01;
            return Math.abs(bal) > 0.01;
        });
    }, [friends, filter, searchQuery]);

    const visibleGroups = useMemo(() => {
        return (groups || []).filter(g =>
            g.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [groups, searchQuery]);

    const settledFriends = friends.filter(f => f.balance === 0);
    const totalOwed = friends.filter(f => f.balance > 0).reduce((s, f) => s + f.balance, 0);
    const totalOwe = friends.filter(f => f.balance < 0).reduce((s, f) => s + Math.abs(f.balance), 0);

    if (activeFriend) return <FriendDetail friend={activeFriend} allFriends={friends} onBack={() => setActiveFriend(null)} onRemoveFriend={removeFriend} onRefresh={onRefresh} />;
    if (activeGroup) return <GroupDetail group={activeGroup} allFriends={friends} onBack={() => setActiveGroup(null)} onRefresh={onRefresh} />;

    return (
        <>
            {/* Top bar */}
            <div className="top-bar">
                <div className="icon-btn" onClick={() => tab === 'friends' ? setShowAddFriend(true) : setShowCreateGroup(true)}>{tab === 'friends' ? <UserPlus size={30} /> : <Users size={30} />}</div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div className="greeting" style={{ fontSize: 20 }}>Split With Friends</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>

                    <div className="icon-btn" onClick={() => setShowFilter(true)} style={{ position: 'relative' }}>
                        <SlidersHorizontal size={30} />
                        {filter !== 'all' && <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#c9f158' }} />}
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 16px', paddingBottom: 100 }}>

                <motion.div
                    {...fadeUp}
                    style={{
                        background: '#ffffff',
                        borderRadius: 28,
                        padding: '24px',
                        marginTop: 10,
                        marginBottom: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.04)'
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        right: -10,
                        top: 0,
                        opacity: 0.2,
                        color: '#c9f158',
                        pointerEvents: 'none',
                        transform: 'rotate(15deg)'
                    }}>
                        <Wallet size={100} strokeWidth={1} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                        {totalOwed === 0 && totalOwe === 0 ? (
                            <div style={{ flex: 1, textAlign: 'center', padding: '10px 0' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4 }}>
                                    Current Status
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#202020', fontFamily: "'Montserrat', sans-serif" }}>
                                    You're all settled.
                                </div>
                            </div>
                        ) : (

                            <>
                                {totalOwed > 0 && (
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9f158' }} />
                                            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(32, 32, 32, 0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                You're owed
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#c9f158', fontFamily: "'Montserrat', sans-serif", letterSpacing: '-1px' }}>
                                            ₹{fmt(totalOwed)}
                                        </div>
                                    </div>
                                )}

                                {totalOwed > 0 && totalOwe > 0 && (
                                    <div style={{ width: '1px', background: '#e5e7eb', margin: '0 16px', height: '32px' }} />
                                )}

                                {totalOwe > 0 && (
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                                            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(32, 32, 32, 0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                You owe
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444', fontFamily: "'Montserrat', sans-serif", letterSpacing: '-1px' }}>
                                            ₹{fmt(totalOwe)}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowAddExpense(true)}
                        style={{
                            width: '100%',
                            height: 55,
                            background: '#202020',
                            color: '#ffffff',
                            borderRadius: 32,
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 2,
                            boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <Plus size={18} strokeWidth={3} color="#c9f158" />
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.2px' }}>
                            Add Expense
                        </span>
                    </motion.button>
                </motion.div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    marginBottom: 24,
                    borderBottom: '1px solid #e5e7eb',
                    position: 'relative',
                    padding: '0 4px'
                }}>
                    {['friends', 'groups'].map((t) => {
                        const isActive = tab === t;
                        return (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                style={{
                                    flex: 1,
                                    position: 'relative',
                                    padding: '12px 0 14px',
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: "'Montserrat', sans-serif",
                                    color: isActive ? '#202020' : 'rgba(32, 32, 32, 0.4)',
                                    transition: 'color 0.3s ease',
                                    outline: 'none'
                                }}
                            >
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                    <span style={{
                                        marginLeft: 6,
                                        fontSize: 11,
                                        opacity: isActive ? 1 : 0.5,
                                        transition: 'opacity 0.3s ease',
                                        background: '#202020',
                                        color: '#ffffff',
                                        padding: '3px 7px',
                                        borderRadius: 16,
                                    }}>
                                        {t === 'friends' ? friends.length : groups.length}
                                    </span>
                                </div>
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabLine"
                                            transition={{
                                                type: 'spring',
                                                stiffness: 400,
                                                damping: 32
                                            }}
                                            style={{
                                                position: 'absolute',
                                                bottom: '-1px',
                                                left: '18%',
                                                right: '18%',
                                                height: '5px',
                                                background: '#202020',
                                                borderRadius: '6px 6px 0 0',
                                                boxShadow: '0 2px 8px rgba(32, 32, 32, 0.2)'
                                            }}
                                        />
                                    )}
                                </AnimatePresence>
                            </button>
                        );
                    })}
                </div>

                {/* Search bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: '#ffffff',
                    borderRadius: 99,
                    padding: '10px 16px',
                    height: '55px',
                    margin: '10px 6px 15px',
                    border: `1px solid ${isFocused ? '#202020' : '#e5e7eb'}`,
                    transition: 'all 0.2s ease',
                    boxShadow: isFocused ? '0 4px 12px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}>
                    <Search
                        size={22}
                        color={isFocused ? "#202020" : "var(--text-3)"}
                        style={{ transition: 'color 0.2s' }}
                    />

                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={tab === 'friends' ? "Search friends?" : "Search groups?"}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: '14px',
                            fontWeight: 500,
                            fontFamily: "'Montserrat', sans-serif",
                            color: '#202020'
                        }}
                    />

                    {searchQuery && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => setSearchQuery('')}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <X size={14} color="var(--text-3)" />
                        </motion.div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {tab === 'friends' && (
                        <motion.div key="friends" {...fadeIn}>
                            {visibleFriends.length === 0 && !searchQuery ? (
                                <ProTip text="Your circle is quiet. Invite a friend to split that dinner? Add friends to get started." />
                            ) : visibleFriends.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-3)', fontSize: 13, fontWeight: 500 }}>No friends match your search.</div>
                            ) : (
                                <motion.div variants={stagger} initial="initial" animate="animate"
                                    style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 28, overflow: 'hidden', marginBottom: 12 }}>
                                    {visibleFriends.map((f, idx) => (
                                        <motion.div key={f.id} variants={slideUp} onClick={() => setActiveFriend(f)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px', borderBottom: idx < visibleFriends.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: 'transparent' }}>
                                            <Avatar initials={f.initials} size={45} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#202020' }}>{f.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                                                    {f.balance > 0 ? 'owes you' : f.balance < 0 ? 'you owe' : 'settled'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <BalanceTag amount={f.balance} />
                                                <ChevronRight size={22} color="var(--text-3)" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            {settledFriends.length > 0 && filter === 'all' && (
                                <>
                                    <motion.div whileTap={{ scale: 0.97 }} onClick={() => setShowAllSettled(p => !p)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', cursor: 'pointer', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                                            {showAllSettled ? 'Hide settled friends' : `Show ${settledFriends.length} settled friend${settledFriends.length > 1 ? 's' : ''}`}
                                        </span>
                                        <ChevronRight size={22} color="var(--text-2)" style={{ transform: showAllSettled ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </motion.div>
                                    <AnimatePresence>
                                        {showAllSettled && (
                                            <motion.div {...fadeUp} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 28, overflow: 'hidden', opacity: 0.55 }}>
                                                {settledFriends.map((f, idx) => (
                                                    <div key={f.id} onClick={() => setActiveFriend(f)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px', borderBottom: idx < settledFriends.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                                                        <Avatar initials={f.initials} size={45} />
                                                        <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-3)' }}>{f.name}</div>
                                                        <BalanceTag amount={0} />
                                                    </div>
                                                ))}

                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* Groups list */}
                    {tab === 'groups' && (
                        <motion.div key="groups" {...fadeIn}>
                            {visibleGroups.length === 0 ? (
                                <ProTip text="No groups yet. Create one for your next trip or flat expenses." />
                            ) : (
                                <motion.div
                                    variants={stagger}
                                    initial="initial"
                                    animate="animate"
                                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }} // Slightly more gap
                                >
                                    {visibleGroups.map(g => {
                                        const groupBalance = parseFloat(g.balance || 0);
                                        const isSettled = Math.abs(groupBalance) <= 0.01;

                                        return (
                                            <motion.div
                                                key={g.id}
                                                variants={slideUp}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setActiveGroup(g)}
                                                style={{
                                                    background: '#ffffff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: 24,
                                                    padding: '20px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                                    <div style={{
                                                        width: 52,
                                                        height: 52,
                                                        borderRadius: 14,
                                                        background: '#f8f9fa',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 22,
                                                        flexShrink: 0,
                                                        border: '1px solid #f0f0f0'
                                                    }}>
                                                        {g.icon}
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: 17,
                                                            fontWeight: 700,
                                                            color: '#202020',
                                                            fontFamily: "'Montserrat', sans-serif"
                                                        }}>
                                                            {g.name}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginTop: 1 }}>
                                                            {g.members.length} members
                                                        </div>
                                                    </div>
                                                    <BalanceTag amount={groupBalance} />
                                                </div>

                                                <div style={{
                                                    height: '1px',
                                                    background: '#f0f0f0',
                                                    margin: '0 -4px 16px',
                                                    opacity: 0.8
                                                }} />
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{
                                                            fontSize: 10,
                                                            fontWeight: 800,
                                                            color: 'rgba(32, 32, 32, 0.4)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '1px'
                                                        }}>
                                                            Total spent
                                                        </div>
                                                        <div style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            color: '#ffffff',
                                                            fontFamily: "'Montserrat', sans-serif",
                                                            letterSpacing: '-0.3px',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            background: '#c8f158c2',
                                                        }}>
                                                            ₹{(g.totalSpent || 0).toLocaleString('en-IN')}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <ChevronRight size={22} color="#e0e0e0" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ExpenseSheet isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} mode={tab === 'groups' ? 'group' : 'friend'} allFriends={friends} allGroups={groups} onSaved={onRefresh} />
            <AddFriendSheet isOpen={showAddFriend} onClose={() => setShowAddFriend(false)} onAdded={onRefresh} />
            <CreateGroupSheet isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} allFriends={friends} onGroupCreated={onRefresh} />
            <FilterSheet isOpen={showFilter} onClose={() => setShowFilter(false)} filter={filter} setFilter={setFilter} />
        </>
    );
}