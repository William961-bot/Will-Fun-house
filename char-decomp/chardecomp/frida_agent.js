// chardecomp in-process agent (Frida 17). Loaded into the game by capture.py.
//
// Every location leaves this script as "module+0xRVA" so traces from different runs (ASLR) and the
// static database agree on addresses. Nothing here interprets what it sees; it only records.

'use strict';

let modules = [];          // modules whose code counts as "the game"
let tick = -1;             // frame counter, advanced by the snapshot hook (-1 = no tick hook)
const listeners = [];
// Trace format 2: event times in ms since init (Date.now, 1 ms resolution).
let t0 = Date.now();
function now() { return Date.now() - t0; }

function loc(p) {
  for (const m of modules) {
    const off = p.sub(m.base);
    if (off.compare(ptr(0)) >= 0 && off.compare(ptr(m.size)) < 0) return m.name + '+0x' + off.toString(16);
  }
  const m = Process.findModuleByAddress(p);
  return m ? m.name + '+0x' + p.sub(m.base).toString(16) : p.toString();
}

function splitTop(s, sep) {
  const out = [];
  let depth = 0, cur = '';
  for (const c of s) {
    if (c === '[') depth++;
    if (c === ']') depth--;
    if (c === sep && depth === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

// Address expressions: 0x1234 | module+0x10 | [expr] (read a pointer) | sums of these.
// Example: [[game.exe+0x2a3f10]+0x18]
function evalExpr(expr) {
  let acc = ptr(0);
  for (let part of splitTop(expr.trim(), '+')) {
    part = part.trim();
    if (part.startsWith('[') && part.endsWith(']')) acc = acc.add(evalExpr(part.slice(1, -1)).readPointer());
    else if (/^(0x[0-9a-fA-F]+|\d+)$/.test(part)) acc = acc.add(ptr(part));
    else acc = acc.add(Process.getModuleByName(part).base);
  }
  return acc;
}

function safeEval(expr) {
  try { return evalExpr(expr); } catch (e) { return null; }
}

function resolveFunc(spec) {
  // "module+0xRVA" or an expression
  return evalExpr(spec);
}

// ---------------------------------------------------------------- coverage (Stalker call summaries)
let covCounts = null;
let covThreads = [];

function covStart() {
  covCounts = {};
  const keep = new Set(modules.map(m => m.path));
  for (const m of Process.enumerateModules()) if (!keep.has(m.path)) Stalker.exclude(m);
  for (const t of Process.enumerateThreads()) {
    try {
      Stalker.follow(t.id, {
        events: { call: true },
        onCallSummary(summary) {
          for (const target in summary) {
            const k = loc(ptr(target));
            covCounts[k] = (covCounts[k] || 0) + summary[target];
          }
        },
      });
      covThreads.push(t.id);
    } catch (e) { /* thread exited */ }
  }
  return covThreads.length;
}

async function covStop() {
  for (const id of covThreads) { try { Stalker.unfollow(id); } catch (e) {} }
  covThreads = [];
  Stalker.flush();
  await new Promise(r => setTimeout(r, 500));
  Stalker.garbageCollect();
  const inGame = {};
  const names = new Set(modules.map(m => m.name));
  for (const k in covCounts) if (names.has(k.split('+')[0])) inGame[k] = covCounts[k];
  covCounts = null;
  return inGame;
}

// ---------------------------------------------------------------- function hooks (who gets the character?)
let hookStats = null;
let hookSeq = null;
let charBaseExpr = null;
let charBase = null;
let charBaseAt = 0;
const SEQ_LIMIT = 50000;

function currentCharBase() {
  if (!charBaseExpr) return null;
  const ms = Date.now();
  if (charBase === null || ms - charBaseAt > 50) { charBase = safeEval(charBaseExpr); charBaseAt = ms; }
  return charBase;
}

function hooksStart(funcs, argCount, captureArgs) {
  const capture = new Set(captureArgs || []);
  hookStats = {};
  hookSeq = [];
  let ok = 0;
  for (const f of funcs) {
    let addr;
    try { addr = resolveFunc(f); } catch (e) { continue; }
    const st = hookStats[f] = { calls: 0, char_args: new Array(argCount).fill(0), callers: {} };
    try {
      listeners.push(Interceptor.attach(addr, {
        onEnter(args) {
          st.calls++;
          // Runtime call edges: the return address names the call site, including virtual and indirect calls.
          const site = loc(this.returnAddress);
          if (site in st.callers || Object.keys(st.callers).length < 64) st.callers[site] = (st.callers[site] || 0) + 1;
          const base = currentCharBase();
          let hit = -1;
          if (base !== null) {
            for (let i = 0; i < argCount; i++) {
              if (args[i].equals(base)) { st.char_args[i]++; hit = i; }
            }
          }
          if (hookSeq.length < SEQ_LIMIT) {
            const row = [tick, f, hit, now()];
            // Argument values (as signed 32-bit and full pointer) for functions whose inputs we correlate.
            if (capture.has(f)) row.push(Array.from({ length: argCount }, (_, i) => args[i].toString()));
            hookSeq.push(row);
          }
        },
      }));
      ok++;
    } catch (e) { delete hookStats[f]; }
  }
  return ok;
}

// ---------------------------------------------------------------- per-frame snapshots of the character
let snapBuf = null;
let snapCfg = null;

// Pointer graph: from object 0, follow pointer-sized, aligned values that land in readable writable memory,
// up to cfg.follow.depth levels, max_objects objects and max_bytes bytes per snapshot. Paths name each object by
// the offsets taken from the root, e.g. "0x68" or "0x68/0x10".
function followGraph(root, f) {
  const out = {};
  let objects = 0, bytes = 0;
  const ps = Process.pointerSize;
  const queue = [[root, '', 0]];
  const seen = new Set([root.toString()]);
  while (queue.length) {
    const [addr, path, depth] = queue.shift();
    if (depth >= f.depth) continue;
    let buf;
    try { buf = new Uint8Array(addr.readByteArray(depth === 0 ? f.root_size : f.size)); } catch (e) { continue; }
    for (let off = 0; off + ps <= buf.length; off += ps) {
      let v = 0n;
      for (let i = ps - 1; i >= 0; i--) v = (v << 8n) | BigInt(buf[off + i]);
      if (v < 0x10000n) continue;
      const p = ptr('0x' + v.toString(16));
      if (seen.has(p.toString())) continue;
      const r = Process.findRangeByAddress(p);
      if (!r || r.protection.indexOf('rw') !== 0 || Process.findModuleByAddress(p)) continue;  // heap/data objects only
      if (objects >= f.max_objects || bytes + f.size > f.max_bytes) return { objs: out, truncated: true };
      const child = path ? path + '/0x' + off.toString(16) : '0x' + off.toString(16);
      try { out[child] = arrayHex(p.readByteArray(f.size)); } catch (e) { continue; }
      seen.add(p.toString());
      objects++; bytes += f.size;
      queue.push([p, child, depth + 1]);
    }
  }
  return { objs: out, truncated: false };
}

function snapStart(cfg) {
  snapCfg = cfg;
  snapBuf = [];
  tick = 0;
  const addr = resolveFunc(cfg.tick);
  listeners.push(Interceptor.attach(addr, {
    onLeave() {
      tick++;
      const t = now();
      const bases = cfg.bases.map(safeEval);
      const row = { tick, t, objs: bases.map(b => {
        if (b === null || b.isNull()) return null;
        try { return arrayHex(b.readByteArray(cfg.size)); } catch (e) { return null; }
      }) };
      if (cfg.follow && bases[0] !== null && !bases[0].isNull()) {
        const g = followGraph(bases[0], Object.assign({ root_size: cfg.size }, cfg.follow));
        row.graph = g.objs;
        if (g.truncated) row.graph_truncated = true;
      }
      snapBuf.push(row);
      if (snapBuf.length >= 64) flushSnaps();
    },
  }));
}

function arrayHex(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i++) s += (u[i] < 16 ? '0' : '') + u[i].toString(16);
  return s;
}

function flushSnaps() {
  if (snapBuf && snapBuf.length) send({ type: 'snap', rows: snapBuf });
  snapBuf = [];
}

// ---------------------------------------------------------------- hardware watchpoints (who writes this field?)
let watchHits = null;
let watchSpecs = [];

function armWatch(i, s) {
  const addr = safeEval(s.expr);
  // The object may not exist yet (a null pointer in the chain): retry until it does.
  if (addr === null || addr.compare(ptr(0x10000)) < 0) return false;
  s.armedAt = addr.toString();
  for (const t of Process.enumerateThreads()) {
    try { t.setHardwareWatchpoint(i, addr, s.size, s.kind || 'w'); } catch (e) {}
  }
  return true;
}

let watchTimer = null;

function watchStart(specs) {
  watchHits = {};
  watchSpecs = specs;
  Process.setExceptionHandler(d => {
    if (watchHits === null) return false;
    // x86 data breakpoints trap after the access: d.address is the next instruction.
    const k = loc(d.address);
    const h = watchHits[k] || (watchHits[k] = { count: 0, ticks: [], times: [] });
    h.count++;
    if (h.ticks.length < 256) { h.ticks.push(tick); h.times.push(now()); }
    return true;
  });
  let armed = specs.map((s, i) => armWatch(i, s));
  if (armed.some(a => !a)) {
    watchTimer = setInterval(() => {
      armed = specs.map((s, i) => armed[i] || armWatch(i, s));
      if (armed.every(a => a)) { clearInterval(watchTimer); watchTimer = null; }
    }, 20);
  }
  return armed.filter(a => a).length;
}

function watchStop() {
  if (watchTimer !== null) { clearInterval(watchTimer); watchTimer = null; }
  watchSpecs.forEach((s, i) => {
    for (const t of Process.enumerateThreads()) { try { t.unsetHardwareWatchpoint(i); } catch (e) {} }
  });
  const out = { hits: watchHits, armed_at: watchSpecs.map(s => s.armedAt || null) };
  watchHits = null;
  return out;
}

// ---------------------------------------------------------------- file I/O (which assets does the character load?)
let fileEvents = null;
const fdPath = {};
const fdPos = {};

function caller(ctx, ret) {
  // The first return address inside the game's own modules.
  const names = new Set(modules.map(m => m.name));
  const frames = [ret].concat(Thread.backtrace(ctx, Backtracer.ACCURATE).slice(0, 12));
  for (const f of frames) {
    const l = loc(f);
    if (names.has(l.split('+')[0])) return l;
  }
  return loc(ret);
}

function hookExport(name, cbs) {
  const p = Module.findGlobalExportByName(name);
  if (p) listeners.push(Interceptor.attach(p, cbs));
  return !!p;
}

function filesStart() {
  fileEvents = [];
  const win = Process.platform === 'windows';
  const opened = (path, ctx, ret) => fileEvents.push({ op: 'open', path, tick, t: now(), caller: caller(ctx, ret) });
  if (win) {
    for (const [name, wide] of [['CreateFileW', true], ['CreateFileA', false]]) {
      hookExport(name, {
        onEnter(a) { this.path = wide ? a[0].readUtf16String() : a[0].readAnsiString(); this.ctx = this.context; this.ret = this.returnAddress; },
        onLeave(r) { if (!r.equals(ptr(-1))) { fdPath[r.toString()] = this.path; opened(this.path, this.ctx, this.ret); } },
      });
    }
    hookExport('ReadFile', {
      onEnter(a) { this.h = a[0].toString(); this.n = a[2].toUInt32(); },
      onLeave() { if (fdPath[this.h]) fileEvents.push({ op: 'read', path: fdPath[this.h], bytes: this.n, tick, t: now() }); },
    });
  } else {
    // fopen calls open/openat itself: log only the outermost call on each thread.
    const inOpen = new Set();
    const filenoPtr = Module.findGlobalExportByName('fileno');
    const fileno = filenoPtr ? new NativeFunction(filenoPtr, 'int', ['pointer']) : null;
    const enter = (self, path) => {
      self.outer = !inOpen.has(self.threadId);
      inOpen.add(self.threadId);
      self.path = path; self.ctx = self.context; self.ret = self.returnAddress;
    };
    const leave = (self, okFd) => {
      if (!self.outer) return;
      inOpen.delete(self.threadId);
      if (okFd !== null) { fdPath[okFd] = self.path; fdPos[okFd] = 0; opened(self.path, self.ctx, self.ret); }
    };
    hookExport('fopen', {
      onEnter(a) { enter(this, a[0].readUtf8String()); },
      onLeave(r) {
        if (!this.outer) return;
        inOpen.delete(this.threadId);
        if (!r.isNull()) {
          const fd = fileno ? fileno(r) : -1;
          if (fd >= 0) { fdPath[fd] = this.path; fdPos[fd] = 0; }
          opened(this.path, this.ctx, this.ret);
        }
      },
    });
    for (const name of ['open', 'open64']) {
      hookExport(name, {
        onEnter(a) { enter(this, a[0].readUtf8String()); },
        onLeave(r) { leave(this, r.toInt32() >= 0 ? r.toInt32() : null); },
      });
    }
    hookExport('openat', {
      onEnter(a) { enter(this, a[1].readUtf8String()); },
      onLeave(r) { leave(this, r.toInt32() >= 0 ? r.toInt32() : null); },
    });
    hookExport('read', {
      onEnter(a) { this.fd = a[0].toInt32(); },
      onLeave(r) {
        const n = r.toInt32();
        if (n > 0 && fdPath[this.fd]) {
          const pos = fdPos[this.fd];
          fileEvents.push({ op: 'read', path: fdPath[this.fd], bytes: n, pos: pos === undefined ? null : pos, tick, t: now() });
          if (pos !== undefined) fdPos[this.fd] = pos + n;
        }
      },
    });
    for (const name of ['lseek', 'lseek64']) {
      hookExport(name, {
        onEnter(a) { this.fd = a[0].toInt32(); },
        onLeave(r) { if (fdPath[this.fd] !== undefined) { const p = r.toInt32(); fdPos[this.fd] = p >= 0 ? p : undefined; } },
      });
    }
  }
}

// ---------------------------------------------------------------- value scans (find the character in memory)
let scanHits = [];

function encode(type, value) {
  const buf = Memory.alloc(8);
  if (type === 'i32') buf.writeS32(value);
  else if (type === 'u32') buf.writeU32(value);
  else if (type === 'f32') buf.writeFloat(value);
  else if (type === 'f64') buf.writeDouble(value);
  else if (type === 'i16') buf.writeS16(value);
  else if (type === 'u8') buf.writeU8(value);
  else throw new Error('type ' + type);
  const size = { i32: 4, u32: 4, f32: 4, f64: 8, i16: 2, u8: 1 }[type];
  return { size, bytes: new Uint8Array(buf.readByteArray(size)) };
}

function readTyped(p, type) {
  return { i32: () => p.readS32(), u32: () => p.readU32(), f32: () => p.readFloat(), f64: () => p.readDouble(),
           i16: () => p.readS16(), u8: () => p.readU8() }[type]();
}

function describe(p) {
  const m = Process.findModuleByAddress(p);
  if (m) return m.name + '+0x' + p.sub(m.base).toString(16);
  return p.toString();
}

rpc.exports = {
  init(opts) {
    const main = Process.mainModule;
    const names = (opts && opts.modules && opts.modules.length) ? opts.modules : [main.name];
    modules = names.map(n => Process.getModuleByName(n));
    t0 = Date.now();
    return {
      main: main.name, arch: Process.arch, platform: Process.platform, pid: Process.id,
      modules: modules.map(m => ({ name: m.name, base: m.base.toString(), size: m.size, path: m.path })),
    };
  },

  async start(cfg) {
    const started = {};
    if (cfg.char_base) charBaseExpr = cfg.char_base;
    if (cfg.snap) { snapStart(cfg.snap); started.snap = true; }
    if (cfg.hooks && cfg.hooks.length) started.hooks = hooksStart(cfg.hooks, cfg.hook_args || 4, cfg.capture_args);
    if (cfg.files) { filesStart(); started.files = true; }
    if (cfg.watch && cfg.watch.length) started.watch = watchStart(cfg.watch);
    if (cfg.coverage) started.coverage_threads = covStart();
    return started;
  },

  async stop() {
    const out = {};
    if (covThreads.length || covCounts) out.coverage = await covStop();
    if (watchHits) out.watch = watchStop();
    for (const l of listeners.splice(0)) l.detach();
    flushSnaps();
    if (hookStats) { out.hooks = hookStats; out.hook_seq = hookSeq; hookStats = null; hookSeq = null; }
    if (fileEvents) { out.files = fileEvents; fileEvents = null; }
    out.ticks = tick;
    return out;
  },

  resolve(expr) { const p = evalExpr(expr); return { abs: p.toString(), loc: describe(p) }; },

  read(expr, size) { return arrayHex(evalExpr(expr).readByteArray(size)); },

  scanFirst(type, value) {
    const { size, bytes } = encode(type, value);
    const pattern = Array.from(bytes).map(b => (b < 16 ? '0' : '') + b.toString(16)).join(' ');
    scanHits = [];
    for (const r of Process.enumerateRanges('rw-')) {
      try {
        for (const m of Memory.scanSync(r.base, r.size, pattern)) scanHits.push(m.address);
      } catch (e) {}
    }
    return { count: scanHits.length, sample: scanHits.slice(0, 64).map(describe) };
  },

  // One-level pointer scan: words inside the game's modules (globals) that point at or just below addr.
  // Returns base expressions like "[game.exe+0x2a3f10]" with the field's offset from that base.
  pointersTo(addr, maxOff) {
    const hi = BigInt(ptr(addr).toString());
    const lo = hi - BigInt(maxOff);
    const out = [];
    const ps = Process.pointerSize;
    for (const m of modules) {
      for (const r of m.enumerateRanges('rw-')) {
        let buf;
        try { buf = r.base.readByteArray(r.size); } catch (e) { continue; }
        const view = new DataView(buf);
        for (let i = 0; i + ps <= r.size; i += ps) {
          const v = ps === 8 ? view.getBigUint64(i, true) : BigInt(view.getUint32(i, true));
          if (v >= lo && v <= hi) {
            const at = r.base.add(i);
            out.push({ base: '[' + m.name + '+0x' + at.sub(m.base).toString(16) + ']', field_offset: Number(hi - v) });
          }
        }
      }
    }
    return out.sort((a, b) => a.field_offset - b.field_offset).slice(0, 64);
  },

  scanHitsList() { return scanHits.map(p => p.toString()); },

  // Address passed as argument `idx` to the first call of `loc` (e.g. a C++ method's this pointer).
  async firstArg(loc, idx, timeoutMs) {
    return await new Promise(resolve => {
      let done = false;
      const l = Interceptor.attach(resolveFunc(loc), {
        onEnter(args) {
          if (done) return;
          done = true;
          resolve(args[idx].toString());
          setTimeout(() => l.detach(), 0);
        },
      });
      setTimeout(() => { if (!done) { done = true; l.detach(); resolve(null); } }, timeoutMs);
    });
  },

  // Offsets inside the object at `obj` (first `size` bytes) holding a pointer to `addr`, or up to maxOff below it.
  fieldsPointingTo(obj, size, addr, maxOff) {
    const hi = BigInt(ptr(addr).toString()), lo = hi - BigInt(maxOff);
    const ps = Process.pointerSize, out = [];
    for (let off = 0; off + ps <= size; off += ps) {
      let v;
      try { v = BigInt(ptr(obj).add(off).readPointer().toString()); } catch (e) { break; }
      if (v >= lo && v <= hi) out.push({ offset: off, field_offset: Number(hi - v) });
    }
    return out;
  },

  scanNext(type, value) {
    scanHits = scanHits.filter(p => {
      try {
        const v = readTyped(p, type);
        return type.startsWith('f') ? Math.abs(v - value) < 1e-4 : v === value;
      } catch (e) { return false; }
    });
    return { count: scanHits.length, sample: scanHits.slice(0, 64).map(describe) };
  },
};
