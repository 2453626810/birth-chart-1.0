/**
 * =====================================================
 * 八字 AI 智能问答模块（qa.js）
 * =====================================================
 *
 * 【这个文件是做什么的？】
 * 用户在看完八字排盘结果后，可以点击"AI 智能问答"按钮，
 * 打开一个聊天窗口，向 AI 提问任何关于自己八字的问题。
 * AI 会根据用户的八字数据，实时生成个性化的回答。
 *
 * 【工作原理】
 * 1. 把用户的八字排盘数据整理成一段结构化文本
 * 2. 把这段文本作为"系统提示"发给 DeepSeek API
 * 3. 用户提问时，连同对话历史一起发给 API
 * 4. API 返回 AI 生成的回答，显示在聊天窗口中
 *
 * 【为什么用 DeepSeek？】
 * DeepSeek 中文能力强、价格便宜（约 ¥1/百万字），
 * 而且国内用户可以方便地注册和获取 API Key。
 *
 * 【API Key 怎么存？】
 * 用户自己填写 Key，存在浏览器 localStorage 里，
 * 不会上传到任何服务器，也不会暴露在代码中。
 */

// ============================================================
// 第一部分：配置和常量
// ============================================================

// DeepSeek API 地址（官方接口，兼容 OpenAI 格式）
var DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 使用的模型名称
var DEEPSEEK_MODEL = 'deepseek-chat';

// localStorage 中存储 API Key 的键名
var API_KEY_STORAGE_KEY = 'bazi_deepseek_api_key';

// localStorage 中存储对话历史的键名
var CHAT_HISTORY_STORAGE_KEY = 'bazi_qa_history';

// ============================================================
// 第二部分：推荐问题列表
// ============================================================

/**
 * 推荐问题（标签云）
 * 每类问题配一个 emoji 和 4 个常见问题
 * 用户点击标签就能一键提问，不需要自己打字
 */
var SUGGESTED_QUESTIONS = [
  {
    emoji: '💕',
    label: '婚姻感情',
    questions: [
      '我的另一半是什么样的？',
      '我什么时候能脱单？',
      '我的婚姻会幸福吗？',
      '正缘什么时候出现？'
    ]
  },
  {
    emoji: '💰',
    label: '事业财运',
    questions: [
      '我的财运怎么样？',
      '我适合创业还是打工？',
      '什么时候财运最好？',
      '我该怎么提升财运？'
    ]
  },
  {
    emoji: '🏥',
    label: '健康养生',
    questions: [
      '我需要注意哪些健康问题？',
      '适合我的养生方式是什么？',
      '我容易生什么病？',
      '饮食上有什么建议？'
    ]
  },
  {
    emoji: '🧠',
    label: '性格特点',
    questions: [
      '我是什么性格的人？',
      '我的优缺点是什么？',
      '我适合和什么样的人相处？',
      '我有什么天赋和潜力？'
    ]
  },
  {
    emoji: '🔮',
    label: '流年运势',
    questions: [
      '今年（2026年）运势如何？',
      '明年会更好吗？',
      '什么时候走好运？',
      '最近适合换工作吗？'
    ]
  },
  {
    emoji: '🌿',
    label: '五行补救',
    questions: [
      '我五行缺什么？怎么补？',
      '我的幸运颜色是什么？',
      '适合戴什么饰品？',
      '我的吉利方位在哪里？'
    ]
  }
];

// ============================================================
// 第三部分：API Key 管理
// ============================================================

/**
 * 从 localStorage 读取用户保存的 DeepSeek API Key
 * @returns {string|null} 返回 Key，如果没存过就返回 null
 */
function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (e) {
    // 如果浏览器不支持 localStorage 或隐私模式下被禁用
    return null;
  }
}

/**
 * 把用户的 API Key 保存到 localStorage
 * @param {string} key - DeepSeek API Key
 */
function saveApiKey(key) {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch (e) {
    // 静默失败，不影响使用（只是下次需要重新输入）
  }
}

/**
 * 清除保存的 API Key（切换 Key 时使用）
 */
function clearApiKey() {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (e) {}
}

// ============================================================
// 第四部分：System Prompt 构建
// ============================================================

/**
 * 把八字 result 对象转成 AI 能理解的结构化中文文本
 *
 * 【为什么这样做？】
 * AI 不认识 JavaScript 对象，但它能读懂中文文本。
 * 所以我们把八字数据整理成自然语言，作为"背景知识"发给 AI。
 * 这样 AI 在回答问题时，就能引用用户的具体八字信息了。
 *
 * @param {object} r - calculateBazi() 返回的 result 对象
 * @returns {string} 格式化的中文八字数据文本
 */
function buildSystemPrompt(r) {
  var prompt = '';

  // ═══════════════════════════════════════
  // 第一部分：AI 角色定义和行为规则
  // ═══════════════════════════════════════

  prompt += '【你的身份】\n';
  prompt += '你是一位依据古籍理论的八字命理分析师。你只基于传统命理学中的公认知识来解读八字，';
  prompt += '不编造、不神化、不给出绝对化的断言。\n\n';

  prompt += '【核心规则 —— 必须严格遵守】\n';
  prompt += '1. 所有分析必须基于下面提供的「用户八字数据」中的具体信息。';
  prompt += '回答时要明确指出依据了哪个数据（比如"你的日柱天干是甲木，根据五行理论，甲木之人..."）。\n';
  prompt += '2. 只使用「命理参考知识库」中列出的概念和解释。如果知识库中没有提到某个概念，不要编造。\n';
  prompt += '3. 不要做出绝对化的预测（如"你一定会发财""你明年肯定结婚"），要用"传统上认为""从命理角度来看"等措辞。\n';
  prompt += '4. 不要给出医疗建议、投资建议、法律建议。涉及健康问题时，必须提醒用户去看医生。\n';
  prompt += '5. 如果用户问的问题超出了八字命理的范围（比如问彩票号码、问别人的八字），友好地说明你无法回答。\n';
  prompt += '6. 如果你不确定某个解读是否准确，诚实地说"关于这一点，不同流派看法不一"或"命理对此没有统一说法"。\n';

  prompt += '7. 被问到某项结论的依据时，必须引用下面的知识库或古籍出处，不要回答"我觉得..."。\n';
  prompt += '8. 每一段分析结尾加上一句委婉提醒，如"这只是一家之言，人生还是要靠自己把握"。\n\n';

  prompt += '【回答格式要求】\n';
  prompt += '· 先指出用户八字中的相关数据（如"你的日主是X，配偶宫是Y，财星出现在Z..."）\n';
  prompt += '· 然后解释这些数据在传统命理中的含义\n';
  prompt += '· 最后给出综合解读和生活化建议\n';
  prompt += '· 控制在 200-400 字\n';
  prompt += '· 语气温和、像长辈聊天，适当用生活化的比喻\n\n';

  // ═══════════════════════════════════════
  // 第二部分：命理参考知识库
  // ═══════════════════════════════════════

  prompt += '═══════════════════════════════════════\n';
  prompt += '【命理参考知识库 —— 以下是你必须依据的理论基础】\n';
  prompt += '═══════════════════════════════════════\n\n';

  prompt += '▼ 十天干与五行、阴阳\n';
  prompt += '  甲（阳木）— 参天大树，正直刚强  乙（阴木）— 花草藤蔓，柔韧灵活\n';
  prompt += '  丙（阳火）— 太阳之火，热情奔放  丁（阴火）— 灯烛之火，温和细腻\n';
  prompt += '  戊（阳土）— 城墙之土，厚重诚信  己（阴土）— 田园之土，包容滋养\n';
  prompt += '  庚（阳金）— 斧钺之金，刚毅果断  辛（阴金）— 珠宝之金，精致敏感\n';
  prompt += '  壬（阳水）— 江河之水，奔放豪迈  癸（阴水）— 雨露之水，内敛智慧\n\n';

  prompt += '▼ 十神含义（以日干为"我"）\n';
  prompt += '  正官 — 上司、规则、约束力、责任感。对女命也代表丈夫\n';
  prompt += '  七杀 — 压力、挑战、竞争、魄力。对女命也代表偏缘\n';
  prompt += '  正印 — 学识、长辈、庇护、贵人、文凭\n';
  prompt += '  偏印 — 特殊才能、灵感、玄学天赋、孤独感\n';
  prompt += '  比肩 — 兄弟姐妹、朋友、同事、竞争者、自我意识\n';
  prompt += '  劫财 — 竞争、争夺、被分走的东西、冲动\n';
  prompt += '  食神 — 才华、口福、创造力、温和的表达、享受生活\n';
  prompt += '  伤官 — 才华外露、叛逆、创新、不受约束、锋芒\n';
  prompt += '  正财 — 稳定收入、薪水、积蓄。对男命也代表妻子\n';
  prompt += '  偏财 — 意外之财、投资收益、慷慨大方。对男命也代表情人\n\n';

  prompt += '▼ 五行生克关系\n';
  prompt += '  相生：木生火 → 火生土 → 土生金 → 金生水 → 水生木\n';
  prompt += '  相克：木克土 → 土克水 → 水克火 → 火克金 → 金克木\n\n';

  prompt += '▼ 五行对应身体（中医理论，《黄帝内经》）\n';
  prompt += '  木=肝胆  火=心脏/小肠  土=脾胃  金=肺/大肠  水=肾/膀胱\n\n';

  prompt += '▼ 十二长生（天干在地支的状态，从强到弱）\n';
  prompt += '  长生（新生）→ 沐浴（成长）→ 冠带（成型）→ 临官（当权）→ 帝旺（巅峰）→ 衰（下降）→ 病（衰弱）→ 死（无力）→ 墓（收藏）→ 绝（消失）→ 胎（孕育）→ 养（休养）\n';
  prompt += '  十二长生用来描述十天干在十二地支位置上的"能量状态"。\n\n';

  prompt += '▼ 常见神煞含义\n';
  prompt += '  天乙贵人 — 最大的吉星，遇难有贵人相助\n';
  prompt += '  文昌 — 学业、文化、考试运\n';
  prompt += '  桃花 — 异性缘、人缘、魅力（不一定代表"烂桃花"）\n';
  prompt += '  驿马 — 奔波、走动、迁移、变动\n';
  prompt += '  华盖 — 孤独、清高、有艺术或玄学天赋\n';
  prompt += '  将星 — 领导才能、权力欲望\n';
  prompt += '  禄神 — 福禄、衣食无忧\n';
  prompt += '  羊刃 — 刚烈、冲动，是把双刃剑\n';
  prompt += '  红鸾 — 婚姻吉星，正桃花\n';
  prompt += '  天喜 — 喜事、姻缘之喜\n';
  prompt += '  空亡 — 某柱落空，力量打折扣\n\n';

  prompt += '▼ 六十甲子纳音（部分举例）\n';
  prompt += '  海中金：藏于海底的金子，需要淘洗才能发光 → 大器晚成型\n';
  prompt += '  炉中火：熊熊燃烧的炉火 → 热情似火，多为富贵格局\n';
  prompt += '  大林木：宽广树林中的大树 → 坚韧包容，善于交际\n';
  prompt += '  路旁土：路边的土壤 → 朴实无华，默默发挥作用\n';
  prompt += '  剑锋金：锋利宝剑之金 → 锋芒毕露，果断敢为\n';
  prompt += '  具体纳音含义可查询《三命通会》纳音卷。\n\n';

  prompt += '▼ 古籍出处参考\n';
  prompt += '  十神体系 → 《渊海子平》（宋·徐大升著）、《三命通会》（明·万民英著）\n';
  prompt += '  纳音五行 → 《三命通会·纳音》\n';
  prompt += '  神煞系统 → 《三命通会》《星平会海》\n';
  prompt += '  五行与五脏 → 《黄帝内经》\n';
  prompt += '  滴天髓 → 清·任铁樵著，讲述八字格局高低\n';
  prompt += '  穷通宝鉴 → 明·佚名著，论五行在各月令的喜忌用神\n';

  prompt += '═══════════════════════════════════════\n\n';

  // ═══════════════════════════════════════
  // 第三部分：用户八字数据
  // ═══════════════════════════════════════

  prompt += '═══════════════════════════════════\n';
  prompt += '【用户八字排盘数据】\n';
  prompt += '═══════════════════════════════════\n\n';

  // ===== 1. 四柱八字（核心） =====
  prompt += '▼ 四柱八字排盘\n';
  prompt += '  年柱：' + r.yearPillar + '（天干：' + r.yearPillar[0] + '，地支：' + r.yearPillar[1] + '）';
  if (r.yearHideGan) prompt += ' 藏干：' + r.yearHideGan;
  if (r.yearNaYin) prompt += ' 纳音：' + r.yearNaYin;
  prompt += '\n';

  prompt += '  月柱：' + r.monthPillar + '（天干：' + r.monthPillar[0] + '，地支：' + r.monthPillar[1] + '）';
  if (r.monthHideGan) prompt += ' 藏干：' + r.monthHideGan;
  if (r.monthNaYin) prompt += ' 纳音：' + r.monthNaYin;
  prompt += '\n';

  prompt += '  日柱：' + r.dayPillar + '（天干：' + r.dayPillar[0] + '，地支：' + r.dayPillar[1] + '）← 日主/日干';
  if (r.dayHideGan) prompt += ' 藏干：' + r.dayHideGan;
  if (r.dayNaYin) prompt += ' 纳音：' + r.dayNaYin;
  prompt += '\n';

  prompt += '  时柱：' + r.timePillar + '（天干：' + r.timePillar[0] + '，地支：' + r.timePillar[1] + '）';
  if (r.timeHideGan) prompt += ' 藏干：' + r.timeHideGan;
  if (r.timeNaYin) prompt += ' 纳音：' + r.timeNaYin;
  prompt += '\n\n';

  // ===== 2. 日主信息 =====
  var dayGan = r.dayPillar ? r.dayPillar[0] : '？';
  prompt += '▼ 日主信息\n';
  prompt += '  日主天干（日干）：「' + dayGan + '」— 八字以日干代表命主自己\n';
  if (r.wuxingCount) {
    // 推算日干五行（通过五行统计和日柱来推断）
    var dayElement = '';
    if (r.yongShen && r.yongShen.dayElement) {
      dayElement = r.yongShen.dayElement;
    }
    if (dayElement) {
      prompt += '  日主五行：属' + dayElement + '\n';
    }
  }
  if (r.yongShen && r.yongShen.strength) {
    prompt += '  日主旺衰：' + r.yongShen.strength + '\n';
  }
  prompt += '\n';

  // ===== 3. 十神信息 =====
  prompt += '▼ 十神分析（以日干为"我"）\n';
  var pillarNames = ['年柱', '月柱', '日柱', '时柱'];
  var ganFields = ['yearShiShenGan', 'monthShiShenGan', 'dayShiShenGan', 'timeShiShenGan'];
  var zhiFields = ['yearShiShenZhi', 'monthShiShenZhi', 'dayShiShenZhi', 'timeShiShenZhi'];
  for (var i = 0; i < 4; i++) {
    var ganVal = r[ganFields[i]] || '？';
    var zhiVal = r[zhiFields[i]] || '？';
    prompt += '  ' + pillarNames[i] + '：天干十神=' + ganVal + '，地支十神=' + zhiVal + '\n';
  }
  prompt += '\n';

  // ===== 4. 五行统计 =====
  if (r.wuxingCount) {
    prompt += '▼ 五行统计\n';
    var wc = r.wuxingCount;
    prompt += '  金：' + (wc['金'] || 0) + '个  木：' + (wc['木'] || 0) + '个  水：' + (wc['水'] || 0) + '个';
    prompt += '  火：' + (wc['火'] || 0) + '个  土：' + (wc['土'] || 0) + '个\n\n';
  }

  // ===== 5. 用神 =====
  if (r.yongShen) {
    prompt += '▼ 用神分析\n';
    if (r.yongShen.yongShen && r.yongShen.yongShen.length) {
      prompt += '  喜用神（有利的五行）：' + r.yongShen.yongShen.join('、') + '\n';
    }
    if (r.yongShen.jiShen && r.yongShen.jiShen.length) {
      prompt += '  忌神（不利的五行）：' + r.yongShen.jiShen.join('、') + '\n';
    }
    prompt += '\n';
  }

  // ===== 6. 用神实用建议 =====
  if (r.yongShenGuide) {
    prompt += '▼ 用神实用建议\n';
    if (r.yongShenGuide.color) prompt += '  幸运颜色：' + r.yongShenGuide.color + '\n';
    if (r.yongShenGuide.direction) prompt += '  有利方位：' + r.yongShenGuide.direction + '\n';
    if (r.yongShenGuide.industries) prompt += '  适合行业：' + r.yongShenGuide.industries + '\n';
    if (r.yongShenGuide.tips) prompt += '  建议：' + r.yongShenGuide.tips + '\n';
    prompt += '\n';
  }

  // ===== 7. 大运流年 =====
  if (r.yunStartYear !== undefined) {
    prompt += '▼ 大运流年\n';
    prompt += '  起运年龄：' + r.yunStartYear + '岁';
    if (r.yunStartMonth) prompt += r.yunStartMonth + '个月';
    prompt += '\n';
    if (r.currentReading) {
      if (r.currentReading.currentDaYun) {
        prompt += '  当前大运：' + r.currentReading.currentDaYun + '\n';
      }
      if (r.currentReading.currentDaYunDesc) {
        prompt += '  大运解读：' + r.currentReading.currentDaYunDesc + '\n';
      }
      if (r.currentReading.currentLiuNian) {
        prompt += '  今年（2026年）流年：' + r.currentReading.currentLiuNian + '\n';
      }
      if (r.currentReading.currentLiuNianDesc) {
        prompt += '  流年解读：' + r.currentReading.currentLiuNianDesc + '\n';
      }
    }
    prompt += '\n';
  }

  // ===== 8. 婚姻感情 =====
  if (r.marriage) {
    prompt += '▼ 婚姻感情分析\n';
    if (r.marriage.spousePalaceDesc) {
      prompt += '  配偶宫：' + r.marriage.spousePalaceDesc + '\n';
    }
    if (r.marriage.spouseStarDesc) {
      prompt += '  配偶星：' + r.marriage.spouseStarDesc + '\n';
    }
    if (r.marriage.marriageAdvice) {
      prompt += '  婚姻建议：' + r.marriage.marriageAdvice + '\n';
    }
    prompt += '\n';
  }

  // ===== 9. 财运 =====
  if (r.wealth) {
    prompt += '▼ 财运分析\n';
    if (r.wealth.wealthDesc) {
      prompt += '  ' + r.wealth.wealthDesc + '\n';
    }
    if (r.wealth.wealthAdvice) {
      prompt += '  建议：' + r.wealth.wealthAdvice + '\n';
    }
    prompt += '\n';
  }

  // ===== 10. 健康 =====
  if (r.health) {
    prompt += '▼ 健康分析\n';
    if (r.health.summary) {
      prompt += '  ' + r.health.summary + '\n';
    }
    if (r.health.warnings && r.health.warnings.length > 0) {
      for (var hi = 0; hi < r.health.warnings.length; hi++) {
        prompt += '  注意：' + r.health.warnings[hi] + '\n';
      }
    }
    prompt += '\n';
  }

  // ===== 11. 性格 =====
  if (r.personality) {
    prompt += '▼ 性格特点\n';
    if (r.personality.summary) {
      prompt += '  ' + r.personality.summary + '\n';
    }
    if (r.personality.strengthNote) {
      prompt += '  ' + r.personality.strengthNote + '\n';
    }
    prompt += '\n';
  }

  // ===== 12. 神煞 =====
  if (r.shenSha) {
    // 把神煞对象转成可读文本
    var ssText = '';
    var ssKeys = ['yearShenSha', 'monthShenSha', 'dayShenSha', 'timeShenSha'];
    var ssLabels = ['年柱', '月柱', '日柱', '时柱'];
    var hasShenSha = false;
    for (var si = 0; si < 4; si++) {
      var ssData = r.shenSha[ssKeys[si]];
      if (ssData && ssData.length > 0) {
        if (!hasShenSha) {
          prompt += '▼ 神煞（吉星和凶星）\n';
          hasShenSha = true;
        }
        var ssNames = [];
        for (var sj = 0; sj < ssData.length; sj++) {
          ssNames.push(ssData[sj].name || ssData[sj]);
        }
        prompt += '  ' + ssLabels[si] + '：' + ssNames.join('、') + '\n';
      }
    }
    if (hasShenSha) prompt += '\n';
  }

  // ===== 13. 命宫/胎元/身宫 =====
  if (r.mingGong || r.taiYuan || r.shenGong) {
    prompt += '▼ 命宫/胎元/身宫\n';
    if (r.mingGong) prompt += '  命宫：' + r.mingGong + '\n';
    if (r.taiYuan) prompt += '  胎元：' + r.taiYuan + '\n';
    if (r.shenGong) prompt += '  身宫：' + r.shenGong + '\n';
    prompt += '\n';
  }

  // ===== 公历和农历日期 =====
  if (r.solarDate) {
    prompt += '▼ 出生日期\n';
    prompt += '  公历（阳历）：' + r.solarDate + '\n';
    if (r.lunarDate) prompt += '  农历（阴历）：' + r.lunarDate + '\n';
    prompt += '\n';
  }

  prompt += '═══════════════════════════════════════\n';
  prompt += '【重要提醒 —— 回答前请检查】\n';
  prompt += '═══════════════════════════════════════\n';
  prompt += '1. 你的回答是否引用了上面「用户八字数据」中的具体信息？如果没有，重新写。\n';
  prompt += '2. 你使用的每个命理概念，是否都在「参考知识库」中有定义？如果知识库中没有，不要编造，诚实说明。\n';
  prompt += '3. 你是否使用了绝对化措辞（"一定""肯定""绝对不会"）？如果有，改成"传统上认为""从命理角度看"。\n';
  prompt += '4. 你是否给出了医疗/投资/法律建议？如果有，删除这些内容。\n';
  prompt += '5. 你的回答末尾是否包含了"以上分析仅供传统文化参考，人生终究要靠自己把握"之类的提醒？如果没有，加上。\n';
  prompt += '6. 回答中涉及古籍概念时，尽量标注出处（如"《渊海子平》中认为..."）。\n\n';
  prompt += '现在请基于以上所有信息，认真回答用户的问题。';

  return prompt;
}

// ============================================================
// 第五部分：DeepSeek API 调用
// ============================================================

/**
 * 调用 DeepSeek API，发送对话历史，获取 AI 回复
 *
 * 【参数说明】
 * @param {Array} messages - 对话消息数组
 *   格式：[{role: 'system', content: '...'}, {role: 'user', content: '...'}, ...]
 *   role 有三种：'system'（系统指令）、'user'（用户消息）、'assistant'（AI 回答）
 *
 * 【返回值】
 * @returns {Promise<string>} AI 的回复文字
 *
 * 【出错怎么办？】
 * 网络不通、API Key 无效、API 服务器故障等都会返回错误提示
 */
function callDeepSeekAPI(messages) {
  var apiKey = getApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('请先设置 API Key'));
  }

  // 用 fetch 发 HTTP 请求（所有现代浏览器都支持）
  return fetch(DEEPSEEK_API_URL, {
    method: 'POST',  // POST 方式发送数据
    headers: {
      'Content-Type': 'application/json',  // 告诉服务器：我发的是 JSON 格式
      'Authorization': 'Bearer ' + apiKey  // 把 API Key 放在请求头里验证身份
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: messages,
      temperature: 0.3,     // 温度 0.3：让回答更严谨、减少编造（越低越保守，越高越有创意）
      max_tokens: 800,      // 最多返回 800 个 token（约 500-600 个汉字）
      stream: false         // 不用流式输出（简单起见，等完整结果再显示）
    })
  })
  .then(function(response) {
    // 第一步：检查 HTTP 状态码
    if (!response.ok) {
      // 把错误响应也解析出来，看看具体是什么问题
      return response.json().then(function(errData) {
        var errMsg = errData.error && errData.error.message
          ? errData.error.message
          : ('HTTP ' + response.status + ' ' + response.statusText);
        throw new Error('API 请求失败：' + errMsg);
      }).catch(function(parseErr) {
        // 如果连错误信息都解析不了，就返回状态码
        throw new Error('API 请求失败（HTTP ' + response.status + '），请检查网络或 API Key 是否正确');
      });
    }
    // 成功：解析 JSON 响应
    return response.json();
  })
  .then(function(data) {
    // 第二步：从返回数据中提取 AI 的回复文字
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    throw new Error('API 返回了空回答，请稍后重试');
  });
}

// ============================================================
// 第六部分：对话管理
// ============================================================

// 全局对话历史（在弹窗生命周期内保持，支持多轮对话）
var conversationHistory = [];

// 当前排盘的八字结果（保存对话时用它判断是否属于同一个盘）
var currentResult = null;

// ============================================================
// 对话历史持久化（退出对话后保留记录）
// ============================================================

/**
 * 根据八字结果生成唯一标识（四柱拼接）
 * 用于判断保存的对话是否属于当前这个八字盘
 */
function getBaziKey(result) {
  return (result.yearPillar || '') + '|' + (result.monthPillar || '') + '|'
    + (result.dayPillar || '') + '|' + (result.timePillar || '');
}

/**
 * 保存对话历史到 localStorage（只存 user/assistant 消息，system 每次重新生成）
 */
function saveConversationHistory(result) {
  if (!result) return;
  try {
    var data = {
      baziKey: getBaziKey(result),
      messages: conversationHistory.filter(function (m) { return m.role !== 'system'; })
    };
    localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage 不可用时静默失败，不影响使用
  }
}

/**
 * 读取之前保存的对话历史
 * @returns {Array|null} 若没有记录、或八字不匹配，返回 null
 */
function loadConversationHistory(result) {
  if (!result) return null;
  try {
    var raw = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (data.baziKey !== getBaziKey(result)) return null;
    if (!data.messages || !data.messages.length) return null;
    return data.messages;
  } catch (e) {
    return null;
  }
}

/**
 * 清除保存的对话历史
 */
function clearSavedConversation() {
  try {
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
  } catch (e) {}
}

/**
 * 初始化对话历史
 * 第一条消息是 system 角色，包含用户的八字数据
 * 这样 AI 就知道自己在跟谁聊天、对方的八字是什么
 *
 * @param {object} result - 八字 result 对象
 */
function initConversation(result) {
  var systemPrompt = buildSystemPrompt(result);
  conversationHistory = [
    { role: 'system', content: systemPrompt }
  ];
}

/**
 * 向对话历史中添加一条消息
 * @param {string} role - 'user' 或 'assistant'
 * @param {string} content - 消息内容
 */
function addMessage(role, content) {
  conversationHistory.push({ role: role, content: content });
}

/**
 * 获取当前的对话历史（用于传给 API）
 * @returns {Array} 对话消息数组
 */
function getConversationHistory() {
  return conversationHistory;
}

// ============================================================
// 第七部分：UI —— 对话弹窗
// ============================================================

/**
 * 打开 AI 问答弹窗（入口函数）
 *
 * 【调用时机】
 * 用户在八字结果页点击"🤖 AI 智能问答"按钮时触发
 *
 * @param {object} result - 八字 calculateBazi() 的结果对象
 */
function openQAModal(result) {
  // 安全检查：如果没有八字数据就提示
  if (!result || !result.dayPillar) {
    alert('请先排八字盘再提问哦~');
    return;
  }

  // 记录当前八字结果（保存/恢复对话历史时用）
  currentResult = result;

  // 初始化对话（把八字数据作为 AI 的背景知识）
  initConversation(result);

  // 恢复之前保存的对话历史（如果属于同一个八字盘）
  var savedMessages = loadConversationHistory(result);
  if (savedMessages) {
    for (var smi = 0; smi < savedMessages.length; smi++) {
      conversationHistory.push(savedMessages[smi]);
    }
  }

  // 创建弹窗遮罩
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay qa-modal-overlay';

  // 构建弹窗内容
  overlay.innerHTML = renderQAModal();

  // 把弹窗添加到页面 body 中
  document.body.appendChild(overlay);

  // 点击遮罩（弹窗外部）关闭
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      closeQAModal();
    }
  });

  // 绑定输入框回车发送事件
  setTimeout(function() {
    var inputEl = document.getElementById('qa-input');
    if (inputEl) {
      inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSend();
        }
      });
      // 自动聚焦输入框
      inputEl.focus();
    }

    // 绑定发送按钮
    var sendBtn = document.getElementById('qa-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', handleSend);
    }

    // 绑定 API Key 保存按钮
    var saveKeyBtn = document.getElementById('qa-save-key-btn');
    if (saveKeyBtn) {
      saveKeyBtn.addEventListener('click', handleSaveApiKey);
    }

    // 绑定推荐问题标签的点击事件
    bindTagEvents();
  }, 100);
}

/**
 * 关闭 AI 问答弹窗
 * 直接从 DOM 中移除弹窗元素
 */
function closeQAModal() {
  var overlay = document.querySelector('.qa-modal-overlay');
  if (overlay) {
    overlay.remove();
  }
  // 记录已通过 saveConversationHistory 持久化到 localStorage
  // 这里清空内存中的历史，下次打开时会重新初始化并从 localStorage 恢复
  conversationHistory = [];
}

/**
 * 渲染弹窗的完整 HTML 结构
 *
 * 【布局】
 * ┌──────────────────────────────┐
 * │ 🤖 八字 AI 智能问答    [✕]  │  ← 标题栏
 * ├──────────────────────────────┤
 * │ [API Key 设置区]（首次使用）  │  ← 如果没有 Key 则显示
 * ├──────────────────────────────┤
 * │ 💕 推荐问题标签云            │  ← 点击即问
 * ├──────────────────────────────┤
 * │ [对话消息区]                 │  ← 用户气泡 + AI 气泡
 * ├──────────────────────────────┤
 * │ [输入框]          [发送]     │  ← 底部输入栏
 * └──────────────────────────────┘
 */
function renderQAModal() {
  var html = '';
  var hasKey = !!getApiKey();

  // ===== 弹窗容器（复用现有样式 + QA 特有样式） =====
  html += '<div class="modal-content qa-modal-content" onclick="event.stopPropagation()">';

  // ===== 标题栏 =====
  html += '<div class="qa-header">';
  html += '<h2 class="qa-title">🤖 八字 AI 智能问答</h2>';
  html += '<p class="qa-subtitle">基于你的八字数据，AI 实时为你解答疑问</p>';
  html += '<button class="qa-close-btn" onclick="closeQAModal()" title="关闭">✕</button>';
  html += '</div>';

  // ===== API Key 设置区（没 Key 时显示） =====
  if (!hasKey) {
    html += '<div class="qa-apikey-section" id="qa-apikey-section">';
    html += '<div class="qa-apikey-inner">';
    html += '<p class="qa-apikey-label">🔑 请输入你的 DeepSeek API Key（免费注册获取）：</p>';
    html += '<p class="qa-apikey-hint">';
    html += '去 <a href="https://platform.deepseek.com/api_keys" target="_blank" class="qa-link">platform.deepseek.com</a> ';
    html += '注册账号 → 创建 API Key → 复制粘贴到这里<br>';
    html += '<small>Key 只保存在你的浏览器中，不会上传到任何服务器</small>';
    html += '</p>';
    html += '<div class="qa-apikey-row">';
    html += '<input type="password" id="qa-apikey-input" class="qa-apikey-input" placeholder="sk-xxxxxxxxxxxxxxxx">';
    html += '<button id="qa-save-key-btn" class="qa-apikey-btn">保存并开始提问</button>';
    html += '</div>';
    html += '<p class="qa-apikey-error" id="qa-apikey-error" style="display:none;"></p>';
    html += '</div>';
    html += '</div>';
  }

  // ===== 推荐问题区 =====
  html += '<div class="qa-tags-section" id="qa-tags-section">';
  html += '<p class="qa-tags-label">👇 点击下方问题，快速提问：</p>';
  html += '<div class="qa-tags-cloud">';

  // 遍历所有推荐问题，生成标签
  for (var gi = 0; gi < SUGGESTED_QUESTIONS.length; gi++) {
    var group = SUGGESTED_QUESTIONS[gi];
    for (var qi = 0; qi < group.questions.length; qi++) {
      var tagLabel = group.emoji + ' ' + group.questions[qi];
      // 用 data-question 属性存储问题文本，点击时读取
      html += '<span class="qa-tag" data-question="' + escapeHtml(group.questions[qi]) + '">';
      html += tagLabel;
      html += '</span>';
    }
  }

  html += '</div>';
  html += '</div>';

  // ===== 对话消息区 =====
  html += '<div class="qa-chat-area" id="qa-chat-area">';
  // 渲染历史消息；没有历史则显示欢迎消息
  var chatMessages = conversationHistory.filter(function (m) { return m.role !== 'system'; });
  if (chatMessages.length > 0) {
    for (var mi = 0; mi < chatMessages.length; mi++) {
      var msg = chatMessages[mi];
      if (msg.role === 'user') {
        html += '<div class="qa-bubble qa-bubble-user">' + escapeHtml(msg.content) + '</div>';
      } else {
        html += '<div class="qa-bubble qa-bubble-bot">' + msg.content.replace(/\n/g, '<br>') + '</div>';
      }
    }
  } else {
    // 欢迎消息
    html += '<div class="qa-bubble qa-bubble-bot qa-welcome">';
    html += '你好！我是你的八字 AI 咨询师 🤗<br><br>';
    html += '我已经了解了你的八字命盘，有什么想了解的吗？<br>';
    html += '可以问我婚姻感情、事业财运、健康养生、性格特点、流年运势、五行补救等方面的问题～';
    html += '</div>';
  }
  html += '</div>';

  // ===== 加载动画（默认隐藏） =====
  html += '<div class="qa-loading" id="qa-loading" style="display:none;">';
  html += '<span class="qa-loading-text">AI 正在思考</span>';
  html += '<span class="qa-loading-dots">';
  html += '<span>.</span><span>.</span><span>.</span>';
  html += '</span>';
  html += '</div>';

  // ===== 底部输入区 =====
  html += '<div class="qa-input-row">';
  html += '<input type="text" id="qa-input" class="qa-input" ';
  if (!hasKey) html += 'disabled ';
  html += 'placeholder="输入你的问题...（Enter 发送）">';
  html += '<button id="qa-send-btn" class="qa-send-btn"';
  if (!hasKey) html += ' disabled';
  html += '>发送</button>';
  html += '</div>';

  // ===== 切换/清除 Key 链接 =====
  html += '<div class="qa-footer-links">';
  if (hasKey) {
    html += '<a href="javascript:void(0)" onclick="handleChangeApiKey()" class="qa-footer-link">🔄 更换 API Key</a>';
  }
  html += '<a href="javascript:void(0)" onclick="handleClearChat()" class="qa-footer-link">🗑️ 清空对话</a>';
  html += '<span class="qa-footer-disclaimer">以上内容仅供参考与娱乐</span>';
  html += '</div>';

  html += '</div>'; // 结束 .modal-content

  return html;
}

/**
 * HTML 转义（防止 XSS 攻击）
 * 把用户输入中的特殊字符转成安全的 HTML 实体
 */
function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ============================================================
// 第八部分：UI 交互处理
// ============================================================

/**
 * 保存 API Key 按钮的点击处理
 */
function handleSaveApiKey() {
  var inputEl = document.getElementById('qa-apikey-input');
  var errorEl = document.getElementById('qa-apikey-error');
  var key = inputEl ? inputEl.value.trim() : '';

  // 验证：Key 不能为空
  if (!key) {
    if (errorEl) {
      errorEl.textContent = '请输入 API Key';
      errorEl.style.display = 'block';
    }
    return;
  }

  // 验证：Key 基本格式（DeepSeek 的 Key 以 sk- 开头）
  if (key.indexOf('sk-') !== 0) {
    if (errorEl) {
      errorEl.textContent = 'API Key 格式不正确，应该以 "sk-" 开头，请检查后重新输入';
      errorEl.style.display = 'block';
    }
    return;
  }

  // 保存 Key
  saveApiKey(key);

  // 隐藏错误提示
  if (errorEl) {
    errorEl.style.display = 'none';
  }

  // 刷新弹窗（隐藏 Key 输入区，启用输入框）
  refreshQAModal();
}

/**
 * 处理发送消息
 * 这是核心交互：用户输入 → 调 API → 显示回答
 */
function handleSend() {
  var inputEl = document.getElementById('qa-input');
  if (!inputEl) return;

  var userInput = inputEl.value.trim();
  if (!userInput) return;  // 空消息不发送

  // 检查 API Key
  if (!getApiKey()) {
    alert('请先设置 API Key');
    return;
  }

  // 1. 显示用户消息
  addUserMessage(userInput);
  addMessage('user', userInput);
  saveConversationHistory(currentResult);  // 立即保存，防止刷新丢失

  // 2. 清空输入框
  inputEl.value = '';

  // 3. 禁用发送按钮和输入框（防止重复发送）
  setInputEnabled(false);

  // 4. 显示加载动画
  showLoading(true);

  // 5. 调用 API
  callDeepSeekAPI(getConversationHistory())
    .then(function(reply) {
      // 成功：隐藏加载，显示 AI 回答
      showLoading(false);
      addBotMessage(reply);
      addMessage('assistant', reply);
      saveConversationHistory(currentResult);  // 保存 AI 回复
      // 上报问答记录到后端（问题 + 回答）
      reportRecord({ type: 'qa', question: userInput, answer: reply });
      setInputEnabled(true);
      inputEl.focus();
    })
    .catch(function(error) {
      // 失败：隐藏加载，显示错误
      showLoading(false);
      addBotMessage('😅 抱歉，出了点小问题：' + error.message + '\n\n请检查：\n1. API Key 是否正确\n2. 网络连接是否正常\n3. DeepSeek 账户余额是否充足');
      setInputEnabled(true);
    });
}

/**
 * 在对话区添加一条用户消息气泡
 * @param {string} text - 用户输入的文字
 */
function addUserMessage(text) {
  var chatArea = document.getElementById('qa-chat-area');
  if (!chatArea) return;

  var bubble = document.createElement('div');
  bubble.className = 'qa-bubble qa-bubble-user';
  bubble.textContent = text;
  chatArea.appendChild(bubble);

  // 滚动到底部
  scrollChatToBottom();
}

/**
 * 在对话区添加一条 AI 回答气泡
 * @param {string} text - AI 返回的文字
 */
function addBotMessage(text) {
  var chatArea = document.getElementById('qa-chat-area');
  if (!chatArea) return;

  var bubble = document.createElement('div');
  bubble.className = 'qa-bubble qa-bubble-bot';

  // 把换行符转成 <br> 标签，方便显示
  var formattedText = text.replace(/\n/g, '<br>');
  bubble.innerHTML = formattedText;

  chatArea.appendChild(bubble);

  // 滚动到底部
  scrollChatToBottom();
}

/**
 * 显示/隐藏加载动画
 * @param {boolean} show - true 显示，false 隐藏
 */
function showLoading(show) {
  var loadingEl = document.getElementById('qa-loading');
  if (loadingEl) {
    loadingEl.style.display = show ? 'flex' : 'none';
  }
}

/**
 * 启用/禁用输入框和发送按钮
 * @param {boolean} enabled - true 启用，false 禁用
 */
function setInputEnabled(enabled) {
  var inputEl = document.getElementById('qa-input');
  var sendBtn = document.getElementById('qa-send-btn');
  if (inputEl) inputEl.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

/**
 * 把对话区滚动到最底部（新消息出现时自动滚动）
 */
function scrollChatToBottom() {
  var chatArea = document.getElementById('qa-chat-area');
  if (chatArea) {
    // 用 setTimeout 确保 DOM 更新后再滚动
    setTimeout(function() {
      chatArea.scrollTop = chatArea.scrollHeight;
    }, 50);
  }
}

/**
 * 绑定推荐问题标签的点击事件
 */
function bindTagEvents() {
  var tags = document.querySelectorAll('.qa-tag');
  for (var i = 0; i < tags.length; i++) {
    tags[i].addEventListener('click', function() {
      var question = this.getAttribute('data-question');
      if (!question) return;

      // 检查 API Key
      if (!getApiKey()) {
        alert('请先设置 API Key');
        return;
      }

      // 把问题填入输入框并发送
      var inputEl = document.getElementById('qa-input');
      if (inputEl) {
        inputEl.value = question;
      }
      handleSend();
    });
  }
}

/**
 * 刷新弹窗内容（保存 Key 后需要重新渲染）
 * 用 innerHTML 替换整个弹窗内容，重新绑定事件
 */
function refreshQAModal() {
  var overlay = document.querySelector('.qa-modal-overlay');
  if (!overlay) return;

  // 重新生成弹窗内容
  var contentEl = overlay.querySelector('.modal-content');
  if (contentEl) {
    // 先保存需要的信息
    contentEl.innerHTML = '';

    // 重新渲染（新的 HTML）
    var newHtml = renderQAModal();
    // 用临时容器解析 HTML
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = newHtml;
    var newContent = tempDiv.querySelector('.modal-content');
    if (newContent) {
      // 复制新内容的所有子元素
      while (newContent.firstChild) {
        contentEl.appendChild(newContent.firstChild);
      }
    }
  }

  // 重新绑定事件
  setTimeout(function() {
    var inputEl = document.getElementById('qa-input');
    if (inputEl) {
      inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSend();
        }
      });
      inputEl.focus();
    }

    var sendBtn = document.getElementById('qa-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', handleSend);
    }

    var saveKeyBtn = document.getElementById('qa-save-key-btn');
    if (saveKeyBtn) {
      saveKeyBtn.addEventListener('click', handleSaveApiKey);
    }

    bindTagEvents();
  }, 100);
}

/**
 * 更换 API Key
 * 清除旧 Key 并刷新弹窗，显示 Key 输入框
 */
function handleChangeApiKey() {
  clearApiKey();
  refreshQAModal();
}

/**
 * 清空对话历史
 * 清除 localStorage 中的记录，并清空当前对话重新开始
 */
function handleClearChat() {
  clearSavedConversation();
  if (currentResult) {
    initConversation(currentResult);  // 重新初始化，只保留 system 消息
  } else {
    conversationHistory = [];
  }
  refreshQAModal();
}
