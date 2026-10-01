import { useEffect, useState } from 'react';
import RefreshablePage from './components/RefreshablePage';
import { SignedIn, SignedOut, useSignIn, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useApp } from './store/AppContext';
import BottomNav from './components/BottomNav';
import FeedbackRenderer from './components/FeedbackRenderer';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Dashboard from './screens/Dashboard';
import TransactionLogs from './screens/TransactionLogs';
import Profile from './screens/Profile';
import Activity from './screens/Activity';
import Friends from './screens/Friends';
import LandingPage from './screens/LandingPage';
import WhatsNew from './components/WhatsNew';
import { Lock, ChartBarBig, FastForward, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './lib/api';
import { isInstalled } from './lib/pwa';

function GoogleSignInButton() {
    const { signIn, isLoaded } = useSignIn();
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    const handleLogin = async () => {
        if (!isLoaded || loading) return;
        setLoading(true);
        setLoginError('');
        try {
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: window.location.origin + '/sso-callback',
                redirectUrlComplete: window.location.origin + '/app' + window.location.search,
            });
        } catch (error) {
            setLoginError(error?.errors?.[0]?.message || 'Could not start sign in. Please try again.');
            setLoading(false);
        }
    };

    return (
        <>
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
        {loginError && <p role="alert" style={{ color: '#ffd8d0', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{loginError}</p>}
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


function SignInPage({ onBack }) {
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
                alignItems: 'center',
                padding: '0 28px',
                overflow: 'hidden',
            }}>
                {onBack && (
                    <div style={{ position: 'absolute', top: 'max(24px, env(safe-area-inset-top, 24px))', left: 'max(24px, calc(50% - 230px))', zIndex: 10, animation: 'siReveal 0.4s ease forwards' }}>
                        <button 
                            onClick={onBack} 
                            style={{ 
                                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', 
                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, 
                                fontWeight: 600, fontFamily: "'Montserrat', sans-serif", cursor: 'pointer', padding: '8px 0' 
                            }}
                        >
                            <ChevronLeft size={18} /> Back
                        </button>
                    </div>
                )}

                {/* Top — brand */}
                <div style={{
                    paddingTop: 'max(56px, 16vh)',
                    width: '100%', maxWidth: 460,
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
                    width: '100%', maxWidth: 460,
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

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
    const { currentScreen, showWhatsNew, dismissWhatsNew, loading, startupError, bootstrapData, error, clearError, isRefreshing, handleRefresh } = useApp();

    if (loading) return <LoadingScreen />;
    if (startupError) return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
        <section role="alert" style={{ maxWidth: 360, background: '#202020', color: '#fff', padding: 32, borderRadius: 28 }}>
            <h1 style={{ fontSize: 25, margin: '0 0 16px' }}>Let’s reconnect<span style={{ color: '#c9f158' }}>.</span></h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#ddd' }}>{startupError}</p>
            <button onClick={() => bootstrapData()} style={{ border: 0, borderRadius: 16, padding: '14px 24px', background: '#c9f158', color: '#202020', fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>Try again</button>
        </section>
    </main>;

    return (
        <>
            <Toaster
                containerStyle={{zIndex:12000}}
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

            <RefreshablePage className={`view-${currentScreen}`} resetKey={currentScreen} onRefresh={handleRefresh} disabled={isRefreshing || currentScreen === 'onboarding' || showWhatsNew}>
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
                    {currentScreen === 'activity' && <Activity />}
                    {currentScreen === 'dashboard' && <Dashboard />}
                    {currentScreen === 'logs' && <TransactionLogs />}
                    {currentScreen === 'profile' && <Profile />}
            </RefreshablePage>

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
    const [viewLanding, setViewLanding] = useState(() => {
        const returningVisitor = localStorage.getItem('blip_visited_direct') === 'true';
        if (window.location.pathname === '/' && (isInstalled() || returningVisitor)) {
            window.history.replaceState(null, '', '/app' + window.location.search + window.location.hash);
        }
        return window.location.pathname !== '/app';
    });

    useEffect(() => {
        const syncViewWithUrl = () => setViewLanding(window.location.pathname !== '/app');
        window.addEventListener('popstate', syncViewWithUrl);
        return () => window.removeEventListener('popstate', syncViewWithUrl);
    }, []);

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


    if (window.location.pathname === '/sso-callback') {
        return <AuthenticateWithRedirectCallback />;
    }
    
    const handleEnterApp = () => {
        localStorage.setItem('blip_visited_direct', 'true');
        window.history.pushState(null, '', '/app' + window.location.search);
        setViewLanding(false);
    };

    const handleBackToLanding = () => {
        localStorage.removeItem('blip_visited_direct');
        window.history.pushState(null, '', '/' + window.location.search);
        setViewLanding(true);
    };

    return (
        <>
            <SignedOut>
                {viewLanding ? (
                <LandingPage onGetStarted={handleEnterApp} />
            ) : (
                <SignInPage onBack={handleBackToLanding} />
            )}
            </SignedOut>
            <SignedIn>
                <AppShell />
            </SignedIn>
        </>
    );
}

export default App;
