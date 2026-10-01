import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { enablePush, disablePush, pushSupported, isIOS, isInstalled } from '../lib/pwa';

export default function PushSettings() {
    const [config,setConfig] = useState(null);
    const [enabled,setEnabled] = useState(false);
    const [busy,setBusy] = useState(false);
    useEffect(()=>{
        let active=true;
        api.getPushConfig().then(value=>{if(active)setConfig(value);}).catch(()=>{});
        if(pushSupported()) navigator.serviceWorker.getRegistration().then(async registration=>{
            const subscription=await registration?.pushManager.getSubscription();
            if(subscription && Notification.permission==='granted') {
                await api.subscribePush(subscription.toJSON());
                if(active)setEnabled(true);
            }
        }).catch(()=>{});
        return ()=>{active=false;};
    },[]);
    const toggle=async()=>{
        if(busy)return;
        if(!window.isSecureContext) return toast('Open Blip over HTTPS to enable notifications. They cannot work on a local HTTP IP address.');
        if(isIOS() && !isInstalled()) return toast('On iPhone, add Blip to your Home Screen from Safari’s Share menu, then open its icon to enable notifications.',{duration:6500});
        if(!pushSupported()) return toast.error('Use an up-to-date browser to enable device notifications.');
        setBusy(true);
        try {
            // Keep the permission request in the click gesture; config is prefetched.
            if(enabled){await disablePush();setEnabled(false);return;}
            if(!config?.enabled){
                const fresh=await api.getPushConfig();setConfig(fresh);
                toast(fresh.enabled?'Ready. Tap Enable notifications to allow them on this device.':'Device notifications are not configured on the server yet.');
                return;
            }
            await enablePush(config.publicKey);setEnabled(true);
            toast.success('Notifications enabled');
        } catch(err){toast.error(err.message || 'Could not enable notifications. Try again.');}
        finally{setBusy(false);}
    };
    const sendTest=async()=>{
        if(busy||!enabled)return;
        setBusy(true);
        try{
            await api.testPush();
            toast.success('Test notification queued. Check your device.');
        }catch(err){toast.error(err.message || 'Could not send a test notification.');}
        finally{setBusy(false);}
    };
    return <div className="notification-control"><button className="button-secondary" disabled={busy} onClick={toggle} aria-pressed={enabled}>{enabled?<BellRing size={16}/>:<Bell size={16}/>} {busy?'Connecting…':enabled?'Turn off notifications':'Enable notifications'}</button>{enabled&&<button className="button-secondary" disabled={busy} onClick={sendTest}>Send test notification</button>}</div>;
}
