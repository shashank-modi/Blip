import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { api } from '../lib/api';
import { enablePush, isInstalled, isIOS, pushSupported } from '../lib/pwa';

const DISMISSED_KEY = 'blip_push_prompt_dismissed';
const OPT_OUT_KEY = 'blip_push_opt_out';
export default function NotificationPrompt({ onReady }) {
    const [config, setConfig] = useState(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const needsInstall = isIOS() && !isInstalled();
    const dismissedKey = needsInstall ? 'blip_push_install_dismissed' : DISMISSED_KEY;
    useEffect(() => {
        let active = true;
        const prepare = async () => {
            try {
                let dismissed = 0, optedOut = false;
                try { dismissed = Number(localStorage.getItem(dismissedKey) || 0); optedOut = localStorage.getItem(OPT_OUT_KEY) === 'true'; } catch { /* Storage is optional. */ }
                if (!window.isSecureContext || (!pushSupported() && !needsInstall) || optedOut || ('Notification' in window && Notification.permission === 'denied')) return;
                const settings = await api.getPushConfig();
                if (!active || !settings.enabled) return;
                if (pushSupported() && Notification.permission === 'granted') {
                    const registration = await navigator.serviceWorker.getRegistration();
                    const subscription = await registration?.pushManager.getSubscription();
                    if (subscription) { await api.subscribePush(subscription.toJSON()); return; }
                }
                if (Date.now() - dismissed < 7 * 86400000) return;
                if (active) { setConfig(settings); setOpen(true); return true; }
            } catch { /* Settings remain available in Activity if startup is offline. */ }
            return false;
        };
        prepare().then(showing => { if (active && !showing) onReady(true); });
        return () => { active = false; };
    }, [needsInstall, dismissedKey, onReady]);
    const dismiss = () => {
        if (busy) return;
        try { localStorage.setItem(dismissedKey, String(Date.now())); } catch { /* Storage is optional. */ }
        setOpen(false); onReady(true);
    };
    const enable = async () => {
        if (busy || !config?.publicKey) return;
        setBusy(true); setError('');
        try {
            // No async work before this call: the native prompt needs this tap.
            await enablePush(config.publicKey);
            try { localStorage.removeItem(OPT_OUT_KEY); } catch { /* Storage is optional. */ }
            setOpen(false); onReady(true);
        } catch (err) { setError(err.message || 'Could not connect. Please try again.'); }
        finally { setBusy(false); }
    };
    return <BottomSheet isOpen={open} onClose={dismiss} title="Stay up to date">
        <div className="notification-intro"><BellRing size={32}/><p>Know when friends add a bill or record a payment. Turn on notifications for this device.</p></div>
        {needsInstall ? <><p className="field-help">On iPhone or iPad, open Blip in Safari, tap Share, then Add to Home Screen. Open the new Blip icon to allow notifications.</p><button className="button-primary" onClick={dismiss}>Got it</button></> : <><button className="button-primary" disabled={busy} onClick={enable}>{busy ? 'Connecting…' : 'Allow notifications'}</button><button className="notification-later" disabled={busy} onClick={dismiss}>Not now</button></>}
        {error && <p className="form-error" role="alert">{error}</p>}
    </BottomSheet>;
}
