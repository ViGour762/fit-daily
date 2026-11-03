#!/usr/bin/env node
/**
 * data.test.js — 训练数据完整性校验（零依赖）
 * 用法：node tests/data.test.js
 */
'use strict';

const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const data = require(path.join(ROOT, 'js', 'data.js'));

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

const list = Array.isArray(data.exercises)
  ? data.exercises
  : Object.keys(data.exercises).map((k) => Object.assign({ key: k }, data.exercises[k]));

const byKey = {};
list.forEach((ex) => { byKey[ex.key] = ex; });

console.log('\n[data] 动作库');

test('动作数量 ≥ 40（与上游 40 张演示图对应）', () => {
  assert.ok(list.length >= 40, '动作只有 ' + list.length + ' 条');
});

test('每个动作都有 key / name / muscle / sets / reps / rest', () => {
  const bad = list.filter((ex) => !ex.key || !ex.name || !ex.muscle ||
    !(ex.sets >= 1) || !ex.reps || !(ex.rest > 0));
  assert.strictEqual(bad.length, 0, '缺字段：' + bad.map((e) => e.key || e.name).join(', '));
});

test('演示图路径为 img/<imageKey>.webp（变式动作共用同一张图）', () => {
  const bad = list.filter((ex) => ex.img && ex.img !== 'img/' + (ex.imageKey || ex.key) + '.webp');
  assert.strictEqual(bad.length, 0, '路径不一致：' + bad.map((e) => e.key).join(', '));
});

test('imageKeys 的 40 个 key 与动作库对应', () => {
  const imageKeys = data.imageKeys || {};
  const keys = Object.keys(imageKeys);
  assert.ok(keys.length >= 40, 'imageKeys 只有 ' + keys.length + ' 个');
  const missing = keys.filter((k) => !list.some((ex) => (ex.imageKey || ex.key) === k));
  assert.strictEqual(missing.length, 0, '没有动作使用演示图：' + missing.join(', '));
  keys.forEach((k) => {
    assert.strictEqual(imageKeys[k], 'img/' + k + '.webp', 'imageKeys 路径异常：' + k);
  });
});

test('动作 key 不重复', () => {
  const seen = new Set();
  const dup = [];
  list.forEach((ex) => { if (seen.has(ex.key)) dup.push(ex.key); seen.add(ex.key); });
  assert.strictEqual(dup.length, 0, '重复 key：' + dup.join(', '));
});

console.log('\n[data] 计划模板');

const templates = data.templates || {};
['gym', 'home'].forEach((eq) => {
  test(eq + ' 覆盖 2/3/4/5/6 天全部组合', () => {
    assert.ok(templates[eq], '缺少 ' + eq + ' 模板');
    [2, 3, 4, 5, 6].forEach((d) => {
      const days = templates[eq][d] || templates[eq][String(d)];
      assert.ok(Array.isArray(days) && days.length === d, eq + ' ' + d + ' 天模板异常');
    });
  });

  test(eq + ' 每天都有标题、肌群和 4 个以上动作', () => {
    [2, 3, 4, 5, 6].forEach((d) => {
      const days = templates[eq][d] || templates[eq][String(d)];
      days.forEach((day) => {
        assert.ok(day.title, eq + ' ' + d + '天 有训练日缺标题');
        assert.ok(day.muscles, day.title + ' 缺肌群');
        const items = day.items || [];
        assert.ok(items.length >= 4, day.title + ' 只有 ' + items.length + ' 个动作');
      });
    });
  });

  test(eq + ' 模板里的动作 key 都存在', () => {
    const missing = [];
    [2, 3, 4, 5, 6].forEach((d) => {
      const days = templates[eq][d] || templates[eq][String(d)];
      days.forEach((day) => (day.items || []).forEach((it) => {
        if (!byKey[it.key]) missing.push(it.key);
      }));
    });
    assert.strictEqual(missing.length, 0, '未知动作：' + Array.from(new Set(missing)).join(', '));
  });
});

test('4 天「胸·背·肩·腿」分化模板：gym/home 各 4 天、每天 4+ 动作、动作 key 都存在', () => {
  ['gym', 'home'].forEach((eq) => {
    const days = (templates[eq] || {})['4-bro'];
    assert.ok(Array.isArray(days) && days.length === 4, eq + ' 缺少 4-bro 模板');
    const titles = days.map((d) => d.title);
    assert.deepStrictEqual(titles, ['胸日', '背日', '肩日', '腿日'], eq + ' 4-bro 标题异常：' + titles.join('/'));
    days.forEach((day) => {
      assert.ok(day.muscles, day.title + ' 缺肌群');
      const items = day.items || [];
      assert.ok(items.length >= 4, day.title + ' 动作太少：' + items.length);
      items.forEach((it) => {
        assert.ok(byKey[it.key], day.title + ' 引用了不存在的动作：' + it.key);
        assert.ok(it.sets >= 1 && it.reps && it.rest > 0, day.title + ' / ' + it.key + ' 组次数休息不全');
      });
    });
    // 每个部位只出现一次（真正的单部位分化）
    const groups = days.map((d) => d.dayKey);
    assert.strictEqual(new Set(groups).size, 4, eq + ' 4-bro 部位重复：' + groups.join('/'));
  });
});

test('6 天模板 A/B 轮换有效（上游居家 6 天本就重复同一套，仅器械有 B 版）', () => {
  const gymDays = templates.gym[6] || templates.gym['6'];
  const signatures = gymDays.map((d) => (d.items || []).map((i) => i.key).join(','));
  assert.strictEqual(new Set(signatures).size, signatures.length,
    '器械 6 天模板有重复训练内容：' + gymDays.map((d) => d.title).join(', '));

  const homeDays = templates.home[6] || templates.home['6'];
  assert.strictEqual(homeDays.length, 6, '居家 6 天模板数量异常');
});

test('没有演示图的动作 img 为空串（渲染层会退到占位图）', () => {
  const noImg = list.filter((ex) => !ex.img);
  noImg.forEach((ex) => {
    assert.ok(ex.name, '无图动作缺名称');
    assert.ok(ex.muscle, ex.name + ' 缺肌群');
  });
  // 至少有动作是无图的（上游 motionFor 返回 null 的 6 条）
  assert.ok(noImg.length >= 1, '应有部分动作没有演示图');
});

console.log('\n[data] 文案与分组');

test('分化名称覆盖 2-6 天', () => {
  [2, 3, 4, 5, 6].forEach((d) => {
    assert.ok(data.splitNames && data.splitNames[d], '缺少 ' + d + ' 天的分化名');
  });
});

test('训练日推荐：支持 0-6（getDay）或 1-7（ISO），数量与天数一致', () => {
  [2, 3, 4, 5, 6].forEach((d) => {
    const arr = (data.weekdayDefaults || {})[d];
    assert.ok(Array.isArray(arr) && arr.length === d, d + ' 天默认训练日异常');
    arr.forEach((w) => assert.ok(w >= 0 && w <= 7, '星期序号越界：' + w));
  });
});

test('肌群分组有中文 label', () => {
  const groups = data.muscleGroups || {};
  const keys = Object.keys(groups);
  assert.ok(keys.length >= 8, '肌群分组太少：' + keys.length);
  keys.forEach((k) => {
    const g = groups[k];
    const label = typeof g === 'string' ? g : (g && g.label);
    assert.ok(label, '肌群 ' + k + ' 缺少 label');
  });
});

test('训练建议按 新手/减脂/增肌/通用 分组', () => {
  const tips = data.tips || {};
  ['beginner', 'cut', 'bulk', 'general'].forEach((k) => {
    assert.ok(Array.isArray(tips[k]) && tips[k].length > 0, '缺少 tips.' + k);
  });
});

console.log('\n----------------------------------------');
console.log('通过 ' + passed + ' 项，失败 ' + failed + ' 项');
if (failed > 0) process.exitCode = 1;