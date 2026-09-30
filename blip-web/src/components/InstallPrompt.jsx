import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { isInstalled, isIOS, canPromptInstall, promptInstall } from '../lib/pwa';
export default function InstallPrompt() {
    const [visible, setVisible] = useState(false);
    const [native, setNative] = useState(canPromptInstall);
    const [instructions, setInstructions] = useState(false);
    useEffect(() => {
        const update = () => {
            setNative(canPromptInstall());
            const dismissed = Number(localStorage.getItem('blip_install_dismissed') || 0);
            setVisible(!isInstalled() && Date.now() - dismissed > 7 * 86400000 && (isIOS() || /Android/i.test(navigator.userAgent) || canPromptInstall()));
        };
        const timer = setTimeout(update, 2500);
        window.addEventListener('blip-install-ready', update);
        window.addEventListener('appinstalled', update);
        return () => { clearTimeout(timer); window.removeEventListener('blip-install-ready', update); window.removeEventListener('appinstalled', update); };
    }, []);
    if (!visible) return null;
    return <aside aria-label="Install Blip" style={{ position: 'fixed', bottom: 'max(18px, env(safe-area-inset-bottom))', left: 16, right: 16, margin: 'auto', maxWidth: 420, background: '#c9f158', color: '#202020', borderRadius: 24, padding: 22, zIndex: 500, boxShadow: '0 12px 50px #0005' }}>
        <button aria-label="Dismiss install suggestion" onClick={() => { setVisible(false); localStorage.setItem('blip_install_dismissed', String(Date.now())); }} style={{ position: 'absolute', right: 14, top: 14 }}><X size={18} /></button>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Your circle. One tap away.</div>
        <p style={{ fontSize: 12, lineHeight: 1.6, margin: '0 20px 14px 0' }}>Add blip. to your Home Screen for quick splits and device notifications.</p>
        <button onClick={async () => { if (native) { const accepted = await promptInstall(); if (accepted) setVisible(false); else setNative(false); } else setInstructions(true); }} style={{ background: '#202020', color: 'white', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 12 }}>{isIOS() ? <Share size={16} /> : <Download size={16} />} {native ? 'Install blip.' : 'Add to Home Screen'}</button>
        {instructions && <p style={{ fontSize: 12, lineHeight: 1.7, margin: '14px 0 0' }}>{isIOS() ? 'Open this page in Safari, tap Share, choose Add to Home Screen, then tap Add. Open Blip from the new icon.' : 'Open your browser menu (⋮), choose Install app or Add to Home screen, then confirm.'}</p>}
    </aside>;
}
