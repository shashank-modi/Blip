import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Wallet, ArrowRight, Sparkles, Briefcase, Gift, ArrowUpCircle, Zap, LineChart, Repeat } from 'lucide-react';

export default function Onboarding() {
    const { completeOnboarding } = useApp();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [budget, setBudget] = useState('');
    const [source, setSource] = useState('');
    const [loading, setLoading] = useState(false);

    const incomeSources = [
        { name: 'Salary', icon: <Briefcase size={16} /> },
        { name: 'Bonus', icon: <Gift size={16} /> },
        { name: 'Other', icon: <ArrowUpCircle size={16} /> }
    ];

    const handleNext = () => {
        if (step === 1 && name) { setStep(2); return; }
        if (step === 2 && budget && source) { setStep(3); return; }
        if (step === 3) { setStep(4); return; }
        if (step === 4) { setStep(5); return; }

        if (step === 5) {
            setLoading(true);
            completeOnboarding(name, budget, source).finally(() => setLoading(false));
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh', padding: '40px 24px',
            background: 'linear-gradient(135deg, var(--indigo) 0%, #312E81 100%)',
            color: 'white', position: 'relative', overflow: 'hidden'
        }}>
            {/* Background glowing orbs */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 250, height: 250, background: 'rgba(99, 102, 241, 0.4)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 300, height: 300, background: 'rgba(55, 48, 163, 0.6)', borderRadius: '50%', filter: 'blur(80px)' }}></div>

            <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '40px', position: 'relative', zIndex: 1 }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    width: '72px', height: '72px', borderRadius: '24px', margin: '0 auto 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}>
                    <Sparkles color="#949494" size={32} />
                </div>
                <h1 style={{ marginBottom: '8px', fontFamily: 'Montserrat, sans-serif', fontSize: 32, fontWeight: 800 }}>Blip</h1>
                <p style={{ color: '#D0D0D0', fontSize: 15, fontWeight: 500 }}>Every rupee, just a blip.</p>
            </div>

            <div style={{
                padding: '32px 24px', minHeight: '320px', display: 'flex', flexDirection: 'column',
                background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)', position: 'relative', zIndex: 1
            }}>

                {step === 1 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 style={{ marginBottom: '8px', fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700 }}>What's your name?</h2>
                        <p style={{ marginBottom: '24px', color: '#D0D0D0', fontSize: 14 }}>Let's make this personal.</p>

                        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '16px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 'auto' }}>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Rahul"
                                style={{
                                    background: 'transparent', border: 'none', padding: '16px', color: 'white',
                                    fontSize: '1.2rem', outline: 'none', width: '100%', fontFamily: 'Montserrat, sans-serif', fontWeight: 600
                                }}
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!name}
                            style={{
                                marginTop: '32px', opacity: !name ? 0.5 : 1, width: '100%',
                                background: 'white', color: 'var(--indigo-dark)', border: 'none', padding: '16px',
                                borderRadius: '16px', fontSize: 16, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                cursor: !name ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                boxShadow: '0 4px 14px rgba(255, 255, 255, 0.25)'
                            }}
                        >
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 style={{ marginBottom: '8px', fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700 }}>Monthly Budget</h2>
                        <p style={{ marginBottom: '24px', color: '#D0D0D0', fontSize: 14 }}>How much ₹ aim to spend, and primary income?</p>

                        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '16px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '20px', fontSize: '1.4rem', color: '#949494', fontWeight: 700 }}>₹</span>
                            <input
                                type="number"
                                value={budget}
                                onChange={e => setBudget(e.target.value)}
                                placeholder="20000"
                                style={{
                                    background: 'transparent', border: 'none', padding: '16px 16px 16px 44px', color: 'white',
                                    fontSize: '1.5rem', fontWeight: '700', outline: 'none', width: '100%', fontFamily: 'Montserrat, sans-serif'
                                }}
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                            {incomeSources.map(s => (
                                <div
                                    key={s.name}
                                    onClick={() => setSource(source === s.name ? '' : s.name)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                                        borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                                        background: source === s.name ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                        border: source === s.name ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                                        color: source === s.name ? 'white' : '#D0D0D0'
                                    }}
                                >
                                    {s.icon}
                                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{s.name}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!budget || !source}
                            style={{
                                marginTop: '32px', opacity: (!budget || !source) ? 0.5 : 1, width: '100%',
                                background: 'white', color: 'var(--indigo-dark)', border: 'none', padding: '16px',
                                borderRadius: '16px', fontSize: 16, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                cursor: (!budget || !source) ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                boxShadow: '0 4px 14px rgba(255, 255, 255, 0.25)'
                            }}
                        >
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <Zap size={32} color="#949494" />
                        </div>
                        <h2 style={{ marginBottom: '8px', fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, textAlign: 'center' }}>Lightning Fast Logging</h2>
                        <p style={{ marginBottom: '24px', color: '#D0D0D0', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>Just type "150 pizza" or "uber 400" on the home screen. Blip automatically categorizes it for you.</p>

                        <button onClick={handleNext} style={{ marginTop: 'auto', width: '100%', background: 'white', color: 'var(--indigo-dark)', border: 'none', padding: '16px', borderRadius: '16px', fontSize: 16, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 14px rgba(255, 255, 255, 0.25)' }}>
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 4 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <LineChart size={32} color="#949494" />
                        </div>
                        <h2 style={{ marginBottom: '8px', fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, textAlign: 'center' }}>Track Investments</h2>
                        <p style={{ marginBottom: '24px', color: '#D0D0D0', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>Easily log your Lumpsums or monthly SIPs. Watch your portfolio grow right alongside your budget.</p>

                        <button onClick={handleNext} style={{ marginTop: 'auto', width: '100%', background: 'white', color: 'var(--indigo-dark)', border: 'none', padding: '16px', borderRadius: '16px', fontSize: 16, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 14px rgba(255, 255, 255, 0.25)' }}>
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 5 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <Repeat size={32} color="#949494" />
                        </div>
                        <h2 style={{ marginBottom: '8px', fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 700, textAlign: 'center' }}>Autopay & Logs</h2>
                        <p style={{ marginBottom: '24px', color: '#D0D0D0', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>Set up recurring bills to never miss a due date. Swipe right on any item to edit, or left to remove.</p>

                        <button onClick={handleNext} disabled={loading} style={{ marginTop: 'auto', opacity: loading ? 0.5 : 1, width: '100%', background: 'var(--lime)', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontSize: 16, fontWeight: 700, fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(132, 204, 22, 0.4)' }}>
                            {loading ? 'Setting up...' : <><span style={{ color: 'var(--lime-dark)' }}>Start Tracking</span> <Wallet size={20} color="var(--lime-dark)" /></>}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
