import { useState } from 'react';
import { useApp } from '../store/AppContext';
import BottomSheet from '../components/BottomSheet';
import { formatCurrency } from '../utils/format';
import ExpenseChart from '../components/ExpenseChart';
import {
    Coffee, Car, ShoppingBag, Home, Grid,
    TrendingDown, TrendingUp, Wallet,
    ChevronLeft, ChevronRight,
    PieChart, BarChart2, Lightbulb, AlertTriangle, PiggyBank, LayoutGrid, CheckCircle, LineChart, Clapperboard, BookHeart, Hospital
} from 'lucide-react';

const CATEGORY_META = {
    Food: { icon: <Coffee size={22} />, color: '#dbde08ff', bg: '#FFFFFF' },
    Transport: { icon: <Car size={22} />, color: '#059669', bg: '#FFFFFF' },
    Shopping: { icon: <ShoppingBag size={22} />, color: '#D97706', bg: '#FFFFFF' },
    Bills: { icon: <Home size={22} />, color: '#7C3AED', bg: '#FFFFFF' },
    General: { icon: <Grid size={22} />, color: '#238cc9ff', bg: '#FFFFFF' },
    Entertainment: { icon: <Clapperboard size={20} />, color: '#F59E0B', bg: '#FFFFFF' },
    'Personal Care': { icon: <BookHeart size={20} />, color: '#8B5CF6', bg: '#FFFFFF' },
    Medical: { icon: <Hospital size={20} />, color: '#EF4444', bg: '#FFFFFF' }
};

function SpendingTrendChart({ expenses }) {
    // Group last 7 days by day
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), date: d.toDateString(), total: 0 };
    });
    expenses.filter(e => e.category !== 'Income').forEach(e => {
        const ds = new Date(e.date).toDateString();
        const day = days.find(d => d.date === ds);
        if (day) day.total += Number(e.amount);
    });
    const max = Math.max(...days.map(d => d.total), 1);

    return (
        <div style={{ padding: '6px 2px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {days.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                            width: '100%', borderRadius: 6,
                            background: d.total > 0 ? '#202020' : 'var(--border)',
                            height: `${Math.max((d.total / max) * 64, d.total > 0 ? 8 : 4)}px`,
                            transition: 'height 0.6s cubic-bezier(.4,0,.2,1)',
                        }} />
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{d.label}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>Last 7 days</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#202020' }}>
                    ₹{formatCurrency(days.reduce((s, d) => s + d.total, 0))} total
                </span>
            </div>
        </div>
    );
}

// ── Category breakdown sheet content ─────────────────────────────────────────
function CategoryBreakdown({ breakdown, spent }) {
    if (breakdown.length === 0) return (
        <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 14 }}>
            No expenses recorded yet.
        </p>
    );
    return (
        <div>
            {breakdown.map((item, idx) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.General;
                const pct = spent > 0 ? (item.total / spent) * 100 : 0;
                return (
                    <div key={item.category} style={{
                        padding: '16px 2px',
                        borderBottom: idx !== breakdown.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: meta.bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: meta.color, flexShrink: 0,
                            }}>
                                {meta.icon}
                            </div>
                            <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                                {item.category}
                            </span>
                            <span style={{ fontSize: 17, fontWeight: 600, color: '#202020' }}>
                                ₹{formatCurrency(item.total)}
                            </span>
                            <span style={{
                                fontSize: 10, fontWeight: 700,
                                background: '#c9f158',
                                color: '#202020',
                                padding: '2px 8px', borderRadius: 99,
                                minWidth: 38, textAlign: 'center',
                            }}>
                                {pct.toFixed(0)}%
                            </span>
                        </div>
                        <div style={{ height: 12, width: '84%', background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${pct}%`,
                                background: meta.color, borderRadius: 99,
                                transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                            }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function InsightContent({ percentSpent, breakdown, spent, budget, savedPct }) {
    const insights = [
        percentSpent > 80
            ? { icon: <AlertTriangle size={18} />, iconBg: '#FEF2F2', iconColor: '#EF4444', title: 'Nearing limit', body: `You've used ${Math.round(percentSpent)}% of your budget. Ease up this month.`, bg: '#FEF2F2' }
            : percentSpent > 50
                ? { icon: <TrendingUp size={18} />, iconBg: '#FFF7ED', iconColor: '#D97706', title: 'Halfway through', body: `Half your budget is mapped. Stay consistent.`, bg: '#FFF7ED' }
                : { icon: <CheckCircle size={18} />, iconBg: '#F0FDF4', iconColor: '#059669', title: 'Looking great!', body: `Well within your ₹${formatCurrency(budget)} budget.`, bg: '#F0FDF4' },
        breakdown[0] && {
            icon: <TrendingUp size={18} />, iconBg: '#EEF2FF', iconColor: '#202020',
            title: 'Top category',
            body: `${breakdown[0].category} accounts for ₹${formatCurrency(breakdown[0].total)} — ${((breakdown[0].total / spent) * 100).toFixed(0)}% of all spending.`,
            bg: '#EEF2FF',
        },
        {
            icon: <PiggyBank size={18} />, iconBg: '#F0FDF4', iconColor: '#059669',
            title: 'Saved so far',
            body: `You've preserved ${savedPct.toFixed(0)}% of your budget (₹${formatCurrency(Math.max(0, budget - spent))}).`,
            bg: '#F0FDF4',
        },
        breakdown.length > 1 && {
            icon: <LayoutGrid size={18} />, iconBg: '#F8FAFC', iconColor: '#475569',
            title: 'Spread',
            body: `Your spending spans ${breakdown.length} categories. ${breakdown.length > 3 ? 'Diversified.' : 'Fairly focused.'}`,
            bg: '#F8FAFC',
        },
    ].filter(Boolean);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map((ins, i) => (
                <div key={i} style={{
                    background: ins.bg,
                    borderRadius: 16, padding: '14px 16px',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: ins.iconBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: ins.iconColor,
                    }}>
                        {ins.icon}
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#202020', marginBottom: 3 }}>{ins.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{ins.body}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Analytics row button ──────────────────────────────────────────────────────
function AnalyticsBtn({ icon, label, sub, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: '#ffffff',
                borderRadius: 20,
                padding: '11px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                transition: 'transform 0.12s, background 0.12s',
                marginBottom: 12,
            }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
            <div style={{
                width: 48, height: 48,
                background: '#ffffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#202020', flexShrink: 0,
            }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#202020' }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
            </div>
            <ChevronRight size={26} color="var(--text-3)" />
        </div>
    );
}


export default function Dashboard() {
    const { user, getSpentThisMonth, expenses, setCurrentScreen } = useApp();

    const [openSheet, setOpenSheet] = useState(null); // 'category' | 'trend' | 'insights'

    const spent = getSpentThisMonth();
    const left = user.budget - spent;
    const percentSpent = user.budget > 0 ? Math.min((spent / user.budget) * 100, 100) : 0;
    const isOver = left < 0;
    const savedPct = Math.max(0, 100 - percentSpent);

    const validCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'General'];
    const breakdown = validCategories.map(cat => ({
        category: cat,
        total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
    })).filter(b => b.total > 0).sort((a, b) => b.total - a.total);

    const topCat = breakdown[0]?.category || '—';

    return (
        <>
            {/* Top bar */}
            <div className="top-bar">
                <div className="icon-btn" onClick={() => setCurrentScreen('home')}>
                    <ChevronLeft size={20} strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div className="greeting" style={{ fontSize: 20 }}>Dashboard</div>
                </div>
                <div style={{ width: 38 }} />
            </div>

            <div className="dash-content">
                <div style={{
                    background: '#ffffff',
                    borderRadius: 34,
                    padding: '22px 20px 20px',
                    marginTop: 14,
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', bottom: -20, left: 10, width: 100, height: 100, borderRadius: '50%', background: 'rgba(201,241,88,0.08)', pointerEvents: 'none' }} />

                    <div style={{ fontSize: 11, fontWeight: 600, color: '#202020', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 12 }}>
                        Spent this month
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#202020', letterSpacing: '-1px' }}>
                            ₹{formatCurrency(spent)}
                        </div>
                        <div style={{ fontSize: 15, color: '#202020', fontWeight: 600 }}>
                            of ₹{formatCurrency(user.budget)}
                        </div>
                    </div>

                    <div style={{ height: 12, width: '92%', background: 'rgba(0, 0, 0, 0.09)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{
                            height: '100%',
                            width: `${percentSpent}%`,
                            background: isOver ? '#EF4444' : '#c9f158',
                            borderRadius: 99,
                            transition: 'width 1s cubic-bezier(.4,0,.2,1)',
                            boxShadow: isOver ? '0 0 8px rgba(239,68,68,0.6)' : '0 0 8px rgba(201,241,88,0.5)',
                        }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: isOver ? '#202020' : '#ffffff',
                            background: isOver ? '#EF4444' : '#c8f158c4',
                            padding: '3px 10px', borderRadius: 99,
                        }}>
                            {Math.round(percentSpent)}% used
                        </span>
                    </div>
                </div>


                <div className="section-header" style={{ marginTop: 24 }}>
                    <div className="section-title">Totals</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {[
                        { label: 'Budget', value: `₹${formatCurrency(user.budget)}`, vc: '#059668e0' },
                        { label: 'Spent', value: `₹${formatCurrency(spent)}`, vc: '#ef4444c9' },
                        { label: 'Saved', value: `${savedPct.toFixed(0)}%`, vc: '#202020' },
                    ].map(s => (
                        <div key={s.label} style={{
                            flex: 1, background: '#ffffff',
                            borderRadius: 18, padding: '12px 14px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: s.vc }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                <div className="section-header" style={{ marginTop: 34 }}>
                    <div className="section-title">For you</div>
                </div>
                <AnalyticsBtn
                    icon={<PieChart size={22} />}
                    label="Category Breakdown"
                    sub={breakdown.length > 0 ? `Top: ${topCat} · ${breakdown.length} categories` : 'No data yet'}
                    onClick={() => setOpenSheet('category')}
                />
                <AnalyticsBtn
                    icon={<BarChart2 size={22} />}
                    label="7-Day Spending Trend"
                    onClick={() => setOpenSheet('trend')}
                />
                <AnalyticsBtn
                    icon={<Lightbulb size={22} />}
                    label="Spend Insights"
                    sub={percentSpent > 80 ? '⚠ Action needed' : percentSpent > 50 ? 'On track' : 'All good'}
                    onClick={() => setOpenSheet('insights')}
                />
                <AnalyticsBtn
                    icon={<LineChart size={22} />}
                    label="Balance Chart"
                    onClick={() => setOpenSheet('chart')}
                />

                <div style={{ height: 32 }} />
            </div>

            {/* ── Category sheet ── */}
            <BottomSheet
                isOpen={openSheet === 'category'}
                onClose={() => setOpenSheet(null)}
                title="Category Breakdown"
            >
                <CategoryBreakdown breakdown={breakdown} spent={spent} />
            </BottomSheet>

            {/* ── Trend sheet ── */}
            <BottomSheet
                isOpen={openSheet === 'trend'}
                onClose={() => setOpenSheet(null)}
                title="7-Day Spending Trend"
            >
                <SpendingTrendChart expenses={expenses} />
            </BottomSheet>

            {/* ── Insights sheet ── */}
            <BottomSheet
                isOpen={openSheet === 'insights'}
                onClose={() => setOpenSheet(null)}
                title="Spend Insights"
            >
                <InsightContent
                    percentSpent={percentSpent}
                    breakdown={breakdown}
                    spent={spent}
                    budget={user.budget}
                    savedPct={savedPct}
                />
            </BottomSheet>

            {/* ── Balance Chart sheet ── */}
            <BottomSheet
                isOpen={openSheet === 'chart'}
                onClose={() => setOpenSheet(null)}
                title="Balance Chart"
            >
                <ExpenseChart expenses={expenses} budget={user.budget} />
            </BottomSheet>
        </>
    );
}