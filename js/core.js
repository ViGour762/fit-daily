/*!
 * core.js — FitDaily 本地版的纯逻辑层（无 DOM 依赖）
 * 可在浏览器（window.FP.core）与 Node（module.exports）中运行，便于单元测试。
 */
(function (root) {
  'use strict';

  var FP = (root.FP = root.FP || {});

  /* ------------------------------------------------------------------ *
   * 常量
   * ------------------------------------------------------------------ */

  // 活动系数（Harris-Benedict / Mifflin 体系常用取值）
  var ACTIVITY = {
    sedentary: { factor: 1.2, label: '久坐少动', note: '几乎不运动' },
    light: { factor: 1.375, label: '轻度活动', note: '每周 1–3 次训练' },
    moderate: { factor: 1.55, label: '中度活动', note: '每周 3–5 次训练' },
    active: { factor: 1.725, label: '高度活动', note: '每周 6–7 次训练' },
    athlete: { factor: 1.9, label: '极高强度', note: '体力工作 + 每天训练' }
  };

  // 目标 → 热量调整、蛋白质系数与推荐区间
  var GOALS = {
    cut: {
      key: 'cut',
      label: '减脂',
      short: '减脂',
      adjust: -0.15,
      adjustRange: [10, 20],
      proteinPerKg: 2.2,
      proteinRange: [1.8, 2.7],
      fatPct: 0.25,
      ratePerWeek: [0.005, 0.01],
      rateHint: '建议每周减重不超过体重的 1%'
    },
    bulk: {
      key: 'bulk',
      label: '增肌',
      short: '增肌',
      adjust: 0.12,
      adjustRange: [5, 15],
      proteinPerKg: 1.8,
      proteinRange: [1.6, 2.2],
      fatPct: 0.25,
      ratePerWeek: [0.0025, 0.005],
      rateHint: '建议每周增重不超过体重的 0.5%'
    },
    maintain: {
      key: 'maintain',
      label: '保持 / 塑形',
      short: '保持',
      adjust: 0,
      adjustRange: [0, 0],
      proteinPerKg: 1.6,
      proteinRange: [1.4, 2.0],
      fatPct: 0.25,
      ratePerWeek: [0, 0],
      rateHint: '保持热量平衡，围度与力量稳步提升'
    }
  };

  var EXPERIENCE = {
    beginner: { key: 'beginner', label: '新手', months: '< 6 个月' },
    intermediate: { key: 'intermediate', label: '中级', months: '6 个月 – 2 年' },
    advanced: { key: 'advanced', label: '高级', months: '2 年以上' }
  };

  var EQUIPMENT = {
    gym: { key: 'gym', label: '健身房器械' },
    home: { key: 'home', label: '居家无器械' }
  };

  var DIET_PREF = {
    normal: { key: 'normal', label: '普通饮食' },
    vegetarian: { key: 'vegetarian', label: '蛋奶素' },
    vegan: { key: 'vegan', label: '纯素' },
    lowcarb: { key: 'lowcarb', label: '低碳水' }
  };

  // 每周训练天数 → 默认训练日（ISO 星期：1=周一 … 7=周日）
  var DEFAULT_WEEKDAYS = {
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6]
  };

  var WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  /* ------------------------------------------------------------------ *
   * 数值工具
   * ------------------------------------------------------------------ */

  function toNum(v, fallback) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : (fallback === undefined ? NaN : fallback);
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /** 四舍五入到指定小数位 */
  function round(v, digits) {
    var f = Math.pow(10, digits || 0);
    return Math.round((toNum(v, 0) + Number.EPSILON) * f) / f;
  }

  /** 取整到 step 的倍数（营养克数常按 5g 展示） */
  function roundTo(v, step) {
    step = step || 5;
    return Math.round(toNum(v, 0) / step) * step;
  }

  function pct(part, total) {
    if (!total) return 0;
    return round((part / total) * 100, 0);
  }

  /* ------------------------------------------------------------------ *
   * 代谢与营养计算
   * ------------------------------------------------------------------ */

  function normalizeProfile(p) {
    p = p || {};
    return {
      sex: p.sex === 'female' ? 'female' : 'male',
      age: clamp(toNum(p.age, 25), 14, 90),
      height: clamp(toNum(p.height, 175), 120, 230),
      weight: clamp(toNum(p.weight, 70), 30, 200),
      bodyFat: isFinite(toNum(p.bodyFat, NaN)) ? clamp(toNum(p.bodyFat), 3, 60) : null,
      equipment: EQUIPMENT[p.equipment] ? p.equipment : 'gym',
      activity: ACTIVITY[p.activity] ? p.activity : 'light',
      goal: GOALS[p.goal] ? p.goal : 'cut',
      days: clamp(Math.round(toNum(p.days, 3)), 2, 6),
      experience: EXPERIENCE[p.experience] ? p.experience : 'beginner',
      diet: DIET_PREF[p.diet] ? p.diet : 'normal',
      // 4 天分化方式：upperlower（上下肢）| bro（胸背肩腿）
      split: p.split === 'bro' ? 'bro' : 'upperlower'
    };
  }

  /**
   * 基础代谢率。默认 Mifflin-St Jeor（1990）。
   * 已知体脂率时采用 Katch-McArdle（基于瘦体重）以获得更准确的结果。
   */
  function calcBmr(profile, options) {
    options = options || {};
    var p = normalizeProfile(profile);
    var mifflin = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161);
    var result = { raw: mifflin, formula: 'Mifflin-St Jeor' };
    if (p.bodyFat !== null && options.useBodyFat !== false) {
      var lbm = p.weight * (1 - p.bodyFat / 100);
      var katch = 370 + 21.6 * lbm;
      if (isFinite(katch) && katch > 0) {
        result = { raw: katch, formula: 'Katch-McArdle', lbm: round(lbm, 1) };
      }
    }
    // value 为展示用整数；raw 保留小数，供 TDEE 与目标热量计算（避免多次取整累积误差）
    result.value = round(result.raw, 0);
    return result;
  }

  function calcTdee(bmr, activityKey) {
    var a = ACTIVITY[activityKey] || ACTIVITY.light;
    return round(bmr * a.factor, 0);
  }

  /**
   * 计算完整营养方案。
   * @param {object} profile 用户档案
   * @param {number} [adjustPct] 热量调整百分比（减脂为缺口、增肌为盈余），不传则用目标默认值
   */
  function calcNutrition(profile, adjustPct) {
    var p = normalizeProfile(profile);
    var goal = GOALS[p.goal];
    var bmrInfo = calcBmr(p);
    // 全部用未取整的 BMR/TDEE 计算，最后再取整，避免多次取整累积误差（与上游结果一致）
    var rawTdee = bmrInfo.raw * ACTIVITY[p.activity].factor;
    var tdee = round(rawTdee, 0);

    var adjust = isFinite(toNum(adjustPct, NaN))
      ? clamp(toNum(adjustPct), goal.adjustRange[0], goal.adjustRange[1])
      : Math.abs(round(goal.adjust * 100, 0));
    if (goal.key === 'maintain') adjust = 0;

    var factor = goal.key === 'cut' ? 1 - adjust / 100 : goal.key === 'bulk' ? 1 + adjust / 100 : 1;
    var target = round(rawTdee * factor, 0);

    var proteinG = round(goal.proteinPerKg * p.weight, 0);
    var fatG = round((target * goal.fatPct) / 9, 0);
    var carbsG = round(Math.max(0, target - proteinG * 4 - fatG * 9) / 4, 0);

    var proteinKcal = proteinG * 4;
    var fatKcal = fatG * 9;
    var carbsKcal = carbsG * 4;
    var macroKcal = proteinKcal + fatKcal + carbsKcal;

    var water = round(p.weight * 35, -1);

    var weeklyKg = round((Math.abs(rawTdee - target) * 7) / 7700, 2);
    var maxKg = round(p.weight * (goal.key === 'bulk' ? 0.005 : 0.01), 2);
    var capped = Math.min(weeklyKg, maxKg);

    return {
      profile: p,
      bmr: bmrInfo.value,
      bmrFormula: bmrInfo.formula,
      lbm: bmrInfo.lbm || null,
      tdee: tdee,
      target: target,
      adjust: adjust,
      delta: target - tdee,
      protein: proteinG,
      carbs: carbsG,
      fat: fatG,
      proteinKcal: proteinKcal,
      carbsKcal: carbsKcal,
      fatKcal: fatKcal,
      macroKcal: macroKcal,
      proteinPct: pct(proteinKcal, macroKcal),
      carbsPct: pct(carbsKcal, macroKcal),
      fatPct: pct(fatKcal, macroKcal),
      proteinPerKg: round(proteinG / p.weight, 1),
      fatEnergyPct: pct(fatKcal, target),
      water: water,
      waterPerKg: 35,
      weeklyKg: capped,
      weeklyJin: round(capped * 2, 1),
      goal: goal
    };
  }

  /** 蛋白质 / 脂肪是否落在推荐区间 */
  function macroCheck(nutrition) {
    var goal = GOALS[nutrition.profile.goal] || GOALS.cut;
    var pr = goal.proteinRange;
    var perKg = nutrition.protein / nutrition.profile.weight;
    return {
      proteinOk: perKg >= pr[0] && perKg <= pr[1],
      proteinRange: pr,
      fatOk: nutrition.fatEnergyPct >= 20 && nutrition.fatEnergyPct <= 35,
      fatRange: [20, 35]
    };
  }

  /* ------------------------------------------------------------------ *
   * 单位换算
   * ------------------------------------------------------------------ */

  var KG_PER_JIN = 0.5; // 1 斤 = 0.5 kg
  var CM_PER_FT = 30.48;

  function kgToJin(kg) { return round(toNum(kg, 0) / KG_PER_JIN, 1); }
  function jinToKg(jin) { return round(toNum(jin, 0) * KG_PER_JIN, 1); }

  function cmToFtIn(cm) {
    var totalIn = toNum(cm, 0) / 2.54;
    var ft = Math.floor(totalIn / 12);
    var inch = Math.round(totalIn - ft * 12);
    if (inch === 12) { ft += 1; inch = 0; }
    return { ft: ft, inch: inch, text: ft + ' 英尺 ' + inch + ' 英寸' };
  }
  function ftInToCm(ft, inch) {
    return round((toNum(ft, 0) * 12 + toNum(inch, 0)) * 2.54, 1);
  }

  /** 把内部统一单位（kg/cm）转换成展示单位 */
  function displayWeight(kg, unit) {
    if (unit === 'jin') return { value: kgToJin(kg), unit: '斤', text: kgToJin(kg) + ' 斤' };
    return { value: round(kg, 1), unit: 'kg', text: round(kg, 1) + ' kg' };
  }

  function displayHeight(cm, unit) {
    if (unit === 'ft') {
      var r = cmToFtIn(cm);
      return { value: r.text, unit: 'ft', ft: r.ft, inch: r.inch };
    }
    return { value: round(cm, 0), unit: 'cm', text: round(cm, 0) + ' cm' };
  }

  /* ------------------------------------------------------------------ *
   * 日期 / 日历
   * ------------------------------------------------------------------ */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function isoDate(d) {
    if (typeof d === 'string') return d;
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseISO(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function todayISO() { return isoDate(new Date()); }

  function addDays(date, n) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }

  /** ISO 星期：1=周一 … 7=周日 */
  function isoWeekday(date) {
    var d = date instanceof Date ? date : parseISO(date);
    var w = d.getDay();
    return w === 0 ? 7 : w;
  }

  function startOfWeek(date) {
    var d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (isoWeekday(d) - 1));
    return d;
  }

  /** 生成月历矩阵：按周一开头，每行 7 天，前后补足整周 */
  function monthMatrix(year, month /* 0-based */) {
    var first = new Date(year, month, 1);
    var start = startOfWeek(first);
    var weeks = [];
    var cursor = new Date(start.getTime());
    for (var w = 0; w < 6; w++) {
      var row = [];
      for (var i = 0; i < 7; i++) {
        row.push({
          date: isoDate(cursor),
          day: cursor.getDate(),
          month: cursor.getMonth(),
          year: cursor.getFullYear(),
          inMonth: cursor.getMonth() === month,
          weekday: isoWeekday(cursor)
        });
        cursor = addDays(cursor, 1);
      }
      weeks.push(row);
      if (row[6].inMonth === false && cursor.getMonth() !== month) break;
    }
    return weeks;
  }

  /** 连续打卡天数（从今天或昨天往前数，遇到缺失即停止） */
  function streakDays(checkins, fromDate) {
    var map = checkins || {};
    var cursor = fromDate ? parseISO(fromDate) : new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!map[isoDate(cursor)]) cursor = addDays(cursor, -1);
    var streak = 0;
    while (map[isoDate(cursor)]) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function fmtDateCN(iso) {
    var d = parseISO(iso);
    if (!d) return iso;
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  function fmtMonthCN(year, month0) { return year + ' 年 ' + (month0 + 1) + ' 月'; }

  /* ------------------------------------------------------------------ *
   * 训练容量 / 覆盖统计
   * ------------------------------------------------------------------ */

  /** 单次训练容量：总组数（无负重记录时用组数×次数估算总次数） */
  function sessionVolume(sets) {
    var list = sets || [];
    return list.reduce(function (sum, s) {
      var n = toNum(s && s.sets, 0);
      var reps = parseReps(s && s.reps);
      return sum + n * reps;
    }, 0);
  }

  /** 解析 "8-12" / "10" / "12-15" 为平均次数 */
  function parseReps(text) {
    var m = String(text == null ? '' : text).match(/(\d+)\s*(?:[-–~]\s*(\d+))?/);
    if (!m) return 0;
    var a = Number(m[1]);
    var b = m[2] ? Number(m[2]) : a;
    return (a + b) / 2;
  }

  /* ------------------------------------------------------------------ *
   * 热量估算（力量训练）
   * kcal = MET × 3.5 × 体重(kg) / 200 × 分钟数
   * MET 取组间加权平均：复合大动作更高，孤立动作更低。
   * 这是通用估算，与器械重量、组间真实心率等有关，仅供参考。
   * ------------------------------------------------------------------ */

  var MET_BY_GROUP = {
    chest: 5.0,
    back: 5.0,
    shoulders: 4.0,
    biceps: 3.5,
    triceps: 3.5,
    quads: 6.0,
    glutes_hams: 6.0,
    calves: 3.5,
    core: 3.5,
    other: 4.0
  };

  // 少数大重量复合动作单独上调
  var MET_BY_KEY = {
    squat: 6.5, deadlift: 6.5, rdl: 6.5, legPress: 6.0,
    bench: 5.5, row: 5.5, pullup: 5.5, tBarRow: 5.5,
    ohp: 5.0, standingOhp: 5.0, hipThrust: 5.5, lunge: 6.0, splitSquat: 5.5
  };

  /** 单个动作的 MET（找不到时按 4.0） */
  function metForExercise(ex) {
    ex = ex || {};
    if (ex.key && MET_BY_KEY[ex.key]) return MET_BY_KEY[ex.key];
    if (ex.group && MET_BY_GROUP[ex.group]) return MET_BY_GROUP[ex.group];
    return 4.0;
  }

  /**
   * 估算一次训练的热量消耗
   * @param {object} opts { weightKg, durationMin, sets:[{sets,reps,key,group}] }
   * @returns {{kcal:number, met:number, minutes:number, totalSets:number}}
   */
  function estimateCalories(opts) {
    opts = opts || {};
    var weightKg = clamp(toNum(opts.weightKg, 70), 30, 200);
    var sets = Array.isArray(opts.sets) ? opts.sets : [];
    var totalSets = sets.reduce(function (sum, s) { return sum + Math.max(0, toNum(s && s.sets, 0)); }, 0);
    if (!totalSets) return { kcal: 0, met: 0, minutes: 0, totalSets: 0 };

    var minutes = toNum(opts.durationMin, 0);
    // 没有时长记录时按每组约 1.6 分钟（含组间休息）估算
    if (!(minutes > 0)) minutes = totalSets * 1.6;

    var metSum = 0;
    sets.forEach(function (s) {
      metSum += metForExercise(s) * Math.max(0, toNum(s && s.sets, 0));
    });
    var metAvg = metSum / totalSets;
    var kcal = Math.round((metAvg * 3.5 * weightKg / 200) * minutes);
    return { kcal: kcal, met: round(metAvg, 1), minutes: Math.round(minutes), totalSets: totalSets };
  }

  /* ------------------------------------------------------------------ *
   * 导出：CSV / ICS
   * ------------------------------------------------------------------ */

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(rows) {
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }

  function icsEscape(text) {
    return String(text == null ? '' : text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function utf8Length(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length;
    // 兜底：按 UTF-8 规则手工计算字节数
    var bytes = 0;
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff) { bytes += 4; i++; }
      else bytes += 3;
    }
    return bytes;
  }

  function icsFold(line) {
    // RFC 5545：每行不超过 75 个八位组，续行以一个空格开头。
    // 中文按 UTF-8 字节计算，且不能把一个多字节字符拆到两行。
    var out = [];
    var buf = '';
    var bufBytes = 0;
    var LIMIT = 73;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      var chBytes = utf8Length(ch);
      if (bufBytes + chBytes > LIMIT) {
        out.push(buf);
        buf = '';
        bufBytes = 0;
      }
      buf += ch;
      bufBytes += chBytes;
    }
    if (buf) out.push(buf);
    return out.join('\r\n ');
  }

  function icsStamp(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
      'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  /**
   * 生成每周循环的训练日程 .ics
   * @param {object} opts { weekdays:[1,3,5], time:'18:30', leadMinutes:30, weeks:52, summary, description, startDate }
   */
  function buildIcs(opts) {
    opts = opts || {};
    var weekdays = (opts.weekdays && opts.weekdays.length ? opts.weekdays : [1, 3, 5])
      .map(function (w) { return clamp(Math.round(toNum(w, 1)), 1, 7); });
    var time = /^(\d{1,2}):(\d{2})$/.exec(opts.time || '18:30') || [null, 18, '30'];
    var hour = clamp(Number(time[1]), 0, 23);
    var minute = clamp(Number(time[2]), 0, 59);
    var lead = Math.max(0, Math.round(toNum(opts.leadMinutes, 15)));
    var weeks = clamp(Math.round(toNum(opts.weeks, 52)), 1, 104);
    var start = opts.startDate ? parseISO(opts.startDate) : new Date();
    start = start || new Date();
    var dayTitles = opts.dayTitles || [];

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FitDaily//Training Schedule//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsEscape(opts.calendarName || 'FitDaily 训练计划'),
      'X-WR-TIMEZONE:Asia/Shanghai'
    ];

    weekdays.forEach(function (wd, index) {
      // 找到从 start 起第一个匹配的该星期日期
      var first = new Date(start.getTime());
      first.setHours(0, 0, 0, 0);
      var diff = (wd - isoWeekday(first) + 7) % 7;
      first = addDays(first, diff);
      first.setHours(hour, minute, 0, 0);

      var title = dayTitles[index] || ('训练日 ' + index + 1);
      lines.push(
        'BEGIN:VEVENT',
        'UID:fitdaily-' + wd + '-' + (isoDate(start).replace(/-/g, '')) + '@local',
        'DTSTAMP:' + icsStamp(new Date()),
        'DTSTART:' + icsStamp(toUtcApprox(first)),
        'DURATION:PT75M',
        'RRULE:FREQ=WEEKLY;COUNT=' + weeks,
        'SUMMARY:' + icsEscape((opts.summaryPrefix || 'FitDaily 训练 · ') + title),
        'DESCRIPTION:' + icsEscape(opts.description || '来自 FitDaily 的训练安排，打开网站查看当天动作。'),
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:' + icsEscape('该训练了：' + title),
        'TRIGGER:-PT' + lead + 'M',
        'END:VALARM',
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }

  /** 把本地时间近似转为 UTC（中国区固定 +8，避免依赖运行时区信息） */
  function toUtcApprox(localDate) {
    var ms = localDate.getTime() - localDate.getTimezoneOffset() * 60000;
    return new Date(ms);
  }

  /* ------------------------------------------------------------------ *
   * 其它小工具
   * ------------------------------------------------------------------ */

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMacros(n) {
    return {
      kcal: Math.round(n.target) + ' kcal',
      protein: n.protein + ' g',
      carbs: n.carbs + ' g',
      fat: n.fat + ' g'
    };
  }

  /** 数值区间判断是否命中 */
  function inRange(value, range) {
    return value >= range[0] && value <= range[1];
  }

  var core = {
    version: '1.2.0',
    ACTIVITY: ACTIVITY,
    GOALS: GOALS,
    EXPERIENCE: EXPERIENCE,
    EQUIPMENT: EQUIPMENT,
    DIET_PREF: DIET_PREF,
    DEFAULT_WEEKDAYS: DEFAULT_WEEKDAYS,
    WEEKDAY_NAMES: WEEKDAY_NAMES,

    toNum: toNum,
    clamp: clamp,
    round: round,
    roundTo: roundTo,
    pct: pct,
    inRange: inRange,
    escapeHtml: escapeHtml,
    formatMacros: formatMacros,

    normalizeProfile: normalizeProfile,
    calcBmr: calcBmr,
    calcTdee: calcTdee,
    calcNutrition: calcNutrition,
    macroCheck: macroCheck,

    kgToJin: kgToJin,
    jinToKg: jinToKg,
    cmToFtIn: cmToFtIn,
    ftInToCm: ftInToCm,
    displayWeight: displayWeight,
    displayHeight: displayHeight,

    pad: pad,
    isoDate: isoDate,
    parseISO: parseISO,
    todayISO: todayISO,
    addDays: addDays,
    isoWeekday: isoWeekday,
    startOfWeek: startOfWeek,
    monthMatrix: monthMatrix,
    streakDays: streakDays,
    fmtDateCN: fmtDateCN,
    fmtMonthCN: fmtMonthCN,

    sessionVolume: sessionVolume,
    parseReps: parseReps,
    metForExercise: metForExercise,
    estimateCalories: estimateCalories,
    MET_BY_GROUP: MET_BY_GROUP,
    MET_BY_KEY: MET_BY_KEY,

    toCsv: toCsv,
    buildIcs: buildIcs,
    icsEscape: icsEscape,
    icsFold: icsFold,
    icsStamp: icsStamp
  };

  FP.core = core;
  if (typeof module === 'object' && module.exports) module.exports = core;
})(typeof window !== 'undefined' ? window : globalThis);