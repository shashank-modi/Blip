import PageHeader from '../components/PageHeader';
import PhoneInput from '../components/PhoneInput';
import { phoneNumber } from '../utils/phone';
import BottomSheet from '../components/BottomSheet';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Add this
import { useApp } from '../store/AppContext';
import EditRecurringSheet from '../components/EditRecurringSheet';
import FeedbackSheet from '../components/FeedbackSheet';
import { LogOut, ChevronRight, Repeat, Code, Wallet, RotateCcw, Trash2, ChevronLeft, UserPen, Mail, Phone, MessageSquare, Share2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

function BlipDialog({ isOpen, onClose, title, message, isPrompt, defaultValue, onConfirm }) {
    const [val, setVal] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';

            return () => {
                document.documentElement.style.overflow = '';
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    useEffect(() => { if (isOpen) setVal(defaultValue); }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                paddingBottom: '350px',
                backgroundColor: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                touchAction: 'none'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    borderRadius: '32px',
                    padding: '32px 24px',
                    width: '100%',
                    maxWidth: '350px',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#202020', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                    {title}
                </div>
                <div style={{ fontSize: '15px', color: '#666', lineHeight: 1.5, marginBottom: '28px' }}>
                    {message}
                </div>

                {isPrompt && (
                    <div style={{ marginBottom: '32px' }}>
                        <input
                            type="number"
                            inputMode="decimal"
                            autoFocus
                            value={val}
                            onChange={e => setVal(e.target.value)}
                            style={{
                                width: '100%', border: 'none', borderBottom: '2.5px solid #202020',
                                background: 'transparent', padding: '12px 0', fontSize: '32px',
                                fontWeight: 800, color: '#202020', textAlign: 'center', outline: 'none'
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#f2f3f5', color: '#202020', fontWeight: 700, fontSize: '14px' }}
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
            </motion.div>
        </div>,
        document.body
    );
}

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
                <div className="greeting" style={{ fontSize: 20, fontWeight: 800 }}>Scheduled payments</div>
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
                    value: `Rs. ${formatCurrency(rec.amount)}`,
                    onClick: () => onEdit(rec),
                    action: <div onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }} style={{ padding: '8px', marginLeft: '10px' }}><Trash2 size={20} color="var(--danger)" /></div>
                }))} />
            </div>
        </>
    );
}

export default function Profile() {
    const { user, budgetHistory = [], recurring, deleteRecurring, updateRecurringItem, updateUserBudget, updatePhone, version, logout } = useApp();

    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isPrompt: false, defaultValue: '', onConfirm: () => { } });
    const [editingRecurring, setEditingRecurring] = useState(null);
    const [showAutopay, setShowAutopay] = useState(false);
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneDraft, setPhoneDraft] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showBudgetHistory,setShowBudgetHistory]=useState(false);

    const openModal = (cfg) => setModalConfig({ ...cfg, isOpen: true });
    const closeModal = () => setModalConfig(p => ({ ...p, isOpen: false }));

    const handleEditBudget = () => openModal({
        title: 'Monthly Budget',
        message: 'Set your spend target for the month.',
        isPrompt: true,
        defaultValue: user.budget,
        onConfirm: (v) => { if (v && !isNaN(Number(v)) && Number(v) > 0) updateUserBudget(v); }
    });

    const handleEditPhone = () => { setPhoneDraft(user.phone || ''); setEditingPhone(true); };

    const handleShareApp = async () => {
        const shareData = {
            title: 'blip. — track expenses & split bills',
            text: 'I use blip to manage expenses and settle debts with friends. Check it out!',
            url: 'https://blip-eta.vercel.app/',
        };

        const fallbackCopy = async () => {
            try {
                await navigator.clipboard.writeText(shareData.url);
            } catch {
                const textarea = document.createElement('textarea');
                textarea.value = shareData.url;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            toast.success('Link copied!');
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await fallbackCopy();
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                await fallbackCopy();
            }
        }
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
            <BottomSheet isOpen={showBudgetHistory} onClose={()=>setShowBudgetHistory(false)} title="Monthly budget history"><p className="field-help">Each month keeps its own budget. Changing this month won’t rewrite earlier months. History starts when monthly tracking was enabled.</p>{budgetHistory.map(item=><div className="budget-history-row" key={item.month}><span>{new Date(`${item.month}-01T12:00:00`).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</span><strong>Rs. {formatCurrency(item.amount)}</strong></div>)}{!budgetHistory.length&&<p className="field-help">Your saved monthly budgets will appear here.</p>}</BottomSheet>
            <BottomSheet isOpen={editingPhone} onClose={() => setEditingPhone(false)} title="Phone number">
                <p className="field-help">Choose your country, then enter your phone number. Friends can use it to find you on Blip.</p>
                <PhoneInput value={phoneDraft} onChange={setPhoneDraft} />
                <button className="button-primary" disabled={!phoneNumber(phoneDraft) || savingPhone} onClick={async () => {
                    setSavingPhone(true);
                    try { await updatePhone(phoneNumber(phoneDraft)); setEditingPhone(false); }
                    catch { /* App context displays the error and preserves the draft. */ }
                    finally { setSavingPhone(false); }
                }} style={{ marginTop: 20, width: '100%' }}>{savingPhone ? 'Saving…' : 'Save phone number'}</button>
            </BottomSheet>

            <PageHeader title="Profile" subtitle="Your details. Your preferences."/>
            <div className="profile-content" style={{ padding: '0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
                    <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800, color: '#202020', border: '4px solid #FFFFFF', boxShadow: '0 10px 25px rgba(201, 241, 88, 0.3)' }}>{initials}</div>
                </div>

                <LedgerBox title="Personal Info" rows={[
                    { icon: <UserPen size={22} />, label: 'Name', sub: user.name || 'User', noChevron: true },
                    { icon: <Mail size={22} />, label: 'Email', sub: user.email || 'Not set', noChevron: true },
                    { icon: <Phone size={22} />, label: 'Phone', sub: user.phone || 'Not set', onClick: handleEditPhone },
                    { icon: <Wallet size={22} />, label: 'Monthly Budget', sub: 'Current spending limit', value: `Rs. ${formatCurrency(user.budget || 0)}`, onClick: handleEditBudget }
                ]} />

                <LedgerBox
                    title="Account Info"
                    rows={[
                        {
                            icon: <Repeat size={18} />,
                            label: 'Scheduled payments',
                            sub: `${recurring.length} active schedules`,
                            onClick: () => setShowAutopay(true)
                        },
                        {
                            icon: <RotateCcw size={18} />,
                            label: 'Budget history',
                            sub: 'Your spending limit, month by month',
                            onClick: () => setShowBudgetHistory(true)
                        }
                    ]}
                />

                <LedgerBox
                    title="App & Support"
                    rows={[
                        {
                            icon: <Share2 size={18} />,
                            label: 'Share App',
                            sub: 'Invite friends to blip.',
                            onClick: handleShareApp
                        },
                        {
                            icon: <MessageSquare size={18} />,
                            label: 'Send Feedback',
                            sub: 'Tell us what to build next',
                            onClick: () => setShowFeedback(true)
                        },
                        {
                            icon: <Code size={18} />,
                            label: 'Version',
                            badge: version,
                            noChevron: true
                        }
                    ]}
                />

                <LedgerBox title="Privacy & Security" rows={[
                    { icon: <LogOut size={18} />, label: 'Sign Out', danger: true, onClick: () => openModal({ title: 'Sign Out', message: 'Are you sure you want to sign out of Blip?', onConfirm: () => logout() }), noChevron: true }
                ]} />
                <div style={{ height: 40 }} />
            </div>
            <FeedbackSheet
                isOpen={showFeedback}
                onClose={() => setShowFeedback(false)}
            />
            <BlipDialog {...modalConfig} onClose={closeModal} />
        </>
    );
}