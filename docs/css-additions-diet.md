# 饮食页（`js/diet.js`）样式追加清单

> 范围：`#dietContent` + `#foodsContent` 两个容器内由 `js/diet.js` 动态注入的 HTML。
> 约定来源：`docs/api.md` §6（复用既有类名，避免内联样式）。本文档只记录 **diet.js 新增、且未出现在 `index.html` 静态结构中的类名**，供样式负责人核对/回归。
>
> **核查结论（2026-11-02，当前 `css/styles.css` 2729 行）**：下列类名已全部由 `css/styles.css` 第 10 节「饮食」（约 1345–1626 行）覆盖，**无需新增样式**。
> 复核命令：`node scripts/check-css.js` → 「index.html + js 中出现的 class：156 个 / 未找到：仅 `.cls`」；`.cls` 是 app.js `printSection()` 里的动态变量名，属脚本正则误报，与饮食页无关。
> 若后续重写 `styles.css`，请保留下表选择器（含注释里标注的父子结构关系）。

## 1. 新增类名（18 个）

| 类名 | 用途 | 结构 / 关键选择器要点 | 当前样式位置 |
| --- | --- | --- | --- |
| `.diet-target` | 每日目标摘要（热量 + 三大营养素） | `<p>`，绿色底强调块；`:empty` 隐藏 | 1349 |
| `.diet-hint` | 模块说明 / 餐次合计说明 / 购物基准说明 | `<p>`，次要文字；`:empty` 隐藏 | 1365 |
| `.protein-block` | 蛋白质来源切换区容器 | `flex column`；内含 `.field-label` + `.segmented` + `.protein-note` | 1377 |
| `.protein-note` | 当前来源的「每 100g：…」说明 | `<p>`，小号次要文字 | 1397 |
| `.meal-grid` | 餐次卡网格 | `display:grid`，桌面 2 列；内含 `.day-card` | 1405 |
| `.meal-kcal` | 餐次热量徽标 | `.day-head` 右侧 `<span>`，胶囊徽标 | 1430 |
| `.meal-desc` | 餐次搭配文案 | `.day-body > p` | 1444 |
| `.meal-macros` | 餐次蛋白质/碳水/脂肪 | `.day-body > p`，**子元素必须是 `<span>`**；`span:first-child` 绿色加粗 | 1477 |
| `.tip-list` | 饮食建议列表 | `<ul>` / `<li>`，绿色 marker | 1498 |
| `.shop-head` | 购物清单标题行（标题 + 复制按钮） | `flex space-between`；内含 `.panel-title` | 1513 |
| `.shop-list` | 购物清单列表 | `<ul>`，桌面 2 列 | 1528 |
| `.shop-item` | 单条购物项 | `flex space-between` + 虚线下边框 | 1537 |
| `.shop-name` | 食材名 | 允许收缩换行 | 1551 |
| `.shop-amount` | 用量 | 右侧绿色加粗、不换行 | 1555 |
| `.calc-hint` | 食材计算器换算说明 | `<p>`，小号次要文字；`:empty` 隐藏 | 1563 |
| `.custom-list` | 自定义食材列表 | `<ul>` | 1575 |
| `.custom-item` | 单条自定义食材 | `flex`，左说明右删除按钮 | 1584 |
| `.custom-info` | 自定义食材营养说明 | `flex:1`，`<b>` 为名称 | 1596 |

> 说明：`.meal-grid` 复用 `.day-card / .day-head / .day-body` 结构（api.md §6 既有类），样式表已在 `.meal-grid` 作用域内覆盖「折叠 → 常开」行为；`diet.js` **不**给 `.day-card` 加 `open/is-open` 类，也不需要点击展开。

## 2. 复用的既有类名（不新增样式）

- 容器/面板：`.panel` `.panel-title` `.stack`
- 表单：`.form-row` `.field` `.field-label` `.form-actions`
- 按钮/分段：`.btn` `.btn-primary` `.btn-ghost` `.btn-danger` `.segmented` `.seg-btn`（`active` / `aria-pressed`）
- 统计块（计算器结果）：`.stat-grid` `.stat` `.stat-label` `.stat-value` `.stat-unit` `.stat-hint`
- 表格：`.table-wrap` + `<table>`（6 列：食物/份量/热量/蛋白质/碳水/脂肪）
- 徽标/空态：`.badge`（自定义食材标记）`.empty`（空态）
- 餐次卡：`.day-card` `.day-head` `.day-body`

## 3. DOM 钩子（非样式，样式负责人可忽略；供联调核对）

- 事件委托属性（`js/diet.js` 内绑定到 `#dietContent` / `#foodsContent`）：
  - `data-action="protein"` + `data-index="<数字>"`：蛋白质来源切换
  - `data-action="copyShopping"`：复制一周购物清单
  - `data-action="delCustom"` + `data-index="<state.customFoods 下标>"`：删除自定义食材
  - `data-action="resetCustom"`：清空自定义食材表单
  - `data-role="calcForm" | "calcFood" | "calcGrams" | "customForm"`
  - `data-field="name|protein|carbs|fat|kcal"`：自定义食材表单字段
- 动态节点 id（渲染时创建）：`#dietCalcResult`（`.stat-grid` 结果区）、`#dietCalcHint`（`.calc-hint`）
- 空态：`.empty` 文案均在 `.panel` 内；无计划时 `#dietContent` 仅一个 `.panel` + `.empty` + 「去首页生成计划」按钮（`data-goto="home"`，由 app.js 全局委托处理）。

## 4. 未使用的备用类（样式表已有，diet.js 不生成，避免误删）

`.meal-list` `.meal-card` `.meal-head` `.meal-sample` `.result-box`。
其中 `.result-box` 是任务书允许的计算器结果容器备选；本实现选择复用 `.stat-grid`（与首页统计卡视觉一致），故未使用。