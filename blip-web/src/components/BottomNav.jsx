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
            <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? "2.5" : "1.8"}
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 11a4 4 0 100-8 4 4 0 000 8z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"
                />
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
                    position: absolute;
                    bottom: 18px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: calc(100% - 48px);
                    max-width: 320px;
                    height: 62px;
                    background: rgba(255, 255, 255, 0.88);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 99px;
                    border: 1px solid rgba(255,255,255,0.9);
                    box-shadow:
                        0 8px 32px rgba(0,0,0,0.10),
                        0 2px 8px rgba(0,0,0,0.06),
                        0 0 0 1px rgba(0,0,0,0.04);
                    display: flex;
                    align-items: center;
                    padding: 5px;
                    z-index: 100;
                    user-select: none;
                }

                .blip-nav-bubble {
                    position: absolute;
                    top: 5px;
                    height: calc(100% - 10px);
                    width: calc(33.333% - 4px);
                    background: var(--indigo);
                    border-radius: 99px;
                    box-shadow: 0 2px 8px #05050593;
                    transition: transform 0.42s cubic-bezier(0.34, 1.48, 0.64, 1);
                    pointer-events: none;
                    left: 2px;
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
                    -webkit-tap-highlight-color: transparent;
                    transition: transform 0.12s ease;
                }

                .blip-nav-tab:active {
                    transform: scale(0.88);
                }

                .blip-nav-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
                }

                .blip-nav-icon.active-icon {
                    transform: translateY(-1px) scale(1.08);
                }

                .blip-nav-label {
                    font-family: 'Montserrat', sans-serif;
                    font-size: 9.5px;
                    font-weight: 700;
                    letter-spacing: 0.15px;
                    transition: color 0.2s ease, opacity 0.2s ease;
                    line-height: 1;
                }
            `}</style>

            <div className="blip-nav">
                {/* Sliding bubble — translateX by slot width × index */}
                <div
                    className="blip-nav-bubble"
                    style={{
                        transform: `translateX(calc(${bubbleIndex} * (100% + 4px)))`,
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