/*!
 * nutrition.js — FitPlan 营养域数据（数据抽取，非上游实现代码）
 * 来源：https://github.com/lihua2779/fit-plan（main 分支 js/app.js，blob 673d70a，126522 B）
 *       与同仓库 README.md（计算原理 / 参考文献）
 * 浏览器：window.FP_NUTRITION   Node：module.exports
 * 说明：所有事实数值均为上游原值逐条抄录；派生值（per100g、参考画像下的餐次营养）
 *       由上游公式确定性推出，见 _meta.derived。上游未给出的字段一律 null，不臆造。
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 0. 参考画像：把「按占比计算」的餐次营养固化成可直接渲染的数值
   *    取值 = 上游 index.html 的默认表单（男 / 25 岁 / 175cm / 70kg /
   *    轻度活动 / 减脂 / 缺口 15%），因此本文件的餐次数值就是上游首屏结果。
   * ------------------------------------------------------------------ */
  var REFERENCE_PROFILE = {
    sex: 'male',
    age: 25,
    height: 175,          // cm
    weight: 70,           // kg
    activity: 'light',    // 1.375
    goal: 'cut',
    deficit: 0.15,        // 结算后：热 1956 / 蛋白 154 / 碳水 214 / 脂肪 54 kcal
    note: '上游至少 15% 缺口为滑杆默认值；增肌默认 12%、保持 0'
  };

  /* 参考画像下的目标值（上游 calcTargets 输出，见 docs/spec-nutrition.md 公式） */
  var REFERENCE_TARGETS = {
    cut:      { bmr: 1674, tdee: 2301, calories: 1956, protein: 154, carbs: 214, fat: 54,
                waterMl: 2450, proteinPerKg: 2.2, fatPct: 25, weeklyChangeKg: 0.314, deficit: 0.15 },
    bulk:     { bmr: 1674, tdee: 2301, calories: 2578, protein: 126, carbs: 357, fat: 72,
                waterMl: 2450, proteinPerKg: 1.8, fatPct: 25, weeklyChangeKg: 0.251, deficit: 0.12 },
    maintain: { bmr: 1674, tdee: 2301, calories: 2301, protein: 112, carbs: 319, fat: 64,
                waterMl: 2450, proteinPerKg: 1.6, fatPct: 25, weeklyChangeKg: 0, deficit: 0 }
  };

  /* ------------------------------------------------------------------ *
   * 1. 常量（上游同名常量原样抄录）
   * ------------------------------------------------------------------ */

  var ACTIVITY_LEVELS = {
    sedentary: { factor: 1.2,   label: '久坐少动' },
    light:     { factor: 1.375, label: '轻度活动' },
    moderate:  { factor: 1.55,  label: '中度活动' },
    active:    { factor: 1.725, label: '高度活动' },
    athlete:   { factor: 1.9,   label: '极高强度' }
  };

  /* 上游 GOAL_CONFIG：calorieRatio 仍保留在配置里，但 calcTargets 已不再使用它，
     实际热量 = tdee × (1 ∓ deficit)（见 docs/spec-nutrition.md §3 差异 1） */
  var GOAL_CONFIG = {
    cut:      { label: '减脂', calorieRatio: 0.85, proteinPerKg: 2.2, fatRatio: 0.25, cardio: true,
                proteinRange: [1.8, 2.7], deficit: { def: 0.15, min: 0.10, max: 0.20 } },
    bulk:     { label: '增肌', calorieRatio: 1.12, proteinPerKg: 1.8, fatRatio: 0.25, cardio: false,
                proteinRange: [1.6, 2.2], deficit: { def: 0.12, min: 0.05, max: 0.15 } },
    maintain: { label: '保持', calorieRatio: 1.0,  proteinPerKg: 1.6, fatRatio: 0.25, cardio: false,
                proteinRange: [1.4, 2.0], deficit: null }
  };

  var EXPERIENCE_LABEL = { beginner: '新手', intermediate: '中级', advanced: '高级' };

  var DIET_CONFIG = {
    normal:     { label: '普通饮食', vegan: false, lowCarb: false },
    vegetarian: { label: '蛋奶素',   vegan: false, lowCarb: false },
    vegan:      { label: '纯素',     vegan: true,  lowCarb: false },
    lowcarb:    { label: '低碳水',   vegan: false, lowCarb: true }
  };

  /* 蛋白质来源替换：只替换「标签 + 每 100g 营养说明文案」，餐次热量/克数不变 */
  var PROTEIN_SOURCES = {
    chicken: { key: 'chicken', label: '鸡胸肉',   kcal: 133, protein: 27, carbs: 0, fat: 3  },
    beef:    { key: 'beef',    label: '瘦牛肉',   kcal: 200, protein: 26, carbs: 0, fat: 10 },
    fish:    { key: 'fish',    label: '鱼虾',     kcal: 165, protein: 26, carbs: 0, fat: 6  },
    tofu:    { key: 'tofu',    label: '豆腐/豆干', kcal: 100, protein: 10, carbs: 4, fat: 5  }
  };

  /* ------------------------------------------------------------------ *
   * 2. foods —— 上游 FOOD_TABLE 全部 22 条（每份，非每 100g）
   * ------------------------------------------------------------------ */
  var foods = [
    { key: 'chicken',        name: '鸡胸肉（熟）', portion: '100g',  grams: 100,  kcal: 133, protein: 27,   carbs: 0,    fat: 3,   source: 'meat'  },
    { key: 'beef',           name: '瘦牛肉（熟）', portion: '100g',  grams: 100,  kcal: 200, protein: 26,   carbs: 0,    fat: 10,  source: 'meat'  },
    { key: 'salmon',         name: '三文鱼',       portion: '100g',  grams: 100,  kcal: 208, protein: 20,   carbs: 0,    fat: 13,  source: 'meat'  },
    { key: 'shrimp',         name: '虾仁',         portion: '100g',  grams: 100,  kcal: 99,  protein: 24,   carbs: 0,    fat: 0.3, source: 'meat'  },
    { key: 'egg',            name: '鸡蛋',         portion: '1 个',  grams: null, kcal: 72,  protein: 6.5,  carbs: 0.5,  fat: 5,   source: 'meat'  },
    { key: 'tofu',           name: '北豆腐',       portion: '100g',  grams: 100,  kcal: 84,  protein: 8,    carbs: 4,    fat: 4,   source: 'plant' },
    { key: 'milk',           name: '全脂牛奶',     portion: '250ml', grams: 250,  kcal: 135, protein: 8,    carbs: 12,   fat: 7,   source: 'dairy' },
    { key: 'greekYogurt',    name: '希腊酸奶',     portion: '100g',  grams: 100,  kcal: 59,  protein: 10,   carbs: 4,    fat: 0.4, source: 'dairy' },
    { key: 'whey',           name: '乳清蛋白粉',   portion: '30g',   grams: 30,   kcal: 120, protein: 24,   carbs: 3,    fat: 1.5, source: 'dairy' },
    { key: 'rice',           name: '米饭（熟）',   portion: '100g',  grams: 100,  kcal: 116, protein: 2.6,  carbs: 26,   fat: 0.3, source: 'carb'  },
    { key: 'mixedRice',      name: '杂粮饭（熟）', portion: '100g',  grams: 100,  kcal: 112, protein: 3.5,  carbs: 23,   fat: 0.7, source: 'carb'  },
    { key: 'oats',           name: '燕麦（干）',   portion: '100g',  grams: 100,  kcal: 389, protein: 16.9, carbs: 66,   fat: 6.9, source: 'carb'  },
    { key: 'sweetPotato',    name: '红薯',         portion: '100g',  grams: 100,  kcal: 86,  protein: 1.6,  carbs: 20,   fat: 0.1, source: 'carb'  },
    { key: 'wholeWheatBread', name: '全麦面包',    portion: '2 片',  grams: null, kcal: 160, protein: 6,    carbs: 28,   fat: 2.5, source: 'carb'  },
    { key: 'banana',         name: '香蕉',         portion: '1 根',  grams: null, kcal: 93,  protein: 1.4,  carbs: 22,   fat: 0.2, source: 'fruit' },
    { key: 'apple',          name: '苹果',         portion: '1 个',  grams: null, kcal: 95,  protein: 0.5,  carbs: 25,   fat: 0.3, source: 'fruit' },
    { key: 'broccoli',       name: '西兰花',       portion: '100g',  grams: 100,  kcal: 36,  protein: 4.1,  carbs: 4.3,  fat: 0.6, source: 'veg'   },
    { key: 'spinach',        name: '菠菜',         portion: '100g',  grams: 100,  kcal: 23,  protein: 2.9,  carbs: 3.6,  fat: 0.4, source: 'veg'   },
    { key: 'oliveOil',       name: '橄榄油',       portion: '1 勺',  grams: null, kcal: 90,  protein: 0,    carbs: 0,    fat: 10,  source: 'fat'   },
    { key: 'almonds',        name: '杏仁',         portion: '28g',   grams: 28,   kcal: 164, protein: 6,    carbs: 6,    fat: 14,  source: 'fat'   },
    { key: 'peanutButter',   name: '花生酱',       portion: '16g',   grams: 16,   kcal: 95,  protein: 4,    carbs: 3.5,  fat: 8,   source: 'fat'   },
    { key: 'watermelon',     name: '西瓜',         portion: '200g',  grams: 200,  kcal: 60,  protein: 1.2,  carbs: 15,   fat: 0.2, source: 'fruit' }
  ];

  /* ------------------------------------------------------------------ *
   * 3. 每日餐单：餐次占比来自上游 MEAL_PLANS[goal].meals
   *    文案来自上游 mealSampleText(goal, diet, proteinLabel)
   *    营养数值 = Math.round(参考画像 targets × pct)（上游 buildDietPlan 的算法）
   *    {protein} 占位符 = 当前蛋白质来源的 label
   * ------------------------------------------------------------------ */

  var MEAL_KEYS = {
    早餐: 'breakfast', 午餐: 'lunch', 加餐: 'snack', 晚餐: 'dinner',
    上午加餐: 'morningSnack', 练前_练后加餐: 'prePostSnack'
  };

  function meal(key, name, pct, kcal, protein, carbs, fat, desc, descTemplate) {
    return {
      key: key, name: name, pct: pct,
      kcal: kcal, protein: protein, carbs: carbs, fat: fat,
      desc: desc, descTemplate: descTemplate || desc
    };
  }

  /* 减脂餐次（25 / 35 / 10 / 30 %） */
  var CUT_MEALS = {
    normal: [
      meal('breakfast', '早餐', 0.25, 489, 39, 54, 14,
        '燕麦 50g + 水煮蛋 2 个 + 水果 1 份'),
      meal('lunch', '午餐', 0.35, 685, 54, 75, 19,
        '杂粮饭 150g + 鸡胸肉 150g + 蔬菜 1 大份 + 橄榄油 1 勺',
        '杂粮饭 150g + {protein} 150g + 蔬菜 1 大份 + 橄榄油 1 勺'),
      meal('snack', '加餐', 0.10, 196, 15, 21, 5,
        '希腊酸奶 1 杯 + 苹果/蓝莓 1 份'),
      meal('dinner', '晚餐', 0.30, 587, 46, 64, 16,
        '红薯/糙米 150g + 鸡胸肉 150g + 蔬菜 2 大份',
        '红薯/糙米 150g + {protein} 150g + 蔬菜 2 大份')
    ],
    lowcarb: [
      meal('breakfast', '早餐', 0.25, 489, 39, 54, 14,
        '水煮蛋 2 个 + 蔬菜 1 份 + 牛油果 1/4 个'),
      meal('lunch', '午餐', 0.35, 685, 54, 75, 19,
        '鸡胸肉 180g + 蔬菜 2 大份 + 橄榄油 1 勺',
        '{protein} 180g + 蔬菜 2 大份 + 橄榄油 1 勺'),
      meal('snack', '加餐', 0.10, 196, 15, 21, 5,
        '希腊酸奶 1 杯 + 坚果 10g'),
      meal('dinner', '晚餐', 0.30, 587, 46, 64, 16,
        '鸡胸肉 180g + 蔬菜 2 大份',
        '{protein} 180g + 蔬菜 2 大份')
    ]
  };

  /* 增肌餐次（25 / 10 / 30 / 10 / 25 %） */
  var BULK_MEALS = {
    normal: [
      meal('breakfast', '早餐', 0.25, 645, 32, 89, 18,
        '燕麦 80g + 牛奶 250ml + 鸡蛋 3 个 + 香蕉 1 根'),
      meal('morningSnack', '上午加餐', 0.10, 258, 13, 36, 7,
        '全麦面包 2 片 + 花生酱 1 勺 + 希腊酸奶 1 杯'),
      meal('lunch', '午餐', 0.30, 773, 38, 107, 22,
        '米饭 250g + 鸡胸肉 200g + 蔬菜 1 大份',
        '米饭 250g + {protein} 200g + 蔬菜 1 大份'),
      meal('prePostSnack', '练前 / 练后加餐', 0.10, 258, 13, 36, 7,
        '练后：乳清蛋白 1 勺 + 香蕉 1 根 / 米饭 150g + 蛋白 100g'),
      meal('dinner', '晚餐', 0.25, 645, 32, 89, 18,
        '米饭 200g + 鸡胸肉 200g + 蔬菜 2 大份 + 橄榄油 1 勺',
        '米饭 200g + {protein} 200g + 蔬菜 2 大份 + 橄榄油 1 勺')
    ],
    lowcarb: [
      meal('breakfast', '早餐', 0.25, 645, 32, 89, 18,
        '鸡蛋 3 个 + 牛油果 1/2 个 + 蔬菜 1 份'),
      meal('morningSnack', '上午加餐', 0.10, 258, 13, 36, 7,
        '鸡胸肉 200g + 蔬菜 1 大份 + 橄榄油 1 勺',
        '{protein} 200g + 蔬菜 1 大份 + 橄榄油 1 勺'),
      meal('lunch', '午餐', 0.30, 773, 38, 107, 22,
        '希腊酸奶 1 杯 + 坚果 15g'),
      meal('prePostSnack', '练前 / 练后加餐', 0.10, 258, 13, 36, 7,
        '练后：乳清蛋白 1 勺 + 香蕉 1 根'),
      meal('dinner', '晚餐', 0.25, 645, 32, 89, 18,
        '鸡胸肉 220g + 蔬菜 2 大份 + 橄榄油 1 勺',
        '{protein} 220g + 蔬菜 2 大份 + 橄榄油 1 勺')
    ]
  };

  /* 保持餐次（25 / 35 / 10 / 30 %） */
  var MAINTAIN_MEALS = {
    normal: [
      meal('breakfast', '早餐', 0.25, 575, 28, 80, 16,
        '燕麦 60g + 牛奶 250ml + 鸡蛋 2 个 + 水果 1 份'),
      meal('lunch', '午餐', 0.35, 805, 39, 112, 22,
        '杂粮饭 200g + 鸡胸肉 150g + 蔬菜 1 大份 + 橄榄油 1 勺',
        '杂粮饭 200g + {protein} 150g + 蔬菜 1 大份 + 橄榄油 1 勺'),
      meal('snack', '加餐', 0.10, 230, 11, 32, 6,
        '希腊酸奶 1 杯 + 坚果 10g'),
      meal('dinner', '晚餐', 0.30, 690, 34, 96, 19,
        '红薯/糙米 180g + 鸡胸肉 150g + 蔬菜 2 大份',
        '红薯/糙米 180g + {protein} 150g + 蔬菜 2 大份')
    ],
    lowcarb: [
      meal('breakfast', '早餐', 0.25, 575, 28, 80, 16,
        '水煮蛋 2 个 + 蔬菜 1 份 + 牛油果 1/4 个'),
      meal('lunch', '午餐', 0.35, 805, 39, 112, 22,
        '鸡胸肉 170g + 蔬菜 2 大份 + 橄榄油 1 勺',
        '{protein} 170g + 蔬菜 2 大份 + 橄榄油 1 勺'),
      meal('snack', '加餐', 0.10, 230, 11, 32, 6,
        '希腊酸奶 1 杯 + 坚果 10g'),
      meal('dinner', '晚餐', 0.30, 690, 34, 96, 19,
        '鸡胸肉 170g + 蔬菜 2 大份',
        '{protein} 170g + 蔬菜 2 大份')
    ]
  };

  /* 纯素替代规则（上游 mealSampleText 的 veg 分支）：置换词表 */
  var VEGAN_SUBSTITUTIONS = {
    milk:  { from: '牛奶',      to: '豆浆' },
    eggs2: { from: '水煮蛋 2 个', to: '豆腐/天贝 120g' },
    eggs3: { from: '鸡蛋 3 个',  to: '天贝/豆腐 150g' },
    dairy: { from: '希腊酸奶 1 杯', to: '豆浆 1 杯' },
    fruit: { from: '水果 1 份',  to: '水果 1 份' },
    fruitLowCarb: { from: '水果 1 份', to: '小份莓果' }
  };

  /* 把 {protein} 与纯素替换应用后的完整文案（上游 mealSampleText 的输出） */
  function renderDesc(template, proteinLabel, vegan, lowCarb) {
    var s = String(template).replace(/\{protein\}/g, proteinLabel);
    if (vegan) {
      s = s.replace(/牛奶 250ml/g, '豆浆 250ml')
           .replace(/水煮蛋 2 个/g, '豆腐/天贝 120g')
           .replace(/鸡蛋 3 个/g, '天贝/豆腐 150g')
           .replace(/希腊酸奶 1 杯/g, '豆浆 1 杯')
           .replace(/水果 1 份/g, lowCarb ? '小份莓果' : '水果 1 份');
    }
    return s;
  }

  /* ------------------------------------------------------------------ *
   * 4. 一周购物清单（上游 buildShoppingList(goal, diet, proteinLabel)）
   *    protG：减脂 150 / 增肌 200 / 保持 160（g/天）→ 周量 = protG × 7
   *    注意：上游只按「目标」分三档，并未按实际目标热量连续缩放。
   * ------------------------------------------------------------------ */
  var SHOP_PROT_G = { cut: 150, bulk: 200, maintain: 160 };

  function shopItems(goal, diet, proteinLabel) {
    var cfg = DIET_CONFIG[diet];
    var vegan = cfg.vegan;
    var lowCarb = cfg.lowCarb;
    var protG = SHOP_PROT_G[goal];
    var items = [];
    items.push({ name: proteinLabel, amount: (protG * 7) + 'g', perDay: protG,
                 note: '按 150/160/200 g 蛋白质/天 × 7 天' });
    if (!vegan) {
      items.push({ name: '鸡蛋', amount: goal === 'bulk' ? '21 个' : '14 个',
                   perDay: goal === 'bulk' ? 3 : 2, note: null });
      items.push({ name: '牛奶/酸奶', amount: '7 杯', perDay: 1, note: null });
    } else {
      items.push({ name: '豆浆', amount: '7 杯', perDay: 1, note: null });
      items.push({ name: '天贝/豆腐（额外）', amount: '700g', perDay: 100, note: null });
    }
    if (!lowCarb) {
      items.push({ name: '燕麦', amount: goal === 'bulk' ? '560g' : '350g',
                   perDay: goal === 'bulk' ? 80 : 50, note: null });
      items.push({ name: '米饭/杂粮饭', amount: goal === 'bulk' ? '3kg' : '1.5kg',
                   perDay: null, note: null });
      items.push({ name: '红薯/糙米', amount: '500g', perDay: null, note: null });
    }
    items.push({ name: '蔬菜（西兰花/菠菜等）', amount: lowCarb ? '3kg' : '2kg', perDay: null, note: null });
    items.push({ name: '水果/莓果', amount: lowCarb ? '500g' : '7 份', perDay: lowCarb ? null : 1, note: null });
    items.push({ name: '坚果', amount: '150g', perDay: null, note: null });
    items.push({ name: '橄榄油', amount: '1 瓶', perDay: null, note: null });
    return items;
  }

  /* ------------------------------------------------------------------ *
   * 5. mealPlans：按饮食偏好组装（normal / vegetarian / vegan / lowcarb）
   *    - normal 与 vegetarian 文案、购物清单完全一致（上游只有 vegan 与
   *      lowCarb 两个开关；蛋奶素只影响提示文案）
   *    - meals 默认取「减脂」版本（对齐承接方的渲染契约），三目标全量在 mealsByGoal
   * ------------------------------------------------------------------ */
  function buildPlan(dietKey) {
    var cfg = DIET_CONFIG[dietKey];
    var lowCarb = cfg.lowCarb;
    var vegan = cfg.vegan;
    var defaultProtein = vegan ? 'tofu' : 'chicken';
    var proteinLabel = PROTEIN_SOURCES[defaultProtein].label;

    function goalMeals(goal) {
      var base = goal === 'cut' ? CUT_MEALS : goal === 'bulk' ? BULK_MEALS : MAINTAIN_MEALS;
      var branch = lowCarb ? base.lowcarb : base.normal;
      return branch.map(function (m) {
        return {
          key: m.key,
          name: m.name,
          pct: m.pct,
          kcal: m.kcal,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          desc: renderDesc(m.descTemplate, proteinLabel, vegan, lowCarb),
          descTemplate: m.descTemplate
        };
      });
    }

    return {
      key: dietKey,
      label: cfg.label,
      vegan: vegan,
      lowCarb: lowCarb,
      defaultProteinSource: defaultProtein,
      meals: goalMeals('cut'),
      mealsByGoal: {
        cut: goalMeals('cut'),
        bulk: goalMeals('bulk'),
        maintain: goalMeals('maintain')
      },
      targets: REFERENCE_TARGETS,
      proteinSources: ['chicken', 'beef', 'fish', 'tofu'].map(function (k) {
        var s = PROTEIN_SOURCES[k];
        return {
          key: s.key,
          label: s.label,
          note: '每 100g：' + s.kcal + ' kcal · 蛋白 ' + s.protein + 'g · 碳水 ' + s.carbs + 'g · 脂肪 ' + s.fat + 'g',
          per100g: { kcal: s.kcal, protein: s.protein, carbs: s.carbs, fat: s.fat }
        };
      }),
      shopping: shopItems('cut', dietKey, proteinLabel),
      shoppingByGoal: {
        cut: shopItems('cut', dietKey, proteinLabel),
        bulk: shopItems('bulk', dietKey, proteinLabel),
        maintain: shopItems('maintain', dietKey, proteinLabel)
      }
    };
  }

  var mealPlans = {
    normal: buildPlan('normal'),
    vegetarian: buildPlan('vegetarian'),
    vegan: buildPlan('vegan'),
    lowcarb: buildPlan('lowcarb')
  };

  /* 扁平版购物清单：shoppingList[diet][goal] = [...]（与 mealPlans[diet].shoppingByGoal 同源） */
  var shoppingList = {};
  Object.keys(mealPlans).forEach(function (d) {
    shoppingList[d] = mealPlans[d].shoppingByGoal;
  });

  /* ------------------------------------------------------------------ *
   * 6. formulas：算法常量与规则（全部来自上游 app.js）
   * ------------------------------------------------------------------ */
  var formulas = {
    bmr: {
      name: 'Mifflin-St Jeor（1990）',
      male:   '10*kg + 6.25*cm - 5*age + 5',
      female: '10*kg + 6.25*cm - 5*age - 161',
      base: { weight: 10, height: 6.25, age: -5, maleIntercept: 5, femaleIntercept: -161 }
    },
    bodyFatBranch: {
      name: 'Katch-McArdle',
      formula: '370 + 21.6 * LBM，LBM = kg * (1 - bodyFat/100)',
      useWhen: 'bodyFat != null 且 3 <= bodyFat <= 60',
      label: 'Katch-McArdle（含体脂修正）',
      fallbackLabel: 'Mifflin-St Jeor'
    },
    tdee: 'bmr * ACTIVITY_LEVELS[activity].factor',
    calories: {
      cut: 'round(tdee * (1 - deficit))，deficit 默认 0.15，滑杆 10%-20%',
      bulk: 'round(tdee * (1 + deficit))，deficit 默认 0.12，滑杆 5%-15%',
      maintain: 'round(tdee * 1)',
      reference: { cut: 1956, bulk: 2578, maintain: 2301 }
    },
    calorieRatioLegacy: { cut: 0.85, bulk: 1.12, maintain: 1.0 },
    proteinPerKg: { cut: 2.2, bulk: 1.8, maintain: 1.6 },
    proteinRange: { cut: [1.8, 2.7], bulk: [1.6, 2.2], maintain: [1.4, 2.0] },
    fatPct: 0.25,
    fatRange: [0.20, 0.35],
    carbsRule: 'round((calories - protein*4 - fat*9) / 4)',
    waterPerKg: 35,
    waterRange: [30, 40],
    weeklyChangeKg: '(tdee - calories) * 7 / 7700',
    reference: REFERENCE_PROFILE,
    referenceTargets: REFERENCE_TARGETS,
    rounding: {
      calories: 'Math.round', protein: 'Math.round', fat: 'Math.round', carbs: 'Math.round',
      waterMl: 'Math.round', bmr: 'Math.round', tdee: 'Math.round',
      proteinPerKg: 'Math.round(x*10)/10（保留 1 位小数）',
      fatPct: 'Math.round(fat*9/calories*100)（整数百分比）',
      heightFromFeet: 'Math.round(ft*30.48)',
      weightJin: 'kg * 2（展示用，不取整）',
      weeklyJin: '(kg * 2).toFixed(1)',
      weeklyKg: 'kg.toFixed(2)'
    }
  };

  /* ------------------------------------------------------------------ *
   * 7. 单位换算与校验（上游 getInput / getUnits / applyUnitsUI）
   * ------------------------------------------------------------------ */
  var units = {
    default: { weight: 'kg', height: 'cm' },
    weightJin: 2,                 // 1 kg = 2 斤
    feetToCm: 30.48,
    convert: {
      weightToKg: 'weightUnit === "jin" ? value / 2 : value',
      heightToCm: 'heightUnit === "ft" ? Math.round(value * 30.48) : value'
    },
    inputRanges: {
      age: [14, 90],
      heightCm: [120, 230],
      heightFt: [4.0, 7.5],
      weightKg: [30, 200],
      weightJin: [60, 400],
      bodyFatPct: [3, 60]
    }
  };

  var validation = {
    prefix: '请检查：',
    join: '；',
    messages: {
      age: '年龄需在 14-90 之间',
      heightCm: '身高需在 120-230cm 之间',
      heightFt: '身高需在约 4.0-7.5 英尺之间',
      weightKg: '体重需在 30-200kg 之间',
      weightJin: '体重需在 60-400 斤之间',
      bodyFat: '体脂率需在 3%-60% 之间',
      success: '计划已生成并自动保存在本机浏览器中'
    }
  };

  /* ------------------------------------------------------------------ *
   * 8. 文案模板（上游渲染层原文，占位符用 {name} 标注）
   * ------------------------------------------------------------------ */
  var copy = {
    deficitInfo: {
      cut: '比维持热量低约 {gap} kcal（{pct}% 缺口）',
      bulk: '比维持热量高约 {gap} kcal（{pct}% 盈余）',
      maintain: '与维持热量持平'
    },
    deficitHint: {
      cut: '每周预计减重约 {jin} 斤（{kg} kg），建议每周减重不超过体重的 1%。',
      bulk: '每周预计增重约 {jin} 斤（{kg} kg），增肌期体重增速宜缓。'
    },
    deficitLabel: { cut: '热量缺口（可调）', bulk: '热量盈余（可调）' },
    statExtra: {
      protein: '约 {proteinPerKg} g/kg',
      carbs: '约 {kcal} kcal',
      fat: '约 {kcal} kcal',
      water: '建议分多次饮用'
    },
    macroRangeNote: {
      proteinOk: '蛋白质 {ppk} g/kg（推荐区间 {lo}-{hi} g/kg）✓',
      proteinWarn: '蛋白质 {ppk} g/kg（推荐区间 {lo}-{hi} g/kg）⚠ 建议调整',
      fatOk: '脂肪供能 {fatPct}%（推荐 20-35%）✓',
      fatWarn: '脂肪供能 {fatPct}%（推荐 20-35%）⚠',
      join: ' · '
    },
    macroLegend: '热量分配：蛋白质 {p}% · 碳水 {c}% · 脂肪 {f}%',
    profileSummary: '{goalLabel} · {activityLabel} · 每周 {days} 练 · {experienceLabel} · 体重 {weight}{unit} · {formulaLabel}',
    dietIntro: '目标 {calories} kcal，蛋白质 {protein}g / 碳水 {carbs}g / 脂肪 {fat}g。下面是一份示例搭配，点击下方按钮可一键替换蛋白质来源，餐单自动同步。',
    proteinRangeNote: {
      cut: '1.8–2.7 g/kg（减脂期保留肌肉）',
      bulk: '1.6–2.2 g/kg（增肌）',
      maintain: '1.4–2.0 g/kg（保持）'
    },
    proteinPlanNote: '蛋白质建议区间：{range}。本方案取 {protein}g（{proteinPerKg} g/kg），依据 Morton 2018 荟萃分析（增肌平台期约 1.6 g/kg/天）与 ISSN 2017 立场声明。',
    waterNote: '每天饮水 {waterMl}ml（约 35 ml/kg，运动人群常见建议 30–40 ml/kg），睡眠 7–9 小时，睡眠不足会显著影响恢复与食欲控制。',
    goalNote: {
      cut: '减脂期建议每日热量缺口 300–500 kcal（10–20% TDEE），每周减重 0.5–1% 体重；若两周体重无变化，可再减少 100–150 kcal。',
      bulk: '增肌期建议每日热量盈余约 300–500 kcal（10–20%），每周增重 0.25–0.5% 体重较为理想，增重过快意味着脂肪也增加较多。',
      maintain: '保持期以体重稳定在 ±1kg 内为目标，定期根据活动量微调热量。'
    },
    proteinTip: {
      normal: '蛋白质来源建议多样化：鸡胸、牛肉、鱼虾、鸡蛋、奶制品、乳清蛋白粉交替食用。',
      vegetarian: '蛋奶素蛋白质来源：鸡蛋、牛奶、酸奶、豆腐、豆干、天贝，建议每餐至少 1-2 份蛋白质食物。',
      vegan: '纯素者蛋白质来源：豆腐、豆干、天贝、豆类、藜麦，建议每餐至少 1-2 份蛋白质食物，并注意补充维生素 B12。',
      lowcarb: '低碳水模式已自动减少主食份量、加大蛋白质与蔬菜比例，优质脂肪来源：橄榄油、坚果、牛油果。'
    },
    shoppingTitle: '一周购物清单',
    shoppingCopy: '复制清单',
    foodsIntro: '以「份」为单位估算，方便你自由组合每天的蛋白质、碳水和脂肪。实际数值会因做法与品牌略有差异。',
    trainingMealNote: '训练日可把「练前 / 练后加餐」安排在训练前后 1 小时内；训练前 2 小时完成正餐。'
  };

  /* ------------------------------------------------------------------ *
   * 9. 上游 localStorage：键名、结构、默认值
   *    （承接方以 fitplan-state 单键保存，本区块仅作备份兼容 / 行为对照）
   * ------------------------------------------------------------------ */
  var storageKeys = [
    'fitplan-profile',          // getInput() 结果（JSON）
    'fitplan-settings',         // 日程提醒设置（JSON，含派生字段 weekdayPlan）
    'fitplan-volume',           // 'full' | 'light'
    'fitplan-custom-plan',      // { "3-gym": { pushA: [ {name,muscle,sets,reps,rest,tip} ] } }
    'fitplan-units',            // { weight:'kg'|'jin', height:'cm'|'ft' }
    'fitplan-sessions',         // [ { date, dayTitle, sets, durationMin } ]
    'fitplan-protein-source',   // 'chicken' | 'beef' | 'fish' | 'tofu'
    'fitplan-theme',            // 'dark' | 无（缺省浅色）
    'fitplan-font',             // 16 | 18
    'fitplan-version'           // version.txt 内容，用于缓存失效判断
  ];
  // 另有一个「每天每训一次」的提醒去重键：fitplan-notified-{Date.toDateString()}-{H}-{m} = '1'

  var storageState = {
    'fitplan-profile': {
      type: 'json',
      shape: {
        sex: '"male" | "female"', age: 25, height: 175, weight: 70, bodyFat: null,
        activity: '"sedentary" | "light" | "moderate" | "active" | "athlete"',
        goal: '"cut" | "bulk" | "maintain"', days: 3,
        experience: '"beginner" | "intermediate" | "advanced"',
        diet: '"normal" | "vegetarian" | "vegan" | "lowcarb"',
        equipment: '"gym" | "home"', deficit: 0.15
      },
      note: 'height 已是 cm、weight 已是 kg；deficit 由滑杆决定（减脂 0.10-0.20 / 增肌 0.05-0.15）'
    },
    'fitplan-settings': {
      type: 'json',
      shape: { weekdays: [0, 2, 4], time: '19:00', leadMin: 30, enabled: false, customized: false },
      note: 'weekdays 0=周一；默认值由 DEFAULT_WEEKDAYS[天数] 给出（2:[0,3] 3:[0,2,4] 4:[0,1,3,4] 5:[0,1,2,3,4] 6:[0..5]）；weekdayPlan 为 render 时写入的派生字段'
    },
    'fitplan-volume': { type: 'string', default: 'full', values: ['full', 'light'] },
    'fitplan-custom-plan': { type: 'json', default: {}, note: '按 `${days}-${equipment}` → dayKey → 动作数组' },
    'fitplan-units': { type: 'json', default: { weight: 'kg', height: 'cm' } },
    'fitplan-sessions': { type: 'json', default: [], note: '每次「结束沉浸训练」追加一条' },
    'fitplan-protein-source': { type: 'string', default: 'chicken', note: '纯素默认 tofu' },
    'fitplan-theme': { type: 'string', default: null, values: [null, 'dark'] },
    'fitplan-font': { type: 'string', default: '16', note: 'Number(v) || 16；只写入 16 或 18' },
    'fitplan-version': { type: 'string', default: null, note: '与 version.txt 比对，不一致则清缓存并 reload' },
    'fitplan-notified-{dateString}-{H}-{m}': { type: 'string', default: null, note: '值恒为 "1"，用于当日提醒去重' }
  };

  /* ------------------------------------------------------------------ *
   * 10. 参考文献（README「参考文献」原样，共 6 条）
   * ------------------------------------------------------------------ */
  var refs = [
    'Mifflin MD, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.',
    'Morton RW, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. Br J Sports Med. 2018;52(6):376-384.',
    'Aragon AA, et al. International society of sports nutrition position stand: diets and body composition. J Int Soc Sports Nutr. 2017;14:16.',
    'Donnelly JE, et al. American College of Sports Medicine Position Stand. Appropriate intervention strategies for weight loss and prevention of weight regain for adults. Med Sci Sports Exerc. 2001;33(12):2145-2156.',
    'Schoenfeld BJ, et al. Resistance training frequency and measures of muscle hypertrophy: a systematic review and meta-analysis. Sports Med. 2016;46(11):1689-1697.',
    'Kerksick CM, et al. ISSN exercise & sports nutrition review update: research & recommendations. J Int Soc Sports Nutr. 2018;15:38.'
  ];

  /* ------------------------------------------------------------------ *
   * 11. 派生字段：per100g（仅当上游给出克重时计算，保留 1 位小数）
   * ------------------------------------------------------------------ */
  foods.forEach(function (f) {
    if (!f.grams) { f.per100g = null; return; }
    var k = 100 / f.grams;
    f.per100g = {
      kcal: Math.round(f.kcal * k * 10) / 10,
      protein: Math.round(f.protein * k * 10) / 10,
      carbs: Math.round(f.carbs * k * 10) / 10,
      fat: Math.round(f.fat * k * 10) / 10
    };
  });

  /* ------------------------------------------------------------------ *
   * 12. 元信息：来源、派生规则、已知缺口
   * ------------------------------------------------------------------ */
  var _meta = {
    source: 'https://github.com/lihua2779/fit-plan（main 分支 js/app.js，blob 673d70a1312906c7f0779a1bd6a6f676ce242cf1，126522 B）',
    secondary: 'https://github.com/lihua2779/fit-plan/blob/main/README.md',
    fetchedAt: '2026-11-02',
    upstreamVersion: 'v20260811-04（version.txt / footer）',
    derived: {
      per100g: '由「每份」克重线性换算，未改写上游每份数值；grams 为 null 的条目（鸡蛋/全麦面包/香蕉/苹果/橄榄油）上游只给份量描述，未给克重，per100g 置 null',
      mealNumbers: 'ref 画像（男/25/175cm/70kg/light/cut 15%）下 round(targets × pct)；pct 与文案均为上游原值',
      shoppingPerDay: '仅蛋白质（150/160/200g）、鸡蛋（2/3 个）、牛奶/豆浆（1 杯）、燕麦（50/80g）、水果（1 份）可推出日量，其余置 null'
    },
    gaps: [
      '上游 app.js 末尾约 270 行（体重记录、目标体重、打卡、自定义食材、饮水提醒、JSON 备份/清空）因 web_fetch 单次响应 62.5KB 上限无法读取，这些功能的 localStorage 键名未能取证（已知函数名 getCheckins/saveCheckins/getTargetWeight，且打卡存储结构为 { "YYYY-MM-DD": 1 }，来自可见调用点）。',
      '上游 mealPlans 原文以「目标(goal)」分层，「饮食偏好」只影响文案与购物清单；本文件已归一化为「饮食偏好」四套，并把三目标放进 mealsByGoal，未改动任何数值。'
    ],
    upstreamQuirks: [
      'GOAL_CONFIG.calorieRatio（0.85/1.12/1.0）仍在常量中，但 calcTargets 已改用滑杆 deficit，calorieRatio 成为死配置。',
      '增肌滑杆范围是 5%-15%，README 写「10–20% 盈余区间」，两者不一致。',
      'README 未提及补体脂时切到 Katch-McArdle 分支。',
      '饮食偏好只在 mealSampleText 里区分 vegan 与 lowCarb 两个开关，蛋奶素(vegetarian)的文案/清单与普通饮食完全相同。',
      '切换蛋白质来源只换标签与「每 100g」说明文案，餐次热量与克数不变（不会按来源蛋白含量重算）。',
      'experienceAllowedDays() 定义为「新手最多 3 天」，但最终 buildWorkoutPlan 未调用它，属死代码。'
    ]
  };

  /* ------------------------------------------------------------------ *
   * 13. 导出
   * ------------------------------------------------------------------ */
  var API = {
    version: 1,
    referenceProfile: REFERENCE_PROFILE,
    referenceTargets: REFERENCE_TARGETS,
    activityLevels: ACTIVITY_LEVELS,
    goalConfig: GOAL_CONFIG,
    dietConfig: DIET_CONFIG,
    experienceLabel: EXPERIENCE_LABEL,
    proteinSources: PROTEIN_SOURCES,
    veganSubstitutions: VEGAN_SUBSTITUTIONS,
    foods: foods,
    mealPlans: mealPlans,
    shoppingList: shoppingList,
    formulas: formulas,
    units: units,
    validation: validation,
    copy: copy,
    storageKeys: storageKeys,
    storageState: storageState,
    refs: refs,
    _meta: _meta,
    /* 便捷函数：与上游同名逻辑等价，供渲染层复用 */
    renderDesc: renderDesc,
    shopItems: shopItems
  };

  root.FP_NUTRITION = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis
  : typeof self !== 'undefined' ? self
  : this);