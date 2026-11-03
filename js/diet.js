/*!
 * diet.js — 饮食页：每日饮食安排（餐次卡 + 蛋白质来源切换）、饮食建议、
 *           一周购物清单（复制）、常见食物营养参考表、食材计算器、自定义食材
 *
 * 依赖（均为运行时取用，加载阶段不操作 DOM）：
 *   - core.js      FP.core：round / roundTo / clamp / toNum / formatMacros / macroCheck / GOALS / DIET_PREF
 *   - app.js       FP.util / FP.state / FP.plan() / FP.save() / FP.toast()
 *   - nutrition.js FP_NUTRITION：
 *        foods[{key,name,portion,grams|null,kcal,protein,carbs,fat,per100g}]
 *        mealPlans[diet].{label,vegan,lowCarb,defaultProteinSource,
 *                         meals, mealsByGoal{cut,bulk,maintain},
 *                         proteinSources[{key,label,note,per100g}],
 *                         shoppingByGoal{cut,bulk,maintain}}
 *        shoppingList[diet][goal]、copy{...}、renderDesc()、shopItems()
 *     数据缺失或字段不全时降级为 .empty 空态，不抛错。
 *
 * 模块形态：FP.diet = { init(), render() }；init() 只绑定一次事件委托；
 *          render() 用 innerHTML 整体重建 #dietContent / #foodsContent，可重复调用。
 */
(function (root) {
  'use strict';

  var FP = (root.FP = root.FP || {});
  var doc = root.document;

  var CUP_ML = 250;   // 饮水建议换算：每杯 250 ml

  // 计算器的临时输入/选择（不进 localStorage，重绘后保留）
  var calcState = { foodId: '', grams: 100 };
  var bound = false;
  var lastSyncedDiet = null; // 用于饮食偏好切换时同步蛋白质来源默认值

  /* ================================================================== *
   * 0. 通用工具
   * ================================================================== */

  function $(sel, scope) { return (scope || doc).querySelector(sel); }

  function esc(v) { return FP.util.esc(v); }
  function num(v, digits) { return FP.util.num(v, digits); }
  function round(v, digits) { return FP.core.round(v, digits); }
  function roundTo(v, step) { return FP.core.roundTo(v, step); }
  function toNum(v, fallback) { return FP.core.toNum(v, fallback); }
  function clamp(v, min, max) { return FP.core.clamp(v, min, max); }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function numOr(v, digits) { return isNum(v) ? num(v, digits) : '—'; }
  function trimText(v) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, ''); }

  function getPlan() { return typeof FP.plan === 'function' ? FP.plan() : null; }
  function getState() { return FP.state || (FP.state = {}); }

  /** 文案模板占位符替换：{name} → values.name（缺值保留原占位符） */
  function fillTemplate(template, values) {
    return String(template == null ? '' : template).replace(/\{(\w+)\}/g, function (whole, key) {
      return values && values[key] !== undefined && values[key] !== null ? String(values[key]) : whole;
    });
  }

  /* ================================================================== *
   * 1. 数据读取与归一化
   * ================================================================== */

  function nutritionData() {
    var n = root.FP_NUTRITION;
    return n && typeof n === 'object' ? n : null;
  }

  function copyData() {
    var n = nutritionData();
    return (n && n.copy) || {};
  }

  /** 当前饮食偏好 key（来自已生成方案，缺省 normal） */
  function dietKey() {
    var plan = getPlan();
    var profile = (plan && plan.profile) || getState().profile || {};
    var pref = FP.core && FP.core.DIET_PREF ? FP.core.DIET_PREF : {};
    return pref[profile.diet] ? profile.diet : 'normal';
  }

  function dietLabel(key) {
    var pref = FP.core && FP.core.DIET_PREF ? FP.core.DIET_PREF : {};
    return (pref[key] || pref.normal || { label: '普通饮食' }).label;
  }

  /** 当前目标 key：减脂 cut / 增肌 bulk / 保持 maintain */
  function goalKeyOf(plan) {
    var key = plan && plan.profile && plan.profile.goal;
    var goals = FP.core && FP.core.GOALS ? FP.core.GOALS : {};
    return goals[key] ? key : 'cut';
  }

  function goalLabel(key) {
    var goals = FP.core && FP.core.GOALS ? FP.core.GOALS : {};
    return (goals[key] || { label: '减脂' }).label;
  }

  /* ---------- 1.1 餐单 ---------- */

  function mealPlanMap() {
    var n = nutritionData();
    if (!n) return {};
    var map = n.mealPlans || n.plans || n.diets;
    return map && typeof map === 'object' ? map : {};
  }

  function currentMealPlan() {
    var n = nutritionData();
    if (!n) return null;
    var key = dietKey();
    var map = mealPlanMap();
    var mp = map[key] || map.normal || null;
    if (!mp) {
      var keys = Object.keys(map);
      if (keys.length) mp = map[keys[0]];
    }
    // 兼容扁平数据（无 mealPlans 时顶层直接给 meals/shopping）
    if (!mp && (Array.isArray(n.meals) || Array.isArray(n.shopping))) {
      mp = {
        label: dietLabel(key),
        meals: n.meals || [],
        proteinSources: n.proteinSources,
        shopping: n.shopping
      };
    }
    return mp && typeof mp === 'object' ? mp : null;
  }

  /** 原始餐次数组：优先 mealsByGoal[当前目标]，再回退 meals；支持对象写法 */
  function rawMeals(mp, plan) {
    if (!mp) return [];
    var goal = goalKeyOf(plan);
    var byGoal = mp.mealsByGoal;
    var list = byGoal && typeof byGoal === 'object' ? byGoal[goal] : null;
    if (!Array.isArray(list) || !list.length) list = mp.meals || mp.schedule || mp.plan || mp.items;
    if (Array.isArray(list)) return list;
    if (list && typeof list === 'object') {
      return Object.keys(list).map(function (key) {
        var m = list[key];
        if (!m || typeof m !== 'object') return null;
        if (!m.name && !m.title) {
          var copy = {};
          Object.keys(m).forEach(function (field) { copy[field] = m[field]; });
          copy.name = key;
          return copy;
        }
        return m;
      }).filter(Boolean);
    }
    return [];
  }

  function normalizeMeal(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var name = trimText(raw.name || raw.title || raw.meal || '');
    if (!name) return null;

    var protein = toNum(raw.protein !== undefined ? raw.protein : raw.proteinG, NaN);
    var carbs = toNum(raw.carbs !== undefined ? raw.carbs
      : (raw.carb !== undefined ? raw.carb : raw.carbohydrate), NaN);
    var fat = toNum(raw.fat, NaN);
    var kcal = toNum(raw.kcal !== undefined ? raw.kcal
      : (raw.calories !== undefined ? raw.calories : raw.energy), NaN);
    if (!isFinite(kcal) && (isFinite(protein) || isFinite(carbs) || isFinite(fat))) {
      kcal = (isFinite(protein) ? protein : 0) * 4 +
        (isFinite(carbs) ? carbs : 0) * 4 +
        (isFinite(fat) ? fat : 0) * 9;
    }

    var desc = raw.desc !== undefined ? raw.desc
      : (raw.description !== undefined ? raw.description
        : (raw.foods !== undefined ? raw.foods : raw.text));
    if (Array.isArray(desc)) desc = desc.join(' + ');

    var pct = toNum(raw.pct, NaN);
    return {
      key: raw.key || '',
      name: name,
      pct: isFinite(pct) && pct > 0 ? pct : null,
      kcal: isFinite(kcal) ? kcal : null,
      protein: isFinite(protein) ? protein : null,
      carbs: isFinite(carbs) ? carbs : null,
      fat: isFinite(fat) ? fat : null,
      desc: trimText(desc),
      descTemplate: trimText(raw.descTemplate || desc)
    };
  }

  function mealList(mp, plan) {
    return rawMeals(mp, plan).map(normalizeMeal).filter(Boolean);
  }

  /**
   * 上游口径：每餐四项 = round(日总量 × 该餐 pct)，四项各自取整（和日总量允许 ±1~3 误差）。
   * 用户改了体重/目标/滑杆后必须按 pct 重算，不能照抄参考画像的定值。
   */
  function applyPlanToMeal(meal, plan) {
    if (!meal.pct || !plan) return meal;
    var out = {
      key: meal.key, name: meal.name, pct: meal.pct,
      kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
      desc: meal.desc, descTemplate: meal.descTemplate
    };
    if (isNum(plan.target)) out.kcal = round(plan.target * meal.pct, 0);
    if (isNum(plan.protein)) out.protein = round(plan.protein * meal.pct, 0);
    if (isNum(plan.carbs)) out.carbs = round(plan.carbs * meal.pct, 0);
    if (isNum(plan.fat)) out.fat = round(plan.fat * meal.pct, 0);
    return out;
  }

  function applyPlanToMeals(meals, plan) {
    return meals.map(function (meal) { return applyPlanToMeal(meal, plan); });
  }

  /* ---------- 1.2 蛋白质来源 ---------- */

  function normalizeSource(raw) {
    if (typeof raw === 'string' || typeof raw === 'number') {
      var label = trimText(raw);
      return label ? { key: label, label: label, note: '', per100g: null } : null;
    }
    if (!raw || typeof raw !== 'object') return null;
    var text = trimText(raw.label || raw.name || raw.title || raw.value || '');
    if (!text) return null;
    return {
      key: trimText(raw.key || text),
      label: text,
      note: trimText(raw.note || raw.desc || raw.description || ''),
      per100g: raw.per100g && typeof raw.per100g === 'object' ? raw.per100g : null
    };
  }

  function proteinSources(mp) {
    var n = nutritionData();
    var list = (mp && (mp.proteinSources || mp.protein || mp.sources)) ||
      (n && (n.proteinSources || n.sources)) || [];
    if (!Array.isArray(list)) {
      if (list && typeof list === 'object') {
        list = Object.keys(list).map(function (key) {
          var s = list[key];
          if (typeof s === 'string') return { label: s };
          if (s && typeof s === 'object') {
            var copy = {};
            Object.keys(s).forEach(function (field) { copy[field] = s[field]; });
            if (!copy.key) copy.key = key;
            if (!copy.label && !copy.name) copy.label = key;
            return copy;
          }
          return null;
        }).filter(Boolean);
      } else {
        list = [];
      }
    }
    return list.map(normalizeSource).filter(Boolean);
  }

  function defaultSourceIndex(mp, sources) {
    var key = mp && mp.defaultProteinSource;
    if (key) {
      for (var i = 0; i < sources.length; i++) {
        if (sources[i].key === key) return i;
      }
    }
    return 0;
  }

  function defaultProteinLabel(mp) {
    var key = mp && mp.defaultProteinSource;
    var n = nutritionData();
    if (key && n && n.proteinSources && n.proteinSources[key]) {
      return n.proteinSources[key].label || '';
    }
    return '';
  }

  function selectedSource(sources, mp) {
    var idx = toNum(getState().proteinSource, 0);
    idx = isFinite(idx) ? Math.max(0, Math.round(idx)) : 0;
    if (idx >= sources.length) idx = defaultSourceIndex(mp, sources);
    return { index: idx, source: sources[idx] || null };
  }

  /**
   * 饮食偏好切换时把蛋白质来源回到该偏好的默认值（如纯素默认豆腐）。
   * 首次渲染保留用户已保存的选择；仅当越界 / 处于未选择态(0)而默认不在 0 时才同步。
   */
  function syncDefaultProtein(diet, mp, sources) {
    if (!sources.length) return;
    var state = getState();
    var cur = toNum(state.proteinSource, 0);
    cur = isFinite(cur) ? Math.round(cur) : 0;
    var defIdx = defaultSourceIndex(mp, sources);

    if (lastSyncedDiet === null) {
      lastSyncedDiet = diet;
      if (cur < 0 || cur >= sources.length || (cur === 0 && defIdx !== 0)) {
        state.proteinSource = defIdx;
        FP.save();
      }
      return;
    }
    if (lastSyncedDiet === diet) return;
    lastSyncedDiet = diet;
    if (cur !== defIdx) {
      state.proteinSource = defIdx;
      FP.save();
    }
  }

  /** 把选中的蛋白质来源应用到餐单文案：{protein} 占位符 + 纯素替换 */
  function mealsForSource(meals, source, mp) {
    var list = meals.map(function (meal) {
      return {
        key: meal.key, name: meal.name, pct: meal.pct,
        kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
        desc: meal.desc, descTemplate: meal.descTemplate
      };
    });
    if (!source || !source.label) return list;

    var n = nutritionData();
    var canRender = n && typeof n.renderDesc === 'function';
    list.forEach(function (meal) {
      var template = meal.descTemplate || meal.desc;
      if (!template) return;
      if (canRender) {
        meal.desc = n.renderDesc(template, source.label, !!(mp && mp.vegan), !!(mp && mp.lowCarb));
      } else {
        meal.desc = String(template).replace(/\{protein\}/g, function () { return source.label; });
      }
    });
    return list;
  }

  /* ---------- 1.3 购物清单 ---------- */

  function normalizeShopItem(raw) {
    if (typeof raw === 'string' || typeof raw === 'number') {
      var text = trimText(raw);
      return text ? { name: text, amount: '', perDay: null, note: '' } : null;
    }
    if (!raw || typeof raw !== 'object') return null;
    var name = trimText(raw.name || raw.item || raw.food || raw.title || '');
    if (!name) return null;
    var unit = trimText(raw.unit || '');
    var amount = raw.amount;
    if (amount === undefined) amount = raw.qty;
    if (amount === undefined) amount = raw.quantity;
    if (amount === undefined) amount = raw.grams;
    if (amount === undefined) amount = raw.weight;
    if (amount === undefined) amount = '';
    if (typeof amount === 'number') {
      amount = String(amount) + unit;
    } else {
      amount = trimText(amount);
      if (amount && unit && /^\d+(?:\.\d+)?$/.test(amount)) amount = amount + unit;
    }
    var perDay = raw.perDay !== undefined ? raw.perDay
      : (raw.perDayAmount !== undefined ? raw.perDayAmount : raw.daily);
    if (perDay !== undefined && perDay !== null && perDay !== '') {
      perDay = typeof perDay === 'number' ? String(perDay) + unit : trimText(perDay);
    } else {
      perDay = null;
    }
    return { name: name, amount: amount, perDay: perDay, note: trimText(raw.note) };
  }

  /**
   * 选取当前目标下的一周购物清单：
   * 优先用 FP_NUTRITION.shopItems(goal, diet, proteinLabel)（蛋白行名称随选中来源变化），
   * 其次 mealPlans[diet].shoppingByGoal[goal]，再次 shoppingList[diet][goal]，最后 mp.shopping。
   */
  function rawShopping(mp, plan, sourceLabel) {
    var n = nutritionData();
    var goal = goalKeyOf(plan);
    var diet = dietKey();
    if (n && typeof n.shopItems === 'function') {
      try {
        var dynamicList = n.shopItems(goal, diet, sourceLabel || defaultProteinLabel(mp));
        if (Array.isArray(dynamicList) && dynamicList.length) return dynamicList;
      } catch (e) { /* 数据异常时回退静态清单 */ }
    }
    var byGoal = mp && mp.shoppingByGoal;
    if (byGoal && typeof byGoal === 'object' && Array.isArray(byGoal[goal]) && byGoal[goal].length) {
      return byGoal[goal];
    }
    var flat = n && n.shoppingList;
    if (flat && flat[diet] && Array.isArray(flat[diet][goal]) && flat[diet][goal].length) {
      return flat[diet][goal];
    }
    return (mp && (mp.shopping || mp.shoppingList || mp.weekShopping)) || [];
  }

  /** 显式基准热量（数据提供时才缩放；上游真实数据没有，故默认不缩放） */
  function explicitBaseKcal(mp) {
    var n = nutritionData() || {};
    var candidates = [
      mp && mp.baseKcal, mp && mp.dailyKcal,
      n.baseKcal, n.dailyKcal
    ];
    for (var i = 0; i < candidates.length; i++) {
      var v = toNum(candidates[i], NaN);
      if (isFinite(v) && v > 0) return v;
    }
    return 0;
  }

  function scaleOneValue(value, unitText, ratio) {
    var x = value * ratio;
    var unit = String(unitText || '').toLowerCase();
    if (unit === 'g' || unit === '克') {
      return String(x >= 10 ? Math.max(5, roundTo(x, 5)) : Math.max(1, Math.round(x)));
    }
    if (unit === 'ml' || unit === '毫升') {
      return String(x >= 20 ? Math.max(10, roundTo(x, 10)) : Math.max(1, Math.round(x)));
    }
    if (unit === 'kg' || unit === '千克' || unit === 'l' || unit === '升') {
      return String(round(x, 2));
    }
    return String(Math.max(1, Math.round(x)));
  }

  /** 用量文本等比缩放，如 '1050g' → '1180g'、'1.5kg' → '1.7kg' */
  function scaleAmount(text, ratio) {
    var str = trimText(text);
    if (!str) return '';
    if (!isFinite(ratio) || Math.abs(ratio - 1) < 0.005) return str;
    var m = /^(\D*?)(\d+(?:\.\d+)?)(?:\s*[-–~]\s*(\d+(?:\.\d+)?))?(\s*)(.*)$/.exec(str);
    if (!m) return str;
    var prefix = m[1] || '';
    var sep = m[4] || '';
    var unitText = m[5] || '';
    var first = scaleOneValue(Number(m[2]), unitText, ratio);
    if (m[3] !== undefined) {
      var second = scaleOneValue(Number(m[3]), unitText, ratio);
      return prefix + first + '–' + second + sep + unitText;
    }
    return prefix + first + sep + unitText;
  }

  /** 生成展示用购物清单（有基准热量时按目标等比缩放，否则原样） */
  function shoppingItems(mp, plan, sourceLabel) {
    var raw = rawShopping(mp, plan, sourceLabel);
    var list = Array.isArray(raw) ? raw.map(normalizeShopItem).filter(Boolean) : [];
    var base = explicitBaseKcal(mp);
    var target = plan ? toNum(plan.target, NaN) : NaN;
    var ratio = 1;
    if (base > 0 && isFinite(target) && target > 0) ratio = clamp(target / base, 0.5, 2);

    return {
      items: list.map(function (item) {
        var amount = item.amount;
        if (item.perDay && !amount) amount = scaleAmount(item.perDay, 7); // perDay → 一周总量
        return { name: item.name, amount: scaleAmount(amount, ratio), note: item.note };
      }),
      base: base,
      ratio: ratio,
      target: isFinite(target) ? target : null
    };
  }

  function shoppingNote(scaled, plan) {
    if (scaled.base) {
      if (!isNum(scaled.ratio) || Math.abs(scaled.ratio - 1) < 0.005) {
        return '用量按每日目标 ' + num(scaled.target) + ' kcal 估算（基准 ' + num(scaled.base) + ' kcal）。';
      }
      return '用量已按每日目标 ' + num(scaled.target) + ' kcal 等比缩放（基准 ' + num(scaled.base) + ' kcal）。';
    }
    return '按「' + goalLabel(goalKeyOf(plan)) + '」目标档位估算一周用量，实际可按食量与训练量微调。';
  }

  function shoppingText(items, plan) {
    var lines = ['FitDaily 一周购物清单' + (plan ? '（每日目标 ' + num(plan.target) + ' kcal）' : '')];
    items.forEach(function (item) {
      lines.push('- ' + item.name + (item.amount ? '：' + item.amount : ''));
    });
    return lines.join('\n');
  }

  /* ---------- 1.4 食物表 ---------- */

  function normalizeFood(raw, custom) {
    if (!raw || typeof raw !== 'object') return null;
    var name = trimText(raw.name || raw.food || raw.title || '');
    if (!name) return null;

    var portion = trimText(raw.portion || raw.serving || raw.servingSize || raw.unit || '');
    var grams = toNum(raw.grams !== undefined ? raw.grams
      : (raw.weight !== undefined ? raw.weight
        : (raw.gram !== undefined ? raw.gram : NaN)), NaN);
    if (!isFinite(grams) && portion) {
      var m = /(\d+(?:\.\d+)?)\s*(?:g|克)/i.exec(portion);
      if (m) grams = Number(m[1]);
    }
    // 自定义食材统一按「每 100g」录入，参与克重换算
    if (custom && (!isFinite(grams) || grams <= 0)) {
      grams = 100;
      if (!portion) portion = '100g';
    }

    var protein = toNum(raw.protein !== undefined ? raw.protein
      : (raw.proteinG !== undefined ? raw.proteinG : raw.protein_g), NaN);
    var carbs = toNum(raw.carbs !== undefined ? raw.carbs
      : (raw.carb !== undefined ? raw.carb
        : (raw.carbohydrate !== undefined ? raw.carbohydrate : raw.carbsG)), NaN);
    var fat = toNum(raw.fat !== undefined ? raw.fat : (raw.fatG !== undefined ? raw.fatG : raw.lipid), NaN);

    var kcal = toNum(raw.kcal !== undefined ? raw.kcal
      : (raw.calories !== undefined ? raw.calories
        : (raw.energy !== undefined ? raw.energy : raw.kcalPerServing)), NaN);
    if (!isFinite(kcal) && (isFinite(protein) || isFinite(carbs) || isFinite(fat))) {
      kcal = (isFinite(protein) ? protein : 0) * 4 +
        (isFinite(carbs) ? carbs : 0) * 4 +
        (isFinite(fat) ? fat : 0) * 9;
    }

    var id = raw.key ? 'k:' + String(raw.key) : (custom ? 'c:' : 'n:') + name;
    return {
      id: id,
      key: raw.key ? String(raw.key) : '',
      name: name,
      portion: portion || (isFinite(grams) && grams > 0 ? num(grams) + 'g' : '1 份'),
      grams: isFinite(grams) && grams > 0 ? grams : null,
      kcal: isFinite(kcal) ? kcal : null,
      protein: isFinite(protein) ? protein : null,
      carbs: isFinite(carbs) ? carbs : null,
      fat: isFinite(fat) ? fat : null,
      per100g: raw.per100g && typeof raw.per100g === 'object' ? raw.per100g : null,
      custom: !!custom
    };
  }

  function normalizeFoods(rawList, custom) {
    var list = Array.isArray(rawList) ? rawList : [];
    var out = [];
    list.forEach(function (raw, idx) {
      var food = normalizeFood(raw, custom);
      if (!food) return;
      if (custom) food.idx = idx; // 删除时对应 state.customFoods 的真实下标
      out.push(food);
    });
    return out;
  }

  function baseFoods() {
    var n = nutritionData();
    if (!n) return [];
    return normalizeFoods(n.foods || n.foodTable || n.foodsTable || [], false);
  }

  function customFoodsRaw() {
    var state = getState();
    return Array.isArray(state.customFoods) ? state.customFoods : [];
  }

  function customFoods() { return normalizeFoods(customFoodsRaw(), true); }

  function allFoods() { return baseFoods().concat(customFoods()); }

  function findFoodById(foods, id) {
    for (var i = 0; i < foods.length; i++) {
      if (foods[i].id === id) return foods[i];
    }
    return null;
  }

  /* ================================================================== *
   * 2. 饮食页渲染（#dietContent）
   * ================================================================== */

  function renderDiet() {
    var node = $('#dietContent');
    if (!node) return;

    var plan = getPlan();
    if (!plan) {
      node.innerHTML =
        '<div class="panel">' +
        '<h2 class="panel-title">每日饮食安排</h2>' +
        '<p class="empty">还没有饮食方案。请先到首页填写身体数据并生成计划，餐次安排、饮食建议与一周购物清单会自动生成。</p>' +
        '<div class="form-actions">' +
        '<button type="button" class="btn btn-primary" data-goto="home">去首页生成计划</button>' +
        '</div>' +
        '</div>';
      return;
    }

    var mp = currentMealPlan();
    var sources = proteinSources(mp);
    syncDefaultProtein(dietKey(), mp, sources);

    var selected = selectedSource(sources, mp);
    var meals = mealsForSource(applyPlanToMeals(mealList(mp, plan), plan), selected.source, mp);

    node.innerHTML =
      dietCardHTML(plan, mp, meals, sources, selected) +
      suggestionsHTML(plan) +
      shoppingHTML(plan, mp, selected.source);
  }

  function dietCardHTML(plan, mp, meals, sources, selected) {
    var copy = copyData();
    var intro = '';
    var introRest = '';
    if (copy.dietIntro) {
      var filled = fillTemplate(copy.dietIntro, {
        calories: num(plan.target),
        protein: num(plan.protein),
        carbs: num(plan.carbs),
        fat: num(plan.fat)
      });
      var cut = filled.indexOf('。');
      if (cut !== -1 && cut < filled.length - 1) {
        intro = filled.slice(0, cut + 1);
        introRest = trimText(filled.slice(cut + 1));
      } else {
        intro = filled;
      }
    } else {
      var fm = FP.core.formatMacros(plan);
      intro = '每日目标 ' + fm.kcal + ' · 蛋白质 ' + fm.protein + ' · 碳水 ' + fm.carbs + ' · 脂肪 ' + fm.fat + '。';
    }

    var title = '每日饮食安排 · ' + ((mp && mp.label) || dietLabel(dietKey()));
    var html = '<div class="panel">' +
      '<h2 class="panel-title">' + esc(title) + '</h2>' +
      '<p class="diet-target">' + esc(intro) + '</p>';
    if (introRest) html += '<p class="diet-hint">' + esc(introRest) + '</p>';

    if (!mp) {
      html += '<p class="empty">该饮食偏好暂无餐单数据（js/nutrition.js 尚未提供或字段为空），下方仍会按目标给出饮食建议，数据补齐后刷新页面即可显示餐次安排。</p>';
    } else if (!meals.length) {
      html += '<p class="empty">餐单条目为空，暂时无法展示三餐安排。</p>';
    } else {
      html += '<div class="meal-grid">' + meals.map(mealCardHTML).join('') + '</div>';
      var hint = mealTotalsHint(plan, meals);
      if (hint) html += '<p class="diet-hint">' + esc(hint) + '</p>';
    }

    html += proteinSourcesHTML(sources, selected);
    return html + '</div>';
  }

  function mealCardHTML(meal) {
    var head = '<div class="day-head"><b>' + esc(meal.name) + '</b>' +
      (isNum(meal.kcal) ? '<span class="meal-kcal">' + esc(num(meal.kcal)) + ' kcal</span>' : '') +
      '</div>';
    var body = '<div class="day-body">';
    if (meal.desc) body += '<p class="meal-desc">' + esc(meal.desc) + '</p>';
    var macros = mealMacrosHTML(meal);
    if (macros) body += '<p class="meal-macros">' + macros + '</p>';
    body += '</div>';
    return '<div class="day-card">' + head + body + '</div>';
  }

  function mealMacrosHTML(meal) {
    var parts = [];
    if (isNum(meal.protein)) parts.push('<span>蛋白质 ' + esc(num(meal.protein)) + ' g</span>');
    if (isNum(meal.carbs)) parts.push('<span>碳水 ' + esc(num(meal.carbs)) + ' g</span>');
    if (isNum(meal.fat)) parts.push('<span>脂肪 ' + esc(num(meal.fat)) + ' g</span>');
    return parts.join('');
  }

  function mealTotalsHint(plan, meals) {
    var sum = 0;
    var complete = meals.length > 0;
    meals.forEach(function (meal) {
      if (!isNum(meal.kcal)) complete = false;
      else sum += meal.kcal;
    });
    if (!complete || !isNum(plan.target)) return '';
    var target = toNum(plan.target, 0);
    var diff = round(target - sum, 0);
    if (Math.abs(diff) <= 40) {
      return '各餐次合计约 ' + num(sum) + ' kcal，与每日目标基本一致（四项分别取整，允许少量误差）。';
    }
    return '各餐次合计约 ' + num(sum) + ' kcal，比目标 ' + num(target) + ' kcal ' +
      (diff > 0 ? '少' : '多') + '约 ' + num(Math.abs(diff)) + ' kcal，可用加餐或主食份量微调。';
  }

  function proteinSourcesHTML(sources, selected) {
    if (!sources.length) return '';
    var buttons = sources.map(function (source, idx) {
      var on = idx === selected.index;
      return '<button type="button" class="seg-btn' + (on ? ' active' : '') + '"' +
        ' data-action="protein" data-index="' + idx + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(source.label) + '</button>';
    }).join('');
    var note = selected.source && selected.source.note
      ? '<p class="protein-note">' + esc(selected.source.note) + '</p>'
      : '';
    return '<div class="protein-block">' +
      '<span class="field-label">蛋白质来源</span>' +
      '<div class="segmented" role="group" aria-label="蛋白质来源">' + buttons + '</div>' +
      note +
      '</div>';
  }

  /* ---------- 2.1 饮食建议 ---------- */

  function suggestionsHTML(plan) {
    var items = buildSuggestions(plan);
    if (!items.length) return '';
    return '<div class="panel">' +
      '<h2 class="panel-title">饮食建议</h2>' +
      '<ul class="tip-list">' +
      items.map(function (text) { return '<li>' + esc(text) + '</li>'; }).join('') +
      '</ul>' +
      '</div>';
  }

  function buildSuggestions(plan) {
    var core = FP.core;
    var copy = copyData();
    var goal = goalKeyOf(plan);
    var profile = plan.profile || {};
    var list = [];
    var delta = Math.abs(toNum(plan.delta, 0));

    // 1) 热量缺口 / 盈余 / 平衡（按当前方案数值插值）
    if (goal === 'cut') {
      list.push('热量缺口：每日约 ' + num(delta) + ' kcal（' + num(plan.adjust) + '% 缺口），预计每周减重约 ' +
        numOr(plan.weeklyKg, 2) + ' kg（' + numOr(plan.weeklyJin, 1) + ' 斤）；建议每周减重不超过体重的 1%，' +
        '若两周体重无变化可再减少 100–150 kcal。');
    } else if (goal === 'bulk') {
      list.push('热量盈余：每日约 ' + num(delta) + ' kcal（' + num(plan.adjust) + '% 盈余），预计每周增重约 ' +
        numOr(plan.weeklyKg, 2) + ' kg（' + numOr(plan.weeklyJin, 1) + ' 斤）；每周增重 0.25–0.5% 体重较理想，' +
        '增速过快意味着脂肪增加较多。');
    } else {
      list.push('热量平衡：每日目标 ' + num(plan.target) + ' kcal，与维持热量（TDEE ' + num(plan.tdee) +
        ' kcal）持平；以体重稳定在 ±1 kg 内为目标，可每 2 周按活动量在 ±100 kcal 内微调。');
    }

    // 2) 蛋白质区间（上游文案 + 当前方案数值）
    var check = core.macroCheck ? core.macroCheck(plan) : null;
    var proteinRange = (copy.proteinRangeNote && copy.proteinRangeNote[goal]) ||
      ((check ? check.proteinRange : [1.4, 2.2]).join('–') + ' g/kg');
    if (copy.proteinPlanNote) {
      list.push(fillTemplate(copy.proteinPlanNote, {
        range: proteinRange,
        protein: num(plan.protein),
        proteinPerKg: numOr(plan.proteinPerKg, 1)
      }));
    } else {
      list.push('蛋白质：每日 ' + num(plan.protein) + ' g（约 ' + numOr(plan.proteinPerKg, 1) +
        ' g/kg），推荐区间 ' + proteinRange + '，建议分 3–5 餐摄入、每餐约 ' +
        num(Math.max(20, Math.round(toNum(plan.protein, 0) / 4))) + ' g。');
    }

    // 3) 训练日加餐（按当前碳水与蛋白质估算，不复用参考画像定值）
    var snackCarb = Math.max(20, roundTo(toNum(plan.carbs, 0) * 0.12, 5));
    var postProtein = Math.max(20, roundTo(toNum(plan.protein, 0) / 4, 5));
    list.push('训练日加餐：' +
      (copy.trainingMealNote ? copy.trainingMealNote + ' ' : '') +
      '按当前方案，练前 1–2 小时可补充约 ' + num(snackCarb) + ' g 碳水（约 ' + num(snackCarb * 4) +
      ' kcal），练后 1 小时内补充蛋白质约 ' + num(postProtein) + ' g（如乳清蛋白 1 勺或鸡蛋 2 个）。');

    // 4) 饮水与睡眠
    var cups = num(Math.max(1, Math.round(toNum(plan.water, 0) / CUP_ML)));
    if (copy.waterNote) {
      var waterText = fillTemplate(copy.waterNote, { waterMl: num(plan.water) });
      waterText = waterText.replace(/。\s*$/, '；约 ' + cups + ' 杯（每杯 ' + CUP_ML + ' ml）分次饮用。');
      list.push(waterText);
    } else {
      list.push('饮水与睡眠：每天饮水约 ' + num(plan.water) + ' ml（约 ' + cups + ' 杯，每杯 ' + CUP_ML +
        ' ml），训练中每 15–20 分钟补 100–200 ml；保证 7–9 小时睡眠。');
    }

    // 5) 按饮食偏好的蛋白质来源提示
    var tip = copy.proteinTip && copy.proteinTip[dietKey()];
    if (tip) {
      list.push(tip);
    } else {
      list.push('脂肪与蔬菜：脂肪 ' + num(plan.fat) + ' g/天（约 ' + numOr(plan.fatEnergyPct) +
        '% 热量），优先坚果、橄榄油、深海鱼；每天蔬菜 300–500 g、膳食纤维 25–30 g。');
    }

    return list.filter(function (text) { return !!trimText(text); });
  }

  /* ---------- 2.2 购物清单 ---------- */

  function shoppingHTML(plan, mp, source) {
    var scaled = shoppingItems(mp, plan, source && source.label);
    if (!scaled.items.length) {
      return '<div class="panel">' +
        '<h2 class="panel-title">一周购物清单</h2>' +
        '<p class="empty">购物清单数据暂未加载（js/nutrition.js 尚未提供或字段为空）。</p>' +
        '</div>';
    }
    var rows = scaled.items.map(function (item) {
      return '<li class="shop-item">' +
        '<span class="shop-name">' + esc(item.name) + '</span>' +
        '<span class="shop-amount">' + esc(item.amount || '适量') + '</span>' +
        '</li>';
    }).join('');
    return '<div class="panel">' +
      '<div class="shop-head">' +
      '<h2 class="panel-title">一周购物清单</h2>' +
      '<button type="button" class="btn btn-ghost" data-action="copyShopping">' +
      esc(copyData().shoppingCopy || '复制清单') + '</button>' +
      '</div>' +
      '<p class="diet-hint">' + esc(shoppingNote(scaled, plan)) + '</p>' +
      '<ul class="shop-list">' + rows + '</ul>' +
      '</div>';
  }

  /* ================================================================== *
   * 3. 饮食库渲染（#foodsContent）：食物表 + 计算器 + 自定义食材
   * ================================================================== */

  function renderFoods() {
    var node = $('#foodsContent');
    if (!node) return;

    var foods = allFoods();
    if (!calcState.foodId || !findFoodById(foods, calcState.foodId)) {
      calcState.foodId = foods.length ? foods[0].id : '';
    }

    var html = '';
    if (foods.length) {
      html += foodsTableHTML(foods);
      html += calculatorHTML(foods);
    } else {
      html += emptyPanelHTML('常见食物营养参考',
        '食物营养数据暂未加载（js/nutrition.js 尚未提供或字段为空）。自定义食材仍可正常添加与使用。');
    }
    html += customFoodsHTML(customFoods());

    node.innerHTML = html;
    renderCalcResult();
  }

  function emptyPanelHTML(title, text) {
    return '<div class="panel">' +
      '<h2 class="panel-title">' + esc(title) + '</h2>' +
      '<p class="empty">' + esc(text) + '</p>' +
      '</div>';
  }

  function foodsTableHTML(foods) {
    var rows = foods.map(function (food) {
      var name = esc(food.name) + (food.custom ? ' <span class="badge">自定义</span>' : '');
      var portion = food.portion || (food.grams ? num(food.grams) + 'g' : '1 份');
      return '<tr>' +
        '<td>' + name + '</td>' +
        '<td>' + esc(portion) + '</td>' +
        '<td>' + esc(numOr(food.kcal)) + '</td>' +
        '<td>' + esc(numOr(food.protein, 1)) + '</td>' +
        '<td>' + esc(numOr(food.carbs, 1)) + '</td>' +
        '<td>' + esc(numOr(food.fat, 1)) + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="panel">' +
      '<h2 class="panel-title">常见食物营养参考</h2>' +
      '<p class="diet-hint">' +
      esc(copyData().foodsIntro || '以「份」为单位估算，方便自由组合蛋白质、碳水与脂肪；实际数值因做法与品牌略有差异。') +
      '</p>' +
      '<div class="table-wrap">' +
      '<table aria-label="常见食物营养参考表">' +
      '<thead><tr>' +
      '<th scope="col">食物</th>' +
      '<th scope="col">份量</th>' +
      '<th scope="col">热量 (kcal)</th>' +
      '<th scope="col">蛋白质 (g)</th>' +
      '<th scope="col">碳水 (g)</th>' +
      '<th scope="col">脂肪 (g)</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '</div>' +
      '</div>';
  }

  function calculatorHTML(foods) {
    var options = foods.map(function (food) {
      var selected = food.id === calcState.foodId ? ' selected' : '';
      var portion = food.portion || (food.grams ? num(food.grams) + 'g' : '1 份');
      var label = food.name + '（' + portion + (food.grams ? '' : ' · 按份') +
        (food.custom ? ' · 自定义' : '') + '）';
      return '<option value="' + esc(food.id) + '"' + selected + '>' + esc(label) + '</option>';
    }).join('');

    return '<div class="panel">' +
      '<h2 class="panel-title">食材计算器</h2>' +
      '<p class="diet-hint">选择食材并输入重量，按该食材的克重基准等比换算热量与三大营养素；标注「按份」的食材按份展示。</p>' +
      '<form data-role="calcForm">' +
      '<div class="form-row">' +
      '<label class="field">' +
      '<span class="field-label">食材</span>' +
      '<select data-role="calcFood">' + options + '</select>' +
      '</label>' +
      '<label class="field">' +
      '<span class="field-label">重量（g）</span>' +
      '<input type="number" data-role="calcGrams" min="1" max="5000" step="1" inputmode="decimal"' +
      ' value="' + esc(String(calcState.grams)) + '" />' +
      '</label>' +
      '</div>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn btn-primary">计算</button>' +
      '</div>' +
      '</form>' +
      '<div class="stat-grid" id="dietCalcResult"></div>' +
      '<p class="calc-hint" id="dietCalcHint"></p>' +
      '</div>';
  }

  function statHTML(label, value, unit, hint) {
    return '<div class="stat">' +
      '<div class="stat-label">' + esc(label) + '</div>' +
      '<div class="stat-value">' + esc(value) +
      (unit ? '<span class="stat-unit">' + esc(unit) + '</span>' : '') +
      '</div>' +
      (hint ? '<div class="stat-hint">' + esc(hint) + '</div>' : '') +
      '</div>';
  }

  function renderCalcResult() {
    var node = $('#dietCalcResult');
    if (!node) return;
    var hintNode = $('#dietCalcHint');

    var foods = allFoods();
    var food = findFoodById(foods, calcState.foodId) || foods[0] || null;
    if (!food) {
      node.innerHTML = statHTML('提示', '—', '', '暂无可计算的食材');
      if (hintNode) hintNode.textContent = '';
      return;
    }

    // 上游有 5 条食材只给份量、未给克重（grams = null）：不按克重硬算，按「份」展示
    if (!isNum(food.grams) || food.grams <= 0) {
      node.innerHTML =
        statHTML('热量', numOr(food.kcal), 'kcal', '每 ' + (food.portion || '1 份')) +
        statHTML('蛋白质', numOr(food.protein, 1), 'g', '') +
        statHTML('碳水', numOr(food.carbs, 1), 'g', '') +
        statHTML('脂肪', numOr(food.fat, 1), 'g', '');
      if (hintNode) {
        hintNode.textContent = '「' + food.name + '」按份计量（' + (food.portion || '1 份') +
          '），数据未提供克重，无法按输入重量换算；可直接参考上方每份数值，或改用自定义食材（每 100g）。';
      }
      return;
    }

    var grams = toNum(calcState.grams, NaN);
    if (!isFinite(grams) || grams <= 0) {
      node.innerHTML = statHTML('提示', '—', '', '请输入大于 0 的重量（g）');
      if (hintNode) hintNode.textContent = '';
      return;
    }

    var factor = grams / food.grams;
    var kcal = isNum(food.kcal) ? round(food.kcal * factor, 0) : null;
    var protein = isNum(food.protein) ? round(food.protein * factor, 1) : null;
    var carbs = isNum(food.carbs) ? round(food.carbs * factor, 1) : null;
    var fat = isNum(food.fat) ? round(food.fat * factor, 1) : null;

    node.innerHTML =
      statHTML('热量', numOr(kcal), 'kcal', '基准 ' + num(food.grams) + 'g ≈ ' + numOr(food.kcal) + ' kcal') +
      statHTML('蛋白质', numOr(protein, 1), 'g', '') +
      statHTML('碳水', numOr(carbs, 1), 'g', '') +
      statHTML('脂肪', numOr(fat, 1), 'g', '');

    if (hintNode) {
      hintNode.textContent = '换算基准：' + food.name + ' ' + num(food.grams) + 'g ≈ ' +
        numOr(food.kcal) + ' kcal；当前输入 ' + num(grams) + 'g（' + num(factor, 2) + ' 倍）。';
    }
  }

  /* ---------- 3.1 自定义食材 ---------- */

  function customFoodsHTML(customList) {
    var rows;
    if (customList.length) {
      rows = '<ul class="custom-list">' + customList.map(function (food) {
        return '<li class="custom-item">' +
          '<span class="custom-info"><b>' + esc(food.name) + '</b> · 每 100g：' +
          esc(numOr(food.kcal)) + ' kcal · 蛋白质 ' + esc(numOr(food.protein, 1)) +
          ' g · 碳水 ' + esc(numOr(food.carbs, 1)) + ' g · 脂肪 ' + esc(numOr(food.fat, 1)) + ' g</span>' +
          '<button type="button" class="btn btn-danger" data-action="delCustom" data-index="' +
          String(food.idx) + '">删除</button>' +
          '</li>';
      }).join('') + '</ul>';
    } else {
      rows = '<p class="empty">还没有自定义食材，添加后会同步出现在上方营养参考表和计算器中。</p>';
    }

    return '<div class="panel">' +
      '<h2 class="panel-title">自定义食材（每 100g）</h2>' +
      '<p class="diet-hint">填写每 100g 的蛋白质、碳水与脂肪；热量留空时按 4P + 4C + 9F 自动计算。数据仅保存在本机浏览器。</p>' +
      '<form data-role="customForm">' +
      '<div class="form-row">' +
      '<label class="field">' +
      '<span class="field-label">食材名称</span>' +
      '<input type="text" data-field="name" maxlength="24" placeholder="如：自制鸡胸肉丸" />' +
      '</label>' +
      '</div>' +
      '<div class="form-row">' +
      '<label class="field"><span class="field-label">蛋白质（g）</span>' +
      '<input type="number" data-field="protein" min="0" max="100" step="0.1" inputmode="decimal" value="0" /></label>' +
      '<label class="field"><span class="field-label">碳水（g）</span>' +
      '<input type="number" data-field="carbs" min="0" max="100" step="0.1" inputmode="decimal" value="0" /></label>' +
      '<label class="field"><span class="field-label">脂肪（g）</span>' +
      '<input type="number" data-field="fat" min="0" max="100" step="0.1" inputmode="decimal" value="0" /></label>' +
      '<label class="field"><span class="field-label">热量（kcal，可选）</span>' +
      '<input type="number" data-field="kcal" min="0" max="900" step="1" inputmode="decimal" placeholder="留空自动算" /></label>' +
      '</div>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn btn-primary">添加食材</button>' +
      '<button type="button" class="btn btn-ghost" data-action="resetCustom">清空输入</button>' +
      '</div>' +
      '</form>' +
      rows +
      '</div>';
  }

  /* ================================================================== *
   * 4. 事件（init 时对容器绑定一次，委托处理内部按钮 / 表单）
   * ================================================================== */

  function ensureBound() {
    if (bound) return;
    var dietNode = $('#dietContent');
    var foodsNode = $('#foodsContent');
    if (!dietNode || !foodsNode) return; // DOM 未就绪时由后续 render() 再试
    dietNode.addEventListener('click', onDietClick);
    foodsNode.addEventListener('click', onFoodsClick);
    foodsNode.addEventListener('submit', onFoodsSubmit);
    foodsNode.addEventListener('input', onFoodsInput);
    foodsNode.addEventListener('change', onFoodsChange);
    bound = true;
  }

  function closestAction(target) {
    return target && target.closest ? target.closest('[data-action]') : null;
  }

  /* ---------- 4.1 饮食页：蛋白质来源切换 / 复制购物清单 ---------- */

  function onDietClick(event) {
    var btn = closestAction(event.target);
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'protein') switchProteinSource(btn);
    else if (action === 'copyShopping') copyShoppingList();
  }

  function switchProteinSource(btn) {
    var mp = currentMealPlan();
    var sources = proteinSources(mp);
    var idx = toNum(btn.getAttribute('data-index'), 0);
    idx = isFinite(idx) ? Math.round(idx) : 0;
    if (idx < 0 || idx >= sources.length) return;

    getState().proteinSource = idx;
    FP.save();
    renderDiet();

    var source = sources[idx];
    if (!source) return;
    if (source.note) {
      FP.toast('已切换为「' + source.label + '」：餐单文案与每 100g 说明已同步，餐次热量/克数按当前目标不变。');
    } else {
      FP.toast('已切换蛋白质来源为「' + source.label + '」，餐单文案已同步');
    }
  }

  function copyShoppingList() {
    var plan = getPlan();
    var mp = currentMealPlan();
    var sources = proteinSources(mp);
    var selected = selectedSource(sources, mp);
    var scaled = shoppingItems(mp, plan, selected.source && selected.source.label);
    if (!scaled.items.length) {
      FP.toast('购物清单暂无可复制的内容', true);
      return;
    }
    var text = shoppingText(scaled.items, plan);
    var result = FP.util.copy(text);
    if (result && typeof result.then === 'function') {
      result.then(function (ok) {
        if (ok) FP.toast('一周购物清单已复制到剪贴板');
        else FP.toast('复制失败，请手动选择清单文本', true);
      });
    } else {
      FP.toast('复制失败，请手动选择清单文本', true);
    }
  }

  /* ---------- 4.2 饮食库：删除自定义食材 / 计算器 / 自定义表单 ---------- */

  function onFoodsClick(event) {
    var btn = closestAction(event.target);
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'delCustom') {
      deleteCustomFood(toNum(btn.getAttribute('data-index'), -1));
    } else if (action === 'resetCustom') {
      var form = btn.closest ? btn.closest('[data-role="customForm"]') : null;
      if (form && typeof form.reset === 'function') form.reset();
    }
  }

  function onFoodsSubmit(event) {
    var form = event.target && event.target.closest ? event.target.closest('[data-role]') : null;
    if (!form) return;
    var role = form.getAttribute('data-role');
    if (role === 'calcForm') {
      event.preventDefault();
      syncCalcStateFromForm(form);
      renderCalcResult();
    } else if (role === 'customForm') {
      event.preventDefault();
      addCustomFood(form);
    }
  }

  function onFoodsInput(event) {
    var el = event.target;
    if (!el || !el.getAttribute) return;
    if (el.getAttribute('data-role') === 'calcGrams') {
      calcState.grams = el.value;
      renderCalcResult();
    }
  }

  function onFoodsChange(event) {
    var el = event.target;
    if (!el || !el.getAttribute) return;
    var role = el.getAttribute('data-role');
    if (role === 'calcFood') {
      calcState.foodId = el.value;
      renderCalcResult();
    } else if (role === 'calcGrams') {
      calcState.grams = el.value;
      renderCalcResult();
    }
  }

  function syncCalcStateFromForm(form) {
    var gramsInput = form.querySelector('[data-role="calcGrams"]');
    var foodSelect = form.querySelector('[data-role="calcFood"]');
    if (gramsInput) calcState.grams = gramsInput.value;
    if (foodSelect) calcState.foodId = foodSelect.value;
  }

  function readNumberField(form, field, max) {
    var input = form.querySelector('[data-field="' + field + '"]');
    if (!input) return 0;
    var v = toNum(input.value, 0);
    if (!isFinite(v) || v < 0) return 0;
    return clamp(v, 0, max === undefined ? 100 : max);
  }

  /** 读取自定义食材表单并写入 state.customFoods（同时参与营养表与计算器） */
  function addCustomFood(form) {
    var state = getState();
    if (!Array.isArray(state.customFoods)) state.customFoods = [];

    var nameInput = form.querySelector('[data-field="name"]');
    var name = trimText(nameInput && nameInput.value);
    if (!name) {
      FP.toast('请填写食材名称', true);
      if (nameInput && nameInput.focus) nameInput.focus();
      return;
    }
    if (name.length > 24) name = name.slice(0, 24);

    var protein = readNumberField(form, 'protein');
    var carbs = readNumberField(form, 'carbs');
    var fat = readNumberField(form, 'fat');
    var kcalInput = form.querySelector('[data-field="kcal"]');
    var kcalRaw = kcalInput ? toNum(kcalInput.value, NaN) : NaN;

    var hasMacro = protein > 0 || carbs > 0 || fat > 0;
    var hasKcal = isFinite(kcalRaw) && kcalRaw > 0;
    if (!hasMacro && !hasKcal) {
      FP.toast('请至少填写一项营养数据（蛋白质 / 碳水 / 脂肪 / 热量）', true);
      return;
    }
    var kcal = hasKcal ? round(kcalRaw, 0) : round(protein * 4 + carbs * 4 + fat * 9, 0);

    var exists = allFoods().some(function (food) { return food.name === name; });
    if (exists) {
      FP.toast('「' + name + '」已存在，请换个名称', true);
      return;
    }

    state.customFoods.push({
      name: name,
      protein: round(protein, 1),
      carbs: round(carbs, 1),
      fat: round(fat, 1),
      kcal: kcal
    });
    FP.save();
    renderFoods();
    FP.toast('已添加自定义食材：' + name);
  }

  function deleteCustomFood(index) {
    var state = getState();
    var list = Array.isArray(state.customFoods) ? state.customFoods : [];
    var item = list[index];
    if (!item) return;
    var label = trimText(item.name) || '该食材';
    if (typeof root.confirm === 'function' && !root.confirm('确定删除自定义食材「' + label + '」？')) return;
    list.splice(index, 1);
    state.customFoods = list;
    FP.save();
    renderFoods();
    FP.toast('已删除自定义食材：' + label);
  }

  /* ================================================================== *
   * 5. 对外模块接口
   * ================================================================== */

  function init() {
    ensureBound();
  }

  function render() {
    ensureBound();
    renderDiet();
    renderFoods();
  }

  FP.diet = { init: init, render: render };
})(typeof window !== 'undefined' ? window : globalThis);