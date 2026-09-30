import { useEffect, useRef, useState } from 'react';
import { ArrowDown, RefreshCw, Check, CircleAlert } from 'lucide-react';
import { attachPullToRefresh, REFRESH_THRESHOLD } from '../utils/pullToRefresh';

export default function RefreshablePage({ children, className = '', onRefresh, disabled = false, resetKey }) {
    const scrollRef = useRef(null);
    const latest = useRef({ onRefresh, disabled });
    const [distance, setDistance] = useState(0);
    const [phase, setPhase] = useState('idle');
    useEffect(() => { latest.current = { onRefresh, disabled }; }, [onRefresh, disabled]);
    useEffect(() => {
        let active = true;
        let hideTimer;
        setDistance(0);
        setPhase('idle');
        const cleanup = attachPullToRefresh(scrollRef.current, {
            canStart: () => !latest.current.disabled,
            onPull: value => {
                if (!active) return;
                setDistance(value);
                if (value > 0) { clearTimeout(hideTimer); setPhase('idle'); }
            },
            onRefresh: async () => {
                if (!navigator.onLine) throw new Error('You’re offline');
                setPhase('refreshing');
                const success = await latest.current.onRefresh();
                if (success === false) throw new Error('Could not refresh');
                if (!active) return;
                setPhase('done');
                hideTimer = setTimeout(() => { if (active) setPhase('idle'); }, 1000);
            },
            onError: () => {
                if (!active) return;
                setPhase('error');
                hideTimer = setTimeout(() => { if (active) setPhase('idle'); }, 2200);
            },
        });
        return () => { active = false; clearTimeout(hideTimer); cleanup(); };
    }, [resetKey]);
    const ready = distance >= REFRESH_THRESHOLD;
    const visible = distance > 8 || phase !== 'idle';
    const label = phase === 'refreshing' ? 'Refreshing…' : phase === 'done' ? 'Up to date' : phase === 'error' ? (navigator.onLine ? 'Couldn’t refresh. Pull to retry.' : 'You’re offline') : ready ? 'Release to refresh' : 'Pull to refresh';
    return <div className="pages refresh-page">
        <div className={`pull-refresh${visible ? ' is-visible' : ''}${ready || phase === 'done' ? ' is-ready' : ''}`} role="status" aria-live="polite" aria-atomic="true">
            <span className="pull-refresh-icon" aria-hidden="true">{phase === 'refreshing' ? <RefreshCw size={17} className="refresh-spin"/> : phase === 'done' ? <Check size={17}/> : phase === 'error' ? <CircleAlert size={17}/> : <ArrowDown size={17} style={{transform:ready ? 'rotate(180deg)' : undefined}}/>}</span>
            <span>{visible ? label : ''}</span>
        </div>
        <main ref={scrollRef} className={`screen app-screen ${className}`} aria-busy={phase === 'refreshing'}>{children}</main>
    </div>;
}
