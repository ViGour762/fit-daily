# UI v2 设计规范（柔和渐变玻璃拟态）

> 目标：把现有白底绿卡 UI **整体换掉**，改为「浅色渐变 + 毛玻璃 + 胶囊按钮 + 柔和光晕」的仪表盘风格；
> 同时重做信息架构：桌面左侧边栏 / 移动底部浮岛导航，首页改为仪表盘概览。
> **功能与数据一律不变**，只换外观与布局。

## 1. 设计令牌（CSS 变量）

```css
/* 浅色（默认） */
--bg-1:#eef2ff; --bg-2:#f7f5ff; --bg-3:#eefaf6;
--bg-grad: linear-gradient(155deg, var(--bg-1) 0%, var(--bg-2) 42%, var(--bg-3) 100%);
--blob-a:#a5b4fc; --blob-b:#7dd3fc; --blob-c:#f9a8d4;  /* 背景光斑，opacity ~.55, blur 80px */

--glass: rgba(255,255,255,.55);
--glass-strong: rgba(255,255,255,.70);
--glass-inset: rgba(255,255,255,.45);
--glass-border: rgba(255,255,255,.70);
--glass-hair: rgba(15,23,42,.06);
--blur: 20px;
--shadow-lg: 0 24px 60px rgba(79,70,229,.14), 0 2px 10px rgba(15,23,42,.05);
--shadow-md: 0 12px 32px rgba(79,70,229,.10), 0 1px 4px rgba(15,23,42,.04);
--shadow-sm: 0 4px 14px rgba(15,23,42,.06);

--accent:#4f46e5; --accent-2:#06b6d4; --accent-3:#8b5cf6;
--accent-grad: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
--accent-grad-soft: linear-gradient(135deg, rgba(99,102,241,.16), rgba(6,182,212,.16));
--ok:#10b981; --warn:#f59e0b; --danger:#ef4444;

--text:#0f172a; --text-2:#475569; --text-3:#8794a8;
--radius-xl:28px; --radius:20px; --radius-sm:14px; --radius-pill:999px;
--nav-h: 4.5rem;
--maxw: 1120px;
--sidebar-w: 15rem;
```

深色：`html[data-theme="dark"]` 覆盖：
`--bg-grad: linear-gradient(155deg,#0a1020 0%,#111a30 45%,#0a1a24 100%)`；
`--glass: rgba(26,34,54,.55)`、`--glass-strong: rgba(26,34,54,.72)`、`--glass-border: rgba(255,255,255,.10)`；
`--text:#e8eefc`、`--text-2:#aab7cf`、`--text-3:#74829b`；光斑透明度降到 .35。

## 2. 布局

- **桌面 ≥ 64rem（1024px）**：左侧固定 `aside.sidebar`（宽 15rem，玻璃质感、圆角贴边 1rem 外边距），右侧 `.app-main` 内滚动；顶部 `.topbar` 悬浮玻璃条（sticky）；底部导航隐藏。
- **移动 < 64rem**：侧边栏隐藏；`.topbar` 吸顶（含品牌 + 标题 + 主题按钮）；`.bottomnav` 为**浮岛**（fixed，左右各 0.9rem、底部 0.9rem + safe-area，玻璃胶囊，5 个图标 + 文字，选中项渐变胶囊高亮）。
- `.container`：最大宽 `--maxw`，左右 padding 1.25rem（移动 1rem），底部预留导航高度。
- 背景 `.app-bg`：`position:fixed; inset:0; z-index:-1`，内含 3 个 `.blob` 圆形光斑（radial-gradient + filter: blur(80px) + opacity .5，`float` 动画 18–26s 轻微位移），禁止影响点击。

## 3. 组件词汇（必须实现）

| 类名 | 说明 |
| --- | --- |
| `.glass` | 基础毛玻璃：background var(--glass)、backdrop-filter blur(var(--blur)) saturate(160%)、1px 边框、圆角 --radius、阴影 --shadow-md |
| `.glass-strong` / `.glass-inset` | 更强 / 内嵌式毛玻璃 |
| `.glass-card` | 可点击/可折叠卡片：padding 1.25–1.5rem |
| `.btn` `.btn-primary` `.btn-ghost` `.btn-soft` `.btn-danger` `.btn-lg` | 胶囊按钮；primary 用 --accent-grad + 白字 + 渐变光晕；ghost 为玻璃描边；soft 为淡渐变底 |
| `.chip` `.badge` | 小胶囊标签（覆盖统计、等级） |
| `.segmented` `.seg-btn` | 分段控制器：玻璃凹槽 + 选中项白底/渐变 |
| `.field` `.field-label` `input` `select` | 输入统一：玻璃底、圆角 14px、聚焦时 accent 光圈 |
| `.ring` | 数据环：`conic-gradient(var(--accent-grad)) / background: conic-gradient(from -90deg, var(--accent) calc(var(--p)*1%), rgba(148,163,184,.18) 0)`，内嵌 `.ring-center` 白/玻璃圆 |
| `.kpi` `.kpi-grid` | 仪表盘指标卡：2 列（移动）/ 4 列（桌面） |
| `.table-wrap` | 玻璃容器 + 圆角 + 横向滚动；表格行 hover 淡色 |
| `.overlay` `.overlay-card` | 全屏遮罩（`backdrop-filter: blur(6px)` + 深色透明底）+ 居中玻璃卡片 |
| `.toast` | 底部漂浮胶囊（玻璃 + 阴影），`.is-error` 用 danger 色 |
| `.empty` | 空态：居中、虚线玻璃框、`--text-3` |
| `.chart-wrap canvas` | 宽度 100%、高度自适应、圆角 |

## 4. 新版页面骨架（index.html）

```html
<body class="app">
  <div class="app-bg"><span class="blob blob-a"></span><span class="blob blob-b"></span><span class="blob blob-c"></span></div>
  <aside class="sidebar glass-strong" id="sidebar">
    <a class="brand">…logo + FitDaily</a>
    <nav class="side-nav">
      <button class="nav-btn side-link active" data-view="home"><span class="nav-ico">⌂</span><span>首页</span></button>
      … training / diet / weight / settings（同为 .nav-btn + data-view）
    </nav>
    <div class="side-foot glass-inset" id="sideProfile">…</div>
    <p class="side-version">v1.2.0 · 本地数据</p>
  </aside>
  <div class="app-main">
    <header class="topbar glass">
      <div class="topbar-left"><span class="brand-mark mobile-only">🏋</span>
        <div><h1 class="topbar-title" id="viewTitle">概览</h1><p class="topbar-sub" id="viewSub">…</p></div>
      </div>
      <div class="topbar-actions"><span class="pill" id="topbarMeta"></span>
        <button class="icon-btn" id="heroThemeBtn">◐</button></div>
    </header>
    <main class="container" id="main">
      <section id="view-home" class="view active">
        <div id="dashboardRoot" class="dash"></div>
        <details class="glass-card cfg-card" id="cfgCard" open>
          <summary class="cfg-summary"><span class="cfg-title">身体数据与目标</span><span class="cfg-hint">…</span></summary>
          <div class="form-panel">…原表单，id 全部保留…</div>
        </details>
        <div class="glass-card results-panel" id="homeResults" hidden>…</div>
      </section>
      <section id="view-training" class="view">…#trainingContent / #calendarContent…</section>
      <section id="view-diet" class="view">…#dietContent / #foodsContent…</section>
      <section id="view-weight" class="view">…原样…</section>
      <section id="view-settings" class="view">…原样…</section>
    </main>
  </div>
  <nav class="bottomnav glass" id="bottomnav">…5 个 .nav-btn…</nav>
  …三个 overlay 与 #toast/#backToTop 原样保留…
</body>
```

## 5. 首页仪表盘（js/dashboard.js 渲染到 #dashboardRoot）

```html
<div class="dash-hero glass-card">
  <div class="dash-hello">晚上好，训练者 <span class="dash-streak">🔥 连续 3 天</span></div>
  <p class="dash-date">2026 年 11 月 2 日 · 周一 · 减脂 · 每周 4 练</p>
  <div class="dash-cta"><button class="btn btn-primary" data-goto="training">开始今天的训练</button>
    <button class="btn btn-soft" data-goto="diet">看饮食方案</button></div>
</div>

<div class="kpi-grid">
  <div class="kpi glass-card"><div class="kpi-top"><span class="kpi-label">每日目标热量</span><span class="kpi-ico">🔥</span></div>
    <div class="kpi-value">2,308<span class="kpi-unit">kcal</span></div><div class="kpi-foot">比维持低 407 kcal · 15% 缺口</div></div>
  <div class="kpi glass-card"><span class="ring" style="--p:62"><span class="ring-center"><b>154</b><small>g</small></span></span>
    <div class="kpi-label">蛋白质</div><div class="kpi-foot">2.2 g/kg</div></div>
  …碳水、脂肪、饮水（4–5 张）…
</div>

<div class="grid-2">
  <div class="glass-card today-card"><div class="section-head"><h3 class="section-title">今日训练</h3><span class="badge">Day 2 · 下肢 A</span></div>
    <ul class="today-list"><li class="today-item"><span>深蹲</span><b>4 × 8-10</b></li>…最多 4 条…</ul>
    <button class="btn btn-primary" data-goto="training">进入训练</button></div>
  <div class="glass-card"><div class="section-head"><h3 class="section-title">体重趋势</h3><span class="badge">距目标 6.4 kg</span></div>
    <svg class="spark" viewBox="0 0 320 120" preserveAspectRatio="none">…polyline…</svg>
    <div class="kpi-foot">最近 78.4 kg · 目标 72 kg</div></div>
</div>

<div class="glass-card"><div class="section-head"><h3 class="section-title">本周训练</h3>…</div>
  <div class="week-bars"><span class="week-bar is-on">一</span>…</div></div>

<div class="quick-grid">
  <button class="quick-item glass-card" data-goto="training"><span class="quick-ico">🏋</span><span>训练计划</span></button>
  … 饮食 / 体重 / 设置 …
</div>
```

无计划时：`#dashboardRoot` 显示 `.dash-empty`（大标题 + 说明 + 主按钮「生成我的计划」滚动到表单 / 直接生成），KPI、图表全部隐藏。

## 6. 其他页面要求

- 训练/饮食/体重/设置页**结构与交互不变**，仅换皮：`.panel` 统一毛玻璃卡片、`.panel-title` 改为带小图标的 section 标题、表格行hover、日历改成圆角玻璃格、浮层为居中玻璃大卡。
- 日历：7 列网格，单元格圆角 14px；`.is-today` 渐变描边、`.is-training` 淡渐变底、`.is-checkin`（已打卡）显示小圆点。
- 打印：隐藏 `.app-bg/.sidebar/.topbar/.bottomnav/.quick-grid/.dash-cta` 与所有按钮/浮层；卡片去背景、去阴影、加细边框；`body.print-training/print-diet` 只保留单视图。

## 7. 硬性约束

1. 纯 CSS / 原生 JS，无外部字体、无 CDN、无框架。
2. 尺寸用 rem/em/%，根字号 16px / 18px 两档都不能破版。
3. 必须保留所有既有 class（训练/饮食/体重/设置由 JS 注入）的样式覆盖，具体清单见 `grep -o 'class="[^"]*"' js/*.js`。
4. `:focus-visible` 明显焦点环；`prefers-reduced-motion` 关闭光斑动画与过渡；正文对比度 ≥ 4.5:1。
5. 移动端不横向溢出（表格在 `.table-wrap` 内部滚动，或按 views.css 既有窄屏规则折叠）。