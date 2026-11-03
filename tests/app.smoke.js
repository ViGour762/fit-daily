#!/usr/bin/env node
/**
 * app.smoke.js — 集成冒烟测试（零依赖）
 *
 * 在没有浏览器的环境里用最小 DOM 桩加载 index.html 引用的全部脚本，
 * 依次触发启动、生成计划、切换各视图、重复渲染，用来发现：
 *   - 脚本语法错误 / 加载顺序问题
 *   - 引用了 index.html 中不存在的 id（DOM 桩会直接报错）
 *   - 渲染函数抛异常、未定义的 FP API
 *
 * 用法：node tests/app.smoke.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    failed++;
    failures.push({ name: name, err: err });
    console.error('  ✗ ' + name);
    console.error('    ' + String((err && err.stack) || err).split('\n').slice(0, 4).join('\n    '));
  }
}

/* ------------------------------------------------------------------ *
 * 1. 收集 index.html 引用的脚本 & 已知 id
 * ------------------------------------------------------------------ */

const scriptSrcs = [];
html.replace(/<script[^>]+src="([^"]+)"/g, (m, src) => { scriptSrcs.push(src); return m; });

const knownIds = new Set();
html.replace(/\sid="([^"]+)"/g, (m, id) => { knownIds.add(id); return m; });

// JS 模板里动态生成的 id 也算已知
scriptSrcs.forEach((src) => {
  const file = path.join(ROOT, src.split('?')[0]);
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, 'utf8').replace(/\sid="([^"]+)"/g, (m, id) => { knownIds.add(id); return m; });
});

/* ------------------------------------------------------------------ *
 * 2. 最小 DOM 桩
 * ------------------------------------------------------------------ */

const noop = function () {};
const timers = { timeouts: new Set(), intervals: new Set() };

function makeClassList() {
  const set = new Set();
  return {
    add: function () { for (let i = 0; i < arguments.length; i++) set.add(arguments[i]); },
    remove: function () { for (let i = 0; i < arguments.length; i++) set.delete(arguments[i]); },
    toggle: function (name, force) {
      const on = force === undefined ? !set.has(name) : !!force;
      if (on) set.add(name); else set.delete(name);
      return on;
    },
    contains: function (name) { return set.has(name); },
    _set: set
  };
}

function makeCtx2d() {
  const target = {
    canvas: null,
    measureText: function (t) { return { width: String(t || '').length * 7 }; },
    createLinearGradient: function () { return { addColorStop: noop }; },
    createRadialGradient: function () { return { addColorStop: noop }; },
    getImageData: function () { return { data: [] }; }
  };
  return new Proxy(target, {
    get: function (obj, prop) {
      if (prop in obj) return obj[prop];
      return noop;
    },
    set: function (obj, prop, value) { obj[prop] = value; return true; }
  });
}

const elementCache = new Map();

function makeEl(tag, id) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: id || '',
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: false,
    children: [],
    dataset: {},
    style: {},
    attributes: {},
    classList: makeClassList(),
    _handlers: {},
    setAttribute: function (k, v) { el.attributes[k] = String(v); if (k === 'id') el.id = String(v); },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(el.attributes, k) ? el.attributes[k] : null; },
    removeAttribute: function (k) { delete el.attributes[k]; },
    hasAttribute: function (k) { return Object.prototype.hasOwnProperty.call(el.attributes, k); },
    addEventListener: function (type, fn) { (el._handlers[type] = el._handlers[type] || []).push(fn); },
    removeEventListener: noop,
    dispatchEvent: noop,
    appendChild: function (child) { el.children.push(child); return child; },
    removeChild: function (child) { const i = el.children.indexOf(child); if (i >= 0) el.children.splice(i, 1); return child; },
    insertAdjacentHTML: function (pos, markup) { el.insertedHTML = (el.insertedHTML || '') + markup; },
    insertBefore: function (child) { el.children.push(child); return child; },
    remove: noop,
    querySelector: function (sel) { return makeEl('div'); },
    querySelectorAll: function () { return []; },
    closest: function () { return null; },
    focus: noop,
    blur: noop,
    click: noop,
    scrollIntoView: noop,
    getContext: function () { return makeCtx2d(); },
    getBoundingClientRect: function () { return { width: 700, height: 280, top: 0, left: 0, right: 700, bottom: 280 }; },
    cloneNode: function () { return makeEl(tag, id); },
    setSelectionRange: noop,
    select: noop,
    animate: function () { return { cancel: noop }; }
  };
  return el;
}

function getEl(id) {
  if (!elementCache.has(id)) elementCache.set(id, makeEl('div', id));
  return elementCache.get(id);
}

const storage = new Map();

function makeDocument() {
  const body = makeEl('body');
  const root = makeEl('html');
  return {
    readyState: 'complete',
    title: 'FitDaily 测试',
    documentElement: root,
    body: body,
    head: makeEl('head'),
    querySelector: function (sel) {
      if (typeof sel === 'string' && sel.charAt(0) === '#') {
        const id = sel.slice(1);
        if (!knownIds.has(id)) {
          throw new Error('DOM 桩：index.html / JS 中不存在 id="' + id + '"');
        }
        return getEl(id);
      }
      return makeEl('div');
    },
    querySelectorAll: function () { return []; },
    getElementById: function (id) {
      if (!knownIds.has(id)) throw new Error('DOM 桩：不存在 id="' + id + '"');
      return getEl(id);
    },
    createElement: function (tag) { return makeEl(tag); },
    createDocumentFragment: function () { return makeEl('fragment'); },
    createTextNode: function (t) { return { textContent: t }; },
    addEventListener: noop,
    removeEventListener: noop,
    execCommand: function () { return true; },
    getElementsByTagName: function () { return []; },
    getElementsByClassName: function () { return []; }
  };
}

const sandbox = {
  console: console,
  document: makeDocument(),
  localStorage: {
    getItem: function (k) { return storage.has(k) ? storage.get(k) : null; },
    setItem: function (k, v) { storage.set(k, String(v)); },
    removeItem: function (k) { storage.delete(k); },
    clear: function () { storage.clear(); },
    key: function (i) { return Array.from(storage.keys())[i] || null; },
    get length() { return storage.size; }
  },
  navigator: { userAgent: 'node-smoke', clipboard: undefined, serviceWorker: { register: function () { return Promise.resolve(); } } },
  location: { protocol: 'http:', href: 'http://127.0.0.1:5173/', search: '', hash: '', reload: noop },
  isSecureContext: true,
  devicePixelRatio: 2,
  innerWidth: 390,
  innerHeight: 844,
  scrollY: 0,
  scrollTo: noop,
  addEventListener: noop,
  removeEventListener: noop,
  open: noop,
  close: noop,
  focus: noop,
  setTimeout: function (fn, ms) { const id = setTimeout(fn, ms); timers.timeouts.add(id); return id; },
  clearTimeout: function (id) { timers.timeouts.delete(id); clearTimeout(id); },
  setInterval: function (fn, ms) { const id = setInterval(fn, ms); timers.intervals.add(id); return id; },
  clearInterval: function (id) { timers.intervals.delete(id); clearInterval(id); },
  requestAnimationFrame: function (fn) { return sandbox.setTimeout(fn, 0); },
  cancelAnimationFrame: function (id) { sandbox.clearTimeout(id); },
  matchMedia: function () { return { matches: false, addEventListener: noop, addListener: noop }; },
  getComputedStyle: function () { return { getPropertyValue: function () { return ''; } }; },
  alert: noop,
  confirm: function () { return true; },
  prompt: function () { return null; },
  print: noop,
  Notification: Object.assign(function () {}, {
    permission: 'default',
    requestPermission: function () { return Promise.resolve('denied'); }
  }),
  AudioContext: function () {
    return { createOscillator: function () { return { connect: noop, start: noop, stop: noop, frequency: { setValueAtTime: noop } }; }, createGain: function () { return { connect: noop, gain: { setValueAtTime: noop } }; }, destination: {}, currentTime: 0, close: noop, state: 'suspended', resume: function () { return Promise.resolve(); } };
  },
  Image: function () { this.onload = null; this.onerror = null; },
  Blob: function (parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; this.size = 1; },
  URL: {
    createObjectURL: function () { return 'blob:mock'; },
    revokeObjectURL: noop
  },
  FileReader: function () {
    const self = this;
    self.readAsText = function () { self.result = '{}'; self.onload && self.onload(); };
    self.readAsArrayBuffer = self.readAsText;
    self.addEventListener = noop;
  },
  TextEncoder: TextEncoder,
  TextDecoder: TextDecoder,
  crypto: { getRandomValues: function (arr) { return arr; } }
};

sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.top = sandbox;

vm.createContext(sandbox);

/* ------------------------------------------------------------------ *
 * 3. 加载脚本
 * ------------------------------------------------------------------ */

console.log('\n[smoke] 脚本加载');

check('index.html 引用的脚本文件都存在', () => {
  const missing = scriptSrcs.filter((src) => !fs.existsSync(path.join(ROOT, src.split('?')[0])));
  if (missing.length) throw new Error('缺少脚本：' + missing.join(', '));
});

scriptSrcs.forEach((src) => {
  const rel = src.split('?')[0];
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.log('  - 跳过缺失脚本 ' + rel);
    return;
  }
  const code = fs.readFileSync(file, 'utf8');
  check('加载 ' + rel, () => {
    vm.runInContext(code, sandbox, { filename: rel });
  });
});

/* ------------------------------------------------------------------ *
 * 4. 行为验证
 * ------------------------------------------------------------------ */

console.log('\n[smoke] 应用行为');

const FP = sandbox.FP;

check('FP 全局已就绪', () => {
  if (!FP) throw new Error('FP 未定义');
  ['core', 'state', 'util', 'plan', 'program', 'go', 'renderAll', 'save'].forEach((k) => {
    if (FP[k] === undefined) throw new Error('缺少 FP.' + k);
  });
});

check('初始化后没有计划（默认状态）', () => {
  if (FP.plan() !== null) throw new Error('默认不应有已生成计划');
});

check('生成计划：男 25 岁 / 175 / 70 / 轻度 / 减脂 15% → 1956 kcal', () => {
  FP.state.profile = Object.assign({}, FP.state.profile, {
    sex: 'male', age: 25, height: 175, weight: 70, bodyFat: null,
    activity: 'light', goal: 'cut', days: 3, experience: 'beginner', diet: 'normal', equipment: 'gym'
  });
  FP.state.adjust = null;
  FP.recalc({ resetEdits: true });
  const p = FP.plan();
  if (p.target !== 1956) throw new Error('目标热量应为 1956，实际 ' + p.target);
  if (p.protein !== 154) throw new Error('蛋白质应为 154，实际 ' + p.protein);
});

check('FP.program() 能生成训练日（依赖 js/data.js）', () => {
  const program = FP.program();
  if (!program) throw new Error('没有训练计划数据：检查 js/data.js 是否存在且结构符合 docs/api.md');
  if (!Array.isArray(program) || program.length < 2) throw new Error('训练日数量异常：' + (program && program.length));
  program.forEach((day) => {
    if (!day.title) throw new Error('训练日缺少 title');
    if (!day.exercises.length) throw new Error('训练日「' + day.title + '」没有动作');
  });
});

check('renderAll() 不抛异常', () => { FP.renderAll(); });

['home', 'training', 'diet', 'weight', 'settings'].forEach((view) => {
  check('切换到视图 ' + view + ' 并渲染', () => {
    FP.go(view);
    if (FP.state.ui.view !== view) throw new Error('视图状态未更新');
  });
});

check('重复渲染三次保持幂等（无异常）', () => {
  FP.renderAll();
  FP.renderAll();
  FP.renderAll();
});

check('持久化写入 localStorage', () => {
  FP.save(true);
  if (!storage.has('fitdaily-state')) throw new Error('未写入 fitdaily-state');
  const raw = JSON.parse(storage.get('fitdaily-state'));
  if (!raw.profile || raw.profile.weight !== 70) throw new Error('持久化内容异常');
});

check('主题切换写入 fitdaily-theme', () => {
  FP.toggleTheme();
  const theme = storage.get('fitdaily-theme');
  if (theme !== 'dark' && theme !== 'light') throw new Error('主题值异常：' + theme);
  FP.toggleTheme();
});

check('单位切换：kg → 斤 展示换算正确', () => {
  FP.state.settings.weightUnit = 'jin';
  if (FP.util.unitWeight(70) !== '140 斤') throw new Error('斤换算错误：' + FP.util.unitWeight(70));
  FP.state.settings.weightUnit = 'kg';
  if (FP.util.unitWeight(70) !== '70 kg') throw new Error('kg 展示错误：' + FP.util.unitWeight(70));
});

/* ------------------------------------------------------------------ *
 * 5. 可选：把各视图渲染结果落盘，便于人工检查结构
 * ------------------------------------------------------------------ */

if (process.argv.includes('--dump')) {
  const dumpDir = path.join(ROOT, '_debug');
  if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir);
  const targets = {
    home: ['statGrid', 'macroLegend', 'macroRangeNote', 'deficitHint'],
    training: ['trainingContent', 'calendarContent'],
    diet: ['dietContent', 'foodsContent'],
    weight: ['weightList', 'sessionList', 'weightTip'],
    settings: ['refsList', 'waterStatus', 'settingsStatus']
  };
  FP.go('home');
  FP.recalc({ resetEdits: true });
  FP.renderAll();
  Object.keys(targets).forEach((view) => {
    const parts = targets[view].map((id) => {
      const el = elementCache.get(id);
      return '<section id="' + id + '">\n' + ((el && el.innerHTML) || '<em>（空）</em>') + '\n</section>';
    });
    const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>dump ' + view +
      '</title></head><body style="font-family:system-ui;padding:16px;background:#f6f8f7">' + parts.join('\n<hr>\n') + '</body></html>';
    const file = path.join(dumpDir, 'dump-' + view + '.html');
    fs.writeFileSync(file, html, 'utf8');
    console.log('  → 已导出 ' + path.relative(ROOT, file) + '（' + html.length + ' 字节）');
  });
}

/* ------------------------------------------------------------------ *
 * 6. 收尾
 * ------------------------------------------------------------------ */

timers.intervals.forEach((id) => clearInterval(id));
timers.timeouts.forEach((id) => clearTimeout(id));

console.log('\n----------------------------------------');
console.log('通过 ' + passed + ' 项，失败 ' + failed + ' 项');
if (failed > 0) {
  console.error('\n失败详情：');
  failures.forEach((f) => console.error('- ' + f.name + '：' + (f.err && f.err.message)));
  process.exitCode = 1;
}
process.exit(failed > 0 ? 1 : 0);