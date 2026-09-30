import { CalendarDays } from 'lucide-react';
export default function DateField({ value, onChange, label = 'Expense date' }) {
    return <label className="date-field"><span className="date-icon"><CalendarDays size={19} /></span><span><span className="date-label">{label}</span><input type="date" aria-label={label} value={value} onChange={event => onChange(event.target.value)} required /></span></label>;
}
