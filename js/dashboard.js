/*!
 * dashboard.js — 首页仪表盘（玻璃拟态版）
 * 渲染 #dashboardRoot：问候 / KPI 环 / 今日训练 / 体重趋势 / 本周打卡 / 快捷入口
 * 依赖：core.js、app.js（FP.plan / FP.program / FP.state / FP.util）
 */
(function (root) {
  'use strict';

  var FP = (root.FP = root.FP || {});
  var doc = root.document;

  function $ (sel) { return doc.querySelector(sel); }
  function util() { return FP.util || {}; }
  function esc(s) { return util().esc ? util().esc(s) : String(s == null ? '' : s); }
  function num(n, d) { return util().num ? util().num(n, d) : String(n); }
  function core() { return FP.core; }
  function state() { return FP.state; }

  /* ------------------------------------------------------------------ *
   * 问候与日期
   * ------------------------------------------------------------------ */

  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  function todayText() {
    var c = core();
    var d = new Date();
    var wd = c.WEEKDAY_NAMES ? c.WEEKDAY_NAMES[c.isoWeekday(d) - 1] : '';
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日' + (wd ? ' · ' + wd : '');
  }

  function weeklyCheckins() {
    var c = core();
    var st = state();
    var checkins = st.checkins || {};
    var start = c.startOfWeek(new Date());
    var count = 0;
    for (var i = 0; i < 7; i++) {
      if (checkins[c.isoDate(c.addDays(start, i))]) count++;
    }
    return count;
  }

  function todayPlan() {
    var c = core();
    var st = state();
    var program = FP.program ? FP.program() : null;
    if (!program || !program.length) return null;
    var weekdays = (st.schedule && st.schedule.weekdays) || (c.DEFAULT_WEEKDAYS[st.profile.days] || []);
    var iso = c.isoWeekday(new Date());
    var idx = weekdays.indexOf(iso);
    if (idx === -1) return { rest: true, weekday: iso };
    var day = program[idx % program.length];
    return { rest: false, day: day, weekday: iso };
  }

  /* ------------------------------------------------------------------ *
   * 片段
   * ------------------------------------------------------------------ */

  function ringCard(label, value, unit, percent, hint) {
    var p = Math.max(0, Math.min(100, Math.round(percent)));
    return '' +
      '<div class="kpi glass-card kpi-ring">' +
        '<div class="ring" style="--p:' + p + '">' +
          '<span class="ring-center"><b>' + esc(value) + '</b><small>' + esc(unit) + '</small></span>' +
        '</div>' +
        '<div class="kpi-label">' + esc(label) + '</div>' +
        (hint ? '<div class="kpi-foot">' + esc(hint) + '</div>' : '') +
      '</div>';
  }

  function kcalCard(plan) {
    var delta = plan.delta;
    var foot = delta === 0
      ? '与维持热量持平'
      : '比维持' + (delta < 0 ? '低 ' : '高 ') + Math.abs(delta) + ' kcal · ' + plan.adjust + '% ' + (delta < 0 ? '缺口' : '盈余');
    return '' +
      '<div class="kpi glass-card kpi-kcal">' +
        '<div class="kpi-top"><span class="kpi-label">每日目标热量</span><span class="kpi-ico" aria-hidden="true">🔥</span></div>' +
        '<div class="kpi-value">' + num(plan.target) + '<span class="kpi-unit">kcal</span></div>' +
        '<div class="kpi-foot">' + esc(foot) + '</div>' +
      '</div>';
  }

  function heroCard(plan, streak) {
    var st = state();
    var goal = plan.goal;
    var meta = [
      goal.label,
      core().ACTIVITY[st.profile.activity] ? core().ACTIVITY[st.profile.activity].label : '',
      '每周 ' + st.profile.days + ' 练',
      core().EXPERIENCE[st.profile.experience] ? core().EXPERIENCE[st.profile.experience].label : ''
    ].filter(Boolean).join(' · ');

    return '' +
      '<section class="dash-hero glass-card">' +
        '<div class="dash-hello">' + esc(greeting()) + '，训练者' +
          (streak > 0 ? '<span class="dash-streak">🔥 连续 ' + streak + ' 天</span>' : '') +
        '</div>' +
        '<p class="dash-date">' + esc(todayText()) + ' · ' + esc(meta) + '</p>' +
        '<div class="dash-cta">' +
          '<button type="button" class="btn btn-primary" data-goto="training">今天练什么 →</button>' +
          '<button type="button" class="btn btn-soft" data-goto="diet">看饮食方案</button>' +
        '</div>' +
      '</section>';
  }

  function kpiGrid(plan) {
    return '<div class="kpi-grid">' +
      kcalCard(plan) +
      ringCard('蛋白质', num(plan.protein), 'g', plan.proteinPct, plan.proteinPerKg + ' g/kg') +
      ringCard('碳水', num(plan.carbs), 'g', plan.carbsPct, '约 ' + plan.carbsKcal + ' kcal') +
      ringCard('脂肪', num(plan.fat), 'g', plan.fatPct, '供能 ' + plan.fatEnergyPct + '%') +
      '</div>';
  }

  function todayCard(plan) {
    var t = todayPlan();
    if (!t) return '';
    if (t.rest) {
      return '' +
        '<div class="glass-card today-card">' +
          '<div class="section-head"><h3 class="section-title">今日安排</h3><span class="badge">休息日</span></div>' +
          '<p class="muted">今天是恢复日：可以散步、拉伸或完全休息。肌肉是在休息中变强的。</p>' +
          '<button type="button" class="btn btn-soft" data-goto="training">查看整周计划</button>' +
        '</div>';
    }
    var day = t.day;
    var items = (day.exercises || []).slice(0, 4).map(function (ex) {
      return '<li class="today-item"><span>' + esc(ex.name) + '</span><b>' + esc(ex.sets + ' × ' + ex.reps) + '</b></li>';
    }).join('');
    var more = (day.exercises || []).length > 4
      ? '<li class="today-item today-more">还有 ' + (day.exercises.length - 4) + ' 个动作…</li>'
      : '';
    return '' +
      '<div class="glass-card today-card">' +
        '<div class="section-head"><h3 class="section-title">今日训练</h3>' +
          '<span class="badge">Day ' + (day.index + 1) + ' · ' + esc(day.title) + '</span></div>' +
        '<p class="muted today-muscles">' + esc(day.muscles || '') + '</p>' +
        '<ul class="today-list">' + items + more + '</ul>' +
        '<button type="button" class="btn btn-primary" data-goto="training">进入训练</button>' +
      '</div>';
  }

  function sparkSvg(values) {
    if (!values.length) return '<div class="empty">还没有体重记录</div>';
    var w = 320, h = 110, pad = 10;
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    if (max - min < 0.8) { max = min + 0.8; }
    var stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
    var pts = values.map(function (v, i) {
      var x = pad + i * stepX;
      var y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    var area = 'M' + pad + ',' + (h - pad) + ' L' + pts.join(' L') + ' L' + (pad + (values.length - 1) * stepX) + ',' + (h - pad) + ' Z';
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="rgba(99,102,241,.35)"/><stop offset="100%" stop-color="rgba(99,102,241,0)"/>' +
      '</linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#sparkFill)"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="url(#sparkStroke)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<defs><linearGradient id="sparkStroke" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#06b6d4"/>' +
      '</linearGradient></defs>' +
      '</svg>';
  }

  function weightCard() {
    var st = state();
    var list = (st.weights || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(-10);
    var values = list.map(function (x) { return Number(x.kg); });
    var last = values.length ? values[values.length - 1] : null;
    var target = st.targetWeight;
    var badge;
    if (last !== null && target) {
      var gap = last - target;
      badge = gap > 0 ? '距目标 ' + num(gap, 1) + ' kg' : '已达成目标';
    } else {
      badge = '记录体重';
    }
    var foot = last !== null
      ? '最近 ' + num(last, 1) + ' kg' + (target ? ' · 目标 ' + num(target, 1) + ' kg' : '')
      : '记录第一次体重后显示趋势';
    return '' +
      '<div class="glass-card weight-card">' +
        '<div class="section-head"><h3 class="section-title">体重趋势</h3><span class="badge">' + esc(badge) + '</span></div>' +
        sparkSvg(values) +
        '<div class="kpi-foot">' + esc(foot) + '</div>' +
        '<button type="button" class="btn btn-soft" data-goto="weight">记录体重</button>' +
      '</div>';
  }


  /** 今日训练记录：列出练了什么动作 + 估算卡路里消耗 */
  function todayVolumeCard() {
    var c = core();
    var st = state();
    var today = c.todayISO();
    var weightKg = (st.profile && st.profile.weight) || 70;
    var sessions = (st.sessions || []).filter(function (s) { return s && s.date === today; });

    var totalSets = 0;
    var minutes = 0;
    var kcal = 0;
    var items = [];

    sessions.forEach(function (session) {
      totalSets += c.toNum(session.setsCount, c.toNum(session.volume, 0));
      minutes += c.toNum(session.durationMin, 0);

      var stored = c.toNum(session.kcal, NaN);
      if (!isFinite(stored)) {
        // 老记录没有 kcal 字段：按动作明细/时长现场估算
        stored = c.estimateCalories
          ? c.estimateCalories({ weightKg: weightKg, durationMin: session.durationMin, sets: session.sets || [] }).kcal
          : 0;
      }
      kcal += stored;

      (session.sets || []).forEach(function (it) {
        items.push({
          name: it.name || '动作',
          sets: c.toNum(it.sets, 0),
          reps: it.reps || ''
        });
      });
    });

    var done = items.length > 0 || totalSets > 0;
    var list = items.length
      ? '<ul class="vol-list">' + items.map(function (item) {
          return '<li class="vol-item">' +
            '<span class="vol-item-name">' + esc(item.name) + '</span>' +
            '<span class="vol-item-sets">' + esc(item.sets + ' 组' + (item.reps ? ' × ' + item.reps : '')) + '</span>' +
            '</li>';
        }).join('') + '</ul>'
      : '<p class="vol-empty">今天还没有完成训练。去「训练」页点「开始训练」，完成过的动作会列在这里。</p>';

    return '' +
      '<div class="glass-card volume-card">' +
        '<div class="section-head"><h3 class="section-title">今日训练记录</h3>' +
          '<span class="badge' + (done ? '' : ' badge-muted') + '">' + (done ? '已记录' : '还没开始') + '</span></div>' +
        (done
          ? '<div class="vol-head">' +
              '<div class="vol-kcal"><span class="vol-flame" aria-hidden="true">🔥</span>' +
                '<b>' + num(kcal) + '</b><small>kcal</small></div>' +
              '<div class="vol-meta">完成 ' + num(totalSets) + ' 组' +
                (minutes > 0 ? ' · 用时 ' + num(minutes) + ' 分钟' : '') + '</div>' +
            '</div>'
          : '') +
        list +
        '<p class="vol-note">热量为估算值（MET × 体重 × 时长），仅供参考</p>' +
      '</div>';
  }

  function weekCard() {
    var c = core();
    var st = state();
    var checkins = st.checkins || {};
    var weekdays = (st.schedule && st.schedule.weekdays) || [];
    var start = c.startOfWeek(new Date());
    var labels = ['一', '二', '三', '四', '五', '六', '日'];
    var cells = labels.map(function (label, i) {
      var date = c.isoDate(c.addDays(start, i));
      var iso = i + 1;
      var isTraining = weekdays.indexOf(iso) !== -1;
      var isDone = !!checkins[date];
      var cls = 'week-bar' + (isTraining ? ' is-on' : '') + (isDone ? ' is-done' : '');
      return '<span class="' + cls + '" title="' + esc(date + (isTraining ? ' 训练日' : ' 休息日') + (isDone ? ' · 已打卡' : '')) + '">' +
        (isDone ? '✓' : label) + '</span>';
    }).join('');
    return '' +
      '<div class="glass-card week-card">' +
        '<div class="section-head"><h3 class="section-title">本周打卡</h3>' +
          '<span class="badge">本周 ' + weeklyCheckins() + ' / ' + (weekdays.length || 0) + ' 次</span></div>' +
        '<div class="week-bars">' + cells + '</div>' +
        '<div class="kpi-foot">连续打卡 ' + num((c.streakDays ? c.streakDays(checkins) : 0)) + ' 天 · 完成训练会自动打卡</div>' +
      '</div>';
  }

  function quickGrid() {
    var items = [
      { view: 'training', ico: '🏋️', label: '训练计划' },
      { view: 'diet', ico: '🥗', label: '饮食方案' },
      { view: 'weight', ico: '⚖️', label: '体重记录' },
      { view: 'settings', ico: '⚙️', label: '设置与导出' }
    ];
    return '<div class="quick-grid">' + items.map(function (it) {
      return '<button type="button" class="quick-item glass-card" data-goto="' + it.view + '">' +
        '<span class="quick-ico" aria-hidden="true">' + it.ico + '</span><span>' + it.label + '</span></button>';
    }).join('') + '</div>';
  }

  function emptyState() {
    return '' +
      '<section class="dash-empty glass-card">' +
        '<span class="dash-empty-ico" aria-hidden="true">✨</span>' +
        '<h2>生成你的专属计划</h2>' +
        '<p>填好身体数据与目标，10 秒内得到：每日热量与三大营养素、按周训练表、一日三餐搭配、体重与打卡追踪。</p>' +
        '<div class="dash-cta">' +
          '<button type="button" class="btn btn-primary btn-lg" data-action="generate">立即生成</button>' +
          '<button type="button" class="btn btn-soft" data-action="open-config">先调整参数</button>' +
        '</div>' +
        '<ul class="dash-empty-list">' +
          '<li>🥗 热量、蛋白质、碳水、脂肪一次算清</li>' +
          '<li>🏋️ 2–6 天分化训练，含动作演示与计时器</li>' +
          '<li>📅 训练打卡、桌面提醒、日历导出</li>' +
          '<li>🔒 全部数据只存在本机浏览器</li>' +
        '</ul>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ *
   * 侧栏 / 顶栏附属信息
   * ------------------------------------------------------------------ */

  function renderSide(plan) {
    var title = $('#sideProfileTitle');
    var sub = $('#sideProfileSub');
    var st = state();
    if (!title || !sub) return;
    if (!plan) {
      title.textContent = '尚未生成计划';
      sub.textContent = '填写身体数据开始';
      return;
    }
    var target = st.targetWeight;
    title.textContent = plan.goal.label + ' · 每周 ' + st.profile.days + ' 练';
    sub.textContent = num(st.profile.weight, 1) + ' kg' + (target ? ' · 目标 ' + num(target, 1) + ' kg' : ' · 未设目标');
  }

  function renderTopMeta() {
    var el = $('#topbarMeta');
    if (!el) return;
    var checkins = state().checkins || {};
    var streak = core().streakDays ? core().streakDays(checkins) : 0;
    if (streak > 0) {
      el.textContent = '🔥 连续 ' + streak + ' 天';
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  /* ------------------------------------------------------------------ *
   * 渲染
   * ------------------------------------------------------------------ */

  function render() {
    var box = $('#dashboardRoot');
    if (!box) return;
    var plan = FP.plan ? FP.plan() : null;

    if (!plan) {
      box.innerHTML = emptyState();
      renderSide(null);
      renderTopMeta();
      return;
    }

    var checkins = state().checkins || {};
    var streak = core().streakDays ? core().streakDays(checkins) : 0;

    box.innerHTML = heroCard(plan, streak) + kpiGrid(plan) +
      '<div class="grid-2 dash-grid">' + todayCard(plan) + weightCard() + '</div>' +
      todayVolumeCard() + weekCard() + quickGrid();

    renderSide(plan);
    renderTopMeta();
  }

  /* ------------------------------------------------------------------ *
   * 交互
   * ------------------------------------------------------------------ */

  function init() {
    var box = $('#dashboardRoot');
    if (!box) return;
    box.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      if (action === 'generate') {
        if (typeof FP.generate === 'function') FP.generate();
        else {
          var g = doc.getElementById('generateBtn');
          if (g) g.click();
        }
      } else if (action === 'open-config') {
        var cfg = doc.getElementById('cfgCard');
        if (cfg) {
          cfg.open = true;
          if (cfg.scrollIntoView) cfg.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var first = cfg.querySelector('input, select');
          if (first && first.focus) first.focus();
        }
      }
    });
  }

  FP.dashboard = { init: init, render: render };
})(typeof window !== 'undefined' ? window : globalThis);