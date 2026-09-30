import test from 'node:test';
import assert from 'node:assert/strict';
import { attachPullToRefresh, pullDistance, REFRESH_THRESHOLD } from '../src/utils/pullToRefresh.js';

function harness(onRefresh = async () => {}) {
    const listeners = new Map();
    const distances = [], errors = [];
    let enabled = true;
    const element = { scrollTop:0, addEventListener:(name,fn)=>listeners.set(name,fn), removeEventListener:name=>listeners.delete(name) };
    const target = { parentElement:element, closest:()=>null };
    const dispose = attachPullToRefresh(element,{canStart:()=>enabled,onPull:value=>distances.push(value),onRefresh,onError:error=>errors.push(error)});
    const fire=(name,x=0,y=0,extra={})=>listeners.get(name)?.({target,touches:[{clientX:x,clientY:y}],cancelable:true,preventDefault(){this.prevented=true;},...extra});
    return {element,distances,errors,fire,dispose,listeners,disable:()=>{enabled=false;}};
}

test('comfortable downward pull refreshes once; short pull and reverse movement cancel',async()=>{
    let count=0; const h=harness(async()=>{count++;});
    assert.equal(pullDistance(112),REFRESH_THRESHOLD);
    assert.equal(pullDistance(1000),88);
    h.fire('touchstart');h.fire('touchmove',0,70);await h.fire('touchend');assert.equal(count,0);
    h.fire('touchstart');h.fire('touchmove',0,140);h.fire('touchmove',0,10);await h.fire('touchend');assert.equal(count,0);
    h.fire('touchstart');h.fire('touchmove',0,120);await h.fire('touchend');await h.fire('touchend');assert.equal(count,1);
    assert.equal(h.distances.at(-1),0);
});

test('horizontal swipes, scrolling, controls, multitouch and cancelled gestures do not refresh',async()=>{
    let count=0; const h=harness(async()=>{count++;});
    h.fire('touchstart');h.fire('touchmove',100,20);h.fire('touchmove',100,200);await h.fire('touchend');
    h.element.scrollTop=10;h.fire('touchstart');h.fire('touchmove',0,200);await h.fire('touchend');h.element.scrollTop=0;
    h.fire('touchstart',0,0,{target:{closest:()=>({})}});h.fire('touchmove',0,200);await h.fire('touchend');
    h.fire('touchstart');h.fire('touchmove',0,200,{touches:[{},{}]});await h.fire('touchend');
    h.fire('touchstart');h.fire('touchmove',0,200);h.fire('touchcancel');await h.fire('touchend');
    h.fire('touchstart');h.fire('touchmove',0,200);h.disable();await h.fire('touchend');
    assert.equal(count,0);assert.equal(h.distances.at(-1),0);
});

test('pending refresh blocks repeat pulls; failure unlocks it and cleanup removes listeners',async()=>{
    let reject;let count=0;
    const h=harness(()=>{count++;return new Promise((_,fail)=>{reject=fail;});});
    h.fire('touchstart');h.fire('touchmove',0,120);const pending=h.fire('touchend');
    h.fire('touchstart');h.fire('touchmove',0,120);await h.fire('touchend');assert.equal(count,1);
    reject(new Error('Offline'));await pending;assert.equal(h.errors.length,1);
    h.fire('touchstart');h.fire('touchmove',0,120);const retry=h.fire('touchend');assert.equal(count,2);
    h.dispose();reject(new Error('Screen closed'));await retry;
    assert.equal(h.errors.length,1);assert.equal(h.listeners.size,0);
});
