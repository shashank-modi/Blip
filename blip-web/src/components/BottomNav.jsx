import { useApp } from '../store/AppContext';

const TABS = [
    {
        id: 'investments',
        label: 'Invest',
        icon: (active) => (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "1.8"} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        ),
    },
    {
        id: 'friends',
        label: 'Friends',
        icon: (active) => (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "1.8"} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    {
        id: 'home',
        label: 'Home',
        icon: (active) => (
            <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "1.8"} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        id: 'profile',
        label: 'Profile',
        icon: (active) => (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "1.8"} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a4 4 0 100-8 4 4 0 000 8z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            </svg>
        ),
    },
];

export default function BottomNav() {
    const { currentScreen, setCurrentScreen } = useApp();

    if (['onboarding', 'logs'].includes(currentScreen)) return null;

    const activeIndex = TABS.findIndex(t => t.id === currentScreen);
    const bubbleIndex = activeIndex === -1 ? 1 : activeIndex;

    return (
        <>
            <style>{`
                .blip-nav {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: calc(100% - 36px); /* Slightly wider for 4 icons */
                    max-width: 360px; /* Adjusted from 320px */
                    height: 67px;
                    background: rgba(255, 255, 255, 0.88);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 99px;
                    border: 1px solid rgba(255,255,255,0.9);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.10);
                    display: flex;
                    align-items: center;
                    padding: 4px;
                    z-index: 100;
                }

                .blip-nav-bubble {
                    position: absolute;
                    top: 5px;
                    height: calc(100% - 10px);
                    /* MAGIC MATH: 100% / 4 items = 25% */
                    width: calc(25% - 4px); 
                    background: var(--indigo);
                    border-radius: 99px;
                    box-shadow: 0 2px 8px #05050574;
                    transition: transform 0.4s cubic-bezier(0.34, 1.48, 0.64, 1);
                    pointer-events: none;
                    left: 7px;
                }

                .blip-nav-tab {
                    flex: 1;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    cursor: pointer;
                    position: relative;
                    z-index: 1;
                    border-radius: 99px;
                    transition: transform 0.1s ease;
                }

                .blip-nav-label {
                    font-family: 'Montserrat', sans-serif;
                    font-size: 9px; /* Shrunk slightly for fit */
                    font-weight: 700;
                    line-height: 1;
                }
            `}</style>

            <div className="blip-nav">
                <div
                    className="blip-nav-bubble"
                    style={{
                        /* Transform moves by 100% of the bubble width per index */
                        transform: `translateX(calc(${bubbleIndex} * 100%))`,
                    }}
                />

                {TABS.map((tab, i) => {
                    const isActive = i === bubbleIndex;
                    return (
                        <div
                            key={tab.id}
                            className="blip-nav-tab"
                            onClick={() => setCurrentScreen(tab.id)}
                        >
                            <div
                                className={`blip-nav-icon${isActive ? ' active-icon' : ''}`}
                                style={{ color: isActive ? 'white' : 'var(--text-3)' }}
                            >
                                {tab.icon(isActive)}
                            </div>
                            <div
                                className="blip-nav-label"
                                style={{
                                    color: isActive ? 'rgba(255,255,255,0.92)' : 'var(--text-3)',
                                    opacity: isActive ? 1 : 0.7,
                                }}
                            >
                                {tab.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}