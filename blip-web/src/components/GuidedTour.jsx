import { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';

const tourSteps = [
    {
        target: 'tour-nlp',
        title: 'Log in seconds',
        text: 'Type "pizza 150" or "150 pizza" — Blip figures out the rest. Amount first or last, either works. Hit enter and it\'s logged.',
        position: 'bottom',
        step: '01',
    },
    {
        target: 'tour-scheduled-payment',
        title: 'Scheduled payments',
        text: 'Your recurring bills live here. Tap one to mark it paid — Blip logs the expense and tracks it against your budget automatically.',
        position: 'bottom',
        step: '02',
    },
    {
        target: 'tour-shopping-list',
        title: 'Shopping list',
        text: 'Add items before you go. When you buy something, tap it — Blip asks how much you spent and logs it as an expense instantly.',
        position: 'bottom',
        step: '03',
    },
    {
        target: 'tour-transaction-console',
        title: 'Recent transactions',
        text: 'Swipe left to delete. Swipe right to edit. Your most recent expenses are always one scroll away.',
        position: 'bottom',
        step: '04',
    },
    {
        target: 'tour-dashboard',
        title: 'Your budget at a glance',
        text: 'See how much you\'ve spent versus your monthly limit. The breakdown by category tells you exactly where your money is going.',
        position: 'bottom',
        step: '05',
    },
];

export default function GuidedTour({ onComplete }) {
    const [step, setStep] = useState(0);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [visible, setVisible] = useState(false);

    // 1. SAFETY: If for some reason steps are missing, don't crash
    const current = tourSteps[step] || tourSteps[0];
    const isLast = step === tourSteps.length - 1;
    const progress = ((step + 1) / tourSteps.length) * 100;

    useEffect(() => {
        setVisible(false);

        const updateCoords = () => {
            const el = document.getElementById(current.target);
            const root = document.getElementById('root');

            // 2. SAFETY: Check if BOTH the target and the root exist
            if (el && root) {
                const rect = el.getBoundingClientRect();
                const rootRect = root.getBoundingClientRect();
                setCoords({
                    top: rect.top - rootRect.top,
                    left: rect.left - rootRect.left,
                    width: rect.width,
                    height: rect.height
                });
                setVisible(true);
            } else {
                // 3. LOGGING: This will tell us exactly which ID is missing
                console.warn(`Target not found`);
            }
        };

        // Delay execution slightly to ensure DOM is painted
        const timer = setTimeout(updateCoords, 100);
        return () => clearTimeout(timer);
    }, [step, current.target]);

    // 4. SAFETY: Fallback values if coords aren't set yet
    const spotX = (coords.left + coords.width / 2) || 0;
    const spotY = (coords.top + coords.height / 2) || 0;
    const spotR = (Math.max(coords.width, coords.height) / 2 + 15) || 0;

    const handleNext = () => {
        if (isLast) {
            onComplete();
        } else {
            setStep(s => s + 1);
        }
    };

    // 5. If not visible yet, render nothing (prevents the 'flash' of wrong position)
    if (!visible) return null;

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10000, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.8)',
                maskImage: `radial-gradient(circle ${spotR}px at ${spotX}px ${spotY}px, transparent 100%, black 100%)`,
                WebkitMaskImage: `radial-gradient(circle ${spotR}px at ${spotX}px ${spotY}px, transparent 100%, black 100%)`,
                pointerEvents: 'auto',
            }} />

            {/* Tooltip Card */}
            <div style={{
                position: 'absolute',
                top: current.position === 'bottom' ? coords.top + coords.height + 20 : 'auto',
                bottom: current.position === 'top' ? `calc(100% - ${coords.top}px + 20px)` : 'auto',
                left: '50%', transform: 'translateX(-50%)',
                width: 'calc(100% - 40px)', maxWidth: 320,
                background: '#202020', padding: '24px', borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                pointerEvents: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
                <h3 style={{ fontWeight: 800, marginBottom: 8 }}>{current.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>{current.text}</p>
                <button
                    onClick={handleNext}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: isLast ? '#c9f158' : 'white', color: 'black', fontWeight: 700, border: 'none' }}
                >
                    {isLast ? "Start Blipping" : "Next"}
                </button>
            </div>
        </div>
    );
}