// Build-time speed patch for the shipped engine worker (no source is available, so each edit is an
// exact string replacement that must match once; a launcher update fails the build instead of
// silently shipping a half-patched engine).
//
// 1. Machine.run only took the block-JIT fast path (cpu.run) when there was no `until` callback and
//    no clock. The browser host always passes both, so every x86 instruction went through
//    cpu.step() + until() (performance.now + memory reads) + clock.onInstructions(1).
//    The host's until() only changes at API-hook boundaries (pump idle state, input queue, AVI), and
//    cpu.run stops before every hook, so evaluating until() between fast runs keeps the same stops.
//    The clock is still advanced by the exact instruction count after each run.
// 2. The 8 ms work slices yielded with setTimeout(0), which browsers clamp to >=4 ms when nested,
//    leaving the worker idle ~1/3 of the time. A MessageChannel yield has no clamp.
// 3. Optional game speed. The engine clock paces the game by sleeping until wall time catches up
//    with game time; we run that wall time through a continuous scaled timeline so waits (message
//    display, animations, AI turn pacing) shrink by `speed` while game logic is unchanged.
//    Initial speed comes from the worker URL (?speed=), live changes from a {type:'sam5-speed'} message.
import { createHash } from 'node:crypto';

const PRELUDE =
  'let __sam5Speed=1,__sam5Base=0,__sam5At=performance.now();' +
  'const __sam5Now=()=>__sam5Base+(performance.now()-__sam5At)*__sam5Speed,' +
  '__sam5SetSpeed=s=>{s=Number(s);if(!(s>=1&&s<=8))return;__sam5Base=__sam5Now();__sam5At=performance.now();__sam5Speed=s};' +
  '__sam5SetSpeed(new URL(import.meta.url).searchParams.get(`speed`)??1);\n';

const EDITS = [
  {
    name: 'scaled clock wall time',
    from: 'constructor(e,t=()=>performance.now()){super(),this.sleep=e,this.wall=t,this.wallOrigin=t()}',
    to: 'constructor(e,t=__sam5Now){super(),this.sleep=e,this.wall=t,this.wallOrigin=t()}',
  },
  { name: 'scaled clock sleep', from: 't>0&&this.sleep(t)}}', to: 't>0&&this.sleep(t/__sam5Speed)}}' },
  {
    name: 'scaled idle start',
    from: 'enterIdle(){this.idle??={wall:performance.now(),virtual:this.nowMs}}',
    to: 'enterIdle(){this.idle??={wall:__sam5Now(),virtual:this.nowMs}}',
  },
  { name: 'scaled idle catch-up', from: 'Math.floor(performance.now()-this.idle.wall)', to: 'Math.floor(__sam5Now()-this.idle.wall)' },
  {
    name: 'live speed message',
    from: '$.onmessage=e=>{try{if(e.data.type!==`start`)',
    to: '$.onmessage=e=>{if(e.data?.type===`sam5-speed`)return void __sam5SetSpeed(e.data.speed);try{if(e.data.type!==`start`)',
  },
  {
    name: 'fast path with until/clock',
    from: 'if(typeof t!=`function`&&!this.options.clock&&this.cpu.step===be.prototype.step&&this.cpu.run===be.prototype.run&&!this.memory.isInstrumented()){let n;try{n=this.cpu.run(e-r,t,{stopBeforeHook:!0})}',
    to: 'if(this.cpu.step===be.prototype.step&&this.cpu.run===be.prototype.run&&!this.memory.isInstrumented()){let n;try{n=this.cpu.run(e-r,typeof t==`function`?void 0:t,{stopBeforeHook:!0})}',
  },
  {
    name: 'unclamped slice yield',
    from: 'function Zn(e,t,n){let r=!1,i,a=()=>{if(!r)try{let n=performance.now()+8;do e.step(5e4),t();while(!r&&performance.now()<n);r||(i=setTimeout(a,0))}catch(e){r=!0,n(e)}};return a(),()=>{r=!0,i!==void 0&&clearTimeout(i)}}',
    to: 'function Zn(e,t,n){let r=!1,i,y=new MessageChannel,a=()=>{if(!r)try{let n=performance.now()+8;do e.step(5e4),t();while(!r&&performance.now()<n);r||y.port2.postMessage(0)}catch(e){r=!0,n(e)}};return y.port1.onmessage=a,a(),()=>{r=!0,y.port1.close()}}',
  },
];

export function patchEngine(source) {
  if (source.includes('__sam5')) throw Error('Engine is already patched');
  let out = PRELUDE + source;
  for (const { name, from, to } of EDITS) {
    const count = out.split(from).length - 1;
    if (count !== 1) throw Error(`Engine patch "${name}": expected 1 match, found ${count}`);
    out = out.replace(from, () => to);
  }
  return out;
}

export const patchedName = (source) => `worker-sam5fast-${createHash('sha256').update(source).digest('hex').slice(0, 10)}.js`;
