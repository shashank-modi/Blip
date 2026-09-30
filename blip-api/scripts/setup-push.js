import { readFile, appendFile } from 'node:fs/promises';
import webpush from 'web-push';
import dotenv from 'dotenv';
const path = new URL('../.env', import.meta.url);
const existing = await readFile(path, 'utf8').catch(() => '');
const values = dotenv.parse(existing);
if (values.VAPID_PUBLIC_KEY || values.VAPID_PRIVATE_KEY) {
    if (!values.VAPID_PUBLIC_KEY || !values.VAPID_PRIVATE_KEY) throw new Error('Both VAPID keys must be configured together. Existing keys were preserved.');
    console.log('Existing VAPID keys preserved.');
} else {
    const keys = webpush.generateVAPIDKeys();
    await appendFile(path, `\n# Device notifications: copy these server-only values to the backend host when deploying.\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://blip-eta.vercel.app\n`, { mode: 0o600 });
    console.log('VAPID keys generated in the ignored blip-api/.env. Keys are not printed.');
}
