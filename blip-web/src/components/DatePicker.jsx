import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { localDate } from '../utils/splits';

export default function DatePicker({value,onChange}) {
    const selected = value ? new Date(`${value}T12:00:00`) : new Date();
    const [month,setMonth] = useState(()=>new Date(selected.getFullYear(),selected.getMonth(),1,12));
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const offset = (month.getDay()+6)%7;
    const days = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    const choose = date => onChange(localDate(date));
    return <div className="date-picker">
        <div className="date-shortcuts">{[['Today',today],['Yesterday',yesterday]].map(([label,date])=><button type="button" key={label} aria-pressed={value===localDate(date)} onClick={()=>choose(date)}>{label}<small>{date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</small></button>)}</div>
        <div className="calendar-heading"><button type="button" aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1,12))}><ChevronLeft size={20}/></button><strong aria-live="polite">{month.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</strong><button type="button" aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1,12))}><ChevronRight size={20}/></button></div>
        <div className="calendar-days" role="group" aria-label="Choose a date">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span className="calendar-weekday" key={day}>{day}</span>)}
            {Array.from({length:offset},(_,i)=><span key={`empty-${i}`}/>)}
            {Array.from({length:days},(_,i)=>{const date=new Date(month.getFullYear(),month.getMonth(),i+1,12);const iso=localDate(date);return <button type="button" key={iso} aria-label={date.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})} aria-pressed={value===iso} aria-current={localDate(today)===iso?'date':undefined} onClick={()=>choose(date)}>{i+1}</button>;})}
        </div>
    </div>;
}
