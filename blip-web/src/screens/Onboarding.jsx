import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { useUser } from '@clerk/clerk-react';
import { Wallet, Briefcase, Gift, ArrowUpCircle, Zap, LineChart, Repeat, ChevronRight } from 'lucide-react';

export default function Onboarding() {
    const { completeOnboarding } = useApp();
    const { user: clerkUser } = useUser();

    const [step, setStep] = useState(0); // 0=budget, 1-3=feature slides
    const [budget, setBudget] = useState('');
    const [source, setSource] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [animIn, setAnimIn] = useState(true);

    const firstName = clerkUser?.firstName || clerkUser?.fullName?.split(' ')[0] || '';

    const incomeSources = [
        { name: 'Salary', icon: <Briefcase size={14} /> },
        { name: 'Freelance', icon: <Zap size={14} /> },
        { name: 'Business', icon: <Gift size={14} /> },
        { name: 'Other', icon: <ArrowUpCircle size={14} /> },
    ];

    const slides = [
        {
            icon: <Zap size={32} />,
            accent: '#c9f158',
            tag: 'Log expenses',
            title: 'Type it, done.',
            body: '"pizza 150" or "150 pizza" — Blip understands both. Auto-categorised, logged in under 3 seconds.',
            bg: 'rgba(201,241,88,0.07)',
            border: 'rgba(201,241,88,0.2)',
        },
        {
            icon: <LineChart size={32} />,
            accent: '#93C5FD',
            tag: 'Investments',
            title: 'Watch your\nwealth grow.',
            body: 'Track SIPs, lumpsums, and your full portfolio. Know exactly how much you\'ve invested and where.',
            bg: 'rgba(147,197,253,0.07)',
            border: 'rgba(147,197,253,0.2)',
        },
        {
            icon: <Repeat size={32} />,
            accent: '#FCA5A5',
            tag: 'Autopay',
            title: 'Never miss\na due date.',
            body: 'Add recurring bills once. Blip reminds you, tracks them, and marks them paid — one tap.',
            bg: 'rgba(252,165,165,0.07)',
            border: 'rgba(252,165,165,0.2)',
        },
    ];

    const goTo = (next) => {
        setAnimIn(false);
        setTimeout(() => { setStep(next); setAnimIn(true); }, 180);
    };

    const handleBudgetNext = () => {
        const val = parseFloat(budget);
        if (isNaN(val) || val < 0 || !source) {
            toast.error("Enter a valid budget and select a source");
            return;
        }
        goTo(1);
    };

    const handleFinish = () => {
        setLoading(true);
        completeOnboarding(firstName, budget, source, phone).finally(() => setLoading(false));
    };

    const isLastSlide = step === slides.length + 1;

    return (
        <>
            <style>{`
                @keyframes ob-in {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes ob-line {
                    from { width: 0; }
                    to   { width: 24px; }
                }
                @keyframes ob-icon-pop {
                    0%   { transform: scale(0.7); opacity: 0; }
                    70%  { transform: scale(1.08); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes ob-float {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-6px); }
                }
                .ob-slide-in {
                    animation: ob-in 0.28s cubic-bezier(.4,0,.2,1) both;
                }
                .ob-icon-pop {
                    animation: ob-icon-pop 0.45s cubic-bezier(.34,1.56,.64,1) both;
                }
                .ob-float {
                    animation: ob-float 3s ease-in-out infinite;
                }
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
            `}</style>

            <div style={{
                position: 'absolute', inset: 0,
                background: '#202020',
                display: 'flex', flexDirection: 'column',
                fontFamily: "'Montserrat', sans-serif",
                overflowY: 'auto',
                zIndex: 9990,
            }}>

                {/* ── STEP 0 — Budget ── */}
                {step === 0 && (
                    <div
                        key="budget"
                        className="ob-slide-in"
                        style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            padding: '0 28px',
                            minHeight: '100%',
                        }}
                    >
                        {/* Brand */}
                        <div style={{ paddingTop: 'max(60px, 14vh)', paddingBottom: 32 }}>
                            <div style={{
                                height: 2, width: 24, background: '#c9f158',
                                borderRadius: 99, marginBottom: 18,
                                animation: 'ob-line 0.4s ease 0.2s both',
                            }} />
                            <div style={{ fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>
                                blip<span style={{ color: '#c9f158' }}>.</span>
                            </div>
                            {firstName ? (
                                <div style={{ marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                    Hey {firstName}, let's set you up.
                                </div>
                            ) : (
                                <div style={{ marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                    Let's set you up.
                                </div>
                            )}
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            borderRadius: 24, padding: '24px 20px',
                            flex: 1, display: 'flex', flexDirection: 'column',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 16 }}>
                                Monthly spend limit
                            </div>

                            <div style={{
                                display: 'flex', alignItems: 'center',
                                background: 'rgba(255,255,255,0.07)',
                                border: `1.5px solid ${budget ? 'rgba(201,241,88,0.4)' : 'rgba(255,255,255,0.10)'}`,
                                borderRadius: 18, padding: '16px 20px',
                                marginBottom: 24,
                                transition: 'border-color 0.2s',
                            }}>
                                <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginRight: 6 }}>₹</span>
                                <input
                                    type="number"
                                    value={budget}
                                    onChange={e => setBudget(e.target.value)}
                                    placeholder="20,000"
                                    autoFocus
                                    style={{
                                        background: 'transparent', border: 'none', outline: 'none',
                                        color: '#ffffff', fontSize: 28, fontWeight: 800,
                                        fontFamily: "'Montserrat', sans-serif",
                                        width: '100%', letterSpacing: '-0.5px',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
                                {['10000', '20000', '30000', '50000'].map(amt => (
                                    <div
                                        key={amt}
                                        onClick={() => setBudget(amt)}
                                        style={{
                                            padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
                                            fontSize: 12, fontWeight: 700,
                                            background: budget === amt ? '#c9f158' : 'rgba(255,255,255,0.07)',
                                            color: budget === amt ? '#202020' : 'rgba(255,255,255,0.5)',
                                            border: `1px solid ${budget === amt ? '#c9f158' : 'rgba(255,255,255,0.1)'}`,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        ₹{parseInt(amt).toLocaleString('en-IN')}
                                    </div>
                                ))}
                            </div>

                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 12 }}>
                                Primary income source
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'auto' }}>
                                {incomeSources.map(s => (
                                    <div
                                        key={s.name}
                                        onClick={() => setSource(source === s.name ? '' : s.name)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '9px 16px', borderRadius: 99, cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            background: source === s.name ? '#c9f158' : 'rgba(255,255,255,0.07)',
                                            border: `1.5px solid ${source === s.name ? '#c9f158' : 'rgba(255,255,255,0.10)'}`,
                                            color: source === s.name ? '#202020' : 'rgba(255,255,255,0.55)',
                                            fontWeight: 600, fontSize: 13,
                                        }}
                                    >
                                        {s.icon} {s.name}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleBudgetNext}
                                disabled={!budget || !source}
                                style={{
                                    marginTop: 28, width: '100%',
                                    background: (!budget || !source) ? 'rgba(255,255,255,0.07)' : '#ffffff',
                                    color: (!budget || !source) ? 'rgba(255,255,255,0.25)' : '#202020',
                                    border: 'none', padding: '16px',
                                    borderRadius: 16, fontSize: 15, fontWeight: 800,
                                    fontFamily: "'Montserrat', sans-serif",
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    cursor: (!budget || !source) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.18s',
                                    boxShadow: (!budget || !source) ? 'none' : '0 4px 20px rgba(255,255,255,0.12)',
                                }}
                            >
                                Continue <ChevronRight size={18} />
                            </button>
                        </div>

                        <div style={{ height: 32 }} />
                    </div>
                )}

                {step === 1 && (
                    <div
                        key="phone"
                        className="ob-slide-in"
                        style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            padding: '0 28px',
                            minHeight: '100%',
                        }}
                    >
                        <div style={{ paddingTop: 'max(60px, 14vh)', paddingBottom: 32 }}>
                            <div style={{
                                height: 2, width: 48, background: '#c9f158',
                                borderRadius: 99, marginBottom: 18,
                            }} />
                            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                                Let friends find you
                            </div>
                            <div style={{ marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                Add your phone number so friends can easily split bills with you on Blip.
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            borderRadius: 24, padding: '24px 20px',
                            flex: 1, display: 'flex', flexDirection: 'column',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 16 }}>
                                Your phone number
                            </div>

                            <div style={{
                                display: 'flex', alignItems: 'center',
                                background: 'rgba(255,255,255,0.07)',
                                border: `1.5px solid ${phone.length === 10 ? 'rgba(201,241,88,0.4)' : 'rgba(255,255,255,0.10)'}`,
                                borderRadius: 18, padding: '16px 20px',
                                transition: 'border-color 0.2s',
                                marginBottom: 'auto'
                            }}>
                                <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginRight: 12 }}>+91</span>
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter 10 digits"
                                    required
                                    autoFocus
                                    style={{
                                        background: 'transparent', border: 'none', outline: 'none',
                                        color: '#ffffff', fontSize: 24, fontWeight: 800,
                                        fontFamily: "'Montserrat', sans-serif",
                                        width: '100%', letterSpacing: '1px',
                                    }}
                                />
                            </div>

                            <button
                                onClick={() => goTo(2)}
                                disabled={phone.length !== 10}
                                style={{
                                    marginTop: 28, width: '100%',
                                    background: phone.length !== 10 ? 'rgba(255,255,255,0.07)' : '#ffffff',
                                    color: phone.length !== 10 ? 'rgba(255,255,255,0.25)' : '#202020',
                                    border: 'none', padding: '16px',
                                    borderRadius: 16, fontSize: 15, fontWeight: 800,
                                    fontFamily: "'Montserrat', sans-serif",
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    cursor: phone.length !== 10 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.18s',
                                    boxShadow: phone.length !== 10 ? 'none' : '0 4px 20px rgba(255,255,255,0.12)',
                                }}
                            >
                                Continue <ChevronRight size={18} />
                            </button>
                        </div>

                        <div style={{ height: 32 }} />
                    </div>
                )}

                {step >= 2 && step <= 4 && (() => {
                    const slide = slides[step - 2];
                    const isLast = step === 4;
                    return (
                        <div
                            key={`slide-${step}`}
                            className={animIn ? 'ob-slide-in' : ''}
                            style={{
                                flex: 1, display: 'flex', flexDirection: 'column',
                                minHeight: '100%', padding: '0 28px',
                                opacity: animIn ? 1 : 0,
                                transition: 'opacity 0.18s',
                            }}
                        >
                            {/* Top nav */}
                            <div style={{
                                paddingTop: 'max(56px, 12vh)',
                                display: 'flex',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                marginBottom: 48,
                            }}>
                                <div style={{ display: 'flex', gap: 5 }}>
                                    {slides.map((_, i) => (
                                        <div key={i} style={{
                                            width: i + 2 === step ? 22 : 6, height: 6, borderRadius: 99,
                                            background: i + 2 === step ? slide.accent : i + 2 < step ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
                                            transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                                        }} />
                                    ))}
                                </div>
                            </div>

                            {/* Big icon */}
                            <div
                                className="ob-float"
                                style={{
                                    width: 96, height: 96, borderRadius: 28, alignSelf: 'flex-start',
                                    background: slide.bg,
                                    border: `1.5px solid ${slide.border}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: slide.accent, marginBottom: 32,
                                }}
                            >
                                <div className="ob-icon-pop">{slide.icon}</div>
                            </div>

                            {/* Tag */}
                            <div style={{
                                display: 'inline-flex', alignItems: 'center',
                                background: slide.bg, border: `1px solid ${slide.border}`,
                                borderRadius: 99, padding: '4px 12px', marginBottom: 16,
                                alignSelf: 'flex-start',
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: slide.accent, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                    {slide.tag}
                                </span>
                            </div>

                            {/* Title */}
                            <div style={{
                                fontSize: 38, fontWeight: 800, color: '#ffffff',
                                letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16,
                                whiteSpace: 'pre-line',
                            }}>
                                {slide.title}
                            </div>

                            {/* Body */}
                            <div style={{
                                fontSize: 15, color: 'rgba(255,255,255,0.4)',
                                lineHeight: 1.7, fontWeight: 500,
                                maxWidth: 300, marginBottom: 'auto',
                            }}>
                                {slide.body}
                            </div>

                            {/* CTA */}
                            <div style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))', marginTop: 32 }}>
                                {isLast ? (
                                    <button
                                        onClick={handleFinish}
                                        disabled={loading}
                                        style={{
                                            width: '100%', padding: '17px',
                                            borderRadius: 18, border: 'none',
                                            background: '#c9f158', color: '#202020',
                                            fontSize: 16, fontWeight: 800,
                                            fontFamily: "'Montserrat', sans-serif",
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading ? 0.7 : 1,
                                            boxShadow: '0 4px 24px rgba(201,241,88,0.3)',
                                            transition: 'all 0.18s',
                                        }}
                                        onPointerDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
                                        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                        onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        {loading ? (
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} style={{
                                                        width: 6, height: 6, borderRadius: '50%', background: '#202020',
                                                        animation: `ob-float 0.8s ease infinite`,
                                                        animationDelay: `${i * 0.15}s`,
                                                    }} />
                                                ))}
                                            </div>
                                        ) : (
                                            <><Wallet size={22} /> Let's Start</>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => goTo(step + 1)}
                                        style={{
                                            width: '100%', padding: '17px',
                                            borderRadius: 18, border: 'none',
                                            background: '#ffffff', color: '#202020',
                                            fontSize: 15, fontWeight: 800,
                                            fontFamily: "'Montserrat', sans-serif",
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 16px rgba(255,255,255,0.1)',
                                            transition: 'all 0.18s',
                                        }}
                                        onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                                        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                        onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        Next <ChevronRight size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </>
    );
}