/*!
 * app.js — 应用外壳：状态与持久化、工具函数、导航、首页计算器、渲染调度
 * 依赖：core.js（FP.core）、data.js（FP_TRAINING）、nutrition.js（FP_NUTRITION）
 */
(function (root) {
  'use strict';

  var FP = (root.FP = root.FP || {});
  var core = FP.core;
  var doc = root.document;

  var STORAGE_KEY = 'fitdaily-state';
  var THEME_KEY = 'fitdaily-theme';
  var FONT_KEY = 'fitdaily-font';
  var APP_VERSION = '1.2.0';

  var VIEWS = ['home', 'training', 'diet', 'weight', 'settings'];

  var VIEW_META = {
    home: { title: '概览', sub: '今天的状态与计划一眼看完' },
    training: { title: '训练计划', sub: '按分化安排动作，点「开始训练」进入沉浸模式' },
    diet: { title: '饮食方案', sub: '餐次搭配、食材计算与购物清单' },
    weight: { title: '体重追踪', sub: '记录体重体脂，看看趋势与目标差距' },
    settings: { title: '设置', sub: '主题、单位、提醒与数据导出' }
  };

  /* ------------------------------------------------------------------ *
   * 存储
   * ------------------------------------------------------------------ */

  var store = {
    available: (function () {
      try {
        var k = '__fitdaily_test__';
        root.localStorage.setItem(k, '1');
        root.localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    })(),
    get: function (key, fallback) {
      if (!store.available) return fallback;
      try {
        var raw = root.localStorage.getItem(key);
        return raw === null ? fallback : raw;
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      if (!store.available) return false;
      try { root.localStorage.setItem(key, value); return true; } catch (e) { return false; }
    },
    remove: function (key) {
      if (!store.available) return;
      try { root.localStorage.removeItem(key); } catch (e) { /* 忽略 */ }
    },
    getJSON: function (key, fallback) {
      var raw = store.get(key, null);
      if (!raw) return fallback;
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    },
    setJSON: function (key, value) {
      try { return store.set(key, JSON.stringify(value)); } catch (e) { return false; }
    }
  };

  /* ------------------------------------------------------------------ *
   * 默认状态
   * ------------------------------------------------------------------ */

  function defaultState() {
    return {
      version: 1,
      profile: {
        sex: 'male', age: 25, height: 175, weight: 70, bodyFat: null,
        equipment: 'gym', activity: 'light', goal: 'cut', days: 3,
        experience: 'beginner', diet: 'normal', split: 'upperlower'
      },
      adjust: null,
      generatedAt: null,
      program: null,
      overrides: {},
      reduceLevel: 0,
      schedule: { weekdays: core.DEFAULT_WEEKDAYS[3].slice(), time: '18:30', lead: 30 },
      checkins: {},
      weights: [],
      targetWeight: null,
      sessions: [],
      customFoods: [],
      settings: {
        theme: 'light', font: 16, weightUnit: 'kg', heightUnit: 'cm',
        waterInterval: 60, waterOn: false
      },
      proteinSource: 0,
      ui: { view: 'home', month: null }
    };
  }

  /** 合并默认值，兼容旧数据 / 缺字段 */
  function normalizeState(raw) {
    var def = defaultState();
    if (!raw || typeof raw !== 'object') return def;
    var st = JSON.parse(JSON.stringify(def));
    ['profile', 'settings', 'schedule', 'ui'].forEach(function (k) {
      if (raw[k] && typeof raw[k] === 'object') {
        Object.keys(def[k]).forEach(function (f) {
          if (raw[k][f] !== undefined && raw[k][f] !== null) st[k][f] = raw[k][f];
        });
      }
    });
    ['overrides', 'checkins'].forEach(function (k) {
      if (raw[k] && typeof raw[k] === 'object') st[k] = raw[k];
    });
    ['weights', 'sessions', 'customFoods'].forEach(function (k) {
      if (Array.isArray(raw[k])) st[k] = raw[k];
    });
    ['adjust', 'generatedAt', 'program', 'targetWeight'].forEach(function (k) {
      if (raw[k] !== undefined) st[k] = raw[k];
    });
    if (typeof raw.reduceLevel === 'number') st.reduceLevel = Math.max(0, raw.reduceLevel | 0);
    if (typeof raw.proteinSource === 'number') st.proteinSource = Math.max(0, raw.proteinSource | 0);
    st.profile = core.normalizeProfile(st.profile);
    if (VIEWS.indexOf(st.ui.view) === -1) st.ui.view = 'home';
    return st;
  }

  /**
   * 旧品牌键迁移（fitplan-* → fitdaily-*）：
   * 升级后第一次打开会把旧数据原样搬到新键并清理旧键，避免丢数据。
   */
  var LEGACY_KEY_PAIRS = [
    ['fitplan-state', STORAGE_KEY],
    ['fitplan-theme', THEME_KEY],
    ['fitplan-font', FONT_KEY],
    ['fitplan-train-notify', 'fitdaily-train-notify'],
    ['fitplan-train-lastnotify', 'fitdaily-train-lastnotify']
  ];

  function migrateLegacyStorage() {
    if (!store.available) return;
    LEGACY_KEY_PAIRS.forEach(function (pair) {
      if (store.get(pair[1], null) !== null) return;   // 新键已有数据，不覆盖
      var value = store.get(pair[0], null);
      if (value === null) return;
      store.set(pair[1], value);
    });
    // 主状态已在新键里，才清理旧键
    if (store.get(STORAGE_KEY, null) === null) return;
    LEGACY_KEY_PAIRS.forEach(function (pair) { store.remove(pair[0]); });
  }

  migrateLegacyStorage();

  var state = normalizeState(store.getJSON(STORAGE_KEY, null));
  FP.state = state;

  var saveTimer = null;
  function save(immediate) {
    function persist() {
      saveTimer = null;
      store.setJSON(STORAGE_KEY, state);
      store.set(THEME_KEY, state.settings.theme);
      store.set(FONT_KEY, String(state.settings.font));
    }
    if (immediate) {
      if (saveTimer) { root.clearTimeout(saveTimer); saveTimer = null; }
      persist();
      return;
    }
    if (saveTimer) root.clearTimeout(saveTimer);
    saveTimer = root.setTimeout(persist, 120);
  }

  /* ------------------------------------------------------------------ *
   * 工具函数
   * ------------------------------------------------------------------ */

  function $(sel, scope) { return (scope || doc).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(sel)); }

  function esc(str) { return core.escapeHtml(str); }

  function num(n, digits) {
    var v = typeof n === 'number' ? n : parseFloat(n);
    if (!isFinite(v)) return '—';
    if (digits === undefined) return String(Math.round(v));
    var f = Math.pow(10, digits);
    return String(Math.round(v * f) / f);
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var self = this, args = arguments;
      root.clearTimeout(t);
      t = root.setTimeout(function () { fn.apply(self, args); }, wait || 150);
    };
  }

  function download(filename, content, mime) {
    try {
      var blob;
      if (content instanceof root.Blob) {
        blob = content;
      } else {
        // 带 BOM 的 UTF-8，保证 Excel 打开 CSV 不乱码
        blob = new root.Blob(['\ufeff' + content], { type: (mime || 'text/plain') + ';charset=utf-8' });
      }
      var url = root.URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      doc.body.appendChild(a);
      a.click();
      root.setTimeout(function () {
        doc.body.removeChild(a);
        root.URL.revokeObjectURL(url);
      }, 400);
      return true;
    } catch (e) {
      toast('下载失败：浏览器不支持文件导出', true);
      return false;
    }
  }

  function copyText(text) {
    return new Promise(function (resolve) {
      if (root.navigator && root.navigator.clipboard && root.isSecureContext) {
        root.navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { resolve(fallbackCopy(text)); });
        return;
      }
      resolve(fallbackCopy(text));
    });
    function fallbackCopy(t) {
      try {
        var ta = doc.createElement('textarea');
        ta.value = t;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        doc.body.appendChild(ta);
        ta.select();
        var ok = doc.execCommand('copy');
        doc.body.removeChild(ta);
        return !!ok;
      } catch (e) { return false; }
    }
  }

  function bytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  var toastTimer = null;
  function toast(msg, isError) {
    var node = $('#toast');
    if (!node) return;
    node.textContent = msg;
    node.classList.toggle('is-error', !!isError);
    node.hidden = false;
    node.classList.add('show');
    if (toastTimer) root.clearTimeout(toastTimer);
    toastTimer = root.setTimeout(function () {
      node.classList.remove('show');
      root.setTimeout(function () { node.hidden = true; }, 220);
    }, 2600);
  }

  /* 单位展示 */
  function weightUnit() { return state.settings.weightUnit === 'jin' ? 'jin' : 'kg'; }
  function heightUnit() { return state.settings.heightUnit === 'ft' ? 'ft' : 'cm'; }
  function unitWeight(kg) {
    var w = core.displayWeight(kg, weightUnit());
    return w.value + ' ' + w.unit;
  }
  function unitWeightValue(kg) {
    return weightUnit() === 'jin' ? core.kgToJin(kg) : core.round(kg, 1);
  }
  function kgFromInput(value) {
    var v = core.toNum(value, NaN);
    if (!isFinite(v)) return NaN;
    return weightUnit() === 'jin' ? core.jinToKg(v) : v;
  }
  function cmFromInput(value) {
    var v = core.toNum(value, NaN);
    if (!isFinite(v)) return NaN;
    return heightUnit() === 'ft' ? core.ftInToCm(Math.floor(v), core.round((v % 1) * 12, 1)) : v;
  }
  function heightInputValue(cm) {
    if (heightUnit() === 'ft') {
      var r = core.cmToFtIn(cm);
      return core.round(r.ft + r.inch / 12, 2);
    }
    return core.round(cm, 0);
  }

  /* 通知 */
  function notifyPermission() {
    if (!('Notification' in root)) return 'unsupported';
    return root.Notification.permission;
  }
  function askNotify() {
    if (!('Notification' in root)) return Promise.resolve('unsupported');
    if (root.Notification.permission === 'granted') return Promise.resolve('granted');
    if (root.Notification.permission === 'denied') return Promise.resolve('denied');
    return root.Notification.requestPermission().catch(function () { return 'denied'; });
  }
  function sendNotification(title, body) {
    try {
      if (notifyPermission() !== 'granted') return false;
      new root.Notification(title, { body: body, tag: 'fitdaily', icon: 'img/icon-192.png' });
      return true;
    } catch (e) { return false; }
  }

  /* 打印 */
  function printSection(which) {
    var cls = 'print-' + which;
    doc.body.classList.add(cls);
    root.setTimeout(function () {
      root.print();
      root.setTimeout(function () { doc.body.classList.remove(cls); }, 600);
    }, 60);
  }

  /* 动作演示图：本地 webp → 线上原图 → 内联 SVG 占位（三级兜底，离线也不会裂图） */
  var REMOTE_DEMO_BASE = 'https://lihua2779.github.io/fit-plan/img/';
  var placeholderCache = {};

  function placeholderSvg(name) {
    var label = String(name || '动作演示');
    if (label.length > 10) label = label.slice(0, 10) + '…';
    if (placeholderCache[label]) return placeholderCache[label];
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#e7f6ef"/><stop offset="1" stop-color="#c9e9db"/>' +
      '</linearGradient></defs>' +
      '<rect width="480" height="270" rx="16" fill="url(#g)"/>' +
      '<g stroke="#0e9f6e" stroke-width="12" stroke-linecap="round" fill="none">' +
      '<line x1="150" y1="135" x2="330" y2="135"/>' +
      '<line x1="150" y1="105" x2="150" y2="165"/><line x1="330" y1="105" x2="330" y2="165"/>' +
      '<line x1="118" y1="118" x2="118" y2="152"/><line x1="362" y1="118" x2="362" y2="152"/>' +
      '</g>' +
      '<text x="240" y="215" text-anchor="middle" font-family="system-ui,-apple-system,PingFang SC,Microsoft YaHei,sans-serif" font-size="22" fill="#0b6b4c">' +
      esc(label) + '</text>' +
      '<text x="240" y="243" text-anchor="middle" font-family="system-ui,-apple-system,PingFang SC,Microsoft YaHei,sans-serif" font-size="13" fill="#4c8a72">动作演示占位图</text>' +
      '</svg>';
    var uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    placeholderCache[label] = uri;
    return uri;
  }

  function demoImg(ex, className) {
    ex = ex || {};
    var name = ex.name || '动作';
    var local = ex.img || '';
    var remote = ex.demo || '';
    var fallback = placeholderSvg(name);
    var src = local || remote || fallback;
    return '<img class="' + esc(className || 'demo-img') + '" src="' + esc(src) + '" alt="' + esc(name + ' 动作演示') +
      '" loading="lazy" decoding="async" data-local="' + esc(local) + '" data-remote="' + esc(remote) +
      '" data-fallback="' + esc(fallback) + '" onerror="FP.util.demoFallback(this)">';
  }

  function demoFallback(img) {
    try {
      var local = img.getAttribute('data-local') || '';
      var remote = img.getAttribute('data-remote') || '';
      var fallback = img.getAttribute('data-fallback') || '';
      var current = img.getAttribute('src') || '';
      if (current.indexOf('data:') === 0) {
        img.onerror = null;
        return;
      }
      if (remote && current !== remote) {
        img.setAttribute('src', remote);
        return;
      }
      if (fallback) {
        img.setAttribute('src', fallback);
        img.onerror = null;
        return;
      }
      img.onerror = null;
    } catch (e) { /* 忽略 */ }
  }

  var util = {
    $: $, $$: $$, esc: esc, num: num, debounce: debounce,
    download: download, copy: copyText, bytes: bytes,
    toast: toast,
    today: core.todayISO,
    clamp: core.clamp, round: core.round, toNum: core.toNum,
    unitWeight: unitWeight,
    unitWeightValue: unitWeightValue,
    kgFromInput: kgFromInput,
    cmFromInput: cmFromInput,
    heightInputValue: heightInputValue,
    weightUnit: weightUnit,
    heightUnit: heightUnit,
    notifyPermission: notifyPermission,
    askNotify: askNotify,
    sendNotification: sendNotification,
    printSection: printSection,
    demoImg: demoImg,
    demoFallback: demoFallback,
    placeholderSvg: placeholderSvg,
    REMOTE_DEMO_BASE: REMOTE_DEMO_BASE
  };

  /* ------------------------------------------------------------------ *
   * 训练计划构建（数据 → 渲染结构）
   * ------------------------------------------------------------------ */

  function trainingData() {
    var t = root.FP_TRAINING;
    if (!t) return null;
    // 兼容 exercises 为数组或对象两种写法
    if (!t._exerciseMap) {
      var map = {};
      if (Array.isArray(t.exercises)) {
        t.exercises.forEach(function (ex) {
          if (ex && ex.key) map[ex.key] = ex;
        });
      } else if (t.exercises && typeof t.exercises === 'object') {
        Object.keys(t.exercises).forEach(function (k) {
          var ex = t.exercises[k];
          if (!ex) return;
          if (!ex.key) ex.key = k;
          map[k] = ex;
        });
      }
      t._exerciseMap = map;
    }
    return t;
  }

  function exerciseByKey(key) {
    var t = trainingData();
    if (!t || !key) return null;
    return t._exerciseMap[key] || null;
  }

  function exerciseList() {
    var t = trainingData();
    if (!t) return [];
    return Object.keys(t._exerciseMap).map(function (k) { return t._exerciseMap[k]; });
  }

  /** 取训练模板：4 天 + 胸背肩腿分化的键为 '4-bro'，其余按天数 */
  function templateFor(equipment, days, split) {
    var t = trainingData();
    if (!t) return null;
    var byEquip = (t.templates && (t.templates[equipment] || t.templates.gym)) || {};
    var key = (split === 'bro' && core.toNum(days, 0) === 4) ? '4-bro' : days;
    return byEquip[key] || byEquip[String(key)] || byEquip[days] || byEquip[String(days)] || null;
  }

  /** 解析单日训练项 → 渲染结构（应用 reduceLevel 与用户编辑） */
  function resolveDay(dayIndex, day) {
    var items = (day && (day.items || day.exercises)) || [];
    var resolved = [];
    items.forEach(function (item, idx) {
      var slot = dayIndex + '-' + idx;
      var ex = exerciseByKey(item.key) || {};
      var base = {
        slot: slot,
        idx: idx,
        key: item.key || ex.key || '',
        name: item.name || ex.name || '自定义动作',
        muscle: item.muscle || ex.muscle || '',
        group: ex.group || '',
        sets: core.toNum(item.sets, core.toNum(ex.sets, 3)),
        reps: item.reps || ex.reps || '8-12',
        rest: core.toNum(item.rest, core.toNum(ex.rest, 90)),
        tip: item.tip || ex.tip || '',
        mistake: ex.mistake || '',
        fix: ex.fix || ''
      };
      var ov = state.overrides[slot];
      if (ov) {
        if (ov.removed) return;
        Object.keys(ov).forEach(function (k) {
          if (ov[k] !== undefined && ov[k] !== '') base[k] = ov[k];
        });
      }
      // 组数规则（与上游一致）：模板组数 → 新手 -1 → 一键降容再 -1，下限 2 组
      var setDelta = 0;
      if (state.program && state.program.experience === 'beginner') setDelta -= 1;
      setDelta -= (state.reduceLevel || 0);
      base.sets = Math.max(2, core.toNum(base.sets, 3) + setDelta);
      if (ov && ov.sets) base.sets = core.toNum(ov.sets, base.sets);
      // 演示图：优先用动作自带的 img 字段（可能为空串=该动作没有演示图），
      // 变式动作通过 imageKey 复用同一张 webp
      var imgKey = ex.imageKey || '';
      base.img = ex.img !== undefined ? ex.img : (base.key ? 'img/' + (imgKey || base.key) + '.webp' : '');
      base.demo = base.img ? 'https://lihua2779.github.io/fit-plan/' + base.img : '';
      resolved.push(base);
    });
    return {
      index: dayIndex,
      title: day.title || ('第 ' + (dayIndex + 1) + ' 天'),
      muscles: day.muscles || day.subtitle || '',
      note: day.note || '',
      exercises: resolved
    };
  }

  var planCache = null;
  var programCache = null;

  function program() {
    if (!state.program) return null;
    if (programCache) return programCache;
    var tpl = templateFor(state.program.equipment, state.program.days, state.program.split);
    if (!tpl) return null;
    var list = Array.isArray(tpl) ? tpl : (tpl.days || []);
    programCache = list.map(function (day, i) { return resolveDay(i, day); });
    return programCache;
  }

  function invalidate() {
    planCache = null;
    programCache = null;
  }

  function plan() {
    if (!state.generatedAt) return null;
    if (planCache) return planCache;
    planCache = core.calcNutrition(state.profile, state.adjust);
    return planCache;
  }

  /** 重新计算计划并持久化（生成 / 修改档案 / 调整滑杆时调用） */
  function recalc(options) {
    options = options || {};
    var profile = state.profile;
    state.generatedAt = new Date().toISOString();
    state.program = {
      equipment: profile.equipment,
      days: profile.days,
      experience: profile.experience,
      goal: profile.goal,
      split: profile.split === 'bro' && core.toNum(profile.days, 0) === 4 ? 'bro' : 'upperlower'
    };
    if (options.resetEdits) {
      state.overrides = {};
      state.reduceLevel = 0;
    }
    invalidate();
    return plan();
  }

  /* ------------------------------------------------------------------ *
   * 首页渲染
   * ------------------------------------------------------------------ */

  function statCard(label, value, unit, hint) {
    return '<div class="stat">' +
      '<div class="stat-label">' + esc(label) + '</div>' +
      '<div class="stat-value">' + esc(value) + (unit ? '<span class="stat-unit">' + esc(unit) + '</span>' : '') + '</div>' +
      (hint ? '<div class="stat-hint">' + esc(hint) + '</div>' : '') +
      '</div>';
  }

  function renderHome() {
    var p = plan();
    var results = $('#homeResults');
    if (!results) return;

    if (!p) {
      results.hidden = true;
      $('#saveNote').textContent = state.generatedAt ? '' : '填好上面的信息后点「生成我的计划」，所有数据只保存在本机浏览器。';
      return;
    }

    var goal = p.goal;
    var summary = [
      goal.short,
      core.ACTIVITY[p.profile.activity].label,
      '每周 ' + p.profile.days + ' 练',
      core.EXPERIENCE[p.profile.experience].label,
      '体重 ' + unitWeight(p.profile.weight),
      p.bmrFormula
    ].join(' · ');
    $('#profileSummary').textContent = summary;

    var deltaHint;
    if (goal.key === 'cut') {
      deltaHint = '比维持热量低约 ' + Math.abs(p.delta) + ' kcal（' + p.adjust + '% 缺口）';
    } else if (goal.key === 'bulk') {
      deltaHint = '比维持热量高约 ' + Math.abs(p.delta) + ' kcal（' + p.adjust + '% 盈余）';
    } else {
      deltaHint = '与维持热量持平（TDEE ' + p.tdee + ' kcal）';
    }

    var waterHint = '约 ' + p.waterPerKg + ' ml/kg，建议分多次饮用';
    var proteinHint = '约 ' + p.proteinPerKg + ' g/kg';
    var carbsHint = '约 ' + p.carbsKcal + ' kcal';
    var fatHint = '约 ' + p.fatKcal + ' kcal';

    $('#statGrid').innerHTML =
      statCard('每日目标热量', num(p.target), 'kcal', deltaHint) +
      statCard('蛋白质', num(p.protein), 'g', proteinHint) +
      statCard('碳水', num(p.carbs), 'g', carbsHint) +
      statCard('脂肪', num(p.fat), 'g', fatHint) +
      statCard('每日饮水', num(p.water), 'ml', waterHint);

    // 热量调整滑杆
    var control = $('#deficitControl');
    var slider = $('#deficitSlider');
    var showSlider = goal.key !== 'maintain';
    control.hidden = !showSlider;
    if (showSlider) {
      var range = goal.adjustRange;
      $('#deficitLabel').textContent = goal.key === 'cut' ? '热量缺口（可调）' : '热量盈余（可调）';
      $('#deficitValue').textContent = p.adjust + '%';
      slider.min = range[0];
      slider.max = range[1];
      slider.step = 1;
      slider.value = p.adjust;
      var hint;
      if (goal.key === 'cut') {
        hint = '每周预计减重约 ' + p.weeklyJin + ' 斤（' + p.weeklyKg + ' kg），' + goal.rateHint + '。';
      } else {
        hint = '每周预计增重约 ' + p.weeklyJin + ' 斤（' + p.weeklyKg + ' kg），增长过快容易增加脂肪。';
      }
      $('#deficitHint').textContent = hint;
    }

    // 宏量比例条
    $('#macroBar').hidden = false;
    var segs = [
      ['#segProtein', p.proteinPct],
      ['#segCarbs', p.carbsPct],
      ['#segFat', p.fatPct]
    ];
    segs.forEach(function (pair) {
      var node = $(pair[0]);
      if (node) {
        node.style.flex = pair[1] + ' 1 0%';
        node.setAttribute('title', pair[1] + '%');
      }
    });
    $('#macroLegend').textContent = '热量分配：蛋白质 ' + p.proteinPct + '% · 碳水 ' + p.carbsPct + '% · 脂肪 ' + p.fatPct + '%';

    var check = core.macroCheck(p);
    var notes = [];
    notes.push('蛋白质 ' + p.proteinPerKg + ' g/kg（推荐区间 ' + check.proteinRange[0] + '-' + check.proteinRange[1] + ' g/kg）' +
      (check.proteinOk ? '✓' : '⚠'));
    notes.push('脂肪供能 ' + p.fatEnergyPct + '%（推荐 20-35%）' + (check.fatOk ? '✓' : '⚠'));
    $('#macroRangeNote').textContent = notes.join(' · ');

    results.hidden = false;
    $('#saveNote').textContent = '计划已生成并自动保存在本机浏览器中';
  }

  /* ------------------------------------------------------------------ *
   * 表单
   * ------------------------------------------------------------------ */

  function readForm() {
    var p = state.profile;
    p.age = core.clamp(core.toNum($('#age').value, 25), 14, 90);
    p.height = core.clamp(cmFromInput($('#height').value) || 175, 120, 230);
    p.weight = core.clamp(kgFromInput($('#weight').value) || 70, 30, 200);
    var bf = core.toNum($('#bodyFatInput').value, NaN);
    p.bodyFat = isFinite(bf) ? core.clamp(bf, 3, 60) : null;
    p.activity = $('#activity').value;
    p.goal = $('#goal').value;
    p.days = core.clamp(core.toNum($('#days').value, 3), 2, 6);
    p.experience = $('#experience').value;
    p.diet = $('#diet').value;
    p.equipment = $('#equipment').value;
    p.split = $('#split') && $('#split').value === 'bro' ? 'bro' : 'upperlower';
    return p;
  }

  function fillForm() {
    var p = state.profile;
    $('#age').value = p.age;
    $('#height').value = heightInputValue(p.height);
    $('#weight').value = unitWeightValue(p.weight);
    $('#bodyFatInput').value = p.bodyFat === null || p.bodyFat === undefined ? '' : p.bodyFat;
    $('#activity').value = p.activity;
    $('#goal').value = p.goal;
    $('#days').value = String(p.days);
    $('#experience').value = p.experience;
    $('#diet').value = p.diet;
    $('#equipment').value = p.equipment;
    if ($('#split')) $('#split').value = p.split === 'bro' ? 'bro' : 'upperlower';
    syncSplitField();
    setSegmented($('#sexSeg'), p.sex);
    syncUnitLabels();
  }

  function syncUnitLabels() {
    var wu = weightUnit();
    var hu = heightUnit();
    $('#weightUnitSuffix').textContent = wu === 'jin' ? '斤' : 'kg';
    $('#heightUnitSuffix').textContent = hu === 'ft' ? 'ft' : 'cm';
    $('#weightUnitLabel').textContent = wu === 'jin' ? '（斤）' : '（kg）';
    $('#heightUnitLabel').textContent = hu === 'ft' ? '（英尺）' : '（cm）';
    var formUnit = $('#weightFormUnit');
    if (formUnit) formUnit.textContent = wu === 'jin' ? '（斤）' : '（kg）';
    var targetLabel = $('#targetWeightLabel');
    if (targetLabel) targetLabel.textContent = wu === 'jin' ? '目标体重（斤）' : '目标体重（kg）';
  }

  /** 仅当「每周训练天数 = 4」时显示分化方式选择 */
  function syncSplitField() {
    var field = $('#splitField');
    if (!field) return;
    var days = core.toNum($('#days') && $('#days').value, 3);
    field.hidden = days !== 4;
  }

  function setSegmented(group, value) {
    if (!group) return;
    $$('.seg-btn', group).forEach(function (btn) {
      var on = String(btn.dataset.value) === String(value);
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function generate() {
    readForm();
    if (!isFinite(state.profile.height) || !isFinite(state.profile.weight)) {
      toast('请填写有效的身高和体重', true);
      return;
    }
    state.adjust = null;
    recalc({ resetEdits: true });
    save(true);
    renderAll();
    toast('已生成新的训练与饮食计划');
    setTimeout(function () {
      var el = $('#homeResults');
      if (el && !el.hidden && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  /* ------------------------------------------------------------------ *
   * 主题 / 字号
   * ------------------------------------------------------------------ */

  function applyTheme(theme) {
    state.settings.theme = theme;
    doc.documentElement.setAttribute('data-theme', theme);
    var btn = $('#themeBtn');
    if (btn) {
      btn.textContent = theme === 'dark' ? '切换到浅色' : '切换到深色';
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a1020' : '#eef2ff');
    store.set(THEME_KEY, theme);
  }

  function toggleTheme() {
    applyTheme(state.settings.theme === 'dark' ? 'light' : 'dark');
    save();
    if (FP.settings && FP.settings.render) FP.settings.render();
  }

  function applyFont(size) {
    size = core.clamp(core.toNum(size, 16), 14, 22);
    state.settings.font = size;
    doc.documentElement.style.fontSize = size + 'px';
    store.set(FONT_KEY, String(size));
    $$('#fontSeg .seg-btn').forEach(function (btn) {
      btn.classList.toggle('active', core.toNum(btn.dataset.font, 16) === size);
    });
  }

  /* ------------------------------------------------------------------ *
   * 导航
   * ------------------------------------------------------------------ */

  function go(view) {
    if (VIEWS.indexOf(view) === -1) view = 'home';
    state.ui.view = view;
    $$('.view').forEach(function (sec) {
      sec.classList.toggle('active', sec.id === 'view-' + view);
    });
    $$('.nav-btn').forEach(function (btn) {
      var on = btn.dataset.view === view;
      btn.classList.toggle('active', on);
      if (on) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    // 顶栏标题
    var meta = VIEW_META[view] || VIEW_META.home;
    var titleEl = $('#viewTitle');
    var subEl = $('#viewSub');
    if (titleEl) titleEl.textContent = meta.title;
    if (subEl) subEl.textContent = meta.sub;
    renderView(view);
    save();
    root.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderView(view) {
    if (view === 'home') {
      if (FP.dashboard && FP.dashboard.render) FP.dashboard.render();
      renderHome();
      return;
    }
    if (view === 'training' && FP.training && FP.training.render) FP.training.render();
    if (view === 'diet' && FP.diet && FP.diet.render) FP.diet.render();
    if (view === 'weight' && FP.weight && FP.weight.render) FP.weight.render();
    if (view === 'settings' && FP.settings && FP.settings.render) FP.settings.render();
  }

  function renderAll() {
    invalidate();
    VIEWS.forEach(function (v) { renderView(v); });
  }

  /* ------------------------------------------------------------------ *
   * 启动
   * ------------------------------------------------------------------ */

  function bindGlobal() {
    // 导航：底部浮岛 + 桌面侧边栏（事件委托，同一套 data-view）
    doc.addEventListener('click', function (e) {
      var navBtn = e.target.closest ? e.target.closest('.nav-btn[data-view]') : null;
      if (navBtn) {
        go(navBtn.dataset.view);
        return;
      }
      var t = e.target.closest ? e.target.closest('[data-goto]') : null;
      if (t) go(t.dataset.goto);
    });

    // 回到顶部
    var top = $('#backToTop');
    if (top) {
      top.addEventListener('click', function () { root.scrollTo({ top: 0, behavior: 'smooth' }); });
      root.addEventListener('scroll', function () {
        top.classList.toggle('show', root.scrollY > 360);
      }, { passive: true });
    }

    // 性别分段
    var sexSeg = $('#sexSeg');
    if (sexSeg) {
      sexSeg.addEventListener('click', function (e) {
        var btn = e.target.closest('.seg-btn');
        if (!btn) return;
        state.profile.sex = btn.dataset.value;
        setSegmented(sexSeg, state.profile.sex);
        save();
      });
    }

    var daysSelect = $('#days');
    if (daysSelect) daysSelect.addEventListener('change', syncSplitField);

    var gen = $('#generateBtn');
    if (gen) gen.addEventListener('click', generate);

    var reset = $('#resetFormBtn');
    if (reset) {
      reset.addEventListener('click', function () {
        var p = defaultState().profile;
        Object.keys(p).forEach(function (k) { state.profile[k] = p[k]; });
        fillForm();
        save();
        toast('已恢复默认参数');
      });
    }

    // 生成后修改关键参数即时更新结果（不重置编辑）
    ['#age', '#height', '#weight', '#bodyFatInput', '#activity', '#goal', '#days', '#experience', '#diet', '#equipment', '#split'].forEach(function (sel) {
      var node = $(sel);
      if (!node) return;
      node.addEventListener('change', function () {
        if (!state.generatedAt) return;
        readForm();
        recalc();
        save();
        renderAll();
        toast('计划已按新参数更新');
      });
    });

    // 热量调整滑杆
    var slider = $('#deficitSlider');
    if (slider) {
      var onSlide = function () {
        state.adjust = core.toNum(slider.value, 15);
        recalc();
        save();
        renderHome();
        if (state.ui.view === 'diet' && FP.diet) FP.diet.render();
      };
      slider.addEventListener('input', onSlide);
      slider.addEventListener('change', onSlide);
    }

    // 主题按钮
    ['#themeBtn', '#heroThemeBtn'].forEach(function (sel) {
      var btn = $(sel);
      if (btn) btn.addEventListener('click', toggleTheme);
    });

    // 键盘：Esc 关闭浮层由各模块处理
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      $$('.overlay').forEach(function (ov) {
        if (!ov.hidden && ov.id === 'editOverlay') ov.hidden = true;
      });
    });
  }

  /** 把版本号同步到页面三处：侧边栏 / 设置页 / 页脚（唯一数据源是 APP_VERSION） */
  function applyVersion() {
    var text = 'v' + APP_VERSION;
    ['#sideVersion', '#appVersion'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.textContent = text;
    });
    var fver = $('#footerVersion');
    if (fver) fver.textContent = '（' + text + '）';
    var meta = $('.side-version');
    if (meta && !$('#sideVersion')) meta.appendChild(doc.createTextNode(' ' + text));
  }

  function initModules() {
    ['training', 'diet', 'weight', 'settings', 'dashboard'].forEach(function (name) {
      var mod = FP[name];
      if (mod && typeof mod.init === 'function') {
        try { mod.init(); } catch (err) { console.error('[FitDaily] 模块初始化失败：' + name, err); }
      }
    });
  }

  function start() {
    applyTheme(state.settings.theme === 'dark' ? 'dark' : 'light');
    applyFont(state.settings.font);
    fillForm();
    if (!trainingData()) {
      console.warn('[FitDaily] 未找到 FP_TRAINING 数据，训练模块将为空');
    }
    if (state.generatedAt) recalc();
    bindGlobal();
    initModules();
    renderAll();
    go(state.ui.view || 'home');
    applyVersion();
    doc.documentElement.classList.add('js-ready');
  }

  /* ------------------------------------------------------------------ *
   * 对外 API
   * ------------------------------------------------------------------ */

  FP.util = util;
  FP.save = save;
  FP.plan = plan;
  FP.program = program;
  FP.exerciseByKey = exerciseByKey;
  FP.exerciseList = exerciseList;
  FP.trainingData = trainingData;
  FP.templateFor = templateFor;
  FP.currentSplit = function () {
    var snap = state.program || {};
    return (snap.split === 'bro' && core.toNum(snap.days, 0) === 4) ? 'bro' : 'upperlower';
  };
  FP.splitLabel = function () {
    var t = trainingData();
    if (FP.currentSplit() === 'bro' && t && t.broSplitName) return t.broSplitName;
    var days = (state.program && state.program.days) || state.profile.days;
    return (t && t.splitNames && t.splitNames[days]) || (days + ' 天分化');
  };
  FP.resolveDay = resolveDay;
  FP.recalc = recalc;
  FP.invalidate = invalidate;
  FP.renderHome = renderHome;
  FP.fillForm = fillForm;
  FP.syncUnitLabels = syncUnitLabels;
  FP.renderAll = renderAll;
  FP.renderView = renderView;
  FP.go = go;
  FP.toast = toast;
  FP.applyTheme = applyTheme;
  FP.generate = generate;
  FP.applyFont = applyFont;
  FP.toggleTheme = toggleTheme;
  FP.defaultState = defaultState;
  FP.normalizeState = normalizeState;
  FP.store = store;
  FP.KEYS = { state: STORAGE_KEY, theme: THEME_KEY, font: FONT_KEY };
  FP.VERSION = APP_VERSION;
  FP.VIEWS = VIEWS;

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);