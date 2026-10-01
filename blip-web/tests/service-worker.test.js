import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('installed home-screen launch enters the app directly', async () => {
    const manifest=JSON.parse(await readFile(new URL('../public/manifest.json',import.meta.url),'utf8'));
    assert.equal(manifest.start_url,'/app');
    assert.equal(manifest.display,'standalone');
});

test('background push shows a device notification and opens Activity', async () => {
    const handlers={}, notifications=[], opened=[];
    const self={addEventListener:(type,handler)=>{handlers[type]=handler;},registration:{showNotification:async(title,options)=>notifications.push({title,options})},clients:{matchAll:async()=>[],openWindow:async(url)=>opened.push(url)},location:{origin:'https://blip.test'}};
    vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{self,URL});
    let pending;
    handlers.push({data:{json:()=>({title:'New bill',body:'Sam added dinner',id:'event-1'})},waitUntil:value=>{pending=value;}});
    await pending;
    assert.equal(notifications[0].options.body,'Sam added dinner');
    assert.equal(notifications[0].options.tag,'event-1');
    handlers.notificationclick({notification:{close(){}},waitUntil:value=>{pending=value;}});
    await pending;
    assert.deepEqual(opened,['/app?tab=activity']);
});

test('notification click opens Activity in an existing app or upgrades a landing tab', async () => {
    const handlers={}, messages=[], navigated=[];
    const appClient={url:'https://blip.test/app',postMessage:message=>messages.push(message),focus:async()=>{}};
    const landingClient={url:'https://blip.test/',navigate:async url=>{navigated.push(url);return appClient;},focus:async()=>{}};
    let clients=[appClient];
    const self={addEventListener:(type,handler)=>{handlers[type]=handler;},clients:{matchAll:async()=>clients,openWindow:async()=>{throw new Error('An existing tab should be reused');}},location:{origin:'https://blip.test'}};
    vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{self,URL});
    const click=async()=>{let pending;handlers.notificationclick({notification:{close(){}},waitUntil:value=>{pending=value;}});await pending;};
    await click();
    assert.equal(messages[0]?.type,'OPEN_ACTIVITY');
    assert.equal(messages.length,1);
    clients=[landingClient];
    await click();
    assert.deepEqual(navigated,['/app?tab=activity']);
});

async function offlineWorker() {
    const handlers = {}, stores = new Map(), added = [], deleted = [];
    const caches = {
        open: async name => {
            if (!stores.has(name)) stores.set(name, new Map());
            const entries = stores.get(name);
            return {
                addAll: async urls => { added.push(...urls); urls.forEach(url => entries.set(url, new Response(url === '/offline.html' ? 'offline screen' : 'asset'))); },
                match: async request => entries.get(typeof request === 'string' ? request : new URL(request.url).pathname)?.clone(),
            };
        },
        keys: async () => [...stores.keys()],
        delete: async name => { deleted.push(name); return stores.delete(name); },
    };
    let online = false, claimed = false;
    const self = {location:{origin:'https://blip.test'},addEventListener:(type,handler)=>{handlers[type]=handler;},skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true;}}};
    vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'), {
        self,caches,URL,AbortController,setTimeout,clearTimeout,
        fetch:async()=>{if(!online)throw new Error('Offline');return new Response('live page');},
    });
    const lifecycle = async name => {let pending;handlers[name]({waitUntil:value=>{pending=value;}});await pending;};
    const request = async (path, options={}) => {
        let response;
        handlers.fetch({request:{url:new URL(path,self.location.origin).href,method:'GET',mode:'cors',...options},respondWith:value=>{response=value;}});
        return response ? (await response).text() : undefined;
    };
    return {stores,added,deleted,lifecycle,request,setOnline:value=>{online=value;},claimed:()=>claimed};
}

test('offline launch and icons work after the first installation, then navigation reconnects', async () => {
    const worker = await offlineWorker();
    await worker.lifecycle('install');
    assert.ok(worker.added.includes('/offline.html'));
    assert.equal(await worker.request('/?tab=activity',{mode:'navigate'}),'offline screen');
    assert.equal(await worker.request('/logo-192.png'),'asset');
    worker.setOnline(true);
    assert.equal(await worker.request('/',{mode:'navigate'}),'live page');
});

test('offline caching never intercepts API data, writes, or third-party authentication', async () => {
    const worker = await offlineWorker();
    await worker.lifecycle('install');
    for (const [path, options] of [['/api/expenses',{}],['/api/expenses',{method:'POST'}],['/logo-192.png',{method:'POST'}],['https://auth.example.test/session',{}],['/src/main.jsx',{}]]) {
        assert.equal(await worker.request(path,options),undefined);
    }
});

test('activation removes only obsolete Blip shell caches', async () => {
    const worker = await offlineWorker();
    worker.stores.set('blip-shell-old',new Map());
    worker.stores.set('unrelated-cache',new Map());
    await worker.lifecycle('install');
    await worker.lifecycle('activate');
    assert.deepEqual(worker.deleted,['blip-shell-old']);
    assert.equal(worker.claimed(),true);
    assert.ok(worker.stores.has('blip-shell-dev'));
    assert.ok(worker.stores.has('unrelated-cache'));
});
