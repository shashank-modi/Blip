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
import { Lock, ChartBarBig, FastForward } from 'lucide-react';

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
            className="bouncy-tap"
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'var(--white)',
                border: '1.5px solid var(--border)',
                borderRadius: '26px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: '700',
                color: 'var(--text)',
                cursor: loading ? 'default' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
                opacity: !isLoaded ? 0.6 : 1,
            }}
        >
            {loading ? (
                <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, background: 'var(--indigo)', borderRadius: '50%', animation: `dotPulse 1s infinite ${i * 0.2}s` }} />
                    ))}
                </div>
            ) : (
                <>
                    <svg width="18" height="18" viewBox="0 0 48 48">
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
        { icon: <FastForward />, label: 'Log in under 5 seconds' },
        { icon: <Lock />, label: 'End-to-end encrypted' },
        { icon: <ChartBarBig />, label: 'Smart spend insights' },
    ];

    return (
        <>
            <style>{`
                @keyframes siReveal {
                    0%   { opacity: 0; transform: translateY(16px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes siLineDraw {
                    0%   { width: 0; }
                    100% { width: 32px; }
                }
                @keyframes siDotPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50%      { transform: scale(1.5); opacity: 0.5; }
                }
                .si-wrap * { box-sizing: border-box; }
                .si-feature {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    animation: siReveal 0.5s ease both;
                }
            `}</style>

            <div
                className="si-wrap"
                style={{
                    position: 'absolute', inset: 0,
                    background: '#202020',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'inherit',
                    overflow: 'hidden',
                    padding: '0 28px',
                }}
            >
                <div style={{
                    paddingTop: '18vh',
                    animation: 'siReveal 0.6s ease 0.1s both',
                }}>
                    <div style={{
                        height: 2,
                        width: 32,
                        background: '#c9f158',
                        borderRadius: 99,
                        marginBottom: 20,
                        animation: 'siLineDraw 0.5s cubic-bezier(.4,0,.2,1) 0.3s both',
                    }} />

                    <div style={{
                        fontFamily: "'Montserrat', system-ui, sans-serif",
                        fontSize: 52,
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '-2.5px',
                        lineHeight: 1,
                    }}>
                        blip<span style={{ color: '#c9f158' }}>.</span>
                    </div>

                    <div style={{
                        marginTop: 12,
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.35)',
                        fontFamily: "'Montserrat', system-ui, sans-serif",
                        fontWeight: 500,
                        letterSpacing: '0.3px',
                        lineHeight: 1.5,
                        maxWidth: 200,
                    }}>
                        Count on us,<br /> to count for you.
                    </div>
                </div>
                <div style={{
                    marginTop: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    paddingBottom: 32,
                    animation: 'siReveal 0.5s ease 0.35s both',
                }}>
                    {features.map((f, i) => (
                        <div
                            key={f.label}
                            className="si-feature"
                            style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                        >
                            <div style={{
                                width: 36, height: 36,
                                borderRadius: 12,
                                background: '   #ffffff',
                                color: '#202020',
                                border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 15, flexShrink: 0,
                            }}>
                                {f.icon}
                            </div>
                            <span style={{
                                fontFamily: "'Montserrat', system-ui, sans-serif",
                                fontSize: 13, fontWeight: 600,
                                color: 'rgba(255,255,255,0.55)',
                                letterSpacing: '0.1px',
                            }}>
                                {f.label}
                            </span>
                        </div>
                    ))}
                    {/* Divider */}
                    <div style={{
                        height: 1,
                        background: 'rgba(255,255,255,0.08)',
                        margin: '6px 0',
                        borderRadius: 99,
                    }} />
                    <GoogleSignInButton />

                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 7,
                        animation: 'siReveal 0.5s ease 0.8s both',
                        paddingBottom: 8,
                    }}>
                        <div style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: '#c9f158',
                            animation: 'siDotPulse 2s ease infinite',
                        }} />
                        <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: 'rgba(255,255,255,0.25)',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                        }}>
                            Your data stays yours
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
    const { currentScreen, loading, error, clearError } = useApp();

    if (loading) return <LoadingScreen />;

    return (
        <>
            <Toaster
                position="bottom-center"
                toastOptions={{
                    duration: 2000,
                    style: {
                        background: '#202020',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '99px',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '10px 20px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                        letterSpacing: '0.1px',
                        marginBottom: '70px',
                    },
                    success: {
                        iconTheme: {
                            primary: '#c9f158',
                            secondary: '#202020',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#EF4444',
                            secondary: '#ffffff',
                        },
                    },
                }}
            />
            <FeedbackRenderer />
            <div className="pages">
                <main className="screen">

                    {error && (
                        <div style={{
                            margin: '10px 16px', padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--danger-light)', color: 'var(--danger)',
                            fontSize: '13px', fontWeight: 500,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                            border: '1px solid #FECACA',
                        }}>
                            <span>{error}</span>
                            <button onClick={clearError} style={{ fontSize: '16px', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>✕</button>
                        </div>
                    )}
                    {currentScreen === 'onboarding' && <Onboarding />}
                    {currentScreen === 'home' && <Home />}
                    {currentScreen === 'dashboard' && <Dashboard />}
                    {currentScreen === 'investments' && <Investments />}
                    {currentScreen === 'logs' && <TransactionLogs />}
                    {currentScreen === 'profile' && <Profile />}
                </main>
            </div>
            <BottomNav />
        </>
    );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
    const [showSplash, setShowSplash] = useState(true);

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