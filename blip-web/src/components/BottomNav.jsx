import { Users, WalletMinimal as Wallet, List, UserRound, ChartNoAxesCombined, ReceiptText, ArrowUpRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
const tabs = [{id:'friends',label:'Friends',Icon:Users},{id:'home',label:'Wallet',Icon:Wallet},{id:'activity',label:'Activity',Icon:List},{id:'profile',label:'Profile',Icon:UserRound}];
export default function BottomNav() {
    const { currentScreen, setCurrentScreen, notifications = [] } = useApp();
    if (currentScreen === 'onboarding') return null;
    const walletActive = ['home','logs','dashboard'].includes(currentScreen);
    return <nav className="blip-nav" aria-label="Main navigation">
        <button className="nav-brand" onClick={() => setCurrentScreen('friends')} aria-label="Blip Friends">blip<span>.</span></button>
        <span className="nav-caption">YOUR EVERYDAY MONEY</span>
        <div className="nav-primary">{tabs.map(({id,label,Icon}) => {
            const active = id === 'home' ? walletActive : currentScreen === id;
            return <button key={id} aria-label={label} aria-current={active ? 'page' : undefined} className={`blip-nav-tab${active ? ' is-active' : ''}`} onClick={() => setCurrentScreen(id)}>
                <Icon size={21} strokeWidth={active ? 2.3 : 1.7} /><span>{label}</span>{id === 'activity' && notifications.some(item => !item.read_at) && <i className="nav-unread" aria-label="Unread activity" />}
            </button>;
        })}</div>
        <div className="nav-secondary"><span className="nav-caption">YOUR WALLET</span><button aria-current={currentScreen === 'dashboard' ? 'page' : undefined} onClick={() => setCurrentScreen('dashboard')}><ChartNoAxesCombined size={19} />Dashboard<ArrowUpRight size={14}/></button><button aria-current={currentScreen === 'logs' ? 'page' : undefined} onClick={() => setCurrentScreen('logs')}><ReceiptText size={19} />Transactions<ArrowUpRight size={14}/></button></div>
        <div className="nav-footer"><span className="nav-footer-dot" />Less settling.<br/>More living.<small>blip. / 3.0.0</small></div>
    </nav>;
}
