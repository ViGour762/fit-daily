/*!
 * settings.js — 设置页：主题 / 字号 / 单位 / 饮水提醒 / 导出 / 备份 / 清空 / 参考文献
 * 依赖：core.js（FP.core）、app.js（FP.util / FP.state / FP.save / FP.renderAll 等）
 * 加载时只注册模块对象 FP.settings，所有 DOM 操作都发生在 init() / render()。
 */
(function (root) {
  'use strict';

  var FP = (root.FP = root.FP || {});
  var core = FP.core;
  var doc = root.document;

  var waterTimer = null;

  var STATE_KEYS = [
    'version', 'profile', 'adjust', 'generatedAt', 'program', 'overrides',
    'reduceLevel', 'schedule', 'checkins', 'weights', 'targetWeight', 'sessions',
    'customFoods', 'settings', 'proteinSource', 'ui'
  ];

  /* ------------------------------------------------------------------ *
   * 基础工具
   * ------------------------------------------------------------------ */

  function $(sel, scope) { return (scope || doc).querySelector(sel); }

  function $$(sel, scope) {
    return Array.prototype.slice.call((scope || doc).querySelectorAll(sel));
  }

  function esc(value) { return core.escapeHtml(value); }

  function num(value, digits) {
    var n = core.toNum(value, NaN);
    if (!isFinite(n)) return '—';
    if (digits === undefined) return String(Math.round(n));
    var f = Math.pow(10, digits);
    return String(Math.round(n * f) / f);
  }

  function on(node, type, handler) {
    if (node) node.addEventListener(type, handler);
  }

  function setText(sel, text) {
    var node = $(sel);
    if (node) node.textContent = text;
  }

  function state() { return FP.state; }

  function today() { return core.todayISO(); }

  function cellNum(value) {
    var n = core.toNum(value, NaN);
    return isFinite(n) ? core.round(n, 1) : '';
  }

  function fmtInterval(minutes) {
    var m = Math.round(core.toNum(minutes, 60));
    if (m >= 60 && m % 60 === 0) return m / 60 + ' 小时';
    return m + ' 分钟';
  }

  /* ------------------------------------------------------------------ *
   * 渲染
   * ------------------------------------------------------------------ */

  function renderTheme() {
    var settings = state().settings;
    var btn = $('#themeBtn');
    if (!btn) return;
    var dark = settings.theme === 'dark';
    btn.textContent = dark ? '切换到浅色' : '切换到深色';
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }

  function markSegmented(group, isActive) {
    if (!group) return;
    $$('.seg-btn', group).forEach(function (btn) {
      var active = !!isActive(btn);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderFont() {
    var settings = state().settings;
    var target = core.toNum(settings.font, 16);
    markSegmented($('#fontSeg'), function (btn) {
      return core.toNum(btn.dataset.font, 16) === target;
    });
  }

  function renderUnits() {
    var settings = state().settings;
    var weightUnit = settings.weightUnit === 'jin' ? 'jin' : 'kg';
    var heightUnit = settings.heightUnit === 'ft' ? 'ft' : 'cm';
    markSegmented($('#weightUnitSeg'), function (btn) { return btn.dataset.unit === weightUnit; });
    markSegmented($('#heightUnitSeg'), function (btn) { return btn.dataset.unit === heightUnit; });
    applyUnitLabels();
  }

  /** 首页表单的单位后缀 / 标签（与 app.js 的 syncUnitLabels 行为一致） */
  function applyUnitLabels() {
    var weightUnit = FP.util.weightUnit();
    var heightUnit = FP.util.heightUnit();
    setText('#weightUnitSuffix', weightUnit === 'jin' ? '斤' : 'kg');
    setText('#weightUnitLabel', weightUnit === 'jin' ? '（斤）' : '（kg）');
    setText('#heightUnitSuffix', heightUnit === 'ft' ? 'ft' : 'cm');
    setText('#heightUnitLabel', heightUnit === 'ft' ? '（英尺）' : '（cm）');
    // 体重页表单与目标体重的单位提示（app.js 的 syncUnitLabels 维护同一组节点）
    setText('#weightFormUnit', weightUnit === 'jin' ? '（斤）' : '（kg）');
    setText('#targetWeightLabel', weightUnit === 'jin' ? '目标体重（斤）' : '目标体重（kg）');
  }

  function notificationSupport() {
    if (!('Notification' in root) || !root.Notification) return 'unsupported';
    return root.Notification.permission;
  }

  function renderWater() {
    var settings = state().settings;
    var select = $('#waterInterval');
    var btn = $('#waterBtn');
    var status = $('#waterStatus');
    var permission = notificationSupport();

    if (select && doc.activeElement !== select) {
      select.value = String(settings.waterInterval || 60);
    }

    if (btn) {
      btn.textContent = settings.waterOn ? '关闭饮水提醒' : '开启饮水提醒';
      btn.setAttribute('aria-pressed', settings.waterOn ? 'true' : 'false');
    }

    // 状态自愈：开关为开但权限已失效时关闭；为关时清掉计时器
    if (!settings.waterOn) stopWaterTimer();

    if (!status) return;
    if (permission === 'unsupported') {
      status.textContent = '当前浏览器不支持桌面通知。可以改用训练页的日历提醒（.ics）安排喝水时间。';
      return;
    }
    if (permission === 'denied') {
      status.textContent = '桌面通知权限已被拒绝。请在浏览器的网站设置中允许通知，再开启饮水提醒。';
      return;
    }
    if (settings.waterOn) {
      if (!waterTimer) startWaterTimer(settings.waterInterval);
      status.textContent = '已开启：每 ' + fmtInterval(settings.waterInterval) +
        ' 通过桌面通知提醒一次（需保持本页面打开）。';
    } else if (permission === 'default') {
      status.textContent = '点击「开启饮水提醒」会先请求桌面通知权限；授权后每 ' +
        fmtInterval(settings.waterInterval) + ' 提醒一次。';
    } else {
      status.textContent = '未开启。开启后每 ' + fmtInterval(settings.waterInterval) +
        ' 通过桌面通知提醒喝水（需保持本页面打开）。';
    }
  }

  function renderStatus() {
    var el = $('#settingsStatus');
    if (!el) return;
    var current = state();
    var available = !(FP.store && FP.store.available === false);
    if (!available) {
      el.textContent = '⚠ 当前浏览器禁用了本地存储（可能处于隐私模式），数据不会被保存。';
      return;
    }
    var bits = ['数据仅保存在本机浏览器（localStorage）'];
    bits.push('体重 ' + ((current.weights || []).length) + ' 条');
    bits.push('训练 ' + ((current.sessions || []).length) + ' 次');
    if ((current.customFoods || []).length) bits.push('自定义食材 ' + current.customFoods.length + ' 种');
    var checkins = current.checkins && typeof current.checkins === 'object' ? Object.keys(current.checkins).length : 0;
    if (checkins) bits.push('打卡 ' + checkins + ' 天');
    el.textContent = bits.join(' · ') + '。版本 v' + (FP.VERSION || '1.2.0') + '。';
  }

  /** 参考文献：数据缺失时保留 index.html 里的静态列表 */
  function renderRefs() {
    var box = $('#refsList');
    if (!box) return;
    var nutrition = root.FP_NUTRITION;
    var refs = nutrition && nutrition.refs;
    if (!refs) return;

    var items = [];
    if (Array.isArray(refs)) {
      items = refs.slice();
    } else if (typeof refs === 'object') {
      items = Object.keys(refs).map(function (key) { return refs[key]; });
    }

    var html = [];
    items.forEach(function (item) {
      if (!item) return;
      var text = '';
      var url = '';
      if (typeof item === 'string') {
        text = item;
      } else if (typeof item === 'object') {
        text = item.text || item.citation || item.title || item.label || '';
        if (!text) {
          text = [item.authors || item.author, item.title, item.journal, item.year]
            .filter(function (part) { return part; }).join('. ');
        }
        url = item.url || item.link || '';
      }
      if (!text) return;
      html.push('<li>' + refHtml(text) +
        (isHttpUrl(url) ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">链接</a>' : '') +
        '</li>');
    });

    if (html.length) box.innerHTML = html.join('');
  }

  function isHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
  }

  /** 参考文献正文：整体转义后只放行 <em>/<i>/<strong>/<b> 这几种强调标签 */
  function refHtml(text) {
    return core.escapeHtml(text).replace(/&lt;(\/?)(em|i|strong|b)&gt;/gi, '<$1$2>');
  }

  function render() {
    var current = state();
    if (!current) return;
    renderTheme();
    renderFont();
    renderUnits();
    renderWater();
    renderStatus();
    renderRefs();
  }

  /* ------------------------------------------------------------------ *
   * 饮水提醒
   * ------------------------------------------------------------------ */

  function stopWaterTimer() {
    if (waterTimer !== null) {
      root.clearInterval(waterTimer);
      waterTimer = null;
    }
  }

  function startWaterTimer(minutes) {
    stopWaterTimer();
    if (notificationSupport() !== 'granted') return false;
    var ms = Math.max(15, core.toNum(minutes, 60)) * 60000;
    waterTimer = root.setInterval(function () {
      if (!state().settings.waterOn) return;
      FP.util.sendNotification('喝水提醒', '该喝水了：喝 200–300 ml 水，顺便起身活动一下。');
    }, ms);
    return true;
  }

  function readWaterInterval() {
    var select = $('#waterInterval');
    return core.clamp(core.toNum(select && select.value, 60), 15, 240);
  }

  function toggleWater() {
    var settings = state().settings;

    if (settings.waterOn) {
      settings.waterOn = false;
      stopWaterTimer();
      FP.save();
      renderWater();
      FP.toast('已关闭饮水提醒');
      return;
    }

    var minutes = readWaterInterval();
    settings.waterInterval = minutes;
    setText('#waterStatus', '正在请求桌面通知权限…');

    var ask = FP.util.askNotify ? FP.util.askNotify() : Promise.resolve('unsupported');
    ask.then(function (permission) {
      if (permission === 'granted') {
        settings.waterOn = true;
        FP.save();
        startWaterTimer(minutes);
        renderWater();
        FP.toast('饮水提醒已开启：每 ' + fmtInterval(minutes) + ' 一次');
        return;
      }
      settings.waterOn = false;
      FP.save();
      renderWater();
      if (permission === 'unsupported') {
        FP.toast('当前浏览器不支持桌面通知，可改用训练日历提醒', true);
      } else {
        FP.toast('未获得通知权限，请在浏览器站点设置中允许通知后重试', true);
      }
    }, function () {
      settings.waterOn = false;
      FP.save();
      renderWater();
      FP.toast('通知权限申请失败，请稍后重试', true);
    });
  }

  function onWaterIntervalChange() {
    var settings = state().settings;
    settings.waterInterval = readWaterInterval();
    FP.save();
    if (settings.waterOn) startWaterTimer(settings.waterInterval);
    renderWater();
    FP.toast('饮水提醒间隔：每 ' + fmtInterval(settings.waterInterval));
  }

  /* ------------------------------------------------------------------ *
   * 主题 / 字号 / 单位
   * ------------------------------------------------------------------ */

  function onFontClick(event) {
    var btn = event.target && event.target.closest ? event.target.closest('.seg-btn') : null;
    if (!btn || !btn.dataset.font) return;
    var size = core.toNum(btn.dataset.font, 16);
    if (size === core.toNum(state().settings.font, 16)) return;
    FP.applyFont(size);
    FP.save();
    renderFont();
    FP.toast('字号已切换为' + (size >= 18 ? '大号' : '标准'));
  }

  function convertWeightInput(prevUnit, nextUnit) {
    var el = $('#weight');
    if (!el) return;
    var kg = core.toNum(state().profile && state().profile.weight, 70);
    var raw = core.toNum(el.value, NaN);
    if (isFinite(raw) && raw > 0) {
      kg = prevUnit === 'jin' ? core.jinToKg(raw) : raw;
    }
    el.value = nextUnit === 'jin' ? core.kgToJin(kg) : core.round(kg, 1);
  }

  function convertHeightInput(prevUnit, nextUnit) {
    var el = $('#height');
    if (!el) return;
    var cm = core.toNum(state().profile && state().profile.height, 175);
    var raw = core.toNum(el.value, NaN);
    if (isFinite(raw) && raw > 0) {
      cm = prevUnit === 'ft' ? core.ftInToCm(Math.floor(raw), core.round((raw % 1) * 12, 1)) : raw;
    }
    if (nextUnit === 'ft') {
      var ftIn = core.cmToFtIn(cm);
      el.value = core.round(ftIn.ft + ftIn.inch / 12, 2);
    } else {
      el.value = core.round(cm, 0);
    }
  }

  function onWeightUnitClick(event) {
    var btn = event.target && event.target.closest ? event.target.closest('.seg-btn') : null;
    if (!btn || !btn.dataset.unit) return;
    var next = btn.dataset.unit === 'jin' ? 'jin' : 'kg';
    var settings = state().settings;
    if (settings.weightUnit === next) return;
    var prev = settings.weightUnit;
    settings.weightUnit = next;
    convertWeightInput(prev, next);
    applyUnitLabels();
    FP.save();
    FP.renderAll();
    FP.toast('体重单位已切换为' + (next === 'jin' ? '斤' : 'kg'));
  }

  function onHeightUnitClick(event) {
    var btn = event.target && event.target.closest ? event.target.closest('.seg-btn') : null;
    if (!btn || !btn.dataset.unit) return;
    var next = btn.dataset.unit === 'ft' ? 'ft' : 'cm';
    var settings = state().settings;
    if (settings.heightUnit === next) return;
    var prev = settings.heightUnit;
    settings.heightUnit = next;
    convertHeightInput(prev, next);
    applyUnitLabels();
    FP.save();
    FP.renderAll();
    FP.toast('身高单位已切换为' + (next === 'ft' ? '英尺' : 'cm'));
  }

  /* ------------------------------------------------------------------ *
   * 导出
   * ------------------------------------------------------------------ */

  /** 以 Blob 下载（不带 BOM，适合 JSON / ICS）；失败时回退字符串下载 */
  function downloadText(filename, text, mime) {
    try {
      if (root.Blob) {
        var blob = new root.Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
        return FP.util.download(filename, blob, mime);
      }
    } catch (e) { /* 回退 */ }
    return FP.util.download(filename, text, mime);
  }

  function printTraining() {
    if (typeof FP.program === 'function' && !FP.program()) {
      FP.toast('还没有生成训练计划，先到首页生成方案', true);
      return;
    }
    FP.renderAll();
    if (FP.util.printSection) FP.util.printSection('training');
    else if (root.print) root.print();
    FP.toast('已打开打印预览，可在打印对话框选择「另存为 PDF」');
  }

  function printDiet() {
    if (typeof FP.plan === 'function' && !FP.plan()) {
      FP.toast('还没有生成饮食方案，先到首页生成方案', true);
      return;
    }
    FP.renderAll();
    if (FP.util.printSection) FP.util.printSection('diet');
    else if (root.print) root.print();
    FP.toast('已打开打印预览，可在打印对话框选择「另存为 PDF」');
  }

  function normalizeFoods(foods) {
    if (!foods) return [];
    if (Array.isArray(foods)) return foods.filter(function (f) { return f && (f.name || f.title); });
    if (typeof foods === 'object') {
      return Object.keys(foods).map(function (key) {
        var item = foods[key] || {};
        return item.name ? item : { name: key, portion: item.portion, kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat };
      }).filter(function (f) { return f && f.name; });
    }
    return [];
  }

  function mealPlanForDiet() {
    var nutrition = root.FP_NUTRITION;
    var plans = nutrition && nutrition.mealPlans;
    if (!plans || typeof plans !== 'object') return null;
    var key = (state().profile && state().profile.diet) || 'normal';
    return plans[key] || plans.normal || plans[Object.keys(plans)[0]] || null;
  }

  function shoppingRows() {
    var plan = mealPlanForDiet();
    var list = plan && (plan.shopping || plan.shopList || plan.shoppingList);
    if (!Array.isArray(list)) return [];
    var rows = [];
    list.forEach(function (item) {
      if (!item) return;
      if (typeof item === 'string') {
        rows.push([item, '']);
        return;
      }
      var name = item.name || item.item || item.food || '';
      var amount = item.amount || item.qty || item.quantity || '';
      if (name) rows.push([name, amount]);
    });
    return rows;
  }

  function exportFoodsCsv() {
    var current = state();
    var foods = normalizeFoods(root.FP_NUTRITION && root.FP_NUTRITION.foods);
    var custom = Array.isArray(current.customFoods) ? current.customFoods : [];
    var rows;

    if (foods.length || custom.length) {
      rows = [['食物', '份量', '热量(kcal)', '蛋白质(g)', '碳水(g)', '脂肪(g)']];
      foods.forEach(function (food) {
        rows.push([
          food.name || '',
          food.portion || food.unit || '100g',
          cellNum(food.kcal),
          cellNum(food.protein),
          cellNum(food.carbs),
          cellNum(food.fat)
        ]);
      });
      custom.forEach(function (food) {
        rows.push([
          '（自定义）' + (food.name || '未命名'),
          '100g',
          cellNum(food.kcal),
          cellNum(food.protein),
          cellNum(food.carbs),
          cellNum(food.fat)
        ]);
      });
    } else {
      var shopping = shoppingRows();
      if (!shopping.length) {
        FP.toast('暂无可导出的食材数据：请先生成饮食方案或添加自定义食材', true);
        return;
      }
      rows = [['食材', '用量']].concat(shopping);
    }

    // FP.util.download 会给字符串内容加 UTF-8 BOM，保证 Excel 打开中文不乱码
    var csv = core.toCsv(rows);
    var ok = FP.util.download('fitdaily-foods-' + today() + '.csv', csv, 'text/csv');
    if (ok) FP.toast('已导出食材表 CSV（' + (rows.length - 1) + ' 条）');
  }

  function exportIcs() {
    var current = state();
    var schedule = current.schedule || {};
    var weekdays = Array.isArray(schedule.weekdays) && schedule.weekdays.length
      ? schedule.weekdays.slice()
      : core.DEFAULT_WEEKDAYS[3].slice();
    var program = typeof FP.program === 'function' ? FP.program() : null;
    var dayTitles = program ? program.map(function (day) { return day.title; }) : [];

    var ics = core.buildIcs({
      weekdays: weekdays,
      time: schedule.time || '18:30',
      leadMinutes: core.toNum(schedule.lead, 30),
      weeks: 52,
      startDate: today(),
      dayTitles: dayTitles,
      calendarName: 'FitDaily 训练计划',
      summaryPrefix: 'FitDaily 训练 · ',
      description: '来自 FitDaily 本地版的训练安排，打开页面查看当天动作与饮食。'
    });

    if (downloadText('fitdaily-training-' + today() + '.ics', ics, 'text/calendar')) {
      FP.toast('已导出日历文件（.ics），可导入手机或电脑日历');
    }
  }

  /* ------------------------------------------------------------------ *
   * JSON 备份：导出 / 导入 / 清空
   * ------------------------------------------------------------------ */

  function exportData() {
    var current = state();
    var payload = {
      app: 'FitDaily 本地版',
      version: FP.VERSION || '1.2.0',
      exportedAt: new Date().toISOString(),
      counts: {
        weights: (current.weights || []).length,
        sessions: (current.sessions || []).length,
        customFoods: (current.customFoods || []).length,
        checkins: current.checkins && typeof current.checkins === 'object' ? Object.keys(current.checkins).length : 0
      },
      state: current
    };

    var json = JSON.stringify(payload, null, 2);
    var size = json.length;
    try { if (root.Blob) size = new root.Blob([json]).size; } catch (e) { /* 忽略 */ }

    if (downloadText('fitdaily-backup-' + today() + '.json', json, 'application/json')) {
      FP.toast('已导出备份（' + FP.util.bytes(size) + '）');
    }
  }

  function looksLikeState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    for (var i = 0; i < STATE_KEYS.length; i++) {
      if (Object.prototype.hasOwnProperty.call(raw, STATE_KEYS[i])) return true;
    }
    return false;
  }

  function replaceState(next) {
    var current = state();
    Object.keys(current).forEach(function (key) { delete current[key]; });
    Object.keys(next).forEach(function (key) { current[key] = next[key]; });
  }

  /** 导入后同步首页表单（app.js 未暴露 fillForm，这里按其规则重新填一次） */
  function fillHomeForm() {
    var profile = state().profile || {};
    function setValue(sel, value) {
      var node = $(sel);
      if (node) node.value = value == null ? '' : value;
    }
    setValue('#age', profile.age);
    setValue('#height', FP.util.heightInputValue(profile.height));
    setValue('#weight', FP.util.unitWeightValue(profile.weight));
    setValue('#bodyFatInput', profile.bodyFat == null ? '' : profile.bodyFat);
    setValue('#activity', profile.activity);
    setValue('#goal', profile.goal);
    setValue('#days', String(profile.days));
    setValue('#experience', profile.experience);
    setValue('#diet', profile.diet);
    setValue('#equipment', profile.equipment);
    $$('#sexSeg .seg-btn').forEach(function (btn) {
      var active = btn.dataset.value === profile.sex;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    applyUnitLabels();
  }

  function resetFileInput() {
    var input = $('#importDataFile');
    if (input) input.value = '';
  }

  function onImportFile() {
    var input = $('#importDataFile');
    var file = input && input.files && input.files[0];
    if (!file) return;

    if (!root.FileReader) {
      FP.toast('当前浏览器不支持读取本地文件', true);
      resetFileInput();
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      FP.toast('备份文件过大（超过 8 MB）', true);
      resetFileInput();
      return;
    }

    var reader = new root.FileReader();
    reader.onload = function () {
      var text = String(reader.result || '').replace(/^\uFEFF/, '');
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        FP.toast('无法解析备份文件：不是有效的 JSON', true);
        resetFileInput();
        return;
      }

      var raw = data && typeof data === 'object' && data.state && typeof data.state === 'object'
        ? data.state
        : data;
      if (!looksLikeState(raw)) {
        FP.toast('不是有效的 FitDaily 备份文件（缺少 state 数据）', true);
        resetFileInput();
        return;
      }

      var confirmed = typeof root.confirm !== 'function'
        ? true
        : root.confirm('导入将覆盖当前全部数据（体重、训练、设置等），确定继续吗？');
      if (!confirmed) {
        resetFileInput();
        return;
      }

      var next = FP.normalizeState(raw);
      replaceState(next);
      if (typeof FP.invalidate === 'function') FP.invalidate();
      FP.save(true);
      FP.applyTheme(next.settings.theme === 'dark' ? 'dark' : 'light');
      FP.applyFont(next.settings.font);
      fillHomeForm();
      FP.renderAll();
      if (typeof FP.go === 'function') {
        var view = next.ui && FP.VIEWS && FP.VIEWS.indexOf(next.ui.view) !== -1 ? next.ui.view : 'home';
        FP.go(view);
      }
      resetFileInput();
      FP.toast('已导入备份：体重 ' + next.weights.length + ' 条 · 训练 ' + next.sessions.length + ' 次');
    };
    reader.onerror = function () {
      FP.toast('读取备份文件失败，请重试', true);
      resetFileInput();
    };
    reader.readAsText(file, 'utf-8');
  }

  function clearData() {
    var confirmed = typeof root.confirm === 'function'
      ? root.confirm('确定要清空全部本地数据吗？\n体重记录、训练记录、自定义食材与所有设置都会被删除，且无法恢复。')
      : false;
    if (!confirmed) return;

    try {
      var storage = root.localStorage;
      if (storage) {
        var keys = [];
        for (var i = 0; i < storage.length; i++) {
          var key = storage.key(i);
          if (key && /^(fitplan|fitdaily)-/.test(key)) keys.push(key);
        }
        keys.forEach(function (k) {
          try { storage.removeItem(k); } catch (e) { /* 忽略 */ }
        });
      }
    } catch (e) { /* 隐私模式下忽略 */ }

    var def = FP.defaultState();
    replaceState(def);
    FP.save(true);
    FP.toast('已清空本地数据，正在重新加载…');
    root.setTimeout(function () {
      try { root.location.reload(); } catch (e) { FP.renderAll(); }
    }, 500);
  }

  /* ------------------------------------------------------------------ *
   * 模块接口
   * ------------------------------------------------------------------ */

  function init() {
    // 注意：#themeBtn / #heroThemeBtn 的点击已由 app.js 绑定到 FP.toggleTheme，
    // 这里只负责渲染按钮文案，重复绑定会导致主题被切换两次。
    on($('#fontSeg'), 'click', onFontClick);
    on($('#weightUnitSeg'), 'click', onWeightUnitClick);
    on($('#heightUnitSeg'), 'click', onHeightUnitClick);

    on($('#waterBtn'), 'click', toggleWater);
    on($('#waterInterval'), 'change', onWaterIntervalChange);

    on($('#printTrainingBtn'), 'click', printTraining);
    on($('#printDietBtn'), 'click', printDiet);
    on($('#csvExportBtn'), 'click', exportFoodsCsv);
    on($('#icsExportBtn'), 'click', exportIcs);

    on($('#exportDataBtn'), 'click', exportData);
    var importBtn = $('#importDataBtn');
    var fileInput = $('#importDataFile');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', function () { fileInput.click(); });
    }
    on(fileInput, 'change', onImportFile);
    on($('#clearDataBtn'), 'click', clearData);

    // 恢复上次的饮水提醒（权限仍有效时继续计时）
    var settings = state().settings;
    if (settings.waterOn && notificationSupport() !== 'granted') {
      settings.waterOn = false;
      FP.save();
    }
  }

  FP.settings = {
    init: init,
    render: render
  };
})(typeof window !== 'undefined' ? window : globalThis);