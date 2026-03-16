import React, { useEffect, useState } from 'react';
import { Check, TrendingUp, Zap } from 'lucide-react';

// ─── ₹ PARTICLE BURST (from MoneyFlowOverlay) ─────────────────────────
function ParticleBurst({ active, accentColor }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (!active) { setParticles([]); return; }

        setParticles(Array.from({ length: 18 }, (_, i) => ({
            id: i,
            angle: Math.random() * Math.PI * 2,
            velocity: 18 + Math.random() * 30,
            size: 18 + Math.random() * 24,
            delay: Math.random() * 0.25,
            duration: 0.8 + Math.random() * 0.6,
            depth: Math.random() > 0.5 ? 'front' : 'back',
        })));
    }, [active]);

    if (!active || particles.length === 0) return null;

    return (
        <>
            {particles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        fontSize: `${p.size}px`,
                        fontWeight: 900,
                        color: p.depth === 'front' ? accentColor : 'rgba(255,255,255,0.15)',
                        fontFamily: 'Syne, sans-serif',
                        zIndex: p.depth === 'front' ? 10 : 1,
                        filter: p.depth === 'back' ? 'blur(3px)' : 'none',
                        opacity: 0,
                        animation: `celebBurst ${p.duration}s cubic-bezier(0.15, 1, 0.3, 1) ${p.delay}s forwards`,
                        '--angle': `${p.angle}rad`,
                        '--velocity': `${p.velocity}vh`,
                        pointerEvents: 'none',
                    }}
                >
                    ₹
                </div>
            ))}
        </>
    );
}

// ─── CELEBRATION OVERLAY ───────────────────────────────────────────────
export default function CelebrationOverlay({ type, show, amount, label, onDone }) {
    useEffect(() => {
        if (!show) return;
        const t = setTimeout(() => onDone?.(), 2800);
        return () => clearTimeout(t);
    }, [show, onDone]);

    if (!show) return null;

    const isPaid = type === 'paid';
    const isInvestment = type === 'investment';

    const accentColor = isPaid ? '#c9f158' : isInvestment ? '#FCD34D' : '#ffffff';

    return (
        <div
            onClick={onDone}
            style={{
                position: 'fixed', inset: 0, zIndex: 10005,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(20px)',
                animation: 'globalFadeIn 0.4s ease forwards',
            }}
        >
            <style>{`
                @keyframes globalFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes iconPop {
                    0%   { transform: scale(0); opacity: 0; }
                    70%  { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes textSlide {
                    0%   { opacity: 0; transform: translateY(20px); filter: blur(5px); }
                    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
                @keyframes ringPulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                @keyframes celebBurst {
                    0% {
                        opacity: 0;
                        transform: translate(0, 0) scale(0);
                    }
                    20% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 0;
                        transform: translate(
                            calc(cos(var(--angle)) * var(--velocity)),
                            calc(sin(var(--angle)) * var(--velocity))
                        ) scale(1.5) rotate(45deg);
                    }
                }
            `}</style>

            {/* Confetti layer */}
            {/* <Confetti active={show} /> */}

            {/* ₹ Particle burst — fires from center same as MoneyFlowOverlay */}
            <ParticleBurst active={show} accentColor={accentColor} />

            {/* CENTRAL CONTENT */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* ICON CIRCLE */}
                <div style={{ position: 'relative', marginBottom: 32 }}>
                    {/* Pulsing background rings */}
                    <div style={{
                        position: 'absolute', inset: -10, border: `2px solid ${accentColor}`,
                        borderRadius: '50%', animation: 'ringPulse 1.5s ease-out infinite'
                    }} />

                    <div style={{
                        width: 100, height: 100, borderRadius: '50%',
                        background: accentColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#202020',
                        boxShadow: `0 0 40px ${accentColor}44`,
                        animation: 'iconPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    }}>
                        {isPaid ? <Check size={48} strokeWidth={3.5} /> :
                            isInvestment ? <TrendingUp size={42} strokeWidth={3.5} /> :
                                <Zap size={42} strokeWidth={3.5} fill="currentColor" />}
                    </div>
                </div>

                {/* TEXT CONTAINER */}
                <div style={{ textAlign: 'center', animation: 'textSlide 0.6s ease 0.2s both' }}>
                    <div style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: '14px', fontWeight: 800,
                        color: accentColor,
                        textTransform: 'uppercase',
                        letterSpacing: '4px',
                        marginBottom: 12
                    }}>
                        {isPaid ? 'Payment Successful' : isInvestment ? 'Investment Logged' : 'Blip Recorded'}
                    </div>

                    <div style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: '56px', fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '-2px',
                        lineHeight: 1,
                        marginBottom: 8
                    }}>
                        ₹{Number(amount).toLocaleString('en-IN')}
                    </div>

                    <div style={{
                        fontSize: '16px', fontWeight: 600,
                        color: 'rgba(255,255,255,0.4)',
                    }}>
                        {label || 'General Transaction'}
                    </div>

                    <div style={{
                        marginTop: 40,
                        fontSize: '10px',
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.2)',
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                    }}>
                        Tap anywhere to dismiss
                    </div>
                </div>
            </div>
        </div>
    );
}