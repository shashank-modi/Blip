import { useEffect, useState } from 'react';
import { Receipt, ArrowLeftRight, WalletMinimal as Wallet, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../lib/api';
import BottomSheet from '../components/BottomSheet';
import PushSettings from '../components/PushSettings';
import '../social.css';

export default function Activity() {
    const { user, notifications, notificationError, refreshNotifications, markNotificationsRead } = useApp();
    const [selected, setSelected] = useState(null);
    const [older, setOlder] = useState([]);
    const [filter, setFilter] = useState('All');
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => { refreshNotifications(); }, [refreshNotifications]);
    const items = [...new Map([...older, ...notifications].map(item => [item.id, item])).values()].sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    const scope = item => item.metadata?.scope === 'wallet' ? 'Wallet' : item.metadata?.groupId ? 'Groups' : 'Friends';
    const filtered = items.filter(item => filter === 'All' || scope(item) === filter);
    let previousDay;
    return <div className="activity-page">
        <header className="activity-heading"><div><h1>Activity<span className="brand-dot">.</span></h1><p>Every bill. Every split. Every settlement.</p></div><button aria-label="Refresh activity" disabled={loading} onClick={refreshNotifications}>↻</button></header>
        <PushSettings />
        <div className="activity-filters">{['All','Friends','Groups','Wallet'].map(label => <button className={filter === label ? 'active' : ''} key={label} onClick={() => setFilter(label)}>{label}</button>)}</div>
        {items.some(item => !item.read_at) && <button className="mark-seen-button" onClick={async () => { const ids = items.filter(item => !item.read_at).slice(0,100).map(item => item.id); if (await markNotificationsRead(ids)) setOlder(previous => previous.map(item => ids.includes(item.id) ? { ...item, read_at: new Date().toISOString() } : item)); }}>Mark updates as seen</button>}
        {(notificationError || error) && <p role="alert">{notificationError || error}</p>}
        {filtered.length === 0 && <div className="activity-empty">Nothing here yet.<br />Add a bill or settle up and your story starts here.</div>}
        {filtered.map(item => {
            const day = new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
            const showDay = day !== previousDay; previousDay = day;
            const Icon = item.type.startsWith('settlement') ? ArrowLeftRight : item.metadata?.scope === 'wallet' ? Wallet : item.type.startsWith('group') ? Users : Receipt;
            const message = item.actor_id === user.id && item.actor_name && item.message.startsWith(item.actor_name) ? `You${item.message.slice(item.actor_name.length)}` : item.message;
            return <div key={item.id}>{showDay && <div className="activity-day">{day}</div>}<article className="activity-entry">
                <div className="activity-icon"><Icon size={18} /></div><div style={{ flex: 1, minWidth: 0 }}><p>{message.replaceAll('₹','Rs. ')}</p><small className="activity-scope">{item.metadata?.groupName || scope(item)}</small>{item.metadata?.amount != null && <strong>Rs. {Number(item.metadata.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>}<time>{new Date(item.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</time><button className="activity-detail-link" onClick={()=>setSelected(item)}>View details</button></div>{!item.read_at && <span className="activity-unread" aria-label="New activity" />}
            </article></div>;
        })}
        {hasMore && items.length >= 50 && <button disabled={loading} className="totals-toggle" onClick={async () => {
            setLoading(true); setError('');
            try { const page = await api.getNotifications(items[items.length - 1]); setOlder(previous => [...previous, ...page]); setHasMore(page.length === 50); }
            catch (err) { setError(err.message); }
            finally { setLoading(false); }
        }}>{loading ? 'Loading…' : 'Load older activity'}</button>}
        <BottomSheet isOpen={Boolean(selected)} onClose={()=>setSelected(null)} title="Activity details">
            {selected && <div className="activity-details">
                <span className="activity-scope">{selected.metadata?.groupName || scope(selected)}</span>
                <h3>{selected.metadata?.description || selected.type.replaceAll('_',' ')}</h3>
                {selected.metadata?.amount != null && <strong className="activity-detail-amount">Rs. {Number(selected.metadata.amount).toLocaleString('en-IN',{maximumFractionDigits:2})}</strong>}
                <p>{selected.message.replaceAll('₹','Rs. ')}</p>
                <dl><div><dt>Recorded</dt><dd>{new Date(selected.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</dd></div>
                <div><dt>Recorded by</dt><dd>{selected.actor_id===user.id?'You':selected.actor_name || 'Former member'}</dd></div>
                {selected.metadata?.category && <div><dt>Category</dt><dd>{selected.metadata.category}</dd></div>}
                {(selected.metadata?.payerName || selected.metadata?.paidByName) && <div><dt>Paid by</dt><dd>{selected.metadata.payerName || selected.metadata.paidByName}</dd></div>}
                {selected.metadata?.receiverName && <div><dt>Paid to</dt><dd>{selected.metadata.receiverName}</dd></div>}
                </dl>
                {selected.metadata?.splits?.length > 0 && <><h4>Split at the time</h4>{selected.metadata.splits.map(person=><div className="split-person" key={person.userId}><span>{person.userId===user.id?'You':person.name}</span><strong>Rs. {Number(person.amount).toLocaleString('en-IN')}</strong></div>)}</>}
            </div>}
        </BottomSheet>
    </div>;
}
