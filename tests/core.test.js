#!/usr/bin/env node
/**
 * core.js 冒烟测试（零依赖，node tests/core.test.js）
 * 期望值取自目标站点公开示例：男 25 岁 / 175cm / 70kg / 轻度活动 / 减脂 15% 缺口
 *   → 目标 1956 kcal、蛋白质 154g、碳水 214g、脂肪 54g、饮水 2450ml
 */
'use strict';

const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname, '..', 'js', 'core.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    failed++;
    console.error('  ✗ ' + name);
    console.error('    ' + String(err && err.message || err).split('\n').join('\n    '));
  }
}

function near(actual, expected, tolerance, label) {
  const ok = Math.abs(actual - expected) <= (tolerance == null ? 0.01 : tolerance);
  assert.ok(ok, (label || '数值') + ' 期望 ' + expected + '，实际 ' + actual);
}

console.log('\n[core] 代谢与营养计算');

const profile = {
  sex: 'male', age: 25, height: 175, weight: 70,
  bodyFat: null, activity: 'light', goal: 'cut', days: 3,
  experience: 'beginner', diet: 'normal', equipment: 'gym'
};

test('Mifflin-St Jeor 男性 BMR = 1674', () => {
  const bmr = core.calcBmr(profile);
  assert.strictEqual(bmr.formula, 'Mifflin-St Jeor');
  assert.strictEqual(bmr.value, 1674);
});

test('女性 BMR 系数为 -161', () => {
  const bmr = core.calcBmr(Object.assign({}, profile, { sex: 'female' }));
  // 10*70 + 6.25*175 - 5*25 - 161 = 1507.75
  assert.strictEqual(bmr.value, 1508);
});

test('体脂率已知时切到 Katch-McArdle', () => {
  const bmr = core.calcBmr(Object.assign({}, profile, { bodyFat: 20 }));
  assert.strictEqual(bmr.formula, 'Katch-McArdle');
  assert.ok(bmr.value > 0);
});

test('TDEE（轻度活动 1.375）≈ 2301', () => {
  const tdee = core.calcTdee(1673.75, 'light');
  assert.strictEqual(tdee, 2301);
});

const plan = core.calcNutrition(profile, 15);

test('减脂 15% 缺口 → 目标 1956 kcal', () => {
  assert.strictEqual(plan.target, 1956);
  assert.strictEqual(plan.tdee, 2301);
  assert.strictEqual(plan.delta, -345);
  assert.strictEqual(plan.adjust, 15);
});

test('宏量：蛋白 154g / 碳水 214g / 脂肪 54g', () => {
  assert.strictEqual(plan.protein, 154);
  assert.strictEqual(plan.carbs, 214);
  assert.strictEqual(plan.fat, 54);
  assert.strictEqual(plan.proteinPerKg, 2.2);
});

test('宏量占比 31% / 44% / 25%', () => {
  assert.strictEqual(plan.proteinPct, 31);
  assert.strictEqual(plan.carbsPct, 44);
  assert.strictEqual(plan.fatPct, 25);
});

test('饮水 2450ml', () => {
  assert.strictEqual(plan.water, 2450);
});

test('每周减重 0.31kg / 0.6 斤', () => {
  assert.strictEqual(plan.weeklyKg, 0.31);
  assert.strictEqual(plan.weeklyJin, 0.6);
});

test('推荐区间校验：蛋白与脂肪都在区间内', () => {
  const check = core.macroCheck(plan);
  assert.ok(check.proteinOk);
  assert.ok(check.fatOk);
});

test('增肌：默认 12% 盈余，蛋白 1.8g/kg', () => {
  const bulk = core.calcNutrition(Object.assign({}, profile, { goal: 'bulk' }));
  assert.strictEqual(bulk.adjust, 12);
  // 上游按未取整 TDEE（2301.406）× 1.12 = 2577.6 → 2578
  assert.strictEqual(bulk.target, 2578);
  assert.strictEqual(bulk.protein, 126);
  assert.strictEqual(bulk.carbs, 357);
  assert.strictEqual(bulk.fat, 72);
  assert.ok(bulk.target > bulk.tdee);
});

test('保持：热量等于 TDEE，蛋白 1.6g/kg', () => {
  const keep = core.calcNutrition(Object.assign({}, profile, { goal: 'maintain' }));
  assert.strictEqual(keep.target, keep.tdee);
  assert.strictEqual(keep.target, 2301);
  assert.strictEqual(keep.protein, 112);
  assert.strictEqual(keep.carbs, 319);
  assert.strictEqual(keep.fat, 64);
});

test('缺口超过范围被夹到 20%', () => {
  const p = core.calcNutrition(profile, 99);
  assert.strictEqual(p.adjust, 20);
});

console.log('\n[core] 单位换算');

test('kg ↔ 斤', () => {
  assert.strictEqual(core.kgToJin(70), 140);
  assert.strictEqual(core.jinToKg(140), 70);
  assert.strictEqual(core.displayWeight(70, 'jin').text, '140 斤');
  assert.strictEqual(core.displayWeight(70, 'kg').text, '70 kg');
});

test('cm ↔ 英尺英寸', () => {
  const ft = core.cmToFtIn(175);
  assert.strictEqual(ft.ft, 5);
  assert.strictEqual(ft.inch, 9);
  near(core.ftInToCm(ft.ft, ft.inch), 175.26, 0.3);
});

console.log('\n[core] 日期与日历');

test('ISO 星期与日期格式化', () => {
  assert.strictEqual(core.isoWeekday('2026-11-02'), 1); // 周一
  assert.strictEqual(core.isoDate(new Date(2026, 10, 2)), '2026-11-02');
  assert.strictEqual(core.fmtMonthCN(2026, 10), '2026 年 11 月');
});

test('月历矩阵：周一开头、6×7、含上下月补位', () => {
  const weeks = core.monthMatrix(2026, 10); // 2026-11
  assert.strictEqual(weeks.length >= 5, true);
  weeks.forEach((row) => assert.strictEqual(row.length, 7));
  assert.strictEqual(weeks[0][0].weekday, 1);
  const allDays = weeks.flat();
  assert.ok(allDays.some((d) => d.date === '2026-11-01' && d.inMonth));
  assert.ok(allDays.some((d) => d.date === '2026-11-30' && d.inMonth));
});

test('连续打卡天数', () => {
  const checkins = { '2026-11-02': '推 A', '2026-11-01': '拉 A', '2026-10-31': '腿 A' };
  assert.strictEqual(core.streakDays(checkins, '2026-11-02'), 3);
  assert.strictEqual(core.streakDays(checkins, '2026-11-03'), 3); // 今天没练，从昨天算
  assert.strictEqual(core.streakDays({}, '2026-11-03'), 0);
});

console.log('\n[core] 训练容量与解析');

test('次数解析支持区间与单值', () => {
  assert.strictEqual(core.parseReps('8-12'), 10);
  assert.strictEqual(core.parseReps('10'), 10);
  assert.strictEqual(core.parseReps('12–15'), 13.5);
  assert.strictEqual(core.parseReps(''), 0);
});

test('训练容量 = 组数 × 平均次数 之和', () => {
  const volume = core.sessionVolume([
    { sets: 3, reps: '8-10' },
    { sets: 2, reps: '12-15' }
  ]);
  assert.strictEqual(volume, 3 * 9 + 2 * 13.5);
});

console.log('\n[core] 导出');

test('CSV 转义引号与逗号', () => {
  const csv = core.toCsv([['名称', '值'], ['鸡胸, "熟"', 133]]);
  assert.strictEqual(csv.split('\r\n')[0], '名称,值');
  assert.ok(csv.indexOf('"鸡胸, ""熟"""') !== -1);
});

test('ICS 结构完整：VCALENDAR / RRULE / VALARM', () => {
  const ics = core.buildIcs({ weekdays: [1, 3, 5], time: '18:30', leadMinutes: 30, weeks: 4, dayTitles: ['推 A', '拉 A', '腿 A'] });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.trim().endsWith('END:VCALENDAR'));
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.strictEqual((ics.match(/RRULE:FREQ=WEEKLY;COUNT=4/g) || []).length, 3);
  assert.strictEqual((ics.match(/TRIGGER:-PT30M/g) || []).length, 3);
  assert.ok(ics.indexOf('\r\n') !== -1, '应使用 CRLF 换行');
  // 每行不超过 75 字节
  ics.split('\r\n').forEach((line) => {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, '行超长：' + line);
  });
});

test('HTML 转义', () => {
  assert.strictEqual(core.escapeHtml('<b>"x"&</b>'), '&lt;b&gt;&quot;x&quot;&amp;&lt;/b&gt;');
});

console.log('\n[core] 热量估算（MET）');

test('复合动作 MET 高于孤立动作', () => {
  assert.ok(core.metForExercise({ key: 'squat' }) > core.metForExercise({ key: 'curl' }));
  assert.strictEqual(core.metForExercise({ key: 'squat' }), 6.5);
  assert.strictEqual(core.metForExercise({ key: 'curl' }), 4.0);
  assert.strictEqual(core.metForExercise({ group: 'quads' }), 6.0);
});

test('估算一次训练：78kg / 54 分钟 / 3 组卧推 + 4 组深蹲 = 448 kcal', () => {
  const r = core.estimateCalories({
    weightKg: 78,
    durationMin: 54,
    sets: [
      { key: 'bench', sets: 3 },
      { key: 'squat', sets: 4 }
    ]
  });
  assert.strictEqual(r.totalSets, 7);
  assert.strictEqual(r.minutes, 54);
  assert.strictEqual(r.met, 6.1);
  assert.strictEqual(r.kcal, 448);
});

test('没有时长记录时按「每组约 1.6 分钟」估算', () => {
  const r = core.estimateCalories({ weightKg: 70, sets: [{ group: 'chest', sets: 10 }] });
  assert.strictEqual(r.minutes, 16);
  assert.strictEqual(r.kcal, 98);
});

test('没有完成任何组时热量为 0', () => {
  const r = core.estimateCalories({ weightKg: 70, durationMin: 30, sets: [] });
  assert.strictEqual(r.kcal, 0);
  assert.strictEqual(r.totalSets, 0);
});

test('体重越界被夹紧（30–200kg）', () => {
  const heavy = core.estimateCalories({ weightKg: 999, durationMin: 60, sets: [{ key: 'squat', sets: 10 }] });
  const capped = core.estimateCalories({ weightKg: 200, durationMin: 60, sets: [{ key: 'squat', sets: 10 }] });
  assert.strictEqual(heavy.kcal, capped.kcal);
});

console.log('\n[core] 档案归一化');

test('越界输入被夹紧、非法枚举回退默认', () => {
  const p = core.normalizeProfile({ sex: 'x', age: 999, height: 10, weight: 999, activity: 'nope', goal: 'nope', days: 99 });
  assert.strictEqual(p.sex, 'male');
  assert.strictEqual(p.age, 90);
  assert.strictEqual(p.height, 120);
  assert.strictEqual(p.weight, 200);
  assert.strictEqual(p.activity, 'light');
  assert.strictEqual(p.goal, 'cut');
  assert.strictEqual(p.days, 6);
  assert.strictEqual(p.bodyFat, null);
});

console.log('\n----------------------------------------');
console.log('通过 ' + passed + ' 项，失败 ' + failed + ' 项');
if (failed > 0) process.exitCode = 1;