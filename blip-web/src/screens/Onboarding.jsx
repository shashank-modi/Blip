import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Users, WalletMinimal as Wallet, Check, Receipt, ShieldCheck, HandCoins } from 'lucide-react';
import { useApp } from '../store/AppContext';
import PhoneInput from '../components/PhoneInput';
import { phoneNumber } from '../utils/phone';
export default function Onboarding() {
    const { completeOnboarding, user } = useApp();
    const [step,setStep] = useState(0);
    const page = useRef(null);
    useEffect(() => { page.current?.closest('.screen')?.scrollTo({top:0}); }, [step]);
    const [phone,setPhone] = useState(user.phone || user.suggestedPhone || '');
    const [budget,setBudget] = useState('');
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState('');
    const validBudget = budget === '' || (Number.isFinite(Number(budget)) && Number(budget) >= 0 && Math.abs(Number(budget)*100-Math.round(Number(budget)*100)) < .000001);
    const finish = async () => {
        setBusy(true);setError('');
        try { await completeOnboarding(user.name, budget || 0, '', phoneNumber(phone)); }
        catch (err) { setError(err.message || 'Could not save your details. Please try again.'); }
        finally { setBusy(false); }
    };
    return <div className="onboarding-page" ref={page}>
        <aside className="onboarding-story"><div className="onboarding-brand">blip<span>.</span></div><span className="eyebrow">GOOD COMPANY. CLEAR BALANCES.</span><h1>Make memories.<br/><span>Split the rest.</span></h1><p>Dinner with friends. A weekend away. A place you call home. Keep the money part simple.</p><div className="onboarding-preview"><div className="onboarding-preview-top"><span>Weekend away</span><Users size={18}/></div><strong>Rs. 3,600<span>shared between 3 friends</span></strong><div className="onboarding-avatars"><b>YOU</b><b>SA</b><b>RI</b><span>Rs. 1,200 each</span></div><div className="onboarding-preview-status"><Check size={16}/>Everyone knows their share</div><small>Just an example. Your real balances start at zero.</small></div></aside>
        <section className="onboarding-setup"><div className="onboarding-progress" aria-label={`Setup step ${step+1} of 3`}>{['The basics','Your number','Your wallet'].map((name,index)=><span key={name} className={index<=step?'active':''}><b>{index<step?<Check size={12}/>:index+1}</b>{name}</span>)}</div>
            <div className="onboarding-step" key={step}>
                {step===0 && <><div className="feature-icon"><Users size={25}/></div><span className="eyebrow">WELCOME{user.name ? `, ${user.name.split(' ')[0].toUpperCase()}` : ''}</span><h2>A little setup.<br/>A lot less awkward.</h2><p>Here’s how you’ll share expenses on Blip.</p><div className="onboarding-features"><div><Users/><span><strong>Start with your people</strong>Add a friend by phone number, or create a group for a trip or home.</span></div><div><Receipt/><span><strong>Add the bill, choose the split</strong>Say who paid. Split equally, enter exact amounts, or use shares.</span></div><div><HandCoins/><span><strong>Settle at your own pace</strong>Record a full or partial payment. Everyone’s balance updates.</span></div></div></>}
                {step===1 && <><div className="feature-icon"><Users size={25}/></div><span className="eyebrow">YOUR PEOPLE, ONE SEARCH AWAY</span><h2>Let friends<br/>find you.</h2><p>Confirm your phone number and country code. Friends who know your number can find you and split bills with you.</p><label className="input-label">Your phone number</label><PhoneInput contactLabel="Use my contact card" value={phone} onChange={setPhone}/><div className="privacy-note"><ShieldCheck size={18}/><span>Used to connect you with friends. This does not send a text message or verify ownership of the number.</span></div></>}
                {step===2 && <><div className="feature-icon"><Wallet size={25}/></div><span className="eyebrow">A LITTLE SPACE FOR YOURSELF</span><h2>Your money.<br/>Your monthly plan.</h2><p>Wallet keeps your personal expenses separate from shared bills. Set a monthly spending limit, or leave it blank for now.</p><label className="input-label" htmlFor="onboarding-budget">Monthly budget <span>Optional</span></label><div className="budget-input"><span>Rs. </span><input id="onboarding-budget" type="number" min="0" step="0.01" inputMode="decimal" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="e.g. 20,000"/></div><p className="field-help">You can change this in Profile. A budget is a spending limit, not an income entry.</p><div className="onboarding-ready"><Check size={18}/><span>You’re ready to add your first friend.</span></div></>}
                {error && <p role="alert" className="form-error">{error}</p>}
                <div className="onboarding-controls">{step>0 && <button disabled={busy} className="button-secondary" onClick={()=>setStep(step-1)} aria-label="Previous setup step"><ArrowLeft size={19}/></button>}<button className="button-primary" disabled={busy||(step===1&&!phoneNumber(phone))||(step===2&&!validBudget)} onClick={()=>step<2?setStep(step+1):finish()}>{busy?'Saving…':step===2?'Start with Friends':'Continue'}<ArrowRight size={18}/></button></div>
                <p className="onboarding-footnote">{step===2?'Your setup, your pace. You can change these details later.':'No awkward maths. Just clear balances.'}</p>
            </div>
        </section>
    </div>;
}
