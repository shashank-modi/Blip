import React, { useMemo } from 'react';

export default function ExpenseChart({ expenses, budget = 0 }) {
    const { points, polyPoints } = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const today = now.getDate();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Arrays for daily aggregates
        const dailyIncome = Array.from({ length: daysInMonth }, () => 0);
        const dailyExpense = Array.from({ length: daysInMonth }, () => 0);
        let totalIncomeThisMonth = 0;

        expenses.forEach(exp => {
            const ed = new Date(exp.date);
            if (ed.getFullYear() === currentYear && ed.getMonth() === currentMonth) {
                const day = ed.getDate();
                if (day >= 1 && day <= daysInMonth) {
                    if (exp.category === 'Income') {
                        dailyIncome[day - 1] += Number(exp.amount) || 0;
                        totalIncomeThisMonth += Number(exp.amount) || 0;
                    } else {
                        dailyExpense[day - 1] += Number(exp.amount) || 0;
                    }
                }
            }
        });

        const baseBudget = Math.max(0, budget - totalIncomeThisMonth);

        let runningIncome = 0;
        let runningExpense = 0;
        const cumulativeData = Array.from({ length: daysInMonth }, (_, i) => {
            runningIncome += dailyIncome[i];
            runningExpense += dailyExpense[i];
            const balance = baseBudget + runningIncome - runningExpense;
            return { day: i + 1, balance };
        });

        // Compute max and min
        const maxBalance = Math.max(...cumulativeData.map(d => d.balance), budget || 100);
        const minBalance = Math.min(0, ...cumulativeData.map(d => d.balance));
        const range = (maxBalance - minBalance) || 100;
        const w = 300, h = 80;

        const plotData = cumulativeData.filter(d => d.day <= today);

        const pts = plotData.map((d) => {
            const x = ((d.day - 1) / (daysInMonth - 1)) * w;
            const y = h - ((d.balance - minBalance) / range) * h;
            return `${x},${y}`;
        }).join(' ');

        const lastX = plotData.length > 0 ? ((plotData[plotData.length - 1].day - 1) / (daysInMonth - 1)) * w : 0;
        // Baseline for polygon should be the minimum visual point (h)
        const polyPts = `0,${h} ${pts} ${lastX},${h}`;

        return { points: pts, polyPoints: polyPts };
    }, [expenses, budget]);

    return (
        <div style={{ background: 'var(--surface-color)', padding: '16px 20px', borderRadius: '16px', marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Total Balance</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '12px' }}>This Month</div>
            </div>

            <div style={{ width: '100%', height: '80px', position: 'relative' }}>
                <svg viewBox="0 0 300 80" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgba(79, 70, 229, 0.2)" />
                            <stop offset="100%" stopColor="rgba(79, 70, 229, 0)" />
                        </linearGradient>
                    </defs>
                    <polygon
                        points={polyPoints}
                        fill="url(#chartGradient)"
                    />
                    <polyline
                        points={points}
                        fill="none"
                        stroke="var(--indigo)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'drop-shadow(0 4px 6px rgba(79, 70, 229, 0.4))' }}
                    />
                </svg>

                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '1px dashed rgba(0,0,0,0.05)' }}></div>
                <div style={{ position: 'absolute', top: 40, left: 0, right: 0, borderTop: '1px dashed rgba(0,0,0,0.05)' }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid rgba(0,0,0,0.05)' }}></div>
            </div>
        </div>
    );
}
