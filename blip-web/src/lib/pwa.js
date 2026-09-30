import { api } from './api';
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const pushSupported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; window.dispatchEvent(new Event('blip-install-ready')); });
export const canPromptInstall = () => Boolean(installPrompt);
export async function promptInstall() {
    if (!installPrompt) return false;
    const event = installPrompt; installPrompt = null;
    await event.prompt();
    return (await event.userChoice).outcome === 'accepted';
}
export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
    return navigator.serviceWorker.register('/sw.js');
}
export async function enablePush(publicKey) {
    if (!pushSupported()) throw new Error(isIOS() ? 'Add Blip to your Home Screen, then open it there to enable notifications.' : 'This browser does not support device notifications.');
    // Permission must be requested directly from the button gesture on iOS.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notifications are blocked. Allow them in your browser or device settings.' : 'You can enable notifications whenever you’re ready.');
    await registerServiceWorker();
    let readyTimer;
    const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => { readyTimer = setTimeout(() => reject(new Error('Notification setup timed out. Reopen Blip and try again.')), 15000); }),
    ]).finally(() => clearTimeout(readyTimer));
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        const padding = '='.repeat((4 - publicKey.length % 4) % 4);
        const binary = atob((publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'));
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(binary, char => char.charCodeAt(0)) });
    }
    await api.subscribePush(subscription.toJSON());
    return subscription;
}
export async function disablePush() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    // Stop browser delivery even if the API is unavailable during logout.
    await subscription.unsubscribe();
    await api.unsubscribePush(subscription.endpoint);
}
