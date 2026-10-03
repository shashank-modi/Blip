import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = (await readFile(new URL('../src/lib/pwa.js', import.meta.url), 'utf8')).replace("import { api } from './api';", '').replaceAll('export ', '');
function fixture({permission = 'default', answer = 'granted', existing = false} = {}) {
    const calls = [];
    const subscription = { toJSON: () => ({endpoint:'fixture'}), unsubscribe: async () => true };
    const registration = {pushManager:{getSubscription:async()=>existing ? subscription : null, subscribe:async()=>{calls.push('subscribe');return subscription;}}};
    const notification = { permission, requestPermission: () => {calls.push('permission');return Promise.resolve(answer);} };
    const serviceWorker = {register:async()=>{calls.push('register');return registration;},ready:Promise.resolve(registration)};
    const context = vm.createContext({window:{isSecureContext:true,Notification:notification,PushManager:{},addEventListener(){}},Notification:notification,navigator:{serviceWorker},api:{subscribePush:async()=>calls.push('save')},atob:()=>'',Uint8Array,setTimeout,clearTimeout});
    vm.runInContext(source, context);
    return {calls, enable:()=>context.enablePush('fixture-key')};
}
test('permission is requested synchronously before any registration or network work', async () => {
    const f = fixture(); const result = f.enable();
    assert.deepEqual(f.calls, ['permission']);
    await result;
    assert.deepEqual(f.calls, ['permission','register','subscribe','save']);
});
test('granted permission reuses an existing subscription without prompting again', async () => {
    const f = fixture({permission:'granted',existing:true}); await f.enable();
    assert.deepEqual(f.calls, ['register','save']);
});
test('denied and dismissed permission never register or save subscriptions', async () => {
    for (const answer of ['denied','default']) {
        const f = fixture({answer}); await assert.rejects(f.enable());
        assert.deepEqual(f.calls, ['permission']);
    }
});
