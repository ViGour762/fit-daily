/*!
 * weight.js — 体重 / 体脂追踪、目标体重、体重曲线、训练容量趋势
 * 依赖：core.js（FP.core）、app.js（FP.util / FP.state / FP.save / FP.plan）
 * 加载时只注册模块对象 FP.weight，所有 DOM 操作都发生在 init() / render()。
 */
(function (root) {
  'use strict';

  var FP = (root.FP = root.FP || {});
  var core = FP.core;
  var doc = root.document;

  var WEIGHT_SIZE = { w: 700, h: 280 };
  var VOLUME_SIZE = { w: 700, h: 220 };
  var MAX_X_TICKS = 6;
  var RECENT_SESSIONS = 12;
  var FONT_STACK = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

  /* ------------------------------------------------------------------ *
   * 基础工具
   * ------------------------------------------------------------------ */

  function $(sel, scope) { return (scope || doc).querySelector(sel); }

  function esc(value) { return core.escapeHtml(value); }

  function num(value, digits) {
    var n = core.toNum(value, NaN);
    if (!isFinite(n)) return '—';
    if (digits === undefined) return String(Math.round(n));
    var f = Math.pow(10, digits);
    return String(Math.round(n * f) / f);
  }

  function state() { return FP.state; }

  function weightUnit() {
    return FP.util && FP.util.weightUnit ? FP.util.weightUnit() : 'kg';
  }

  function unitText() { return weightUnit() === 'jin' ? '斤' : 'kg'; }

  function displayWeight(kg) { return core.displayWeight(kg, weightUnit()); }

  function fmtWeight(kg) {
    var d = displayWeight(kg);
    return num(d.value, 1) + ' ' + d.unit;
  }

  function fmtSigned(kg) {
    var d = displayWeight(Math.abs(core.toNum(kg, 0)));
    var sign = kg > 0.049 ? '+' : kg < -0.049 ? '-' : '';
    return sign + num(d.value, 1) + ' ' + d.unit;
  }

  function fmtShortDate(iso) {
    var d = core.parseISO(iso);
    if (!d) return String(iso || '');
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function weekdayText(iso) {
    var d = core.parseISO(iso);
    if (!d) return '';
    return core.WEEKDAY_NAMES[core.isoWeekday(d) - 1] || '';
  }

  function daysAgo(iso) {
    var d = core.parseISO(iso);
    var now = core.parseISO(core.todayISO());
    if (!d || !now) return 0;
    return Math.max(0, Math.round((now.getTime() - d.getTime()) / 86400000));
  }

  /* ------------------------------------------------------------------ *
   * 数据读取（只读，不修改 state）
   * ------------------------------------------------------------------ */

  function sortedWeights() {
    var raw = (state() && state().weights) || [];
    var list = raw.filter(function (w) {
      return w && core.parseISO(w.date) && isFinite(core.toNum(w.kg, NaN));
    });
    list.sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    return list;
  }

  function sortedSessions() {
    var raw = (state() && state().sessions) || [];
    var list = raw.filter(function (s) { return s && core.parseISO(s.date); });
    list.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      var x = String(a.at || '');
      var y = String(b.at || '');
      return x < y ? -1 : x > y ? 1 : 0;
    });
    return list;
  }

  function sessionSetCount(session) {
    var sets = Array.isArray(session.sets) ? session.sets : [];
    var total = 0;
    sets.forEach(function (item) { total += core.toNum(item && item.sets, 0); });
    return total;
  }

  /** 单次训练的训练量：与上游一致，按「完成组数」统计 */
  /** 单次训练消耗（老记录没有 kcal 时按动作明细估算） */
  function sessionKcal(session) {
    var stored = core.toNum(session.kcal, NaN);
    if (isFinite(stored) && stored > 0) return stored;
    var weightKg = (state() && state().profile && state().profile.weight) || 70;
    if (!core.estimateCalories) return 0;
    return core.estimateCalories({
      weightKg: weightKg,
      durationMin: session.durationMin,
      sets: session.sets || []
    }).kcal;
  }

  function sessionVolume(session) {
    var setsCount = core.toNum(session.setsCount, NaN);
    if (isFinite(setsCount) && setsCount > 0) return setsCount;
    var v = core.toNum(session.volume, NaN);
    if (isFinite(v) && v >= 0) return v;
    return core.sessionVolume(session.sets);
  }

  /* ------------------------------------------------------------------ *
   * Canvas：DPR 缩放 + 自适应宽度
   * ------------------------------------------------------------------ */

  /** 读取 CSS 变量，取不到时回落到固定色 */
  function cssVar(names, fallback) {
    var computed = null;
    try {
      computed = root.getComputedStyle ? root.getComputedStyle(doc.documentElement) : null;
    } catch (e) { computed = null; }
    if (computed) {
      for (var i = 0; i < names.length; i++) {
        var value = computed.getPropertyValue(names[i]);
        if (value && String(value).trim()) return String(value).trim();
      }
    }
    return fallback;
  }

  function palette() {
    return {
      green: cssVar(['--green', '--primary', '--brand', '--accent-color'], '#0e9f6e'),
      orange: cssVar(['--orange', '--warn', '--target', '--accent-warm'], '#f59e0b'),
      text: cssVar(['--text', '--fg', '--text-1'], '#1f2937'),
      muted: cssVar(['--muted', '--text-muted', '--text-2'], '#6b7280'),
      border: cssVar(['--border', '--line', '--divider'], '#e5e7eb'),
      card: cssVar(['--card', '--surface', '--bg'], '#ffffff')
    };
  }

  /**
   * 按 devicePixelRatio 重建 backing store，并把绘图坐标缩放到逻辑像素。
   * 画布显示尺寸由 CSS（.chart-wrap canvas { width:100%; height:auto }）控制；
   * 元素隐藏（clientWidth 为 0）时退回逻辑宽度，等真正展示时 render() 会重绘。
   */
  function prepareCanvas(canvas, size) {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    var dpr = Math.min(root.devicePixelRatio || 1, 3);
    var cssW = Math.round(canvas.clientWidth || 0);
    if (!cssW || cssW < 80) cssW = size.w;
    var cssH = size.h;
    var backingW = Math.max(1, Math.round(cssW * dpr));
    var backingH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== backingW) canvas.width = backingW;
    if (canvas.height !== backingH) canvas.height = backingH;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    else if (ctx.scale) ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);
    return { ctx: ctx, w: cssW, h: cssH, dpr: dpr };
  }

  function drawEmptyState(ctx, w, h, pal, title, hint) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pal.text;
    ctx.font = '600 14px ' + FONT_STACK;
    ctx.fillText(title, w / 2, h / 2 - 11);
    ctx.fillStyle = pal.muted;
    ctx.font = '12px ' + FONT_STACK;
    ctx.fillText(hint, w / 2, h / 2 + 12);
    ctx.restore();
  }

  function drawLegendItem(ctx, x, y, style, color, text, textColor) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (ctx.setLineDash) ctx.setLineDash(style === 'dash' ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 14, y);
    ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
    ctx.fillStyle = textColor;
    ctx.font = '11px ' + FONT_STACK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 18, y + 0.5);
    var width = ctx.measureText ? ctx.measureText(text).width : text.length * 11;
    ctx.restore();
    return x + 18 + width;
  }

  function niceStep(raw) {
    var value = Math.abs(core.toNum(raw, 1));
    if (!isFinite(value) || value <= 0) value = 1;
    var pow = Math.pow(10, Math.floor(Math.log(value) / Math.LN10));
    var n = value / pow;
    var mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return mult * pow;
  }

  function axisDecimals(step) {
    if (step >= 1) return 0;
    if (step >= 0.1) return 1;
    return 2;
  }

  function pickIndices(n, maxCount) {
    var out = [];
    if (n <= 0) return out;
    if (n <= maxCount) {
      for (var i = 0; i < n; i++) out.push(i);
      return out;
    }
    for (var k = 0; k < maxCount; k++) {
      var idx = Math.round((k * (n - 1)) / (maxCount - 1));
      if (out.indexOf(idx) === -1) out.push(idx);
    }
    return out;
  }

  function drawYGrid(ctx, pal, pad, plotW, yMin, yMax, step, toY, digits) {
    ctx.save();
    ctx.font = '11px ' + FONT_STACK;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    for (var v = yMin; v <= yMax + step * 0.001; v += step) {
      var y = toY(v);
      ctx.strokeStyle = pal.border;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + plotW, y);
      ctx.stroke();
      ctx.fillStyle = pal.muted;
      ctx.fillText(num(v, digits), pad.l - 8, y);
    }
    ctx.restore();
  }

  function drawXLabels(ctx, pal, pad, plotW, n, toX, labels, h) {
    var indices = pickIndices(n, MAX_X_TICKS);
    if (!indices.length) return;
    ctx.save();
    ctx.font = '11px ' + FONT_STACK;
    ctx.fillStyle = pal.muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    indices.forEach(function (i) {
      var x = toX(i);
      if (x < pad.l) x = pad.l;
      if (x > pad.l + plotW) x = pad.l + plotW;
      ctx.fillText(labels[i], x, h - 20);
    });
    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   * 体重曲线
   * ------------------------------------------------------------------ */

  function drawWeightChart() {
    var canvas = $('#weightChart');
    if (!canvas) return;
    var stage = prepareCanvas(canvas, WEIGHT_SIZE);
    if (!stage) return;

    var ctx = stage.ctx;
    var w = stage.w;
    var h = stage.h;
    var pal = palette();
    var list = sortedWeights();
    var targetKg = core.toNum(state() && state().targetWeight, NaN);
    var hasTarget = isFinite(targetKg) && targetKg > 0;

    if (!list.length) {
      drawEmptyState(ctx, w, h, pal, '还没有体重记录', '记录体重后，这里会显示变化曲线与目标线');
      return;
    }

    var values = list.map(function (item) { return displayWeight(item.kg).value; });
    var targetValue = hasTarget ? displayWeight(targetKg).value : null;

    var pad = { l: 46, r: 16, t: 30, b: 30 };
    var plotW = Math.max(10, w - pad.l - pad.r);
    var plotH = Math.max(10, h - pad.t - pad.b);

    var lo = values[0];
    var hi = values[0];
    values.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    if (targetValue !== null) {
      if (targetValue < lo) lo = targetValue;
      if (targetValue > hi) hi = targetValue;
    }

    var step = niceStep(Math.max((hi - lo) / 4, 0.25));
    var yMin = Math.floor((lo - step * 0.6) / step) * step;
    var yMax = Math.ceil((hi + step * 0.6) / step) * step;
    if (yMax - yMin < step * 2) yMax = yMin + step * 2;
    var digits = axisDecimals(step);

    function toY(v) { return pad.t + ((yMax - v) / (yMax - yMin)) * plotH; }
    var n = values.length;
    function toX(i) { return n === 1 ? pad.l + plotW / 2 : pad.l + (i / (n - 1)) * plotW; }

    drawYGrid(ctx, pal, pad, plotW, yMin, yMax, step, toY, digits);

    // 图例（窄屏用短文案，避免溢出）
    var narrow = w < 380;
    var unit = unitText();
    var legendX = drawLegendItem(ctx, pad.l, 15, 'solid', pal.green, narrow ? '体重' : '体重（' + unit + '）', pal.muted);
    if (hasTarget) {
      drawLegendItem(ctx, legendX + 16, 15, 'dash', pal.orange,
        narrow ? '目标' : '目标 ' + num(targetValue, 1) + ' ' + unit, pal.muted);
    }

    var bottom = pad.t + plotH;

    // 面积填充
    if (n >= 2) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = pal.green;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(values[0]));
      for (var i = 1; i < n; i++) ctx.lineTo(toX(i), toY(values[i]));
      ctx.lineTo(toX(n - 1), bottom);
      ctx.lineTo(toX(0), bottom);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 目标虚线
    if (targetValue !== null) {
      var ty = toY(targetValue);
      ctx.save();
      ctx.strokeStyle = pal.orange;
      ctx.lineWidth = 1.5;
      if (ctx.setLineDash) ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(pad.l, ty);
      ctx.lineTo(pad.l + plotW, ty);
      ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([]);
      ctx.restore();
    }

    // 折线
    ctx.save();
    ctx.strokeStyle = pal.green;
    ctx.lineWidth = 2;
    if (ctx.lineJoin) ctx.lineJoin = 'round';
    if (ctx.lineCap) ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    for (var j = 1; j < n; j++) ctx.lineTo(toX(j), toY(values[j]));
    ctx.stroke();
    ctx.restore();

    // 数据点（记录过多时省略，避免糊成一片）
    if (n <= 40) {
      for (var k = 0; k < n; k++) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(toX(k), toY(values[k]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = pal.green;
        ctx.fill();
        ctx.strokeStyle = pal.card;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    drawXLabels(ctx, pal, pad, plotW, n, toX, list.map(function (item) {
      return fmtShortDate(item.date);
    }), h);
  }

  /* ------------------------------------------------------------------ *
   * 训练容量柱状图
   * ------------------------------------------------------------------ */

  function drawVolumeChart() {
    var canvas = $('#volumeChart');
    if (!canvas) return;
    var stage = prepareCanvas(canvas, VOLUME_SIZE);
    if (!stage) return;

    var ctx = stage.ctx;
    var w = stage.w;
    var h = stage.h;
    var pal = palette();
    var sessions = sortedSessions();

    if (!sessions.length) {
      drawEmptyState(ctx, w, h, pal, '还没有训练记录', '先完成一次训练，这里会显示容量趋势');
      return;
    }

    var list = sessions.slice(-RECENT_SESSIONS);
    var values = list.map(sessionVolume);
    var n = values.length;

    var pad = { l: 44, r: 14, t: 30, b: 30 };
    var plotW = Math.max(10, w - pad.l - pad.r);
    var plotH = Math.max(10, h - pad.t - pad.b);

    var maxValue = 0;
    values.forEach(function (v) { if (v > maxValue) maxValue = v; });
    var step = niceStep(Math.max(maxValue / 3, 1));
    var yMax = maxValue > 0 ? Math.ceil((maxValue * 1.05) / step) * step : step * 3;
    var digits = axisDecimals(step);

    function toY(v) { return pad.t + plotH - (v / yMax) * plotH; }
    var barGap = plotW / n;
    function centerX(i) { return pad.l + barGap * (i + 0.5); }

    drawYGrid(ctx, pal, pad, plotW, 0, yMax, step, toY, digits);

    var caption = '每次训练完成组数（组）';
    ctx.save();
    ctx.fillStyle = pal.muted;
    ctx.font = '11px ' + FONT_STACK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(w < 360 ? '完成组数（组）' : caption, pad.l, 15);
    ctx.restore();

    var barWidth = Math.max(4, Math.min(42, barGap * 0.58));
    var baseline = pad.t + plotH;
    for (var i = 0; i < n; i++) {
      var value = values[i];
      var barH = yMax > 0 ? (value / yMax) * plotH : 0;
      var x = centerX(i) - barWidth / 2;
      var y = baseline - barH;
      ctx.save();
      ctx.globalAlpha = i === n - 1 ? 0.95 : 0.62;
      ctx.fillStyle = pal.green;
      ctx.fillRect(x, y, barWidth, Math.max(barH, value > 0 ? 1 : 0));
      ctx.restore();

      // 柱子较宽且有空间时，在柱顶标数值
      if (barGap >= 32 && value > 0) {
        ctx.save();
        ctx.fillStyle = pal.muted;
        ctx.font = '10px ' + FONT_STACK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(num(value, 0), centerX(i), y - 3);
        ctx.restore();
      }
    }

    drawXLabels(ctx, pal, pad, plotW, n, centerX, list.map(function (item) {
      return fmtShortDate(item.date);
    }), h);
  }

  /* ------------------------------------------------------------------ *
   * 列表与提示
   * ------------------------------------------------------------------ */

  function renderList() {
    var box = $('#weightList');
    if (!box) return;
    var list = sortedWeights();
    if (!list.length) {
      box.innerHTML = '<p class="empty">还没有体重记录，填写上面的日期与体重即可添加第一笔。</p>';
      return;
    }

    var rows = [];
    for (var i = list.length - 1; i >= 0; i--) {
      var item = list[i];
      var prev = i > 0 ? list[i - 1] : null;
      var bodyFat = item.bodyFat == null || item.bodyFat === '' ? '—' : num(item.bodyFat, 1) + '%';
      rows.push(
        '<tr>' +
          '<td>' + esc(item.date) + '（' + esc(weekdayText(item.date)) + '）</td>' +
          '<td>' + esc(fmtWeight(item.kg)) + '</td>' +
          '<td>' + esc(bodyFat) + '</td>' +
          '<td>' + esc(prev ? fmtSigned(item.kg - prev.kg) : '—') + '</td>' +
          '<td><button type="button" class="btn btn-ghost" data-weight-del="' + esc(item.date) + '">删除</button></td>' +
        '</tr>'
      );
    }

    box.innerHTML =
      '<div class="table-wrap">' +
        '<table aria-label="体重记录">' +
          '<thead><tr><th>日期</th><th>体重</th><th>体脂</th><th>较上次</th><th>操作</th></tr></thead>' +
          '<tbody>' + rows.join('') + '</tbody>' +
        '</table>' +
      '</div>';
  }

  function renderSessionList() {
    var box = $('#sessionList');
    if (!box) return;
    var list = sortedSessions();
    if (!list.length) {
      box.innerHTML = '<p class="empty">先完成一次训练，记录会显示在这里。</p>';
      return;
    }

    var recent = list.slice(-RECENT_SESSIONS).reverse();
    var rows = recent.map(function (item) {
      return '<tr>' +
        '<td>' + esc(item.date) + '</td>' +
        '<td>' + esc(item.dayTitle || '训练') + '</td>' +
        '<td>' + esc(num(sessionVolume(item))) + ' 组</td>' +
        '<td>' + (core.toNum(item.durationMin, 0) > 0 ? esc(num(item.durationMin) + ' 分钟') : '—') + '</td>' +
        '<td>' + (sessionKcal(item) > 0 ? esc(num(sessionKcal(item)) + ' kcal') : '—') + '</td>' +
      '</tr>';
    });

    var more = list.length > RECENT_SESSIONS
      ? '<p class="stat-hint">共 ' + list.length + ' 次训练，这里显示最近 ' + RECENT_SESSIONS + ' 次。</p>'
      : '';

    box.innerHTML =
      '<div class="table-wrap">' +
        '<table aria-label="最近训练记录">' +
          '<thead><tr><th>日期</th><th>训练日</th><th>完成组数</th><th>用时</th><th>消耗</th></tr></thead>' +
          '<tbody>' + rows.join('') + '</tbody>' +
        '</table>' +
      '</div>' + more;
  }

  function estimateWeeks(gap, plan) {
    if (!plan) return 0;
    var weekly = core.toNum(plan.weeklyKg, 0);
    if (!(weekly > 0)) return 0;
    var goalKey = plan.profile && plan.profile.goal;
    if (gap > 0 && goalKey !== 'cut') return 0;
    if (gap < 0 && goalKey !== 'bulk') return 0;
    var weeks = Math.ceil(Math.abs(gap) / weekly);
    if (!isFinite(weeks) || weeks <= 0) return 0;
    return weeks > 260 ? 260 : weeks;
  }

  function renderTip() {
    var el = $('#weightTip');
    if (!el) return;
    var list = sortedWeights();
    var plan = FP.plan ? FP.plan() : null;

    if (!list.length) {
      el.textContent = '还没有体重记录：先记录一次当前体重（体脂可选），这里会显示每日热量缺口、距目标的差距与预计达成时间。';
      return;
    }

    var parts = [];
    var last = list[list.length - 1];

    if (plan) {
      var delta = core.toNum(plan.delta, 0);
      if (Math.abs(delta) < 1) {
        parts.push('当前热量与维持热量持平（TDEE 约 ' + num(plan.tdee) + ' kcal）。');
      } else if (delta < 0) {
        parts.push('当前每日热量缺口约 ' + num(Math.abs(delta)) + ' kcal，理论每周减重 ' +
          num(plan.weeklyKg, 1) + ' kg（' + num(plan.weeklyJin, 1) + ' 斤）。');
      } else {
        parts.push('当前每日热量盈余约 ' + num(delta) + ' kcal，理论每周增重 ' +
          num(plan.weeklyKg, 1) + ' kg（' + num(plan.weeklyJin, 1) + ' 斤）。');
      }
    } else {
      parts.push('还没有生成计划：到首页填写信息并生成方案后，这里会显示热量缺口与达成估算。');
    }

    var targetKg = core.toNum(state() && state().targetWeight, NaN);
    if (isFinite(targetKg) && targetKg > 0) {
      var gap = last.kg - targetKg;
      var gapDisplay = displayWeight(Math.abs(gap));
      if (Math.abs(gap) < 0.05) {
        parts.push('已达到目标体重 ' + fmtWeight(targetKg) + '，继续保持。');
      } else {
        parts.push('最近体重 ' + fmtWeight(last.kg) + '，距离目标 ' + fmtWeight(targetKg) +
          ' 还差 ' + num(gapDisplay.value, 1) + ' ' + gapDisplay.unit + '。');
        var weeks = estimateWeeks(gap, plan);
        if (weeks > 0) {
          parts.push('按当前速度大约需要 ' + weeks + ' 周达成。');
        } else if (plan) {
          parts.push('按当前热量设置体重趋于保持，可回首页调整目标或热量缺口。');
        }
      }
    }

    var age = daysAgo(last.date);
    if (age >= 7) {
      parts.push('最近一次记录在 ' + age + ' 天前，建议每周固定时间（如晨起空腹）称重。');
    }

    el.textContent = parts.join(' ');
  }

  /* ------------------------------------------------------------------ *
   * 事件处理
   * ------------------------------------------------------------------ */

  function onWeightSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();
    var dateEl = $('#weightDate');
    var kgEl = $('#weightKg');
    var fatEl = $('#bodyFat');

    var date = dateEl ? String(dateEl.value || '').trim() : '';
    if (!core.parseISO(date)) {
      FP.toast('请选择有效的记录日期', true);
      return;
    }

    var kg = core.toNum(kgEl && kgEl.value, NaN);
    if (!isFinite(kg) || kg < 20 || kg > 250) {
      FP.toast('体重需在 20–250 kg 之间', true);
      return;
    }

    var bodyFat = null;
    var fatRaw = fatEl ? String(fatEl.value || '').trim() : '';
    if (fatRaw !== '') {
      bodyFat = core.toNum(fatRaw, NaN);
      if (!isFinite(bodyFat) || bodyFat < 3 || bodyFat > 60) {
        FP.toast('体脂率需在 3%–60% 之间', true);
        return;
      }
      bodyFat = core.round(bodyFat, 1);
    }

    kg = core.round(kg, 1);
    var weights = state().weights || (state().weights = []);
    var replaced = false;
    for (var i = 0; i < weights.length; i++) {
      if (weights[i] && weights[i].date === date) {
        weights[i].kg = kg;
        weights[i].bodyFat = bodyFat;
        replaced = true;
        break;
      }
    }
    if (!replaced) weights.push({ date: date, kg: kg, bodyFat: bodyFat });
    weights.sort(function (a, b) {
      var da = String((a && a.date) || '');
      var db = String((b && b.date) || '');
      return da < db ? -1 : da > db ? 1 : 0;
    });

    FP.save();
    if (kgEl) kgEl.value = '';
    if (fatEl) fatEl.value = '';
    render();
    FP.toast((replaced ? '已更新 ' : '已记录 ') + date + '：' + FP.util.unitWeight(kg));
  }

  function onSaveTarget() {
    var el = $('#targetWeight');
    var raw = el ? String(el.value || '').trim() : '';

    if (raw === '') {
      state().targetWeight = null;
      FP.save();
      render();
      FP.toast('已清除目标体重');
      return;
    }

    var value = core.toNum(raw, NaN);
    if (!isFinite(value) || value < 30 || value > 250) {
      FP.toast('目标体重需在 30–250 kg 之间', true);
      return;
    }

    state().targetWeight = core.round(value, 1);
    FP.save();
    render();
    FP.toast('目标体重已保存为 ' + FP.util.unitWeight(state().targetWeight));
  }

  function onListClick(event) {
    var target = event && event.target;
    var btn = target && target.closest ? target.closest('[data-weight-del]') : null;
    if (!btn) return;
    var date = btn.getAttribute('data-weight-del');
    var weights = state().weights || [];
    var removed = null;
    for (var i = 0; i < weights.length; i++) {
      if (weights[i] && weights[i].date === date) {
        removed = weights.splice(i, 1)[0];
        break;
      }
    }
    if (!removed) return;
    FP.save();
    render();
    FP.toast('已删除 ' + date + ' 的体重记录');
  }

  function redrawCharts() {
    drawWeightChart();
    drawVolumeChart();
  }

  /* ------------------------------------------------------------------ *
   * 模块接口
   * ------------------------------------------------------------------ */

  function init() {
    var form = $('#weightForm');
    if (form) form.addEventListener('submit', onWeightSubmit);

    var targetBtn = $('#saveTargetBtn');
    if (targetBtn) targetBtn.addEventListener('click', onSaveTarget);

    var targetInput = $('#targetWeight');
    if (targetInput) {
      targetInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          if (event.preventDefault) event.preventDefault();
          onSaveTarget();
        }
      });
    }

    var list = $('#weightList');
    if (list) list.addEventListener('click', onListClick);

    var dateEl = $('#weightDate');
    if (dateEl && !dateEl.value) dateEl.value = core.todayISO();

    // 窗口尺寸变化：防抖后重绘两张图（宽度自适应）
    if (root.addEventListener) {
      var onResize = FP.util && FP.util.debounce ? FP.util.debounce(redrawCharts, 180) : redrawCharts;
      root.addEventListener('resize', onResize, { passive: true });
      root.addEventListener('orientationchange', onResize);
    }

    // 主题切换后重绘，保证 canvas 颜色跟随 CSS 变量
    if (root.MutationObserver && doc.documentElement) {
      try {
        new root.MutationObserver(redrawCharts).observe(doc.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme']
        });
      } catch (e) { /* 不支持时忽略，下次 render 会重绘 */ }
    }
  }

  function render() {
    var current = state();
    if (!current) return;

    var dateEl = $('#weightDate');
    if (dateEl && !dateEl.value) dateEl.value = core.todayISO();

    var targetInput = $('#targetWeight');
    if (targetInput && doc.activeElement !== targetInput) {
      targetInput.value = current.targetWeight == null ? '' : core.round(current.targetWeight, 1);
    }

    renderList();
    renderTip();
    drawWeightChart();
    drawVolumeChart();
    renderSessionList();
  }

  FP.weight = {
    init: init,
    render: render
  };
})(typeof window !== 'undefined' ? window : globalThis);