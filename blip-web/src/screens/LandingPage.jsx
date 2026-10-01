import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleCheck, Download, ReceiptText, Sparkles, Users, Wallet } from 'lucide-react';
import { canPromptInstall, promptInstall } from '../lib/pwa';
import './LandingPage.css';
const features = [{
  number: '01',
  icon: ReceiptText,
  title: 'Write it like you think it.',
  description: 'Type “coffee 180” and Blip turns it into an expense. Your everyday spending, logged in a moment.',
  color: 'lime'
}, {
  number: '02',
  icon: Users,
  title: 'Keep the group in the loop.',
  description: 'Split the dinner, the trip, or the rent. See who owes whom without chasing messages.',
  color: 'peach'
}, {
  number: '03',
  icon: Wallet,
  title: 'Know where you stand.',
  description: 'Your personal spending and shared balances stay clear, so your money picture makes sense.',
  color: 'lavender'
}];
const installSteps = {
  ios: ['Open Blip in Safari on your iPhone.', 'Tap Share at the bottom of the browser.', 'Choose “Add to Home Screen”, then tap Add.'],
  android: ['Open Blip in Chrome on your Android phone.', 'Tap the browser menu in the top right.', 'Choose “Install app” or “Add to Home screen”.']
};
function ProductPreview() {
  return <div className="landing-preview" role="img" aria-label="Illustration of Blip showing a monthly spending view and two recent expenses">
        <div className="landing-preview-orbit landing-preview-orbit-one" />
        <div className="landing-preview-orbit landing-preview-orbit-two" />
        <div className="landing-preview-tag landing-preview-tag-top"><span className="landing-preview-tag-icon"><Check size={14} /></span> expense saved</div>
        <div className="landing-preview-tag landing-preview-tag-bottom"><span className="landing-preview-tag-avatars"><i>S</i><i>A</i></span> split, sorted.</div>
        <div className="landing-phone">
            <div className="landing-phone-bar"><span>9:41</span><span className="landing-phone-signal">●●● ▰</span></div>
            <div className="landing-phone-content">
                <div className="landing-phone-heading"><span>blip<span>.</span></span><span className="landing-phone-avatar">S</span></div>
                <div className="landing-phone-welcome">GOOD MORNING, SAM</div>
                <div className="landing-phone-title">Your money,<br />in focus.</div>
                <div className="landing-phone-balance"><span>SPENT THIS MONTH</span><strong>₹12,480</strong><div className="landing-phone-meter"><i /></div><small>₹7,520 left in your budget</small></div>
                <div className="landing-phone-section-title"><span>Recent activity</span><span>See all <ArrowUpRight size={12} /></span></div>
                <div className="landing-phone-transaction"><span className="landing-phone-transaction-icon">☕</span><span><strong>Coffee with Sam</strong><small>Food · Today</small></span><b>− ₹180</b></div>
                <div className="landing-phone-transaction"><span className="landing-phone-transaction-icon">↗</span><span><strong>Dinner split</strong><small>Friends · Yesterday</small></span><b>₹640</b></div>
                <div className="landing-phone-input"><span>coffee 180</span><span><ArrowRight size={16} /></span></div>
            </div>
        </div>
    </div>;
}
export default function LandingPage({
  onGetStarted
}) {
  const [installPlatform, setInstallPlatform] = useState('ios');
  const [installMessage, setInstallMessage] = useState('');
  const handleInstall = async () => {
    if (canPromptInstall()) {
      const accepted = await promptInstall();
      setInstallMessage(accepted ? 'Blip is ready on your home screen.' : 'You can install Blip from your browser menu anytime.');
    } else {
      setInstallMessage('Use your browser menu to add Blip to your home screen.');
    }
  };
  return <div className="landing-page"><div className="landing-shell">
        <header className="landing-nav">
            <a className="landing-logo" href="#top" aria-label="Blip home">blip<span>.</span></a>
            <nav aria-label="Landing page"><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#install">Get the app</a></nav>
            <button className="landing-nav-button" onClick={onGetStarted}>Open Blip <ArrowUpRight size={16} /></button>
        </header>
        <main id="top">
            <section className="landing-hero" aria-labelledby="landing-title">
                <div className="landing-hero-copy"><span className="landing-eyebrow"><span className="landing-eyebrow-dot" /> MONEY, WITHOUT THE MATH HEADACHE</span><h1 id="landing-title">Money moves.<br /><em>Keep up.</em></h1><p>Log expenses as fast as they happen. Split the shared ones. See the whole picture, all in one simple place.</p><div className="landing-hero-actions"><button className="landing-button landing-button-dark" onClick={onGetStarted}>Get started <ArrowUpRight size={18} /></button><a className="landing-text-link" href="#how-it-works">See how it works <ArrowDown size={16} /></a></div><div className="landing-hero-footnote"><span className="landing-footnote-icons"><ReceiptText size={16} /><Users size={16} /><Wallet size={16} /></span><span>Expenses, splits & insights — together.</span></div></div>
                <ProductPreview />
            </section>
            <div className="landing-strip" aria-label="Blip highlights"><span>LESS TYPING</span><i /><span>MORE CLARITY</span><i /><span>FAIRER SPLITS</span><i /><span>BETTER MONEY DAYS</span></div>
            <section className="landing-how landing-section" id="how-it-works" aria-labelledby="landing-how-title"><div className="landing-section-heading"><span className="landing-kicker">THE SIMPLE IDEA</span><h2 id="landing-how-title">From “I spent” to<br /><em>all sorted.</em></h2><p>Blip takes the small money moments that add up and puts them in one calm place.</p></div><div className="landing-how-example"><div className="landing-example-label"><Sparkles size={15} /> IT STARTS WITH A THOUGHT</div><div className="landing-example-entry"><span>“</span>lunch 450<span className="landing-example-cursor" /></div><div className="landing-example-arrow"><ArrowDown size={20} /></div><div className="landing-example-result"><div className="landing-example-result-icon">🍜</div><div><strong>Lunch</strong><small>Food · Today</small></div><b>₹450</b><CircleCheck size={20} /></div><div className="landing-example-caption">That’s it. Your expense is in.</div></div></section>
            <section className="landing-features landing-section" id="features" aria-labelledby="landing-features-title"><div className="landing-features-heading"><span className="landing-kicker">WHY BLIP</span><h2 id="landing-features-title">Good with money.<br /><em>Easy on you.</em></h2></div><div className="landing-feature-grid">{features.map(({
              number,
              icon: Icon,
              title,
              description,
              color
            }) => <article className={'landing-feature landing-feature-' + color} key={number}><div className="landing-feature-top"><span>{number} / 03</span><Icon size={24} strokeWidth={1.7} /></div><div><h3>{title}</h3><p>{description}</p></div><ChevronRight size={20} className="landing-feature-arrow" aria-hidden="true" /></article>)}</div></section>
            <section className="landing-split landing-section" aria-labelledby="landing-split-title"><div className="landing-split-copy"><span className="landing-kicker">BETTER TOGETHER</span><h2 id="landing-split-title">The bill is shared.<br /><em>The awkwardness isn’t.</em></h2><p>Keep tabs on group expenses and balances in one place. Everyone can see where things stand.</p><button className="landing-button landing-button-lime" onClick={onGetStarted}>Start splitting <ArrowUpRight size={18} /></button></div><div className="landing-split-card"><div className="landing-split-card-head"><div><small>FRIENDS</small><strong>Friday dinner</strong></div><span>✦</span></div><div className="landing-split-total"><span>Total bill</span><strong>₹2,400</strong></div><div className="landing-split-person"><span className="landing-person-avatar">S</span><span>Sam <small>paid in full</small></span><strong>₹2,400</strong></div><div className="landing-split-person"><span className="landing-person-avatar peach">A</span><span>Alex <small>owes Sam</small></span><strong>₹800</strong></div><div className="landing-split-person"><span className="landing-person-avatar lavender">R</span><span>Riya <small>owes Sam</small></span><strong>₹800</strong></div><div className="landing-split-card-foot"><CircleCheck size={17} /> Everyone’s share, in one view</div></div></section>
            <section className="landing-install landing-section" id="install" aria-labelledby="landing-install-title"><div className="landing-install-intro"><span className="landing-kicker">TAKE IT WITH YOU</span><h2 id="landing-install-title">Your money sidekick,<br /><em>right on your phone.</em></h2><p>Blip works in your browser. Add it to your home screen for easy access whenever life happens.</p><button className="landing-button landing-button-dark" onClick={onGetStarted}>Open Blip <ArrowUpRight size={18} /></button></div><div className="landing-install-guide"><div className="landing-install-guide-title"><Download size={19} /><strong>Add to home screen</strong></div><div className="landing-install-tabs" aria-label="Device type"><button aria-pressed={installPlatform === 'ios'} onClick={() => {
                setInstallPlatform('ios');
                setInstallMessage('');
              }}>iPhone</button><button aria-pressed={installPlatform === 'android'} onClick={() => {
                setInstallPlatform('android');
                setInstallMessage('');
              }}>Android</button></div><div className="landing-install-steps">{installSteps[installPlatform].map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></div>)}</div>{installPlatform === 'android' && <button className="landing-install-action" onClick={handleInstall}>Install from this browser <ArrowRight size={16} /></button>}{installMessage && <p className="landing-install-message" role="status">{installMessage}</p>}</div></section>
        </main>
        <footer className="landing-footer"><a className="landing-logo" href="#top" aria-label="Back to top">blip<span>.</span></a><span>Small moments. Clearer money.</span><span>Made with care by Shashank.</span></footer>
    </div></div>;
}
