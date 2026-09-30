import { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import BottomSheet from './BottomSheet';
import DatePicker from './DatePicker';
export default function DateField({ value, onChange, label = 'Expense date' }) {
    const [open,setOpen]=useState(false);
    const date=value?new Date(`${value}T12:00:00`):null;
    return <><button type="button" className="date-field date-field-button" aria-label={label} aria-haspopup="dialog" onClick={()=>setOpen(true)}><span className="date-icon"><CalendarDays size={19}/></span><span><span className="date-label">{label}</span><strong>{date && !Number.isNaN(date.getTime())?date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Choose a date'}</strong></span><ChevronDown size={16}/></button><BottomSheet isOpen={open} onClose={()=>setOpen(false)} title={label}><DatePicker value={value} onChange={next=>{onChange(next);setOpen(false);}}/></BottomSheet></>;
}
