# 训练页 CSS 约定（js/training.js）

> 结论：**本模块没有新增任何 CSS 类名**，全部复用 `css/styles.css` 中已定义的类 + `index.html` 中浮层的静态类。
> 本文档记录「training.js 依赖哪些类 / 什么 DOM 契约 / 哪些状态类会被动态切换」，供样式负责人与后续维护者核对，避免误删。

## 1. 渲染容器

| 容器 | 模块负责内容 |
| --- | --- |
| `#trainingContent.stack` | 计划头卡、肌群覆盖卡、训练日折叠卡、空态 |
| `#calendarContent.stack` | 训练日历卡、日程与提醒卡 |
| `#editOverlay` / `#sessionOverlay` / `#timerOverlay` | 结构已由 `index.html` 写死，模块只填内容 / 切 `hidden` |

`render()` 每次整体重建两个容器的 `innerHTML`，事件全部委托在容器上，因此容器内所有节点都可以安全重绘。

## 2. 依赖的既有类（请勿从 styles.css 删除）

**训练页**
`.stack` `.panel` `.panel-title` `.plan-intro`（含 `h3` / `p`）`.tip-box`
`.coverage` `.coverage-head`（`h4` + `span`）`.chips` `.chip`（内含 `<b>`）`.coverage-note`
`.day-card` `.day-head` `.day-toggle` `.chev` `.day-body` `.day-head small`
`.table-wrap` `table` `th` `td.strong` `.demo-img` `.demo-img-wrap` `.tip-cell` `.tip-mistake` `.warn` `.row-actions`
`.badge-muted` `.badge-warn`（作为 `.chip` 的修饰类复用：超频肌群用 `.chip.badge-warn`，未覆盖大肌群用 `.chip.badge-muted`）
`.quick-links` `.btn` `.btn-primary` `.btn-ghost` `.btn-danger` `.empty`

**日历**
`.cal-head`（`h3` 居中标题 + 两侧 `.cal-nav`）`.calendar-grid`
`.cal-dow` `.cal-cell` `.cal-date` `.cal-workout` `.cal-check`
`.cal-legend` `.legend-dot` `.legend-pill` `.today-dot`

**日程与提醒**
`.form-row` `.field` `.field-label` `.segmented` `.seg-btn` `.setting-row` `.setting-label` `.setting-actions` `.notify-status`

**浮层（index.html 静态类）**
`.edit-overlay` `.edit-title` `.edit-grid` `.edit-actions` `.overlay` `.overlay-card` `.overlay-close`
`.session-overlay` `.session-card` `.session-top` `.session-day` `.session-progress` `.session-exercise` `.session-gif` `.session-meta` `.session-set` `.session-rest` `.session-rest-label` `.session-rest-time` `.session-actions`
`.timer-overlay` `.timer-card` `.timer-title` `.timer-display` `.timer-presets` `.timer-preset` `.timer-actions`

**工具类**
`.stack`（面板内部也用于纵向间距）`.strong` `.active` `.show`

## 3. 动态状态类

| 类名 | 出现位置 | 触发条件 |
| --- | --- | --- |
| `.is-open` | `.day-card` | 训练日展开（默认仅第 1 天） |
| `hidden`（属性，非类） | `.day-body` 由 `.is-open` 控制；`#sessionRest` / `#sessionSkipBtn` / `#sessionDoneBtn` / 浮层 | 休息中切换按钮、开关浮层 |
| `.active` | `.seg-btn`（周几多选）、`.timer-preset` | 选中的训练日 / 当前计时预设 |
| `.is-running` + `.running` | `#timerDisplay` | 计时器运行中（两种写法都加，兼容 index.html 的静态类） |
| `.is-today` | `.cal-cell` | 今天 |
| `.is-training` | `.cal-cell` | 训练日（可点击） |
| `.checked` | `.cal-cell` | 已打卡（显示 `.cal-check` 的 ✓） |
| `.other-month` | `.cal-cell` | 非本月日期（不可点击） |
| `.badge-warn` / `.badge-muted` | `.chip` 修饰 | 肌群超频 / 大肌群未覆盖 |
| `.no-scroll` | `body` | 任一浮层打开时锁滚动 |

## 4. DOM 契约（紧凑示意）

```html
<!-- 计划头卡 -->
<section class="panel plan-intro"><div class="stack">
  <h3>本周训练安排 · 推拉腿分化 · 健身房</h3>
  <p>分化说明…</p><p>第 1 天：推 A · 第 2 天：拉 A …</p>
  <div class="tip-box">训练建议…</div>  <!-- 3 条 -->
  <p>操作说明（表头 / 演示图 / 编辑说明）</p>
</div></section>

<!-- 肌群覆盖 -->
<section class="coverage">
  <div class="coverage-head"><h4>本周肌群覆盖（按训练日统计）</h4><span>新手推荐大肌群每周 ≤ 2 练</span></div>
  <div class="chips"><span class="chip">胸 <b>2</b> 练 · <b>5</b> 动作</span><span class="chip badge-warn">…</span></div>
  <p class="coverage-note">…</p>
  <div class="quick-links"><button class="btn btn-primary" data-act="reduce">一键降低训练容量（每组减 1 组）</button></div>
</section>

<!-- 训练日折叠卡 -->
<article class="day-card is-open">
  <div class="day-head">
    <button class="day-toggle" aria-expanded="true" aria-controls="dayBody-0">
      <span>Day 1 · 推 A<small>胸 · 肩 · 三头</small></span><span class="chev">▾</span>
    </button>
    <button class="btn btn-primary" data-act="start">开始训练</button>
  </div>
  <div class="day-body" id="dayBody-0">
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>动作</th>…<th>要点</th></tr></thead>
      <tbody><tr>
        <td class="strong">1</td>
        <td><div class="demo-img-wrap"><img class="demo-img"></div><span class="strong">杠铃卧推</span>
            <div class="row-actions"><button class="btn btn-ghost">编辑</button><button class="btn btn-danger">删除</button></div></td>
        <td>胸 · 三头</td><td class="strong">4 × 8-10</td><td>120 秒</td>
        <td><button class="btn btn-ghost">⏱</button></td>
        <td><div class="tip-cell">要点<span class="tip-mistake warn">常见错误：…；纠正：…</span></div></td>
      </tr></tbody>
    </table></div>
  </div>
</article>

<!-- 日历 -->
<section class="panel">
  <div class="cal-head"><button class="cal-nav">‹</button><h3>2026 年 11 月</h3><button class="cal-nav">›</button></div>
  <div class="calendar-grid">
    <div class="cal-dow">一</div>…×7
    <button class="cal-cell is-training checked">…</button>  <!-- 训练日点击打卡 -->
    <div class="cal-cell is-today">…</div>
  </div>
  <div class="cal-legend"><span><i class="legend-dot today-dot"></i> 今天</span>…</div>
  <p class="coverage-note">已连续打卡 N 天 · 本月打卡 M 次</p>
</section>

<!-- 日程与提醒 -->
<section class="panel"><h2 class="panel-title">日程与提醒</h2>
  <div class="form-row"><div class="field"><span class="field-label">每周训练日</span>
    <div class="segmented"><button class="seg-btn active">一</button>…×7</div></div></div>
  <div class="form-row"><label class="field">…<input type="time" data-role="train-time"></label>
    <label class="field">…<select data-role="train-lead">…</select></label></div>
  <div class="setting-row">…</div>
  <p class="notify-status">…</p>
  <div class="quick-links">…</div>
</section>
```

## 5. data-* 契约（事件委托用，样式不依赖）

| 属性 | 值 | 说明 |
| --- | --- | --- |
| `data-act` | `toggle` `start` `timer` `edit` `del` `reduce` `cal-prev` `cal-next` `checkin` `weekday` `notify` `ics` `recommend` | 容器内点击动作 |
| `data-day` | 0 起的天序号 | 折叠 / 开始训练 |
| `data-slot` | `"0-2"`（天-动作序号） | 编辑 / 删除（即 `state.overrides` 的键） |
| `data-rest` / `data-name` | 秒数 / 动作名 | ⏱ 打开计时器时带入 |
| `data-date` / `data-title` | `YYYY-MM-DD` / 计划名 | 日历打卡 |
| `data-wd` | 1–7（ISO，周一=1） | 周几多选 |
| `data-role` | `train-time` / `train-lead` | 日程输入变更（change 冒泡委托） |
| `data-local` / `data-remote` / `data-fallback` | 图片 URL | 演示图三级兜底（由 `FP.util.demoImg` 与容器捕获阶段 `error` 处理） |

固定 id（仅用于取值 / 局部刷新，重绘后重建）：`trainTimeInput`、`trainLeadSelect`、`trainNotifyBtn`、`trainNotifyStatus`、`dayBody-<n>`。

## 6. 注意事项（给样式负责人）

1. `.day-head` 里同时放了 `.day-toggle`（按钮）和「开始训练」按钮，`.day-head` 自身只负责 flex 横排与背景；`.chev` 的旋转由 `.is-open .chev` 控制（styles.css 已实现）。
2. `.table-wrap table` 在移动端横向滚动，动作列内有 `.demo-img-wrap` + 名称 + `.row-actions`，宽度会自然撑开，无需为它单独加最小宽度。
3. 风险肌群 chip 直接给 `.chip` 追加 `.badge-warn`（复用现有背景/文字色），未覆盖的大肌群追加 `.badge-muted`，均无需新增选择器。
4. 日历单元：训练日渲染为 `<button class="cal-cell">`（可点击打卡），其余为 `<div class="cal-cell">`；`button.cal-cell` 的 `cursor: pointer` 已由 styles.css 提供。
5. 训练浮层 / 计时器浮层的深色舞台样式已在 styles.css 的 13.2 / 13.3 节实现，JS 不写内联样式。