import React from 'react';
import { getOrdinal } from '../utils/format';

export function getDaySuffix(day) {
    const d = Number(day);
    if (d >= 11 && d <= 13) return 'th';
    switch (d % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

export default function DayInput({ value, onChange }) {
    const now = new Date();
    const monthName = now.toLocaleString('en-IN', { month: 'long' });
    const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const numVal = parseInt(value, 10);
    const isOver = numVal > maxDay;
    const isValid = numVal >= 1 && numVal <= maxDay;

    const handleChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        if (raw === '') { onChange(''); return; }
        onChange(String(Math.min(parseInt(raw, 10), 31)));
    };
    const handleBlur = () => {
        if (numVal > maxDay) onChange(String(maxDay));
        if (numVal < 1 || isNaN(numVal)) onChange('1');
    };

    return (
        <div className="form-field" style={{ flex: 1 }}>
            <div className="form-label">Due on day</div>
            <div style={{ position: 'relative' }}>
                <input
                    className="form-input"
                    inputMode="numeric"
                    placeholder="e.g. 5"
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ borderColor: isOver ? 'var(--danger)' : undefined, paddingRight: isValid ? 44 : 14 }}
                />
                {isValid && (
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: 'var(--indigo)', pointerEvents: 'none' }}>
                        {getDaySuffix(numVal)}
                    </span>
                )}
            </div>
            <div style={{ marginTop: 5, fontSize: 11, fontWeight: 500 }}>
                {isOver
                    ? <span style={{ color: 'var(--danger)' }}>⚠ {monthName} only has {maxDay} days — will clamp to {maxDay}{getDaySuffix(maxDay)}</span>
                    : isValid
                        ? <span style={{ color: 'var(--text-3)' }}>Every {numVal}{getDaySuffix(numVal)} of the month</span>
                        : <span style={{ color: 'var(--text-3)' }}>1 – {maxDay} for {monthName}</span>
                }
            </div>
        </div>
    );
}
