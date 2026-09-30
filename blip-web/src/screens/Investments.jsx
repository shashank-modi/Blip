import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import BottomSheet from '../components/BottomSheet';
import SwipeableItem from '../components/SwipeableItem';
import DayInput from '../components/DayInput';
import { formatCurrency } from '../utils/format';
import { motion } from 'framer-motion';
import {
    Repeat, TrendingUp, ChevronRight, Clock, Zap,
    Coffee, Calendar, AlarmClock, GitCompare
} from 'lucide-react';

// ── Math helpers ──────────────────────────────────────────────────────────────
const fv = (monthly, months, rate = 0.12) =>
    monthly > 0
        ? Math.round(monthly * ((Math.pow(1 + rate / 12, months) - 1) / (rate / 12)) * (1 + rate / 12))
        : 0;

const breakEvenMonths = (monthly) => {
    if (monthly <= 0) return null;
    for (let m = 1; m <= 360; m++) {
        if (fv(monthly, m) >= monthly * m) return m;
    }
    return null;
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const listCard = {
    background: '#f2f3f5',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
};

const listRow = (isLast) => ({
    padding: '14px 16px',
    borderBottom: isLast ? 'none' : '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
});

const sectionLabel = {
    fontSize: 11, fontWeight: 700,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: 10,
};

const heroDark = {
    background: '#202020',
    borderRadius: 20,
    padding: '22px 20px',
    marginBottom: 20,
};

function AnalyticsBtn({ icon, label, sub, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: '#ffffff',
                borderRadius: 22, padding: '16px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', marginBottom: 10,
                transition: 'transform 0.12s',
            }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
            <div style={{
                width: 40, height: 40, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#202020', flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#202020' }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
            </div>
            <ChevronRight size={22} color="var(--text-3)" />
        </div>
    );
}

// ── Sheet: Wealth Projection ──────────────────────────────────────────────────
function ProjectionSheet({ monthlySips, totalInvested, investments }) {
    const milestones = [
        { years: 1, label: '1 Year' },
        { years: 3, label: '3 Years' },
        { years: 5, label: '5 Years' },
        { years: 10, label: '10 Years' },
    ];
    const sipCount = investments.filter(i => i.type === 'Monthly').length;
    const lumpCount = investments.filter(i => i.type !== 'Monthly').length;
    const total10 = fv(monthlySips, 120);
    const gains10 = Math.max(0, total10 - monthlySips * 120);
    const gainPct = monthlySips * 120 > 0 ? ((gains10 / (monthlySips * 120)) * 100).toFixed(0) : 0;

    return (
        <div style={{ paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {[
                    { label: 'Monthly SIPs', value: `Rs. ${formatCurrency(monthlySips)}`, sub: `${sipCount} active` },
                    { label: 'Lump Sum', value: `Rs. ${formatCurrency(totalInvested - monthlySips)}`, sub: `${lumpCount} entries` },
                ].map(s => (
                    <div key={s.label} style={{ flex: 1, background: '#f2f3f5', borderRadius: 14, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#202020' }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {monthlySips === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)', fontSize: 14 }}>
                    Add a Monthly SIP to see projections.
                </div>
            ) : (
                <>
                    <div style={sectionLabel}>Projected Value @ 12% p.a.</div>

                    <div style={listCard}>
                        {milestones.map((m, i) => {
                            const projected = fv(monthlySips, m.years * 12);
                            const invested = monthlySips * m.years * 12;
                            const gain = Math.max(0, projected - invested);
                            const isLast = i === milestones.length - 1;
                            return (
                                <div key={m.label} style={{
                                    ...listRow(isLast),
                                    background: isLast ? '#F2f3f5' : 'transparent',
                                    borderLeft: isLast ? '3px solid #c9f158' : 'none',
                                }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isLast ? '#c9f158' : "#202020",
                                    }}>
                                        <Clock size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 17, fontWeight: 700, color: '#202020' }}>{m.label}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1 }}>
                                            Invest Rs. {formatCurrency(invested)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: isLast ? '#4D7C0F' : '#202020' }}>
                                            Rs. {formatCurrency(projected)}
                                        </div>
                                        {gain > 0 && (
                                            <div style={{ fontSize: 10, fontWeight: 500, color: '#ffffff', marginTop: 1, backgroundColor: '#c9f158', borderRadius: 99, padding: '2px 8px' }}>
                                                +Rs. {formatCurrency(gain)} gains
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                            <Zap size={22} />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 2 }}>10-year gain estimate</div>
                            <div style={{ fontSize: 12, color: '#047857', lineHeight: 1.5 }}>
                                Your Rs. {formatCurrency(monthlySips * 120)} becomes <strong>Rs. {formatCurrency(total10)}</strong> — that's <strong>{gainPct}% returns</strong> on principal.
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
                        Assumes 12% p.a. compounded monthly. Actual returns may vary.
                    </div>
                </>
            )}
        </div>
    );
}

// ── Sheet: Break-even ─────────────────────────────────────────────────────────
function BreakEvenSheet({ monthlySips }) {
    const bem = breakEvenMonths(monthlySips);
    const years = bem ? Math.floor(bem / 12) : null;
    const months = bem ? bem % 12 : null;

    const timeline = bem
        ? [6, 12, 24, bem, 60, 120]
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort((a, b) => a - b)
            .slice(0, 5)
        : [];

    return (
        <div style={{ paddingBottom: 8 }}>
            {monthlySips === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)', fontSize: 14 }}>
                    Add a Monthly SIP to see your break-even point.
                </div>
            ) : (
                <>
                    <div style={{ ...heroDark, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                            Your money starts working at
                        </div>
                        <div style={{ fontSize: 38, fontWeight: 800, color: '#c9f158', letterSpacing: '-1px', lineHeight: 1 }}>
                            {years > 0 ? `${years}y ` : ''}{months > 0 ? `${months}m` : ''}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                            Month {bem} — returns exceed your principal
                        </div>
                    </div>

                    {/* Explanation */}
                    <div style={{ background: '#EEF2FF', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338CA', flexShrink: 0 }}>
                            <AlarmClock size={22} />
                        </div>
                        <div style={{ fontSize: 12, color: '#3730A3', lineHeight: 1.6 }}>
                            Before month {bem}, your corpus is less than what you put in. After month {bem}, <strong>every rupee of growth is pure profit</strong>.
                        </div>
                    </div>

                    {/* Timeline — single card */}
                    <div style={sectionLabel}>Journey to break-even</div>
                    <div style={listCard}>
                        {timeline.map((m, idx) => {
                            const projected = fv(monthlySips, m);
                            const invested = monthlySips * m;
                            const isTarget = m === bem;
                            const isOver = m > bem;
                            const isLast = idx === timeline.length - 1;
                            return (
                                <div key={m} style={{
                                    ...listRow(isLast),
                                    background: isTarget ? '#FAFFF0' : 'transparent',
                                    borderLeft: isTarget ? '3px solid #c9f158' : 'none',
                                }}>
                                    <div style={{
                                        width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                                        background: isTarget ? '#c9f158' : isOver ? '#059669' : '#D0D0D0',
                                        marginLeft: 4,
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: '#202020' }}>
                                            Month {m}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1 }}>
                                            Invested Rs. {formatCurrency(invested)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: isTarget || isOver ? '#059669' : '#202020' }}>
                                            Rs. {formatCurrency(projected)}
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 500, color: projected >= invested ? '#Ffffff' : '#D97706', marginTop: 1, backgroundColor: '#c9f158', padding: '2px 6px', borderRadius: 99 }}>
                                            {projected >= invested
                                                ? `+Rs. ${formatCurrency(projected - invested)}`
                                                : `-Rs. ${formatCurrency(invested - projected)}`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Sheet: Daily cost framing ─────────────────────────────────────────────────
function DailyCostSheet({ monthlySips }) {
    const dailySip = monthlySips / 30;
    const comparisons = [
        { label: 'Chai + biscuit', cost: 20, emoji: '🍵' },
        { label: 'Swiggy delivery fee', cost: 30, emoji: '🛵' },
        { label: 'Spotify Premium', cost: 4, emoji: '🎵' },
        { label: 'Café coffee', cost: 120, emoji: '☕' },
        { label: 'Movie ticket', cost: 250, emoji: '🎬' },
        { label: 'Uber ride', cost: 80, emoji: '🚗' },
    ];

    return (
        <div style={{ paddingBottom: 8 }}>
            {monthlySips === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)', fontSize: 14 }}>
                    Add a Monthly SIP to see the daily cost breakdown.
                </div>
            ) : (
                <>
                    <div style={heroDark}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                            Your SIP costs you
                        </div>
                        <div style={{ fontSize: 42, fontWeight: 800, color: '#c9f158', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            Rs. {dailySip.toFixed(0)}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>
                            per day
                        </div>
                    </div>

                    {/* Insight */}
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                            <Coffee size={22} />
                        </div>
                        <div style={{ fontSize: 12, color: '#047857', lineHeight: 1.6 }}>
                            You're investing <strong>Rs. {dailySip.toFixed(0)}/day</strong>. That's less than{' '}
                            <strong>{comparisons.find(c => c.cost > dailySip)?.label || 'a coffee'}</strong> — but it compounds to wealth.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Sheet: Start earlier ──────────────────────────────────────────────────────
function StartEarlierSheet({ monthlySips }) {
    const scenarios = [
        { label: 'Started 5 years ago', extraMonths: 60, color: '#72589f7f' },
        { label: 'Started 2 years ago', extraMonths: 24, color: '#D97706' },
        { label: 'Starting today', extraMonths: 0, color: '#c9f158' },
        { label: 'Starting 2 years later', extraMonths: -24, color: '#EF4444' },
    ];
    const base10 = fv(monthlySips, 120);

    return (
        <div style={{ paddingBottom: 8 }}>
            {monthlySips === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)', fontSize: 14 }}>
                    Add a Monthly SIP to see the comparison.
                </div>
            ) : (
                <>
                    <div style={heroDark}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                            The cost of waiting
                        </div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
                            Every year you delay costs you more than the SIPs you skip — compounding is exponential, not linear.
                        </div>
                    </div>
                    <div style={sectionLabel}>Value at 10 years from today</div>
                    <div style={listCard}>
                        {scenarios.map((s, idx) => {
                            const totalMonths = 120 + s.extraMonths;
                            const projected = totalMonths > 0 ? fv(monthlySips, totalMonths) : 0;
                            const diff = projected - base10;
                            const isBase = s.extraMonths === 0;
                            const isLast = idx === scenarios.length - 1;
                            return (
                                <div key={s.label} style={{
                                    ...listRow(isLast),
                                    background: isBase ? '#FAFFF0' : 'transparent',
                                    borderLeft: isBase ? '3px solid #c9f158' : 'none',
                                    padding: '15px 10px'
                                }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: isBase ? '#c9f158' : s.color,
                                        flexShrink: 0, marginLeft: 2,
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: '#202020' }}>{s.label}</div>
                                        {!isBase && diff !== 0 && (
                                            <div style={{ fontSize: 13, color: diff > 0 ? '#059669' : '#EF4444', fontWeight: 600, marginTop: 1 }}>
                                                {diff > 0 ? `+Rs. ${formatCurrency(diff)} more` : `-Rs. ${formatCurrency(Math.abs(diff))} less`}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: isBase ? '#4D7C0F' : s.color }}>
                                        Rs. {formatCurrency(projected)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {(() => {
                        const lateVal = fv(monthlySips, 96);
                        const lostAmt = base10 - lateVal;
                        return lostAmt > 0 ? (
                            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', flexShrink: 0 }}>
                                    <Calendar size={22} />
                                </div>
                                <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.6 }}>
                                    Waiting just <strong>2 more years</strong> will cost you <strong>Rs. {formatCurrency(lostAmt)}</strong> in lost compounding — that's {Math.round(lostAmt / (monthlySips * 24))}× your skipped SIP contributions.
                                </div>
                            </div>
                        ) : null;
                    })()}

                    <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
                        Assumes 12% p.a. compounded monthly. Actual returns may vary.
                    </div>
                </>
            )}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Investments() {
    const { investments, addInvestment, deleteInvestment, updateInvestmentItem } = useApp();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState(null);
    const [activeTab, setActiveTab] = useState('portfolio');
    const [openSheet, setOpenSheet] = useState(null);

    const [invAmt, setInvAmt] = useState('');
    const [invName, setInvName] = useState('');
    const [invType, setInvType] = useState('sip');
    const [invDate, setInvDate] = useState('1');

    const [editAmt, setEditAmt] = useState('');
    const [editName, setEditName] = useState('');

    useEffect(() => {
        if (editingInvestment) {
            setEditAmt(String(editingInvestment.amount));
            setEditName(editingInvestment.title);
        }
    }, [editingInvestment]);

    const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
    const monthlySips = investments.filter(i => i.type === 'Monthly').reduce((s, i) => s + Number(i.amount), 0);
    const sipCount = investments.filter(i => i.type === 'Monthly').length;
    const bem = breakEvenMonths(monthlySips);
    const dailySip = (monthlySips / 30).toFixed(0);

    const groupedInvestments = useMemo(() => {
        const groups = {};
        investments.forEach(inv => {
            const key = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
            if (!groups[key]) groups[key] = { items: [], totalInvested: 0 };
            groups[key].items.push(inv);
            groups[key].totalInvested += Number(inv.amount) || 0;
        });
        return groups;
    }, [investments]);

    const handleAdd = () => {
        const amount = parseFloat(invAmt);
        if (isNaN(amount) || amount <= 0 || !invName.trim()) return;
        addInvestment(invName.trim(), amount, invType === 'sip' ? 'Monthly' : 'Lumpsum');
        setIsSheetOpen(false);
        setInvAmt(''); setInvName('');
    };

    const handleSwipeLeft = (id) => { deleteInvestment(id); };
    const handleSwipeRight = (inv) => setEditingInvestment(inv);

    const handleEdit = () => {
        const amount = parseFloat(editAmt);
        if (isNaN(amount) || amount <= 0 || !editName.trim()) return;
        updateInvestmentItem(editingInvestment.id, { title: editName.trim(), amount });
        setEditingInvestment(null);
    };

    return (
        <>
            <div className="top-bar">
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div className="greeting" style={{ fontSize: 20 }}>Investments</div>
                </div>
            </div>

            <div className="invest-content">
                <div className="log-card" style={{ marginTop: 14 }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.10)',
                        borderRadius: 20,
                        padding: '14px 16px',
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#202020', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
                            Total Invested
                        </div>
                        <div style={{ fontSize: 36, fontWeight: 600, color: '#202020', letterSpacing: '-1px', lineHeight: 1, marginBottom: 14 }}>
                            Rs. {formatCurrency(totalInvested)}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[
                                { label: 'Monthly SIPs', value: `Rs. ${formatCurrency(monthlySips)}`, active: monthlySips > 0 },
                                { label: 'Lump Sum', value: `Rs. ${formatCurrency(totalInvested - monthlySips)}`, active: false },
                            ].map(s => (
                                <div key={s.label} style={{
                                    flex: 1,
                                    background: '#f2f3f5',
                                    border: '1px solid rgba(255,255,255,0.10)',
                                    borderRadius: 20,
                                    padding: '8px 10px',
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#202020', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
                                        {s.label}
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#202020' }}>{s.value}</div>
                                    {s.active && (
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#ffffff', marginTop: 2, backgroundColor: '#c9f158', borderRadius: 50, padding: '2px 8px', width: 'fit-content' }}>+Active</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="log-btn" onClick={() => setIsSheetOpen(true)}>
                        Add Money
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ marginTop: 35 }} />
                <div style={{ display: 'flex', gap: 8, padding: 4, background: '#f2f3f5', borderRadius: 12, marginBottom: 5 }}>
                    {['portfolio', 'sips'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            flex: 1, padding: '10px 0', border: 'none',
                            borderBottom: activeTab === tab ? '2px solid #202020' : 'none',
                            background: 'transparent',
                            color: activeTab === tab ? '#202020' : 'var(--text-3)',
                            fontWeight: activeTab === tab ? 700 : 500,
                            fontSize: 16,
                            cursor: 'pointer', transition: 'all 0.2s',
                            fontFamily: "'Montserrat', sans-serif",
                        }}>
                            {tab === 'portfolio' ? 'Portfolio' : 'Active SIPs'}
                        </button>
                    ))}
                </div>

                {/* Portfolio tab */}
                {activeTab === 'portfolio' && (
                    <div className="invest-month-box">
                        {Object.keys(groupedInvestments).length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    padding: '15px 24px',
                                    textAlign: 'center', marginTop: 12
                                }}
                            >
                                <div style={{
                                    background: '#c9f158', width: 48, height: 48, borderRadius: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                                    boxShadow: '0 8px 20px rgba(201, 241, 88, 0.2)'
                                }}>
                                    <TrendingUp size={22} color="#202020" strokeWidth={2.5} />
                                </div>

                                <div style={{
                                    fontSize: 16, fontWeight: 800, color: '#202020',
                                    marginBottom: 6, fontFamily: "'Montserrat', sans-serif"
                                }}>
                                    Future starts here
                                </div>

                                <div style={{
                                    fontSize: 13, color: '#666', fontWeight: 500,
                                    lineHeight: 1.5, maxWidth: 220
                                }}>
                                    Track your stocks, crypto, or mutual funds in one place to see your wealth grow.
                                </div>
                            </motion.div>
                        ) : Object.entries(groupedInvestments).map(([monthStr, group]) => (
                            <div key={monthStr}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{monthStr}</span>
                                    <span>Rs. {formatCurrency(group.totalInvested)} invested</span>
                                </div>
                                {group.items.map((inv, idx) => (
                                    <SwipeableItem key={inv.id} onSwipeLeft={() => handleSwipeLeft(inv.id)} onSwipeRight={() => handleSwipeRight(inv)}>
                                        <div className='invest-item' style={{ height: 70, marginBottom: 6, borderBottom: idx !== group.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <div className="invest-item-icon" size={22}>{inv.title.charAt(0)}</div>
                                            <div>
                                                <div className="invest-item-name">{inv.title}</div>
                                                <div className="invest-item-freq">{inv.type === 'Monthly' ? 'Monthly SIP' : inv.type}</div>
                                            </div>
                                            <div className="invest-item-amount">Rs. {formatCurrency(inv.amount)}</div>
                                        </div>
                                    </SwipeableItem>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* SIPs tab */}
                {activeTab === 'sips' && (
                    <div className="invest-month-box">
                        {investments.filter(i => i.type === 'Monthly').length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px 0' }}>No active SIPs.</p>
                        ) : investments.filter(i => i.type === 'Monthly').map((inv, idx) => {
                            const sips = investments.filter(i => i.type === 'Monthly');
                            const isLast = idx === sips.length - 1;
                            return (
                                <div
                                    key={inv.id}
                                    className="invest-item"
                                    style={{
                                        height: 70,
                                        borderBottom: isLast ? 'none' : '1px solid var(--border)',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => handleSwipeRight(inv)}
                                >
                                    <div className="invest-item-icon">
                                        <Repeat size={22} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="invest-item-name">{inv.title}</div>
                                        <div className="invest-item-freq">Monthly SIP</div>
                                    </div>
                                    <div className="invest-item-amount" style={{ marginRight: 12 }}>
                                        Rs. {formatCurrency(inv.amount)}
                                    </div>
                                    <div
                                        onClick={e => { e.stopPropagation(); handleSwipeLeft(inv.id); }}
                                        style={{
                                            width: 32, height: 32, borderRadius: 13,
                                            border: '1px solid #FEF2F2',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, cursor: 'pointer',
                                        }}
                                    >
                                        <svg width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                                        </svg>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Analytics buttons */}
                <div style={{ marginTop: 30 }}>
                    <div className='section-title' style={{ marginBottom: '10px' }}>Know More</div>
                    <AnalyticsBtn
                        icon={<TrendingUp size={22} />}
                        label="Wealth Projection"
                        sub={monthlySips > 0 ? `Rs. ${formatCurrency(fv(monthlySips, 120))} in 10 yrs @ 12%` : 'Add a SIP to see projections'}
                        onClick={() => setOpenSheet('projection')}
                    />
                    <AnalyticsBtn
                        icon={<AlarmClock size={22} />}
                        label="Break-even Point"
                        sub={bem ? `Returns exceed principal at month ${bem}` : 'Add a SIP to calculate'}
                        onClick={() => setOpenSheet('breakeven')}
                    />
                    <AnalyticsBtn
                        icon={<Coffee size={22} />}
                        label="Daily Cost Framing"
                        sub={monthlySips > 0 ? `You invest just Rs. ${dailySip}/day` : 'Add a SIP to see this'}
                        onClick={() => setOpenSheet('dailycost')}
                    />
                    <AnalyticsBtn
                        icon={<GitCompare size={22} />}
                        label="Start Earlier Impact"
                        sub="See the true cost of delaying"
                        onClick={() => setOpenSheet('startlater')}
                    />
                </div>
            </div >

            <div style={{ height: 100 }} />

            {/* Analytics sheets */}
            <BottomSheet isOpen={openSheet === 'projection'} onClose={() => setOpenSheet(null)} title="Wealth Projection">
                <ProjectionSheet monthlySips={monthlySips} totalInvested={totalInvested} investments={investments} />
            </BottomSheet>
            <BottomSheet isOpen={openSheet === 'breakeven'} onClose={() => setOpenSheet(null)} title="Break-even Point">
                <BreakEvenSheet monthlySips={monthlySips} />
            </BottomSheet>
            <BottomSheet isOpen={openSheet === 'dailycost'} onClose={() => setOpenSheet(null)} title="Daily Cost Framing">
                <DailyCostSheet monthlySips={monthlySips} />
            </BottomSheet>
            <BottomSheet isOpen={openSheet === 'startlater'} onClose={() => setOpenSheet(null)} title="Start Earlier Impact">
                <StartEarlierSheet monthlySips={monthlySips} />
            </BottomSheet>

            {/* Add Investment sheet */}
            <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Add Investment">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div className="form-field" style={{ flex: 1 }}>
                            <div className="form-label">Amount (Rs. )</div>
                            <input className="form-input" type="number" placeholder="5000"
                                value={invAmt} onChange={e => setInvAmt(e.target.value)}
                                style={{ fontSize: 18, fontWeight: 700 }} />
                        </div>
                        <div className="form-field" style={{ flex: 2 }}>
                            <div className="form-label">Investment Name</div>
                            <input className="form-input" type="text" placeholder="e.g. Nifty 50"
                                value={invName} onChange={e => setInvName(e.target.value)}
                                style={{ fontSize: 16, fontWeight: 500 }} />
                        </div>
                    </div>
                    <div className="form-field">
                        <div className="form-label">Type</div>
                        <div className="categories-row">
                            {[{ id: 'lump', label: 'Lump Sum' }, { id: 'sip', label: 'Monthly SIP' }].map(t => (
                                <div key={t.id} className={`cat-btn ${invType === t.id ? 'selected' : ''}`} onClick={() => setInvType(t.id)}>
                                    <span className="cat-label">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {invType === 'sip' && <DayInput value={invDate} onChange={setInvDate} />}
                    <button className="overlay-submit" onClick={handleAdd}
                        disabled={!invAmt || !invName}
                        style={{ opacity: (!invAmt || !invName) ? 0.45 : 1 }}>
                        Add Investment
                    </button>
                </div>
            </BottomSheet>

            {/* Edit Investment sheet */}
            <BottomSheet isOpen={!!editingInvestment} onClose={() => setEditingInvestment(null)} title="Edit Investment">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div className="form-field" style={{ flex: 1 }}>
                            <div className="form-label">Amount (Rs. )</div>
                            <input className="form-input" type="number" placeholder="5000"
                                value={editAmt} onChange={e => setEditAmt(e.target.value)}
                                style={{ fontSize: 18, fontWeight: 700 }} />
                        </div>
                        <div className="form-field" style={{ flex: 2 }}>
                            <div className="form-label">Investment Name</div>
                            <input className="form-input" type="text" placeholder="e.g. Nifty 50"
                                value={editName} onChange={e => setEditName(e.target.value)}
                                style={{ fontSize: 16, fontWeight: 500 }} />
                        </div>
                    </div>
                    <button className="overlay-submit" onClick={handleEdit}
                        disabled={!editAmt || !editName}
                        style={{ opacity: (!editAmt || !editName) ? 0.45 : 1 }}>
                        Save Changes
                    </button>
                </div>
            </BottomSheet>
        </>
    );
}