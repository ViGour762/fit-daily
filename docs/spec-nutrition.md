# 营养 / 热量算法规格（对齐上游 FitPlan）

> 来源：`https://github.com/lihua2779/fit-plan` main 分支 `js/app.js`（blob `673d70a`，126522 B，版本 v20260811-04）+ README.md。
> 数据本体见 `js/nutrition.js`（`FP_NUTRITION`），本文件只写「怎么算」。所有数字均为上游原值，未做美化。

## 1. 基础代谢 BMR

```
base = 10 × 体重kg + 6.25 × 身高cm − 5 × 年龄
男性 BMR = base + 5      女性 BMR = base − 161
```

**体脂率分支（Katch-McArdle）**：当用户填写了体脂率且 `3 ≤ bf ≤ 60` 时，改用它，而不是 Mifflin：

```
LBM = 体重kg × (1 − bf / 100)
BMR = 370 + 21.6 × LBM
```

- 未填 / 超范围 → 回落 Mifflin；`formulaLabel` = `'Mifflin-St Jeor'`，Katch 命中时为 `'Katch-McArdle（含体脂修正）'`。
- README **完全没提**这个分支（README 只写 Mifflin 是唯一公式）——以实现为准。

## 2. 活动系数与 TDEE

`TDEE = BMR × factor`（factor 原值）

| key | factor | 文案 |
| --- | --- | --- |
| sedentary | 1.2 | 久坐少动 |
| light | 1.375 | 轻度活动 |
| moderate | 1.55 | 中度活动 |
| active | 1.725 | 高度活动 |
| athlete | 1.9 | 极高强度 |

## 3. 目标热量

| 目标 | 公式 | 滑杆范围 | 默认 |
| --- | --- | --- | --- |
| 减脂 cut | `round(tdee × (1 − deficit))` | 10%–20%（`min=10,max=20,step=1`） | 15% |
| 增肌 bulk | `round(tdee × (1 + deficit))` | **5%–15%**（`min=5,max=15`） | 12% |
| 保持 maintain | `round(tdee × 1)` | 隐藏 | 0 |

- 滑块 HTML 初始 `value="15"`；`deficit` 存小数（0.15 / 0.12），存进 `input.deficit`。
- 上游仍保留 `GOAL_CONFIG.calorieRatio = 0.85 / 1.12 / 1.0`，但 `calcTargets` 已不用它（死配置，别实现成固定 85%/112%）。

## 4. 三大营养素与饮水

| 项 | 规则 |
| --- | --- |
| 蛋白质 | `round(体重kg × proteinPerKg)`；系数 减脂 2.2 / 增肌 1.8 / 保持 1.6 |
| 蛋白质区间 | 减脂 [1.8, 2.7] · 增肌 [1.6, 2.2] · 保持 [1.4, 2.0] g/kg |
| 脂肪 | `round(热量 × 0.25 / 9)`；建议区间供能 20%–35% |
| 碳水 | `round((热量 − 蛋白质×4 − 脂肪×9) / 4)`（剩余热量） |
| 饮水 | `round(体重kg × 35)` ml；文案称「常见建议 30–40 ml/kg」 |
| 展示用蛋白系数 | `round(蛋白质 / 体重 × 10) / 10` → 1 位小数（如 2.2） |

**参考画像（= 上游首屏默认表单：男 / 25 / 175cm / 70kg / light / cut 15%）**
BMR 1673.75→**1674**，TDEE 2301.4→**2301**，热量 **1956**，蛋白 **154**，脂肪 **54**，碳水 **214**，饮水 **2450**，蛋白系数 **2.2**，脂肪供能 **25%**。
（增肌：2578 / 126 / 357 / 72；保持：2301 / 112 / 319 / 64。）

## 5. 每周体重变化预期

```
weeklyChangeKg = (tdee − calories) × 7 / 7700   // 减脂
               = (calories − tdee) × 7 / 7700   // 增肌；保持 = 0
```

展示格式：斤 `(kg×2).toFixed(1)`，公斤 `kg.toFixed(2)`。参考画像减脂：**0.6 斤（0.31 kg）**。

- 减脂提示原文：`每周预计减重约 {jin} 斤（{kg} kg），建议每周减重不超过体重的 1%。`
- 增肌提示原文：`每周预计增重约 {jin} 斤（{kg} kg），增肌期体重增速宜缓。`
- 目标说明文案另写：减脂「缺口 300–500 kcal（10–20% TDEE），每周减重 0.5–1% 体重」；增肌「盈余 300–500 kcal，每周增重 0.25–0.5% 体重」。

## 6. `✓ / ⚠` 判定阈值（全部）

| 位置 | 判定 | 文案 |
| --- | --- | --- |
| 蛋白质区间 | `ppk ≥ lo && ppk ≤ hi` | 通过 `…g/kg（推荐区间 a-b g/kg）✓`；失败 `…⚠ 建议调整` |
| 脂肪供能 | `round(fat×9/calories×100)` 落在 [20,35] | 通过 `脂肪供能 N%（推荐 20-35%）✓`；失败 `⚠` |
| 肌群覆盖 chip | `sessions > cap` 时加 `chip-risk` | cap = 新手 2 / 中级 3 / 高级 4（`plan.coverage` 的 `sessions` 按「训练日」计，`exercises` 按动作数计） |
| 热量缺口滑杆 | 减脂 10–20、增肌 5–15，超出由 `min/max` 夹住 | — |
| 表单校验 | 见 §7 | `请检查：…` 红色（`#dc2626`）；通过 `#16a34a` |

- `macroRangeNote` 用 `join(' · ')` 拼两段；通过加 class `ok`（`#16a34a`），失败加 `warn`（`#92400e` 底 `#fef3c7`）。

## 7. 取整与单位换算

| 对象 | 方式 |
| --- | --- |
| 热量 / 蛋白质 / 碳水 / 脂肪 / 饮水 / BMR / TDEE | `Math.round` |
| 蛋白系数（g/kg） | `Math.round(x*10)/10` |
| 脂肪供能百分比、宏量分配条百分比、瘦身百分比 | `Math.round` → 整数 |
| 身高（英尺输入） | `Math.round(ft × 30.48)` cm |
| 体重（斤输入） | `kg = jin / 2`（不取整）；展示 `kg × 2` |
| 每周变化 | 斤 `.toFixed(1)`、kg `.toFixed(2)` |

单位：`1 kg = 2 斤`；`1 ft = 30.48 cm`。`fitplan-units = { weight:'kg'|'jin', height:'cm'|'ft' }`。
校验区间与原文：年龄 14–90；身高 120–230cm（英尺输入时同区间，提示「身高需在约 4.0-7.5 英尺之间」）；体重 30–200kg（斤输入时「体重需在 60-400 斤之间」）；体脂 3–60%。多条错误用 `；` 连接。

## 8. 餐单与购物清单规则

- 餐次占比只由 **目标** 决定：减脂/保持 25·35·10·30（早·午·加餐·晚）；增肌 25·10·30·10·25（早·上午加餐·午餐·练前/练后加餐·晚餐）。
- 每餐数值 = `round(targets × pct)`，四个字段各自取整（**四项之和不必等于日总量**，这是上游行为）。
- 文案由 `mealSampleText(goal, diet, proteinLabel)` 生成：只有 `vegan`（奶/蛋/酸奶→豆浆、豆腐·天贝）与 `lowCarb`（去主食、蔬菜加倍）两个开关。
- **蛋奶素 vegetarian 的餐单文案与购物清单与普通饮食完全相同**（只改提示文案）。
- **切换蛋白质来源（鸡胸肉/瘦牛肉/鱼虾/豆腐·豆干）只替换标签与「每 100g：…」说明，不重算任何热量/克数**；默认 chicken（纯素默认 tofu）。
- 购物清单：蛋白质 = `protG×7g`（减脂 150 / 增肌 200 / 保持 160 g/天）；鸡蛋 14 个（增肌 21）；牛奶/酸奶 7 杯；燕麦 350g（增肌 560）；米饭/杂粮饭 1.5kg（增肌 3kg）；红薯/糙米 500g；蔬菜 2kg（低碳水 3kg）；水果/莓果 7 份（低碳水 500g）；坚果 150g；橄榄油 1 瓶；纯素额外「豆浆 7 杯 + 天贝/豆腐 700g」，且无鸡蛋/牛奶。
- 上游只按目标三档缩放，**没有按实际目标热量连续缩放**；低碳水不吃燕麦/米饭/红薯三行。

## 9. localStorage（上游键 / 结构 / 默认值）

| 键 | 结构 / 默认 |
| --- | --- |
| `fitplan-profile` | `{sex,age,height,weight,bodyFat,activity,goal,days,experience,diet,equipment,deficit}`；height 已转 cm、weight 已转 kg、bodyFat 未填为 `null` |
| `fitplan-settings` | `{weekdays:[0,2,4], time:'19:00', leadMin:30, enabled:false, customized:false}`；另含 render 时写入的派生 `weekdayPlan`。默认周几：2 天 [0,3]、3 天 [0,2,4]、4 天 [0,1,3,4]、5 天 [0,1,2,3,4]、6 天 [0..5]（0=周一） |
| `fitplan-volume` | `'full'`（默认）\| `'light'`（每组减 1 组，最少 2 组） |
| `fitplan-custom-plan` | `{}`；`{ "3-gym": { pushA: [{name,muscle,sets,reps,rest,tip}] } }`（键为 `${days}-${equipment}`） |
| `fitplan-units` | `{weight:'kg', height:'cm'}` |
| `fitplan-sessions` | `[]`；每次完成沉浸训练 push `{date,dayTitle,sets,durationMin}` |
| `fitplan-protein-source` | `'chicken'`；可 `beef/fish/tofu` |
| `fitplan-theme` | 无（浅色）\| `'dark'`，由 index.html 首屏脚本读取 |
| `fitplan-font` | `'16'` \| `'18'`（`Number(v) || 16`） |
| `fitplan-version` | `version.txt` 内容；变化时清 CacheStorage + 反注册 SW + reload |
| `fitplan-notified-{Date.toDateString()}-{H}-{m}` | 值为 `'1'`，当日该时刻提醒去重 |

本项目按 `docs/api.md` 用单键 `fitdaily-state` 承载上述内容（`fitdaily-theme` / `fitdaily-font` 仍单独存）；上表是上游站点的键，仅作备份导入兼容与行为对照。

## 10. 文案模板（占位符如实保留）

```
每日目标热量额外文案：比维持热量低约 {gap} kcal（{pct}% 缺口）
                     比维持热量高约 {gap} kcal（{pct}% 盈余） / 与维持热量持平
蛋白质卡片额外：      约 {proteinPerKg} g/kg          碳水/脂肪：约 {kcal} kcal
饮水卡片额外：        建议分多次饮用
宏观提示：            蛋白质 {ppk} g/kg（推荐区间 {lo}-{hi} g/kg）{✓|⚠ 建议调整} · 脂肪供能 {fatPct}%（推荐 20-35%）{✓|⚠}
分配条图例：          热量分配：蛋白质 {p}% · 碳水 {c}% · 脂肪 {f}%
画像条：              {目标} · {活动水平} · 每周 {days} 练 · {经验} · 体重 {值}{斤|kg} · {公式名}
饮食页首段：          目标 {calories} kcal，蛋白质 {protein}g / 碳水 {carbs}g / 脂肪 {fat}g。…
蛋白质依据：          蛋白质建议区间：{range}。本方案取 {protein}g（{ppk} g/kg），依据 Morton 2018 … ISSN 2017 …
饮水：                每天饮水 {waterMl}ml（约 35 ml/kg，运动人群常见建议 30–40 ml/kg）…
缺口滑杆标题：        热量缺口（可调） / 热量盈余（可调），右上角显示 {pct}%
```
参考画像实例：`比维持热量低约 345 kcal（15% 缺口）`、`约 2.2 g/kg`、`每周预计减重约 0.6 斤（0.31 kg）`。

## 11. 与 README 的差异 / 上游死代码

1. README 写「增肌 112%（10–20% 盈余区间）」，代码增肌滑杆是 **5%–15%**、默认 12%。
2. README 未提填体脂后切 **Katch-McArdle**。
3. README 说「减脂取 TDEE 的 85%」，实际由滑杆决定（默认 15%，即 ×0.85 只是默认巧合）。
4. `GOAL_CONFIG.calorieRatio`、`SPLIT_MAP`、`experienceAllowedDays`（新手最多 3 天）都是死配置/死函数，未被调用。
5. 餐次四项取整后相加与日总量有 ±1~3 的误差，属上游已知行为。

## 12. 已知缺口（本会话 web_fetch 截断，未臆造）

上游 `app.js` 末尾约 270 行（体重记录、目标体重、打卡、自定义食材、饮水提醒、JSON 备份/清空）无法读取（单次响应上限 ≈62.5 KB）。因此：
- 未能取证这些功能的 **localStorage 键名**；已知 `getCheckins()/saveCheckins()` 存 `{ "YYYY-MM-DD": 1 }`、`getTargetWeight()` 存在（来自可见调用点）。
- `fitplan-custom-foods` 类键名未确认，实现时请自行命名并在备份格式中注明。

其余数值（食物 22 条、餐次、购物清单、6 条参考文献）均已 1:1 取自上源，可用 `node -e "const d=require('./js/nutrition.js');…"` 复核。