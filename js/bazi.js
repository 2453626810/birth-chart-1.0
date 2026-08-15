/**
 * bazi.js — 八字计算核心逻辑
 * 依赖：lunar-javascript 库（通过CDN引入，全局可用 window.Solar 和 window.Lunar）
 *
 * 本文件负责：调用 lunar-javascript 库完成所有八字相关计算，
 * 包括四柱排盘、藏干、十神、纳音、五行统计、大运排盘、用神分析、流年解读、性格概述
 *
 * 全局函数：calculateBazi() — 用户点击"开始排盘"按钮时调用
 */

// ========== 辅助数据 ==========

// 五行名称
var ELEMENT_NAMES = ['木', '火', '土', '金', '水'];

// 天干对应的五行（按索引0=甲, 1=乙...9=癸）
var STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]; // 木木 火火 土土 金金 水水

// 天干的阴阳（true=阳, false=阴）
var STEM_YIN_YANG = [true, false, true, false, true, false, true, false, true, false];

// 地支对应的五行
var BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]; // 子水 丑土 寅木 卯木 辰土 巳火 午火 未土 申金 酉金 戌土 亥水

// 五行颜色（用于页面展示）
var ELEMENT_COLORS = {
  '金': '#f1f5f9',
  '木': '#dcfce7',
  '水': '#dbeafe',
  '火': '#fee2e2',
  '土': '#fef3c7'
};
var ELEMENT_TEXT_COLORS = {
  '金': '#334155',
  '木': '#166534',
  '水': '#1e40af',
  '火': '#991b1b',
  '土': '#92400e'
};

// 十二长生含义解释（白话解释每个阶段代表什么）
var CHANG_SHENG_DESC = {
  '长生': '新生命刚刚诞生，充满希望和活力。就像早上初升的太阳，一切都在起步，应该多尝试、多学习。',
  '沐浴': '像婴儿洗澡一样，开始接受外部世界的洗礼。这个阶段容易受环境影响，情感比较丰富，但不太稳定。',
  '冠带': '穿上正装、开始正式踏入社会。就像年轻人刚参加工作，开始有了责任感和自我约束能力。',
  '临官': '做官上任，代表人生进入了最好的阶段。能力得到发挥，事业有进展，是黄金时期。',
  '帝旺': '人生巅峰状态，精力最旺、运势最强。但也要注意盛极必衰，保持谦虚谨慎。',
  '衰': '开始走下坡路，精力不如从前。做事需要更加稳重，不要冒太大风险。',
  '病': '事物出现问题和毛病，运势偏弱。做事容易遇到阻碍，需要耐心调养和等待时机。',
  '死': '事物终结、画上句号。代表一个阶段的结束，保守收缩比扩张更明智。',
  '墓': '归入墓库收起来。像物品放进仓库休养，是一个蓄力待发的阶段，不是真的不好。',
  '绝': '事物走到尽头、毫无生气。运势最低点，尽量以守为主，不宜大动作。',
  '胎': '怀胎孕育中，事情正在酝酿但还未成型。需要耐心筹备，时机未到不要硬来。',
  '养': '胎儿在腹中慢慢长大。代表事情正在积蓄力量，前途是好的，只是需要时间等待。'
};

// 十二长生对应的简短标签（用于提示框）
var CHANG_SHENG_SHORT = {
  '长生': '起步、学习、尝试阶段',
  '沐浴': '不稳定、情绪化、受环境影响',
  '冠带': '有担当、开始承担责任',
  '临官': '最佳状态、事业进展',
  '帝旺': '巅峰时期、注意保持谦逊',
  '衰': '力不从心、需守不攻',
  '病': '困难较多、需要耐心',
  '死': '一个阶段结束、保守为好',
  '墓': '蓄力待发、潜伏阶段',
  '绝': '最低谷、以守为主',
  '胎': '酝酿筹备中、不要急',
  '养': '积蓄力量、耐心等待'
};

// ========== 神煞查找表 ==========
// 天乙贵人（最大的贵人星，遇事有贵人帮助）：特殊天干组合
var TIAN_YI_MAP = {
  '甲': ['丑', '未'],
  '乙': ['子', '申'],
  '丙': ['亥', '酉'],
  '丁': ['亥', '酉'],
  '戊': ['丑', '未'],
  '己': ['子', '申'],
  '庚': ['丑', '未'],
  '辛': ['午', '寅'],
  '壬': ['卯', '巳'],
  '癸': ['卯', '巳']
};

// 文昌星（学业文运有利）：每个天干对应一个地支
var WEN_CHANG_MAP = {
  '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
  '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
};

// 桃花/咸池（姻缘人缘）：根据地支三合局判断
var TAO_HUA_MAP = {
  '申': '酉', '子': '酉', '辰': '酉',
  '寅': '卯', '午': '卯', '戌': '卯',
  '巳': '午', '酉': '午', '丑': '午',
  '亥': '子', '卯': '子', '未': '子'
};

// 驿马（奔波变动、走动多）：根据地支三合局判断
var YI_MA_MAP = {
  '申': '寅', '子': '寅', '辰': '寅',
  '寅': '申', '午': '申', '戌': '申',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳'
};

// 华盖（艺术才华、聪明但可能孤僻）：根据地支三合局判断
var HUA_GAI_MAP = {
  '申': '辰', '子': '辰', '辰': '辰',
  '寅': '戌', '午': '戌', '戌': '戌',
  '巳': '丑', '酉': '丑', '丑': '丑',
  '亥': '未', '卯': '未', '未': '未'
};

// 将星（领导能力、管理天赋）
var JIANG_XING_MAP = {
  '申': '子', '子': '子', '辰': '子',
  '寅': '午', '午': '午', '戌': '午',
  '巳': '酉', '酉': '酉', '丑': '酉',
  '亥': '卯', '卯': '卯', '未': '卯'
};

// 禄神（福禄、财运）：日干对应地支
var LU_SHEN_MAP = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
  '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
};

// 羊刃（强势但容易冲动）：日干对应地支
var YANG_REN_MAP = {
  '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
  '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥'
};

// 神煞的白话解释
var SHEN_SHA_DESC = {
  '天乙贵人': '最大的贵人星！遇到困难时总有人伸出援手，人缘好，跟地位高的人有缘分。',
  '文昌星': '学业运和文运好，聪明好学，适合读书考试、写作创作类的工作。',
  '桃花': '人缘好、异性缘旺，外表和气质比较吸引人。但桃花多也可能带来感情烦恼。',
  '驿马': '一生中变动较多，可能常出差、搬家或换工作。适合流动性强的工作。',
  '华盖': '有艺术天赋和独特才华，思维深刻但有时感觉孤独、不太合群。',
  '将星': '天生有领导气质，做事果断、有组织能力，适合做管理和决策类工作。',
  '禄神': '福禄之星，一生衣食无忧，财运比较稳定，不太容易陷入贫困。',
  '羊刃': '性格刚强果断，行动力很强。但有时过于强势冲动，需要注意人际关系。',
  '红鸾': '正桃花星！红鸾星动代表姻缘到了，是结婚的吉兆。命中带红鸾的人感情缘分比较顺利。',
  '天喜': '大喜之星！代表喜事临门，不仅利于姻缘，也利于添丁（生孩子）。天喜星在，好事接踵而来。'
};

// 用神五行对应的实用建议（颜色、方位、行业）
var YONG_SHEN_GUIDE = {
  '金': {
    color: '白色、金色、银色',
    direction: '西方',
    industries: '金融、法律、机械制造、珠宝首饰、汽车行业',
    tips: '佩戴金属饰品（银饰、白金），工作桌朝西坐，多穿白色调的衣服。'
  },
  '木': {
    color: '绿色、青色、翠绿色',
    direction: '东方',
    industries: '教育、文化、医疗（中医）、园林、出版、环保行业',
    tips: '办公室或家里多种绿色植物，朝东的房间有利于运势。'
  },
  '水': {
    color: '黑色、蓝色、深灰色',
    direction: '北方',
    industries: '物流、贸易、旅游、媒体传播、水产渔业、互联网（流动属性）',
    tips: '家里可以养鱼或摆放水景装饰，多去水边城市旅游。'
  },
  '火': {
    color: '红色、紫色、橙色',
    direction: '南方',
    industries: '餐饮、娱乐、演艺、能源、电子科技、美容美发',
    tips: '多穿红色调的衣服，办公环境保持明亮，适合在南方城市发展。'
  },
  '土': {
    color: '黄色、棕色、咖啡色',
    direction: '中部（或原地发展）',
    industries: '房地产、建筑、农业、陶瓷、珠宝鉴定、土地资源管理',
    tips: '适合在本地或家乡发展，佩戴土属性宝石（如黄水晶），多接触大自然。'
  }
};

// ========== 红鸾天喜查找表（婚姻吉星）==========
// 红鸾：正桃花，主姻缘、结婚；天喜：红鸾的对冲位，主喜庆、添丁
var HONG_LUAN_MAP = {
  '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
  '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
  '申': '未', '酉': '午', '戌': '巳', '亥': '辰'
};
var TIAN_XI_MAP = {
  '子': '酉', '丑': '申', '寅': '未', '卯': '午',
  '辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
  '申': '丑', '酉': '子', '戌': '亥', '亥': '戌'
};

// ========== 配偶宫解读表（日支=配偶宫）==========
// 日支代表配偶在命局中的"位置"，不同地支的配偶特征不同
var SPOUSE_PALACE_DESC = {
  '子': '配偶宫在子（水），属于"四正"之一。另一半聪明灵活、反应快，但有时候心思多变、情绪敏感。桃花运比较旺，可能在社交场合认识对方。',
  '丑': '配偶宫在丑（湿土），属于"四墓库"之一。另一半踏实稳重、做事有条理，但有时候比较固执。可能是通过工作或长辈介绍认识的。',
  '寅': '配偶宫在寅（木），属于"四长生"之一。另一半有上进心、喜欢挑战新事物，性格比较独立。可能在出差、旅行或学习进修时认识。',
  '卯': '配偶宫在卯（木），属于"四正"之一。另一半性格温柔、心思细腻、审美不错。是桃花旺的位置，感情开始得比较浪漫，但也要注意稳定性。',
  '辰': '配偶宫在辰（湿土），属于"四墓库"之一。另一半有包容心、为人厚道，但内心有点固执。婚姻需要多一些沟通和理解。',
  '巳': '配偶宫在巳（火），属于"四长生"之一。另一半热情开朗、行动力强，可能有技术专长。感情来得快去得也快，需要用心经营。',
  '午': '配偶宫在午（火），属于"四正"之一。另一半性格明朗大方、有领导气质，但自尊心比较强。婚姻中建议多一些欣赏和赞美。',
  '未': '配偶宫在未（燥土），属于"四墓库"之一。另一半性格温和、顾家体贴，但有时候优柔寡断。适合通过相亲或亲友介绍认识。',
  '申': '配偶宫在申（金），属于"四长生"之一。另一半聪明干练、有想法有主见，可能在事业上有不错的发展。两人之间要多一些包容。',
  '酉': '配偶宫在酉（金），属于"四正"之一。另一半外表不错、注重生活品质，但有时候对自己和别人要求都高。桃花位置佳，缘分深厚。',
  '戌': '配偶宫在戌（燥土），属于"四墓库"之一。另一半忠诚可靠、有责任心，但有时候比较闷。婚姻基础稳固，适合细水长流的感情。',
  '亥': '配偶宫在亥（水），属于"四长生"之一。另一半为人随和、人缘好，可能比较有福气。感情中两个人相处比较和谐自然。'
};

// ========== 日柱婚姻特性（基于日干五行+阴阳）==========
var DAY_MASTER_MARRIAGE = {
  '甲': '甲木日主的人，性格像大树一样正直坦荡。在感情中比较主动，喜欢有主见的另一半。对待婚姻认真负责，但有时候可能显得不够浪漫，需要多一些甜言蜜语。',
  '乙': '乙木日主的人，性格像花草一样柔韧温和。在感情中比较被动，容易被对方打动。感情细腻、懂得体贴，但有时候过于依赖对方，需要保持一定的独立性。',
  '丙': '丙火日主的人，像太阳一样热情大方。在感情中敢爱敢恨，一旦认定对方就会全力以赴。但性子比较急，感情进度可能太快，需要多一些耐心让感情自然发展。',
  '丁': '丁火日主的人，像烛火一样温暖细腻。在感情中很注重感觉和细节，追求心灵的契合。但有时候过于敏感多疑，容易患得患失，需要学会信任和放松。',
  '戊': '戊土日主的人，像高山一样稳重可靠。在感情中比较慢热但非常专一，一旦认定就不轻易改变。但有时候表达感情的方式太含蓄，对方可能感受不到你的在意。',
  '己': '己土日主的人，像田园一样包容温和。在感情中乐于付出、善于照顾对方，是典型的"暖男暖女"。但有时候太为对方着想，容易委屈了自己。',
  '庚': '庚金日主的人，像刀剑一样干脆利落。在感情中不喜欢拖泥带水，爱憎分明。对待婚姻有原则、有底线。但有时候说话太直白，容易伤害对方的感受。',
  '辛': '辛金日主的人，像珠宝一样精致优雅。在感情中追求品质和格调，对另一半的要求比较高。宁缺毋滥，但一旦遇到对的人，感情会很专注和深刻。',
  '壬': '壬水日主的人，像江河一样奔放自由。在感情中浪漫多情、善于制造惊喜，桃花运通常比较旺。但有时候定不下来，需要在合适的时候收心安定。',
  '癸': '癸水日主的人，像溪水一样细腻深沉。在感情中内心世界丰富、直觉敏锐，能感知对方最细微的情绪变化。但有时候把心事藏得太深，需要学会表达。'
};

// 日柱地支对婚姻的影响补充
var DAY_BRANCH_MARRIAGE = {
  '子': '日支为子，配偶宫是桃花位。婚姻中感情比较浪漫甜蜜，但子午相冲，遇到午年要多注意沟通。',
  '丑': '日支为丑，配偶宫稳重含蓄。婚姻基础扎实，丑未相冲，遇到未年要注意一些小摩擦。',
  '寅': '日支为寅，配偶宫生气勃勃。婚姻中有活力有新鲜感，寅申相冲，遇到申年要多包容。',
  '卯': '日支为卯，配偶宫是桃花位。异性缘很旺，但卯酉相冲，遇到酉年要注意感情波动。',
  '辰': '日支为辰，配偶宫宽厚包容。婚姻中两人相处比较和谐，辰戌相冲，遇到戌年稍加注意。',
  '巳': '日支为巳，配偶宫热情主动。婚姻有激情，但巳亥相冲，遇到亥年需要多一些耐心。',
  '午': '日支为午，配偶宫明朗大方。婚姻中另一半比较出彩，午子相冲，遇到子年多沟通。',
  '未': '日支为未，配偶宫温和体贴。婚姻中家庭氛围很好，未丑相冲，遇到丑年多理解对方。',
  '申': '日支为申，配偶宫聪明独立。婚姻中两人各有空间，申寅相冲，遇到寅年注意协调。',
  '酉': '日支为酉，配偶宫是桃花位。婚姻质量不错，但酉卯相冲，遇到卯年要小心第三者干扰。',
  '戌': '日支为戌，配偶宫忠诚可靠。婚姻关系稳定持久，戌辰相冲，遇到辰年注意小矛盾。',
  '亥': '日支为亥，配偶宫随和自在。婚姻生活比较轻松，亥巳相冲，遇到巳年需要多一些关心。'
};

// ========== 神煞计算函数 ==========

/**
 * calculateShenShaForPillar() — 计算某一柱包含的神煞
 * 根据天干、地支、以及日干的十神关系来判断
 *
 * @param {string} gan - 该柱的天干（如"甲"）
 * @param {string} zhi - 该柱的地支（如"子"）
 * @param {string} dayGan - 日干（如"丙"），用于计算禄神和羊刃
 * @returns {object} { good: [...吉祥神煞], bad: [...凶煞神煞] }
 */
function calculateShenShaForPillar(gan, zhi, dayGan) {
  var goodStars = []; // 吉星列表
  var badStars = [];  // 凶星列表

  // 1. 天乙贵人（最大的贵人星）—— 用天干查
  if (TIAN_YI_MAP[gan]) {
    var tianYiZhi = TIAN_YI_MAP[gan];
    for (var i = 0; i < tianYiZhi.length; i++) {
      if (zhi === tianYiZhi[i]) {
        goodStars.push('天乙贵人');
      }
    }
  }

  // 2. 文昌星（学业文运）—— 用天干查
  if (WEN_CHANG_MAP[gan] === zhi) {
    goodStars.push('文昌星');
  }

  // 3. 桃花（姻缘人缘）—— 用地支查
  if (TAO_HUA_MAP[zhi]) {
    // 桃花标志是找出桃花所在的地支
    // 这里的逻辑是：如果当前地支等于从TAO_HUA_MAP查出的桃花地支，说明桃花落在本柱
    // 举例：年支为"申"，桃花在"酉"，那么时支为"酉"就是桃花
    // 我们换一种方式：遍历四柱地支，看看哪个柱的地支等于桃花地支
    // 这个在calculateShenSha总的函数里处理
  }
  // 实际上桃花逻辑后面会在calculateShenSha总和函数中统一处理

  // 4. 华盖（艺术才华）—— 用地支查
  if (HUA_GAI_MAP[zhi]) {
    // 判断当前柱的地支是否命中 — 后面统一处理
  }

  // 5. 将星 —— 用地支查
  if (JIANG_XING_MAP[zhi]) {
    // 后面统一处理
  }

  // 6. 禄神（福禄）—— 天干查，日干对应的禄是什么地支
  if (LU_SHEN_MAP[dayGan] === zhi) {
    goodStars.push('禄神');
  }

  // 7. 羊刃 —— 天干查
  if (YANG_REN_MAP[dayGan] === zhi) {
    badStars.push('羊刃');
  }

  return { good: goodStars, bad: badStars };
}

/**
 * calculateShenSha() — 计算八字各柱的神煞总览
 * 遍历年柱和日柱的地支来计算全局神煞（桃花、华盖、将星、驿马）
 *
 * @param {object} result - 八字计算结果
 * @returns {object} 各柱神煞和全局神煞
 */
function calculateShenSha(result) {
  var pillars = {
    '年': { gan: result.yearPillar[0], zhi: result.yearPillar[1] },
    '月': { gan: result.monthPillar[0], zhi: result.monthPillar[1] },
    '日': { gan: result.dayPillar[0], zhi: result.dayPillar[1] },
    '时': { gan: result.timePillar[0], zhi: result.timePillar[1] }
  };

  var dayGan = result.dayPillar[0];

  // 为每柱计算基础神煞（基于天干+日干的）
  var pillarShenSha = {};
  var pillarNames = ['年', '月', '日', '时'];
  for (var i = 0; i < pillarNames.length; i++) {
    var pn = pillarNames[i];
    pillarShenSha[pn] = calculateShenShaForPillar(pillars[pn].gan, pillars[pn].zhi, dayGan);
  }

  // 基于年支查找桃花、驿马、华盖、将星（这些用三合局地支判断）
  var yearZhi = result.yearPillar[1];
  if (TAO_HUA_MAP[yearZhi]) {
    var taoHuaZhi = TAO_HUA_MAP[yearZhi];
    // 看这个桃花地支落在哪个柱
    for (var i = 0; i < pillarNames.length; i++) {
      var pn = pillarNames[i];
      if (pillars[pn].zhi === taoHuaZhi) {
        pillarShenSha[pn].good.push('桃花');
      }
    }
  }

  if (YI_MA_MAP[yearZhi]) {
    var yiMaZhi = YI_MA_MAP[yearZhi];
    for (var i = 0; i < pillarNames.length; i++) {
      var pn = pillarNames[i];
      if (pillars[pn].zhi === yiMaZhi) {
        pillarShenSha[pn].good.push('驿马');
      }
    }
  }

  if (HUA_GAI_MAP[yearZhi]) {
    var huaGaiZhi = HUA_GAI_MAP[yearZhi];
    for (var i = 0; i < pillarNames.length; i++) {
      var pn = pillarNames[i];
      if (pillars[pn].zhi === huaGaiZhi) {
        pillarShenSha[pn].good.push('华盖');
      }
    }
  }

  if (JIANG_XING_MAP[yearZhi]) {
    var jiangXingZhi = JIANG_XING_MAP[yearZhi];
    for (var i = 0; i < pillarNames.length; i++) {
      var pn = pillarNames[i];
      if (pillars[pn].zhi === jiangXingZhi) {
        pillarShenSha[pn].good.push('将星');
      }
    }
  }

  // 红鸾（正桃花、姻缘星）—— 基于年支查找
  if (HONG_LUAN_MAP[yearZhi]) {
    var hongLuanZhi = HONG_LUAN_MAP[yearZhi];
    for (var i = 0; i < pillarNames.length; i++) {
      var pn = pillarNames[i];
      if (pillars[pn].zhi === hongLuanZhi) {
        pillarShenSha[pn].good.push('红鸾');
      }
    }
  }

  // 天喜（喜事星、红鸾的对冲位）—— 基于年支查找
  if (TIAN_XI_MAP[yearZhi]) {
    var tianXiZhi = TIAN_XI_MAP[yearZhi];
    for (var i = 0; i < pillarNames.length; i++) {
      var pn = pillarNames[i];
      if (pillars[pn].zhi === tianXiZhi) {
        pillarShenSha[pn].good.push('天喜');
      }
    }
  }

  return {
    pillars: pillarShenSha,              // 各柱神煞
    goodStars: getUniqueShenSha(pillarShenSha, 'good'),  // 去重后所有吉星
    badStars: getUniqueShenSha(pillarShenSha, 'bad')     // 去重后所有凶星
  };
}

/**
 * getUniqueShenSha() — 从各柱神煞中提取去重后的星种列表
 */
function getUniqueShenSha(pillarShenSha, type) {
  var all = [];
  var pillarNames = ['年', '月', '日', '时'];
  for (var i = 0; i < pillarNames.length; i++) {
    var stars = pillarShenSha[pillarNames[i]][type];
    for (var j = 0; j < stars.length; j++) {
      if (all.indexOf(stars[j]) === -1) {
        all.push(stars[j]);
      }
    }
  }
  return all;
}

// ========== 大运流年十神解读增强 ==========

/**
 * getShiShenFromGan() — 根据日干和大运/流年的天干推算十神名称
 *
 * @param {string} dayGan - 日干（命主自己）
 * @param {string} targetGan - 要判断的天干（大运或流年的天干）
 * @returns {string} 十神名称
 */
function getShiShenFromGan(dayGan, targetGan) {
  // 十神对照表（以日干为基准）
  var SHI_SHEN_TABLE = {
    '甲': { '甲': '比肩', '乙': '劫财', '丙': '食神', '丁': '伤官', '戊': '偏财', '己': '正财', '庚': '七杀', '辛': '正官', '壬': '偏印', '癸': '正印' },
    '乙': { '甲': '劫财', '乙': '比肩', '丙': '伤官', '丁': '食神', '戊': '正财', '己': '偏财', '庚': '正官', '辛': '七杀', '壬': '正印', '癸': '偏印' },
    '丙': { '甲': '偏印', '乙': '正印', '丙': '比肩', '丁': '劫财', '戊': '食神', '己': '伤官', '庚': '偏财', '辛': '正财', '壬': '七杀', '癸': '正官' },
    '丁': { '甲': '正印', '乙': '偏印', '丙': '劫财', '丁': '比肩', '戊': '伤官', '己': '食神', '庚': '正财', '辛': '偏财', '壬': '正官', '癸': '七杀' },
    '戊': { '甲': '七杀', '乙': '正官', '丙': '偏印', '丁': '正印', '戊': '比肩', '己': '劫财', '庚': '食神', '辛': '伤官', '壬': '偏财', '癸': '正财' },
    '己': { '甲': '正官', '乙': '七杀', '丙': '正印', '丁': '偏印', '戊': '劫财', '己': '比肩', '庚': '伤官', '辛': '食神', '壬': '正财', '癸': '偏财' },
    '庚': { '甲': '偏财', '乙': '正财', '丙': '七杀', '丁': '正官', '戊': '偏印', '己': '正印', '庚': '比肩', '辛': '劫财', '壬': '食神', '癸': '伤官' },
    '辛': { '甲': '正财', '乙': '偏财', '丙': '正官', '丁': '七杀', '戊': '正印', '己': '偏印', '庚': '劫财', '辛': '比肩', '壬': '伤官', '癸': '食神' },
    '壬': { '甲': '食神', '乙': '伤官', '丙': '偏财', '丁': '正财', '戊': '七杀', '己': '正官', '庚': '偏印', '辛': '正印', '壬': '比肩', '癸': '劫财' },
    '癸': { '甲': '伤官', '乙': '食神', '丙': '正财', '丁': '偏财', '戊': '正官', '己': '七杀', '庚': '正印', '辛': '偏印', '壬': '劫财', '癸': '比肩' }
  };
  return SHI_SHEN_TABLE[dayGan] && SHI_SHEN_TABLE[dayGan][targetGan] ? SHI_SHEN_TABLE[dayGan][targetGan] : '';
}

/**
 * getShiShenDescription() — 用白话解释各个十神的含义
 */
function getShiShenDescription(shiShen) {
  var desc = {
    '正官': '代表规矩、权威、上级、法律。正官运时适合考公务员、晋升、遵守纪律做好分内事。',
    '七杀': '代表压力、挑战、竞争、小人。但也有进取和突破的一面，压力大时越是锻炼能力的时候。',
    '正印': '代表学习、贵人、长辈帮助、安稳。正印运时适合读书深造、考证书、寻求贵人支持。',
    '偏印': '代表独特思维、偏门学问、创意灵感。偏印运时适合研究非主流领域、发挥创意才能。',
    '比肩': '代表朋友、同事、兄弟姐妹般的助力。比肩运时人脉变广，容易获得同伴支持。',
    '劫财': '代表竞争、分财、人际关系中的摩擦。劫财运时要注意理财和人际关系的分寸。',
    '食神': '代表享受、口福、才华发挥、创造力。食神运时心情愉悦，适合发挥才艺、享受生活。',
    '伤官': '代表叛逆、突破传统、口才发挥。伤官运时创意灵感多，但说话做事要收敛锋芒。',
    '正财': '代表稳定的工资收入、正当的财富。正财运时适合踏实工作、积攒储蓄、理性理财。',
    '偏财': '代表意外之财、投资收入、副业。偏财运时适合投资理财、开拓新的收入渠道。'
  };
  return desc[shiShen] || '';
}

/**
 * enhanceCurrentReading() — 增强版大运流年解读
 * 不仅显示干支，还分析十神组合，给出白话建议
 */
function enhanceCurrentReading(result) {
  var cr = result.currentReading;
  if (!cr.found) return cr;

  var dayGan = result.dayPillar[0];

  // 提取大运天干
  var daYunGan = cr.daYunGanZhi[0];
  var lintnianGan = cr.liuNianGanZhi[0];

  // 计算大运和流年的天干十神
  var daYunShiShen = getShiShenFromGan(dayGan, daYunGan);
  var liuNianShiShen = getShiShenFromGan(dayGan, lintnianGan);

  // 生成白话解读
  var daYunDesc = getShiShenDescription(daYunShiShen);
  var liuNianDesc = getShiShenDescription(liuNianShiShen);

  // 十神组合解读表：大运十神 + 流年十神 的经典组合含义
  // 这是"综合解读"的核心——把两个十神放在一起看，得出单个十神看不出来的结论
  var COMBINATION_DESC = {
    '食神+正财': '这是「食神生财」的格局——你的才华、技能容易转化为稳定的收入，今年适合踏实做事、把手艺和本事变现。',
    '食神+偏财': '这是「食神生偏财」的格局——创意和才华容易带来额外收入，可以适当尝试副业或投资，但别贪心。',
    '伤官+正财': '这是「伤官生财」的格局——靠才华、创意、技术赚钱的好时机，自由职业或技能变现会比较顺。',
    '伤官+偏财': '这是「伤官生偏财」的格局——才华外露、点子多，容易有意外财路，但注意别太冒险。',
    '伤官+正官': '这是「伤官见官」的组合，传统上比较敏感——今年可能特别想突破规则、表达自我，但要格外注意和上级、权威的沟通方式，别正面冲突。',
    '正官+伤官': '这是「伤官见官」的组合（流年伤官冲撞大运正官），今年做事容易冲动顶撞上级，切记冷静、守规矩。',
    '正官+正印': '这是「官印相生」的格局——事业和学业双丰收，容易得到贵人、上级的赏识和扶持，是求稳、考证、晋升的好时机。',
    '七杀+正印': '这是「杀印相生」的格局——压力会转化为动力和成就，今年虽然辛苦，但正是成长突破、脱颖而出的好时机。',
    '七杀+食神': '这是「食神制杀」的格局——你能把压力、竞争转化为机遇，化险为夷，凭实力化解危机。',
    '比肩+正财': '这是「比肩夺财」的提醒——今年注意合伙、借钱、理财上的风险，容易因朋友或合作破财，钱袋子要看紧。',
    '劫财+正财': '这是「劫财夺财」的提醒——破财风险较高，投资和消费都要谨慎，尽量避免借贷和冲动消费。',
    '正财+正官': '这是「财生官」的格局——财富能为你带来地位和认可，稳中求进，今年容易名利双收。',
    '正财+七杀': '这是「财生杀」的组合——收入可能增加，但压力也随之而来，注意别为了赚钱透支健康。',
    '正印+正官': '这是「印官相生」的格局——学习、考证、寻求贵人支持的好时机，适合进修和提升自己。'
  };

  // 综合解读（聚焦十神组合的交叉含义；十神基础解释在下方「大运背景」「今年重点」单独展示，避免重复）
  var combinedDesc = '';
  if (daYunShiShen && liuNianShiShen) {
    var comboKey = daYunShiShen + '+' + liuNianShiShen;
    combinedDesc = '当前大运「' + cr.daYunGanZhi + '」为' + daYunShiShen + '运，今年流年「' + cr.liuNianGanZhi + '」为' + liuNianShiShen + '年。';
    if (COMBINATION_DESC[comboKey]) {
      combinedDesc += COMBINATION_DESC[comboKey];
    } else {
      combinedDesc += '两者叠加，大方向以' + daYunShiShen + '运为背景，具体把握' + liuNianShiShen + '年的机会，顺应大运、把握流年。';
    }

    // 流年特殊提醒
    if (liuNianShiShen === '偏财') {
      combinedDesc += ' 偏财年会有一些意外之财或投资机会，但也要注意风险控制，不要贪心。';
    }
    if (liuNianShiShen === '七杀') {
      combinedDesc += ' 七杀年压力比较大，但也意味着成长的机会，迎接挑战会让你变得更强大。';
    }
  }

  cr.daYunShiShen = daYunShiShen;
  cr.liuNianShiShen = liuNianShiShen;
  cr.daYunDesc = daYunDesc;
  cr.liuNianDesc = liuNianDesc;
  cr.combinedDesc = combinedDesc;

  return cr;
}

// ========== 排盘表单输入持久化（记住上次输入，刷新后自动填充） ==========

// localStorage 存储排盘输入的键名
var BAZI_FORM_STORAGE = 'bazi_form_input';

/**
 * 保存排盘表单输入（出生日期、时辰、性别）到 localStorage
 */
function saveBaziForm() {
  var dateEl = document.getElementById('birth-date');
  var hourEl = document.getElementById('birth-hour');
  var genderEl = document.querySelector('input[name="gender"]:checked');
  if (!dateEl || !hourEl) return;
  try {
    localStorage.setItem(BAZI_FORM_STORAGE, JSON.stringify({
      birthDate: dateEl.value,
      birthHour: hourEl.value,
      gender: genderEl ? genderEl.value : 'male'
    }));
  } catch (e) {
    // localStorage 不可用时静默失败，不影响排盘
  }
}

/**
 * 从 localStorage 恢复排盘表单输入（页面加载时调用）
 */
function restoreBaziForm() {
  try {
    var raw = localStorage.getItem(BAZI_FORM_STORAGE);
    if (!raw) return;
    var data = JSON.parse(raw);
    if (data.birthDate) {
      var dateEl = document.getElementById('birth-date');
      if (dateEl) dateEl.value = data.birthDate;
    }
    if (data.birthHour !== undefined && data.birthHour !== null) {
      var hourEl = document.getElementById('birth-hour');
      if (hourEl) hourEl.value = data.birthHour;
    }
    if (data.gender) {
      var radio = document.querySelector('input[name="gender"][value="' + data.gender + '"]');
      if (radio) radio.checked = true;
    }
  } catch (e) {
    // 解析失败则忽略，用默认值
  }
}

// 页面加载时恢复上次的排盘输入
document.addEventListener('DOMContentLoaded', function () {
  restoreBaziForm();
});

// ========== 核心计算函数：用户点击排盘按钮后调用 ==========

/**
 * calculateBazi() — 八字排盘主函数
 * 从表单读取用户输入 → 调用 lunar-javascript 计算 → 渲染结果到页面
 * 这是整个八字模块的入口，由 index.html 中的按钮 onclick 触发
 */
function calculateBazi() {
  // 显示加载状态
  var btnCalc = document.getElementById('btn-calc');
  var resultContainer = document.getElementById('bazi-result');
  btnCalc.disabled = true;
  btnCalc.innerHTML = '<span class="loading-spinner inline-block align-middle mr-2" style="width:20px;height:20px;border-width:3px;"></span> 计算中...';
  resultContainer.innerHTML = '<div class="loading-overlay"><div class="loading-spinner mx-auto mb-4"></div><p class="text-gray-500">正在排八字盘，请稍候...</p></div>';
  resultContainer.classList.remove('hidden');
  resultContainer.scrollIntoView({ behavior: 'smooth' });

  // 用 setTimeout 把计算放入异步队列，让浏览器先渲染加载动画
  setTimeout(function () {
  // 第1步：读取表单数据
  var dateInput = document.getElementById('birth-date').value; // 日期选择器的值，格式 "2000-01-01"
  var hourSelect = document.getElementById('birth-hour');       // 时辰下拉框
  var hourIndex = parseInt(hourSelect.value);                   // 时辰索引 0=子时, 1=丑时...11=亥时

  // 获取性别（radio按钮）
  var genderInputs = document.getElementsByName('gender');
  var gender = 1; // 默认男
  for (var i = 0; i < genderInputs.length; i++) {
    if (genderInputs[i].checked) {
      gender = genderInputs[i].value === 'male' ? 1 : 0; // 1=男, 0=女
    }
  }

  // 保存本次输入，下次打开自动填充
  saveBaziForm();

  // 验证日期是否填写
  if (!dateInput) {
    alert('请先选择出生日期！');
    return;
  }

  // 第2步：解析日期
  var dateParts = dateInput.split('-');
  var year = parseInt(dateParts[0]);
  var month = parseInt(dateParts[1]);
  var day = parseInt(dateParts[2]);

  // 第3步：把时辰索引转换为对应的小时（取中间值）
  // 时辰对照：子时0点、丑时2点、寅时4点...每个时辰2小时
  var hour = hourIndex * 2;

  // 第4步：用 lunar-javascript 库创建阳历对象，然后获取农历和八字
  // Solar.fromYmdHms(年, 月, 日, 时, 分, 秒)
  var solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
  var lunar = solar.getLunar();           // 转为农历对象
  var eightChar = lunar.getEightChar();   // 获取八字对象（核心！）

  // 第5步：获取大运信息
  // getYun(性别, 流派) — 性别: 1=男 0=女, 流派: 1=按天数和分钟数
  var yun = eightChar.getYun(gender, 1);

  // 第6步：收集所有计算结果
  var result = {
    // 基础信息
    solarDate: solar.toYmd(),              // 公历日期
    lunarDate: lunar.toFullString(),       // 农历完整字符串

    // 四柱（每柱是"天干+地支"，如"甲子"）
    yearPillar: eightChar.getYear(),       // 年柱
    monthPillar: eightChar.getMonth(),     // 月柱
    dayPillar: eightChar.getDay(),         // 日柱
    timePillar: eightChar.getTime(),       // 时柱

    // 藏干（每柱地支里藏的天干）
    yearHideGan: eightChar.getYearHideGan() + '',
    monthHideGan: eightChar.getMonthHideGan() + '',
    dayHideGan: eightChar.getDayHideGan() + '',
    timeHideGan: eightChar.getTimeHideGan() + '',

    // 纳音（每柱的纳音五行名称）
    yearNaYin: eightChar.getYearNaYin(),
    monthNaYin: eightChar.getMonthNaYin(),
    dayNaYin: eightChar.getDayNaYin(),
    timeNaYin: eightChar.getTimeNaYin(),

    // 十神（天干十神和地支十神）
    yearShiShenGan: eightChar.getYearShiShenGan(),
    monthShiShenGan: eightChar.getMonthShiShenGan(),
    dayShiShenGan: eightChar.getDayShiShenGan(), // 日干显示"日主"
    timeShiShenGan: eightChar.getTimeShiShenGan(),

    yearShiShenZhi: eightChar.getYearShiShenZhi() + '',
    monthShiShenZhi: eightChar.getMonthShiShenZhi() + '',
    dayShiShenZhi: eightChar.getDayShiShenZhi() + '',
    timeShiShenZhi: eightChar.getTimeShiShenZhi() + '',

    // 地势（十二长生状态，如"临官""长生""死""墓"）
    yearDiShi: eightChar.getYearDiShi(),
    monthDiShi: eightChar.getMonthDiShi(),
    dayDiShi: eightChar.getDayDiShi(),
    timeDiShi: eightChar.getTimeDiShi(),

    // 五行统计（每柱返回"天干五行+地支五行"两个字符，如"木水"）
    yearWuXing: eightChar.getYearWuXing(),
    monthWuXing: eightChar.getMonthWuXing(),
    dayWuXing: eightChar.getDayWuXing(),
    timeWuXing: eightChar.getTimeWuXing(),

    // 命宫、胎元、身宫
    mingGong: eightChar.getMingGong(),
    taiYuan: eightChar.getTaiYuan(),
    shenGong: eightChar.getShenGong(),

    // 大运信息
    yunStartYear: yun.getStartYear(),     // 起运年龄（几岁开始走大运）
    yunStartMonth: yun.getStartMonth(),   // 起运月数
    yunStartDay: yun.getStartDay(),       // 起运天数
    yunStartDate: yun.getStartSolar().toYmd(), // 起运日期
    daYunList: []                          // 大运列表（下面填充）
  };

  // 第7步：遍历大运列表，提取每步大运的关键信息
  var daYunArr = yun.getDaYun();
  for (var i = 0; i < daYunArr.length; i++) {
    var dy = daYunArr[i];
    result.daYunList.push({
      startAge: dy.getStartAge(),         // 起始年龄
      endAge: dy.getEndAge(),             // 结束年龄
      startYear: dy.getStartYear(),       // 起始年份
      endYear: dy.getEndYear(),           // 结束年份
      ganZhi: dy.getGanZhi(),             // 大运干支（如"甲子"）
      liuNian: []                          // 该大运下的流年列表
    });

    // 第8步：提取每个大运下的流年信息
    var liuNianArr = dy.getLiuNian();
    for (var j = 0; j < liuNianArr.length; j++) {
      var ln = liuNianArr[j];
      result.daYunList[i].liuNian.push({
        year: ln.getYear(),               // 流年公历年份
        age: ln.getAge(),                 // 该流年时命主的年龄
        ganZhi: ln.getGanZhi()            // 流年干支
      });
    }
  }

  // 第9步：计算五行统计（把四柱的五行字符拆分，统计各五行出现次数）
  result.wuxingCount = countWuXing(result);

  // 第10步：用神分析（判断日主旺衰，找出喜神和忌神）
  result.yongShen = analyzeYongShen(result, gender);

  // 第11步：性格分析
  result.personality = analyzePersonality(result);

  // 第12步：当前大运和流年解读
  result.currentReading = getCurrentReading(result);

  // 第13步：空亡（旬空）—— 每柱地支中落空的
  result.yearXunKong = eightChar.getYearXunKong();
  result.monthXunKong = eightChar.getMonthXunKong();
  result.dayXunKong = eightChar.getDayXunKong();
  result.timeXunKong = eightChar.getTimeXunKong();

  // 第14步：神煞计算
  result.shenSha = calculateShenSha(result);

  // 第15步：增强大运流年解读（十神组合白话解析）
  result.currentReading = enhanceCurrentReading(result);

  // 第16步：用神实用建议
  result.yongShenGuide = buildYongShenGuide(result.yongShen);

  // 第17步：婚姻感情分析
  result.marriage = analyzeMarriage(result, gender);

  // 第18步：财运分析
  result.wealth = analyzeWealth(result);

  // 第19步：健康分析
  result.health = analyzeHealth(result);

  // 第20步：渲染所有结果到页面上
  renderBaziResult(result);

  // 生成一个新的会话 ID，用于把本次排盘和后续 AI 问答关联到同一会话
  currentSessionId = Date.now() + '-' + Math.floor(Math.random() * 100000);

  // 上报查询记录到后端（后端没启动则静默失败，不影响使用）
  var hourNames = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
  reportRecord({
    type: 'bazi',
    sessionId: currentSessionId,
    birthDate: dateInput,
    birthHourLabel: hourNames[hourIndex] || '',
    genderLabel: gender === 1 ? '男' : '女',
    pillars: result.yearPillar + ' ' + result.monthPillar + ' ' + result.dayPillar + ' ' + result.timePillar,
    wuxing: '金' + (result.wuxingCount['金'] || 0) + ' 木' + (result.wuxingCount['木'] || 0) + ' 水' + (result.wuxingCount['水'] || 0) + ' 火' + (result.wuxingCount['火'] || 0) + ' 土' + (result.wuxingCount['土'] || 0)
  });

  // 恢复按钮状态
  btnCalc.disabled = false;
  btnCalc.innerHTML = '🔮 开始排盘';
  }, 50); // 50毫秒延迟，让浏览器有时间渲染加载动画
} // calculateBazi 函数结束

// ========== 五行统计 ==========

/**
 * countWuXing() — 统计八字中每个五行出现的次数
 * 把四柱的五行字符（如"木水""火木""金土""水火"）拆成8个单字，归类统计
 *
 * @param {object} result - 计算结果对象
 * @returns {object} { 金: count, 木: count, 水: count, 火: count, 土: count }
 */
function countWuXing(result) {
  // 收集所有五行字符：每柱两个字符，四柱共8个字符
  var allWuXing = result.yearWuXing + result.monthWuXing + result.dayWuXing + result.timeWuXing;

  // 初始化计数器
  var count = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };

  // 遍历每个字符，归类计数
  for (var i = 0; i < allWuXing.length; i++) {
    var wx = allWuXing[i];
    if (count[wx] !== undefined) {
      count[wx]++;
    }
  }

  return count;
}

// ========== 用神分析 ==========

/**
 * analyzeYongShen() — 分析日主的用神（对日主最有利的五行）和忌神（对日主不利的五行）
 *
 * 原理简述（大白话版）：
 * 1. 先看日主（日干）是什么五行，在八字里是强还是弱
 * 2. 太强了就要压制一下 → 用神是克它、泄它的五行
 * 3. 太弱了就要帮一把 → 用神是生它、扶它的五行
 * 4. 这就像一个人：太强势了需要收敛，太弱小了需要帮助
 *
 * @param {object} result - 计算结果
 * @param {number} gender - 性别（1=男, 0=女）
 * @returns {object} 用神分析结果
 */
function analyzeYongShen(result, gender) {
  var dayStem = result.dayPillar[0];  // 日干（日柱的第一个字就是天干）

  // 找到日干对应的五行
  var stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var dayStemIndex = stems.indexOf(dayStem);
  var dayElement = ELEMENT_NAMES[STEM_ELEMENT[dayStemIndex]]; // 日主五行

  // 统计日主五行在八字中出现的次数（从五行统计结果里取）
  var selfCount = result.wuxingCount[dayElement] || 0;

  // 统计生我者的数量（印星：生我者为印）
  // 五行相生：木生火、火生土、土生金、金生水、水生木
  var shengMap = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  var shengCount = result.wuxingCount[shengMap[dayElement]] || 0;

  // 统计克我者的数量（官杀：克我者为官杀）
  var keMap = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
  var keCount = result.wuxingCount[keMap[dayElement]] || 0;

  // 简单判断日主旺衰：自身+生我 > 克我 → 偏强，否则偏弱
  var isStrong = (selfCount + shengCount) > (keCount + 2);

  // 根据旺衰决定用神
  var yongShen = [];     // 喜用神（有利的五行）
  var jiShen = [];       // 忌神（不利的五行）

  if (isStrong) {
    // 日主偏强 → 需要克、泄、耗
    // 克我(官杀)、我生(食伤)、我克(财)
    yongShen.push(keMap[dayElement]); // 官杀：克我的
    // 我生：食伤
    var woShengMap = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    yongShen.push(woShengMap[dayElement]); // 食伤：我生的
    // 我克：财
    var woKeMap = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
    yongShen.push(woKeMap[dayElement]); // 财：我克的

    jiShen.push(dayElement);           // 比劫（同我的）→ 忌
    jiShen.push(shengMap[dayElement]); // 印星（生我的）→ 忌
  } else {
    // 日主偏弱 → 需要生、扶
    yongShen.push(dayElement);           // 比劫（同我的）→ 喜
    yongShen.push(shengMap[dayElement]); // 印星（生我的）→ 喜

    jiShen.push(keMap[dayElement]); // 官杀（克我的）→ 忌
    var woShengMap = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    jiShen.push(woShengMap[dayElement]); // 食伤（我生的）→ 忌
  }

  // 去重
  yongShen = uniqueArray(yongShen);
  jiShen = uniqueArray(jiShen);

  return {
    dayElement: dayElement,         // 日主五行
    strength: isStrong ? '偏强' : '偏弱',
    strengthDesc: isStrong
      ? '日主五行"' + dayElement + '"在八字中力量较强，属于"身强"格局。就像一个精力充沛的人，需要适当的克制和疏导，才能把能量用在正确的地方。'
      : '日主五行"' + dayElement + '"在八字中力量较弱，属于"身弱"格局。就像一棵小树苗，需要浇水（生扶）和阳光（帮助）才能茁壮成长。',
    yongShen: yongShen,             // 喜用神列表
    jiShen: jiShen,                 // 忌神列表
    yongShenDesc: '对你最有帮助的五行是「' + yongShen.join('、') + '」。适合往这些五行对应的方向发展（如职业、颜色、方位等）。',
    jiShenDesc: '需要避开的五行是「' + jiShen.join('、') + '」。这些五行对应的方向可能不太适合你。'
  };
}

// ========== 性格分析 ==========

/**
 * analyzePersonality() — 基于日主五行和旺衰分析性格特征
 *
 * @param {object} result - 计算结果
 * @returns {object} 性格分析结果
 */
function analyzePersonality(result) {
  var stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var dayStem = result.dayPillar[0]; // 日干
  var dayStemIndex = stems.indexOf(dayStem);
  var isYang = STEM_YIN_YANG[dayStemIndex]; // 日干是阳还是阴
  var dayElement = result.yongShen.dayElement; // 日主五行
  var strength = result.yongShen.strength;     // 日主旺衰

  // 不同日干五行的基础性格描述
  var elementTraits = {
    '木': isYang
      ? '像一棵参天大树，正直、有上进心、目标感强。性格坚韧，认定的事情会坚持到底。但有时可能太固执，不太会转弯。'
      : '像花草藤蔓一样柔韧，性格温和、心思细腻、善于变通。适应能力很强，但有时候可能太容易受别人影响。',
    '火': isYang
      ? '像太阳一样热情奔放，开朗大方、非常有活力。待人真诚直率，走到哪里都是焦点。但情绪来得快去得快，需要学会耐心。'
      : '像烛火一样温暖，内心柔软、善解人意。虽然不像太阳那么耀眼，但有自己独特的光芒。有时可能过于敏感。',
    '土': isYang
      ? '像高山一样稳重可靠，诚信踏实、说到做到。是朋友眼中的"靠谱担当"。但有时候思维比较传统，不太喜欢改变。'
      : '像田园一样包容温和，性格随和、善于照顾别人。非常有耐心和包容心。但有时候优柔寡断，不太会拒绝别人。',
    '金': isYang
      ? '像刀剑一样锋利果断，讲义气、有原则、敢作敢为。做事干净利落不拖泥带水。但有时可能说话太直，容易得罪人。'
      : '像珠宝首饰一样精致，追求完美、品味好、注重细节。对自己的要求很高。但有时可能对自己和别人都太苛刻了。',
    '水': isYang
      ? '像江河一样奔腾不息，聪明灵活、足智多谋。善于交际，朋友遍天下。但有时候心思太多，容易想太多。'
      : '像溪水一样润物无声，性格沉静、低调务实。内心世界非常丰富，非常有洞察力。但有时可能把心事藏得太深。'
  };

  var basePersonality = elementTraits[dayElement] || '性格温和，为人正直。';

  return {
    dayElement: dayElement,
    strength: strength,
    summary: basePersonality,
    strengthNote: strength === '偏强'
      ? '总体来说，你的个性比较鲜明、有主见，不易被人左右。适当保持谦逊会让你走得更远。'
      : '总体来说，你性格比较温和包容，善于为他人着想。在关键时刻多一分果断会让你更有力量。'
  };
}

// ========== 当前大运和流年解读 ==========

/**
 * getCurrentReading() — 获取命主当前所处的大运和今年的流年信息
 * 从大运列表中找出当前年份对应的大运和流年，给出简单解读
 *
 * @param {object} result - 计算结果
 * @returns {object} 当前大运和流年解读
 */
function getCurrentReading(result) {
  var currentYear = new Date().getFullYear(); // 当前年份
  var currentDaYun = null;
  var currentLiuNian = null;

  // 遍历大运列表，找出包含当前年份的大运
  for (var i = 0; i < result.daYunList.length; i++) {
    var dy = result.daYunList[i];
    if (currentYear >= dy.startYear && currentYear <= dy.endYear) {
      currentDaYun = dy;

      // 在当前大运的流年列表中找今年的流年
      for (var j = 0; j < dy.liuNian.length; j++) {
        if (dy.liuNian[j].year === currentYear) {
          currentLiuNian = dy.liuNian[j];
          break;
        }
      }
      break;
    }
  }

  if (!currentDaYun) {
    return { found: false };
  }

  return {
    found: true,
    currentYear: currentYear,
    daYunGanZhi: currentDaYun.ganZhi,    // 当前大运干支
    daYunAge: currentDaYun.startAge + '~' + currentDaYun.endAge + '岁',
    liuNianGanZhi: currentLiuNian ? currentLiuNian.ganZhi : '未知', // 今年流年干支
    liuNianAge: currentLiuNian ? currentLiuNian.age : '未知'
  };
}

// ========== 数组工具函数 ==========

/**
 * uniqueArray() — 数组去重
 */
function uniqueArray(arr) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    if (result.indexOf(arr[i]) === -1) {
      result.push(arr[i]);
    }
  }
  return result;
}

/**
 * buildYongShenGuide() — 根据用神分析结果，生成实用建议
 * 告诉用户喜用五行对应的颜色、方位、行业等
 *
 * @param {object} yongShen - 用神分析结果（来自 analyzeYongShen()）
 * @returns {object} 包含实用建议的对象
 */
function buildYongShenGuide(yongShen) {
  var guides = [];
  var elements = yongShen.yongShen; // 喜用神五行列表
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    if (YONG_SHEN_GUIDE[el]) {
      guides.push({
        element: el,
        color: YONG_SHEN_GUIDE[el].color,
        direction: YONG_SHEN_GUIDE[el].direction,
        industries: YONG_SHEN_GUIDE[el].industries,
        tips: YONG_SHEN_GUIDE[el].tips
      });
    }
  }
  return guides;
}

/**
 * 判断两个五行之间的生克关系
 * 用于交叉分析：配偶宫与日主、财星与日主、五行之间的连带
 *
 * @param {string} me - 我方五行（如"木"）
 * @param {string} other - 对方五行（如"水"）
 * @returns {string} 关系类型：'生我' / '我生' / '我克' / '克我' / '相同'
 */
function getElementRelation(me, other) {
  if (me === other) return '相同';
  var shengMap = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };   // 我生
  var shengWoMap = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' }; // 生我
  var keMap = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };      // 我克
  var keWoMap = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };    // 克我

  if (shengMap[me] === other) return '我生';
  if (shengWoMap[me] === other) return '生我';
  if (keMap[me] === other) return '我克';
  if (keWoMap[me] === other) return '克我';
  return '相同';
}

/**
 * analyzeMarriage() — 婚姻感情分析
 * 分析配偶宫（日支）、配偶星（基于性别）、婚姻神煞、日柱婚姻特性
 *
 * @param {object} result - 八字计算结果
 * @param {number} gender - 性别（1=男, 0=女）
 * @returns {object} 婚姻分析结果
 */
function analyzeMarriage(result, gender) {
  var dayGan = result.dayPillar[0]; // 日干（我自己）
  var dayZhi = result.dayPillar[1]; // 日支（配偶宫）

  // ===== 1. 配偶宫分析 =====
  var spousePalaceElement = ELEMENT_NAMES[BRANCH_ELEMENT[['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].indexOf(dayZhi)]];
  var spousePalaceDesc = SPOUSE_PALACE_DESC[dayZhi] || '配偶宫一般，需要综合其他因素来看。';
  var spousePalaceShiShen = result.dayShiShenZhi; // 日支藏干的十神

  // ===== 2. 配偶星分析（男女有别）=====
  // 男命：正财为妻星，偏财为偏妻
  // 女命：正官为夫星，七杀为偏夫
  var spouseStarNames = (gender === 1) ? ['正财', '偏财'] : ['正官', '七杀'];
  var spouseStarLabel = (gender === 1) ? '妻星' : '夫星';

  // 收集四柱天干和藏干的十神，找出配偶星在哪
  var pillars = [
    { name: '年柱', gan: result.yearPillar[0], zhi: result.yearPillar[1], shiShenGan: result.yearShiShenGan, hideGan: result.yearHideGan },
    { name: '月柱', gan: result.monthPillar[0], zhi: result.monthPillar[1], shiShenGan: result.monthShiShenGan, hideGan: result.monthHideGan },
    { name: '日柱', gan: result.dayPillar[0], zhi: result.dayPillar[1], shiShenGan: result.dayShiShenGan, hideGan: result.dayHideGan },
    { name: '时柱', gan: result.timePillar[0], zhi: result.timePillar[1], shiShenGan: result.timeShiShenGan, hideGan: result.timeHideGan }
  ];

  var spouseStarPositions = []; // 配偶星出现的位置
  var spouseStarDetails = [];   // 配偶星的详细信息

  for (var i = 0; i < pillars.length; i++) {
    var p = pillars[i];

    // 检查天干十神是否是配偶星
    for (var s = 0; s < spouseStarNames.length; s++) {
      if (p.shiShenGan === spouseStarNames[s]) {
        spouseStarPositions.push(p.name + '天干（' + p.gan + '）');
        spouseStarDetails.push({
          position: p.name,
          location: '天干',
          ganZhi: p.gan,
          starName: spouseStarNames[s],
          isPrimary: (s === 0) // 第一个是主配偶星
        });
      }
    }

    // 检查藏干中是否有配偶星（需要重新计算藏干对应的十神）
    var hideGanStr = String(p.hideGan);
    var hideGanList = hideGanStr.split(',');
    for (var h = 0; h < hideGanList.length; h++) {
      var hg = hideGanList[h].trim();
      if (hg === '' || hg === 'undefined' || hg === 'null') continue;
      var hgShiShen = getShiShenFromGan(dayGan, hg);
      for (var s = 0; s < spouseStarNames.length; s++) {
        if (hgShiShen === spouseStarNames[s] && hg !== dayGan) {
          spouseStarPositions.push(p.name + '藏干（' + hg + '→' + hgShiShen + '）');
          spouseStarDetails.push({
            position: p.name,
            location: '藏干',
            ganZhi: hg,
            starName: spouseStarNames[s],
            isPrimary: (s === 0)
          });
        }
      }
    }
  }

  // 配偶星强弱判断
  var starStrength = '';
  var starStrengthDesc = '';
  if (spouseStarDetails.length === 0) {
    starStrength = '弱';
    starStrengthDesc = '配偶星在四柱中不明显，可能在生活中另一半的特质不那么突出，或者感情来得比较晚。不过这只是参考，不能说明没有好姻缘。';
  } else if (spouseStarDetails.length === 1) {
    starStrength = '中等';
    starStrengthDesc = '配偶星出现了一次，说明命中有明确的姻缘信号。另一半的特质会在生活中自然显现出来。';
  } else if (spouseStarDetails.length === 2) {
    starStrength = '较强';
    starStrengthDesc = '配偶星出现了两次，姻缘信号比较强。感情经历可能比较丰富，另一半对你的影响也比较大。';
  } else {
    starStrength = '很强';
    starStrengthDesc = '配偶星出现了多次，感情在你的人生中占有很重要的位置。姻缘机会比较多，但也需要用心选择最合适的那个人。';
  }

  // ===== 3. 日柱婚姻特性 =====
  var dayMasterMarriage = DAY_MASTER_MARRIAGE[dayGan] || '日主婚姻特征一般，需要结合其他因素综合来看。';
  var dayBranchMarriage = DAY_BRANCH_MARRIAGE[dayZhi] || '';

  // ===== 4. 婚姻相关神煞汇总 =====
  var marriageStars = [];
  // 从神煞结果中提取婚姻相关的
  var allPillarShenSha = result.shenSha.pillars;
  var pillarNames = ['年', '月', '日', '时'];
  for (var i = 0; i < pillarNames.length; i++) {
    var pn = pillarNames[i];
    var stars = allPillarShenSha[pn];
    var allStars = stars.good.concat(stars.bad);
    for (var j = 0; j < allStars.length; j++) {
      if (allStars[j] === '桃花' || allStars[j] === '红鸾' || allStars[j] === '天喜') {
        // 避免重复
        var found = false;
        for (var k = 0; k < marriageStars.length; k++) {
          if (marriageStars[k].name === allStars[j] && marriageStars[k].pillar === pn + '柱') {
            found = true;
            break;
          }
        }
        if (!found) {
          marriageStars.push({ name: allStars[j], pillar: pn + '柱', isGood: stars.good.indexOf(allStars[j]) !== -1 });
        }
      }
    }
  }

  // ===== 5. 综合解读 =====
  var summary = '';
  // 配偶宫解读
  summary += '从配偶宫来看，' + spousePalaceDesc + ' ';

  // 配偶星解读
  if (spouseStarDetails.length > 0) {
    var primaryStars = [];
    for (var i = 0; i < spouseStarDetails.length; i++) {
      if (spouseStarDetails[i].isPrimary) {
        primaryStars.push(spouseStarDetails[i]);
      }
    }
    if (primaryStars.length > 0) {
      summary += '你的' + spouseStarLabel + '（' + spouseStarNames[0] + '）出现在' + primaryStars[0].position + '，';
      if (primaryStars[0].position === '月柱') {
        summary += '说明另一半可能通过工作关系、朋友介绍或社交活动中认识，年龄与你相差不大。';
      } else if (primaryStars[0].position === '年柱') {
        summary += '说明另一半可能来自远方，或者对方年龄比你大一些，也可能通过长辈介绍认识。';
      } else if (primaryStars[0].position === '日柱') {
        summary += '这叫"配偶星坐配偶宫"，是非常好的配置，说明你和另一半缘分深、感情好，婚姻比较美满。';
      } else if (primaryStars[0].position === '时柱') {
        summary += '说明缘分来得比较晚，可能需要一些耐心等待。但晚来的往往更懂得珍惜。';
      }
    } else {
      summary += '你的' + spouseStarLabel + '主要隐藏在藏干中，不算特别明显，但这不代表没有好姻缘，只是需要多一些耐心去寻找。';
    }
  } else {
    summary += '你的' + spouseStarLabel + '在命局中不太明显，姻缘可能来得比较晚，或者另一半的性格特质不那么突出。但这不意味着婚姻不好——很多恩爱夫妻的八字中配偶星也不明显。';
  }

  // 神煞补充
  if (marriageStars.length > 0) {
    summary += ' 另外，你命带';
    var starDescs = [];
    for (var i = 0; i < marriageStars.length; i++) {
      var ms = marriageStars[i];
      if (ms.name === '桃花') starDescs.push('桃花（在' + ms.pillar + '，人缘和异性缘不错）');
      if (ms.name === '红鸾') starDescs.push('红鸾（在' + ms.pillar + '，正缘桃花，有结婚的缘分）');
      if (ms.name === '天喜') starDescs.push('天喜（在' + ms.pillar + '，喜事将近，姻缘和家庭都比较好）');
    }
    summary += starDescs.join('、') + '，这些都是婚姻感情方面的好兆头。';
  }

  // 日支冲合说明
  if (dayBranchMarriage) {
    summary += ' ' + dayBranchMarriage;
  }

  // 配偶宫五行与日主的生克关系（交叉分析，前面未展示）
  var spouseRelation = getElementRelation(result.yongShen.dayElement, spousePalaceElement);
  var spouseRelationText = '';
  if (spouseRelation === '生我') {
    spouseRelationText = '从五行生克看，你的日主「' + result.yongShen.dayElement + '」与配偶宫「' + spousePalaceElement + '」是「对方生我」的关系，传统上认为另一半对你有滋养、扶持的作用，婚后容易得到对方的照顾，是比较旺你的配置。';
  } else if (spouseRelation === '我生') {
    spouseRelationText = '从五行生克看，你的日主「' + result.yongShen.dayElement + '」生配偶宫「' + spousePalaceElement + '」，传统上认为你在感情中付出和照顾会多一些，比较能包容对方。';
  } else if (spouseRelation === '我克') {
    spouseRelationText = '从五行生克看，你的日主「' + result.yongShen.dayElement + '」克配偶宫「' + spousePalaceElement + '」，传统上认为你在关系中占主导、有话语权，但也要注意别太强势，多顾及对方感受。';
  } else if (spouseRelation === '克我') {
    spouseRelationText = '从五行生克看，配偶宫「' + spousePalaceElement + '」克你的日主「' + result.yongShen.dayElement + '」，传统上认为另一半性格可能比你强势、有主见，相处中需要多沟通、互相体谅。';
  } else {
    spouseRelationText = '从五行看，你的日主「' + result.yongShen.dayElement + '」与配偶宫「' + spousePalaceElement + '」五行相同，传统上认为两人性格相似、有共同语言，相处合拍，但也可能因为太像而缺少互补。';
  }
  summary += spouseRelationText;

  return {
    spousePalace: dayZhi,
    spousePalaceElement: spousePalaceElement,
    spousePalaceDesc: spousePalaceDesc,
    spousePalaceShiShen: spousePalaceShiShen,
    spouseStarNames: spouseStarNames,
    spouseStarLabel: spouseStarLabel,
    spouseStarPositions: spouseStarPositions,
    spouseStarDetails: spouseStarDetails,
    starStrength: starStrength,
    starStrengthDesc: starStrengthDesc,
    dayMasterMarriage: dayMasterMarriage,
    dayBranchMarriage: dayBranchMarriage,
    marriageStars: marriageStars,
    summary: summary
  };
}

/**
 * analyzeWealth() — 财运分析
 * 找出财星位置、强弱、食伤生财情况，结合大运给出财运建议
 *
 * @param {object} result - 八字计算结果
 * @returns {object} 财运分析结果
 */
function analyzeWealth(result) {
  var dayGan = result.dayPillar[0]; // 日干
  var dayElement = result.yongShen.dayElement; // 日主五行

  // 财星 = 我克的五行（日主五行所克者）
  // 木克土、火克金、土克水、金克木、水克火
  var woKeMap = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
  var wealthElement = woKeMap[dayElement]; // 财星对应的五行

  // 正财和偏财的十神名称
  var wealthStarNames = ['正财', '偏财'];

  // 在所有四柱天干和藏干中找财星
  var pillars = [
    { name: '年柱', gan: result.yearPillar[0], shiShenGan: result.yearShiShenGan, hideGan: result.yearHideGan },
    { name: '月柱', gan: result.monthPillar[0], shiShenGan: result.monthShiShenGan, hideGan: result.monthHideGan },
    { name: '日柱', gan: result.dayPillar[0], shiShenGan: result.dayShiShenGan, hideGan: result.dayHideGan },
    { name: '时柱', gan: result.timePillar[0], shiShenGan: result.timeShiShenGan, hideGan: result.timeHideGan }
  ];

  var wealthPositions = []; // 财星出现的位置
  var wealthCount = 0;      // 财星出现的次数

  for (var i = 0; i < pillars.length; i++) {
    var p = pillars[i];
    // 检查天干
    for (var s = 0; s < wealthStarNames.length; s++) {
      if (p.shiShenGan === wealthStarNames[s]) {
        wealthPositions.push({ position: p.name, location: '天干', gan: p.gan, star: wealthStarNames[s] });
        wealthCount++;
      }
    }
    // 检查藏干
    var hideGanStr = String(p.hideGan);
    var hideGanList = hideGanStr.split(',');
    for (var h = 0; h < hideGanList.length; h++) {
      var hg = hideGanList[h].trim();
      if (hg === '' || hg === 'undefined' || hg === 'null') continue;
      var hgShiShen = getShiShenFromGan(dayGan, hg);
      for (var s = 0; s < wealthStarNames.length; s++) {
        if (hgShiShen === wealthStarNames[s] && hg !== dayGan) {
          wealthPositions.push({ position: p.name, location: '藏干', gan: hg, star: wealthStarNames[s] });
          wealthCount++;
        }
      }
    }
  }

  // 食伤（生财的）—— 食神+伤官 = 我生者
  // 食伤能生出财星，就像源头的活水一样，让财运源源不断
  var foodStars = ['食神', '伤官'];
  var foodPositions = [];
  for (var i = 0; i < pillars.length; i++) {
    var p = pillars[i];
    for (var s = 0; s < foodStars.length; s++) {
      if (p.shiShenGan === foodStars[s]) {
        foodPositions.push(p.name + '天干');
      }
    }
  }

  // 财星强弱判断
  var wealthStrength = '';
  var wealthDesc = '';
  if (wealthCount === 0) {
    wealthStrength = '弱';
    wealthDesc = '财星不太明显，一般通过踏实工作和长期积累来获得财富。不容易有横财，但正财（工资收入）会比较稳定。建议走稳健路线，不要冒险投机。';
  } else if (wealthCount === 1) {
    wealthStrength = '中等';
    wealthDesc = '命中有一个财星，财运属于中等水平。有固定的收入来源，偶尔也会有意外之财。建议在稳定收入的基础上，适当做一些低风险理财。';
  } else if (wealthCount === 2) {
    wealthStrength = '较强';
    wealthDesc = '命中有两个财星，财运不错。可能有多条收入渠道，钱来得相对容易。但要注意理财规划，钱来得快也可能去得快。';
  } else {
    wealthStrength = '很强';
    wealthDesc = '财星较多，一生中赚钱机会不少。但要特别注意：财多身弱反而守不住财。建议加强自己的能力（日主），才能驾驭得住这些财富。';
  }

  // 食伤生财分析
  var hasFoodGenerateWealth = foodPositions.length > 0;
  var foodDesc = '';
  if (hasFoodGenerateWealth) {
    foodDesc = '你的八字中有食神/伤官（在' + foodPositions.join('、') + '），食伤能生财星，这意味着你有创造财富的才华和能力。就像有一口活井，能不断生出财富来。适合靠手艺、技术、创意来赚钱。';
  } else {
    foodDesc = '你的八字中食伤不太明显，这意味着赚钱更多是靠踏实努力而非创意或技艺。适合稳定的职业收入，不太适合高风险的投资方式。';
  }

  // 财星在哪个柱，代表财运来自哪里
  var wealthSource = '';
  if (wealthPositions.length > 0) {
    var posNames = [];
    for (var i = 0; i < wealthPositions.length; i++) {
      var wp = wealthPositions[i];
      if (wp.position === '年柱') posNames.push('祖上或远方（' + wp.star + '在年柱）');
      if (wp.position === '月柱') posNames.push('工作事业（' + wp.star + '在月柱）');
      if (wp.position === '日柱') posNames.push('自己或配偶（' + wp.star + '在日柱）');
      if (wp.position === '时柱') posNames.push('晚年或子女（' + wp.star + '在时柱）');
    }
    wealthSource = '财运主要来自：' + uniqueArray(posNames).join('、');
  } else {
    wealthSource = '财运主要靠个人努力和积累，没有特别明显的偏财来源。';
  }

  // 从大运中找出财运最好的几步
  var goodWealthYears = [];
  for (var i = 0; i < result.daYunList.length; i++) {
    var dy = result.daYunList[i];
    var dyGan = dy.ganZhi[0];
    var dyShiShen = getShiShenFromGan(dayGan, dyGan);
    if (dyShiShen === '正财' || dyShiShen === '偏财' || dyShiShen === '食神' || dyShiShen === '伤官') {
      goodWealthYears.push({
        age: dy.startAge + '~' + dy.endAge + '岁',
        ganZhi: dy.ganZhi,
        shiShen: dyShiShen,
        years: dy.startYear + '-' + dy.endYear
      });
    }
  }

  // 综合总结
  var summary = '总体来看，你命中的财星' + wealthStrength + '。' + wealthDesc + ' ' + foodDesc + ' ' + wealthSource;

  // 财星与日主的平衡判断（交叉分析，前面未系统展示）
  var isStrong = result.yongShen.strength === '偏强';
  var wealthBalanceText = '';
  if (isStrong && wealthCount >= 3) {
    wealthBalanceText = '再综合看「财」和「身」的平衡：你的日主偏强、财星也多，属于「身旺财旺」的好格局，有能力驾驭这些财富，只要踏实经营，财富能真正落在你手里。';
  } else if (isStrong && wealthCount <= 1) {
    wealthBalanceText = '再综合看「财」和「身」的平衡：你的日主偏强、但财星偏少，属于「身旺财弱」——你有能力和精力，缺的是财源。建议主动开拓机会、多找收入渠道，别让能力闲着。';
  } else if (!isStrong && wealthCount >= 3) {
    wealthBalanceText = '再综合看「财」和「身」的平衡：你的日主偏弱、但财星偏多，属于「财多身弱」——赚钱机会不少，但容易守不住、甚至被财所累。关键是先提升自身能力和健康，再谈聚财。';
  } else if (!isStrong && wealthCount <= 1) {
    wealthBalanceText = '再综合看「财」和「身」的平衡：你的日主偏弱、财星也少，属于「身弱财弱」——现阶段宜先养精蓄锐、提升自己，财运随能力增长而慢慢打开，不必急于求成。';
  } else {
    wealthBalanceText = '再综合看「财」和「身」的平衡：你的日主和财星力量相对匹配，赚钱和守财的能力比较均衡，按部就班地努力就能有不错的积累。';
  }
  summary += ' ' + wealthBalanceText;

  return {
    wealthElement: wealthElement,
    wealthStarNames: wealthStarNames,
    wealthPositions: wealthPositions,
    wealthCount: wealthCount,
    wealthStrength: wealthStrength,
    wealthDesc: wealthDesc,
    foodPositions: foodPositions,
    hasFoodGenerateWealth: hasFoodGenerateWealth,
    foodDesc: foodDesc,
    wealthSource: wealthSource,
    goodWealthYears: goodWealthYears,
    summary: summary
  };
}

/**
 * analyzeHealth() — 健康分析
 * 五行对应五脏：木=肝、火=心、土=脾胃、金=肺、水=肾
 * 五行过旺或过弱都会影响对应器官的健康
 *
 * @param {object} result - 八字计算结果
 * @returns {object} 健康分析结果
 */
function analyzeHealth(result) {
  var wc = result.wuxingCount; // 五行统计结果
  var dayElement = result.yongShen.dayElement; // 日主五行

  // 五行与五脏、健康建议的对照表
  var HEALTH_MAP = {
    '木': {
      organ: '肝脏、胆囊',
      symptoms: '容易眼睛疲劳、筋骨酸痛、情绪抑郁或容易发怒。木太旺容易肝火旺（容易发脾气、失眠），木太弱则精力不足、容易疲劳。',
      advice: '少喝酒、少熬夜、多吃绿色蔬菜。保持心情舒畅最重要，适当运动（特别是拉伸类的运动，如瑜伽、太极）有助疏肝。',
      emoji: '🌿'
    },
    '火': {
      organ: '心脏、小肠、血液循环',
      symptoms: '容易心慌心悸、失眠多梦、面色潮红或苍白。火太旺容易上火长痘、口腔溃疡，火太弱则手脚冰凉、血液循环不好。',
      advice: '保持心态平和，避免情绪大起大落。多吃红色食物（红枣、枸杞、番茄），适当有氧运动但不过量。夏天注意防暑。',
      emoji: '🔥'
    },
    '土': {
      organ: '脾胃、消化系统',
      symptoms: '容易胃胀胃痛、消化不良、容易发胖或消瘦。土太旺容易思虑过多，土太弱则食欲不振、吸收不好。',
      advice: '饮食规律最重要！少食多餐、避免暴饮暴食。多吃黄色食物（小米、南瓜、山药）健脾养胃。饭后散散步有助消化。',
      emoji: '🟤'
    },
    '金': {
      organ: '肺、呼吸道、大肠、皮肤',
      symptoms: '容易感冒咳嗽、皮肤过敏、鼻炎咽炎。金太旺则皮肤干燥、容易便秘，金太弱则抵抗力差、易呼吸道感染。',
      advice: '注意保暖防寒，多呼吸新鲜空气。多吃白色食物（梨、银耳、百合）润肺。适当做一些深呼吸练习。',
      emoji: '⚪'
    },
    '水': {
      organ: '肾脏、膀胱、骨骼、耳朵',
      symptoms: '容易腰酸背痛、耳鸣、水肿或尿频。水太旺则容易体寒怕冷，水太弱则精力不足、记忆力下降、容易衰老。',
      advice: '不要过度劳累，保证充足睡眠。多吃黑色食物（黑豆、黑芝麻、黑木耳）补肾。冬天特别注意保暖，少喝冰水。',
      emoji: '💧'
    }
  };

  // 分析各五行健康状态
  var healthItems = [];
  var wuxingList = ['木', '火', '土', '金', '水'];

  for (var i = 0; i < wuxingList.length; i++) {
    var wx = wuxingList[i];
    var cnt = wc[wx];
    var status = '';
    var attention = false;

    if (cnt >= 4) {
      status = '过旺⚠️';
      attention = true;
    } else if (cnt === 3) {
      status = '偏旺';
    } else if (cnt >= 1 && cnt <= 2) {
      status = '正常';
    } else if (cnt === 0) {
      status = '缺失⚠️';
      attention = true;
    }

    healthItems.push({
      element: wx,
      count: cnt,
      status: status,
      attention: attention,
      organ: HEALTH_MAP[wx].organ,
      symptoms: HEALTH_MAP[wx].symptoms,
      advice: HEALTH_MAP[wx].advice,
      emoji: HEALTH_MAP[wx].emoji
    });
  }

  // 日主五行健康总评
  var dayHealth = '';
  var dayElementCount = wc[dayElement];
  if (dayElementCount >= 4) {
    dayHealth = '你的日主「' + dayElement + '」偏旺，体质总体比较好，精力也比较充沛。但' + HEALTH_MAP[dayElement].organ + '方面需要注意不要过劳。';
  } else if (dayElementCount <= 1) {
    dayHealth = '你的日主「' + dayElement + '」偏弱，体质可能不太强壮，容易疲惫。要特别注意' + HEALTH_MAP[dayElement].organ + '方面的保养，不要太拼。';
  } else {
    dayHealth = '你的日主「' + dayElement + '」力量适中，体质总体不错，保持现有的生活习惯就好。';
  }

  // 找出最需要注意的方面（过旺或缺失的）
  var warnings = [];
  for (var i = 0; i < healthItems.length; i++) {
    if (healthItems[i].attention) {
      warnings.push(healthItems[i]);
    }
  }

  // 综合建议
  var summary = dayHealth;
  if (warnings.length > 0) {
    summary += ' 需要特别关注：';
    var warningDescs = [];
    for (var i = 0; i < warnings.length; i++) {
      warningDescs.push(warnings[i].organ + '（' + warnings[i].element + '的' + warnings[i].status + '）');
    }
    summary += warningDescs.join('、') + '。';
  } else {
    summary += ' 八字五行比较均衡，没有特别需要注意的健康问题，保持良好生活习惯即可。';
  }

  // 五行生克连带分析（交叉分析，前面只讲了单五行）
  var keMap2 = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
  var wxList = ['木', '火', '土', '金', '水'];
  var maxWx = wxList[0], minWx = wxList[0];
  for (var wi2 = 0; wi2 < wxList.length; wi2++) {
    if (wc[wxList[wi2]] > wc[maxWx]) maxWx = wxList[wi2];
    if (wc[wxList[wi2]] < wc[minWx]) minWx = wxList[wi2];
  }
  if (keMap2[maxWx] === minWx && wc[maxWx] >= 2 && wc[minWx] <= 1 && maxWx !== minWx) {
    summary += ' 另外从五行生克看，你的「' + maxWx + '」偏旺而「' + minWx + '」偏弱，' + maxWx + '克' + minWx + '，传统上认为过旺的' + maxWx + '会连累到' + minWx + '对应的脏腑，所以除了' + HEALTH_MAP[maxWx].organ + '，也要顺带留意' + HEALTH_MAP[minWx].organ + '的保养。';
  }

  return {
    healthItems: healthItems,
    dayHealth: dayHealth,
    warnings: warnings,
    summary: summary
  };
}

/**
 * copyBaziResult() — 一键复制八字排盘结果到剪贴板
 * 用户点击复制按钮时调用
 */
function copyBaziResult() {
  var container = document.getElementById('bazi-result');
  if (!container || container.classList.contains('hidden')) {
    alert('请先排八字盘再复制哦～');
    return;
  }

  // 提取纯文本，去掉复制按钮自身的文字、压缩多余空行
  var text = (container.innerText || container.textContent || '')
    .replace(/📋\s*一键复制排盘结果/g, '')
    .replace(/已复制！/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) {
    alert('没有可复制的内容');
    return;
  }

  // 现代剪贴板 API 只在安全上下文（https 或 localhost）下可用
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(function () {
      showCopySuccess();
    }).catch(function () {
      fallbackCopy(text);
    });
  } else {
    // 非安全上下文（如局域网 IP 访问），直接走兼容方案
    fallbackCopy(text);
  }
}

/**
 * 复制成功后的视觉反馈（同时更新顶部和底部的复制按钮）
 */
function showCopySuccess() {
  var btns = document.querySelectorAll('button[onclick="copyBaziResult()"]');
  if (btns.length) {
    for (var i = 0; i < btns.length; i++) {
      btns[i].innerHTML = '✅ 已复制！';
      btns[i].classList.add('bg-green-100');
      (function (btn) {
        setTimeout(function () {
          btn.innerHTML = '📋 一键复制排盘结果';
          btn.classList.remove('bg-green-100');
        }, 2000);
      })(btns[i]);
    }
  } else {
    alert('排盘结果已复制到剪贴板！');
  }
}

/**
 * fallbackCopy() — 兼容旧浏览器/非安全上下文的复制方案
 * 创建一个临时的textarea元素来复制文本
 */
function fallbackCopy(text) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  var copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (e) {
    copied = false;
  }
  document.body.removeChild(textarea);
  if (copied) {
    showCopySuccess();
  } else {
    alert('复制失败，请手动选择文字后 Ctrl+C 复制');
  }
}

/**
 * formatShenShaCell() — 格式化神煞单元格的显示
 * 把吉星和凶星以标签形式展示，吉星绿色，凶星红色
 */
function formatShenShaCell(pillarStars) {
  var result = '';
  var allStars = pillarStars.good.concat(pillarStars.bad);
  if (allStars.length === 0) return '—';
  for (var i = 0; i < allStars.length; i++) {
    var star = allStars[i];
    var isGood = pillarStars.good.indexOf(star) !== -1;
    var color = isGood ? 'text-green-600' : 'text-red-500';
    result += '<span class="' + color + '">' + star + '</span> ';
  }
  return result.trim();
}

// ========== 渲染函数：把计算结果展示到页面上 ==========

/**
 * renderBaziResult() — 把八字计算结果渲染成 HTML，显示到页面上
 * 这是整个八字模块的输出端，所有计算结果在这里变成用户能看懂的界面
 *
 * @param {object} r - 八字计算结果对象
 */
function renderBaziResult(r) {
  // 找到结果容器
  var container = document.getElementById('bazi-result');

  // 搭建 HTML 结构（分多个卡片展示不同类型的结果）
  var html = '';

  // ===== 顶部复制按钮 =====
  html += '<div class="text-right mb-3">';
  html += '<button id="btn-copy" onclick="copyBaziResult()" class="text-sm px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors border border-amber-300" title="把排盘结果复制到剪贴板">📋 一键复制排盘结果</button>';
  html += '</div>';

  // ===== 卡片1：四柱八字排盘表 =====
  html += '<div class="result-card">';
  html += '<h3 class="text-xl font-bold text-red-800 mb-4 text-center">📋 八字排盘</h3>';

  // 显示公历和农历日期
  html += '<p class="text-sm text-gray-500 text-center mb-4">';
  html += '公历：' + r.solarDate + '　|　' + r.lunarDate;
  html += '</p>';

  // 四柱表格（参考传统八字排盘的竖排样式）
  html += '<div class="overflow-x-auto">';
  html += '<table class="bazi-table">';
  html += '<thead>';
  html += '<tr>';
  html += '<th>年柱</th><th>月柱</th><th>日柱</th><th>时柱</th>';
  html += '</tr>';
  html += '</thead>';
  html += '<tbody>';

  // 第一行：天干 + 十神
  html += '<tr>';
  html += '<td><span class="text-xl font-bold">' + r.yearPillar[0] + '</span><br><span class="text-xs text-gray-500">' + r.yearShiShenGan + '</span></td>';
  html += '<td><span class="text-xl font-bold">' + r.monthPillar[0] + '</span><br><span class="text-xs text-gray-500">' + r.monthShiShenGan + '</span></td>';
  html += '<td><span class="text-xl font-bold text-red-700">' + r.dayPillar[0] + '</span><br><span class="text-xs text-gray-500">' + r.dayShiShenGan + '</span></td>';
  html += '<td><span class="text-xl font-bold">' + r.timePillar[0] + '</span><br><span class="text-xs text-gray-500">' + r.timeShiShenGan + '</span></td>';
  html += '</tr>';

  // 第二行：地支 + 十神（地支十神可能有多个）
  html += '<tr>';
  html += '<td><span class="text-xl font-bold">' + r.yearPillar[1] + '</span><br><span class="text-xs text-gray-500">' + r.yearShiShenZhi + '</span></td>';
  html += '<td><span class="text-xl font-bold">' + r.monthPillar[1] + '</span><br><span class="text-xs text-gray-500">' + r.monthShiShenZhi + '</span></td>';
  html += '<td><span class="text-xl font-bold text-red-700">' + r.dayPillar[1] + '</span><br><span class="text-xs text-gray-500">' + r.dayShiShenZhi + '</span></td>';
  html += '<td><span class="text-xl font-bold">' + r.timePillar[1] + '</span><br><span class="text-xs text-gray-500">' + r.timeShiShenZhi + '</span></td>';
  html += '</tr>';

  // 第三行：藏干
  html += '<tr class="bg-amber-50">';
  html += '<td><span class="text-sm text-gray-600">藏干：' + r.yearHideGan + '</span></td>';
  html += '<td><span class="text-sm text-gray-600">藏干：' + r.monthHideGan + '</span></td>';
  html += '<td><span class="text-sm text-gray-600">藏干：' + r.dayHideGan + '</span></td>';
  html += '<td><span class="text-sm text-gray-600">藏干：' + r.timeHideGan + '</span></td>';
  html += '</tr>';

  // 第四行：纳音
  html += '<tr>';
  html += '<td><span class="text-sm text-gray-500">' + r.yearNaYin + '</span></td>';
  html += '<td><span class="text-sm text-gray-500">' + r.monthNaYin + '</span></td>';
  html += '<td><span class="text-sm text-gray-500">' + r.dayNaYin + '</span></td>';
  html += '<td><span class="text-sm text-gray-500">' + r.timeNaYin + '</span></td>';
  html += '</tr>';

  // 第五行：地势（十二长生）—— 鼠标悬停可看含义
  html += '<tr>';
  html += '<td><span class="text-sm text-gray-500 cursor-help" title="' + (CHANG_SHENG_SHORT[r.yearDiShi] || '') + '">' + r.yearDiShi + '</span></td>';
  html += '<td><span class="text-sm text-gray-500 cursor-help" title="' + (CHANG_SHENG_SHORT[r.monthDiShi] || '') + '">' + r.monthDiShi + '</span></td>';
  html += '<td><span class="text-sm text-gray-500 cursor-help" title="' + (CHANG_SHENG_SHORT[r.dayDiShi] || '') + '">' + r.dayDiShi + '</span></td>';
  html += '<td><span class="text-sm text-gray-500 cursor-help" title="' + (CHANG_SHENG_SHORT[r.timeDiShi] || '') + '">' + r.timeDiShi + '</span></td>';
  html += '</tr>';

  // 第六行：空亡（旬空）—— 该柱地支中哪些是空的
  html += '<tr class="bg-gray-50">';
  html += '<td><span class="text-xs text-gray-500">空亡：' + r.yearXunKong + '</span></td>';
  html += '<td><span class="text-xs text-gray-500">空亡：' + r.monthXunKong + '</span></td>';
  html += '<td><span class="text-xs text-gray-500">空亡：' + r.dayXunKong + '</span></td>';
  html += '<td><span class="text-xs text-gray-500">空亡：' + r.timeXunKong + '</span></td>';
  html += '</tr>';

  // 第七行：神煞（该柱包含的吉星和凶星）
  html += '<tr>';
  html += '<td><span class="text-xs text-gray-400">' + formatShenShaCell(r.shenSha.pillars['年']) + '</span></td>';
  html += '<td><span class="text-xs text-gray-400">' + formatShenShaCell(r.shenSha.pillars['月']) + '</span></td>';
  html += '<td><span class="text-xs text-gray-400">' + formatShenShaCell(r.shenSha.pillars['日']) + '</span></td>';
  html += '<td><span class="text-xs text-gray-400">' + formatShenShaCell(r.shenSha.pillars['时']) + '</span></td>';
  html += '</tr>';

  html += '</tbody>';
  html += '</table>';
  html += '</div>';

  // 补充：命宫、胎元、身宫
  html += '<div class="grid grid-cols-3 gap-2 mt-4 text-center text-sm">';
  html += '<div class="bg-amber-50 rounded-lg p-2"><span class="text-gray-500">命宫</span><br><span class="font-bold">' + r.mingGong + '</span></div>';
  html += '<div class="bg-amber-50 rounded-lg p-2"><span class="text-gray-500">胎元</span><br><span class="font-bold">' + r.taiYuan + '</span></div>';
  html += '<div class="bg-amber-50 rounded-lg p-2"><span class="text-gray-500">身宫</span><br><span class="font-bold">' + r.shenGong + '</span></div>';
  html += '</div>';

  html += '</div>'; // 卡片1结束

  // ===== 卡片1.5：神煞总览 =====
  var ss = r.shenSha;
  var allGood = ss.goodStars;
  var allBad = ss.badStars;
  html += '<div class="result-card">';
  html += '<h3 class="text-lg font-bold text-red-800 mb-3">⭐ 神煞总览</h3>';
  html += '<p class="text-xs text-gray-500 mb-3">神煞是八字中的特殊星神，吉星代表好运助力，凶星代表需要注意的方面。</p>';

  // 吉星展示
  if (allGood.length > 0) {
    html += '<div class="mb-3">';
    html += '<p class="text-sm font-bold text-green-700 mb-2">🟢 你的吉星（带来好运和助力）：</p>';
    html += '<div class="flex flex-wrap gap-2">';
    for (var gi = 0; gi < allGood.length; gi++) {
      var starName = allGood[gi];
      html += '<span class="inline-block bg-green-50 text-green-800 rounded-full px-3 py-1 text-sm cursor-help" title="' + (SHEN_SHA_DESC[starName] || '') + '">' + starName + '</span>';
    }
    html += '</div></div>';
  }

  // 凶星展示
  if (allBad.length > 0) {
    html += '<div>';
    html += '<p class="text-sm font-bold text-red-700 mb-2">🔴 需要注意的神煞（可能带来挑战）：</p>';
    html += '<div class="flex flex-wrap gap-2">';
    for (var bj = 0; bj < allBad.length; bj++) {
      var badName = allBad[bj];
      html += '<span class="inline-block bg-red-50 text-red-700 rounded-full px-3 py-1 text-sm cursor-help" title="' + (SHEN_SHA_DESC[badName] || '') + '">' + badName + '</span>';
    }
    html += '</div></div>';
  }

  if (allGood.length === 0 && allBad.length === 0) {
    html += '<p class="text-sm text-gray-500">此八字无特殊神煞。</p>';
  }

  html += '<p class="text-xs text-gray-400 mt-3">💡 鼠标悬停在星神标签上可查看详细解释。</p>';
  html += '</div>'; // 神煞卡片结束

  // ===== 卡片2：五行统计 =====
  html += '<div class="result-card">';
  html += '<h3 class="text-lg font-bold text-red-800 mb-3">🔥💧🪵⛰️⚔️ 五行统计</h3>';
  html += '<div class="grid grid-cols-5 gap-2 text-center">';

  var wc = r.wuxingCount;
  var wuxingList = ['金', '木', '水', '火', '土'];
  for (var i = 0; i < wuxingList.length; i++) {
    var wx = wuxingList[i];
    var cnt = wc[wx];
    // 用色块和柱状图显示每个五行的数量
    var barHeight = cnt * 20; // 每个计数 20px 高度
    html += '<div>';
    html += '<div class="rounded-lg p-2" style="background-color:' + ELEMENT_COLORS[wx] + '; color:' + ELEMENT_TEXT_COLORS[wx] + ';">';
    html += '<p class="text-sm font-bold">' + wx + '</p>';
    html += '<p class="text-2xl font-bold">' + cnt + '</p>';
    html += '<p class="text-xs">个</p>';
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';

  // 五行缺失/过旺详解
  var missingList = [];
  var excessList = []; // 过旺的五行
  for (var i = 0; i < wuxingList.length; i++) {
    if (wc[wuxingList[i]] === 0) {
      missingList.push(wuxingList[i]);
    }
    if (wc[wuxingList[i]] >= 4) {
      excessList.push(wuxingList[i]);
    }
  }

  // 五行缺失的生活影响对照表
  var MISSING_EFFECT = {
    '金': '缺少决断力和行动力，做事容易犹豫不决。在人际交往中不太会坚持自己的立场，有时候容易被人左右。可以通过佩戴金属饰品、多穿白色衣服来补充金气。',
    '木': '缺少坚持和韧性，做事容易三分钟热度。情绪上比较敏感，遇到挫折容易放弃。可以通过多种绿色植物、养成固定习惯来培养木的向上生长的特质。',
    '水': '缺少灵活变通的能力，思维比较直来直去。不太善于表达自己的情感，有时候显得有点"直男/直女"。可以通过多看书、多旅行、学习一门新技能来补充水的流动智慧。',
    '火': '缺少热情和行动力，做事比较慢热。性格偏内向沉稳，不太善于主动表达和社交。可以通过多穿红色衣服、多参加社交活动、培养一个需要表现力的爱好来点燃火气。',
    '土': '缺少稳定性和耐心，思维活跃但很难落地执行。情绪起伏比较大，不容易沉淀下来做一件事。可以通过养成规律作息、多接触大自然、练习冥想打坐来增加土的沉稳。'
  };

  // 五行过旺的影响
  var EXCESS_EFFECT = {
    '金': '金气太旺，性格可能过于刚硬强势，说话做事不太顾及别人感受。可以适当培养柔和的兴趣爱好（如画画、音乐），多一些换位思考。',
    '木': '木气太旺，性格固执、认死理、不太愿意变通。建议多听取不同意见，尝试新事物，不要总是按自己的老路子来。',
    '水': '水气太旺，脑子转得太快，想太多反而把自己绕进去了。有时候情绪波动比较大，建议写日记或找人倾诉来疏导情绪。',
    '火': '火气太旺，容易急躁冲动，情绪来得快去得也快。有时候太过热情反而让人有压力。建议学一些静心的活动（如书法、茶道）让自己慢下来。',
    '土': '土气太旺，做事过于保守，不太愿意改变。有时候显得有点"闷"，行动力偏弱。建议主动走出舒适区，多尝试新鲜事物。'
  };

  if (missingList.length > 0) {
    html += '<div class="mt-3">';
    html += '<p class="text-sm text-orange-600 font-bold">⚠️ 你的八字中缺了「' + missingList.join('、') + '」</p>';
    html += '<p class="text-xs text-gray-500 mt-1 mb-2">八字讲究五行平衡，某个五行缺失不代表"命不好"，只是说明你在某些方面可能天生不太擅长，需要后天有意识地培养和补充。</p>';
    html += '<details class="text-xs"><summary class="text-orange-700 cursor-pointer font-bold">📖 缺少每个五行的具体影响（点击展开）</summary>';
    for (var mi = 0; mi < missingList.length; mi++) {
      var mx = missingList[mi];
      html += '<p class="text-gray-700 mt-1"><strong>' + mx + '：</strong>' + (MISSING_EFFECT[mx] || '') + '</p>';
    }
    html += '</details>';
    html += '</div>';
  }

  if (excessList.length > 0) {
    html += '<div class="mt-2">';
    html += '<p class="text-sm text-red-600 font-bold">🔥 你的八字中「' + excessList.join('、') + '」偏旺（≥4个）</p>';
    html += '<details class="text-xs"><summary class="text-red-600 cursor-pointer font-bold">📖 五行过旺的影响（点击展开）</summary>';
    for (var ei = 0; ei < excessList.length; ei++) {
      var ex = excessList[ei];
      html += '<p class="text-gray-700 mt-1"><strong>' + ex + '：</strong>' + (EXCESS_EFFECT[ex] || '') + '</p>';
    }
    html += '</details>';
    html += '</div>';
  }

  if (missingList.length === 0 && excessList.length === 0) {
    html += '<p class="mt-3 text-sm text-green-600">✅ 五行齐全且分布均衡，八字五行比较均衡，性格各方面发展也比较全面。</p>';
  }

  html += '</div>'; // 卡片2结束

  // ===== 卡片3：用神分析 =====
  var ys = r.yongShen;
  html += '<div class="result-card">';
  html += '<h3 class="text-lg font-bold text-red-800 mb-3">🎯 用神分析（核心）</h3>';
  html += '<p class="text-sm text-gray-700 mb-2">日主五行：<strong>' + ys.dayElement + '</strong>（' + ys.strength + '）</p>';
  html += '<p class="text-sm text-gray-600 mb-3">' + ys.strengthDesc + '</p>';

  html += '<div class="grid grid-cols-2 gap-3">';
  html += '<div class="bg-green-50 rounded-lg p-3 border border-green-200">';
  html += '<p class="font-bold text-green-800">✅ 喜用神（对你有利的）</p>';
  html += '<p class="text-sm">' + ys.yongShen.join('、') + '</p>';
  html += '<p class="text-xs text-gray-500 mt-1">' + ys.yongShenDesc + '</p>';
  html += '</div>';
  html += '<div class="bg-red-50 rounded-lg p-3 border border-red-200">';
  html += '<p class="font-bold text-red-800">⚠️ 忌神（不太有利的）</p>';
  html += '<p class="text-sm">' + ys.jiShen.join('、') + '</p>';
  html += '<p class="text-xs text-gray-500 mt-1">' + ys.jiShenDesc + '</p>';
  html += '</div>';
  html += '</div>';
  html += '</div>'; // 卡片3结束

  // ===== 卡片3.5：用神实用建议 =====
  var ysg = r.yongShenGuide;
  if (ysg && ysg.length > 0) {
    html += '<div class="result-card">';
    html += '<h3 class="text-lg font-bold text-red-800 mb-3">💡 用神实用建议（生活指引）</h3>';
    html += '<p class="text-xs text-gray-500 mb-3">根据你的用神五行，以下是在日常生活中的实用建议，帮助你在合适的方向上发挥优势。</p>';

    html += '<div class="space-y-3">';
    for (var gi = 0; gi < ysg.length; gi++) {
      var g = ysg[gi];
      var emoji = { '金': '⚔️', '木': '🌳', '水': '💧', '火': '🔥', '土': '⛰️' };
      html += '<div class="bg-amber-50 rounded-lg p-3 border border-amber-200">';
      html += '<p class="font-bold text-amber-900 mb-1">' + (emoji[g.element] || '') + ' 喜「' + g.element + '」建议</p>';
      html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">';
      html += '<div class="text-gray-700"><span class="text-gray-500">🎨 幸运颜色：</span>' + g.color + '</div>';
      html += '<div class="text-gray-700"><span class="text-gray-500">🧭 有利方位：</span>' + g.direction + '</div>';
      html += '<div class="text-gray-700"><span class="text-gray-500">💼 适合行业：</span>' + g.industries + '</div>';
      html += '<div class="text-gray-700"><span class="text-gray-500">💡 小贴士：</span>' + g.tips + '</div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>'; // 用神建议卡片结束
  }

  // ===== 卡片4：性格概述 =====
  var pers = r.personality;
  html += '<div class="result-card">';
  html += '<h3 class="text-lg font-bold text-red-800 mb-3">🧠 性格概述</h3>';
  html += '<p class="text-sm text-gray-700 leading-relaxed">' + pers.summary + '</p>';
  html += '<p class="text-sm text-gray-600 mt-2 leading-relaxed">' + pers.strengthNote + '</p>';
  html += '<p class="text-xs text-gray-400 mt-2">💡 以上性格分析基于八字日主五行和旺衰，仅供参考。</p>';
  html += '</div>'; // 卡片4结束

  // ===== 卡片4.5：婚姻感情分析 =====
  var mar = r.marriage;
  html += '<div class="result-card">';
  html += '<h3 class="text-lg font-bold text-red-800 mb-3">💕 婚姻感情分析</h3>';

  // --- 配偶宫 ---
  html += '<div class="bg-pink-50 rounded-lg p-3 border border-pink-200 mb-3">';
  html += '<p class="font-bold text-pink-800 text-sm mb-1">🏠 配偶宫（日支）：' + mar.spousePalace + '（' + mar.spousePalaceElement + '）</p>';
  html += '<p class="text-sm text-gray-700">' + mar.spousePalaceDesc + '</p>';
  html += '</div>';

  // --- 配偶星 ---
  html += '<div class="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-3">';
  html += '<p class="font-bold text-blue-800 text-sm mb-1">👤 ' + mar.spouseStarLabel + '（'
    + (mar.spouseStarNames.length > 1 ? mar.spouseStarNames.join('、') : mar.spouseStarNames[0]) + '）</p>';
  if (mar.spouseStarPositions.length > 0) {
    html += '<p class="text-sm text-gray-700">配偶星出现位置：' + mar.spouseStarPositions.join('；') + '</p>';
  }
  html += '<p class="text-sm text-gray-700">配偶星力量：<strong>' + mar.starStrength + '</strong> — ' + mar.starStrengthDesc + '</p>';
  html += '</div>';

  // --- 日柱婚姻特性 ---
  html += '<div class="bg-purple-50 rounded-lg p-3 border border-purple-200 mb-3">';
  html += '<p class="font-bold text-purple-800 text-sm mb-1">📖 日柱婚姻特性</p>';
  html += '<p class="text-sm text-gray-700">' + mar.dayMasterMarriage + '</p>';
  if (mar.dayBranchMarriage) {
    html += '<p class="text-sm text-gray-600 mt-1">' + mar.dayBranchMarriage + '</p>';
  }
  html += '</div>';

  // --- 婚姻相关神煞 ---
  if (mar.marriageStars.length > 0) {
    html += '<div class="mb-3">';
    html += '<p class="font-bold text-red-800 text-sm mb-2">⭐ 婚姻相关神煞：</p>';
    html += '<div class="flex flex-wrap gap-2">';
    for (var mi = 0; mi < mar.marriageStars.length; mi++) {
      var ms = mar.marriageStars[mi];
      html += '<span class="inline-block ' + (ms.isGood ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700') + ' rounded-full px-3 py-1 text-sm">' + ms.name + '（在' + ms.pillar + '）</span>';
    }
    html += '</div></div>';
  }

  // --- 综合解读 ---
  html += '<div class="bg-amber-50 rounded-lg p-3 border border-amber-200">';
  html += '<p class="font-bold text-amber-900 text-sm mb-1">📖 综合解读：</p>';
  html += '<p class="text-sm text-gray-700 leading-relaxed">' + mar.summary + '</p>';
  html += '</div>';

  html += '<p class="text-xs text-gray-400 mt-3">💡 婚姻感情分析基于八字传统理论，仅供参考。美好姻缘需要两个人共同经营，八字只是参考哦～</p>';
  html += '</div>'; // 婚姻卡片结束

  // ===== 卡片4.6：财运分析 =====
  var wea = r.wealth;
  html += '<div class="result-card">';
  html += '<h3 class="text-lg font-bold text-red-800 mb-3">💰 财运分析</h3>';

  // 财星总览
  html += '<div class="bg-yellow-50 rounded-lg p-3 border border-yellow-200 mb-3">';
  html += '<p class="font-bold text-yellow-800 text-sm mb-1">💵 财星力量：<strong>' + wea.wealthStrength + '</strong></p>';
  html += '<p class="text-sm text-gray-700">' + wea.wealthDesc + '</p>';
  html += '</div>';

  // 财星位置
  if (wea.wealthPositions.length > 0) {
    html += '<div class="bg-green-50 rounded-lg p-3 border border-green-200 mb-3">';
    html += '<p class="font-bold text-green-800 text-sm mb-1">📍 财星出现位置：</p>';
    for (var wi = 0; wi < wea.wealthPositions.length; wi++) {
      var wp = wea.wealthPositions[wi];
      html += '<p class="text-sm text-gray-700">' + wp.star + ' → ' + wp.position + wp.location + '（' + wp.gan + '）</p>';
    }
    html += '<p class="text-xs text-gray-500 mt-1">' + wea.wealthSource + '</p>';
    html += '</div>';
  }

  // 食伤生财
  html += '<div class="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-3">';
  html += '<p class="font-bold text-blue-800 text-sm mb-1">🔑 财富创造力（食伤生财）：</p>';
  html += '<p class="text-sm text-gray-700">' + wea.foodDesc + '</p>';
  html += '</div>';

  // 财运好的大运
  if (wea.goodWealthYears.length > 0) {
    html += '<div class="mb-3">';
    html += '<p class="font-bold text-red-800 text-sm mb-2">📈 财运较好的大运阶段：</p>';
    html += '<div class="flex flex-wrap gap-2">';
    for (var wi = 0; wi < wea.goodWealthYears.length; wi++) {
      var gwy = wea.goodWealthYears[wi];
      html += '<span class="inline-block bg-green-50 text-green-800 rounded-full px-3 py-1 text-xs">' + gwy.age + '（' + gwy.ganZhi + ' → ' + gwy.shiShen + '运）</span>';
    }
    html += '</div></div>';
  }

  // 综合解读
  html += '<div class="bg-amber-50 rounded-lg p-3 border border-amber-200">';
  html += '<p class="font-bold text-amber-900 text-sm mb-1">📖 综合解读：</p>';
  html += '<p class="text-sm text-gray-700 leading-relaxed">' + wea.summary + '</p>';
  html += '</div>';

  html += '<p class="text-xs text-gray-400 mt-3">💡 财运分析基于八字传统理论，仅供参考。真正的财富来自努力和智慧，八字只是参考～</p>';
  html += '</div>'; // 财运卡片结束

  // ===== 卡片4.7：健康分析 =====
  var hea = r.health;
  html += '<div class="result-card">';
  html += '<h3 class="text-lg font-bold text-red-800 mb-3">🏥 健康分析（五行与五脏）</h3>';

  html += '<p class="text-xs text-gray-500 mb-3">中医认为五行对应五脏：木=肝胆、火=心、土=脾胃、金=肺、水=肾。五行失衡会影响对应器官。</p>';

  // 日主健康总评
  html += '<div class="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-3">';
  html += '<p class="text-sm text-gray-700">' + hea.dayHealth + '</p>';
  html += '</div>';

  // 各五行健康分析
  html += '<div class="space-y-2 mb-3">';
  for (var hi = 0; hi < hea.healthItems.length; hi++) {
    var hiItem = hea.healthItems[hi];
    var alertClass = hiItem.attention ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white';
    html += '<div class="rounded-lg p-2 border ' + alertClass + '">';
    html += '<div class="flex items-center justify-between">';
    html += '<span class="text-sm font-bold">' + hiItem.emoji + ' ' + hiItem.element + '（' + hiItem.count + '个）→ ' + hiItem.organ + '</span>';
    html += '<span class="text-xs font-bold ' + (hiItem.attention ? 'text-red-600' : 'text-green-600') + '">' + hiItem.status + '</span>';
    html += '</div>';
    if (hiItem.attention) {
      html += '<p class="text-xs text-gray-600 mt-1">' + hiItem.symptoms + '</p>';
      html += '<p class="text-xs text-green-700 mt-1">💡 ' + hiItem.advice + '</p>';
    }
    html += '</div>';
  }
  html += '</div>';

  // 重点关注
  if (hea.warnings.length > 0) {
    html += '<div class="bg-red-50 rounded-lg p-3 border border-red-200 mb-3">';
    html += '<p class="font-bold text-red-800 text-sm mb-1">⚠️ 需要特别关注的方面：</p>';
    for (var hi2 = 0; hi2 < hea.warnings.length; hi2++) {
      var warn = hea.warnings[hi2];
      html += '<p class="text-sm text-gray-700">' + warn.emoji + ' ' + warn.organ + ' — ' + warn.advice + '</p>';
    }
    html += '</div>';
  }

  // 综合解读
  html += '<div class="bg-amber-50 rounded-lg p-3 border border-amber-200">';
  html += '<p class="font-bold text-amber-900 text-sm mb-1">📖 综合解读：</p>';
  html += '<p class="text-sm text-gray-700 leading-relaxed">' + hea.summary + '</p>';
  html += '</div>';

  html += '<p class="text-xs text-gray-400 mt-3">💡 以上健康分析基于五行理论，仅供参考。如有身体不适请及时就医，八字不能替代专业医疗诊断。</p>';
  html += '</div>'; // 健康卡片结束

  // ===== 卡片5：大运排盘（增强版 — 含十神标签和简短解读） =====
  html += '<div class="result-card">';
  html += '<h3 class="text-lg font-bold text-red-800 mb-3">📅 大运排盘（一生运势时间线）</h3>';
  html += '<p class="text-sm text-gray-600 mb-1">起运年龄：<strong>' + r.yunStartYear + '岁' + r.yunStartMonth + '个月</strong>（' + r.yunStartDate + ' 开始走大运）</p>';
  html += '<p class="text-xs text-gray-400 mb-3">💡 每步大运管十年，下面的标签告诉你这十年的主题。标<span class="text-green-600 font-bold">绿色</span>的是有利的大运，标<span class="text-red-500 font-bold">红色</span>的需要多加努力。</p>';

  // 大运列表用横排时间线展示
  html += '<div class="overflow-x-auto">';
  html += '<div class="flex gap-2 min-w-max pb-2">';
  var currentYear = new Date().getFullYear();
  for (var i = 0; i < r.daYunList.length; i++) {
    var dy = r.daYunList[i];
    // 计算这步大运的十神（以日干为基准）
    var dyGan = dy.ganZhi[0];
    var dyShiShen = getShiShenFromGan(r.dayPillar[0], dyGan);
    // 判断这一步大运是否有利（十神是用神相关）
    var isGoodYun = (dyShiShen === '正财' || dyShiShen === '偏财' || dyShiShen === '正官' || dyShiShen === '正印' || dyShiShen === '食神');
    var isBadYun = (dyShiShen === '七杀' || dyShiShen === '劫财' || dyShiShen === '伤官');
    var isCurrent = (currentYear >= dy.startYear && currentYear <= dy.endYear);

    var borderClass = isCurrent ? 'border-red-400 ring-2 ring-red-300' : 'border-amber-200';
    var bgClass = isCurrent ? 'bg-red-50' : (isGoodYun ? 'bg-green-50' : (isBadYun ? 'bg-red-50' : 'bg-amber-50'));

    html += '<div class="' + bgClass + ' rounded-lg p-3 text-center border ' + borderClass + ' min-w-[100px] flex-shrink-0">';
    if (isCurrent) {
      html += '<p class="text-xs text-red-500 font-bold">📍 当前</p>';
    }
    html += '<p class="text-xs text-gray-500">' + dy.startAge + '~' + dy.endAge + '岁</p>';
    html += '<p class="text-lg font-bold text-red-800">' + dy.ganZhi + '</p>';
    html += '<p class="text-xs font-bold ' + (isGoodYun ? 'text-green-600' : (isBadYun ? 'text-red-500' : 'text-gray-500')) + '">' + dyShiShen + '运</p>';
    html += '<p class="text-xs text-gray-400">' + dy.startYear + '-' + dy.endYear + '</p>';
    html += '</div>';
  }
  html += '</div>';
  html += '</div>';

  // 大运十神图例说明
  html += '<details class="mt-3 text-xs">';
  html += '<summary class="text-red-800 cursor-pointer font-bold">📚 各十神大运代表什么？（点击展开）</summary>';
  html += '<div class="grid grid-cols-2 md:grid-cols-5 gap-1 mt-2">';
  var yunLegend = [
    { name: '比肩运', desc: '朋友助力、独立自主' },
    { name: '劫财运', desc: '竞争多、注意理财' },
    { name: '食神运', desc: '轻松愉快、发挥才华' },
    { name: '伤官运', desc: '创意多、说话注意分寸' },
    { name: '正财运', desc: '收入稳定、适合存钱' },
    { name: '偏财运', desc: '投资机会、意外收入' },
    { name: '正官运', desc: '事业上升、考试有利' },
    { name: '七杀运', desc: '压力大但成长快' },
    { name: '正印运', desc: '学习好、贵人相助' },
    { name: '偏印运', desc: '独特机遇、偏门学问' }
  ];
  for (var yl = 0; yl < yunLegend.length; yl++) {
    var ylItem = yunLegend[yl];
    html += '<div class="bg-gray-50 rounded p-1"><span class="font-bold">' + ylItem.name + '</span><br><span class="text-gray-500">' + ylItem.desc + '</span></div>';
  }
  html += '</div>';
  html += '</details>';

  html += '</div>'; // 卡片5结束

  // ===== 卡片6：当前大运流年（增强版 — 含十神组合白话解读） =====
  if (r.currentReading.found) {
    var cr = r.currentReading;
    html += '<div class="result-card">';
    html += '<h3 class="text-lg font-bold text-red-800 mb-3">🔮 当前运势参考（' + cr.currentYear + '年）</h3>';
    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div class="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">';
    html += '<p class="text-xs text-gray-500">当前大运</p>';
    html += '<p class="text-xl font-bold text-blue-800">' + cr.daYunGanZhi + '</p>';
    html += '<p class="text-xs text-gray-400">' + cr.daYunAge + '</p>';
    if (cr.daYunShiShen) {
      html += '<p class="text-sm text-blue-700 font-bold mt-1">' + cr.daYunShiShen + '运</p>';
    }
    html += '</div>';
    html += '<div class="bg-red-50 rounded-lg p-3 text-center border border-red-200">';
    html += '<p class="text-xs text-gray-500">今年流年</p>';
    html += '<p class="text-xl font-bold text-red-800">' + cr.liuNianGanZhi + '</p>';
    html += '<p class="text-xs text-gray-400">' + cr.liuNianAge + '岁</p>';
    if (cr.liuNianShiShen) {
      html += '<p class="text-sm text-red-700 font-bold mt-1">' + cr.liuNianShiShen + '年</p>';
    }
    html += '</div>';
    html += '</div>';

    // 白话综合解读
    if (cr.combinedDesc) {
      html += '<div class="bg-amber-50 rounded-lg p-3 border border-amber-200">';
      html += '<p class="text-sm font-bold text-amber-900 mb-1">📖 综合白话解读：</p>';
      html += '<p class="text-sm text-gray-700 leading-relaxed">' + cr.combinedDesc + '</p>';
      html += '</div>';
    }

    // 分别解释
    if (cr.daYunDesc && cr.liuNianDesc) {
      html += '<div class="grid grid-cols-2 gap-2 mt-3">';
      html += '<div class="text-xs text-gray-600">🔵 大运背景：' + cr.daYunDesc + '</div>';
      html += '<div class="text-xs text-gray-600">🔴 今年重点：' + cr.liuNianDesc + '</div>';
      html += '</div>';
    }

    html += '<p class="text-xs text-gray-400 mt-3">💡 以上是大运和流年的白话解读，供参考。实际生活中还需结合自己的具体情况来判断。</p>';
    html += '</div>'; // 卡片6结束
  }

  // ===== 底部复制按钮 =====
  html += '<div class="text-center mt-6">';
  html += '<button onclick="copyBaziResult()" class="text-sm px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors border border-amber-300" title="把排盘结果复制到剪贴板">📋 一键复制排盘结果</button>';
  html += '</div>';

  // ===== 十二长生小贴士 =====
  html += '<div class="result-card mt-4">';
  html += '<details class="text-sm">';
  html += '<summary class="font-bold text-red-800 cursor-pointer">📚 十二长生含义速查（点击展开）</summary>';
  html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">';
  var csKeys = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  for (var ki = 0; ki < csKeys.length; ki++) {
    var key = csKeys[ki];
    html += '<div class="bg-amber-50 rounded-lg p-2">';
    html += '<span class="font-bold text-red-800">' + key + '</span>';
    html += '<br><span class="text-gray-500">' + (CHANG_SHENG_SHORT[key] || '') + '</span>';
    html += '</div>';
  }
  html += '</div>';
  html += '</details>';
  html += '</div>';

  // ===== AI 智能问答入口按钮 =====
  // 用户看完八字结果后，点击这里可以打开 AI 聊天窗口提问
  html += '<div class="text-center mt-4 mb-4" id="qa-entry-section">';
  html += '<button onclick="openQAModal(window.__currentBaziResult)" ';
  html += 'class="px-6 py-3 bg-gradient-to-r from-red-800 to-amber-600 text-white rounded-xl font-bold text-lg ';
  html += 'hover:from-red-700 hover:to-amber-500 transition-all shadow-lg transform hover:scale-105 ';
  html += 'focus:outline-none focus:ring-2 focus:ring-amber-400">';
  html += '🤖 AI 智能问答 — 问我任何关于你八字的问题';
  html += '</button>';
  html += '<p class="text-xs text-gray-400 mt-2">基于 DeepSeek AI，根据你的八字实时生成个性化回答</p>';
  html += '</div>';

  // ===== 免责声明 =====
  html += '<div class="text-center mt-4 mb-4">';
  html += '<p class="text-xs text-gray-400">⚠️ 以上内容仅供传统文化参考与娱乐，请勿作为人生决策依据。</p>';
  html += '<p class="text-xs text-gray-400">算法基于 lunar-javascript 开源库，命理分析参考《渊海子平》《三命通会》等古典文献。</p>';
  html += '</div>';

  // 把所有 HTML 写入容器，并显示出来
  container.innerHTML = html;
  container.classList.remove('hidden');

  // 把当前八字结果存到全局变量，供 AI 问答功能读取
  window.__currentBaziResult = r;

  // 滚动到结果区域
  container.scrollIntoView({ behavior: 'smooth' });
}
