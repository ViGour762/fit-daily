// 定义你的徽章列表
const achievementsList = [
    { percent: 1, img: 'img/fire-small.png', name: '初露锋芒', desc: '完成度达1%' },
    { percent: 3, img: 'img/fire-mid.png', name: '渐入佳境', desc: '完成度达3%' },
    { percent: 10, img: 'img/fire-big.png', name: '热情如火', desc: '完成度达10%' },
    { percent: 20, img: 'img/medal-1.png', name: '小有成就', desc: '完成度达20%' },
    { percent: 40, img: 'img/medal-2.png', name: '持之以恒', desc: '完成度达40%' },
    { percent: 60, img: 'img/medal-3.png', name: '过半壮举', desc: '完成度达60%' },
    { percent: 80, img: 'img/cup-bronze.png', name: '铜墙铁壁', desc: '完成度达80%' },
    { percent: 90, img: 'img/cup-silver.png', name: '白银斗士', desc: '完成度达90%' },
    { percent: 100, img: 'img/cup-gold.png', name: '年度王者', desc: '完成度达100%' }
];

const ANNUAL_GOAL = 156;

function renderAchievements() {
    const grid = document.getElementById('achievementGrid');
    if (!grid) return;

        let totalWorkouts = 0;
    try {
        // 读取你刚才在浏览器里看到的那个 key
        const rawData = localStorage.getItem('fitdaily-state');

        if (rawData) {
            const data = JSON.parse(rawData);
            // 找到 sessions 字段，计算它的长度（也就是练了几次）
            if (data.sessions && Array.isArray(data.sessions)) {
                totalWorkouts = data.sessions.length;
            }
        }
    } catch(e) {
        console.error("读取训练数据失败:", e);
    }
    let currentPercent = Math.floor((totalWorkouts / ANNUAL_GOAL) * 100);
    if (currentPercent > 100) currentPercent = 100;

    document.getElementById('achievementProgressText').innerText =
        `当前年度计划完成度：${currentPercent}% (已训练 ${totalWorkouts} 次 / 目标 ${ANNUAL_GOAL} 次)`;

    grid.innerHTML = '';
    achievementsList.forEach(item => {
        const isUnlocked = currentPercent >= item.percent;
        const div = document.createElement('div');
        div.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
        div.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <div class="badge-name">${item.name}</div>
            <div class="badge-desc">${isUnlocked ? '✅ 已解锁' : item.desc}</div>
        `;
        grid.appendChild(div);
    });
}

// 【最终大招：延时覆盖法】
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.nav-btn[data-view="achievements"]');
    if (btn) {
        console.log("【调试】成就按钮被点击了！");

        // 不要阻止事件传递，让舍友的底层代码先跑完
        // 然后我们用 setTimeout 延迟 10 毫秒，强行把页面抢过来！
        setTimeout(() => {
            // 1. 强行切换页面
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById('view-achievements');
            if (targetView) targetView.classList.add('active');

            // 2. 强行切换导航高亮
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.nav-btn[data-view="achievements"]').forEach(b => b.classList.add('active'));

            // 3. 强行改顶部标题
            const viewTitle = document.getElementById('viewTitle');
            const viewSub = document.getElementById('viewSub');
            if (viewTitle) viewTitle.innerText = '我的成就';
            if (viewSub) viewSub.innerText = '看看你这一年的训练成果';

            // 4. 渲染图表
            renderAchievements();
        }, 50); // 延迟 50 毫秒
    }
});
