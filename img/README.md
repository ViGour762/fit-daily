# 动作演示图（img/）

本目录包含：

- `icon-192.png` / `icon-512.png` —— PWA 图标，由 `python scripts/generate-icons.py` 生成
- `*.webp` —— **40 张动作演示动图**（360×360，来自上游站点 `https://lihua2779.github.io/fit-plan/img/`）

## 说明

演示图是上游作者整理的开源动作库素材（ExerciseGymGifsDB），本项目已下载到本地，**离线也能正常显示动画**。

代码里仍保留三级兜底，避免图片缺失时裂图：

1. 本地 `img/<key>.webp`（默认，当前已有）
2. 本地不存在 → 线上原站同路径图片（需联网）
3. 仍然失败 → 内联 SVG 占位图（含动作名）

如需重新下载或补图：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fetch-demos.ps1
```

## 动作 key 清单（40 个）

```
abduction  bench      calfRaise   crunch      curl        deadlift
dip        facePull   fly         frontRaise  hammerCurl  hipThrust
inclinePress  latPulldown  lateralRaise  legCurl  legPress  legRaise
lunge      lyingExt   machinePress  ohp      oneArmRow   plank
preacherCurl  pullup  pushdown    pushup      rdl         reverseFly
row        seatedCalf seatedRow   shrug       sidePlank   splitSquat
squat      standingOhp straightPulldown  tBarRow
```

> 演示素材版权归原作者/动作库作者所有，仅作个人学习使用；如需公开分发，请自行确认素材授权。