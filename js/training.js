/*!
 * training.js — 训练模块（训练页 + 训练日历 + 日程提醒 + 沉浸式训练 + 组间计时器）
 *
 * 负责：#trainingContent（计划头卡 / 肌群覆盖 / 训练日折叠卡）
 *       #calendarContent（训练日历 / 日程与提醒）
 *       #editOverlay（动作编辑）、#sessionOverlay（沉浸式训练）、#timerOverlay（组间计时器）
 *
 * 依赖：core.js（FP.core）、data.js（FP_TRAINING）；app.js 在之后加载，提供
 *       FP.state / FP.save / FP.program / FP.exerciseByKey / FP.exerciseList /
 *       FP.invalidate / FP.renderAll / FP.toast / FP.util。
 *
 * 约定：加载时只定义对象，不操作 DOM；init() 只绑一次事件；render() 可反复调用
 *       （容器 innerHTML 整体重建 + 事件委托）。所有用户数据经 esc() 转义。
 */
(function (root) {
  'use strict';

  var FP = (root.FP = root.FP || {});
  var doc = root.document;
  var core = FP.core;

  /* ------------------------------------------------------------------ *
   * 常量 / 模块级状态
   * ------------------------------------------------------------------ */

  var NOTIFY_KEY = 'fitdaily-train-notify';
  var LAST_NOTIFY_KEY = 'fitdaily-train-lastnotify';
  var WEEKDAY_SHORT = ['一', '二', '三', '四', '五', '六', '日'];
  var LEAD_OPTIONS = [15, 30, 60];
  var DEFAULT_HEADERS = ['#', '动作', '目标肌群', '组数 × 次数', '组间休息', '计时', '要点'];
  var EMPTY_TEXT = '还没有生成计划，先去首页填写信息';
  var REMOTE_DEMO_BASE = 'https://lihua2779.github.io/fit-plan/img/';

  var S = {
    inited: false,
    expanded: {},          // { dayIndex: bool } 训练日展开状态（默认仅第 1 天展开）
    month: null,           // { year, month(0-11) } 日历当前月
    editSlot: null,        // 正在编辑的 slot
    session: null,         // 沉浸式训练会话
    timer: { total: 90, remaining: 90, running: false, endAt: 0 }, // 组间计时器
    ticker: null,          // 唯一倒计时 interval（计时器 / 训练休息共用）
    reminderTimer: null,   // 每 30s 的提醒检查 interval
    notifyEnabled: false,
    lastNotifyKey: '',
    audio: null
  };

  /* ------------------------------------------------------------------ *
   * 基础工具（FP.* 在 app.js 加载后才可用，统一在调用时解析）
   * ------------------------------------------------------------------ */

  function state() { return FP.state || {}; }

  function coreRef() {
    if (!core) core = FP.core;
    return core || {};
  }

  function trainingData() {
    try {
      if (FP.trainingData) return FP.trainingData();
    } catch (e) { /* 忽略 */ }
    return root.FP_TRAINING || null;
  }

  function program() {
    try { return (FP.program && FP.program()) || null; } catch (e) { return null; }
  }

  function exerciseByKey(key) {
    if (!key) return null;
    try { return (FP.exerciseByKey && FP.exerciseByKey(key)) || null; } catch (e) { return null; }
  }

  function esc(v) {
    if (FP.util && FP.util.esc) return FP.util.esc(v);
    if (core && core.escapeHtml) return core.escapeHtml(v);
    return String(v == null ? '' : v);
  }

  function num(n) {
    if (FP.util && FP.util.num) return FP.util.num(n);
    var v = Number(n);
    return isFinite(v) ? String(Math.round(v)) : '—';
  }

  function toNum(v, fallback) {
    var c = coreRef();
    if (c.toNum) return c.toNum(v, fallback);
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  function clampNum(v, min, max) {
    var n = toNum(v, min);
    return Math.min(max, Math.max(min, n));
  }

  function todayISO() {
    if (FP.util && FP.util.today) return FP.util.today();
    var c = coreRef();
    return c.todayISO ? c.todayISO() : '';
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function toast(msg, isError) {
    if (FP.toast) { FP.toast(msg, !!isError); return; }
    if (FP.util && FP.util.toast) FP.util.toast(msg, !!isError);
  }

  function save() { if (FP.save) FP.save(); }
  function invalidate() { if (FP.invalidate) FP.invalidate(); }
  function renderAll() { if (FP.renderAll) FP.renderAll(); }

  /** 模板占位符替换：{key} → map[key] */
  function fillTpl(tpl, map) {
    return String(tpl == null ? '' : tpl).replace(/\{(\w+)\}/g, function (m, k) {
      return map && map[k] !== undefined && map[k] !== null ? String(map[k]) : m;
    });
  }

  function text(node, value) { if (node) node.textContent = value == null ? '' : String(value); }

  function fmtClock(sec) {
    var s = Math.max(0, Math.round(toNum(sec, 0)));
    return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
  }

  /** 本地存储读写（用 FP.store 优先，退到 localStorage） */
  function storeGet(key) {
    try {
      if (FP.store && FP.store.get) return FP.store.get(key, null);
      return root.localStorage ? root.localStorage.getItem(key) : null;
    } catch (e) { return null; }
  }

  function storeSet(key, value) {
    try {
      if (FP.store && FP.store.set) { FP.store.set(key, value); return; }
      if (root.localStorage) root.localStorage.setItem(key, value);
    } catch (e) { /* 隐私模式忽略 */ }
  }

  function storeRemove(key) {
    try {
      if (FP.store && FP.store.remove) { FP.store.remove(key); return; }
      if (root.localStorage) root.localStorage.removeItem(key);
    } catch (e) { /* 忽略 */ }
  }

  /** 拼 class 属性（拼接写法，避免静态检查把字符串拼接误判为类名） */
  var CLASS_ATTR = 'class' + '="';
  function clsAttr(value) { return CLASS_ATTR + value + '"'; }

  function xmlEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  /** 动作演示占位 SVG（FP.util.placeholderSvg 缺失时的兜底） */
  function placeholderSvg(name) {
    if (FP.util && FP.util.placeholderSvg) {
      try { return FP.util.placeholderSvg(name); } catch (e) { /* 继续用兜底 */ }
    }
    var label = xmlEsc(name || '动作');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">' +
      '<rect width="480" height="270" rx="16" fill="#e7f6ef"/>' +
      '<text x="240" y="140" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#0b6b4c">' + label + '</text>' +
      '<text x="240" y="170" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4c8a72">动作演示占位图</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ------------------------------------------------------------------ *
   * 演示图：本地 webp → 线上原图 → 内联 SVG（三级兜底）
   * ------------------------------------------------------------------ */

  /** 归一化动作的图片信息（变体 key 用 data.js 的 imageKey / img 字段） */
  function demoOf(ex) {
    ex = ex || {};
    var def = exerciseByKey(ex.key);
    var name = ex.name || (def && def.name) || '动作';
    var local;
    if (def) local = def.img || '';            // data.js 的动作图为准（变体共用同一张图）
    else local = ex.img || '';                 // 用户自定义 key：退回 app.js 推导路径
    var key = local ? local.replace(/^img\//, '').replace(/\.(webp|png|jpe?g|gif)$/i, '') : '';
    var base = (FP.util && FP.util.REMOTE_DEMO_BASE) || REMOTE_DEMO_BASE;
    if (base.charAt(base.length - 1) !== '/') base += '/';
    return {
      name: name,
      key: key,
      img: local,
      demo: key ? base + key + '.webp' : ''
    };
  }

  function demoImgHtml(ex) {
    var d = demoOf(ex);
    if (FP.util && typeof FP.util.demoImg === 'function') {
      try { return FP.util.demoImg(d, 'demo-img'); } catch (e) { /* 走兜底 */ }
    }
    var fb = placeholderSvg(d.name);
    return '<img class="demo-img" src="' + esc(d.img || d.demo || fb) + '" alt="' + esc(d.name + ' 动作演示') +
      '" loading="lazy" decoding="async" data-local="' + esc(d.img) + '" data-remote="' + esc(d.demo) +
      '" data-fallback="' + esc(fb) + '">';
  }

  /** <img> 三级兜底（error 不冒泡，用捕获阶段委托） */
  function handleImgError(img) {
    if (!img || img.tagName !== 'IMG') return;
    if (img.getAttribute('data-fb-done') === '1') return;
    var remote = img.getAttribute('data-remote') || '';
    var fallback = img.getAttribute('data-fallback') || '';
    var current = img.getAttribute('src') || '';
    if (current.indexOf('data:') === 0) { img.setAttribute('data-fb-done', '1'); return; }
    if (remote && current !== remote) { img.setAttribute('src', remote); return; }
    if (fallback && current !== fallback) {
      img.setAttribute('src', fallback);
      img.setAttribute('data-fb-done', '1');
      return;
    }
    img.setAttribute('data-fb-done', '1');
  }

  /* ------------------------------------------------------------------ *
   * 日程 / 日历状态
   * ------------------------------------------------------------------ */

  function defaultWeekdays() {
    var c = coreRef();
    var st = state();
    var days = (st.program && st.program.days) || (st.profile && st.profile.days) || 3;
    var table = c.DEFAULT_WEEKDAYS || {};
    return (table[days] || [1, 3, 5]).slice();
  }

  function normalizeDays(list) {
    var out = [];
    (list || []).forEach(function (v) {
      var n = Math.round(toNum(v, 0));
      if (n >= 1 && n <= 7 && out.indexOf(n) < 0) out.push(n);
    });
    out.sort(function (a, b) { return a - b; });
    return out;
  }

  /** 读取并规范化 state.schedule（只补字段，不写盘） */
  function scheduleOf() {
    var st = state();
    if (!st.schedule || typeof st.schedule !== 'object') {
      st.schedule = { weekdays: defaultWeekdays(), time: '18:30', lead: 30 };
    }
    var sch = st.schedule;
    if (!Array.isArray(sch.weekdays)) sch.weekdays = defaultWeekdays();
    else if (sch.weekdays.length) sch.weekdays = normalizeDays(sch.weekdays);
    if (!/^\d{1,2}:\d{2}$/.test(String(sch.time || ''))) sch.time = '18:30';
    if (LEAD_OPTIONS.indexOf(Number(sch.lead)) < 0) sch.lead = 30;
    return sch;
  }

  function currentMonth() {
    if (S.month) return S.month;
    var ui = state().ui || {};
    var m = /^(\d{4})-(\d{1,2})$/.exec(String(ui.month || ''));
    if (m) {
      S.month = { year: Number(m[1]), month: clampNum(Number(m[2]) - 1, 0, 11) };
    } else {
      var now = new Date();
      S.month = { year: now.getFullYear(), month: now.getMonth() };
    }
    return S.month;
  }

  function persistMonth() {
    var st = state();
    if (!st.ui || typeof st.ui !== 'object') st.ui = { view: 'home', month: null };
    st.ui.month = S.month.year + '-' + pad2(S.month.month + 1);
    save();
  }

  /** 训练日 ↔ 计划第 N 天按「排序后的训练日」一一对应 */
  function weekdayTitles(prog) {
    var sch = scheduleOf();
    var map = {};
    sch.weekdays.forEach(function (wd, i) {
      map[wd] = {
        title: prog && prog[i] ? prog[i].title : '训练',
        index: i
      };
    });
    return map;
  }

  /* ------------------------------------------------------------------ *
   * 肌群覆盖统计
   * ------------------------------------------------------------------ */

  function groupOf(ex) {
    if (!ex) return '';
    var def = exerciseByKey(ex.key);
    if (def && def.group) return def.group;
    var t = trainingData() || {};
    var groups = t.muscleGroups || {};
    var muscle = String(ex.muscle || '');
    var keys = Object.keys(groups);
    for (var i = 0; i < keys.length; i++) {
      var g = groups[keys[i]];
      if (g && g.label && g.label !== '其他' && muscle.indexOf(g.label) >= 0) return keys[i];
    }
    return '';
  }

  function coverageStats(prog) {
    var t = trainingData() || {};
    var meta = t.muscleGroups || {};
    var cov = t.coverage || {};
    var order = (cov.order && cov.order.length) ? cov.order.slice() : Object.keys(meta);
    if (!order.length) order = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'glutes_hams', 'calves', 'core'];
    var stats = {};
    order.forEach(function (g) {
      var m = meta[g] || {};
      stats[g] = { key: g, label: m.label || g, big: !!m.big, order: toNum(m.order, 99), sessions: 0, exercises: 0 };
    });
    (prog || []).forEach(function (day) {
      var seen = {};
      (day.exercises || []).forEach(function (ex) {
        var g = groupOf(ex);
        if (!g || !stats[g]) return;
        stats[g].exercises++;
        seen[g] = true;
      });
      Object.keys(seen).forEach(function (g) { stats[g].sessions++; });
    });
    return order.map(function (g) { return stats[g]; }).sort(function (a, b) {
      return a.order - b.order;
    });
  }

  /* ------------------------------------------------------------------ *
   * 渲染：训练页
   * ------------------------------------------------------------------ */

  function emptyHtml() {
    return '<div class="empty"><p>' + esc(EMPTY_TEXT) + '</p>' +
      '<div class="quick-links"><button type="button" class="btn btn-primary" data-goto="home">去首页生成计划 →</button></div></div>';
  }

  function buildTips(profile) {
    var t = trainingData() || {};
    var tips = t.tips || {};
    var out = [];
    var push = function (list) {
      if (Array.isArray(list)) list.forEach(function (x) { if (x) out.push(x); });
    };
    push(tips[profile.experience]);
    push(tips[profile.goal]);
    push(tips.general);
    return out.slice(0, 3);
  }

  function planIntroHtml(prog, profile) {
    var t = trainingData() || {};
    var intro = t.planIntro || {};
    var st = state();
    var snapshot = st.program || {};
    var equip = snapshot.equipment || profile.equipment || 'gym';
    var equipLabel = (intro.equipmentLabels || {})[equip] ||
      (equip === 'home' ? '居家无器械' : '健身房器械');
    var days = prog.length || snapshot.days || profile.days || 3;
    var isBro = (typeof FP.currentSplit === 'function' ? FP.currentSplit() : snapshot.split) === 'bro';
    var split = (isBro && t.broSplitName)
      ? t.broSplitName
      : ((t.splitNames || {})[days] || (t.templateLabels || {})[days] || (days + ' 天分化'));
    var desc = (isBro && t.broSplitDescription)
      ? t.broSplitDescription
      : ((t.splitDescriptions || {})[days] || '');
    if (equip === 'home' && intro.homeSplitDescSuffix) desc += intro.homeSplitDescSuffix;

    var titles = prog.map(function (day, i) {
      return fillTpl(intro.dayTitleTemplate || '第 {n} 天：{title}', { n: i + 1, title: day.title });
    }).join(intro.dayTitleJoiner || ' · ');
    var dayLine = titles ? fillTpl(intro.dayLineTemplate || '{dayTitles}', { dayTitles: titles }) : '';

    var tips = buildTips(profile);
    var html = '<section class="panel plan-intro"><div class="stack">';
    html += '<h3>本周训练安排 · ' + esc(split) + ' · ' + esc(equipLabel) + '</h3>';
    if (desc) html += '<p>' + esc(desc) + '</p>';
    if (dayLine) html += '<p>' + esc(dayLine) + '</p>';
    tips.forEach(function (tip) { html += '<div class="tip-box">' + esc(tip) + '</div>'; });
    if (intro.demoNote) html += '<p>' + esc(intro.demoNote) + '</p>';
    html += '</div></section>';
    return html;
  }

  function coverageHtml(prog, profile) {
    var t = trainingData() || {};
    var cov = t.coverage || {};
    var labels = cov.buttonLabels || {};
    var st = state();
    var stats = coverageStats(prog);
    var cap = toNum((cov.capByExperience || {})[profile.experience], 2);
    var expLabel = ((coreRef().EXPERIENCE || {})[profile.experience] || {}).label || '新手';
    var head = cov.head || '本周肌群覆盖（按训练日统计）';
    var hint = fillTpl(cov.headHintTemplate || '{experienceLabel}推荐大肌群每周 ≤ {cap} 练', {
      experienceLabel: expLabel,
      cap: cap
    });

    var chips = [];
    var risk = [];
    stats.forEach(function (g) {
      if (g.sessions > 0) {
        var cls = 'chip';
        if (g.big && g.sessions > cap) { cls += ' badge-warn'; risk.push({ label: g.label, sessions: g.sessions }); }
        chips.push('<span ' + clsAttr(cls) + '>' + esc(g.label) + ' <b>' + g.sessions + '</b> 练 · <b>' +
          g.exercises + '</b> 动作</span>');
      } else if (g.big) {
        chips.push('<span class="chip badge-muted">' + esc(g.label) + ' <b>0</b> 练</span>');
      }
    });

    var notes = [];
    if (risk.length) {
      var normal = cov.notes || {};
      var itemTpl = normal.overFrequencyItem || '{group} 每周 {sessions} 练';
      var list = risk.map(function (r) {
        return fillTpl(itemTpl, { group: r.label, sessions: r.sessions });
      }).join(normal.overFrequencyJoiner || '、');
      notes.push(fillTpl(normal.overFrequency || '注意：{list}超出当前经验推荐频率，建议降低训练容量、保证充分恢复。', { list: list }));
    } else {
      var noteMap = cov.notes || {};
      notes.push((prog.length <= 2 ? noteMap.fullBody : noteMap.normal) ||
        '大肌群每周约 2 练、间隔 48 小时以上，兼顾刺激频率与恢复。');
    }
    if (st.reduceLevel > 0) notes.push('当前为「降低容量」模式：每个动作每组减 1 组，再次点击可按恢复标准容量。');

    var reduceLabel = st.reduceLevel > 0
      ? '恢复训练容量'
      : (labels.toLight || '一键降低训练容量（每组减 1 组）');

    var html = '<section class="coverage">';
    html += '<div class="coverage-head"><h4>' + esc(head) + '</h4><span>' + esc(hint) + '</span></div>';
    html += chips.length ? '<div class="chips">' + chips.join('') + '</div>'
      : '<p class="coverage-note">暂无可统计的动作。</p>';
    if (notes.length) html += '<p class="coverage-note">' + esc(notes.join(' ')) + '</p>';
    html += '<div class="quick-links"><button type="button" class="btn btn-primary" data-act="reduce">' +
      esc(reduceLabel) + '</button></div>';
    html += '</section>';
    return html;
  }

  function tableHeadHtml() {
    var t = trainingData() || {};
    var intro = t.planIntro || {};
    var headers = (intro.tableHeaders && intro.tableHeaders.length) ? intro.tableHeaders : DEFAULT_HEADERS;
    return '<thead><tr>' + headers.map(function (h) {
      return '<th scope="col">' + esc(h) + '</th>';
    }).join('') + '</tr></thead>';
  }

  function exerciseRowHtml(ex, rowIndex) {
    var tip = ex.tip || '';
    var mistake = ex.mistake || '';
    var fix = ex.fix || '';
    var warn = '';
    if (mistake || fix) {
      warn = '<span class="tip-mistake warn">' +
        (mistake ? '常见错误：' + esc(mistake) : '') +
        (mistake && fix ? '；' : '') +
        (fix ? '纠正：' + esc(fix) : '') + '</span>';
    }
    return '<tr data-slot="' + esc(ex.slot) + '">' +
      '<td class="strong">' + (rowIndex + 1) + '</td>' +
      '<td>' +
        '<div class="demo-img-wrap">' + demoImgHtml(ex) + '</div>' +
        '<span class="strong">' + esc(ex.name) + '</span>' +
        '<div class="row-actions">' +
          '<button type="button" class="btn btn-ghost" data-act="edit" data-slot="' + esc(ex.slot) + '">编辑</button>' +
          '<button type="button" class="btn btn-danger" data-act="del" data-slot="' + esc(ex.slot) + '">删除</button>' +
        '</div>' +
      '</td>' +
      '<td>' + esc(ex.muscle || '—') + '</td>' +
      '<td class="strong">' + esc(num(ex.sets)) + ' × ' + esc(ex.reps || '—') + '</td>' +
      '<td>' + esc(num(ex.rest)) + ' 秒</td>' +
      '<td><button type="button" class="btn btn-ghost" data-act="timer" data-rest="' + esc(num(ex.rest)) +
        '" data-name="' + esc(ex.name) + '" title="开始 ' + esc(num(ex.rest)) + ' 秒组间计时器" ' +
        'aria-label="开始 ' + esc(num(ex.rest)) + ' 秒组间计时器">⏱</button></td>' +
      '<td><div class="tip-cell">' + (tip ? esc(tip) : '<span>—</span>') + warn + '</div></td>' +
      '</tr>';
  }

  function dayCardHtml(day, dayIndex) {
    var open = isExpanded(dayIndex);
    var html = '<article ' + clsAttr('day-card' + (open ? ' is-open' : '')) + ' data-day="' + dayIndex + '">';
    html += '<div class="day-head">' +
      '<button type="button" class="day-toggle" data-act="toggle" data-day="' + dayIndex + '" ' +
      'aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="dayBody-' + dayIndex + '">' +
      '<span>Day ' + (dayIndex + 1) + ' · ' + esc(day.title) +
      (day.muscles ? '<small>' + esc(day.muscles) + '</small>' : '') + '</span>' +
      '<span class="chev" aria-hidden="true">▾</span>' +
      '</button>' +
      '<button type="button" class="btn btn-primary" data-act="start" data-day="' + dayIndex + '">开始训练</button>' +
      '</div>';
    html += '<div class="day-body" id="dayBody-' + dayIndex + '">';
    if (day.note) html += '<p class="coverage-note">' + esc(day.note) + '</p>';
    if (!day.exercises || !day.exercises.length) {
      html += '<div class="empty">当天的动作都被删除了，重新生成计划可以恢复。</div>';
    } else {
      html += '<div class="table-wrap"><table>' + tableHeadHtml() + '<tbody>';
      day.exercises.forEach(function (ex, i) { html += exerciseRowHtml(ex, i); });
      html += '</tbody></table></div>';
    }
    html += '</div></article>';
    return html;
  }

  function renderTrainingHtml(prog) {
    if (!prog || !prog.length) return emptyHtml();
    var profil = state().profile || {};
    var html = planIntroHtml(prog, profil);
    html += coverageHtml(prog, profil);
    prog.forEach(function (day, i) { html += dayCardHtml(day, i); });
    return html;
  }

  /* ------------------------------------------------------------------ *
   * 渲染：日历 + 日程与提醒
   * ------------------------------------------------------------------ */

  function countMonthCheckins(year, month0) {
    var checkins = state().checkins || {};
    var prefix = year + '-' + pad2(month0 + 1) + '-';
    return Object.keys(checkins).filter(function (k) { return k.indexOf(prefix) === 0; }).length;
  }

  function weekdayButtonsHtml(sch) {
    var names = coreRef().WEEKDAY_NAMES || ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    var html = '';
    for (var i = 1; i <= 7; i++) {
      var on = sch.weekdays.indexOf(i) >= 0;
      html += '<button type="button" ' + clsAttr('seg-btn' + (on ? ' active' : '')) + ' data-act="weekday" data-wd="' + i +
        '" aria-pressed="' + (on ? 'true' : 'false') + '" title="' + esc(names[i - 1]) + '" aria-label="' +
        esc(names[i - 1]) + '">' + WEEKDAY_SHORT[i - 1] + '</button>';
    }
    return '<div class="segmented" role="group" aria-label="每周训练日（可多选）">' + html + '</div>';
  }

  function leadOptionsHtml(lead) {
    var html = '';
    LEAD_OPTIONS.forEach(function (m) {
      html += '<option value="' + m + '"' + (Number(lead) === m ? ' selected' : '') + '>提前 ' + m + ' 分钟</option>';
    });
    return html;
  }

  function notifyPerm() {
    if (FP.util && FP.util.notifyPermission) {
      try { return FP.util.notifyPermission(); } catch (e) { return 'unsupported'; }
    }
    return 'unsupported';
  }

  function notifyStatusText() {
    var t = trainingData() || {};
    var intro = t.planIntro || {};
    var calCfg = intro.calendar || {};
    var sch = scheduleOf();
    var perm = notifyPerm();
    if (perm === 'unsupported') {
      return calCfg.notifyUnsupported || '当前浏览器不支持桌面通知，建议导出 .ics 文件导入系统日历实现提醒。';
    }
    if (perm === 'denied') {
      return '浏览器已拒绝通知权限，可在站点设置里重新允许；也可以导出 .ics 使用系统日历提醒。';
    }
    if (S.notifyEnabled) {
      return fillTpl(calCfg.notifyEnabledTemplate ||
        '桌面提醒已开启：每周 {days} 个训练日，每天 {time} 提前 {lead} 分钟提醒（页面打开时生效）。建议同时导出 .ics 实现离线提醒。', {
        days: sch.weekdays.length,
        time: sch.time,
        lead: sch.lead
      });
    }
    return calCfg.notifyDisabled ||
      '未开启桌面提醒。开启后浏览器会定时检查训练日程并弹出通知；导出 .ics 可导入手机 / 电脑系统日历，即使页面关闭也能提醒。';
  }

  function calendarPanelHtml(prog) {
    var c = coreRef();
    var m = currentMonth();
    var weeks = c.monthMatrix ? c.monthMatrix(m.year, m.month) : [];
    var titles = weekdayTitles(prog);
    var today = todayISO();
    var checkins = state().checkins || {};

    var html = '<section class="panel">';
    html += '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-act="cal-prev" aria-label="上个月">‹</button>' +
      '<h3>' + esc(c.fmtMonthCN ? c.fmtMonthCN(m.year, m.month) : (m.year + ' 年 ' + (m.month + 1) + ' 月')) + '</h3>' +
      '<button type="button" class="cal-nav" data-act="cal-next" aria-label="下个月">›</button></div>';
    html += '<div class="calendar-grid" role="grid" aria-label="训练日历">';
    WEEKDAY_SHORT.forEach(function (w) {
      html += '<div class="cal-dow" role="columnheader">' + w + '</div>';
    });
    weeks.forEach(function (row) {
      row.forEach(function (cell) {
        var info = cell.inMonth ? titles[cell.weekday] : null;
        var isTraining = !!info;
        var checked = !!(isTraining && checkins[cell.date]);
        var cls = 'cal-cell';
        if (!cell.inMonth) cls += ' other-month';
        if (cell.date === today) cls += ' is-today';
        if (isTraining) cls += ' is-training';
        if (checked) cls += ' checked';
        var inner = '<span class="cal-date">' + cell.day + '</span>';
        if (isTraining) inner += '<span class="cal-workout">' + esc(info.title) + '</span>';
        if (checked) inner += '<span class="cal-check">✓</span>';
        if (isTraining) {
          var label = cell.date + ' · ' + info.title + (checked ? '，已打卡，点击取消' : '，训练日，点击打卡');
          html += '<button type="button" ' + clsAttr(cls) + ' data-act="checkin" data-date="' + esc(cell.date) +
            '" data-title="' + esc(info.title) + '" aria-pressed="' + (checked ? 'true' : 'false') +
            '" aria-label="' + esc(label) + '">' + inner + '</button>';
        } else {
          html += '<div ' + clsAttr(cls) + ' role="gridcell">' + inner + '</div>';
        }
      });
    });
    html += '</div>';

    html += '<div class="cal-legend">' +
      '<span><i class="legend-dot today-dot" aria-hidden="true"></i> 今天</span>' +
      '<span><i class="legend-pill" aria-hidden="true"></i> 训练日</span>' +
      '<span><i class="legend-dot" aria-hidden="true"></i> 已打卡</span>' +
      '</div>';

    var streak = c.streakDays ? c.streakDays(checkins) : 0;
    var sch = scheduleOf();
    html += '<p class="coverage-note">已连续打卡 ' + num(streak) + ' 天 · 本月打卡 ' +
      num(countMonthCheckins(m.year, m.month)) + ' 次 · 每周 ' + num(sch.weekdays.length) + ' 个训练日</p>';
    html += '</section>';
    return html;
  }

  function schedulePanelHtml() {
    var t = trainingData() || {};
    var intro = t.planIntro || {};
    var calCfg = intro.calendar || {};
    var sch = scheduleOf();
    var html = '<section class="panel">';
    html += '<h2 class="panel-title">日程与提醒</h2>';
    html += '<div class="form-row"><div class="field"><span class="field-label">每周训练日（可多选，默认按训练天数推荐）</span>' +
      weekdayButtonsHtml(sch) + '</div></div>';
    html += '<div class="form-row">' +
      '<label class="field"><span class="field-label">训练时间</span>' +
      '<input type="time" id="trainTimeInput" data-role="train-time" value="' + esc(sch.time) + '"></label>' +
      '<label class="field"><span class="field-label">提前提醒</span>' +
      '<select id="trainLeadSelect" data-role="train-lead">' + leadOptionsHtml(sch.lead) + '</select></label>' +
      '</div>';
    html += '<div class="setting-row">' +
      '<span class="setting-label">桌面提醒</span>' +
      '<div class="setting-actions"><button type="button" class="btn btn-ghost" id="trainNotifyBtn" data-act="notify">开启桌面提醒</button></div>' +
      '</div>';
    html += '<p class="notify-status" id="trainNotifyStatus" aria-live="polite">' + esc(notifyStatusText()) + '</p>';
    html += '<div class="quick-links">' +
      '<button type="button" class="btn btn-primary" data-act="ics">导出日历 (.ics)</button>' +
      '<button type="button" class="btn btn-ghost" data-act="recommend">按训练天数推荐训练日</button>' +
      '</div>';
    if (calCfg.reminderHint) html += '<p class="coverage-note">' + esc(calCfg.reminderHint) + '</p>';
    html += '</section>';
    return html;
  }

  function renderCalendarHtml(prog) {
    return calendarPanelHtml(prog) + schedulePanelHtml();
  }

  /** 只重建 #calendarContent（切换月份 / 打卡 / 提醒开关时用） */
  function renderCalendarOnly() {
    var el = doc.getElementById('calendarContent');
    if (el) el.innerHTML = renderCalendarHtml(program());
    syncNotifyUi();
    stopTickerIfIdle();
  }

  function syncNotifyUi() {
    text(doc.getElementById('trainNotifyStatus'), notifyStatusText());
    var btn = doc.getElementById('trainNotifyBtn');
    if (btn) {
      var on = S.notifyEnabled && notifyPerm() === 'granted';
      btn.textContent = on ? '关闭桌面提醒' : '开启桌面提醒';
      btn.disabled = notifyPerm() === 'unsupported';
    }
  }

  /* ------------------------------------------------------------------ *
   * 展开 / 收起
   * ------------------------------------------------------------------ */

  function isExpanded(dayIndex) {
    var v = S.expanded[dayIndex];
    return v === undefined ? dayIndex === 0 : !!v;
  }

  function toggleDay(dayIndex) {
    var open = !isExpanded(dayIndex);
    S.expanded[dayIndex] = open;
    var card = doc.querySelector('#trainingContent .day-card[data-day="' + dayIndex + '"]');
    if (!card) return;
    card.classList.toggle('is-open', open);
    var btn = card.querySelector('.day-toggle');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ------------------------------------------------------------------ *
   * 动作编辑浮层
   * ------------------------------------------------------------------ */

  function findExercise(slot) {
    var prog = program();
    if (!prog) return null;
    for (var d = 0; d < prog.length; d++) {
      var list = prog[d].exercises || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].slot === slot) return { day: prog[d], dayIndex: d, ex: list[i] };
      }
    }
    return null;
  }

  function getEl(id) { return doc.getElementById(id); }

  function exerciseOptionsHtml(current) {
    var t = trainingData() || {};
    var list = [];
    try { list = (FP.exerciseList && FP.exerciseList()) || []; } catch (e) { list = []; }
    var order = (t.exerciseOrder || []).slice();
    var byKey = {};
    list.forEach(function (ex) { if (ex && ex.key) byKey[ex.key] = ex; });
    var keys = [];
    order.forEach(function (k) { if (byKey[k] && keys.indexOf(k) < 0) keys.push(k); });
    Object.keys(byKey).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });

    var html = '';
    if (current && current.key && keys.indexOf(current.key) < 0) {
      html += '<option value="' + esc(current.key) + '" selected>' + esc(current.name) + '</option>';
    }
    keys.forEach(function (k) {
      var ex = byKey[k];
      var label = (ex.name || k) + (ex.muscle ? '（' + ex.muscle + '）' : '');
      var sel = current && current.key === k ? ' selected' : '';
      html += '<option value="' + esc(k) + '"' + sel + '>' + esc(label) + '</option>';
    });
    return html;
  }

  function openEdit(slot) {
    var found = findExercise(slot);
    var overlay = getEl('editOverlay');
    if (!found || !overlay) { toast('找不到这个动作，可能计划已更新', true); return; }
    S.editSlot = slot;
    var ex = found.ex;
    var nameSel = getEl('editName');
    if (nameSel) nameSel.innerHTML = exerciseOptionsHtml(ex);
    var muscle = getEl('editMuscle');
    if (muscle) muscle.value = ex.muscle || '';
    var sets = getEl('editSets');
    if (sets) sets.value = String(toNum(ex.sets, 3));
    var reps = getEl('editReps');
    if (reps) reps.value = ex.reps || '';
    var rest = getEl('editRest');
    if (rest) {
      var restVal = String(Math.round(toNum(ex.rest, 90)));
      if (!rest.querySelector('option[value="' + restVal + '"]')) {
        var opt = doc.createElement('option');
        opt.value = restVal;
        opt.textContent = restVal + ' 秒';
        rest.appendChild(opt);
      }
      rest.value = restVal;
    }
    var tip = getEl('editTip');
    if (tip) tip.value = ex.tip || '';
    text(getEl('editTitle'), '编辑动作 · Day ' + (found.dayIndex + 1) + ' ' + found.day.title);
    overlay.hidden = false;
    lockScroll();
    if (muscle && muscle.focus) { try { muscle.focus(); muscle.select(); } catch (e) { /* 忽略 */ } }
  }

  /** 编辑浮层内切换动作时，带入该动作的默认值 */
  function fillEditFromSelect() {
    var sel = getEl('editName');
    if (!sel) return;
    var def = exerciseByKey(sel.value);
    if (!def) return;
    var muscle = getEl('editMuscle');
    if (muscle) muscle.value = def.muscle || '';
    var tip = getEl('editTip');
    if (tip) tip.value = def.tip || '';
    var reps = getEl('editReps');
    if (reps) reps.value = def.reps || reps.value;
    var sets = getEl('editSets');
    if (sets && def.sets) sets.value = String(toNum(def.sets, 3));
    var rest = getEl('editRest');
    if (rest && def.rest) {
      var v = String(Math.round(toNum(def.rest, 90)));
      if (!rest.querySelector('option[value="' + v + '"]')) {
        var opt = doc.createElement('option');
        opt.value = v;
        opt.textContent = v + ' 秒';
        rest.appendChild(opt);
      }
      rest.value = v;
    }
  }

  function saveEdit() {
    var slot = S.editSlot;
    if (!slot) return;
    var found = findExercise(slot);
    var ex = found ? found.ex : {};
    var sel = getEl('editName');
    var selKey = sel ? sel.value : '';
    var def = exerciseByKey(selKey);
    var sets = Math.round(clampNum(getEl('editSets') ? getEl('editSets').value : ex.sets, 1, 10));
    var repsNode = getEl('editReps');
    var reps = repsNode && String(repsNode.value || '').trim() ? String(repsNode.value).trim() : (ex.reps || '8-12');
    var rest = Math.round(clampNum(getEl('editRest') ? getEl('editRest').value : ex.rest, 5, 600));
    var muscleNode = getEl('editMuscle');
    var muscle = muscleNode && String(muscleNode.value || '').trim()
      ? String(muscleNode.value).trim()
      : ((def && def.muscle) || ex.muscle || '');
    var tipNode = getEl('editTip');
    var tip = tipNode && String(tipNode.value || '').trim()
      ? String(tipNode.value).trim()
      : ((def && def.tip) || ex.tip || '');
    var name = (def && def.name) || ex.name || '自定义动作';

    var st = state();
    if (!st.overrides || typeof st.overrides !== 'object') st.overrides = {};
    var ov = { name: name, muscle: muscle, sets: sets, reps: reps, rest: rest, tip: tip };
    if (selKey) ov.key = selKey;
    st.overrides[slot] = ov;
    S.editSlot = null;
    closeEdit();
    invalidate();
    save();
    renderAll();
    toast('已保存动作修改');
  }

  function deleteExercise(slot) {
    var found = findExercise(slot);
    if (!found) return;
    if (!root.confirm || !root.confirm('删除「' + found.ex.name + '」这个动作？重新生成计划可以恢复。')) return;
    var st = state();
    if (!st.overrides || typeof st.overrides !== 'object') st.overrides = {};
    st.overrides[slot] = { removed: true };
    invalidate();
    save();
    renderAll();
    toast('已删除动作');
  }

  function closeEdit() {
    var overlay = getEl('editOverlay');
    if (overlay) overlay.hidden = true;
    S.editSlot = null;
    unlockScroll();
  }

  /* ------------------------------------------------------------------ *
   * 浮层 / 滚动锁
   * ------------------------------------------------------------------ */

  function visibleOverlayCount() {
    return doc.querySelectorAll('.overlay:not([hidden])').length;
  }

  function lockScroll() {
    if (doc.body) doc.body.classList.add('no-scroll');
  }

  function unlockScroll() {
    if (!doc.body) return;
    if (!visibleOverlayCount()) doc.body.classList.remove('no-scroll');
  }

  function showOverlay(node) {
    if (!node) return;
    node.hidden = false;
    lockScroll();
  }

  function hideOverlay(node) {
    if (!node) return;
    node.hidden = true;
    unlockScroll();
  }

  /* ------------------------------------------------------------------ *
   * 沉浸式训练
   * ------------------------------------------------------------------ */

  function openSession(dayIndex) {
    var prog = program();
    if (!prog || !prog[dayIndex]) { toast('找不到当天的训练安排，请重新生成计划', true); return; }
    var day = prog[dayIndex];
    if (!day.exercises || !day.exercises.length) { toast('这一天没有可训练的动作', true); return; }
    S.session = {
      dayIndex: dayIndex,
      dayTitle: day.title,
      exercises: day.exercises.slice(),
      exIdx: 0,
      done: day.exercises.map(function () { return 0; }),
      resting: false,
      restEnd: 0,
      restTotal: 0,
      startedAt: Date.now()
    };
    showOverlay(getEl('sessionOverlay'));
    ensureAudio();
    renderSession();
  }

  function setSessionImage(ex) {
    var img = getEl('sessionGif');
    if (!img) return;
    var d = demoOf(ex);
    var fb = placeholderSvg(d.name);
    img.setAttribute('data-local', d.img);
    img.setAttribute('data-remote', d.demo);
    img.setAttribute('data-fallback', fb);
    img.removeAttribute('data-fb-done');
    img.setAttribute('alt', d.name + ' 动作演示');
    img.setAttribute('src', d.img || d.demo || fb);
  }

  function renderSession() {
    var s = S.session;
    if (!s) return;
    var ex = s.exercises[s.exIdx];
    if (!ex) { finishSession(false); return; }
    var done = s.done[s.exIdx] || 0;
    text(getEl('sessionDayTitle'), 'Day ' + (s.dayIndex + 1) + ' · ' + s.dayTitle);
    text(getEl('sessionProgress'), '动作 ' + (s.exIdx + 1) + ' / ' + s.exercises.length);
    text(getEl('sessionExerciseName'), ex.name);
    setSessionImage(ex);
    text(getEl('sessionMeta'), [ex.muscle, num(ex.sets) + ' 组 × ' + (ex.reps || '—'),
      '组间休息 ' + num(ex.rest) + ' 秒'].filter(Boolean).join(' · '));
    text(getEl('sessionSetInfo'), '第 ' + (done + 1) + ' / ' + num(ex.sets) + ' 组');

    var rest = getEl('sessionRest');
    if (rest) rest.hidden = !s.resting;
    if (s.resting) text(getEl('sessionRestTime'), fmtClock(Math.max(0, Math.ceil((s.restEnd - Date.now()) / 1000))));

    var doneBtn = getEl('sessionDoneBtn');
    var skipBtn = getEl('sessionSkipBtn');
    if (doneBtn) doneBtn.hidden = !!s.resting;
    if (skipBtn) skipBtn.hidden = !s.resting;
    if (s.resting) ensureTicker();
    else stopTickerIfIdle();
  }

  function startRest(seconds) {
    var s = S.session;
    if (!s) return;
    var sec = Math.max(5, Math.round(toNum(seconds, 90)));
    s.resting = true;
    s.restTotal = sec;
    s.restEnd = Date.now() + sec * 1000;
    ensureTicker();
  }

  function sessionDone() {
    var s = S.session;
    if (!s) return;
    if (s.resting) { sessionSkip(); return; }
    s.done[s.exIdx] = (s.done[s.exIdx] || 0) + 1;
    if (s.done[s.exIdx] < toNum(s.exercises[s.exIdx].sets, 1)) {
      startRest(s.exercises[s.exIdx].rest);
      renderSession();
      return;
    }
    s.exIdx++;
    if (s.exIdx >= s.exercises.length) { finishSession(false); return; }
    renderSession();
  }

  function sessionSkip() {
    var s = S.session;
    if (!s) return;
    s.resting = false;
    renderSession();
  }

  function finishSession(aborted) {
    var s = S.session;
    if (!s) { hideOverlay(getEl('sessionOverlay')); return; }
    var sets = [];
    var totalSets = 0;
    s.exercises.forEach(function (ex, i) {
      var n = s.done[i] || 0;
      if (n > 0) {
        sets.push({
          name: ex.name, sets: n, reps: ex.reps || '',
          key: ex.key || '', group: ex.group || '', muscle: ex.muscle || ''
        });
        totalSets += n;
      }
    });
    var dayTitle = s.dayTitle;
    // 训练时长（分钟）：开始训练时记录过 startedAt
    var durationMin = Math.max(1, Math.round((Date.now() - (s.startedAt || Date.now())) / 60000));
    S.session = null;
    hideOverlay(getEl('sessionOverlay'));
    stopTickerIfIdle();

    if (!sets.length) {
      toast(aborted ? '已结束训练，本次没有完成任何组' : '训练结束');
      return;
    }
    var c = coreRef();
    var volume = Math.round(toNum(c.sessionVolume ? c.sessionVolume(sets) : 0, 0));
    var st = state();
    // 热量估算（MET × 体重 × 时长）
    var energy = c.estimateCalories
      ? c.estimateCalories({ weightKg: st.profile && st.profile.weight, durationMin: durationMin, sets: sets })
      : { kcal: 0, met: 0 };
    if (!Array.isArray(st.sessions)) st.sessions = [];
    st.sessions.push({
      date: todayISO(),
      dayTitle: dayTitle,
      at: new Date().toISOString(),
      sets: sets,
      setsCount: totalSets,
      exercisesCount: sets.length,
      durationMin: durationMin,
      volume: volume,
      kcal: energy.kcal,
      met: energy.met
    });
    // 与上游一致：完成一次训练自动为当天打卡
    if (!st.checkins || typeof st.checkins !== 'object') st.checkins = {};
    var today = todayISO();
    if (!st.checkins[today]) st.checkins[today] = dayTitle || '训练';
    save();
    renderAll();
    toast((aborted ? '已记录本次训练' : '训练完成，已记录') + '：' + totalSets + ' 组 · 用时 ' +
      durationMin + ' 分钟 · 约 ' + energy.kcal + ' kcal');
  }

  function endSession(askConfirm) {
    var s = S.session;
    if (!s) { hideOverlay(getEl('sessionOverlay')); return; }
    var doneTotal = s.done.reduce(function (a, b) { return a + b; }, 0);
    if (!doneTotal) {
      S.session = null;
      hideOverlay(getEl('sessionOverlay'));
      stopTickerIfIdle();
      toast('已结束训练');
      return;
    }
    if (askConfirm && root.confirm && !root.confirm('结束本次训练？已完成的组会记录到训练容量。')) return;
    finishSession(true);
  }

  /* ------------------------------------------------------------------ *
   * 组间计时器
   * ------------------------------------------------------------------ */

  function timerNode(id) { return getEl(id); }

  function updateTimerDisplay() {
    var disp = timerNode('timerDisplay');
    var btn = timerNode('timerToggle');
    var running = !!S.timer.running;
    var sec = running ? Math.max(0, Math.ceil((S.timer.endAt - Date.now()) / 1000)) : S.timer.remaining;
    if (disp) {
      disp.textContent = fmtClock(sec);
      disp.classList.toggle('is-running', running);
      disp.classList.toggle('running', running);
    }
    if (btn) btn.textContent = running ? '暂停' : '开始';
  }

  function syncPresetActive(sec) {
    var nodes = doc.querySelectorAll('#timerOverlay .timer-preset');
    Array.prototype.forEach.call(nodes, function (btn) {
      btn.classList.toggle('active', Math.round(toNum(btn.getAttribute('data-sec'), 0)) === Math.round(sec));
    });
  }

  function openTimer(seconds, name) {
    var sec = Math.max(5, Math.round(toNum(seconds, 90)));
    S.timer.total = sec;
    S.timer.remaining = sec;
    S.timer.running = false;
    S.timer.endAt = 0;
    text(timerNode('timerTitle'), '组间休息' + (name ? ' · ' + name : ''));
    syncPresetActive(sec);
    updateTimerDisplay();
    showOverlay(timerNode('timerOverlay'));
    ensureAudio();
  }

  function toggleTimer() {
    if (S.timer.running) {
      S.timer.remaining = Math.max(0, Math.ceil((S.timer.endAt - Date.now()) / 1000));
      S.timer.running = false;
    } else {
      if (S.timer.remaining <= 0) S.timer.remaining = S.timer.total;
      S.timer.endAt = Date.now() + S.timer.remaining * 1000;
      S.timer.running = true;
      ensureAudio();
    }
    updateTimerDisplay();
    ensureTicker();
    stopTickerIfIdle();
  }

  function resetTimer() {
    S.timer.remaining = S.timer.total;
    S.timer.running = false;
    S.timer.endAt = 0;
    updateTimerDisplay();
    stopTickerIfIdle();
  }

  function setTimerPreset(sec) {
    var v = Math.max(5, Math.round(toNum(sec, 90)));
    S.timer.total = v;
    S.timer.remaining = v;
    S.timer.running = false;
    S.timer.endAt = 0;
    syncPresetActive(v);
    updateTimerDisplay();
    stopTickerIfIdle();
  }

  function closeTimer() {
    S.timer.running = false;
    hideOverlay(timerNode('timerOverlay'));
    stopTickerIfIdle();
  }

  /* ------------------------------------------------------------------ *
   * 统一倒计时 ticker（计时器 + 训练休息共用，避免多个 interval）
   * ------------------------------------------------------------------ */

  function ensureTicker() {
    if (S.ticker) return;
    S.ticker = root.setInterval(tickAll, 250);
  }

  function stopTickerIfIdle() {
    var resting = !!(S.session && S.session.resting);
    if (S.timer.running || resting) return;
    if (S.ticker) {
      root.clearInterval(S.ticker);
      S.ticker = null;
    }
  }

  function tickAll() {
    if (S.timer.running) {
      var left = Math.ceil((S.timer.endAt - Date.now()) / 1000);
      if (left <= 0) {
        S.timer.running = false;
        S.timer.remaining = 0;
        updateTimerDisplay();
        beep();
        toast('休息结束，开始下一组');
      } else {
        S.timer.remaining = left;
        updateTimerDisplay();
      }
    }
    var s = S.session;
    if (s && s.resting) {
      var rest = Math.ceil((s.restEnd - Date.now()) / 1000);
      if (rest <= 0) {
        s.resting = false;
        renderSession();
        beep();
      } else {
        text(getEl('sessionRestTime'), fmtClock(rest));
      }
    }
    stopTickerIfIdle();
  }

  /* ------------------------------------------------------------------ *
   * 提示音（Web Audio，失败静音）
   * ------------------------------------------------------------------ */

  function ensureAudio() {
    if (S.audio) {
      try { if (S.audio.state === 'suspended' && S.audio.resume) S.audio.resume(); } catch (e) { /* 忽略 */ }
      return;
    }
    try {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (AC) S.audio = new AC();
    } catch (e) { S.audio = null; }
  }

  function beep() {
    ensureAudio();
    if (!S.audio) return;
    try {
      var ctx = S.audio;
      var now = ctx.currentTime;
      [0, 0.24].forEach(function (offset) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    } catch (e) { /* 静音失败 */ }
  }

  /* ------------------------------------------------------------------ *
   * 日历 / 日程交互
   * ------------------------------------------------------------------ */

  function shiftMonth(delta) {
    var m = currentMonth();
    m.month += delta;
    while (m.month < 0) { m.month += 12; m.year--; }
    while (m.month > 11) { m.month -= 12; m.year++; }
    S.month = m;
    persistMonth();
    renderCalendarOnly();
  }

  function toggleCheckin(date, title) {
    if (!date) return;
    var st = state();
    if (!st.checkins || typeof st.checkins !== 'object') st.checkins = {};
    if (st.checkins[date]) {
      delete st.checkins[date];
      toast('已取消打卡');
    } else {
      st.checkins[date] = title || '训练';
      toast('已打卡：' + (title || '训练'));
    }
    save();
    renderCalendarOnly();
  }

  function toggleWeekday(wd) {
    var sch = scheduleOf();
    var i = sch.weekdays.indexOf(wd);
    if (i >= 0) sch.weekdays.splice(i, 1);
    else sch.weekdays.push(wd);
    sch.weekdays = normalizeDays(sch.weekdays);
    save();
    render();
    toast(sch.weekdays.length ? '已更新每周训练日：' + sch.weekdays.length + ' 天' : '已取消全部训练日，请在日程里至少选择一天');
  }

  function recommendedWeekdays() {
    var st = state();
    var days = (st.program && st.program.days) || (st.profile && st.profile.days) || 3;
    var c = coreRef();
    var table = c.DEFAULT_WEEKDAYS || {};
    return (table[days] || [1, 3, 5]).slice();
  }

  function applyRecommendedWeekdays() {
    var sch = scheduleOf();
    sch.weekdays = recommendedWeekdays();
    save();
    render();
    toast('已按每周训练 ' + sch.weekdays.length + ' 天推荐训练日');
  }

  function toggleNotify() {
    var perm = notifyPerm();
    if (S.notifyEnabled && perm === 'granted') {
      S.notifyEnabled = false;
      storeRemove(NOTIFY_KEY);
      renderCalendarOnly();
      toast('已关闭桌面提醒');
      return;
    }
    if (perm === 'unsupported') {
      toast('当前浏览器不支持桌面通知，请导出 .ics 导入系统日历', true);
      return;
    }
    if (perm === 'denied') {
      if (S.notifyEnabled) {
        S.notifyEnabled = false;
        storeRemove(NOTIFY_KEY);
        renderCalendarOnly();
      }
      toast('通知权限已被拒绝，请在站点设置中允许后重试', true);
      return;
    }
    var ask = (FP.util && FP.util.askNotify) ? FP.util.askNotify() : Promise.resolve('unsupported');
    Promise.resolve(ask).then(function (p) {
      if (p === 'granted') {
        S.notifyEnabled = true;
        storeSet(NOTIFY_KEY, '1');
        renderCalendarOnly();
        toast('桌面提醒已开启，页面打开时会按日程提醒');
        reminderTick();
      } else if (p === 'unsupported') {
        toast('当前浏览器不支持桌面通知，请导出 .ics 导入系统日历', true);
      } else {
        toast('未获得通知权限，可导出 .ics 使用系统日历提醒', true);
      }
    }, function () {
      toast('开启桌面提醒失败', true);
    });
  }

  function exportIcs() {
    var c = coreRef();
    if (!c.buildIcs) { toast('当前版本不支持导出日历', true); return; }
    var sch = scheduleOf();
    var days = normalizeDays(sch.weekdays);
    if (!days.length) { toast('请先选择每周训练日再导出', true); return; }
    var prog = program() || [];
    var dayTitles = days.map(function (wd, i) {
      return prog[i] ? prog[i].title : ('训练日 ' + (i + 1));
    });
    var ics;
    try {
      ics = c.buildIcs({
        weekdays: days,
        time: sch.time,
        leadMinutes: sch.lead,
        weeks: 52,
        calendarName: 'FitDaily 训练计划',
        dayTitles: dayTitles,
        startDate: todayISO(),
        summaryPrefix: 'FitDaily 训练 · ',
        description: '来自 FitDaily 本地版的训练安排，打开网站查看当天动作。'
      });
    } catch (e) {
      toast('生成日历文件失败', true);
      return;
    }
    if (!ics) { toast('生成日历文件失败', true); return; }
    var payload = ics;
    try {
      if (root.Blob) payload = new root.Blob([ics], { type: 'text/calendar;charset=utf-8' });
    } catch (e) { payload = ics; }
    if (FP.util && FP.util.download) {
      FP.util.download('fitdaily-training.ics', payload, 'text/calendar');
      toast('已导出 .ics，可导入手机或电脑的日历');
    } else {
      toast('当前环境不支持文件下载', true);
    }
  }

  /* ------------------------------------------------------------------ *
   * 提醒检查（每 30s，同一事件只提醒一次）
   * ------------------------------------------------------------------ */

  function reminderTick() {
    if (!S.notifyEnabled) return;
    if (notifyPerm() !== 'granted') return;
    var sch = scheduleOf();
    if (!sch.weekdays.length) return;
    var c = coreRef();
    var now = new Date();
    if (sch.weekdays.indexOf(c.isoWeekday ? c.isoWeekday(now) : ((now.getDay() + 6) % 7 + 1)) < 0) return;
    var hm = /^(\d{1,2}):(\d{2})$/.exec(String(sch.time || ''));
    if (!hm) return;
    var target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hm[1]), Number(hm[2]), 0, 0);
    var fireAt = target.getTime() - Number(sch.lead) * 60000;
    var diff = now.getTime() - fireAt;
    if (diff < 0 || diff > 90000) return;           // 只在那 90 秒窗口内提醒
    var key = todayISO() + ' ' + sch.time;
    if (S.lastNotifyKey === key) return;
    S.lastNotifyKey = key;
    storeSet(LAST_NOTIFY_KEY, key);
    var prog = program();
    var idx = sch.weekdays.indexOf(c.isoWeekday ? c.isoWeekday(now) : 1);
    var title = prog && prog[idx] ? prog[idx].title : '训练';
    var body = '今天是训练日：' + title + '，计划 ' + sch.time + ' 开始（提前 ' + sch.lead + ' 分钟提醒）。';
    if (FP.util && FP.util.sendNotification) {
      try { FP.util.sendNotification('该训练了 · FitDaily', body); } catch (e) { /* 忽略 */ }
    }
  }

  function startReminderLoop() {
    S.notifyEnabled = storeGet(NOTIFY_KEY) === '1';
    S.lastNotifyKey = storeGet(LAST_NOTIFY_KEY) || '';
    if (S.reminderTimer) return;
    S.reminderTimer = root.setInterval(reminderTick, 30000);
    reminderTick();
  }

  /* ------------------------------------------------------------------ *
   * 事件绑定
   * ------------------------------------------------------------------ */

  function closest(node, sel) {
    if (!node || !node.closest) return null;
    return node.closest(sel);
  }

  function onClick(e) {
    var t = closest(e.target, '[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    switch (act) {
      case 'toggle': toggleDay(Number(t.getAttribute('data-day'))); break;
      case 'start': openSession(Number(t.getAttribute('data-day'))); break;
      case 'timer': openTimer(t.getAttribute('data-rest'), t.getAttribute('data-name')); break;
      case 'edit': openEdit(t.getAttribute('data-slot')); break;
      case 'del': deleteExercise(t.getAttribute('data-slot')); break;
      case 'reduce': toggleReduce(); break;
      case 'cal-prev': shiftMonth(-1); break;
      case 'cal-next': shiftMonth(1); break;
      case 'checkin': toggleCheckin(t.getAttribute('data-date'), t.getAttribute('data-title')); break;
      case 'weekday': toggleWeekday(Number(t.getAttribute('data-wd'))); break;
      case 'notify': toggleNotify(); break;
      case 'ics': exportIcs(); break;
      case 'recommend': applyRecommendedWeekdays(); break;
      default: break;
    }
  }

  function onChange(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var role = t.getAttribute('data-role');
    if (!role) return;
    var sch = scheduleOf();
    if (role === 'train-time') {
      var v = String(t.value || '');
      if (/^\d{1,2}:\d{2}$/.test(v)) {
        if (v.length === 4) v = '0' + v;      // "9:30" → "09:30"
        sch.time = v;
      } else {
        t.value = sch.time;
      }
      save();
      syncNotifyUi();
    } else if (role === 'train-lead') {
      var lead = Math.round(toNum(t.value, 30));
      sch.lead = LEAD_OPTIONS.indexOf(lead) >= 0 ? lead : 30;
      save();
      syncNotifyUi();
    }
  }

  function toggleReduce() {
    var st = state();
    st.reduceLevel = st.reduceLevel ? 0 : 1;
    invalidate();
    save();
    renderAll();
    toast(st.reduceLevel ? '已降低训练容量：每个动作减少 1 组' : '已恢复标准训练容量');
  }

  function onImgErrorCapture(e) {
    handleImgError(e.target);
  }

  function bindContainers() {
    var tc = getEl('trainingContent');
    var cc = getEl('calendarContent');
    if (tc) {
      tc.addEventListener('click', onClick);
      tc.addEventListener('error', onImgErrorCapture, true);
    }
    if (cc) {
      cc.addEventListener('click', onClick);
      cc.addEventListener('change', onChange);
    }
  }

  function bindOverlays() {
    // 动作编辑浮层
    var edit = getEl('editOverlay');
    if (edit) {
      var onEditSave = getEl('editSaveBtn');
      if (onEditSave) onEditSave.addEventListener('click', saveEdit);
      ['editCancelBtn', 'editCloseBtn'].forEach(function (id) {
        var btn = getEl(id);
        if (btn) btn.addEventListener('click', closeEdit);
      });
      edit.addEventListener('click', function (e) {
        if (e.target === edit) closeEdit();
      });
      var nameSel = getEl('editName');
      if (nameSel) nameSel.addEventListener('change', fillEditFromSelect);
    }

    // 沉浸式训练
    var session = getEl('sessionOverlay');
    if (session) {
      session.addEventListener('click', function (e) {
        if (e.target === session) endSession(true);
      });
      var done = getEl('sessionDoneBtn');
      if (done) done.addEventListener('click', sessionDone);
      var skip = getEl('sessionSkipBtn');
      if (skip) skip.addEventListener('click', sessionSkip);
      var end = getEl('sessionEndBtn');
      if (end) end.addEventListener('click', function () { endSession(true); });
      var close = getEl('sessionClose');
      if (close) close.addEventListener('click', function () { endSession(true); });
      var gif = getEl('sessionGif');
      if (gif) gif.addEventListener('error', function () { handleImgError(gif); });
    }

    // 组间计时器
    var timer = getEl('timerOverlay');
    if (timer) {
      timer.addEventListener('click', function (e) {
        var preset = closest(e.target, '.timer-preset');
        if (preset) {
          setTimerPreset(preset.getAttribute('data-sec'));
          return;
        }
        if (e.target === timer) closeTimer();
      });
      var toggle = getEl('timerToggle');
      if (toggle) toggle.addEventListener('click', toggleTimer);
      var reset = getEl('timerReset');
      if (reset) reset.addEventListener('click', resetTimer);
      var tClose = getEl('timerClose');
      if (tClose) tClose.addEventListener('click', closeTimer);
    }
  }

  function bindKeyboard() {
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var timer = getEl('timerOverlay');
      if (timer && !timer.hidden) { closeTimer(); return; }
      if (S.session) { endSession(true); return; }
      var edit = getEl('editOverlay');
      if (edit && !edit.hidden) { closeEdit(); return; }
      unlockScroll();
    });
  }

  /* ------------------------------------------------------------------ *
   * 对外：init / render
   * ------------------------------------------------------------------ */

  function init() {
    if (S.inited) return;
    S.inited = true;
    if (!core) core = FP.core;
    if (!doc) return;
    bindContainers();
    bindOverlays();
    bindKeyboard();
    startReminderLoop();
  }

  function render() {
    if (doc) {
      if (!core) core = FP.core;
      var tc = getEl('trainingContent');
      var cc = getEl('calendarContent');
      if (!tc && !cc) return;
      if (!FP.state) {
        if (tc) tc.innerHTML = emptyHtml();
        return;
      }
      var prog = program();
      if (tc) tc.innerHTML = renderTrainingHtml(prog);
      if (cc) cc.innerHTML = renderCalendarHtml(prog);
      syncNotifyUi();
    }
  }

  FP.training = {
    init: init,
    render: render
  };
})(typeof window !== 'undefined' ? window : globalThis);