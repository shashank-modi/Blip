import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useApp } from '../store/AppContext';
import EditRecurringSheet from '../components/EditRecurringSheet';
import { LogOut, ChevronRight, Repeat, Code, Wallet, RotateCcw, Trash2, ChevronLeft, UserPen, Mail } from 'lucide-react';
import { formatCurrency } from '../utils/format';

// ─── BLIP CUSTOM DIALOG (Internal UI) ──────────────────────────────────
function BlipDialog({ isOpen, onClose, title, message, isPrompt, defaultValue, onConfirm }) {
    const [val, setVal] = useState(defaultValue);

    useEffect(() => { if (isOpen) setVal(defaultValue); }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)'
        }} onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#ffffff', borderRadius: '32px', padding: '32px 24px',
                    width: '100%', maxWidth: '340px', border: '1px solid var(--border)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center'
                }}
            >
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#202020', marginBottom: '8px' }}>
                    {title}
                </div>
                <div style={{ fontSize: '14px', color: '#202020a3', lineHeight: 1.5, marginBottom: '24px' }}>
                    {message}
                </div>

                {isPrompt && (
                    <div style={{ marginBottom: '24px' }}>
                        <input
                            type="number"
                            autoFocus
                            value={val}
                            onChange={e => setVal(e.target.value)}
                            style={{
                                width: '100%', border: 'none', borderBottom: '2px solid #202020',
                                background: 'transparent', padding: '12px 0', fontSize: '24px',
                                fontWeight: 800, color: '#202020', textAlign: 'center', outline: 'none'
                            }}
                        />
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-3)', marginTop: '8px', textTransform: 'uppercase' }}>
                            Enter Amount
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--bg)', color: '#202020', fontWeight: 700, fontSize: '14px' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(isPrompt ? val : true); onClose(); }}
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#202020', color: '#ffffff', fontWeight: 700, fontSize: '14px' }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── LEDGER COMPONENTS ──────────────────────────────────────────────────
function getDaySuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th';
    }
}

function LedgerBox({ title, rows }) {
    return (
        <div style={{
            background: '#ffffff', borderRadius: 28,
            padding: '20px 8px 8px', marginBottom: 24, overflow: 'hidden'
        }}>
            <div style={{ padding: '0 12px 12px', marginBottom: '4px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#202020', letterSpacing: '1.2px' }}>
                    {title}
                </div>
            </div>
            {rows.map((row, idx) => (
                <div key={idx} onClick={row.onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 12px', cursor: row.onClick ? 'pointer' : 'default' }}>
                    {row.icon && <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: row.iconColor || '#202020' }}>{row.icon}</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: row.danger ? 'var(--danger)' : '#202020a3' }}>{row.label}</div>
                        {row.sub && <div style={{ fontFamily: 'Space Grotesk', fontSize: '15px', color: '#202020', fontWeight: 500, marginTop: 2 }}>{row.sub}</div>}
                    </div>
                    {row.value && <span style={{ fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: 700, color: '#202020', marginRight: 6 }}>{row.value}</span>}
                    {row.badge && <span style={{ fontSize: '10px', fontWeight: 800, background: '#c9f158', color: '#ffffff', padding: '4px 10px', borderRadius: 99 }}>{row.badge}</span>}
                    {row.action && row.action}
                    {row.onClick && !row.noChevron && <ChevronRight size={22} color="var(--text-3)" style={{ flexShrink: 0 }} />}
                </div>
            ))}
        </div>
    );
}

function AutopayScreen({ recurring, onBack, onEdit, onDelete }) {
    return (
        <>
            <div className="top-bar" style={{ position: 'relative', justifyContent: 'center' }}>
                <div className="icon-btn" onClick={onBack} style={{ position: 'absolute', left: 20 }}><ChevronLeft size={20} /></div>
                <div className="greeting" style={{ fontSize: 20, fontWeight: 800 }}>Auto Pay</div>
            </div>
            <div className="profile-content" style={{ padding: '20px' }}>
                <LedgerBox title="Active Schedules" rows={recurring.map(rec => ({
                    noChevron: true,
                    label: rec.title,
                    sub: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Due Day {rec.dueDate}{getDaySuffix(rec.dueDate)}</span>
                            <span style={{ color: 'var(--text-3)' }}>•</span>
                            <span style={{ backgroundColor: '#c9f158', color: '#ffffff', fontWeight: 700, fontSize: '10px', padding: '2px 6px', borderRadius: 99 }}>{rec.category}</span>
                        </div>
                    ),
                    value: `₹${formatCurrency(rec.amount)}`,
                    onClick: () => onEdit(rec),
                    action: <div onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }} style={{ padding: '8px', marginLeft: '10px' }}><Trash2 size={20} color="var(--danger)" /></div>
                }))} />
            </div>
        </>
    );
}

// ─── MAIN PROFILE ───────────────────────────────────────────────────────
export default function Profile() {
    const { user: clerkUser } = useUser();
    const { signOut } = useClerk();
    const { user, recurring, deleteRecurring, updateRecurringItem, updateUserBudget } = useApp();

    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isPrompt: false, defaultValue: '', onConfirm: () => { } });
    const [editingRecurring, setEditingRecurring] = useState(null);
    const [showAutopay, setShowAutopay] = useState(false);

    const openModal = (cfg) => setModalConfig({ ...cfg, isOpen: true });
    const closeModal = () => setModalConfig(p => ({ ...p, isOpen: false }));

    const handleEditBudget = () => openModal({
        title: 'Monthly Budget',
        message: 'Set your spend target for the month.',
        isPrompt: true,
        defaultValue: user.budget,
        onConfirm: (v) => { if (v && !isNaN(Number(v)) && Number(v) > 0) updateUserBudget(v); }
    });

    const resetBudgetPrompts = () => {
        Object.keys(localStorage).filter(k => k.startsWith('blip_budget_prompt_')).forEach(k => localStorage.removeItem(k));
    };

    if (showAutopay) return (
        <>
            <AutopayScreen recurring={recurring} onBack={() => setShowAutopay(false)} onEdit={setEditingRecurring} onDelete={(id) => openModal({ title: 'Delete Schedule', message: 'Stop tracking this payment?', onConfirm: () => deleteRecurring(id) })} />
            <EditRecurringSheet isOpen={!!editingRecurring} onClose={() => setEditingRecurring(null)} item={editingRecurring} onSave={(updates) => { updateRecurringItem(editingRecurring.id, updates); }} />
            <BlipDialog {...modalConfig} onClose={closeModal} />
        </>
    );

    const initials = user.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    return (
        <>
            <div className="top-bar" style={{ justifyContent: 'center' }}><div className="greeting" style={{ fontSize: 20, fontWeight: 800 }}>Profile</div></div>
            <div className="profile-content" style={{ padding: '0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
                    <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800, color: '#202020', border: '4px solid #FFFFFF', boxShadow: '0 10px 25px rgba(201, 241, 88, 0.3)' }}>{initials}</div>
                </div>

                <LedgerBox title="Personal Info" rows={[
                    { icon: <UserPen size={22} />, label: 'Name', sub: user.name || 'User', noChevron: true },
                    { icon: <Mail size={22} />, label: 'Email', sub: user.email || clerkUser?.primaryEmailAddress?.emailAddress || 'Not set', noChevron: true },
                    { icon: <Wallet size={22} />, label: 'Monthly Budget', sub: 'Current spending limit', value: `₹${formatCurrency(user.budget || 0)}`, onClick: handleEditBudget }
                ]} />

                <LedgerBox title="Account Info" rows={[
                    { icon: <Repeat size={18} />, label: 'Manage Auto Pay', sub: `${recurring.length} active schedules`, onClick: () => setShowAutopay(true) },
                    { icon: <RotateCcw size={18} />, label: 'Reset Budget Prompt', sub: 'Show monthly check-in again', onClick: resetBudgetPrompts, noChevron: true, action: <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--indigo)', background: 'var(--bg)', padding: '5px 12px', borderRadius: '8px' }}>RESET</div> },
                    { icon: <Code size={18} />, label: 'Version', badge: 'v1.0.2', noChevron: true }
                ]} />

                <LedgerBox title="Privacy & Security" rows={[
                    { icon: <LogOut size={18} />, label: 'Sign Out', danger: true, onClick: () => openModal({ title: 'Sign Out', message: 'Are you sure you want to sign out of Blip?', onConfirm: () => signOut() }), noChevron: true }
                ]} />
                <div style={{ height: 40 }} />
            </div>
            <BlipDialog {...modalConfig} onClose={closeModal} />
        </>
    );
}