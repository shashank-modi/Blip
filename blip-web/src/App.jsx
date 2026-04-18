import { useEffect, useState, useRef } from 'react';
import { SignedIn, SignedOut, useSignIn, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useApp } from './store/AppContext';
import BottomNav from './components/BottomNav';
import FeedbackRenderer from './components/FeedbackRenderer';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Dashboard from './screens/Dashboard';
import Investments from './screens/Investments';
import TransactionLogs from './screens/TransactionLogs';
import Profile from './screens/Profile';
import Friends from './screens/Friends';
import WhatsNew from './components/WhatsNew';
import { Lock, ChartBarBig, FastForward, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './lib/api';

function GoogleSignInButton() {
    const { signIn, isLoaded } = useSignIn();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!isLoaded || loading) return;
        setLoading(true);
        await signIn.authenticateWithRedirect({
            strategy: 'oauth_google',
            redirectUrl: window.location.origin + '/sso-callback',
            redirectUrlComplete: window.location.origin,
        });
    };

    return (
        <button
            onClick={handleLogin}
            disabled={!isLoaded || loading}
            style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                background: '#ffffff',
                border: 'none',
                borderRadius: 16, padding: '15px 20px',
                fontSize: 14, fontWeight: 700,
                color: '#202020',
                fontFamily: "'Montserrat', sans-serif",
                cursor: loading ? 'default' : 'pointer',
                transition: 'opacity 0.2s',
                opacity: (!isLoaded || loading) ? 0.7 : 1,
            }}
            onPointerDown={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
            onPointerUp={e => e.currentTarget.style.opacity = '1'}
            onPointerLeave={e => e.currentTarget.style.opacity = '1'}
        >
            {loading ? (
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: 6, height: 6, background: '#202020',
                            borderRadius: '50%',
                            animation: `dotPulse 1s ease infinite`,
                            animationDelay: `${i * 0.15}s`,
                        }} />
                    ))}
                </div>
            ) : (
                <>
                    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    Continue with Google
                </>
            )}
        </button>
    );
}

function SplashScreen({ onDone }) {
    const wordRef = useRef(null);
    const dotRef = useRef(null);
    const tagRef = useRef(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        const word = wordRef.current;
        const dot = dotRef.current;
        const tag = tagRef.current;
        const overlay = overlayRef.current;
        if (!word || !dot || !tag || !overlay) return;

        const timers = [];
        const after = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); };

        // 1 — word fades in, dot appears and bounces
        after(120, () => {
            word.style.animation = 'bWordReveal .7s cubic-bezier(.22,1,.36,1) forwards';
            dot.style.opacity = '1';
            dot.style.animation = 'bDotBounce 1.1s ease .85s 3';
        });

        // 2 — tagline appears
        after(620, () => {
            tag.style.animation = 'bTagReveal .5s ease forwards';
        });

        // 3 — tagline starts exiting
        after(1800, () => {
            tag.style.animation = 'bTagExit .3s ease forwards';
        });

        // 4 — dot rolls left, word width collapses
        after(2000, () => {
            dot.style.transition = 'transform .6s cubic-bezier(.6,0,.8,.45)';
            dot.style.transform = 'translateX(-120px)';
            word.style.transition = 'width .6s cubic-bezier(.6,0,.8,.45), opacity .05s ease .58s';
            word.style.width = '0px';
        });

        // 5 — hide word and dot completely
        after(2560, () => {
            word.style.opacity = '0';
            dot.style.opacity = '0';
        });

        // 6 — lime circle expands from center via clip-path
        after(2720, () => {
            overlay.style.opacity = '1';
            overlay.style.transition = 'clip-path .72s cubic-bezier(.4,0,.2,1)';
            overlay.style.clipPath = 'circle(150% at 50% 50%)';
        });

        // 7 — call onDone
        after(3400, () => {
            onDone?.();
        });

        return () => timers.forEach(clearTimeout);
    }, [onDone]);

    return (
        <>
            <style>{`
                @keyframes bWordReveal {
                    0%   { opacity: 0; filter: blur(8px); }
                    100% { opacity: 1; filter: blur(0); }
                }
                @keyframes bTagReveal {
                    0%   { opacity: 0; transform: translateY(4px); }
                    100% { opacity: 0.3; transform: translateY(0); }
                }
                @keyframes bTagExit {
                    0%   { opacity: 0.3; }
                    100% { opacity: 0; }
                }
                @keyframes bDotBounce {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.2); }
                }
            `}</style>

            <div style={{
                position: 'absolute',
                inset: 0,
                background: '#202020',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                zIndex: 9999,
                overflow: 'hidden',
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', position: 'relative', fontSize: 0 }}>
                    <span
                        ref={wordRef}
                        style={{
                            fontSize: 58,
                            fontWeight: 800,
                            color: '#ffffff',
                            letterSpacing: '-2px',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            lineHeight: 1,
                            width: 118,
                            opacity: 0,
                        }}
                    >blip</span><span
                        ref={dotRef}
                        style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            background: '#ffffff',
                            borderRadius: '50%',
                            marginLeft: 0,
                            marginBottom: 8,
                            verticalAlign: 'middle',
                            opacity: 0,
                            flexShrink: 0,
                            fontSize: 0,
                        }}
                    /></div>
                <div
                    ref={tagRef}
                    style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                        color: '#ffffff',
                        opacity: 0,
                    }}
                >
                    count on us, to count for you
                </div>

                <div
                    ref={overlayRef}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: '#c9f158',
                        clipPath: 'circle(0% at 50% 50%)',
                        opacity: 0,
                        pointerEvents: 'none',
                    }}
                />
            </div>
        </>
    );
}

function LoadingScreen() {
    const messages = ['Syncing wallet', 'Loading expenses', 'Almost there'];
    const [msgIdx, setMsgIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2500);
        return () => clearInterval(t);
    }, []);

    return (
        <>
            <style>{`
                @keyframes lPing {
                    0%   { transform: scale(1);   opacity: 0.7; }
                    80%  { transform: scale(2.6); opacity: 0; }
                    100% { transform: scale(2.6); opacity: 0; }
                }
                @keyframes lPing2 {
                    0%, 40% { transform: scale(1);   opacity: 0.4; }
                    100%    { transform: scale(3.2); opacity: 0; }
                }
                @keyframes lWordFade {
                    0%, 100% { opacity: 0.55; }
                    50%      { opacity: 1; }
                }
                @keyframes lTextSlide {
                    0%   { opacity: 0; transform: translateY(4px); }
                    15%  { opacity: 1; transform: translateY(0); }
                    80%  { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-4px); }
                }
            `}</style>

            <div style={{
                position: 'absolute', inset: 0,
                background: 'var(--bg)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 18, zIndex: 9998,
                overflow: 'hidden',
            }}>

                <div style={{ display: 'flex', alignItems: 'baseline', position: 'relative' }}>
                    <span style={{
                        fontSize: 58, fontWeight: 800,
                        color: '#202020', letterSpacing: '-1.5px',
                        animation: 'lWordFade 2s ease infinite',
                    }}>blip</span>
                    <div style={{ position: 'relative', marginLeft: 2, marginBottom: 5, width: 8, height: 8, flexShrink: 0 }}>
                        <div style={{
                            position: 'absolute', inset: -4,
                            border: '2px solid #c9f158', borderRadius: '50%',
                            animation: 'lPing 1.6s ease infinite',
                        }} />
                        <div style={{
                            position: 'absolute', inset: -4,
                            border: '1.5px solid #202020', borderRadius: '50%',
                            animation: 'lPing2 1.6s ease 0.5s infinite',
                        }} />
                        <div style={{ width: 8, height: 8, background: '#202020', borderRadius: '50%' }} />
                    </div>
                </div>

                <div style={{ width: 24, height: 1.5, background: 'rgba(32,32,32,0.1)', borderRadius: 99 }} />

                <div key={msgIdx} style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 10, fontWeight: 700,
                    color: 'rgba(32,32,32,0.38)',
                    letterSpacing: '2.5px',
                    textTransform: 'uppercase',
                    animation: 'lTextSlide 2.5s ease forwards',
                }}>
                    {messages[msgIdx]}
                </div>
            </div>
        </>
    );
}


function SignInPage() {
    const features = [
        {
            icon: (
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
            ),
            label: 'Log any expense in under 5 seconds',
        },
        {
            icon: (
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
            ),
            label: 'Your data is private, never shared',
        },
        {
            icon: (
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            ),
            label: 'Smart insights on where money goes',
        },
    ];

    return (
        <>
            <style>{`
                @keyframes siReveal {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes siLineDraw {
                    from { width: 0; }
                    to   { width: 28px; }
                }
                @keyframes siDotPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50%      { transform: scale(1.6); opacity: 0.4; }
                }
                @keyframes dotPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50%      { transform: scale(0.5); opacity: 0.4; }
                }
            `}</style>

            <div style={{
                position: 'absolute', inset: 0,
                background: '#202020',
                display: 'flex', flexDirection: 'column',
                padding: '0 28px',
                overflow: 'hidden',
            }}>
                {/* Top — brand */}
                <div style={{
                    paddingTop: 'max(56px, 16vh)',
                    animation: 'siReveal 0.55s ease 0.1s both',
                }}>
                    {/* Lime line */}
                    <div style={{
                        height: 2, width: 28, background: '#c9f158',
                        borderRadius: 99, marginBottom: 22,
                        animation: 'siLineDraw 0.4s cubic-bezier(.4,0,.2,1) 0.35s both',
                    }} />

                    {/* Wordmark */}
                    <div style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 50, fontWeight: 800,
                        color: '#ffffff', letterSpacing: '-2.5px', lineHeight: 1,
                    }}>
                        blip<span style={{ color: '#c9f158' }}>.</span>
                    </div>

                    {/* Tagline */}
                    <div style={{
                        marginTop: 14, fontSize: 13,
                        color: 'rgba(255,255,255,0.3)',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 500, lineHeight: 1.6, maxWidth: 220,
                    }}>
                        Count on us,<br />to count for you.
                    </div>
                </div>

                {/* Bottom — features + button */}
                <div style={{
                    marginTop: 'auto',
                    paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
                    display: 'flex', flexDirection: 'column', gap: 0,
                    animation: 'siReveal 0.5s ease 0.3s both',
                }}>
                    {/* Feature rows */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: 0,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 20, overflow: 'hidden',
                        marginBottom: 14,
                    }}>
                        {features.map((f, i) => (
                            <div key={f.label} style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 16px',
                                borderBottom: i < features.length - 1
                                    ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                animation: `siReveal 0.4s ease ${0.45 + i * 0.08}s both`,
                            }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                    background: 'rgba(255,255,255,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#c9f158',
                                }}>
                                    {f.icon}
                                </div>
                                <span style={{
                                    fontFamily: "'Montserrat', sans-serif",
                                    fontSize: 13, fontWeight: 600,
                                    color: 'rgba(255,255,255,0.5)',
                                    letterSpacing: '0.1px', lineHeight: 1.4,
                                }}>
                                    {f.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Google button */}
                    <GoogleSignInButton />

                    {/* Footer */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 7, marginTop: 18,
                        animation: 'siReveal 0.4s ease 0.75s both',
                    }}>
                        <div style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: '#c9f158',
                            animation: 'siDotPulse 2.2s ease infinite',
                        }} />
                        <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: 'rgba(255,255,255,0.2)',
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                            fontFamily: "'Montserrat', sans-serif",
                        }}>
                            Your data stays yours
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

function PullToRefreshIndicator({ progress, isRefreshing, isThresholdMet }) {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 10,
            }}
        >
            <motion.div
                initial={false}
                animate={{
                    opacity: isRefreshing ? 1 : Math.min(progress * 1.2, 1),
                    y: isRefreshing ? 0 : -18 + progress * 18,
                    scale: isRefreshing
                        ? 1
                        : isThresholdMet
                            ? 1.08
                            : 0.85 + progress * 0.25,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 22,
                }}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    background: 'rgba(255,255,255,0.65)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    boxShadow: isThresholdMet
                        ? '0 8px 28px rgba(201,241,88,0.35)'
                        : '0 6px 18px rgba(0,0,0,0.10)',
                }}
            >
                {/* Soft expanding glow (only when threshold met) */}
                <motion.div
                    animate={
                        isThresholdMet && !isRefreshing
                            ? { scale: [1, 1.4, 1], opacity: [0.4, 0.15, 0.4] }
                            : { scale: 1, opacity: 0 }
                    }
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        position: 'absolute',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#c9f158',
                        filter: 'blur(12px)',
                        zIndex: 0,
                    }}
                />

                {/* Progress arc */}
                <motion.svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    style={{ position: 'absolute', zIndex: 1 }}
                >
                    <motion.circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="#c9f158"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        style={{
                            pathLength: isRefreshing ? 0.28 : progress,
                            rotate: -90,
                            transformOrigin: '50% 50%',
                        }}
                        animate={
                            isRefreshing
                                ? { rotate: 270 }
                                : { rotate: -90 }
                        }
                        transition={
                            isRefreshing
                                ? {
                                    repeat: Infinity,
                                    duration: 1,
                                    ease: 'linear',
                                }
                                : {
                                    type: 'spring',
                                    stiffness: 120,
                                }
                        }
                    />
                </motion.svg>

                {/* Center dot (blip identity) */}
                <motion.div
                    animate={
                        isRefreshing
                            ? { scale: [1, 0.65, 1] }
                            : isThresholdMet
                                ? { scale: [1, 1.2, 1] }
                                : { scale: 1 }
                    }
                    transition={{
                        duration: isRefreshing ? 0.9 : 0.3,
                        repeat: isRefreshing ? Infinity : 0,
                        ease: 'easeInOut',
                    }}
                    style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: isThresholdMet ? '#c9f158' : '#202020',
                        zIndex: 2,
                    }}
                />
            </motion.div>
        </div>
    );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
    const { currentScreen, showWhatsNew, dismissWhatsNew, loading, error, clearError, isRefreshing, handleRefresh } = useApp();

    const scrollRef = useRef(null);
    const startY = useRef(0);
    const pulling = useRef(false);

    const [pullY, setPullY] = useState(0);
    const [isThresholdMet, setIsThresholdMet] = useState(false);

    const threshold = 70; // Slightly shorter pull for a snappier feel
    const dragFactor = 0.35;

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onTouchStart = (e) => {
            if (isRefreshing || el.scrollTop > 0) return;
            startY.current = e.touches[0].clientY;
            pulling.current = true;
        };

        const onTouchMove = (e) => {
            if (!pulling.current || isRefreshing) return;
            const delta = e.touches[0].clientY - startY.current;

            if (delta > 0 && el.scrollTop <= 0) {
                if (e.cancelable) e.preventDefault();
                // Minimal resistance math
                const move = Math.pow(delta, 0.8) * dragFactor;
                setPullY(move);
                setIsThresholdMet(move > threshold);
            } else {
                pulling.current = false;
            }
        };

        const onTouchEnd = async () => {
            if (!pulling.current) return;
            pulling.current = false;

            if (pullY > threshold) {
                await handleRefresh?.();
            }
            setPullY(0);
            setIsThresholdMet(false);
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [handleRefresh, isRefreshing, pullY]);

    if (loading) return <LoadingScreen />;

    // Animation progress (0 to 1)
    const progress = Math.min(pullY / threshold, 1);

    return (
        <>
            <Toaster
                position="bottom-center"
                toastOptions={{
                    duration: 2500,
                    style: {
                        background: '#202020',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '99px',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '12px 22px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        letterSpacing: '0.1px',
                        marginBottom: '80px', //  Important: Floats it above the BottomNav
                    },
                    success: {
                        iconTheme: {
                            primary: '#c9f158', // blip. lime
                            secondary: '#202020',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#EF4444', // Danger red
                            secondary: '#ffffff',
                        },
                    },
                }}
            />
            <FeedbackRenderer />

            <div className="pages" style={{ background: 'var(--bg)', overflow: 'hidden' }}>
                <PullToRefreshIndicator
                    progress={progress}
                    isRefreshing={isRefreshing}
                    isThresholdMet={pullY > threshold}
                />

                <motion.main
                    ref={scrollRef}
                    className="screen"
                    animate={{
                        y: isRefreshing ? 60 : pullY,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 35,
                        mass: 0.8
                    }}
                    style={{
                        background: 'var(--bg)',
                        position: 'relative',
                        zIndex: 1,
                        willChange: 'transform',
                    }}
                >
                    {error && (
                        <div style={{
                            margin: '12px 16px',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#202020',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}>
                            <span>{error}</span>
                            <X size={14} onClick={clearError} style={{ cursor: 'pointer' }} />
                        </div>
                    )}

                    {currentScreen === 'onboarding' && <Onboarding />}
                    {currentScreen === 'home' && <Home />}
                    {currentScreen === 'friends' && <Friends />}
                    {currentScreen === 'dashboard' && <Dashboard />}
                    {currentScreen === 'investments' && <Investments />}
                    {currentScreen === 'logs' && <TransactionLogs />}
                    {currentScreen === 'profile' && <Profile />}
                </motion.main>
            </div>

            <BottomNav />
            <AnimatePresence>
                {showWhatsNew && (
                    <WhatsNew onClose={dismissWhatsNew} />
                )}
            </AnimatePresence>
        </>
    );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        api.wakeup()
            .then(() => console.log("Blip backend wake-up signal sent..."))
            .catch(() => {}); // Fire and forget
    }, []);
    
    // In your App() function, add this useEffect:
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // iOS resumes here — clear any stuck toasts
                toast.dismiss();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            toast.dismiss('network-status');
            toast.success("Back online!", {
                id: 'network-status',
                duration: 3000,
            });
        };

        const handleOffline = () => {
            toast.error("Offline. Changes won't sync.", {
                id: 'network-status',
                duration: Infinity,
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 3300);
        return () => clearTimeout(timer);
    }, []);

    if (window.location.pathname === '/sso-callback') {
        return <AuthenticateWithRedirectCallback />;
    }

    return (
        <>
            {showSplash && <SplashScreen />}
            <SignedOut>
                {!showSplash && <SignInPage />}
            </SignedOut>
            <SignedIn>
                <AppShell />
            </SignedIn>
        </>
    );
}

export default App;