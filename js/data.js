/* FitPlan · 训练域数据（数据抽取，非上游实现代码）
 * 来源：https://github.com/lihua2779/fit-plan main 分支 js/app.js（仅提取事实性训练数据并归一化）
 * 结构：exercises / muscleGroups / templates / splitNames / weekdayDefaults / variants / tips
 */
(function (root) {
  var DATA = {
  "meta": {
    "source": "https://github.com/lihua2779/fit-plan（main 分支 js/app.js）",
    "sourceUrl": "https://raw.githubusercontent.com/lihua2779/fit-plan/main/js/app.js",
    "extractedAt": "2026-11-02",
    "imageDir": "img/",
    "imageFormat": "webp",
    "counts": {
      "exercises": 66,
      "imageKeys": 40,
      "dayTemplates": 23,
      "templateCombos": 10,
      "templateDaySlots": 40,
      "muscleGroups": 10
    },
    "imageAudit": {
      "imageFilesInRepo": 40,
      "imageKeysReferencedByExercises": 40,
      "unusedImageKeys": [],
      "unknownImageKeys": [],
      "exercisesWithoutImage": [
        "超人式",
        "靠墙静蹲",
        "死虫式",
        "凳上臂屈伸",
        "门框悬挂",
        "侧弓步"
      ],
      "exercisesSharingOneImage": [
        {
          "imageKey": "squat",
          "exercises": 3
        },
        {
          "imageKey": "row",
          "exercises": 3
        },
        {
          "imageKey": "ohp",
          "exercises": 2
        },
        {
          "imageKey": "curl",
          "exercises": 2
        },
        {
          "imageKey": "inclinePress",
          "exercises": 2
        },
        {
          "imageKey": "lunge",
          "exercises": 2
        },
        {
          "imageKey": "lateralRaise",
          "exercises": 2
        },
        {
          "imageKey": "pushup",
          "exercises": 6
        },
        {
          "imageKey": "hipThrust",
          "exercises": 3
        },
        {
          "imageKey": "hammerCurl",
          "exercises": 2
        },
        {
          "imageKey": "splitSquat",
          "exercises": 2
        },
        {
          "imageKey": "frontRaise",
          "exercises": 2
        },
        {
          "imageKey": "reverseFly",
          "exercises": 2
        }
      ]
    },
    "exerciseCountByEquipment": {
      "total": 66,
      "gymOnly": 37,
      "homeOnly": 25,
      "both": 4
    },
    "imageKeysNote": "上游 img/ 实际是 40 个 .webp 动作图 + icon-192.png / icon-512.png 两个图标（共 42 个文件），不是 45 个 webp；exactly 40 个 webp 与 exercises.imageKey 一一对应。",
    "noImageExercises": [
      "超人式",
      "靠墙静蹲",
      "死虫式",
      "凳上臂屈伸",
      "门框悬挂",
      "侧弓步"
    ],
    "exerciseVariantsPerImage": {
      "squat": 3,
      "bench": 1,
      "row": 3,
      "ohp": 2,
      "curl": 2,
      "plank": 1,
      "deadlift": 1,
      "inclinePress": 2,
      "pullup": 1,
      "lunge": 2,
      "lateralRaise": 2,
      "crunch": 1,
      "rdl": 1,
      "pushup": 6,
      "oneArmRow": 1,
      "hipThrust": 3,
      "facePull": 1,
      "legRaise": 1,
      "pushdown": 1,
      "latPulldown": 1,
      "seatedRow": 1,
      "hammerCurl": 2,
      "legPress": 1,
      "calfRaise": 1,
      "splitSquat": 2,
      "legCurl": 1,
      "abduction": 1,
      "seatedCalf": 1,
      "dip": 1,
      "standingOhp": 1,
      "fly": 1,
      "machinePress": 1,
      "frontRaise": 2,
      "lyingExt": 1,
      "straightPulldown": 1,
      "tBarRow": 1,
      "shrug": 1,
      "preacherCurl": 1,
      "reverseFly": 2,
      "sidePlank": 1
    },
    "unusedDayTemplates": [
      "fullC",
      "homeFullC"
    ],
    "duplicatedHomeDays": {
      "6": [
        "homePush",
        "homePull",
        "homeLegs",
        "homePush",
        "homePull",
        "homeLegs"
      ]
    },
    "derivedFields": {
      "muscles": "上游仅「推/拉/腿/居家推拉腿」标题带肌群括号；下列训练日的 muscles 由当天动作的目标肌群按大肌群归类推导：fullA, fullB, fullC, upperA, upperB, lowerA, lowerB, homeFullA, homeFullB, homeFullC, homeUpper, homeUpperB, homeLower, homeLowerB",
      "big": "muscleGroups[*].big 为约定字段（胸/背/肩/腿前/臀·腿后 = 大肌群），上游无此字段",
      "note": "上游没有「每个训练日开头的独立说明文案」，note 统一为空串；整页说明见 planIntro",
      "mistakeFix": "mistake / fix 由上游 mistakeFor 的「错误；建议…」单串按第一个「；」拆分；无「；」时 mistake 为空串",
      "keys": "exercise.key 在上游不存在：首个使用某张演示图的动作沿用图名（如 bench），同名图的其他变式加 -2/-3（如 squat-2 = 徒手深蹲、inclinePress-2 = 上斜杠铃卧推）；6 个上游没有演示图的动作使用可读 key（superman / wallSit / deadBug / benchDip / doorFrameHang / sideLunge），img 为空串"
    },
    "muscleGroupEdgeCases": [
      "俯身反向飞鸟（水瓶）：muscle「三角肌后束 · 上背」含「背」，按上游判定顺序先命中「背」→ group=back（不是 shoulders）",
      "超人式：「下背 · 臀」→ back",
      "深蹲跳（可原地深蹲）：「臀腿 · 心肺」→ glutes_hams",
      "侧弓步：「臀中肌 · 大腿内侧」→ glutes_hams",
      "杠铃耸肩：「斜方肌上束」→ shoulders",
      "门框悬挂：「背阔肌 · 握力」→ back"
    ],
    "legacyNote": "上游历史版本（首个提交）用 img/*.gif，main 已改为 .webp。本数据取 main；与首个提交版本逐日抽样比对（13 个器械训练日的动作名/目标肌群/组数/次数/休息/要点）一致。",
    "readLimitNote": "main 的 js/app.js 为 126,522 字节，超出 web_fetch/read_page 的截断上限（约 62KB/50K 字符）：动作库、组数次数、模板、训练页文案均取自 main 前 ~62KB；muscleGroups 归类规则、weekdayDefaults、日历/提醒文案位于被打断的文件尾部，取自同仓库首个提交（该版本完整可读，且动作/组数数据与 main 一致），已人工比对字段名与语义。unusedDayTemplates / repeated home days 为对 main 模板表的核对结果。"
  },
  "exercises": {
    "squat": {
      "key": "squat",
      "name": "杠铃深蹲",
      "muscle": "股四头肌 · 臀",
      "group": "quads",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "8-10",
      "rest": 120,
      "img": "img/squat.webp",
      "imageKey": "squat",
      "tip": "膝盖与脚尖同向，保持核心收紧",
      "mistake": "膝盖内扣或脚跟离地",
      "fix": "建议膝盖与脚尖同向，重心踩稳全脚掌",
      "days": [
        "fullA",
        "lowerA",
        "legsA"
      ],
      "tipVariants": [
        {
          "tip": "膝盖与脚尖同向，保持核心收紧",
          "days": [
            "fullA"
          ]
        },
        {
          "tip": "蹲到髋部略低于膝盖",
          "days": [
            "lowerA",
            "legsA"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "days": [
            "fullA"
          ]
        },
        {
          "sets": 4,
          "reps": "8-10",
          "rest": 150,
          "days": [
            "lowerA",
            "legsA"
          ]
        }
      ]
    },
    "bench": {
      "key": "bench",
      "name": "杠铃卧推",
      "muscle": "胸 · 三头",
      "group": "chest",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "8-10",
      "rest": 120,
      "img": "img/bench.webp",
      "imageKey": "bench",
      "tip": "肩胛骨后收下沉，杠铃触胸",
      "mistake": "耸肩或手腕弯折",
      "fix": "建议肩胛骨后收下沉，手腕保持中立",
      "days": [
        "fullA",
        "upperA",
        "pushA"
      ]
    },
    "row": {
      "key": "row",
      "name": "杠铃划船",
      "muscle": "背 · 二头",
      "group": "back",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "10-12",
      "rest": 90,
      "img": "img/row.webp",
      "imageKey": "row",
      "tip": "背部平直，用肘部带动上拉",
      "mistake": "身体晃动借力",
      "fix": "建议固定躯干，用肘部带动",
      "days": [
        "fullA",
        "upperA",
        "pullA"
      ],
      "muscleVariants": [
        {
          "muscle": "背 · 二头",
          "group": "back",
          "days": [
            "fullA",
            "upperA"
          ]
        },
        {
          "muscle": "中背 · 二头",
          "group": "back",
          "days": [
            "pullA"
          ]
        }
      ],
      "tipVariants": [
        {
          "tip": "背部平直，用肘部带动上拉",
          "days": [
            "fullA",
            "upperA"
          ]
        },
        {
          "tip": "背部平直，用肘带动",
          "days": [
            "pullA"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 4,
          "reps": "10-12",
          "rest": 90,
          "days": [
            "fullA"
          ]
        },
        {
          "sets": 4,
          "reps": "10-12",
          "rest": 120,
          "days": [
            "upperA",
            "pullA"
          ]
        }
      ]
    },
    "ohp": {
      "key": "ohp",
      "name": "坐姿哑铃肩推",
      "muscle": "三角肌",
      "group": "shoulders",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "10-12",
      "rest": 90,
      "img": "img/ohp.webp",
      "imageKey": "ohp",
      "tip": "下放至耳朵高度即可",
      "mistake": "过度挺腰",
      "fix": "建议核心收紧，不要过度后仰",
      "days": [
        "fullA",
        "upperA",
        "pushA"
      ],
      "tipVariants": [
        {
          "tip": "下放至耳朵高度即可",
          "days": [
            "fullA",
            "upperA"
          ]
        },
        {
          "tip": "下放至耳朵高度",
          "days": [
            "pushA"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "10-12",
          "rest": 90,
          "days": [
            "fullA",
            "upperA"
          ]
        },
        {
          "sets": 4,
          "reps": "10-12",
          "rest": 90,
          "days": [
            "pushA"
          ]
        }
      ]
    },
    "curl": {
      "key": "curl",
      "name": "哑铃二头弯举",
      "muscle": "肱二头肌",
      "group": "biceps",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/curl.webp",
      "imageKey": "curl",
      "tip": "大臂固定，不要借力摆动",
      "mistake": "大臂摆动借力",
      "fix": "建议大臂固定，缓慢下放",
      "days": [
        "fullA",
        "upperA",
        "pullA"
      ],
      "tipVariants": [
        {
          "tip": "大臂固定，不要借力摆动",
          "days": [
            "fullA"
          ]
        },
        {
          "tip": "大臂固定不摆动",
          "days": [
            "upperA",
            "pullA"
          ]
        }
      ]
    },
    "plank": {
      "key": "plank",
      "name": "平板支撑",
      "muscle": "核心",
      "group": "core",
      "equipment": [
        "gym",
        "home"
      ],
      "sets": 3,
      "reps": "45-60 秒",
      "rest": 60,
      "img": "img/plank.webp",
      "imageKey": "plank",
      "tip": "臀部收紧，身体呈一条直线",
      "mistake": "塌腰或撅臀",
      "fix": "建议臀部收紧，身体呈直线",
      "days": [
        "fullA",
        "homeFullA"
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "45-60 秒",
          "rest": 60,
          "days": [
            "fullA"
          ]
        },
        {
          "sets": 3,
          "reps": "30-60 秒",
          "rest": 60,
          "days": [
            "homeFullA"
          ]
        }
      ]
    },
    "deadlift": {
      "key": "deadlift",
      "name": "杠铃硬拉",
      "muscle": "后链 · 臀腿",
      "group": "glutes_hams",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "6-8",
      "rest": 150,
      "img": "img/deadlift.webp",
      "imageKey": "deadlift",
      "tip": "杠铃贴近小腿，髋部主导起身",
      "mistake": "弓背发力",
      "fix": "建议挺胸收腹，杠铃贴近身体",
      "days": [
        "fullB",
        "lowerB"
      ]
    },
    "inclinePress": {
      "key": "inclinePress",
      "name": "上斜哑铃卧推",
      "muscle": "上胸 · 三头",
      "group": "chest",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "8-10",
      "rest": 120,
      "img": "img/inclinePress.webp",
      "imageKey": "inclinePress",
      "tip": "手肘约 45 度夹角",
      "mistake": "耸肩或手腕弯折",
      "fix": "建议肩胛骨后收下沉，手腕保持中立",
      "days": [
        "fullB",
        "upperB",
        "pushA"
      ],
      "numberVariants": [
        {
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "days": [
            "fullB",
            "upperB"
          ]
        },
        {
          "sets": 3,
          "reps": "10-12",
          "rest": 90,
          "days": [
            "pushA"
          ]
        }
      ]
    },
    "pullup": {
      "key": "pullup",
      "name": "引体向上 / 高位下拉",
      "muscle": "背阔肌 · 二头",
      "group": "back",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "8-12",
      "rest": 120,
      "img": "img/pullup.webp",
      "imageKey": "pullup",
      "tip": "下沉肩胛骨，拉到锁骨高度",
      "mistake": "摆动借力",
      "fix": "建议控制节奏，先沉肩再发力",
      "days": [
        "fullB",
        "upperA",
        "pullA"
      ],
      "tipVariants": [
        {
          "tip": "下沉肩胛骨，拉到锁骨高度",
          "days": [
            "fullB"
          ]
        },
        {
          "tip": "下沉肩胛骨再发力",
          "days": [
            "upperA",
            "pullA"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 4,
          "reps": "8-12",
          "rest": 120,
          "days": [
            "fullB",
            "pullA"
          ]
        },
        {
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "days": [
            "upperA"
          ]
        }
      ]
    },
    "lunge": {
      "key": "lunge",
      "name": "哑铃箭步蹲",
      "muscle": "股四头肌 · 臀",
      "group": "quads",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "每侧 10-12",
      "rest": 90,
      "img": "img/lunge.webp",
      "imageKey": "lunge",
      "tip": "前腿膝盖不超过脚尖过多",
      "mistake": "前膝内扣",
      "fix": "建议膝盖对准脚尖",
      "days": [
        "fullB"
      ]
    },
    "lateralRaise": {
      "key": "lateralRaise",
      "name": "哑铃侧平举",
      "muscle": "三角肌中束",
      "group": "shoulders",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/lateralRaise.webp",
      "imageKey": "lateralRaise",
      "tip": "用肩部发力，肘微屈",
      "mistake": "耸肩代偿",
      "fix": "建议用中束发力，肘微屈",
      "days": [
        "fullB",
        "upperB",
        "pushA"
      ],
      "tipVariants": [
        {
          "tip": "用肩部发力，肘微屈",
          "days": [
            "fullB"
          ]
        },
        {
          "tip": "用小重量做高次数，感受中束",
          "days": [
            "upperB"
          ]
        },
        {
          "tip": "用小重量，感受中束发力",
          "days": [
            "pushA"
          ]
        }
      ]
    },
    "crunch": {
      "key": "crunch",
      "name": "卷腹",
      "muscle": "腹直肌",
      "group": "core",
      "equipment": [
        "gym",
        "home"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 60,
      "img": "img/crunch.webp",
      "imageKey": "crunch",
      "tip": "下背部贴地，呼气卷起",
      "mistake": "用手拉脖子",
      "fix": "建议双手轻扶耳侧，下背贴地",
      "days": [
        "fullB",
        "lowerA",
        "legsA",
        "homeFullB",
        "homeLegs"
      ],
      "tipVariants": [
        {
          "tip": "下背部贴地，呼气卷起",
          "days": [
            "fullB",
            "homeFullB",
            "homeLegs"
          ]
        },
        {
          "tip": "下背部贴地",
          "days": [
            "lowerA",
            "legsA"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "days": [
            "fullB",
            "lowerA",
            "legsA"
          ]
        },
        {
          "sets": 3,
          "reps": "15-20",
          "rest": 45,
          "days": [
            "homeFullB",
            "homeLegs"
          ]
        }
      ]
    },
    "rdl": {
      "key": "rdl",
      "name": "罗马尼亚硬拉",
      "muscle": "腘绳肌 · 臀",
      "group": "glutes_hams",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "8-10",
      "rest": 120,
      "img": "img/rdl.webp",
      "imageKey": "rdl",
      "tip": "屈髋后移，杠铃贴腿下放",
      "mistake": "弓背发力",
      "fix": "建议挺胸收腹，杠铃贴近身体",
      "days": [
        "fullC",
        "lowerA",
        "legsA"
      ],
      "tipVariants": [
        {
          "tip": "屈髋后移，杠铃贴腿下放",
          "days": [
            "fullC",
            "lowerA"
          ]
        },
        {
          "tip": "屈髋后移，杠铃贴腿",
          "days": [
            "legsA"
          ]
        }
      ]
    },
    "pushup": {
      "key": "pushup",
      "name": "俯卧撑（负重可选）",
      "muscle": "胸 · 三头 · 核心",
      "group": "chest",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "至接近力竭",
      "rest": 90,
      "img": "img/pushup.webp",
      "imageKey": "pushup",
      "tip": "身体呈直线，肘部约 45 度",
      "mistake": "塌腰或撅臀",
      "fix": "建议收紧核心，身体呈直线",
      "days": [
        "fullC"
      ]
    },
    "oneArmRow": {
      "key": "oneArmRow",
      "name": "单臂哑铃划船",
      "muscle": "背阔肌 · 斜方肌",
      "group": "back",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "每侧 10-12",
      "rest": 90,
      "img": "img/oneArmRow.webp",
      "imageKey": "oneArmRow",
      "tip": "背部平直，避免躯干旋转",
      "mistake": "身体晃动借力",
      "fix": "建议固定躯干，用肘部带动",
      "days": [
        "fullC",
        "pullB"
      ],
      "numberVariants": [
        {
          "sets": 4,
          "reps": "每侧 10-12",
          "rest": 90,
          "days": [
            "fullC"
          ]
        },
        {
          "sets": 4,
          "reps": "每侧 10-12",
          "rest": 120,
          "days": [
            "pullB"
          ]
        }
      ]
    },
    "hipThrust": {
      "key": "hipThrust",
      "name": "杠铃臀桥",
      "muscle": "臀大肌",
      "group": "glutes_hams",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 90,
      "img": "img/hipThrust.webp",
      "imageKey": "hipThrust",
      "tip": "顶峰停顿 1-2 秒",
      "mistake": "腰部代偿或幅度不足",
      "fix": "建议用臀部发力顶髋",
      "days": [
        "fullC",
        "lowerA"
      ]
    },
    "facePull": {
      "key": "facePull",
      "name": "面拉",
      "muscle": "后束 · 上背",
      "group": "back",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 60,
      "img": "img/facePull.webp",
      "imageKey": "facePull",
      "tip": "绳索拉向面部，外旋肩部",
      "mistake": "耸肩",
      "fix": "建议肩胛骨后收，手臂外旋",
      "days": [
        "fullC",
        "upperB",
        "pullA"
      ]
    },
    "legRaise": {
      "key": "legRaise",
      "name": "悬垂举腿",
      "muscle": "下腹 · 髋屈肌",
      "group": "core",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "10-15",
      "rest": 60,
      "img": "img/legRaise.webp",
      "imageKey": "legRaise",
      "tip": "骨盆后倾卷起，避免摆动",
      "mistake": "摆动借力",
      "fix": "建议骨盆后倾，控制速度",
      "days": [
        "fullC",
        "lowerB"
      ],
      "tipVariants": [
        {
          "tip": "骨盆后倾卷起，避免摆动",
          "days": [
            "fullC"
          ]
        },
        {
          "tip": "骨盆后倾卷起",
          "days": [
            "lowerB"
          ]
        }
      ]
    },
    "pushdown": {
      "key": "pushdown",
      "name": "绳索下压",
      "muscle": "肱三头肌",
      "group": "triceps",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/pushdown.webp",
      "imageKey": "pushdown",
      "tip": "肘部贴近身体，全程控制",
      "mistake": "肘部外展",
      "fix": "建议大臂夹紧，只用前臂发力",
      "days": [
        "upperA",
        "pushA"
      ],
      "tipVariants": [
        {
          "tip": "肘部贴近身体，全程控制",
          "days": [
            "upperA"
          ]
        },
        {
          "tip": "肘部贴近身体",
          "days": [
            "pushA"
          ]
        }
      ]
    },
    "latPulldown": {
      "key": "latPulldown",
      "name": "高位下拉",
      "muscle": "背阔肌 · 二头",
      "group": "back",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "10-12",
      "rest": 120,
      "img": "img/latPulldown.webp",
      "imageKey": "latPulldown",
      "tip": "拉到上胸位置",
      "mistake": "身体后仰过大",
      "fix": "建议躯干微倾，拉到上胸位置",
      "days": [
        "upperB"
      ]
    },
    "seatedRow": {
      "key": "seatedRow",
      "name": "坐姿绳索划船",
      "muscle": "中背 · 后束",
      "group": "back",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "10-12",
      "rest": 90,
      "img": "img/seatedRow.webp",
      "imageKey": "seatedRow",
      "tip": "挺胸收肘，顶峰收紧肩胛",
      "mistake": "身体晃动借力",
      "fix": "建议固定躯干，用肘部带动",
      "days": [
        "upperB",
        "pullA"
      ],
      "tipVariants": [
        {
          "tip": "挺胸收肘，顶峰收紧肩胛",
          "days": [
            "upperB"
          ]
        },
        {
          "tip": "顶峰收紧肩胛骨",
          "days": [
            "pullA"
          ]
        }
      ]
    },
    "hammerCurl": {
      "key": "hammerCurl",
      "name": "锤式弯举",
      "muscle": "肱二头肌 · 前臂",
      "group": "biceps",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/hammerCurl.webp",
      "imageKey": "hammerCurl",
      "tip": "中立握法，缓慢下放",
      "mistake": "大臂摆动借力",
      "fix": "建议大臂固定，缓慢下放",
      "days": [
        "upperB",
        "pullA"
      ]
    },
    "legPress": {
      "key": "legPress",
      "name": "腿举机",
      "muscle": "股四头肌 · 臀",
      "group": "quads",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 90,
      "img": "img/legPress.webp",
      "imageKey": "legPress",
      "tip": "膝盖不要完全锁死",
      "mistake": "膝盖完全锁死",
      "fix": "建议保留微屈",
      "days": [
        "lowerA",
        "legsA",
        "legsB"
      ],
      "tipVariants": [
        {
          "tip": "膝盖不要完全锁死",
          "days": [
            "lowerA",
            "legsA"
          ]
        },
        {
          "tip": "下放至膝盖约 90 度，不锁死",
          "days": [
            "legsB"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "days": [
            "lowerA",
            "legsA"
          ]
        },
        {
          "sets": 4,
          "reps": "10-12",
          "rest": 120,
          "days": [
            "legsB"
          ]
        }
      ]
    },
    "calfRaise": {
      "key": "calfRaise",
      "name": "站姿提踵",
      "muscle": "小腿",
      "group": "calves",
      "equipment": [
        "gym",
        "home"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 60,
      "img": "img/calfRaise.webp",
      "imageKey": "calfRaise",
      "tip": "顶峰停顿 1 秒，缓慢下放",
      "mistake": "幅度太小",
      "fix": "建议顶峰停顿，缓慢下放",
      "days": [
        "lowerA",
        "legsA",
        "homeFullA",
        "homeLegs",
        "homeLower"
      ],
      "tipVariants": [
        {
          "tip": "顶峰停顿 1 秒，缓慢下放",
          "days": [
            "lowerA",
            "homeFullA",
            "homeLegs",
            "homeLower"
          ]
        },
        {
          "tip": "顶峰停顿 1 秒",
          "days": [
            "legsA"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "days": [
            "lowerA",
            "legsA"
          ]
        },
        {
          "sets": 3,
          "reps": "15-20",
          "rest": 45,
          "days": [
            "homeFullA"
          ]
        },
        {
          "sets": 4,
          "reps": "15-20",
          "rest": 45,
          "days": [
            "homeLegs",
            "homeLower"
          ]
        }
      ]
    },
    "splitSquat": {
      "key": "splitSquat",
      "name": "保加利亚分腿蹲",
      "muscle": "股四头肌 · 臀",
      "group": "quads",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "每侧 10-12",
      "rest": 90,
      "img": "img/splitSquat.webp",
      "imageKey": "splitSquat",
      "tip": "后脚垫高，重心放在前脚掌",
      "mistake": "前膝内扣",
      "fix": "建议膝盖对准脚尖，重心放前脚掌",
      "days": [
        "lowerB",
        "legsB"
      ]
    },
    "legCurl": {
      "key": "legCurl",
      "name": "腿弯举",
      "muscle": "腘绳肌",
      "group": "glutes_hams",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 90,
      "img": "img/legCurl.webp",
      "imageKey": "legCurl",
      "tip": "收缩顶峰停顿 1 秒",
      "mistake": "大臂摆动借力",
      "fix": "建议大臂固定，缓慢下放",
      "days": [
        "lowerB",
        "legsA",
        "legsB"
      ],
      "tipVariants": [
        {
          "tip": "收缩顶峰停顿 1 秒",
          "days": [
            "lowerB"
          ]
        },
        {
          "tip": "顶峰停顿 1 秒",
          "days": [
            "legsA"
          ]
        },
        {
          "tip": "顶峰停顿 1 秒，缓慢还原",
          "days": [
            "legsB"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "days": [
            "lowerB",
            "legsA"
          ]
        },
        {
          "sets": 4,
          "reps": "12-15",
          "rest": 90,
          "days": [
            "legsB"
          ]
        }
      ]
    },
    "abduction": {
      "key": "abduction",
      "name": "髋外展机",
      "muscle": "臀中肌",
      "group": "glutes_hams",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 60,
      "img": "img/abduction.webp",
      "imageKey": "abduction",
      "tip": "控制速度，避免惯性",
      "mistake": "",
      "fix": "建议先以轻重量熟悉动作模式，再逐步加重。",
      "days": [
        "lowerB",
        "legsB"
      ]
    },
    "seatedCalf": {
      "key": "seatedCalf",
      "name": "坐姿提踵",
      "muscle": "小腿",
      "group": "calves",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 60,
      "img": "img/seatedCalf.webp",
      "imageKey": "seatedCalf",
      "tip": "充分拉伸后缓慢下放",
      "mistake": "幅度太小",
      "fix": "建议顶峰停顿，缓慢下放",
      "days": [
        "lowerB",
        "legsB"
      ],
      "tipVariants": [
        {
          "tip": "充分拉伸后缓慢下放",
          "days": [
            "lowerB"
          ]
        },
        {
          "tip": "顶峰停顿 1 秒，充分拉伸",
          "days": [
            "legsB"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "days": [
            "lowerB"
          ]
        },
        {
          "sets": 4,
          "reps": "15-20",
          "rest": 60,
          "days": [
            "legsB"
          ]
        }
      ]
    },
    "dip": {
      "key": "dip",
      "name": "双杠臂屈伸（负重可选）",
      "muscle": "下胸 · 三头",
      "group": "chest",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "8-12",
      "rest": 90,
      "img": "img/dip.webp",
      "imageKey": "dip",
      "tip": "身体略前倾，肘部后展",
      "mistake": "肘部外展",
      "fix": "建议大臂贴近身体",
      "days": [
        "pushA"
      ]
    },
    "inclinePress-2": {
      "key": "inclinePress-2",
      "name": "上斜杠铃卧推",
      "muscle": "上胸 · 三头",
      "group": "chest",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "8-10",
      "rest": 120,
      "img": "img/inclinePress.webp",
      "imageKey": "inclinePress",
      "tip": "凳角 15-30 度，肩胛骨后收下沉",
      "mistake": "耸肩或手腕弯折",
      "fix": "建议肩胛骨后收下沉，手腕保持中立",
      "days": [
        "pushB"
      ]
    },
    "standingOhp": {
      "key": "standingOhp",
      "name": "杠铃站姿肩推",
      "muscle": "三角肌",
      "group": "shoulders",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "8-10",
      "rest": 120,
      "img": "img/standingOhp.webp",
      "imageKey": "standingOhp",
      "tip": "核心收紧，杠铃过顶不锁死肘",
      "mistake": "过度挺腰",
      "fix": "建议核心收紧，不要过度后仰",
      "days": [
        "pushB"
      ]
    },
    "fly": {
      "key": "fly",
      "name": "哑铃飞鸟（平板）",
      "muscle": "胸大肌",
      "group": "chest",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 90,
      "img": "img/fly.webp",
      "imageKey": "fly",
      "tip": "肘微屈，下放至胸部有拉伸感",
      "mistake": "塌腰或撅臀",
      "fix": "建议臀部收紧，身体呈直线",
      "days": [
        "pushB"
      ]
    },
    "machinePress": {
      "key": "machinePress",
      "name": "器械推胸",
      "muscle": "胸 · 三头",
      "group": "chest",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "10-12",
      "rest": 90,
      "img": "img/machinePress.webp",
      "imageKey": "machinePress",
      "tip": "顶峰收缩 1 秒，避免完全锁死",
      "mistake": "",
      "fix": "建议先以轻重量熟悉动作模式，再逐步加重。",
      "days": [
        "pushB"
      ]
    },
    "frontRaise": {
      "key": "frontRaise",
      "name": "哑铃前平举",
      "muscle": "三角肌前束",
      "group": "shoulders",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/frontRaise.webp",
      "imageKey": "frontRaise",
      "tip": "抬至肩高，缓慢下放",
      "mistake": "身体后仰借力",
      "fix": "建议核心收紧，缓慢下放",
      "days": [
        "pushB"
      ]
    },
    "lyingExt": {
      "key": "lyingExt",
      "name": "仰卧哑铃臂屈伸",
      "muscle": "肱三头肌",
      "group": "triceps",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/lyingExt.webp",
      "imageKey": "lyingExt",
      "tip": "大臂固定，只动前臂",
      "mistake": "肘部外展",
      "fix": "建议大臂贴近身体",
      "days": [
        "pushB"
      ]
    },
    "straightPulldown": {
      "key": "straightPulldown",
      "name": "直臂下压",
      "muscle": "背阔肌",
      "group": "back",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 90,
      "img": "img/straightPulldown.webp",
      "imageKey": "straightPulldown",
      "tip": "手臂伸直，用背阔肌带动下压",
      "mistake": "肘部外展",
      "fix": "建议大臂夹紧，只用前臂发力",
      "days": [
        "pullB"
      ]
    },
    "tBarRow": {
      "key": "tBarRow",
      "name": "T 杠划船",
      "muscle": "中背",
      "group": "back",
      "equipment": [
        "gym"
      ],
      "sets": 4,
      "reps": "10-12",
      "rest": 120,
      "img": "img/tBarRow.webp",
      "imageKey": "tBarRow",
      "tip": "挺胸收肘，顶峰收紧肩胛骨",
      "mistake": "身体晃动借力",
      "fix": "建议固定躯干，用肘部带动",
      "days": [
        "pullB"
      ]
    },
    "shrug": {
      "key": "shrug",
      "name": "杠铃耸肩",
      "muscle": "斜方肌上束",
      "group": "shoulders",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 90,
      "img": "img/shrug.webp",
      "imageKey": "shrug",
      "tip": "垂直向上耸肩，不要转肩",
      "mistake": "转肩画圈",
      "fix": "建议垂直上下，不要旋转",
      "days": [
        "pullB"
      ]
    },
    "preacherCurl": {
      "key": "preacherCurl",
      "name": "牧师凳弯举",
      "muscle": "肱二头肌",
      "group": "biceps",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/preacherCurl.webp",
      "imageKey": "preacherCurl",
      "tip": "上臂贴紧凳面，顶峰收缩",
      "mistake": "大臂摆动借力",
      "fix": "建议大臂固定，缓慢下放",
      "days": [
        "pullB"
      ]
    },
    "reverseFly": {
      "key": "reverseFly",
      "name": "反向飞鸟",
      "muscle": "三角肌后束",
      "group": "shoulders",
      "equipment": [
        "gym"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 60,
      "img": "img/reverseFly.webp",
      "imageKey": "reverseFly",
      "tip": "俯身或趴凳，肘微屈外展",
      "mistake": "手臂完全伸直锁肘",
      "fix": "建议肘微屈，控制下放",
      "days": [
        "pullB"
      ]
    },
    "sidePlank": {
      "key": "sidePlank",
      "name": "侧平板支撑",
      "muscle": "腹斜肌 · 核心",
      "group": "core",
      "equipment": [
        "gym",
        "home"
      ],
      "sets": 3,
      "reps": "每侧 30-45 秒",
      "rest": 60,
      "img": "img/sidePlank.webp",
      "imageKey": "sidePlank",
      "tip": "髋部抬起，身体呈一条直线",
      "mistake": "塌腰或撅臀",
      "fix": "建议臀部收紧，身体呈直线",
      "days": [
        "legsB",
        "homeFullC",
        "homeLowerB"
      ]
    },
    "squat-2": {
      "key": "squat-2",
      "name": "徒手深蹲",
      "muscle": "股四头肌 · 臀",
      "group": "quads",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 90,
      "img": "img/squat.webp",
      "imageKey": "squat",
      "tip": "膝盖与脚尖同向，下蹲到大腿平行",
      "mistake": "膝盖内扣或脚跟离地",
      "fix": "建议膝盖与脚尖同向，重心踩稳全脚掌",
      "days": [
        "homeFullA",
        "homeLegs",
        "homeLower"
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "days": [
            "homeFullA"
          ]
        },
        {
          "sets": 4,
          "reps": "15-20",
          "rest": 90,
          "days": [
            "homeLegs",
            "homeLower"
          ]
        }
      ]
    },
    "pushup-2": {
      "key": "pushup-2",
      "name": "俯卧撑",
      "muscle": "胸 · 三头 · 核心",
      "group": "chest",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "8-15",
      "rest": 90,
      "img": "img/pushup.webp",
      "imageKey": "pushup",
      "tip": "身体呈直线，肘部约 45 度",
      "mistake": "塌腰或撅臀",
      "fix": "建议收紧核心，身体呈直线",
      "days": [
        "homeFullA",
        "homePush",
        "homeUpper"
      ],
      "muscleVariants": [
        {
          "muscle": "胸 · 三头 · 核心",
          "group": "chest",
          "days": [
            "homeFullA"
          ]
        },
        {
          "muscle": "胸 · 三头",
          "group": "chest",
          "days": [
            "homePush",
            "homeUpper"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "8-15",
          "rest": 90,
          "days": [
            "homeFullA"
          ]
        },
        {
          "sets": 4,
          "reps": "8-15",
          "rest": 90,
          "days": [
            "homePush",
            "homeUpper"
          ]
        }
      ]
    },
    "row-2": {
      "key": "row-2",
      "name": "反向划船（桌边）",
      "muscle": "背 · 二头",
      "group": "back",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "8-12",
      "rest": 90,
      "img": "img/row.webp",
      "imageKey": "row",
      "tip": "身体保持直线，用背部带动上拉",
      "mistake": "身体晃动借力",
      "fix": "建议固定躯干，用肘部带动",
      "days": [
        "homeFullA",
        "homePull",
        "homeUpper"
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "days": [
            "homeFullA"
          ]
        },
        {
          "sets": 4,
          "reps": "8-12",
          "rest": 90,
          "days": [
            "homePull",
            "homeUpper"
          ]
        }
      ]
    },
    "hipThrust-2": {
      "key": "hipThrust-2",
      "name": "臀桥",
      "muscle": "臀大肌",
      "group": "glutes_hams",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 60,
      "img": "img/hipThrust.webp",
      "imageKey": "hipThrust",
      "tip": "顶峰停顿 1-2 秒",
      "mistake": "腰部代偿或幅度不足",
      "fix": "建议用臀部发力顶髋",
      "days": [
        "homeFullA",
        "homeLegs"
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "days": [
            "homeFullA"
          ]
        },
        {
          "sets": 4,
          "reps": "15-20",
          "rest": 60,
          "days": [
            "homeLegs"
          ]
        }
      ]
    },
    "lunge-2": {
      "key": "lunge-2",
      "name": "箭步蹲",
      "muscle": "股四头肌 · 臀",
      "group": "quads",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "每侧 10-12",
      "rest": 90,
      "img": "img/lunge.webp",
      "imageKey": "lunge",
      "tip": "前膝不超过脚尖过多",
      "mistake": "前膝内扣",
      "fix": "建议膝盖对准脚尖",
      "days": [
        "homeFullB",
        "homeLegs",
        "homeLowerB"
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 90,
          "days": [
            "homeFullB",
            "homeLegs"
          ]
        },
        {
          "sets": 4,
          "reps": "每侧 10-12",
          "rest": 90,
          "days": [
            "homeLowerB"
          ]
        }
      ]
    },
    "pushup-3": {
      "key": "pushup-3",
      "name": "上斜俯卧撑（桌面）",
      "muscle": "胸 · 三头",
      "group": "chest",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/pushup.webp",
      "imageKey": "pushup",
      "tip": "身体呈直线，肘部约 45 度",
      "mistake": "塌腰或撅臀",
      "fix": "建议收紧核心，身体呈直线",
      "days": [
        "homeFullB",
        "homeUpperB"
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "days": [
            "homeFullB"
          ]
        },
        {
          "sets": 4,
          "reps": "12-15",
          "rest": 60,
          "days": [
            "homeUpperB"
          ]
        }
      ]
    },
    "superman": {
      "key": "superman",
      "name": "超人式",
      "muscle": "下背 · 臀",
      "group": "back",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "",
      "imageKey": "",
      "tip": "目视地面，用背部发力抬起",
      "mistake": "抬头过高",
      "fix": "建议目视地面，用背部发力",
      "days": [
        "homeFullB",
        "homePull"
      ]
    },
    "hipThrust-3": {
      "key": "hipThrust-3",
      "name": "单腿臀桥",
      "muscle": "臀大肌 · 腘绳肌",
      "group": "glutes_hams",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "每侧 10-12",
      "rest": 60,
      "img": "img/hipThrust.webp",
      "imageKey": "hipThrust",
      "tip": "髋部完全顶起，骨盆保持水平",
      "mistake": "腰部代偿或幅度不足",
      "fix": "建议用臀部发力顶髋",
      "days": [
        "homeFullB",
        "homeLower",
        "homeLowerB"
      ]
    },
    "wallSit": {
      "key": "wallSit",
      "name": "靠墙静蹲",
      "muscle": "股四头肌",
      "group": "quads",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "30-60 秒",
      "rest": 60,
      "img": "",
      "imageKey": "",
      "tip": "大腿与地面平行，膝盖对准脚尖",
      "mistake": "膝盖超过脚尖过多",
      "fix": "建议大腿与地面平行，膝盖对准脚尖",
      "days": [
        "homeFullB",
        "homeLegs",
        "homeLowerB"
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "30-60 秒",
          "rest": 60,
          "days": [
            "homeFullB"
          ]
        },
        {
          "sets": 3,
          "reps": "40-60 秒",
          "rest": 60,
          "days": [
            "homeLegs",
            "homeLowerB"
          ]
        }
      ]
    },
    "splitSquat-2": {
      "key": "splitSquat-2",
      "name": "保加利亚分腿蹲（自重）",
      "muscle": "股四头肌 · 臀",
      "group": "quads",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "每侧 10-12",
      "rest": 90,
      "img": "img/splitSquat.webp",
      "imageKey": "splitSquat",
      "tip": "后脚垫高，重心放在前脚掌",
      "mistake": "前膝内扣",
      "fix": "建议膝盖对准脚尖，重心放前脚掌",
      "days": [
        "homeFullC",
        "homeLower"
      ]
    },
    "pushup-4": {
      "key": "pushup-4",
      "name": "宽距俯卧撑",
      "muscle": "胸 · 三头",
      "group": "chest",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "8-12",
      "rest": 90,
      "img": "img/pushup.webp",
      "imageKey": "pushup",
      "tip": "双手略宽于肩，身体呈直线",
      "mistake": "塌腰或撅臀",
      "fix": "建议收紧核心，身体呈直线",
      "days": [
        "homeFullC"
      ]
    },
    "row-3": {
      "key": "row-3",
      "name": "毛巾划船（门框）",
      "muscle": "背 · 二头",
      "group": "back",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "8-12",
      "rest": 90,
      "img": "img/row.webp",
      "imageKey": "row",
      "tip": "身体后倾约 45 度，用背部带动拉",
      "mistake": "身体晃动借力",
      "fix": "建议固定躯干，用肘部带动",
      "days": [
        "homeFullC",
        "homePull",
        "homeUpperB"
      ],
      "tipVariants": [
        {
          "tip": "身体后倾约 45 度，用背部带动拉",
          "days": [
            "homeFullC"
          ]
        },
        {
          "tip": "身体后倾约 45 度，肘部后拉",
          "days": [
            "homePull",
            "homeUpperB"
          ]
        }
      ],
      "numberVariants": [
        {
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "days": [
            "homeFullC",
            "homePull"
          ]
        },
        {
          "sets": 4,
          "reps": "8-12",
          "rest": 90,
          "days": [
            "homeUpperB"
          ]
        }
      ]
    },
    "deadBug": {
      "key": "deadBug",
      "name": "死虫式",
      "muscle": "核心",
      "group": "core",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "每侧 10-12",
      "rest": 45,
      "img": "",
      "imageKey": "",
      "tip": "下背贴地，动作缓慢控制",
      "mistake": "腰部离地",
      "fix": "建议下背贴地，动作缓慢",
      "days": [
        "homeFullC",
        "homeLower"
      ]
    },
    "squat-3": {
      "key": "squat-3",
      "name": "深蹲跳（可原地深蹲）",
      "muscle": "臀腿 · 心肺",
      "group": "glutes_hams",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "10-15",
      "rest": 90,
      "img": "img/squat.webp",
      "imageKey": "squat",
      "tip": "落地轻缓，膝盖对准脚尖",
      "mistake": "膝盖内扣或脚跟离地",
      "fix": "建议膝盖与脚尖同向，重心踩稳全脚掌",
      "days": [
        "homeFullC",
        "homeLowerB"
      ]
    },
    "pushup-5": {
      "key": "pushup-5",
      "name": "下斜俯卧撑（脚垫高）",
      "muscle": "上胸 · 三头",
      "group": "chest",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "8-12",
      "rest": 90,
      "img": "img/pushup.webp",
      "imageKey": "pushup",
      "tip": "双脚垫高，身体保持直线",
      "mistake": "塌腰或撅臀",
      "fix": "建议收紧核心，身体呈直线",
      "days": [
        "homePush"
      ]
    },
    "ohp-2": {
      "key": "ohp-2",
      "name": "水瓶肩推",
      "muscle": "三角肌",
      "group": "shoulders",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 60,
      "img": "img/ohp.webp",
      "imageKey": "ohp",
      "tip": "核心收紧，不要过度挺腰",
      "mistake": "过度挺腰",
      "fix": "建议核心收紧，不要过度后仰",
      "days": [
        "homePush",
        "homeUpper"
      ]
    },
    "pushup-6": {
      "key": "pushup-6",
      "name": "钻石俯卧撑",
      "muscle": "三头 · 胸",
      "group": "chest",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "6-10",
      "rest": 90,
      "img": "img/pushup.webp",
      "imageKey": "pushup",
      "tip": "双手呈菱形置于胸口下方",
      "mistake": "塌腰或撅臀",
      "fix": "建议收紧核心，身体呈直线",
      "days": [
        "homePush",
        "homeUpper"
      ]
    },
    "lateralRaise-2": {
      "key": "lateralRaise-2",
      "name": "水瓶侧平举",
      "muscle": "三角肌中束",
      "group": "shoulders",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 45,
      "img": "img/lateralRaise.webp",
      "imageKey": "lateralRaise",
      "tip": "用小重量，感受中束发力",
      "mistake": "耸肩代偿",
      "fix": "建议用中束发力，肘微屈",
      "days": [
        "homePush"
      ]
    },
    "benchDip": {
      "key": "benchDip",
      "name": "凳上臂屈伸",
      "muscle": "肱三头肌",
      "group": "triceps",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "10-15",
      "rest": 60,
      "img": "",
      "imageKey": "",
      "tip": "大臂贴近身体，肘部后展",
      "mistake": "肘部外展",
      "fix": "建议大臂贴近身体",
      "days": [
        "homePush",
        "homeUpperB"
      ]
    },
    "reverseFly-2": {
      "key": "reverseFly-2",
      "name": "俯身反向飞鸟（水瓶）",
      "muscle": "三角肌后束 · 上背",
      "group": "back",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "15-20",
      "rest": 45,
      "img": "img/reverseFly.webp",
      "imageKey": "reverseFly",
      "tip": "俯身固定躯干，肘微屈外展",
      "mistake": "手臂完全伸直锁肘",
      "fix": "建议肘微屈，控制下放",
      "days": [
        "homePull",
        "homeUpper"
      ]
    },
    "curl-2": {
      "key": "curl-2",
      "name": "水瓶弯举",
      "muscle": "肱二头肌",
      "group": "biceps",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 45,
      "img": "img/curl.webp",
      "imageKey": "curl",
      "tip": "大臂固定不摆动，缓慢下放",
      "mistake": "大臂摆动借力",
      "fix": "建议大臂固定，缓慢下放",
      "days": [
        "homePull",
        "homeUpper"
      ],
      "tipVariants": [
        {
          "tip": "大臂固定不摆动，缓慢下放",
          "days": [
            "homePull"
          ]
        },
        {
          "tip": "大臂固定不摆动",
          "days": [
            "homeUpper"
          ]
        }
      ]
    },
    "doorFrameHang": {
      "key": "doorFrameHang",
      "name": "门框悬挂",
      "muscle": "背阔肌 · 握力",
      "group": "back",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "20-40 秒",
      "rest": 60,
      "img": "",
      "imageKey": "",
      "tip": "下沉肩胛骨，保持悬挂",
      "mistake": "",
      "fix": "建议先以轻重量熟悉动作模式，再逐步加重。",
      "days": [
        "homePull",
        "homeUpperB"
      ]
    },
    "frontRaise-2": {
      "key": "frontRaise-2",
      "name": "水瓶前平举",
      "muscle": "三角肌前束",
      "group": "shoulders",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 45,
      "img": "img/frontRaise.webp",
      "imageKey": "frontRaise",
      "tip": "抬至肩高，核心收紧不后仰",
      "mistake": "身体后仰借力",
      "fix": "建议核心收紧，缓慢下放",
      "days": [
        "homeUpperB"
      ]
    },
    "hammerCurl-2": {
      "key": "hammerCurl-2",
      "name": "锤式弯举（水瓶）",
      "muscle": "肱二头肌 · 前臂",
      "group": "biceps",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "12-15",
      "rest": 45,
      "img": "img/hammerCurl.webp",
      "imageKey": "hammerCurl",
      "tip": "中立握法，缓慢下放",
      "mistake": "大臂摆动借力",
      "fix": "建议大臂固定，缓慢下放",
      "days": [
        "homeUpperB"
      ]
    },
    "sideLunge": {
      "key": "sideLunge",
      "name": "侧弓步",
      "muscle": "臀中肌 · 大腿内侧",
      "group": "glutes_hams",
      "equipment": [
        "home"
      ],
      "sets": 3,
      "reps": "每侧 10-12",
      "rest": 60,
      "img": "",
      "imageKey": "",
      "tip": "膝盖对准脚尖，重心移到屈膝侧",
      "mistake": "",
      "fix": "建议先以轻重量熟悉动作模式，再逐步加重。",
      "days": [
        "homeLower",
        "homeLowerB"
      ]
    }
  },
  "exerciseOrder": [
    "squat",
    "bench",
    "row",
    "ohp",
    "curl",
    "plank",
    "deadlift",
    "inclinePress",
    "pullup",
    "lunge",
    "lateralRaise",
    "crunch",
    "rdl",
    "pushup",
    "oneArmRow",
    "hipThrust",
    "facePull",
    "legRaise",
    "pushdown",
    "latPulldown",
    "seatedRow",
    "hammerCurl",
    "legPress",
    "calfRaise",
    "splitSquat",
    "legCurl",
    "abduction",
    "seatedCalf",
    "dip",
    "inclinePress-2",
    "standingOhp",
    "fly",
    "machinePress",
    "frontRaise",
    "lyingExt",
    "straightPulldown",
    "tBarRow",
    "shrug",
    "preacherCurl",
    "reverseFly",
    "sidePlank",
    "squat-2",
    "pushup-2",
    "row-2",
    "hipThrust-2",
    "lunge-2",
    "pushup-3",
    "superman",
    "hipThrust-3",
    "wallSit",
    "splitSquat-2",
    "pushup-4",
    "row-3",
    "deadBug",
    "squat-3",
    "pushup-5",
    "ohp-2",
    "pushup-6",
    "lateralRaise-2",
    "benchDip",
    "reverseFly-2",
    "curl-2",
    "doorFrameHang",
    "frontRaise-2",
    "hammerCurl-2",
    "sideLunge"
  ],
  "imageKeys": {
    "abduction": "img/abduction.webp",
    "bench": "img/bench.webp",
    "calfRaise": "img/calfRaise.webp",
    "crunch": "img/crunch.webp",
    "curl": "img/curl.webp",
    "deadlift": "img/deadlift.webp",
    "dip": "img/dip.webp",
    "facePull": "img/facePull.webp",
    "fly": "img/fly.webp",
    "frontRaise": "img/frontRaise.webp",
    "hammerCurl": "img/hammerCurl.webp",
    "hipThrust": "img/hipThrust.webp",
    "inclinePress": "img/inclinePress.webp",
    "latPulldown": "img/latPulldown.webp",
    "lateralRaise": "img/lateralRaise.webp",
    "legCurl": "img/legCurl.webp",
    "legPress": "img/legPress.webp",
    "legRaise": "img/legRaise.webp",
    "lunge": "img/lunge.webp",
    "lyingExt": "img/lyingExt.webp",
    "machinePress": "img/machinePress.webp",
    "ohp": "img/ohp.webp",
    "oneArmRow": "img/oneArmRow.webp",
    "plank": "img/plank.webp",
    "preacherCurl": "img/preacherCurl.webp",
    "pullup": "img/pullup.webp",
    "pushdown": "img/pushdown.webp",
    "pushup": "img/pushup.webp",
    "rdl": "img/rdl.webp",
    "reverseFly": "img/reverseFly.webp",
    "row": "img/row.webp",
    "seatedCalf": "img/seatedCalf.webp",
    "seatedRow": "img/seatedRow.webp",
    "shrug": "img/shrug.webp",
    "sidePlank": "img/sidePlank.webp",
    "splitSquat": "img/splitSquat.webp",
    "squat": "img/squat.webp",
    "standingOhp": "img/standingOhp.webp",
    "straightPulldown": "img/straightPulldown.webp",
    "tBarRow": "img/tBarRow.webp"
  },
  "muscleGroups": {
    "other": {
      "label": "其他",
      "big": false,
      "order": 10
    },
    "chest": {
      "label": "胸",
      "big": true,
      "order": 1
    },
    "back": {
      "label": "背",
      "big": true,
      "order": 2
    },
    "shoulders": {
      "label": "肩",
      "big": true,
      "order": 3
    },
    "biceps": {
      "label": "二头",
      "big": false,
      "order": 4
    },
    "triceps": {
      "label": "三头",
      "big": false,
      "order": 5
    },
    "quads": {
      "label": "腿前",
      "big": true,
      "order": 6
    },
    "glutes_hams": {
      "label": "臀·腿后",
      "big": true,
      "order": 7
    },
    "calves": {
      "label": "小腿",
      "big": false,
      "order": 8
    },
    "core": {
      "label": "核心",
      "big": false,
      "order": 9
    }
  },
  "coverage": {
    "countingUnit": "sessions = 该肌群在本周出现的训练日数（1-2），exercises = 该肌群相关动作条数（1-9）；依据 main 渲染文案「{group} {sessions} 练 · {exercises} 动作」两个字段并列出现推断。",
    "ambiguityNote": "main 中 computeCoverage 的实现位于 app.js 被截断的尾部（见 meta.readLimitNote），无法逐字复核；首个提交版本中同名统计为 count = 按动作条数累加、阈值 count >= 4 即告警。若重建需要与 main 完全一致，请先复核该函数。",
    "order": [
      "chest",
      "back",
      "shoulders",
      "biceps",
      "triceps",
      "quads",
      "glutes_hams",
      "calves",
      "core"
    ],
    "head": "本周肌群覆盖（按训练日统计）",
    "headHintTemplate": "{experienceLabel}推荐大肌群每周 ≤ {cap} 练",
    "chipTemplate": "{group} {sessions} 练 · {exercises} 动作",
    "riskChipClass": "chip-risk",
    "notes": {
      "fullBody": "全身分化：每天覆盖全身主要肌群，单块肌群每周 2 次左右，适合每周训练天数较少、需要全身均衡发展的人。",
      "overFrequency": "注意：{list}超出当前经验推荐频率，建议降低训练容量、保证充分恢复。",
      "overFrequencyItem": "{group} 每周 {sessions} 练",
      "overFrequencyJoiner": "、",
      "normal": "大肌群每周约 2 练、间隔 48 小时以上，兼顾刺激频率与恢复。"
    },
    "capByExperience": {
      "beginner": 2,
      "intermediate": 3,
      "advanced": 4
    },
    "capUnit": "练/周",
    "legacyRule": "首个提交版本：count = 该肌群出现的动作条数（同一动作多次出现各计 1），count >= 4 时提示「频率较高」。",
    "buttonLabels": {
      "toLight": "一键降低训练容量（每组减 1 组）",
      "toFull": "恢复标准容量"
    }
  },
  "templates": {
    "gym": {
      "2": [
        {
          "index": 1,
          "dayKey": "fullA",
          "title": "全身训练 A",
          "muscles": "全身",
          "note": "",
          "items": [
            {
              "key": "squat",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "杠铃深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖与脚尖同向，保持核心收紧"
            },
            {
              "key": "bench",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "杠铃卧推",
              "muscle": "胸 · 三头",
              "tip": "肩胛骨后收下沉，杠铃触胸"
            },
            {
              "key": "row",
              "sets": 4,
              "reps": "10-12",
              "rest": 90,
              "name": "杠铃划船",
              "muscle": "背 · 二头",
              "tip": "背部平直，用肘部带动上拉"
            },
            {
              "key": "ohp",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿哑铃肩推",
              "muscle": "三角肌",
              "tip": "下放至耳朵高度即可"
            },
            {
              "key": "curl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃二头弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定，不要借力摆动"
            },
            {
              "key": "plank",
              "sets": 3,
              "reps": "45-60 秒",
              "rest": 60,
              "name": "平板支撑",
              "muscle": "核心",
              "tip": "臀部收紧，身体呈一条直线"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "fullB",
          "title": "全身训练 B",
          "muscles": "全身",
          "note": "",
          "items": [
            {
              "key": "deadlift",
              "sets": 4,
              "reps": "6-8",
              "rest": 150,
              "name": "杠铃硬拉",
              "muscle": "后链 · 臀腿",
              "tip": "杠铃贴近小腿，髋部主导起身"
            },
            {
              "key": "inclinePress",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "上斜哑铃卧推",
              "muscle": "上胸 · 三头",
              "tip": "手肘约 45 度夹角"
            },
            {
              "key": "pullup",
              "sets": 4,
              "reps": "8-12",
              "rest": 120,
              "name": "引体向上 / 高位下拉",
              "muscle": "背阔肌 · 二头",
              "tip": "下沉肩胛骨，拉到锁骨高度"
            },
            {
              "key": "lunge",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "哑铃箭步蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "前腿膝盖不超过脚尖过多"
            },
            {
              "key": "lateralRaise",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃侧平举",
              "muscle": "三角肌中束",
              "tip": "用肩部发力，肘微屈"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地，呼气卷起"
            }
          ]
        }
      ],
      "3": [
        {
          "index": 1,
          "dayKey": "pushA",
          "title": "推 A",
          "muscles": "胸 · 肩 · 三头",
          "note": "",
          "items": [
            {
              "key": "bench",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "杠铃卧推",
              "muscle": "胸 · 三头",
              "tip": "肩胛骨后收下沉，杠铃触胸"
            },
            {
              "key": "inclinePress",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "上斜哑铃卧推",
              "muscle": "上胸 · 三头",
              "tip": "手肘约 45 度夹角"
            },
            {
              "key": "ohp",
              "sets": 4,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿哑铃肩推",
              "muscle": "三角肌",
              "tip": "下放至耳朵高度"
            },
            {
              "key": "dip",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "双杠臂屈伸（负重可选）",
              "muscle": "下胸 · 三头",
              "tip": "身体略前倾，肘部后展"
            },
            {
              "key": "lateralRaise",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量，感受中束发力"
            },
            {
              "key": "pushdown",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "绳索下压",
              "muscle": "肱三头肌",
              "tip": "肘部贴近身体"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "pullA",
          "title": "拉 A",
          "muscles": "背 · 二头 · 后束",
          "note": "",
          "items": [
            {
              "key": "pullup",
              "sets": 4,
              "reps": "8-12",
              "rest": 120,
              "name": "引体向上 / 高位下拉",
              "muscle": "背阔肌 · 二头",
              "tip": "下沉肩胛骨再发力"
            },
            {
              "key": "row",
              "sets": 4,
              "reps": "10-12",
              "rest": 120,
              "name": "杠铃划船",
              "muscle": "中背 · 二头",
              "tip": "背部平直，用肘带动"
            },
            {
              "key": "seatedRow",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿绳索划船",
              "muscle": "中背 · 后束",
              "tip": "顶峰收紧肩胛骨"
            },
            {
              "key": "facePull",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "面拉",
              "muscle": "后束 · 上背",
              "tip": "绳索拉向面部，外旋肩部"
            },
            {
              "key": "curl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃二头弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动"
            },
            {
              "key": "hammerCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "锤式弯举",
              "muscle": "肱二头肌 · 前臂",
              "tip": "中立握法，缓慢下放"
            }
          ]
        },
        {
          "index": 3,
          "dayKey": "legsA",
          "title": "腿 A",
          "muscles": "股四 · 腘绳 · 臀 · 小腿",
          "note": "",
          "items": [
            {
              "key": "squat",
              "sets": 4,
              "reps": "8-10",
              "rest": 150,
              "name": "杠铃深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "蹲到髋部略低于膝盖"
            },
            {
              "key": "rdl",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "罗马尼亚硬拉",
              "muscle": "腘绳肌 · 臀",
              "tip": "屈髋后移，杠铃贴腿"
            },
            {
              "key": "legPress",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿举机",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖不要完全锁死"
            },
            {
              "key": "legCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿弯举",
              "muscle": "腘绳肌",
              "tip": "顶峰停顿 1 秒"
            },
            {
              "key": "calfRaise",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地"
            }
          ]
        }
      ],
      "4": [
        {
          "index": 1,
          "dayKey": "upperA",
          "title": "上肢训练 A",
          "muscles": "胸 · 背 · 肩 · 二头 · 三头",
          "note": "",
          "items": [
            {
              "key": "bench",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "杠铃卧推",
              "muscle": "胸 · 三头",
              "tip": "肩胛骨后收下沉，杠铃触胸"
            },
            {
              "key": "row",
              "sets": 4,
              "reps": "10-12",
              "rest": 120,
              "name": "杠铃划船",
              "muscle": "背 · 二头",
              "tip": "背部平直，用肘部带动上拉"
            },
            {
              "key": "ohp",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿哑铃肩推",
              "muscle": "三角肌",
              "tip": "下放至耳朵高度即可"
            },
            {
              "key": "pullup",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "引体向上 / 高位下拉",
              "muscle": "背阔肌 · 二头",
              "tip": "下沉肩胛骨再发力"
            },
            {
              "key": "curl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃二头弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动"
            },
            {
              "key": "pushdown",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "绳索下压",
              "muscle": "肱三头肌",
              "tip": "肘部贴近身体，全程控制"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "lowerA",
          "title": "下肢训练 A",
          "muscles": "股四头肌 · 臀 · 腘绳 · 小腿 · 核心",
          "note": "",
          "items": [
            {
              "key": "squat",
              "sets": 4,
              "reps": "8-10",
              "rest": 150,
              "name": "杠铃深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "蹲到髋部略低于膝盖"
            },
            {
              "key": "rdl",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "罗马尼亚硬拉",
              "muscle": "腘绳肌 · 臀",
              "tip": "屈髋后移，杠铃贴腿下放"
            },
            {
              "key": "legPress",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿举机",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖不要完全锁死"
            },
            {
              "key": "hipThrust",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "杠铃臀桥",
              "muscle": "臀大肌",
              "tip": "顶峰停顿 1-2 秒"
            },
            {
              "key": "calfRaise",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒，缓慢下放"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地"
            }
          ]
        },
        {
          "index": 3,
          "dayKey": "upperB",
          "title": "上肢训练 B",
          "muscles": "胸 · 背 · 肩 · 二头",
          "note": "",
          "items": [
            {
              "key": "inclinePress",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "上斜哑铃卧推",
              "muscle": "上胸 · 三头",
              "tip": "手肘约 45 度夹角"
            },
            {
              "key": "latPulldown",
              "sets": 4,
              "reps": "10-12",
              "rest": 120,
              "name": "高位下拉",
              "muscle": "背阔肌 · 二头",
              "tip": "拉到上胸位置"
            },
            {
              "key": "seatedRow",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿绳索划船",
              "muscle": "中背 · 后束",
              "tip": "挺胸收肘，顶峰收紧肩胛"
            },
            {
              "key": "lateralRaise",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量做高次数，感受中束"
            },
            {
              "key": "facePull",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "面拉",
              "muscle": "后束 · 上背",
              "tip": "绳索拉向面部，外旋肩部"
            },
            {
              "key": "hammerCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "锤式弯举",
              "muscle": "肱二头肌 · 前臂",
              "tip": "中立握法，缓慢下放"
            }
          ]
        },
        {
          "index": 4,
          "dayKey": "lowerB",
          "title": "下肢训练 B",
          "muscles": "股四头肌 · 臀 · 腘绳 · 小腿 · 核心",
          "note": "",
          "items": [
            {
              "key": "deadlift",
              "sets": 4,
              "reps": "6-8",
              "rest": 150,
              "name": "杠铃硬拉",
              "muscle": "后链 · 臀腿",
              "tip": "杠铃贴近小腿，髋部主导起身"
            },
            {
              "key": "splitSquat",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "保加利亚分腿蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "后脚垫高，重心放在前脚掌"
            },
            {
              "key": "legCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿弯举",
              "muscle": "腘绳肌",
              "tip": "收缩顶峰停顿 1 秒"
            },
            {
              "key": "abduction",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "髋外展机",
              "muscle": "臀中肌",
              "tip": "控制速度，避免惯性"
            },
            {
              "key": "seatedCalf",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "坐姿提踵",
              "muscle": "小腿",
              "tip": "充分拉伸后缓慢下放"
            },
            {
              "key": "legRaise",
              "sets": 3,
              "reps": "10-15",
              "rest": 60,
              "name": "悬垂举腿",
              "muscle": "下腹 · 髋屈肌",
              "tip": "骨盆后倾卷起"
            }
          ]
        }
      ],
      "5": [
        {
          "index": 1,
          "dayKey": "pushA",
          "title": "推 A",
          "muscles": "胸 · 肩 · 三头",
          "note": "",
          "items": [
            {
              "key": "bench",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "杠铃卧推",
              "muscle": "胸 · 三头",
              "tip": "肩胛骨后收下沉，杠铃触胸"
            },
            {
              "key": "inclinePress",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "上斜哑铃卧推",
              "muscle": "上胸 · 三头",
              "tip": "手肘约 45 度夹角"
            },
            {
              "key": "ohp",
              "sets": 4,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿哑铃肩推",
              "muscle": "三角肌",
              "tip": "下放至耳朵高度"
            },
            {
              "key": "dip",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "双杠臂屈伸（负重可选）",
              "muscle": "下胸 · 三头",
              "tip": "身体略前倾，肘部后展"
            },
            {
              "key": "lateralRaise",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量，感受中束发力"
            },
            {
              "key": "pushdown",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "绳索下压",
              "muscle": "肱三头肌",
              "tip": "肘部贴近身体"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "pullA",
          "title": "拉 A",
          "muscles": "背 · 二头 · 后束",
          "note": "",
          "items": [
            {
              "key": "pullup",
              "sets": 4,
              "reps": "8-12",
              "rest": 120,
              "name": "引体向上 / 高位下拉",
              "muscle": "背阔肌 · 二头",
              "tip": "下沉肩胛骨再发力"
            },
            {
              "key": "row",
              "sets": 4,
              "reps": "10-12",
              "rest": 120,
              "name": "杠铃划船",
              "muscle": "中背 · 二头",
              "tip": "背部平直，用肘带动"
            },
            {
              "key": "seatedRow",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿绳索划船",
              "muscle": "中背 · 后束",
              "tip": "顶峰收紧肩胛骨"
            },
            {
              "key": "facePull",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "面拉",
              "muscle": "后束 · 上背",
              "tip": "绳索拉向面部，外旋肩部"
            },
            {
              "key": "curl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃二头弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动"
            },
            {
              "key": "hammerCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "锤式弯举",
              "muscle": "肱二头肌 · 前臂",
              "tip": "中立握法，缓慢下放"
            }
          ]
        },
        {
          "index": 3,
          "dayKey": "legsA",
          "title": "腿 A",
          "muscles": "股四 · 腘绳 · 臀 · 小腿",
          "note": "",
          "items": [
            {
              "key": "squat",
              "sets": 4,
              "reps": "8-10",
              "rest": 150,
              "name": "杠铃深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "蹲到髋部略低于膝盖"
            },
            {
              "key": "rdl",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "罗马尼亚硬拉",
              "muscle": "腘绳肌 · 臀",
              "tip": "屈髋后移，杠铃贴腿"
            },
            {
              "key": "legPress",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿举机",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖不要完全锁死"
            },
            {
              "key": "legCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿弯举",
              "muscle": "腘绳肌",
              "tip": "顶峰停顿 1 秒"
            },
            {
              "key": "calfRaise",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地"
            }
          ]
        },
        {
          "index": 4,
          "dayKey": "upperB",
          "title": "上肢训练 B",
          "muscles": "胸 · 背 · 肩 · 二头",
          "note": "",
          "items": [
            {
              "key": "inclinePress",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "上斜哑铃卧推",
              "muscle": "上胸 · 三头",
              "tip": "手肘约 45 度夹角"
            },
            {
              "key": "latPulldown",
              "sets": 4,
              "reps": "10-12",
              "rest": 120,
              "name": "高位下拉",
              "muscle": "背阔肌 · 二头",
              "tip": "拉到上胸位置"
            },
            {
              "key": "seatedRow",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿绳索划船",
              "muscle": "中背 · 后束",
              "tip": "挺胸收肘，顶峰收紧肩胛"
            },
            {
              "key": "lateralRaise",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量做高次数，感受中束"
            },
            {
              "key": "facePull",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "面拉",
              "muscle": "后束 · 上背",
              "tip": "绳索拉向面部，外旋肩部"
            },
            {
              "key": "hammerCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "锤式弯举",
              "muscle": "肱二头肌 · 前臂",
              "tip": "中立握法，缓慢下放"
            }
          ]
        },
        {
          "index": 5,
          "dayKey": "lowerB",
          "title": "下肢训练 B",
          "muscles": "股四头肌 · 臀 · 腘绳 · 小腿 · 核心",
          "note": "",
          "items": [
            {
              "key": "deadlift",
              "sets": 4,
              "reps": "6-8",
              "rest": 150,
              "name": "杠铃硬拉",
              "muscle": "后链 · 臀腿",
              "tip": "杠铃贴近小腿，髋部主导起身"
            },
            {
              "key": "splitSquat",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "保加利亚分腿蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "后脚垫高，重心放在前脚掌"
            },
            {
              "key": "legCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿弯举",
              "muscle": "腘绳肌",
              "tip": "收缩顶峰停顿 1 秒"
            },
            {
              "key": "abduction",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "髋外展机",
              "muscle": "臀中肌",
              "tip": "控制速度，避免惯性"
            },
            {
              "key": "seatedCalf",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "坐姿提踵",
              "muscle": "小腿",
              "tip": "充分拉伸后缓慢下放"
            },
            {
              "key": "legRaise",
              "sets": 3,
              "reps": "10-15",
              "rest": 60,
              "name": "悬垂举腿",
              "muscle": "下腹 · 髋屈肌",
              "tip": "骨盆后倾卷起"
            }
          ]
        }
      ],
      "6": [
        {
          "index": 1,
          "dayKey": "pushA",
          "title": "推 A",
          "muscles": "胸 · 肩 · 三头",
          "note": "",
          "items": [
            {
              "key": "bench",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "杠铃卧推",
              "muscle": "胸 · 三头",
              "tip": "肩胛骨后收下沉，杠铃触胸"
            },
            {
              "key": "inclinePress",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "上斜哑铃卧推",
              "muscle": "上胸 · 三头",
              "tip": "手肘约 45 度夹角"
            },
            {
              "key": "ohp",
              "sets": 4,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿哑铃肩推",
              "muscle": "三角肌",
              "tip": "下放至耳朵高度"
            },
            {
              "key": "dip",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "双杠臂屈伸（负重可选）",
              "muscle": "下胸 · 三头",
              "tip": "身体略前倾，肘部后展"
            },
            {
              "key": "lateralRaise",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量，感受中束发力"
            },
            {
              "key": "pushdown",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "绳索下压",
              "muscle": "肱三头肌",
              "tip": "肘部贴近身体"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "pullA",
          "title": "拉 A",
          "muscles": "背 · 二头 · 后束",
          "note": "",
          "items": [
            {
              "key": "pullup",
              "sets": 4,
              "reps": "8-12",
              "rest": 120,
              "name": "引体向上 / 高位下拉",
              "muscle": "背阔肌 · 二头",
              "tip": "下沉肩胛骨再发力"
            },
            {
              "key": "row",
              "sets": 4,
              "reps": "10-12",
              "rest": 120,
              "name": "杠铃划船",
              "muscle": "中背 · 二头",
              "tip": "背部平直，用肘带动"
            },
            {
              "key": "seatedRow",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "坐姿绳索划船",
              "muscle": "中背 · 后束",
              "tip": "顶峰收紧肩胛骨"
            },
            {
              "key": "facePull",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "面拉",
              "muscle": "后束 · 上背",
              "tip": "绳索拉向面部，外旋肩部"
            },
            {
              "key": "curl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃二头弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动"
            },
            {
              "key": "hammerCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "锤式弯举",
              "muscle": "肱二头肌 · 前臂",
              "tip": "中立握法，缓慢下放"
            }
          ]
        },
        {
          "index": 3,
          "dayKey": "legsA",
          "title": "腿 A",
          "muscles": "股四 · 腘绳 · 臀 · 小腿",
          "note": "",
          "items": [
            {
              "key": "squat",
              "sets": 4,
              "reps": "8-10",
              "rest": 150,
              "name": "杠铃深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "蹲到髋部略低于膝盖"
            },
            {
              "key": "rdl",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "罗马尼亚硬拉",
              "muscle": "腘绳肌 · 臀",
              "tip": "屈髋后移，杠铃贴腿"
            },
            {
              "key": "legPress",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿举机",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖不要完全锁死"
            },
            {
              "key": "legCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "腿弯举",
              "muscle": "腘绳肌",
              "tip": "顶峰停顿 1 秒"
            },
            {
              "key": "calfRaise",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地"
            }
          ]
        },
        {
          "index": 4,
          "dayKey": "pushB",
          "title": "推 B",
          "muscles": "胸 · 肩 · 三头",
          "note": "",
          "items": [
            {
              "key": "inclinePress-2",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "上斜杠铃卧推",
              "muscle": "上胸 · 三头",
              "tip": "凳角 15-30 度，肩胛骨后收下沉"
            },
            {
              "key": "standingOhp",
              "sets": 4,
              "reps": "8-10",
              "rest": 120,
              "name": "杠铃站姿肩推",
              "muscle": "三角肌",
              "tip": "核心收紧，杠铃过顶不锁死肘"
            },
            {
              "key": "fly",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "哑铃飞鸟（平板）",
              "muscle": "胸大肌",
              "tip": "肘微屈，下放至胸部有拉伸感"
            },
            {
              "key": "machinePress",
              "sets": 3,
              "reps": "10-12",
              "rest": 90,
              "name": "器械推胸",
              "muscle": "胸 · 三头",
              "tip": "顶峰收缩 1 秒，避免完全锁死"
            },
            {
              "key": "frontRaise",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "哑铃前平举",
              "muscle": "三角肌前束",
              "tip": "抬至肩高，缓慢下放"
            },
            {
              "key": "lyingExt",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "仰卧哑铃臂屈伸",
              "muscle": "肱三头肌",
              "tip": "大臂固定，只动前臂"
            }
          ]
        },
        {
          "index": 5,
          "dayKey": "pullB",
          "title": "拉 B",
          "muscles": "背 · 二头 · 后束",
          "note": "",
          "items": [
            {
              "key": "oneArmRow",
              "sets": 4,
              "reps": "每侧 10-12",
              "rest": 120,
              "name": "单臂哑铃划船",
              "muscle": "背阔肌 · 斜方肌",
              "tip": "背部平直，避免躯干旋转"
            },
            {
              "key": "straightPulldown",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "直臂下压",
              "muscle": "背阔肌",
              "tip": "手臂伸直，用背阔肌带动下压"
            },
            {
              "key": "tBarRow",
              "sets": 4,
              "reps": "10-12",
              "rest": 120,
              "name": "T 杠划船",
              "muscle": "中背",
              "tip": "挺胸收肘，顶峰收紧肩胛骨"
            },
            {
              "key": "shrug",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "杠铃耸肩",
              "muscle": "斜方肌上束",
              "tip": "垂直向上耸肩，不要转肩"
            },
            {
              "key": "preacherCurl",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "牧师凳弯举",
              "muscle": "肱二头肌",
              "tip": "上臂贴紧凳面，顶峰收缩"
            },
            {
              "key": "reverseFly",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "反向飞鸟",
              "muscle": "三角肌后束",
              "tip": "俯身或趴凳，肘微屈外展"
            }
          ]
        },
        {
          "index": 6,
          "dayKey": "legsB",
          "title": "腿 B",
          "muscles": "股四 · 腘绳 · 臀 · 小腿",
          "note": "",
          "items": [
            {
              "key": "legPress",
              "sets": 4,
              "reps": "10-12",
              "rest": 120,
              "name": "腿举机",
              "muscle": "股四头肌 · 臀",
              "tip": "下放至膝盖约 90 度，不锁死"
            },
            {
              "key": "splitSquat",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "保加利亚分腿蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "后脚垫高，重心放在前脚掌"
            },
            {
              "key": "legCurl",
              "sets": 4,
              "reps": "12-15",
              "rest": 90,
              "name": "腿弯举",
              "muscle": "腘绳肌",
              "tip": "顶峰停顿 1 秒，缓慢还原"
            },
            {
              "key": "abduction",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "髋外展机",
              "muscle": "臀中肌",
              "tip": "控制速度，避免惯性"
            },
            {
              "key": "seatedCalf",
              "sets": 4,
              "reps": "15-20",
              "rest": 60,
              "name": "坐姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒，充分拉伸"
            },
            {
              "key": "sidePlank",
              "sets": 3,
              "reps": "每侧 30-45 秒",
              "rest": 60,
              "name": "侧平板支撑",
              "muscle": "腹斜肌 · 核心",
              "tip": "髋部抬起，身体呈一条直线"
            }
          ]
        }
      ]
    },
    "home": {
      "2": [
        {
          "index": 1,
          "dayKey": "homeFullA",
          "title": "居家全身 A",
          "muscles": "全身",
          "note": "",
          "items": [
            {
              "key": "squat-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 90,
              "name": "徒手深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖与脚尖同向，下蹲到大腿平行"
            },
            {
              "key": "pushup-2",
              "sets": 3,
              "reps": "8-15",
              "rest": 90,
              "name": "俯卧撑",
              "muscle": "胸 · 三头 · 核心",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "row-2",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "反向划船（桌边）",
              "muscle": "背 · 二头",
              "tip": "身体保持直线，用背部带动上拉"
            },
            {
              "key": "hipThrust-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 60,
              "name": "臀桥",
              "muscle": "臀大肌",
              "tip": "顶峰停顿 1-2 秒"
            },
            {
              "key": "plank",
              "sets": 3,
              "reps": "30-60 秒",
              "rest": 60,
              "name": "平板支撑",
              "muscle": "核心",
              "tip": "臀部收紧，身体呈一条直线"
            },
            {
              "key": "calfRaise",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒，缓慢下放"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "homeFullB",
          "title": "居家全身 B",
          "muscles": "全身",
          "note": "",
          "items": [
            {
              "key": "lunge-2",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "箭步蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "前膝不超过脚尖过多"
            },
            {
              "key": "pushup-3",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "上斜俯卧撑（桌面）",
              "muscle": "胸 · 三头",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "superman",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "超人式",
              "muscle": "下背 · 臀",
              "tip": "目视地面，用背部发力抬起"
            },
            {
              "key": "hipThrust-3",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 60,
              "name": "单腿臀桥",
              "muscle": "臀大肌 · 腘绳肌",
              "tip": "髋部完全顶起，骨盆保持水平"
            },
            {
              "key": "wallSit",
              "sets": 3,
              "reps": "30-60 秒",
              "rest": 60,
              "name": "靠墙静蹲",
              "muscle": "股四头肌",
              "tip": "大腿与地面平行，膝盖对准脚尖"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地，呼气卷起"
            }
          ]
        }
      ],
      "3": [
        {
          "index": 1,
          "dayKey": "homePush",
          "title": "居家推",
          "muscles": "胸 · 肩 · 三头",
          "note": "",
          "items": [
            {
              "key": "pushup-2",
              "sets": 4,
              "reps": "8-15",
              "rest": 90,
              "name": "俯卧撑",
              "muscle": "胸 · 三头",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "pushup-5",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "下斜俯卧撑（脚垫高）",
              "muscle": "上胸 · 三头",
              "tip": "双脚垫高，身体保持直线"
            },
            {
              "key": "ohp-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "水瓶肩推",
              "muscle": "三角肌",
              "tip": "核心收紧，不要过度挺腰"
            },
            {
              "key": "pushup-6",
              "sets": 3,
              "reps": "6-10",
              "rest": 90,
              "name": "钻石俯卧撑",
              "muscle": "三头 · 胸",
              "tip": "双手呈菱形置于胸口下方"
            },
            {
              "key": "lateralRaise-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "水瓶侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量，感受中束发力"
            },
            {
              "key": "benchDip",
              "sets": 3,
              "reps": "10-15",
              "rest": 60,
              "name": "凳上臂屈伸",
              "muscle": "肱三头肌",
              "tip": "大臂贴近身体，肘部后展"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "homePull",
          "title": "居家拉",
          "muscles": "背 · 二头 · 后束",
          "note": "",
          "items": [
            {
              "key": "row-2",
              "sets": 4,
              "reps": "8-12",
              "rest": 90,
              "name": "反向划船（桌边）",
              "muscle": "背 · 二头",
              "tip": "身体保持直线，用背部带动上拉"
            },
            {
              "key": "row-3",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "毛巾划船（门框）",
              "muscle": "背 · 二头",
              "tip": "身体后倾约 45 度，肘部后拉"
            },
            {
              "key": "superman",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "超人式",
              "muscle": "下背 · 臀",
              "tip": "目视地面，用背部发力抬起"
            },
            {
              "key": "reverseFly-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "俯身反向飞鸟（水瓶）",
              "muscle": "三角肌后束 · 上背",
              "tip": "俯身固定躯干，肘微屈外展"
            },
            {
              "key": "curl-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "水瓶弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动，缓慢下放"
            },
            {
              "key": "doorFrameHang",
              "sets": 3,
              "reps": "20-40 秒",
              "rest": 60,
              "name": "门框悬挂",
              "muscle": "背阔肌 · 握力",
              "tip": "下沉肩胛骨，保持悬挂"
            }
          ]
        },
        {
          "index": 3,
          "dayKey": "homeLegs",
          "title": "居家腿",
          "muscles": "股四 · 臀 · 小腿",
          "note": "",
          "items": [
            {
              "key": "squat-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 90,
              "name": "徒手深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖与脚尖同向，下蹲到大腿平行"
            },
            {
              "key": "lunge-2",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "箭步蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "前膝不超过脚尖过多"
            },
            {
              "key": "hipThrust-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 60,
              "name": "臀桥",
              "muscle": "臀大肌",
              "tip": "顶峰停顿 1-2 秒"
            },
            {
              "key": "wallSit",
              "sets": 3,
              "reps": "40-60 秒",
              "rest": 60,
              "name": "靠墙静蹲",
              "muscle": "股四头肌",
              "tip": "大腿与地面平行，膝盖对准脚尖"
            },
            {
              "key": "calfRaise",
              "sets": 4,
              "reps": "15-20",
              "rest": 45,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒，缓慢下放"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地，呼气卷起"
            }
          ]
        }
      ],
      "4": [
        {
          "index": 1,
          "dayKey": "homeUpper",
          "title": "居家上肢 A",
          "muscles": "胸 · 背 · 肩 · 二头",
          "note": "",
          "items": [
            {
              "key": "pushup-2",
              "sets": 4,
              "reps": "8-15",
              "rest": 90,
              "name": "俯卧撑",
              "muscle": "胸 · 三头",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "row-2",
              "sets": 4,
              "reps": "8-12",
              "rest": 90,
              "name": "反向划船（桌边）",
              "muscle": "背 · 二头",
              "tip": "身体保持直线，用背部带动上拉"
            },
            {
              "key": "ohp-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "水瓶肩推",
              "muscle": "三角肌",
              "tip": "核心收紧，不要过度挺腰"
            },
            {
              "key": "pushup-6",
              "sets": 3,
              "reps": "6-10",
              "rest": 90,
              "name": "钻石俯卧撑",
              "muscle": "三头 · 胸",
              "tip": "双手呈菱形置于胸口下方"
            },
            {
              "key": "curl-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "水瓶弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动"
            },
            {
              "key": "reverseFly-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "俯身反向飞鸟（水瓶）",
              "muscle": "三角肌后束 · 上背",
              "tip": "俯身固定躯干，肘微屈外展"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "homeLower",
          "title": "居家下肢 A",
          "muscles": "股四头肌 · 臀 · 腘绳 · 小腿 · 核心",
          "note": "",
          "items": [
            {
              "key": "squat-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 90,
              "name": "徒手深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖与脚尖同向，下蹲到大腿平行"
            },
            {
              "key": "splitSquat-2",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "保加利亚分腿蹲（自重）",
              "muscle": "股四头肌 · 臀",
              "tip": "后脚垫高，重心放在前脚掌"
            },
            {
              "key": "hipThrust-3",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 60,
              "name": "单腿臀桥",
              "muscle": "臀大肌 · 腘绳肌",
              "tip": "髋部完全顶起，骨盆保持水平"
            },
            {
              "key": "sideLunge",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 60,
              "name": "侧弓步",
              "muscle": "臀中肌 · 大腿内侧",
              "tip": "膝盖对准脚尖，重心移到屈膝侧"
            },
            {
              "key": "calfRaise",
              "sets": 4,
              "reps": "15-20",
              "rest": 45,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒，缓慢下放"
            },
            {
              "key": "deadBug",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 45,
              "name": "死虫式",
              "muscle": "核心",
              "tip": "下背贴地，动作缓慢控制"
            }
          ]
        },
        {
          "index": 3,
          "dayKey": "homeUpperB",
          "title": "居家上肢 B",
          "muscles": "胸 · 背 · 肩 · 二头 · 三头",
          "note": "",
          "items": [
            {
              "key": "pushup-3",
              "sets": 4,
              "reps": "12-15",
              "rest": 60,
              "name": "上斜俯卧撑（桌面）",
              "muscle": "胸 · 三头",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "row-3",
              "sets": 4,
              "reps": "8-12",
              "rest": 90,
              "name": "毛巾划船（门框）",
              "muscle": "背 · 二头",
              "tip": "身体后倾约 45 度，肘部后拉"
            },
            {
              "key": "benchDip",
              "sets": 3,
              "reps": "10-15",
              "rest": 60,
              "name": "凳上臂屈伸",
              "muscle": "肱三头肌",
              "tip": "大臂贴近身体，肘部后展"
            },
            {
              "key": "frontRaise-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "水瓶前平举",
              "muscle": "三角肌前束",
              "tip": "抬至肩高，核心收紧不后仰"
            },
            {
              "key": "hammerCurl-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "锤式弯举（水瓶）",
              "muscle": "肱二头肌 · 前臂",
              "tip": "中立握法，缓慢下放"
            },
            {
              "key": "doorFrameHang",
              "sets": 3,
              "reps": "20-40 秒",
              "rest": 60,
              "name": "门框悬挂",
              "muscle": "背阔肌 · 握力",
              "tip": "下沉肩胛骨，保持悬挂"
            }
          ]
        },
        {
          "index": 4,
          "dayKey": "homeLowerB",
          "title": "居家下肢 B",
          "muscles": "股四头肌 · 臀 · 腘绳 · 核心",
          "note": "",
          "items": [
            {
              "key": "lunge-2",
              "sets": 4,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "箭步蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "前膝不超过脚尖过多"
            },
            {
              "key": "hipThrust-3",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 60,
              "name": "单腿臀桥",
              "muscle": "臀大肌 · 腘绳肌",
              "tip": "髋部完全顶起，骨盆保持水平"
            },
            {
              "key": "sideLunge",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 60,
              "name": "侧弓步",
              "muscle": "臀中肌 · 大腿内侧",
              "tip": "膝盖对准脚尖，重心移到屈膝侧"
            },
            {
              "key": "wallSit",
              "sets": 3,
              "reps": "40-60 秒",
              "rest": 60,
              "name": "靠墙静蹲",
              "muscle": "股四头肌",
              "tip": "大腿与地面平行，膝盖对准脚尖"
            },
            {
              "key": "squat-3",
              "sets": 3,
              "reps": "10-15",
              "rest": 90,
              "name": "深蹲跳（可原地深蹲）",
              "muscle": "臀腿 · 心肺",
              "tip": "落地轻缓，膝盖对准脚尖"
            },
            {
              "key": "sidePlank",
              "sets": 3,
              "reps": "每侧 30-45 秒",
              "rest": 60,
              "name": "侧平板支撑",
              "muscle": "腹斜肌 · 核心",
              "tip": "髋部抬起，身体呈一条直线"
            }
          ]
        }
      ],
      "5": [
        {
          "index": 1,
          "dayKey": "homePush",
          "title": "居家推",
          "muscles": "胸 · 肩 · 三头",
          "note": "",
          "items": [
            {
              "key": "pushup-2",
              "sets": 4,
              "reps": "8-15",
              "rest": 90,
              "name": "俯卧撑",
              "muscle": "胸 · 三头",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "pushup-5",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "下斜俯卧撑（脚垫高）",
              "muscle": "上胸 · 三头",
              "tip": "双脚垫高，身体保持直线"
            },
            {
              "key": "ohp-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "水瓶肩推",
              "muscle": "三角肌",
              "tip": "核心收紧，不要过度挺腰"
            },
            {
              "key": "pushup-6",
              "sets": 3,
              "reps": "6-10",
              "rest": 90,
              "name": "钻石俯卧撑",
              "muscle": "三头 · 胸",
              "tip": "双手呈菱形置于胸口下方"
            },
            {
              "key": "lateralRaise-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "水瓶侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量，感受中束发力"
            },
            {
              "key": "benchDip",
              "sets": 3,
              "reps": "10-15",
              "rest": 60,
              "name": "凳上臂屈伸",
              "muscle": "肱三头肌",
              "tip": "大臂贴近身体，肘部后展"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "homePull",
          "title": "居家拉",
          "muscles": "背 · 二头 · 后束",
          "note": "",
          "items": [
            {
              "key": "row-2",
              "sets": 4,
              "reps": "8-12",
              "rest": 90,
              "name": "反向划船（桌边）",
              "muscle": "背 · 二头",
              "tip": "身体保持直线，用背部带动上拉"
            },
            {
              "key": "row-3",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "毛巾划船（门框）",
              "muscle": "背 · 二头",
              "tip": "身体后倾约 45 度，肘部后拉"
            },
            {
              "key": "superman",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "超人式",
              "muscle": "下背 · 臀",
              "tip": "目视地面，用背部发力抬起"
            },
            {
              "key": "reverseFly-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "俯身反向飞鸟（水瓶）",
              "muscle": "三角肌后束 · 上背",
              "tip": "俯身固定躯干，肘微屈外展"
            },
            {
              "key": "curl-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "水瓶弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动，缓慢下放"
            },
            {
              "key": "doorFrameHang",
              "sets": 3,
              "reps": "20-40 秒",
              "rest": 60,
              "name": "门框悬挂",
              "muscle": "背阔肌 · 握力",
              "tip": "下沉肩胛骨，保持悬挂"
            }
          ]
        },
        {
          "index": 3,
          "dayKey": "homeLegs",
          "title": "居家腿",
          "muscles": "股四 · 臀 · 小腿",
          "note": "",
          "items": [
            {
              "key": "squat-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 90,
              "name": "徒手深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖与脚尖同向，下蹲到大腿平行"
            },
            {
              "key": "lunge-2",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "箭步蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "前膝不超过脚尖过多"
            },
            {
              "key": "hipThrust-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 60,
              "name": "臀桥",
              "muscle": "臀大肌",
              "tip": "顶峰停顿 1-2 秒"
            },
            {
              "key": "wallSit",
              "sets": 3,
              "reps": "40-60 秒",
              "rest": 60,
              "name": "靠墙静蹲",
              "muscle": "股四头肌",
              "tip": "大腿与地面平行，膝盖对准脚尖"
            },
            {
              "key": "calfRaise",
              "sets": 4,
              "reps": "15-20",
              "rest": 45,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒，缓慢下放"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地，呼气卷起"
            }
          ]
        },
        {
          "index": 4,
          "dayKey": "homeUpperB",
          "title": "居家上肢 B",
          "muscles": "胸 · 背 · 肩 · 二头 · 三头",
          "note": "",
          "items": [
            {
              "key": "pushup-3",
              "sets": 4,
              "reps": "12-15",
              "rest": 60,
              "name": "上斜俯卧撑（桌面）",
              "muscle": "胸 · 三头",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "row-3",
              "sets": 4,
              "reps": "8-12",
              "rest": 90,
              "name": "毛巾划船（门框）",
              "muscle": "背 · 二头",
              "tip": "身体后倾约 45 度，肘部后拉"
            },
            {
              "key": "benchDip",
              "sets": 3,
              "reps": "10-15",
              "rest": 60,
              "name": "凳上臂屈伸",
              "muscle": "肱三头肌",
              "tip": "大臂贴近身体，肘部后展"
            },
            {
              "key": "frontRaise-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "水瓶前平举",
              "muscle": "三角肌前束",
              "tip": "抬至肩高，核心收紧不后仰"
            },
            {
              "key": "hammerCurl-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "锤式弯举（水瓶）",
              "muscle": "肱二头肌 · 前臂",
              "tip": "中立握法，缓慢下放"
            },
            {
              "key": "doorFrameHang",
              "sets": 3,
              "reps": "20-40 秒",
              "rest": 60,
              "name": "门框悬挂",
              "muscle": "背阔肌 · 握力",
              "tip": "下沉肩胛骨，保持悬挂"
            }
          ]
        },
        {
          "index": 5,
          "dayKey": "homeLowerB",
          "title": "居家下肢 B",
          "muscles": "股四头肌 · 臀 · 腘绳 · 核心",
          "note": "",
          "items": [
            {
              "key": "lunge-2",
              "sets": 4,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "箭步蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "前膝不超过脚尖过多"
            },
            {
              "key": "hipThrust-3",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 60,
              "name": "单腿臀桥",
              "muscle": "臀大肌 · 腘绳肌",
              "tip": "髋部完全顶起，骨盆保持水平"
            },
            {
              "key": "sideLunge",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 60,
              "name": "侧弓步",
              "muscle": "臀中肌 · 大腿内侧",
              "tip": "膝盖对准脚尖，重心移到屈膝侧"
            },
            {
              "key": "wallSit",
              "sets": 3,
              "reps": "40-60 秒",
              "rest": 60,
              "name": "靠墙静蹲",
              "muscle": "股四头肌",
              "tip": "大腿与地面平行，膝盖对准脚尖"
            },
            {
              "key": "squat-3",
              "sets": 3,
              "reps": "10-15",
              "rest": 90,
              "name": "深蹲跳（可原地深蹲）",
              "muscle": "臀腿 · 心肺",
              "tip": "落地轻缓，膝盖对准脚尖"
            },
            {
              "key": "sidePlank",
              "sets": 3,
              "reps": "每侧 30-45 秒",
              "rest": 60,
              "name": "侧平板支撑",
              "muscle": "腹斜肌 · 核心",
              "tip": "髋部抬起，身体呈一条直线"
            }
          ]
        }
      ],
      "6": [
        {
          "index": 1,
          "dayKey": "homePush",
          "title": "居家推",
          "muscles": "胸 · 肩 · 三头",
          "note": "",
          "items": [
            {
              "key": "pushup-2",
              "sets": 4,
              "reps": "8-15",
              "rest": 90,
              "name": "俯卧撑",
              "muscle": "胸 · 三头",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "pushup-5",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "下斜俯卧撑（脚垫高）",
              "muscle": "上胸 · 三头",
              "tip": "双脚垫高，身体保持直线"
            },
            {
              "key": "ohp-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "水瓶肩推",
              "muscle": "三角肌",
              "tip": "核心收紧，不要过度挺腰"
            },
            {
              "key": "pushup-6",
              "sets": 3,
              "reps": "6-10",
              "rest": 90,
              "name": "钻石俯卧撑",
              "muscle": "三头 · 胸",
              "tip": "双手呈菱形置于胸口下方"
            },
            {
              "key": "lateralRaise-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "水瓶侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量，感受中束发力"
            },
            {
              "key": "benchDip",
              "sets": 3,
              "reps": "10-15",
              "rest": 60,
              "name": "凳上臂屈伸",
              "muscle": "肱三头肌",
              "tip": "大臂贴近身体，肘部后展"
            }
          ]
        },
        {
          "index": 2,
          "dayKey": "homePull",
          "title": "居家拉",
          "muscles": "背 · 二头 · 后束",
          "note": "",
          "items": [
            {
              "key": "row-2",
              "sets": 4,
              "reps": "8-12",
              "rest": 90,
              "name": "反向划船（桌边）",
              "muscle": "背 · 二头",
              "tip": "身体保持直线，用背部带动上拉"
            },
            {
              "key": "row-3",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "毛巾划船（门框）",
              "muscle": "背 · 二头",
              "tip": "身体后倾约 45 度，肘部后拉"
            },
            {
              "key": "superman",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "超人式",
              "muscle": "下背 · 臀",
              "tip": "目视地面，用背部发力抬起"
            },
            {
              "key": "reverseFly-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "俯身反向飞鸟（水瓶）",
              "muscle": "三角肌后束 · 上背",
              "tip": "俯身固定躯干，肘微屈外展"
            },
            {
              "key": "curl-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "水瓶弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动，缓慢下放"
            },
            {
              "key": "doorFrameHang",
              "sets": 3,
              "reps": "20-40 秒",
              "rest": 60,
              "name": "门框悬挂",
              "muscle": "背阔肌 · 握力",
              "tip": "下沉肩胛骨，保持悬挂"
            }
          ]
        },
        {
          "index": 3,
          "dayKey": "homeLegs",
          "title": "居家腿",
          "muscles": "股四 · 臀 · 小腿",
          "note": "",
          "items": [
            {
              "key": "squat-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 90,
              "name": "徒手深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖与脚尖同向，下蹲到大腿平行"
            },
            {
              "key": "lunge-2",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "箭步蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "前膝不超过脚尖过多"
            },
            {
              "key": "hipThrust-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 60,
              "name": "臀桥",
              "muscle": "臀大肌",
              "tip": "顶峰停顿 1-2 秒"
            },
            {
              "key": "wallSit",
              "sets": 3,
              "reps": "40-60 秒",
              "rest": 60,
              "name": "靠墙静蹲",
              "muscle": "股四头肌",
              "tip": "大腿与地面平行，膝盖对准脚尖"
            },
            {
              "key": "calfRaise",
              "sets": 4,
              "reps": "15-20",
              "rest": 45,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒，缓慢下放"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地，呼气卷起"
            }
          ]
        },
        {
          "index": 4,
          "dayKey": "homePush",
          "title": "居家推",
          "muscles": "胸 · 肩 · 三头",
          "note": "",
          "items": [
            {
              "key": "pushup-2",
              "sets": 4,
              "reps": "8-15",
              "rest": 90,
              "name": "俯卧撑",
              "muscle": "胸 · 三头",
              "tip": "身体呈直线，肘部约 45 度"
            },
            {
              "key": "pushup-5",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "下斜俯卧撑（脚垫高）",
              "muscle": "上胸 · 三头",
              "tip": "双脚垫高，身体保持直线"
            },
            {
              "key": "ohp-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "水瓶肩推",
              "muscle": "三角肌",
              "tip": "核心收紧，不要过度挺腰"
            },
            {
              "key": "pushup-6",
              "sets": 3,
              "reps": "6-10",
              "rest": 90,
              "name": "钻石俯卧撑",
              "muscle": "三头 · 胸",
              "tip": "双手呈菱形置于胸口下方"
            },
            {
              "key": "lateralRaise-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "水瓶侧平举",
              "muscle": "三角肌中束",
              "tip": "用小重量，感受中束发力"
            },
            {
              "key": "benchDip",
              "sets": 3,
              "reps": "10-15",
              "rest": 60,
              "name": "凳上臂屈伸",
              "muscle": "肱三头肌",
              "tip": "大臂贴近身体，肘部后展"
            }
          ]
        },
        {
          "index": 5,
          "dayKey": "homePull",
          "title": "居家拉",
          "muscles": "背 · 二头 · 后束",
          "note": "",
          "items": [
            {
              "key": "row-2",
              "sets": 4,
              "reps": "8-12",
              "rest": 90,
              "name": "反向划船（桌边）",
              "muscle": "背 · 二头",
              "tip": "身体保持直线，用背部带动上拉"
            },
            {
              "key": "row-3",
              "sets": 3,
              "reps": "8-12",
              "rest": 90,
              "name": "毛巾划船（门框）",
              "muscle": "背 · 二头",
              "tip": "身体后倾约 45 度，肘部后拉"
            },
            {
              "key": "superman",
              "sets": 3,
              "reps": "12-15",
              "rest": 60,
              "name": "超人式",
              "muscle": "下背 · 臀",
              "tip": "目视地面，用背部发力抬起"
            },
            {
              "key": "reverseFly-2",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "俯身反向飞鸟（水瓶）",
              "muscle": "三角肌后束 · 上背",
              "tip": "俯身固定躯干，肘微屈外展"
            },
            {
              "key": "curl-2",
              "sets": 3,
              "reps": "12-15",
              "rest": 45,
              "name": "水瓶弯举",
              "muscle": "肱二头肌",
              "tip": "大臂固定不摆动，缓慢下放"
            },
            {
              "key": "doorFrameHang",
              "sets": 3,
              "reps": "20-40 秒",
              "rest": 60,
              "name": "门框悬挂",
              "muscle": "背阔肌 · 握力",
              "tip": "下沉肩胛骨，保持悬挂"
            }
          ]
        },
        {
          "index": 6,
          "dayKey": "homeLegs",
          "title": "居家腿",
          "muscles": "股四 · 臀 · 小腿",
          "note": "",
          "items": [
            {
              "key": "squat-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 90,
              "name": "徒手深蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "膝盖与脚尖同向，下蹲到大腿平行"
            },
            {
              "key": "lunge-2",
              "sets": 3,
              "reps": "每侧 10-12",
              "rest": 90,
              "name": "箭步蹲",
              "muscle": "股四头肌 · 臀",
              "tip": "前膝不超过脚尖过多"
            },
            {
              "key": "hipThrust-2",
              "sets": 4,
              "reps": "15-20",
              "rest": 60,
              "name": "臀桥",
              "muscle": "臀大肌",
              "tip": "顶峰停顿 1-2 秒"
            },
            {
              "key": "wallSit",
              "sets": 3,
              "reps": "40-60 秒",
              "rest": 60,
              "name": "靠墙静蹲",
              "muscle": "股四头肌",
              "tip": "大腿与地面平行，膝盖对准脚尖"
            },
            {
              "key": "calfRaise",
              "sets": 4,
              "reps": "15-20",
              "rest": 45,
              "name": "站姿提踵",
              "muscle": "小腿",
              "tip": "顶峰停顿 1 秒，缓慢下放"
            },
            {
              "key": "crunch",
              "sets": 3,
              "reps": "15-20",
              "rest": 45,
              "name": "卷腹",
              "muscle": "腹直肌",
              "tip": "下背部贴地，呼气卷起"
            }
          ]
        }
      ]
    }
  },
  "dayTemplates": {
    "fullA": {
      "key": "fullA",
      "equipment": "gym",
      "rawTitle": "全身训练 A",
      "title": "全身训练 A",
      "muscles": "全身",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "squat",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "杠铃深蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "膝盖与脚尖同向，保持核心收紧"
        },
        {
          "key": "bench",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "杠铃卧推",
          "muscle": "胸 · 三头",
          "tip": "肩胛骨后收下沉，杠铃触胸"
        },
        {
          "key": "row",
          "sets": 4,
          "reps": "10-12",
          "rest": 90,
          "name": "杠铃划船",
          "muscle": "背 · 二头",
          "tip": "背部平直，用肘部带动上拉"
        },
        {
          "key": "ohp",
          "sets": 3,
          "reps": "10-12",
          "rest": 90,
          "name": "坐姿哑铃肩推",
          "muscle": "三角肌",
          "tip": "下放至耳朵高度即可"
        },
        {
          "key": "curl",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "哑铃二头弯举",
          "muscle": "肱二头肌",
          "tip": "大臂固定，不要借力摆动"
        },
        {
          "key": "plank",
          "sets": 3,
          "reps": "45-60 秒",
          "rest": 60,
          "name": "平板支撑",
          "muscle": "核心",
          "tip": "臀部收紧，身体呈一条直线"
        }
      ]
    },
    "fullB": {
      "key": "fullB",
      "equipment": "gym",
      "rawTitle": "全身训练 B",
      "title": "全身训练 B",
      "muscles": "全身",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "deadlift",
          "sets": 4,
          "reps": "6-8",
          "rest": 150,
          "name": "杠铃硬拉",
          "muscle": "后链 · 臀腿",
          "tip": "杠铃贴近小腿，髋部主导起身"
        },
        {
          "key": "inclinePress",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "上斜哑铃卧推",
          "muscle": "上胸 · 三头",
          "tip": "手肘约 45 度夹角"
        },
        {
          "key": "pullup",
          "sets": 4,
          "reps": "8-12",
          "rest": 120,
          "name": "引体向上 / 高位下拉",
          "muscle": "背阔肌 · 二头",
          "tip": "下沉肩胛骨，拉到锁骨高度"
        },
        {
          "key": "lunge",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "哑铃箭步蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "前腿膝盖不超过脚尖过多"
        },
        {
          "key": "lateralRaise",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "哑铃侧平举",
          "muscle": "三角肌中束",
          "tip": "用肩部发力，肘微屈"
        },
        {
          "key": "crunch",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "卷腹",
          "muscle": "腹直肌",
          "tip": "下背部贴地，呼气卷起"
        }
      ]
    },
    "fullC": {
      "key": "fullC",
      "equipment": "gym",
      "rawTitle": "全身训练 C",
      "title": "全身训练 C",
      "muscles": "全身",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "rdl",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "罗马尼亚硬拉",
          "muscle": "腘绳肌 · 臀",
          "tip": "屈髋后移，杠铃贴腿下放"
        },
        {
          "key": "pushup",
          "sets": 4,
          "reps": "至接近力竭",
          "rest": 90,
          "name": "俯卧撑（负重可选）",
          "muscle": "胸 · 三头 · 核心",
          "tip": "身体呈直线，肘部约 45 度"
        },
        {
          "key": "oneArmRow",
          "sets": 4,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "单臂哑铃划船",
          "muscle": "背阔肌 · 斜方肌",
          "tip": "背部平直，避免躯干旋转"
        },
        {
          "key": "hipThrust",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "杠铃臀桥",
          "muscle": "臀大肌",
          "tip": "顶峰停顿 1-2 秒"
        },
        {
          "key": "facePull",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "面拉",
          "muscle": "后束 · 上背",
          "tip": "绳索拉向面部，外旋肩部"
        },
        {
          "key": "legRaise",
          "sets": 3,
          "reps": "10-15",
          "rest": 60,
          "name": "悬垂举腿",
          "muscle": "下腹 · 髋屈肌",
          "tip": "骨盆后倾卷起，避免摆动"
        }
      ]
    },
    "upperA": {
      "key": "upperA",
      "equipment": "gym",
      "rawTitle": "上肢训练 A",
      "title": "上肢训练 A",
      "muscles": "胸 · 背 · 肩 · 二头 · 三头",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "bench",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "杠铃卧推",
          "muscle": "胸 · 三头",
          "tip": "肩胛骨后收下沉，杠铃触胸"
        },
        {
          "key": "row",
          "sets": 4,
          "reps": "10-12",
          "rest": 120,
          "name": "杠铃划船",
          "muscle": "背 · 二头",
          "tip": "背部平直，用肘部带动上拉"
        },
        {
          "key": "ohp",
          "sets": 3,
          "reps": "10-12",
          "rest": 90,
          "name": "坐姿哑铃肩推",
          "muscle": "三角肌",
          "tip": "下放至耳朵高度即可"
        },
        {
          "key": "pullup",
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "name": "引体向上 / 高位下拉",
          "muscle": "背阔肌 · 二头",
          "tip": "下沉肩胛骨再发力"
        },
        {
          "key": "curl",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "哑铃二头弯举",
          "muscle": "肱二头肌",
          "tip": "大臂固定不摆动"
        },
        {
          "key": "pushdown",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "绳索下压",
          "muscle": "肱三头肌",
          "tip": "肘部贴近身体，全程控制"
        }
      ]
    },
    "upperB": {
      "key": "upperB",
      "equipment": "gym",
      "rawTitle": "上肢训练 B",
      "title": "上肢训练 B",
      "muscles": "胸 · 背 · 肩 · 二头",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "inclinePress",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "上斜哑铃卧推",
          "muscle": "上胸 · 三头",
          "tip": "手肘约 45 度夹角"
        },
        {
          "key": "latPulldown",
          "sets": 4,
          "reps": "10-12",
          "rest": 120,
          "name": "高位下拉",
          "muscle": "背阔肌 · 二头",
          "tip": "拉到上胸位置"
        },
        {
          "key": "seatedRow",
          "sets": 3,
          "reps": "10-12",
          "rest": 90,
          "name": "坐姿绳索划船",
          "muscle": "中背 · 后束",
          "tip": "挺胸收肘，顶峰收紧肩胛"
        },
        {
          "key": "lateralRaise",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "哑铃侧平举",
          "muscle": "三角肌中束",
          "tip": "用小重量做高次数，感受中束"
        },
        {
          "key": "facePull",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "面拉",
          "muscle": "后束 · 上背",
          "tip": "绳索拉向面部，外旋肩部"
        },
        {
          "key": "hammerCurl",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "锤式弯举",
          "muscle": "肱二头肌 · 前臂",
          "tip": "中立握法，缓慢下放"
        }
      ]
    },
    "lowerA": {
      "key": "lowerA",
      "equipment": "gym",
      "rawTitle": "下肢训练 A",
      "title": "下肢训练 A",
      "muscles": "股四头肌 · 臀 · 腘绳 · 小腿 · 核心",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "squat",
          "sets": 4,
          "reps": "8-10",
          "rest": 150,
          "name": "杠铃深蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "蹲到髋部略低于膝盖"
        },
        {
          "key": "rdl",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "罗马尼亚硬拉",
          "muscle": "腘绳肌 · 臀",
          "tip": "屈髋后移，杠铃贴腿下放"
        },
        {
          "key": "legPress",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "腿举机",
          "muscle": "股四头肌 · 臀",
          "tip": "膝盖不要完全锁死"
        },
        {
          "key": "hipThrust",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "杠铃臀桥",
          "muscle": "臀大肌",
          "tip": "顶峰停顿 1-2 秒"
        },
        {
          "key": "calfRaise",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "站姿提踵",
          "muscle": "小腿",
          "tip": "顶峰停顿 1 秒，缓慢下放"
        },
        {
          "key": "crunch",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "卷腹",
          "muscle": "腹直肌",
          "tip": "下背部贴地"
        }
      ]
    },
    "lowerB": {
      "key": "lowerB",
      "equipment": "gym",
      "rawTitle": "下肢训练 B",
      "title": "下肢训练 B",
      "muscles": "股四头肌 · 臀 · 腘绳 · 小腿 · 核心",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "deadlift",
          "sets": 4,
          "reps": "6-8",
          "rest": 150,
          "name": "杠铃硬拉",
          "muscle": "后链 · 臀腿",
          "tip": "杠铃贴近小腿，髋部主导起身"
        },
        {
          "key": "splitSquat",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "保加利亚分腿蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "后脚垫高，重心放在前脚掌"
        },
        {
          "key": "legCurl",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "腿弯举",
          "muscle": "腘绳肌",
          "tip": "收缩顶峰停顿 1 秒"
        },
        {
          "key": "abduction",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "髋外展机",
          "muscle": "臀中肌",
          "tip": "控制速度，避免惯性"
        },
        {
          "key": "seatedCalf",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "坐姿提踵",
          "muscle": "小腿",
          "tip": "充分拉伸后缓慢下放"
        },
        {
          "key": "legRaise",
          "sets": 3,
          "reps": "10-15",
          "rest": 60,
          "name": "悬垂举腿",
          "muscle": "下腹 · 髋屈肌",
          "tip": "骨盆后倾卷起"
        }
      ]
    },
    "pushA": {
      "key": "pushA",
      "equipment": "gym",
      "rawTitle": "推 A（胸 · 肩 · 三头）",
      "title": "推 A",
      "muscles": "胸 · 肩 · 三头",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "bench",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "杠铃卧推",
          "muscle": "胸 · 三头",
          "tip": "肩胛骨后收下沉，杠铃触胸"
        },
        {
          "key": "inclinePress",
          "sets": 3,
          "reps": "10-12",
          "rest": 90,
          "name": "上斜哑铃卧推",
          "muscle": "上胸 · 三头",
          "tip": "手肘约 45 度夹角"
        },
        {
          "key": "ohp",
          "sets": 4,
          "reps": "10-12",
          "rest": 90,
          "name": "坐姿哑铃肩推",
          "muscle": "三角肌",
          "tip": "下放至耳朵高度"
        },
        {
          "key": "dip",
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "name": "双杠臂屈伸（负重可选）",
          "muscle": "下胸 · 三头",
          "tip": "身体略前倾，肘部后展"
        },
        {
          "key": "lateralRaise",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "哑铃侧平举",
          "muscle": "三角肌中束",
          "tip": "用小重量，感受中束发力"
        },
        {
          "key": "pushdown",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "绳索下压",
          "muscle": "肱三头肌",
          "tip": "肘部贴近身体"
        }
      ]
    },
    "pullA": {
      "key": "pullA",
      "equipment": "gym",
      "rawTitle": "拉 A（背 · 二头 · 后束）",
      "title": "拉 A",
      "muscles": "背 · 二头 · 后束",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "pullup",
          "sets": 4,
          "reps": "8-12",
          "rest": 120,
          "name": "引体向上 / 高位下拉",
          "muscle": "背阔肌 · 二头",
          "tip": "下沉肩胛骨再发力"
        },
        {
          "key": "row",
          "sets": 4,
          "reps": "10-12",
          "rest": 120,
          "name": "杠铃划船",
          "muscle": "中背 · 二头",
          "tip": "背部平直，用肘带动"
        },
        {
          "key": "seatedRow",
          "sets": 3,
          "reps": "10-12",
          "rest": 90,
          "name": "坐姿绳索划船",
          "muscle": "中背 · 后束",
          "tip": "顶峰收紧肩胛骨"
        },
        {
          "key": "facePull",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "面拉",
          "muscle": "后束 · 上背",
          "tip": "绳索拉向面部，外旋肩部"
        },
        {
          "key": "curl",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "哑铃二头弯举",
          "muscle": "肱二头肌",
          "tip": "大臂固定不摆动"
        },
        {
          "key": "hammerCurl",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "锤式弯举",
          "muscle": "肱二头肌 · 前臂",
          "tip": "中立握法，缓慢下放"
        }
      ]
    },
    "legsA": {
      "key": "legsA",
      "equipment": "gym",
      "rawTitle": "腿 A（股四 · 腘绳 · 臀 · 小腿）",
      "title": "腿 A",
      "muscles": "股四 · 腘绳 · 臀 · 小腿",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "squat",
          "sets": 4,
          "reps": "8-10",
          "rest": 150,
          "name": "杠铃深蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "蹲到髋部略低于膝盖"
        },
        {
          "key": "rdl",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "罗马尼亚硬拉",
          "muscle": "腘绳肌 · 臀",
          "tip": "屈髋后移，杠铃贴腿"
        },
        {
          "key": "legPress",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "腿举机",
          "muscle": "股四头肌 · 臀",
          "tip": "膝盖不要完全锁死"
        },
        {
          "key": "legCurl",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "腿弯举",
          "muscle": "腘绳肌",
          "tip": "顶峰停顿 1 秒"
        },
        {
          "key": "calfRaise",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "站姿提踵",
          "muscle": "小腿",
          "tip": "顶峰停顿 1 秒"
        },
        {
          "key": "crunch",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "卷腹",
          "muscle": "腹直肌",
          "tip": "下背部贴地"
        }
      ]
    },
    "pushB": {
      "key": "pushB",
      "equipment": "gym",
      "rawTitle": "推 B（胸 · 肩 · 三头）",
      "title": "推 B",
      "muscles": "胸 · 肩 · 三头",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "inclinePress-2",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "上斜杠铃卧推",
          "muscle": "上胸 · 三头",
          "tip": "凳角 15-30 度，肩胛骨后收下沉"
        },
        {
          "key": "standingOhp",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "name": "杠铃站姿肩推",
          "muscle": "三角肌",
          "tip": "核心收紧，杠铃过顶不锁死肘"
        },
        {
          "key": "fly",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "哑铃飞鸟（平板）",
          "muscle": "胸大肌",
          "tip": "肘微屈，下放至胸部有拉伸感"
        },
        {
          "key": "machinePress",
          "sets": 3,
          "reps": "10-12",
          "rest": 90,
          "name": "器械推胸",
          "muscle": "胸 · 三头",
          "tip": "顶峰收缩 1 秒，避免完全锁死"
        },
        {
          "key": "frontRaise",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "哑铃前平举",
          "muscle": "三角肌前束",
          "tip": "抬至肩高，缓慢下放"
        },
        {
          "key": "lyingExt",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "仰卧哑铃臂屈伸",
          "muscle": "肱三头肌",
          "tip": "大臂固定，只动前臂"
        }
      ]
    },
    "pullB": {
      "key": "pullB",
      "equipment": "gym",
      "rawTitle": "拉 B（背 · 二头 · 后束）",
      "title": "拉 B",
      "muscles": "背 · 二头 · 后束",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "oneArmRow",
          "sets": 4,
          "reps": "每侧 10-12",
          "rest": 120,
          "name": "单臂哑铃划船",
          "muscle": "背阔肌 · 斜方肌",
          "tip": "背部平直，避免躯干旋转"
        },
        {
          "key": "straightPulldown",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "直臂下压",
          "muscle": "背阔肌",
          "tip": "手臂伸直，用背阔肌带动下压"
        },
        {
          "key": "tBarRow",
          "sets": 4,
          "reps": "10-12",
          "rest": 120,
          "name": "T 杠划船",
          "muscle": "中背",
          "tip": "挺胸收肘，顶峰收紧肩胛骨"
        },
        {
          "key": "shrug",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "杠铃耸肩",
          "muscle": "斜方肌上束",
          "tip": "垂直向上耸肩，不要转肩"
        },
        {
          "key": "preacherCurl",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "牧师凳弯举",
          "muscle": "肱二头肌",
          "tip": "上臂贴紧凳面，顶峰收缩"
        },
        {
          "key": "reverseFly",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "反向飞鸟",
          "muscle": "三角肌后束",
          "tip": "俯身或趴凳，肘微屈外展"
        }
      ]
    },
    "legsB": {
      "key": "legsB",
      "equipment": "gym",
      "rawTitle": "腿 B（股四 · 腘绳 · 臀 · 小腿）",
      "title": "腿 B",
      "muscles": "股四 · 腘绳 · 臀 · 小腿",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "legPress",
          "sets": 4,
          "reps": "10-12",
          "rest": 120,
          "name": "腿举机",
          "muscle": "股四头肌 · 臀",
          "tip": "下放至膝盖约 90 度，不锁死"
        },
        {
          "key": "splitSquat",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "保加利亚分腿蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "后脚垫高，重心放在前脚掌"
        },
        {
          "key": "legCurl",
          "sets": 4,
          "reps": "12-15",
          "rest": 90,
          "name": "腿弯举",
          "muscle": "腘绳肌",
          "tip": "顶峰停顿 1 秒，缓慢还原"
        },
        {
          "key": "abduction",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "髋外展机",
          "muscle": "臀中肌",
          "tip": "控制速度，避免惯性"
        },
        {
          "key": "seatedCalf",
          "sets": 4,
          "reps": "15-20",
          "rest": 60,
          "name": "坐姿提踵",
          "muscle": "小腿",
          "tip": "顶峰停顿 1 秒，充分拉伸"
        },
        {
          "key": "sidePlank",
          "sets": 3,
          "reps": "每侧 30-45 秒",
          "rest": 60,
          "name": "侧平板支撑",
          "muscle": "腹斜肌 · 核心",
          "tip": "髋部抬起，身体呈一条直线"
        }
      ]
    },
    "homeFullA": {
      "key": "homeFullA",
      "equipment": "home",
      "rawTitle": "居家全身 A",
      "title": "居家全身 A",
      "muscles": "全身",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "squat-2",
          "sets": 3,
          "reps": "12-15",
          "rest": 90,
          "name": "徒手深蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "膝盖与脚尖同向，下蹲到大腿平行"
        },
        {
          "key": "pushup-2",
          "sets": 3,
          "reps": "8-15",
          "rest": 90,
          "name": "俯卧撑",
          "muscle": "胸 · 三头 · 核心",
          "tip": "身体呈直线，肘部约 45 度"
        },
        {
          "key": "row-2",
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "name": "反向划船（桌边）",
          "muscle": "背 · 二头",
          "tip": "身体保持直线，用背部带动上拉"
        },
        {
          "key": "hipThrust-2",
          "sets": 3,
          "reps": "15-20",
          "rest": 60,
          "name": "臀桥",
          "muscle": "臀大肌",
          "tip": "顶峰停顿 1-2 秒"
        },
        {
          "key": "plank",
          "sets": 3,
          "reps": "30-60 秒",
          "rest": 60,
          "name": "平板支撑",
          "muscle": "核心",
          "tip": "臀部收紧，身体呈一条直线"
        },
        {
          "key": "calfRaise",
          "sets": 3,
          "reps": "15-20",
          "rest": 45,
          "name": "站姿提踵",
          "muscle": "小腿",
          "tip": "顶峰停顿 1 秒，缓慢下放"
        }
      ]
    },
    "homeFullB": {
      "key": "homeFullB",
      "equipment": "home",
      "rawTitle": "居家全身 B",
      "title": "居家全身 B",
      "muscles": "全身",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "lunge-2",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "箭步蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "前膝不超过脚尖过多"
        },
        {
          "key": "pushup-3",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "上斜俯卧撑（桌面）",
          "muscle": "胸 · 三头",
          "tip": "身体呈直线，肘部约 45 度"
        },
        {
          "key": "superman",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "超人式",
          "muscle": "下背 · 臀",
          "tip": "目视地面，用背部发力抬起"
        },
        {
          "key": "hipThrust-3",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 60,
          "name": "单腿臀桥",
          "muscle": "臀大肌 · 腘绳肌",
          "tip": "髋部完全顶起，骨盆保持水平"
        },
        {
          "key": "wallSit",
          "sets": 3,
          "reps": "30-60 秒",
          "rest": 60,
          "name": "靠墙静蹲",
          "muscle": "股四头肌",
          "tip": "大腿与地面平行，膝盖对准脚尖"
        },
        {
          "key": "crunch",
          "sets": 3,
          "reps": "15-20",
          "rest": 45,
          "name": "卷腹",
          "muscle": "腹直肌",
          "tip": "下背部贴地，呼气卷起"
        }
      ]
    },
    "homeFullC": {
      "key": "homeFullC",
      "equipment": "home",
      "rawTitle": "居家全身 C",
      "title": "居家全身 C",
      "muscles": "全身",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "splitSquat-2",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "保加利亚分腿蹲（自重）",
          "muscle": "股四头肌 · 臀",
          "tip": "后脚垫高，重心放在前脚掌"
        },
        {
          "key": "pushup-4",
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "name": "宽距俯卧撑",
          "muscle": "胸 · 三头",
          "tip": "双手略宽于肩，身体呈直线"
        },
        {
          "key": "row-3",
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "name": "毛巾划船（门框）",
          "muscle": "背 · 二头",
          "tip": "身体后倾约 45 度，用背部带动拉"
        },
        {
          "key": "sidePlank",
          "sets": 3,
          "reps": "每侧 30-45 秒",
          "rest": 60,
          "name": "侧平板支撑",
          "muscle": "腹斜肌 · 核心",
          "tip": "髋部抬起，身体呈一条直线"
        },
        {
          "key": "deadBug",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 45,
          "name": "死虫式",
          "muscle": "核心",
          "tip": "下背贴地，动作缓慢控制"
        },
        {
          "key": "squat-3",
          "sets": 3,
          "reps": "10-15",
          "rest": 90,
          "name": "深蹲跳（可原地深蹲）",
          "muscle": "臀腿 · 心肺",
          "tip": "落地轻缓，膝盖对准脚尖"
        }
      ]
    },
    "homePush": {
      "key": "homePush",
      "equipment": "home",
      "rawTitle": "居家推（胸 · 肩 · 三头）",
      "title": "居家推",
      "muscles": "胸 · 肩 · 三头",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "pushup-2",
          "sets": 4,
          "reps": "8-15",
          "rest": 90,
          "name": "俯卧撑",
          "muscle": "胸 · 三头",
          "tip": "身体呈直线，肘部约 45 度"
        },
        {
          "key": "pushup-5",
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "name": "下斜俯卧撑（脚垫高）",
          "muscle": "上胸 · 三头",
          "tip": "双脚垫高，身体保持直线"
        },
        {
          "key": "ohp-2",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "水瓶肩推",
          "muscle": "三角肌",
          "tip": "核心收紧，不要过度挺腰"
        },
        {
          "key": "pushup-6",
          "sets": 3,
          "reps": "6-10",
          "rest": 90,
          "name": "钻石俯卧撑",
          "muscle": "三头 · 胸",
          "tip": "双手呈菱形置于胸口下方"
        },
        {
          "key": "lateralRaise-2",
          "sets": 3,
          "reps": "15-20",
          "rest": 45,
          "name": "水瓶侧平举",
          "muscle": "三角肌中束",
          "tip": "用小重量，感受中束发力"
        },
        {
          "key": "benchDip",
          "sets": 3,
          "reps": "10-15",
          "rest": 60,
          "name": "凳上臂屈伸",
          "muscle": "肱三头肌",
          "tip": "大臂贴近身体，肘部后展"
        }
      ]
    },
    "homePull": {
      "key": "homePull",
      "equipment": "home",
      "rawTitle": "居家拉（背 · 二头 · 后束）",
      "title": "居家拉",
      "muscles": "背 · 二头 · 后束",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "row-2",
          "sets": 4,
          "reps": "8-12",
          "rest": 90,
          "name": "反向划船（桌边）",
          "muscle": "背 · 二头",
          "tip": "身体保持直线，用背部带动上拉"
        },
        {
          "key": "row-3",
          "sets": 3,
          "reps": "8-12",
          "rest": 90,
          "name": "毛巾划船（门框）",
          "muscle": "背 · 二头",
          "tip": "身体后倾约 45 度，肘部后拉"
        },
        {
          "key": "superman",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "超人式",
          "muscle": "下背 · 臀",
          "tip": "目视地面，用背部发力抬起"
        },
        {
          "key": "reverseFly-2",
          "sets": 3,
          "reps": "15-20",
          "rest": 45,
          "name": "俯身反向飞鸟（水瓶）",
          "muscle": "三角肌后束 · 上背",
          "tip": "俯身固定躯干，肘微屈外展"
        },
        {
          "key": "curl-2",
          "sets": 3,
          "reps": "12-15",
          "rest": 45,
          "name": "水瓶弯举",
          "muscle": "肱二头肌",
          "tip": "大臂固定不摆动，缓慢下放"
        },
        {
          "key": "doorFrameHang",
          "sets": 3,
          "reps": "20-40 秒",
          "rest": 60,
          "name": "门框悬挂",
          "muscle": "背阔肌 · 握力",
          "tip": "下沉肩胛骨，保持悬挂"
        }
      ]
    },
    "homeLegs": {
      "key": "homeLegs",
      "equipment": "home",
      "rawTitle": "居家腿（股四 · 臀 · 小腿）",
      "title": "居家腿",
      "muscles": "股四 · 臀 · 小腿",
      "musclesDerived": false,
      "note": "",
      "items": [
        {
          "key": "squat-2",
          "sets": 4,
          "reps": "15-20",
          "rest": 90,
          "name": "徒手深蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "膝盖与脚尖同向，下蹲到大腿平行"
        },
        {
          "key": "lunge-2",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "箭步蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "前膝不超过脚尖过多"
        },
        {
          "key": "hipThrust-2",
          "sets": 4,
          "reps": "15-20",
          "rest": 60,
          "name": "臀桥",
          "muscle": "臀大肌",
          "tip": "顶峰停顿 1-2 秒"
        },
        {
          "key": "wallSit",
          "sets": 3,
          "reps": "40-60 秒",
          "rest": 60,
          "name": "靠墙静蹲",
          "muscle": "股四头肌",
          "tip": "大腿与地面平行，膝盖对准脚尖"
        },
        {
          "key": "calfRaise",
          "sets": 4,
          "reps": "15-20",
          "rest": 45,
          "name": "站姿提踵",
          "muscle": "小腿",
          "tip": "顶峰停顿 1 秒，缓慢下放"
        },
        {
          "key": "crunch",
          "sets": 3,
          "reps": "15-20",
          "rest": 45,
          "name": "卷腹",
          "muscle": "腹直肌",
          "tip": "下背部贴地，呼气卷起"
        }
      ]
    },
    "homeUpper": {
      "key": "homeUpper",
      "equipment": "home",
      "rawTitle": "居家上肢 A",
      "title": "居家上肢 A",
      "muscles": "胸 · 背 · 肩 · 二头",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "pushup-2",
          "sets": 4,
          "reps": "8-15",
          "rest": 90,
          "name": "俯卧撑",
          "muscle": "胸 · 三头",
          "tip": "身体呈直线，肘部约 45 度"
        },
        {
          "key": "row-2",
          "sets": 4,
          "reps": "8-12",
          "rest": 90,
          "name": "反向划船（桌边）",
          "muscle": "背 · 二头",
          "tip": "身体保持直线，用背部带动上拉"
        },
        {
          "key": "ohp-2",
          "sets": 3,
          "reps": "12-15",
          "rest": 60,
          "name": "水瓶肩推",
          "muscle": "三角肌",
          "tip": "核心收紧，不要过度挺腰"
        },
        {
          "key": "pushup-6",
          "sets": 3,
          "reps": "6-10",
          "rest": 90,
          "name": "钻石俯卧撑",
          "muscle": "三头 · 胸",
          "tip": "双手呈菱形置于胸口下方"
        },
        {
          "key": "curl-2",
          "sets": 3,
          "reps": "12-15",
          "rest": 45,
          "name": "水瓶弯举",
          "muscle": "肱二头肌",
          "tip": "大臂固定不摆动"
        },
        {
          "key": "reverseFly-2",
          "sets": 3,
          "reps": "15-20",
          "rest": 45,
          "name": "俯身反向飞鸟（水瓶）",
          "muscle": "三角肌后束 · 上背",
          "tip": "俯身固定躯干，肘微屈外展"
        }
      ]
    },
    "homeUpperB": {
      "key": "homeUpperB",
      "equipment": "home",
      "rawTitle": "居家上肢 B",
      "title": "居家上肢 B",
      "muscles": "胸 · 背 · 肩 · 二头 · 三头",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "pushup-3",
          "sets": 4,
          "reps": "12-15",
          "rest": 60,
          "name": "上斜俯卧撑（桌面）",
          "muscle": "胸 · 三头",
          "tip": "身体呈直线，肘部约 45 度"
        },
        {
          "key": "row-3",
          "sets": 4,
          "reps": "8-12",
          "rest": 90,
          "name": "毛巾划船（门框）",
          "muscle": "背 · 二头",
          "tip": "身体后倾约 45 度，肘部后拉"
        },
        {
          "key": "benchDip",
          "sets": 3,
          "reps": "10-15",
          "rest": 60,
          "name": "凳上臂屈伸",
          "muscle": "肱三头肌",
          "tip": "大臂贴近身体，肘部后展"
        },
        {
          "key": "frontRaise-2",
          "sets": 3,
          "reps": "12-15",
          "rest": 45,
          "name": "水瓶前平举",
          "muscle": "三角肌前束",
          "tip": "抬至肩高，核心收紧不后仰"
        },
        {
          "key": "hammerCurl-2",
          "sets": 3,
          "reps": "12-15",
          "rest": 45,
          "name": "锤式弯举（水瓶）",
          "muscle": "肱二头肌 · 前臂",
          "tip": "中立握法，缓慢下放"
        },
        {
          "key": "doorFrameHang",
          "sets": 3,
          "reps": "20-40 秒",
          "rest": 60,
          "name": "门框悬挂",
          "muscle": "背阔肌 · 握力",
          "tip": "下沉肩胛骨，保持悬挂"
        }
      ]
    },
    "homeLower": {
      "key": "homeLower",
      "equipment": "home",
      "rawTitle": "居家下肢 A",
      "title": "居家下肢 A",
      "muscles": "股四头肌 · 臀 · 腘绳 · 小腿 · 核心",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "squat-2",
          "sets": 4,
          "reps": "15-20",
          "rest": 90,
          "name": "徒手深蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "膝盖与脚尖同向，下蹲到大腿平行"
        },
        {
          "key": "splitSquat-2",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "保加利亚分腿蹲（自重）",
          "muscle": "股四头肌 · 臀",
          "tip": "后脚垫高，重心放在前脚掌"
        },
        {
          "key": "hipThrust-3",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 60,
          "name": "单腿臀桥",
          "muscle": "臀大肌 · 腘绳肌",
          "tip": "髋部完全顶起，骨盆保持水平"
        },
        {
          "key": "sideLunge",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 60,
          "name": "侧弓步",
          "muscle": "臀中肌 · 大腿内侧",
          "tip": "膝盖对准脚尖，重心移到屈膝侧"
        },
        {
          "key": "calfRaise",
          "sets": 4,
          "reps": "15-20",
          "rest": 45,
          "name": "站姿提踵",
          "muscle": "小腿",
          "tip": "顶峰停顿 1 秒，缓慢下放"
        },
        {
          "key": "deadBug",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 45,
          "name": "死虫式",
          "muscle": "核心",
          "tip": "下背贴地，动作缓慢控制"
        }
      ]
    },
    "homeLowerB": {
      "key": "homeLowerB",
      "equipment": "home",
      "rawTitle": "居家下肢 B",
      "title": "居家下肢 B",
      "muscles": "股四头肌 · 臀 · 腘绳 · 核心",
      "musclesDerived": true,
      "note": "",
      "items": [
        {
          "key": "lunge-2",
          "sets": 4,
          "reps": "每侧 10-12",
          "rest": 90,
          "name": "箭步蹲",
          "muscle": "股四头肌 · 臀",
          "tip": "前膝不超过脚尖过多"
        },
        {
          "key": "hipThrust-3",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 60,
          "name": "单腿臀桥",
          "muscle": "臀大肌 · 腘绳肌",
          "tip": "髋部完全顶起，骨盆保持水平"
        },
        {
          "key": "sideLunge",
          "sets": 3,
          "reps": "每侧 10-12",
          "rest": 60,
          "name": "侧弓步",
          "muscle": "臀中肌 · 大腿内侧",
          "tip": "膝盖对准脚尖，重心移到屈膝侧"
        },
        {
          "key": "wallSit",
          "sets": 3,
          "reps": "40-60 秒",
          "rest": 60,
          "name": "靠墙静蹲",
          "muscle": "股四头肌",
          "tip": "大腿与地面平行，膝盖对准脚尖"
        },
        {
          "key": "squat-3",
          "sets": 3,
          "reps": "10-15",
          "rest": 90,
          "name": "深蹲跳（可原地深蹲）",
          "muscle": "臀腿 · 心肺",
          "tip": "落地轻缓，膝盖对准脚尖"
        },
        {
          "key": "sidePlank",
          "sets": 3,
          "reps": "每侧 30-45 秒",
          "rest": 60,
          "name": "侧平板支撑",
          "muscle": "腹斜肌 · 核心",
          "tip": "髋部抬起，身体呈一条直线"
        }
      ]
    }
  },
  "splitNames": {
    "2": "全身分化",
    "3": "推拉腿分化",
    "4": "上下肢分化",
    "5": "推拉腿 + 上下肢分化",
    "6": "推拉腿分化（A/B 轮换）"
  },
  "splitDescriptions": {
    "2": "全身 A / 全身 B 交替训练，动作覆盖全身，适合新手或时间有限的训练者。",
    "3": "推 A（胸 · 肩 · 三头）/ 拉 A（背 · 二头 · 后束）/ 腿 A（股四 · 臀 · 腘绳）。每天只练同一动作模式的肌群，训练动作连贯、恢复也更好安排。",
    "4": "上肢 A / 下肢 A / 上肢 B / 下肢 B，每个部位每周 2 练，是增肌效率很高的经典分化。",
    "5": "推 A / 拉 A / 腿 A / 上肢 B / 下肢 B，前三天练大项，后两天补充细节。",
    "6": "推 A / 拉 A / 腿 A / 推 B / 拉 B / 腿 B，每个部位每周 2 练，A/B 版本动作不同，避免枯燥。"
  },
  "templateLabels": {
    "2": "全身分化（新手友好）",
    "3": "推拉腿分化",
    "4": "上下肢分化",
    "5": "推拉腿 + 上下肢",
    "6": "推拉腿 A/B 轮换"
  },
  "variants": {
    "experience": {
      "affects": [
        "sets"
      ],
      "rule": "effectiveSets = Math.max(baseSets - (experience === \"beginner\" ? 1 : 0) - (volume === \"light\" ? 1 : 0), 2)",
      "setDeltaByExperience": {
        "beginner": -1,
        "intermediate": 0,
        "advanced": 0
      },
      "minSets": 2,
      "note": "只有新手减 1 组（下限 2 组）；中级/高级不改。reps / rest 不随经验变化。"
    },
    "volume": {
      "storageKey": "fitplan-volume",
      "values": [
        "full",
        "light"
      ],
      "default": "full",
      "setDeltaByVolume": {
        "full": 0,
        "light": -1
      },
      "minSets": 2,
      "rule": "light（一键降低训练容量）时每个动作再减 1 组，与新手减免叠加，最终不少于 2 组。"
    },
    "goal": {
      "affects": [],
      "note": "减脂 / 增肌 / 保持不改变组数、次数、休息，只影响训练页 tips（减脂加有氧、增肌渐进超负荷）与饮食方案。"
    },
    "experienceDayCap": {
      "rule": "experience === \"beginner\" ? Math.min(days, 3) : days",
      "note": "上游另有一个「新手最多按 3 天排」的辅助函数，但 buildWorkoutPlan 实际按所选天数取模板，未强制截断。"
    }
  },
  "tips": {
    "beginner": [
      "新手前 4-6 周以学习动作模式为主，优先使用轻重量保证动作标准；建议大肌群每周不超过 2 次，留足恢复时间。"
    ],
    "cut": [
      "减脂期力量训练后建议加 20-30 分钟中低强度有氧（快走 / 单车 / 爬坡），组间休息可缩短到 60-90 秒。"
    ],
    "bulk": [
      "增肌期以渐进超负荷为核心：当一组次数能轻松达到上限时，下次增加 2.5-5kg 重量。"
    ],
    "general": [
      "每次训练前先做 5-10 分钟动态热身（开合跳、髋部绕环、肩部环绕等），复合动作前再做 2-3 组空杆/轻重量热身组。",
      "力量训练安排在训练日的同一时段，保证每周 2 天以上休息日用于恢复。"
    ]
  },
  "weekdayDefaults": {
    "2": [
      0,
      3
    ],
    "3": [
      0,
      2,
      4
    ],
    "4": [
      0,
      1,
      3,
      4
    ],
    "5": [
      0,
      1,
      2,
      3,
      4
    ],
    "6": [
      0,
      1,
      2,
      3,
      4,
      5
    ]
  },
  "weekdayDefaultsByNames": {
    "2": [
      "周一",
      "周四"
    ],
    "3": [
      "周一",
      "周三",
      "周五"
    ],
    "4": [
      "周一",
      "周二",
      "周四",
      "周五"
    ],
    "5": [
      "周一",
      "周二",
      "周三",
      "周四",
      "周五"
    ],
    "6": [
      "周一",
      "周二",
      "周三",
      "周四",
      "周五",
      "周六"
    ]
  },
  "weekdayMeta": {
    "indexBase": 0,
    "description": "0 = 周一。上游按「训练天数 → 推荐训练日」生成日历，可手动增删；周训练日与模板中第 N 天按排序后一一对应。",
    "names": [
      "周一",
      "周二",
      "周三",
      "周四",
      "周五",
      "周六",
      "周日"
    ],
    "ics": [
      "MO",
      "TU",
      "WE",
      "TH",
      "FR",
      "SA",
      "SU"
    ],
    "readmeNote": "训练日默认按训练天数推荐（如 3 天练：周一、周三、周五），可自行增删。",
    "reminderDefaults": {
      "time": "19:00",
      "leadMin": 30,
      "leadOptions": [
        15,
        30,
        60
      ]
    }
  },
  "planIntro": {
    "headingTemplate": "周训练安排 · {splitLabel}",
    "splitLabelTemplate": "{templateLabel} · {equipmentLabel}",
    "equipmentLabels": {
      "gym": "健身房",
      "home": "居家无器械"
    },
    "equipmentOptionLabels": {
      "gym": "健身房器械",
      "home": "居家无器械"
    },
    "homeSplitDescSuffix": " 居家版全部为无器械动作，用桌椅、门框和装满水的瓶子即可完成。",
    "dayLineTemplate": "{dayTitles}，其余为休息日（可安排散步或拉伸）。",
    "dayTitleTemplate": "第 {n} 天：{title}",
    "dayTitleJoiner": " · ",
    "demoNote": "点击「Day 1 / Day 2…」展开当天训练；点「开始训练」进入沉浸式模式，按顺序逐动作推进；每行 ⏱ 可单独开启组间计时器；「编辑」可修改组数、次数或替换动作；动作下方的演示动图会在滚动到该动作时自动加载。",
    "dayHeadTemplate": "Day {n} · {title}",
    "startSessionLabel": "开始训练",
    "tableHeaders": [
      "#",
      "动作",
      "目标肌群",
      "组数 × 次数",
      "组间休息",
      "计时",
      "要点"
    ],
    "restTimerLabel": "组间休息",
    "restTimerPresets": [
      60,
      90,
      120,
      150
    ],
    "calendar": {
      "title": "训练日历",
      "desc": "训练计划已按你选定的训练日排进日历（每周循环），今天会自动高亮。",
      "reminderHint": "选择每周训练日（自动按训练天数推荐，可自行调整），设置训练时间与提前提醒时长。页面打开时会收到浏览器桌面提醒；导出 .ics 文件导入系统日历可离线提醒。",
      "notifyUnsupported": "当前浏览器不支持桌面通知，建议导出 .ics 文件导入系统日历实现提醒。",
      "notifyEnabledTemplate": "桌面提醒已开启：每周 {days} 个训练日，每天 {time} 提前 {lead} 分钟提醒（页面打开时生效）。建议同时导出 .ics 实现离线提醒。",
      "notifyDisabled": "未开启桌面提醒。开启后浏览器会定时检查训练日程并弹出通知；导出 .ics 可导入手机 / 电脑系统日历，即使页面关闭也能提醒。"
    }
  },
  "motionRules": [
    {
      "match": [
        "直臂下压"
      ],
      "matchMode": "any",
      "key": "straightPulldown"
    },
    {
      "match": [
        "双杠臂屈伸"
      ],
      "matchMode": "any",
      "key": "dip"
    },
    {
      "match": [
        "仰卧哑铃臂屈伸"
      ],
      "matchMode": "any",
      "key": "lyingExt"
    },
    {
      "match": [
        "腿弯举"
      ],
      "matchMode": "any",
      "key": "legCurl"
    },
    {
      "match": [
        "腿举"
      ],
      "matchMode": "any",
      "key": "legPress"
    },
    {
      "match": [
        "深蹲"
      ],
      "matchMode": "any",
      "key": "squat"
    },
    {
      "match": [
        "分腿蹲"
      ],
      "matchMode": "any",
      "key": "splitSquat"
    },
    {
      "match": [
        "箭步蹲"
      ],
      "matchMode": "any",
      "key": "lunge"
    },
    {
      "match": [
        "罗马尼亚"
      ],
      "matchMode": "any",
      "key": "rdl"
    },
    {
      "match": [
        "硬拉"
      ],
      "matchMode": "any",
      "key": "deadlift"
    },
    {
      "match": [
        "上斜",
        "卧推"
      ],
      "matchMode": "all",
      "key": "inclinePress"
    },
    {
      "match": [
        "器械推胸"
      ],
      "matchMode": "any",
      "key": "machinePress"
    },
    {
      "match": [
        "卧推"
      ],
      "matchMode": "any",
      "key": "bench"
    },
    {
      "match": [
        "站姿肩推"
      ],
      "matchMode": "any",
      "key": "standingOhp"
    },
    {
      "match": [
        "肩推"
      ],
      "matchMode": "any",
      "key": "ohp"
    },
    {
      "match": [
        "引体"
      ],
      "matchMode": "any",
      "key": "pullup"
    },
    {
      "match": [
        "高位下拉"
      ],
      "matchMode": "any",
      "key": "latPulldown"
    },
    {
      "match": [
        "臀桥"
      ],
      "matchMode": "any",
      "key": "hipThrust"
    },
    {
      "match": [
        "侧平举"
      ],
      "matchMode": "any",
      "key": "lateralRaise"
    },
    {
      "match": [
        "前平举"
      ],
      "matchMode": "any",
      "key": "frontRaise"
    },
    {
      "match": [
        "锤式弯举"
      ],
      "matchMode": "any",
      "key": "hammerCurl"
    },
    {
      "match": [
        "牧师凳弯举"
      ],
      "matchMode": "any",
      "key": "preacherCurl"
    },
    {
      "match": [
        "弯举"
      ],
      "matchMode": "any",
      "key": "curl"
    },
    {
      "match": [
        "下压"
      ],
      "matchMode": "any",
      "key": "pushdown"
    },
    {
      "match": [
        "面拉"
      ],
      "matchMode": "any",
      "key": "facePull"
    },
    {
      "match": [
        "反向飞鸟"
      ],
      "matchMode": "any",
      "key": "reverseFly"
    },
    {
      "match": [
        "俯卧撑"
      ],
      "matchMode": "any",
      "key": "pushup"
    },
    {
      "match": [
        "侧平板"
      ],
      "matchMode": "any",
      "key": "sidePlank"
    },
    {
      "match": [
        "平板支撑"
      ],
      "matchMode": "any",
      "key": "plank"
    },
    {
      "match": [
        "卷腹"
      ],
      "matchMode": "any",
      "key": "crunch"
    },
    {
      "match": [
        "悬垂举腿"
      ],
      "matchMode": "any",
      "key": "legRaise"
    },
    {
      "match": [
        "坐姿提踵"
      ],
      "matchMode": "any",
      "key": "seatedCalf"
    },
    {
      "match": [
        "提踵"
      ],
      "matchMode": "any",
      "key": "calfRaise"
    },
    {
      "match": [
        "耸肩"
      ],
      "matchMode": "any",
      "key": "shrug"
    },
    {
      "match": [
        "髋外展"
      ],
      "matchMode": "any",
      "key": "abduction"
    },
    {
      "match": [
        "飞鸟"
      ],
      "matchMode": "any",
      "key": "fly"
    },
    {
      "match": [
        "坐姿绳索划船"
      ],
      "matchMode": "any",
      "key": "seatedRow"
    },
    {
      "match": [
        "单臂哑铃划船"
      ],
      "matchMode": "any",
      "key": "oneArmRow"
    },
    {
      "match": [
        "T 杠划船",
        "T杠划船"
      ],
      "matchMode": "any",
      "key": "tBarRow"
    },
    {
      "match": [
        "划船"
      ],
      "matchMode": "any",
      "key": "row"
    }
  ],
  "mistakeRules": [
    {
      "match": [
        "深蹲"
      ],
      "text": "膝盖内扣或脚跟离地；建议膝盖与脚尖同向，重心踩稳全脚掌"
    },
    {
      "match": [
        "卧推"
      ],
      "text": "耸肩或手腕弯折；建议肩胛骨后收下沉，手腕保持中立"
    },
    {
      "match": [
        "硬拉"
      ],
      "text": "弓背发力；建议挺胸收腹，杠铃贴近身体"
    },
    {
      "match": [
        "划船"
      ],
      "text": "身体晃动借力；建议固定躯干，用肘部带动"
    },
    {
      "match": [
        "肩推"
      ],
      "text": "过度挺腰；建议核心收紧，不要过度后仰"
    },
    {
      "match": [
        "弯举"
      ],
      "text": "大臂摆动借力；建议大臂固定，缓慢下放"
    },
    {
      "match": [
        "侧平举"
      ],
      "text": "耸肩代偿；建议用中束发力，肘微屈"
    },
    {
      "match": [
        "俯卧撑"
      ],
      "text": "塌腰或撅臀；建议收紧核心，身体呈直线"
    },
    {
      "match": [
        "平板"
      ],
      "text": "塌腰或撅臀；建议臀部收紧，身体呈直线"
    },
    {
      "match": [
        "卷腹"
      ],
      "text": "用手拉脖子；建议双手轻扶耳侧，下背贴地"
    },
    {
      "match": [
        "箭步蹲"
      ],
      "text": "前膝内扣；建议膝盖对准脚尖"
    },
    {
      "match": [
        "臀桥"
      ],
      "text": "腰部代偿或幅度不足；建议用臀部发力顶髋"
    },
    {
      "match": [
        "提踵"
      ],
      "text": "幅度太小；建议顶峰停顿，缓慢下放"
    },
    {
      "match": [
        "引体"
      ],
      "text": "摆动借力；建议控制节奏，先沉肩再发力"
    },
    {
      "match": [
        "下拉"
      ],
      "text": "身体后仰过大；建议躯干微倾，拉到上胸位置"
    },
    {
      "match": [
        "面拉"
      ],
      "text": "耸肩；建议肩胛骨后收，手臂外旋"
    },
    {
      "match": [
        "分腿蹲"
      ],
      "text": "前膝内扣；建议膝盖对准脚尖，重心放前脚掌"
    },
    {
      "match": [
        "腿举"
      ],
      "text": "膝盖完全锁死；建议保留微屈"
    },
    {
      "match": [
        "臂屈伸"
      ],
      "text": "肘部外展；建议大臂贴近身体"
    },
    {
      "match": [
        "下压"
      ],
      "text": "肘部外展；建议大臂夹紧，只用前臂发力"
    },
    {
      "match": [
        "飞鸟"
      ],
      "text": "手臂完全伸直锁肘；建议肘微屈，控制下放"
    },
    {
      "match": [
        "前平举"
      ],
      "text": "身体后仰借力；建议核心收紧，缓慢下放"
    },
    {
      "match": [
        "耸肩"
      ],
      "text": "转肩画圈；建议垂直上下，不要旋转"
    },
    {
      "match": [
        "悬垂举腿"
      ],
      "text": "摆动借力；建议骨盆后倾，控制速度"
    },
    {
      "match": [
        "侧平板"
      ],
      "text": "髋部下塌；建议髋部抬起，身体呈一条直线"
    },
    {
      "match": [
        "超人"
      ],
      "text": "抬头过高；建议目视地面，用背部发力"
    },
    {
      "match": [
        "静蹲"
      ],
      "text": "膝盖超过脚尖过多；建议大腿与地面平行，膝盖对准脚尖"
    },
    {
      "match": [
        "死虫"
      ],
      "text": "腰部离地；建议下背贴地，动作缓慢"
    },
    {
      "match": [
        "反向飞鸟"
      ],
      "text": "耸肩；建议肩胛骨后收，肘微屈"
    }
  ],
  "mistakeFallback": "建议先以轻重量熟悉动作模式，再逐步加重。"
};

  if (typeof module === 'object' && module.exports) module.exports = DATA;
  root.FP_TRAINING = DATA;
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================
 * 追加：4 天「胸 · 背 · 肩 · 腿」分化模板（每个部位单独一天）
 * 挂到 templates[equipment]['4-bro']，由 app.js 在 4 天 + 该分化时选用。
 * ============================================================ */
(function () {
  var D = (typeof module === 'object' && module.exports)
    ? module.exports
    : (typeof window !== 'undefined' ? window.FP_TRAINING : null);
  if (!D || !D.templates) return;

  D.templates.gym = D.templates.gym || {};
  D.templates.home = D.templates.home || {};
  D.templates.gym['4-bro'] = [
  {
    "index": 1,
    "dayKey": "chest",
    "title": "胸日",
    "muscles": "胸 · 三头",
    "note": "以卧推类为主，先复合后孤立。",
    "items": [
      {
        "key": "bench",
        "sets": 4,
        "reps": "6-8",
        "rest": 120,
        "name": "杠铃卧推",
        "muscle": "胸 · 三头",
        "tip": "肩胛骨后收下沉，杠铃触胸"
      },
      {
        "key": "inclinePress",
        "sets": 3,
        "reps": "8-10",
        "rest": 90,
        "name": "上斜哑铃卧推",
        "muscle": "上胸 · 三头",
        "tip": "手肘约 45 度夹角"
      },
      {
        "key": "machinePress",
        "sets": 3,
        "reps": "10-12",
        "rest": 90,
        "name": "器械推胸",
        "muscle": "胸 · 三头",
        "tip": "顶峰收缩 1 秒，避免完全锁死"
      },
      {
        "key": "fly",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "哑铃飞鸟（平板）",
        "muscle": "胸大肌",
        "tip": "肘微屈，下放至胸部有拉伸感"
      },
      {
        "key": "dip",
        "sets": 3,
        "reps": "8-12",
        "rest": 90,
        "name": "双杠臂屈伸（负重可选）",
        "muscle": "下胸 · 三头",
        "tip": "身体略前倾，肘部后展"
      },
      {
        "key": "pushup",
        "sets": 2,
        "reps": "12-15",
        "rest": 60,
        "name": "俯卧撑（负重可选）",
        "muscle": "胸 · 三头 · 核心",
        "tip": "身体呈直线，肘部约 45 度"
      }
    ]
  },
  {
    "index": 2,
    "dayKey": "back",
    "title": "背日",
    "muscles": "背 · 二头 · 后束",
    "note": "垂直拉 + 水平拉搭配，最后补后束。",
    "items": [
      {
        "key": "pullup",
        "sets": 4,
        "reps": "8-12",
        "rest": 120,
        "name": "引体向上 / 高位下拉",
        "muscle": "背阔肌 · 二头",
        "tip": "下沉肩胛骨，拉到锁骨高度"
      },
      {
        "key": "row",
        "sets": 4,
        "reps": "8-10",
        "rest": 120,
        "name": "杠铃划船",
        "muscle": "背 · 二头",
        "tip": "背部平直，用肘部带动上拉"
      },
      {
        "key": "latPulldown",
        "sets": 3,
        "reps": "10-12",
        "rest": 90,
        "name": "高位下拉",
        "muscle": "背阔肌 · 二头",
        "tip": "拉到上胸位置"
      },
      {
        "key": "seatedRow",
        "sets": 3,
        "reps": "10-12",
        "rest": 90,
        "name": "坐姿绳索划船",
        "muscle": "中背 · 后束",
        "tip": "挺胸收肘，顶峰收紧肩胛"
      },
      {
        "key": "oneArmRow",
        "sets": 3,
        "reps": "10-12",
        "rest": 90,
        "name": "单臂哑铃划船",
        "muscle": "背阔肌 · 斜方肌",
        "tip": "背部平直，避免躯干旋转"
      },
      {
        "key": "facePull",
        "sets": 3,
        "reps": "15-20",
        "rest": 60,
        "name": "面拉",
        "muscle": "后束 · 上背",
        "tip": "绳索拉向面部，外旋肩部"
      }
    ]
  },
  {
    "index": 3,
    "dayKey": "shoulders",
    "title": "肩日",
    "muscles": "肩 · 斜方",
    "note": "推举打底，侧平举增宽，后束别忘。",
    "items": [
      {
        "key": "ohp",
        "sets": 4,
        "reps": "8-10",
        "rest": 120,
        "name": "坐姿哑铃肩推",
        "muscle": "三角肌",
        "tip": "下放至耳朵高度即可"
      },
      {
        "key": "lateralRaise",
        "sets": 4,
        "reps": "12-15",
        "rest": 60,
        "name": "哑铃侧平举",
        "muscle": "三角肌中束",
        "tip": "用肩部发力，肘微屈"
      },
      {
        "key": "frontRaise",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "哑铃前平举",
        "muscle": "三角肌前束",
        "tip": "抬至肩高，缓慢下放"
      },
      {
        "key": "reverseFly",
        "sets": 3,
        "reps": "15-20",
        "rest": 60,
        "name": "反向飞鸟",
        "muscle": "三角肌后束",
        "tip": "俯身或趴凳，肘微屈外展"
      },
      {
        "key": "facePull",
        "sets": 3,
        "reps": "15-20",
        "rest": 60,
        "name": "面拉",
        "muscle": "后束 · 上背",
        "tip": "绳索拉向面部，外旋肩部"
      },
      {
        "key": "shrug",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "杠铃耸肩",
        "muscle": "斜方肌上束",
        "tip": "垂直向上耸肩，不要转肩"
      }
    ]
  },
  {
    "index": 4,
    "dayKey": "legs",
    "title": "腿日",
    "muscles": "股四 · 腘绳 · 臀 · 小腿",
    "note": "先蹲后髋铰链，最后孤立与提踵。",
    "items": [
      {
        "key": "squat",
        "sets": 4,
        "reps": "6-8",
        "rest": 150,
        "name": "杠铃深蹲",
        "muscle": "股四头肌 · 臀",
        "tip": "膝盖与脚尖同向，保持核心收紧"
      },
      {
        "key": "rdl",
        "sets": 4,
        "reps": "8-10",
        "rest": 120,
        "name": "罗马尼亚硬拉",
        "muscle": "腘绳肌 · 臀",
        "tip": "屈髋后移，杠铃贴腿下放"
      },
      {
        "key": "legPress",
        "sets": 3,
        "reps": "10-12",
        "rest": 90,
        "name": "腿举机",
        "muscle": "股四头肌 · 臀",
        "tip": "膝盖不要完全锁死"
      },
      {
        "key": "legCurl",
        "sets": 3,
        "reps": "12-15",
        "rest": 90,
        "name": "腿弯举",
        "muscle": "腘绳肌",
        "tip": "收缩顶峰停顿 1 秒"
      },
      {
        "key": "hipThrust",
        "sets": 3,
        "reps": "10-12",
        "rest": 90,
        "name": "杠铃臀桥",
        "muscle": "臀大肌",
        "tip": "顶峰停顿 1-2 秒"
      },
      {
        "key": "calfRaise",
        "sets": 4,
        "reps": "15-20",
        "rest": 60,
        "name": "站姿提踵",
        "muscle": "小腿",
        "tip": "顶峰停顿 1 秒，缓慢下放"
      }
    ]
  }
];
  D.templates.home['4-bro'] = [
  {
    "index": 1,
    "dayKey": "chest",
    "title": "胸日",
    "muscles": "胸 · 三头",
    "note": "俯卧撑变式调整角度，注意肩胛稳定。",
    "items": [
      {
        "key": "pushup-2",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "俯卧撑",
        "muscle": "胸 · 三头 · 核心",
        "tip": "身体呈直线，肘部约 45 度"
      },
      {
        "key": "pushup-3",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "上斜俯卧撑（桌面）",
        "muscle": "胸 · 三头",
        "tip": "身体呈直线，肘部约 45 度"
      },
      {
        "key": "pushup-4",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "宽距俯卧撑",
        "muscle": "胸 · 三头",
        "tip": "双手略宽于肩，身体呈直线"
      },
      {
        "key": "pushup-5",
        "sets": 3,
        "reps": "8-12",
        "rest": 60,
        "name": "下斜俯卧撑（脚垫高）",
        "muscle": "上胸 · 三头",
        "tip": "双脚垫高，身体保持直线"
      },
      {
        "key": "pushup-6",
        "sets": 3,
        "reps": "8-12",
        "rest": 60,
        "name": "钻石俯卧撑",
        "muscle": "三头 · 胸",
        "tip": "双手呈菱形置于胸口下方"
      },
      {
        "key": "benchDip",
        "sets": 3,
        "reps": "10-15",
        "rest": 60,
        "name": "凳上臂屈伸",
        "muscle": "肱三头肌",
        "tip": "大臂贴近身体，肘部后展"
      }
    ]
  },
  {
    "index": 2,
    "dayKey": "back",
    "title": "背日",
    "muscles": "背 · 二头 · 后束",
    "note": "用桌边/门框做水平拉，动作放慢。",
    "items": [
      {
        "key": "row-2",
        "sets": 3,
        "reps": "8-12",
        "rest": 90,
        "name": "反向划船（桌边）",
        "muscle": "背 · 二头",
        "tip": "身体保持直线，用背部带动上拉"
      },
      {
        "key": "row-3",
        "sets": 3,
        "reps": "10-15",
        "rest": 90,
        "name": "毛巾划船（门框）",
        "muscle": "背 · 二头",
        "tip": "身体后倾约 45 度，用背部带动拉"
      },
      {
        "key": "superman",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "超人式",
        "muscle": "下背 · 臀",
        "tip": "目视地面，用背部发力抬起"
      },
      {
        "key": "reverseFly-2",
        "sets": 3,
        "reps": "15-20",
        "rest": 60,
        "name": "俯身反向飞鸟（水瓶）",
        "muscle": "三角肌后束 · 上背",
        "tip": "俯身固定躯干，肘微屈外展"
      },
      {
        "key": "doorFrameHang",
        "sets": 3,
        "reps": "20-30 秒",
        "rest": 60,
        "name": "门框悬挂",
        "muscle": "背阔肌 · 握力",
        "tip": "下沉肩胛骨，保持悬挂"
      }
    ]
  },
  {
    "index": 3,
    "dayKey": "shoulders",
    "title": "肩日",
    "muscles": "肩 · 后束",
    "note": "水瓶代替哑铃，小重量多次数。",
    "items": [
      {
        "key": "ohp-2",
        "sets": 3,
        "reps": "10-12",
        "rest": 90,
        "name": "水瓶肩推",
        "muscle": "三角肌",
        "tip": "核心收紧，不要过度挺腰"
      },
      {
        "key": "lateralRaise-2",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "水瓶侧平举",
        "muscle": "三角肌中束",
        "tip": "用小重量，感受中束发力"
      },
      {
        "key": "frontRaise-2",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "水瓶前平举",
        "muscle": "三角肌前束",
        "tip": "抬至肩高，核心收紧不后仰"
      },
      {
        "key": "reverseFly-2",
        "sets": 3,
        "reps": "15-20",
        "rest": 60,
        "name": "俯身反向飞鸟（水瓶）",
        "muscle": "三角肌后束 · 上背",
        "tip": "俯身固定躯干，肘微屈外展"
      }
    ]
  },
  {
    "index": 4,
    "dayKey": "legs",
    "title": "腿日",
    "muscles": "股四 · 臀 · 腘绳 · 小腿",
    "note": "自重深蹲与分腿蹲为主，注意膝盖方向。",
    "items": [
      {
        "key": "squat-2",
        "sets": 3,
        "reps": "15-20",
        "rest": 60,
        "name": "徒手深蹲",
        "muscle": "股四头肌 · 臀",
        "tip": "膝盖与脚尖同向，下蹲到大腿平行"
      },
      {
        "key": "lunge-2",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "箭步蹲",
        "muscle": "股四头肌 · 臀",
        "tip": "前膝不超过脚尖过多"
      },
      {
        "key": "splitSquat-2",
        "sets": 3,
        "reps": "10-12",
        "rest": 90,
        "name": "保加利亚分腿蹲（自重）",
        "muscle": "股四头肌 · 臀",
        "tip": "后脚垫高，重心放在前脚掌"
      },
      {
        "key": "hipThrust-2",
        "sets": 3,
        "reps": "12-15",
        "rest": 60,
        "name": "臀桥",
        "muscle": "臀大肌",
        "tip": "顶峰停顿 1-2 秒"
      },
      {
        "key": "squat-3",
        "sets": 3,
        "reps": "10-15",
        "rest": 90,
        "name": "深蹲跳（可原地深蹲）",
        "muscle": "臀腿 · 心肺",
        "tip": "落地轻缓，膝盖对准脚尖"
      },
      {
        "key": "calfRaise",
        "sets": 4,
        "reps": "15-20",
        "rest": 60,
        "name": "站姿提踵",
        "muscle": "小腿",
        "tip": "顶峰停顿 1 秒，缓慢下放"
      }
    ]
  }
];

  D.broSplitName = '胸 · 背 · 肩 · 腿分化';
  D.broSplitDescription = '每个部位单独一天：胸 / 背 / 肩 / 腿各练 1 次、每个部位每周约 2 次刺激（含间接），适合想集中练单个部位、训练时间相对充裕的人。';
})();
