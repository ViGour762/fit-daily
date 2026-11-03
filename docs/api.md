# 前端接口契约（FP API）

所有脚本按 `index.html` 中顺序加载：`data.js → nutrition.js → core.js → training.js → diet.js → weight.js → settings.js → dashboard.js → app.js`。
除 `app.js` 外，各文件只允许**定义**对象，不允许在加载时直接操作 DOM；`app.js` 在 `DOMContentLoaded` 后按顺序调用各模块的 `init()` 与 `render()`。

## 1. 全局对象

| 全局 | 提供者 | 说明 |
| --- | --- | --- |
| `FP_TRAINING` | `js/data.js` | 动作库、计划模板、肌群分组 |
| `FP_NUTRITION` | `js/nutrition.js` | 食物表、餐单、参考文献 |
| `FP.core` | `js/core.js` | 纯算法（BMR/TDEE/宏量/单位/日期/ICS/CSV） |
| `FP.state` | `js/app.js` | 当前应用状态（直接读写内存对象） |
| `FP.save()` | `js/app.js` | 持久化到 localStorage（内部防抖） |
| `FP.plan()` | `js/app.js` | 当前营养方案（`calcNutrition` 结果）或 `null` |
| `FP.program()` | `js/app.js` | 当前训练计划（已合并用户编辑），结构见 §4 |
| `FP.renderAll()` | `js/app.js` | 重绘首页 + 所有视图 |
| `FP.go(view)` | `js/app.js` | 切换视图（`home/training/diet/weight/settings`） |
| `FP.toast(msg, isError)` | `js/app.js` | 底部轻提示，2.6s 自动消失 |
| `FP.dashboard` | `js/dashboard.js` | 首页仪表盘渲染模块 `{ init, render }` |
| `FP.util` | `js/app.js` | 工具函数集合（见 §3） |

## 2. 状态结构（localStorage 键 `fitdaily-state`，JSON）

```js
{
  version: 1,
  profile: { sex:'male', age:25, height:175, weight:70, bodyFat:null,
             equipment:'gym', activity:'light', goal:'cut', days:3,
             experience:'beginner', diet:'normal', split:'upperlower' }, // split: upperlower | bro（仅 4 天生效）
  adjust: null,              // 热量调整百分比（null=按目标默认），滑杆写入
  generatedAt: null,         // ISO 时间戳
  program: null,             // 生成时的 { equipment, days, experience, goal } 快照
  overrides: {},             // 训练动作编辑：{ "0-2": {name,muscle,sets,reps,rest,tip} | {removed:true} }
  reduceLevel: 0,            // 「一键降低容量」次数（每次每组 -1，最少 1 组）
  schedule: { weekdays:[1,3,5], time:'18:30', lead:30 },
  checkins: {},              // { "2026-11-02": "推 A" }
  weights: [ { date:'2026-11-02', kg:70, bodyFat:null } ],
  targetWeight: null,
  sessions: [ { date, dayTitle, at, sets:[{name,sets,reps}], volume } ],
  customFoods: [ { name, protein, carbs, fat, kcal } ],
  settings: { theme:'light', font:16, weightUnit:'kg', heightUnit:'cm',
              waterInterval:60, waterOn:false },
  proteinSource: 0,          // 饮食页当前选中蛋白质来源索引
  ui: { view:'home', month:null }
}
```

`fitdaily-theme` 与 `fitdaily-font` 另存独立键（`index.html` 首屏脚本会读，避免闪烁），必须与 `state.settings` 同步写入。

## 3. `FP.util`

```js
FP.util.$   (sel, root)          // querySelector
FP.util.$$  (sel, root)          // Array.from(querySelectorAll)
FP.util.esc (str)                // HTML 转义（等价 FP.core.escapeHtml）
FP.util.num (n, digits)          // 数字格式化，非数字返回 '—'
FP.util.clamp, .round, .toNum    // 透传 FP.core
FP.util.today()                  // 'YYYY-MM-DD'
FP.util.download(filename, content, mime)
FP.util.copy(text) -> Promise<boolean>
FP.util.debounce(fn, ms)
FP.util.bytes(n)                 // 文件大小格式化
FP.util.printSection(id)         // 打印：给 body 加 print-<id> 类后调用 window.print()
FP.util.unitWeight(kg) -> '70 kg' / '140 斤'   // 按设置换算展示
FP.util.unitWeightValue(kg) -> number
FP.util.weightUnit() -> 'kg' | 'jin'
FP.util.heightUnit() -> 'cm' | 'ft'
FP.util.notifyPermission() -> 'granted'|'denied'|'default'
FP.util.askNotify() -> Promise<Permission>
```

## 4. `FP.program()` 返回值

```js
[
  {
    index: 0,                 // 第几天（0 起）
    title: '推 A',
    muscles: '胸 · 肩 · 三头',
    note: '每天开头说明文案（可空）',
    exercises: [
      {
        slot: '0-1',          // overrides 的键
        idx: 1,               // 当天内序号（0 起）
        key: 'bench',         // 动作 key（可能为空，用户自定义名）
        name: '杠铃卧推',
        muscle: '胸 · 三头',
        sets: 3,              // 已应用 reduceLevel 与 overrides
        reps: '8-10',
        rest: 120,            // 秒
        tip: '肩胛骨后收下沉，杠铃触胸',
        mistake: '耸肩或手腕弯折',
        fix: '建议肩胛骨后收下沉，手腕保持中立',
        img: 'img/bench.webp',
        demo: 'https://lihua2779.github.io/fit-plan/img/bench.webp' // 远程备用
      }
    ]
  }
]
```
若无计划则返回 `null`。

## 5. 各视图模块契约

每个模块导出 `FP.<name> = { init(), render() }`，`init()` 在启动时调用一次（绑定事件），`render()` 在每次状态变化后调用（可重复执行，内部用容器 `innerHTML` 整体重建）。

| 模块 | 文件 | 渲染容器 | 负责内容 |
| --- | --- | --- | --- |
| `FP.dashboard` | `js/dashboard.js` | `#dashboardRoot` | 首页仪表盘：问候、KPI 环、今日训练、体重 spark、本周打卡、快捷入口、无计划引导 |
| `FP.training` | `js/training.js` | `#trainingContent`、`#calendarContent` | 训练计划卡、肌群覆盖、一键降容、训练日折叠、编辑浮层（`#editOverlay`）、沉浸式训练（`#sessionOverlay`）、组间计时器（`#timerOverlay`）、训练日历、日程与提醒、导出 .ics |
| `FP.diet` | `js/diet.js` | `#dietContent`、`#foodsContent` | 每日饮食安排（餐次卡 + 蛋白质来源切换）、一周购物清单（复制）、食物营养表、食材计算器、自定义食材 |
| `FP.weight` | `js/weight.js` | `#weightChart`、`#weightList`、`#weightTip`、`#volumeChart`、`#sessionList`，并绑定 `#weightForm`、`#saveTargetBtn` | 体重记录、目标线、体重曲线、训练容量曲线、记录列表 |
| `FP.settings` | `js/settings.js` | 设置页控件、`#refsList`、状态文案 | 主题、字号、单位、饮水提醒、PDF/CSV/ICS 导出、JSON 备份导入导出、清空数据 |

## 6. 样式与类名约定（CSS 由 `css/styles.css` 统一提供）

渲染层请复用以下既有类名，避免自定义内联样式：
`.panel .panel-title .stack .form-row .field .field-label .segmented .seg-btn .btn .btn-primary .btn-ghost .btn-danger .btn-lg .stat-grid .stat .stat-value .stat-label .stat-hint .macro-bar .macro-seg .deficit-control .quick-links .table-wrap table .day-card .day-head .day-body .exercise-row .demo-img .badge .pill .empty .chart-wrap .weight-list .session-list .calendar-grid .cal-cell .is-today .is-training .other-month .notify-status .setting-row .setting-label .setting-actions .toast .overlay .overlay-card .overlay-close`
JS 动态注入的类若 CSS 尚未覆盖，请在报告中列出，由 Lead 转给样式负责人。

## 7. 约定

- 所有用户可见文本使用中文；数字一律经 `FP.util.num` 或 `FP.core.round` 处理，避免 `0.30000000000000004`。
- 任何写入 `FP.state` 的操作后必须调用 `FP.save()`；需要重绘时调用 `FP.renderAll()`。
- 渲染函数必须幂等：不要重复注册 DOM 事件（渲染内容用 `innerHTML` 重建；静态节点的事件在 `init()` 里绑定一次，或使用事件委托）。
- 不要使用 `alert/confirm/prompt` 以外的第三方库（推荐 `FP.util.confirm` 未提供时用原生 `confirm`）。
- 不引入网络请求（除演示图 `img` 标签的远程兜底）。