import { useEffect, useState } from 'react';
import { ArrowDown, Check, ArrowLeftRight } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useApp } from '../store/AppContext';

const money = value => Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export default function SettleSheet({ isOpen, onClose, name, friendId, members, totalOwed = 0, onConfirm }) {
    const { user } = useApp();
    const people = members || [{ id: user.id, name: 'You' }, { id: friendId, name }];
    const [payer, setPayer] = useState('');
    const [receiver, setReceiver] = useState('');
    const [amount, setAmount] = useState('');
    const [pick, setPick] = useState(null);
    const [wallet, setWallet] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const otherId = friendId || members?.find(person => person.id !== user.id)?.id;
    useEffect(() => {
        if (!isOpen) return;
        setPayer(totalOwed > 0 ? otherId : user.id);
        setReceiver(totalOwed > 0 ? user.id : otherId);
        setAmount(totalOwed ? String(Math.abs(totalOwed)) : '');
        setPick(null); setWallet(false); setError('');
    }, [isOpen, totalOwed, user.id, otherId]);
    const label = id => id === user.id ? 'You' : people.find(person => person.id === id)?.name || 'Choose a person';
    const parsed = Number(amount);
    const valid = payer && receiver && payer !== receiver && parsed > 0 && parsed <= 99999999.99 && Number.isFinite(parsed) && Math.abs(parsed * 100 - Math.round(parsed * 100)) < 0.000001;
    const after = Number(totalOwed) + (payer === user.id ? parsed : -parsed);
    return <BottomSheet isOpen={isOpen} onClose={onClose} title="Record a payment">
        <div className="payment-form">
            <p className="field-help">Record money already paid. {members ? 'Any group member' : 'Either person'} can record a payment; no money is sent through Blip.</p>
            <div className="payment-people">
                <button disabled={busy} onClick={() => setPick(pick === 'payer' ? null : 'payer')} aria-expanded={pick === 'payer'}><small>Paid by</small><strong>{label(payer)}</strong></button>
                <button className="payment-swap" disabled={busy} aria-label="Swap payer and receiver" onClick={() => { setPayer(receiver); setReceiver(payer); }}><ArrowLeftRight size={18}/></button>
                <button disabled={busy} onClick={() => setPick(pick === 'receiver' ? null : 'receiver')} aria-expanded={pick === 'receiver'}><small>Paid to</small><strong>{label(receiver)}</strong></button>
            </div>
            {pick && <div className="payment-options" aria-label={pick === 'payer' ? 'Choose payer' : 'Choose recipient'}>{people.filter(person => person.id !== (pick === 'payer' ? receiver : payer)).map(person => <button key={person.id} onClick={() => { (pick === 'payer' ? setPayer : setReceiver)(person.id); setPick(null); }}><span>{label(person.id)}</span>{person.id === (pick === 'payer' ? payer : receiver) && <Check size={16}/>}</button>)}</div>}
            <label className="payment-amount"><span>Amount · Rupees</span><div><b>Rs.</b><input aria-label="Settlement amount" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" placeholder="0.00" value={amount} disabled={busy} onChange={event => setAmount(event.target.value)}/></div></label>
            {!members && <div className="payment-preview"><span>Current balance</span><strong>{totalOwed === 0 ? 'Settled up' : `${totalOwed > 0 ? `${name} owes you` : `You owe ${name}`} Rs. ${money(totalOwed)}`}</strong>{valid && <><ArrowDown size={14}/><span>After this payment</span><strong>{Math.abs(after) < .005 ? 'Settled up' : `${after > 0 ? `${name} owes you` : `You owe ${name}`} Rs. ${money(after)}`}</strong></>}</div>}
            <p className="field-help">Pay any amount, including part of a balance or an advance. Extra payments stay as credit in your balances.</p>
            {[payer, receiver].includes(user.id) && <label className="payment-wallet"><input type="checkbox" checked={wallet} disabled={busy} onChange={event => setWallet(event.target.checked)}/><span>Also record in my Wallet<small>{payer === user.id ? 'As an expense' : 'As income'}</small></span></label>}
            {error && <p className="push-error" role="alert">{error}</p>}
            <button className="button-primary" disabled={!valid || busy} onClick={async () => {
                setBusy(true); setError('');
                try { await onConfirm(parsed, wallet && [payer,receiver].includes(user.id), payer, receiver); }
                catch (err) { setError(err.message || 'Could not record this payment. Try again.'); }
                finally { setBusy(false); }
            }}>{busy ? 'Recording…' : 'Record payment'}</button>
        </div>
    </BottomSheet>;
}
