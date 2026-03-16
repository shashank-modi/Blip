import React, { useEffect, useState } from 'react';

export default function MoneyFlowOverlay({ active, type, amount, onComplete, variant = 'full' }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (!active) {
            setParticles([]);
            return;
        }

        const isMini = variant === 'mini';
        const count = 20;

        // Generate physics-based particles
        const newParticles = Array.from({ length: count }, (_, i) => ({
            id: i,
            left: 50, // Start from center
            top: 50,  // Start from center
            angle: Math.random() * Math.PI * 2,
            velocity: 15 + Math.random() * 35,
            size: isMini ? 14 + Math.random() * 8 : 20 + Math.random() * 30,
            delay: Math.random() * 0.2,
            duration: 0.8 + Math.random() * 0.6,
            depth: Math.random() > 0.5 ? 'front' : 'back', // Z-index layering
        }));

        setParticles(newParticles);

        const t = setTimeout(() => {
            onComplete?.();
        }, 2000);

        return () => clearTimeout(t);
    }, [active, type, onComplete, variant]);

    if (!active) return null;

    const isMini = variant === 'mini';
    const isIncome = type === 'income';
    const accentColor = isIncome ? '#c9f158' : '#ffffff'; // Lime for income, White for expense
    const sign = isIncome ? '+' : '-';

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.4s ease'
        }}>
            {/* 3D Particle Burst */}
            {particles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        fontSize: `${p.size}px`,
                        fontWeight: 900,
                        color: isIncome ? '#c9f158' : 'rgba(255,255,255,0.2)',
                        fontFamily: 'Syne, sans-serif',
                        zIndex: p.depth === 'front' ? 10 : 1,
                        filter: p.depth === 'back' ? 'blur(3px)' : 'none',
                        opacity: 0,
                        animation: `burstOut ${p.duration}s cubic-bezier(0.15, 1, 0.3, 1) ${p.delay}s forwards`,
                        '--angle': `${p.angle}rad`,
                        '--velocity': `${p.velocity}vh`
                    }}
                >
                    ₹
                </div>
            ))}

            {/* Central Amount Display */}
            {!isMini && (
                <div style={{
                    textAlign: 'center',
                    animation: 'amountPop 1.8s cubic-bezier(0.15, 1, 0.3, 1) forwards',
                    zIndex: 5
                }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.4)',
                        letterSpacing: '4px',
                        textTransform: 'uppercase',
                        marginBottom: '8px'
                    }}>
                        {isIncome ? 'Received' : 'Debited'}
                    </div>
                    <div style={{
                        fontSize: '52px',
                        fontWeight: 800,
                        color: accentColor,
                        fontFamily: 'Syne, sans-serif',
                        letterSpacing: '-2px',
                        lineHeight: 1
                    }}>
                        {sign}₹{Number(amount).toLocaleString('en-IN')}
                    </div>
                    <div style={{
                        marginTop: '20px',
                        height: '2px',
                        width: '40px',
                        background: accentColor,
                        margin: '20px auto 0',
                        borderRadius: '2px',
                        opacity: 0.5
                    }} />
                </div>
            )}

            <style>{`
                @keyframes burstOut {
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

                @keyframes amountPop {
                    0% { 
                        opacity: 0; 
                        transform: scale(0.8) translateY(20px); 
                        filter: blur(10px);
                    }
                    15% { 
                        opacity: 1; 
                        transform: scale(1.05) translateY(0); 
                        filter: blur(0px);
                    }
                    25% { 
                        transform: scale(1); 
                    }
                    85% { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                    }
                    100% { 
                        opacity: 0; 
                        transform: scale(1.1) translateY(-20px); 
                        filter: blur(10px);
                    }
                }
            `}</style>
        </div>
    );
}