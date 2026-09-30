import DateField from './DateField';
import React, { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import { Coffee, Car, ShoppingBag, Grid, Home as HomeIcon, Clapperboard, Hospital, Receipt, BookHeart, ChevronDown } from 'lucide-react';

const catMap = [
    { name: 'Food', icon: <Coffee size={20} /> },
    { name: 'Transport', icon: <Car size={20} /> },
    { name: 'Shopping', icon: <ShoppingBag size={20} /> },
    { name: 'Housing', icon: <HomeIcon size={20} /> },
    { name: 'Entertainment', icon: <Clapperboard size={20} /> },
    { name: 'Medical', icon: <Hospital size={20} /> },
    { name: 'Bills', icon: <Receipt size={20} /> },
    { name: 'Personal Care', icon: <BookHeart size={20} /> }
];

export default function EditExpenseSheet({ isOpen, onClose, expense, onSave }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && expense) {
            setError('');
            setAmount(expense.amount || '');
            setDescription(expense.description || '');
            setCategory(expense.category || 'General');
            if (expense.date) {
                // Ensure format YYYY-MM-DD for date input
                const d = new Date(expense.date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setDate(`${year}-${month}-${day}`);
            } else {
                setDate('');
            }
        }
    }, [isOpen, expense]);

    const valid = Number.isFinite(Number(amount)) && Number(amount)>0 && Math.abs(Number(amount)*100-Math.round(Number(amount)*100))<.000001 && description.trim() && date;
    const handleSave = async () => {
        if (!valid || saving) return;
        setSaving(true); setError('');
        try {
            const success = await onSave({ amount:Number(amount), description:description.trim(), category, date:new Date(`${date}T12:00:00`).toISOString() });
            if (success === false) setError('Could not save your changes. Please try again.');
            else onClose();
        } catch (err) { setError(err.message || 'Could not save your changes.'); }
        finally { setSaving(false); }
    };

    return <BottomSheet isOpen={isOpen} onClose={()=>{if(!saving)onClose();}} title="Edit transaction">
        <div className="wallet-panel">
            <div className="panel-intro"><span className="panel-icon"><Receipt size={22}/></span><div><h3>Keep the details right</h3><p>Changes update your Wallet and spending totals.</p></div></div>
            <label className="panel-field"><span>Description</span><input aria-label="Description" placeholder="What was this for?" value={description} onChange={event=>setDescription(event.target.value)} maxLength={200}/></label>
            <label className="payment-amount"><span>Amount · Rupees</span><div><b>Rs.</b><input aria-label="Amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={event=>setAmount(event.target.value)}/></div></label>
            <DateField value={date} onChange={setDate}/>
            <details className="panel-disclosure"><summary><span>Category</span><strong>{category}</strong><ChevronDown size={16}/></summary><div className="panel-choices">{[...catMap,{name:'General',icon:<Grid size={20}/>},{name:'Income',icon:<Receipt size={20}/>}].map(item=><button type="button" key={item.name} aria-pressed={category===item.name} onClick={()=>setCategory(item.name)}>{item.icon}<span>{item.name}</span></button>)}</div></details>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button-primary" disabled={!valid || saving} onClick={handleSave}>{saving?'Saving…':'Save changes'}</button>
        </div>
    </BottomSheet>;
}
