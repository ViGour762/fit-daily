#!/usr/bin/env node
/**
 * nutrition.test.js — 营养数据完整性 + 与上游参考值一致性（零依赖）
 * 用法：node tests/nutrition.test.js
 */
'use strict';

const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const nutrition = require(path.join(ROOT, 'js', 'nutrition.js'));
const core = require(path.join(ROOT, 'js', 'core.js'));

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

console.log('\n[nutrition] 食物表');

const foods = nutrition.foods || [];

test('食物 20 条以上', () => {
  assert.ok(foods.length >= 20, '只有 ' + foods.length + ' 条');
});

test('每条食物都有名称/份量/热量/蛋白质/碳水/脂肪', () => {
  const bad = foods.filter((f) => !f.name || !f.portion ||
    !isFinite(f.kcal) || !isFinite(f.protein) || !isFinite(f.carbs) || !isFinite(f.fat));
  assert.strictEqual(bad.length, 0, '字段缺失：' + bad.map((f) => f.name || '?').join(', '));
});

test('热量与三大营养素基本自洽（4/4/9 换算，允许 ±15% 或 10 kcal）', () => {
  const bad = [];
  foods.forEach((f) => {
    const calc = f.protein * 4 + f.carbs * 4 + f.fat * 9;
    if (calc <= 0) return;
    const diffAbs = Math.abs(calc - f.kcal);
    const diffPct = diffAbs / Math.max(f.kcal, 1);
    // 蔬菜类膳食纤维占比高，4/4/9 粗算天然偏高，故放宽到 10 kcal 绝对误差
    if (diffPct > 0.15 && diffAbs > 10) {
      bad.push(f.name + '（标 ' + f.kcal + '，算 ' + Math.round(calc) + '）');
    }
  });
  assert.strictEqual(bad.length, 0, '能量不自洽：' + bad.join('；'));
});

test('代表性食物数值与上游一致', () => {
  const chicken = foods.find((f) => f.name.indexOf('鸡胸肉') === 0);
  assert.ok(chicken);
  assert.strictEqual(chicken.kcal, 133);
  assert.strictEqual(chicken.protein, 27);
  const egg = foods.find((f) => f.name === '鸡蛋');
  assert.ok(egg);
  assert.strictEqual(egg.kcal, 72);
  assert.strictEqual(egg.protein, 6.5);
});

console.log('\n[nutrition] 餐单');

const plans = nutrition.mealPlans || {};

test('覆盖 4 种饮食偏好', () => {
  ['normal', 'vegetarian', 'vegan', 'lowcarb'].forEach((k) => {
    assert.ok(plans[k], '缺少 ' + k + ' 餐单');
    assert.ok(plans[k].label, k + ' 缺少 label');
  });
});

test('每种偏好 × 三种目标都有 4 餐且热量递减合理', () => {
  Object.keys(plans).forEach((pref) => {
    const plan = plans[pref];
    const byGoal = plan.mealsByGoal || {};
    ['cut', 'bulk', 'maintain'].forEach((goal) => {
      let meals = byGoal[goal] || plan.meals;
      assert.ok(Array.isArray(meals) && meals.length >= 3, pref + '/' + goal + ' 餐次不足');
      meals.forEach((m) => {
        assert.ok(m.name && isFinite(m.kcal), pref + '/' + goal + ' 餐次字段缺失');
      });
      if (goal === 'bulk' && byGoal.cut) {
        const sumCut = byGoal.cut.reduce((s, m) => s + m.kcal, 0);
        const sumBulk = byGoal.bulk.reduce((s, m) => s + m.kcal, 0);
        assert.ok(sumBulk > sumCut, pref + ' 增肌餐单总热量应高于减脂');
      }
    });
  });
});

test('每种餐单提供蛋白质来源替换项', () => {
  Object.keys(plans).forEach((pref) => {
    const src = plans[pref].proteinSources || [];
    assert.ok(src.length >= 2, pref + ' 蛋白质来源不足');
    src.forEach((s) => assert.ok(s.label, pref + ' 来源缺少 label'));
  });
});

console.log('\n[nutrition] 购物清单与参考');

test('购物清单含 8 项以上并带用量', () => {
  const list = nutrition.shoppingList || [];
  const first = (plans.normal && plans.normal.shopping) || [];
  const items = list.length ? list : first;
  assert.ok(items.length >= 8, '购物清单只有 ' + items.length + ' 项');
  items.forEach((it) => assert.ok(it.name && it.amount, '购物项缺字段：' + JSON.stringify(it)));
});

test('参考文献 6 条', () => {
  assert.strictEqual((nutrition.refs || []).length, 6);
});

console.log('\n[nutrition] 与上游参考值一致（男 25 / 175cm / 70kg / 轻度活动）');

const ref = nutrition.referenceProfile || { sex: 'male', age: 25, height: 175, weight: 70, activity: 'light' };
const targets = nutrition.referenceTargets || {};

['cut', 'bulk', 'maintain'].forEach((goal) => {
  test(goal + ' 目标与上游 referenceTargets 一致', () => {
    const expect = targets[goal];
    assert.ok(expect, '缺少 ' + goal + ' 参考值');
    const p = core.calcNutrition(Object.assign({}, ref, { goal: goal, bodyFat: null }), expect.deficit != null ? Math.round(expect.deficit * 100) : undefined);
    assert.strictEqual(p.bmr, expect.bmr, 'BMR');
    assert.strictEqual(p.tdee, expect.tdee, 'TDEE');
    assert.strictEqual(p.target, expect.calories, '目标热量');
    assert.strictEqual(p.protein, expect.protein, '蛋白质');
    assert.strictEqual(p.carbs, expect.carbs, '碳水');
    assert.strictEqual(p.fat, expect.fat, '脂肪');
    assert.strictEqual(p.water, expect.waterMl, '饮水');
    assert.strictEqual(p.proteinPerKg, expect.proteinPerKg, 'g/kg');
    assert.strictEqual(p.fatEnergyPct, expect.fatPct, '脂肪供能%');
  });
});

test('goalConfig 与 core.GOALS 常量一致', () => {
  const gc = nutrition.goalConfig || {};
  Object.keys(gc).forEach((k) => {
    const g = core.GOALS[k];
    assert.ok(g, 'core 缺少目标 ' + k);
    assert.strictEqual(g.proteinPerKg, gc[k].proteinPerKg, k + ' 蛋白质系数');
    assert.strictEqual(g.fatPct, gc[k].fatRatio, k + ' 脂肪比例');
    if (gc[k].proteinRange) {
      assert.deepStrictEqual(g.proteinRange, gc[k].proteinRange, k + ' 蛋白质区间');
    }
    if (gc[k].deficit) {
      const pct = [Math.round(gc[k].deficit.min * 100), Math.round(gc[k].deficit.max * 100)];
      assert.deepStrictEqual(g.adjustRange, pct, k + ' 调整区间');
    }
  });
});

test('活动系数与上游 activityLevels 一致', () => {
  const levels = nutrition.activityLevels || {};
  const keys = Object.keys(levels);
  if (!keys.length) return; // 数据未提供则跳过
  keys.forEach((k) => {
    assert.ok(core.ACTIVITY[k], 'core 缺少活动水平 ' + k);
    const factor = typeof levels[k] === 'number' ? levels[k] : levels[k].factor;
    if (isFinite(factor)) assert.strictEqual(core.ACTIVITY[k].factor, factor, k + ' 系数');
  });
});

console.log('\n----------------------------------------');
console.log('通过 ' + passed + ' 项，失败 ' + failed + ' 项');
if (failed > 0) process.exitCode = 1;