import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {pushAfterResponse} from '../utils/pushLifecycle.js';

test('Vercel task is registered before response and waits for committed push work',async()=>{
    const res=new EventEmitter();res.statusCode=201;
    let finish,task,sent=false,next=false;
    pushAfterResponse(()=>new Promise(resolve=>{finish=()=>{sent=true;resolve();};}),work=>{task=work;})({method:'POST',path:'/api/friends/b/expenses'},res,()=>{next=true;});
    assert.ok(task);assert.equal(next,true);assert.equal(sent,false);
    res.emit('finish');res.emit('close');await Promise.resolve();
    assert.equal(sent,false);finish();await task;assert.equal(sent,true);
});

test('failed responses do not send pushes; aborted responses resolve; Activity reads retry queued work',async()=>{
    let calls=0;
    for(const status of [400,500]){
        const res=new EventEmitter();res.statusCode=status;let task;
        pushAfterResponse(async()=>{calls++;},work=>{task=work;})({method:'POST'},res,()=>{});
        res.emit('finish');await task;
    }
    const aborted=new EventEmitter();let task;
    pushAfterResponse(async()=>{calls++;},work=>{task=work;})({method:'POST'},aborted,()=>{});
    aborted.emit('close');await task;assert.equal(calls,0);
    const read=new EventEmitter();read.statusCode=200;
    pushAfterResponse(async()=>{calls++;},work=>{task=work;})({method:'GET',path:'/api/notifications'},read,()=>{});
    read.emit('finish');await task;assert.equal(calls,1);
});
