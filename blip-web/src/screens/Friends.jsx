import GroupIcon, { GroupCategoryPicker } from '../components/GroupIcon';
import { groupCategory } from '../utils/groupCategory';
import { groupExpenseHistory, hasAppliedPayments } from '../utils/expenseOrder';
import SettleSheet from '../components/SettleSheet';
import DateField from '../components/DateField';
import PageHeader from '../components/PageHeader';
import { Equal, Scale, Hash, ArrowRight, ChartNoAxesCombined, ChevronDown as ChevronDownIcon } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { phoneNumber } from '../utils/phone';
import { splitAmount, splitExactAmount, localDate } from '../utils/splits';
import GroupTotals from '../components/GroupTotals';
import '../social.css';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../store/AppContext';
import toast from 'react-hot-toast';
import BottomSheet from '../components/BottomSheet';
import SwipeableItem from '../components/SwipeableItem';
import {
    UserPlus, Plus, ChevronRight, Search, Check,
    ArrowUpRight, ArrowDownLeft, ChevronLeft,
    WalletMinimal as Wallet, Receipt, X, Settings, UserMinus,
    SlidersHorizontal, CheckCircle2, Calendar, Lightbulb,
    TrendingDown, TrendingUp, Loader2, Users, AlertCircle, Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 }, transition: { duration: 0.22 } };
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const slideUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } };


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
    const isSettled = Math.abs(bal) < 0.01;
    const isOwed = bal >= 0.01;

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
            <div style={{ color: isOwed ? '#527418' : '#EF4444', display: 'flex' }}>
                {isOwed ? <ArrowDownLeft size={13} strokeWidth={2.5} /> : <ArrowUpRight size={13} strokeWidth={2.5} />}
            </div>

            <span style={{
                fontSize: 13,
                fontWeight: 800,
                color: isOwed ? '#527418' : '#EF4444',
                fontFamily: "'Montserrat', sans-serif",
                letterSpacing: '-0.3px'
            }}>
                Rs. {fmt(Math.abs(bal))}
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

function useExpenseForm(initialExpense, userId) {
    const [description, setDescription] = useState(initialExpense?.desc || '');
    const [amount, setAmount] = useState(initialExpense ? String(initialExpense.amount) : '');
    const [date, setDate] = useState(localDate(initialExpense?.date));
    const [splitType, setSplitType] = useState(initialExpense ? 'unequal' : 'equal');
    const [shares, setShares] = useState({});
    const [unequal, setUnequal] = useState(Object.fromEntries((initialExpense?.splits || []).map(s => [s.userId, s.amount])));
    const [paidBy, setPaidBy] = useState(initialExpense?.paidBy || userId);
    const total = Number(amount) || 0;
    const desc = description.trim();
    const reset = () => { setDescription(initialExpense?.desc || ''); setAmount(initialExpense ? String(initialExpense.amount) : ''); setDate(localDate(initialExpense?.date)); setSplitType(initialExpense ? 'unequal' : 'equal'); setShares({}); setUnequal(Object.fromEntries((initialExpense?.splits || []).map(s => [s.userId, s.amount]))); setPaidBy(initialExpense?.paidBy || userId); };
    return { description, setDescription, amount, setAmount, date, setDate, splitType, setSplitType, shares, setShares, unequal, setUnequal, paidBy, setPaidBy, total, desc, reset };
}

function ExpenseSheet({ isOpen, onClose, mode, allFriends = [], allGroups = [], preFriends = [], preGroup = null, editingExpense = null, groupMembers = null, onSaved }) {
    const { user, groups = [], editSocialExpense, addGroupExpense, addFriendExpense } = useApp();
    const availableGroups = allGroups.length ? allGroups : groups;
    const [submitting, setSubmitting] = useState(false);
    const [saveError, setSaveError] = useState('');
    const locked = hasAppliedPayments(editingExpense);
    const isEditing = !!editingExpense;
    const initialPeople = editingExpense?.splits
        ? editingExpense.splits.filter(s => s.userId !== user.id).map(s => ({ id: s.userId, name: s.name || 'Friend', initials: (s.name || 'F').slice(0, 2).toUpperCase() }))
        : preFriends;
    const form = useExpenseForm(editingExpense, user.id);
    const defaultGroup = preGroup || (availableGroups.length === 1 ? availableGroups[0].id : '');
    const [selectedGrp, setSelectedGrp] = useState(defaultGroup);
    // null selects the whole group, including members loaded after the sheet opens.
    const [included, setIncluded] = useState(null);
    const [panel, setPanel] = useState(null);
    const [query, setQuery] = useState('');
    const [friendQuery, setFriendQuery] = useState('');
    const [multiplePayers, setMultiplePayers] = useState(false);
    const [payerIds, setPayerIds] = useState([]);
    const [payerAmounts, setPayerAmounts] = useState({});
    const [detailsShown, setDetailsShown] = useState(mode === 'group' || isEditing || preFriends.length > 0);
    useEffect(() => {
        if (!isOpen) return;
        setSaveError(''); form.reset(); setSelectedGrp(defaultGroup); setPanel(mode === 'group' && !defaultGroup ? 'group' : null); setQuery(''); setFriendQuery(''); setDetailsShown(mode === 'group' || isEditing || preFriends.length > 0);
        setMultiplePayers(Boolean(editingExpense?.payers?.length)); setPayerIds(editingExpense?.payers?.map(p => p.userId) || []); setPayerAmounts(Object.fromEntries((editingExpense?.payers || []).map(p => [p.userId, p.amount])));
        setIncluded(editingExpense ? editingExpense.splits.map(s => s.userId) : mode === 'group' ? null : [user.id, ...preFriends.map(p => p.id)]);
    }, [isOpen, editingExpense?.id, preGroup]);

    const me = { id: user.id, name: 'You', initials: 'YO' };
    const grpMembers = (selectedGrp === preGroup && groupMembers) || availableGroups.find(g => g.id === selectedGrp)?.members || [];
    const editingPeople = [...initialPeople];
    if (isEditing && editingExpense.paidBy !== user.id && !editingPeople.some(p => p.id === editingExpense.paidBy)) editingPeople.push(allFriends.find(p => p.id === editingExpense.paidBy) || { id: editingExpense.paidBy, name: editingExpense.paidByName || 'Friend', initials: 'FR' });
    const candidates = mode === 'group' ? grpMembers : [me, ...(isEditing ? editingPeople : allFriends)];
    const people = candidates.filter(p => included === null || included.includes(p.id));
    const selectedFriends = people.filter(person => person.id !== user.id);
    const friendMatches = candidates.filter(person => person.id !== user.id && !selectedFriends.some(selected => selected.id === person.id) && person.name.toLowerCase().includes(friendQuery.trim().toLowerCase()));
    const showFriendMatches = !detailsShown || Boolean(friendQuery.trim()) || !selectedFriends.length;
    const activeGroup = availableGroups.find(group => group.id === selectedGrp);
    const addPerson = id => {
        setIncluded(previous => [...new Set([...(previous || [user.id]), id])]);
        setDetailsShown(true);
        setFriendQuery('');
    };
    // Paying and participating are independent: someone can cover a bill without sharing it.
    const payers = candidates;
    const payingPeople = payers.filter(p => payerIds.includes(p.id));
    const contributions = splitExactAmount(form.total, payingPeople, payerAmounts);
    const payerError = multiplePayers ? contributions.error : '';
    const exact = splitExactAmount(form.total, people, form.unequal);
    const splits = form.splitType === 'unequal' ? exact.splits : splitAmount(form.total, people, form.splitType === 'shares' ? form.shares : {});
    const splitError = !people.length ? 'Choose at least one person.' : form.splitType === 'unequal' ? exact.error : !splits.length ? (form.splitType === 'shares' ? 'Use zero or more shares, with at least one person above zero.' : 'Enter a valid bill amount.') : '';
    const canSubmit = !locked && Number.isSafeInteger(Math.round(form.total * 100)) && form.total > 0 && Math.abs(form.total * 100 - Math.round(form.total * 100)) < 0.000001 &&
        form.desc && form.date && Number.isFinite(Date.parse(form.date)) && !splitError && !payerError && (multiplePayers ? contributions.splits.some(p => p.amount > 0) : payers.some(p => p.id === form.paidBy)) &&
        (mode === 'group' ? !!selectedGrp : (people.some(p => p.id !== user.id) || (multiplePayers ? contributions.splits.some(p => p.userId !== user.id && p.amount > 0) : form.paidBy !== user.id)));
    const name = p => p.id === user.id ? 'You' : p.name;
    const sharedLabel = !people.length ? 'Choose people' : mode === 'group' && people.length === candidates.length ? 'Everyone' : people.length <= 2 ? people.map(name).join(' & ') : `${people.length} people`;
    const togglePerson = id => setIncluded(previous => {
        const current = previous ?? candidates.map(p => p.id);
        return current.includes(id) ? current.filter(value => value !== id) : [...current, id];
    });
    const handleClose = () => { if (!submitting) onClose(); };
    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;
        setSubmitting(true); setSaveError('');
        try {
            // Keep the creator's friend bill accessible even when only the friend owes money.
            const savedSplits = [...splits];
            if (mode === 'friend') {
                for (const id of [user.id, ...(multiplePayers ? payingPeople.map(p => p.id) : [form.paidBy])]) {
                    if (!savedSplits.some(s => s.userId === id)) savedSplits.push({ userId: id, amount: 0 });
                }
            }
            const payload = { description: form.desc, amount: form.total, paidBy: form.paidBy, ...(multiplePayers ? { payers: contributions.splits.filter(p => p.amount > 0) } : {}), date: new Date(`${form.date}T12:00:00`).toISOString(), splits: savedSplits };
            if (isEditing) await editSocialExpense(editingExpense.id, payload);
            else if (mode === 'group') await addGroupExpense(selectedGrp, payload);
            else await addFriendExpense(savedSplits.find(s => s.userId !== user.id).userId, payload);
            if (onSaved) await onSaved();
            onClose();
        } catch (err) { setSaveError(err.message || 'Could not save this bill. Try again.'); }
        finally { setSubmitting(false); }
    };
    if (isOpen && locked) return <BottomSheet isOpen={isOpen} onClose={onClose} title="This bill has payments"><div className="locked-bill"><Receipt size={28}/><h3>{editingExpense.desc}</h3><p>A payment has already been applied to this bill. Undo the related payment records before changing it, then record the payments again.</p><button className="button-primary" onClick={onClose}>Back to bills</button></div></BottomSheet>;
    return <>
        <BottomSheet mobilePage mobileAction={detailsShown ? { onClick: handleSubmit, disabled: !canSubmit || submitting, label: submitting ? 'Saving expense' : 'Save expense' } : null} isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Edit expense' : 'Add expense'}>
            <div className="quick-expense-form">
                {mode === 'group' ? <div className="expense-form-meta">
                    {preGroup || isEditing ? <div className="expense-group-context"><GroupIcon icon={activeGroup?.icon} type={activeGroup?.type}/><strong>{activeGroup?.name || 'Group expense'}</strong></div> : <button type="button" className="expense-group-trigger" disabled={submitting} onClick={() => { setQuery(''); setPanel('group'); }}><GroupIcon icon={activeGroup?.icon} type={activeGroup?.type}/><span>{activeGroup?.name || 'Choose a group'}</span><ChevronDownIcon size={18}/></button>}
                </div> : <section className="expense-people-entry" aria-label="Expense participants">
                    {detailsShown ? <div className="expense-with-people"><span>With you and</span><div className="expense-selected-chips">{selectedFriends.map(person => <button type="button" key={person.id} aria-label={`Remove ${person.name}`} onClick={() => togglePerson(person.id)}>{person.name}<X size={15}/></button>)}</div></div> : <h3>Who’s it with?</h3>}
                    <div className="search-field"><Search size={18}/><input aria-label="Find friends for expense" placeholder={detailsShown ? 'Add more people…' : 'Search friends'} value={friendQuery} onChange={e => setFriendQuery(e.target.value)}/>{friendQuery && <button type="button" className="clear-search" aria-label="Clear friend search" onClick={() => setFriendQuery('')}><X size={16}/></button>}</div>
                    {showFriendMatches && <div className="expense-friend-results">{friendMatches.map(person => <button type="button" key={person.id} aria-label={`Add ${person.name} to expense`} onClick={() => addPerson(person.id)}><Avatar initials={person.initials} size={34}/><span>{person.name}</span><Plus size={18}/></button>)}</div>}
                    {showFriendMatches && !friendMatches.length && <p className="field-help">{candidates.length <= 1 ? 'Add a friend from Friends to start sharing a bill.' : friendQuery ? 'No other friends match that name.' : 'Everyone available is already included.'}</p>}
                </section>}
                {detailsShown && <>
                <div className="expense-entry">
                    <label className="field-label" htmlFor="shared-description">What was it for?</label>
                    <input id="shared-description" className="expense-name" autoFocus maxLength={200} value={form.description} onChange={e => form.setDescription(e.target.value)} placeholder="Dinner, hotel, groceries…"/>
                    <label className="field-label" htmlFor="shared-amount">Amount</label>
                    <div className="expense-amount"><span>Rs. </span><input id="shared-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={e => form.setAmount(e.target.value)} placeholder="0.00"/></div>
                </div>
                <div className="expense-summary-rows">
                    <button type="button" className="expense-summary-row" onClick={() => setPanel('payer')}><Wallet size={18}/><span>Paid by <strong>{multiplePayers ? `${contributions.splits.filter(p => p.amount > 0).length || payingPeople.length} people` : name(payers.find(p => p.id === form.paidBy) || me)}</strong></span><ChevronRight size={17}/></button>
                    <button type="button" className="expense-summary-row" onClick={() => { setQuery(''); setPanel('split'); }}><Users size={18}/><span>Shared by <strong>{sharedLabel}</strong><small>{form.splitType === 'equal' ? 'Equally' : form.splitType === 'shares' ? 'By shares' : 'Exact amounts'} · Tap to change</small></span><ChevronRight size={17}/></button>
                </div>
                {people.length > 0 && splits.length > 0 && <p className="expense-share-preview">{splits.some(s => s.userId === user.id) ? `Your share: Rs. ${(splits.find(s => s.userId === user.id)?.amount || 0).toFixed(2)}` : 'You’re not sharing this bill'}<span>{people.length} {people.length === 1 ? 'person' : 'people'} included</span></p>}
                {form.total > 0 && splitError && <p className="form-error" role="status">{splitError}</p>}

                {form.total > 0 && payerError && <p className="form-error" role="status">Payments: {payerError}</p>}
                {saveError && <p className="form-error" role="alert">{saveError}</p>}
                <div className="expense-submit-row"><DateField compact value={form.date} onChange={form.setDate}/><button className="button-primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>{submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add expense'}</button></div>
                </>}
            </div>
        </BottomSheet>
        <BottomSheet mobilePage isOpen={isOpen && panel === 'group'} onClose={() => setPanel(null)} title="Choose a group">
            <div className="search-field"><Search size={18}/><input aria-label="Search expense groups" placeholder="Search groups" value={query} onChange={e => setQuery(e.target.value)}/></div>
            <div className="expense-group-options">{availableGroups.filter(group => group.name.toLowerCase().includes(query.trim().toLowerCase())).map(group => <button type="button" key={group.id} aria-pressed={selectedGrp === group.id} onClick={() => { setSelectedGrp(group.id); setIncluded(null); form.setUnequal({}); form.setShares({}); form.setPaidBy(user.id); setMultiplePayers(false); setPayerIds([]); setPayerAmounts({}); setPanel(null); }}><span className="group-icon-surface"><GroupIcon icon={group.icon} type={group.type}/></span><span>{group.name}<small>{group.members?.length || 0} members</small></span>{selectedGrp === group.id && <Check size={18}/>}</button>)}</div>
            {!availableGroups.some(group => group.name.toLowerCase().includes(query.trim().toLowerCase())) && <p className="field-help">{availableGroups.length ? 'No groups match that name.' : 'Create a group from Friends to start sharing.'}</p>}
        </BottomSheet>
        <BottomSheet mobilePage isOpen={isOpen && panel === 'payer'} onClose={() => setPanel(null)} title="Who paid?">
            {!multiplePayers ? <>
                <div className="expense-member-list">{payers.map(p => <button type="button" className="expense-member" key={p.id} aria-pressed={form.paidBy === p.id} onClick={() => { form.setPaidBy(p.id); setPanel(null); }}><Avatar initials={p.initials} size={34}/><span>{name(p)}</span>{form.paidBy === p.id && <Check size={20}/>}</button>)}</div>
                <button type="button" className="multiple-payers-button" onClick={() => { setMultiplePayers(true); setPayerIds([...new Set([form.paidBy, ...people.map(p => p.id)])]); setPayerAmounts({}); }}><Users size={17}/>Multiple people paid</button>
            </> : <section className="payer-editor">
                <p className="field-help">Select who paid. Enter their contributions; blank fields divide the rest automatically.</p>
                {payers.map(p => { const selected = payerIds.includes(p.id); const calculated = contributions.splits.find(s => s.userId === p.id)?.amount; return <div className="expense-member" key={p.id}><label className="participant-check"><input type="checkbox" checked={selected} onChange={() => setPayerIds(ids => selected ? ids.filter(id => id !== p.id) : [...ids,p.id])}/><span>{name(p)}<small>{selected ? payerAmounts[p.id] == null || payerAmounts[p.id] === '' ? 'Auto remainder' : 'Fixed contribution' : 'Did not pay'}</small></span></label>{selected && <div className="split-number"><span>Rs.</span><input aria-label={`${name(p)} paid amount`} type="number" min="0" step=".01" inputMode="decimal" value={payerAmounts[p.id] ?? ''} placeholder={calculated?.toFixed(2) || 'Auto'} onChange={e => setPayerAmounts({...payerAmounts,[p.id]:e.target.value})}/></div>}</div>; })}
                {payerError && <p className="form-error" role="status">{payerError}</p>}
                <button type="button" className="button-primary" disabled={!!payerError} onClick={() => setPanel(null)}>Done</button>
                <button type="button" className="multiple-payers-button" onClick={() => setMultiplePayers(false)}>One person paid</button>
            </section>}
        </BottomSheet>
        <BottomSheet mobilePage isOpen={isOpen && panel === 'split'} onClose={() => setPanel(null)} title="Who’s sharing?">
            <section className="split-editor" aria-label="Split the bill">
                <div className="split-tabs">{[{id:'equal',label:'Equally',Icon:Equal},{id:'unequal',label:'Exact amounts',Icon:Scale},{id:'shares',label:'By shares',Icon:Hash}].map(({id,label,Icon}) => <button key={id} type="button" aria-pressed={form.splitType === id} onClick={() => form.setSplitType(id)}><Icon size={19}/>{label}</button>)}</div>
                <p className="split-description">{form.splitType === 'equal' ? 'Tick only the people involved in this bill.' : form.splitType === 'unequal' ? 'Enter an amount to fix it. Blank fields split the rest automatically. Clear a field to return to Auto.' : 'Two shares pays twice as much as one. Zero shares means nothing to pay.'}</p>
                <div className="search-field"><Search size={18}/><input aria-label="Search participants" placeholder="Find someone" value={query} onChange={e => setQuery(e.target.value)}/></div>
                <div className="participant-shortcuts"><span>{people.length} selected</span><button type="button" onClick={() => setIncluded(candidates.map(p => p.id))}>Select all</button><button type="button" onClick={() => setIncluded([])}>Clear</button>{form.splitType === 'unequal' && <button type="button" onClick={() => form.setUnequal({})}>Reset amounts</button>}</div>
                {candidates.filter(p => name(p).toLowerCase().includes(query.toLowerCase())).map(p => {
                    const selected = people.some(person => person.id === p.id);
                    const calculated = splits.find(s => s.userId === p.id)?.amount;
                    const automatic = form.unequal[p.id] == null || form.unequal[p.id] === '';
                    return <div className={`split-row participant-split-row${selected ? '' : ' excluded'}`} key={p.id}>
                        <label className="participant-check"><input type="checkbox" checked={selected} onChange={() => togglePerson(p.id)}/><span>{name(p)}<small>{!selected ? 'Not involved' : form.splitType === 'unequal' ? automatic ? `Auto · ${calculated == null ? '—' : `Rs. ${calculated.toFixed(2)}`}` : 'Fixed amount' : form.splitType === 'shares' ? `Rs. ${(calculated || 0).toFixed(2)}` : p.id === form.paidBy ? 'Paid the bill' : 'Share of the bill'}</small></span></label>
                        {selected && (form.splitType === 'equal' ? <strong>Rs. {(calculated || 0).toFixed(2)}</strong> : <div className="split-number"><span>{form.splitType === 'shares' ? '×' : 'Rs.'}</span><input type="number" inputMode="decimal" min="0" step={form.splitType === 'shares' ? 'any' : '.01'} aria-label={`${name(p)} ${form.splitType === 'shares' ? 'shares' : 'amount'}`} value={form.splitType === 'shares' ? (form.shares[p.id] ?? 1) : (form.unequal[p.id] ?? '')} placeholder={form.splitType === 'unequal' ? (calculated?.toFixed(2) ?? 'Auto') : '0'} onChange={e => form.splitType === 'shares' ? form.setShares({...form.shares,[p.id]:e.target.value}) : form.setUnequal({...form.unequal,[p.id]:e.target.value})}/></div>)}
                    </div>;
                })}
                {candidates.length > 0 && !candidates.some(p => name(p).toLowerCase().includes(query.toLowerCase())) && <p className="field-help">No matching people.</p>}
                {!candidates.length && <p className="field-help">{mode === 'group' ? 'Choose a group first.' : 'Add a friend to start sharing expenses.'}</p>}
                <div className={`split-summary${splitError ? ' invalid' : ''}`} aria-live="polite"><span>{splitError || 'Everything adds up'}</span><strong>Rs. {form.total.toFixed(2)}</strong></div>
                <button type="button" className="button-primary" onClick={() => setPanel(null)}>Done</button>
            </section>
        </BottomSheet>
    </>;
}


function ExpenseList({ expenses, onDelete, onEdit, emptyTip, user }) {
    const [actionError,setActionError]=useState('');
    const [pendingDelete,setPendingDelete]=useState(null);
    const [deleting,setDeleting]=useState(false);
    const requestDelete = item => {
        if(hasAppliedPayments(item)){setActionError('');onEdit(item);return;}
        setActionError('');setPendingDelete(item);
    };
    const groupedData = useMemo(() => groupExpenseHistory(expenses || []), [expenses]);

    if (!expenses?.length) return <ProTip text={emptyTip} />;

    return (
        <motion.div variants={stagger} initial="initial" animate="animate">
            {actionError && <p className="form-error action-error" role="alert">{actionError}</p>}
            <BottomSheet isOpen={Boolean(pendingDelete)} onClose={()=>{if(!deleting)setPendingDelete(null);}} title={pendingDelete?.type==='payment'?'Undo this payment?':'Delete this bill?'}>
                <p className="field-help">{pendingDelete?.type==='payment'?'This reverses the recorded payment and restores the balance. No money is transferred. If it covers multiple bills or groups, all its allocations are reversed.':'This removes the bill and its shares from everyone’s balances.'}</p>
                {actionError && <p role="alert" className="form-error">{actionError}</p>}
                <button className="button-primary" disabled={deleting} onClick={async()=>{setDeleting(true);try{await onDelete(pendingDelete.id);setPendingDelete(null);}catch(err){setActionError(err.message || 'Could not update this entry.');}finally{setDeleting(false);}}}>{deleting?'Saving…':pendingDelete?.type==='payment'?'Undo payment':'Delete bill'}</button>
            </BottomSheet>
            {Object.entries(groupedData).map(([monthStr, monthData]) => (
                <div key={monthStr} style={{ marginBottom: 32 }}>

                    {/* MONTH HEADER */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: '0 4px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {monthStr}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '1px', marginTop: '3px' }}>
                            BILLS LOGGED <span style={{ color: '#202020' }}>Rs. {monthData.totalSpent.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    {Object.entries(monthData.days).map(([dayStr, dayData]) => (
                        <div key={dayStr} style={{ marginBottom: 16 }}>

                            <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden' }}>

                                <div style={{ padding: '12px 16px 4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#202020' }}>{dayStr}</span>
                                    {dayData.dailyTotal > 0 && (
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>Rs. {dayData.dailyTotal.toLocaleString('en-IN')}</span>
                                    )}
                                </div>

                                {dayData.items.map((item, idx) => {
                                    const isPayment = item.type === 'payment' || item.type === 'settlement';
                                    const isMe = item.paidBy === user?.id || item.paidBy === 'me';
                                    const isSettled = !isPayment && item.isPaid;

                                    return (
                                        <motion.div key={item.id} variants={slideUp}>
                                            <SwipeableItem
                                                onSwipeLeft={() => requestDelete(item)}
                                                onSwipeRight={isPayment ? null : () => onEdit(item)}
                                                leftLabel={isPayment ? "Undo" : "Delete"}
                                                rightLabel={isPayment ? null : "Edit"}
                                            >
                                                <div style={{
                                                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '16px 16px',
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
                                                                <>{item.paidByName} paid · <span style={{ opacity: 0.7 }}>{item.groupName || 'With friends'}</span></>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{
                                                            fontSize: 17, fontWeight: 800,
                                                            color: '#202020',
                                                            fontFamily: "'Montserrat', sans-serif",
                                                            textDecoration: isSettled ? 'line-through' : 'none',
                                                            opacity: isSettled ? 0.5 : 1
                                                        }}>
                                                            Rs. {parseFloat(item.amount).toLocaleString('en-IN')}
                                                        </div>

                                                        {!isPayment && !isSettled && item.yourShare > 0 && (
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#b54535', background: '#fff1ec', padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginTop: 4 }}>
                                                                you owe Rs. {parseFloat(item.yourShare).toLocaleString('en-IN')}
                                                            </div>
                                                        )}
                                                    </div>
                                                        <div className="entry-actions">{!isPayment && <button onClick={()=>onEdit(item)}>Edit bill</button>}<button onClick={()=>requestDelete(item)}>{isPayment?'Undo payment':'Delete bill'}</button></div>
                                                        {!isPayment && <details className="entry-breakdown">
                                                            <summary>View split · {item.splits?.length || 0} people</summary>
                                                            <div className="split-total"><span>Bill total</span><strong>Rs. {fmt(item.amount)}</strong></div>
                                                            <div className="split-total"><span>Paid by</span><strong>{item.paidByName}</strong></div>{item.payers?.map(p => <div className="split-person" key={p.userId}><span>{p.userId === user.id ? 'You' : p.name} paid</span><strong>Rs. {fmt(p.amount)}</strong></div>)}
                                                            <div className="split-total"><span>Expense date</span><strong>{new Date(item.date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</strong></div>
                                                            {(item.splits || []).map(split => <div className="split-person" key={split.userId}>
                                                                <span>{split.userId === user?.id ? 'You' : split.name}<small>{!item.payers?.length && split.userId === item.paidBy ? 'Paid the bill' : split.isPaid ? 'Nothing remaining' : `Rs. ${fmt(split.remainingAmount ?? Math.max(0, split.amount - (Number(split.paidAmount) || 0)))} remaining`}</small></span>
                                                                <strong>Rs. {fmt(split.amount)}</strong>
                                                            </div>)}
                                                        </details>}
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
    const { searchByPhone, addFriend, user } = useApp();
    const [phone, setPhone] = useState('');
    const [result, setResult] = useState(null);
    const [added, setAdded] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!phoneNumber(phone) || searching) return;
        setSearching(true);
        setError('');
        setResult(null);

        try {
            const res = await searchByPhone(phoneNumber(phone));
            if (res && res.name) {
                setResult({ found: true, user: res });
            } else {
                setResult({ found: false });
            }
        } catch (e) {
            setError(e.message || 'Could not search right now. Please retry.');
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async () => {
        if (adding || added) return;
        setAdding(true); setError('');
        try {
            await addFriend(result.user.id);
            setAdded(true);
            if (onAdded) onAdded();
            setTimeout(() => {
                onClose();
                setPhone('');
                setResult(null);
                setAdded(false);
            }, 800);
        } catch (e) {
            setAdded(false);
            setError(e.message || 'Could not add your friend. Please retry.');
        } finally { setAdding(false); }
    };

    const inviteLink = 'https://get-blip.vercel.app/join';

    return <BottomSheet isOpen={isOpen} onClose={onClose} title="Add a friend">
        <div className="connection-intro"><span className="connection-icon"><UserPlus size={24}/></span><div><h3>Start with someone you know</h3><p>Find them using the number they saved on Blip.</p></div></div>
        <div className="connection-form"><label className="input-label">Their phone number</label><PhoneInput value={phone} countryPhone={user.phone} onChange={value => { setPhone(value); setResult(null); setAdded(false); setError(''); }}/><p className="field-help">Use their saved Blip number. Change the suggested country code if needed.</p>
        <button className="button-primary connection-submit" disabled={!phoneNumber(phone) || searching || adding} onClick={handleSearch}><Search size={17}/>{searching ? 'Finding your friend…' : 'Find friend'}</button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {result?.found && <div className="friend-search-result" role="status"><Avatar initials={result.user.name.substring(0,2)} size={44}/><div><strong>{result.user.name}</strong><small>Ready to split with you</small></div><button className="button-primary" disabled={adding || added} onClick={handleAdd}>{adding ? 'Adding…' : added ? 'Added' : 'Add'}{added ? <Check size={16}/> : <Plus size={16}/>}</button></div>}
        {result?.found === false && <div className="friend-not-found" role="status"><strong>No account found yet</strong><p>Check the number, or ask your friend to join Blip and add their number in Profile.</p></div>}
        <details className="friend-invite"><summary>New to Blip? Invite them <UserPlus size={16}/></summary><p className="field-help">Share this link or let them scan the code, then search for their number once they’ve joined.</p><div className="invite-code"><QRCodeSVG value={inviteLink} size={112}/><div><a href={inviteLink} target="_blank" rel="noreferrer">get-blip.vercel.app/join</a><button className="button-secondary" onClick={async()=>{try{await navigator.clipboard.writeText(inviteLink);toast.success('Invite link copied');}catch{setError('Could not copy the link. You can select and copy it above.');}}}>Copy invite link</button></div></div></details>
    </BottomSheet>;
}


function CreateGroupSheet({ isOpen, onClose, allFriends = [], onGroupCreated }) {
    const { createGroup } = useApp();
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('general');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const matches = allFriends.filter(friend => friend.name.toLowerCase().includes(search.toLowerCase()));
    const create = async () => {
        if (!name.trim() || saving) return;
        setSaving(true); setError('');
        try {
            await createGroup({ name: name.trim(), icon, type: icon, memberIds: selected });
            onGroupCreated?.();
            setName(''); setSelected([]); setSearch(''); setIcon('general');
            onClose();
        } catch (err) { setError(err.message || 'Could not create this group. Please try again.'); }
        finally { setSaving(false); }
    };
    return <BottomSheet isOpen={isOpen} onClose={onClose} title="Create a group">
        <div className="connection-intro"><span className="connection-icon"><Users size={24}/></span><div><h3>Your people. One shared tab.</h3><p>Keep a trip, a home, or a shared plan together.</p></div></div>
        <label className="input-label" htmlFor="new-group-name">Group name</label>
        <div className="search-field"><GroupIcon icon={icon}/><input id="new-group-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Goa weekend" maxLength={100}/></div>
        <details className="group-icon-disclosure"><summary aria-label="Choose group icon"><GroupIcon icon={icon}/><ChevronDownIcon size={15}/></summary><GroupCategoryPicker value={icon} onChange={setIcon}/></details>
        <div className="group-members-heading"><h3>Who’s joining?</h3><span>{selected.length + 1} {selected.length ? 'members' : 'member'} including you</span></div>
        <p className="field-help">You’re already in. Select friends below to add them.</p>
        {allFriends.length > 0 ? <><div className="search-field"><Search size={18}/><input aria-label="Search group members" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your friends"/></div><div className="group-member-options">{matches.map(friend => <button type="button" key={friend.id} aria-pressed={selected.includes(friend.id)} onClick={() => setSelected(ids => ids.includes(friend.id) ? ids.filter(id => id !== friend.id) : [...ids, friend.id])}><Avatar initials={friend.initials} size={35}/><span>{friend.name}</span>{selected.includes(friend.id) ? <Check size={19}/> : <Plus size={19}/>}</button>)}</div>{!matches.length && <p className="field-help">No friends match that name.</p>}</> : <p className="privacy-note">You can create this group now. Then use Add friend on the Friends page and invite them from your group settings.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button-primary group-create-button" disabled={!name.trim() || saving} onClick={create}>{saving ? 'Creating…' : 'Create group'}<ArrowRight size={17}/></button>
    </BottomSheet>;
}

function FriendConnection({ person }) {
    const { user, friends = [], addFriend } = useApp();
    const [busy, setBusy] = useState(false);
    const [added, setAdded] = useState(false);
    const [error, setError] = useState('');
    if (person.id === user.id) return <small className="member-connection-status">You</small>;
    if (added || friends.some(friend => friend.id === person.id)) return <small className="member-connection-status"><Check size={13}/>Friend</small>;
    return <div className="member-connect"><button type="button" aria-label={`Add ${person.name} as a friend`} disabled={busy} onClick={async () => {
        if (busy) return;
        setBusy(true); setError('');
        try { await addFriend(person.id); setAdded(true); }
        catch (err) { setError(err.message || 'Could not add friend. Try again.'); }
        finally { setBusy(false); }
    }}><UserPlus size={15}/>{busy ? 'Adding…' : 'Add friend'}</button>{error && <small role="alert">{error}</small>}</div>;
}

// ── Group settings sheet ──────────────────────────────────────────────────────
function GroupSettingsSheet({ isOpen, onClose, group, allFriends = [], onSave, onRemoveMember, onAddMember, onDeleteGroup }) {
    const { user } = useApp();
    const [name,setName] = useState('');
    const [icon,setIcon] = useState('general');
    const [search,setSearch] = useState('');
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState('');
    useEffect(()=>{ if(isOpen){setName(group?.name || '');setIcon(groupCategory(group?.icon, group?.type));setSearch('');setError('');} },[isOpen,group?.id]);
    const members = group?.members || [];
    const candidates = allFriends.filter(person=>!members.some(member=>member.id===person.id) && person.name.toLowerCase().includes(search.toLowerCase()));
    const run = async action => { if(busy)return;setBusy(true);setError('');try{await action();}catch(err){setError(err.message || 'Could not save this change.');}finally{setBusy(false);} };
    return <BottomSheet isOpen={isOpen} onClose={onClose} title="Group settings">
        <div className="settings-form">
            <div className="panel-intro"><span className="panel-icon"><Users size={22}/></span><div><h3>Your group, together</h3><p>Update the details and manage your people.</p></div></div>
            <label className="panel-field"><span>Group name</span><input value={name} onChange={event=>setName(event.target.value)} placeholder="e.g. Pokhara weekend" maxLength={100}/></label>
            <details className="group-icon-disclosure"><summary aria-label="Choose group icon"><GroupIcon icon={icon}/><ChevronDownIcon size={15}/></summary><GroupCategoryPicker value={icon} onChange={setIcon}/></details>
            <button className="button-primary" disabled={busy || !name.trim()} onClick={()=>run(async()=>{await onSave(group.id,{name:name.trim(),icon});onClose();})}>{busy?'Saving…':'Save changes'}</button>
            <div className="panel-section-title"><h3>Members</h3><span>{members.length} people</span></div>
            <div className="settings-members">{members.map(person=><div key={person.id}><Avatar initials={person.initials} size={36}/><span>{person.id===user.id?'You':person.name}</span><FriendConnection person={person}/>{person.id!==user.id && <button className="member-remove" aria-label={`Remove ${person.name}`} disabled={busy} onClick={()=>run(()=>onRemoveMember(group.id,person.id))}><UserMinus size={17}/></button>}</div>)}</div>
            <div className="panel-section-title"><h3>Add people</h3></div>
            <div className="search-field"><Search size={17}/><input aria-label="Find friends to add" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search your friends"/></div>
            <div className="settings-candidates">{candidates.map(person=><button key={person.id} disabled={busy} onClick={()=>run(()=>onAddMember(group.id,person.id))}><Avatar initials={person.initials} size={32}/><span>{person.name}</span><Plus size={17}/></button>)}{!candidates.length && <p className="field-help">{search?'No matching friends.':'All your friends are already here. Add a new friend from the Friends tab.'}</p>}</div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {onDeleteGroup && <div className="archive-section"><div><strong>Archive group</strong><p>Keep the history, finish the shared tab.</p></div><button className="button-secondary" disabled={busy} onClick={()=>{if(window.confirm('Archive this group? Its bills and activity will be preserved.'))run(()=>onDeleteGroup(group.id));}}><Trash2 size={16}/>Archive</button></div>}
        </div>
    </BottomSheet>;
}

function FilterSheet({ isOpen, onClose, filter, setFilter }) {
    const options = [
        {id:'all',label:'All balances',description:'Everyone, including settled balances',Icon:Users},
        {id:'owes_me',label:'You’re owed',description:'Balances in your favour',Icon:ArrowDownLeft},
        {id:'i_owe',label:'You owe',description:'Balances you need to settle',Icon:ArrowUpRight},
        {id:'settled',label:'Settled up',description:'Nothing left to pay',Icon:CheckCircle2},
    ];
    return <BottomSheet isOpen={isOpen} onClose={onClose} title="Filter balances"><p className="field-help">Choose which friends and groups appear in your circle.</p><div className="balance-filter-options" role="group" aria-label="Balance filter">{options.map(({id,label,description,Icon})=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);onClose();}}><span className="balance-filter-icon"><Icon size={21}/></span><span><strong>{label}</strong><small>{description}</small></span><span className="filter-radio">{filter===id&&<Check size={13}/>}</span></button>)}</div></BottomSheet>;
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
    const [showSettled, setShowSettled] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(activeFriendContext.details?.id !== friend.id);
            await syncFriendDetail(friend.id);
            setLoading(false);
        };
        load();
    }, [friend.id]);

    const matchesFriend = activeFriendContext.details?.id === friend.id;
    const expenses = matchesFriend ? activeFriendContext.expenses : [];
    const syncedBalance = matchesFriend ? activeFriendContext.balance : friend.balance;

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
                paidByName: e.payers?.length ? e.paidByName : isMe ? 'You' : e.paidByName || friend.name,
                displayTitle: e.type === 'payment'
                    ? `${isMe ? 'You' : e.paidByName || friend.name} paid ${e.paidToName || friend.name}`
                    : e.desc,
                isSettlement: e.type === 'payment'
            };
        });
    }, [visibleExpenses, friend.name, user?.id]);

    const handleSettle = async (amount, shouldLog, payerId) => {
        await settleFriend(friend.id, amount, friend.name, shouldLog, payerId);
        await syncFriendDetail(friend.id);
        setShowSettle(false);
    };

    const handleDelete = async (item) => {
        if (item.type === 'payment' || item.isSettlement) await deleteSocialPayment(item.id);
        else await deleteSocialExpense(item.id);
        await syncFriendDetail(friend.id);
    };

    return (
        <>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: 'transparent'
            }}>
                <button className="back-button" aria-label="Back to Friends" onClick={onBack}><ChevronLeft size={25}/></button>
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
                                {Math.abs(currentBalance) < 0.01 ? 'Settled.' : `Rs. ${fmt(Math.abs(currentBalance))}`}
                            </div>
                        </div>

                        {(
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowSettle(true)}
                                style={{
                                    background: '#202020', color: '#ffffff', border: 'none',
                                    borderRadius: 12, padding: '8px 12px', fontSize: 12,
                                    fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
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
                            borderRadius: 12, border: 'none', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 10, cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Plus size={18} strokeWidth={3} color="#c9f158" />
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Montserrat', sans-serif" }}>
                            Add expense
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
                        user={user}
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

            <SettleSheet isOpen={showSettle} onClose={() => setShowSettle(false)} name={friend.name} friendId={friend.id} totalOwed={currentBalance} onConfirm={handleSettle} />
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
    const [showTotals,setShowTotals]=useState(false);
    const [showPeople,setShowPeople]=useState(false);
    const [showSettle,setShowSettle]=useState(false);
    const [loadError,setLoadError]=useState('');
    const [editingExp, setEditingExp] = useState(null);
    const [settlingMember, setSettlingMember] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const loaded=await syncGroupDetail(initialGroup.id);
            setLoadError(loaded ? '' : 'Could not load this group. Please retry.');
            setLoading(false);
        };
        load();
    }, [initialGroup.id]);

    const { metadata, expenses = [], balances = [], totals: groupTotals } = activeGroupContext.metadata?.id === initialGroup.id ? activeGroupContext : {};

    const currentGroup = metadata || initialGroup;
    const groupBalance = parseFloat(currentGroup.balance || 0);

    const enrichedBalances = useMemo(() => {
        return (balances || []).map(b => {
            const netValue = parseFloat(b.net || 0);
            return {
                ...b,
                net: netValue,
                absNet: Math.abs(netValue),
                isTheyOweMe: netValue >= 0.01,
                isIOweThem: netValue <= -0.01
            };
        }).filter(b => Math.abs(b.net) >= 0.01);
    }, [balances]);

    const enrichedExpenses = useMemo(() => {
        return expenses.map(e => {
            const isSettlement = e.type === 'payment' || e.type === 'settlement';

            const isMe = e.paidBy === user?.id || e.paidBy === 'me';
            const payerInGroup = currentGroup.members?.find(m => m.id === e.paidBy);
            const resolvedPayerName = e.payers?.length ? e.paidByName : isMe ? 'You' : (payerInGroup?.name || e.paidByName || 'Member');

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
                <button className="back-button" aria-label="Back to Friends" onClick={onBack}><ChevronLeft size={25}/></button>
                <div style={{ textAlign: 'center' }}>
                    <div className="group-detail-title" style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Montserrat', sans-serif" }}>
                        <GroupIcon icon={currentGroup.icon} type={currentGroup.type}/> {currentGroup.name}
                    </div>
                </div>
                <button className="group-settings-button" aria-label="Group settings"
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
                </button>
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
                            color: groupBalance === 0 ? '#202020' : groupBalance > 0 ? '#507418' : '#ef4444',
                            fontFamily: "'Montserrat', sans-serif", letterSpacing: '-1px'
                        }}>
                            {groupBalance === 0 ? 'Settled.' : (groupBalance > 0 ? `+Rs. ${fmt(groupBalance)}` : `-Rs. ${fmt(Math.abs(groupBalance))}`)}
                        </div>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowAddExp(true)}
                        style={{
                            width: '100%', height: 52, background: '#202020', color: '#ffffff',
                            borderRadius: 12, border: 'none', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 10, cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Plus size={18} strokeWidth={3} color="#c9f158" />
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Montserrat', sans-serif" }}>
                            Add expense
                        </span>
                    </motion.button>
                </motion.div>

                <div className="group-detail-actions"><button className="button-secondary" style={{fontWeight:600}} disabled={loading || !!loadError} onClick={()=>setShowSettle(true)}><Wallet size={18}/>Settle up</button><button className="button-secondary" disabled={loading || !!loadError} onClick={()=>setShowTotals(true)}><ChartNoAxesCombined size={18}/>View totals</button><button className="button-secondary" disabled={loading || !!loadError} onClick={()=>setShowPeople(true)}><Users size={18}/>People</button></div>
                {loadError && <div role="alert" className="form-error">{loadError}<button className="button-secondary" onClick={async()=>{setLoading(true);const data=await syncGroupDetail(initialGroup.id);setLoadError(data?'':'Could not load this group. Please retry.');setLoading(false);}}>Retry</button></div>}
                <BottomSheet isOpen={showPeople} onClose={()=>setShowPeople(false)} title="Group members">
                    <p className="field-help">Already sharing a group? Add each other as friends here.</p>
                    <div className="group-people-list">{currentGroup.members.map(person=><div key={person.id}><Avatar initials={person.initials} size={36}/><span>{person.id===user.id?'You':person.name}</span><FriendConnection person={person}/></div>)}</div>
                </BottomSheet>
                <BottomSheet isOpen={showTotals} onClose={()=>setShowTotals(false)} title="Group totals"><GroupTotals totals={groupTotals} groupId={currentGroup.id} userId={user.id}/></BottomSheet>
                <SettleSheet isOpen={showSettle} onClose={()=>setShowSettle(false)} members={currentGroup.members} onConfirm={async(amount,shouldLog,payerId,receiverId)=>{
                    await settleGroup(currentGroup.id,receiverId,amount,'',false,shouldLog,payerId,receiverId);
                    await syncGroupDetail(currentGroup.id);
                    setShowSettle(false);
                }}/>

                {loading ? (
                    <ListSkeleton />
                ) : (
                    <ExpenseList
                        user={user}
                        expenses={enrichedExpenses}
                        onDelete={async (id) => {
                            const item = enrichedExpenses.find(e => e.id === id);
                            if (item.isSettlement || item.type === 'payment') await deleteSocialPayment(id);
                            else await deleteSocialExpense(id);
                            await syncGroupDetail(currentGroup.id);
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
                    friendId={settlingMember.id}
                    totalOwed={settlingMember.net}
                    onConfirm={async (amount, shouldLog, payerId, receiverId) => {
                        await settleGroup(currentGroup.id, settlingMember.id, amount, settlingMember.name, settlingMember.net<0,shouldLog,payerId,receiverId);
                        await syncGroupDetail(currentGroup.id);
                        setSettlingMember(null);
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
    const { friends, groups, socialSummary, refreshSocial, removeFriend } = useApp();
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

            if (filter === 'owes_me') return bal >= 0.01;
            if (filter === 'i_owe') return bal <= -0.01;
            if (filter === 'settled') return Math.abs(bal) < 0.01;
            return Math.abs(bal) >= 0.01;
        });
    }, [friends, filter, searchQuery]);

    const visibleGroups = useMemo(() => {
        return (groups || []).filter(g => {
            if (!g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            const balance = Number(g.balance || 0);
            return filter === 'owes_me' ? balance >= .01 : filter === 'i_owe' ? balance <= -.01 : filter === 'settled' ? Math.abs(balance) < .01 : true;
        });
    }, [groups, searchQuery, filter]);

    const settledFriends = friends.filter(f => Math.abs(Number(f.balance || 0)) < .01 && f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const totalOwed = socialSummary?.owed ?? friends.filter(f => f.balance > 0).reduce((s, f) => s + f.balance, 0);
    const totalOwe = socialSummary?.owing ?? friends.filter(f => f.balance < 0).reduce((s, f) => s + Math.abs(f.balance), 0);

    if (activeFriend) return <FriendDetail friend={activeFriend} allFriends={friends} onBack={() => setActiveFriend(null)} onRemoveFriend={removeFriend} onRefresh={onRefresh} />;
    if (activeGroup) return <GroupDetail group={activeGroup} allFriends={friends} onBack={() => setActiveGroup(null)} onRefresh={onRefresh} />;

    return (
        <>
            <PageHeader title="Friends" subtitle="Shared plans. Clear balances." actions={<button className="button-secondary" aria-label="Filter balances" onClick={() => setShowFilter(true)}><SlidersHorizontal size={18}/><span>{({all:'Filter',owes_me:'You’re owed',i_owe:'You owe',settled:'Settled'})[filter]}</span>{filter !== 'all' && <i className="filter-active-dot"/>}</button>}/>

            <div style={{ padding: '0 16px', paddingBottom: 100 }}>

                <section className="social-hero">
                    <div className="social-net-label">{totalOwed === totalOwe ? 'All balanced' : totalOwed > totalOwe ? 'Overall, you’re owed' : 'Overall, you owe'}</div>
                    <div className={`social-net ${totalOwed < totalOwe ? 'balance-owing' : totalOwed > totalOwe ? 'balance-owed' : 'balance-even'}`}>Rs. {fmt(Math.abs(totalOwed - totalOwe))}<span>Rupees</span></div>
                    <div className="social-balance-grid">
                        <div><span>You’re owed</span><strong>Rs. {fmt(totalOwed)}</strong></div>
                        <div><span>You owe</span><strong className="owing-on-dark">Rs. {fmt(totalOwe)}</strong></div>
                    </div>
                    <button className="social-primary" onClick={() => setShowAddExpense(true)}><Plus size={19} /> Add an expense</button>
                </section>
                <div className="circle-actions"><button className="circle-action" onClick={() => setShowAddFriend(true)}><UserPlus size={22}/><span><strong>Add friend</strong><small>Find them by phone number</small></span></button><button className="circle-action" onClick={() => setShowCreateGroup(true)}><Users size={22}/><span><strong>Create group</strong><small>A trip, a home, or a shared plan</small></span></button></div>
                <div className="social-section-heading"><h2>Your circle</h2><span>{friends.length} {friends.length === 1 ? 'friend' : 'friends'} · {groups.length} {groups.length === 1 ? 'group' : 'groups'}</span></div>

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

                <p className="circle-help">{tab === 'groups' ? 'Keep every bill for a trip or shared home together. Create a group, choose your friends, and start splitting.' : 'Add friends using the number they saved on Blip. Open a friend to see your shared bills and settle up.'}</p>
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
                        placeholder={tab === 'friends' ? "Search your friends" : "Search your groups"}
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
                                <ProTip text={filter !== 'all' ? "No friends match this balance filter. Try another filter to see your circle." : friends.length ? "You’re all settled up. Your friends are listed below." : "Add your first friend using their phone number to start splitting bills."} />
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
                                <ProTip text={groups.length ? "No groups match your search or balance filter. Try another filter or clear your search." : "No groups yet. Create one for your next trip or shared home."} />
                            ) : (
                                <motion.div
                                    variants={stagger}
                                    initial="initial"
                                    animate="animate"
                                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }} // Slightly more gap
                                >
                                    {visibleGroups.map(g => {
                                        const groupBalance = parseFloat(g.balance || 0);
                                        const isSettled = Math.abs(groupBalance) < 0.01;

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
                                                        <GroupIcon icon={g.icon} type={g.type} size={26}/>
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
                                                            color: '#202020',
                                                            fontFamily: "'Montserrat', sans-serif",
                                                            letterSpacing: '-0.3px',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            background: '#c8f158c2',
                                                        }}>
                                                            Rs. {(g.totalSpent || 0).toLocaleString('en-IN')}
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