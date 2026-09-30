import { useEffect, useState } from 'react';
import { api } from '../lib/api';
const money = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export default function GroupTotals({ totals, groupId, userId }) {
    const [period,setPeriod] = useState('all');
    const [filtered,setFiltered] = useState(null);
    const [loading,setLoading] = useState(false);
    const [error,setError] = useState('');
    const [retry,setRetry] = useState(0);
    useEffect(()=>{
        let cancelled=false;
        setError('');setFiltered(null);
        if(period==='all'){setLoading(false);return;}
        const now=new Date();
        const from=new Date(now.getFullYear(),period==='month'?now.getMonth():0,1);
        const to=new Date(now.getFullYear()+(period==='year'?1:0),period==='month'?now.getMonth()+1:0,1);
        setLoading(true);
        api.getGroupTotals(groupId,{from:from.toISOString(),to:to.toISOString()})
            .then(data=>{if(!cancelled)setFiltered(data);})
            .catch(err=>{if(!cancelled)setError(err.message||'Could not load totals');})
            .finally(()=>{if(!cancelled)setLoading(false);});
        return ()=>{cancelled=true;};
    },[groupId,period,totals,retry]);
    const data=period==='all'?totals:filtered;
    const mine=data?.members.find(member=>member.id===userId);
    return <section className="group-totals totals-dialog">
        <div className="filter-pills totals-periods" role="group" aria-label="Totals period">{[['month','This month'],['year','This year'],['all','All time']].map(([id,label])=><button key={id} className={period===id?'active':''} aria-pressed={period===id} onClick={()=>setPeriod(id)}>{label}</button>)}</div>
        {loading && <p role="status" className="field-help">Loading totals…</p>}
        {error && <div role="alert"><p className="form-error">{error}</p><button className="button-secondary" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>}
        {!loading && !error && data && <>
            <div className="trip-total">Rs. {money(data.total)}<span>Total group spending · {data.count} expense{data.count===1?'':'s'}</span></div>
            <div className="trip-my-totals"><div><span>Your share</span><strong>Rs. {money(mine?.share)}</strong></div><div><span>You paid</span><strong>Rs. {money(mine?.paid)}</strong></div></div>
            <div className="contribution-heading"><span>Everyone’s contributions</span><span>Paid / Share</span></div>
            {data.members.map(member=><div className="contribution" key={member.id}><div><strong>{member.id===userId?'You':member.name}</strong><small>Settlements: Rs. {money(member.settlements_paid)} paid · Rs. {money(member.settlements_received)} received</small></div><div><strong>Rs. {money(member.paid)}</strong><small>Rs. {money(member.share)}</small></div></div>)}
            <p className="field-help">Based on bill dates in the selected period. Settlements are separate and don’t increase group spending. Use Settle up to see current outstanding balances across all dates.</p>
        </>}
        {!loading&&!error&&!data&&<p className="field-help">Totals will appear once the group finishes loading.</p>}
    </section>;
}
