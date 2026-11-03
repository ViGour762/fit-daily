# 体重 / 设置模块：样式补充说明

对应模块：`js/weight.js`、`js/settings.js`（负责人：ui-misc）
结论：**没有新增自定义类名**，全部复用 `docs/api.md` §6 与 `index.html` 已有类。下面是这两个模块动态生成的结构、它们对 `css/styles.css` 的**硬性依赖**，以及可选的细节优化。

## 1. JS 动态生成的结构（供样式核对）

体重页记录列表（`#weightList` 容器由 index.html 提供）：

```html
<div class="table-wrap">
  <table aria-label="体重记录">
    <thead><tr><th>日期</th><th>体重</th><th>体脂</th><th>较上次</th><th>操作</th></tr></thead>
    <tbody>
      <tr>
        <td>2026-11-01（周日）</td>
        <td>70.8 kg</td>
        <td>19.2%</td>
        <td>-0.8 kg</td>
        <td><button type="button" class="btn btn-ghost" data-weight-del="2026-11-01">删除</button></td>
      </tr>
    </tbody>
  </table>
</div>
```

空态：`<p class="empty">还没有体重记录，填写上面的日期与体重即可添加第一笔。</p>`

训练记录列表（`#sessionList`）：

```html
<div class="table-wrap">
  <table aria-label="最近训练记录">
    <thead><tr><th>日期</th><th>训练日</th><th>总组数</th><th>容量</th></tr></thead>
    <tbody><tr><td>2026-10-29</td><td>推 A</td><td>3 组</td><td>81</td></tr></tbody>
  </table>
</div>
<p class="stat-hint">共 20 次训练，这里显示最近 12 次。</p>
```

空态：`<p class="empty">先完成一次训练，记录会显示在这里。</p>`

其它复用类：`.btn.btn-primary`（记录按钮）、`.btn.btn-ghost`（保存目标/帮助性按钮）、`.empty`、`.table-wrap`、`.stat-hint`、`.weight-list`、`.session-list`、`.chart-wrap`、`.notify-status`（`#waterStatus` / `#settingsStatus`）、`.setting-row` 系列（index.html 静态结构）、`.refs`（index.html 静态结构）。
JS **不写任何内联 `style`**；canvas 尺寸只改 `width`/`height` 属性，显示尺寸交给 CSS。

## 2. 必须补充的 CSS（若 styles.css 尚未覆盖）

### 2.1 canvas 自适应（硬性要求）

`js/weight.js` 会把 `#weightChart` / `#volumeChart` 的 backing store 设为 `容器宽度 × devicePixelRatio` 与 `逻辑高度 × devicePixelRatio`（700×280 / 700×220 的比例），并用 `ctx.setTransform(dpr, …)` 以逻辑像素绘图。因此 **CSS 必须让 canvas 以容器宽度的 100% 显示、高度按比例自动缩放**：

```css
.chart-wrap canvas {
  display: block;
  width: 100%;
  height: auto;
}
```

如果只写 `max-width: 100%` 而没有 `height: auto`（或没有 `width: 100%`），在 DPR > 1 的屏幕上 canvas 会按属性像素尺寸显示，导致纵向溢出 / 比例失真。窗口 resize 时 JS 已用 `debounce` 重绘，无需 CSS 参与。

### 2.2 打印导出（硬性要求）

`FP.util.printSection('training'|'diet')`（app.js 提供）只做一件事：给 `<body>` 加 `print-training` / `print-diet` 类后调用 `window.print()`。设置页的「导出训练计划 PDF」「导出每日饮食 PDF」依赖 `@media print` 里按这两个类**只放行对应视图**：

```css
@media print {
  body.print-training .view:not(#view-training),
  body.print-diet .view:not(#view-diet) { display: none !important; }
  body.print-training #view-training,
  body.print-diet #view-diet { display: block !important; }
}
```

（若按 css 任务书里的写法“打印时 .view 全部展开”，则必须再叠加上述规则，否则打印会输出所有页面。）

## 3. 可选优化（不影响功能）

```css
/* 两个列表内表格的紧凑排版 */
.weight-list .table-wrap,
.session-list .table-wrap { margin-top: .5rem; }
.weight-list td .btn,
.session-list td .btn { padding: .25rem .6rem; font-size: .8rem; }

/* 数字列右对齐，便于纵向比较 */
#weightList td:nth-child(2),
#weightList td:nth-child(3),
#weightList td:nth-child(4),
#sessionList td:nth-child(3),
#sessionList td:nth-child(4) { text-align: right; font-variant-numeric: tabular-nums; }

/* 提示文案 */
.weight-tip { margin: .5rem 0 0; color: var(--muted); line-height: 1.6; }
```

## 4. canvas 取色依赖的 CSS 变量

绘制颜色在每次 draw 时通过 `getComputedStyle(document.documentElement)` 读取，按以下候选名依次尝试，全部取不到时用固定色兜底：

| 用途 | 依次尝试的变量名 | 兜底色 |
| --- | --- | --- |
| 体重折线 / 柱状图 / 数据点 | `--green` `--primary` `--brand` `--accent-color` | `#0e9f6e` |
| 目标体重虚线 | `--orange` `--warn` `--target` `--accent-warm` | `#f59e0b` |
| 文字 / 图例 | `--text` `--fg` `--text-1` | `#1f2937` |
| 刻度 / 说明文字 | `--muted` `--text-muted` `--text-2` | `#6b7280` |
| 网格线 | `--border` `--line` `--divider` | `#e5e7eb` |
| 数据点描边（环） | `--card` `--surface` `--bg` | `#ffffff` |

建议 styles.css 至少定义 `--green`、`--orange`（或 `--warn`）、`--text`、`--muted`、`--border`、`--card` 这 6 个变量，并在 `html[data-theme="dark"]` 中覆盖；主题切换后 `js/weight.js` 通过 `MutationObserver` 监听 `data-theme` 自动重绘，无需额外联动。