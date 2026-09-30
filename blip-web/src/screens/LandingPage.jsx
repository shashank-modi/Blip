import InstallPrompt from '../components/InstallPrompt';
import React, { useRef } from 'react';
import { motion, useInView, useScroll } from 'framer-motion';
import { Cpu, Layers, Shield, ArrowRight, Sparkles, CheckCircle2, Smartphone, Monitor, Plus, Share, MoreVertical, Heart } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
    const featuresRef = useRef(null);
    const featuresInView = useInView(featuresRef, { once: true, margin: '-100px' });

    const { scrollYProgress } = useScroll();

    const rupees = [
        { 
            id: 1, size: 200, burstX: '-35vw', burstY: '25vh', 
            driftX: [0, -30, 20, 0], driftY: [0, 40, -20, 0], rotate: [0, 60, -30, 0], 
            colors: ['#c9f158', '#10b981', '#c9f158'], duration: 20 
        },
        { 
            id: 2, size: 150, burstX: '35vw', burstY: '-25vh', 
            driftX: [0, 40, -30, 0], driftY: [0, -50, 30, 0], rotate: [0, -90, 45, 0], 
            colors: ['#fbbf24', '#f59e0b', '#fbbf24'], duration: 22 
        },
        { 
            id: 3, size: 90, burstX: '20vw', burstY: '15vh', 
            driftX: [0, -20, 40, 0], driftY: [0, 30, -40, 0], rotate: [0, 180, -90, 0], 
            colors: ['#34d399', '#059669', '#34d399'], duration: 25 
        },
        { 
            id: 4, size: 240, burstX: '-25vw', burstY: '-30vh', 
            driftX: [0, 50, -40, 0], driftY: [0, -30, 50, 0], rotate: [0, -45, 90, 0], 
            colors: ['#c9f158', '#84cc16', '#c9f158'], duration: 20 
        },
        { 
            id: 5, size: 140, burstX: '40vw', burstY: '30vh', 
            driftX: [0, -40, 30, 0], driftY: [0, 50, -20, 0], rotate: [0, 90, -180, 0], 
            colors: ['#10b981', '#047857', '#10b981'], duration: 28 
        },
    ];

    const pillars = [
        {
            icon: <Cpu size={22} />,
            title: 'Natural Language Input',
            desc: 'Type "800 dinner" and blip. handles the rest. No dropdowns, no forms — just plain text that becomes structured data instantly.'
        },
        {
            icon: <Layers size={22} />,
            title: 'Smart Balance Sync',
            desc: 'Personal spends and shared expenses stay in separate lanes. No double-counting, no confusion — your net balance is always exactly right.'
        },
        {
            icon: <Shield size={22} />,
            title: 'Your Data, Isolated',
            desc: 'Built on Clerk auth with per-user data isolation. Your transactions are visible only to you and the people you explicitly share with.'
        }
    ];

    const cardContainerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.3 }
        }
    };

    const cardItemVariants = {
        hidden: { opacity: 0, y: 80, rotateX: -15, scale: 0.9 },
        show: { 
            opacity: 1, 
            y: 0, 
            rotateX: 0, 
            scale: 1,
            transition: { type: 'spring', damping: 20, stiffness: 80 }
        }
    };

    const installSteps = {
        ios: [
            { icon: <Share size={16} />, text: 'Open blip. in Safari' },
            { icon: <Share size={16} />, text: 'Tap the Share icon at the bottom' },
            { icon: <Plus size={16} />, text: 'Select "Add to Home Screen"' },
            { icon: <CheckCircle2 size={16} />, text: 'Tap Add — you\'re done!' },
        ],
        android: [
            { icon: <MoreVertical size={16} />, text: 'Open blip. in Chrome' },
            { icon: <MoreVertical size={16} />, text: 'Tap the three-dot menu (⋮)' },
            { icon: <Plus size={16} />, text: 'Select "Add to Home screen"' },
            { icon: <CheckCircle2 size={16} />, text: 'Tap Add — blip. lives on your phone' },
        ],
    };

    const [activeInstall, setActiveInstall] = React.useState('ios');

    return (
        <>
            <InstallPrompt />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;700&display=swap');

                .landing-scroll-container {
                    width: 100vw;
                    height: 100vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scroll-behavior: smooth;
                    background: #ffffff;
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 10000;
                    font-family: 'Montserrat', sans-serif;
                }

                .sec-white {
                    background: radial-gradient(circle at top center, #ffffff 0%, #f2f2f5 100%);
                    color: #161616;
                    min-height: 100vh;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    overflow: hidden;
                    padding: 40px 8%;
                    box-sizing: border-box;
                }

                .sec-charcoal {
                    background: #0a0a0c;
                    color: #ffffff;
                    min-height: 100vh;
                    position: relative;
                    display: flex;
                    align-items: center;
                    padding: 120px 8%;
                    overflow: hidden;
                    box-sizing: border-box;
                    perspective: 1000px;
                }

                .glow-orb {
                    position: absolute;
                    width: 700px;
                    height: 700px;
                    background: radial-gradient(circle, rgba(201,241,88,0.06) 0%, rgba(10,10,12,0) 70%);
                    top: 50%;
                    right: -10%;
                    transform: translateY(-50%);
                    z-index: 0;
                    pointer-events: none;
                }

                .rupee-bg {
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 900;
                    pointer-events: none;
                    user-select: none;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .about-box {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(22, 22, 22, 0.9);
                    backdrop-filter: blur(10px);
                    color: #ffffff;
                    padding: 10px 20px;
                    border-radius: 100px;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    width: fit-content;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .about-box svg { color: #c9f158; }

                .hero-center {
                    text-align: center;
                    max-width: 850px;
                    margin: auto;
                    z-index: 5;
                    position: relative;
                }

                .main-title {
                    font-size: 68px;
                    font-weight: 900;
                    letter-spacing: -3px;
                    line-height: 1.05;
                    margin: 20px 0;
                    color: #111;
                }

                .main-title .accent {
                    color: #c9f158;
                    -webkit-text-stroke: 1.5px #111;
                    text-shadow: 0 10px 40px rgba(201,241,88,0.4);
                }

                .hero-tagline {
                    font-size: 18px;
                    color: rgba(22,22,22,0.6);
                    font-weight: 500;
                    max-width: 560px;
                    margin: 0 auto;
                    line-height: 1.65;
                }

                .grid-showcase {
                    display: grid;
                    grid-template-columns: 1fr 1.1fr;
                    gap: 100px;
                    width: 100%;
                    align-items: center;
                    z-index: 5;
                }

                .tech-label {
                    color: #c9f158;
                    font-size: 13px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .tech-heading {
                    font-size: 52px;
                    font-weight: 800;
                    letter-spacing: -2px;
                    line-height: 1.1;
                    margin: 16px 0 28px 0;
                }

                /* ULTRA-PREMIUM FEATURE CARDS */
                .feature-pillar {
                    background: linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
                    border: 1px solid rgba(255,255,255,0.08);
                    padding: 32px;
                    border-radius: 24px;
                    display: flex;
                    gap: 24px;
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    backdrop-filter: blur(20px);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
                    position: relative;
                    overflow: hidden;
                }
                
                .feature-pillar::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(201,241,88,0.1), transparent 40%);
                    opacity: 0;
                    transition: opacity 0.5s ease;
                    z-index: 0;
                }

                .feature-pillar:hover {
                    border-color: rgba(201,241,88,0.4);
                    transform: translateY(-5px) scale(1.02);
                    box-shadow: 0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,241,88,0.2);
                }
                
                .feature-pillar:hover::before {
                    opacity: 1;
                }

                .pillar-content { z-index: 1; position: relative; }

                .pillar-icon {
                    background: linear-gradient(135deg, rgba(201,241,88,0.2) 0%, rgba(201,241,88,0.05) 100%);
                    color: #c9f158;
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    border: 1px solid rgba(201,241,88,0.3);
                    box-shadow: 0 8px 20px rgba(201,241,88,0.15);
                    z-index: 1;
                }

                .interactive-node-mesh {
                    position: absolute;
                    inset: 0;
                    opacity: 0.15;
                    background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0);
                    background-size: 48px 48px;
                    mask-image: linear-gradient(135deg, black, transparent 80%);
                }

                /* INSTALL SECTION */
                .install-section {
                    background: #ffffff;
                    min-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 100px 8% 40px 8%;
                    box-sizing: border-box;
                    position: relative;
                    overflow: hidden;
                }

                .install-glow {
                    position: absolute;
                    width: 800px;
                    height: 800px;
                    background: radial-gradient(circle, rgba(201,241,88,0.08) 0%, rgba(255,255,255,0) 70%);
                    top: -20%;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 0;
                    pointer-events: none;
                }

                .install-title {
                    font-size: 52px;
                    font-weight: 900;
                    letter-spacing: -2.5px;
                    text-align: center;
                    margin-bottom: 16px;
                    z-index: 2;
                }

                .install-subtitle {
                    font-size: 16px;
                    color: rgba(22,22,22,0.5);
                    font-weight: 500;
                    text-align: center;
                    max-width: 440px;
                    margin: 0 auto 56px auto;
                    line-height: 1.6;
                    z-index: 2;
                }

                .install-tabs {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 40px;
                    background: #f4f4f7;
                    padding: 6px;
                    border-radius: 16px;
                    z-index: 2;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
                }

                .install-tab {
                    padding: 12px 32px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    border: none;
                    background: transparent;
                    color: rgba(22,22,22,0.4);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    letter-spacing: 0.3px;
                    font-family: 'Montserrat', sans-serif;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .install-tab.active {
                    background: #111;
                    color: #ffffff;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                }
                .install-tab.active svg { color: #c9f158; }

                .install-web-card {
                    background: #ffffff;
                    border: 1px solid rgba(22,22,22,0.06);
                    border-radius: 24px;
                    padding: 48px;
                    max-width: 480px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.03);
                    z-index: 2;
                }

                .install-steps-card {
                    background: #111;
                    border-radius: 24px;
                    padding: 48px;
                    max-width: 480px;
                    width: 100%;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1);
                    z-index: 2;
                }

                .step-row {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    padding: 18px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }
                .step-row:last-child { border-bottom: none; }

                .step-num {
                    background: linear-gradient(135deg, rgba(201,241,88,0.2) 0%, rgba(201,241,88,0.05) 100%);
                    color: #c9f158;
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 800;
                    flex-shrink: 0;
                    border: 1px solid rgba(201,241,88,0.2);
                }

                .app-trigger-btn {
                    background: #111;
                    color: #ffffff;
                    border: none;
                    border-radius: 100px;
                    padding: 20px 48px;
                    font-size: 16px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    display: inline-flex;
                    align-items: center;
                    gap: 16px;
                    cursor: pointer;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                    position: relative;
                    overflow: hidden;
                    font-family: 'Montserrat', sans-serif;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    z-index: 2;
                }
                .app-trigger-btn::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
                    transform: translateX(-100%) skewX(-15deg);
                    transition: transform 0.7s ease;
                }
                .app-trigger-btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 25px 50px rgba(0,0,0,0.2);
                }
                .app-trigger-btn:hover::before { transform: translateX(100%) skewX(-15deg); }

                .btn-dot {
                    background: #c9f158;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    box-shadow: 0 0 12px #c9f158;
                }

                .footer-credits {
                    margin-top: 80px;
                    padding-top: 40px;
                    border-top: 1px solid rgba(0,0,0,0.06);
                    width: 100%;
                    text-align: center;
                    font-size: 14px;
                    font-weight: 600;
                    color: rgba(22,22,22,0.4);
                    letter-spacing: 0.5px;
                    z-index: 2;
                }

                @media (max-width: 1024px) {
                    .grid-showcase { grid-template-columns: 1fr; gap: 60px; }
                    .main-title { font-size: 48px; letter-spacing: -1.5px; }
                    .tech-heading { font-size: 40px; }
                    .install-title { font-size: 40px; }
                }
            `}</style>

            <div className="landing-scroll-container">

                <section className="sec-white">
                    {rupees.map((rupee, i) => (
                        <motion.div
                            key={rupee.id}
                            initial={{ opacity: 0.2, scale: 0.2, x: 0, y: 0 }}
                            animate={{ opacity: 1, scale: 1, x: rupee.burstX, y: rupee.burstY }}
                            transition={{ 
                                duration: 1.4, 
                                ease: [0.16, 1, 0.3, 1], 
                                delay: i * 0.1 
                            }}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginLeft: `-${rupee.size/2}px`,
                                marginTop: `-${rupee.size/2}px`,
                                zIndex: 1,
                                pointerEvents: 'none'
                            }}
                        >
                            <motion.div
                                className="rupee-bg"
                                animate={{
                                    x: rupee.driftX,
                                    y: rupee.driftY,
                                    rotate: rupee.rotate,
                                    color: rupee.colors,
                                    opacity: [0.16, 0.56, 0.24]
                                }}
                                transition={{
                                    duration: rupee.duration,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: 1.4 
                                }}
                                style={{ fontSize: rupee.size }}
                            >
                                Rs.
                            </motion.div>
                        </motion.div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 10 }}>
                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1.5px' }}>
                            blip<span style={{ color: '#c9f158' }}>.</span>
                        </div>
                        <div className="about-box">
                            <span>Personal Finance, Fast Finally!</span>
                        </div>
                    </div>

                    <div className="hero-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                            style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(22,22,22,0.4)', marginBottom: 16 }}
                        >
                            Now in Beta
                        </motion.div>

                        <motion.h1
                            className="main-title"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                        >
                            Track your money.<br />No long forms, just <span className="accent">speed.</span>
                        </motion.h1>

                        <motion.p
                            className="hero-tagline"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                        >
                            Log expenses in plain language. Split bills without the back-and-forth. Built for how you actually live.
                        </motion.p>
                    </div>

                    {/* Bottom footing */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '32px', zIndex: 10, fontSize: 13, fontWeight: 700, color: 'rgba(22,22,22,0.35)' }}>
                        <div>MADE FOR YOUNGSTERS</div>
                        <div>SCROLL TO EXPLORE ↓</div>
                    </div>
                </section>

                {/* ─── SECTION 2 ─── */}
                <section className="sec-charcoal">
                    <div className="interactive-node-mesh" />
                    <div className="glow-orb" />

                    <div className="grid-showcase" ref={featuresRef}>
                        <div style={{ zIndex: 2 }}>
                            <motion.div
                                className="tech-label"
                                initial={{ opacity: 0, x: -20 }}
                                animate={featuresInView ? { opacity: 1, x: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.1 }}
                            >
                                <Cpu size={16} /> How It Works
                            </motion.div>

                            <motion.h2
                                className="tech-heading"
                                initial={{ opacity: 0, y: 30 }}
                                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                            >
                                Designed to get out of your way.
                            </motion.h2>

                            <motion.p
                                style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, fontSize: 17, marginBottom: 48 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.3 }}
                            >
                                Other apps make you fill category dropdowns and pickers just to log a Rs. 12 tea. Blip parses what you type and figures out the rest automatically.
                            </motion.p>

                            <motion.div
                                style={{ 
                                    borderLeft: '3px solid #c9f158', 
                                    padding: '20px 28px',
                                    background: 'linear-gradient(90deg, rgba(201,241,88,0.05) 0%, transparent 100%)',
                                    borderRadius: '0 16px 16px 0',
                                    display: 'inline-block'
                                }}
                                initial={{ opacity: 0, x: -10 }}
                                animate={featuresInView ? { opacity: 1, x: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.4 }}
                            >
                                <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#c9f158', marginBottom: 8 }}>Try typing:</div>
                                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, fontStyle: 'italic', fontWeight: 500 }}>"1200 Birthday Treat"</div>
                            </motion.div>
                        </div>

                        {/* feature cards */}
                        <motion.div 
                            style={{ display: 'flex', flexDirection: 'column', gap: 24, zIndex: 2 }}
                            variants={cardContainerVariants}
                            initial="hidden"
                            animate={featuresInView ? "show" : "hidden"}
                        >
                            {pillars.map((p, i) => (
                                <motion.div
                                    key={i}
                                    className="feature-pillar"
                                    variants={cardItemVariants}
                                >
                                    <div className="pillar-icon">{p.icon}</div>
                                    <div className="pillar-content">
                                        <h4 style={{ margin: '0 0 10px 0', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>{p.title}</h4>
                                        <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{p.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* ─── SECTION 3: INSTALL / GET STARTED ─── */}
                <section className="install-section">
                    <div className="install-glow" />

                    <motion.h2
                        className="install-title"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                        Get blip. on your phone.
                    </motion.h2>

                    <motion.p
                        className="install-subtitle"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                    >
                        blip. is a PWA — install it directly from your browser. No App Store needed.
                    </motion.p>

                    <motion.div
                        className="install-tabs"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <button className={`install-tab ${activeInstall === 'ios' ? 'active' : ''}`} onClick={() => setActiveInstall('ios')}>
                            <Smartphone size={16} /> iPhone (iOS)
                        </button>
                        <button className={`install-tab ${activeInstall === 'android' ? 'active' : ''}`} onClick={() => setActiveInstall('android')}>
                            <Smartphone size={16} /> Android
                        </button>
                        <button className={`install-tab ${activeInstall === 'web' ? 'active' : ''}`} onClick={() => setActiveInstall('web')}>
                            <Monitor size={16} /> Desktop
                        </button>
                    </motion.div>

                    {activeInstall !== 'web' ? (
                        <motion.div
                            key={activeInstall}
                            className="install-steps-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#c9f158', marginBottom: 32 }}>
                                {activeInstall === 'ios' ? '— iPhone Install Guide' : '— Android Install Guide'}
                            </div>
                            {installSteps[activeInstall].map((step, i) => (
                                <motion.div
                                    key={i}
                                    className="step-row"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: i * 0.08 }}
                                >
                                    <div className="step-num">{i + 1}</div>
                                    <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{step.text}</span>
                                </motion.div>
                            ))}
                            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textAlign: 'center' }}>
                                One tap from your Home Screen. No App Store needed.
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="web"
                            className="install-web-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45 }}
                        >
                            <Monitor size={40} style={{ color: 'rgba(22,22,22,0.3)', marginBottom: 20 }} />
                            <h3 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>Better on mobile</h3>
                            <p style={{ fontSize: 15, color: 'rgba(22,22,22,0.6)', lineHeight: 1.7, margin: '0 0 32px 0', fontWeight: 500 }}>
                                blip. is designed for quick, on-the-go logging — the moment you split a bill, not later. Open it on your phone for the full experience.
                            </p>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(22,22,22,0.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 24 }}>
                                Or continue on web →
                            </div>
                            <button className="app-trigger-btn" onClick={onGetStarted} style={{ margin: '0 auto', display: 'flex' }}>
                                <span>Open blip.</span>
                                <div className="btn-dot" />
                                <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {activeInstall !== 'web' && (
                        <motion.div
                            style={{ marginTop: 40 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <button className="app-trigger-btn" onClick={onGetStarted}>
                                <span>Open blip. now</span>
                                <div className="btn-dot" />
                                <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '60px', zIndex: 5 }}>
                        {['PWA Ready', 'No App Store', 'Works Offline', 'Free to Use'].map(badge => (
                            <div key={badge} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 12, fontWeight: 800, color: 'rgba(22,22,22,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                <CheckCircle2 size={14} style={{ color: '#c9f158' }} /> {badge}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="footer-credits">
                        Made with <Heart size={14} fill="#ff4b4b" color="#ff4b4b" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }} /> by Shashank
                    </div>
                </section>
            </div>
        </>
    );
}