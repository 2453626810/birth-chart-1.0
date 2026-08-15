/**
 * gemini.js — 手相/面相拍照分析模块
 * =====================================================
 *
 * 【这个文件是做什么的？】
 * 用户在「手相」「面相」页面点击"📷 拍照分析"按钮，
 * 拍照或上传手掌/面部照片，AI 看图后给出命理分析。
 *
 * 【为什么文件名叫 gemini.js 但用的是智谱？】
 * 最初计划用 Google Gemini，但国内无法注册 Gemini key，
 * 因此改用了国产的智谱 GLM 多模态模型（glm-4v-flash，免费额度）。
 * 文件名保留 gemini.js 是为了不折腾已有的页面引用。
 *
 * 【API Key 怎么存？】
 * 用户自己填写智谱 API Key，存在浏览器 localStorage 里，
 * 不会上传到任何第三方服务器（只用于调智谱官方接口）。
 */

// ============================================================
// 第一部分：配置
// ============================================================

// 智谱 AI 开放平台的多模态接口地址（OpenAI 兼容格式）
var GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 使用的模型：glm-4v-flash 是免费的多模态（支持看图）模型
// 若不可用可换 glm-4v-plus 或 glm-4v
var GLM_MODEL = 'glm-4v-flash';

// localStorage 中存储智谱 API Key 的键名
var GLM_KEY_STORAGE = 'bazi_glm_api_key';

// 当前正在分析的类型：'palm'（手相）或 'face'（面相）
var currentAnalysisType = null;

// ============================================================
// 第二部分：API Key 管理
// ============================================================

/**
 * 从 localStorage 读取用户保存的智谱 API Key
 * @returns {string|null} 返回 Key，没存过就返回 null
 */
function getGlmKey() {
  try {
    return localStorage.getItem(GLM_KEY_STORAGE);
  } catch (e) {
    return null;
  }
}

/**
 * 保存智谱 API Key 到 localStorage
 * @param {string} key - 智谱 API Key
 */
function saveGlmKey(key) {
  try {
    localStorage.setItem(GLM_KEY_STORAGE, key);
  } catch (e) {
    // 静默失败，不影响使用
  }
}

// ============================================================
// 第三部分：拍照分析入口
// ============================================================

/**
 * 开始拍照分析（手相或面相的入口函数）
 * 由 index.html 中的按钮 onclick 触发
 *
 * @param {string} type - 'palm' 手相 或 'face' 面相
 */
function startAnalysis(type) {
  currentAnalysisType = type;

  // 没有 Key 就先让用户填写
  if (!getGlmKey()) {
    showGlmKeyModal();
    return;
  }

  // 有 Key 就触发文件选择（手机上 capture 会直接调起相机）
  triggerFileInput();
}

/**
 * 触发文件选择框（手机拍照 / 相册上传）
 */
function triggerFileInput() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  // capture 属性：在手机上会优先调起相机，桌面端则正常打开文件选择
  input.setAttribute('capture', 'environment');
  input.onchange = function () {
    if (input.files && input.files[0]) {
      handleImage(input.files[0]);
    }
  };
  input.click();
}

// ============================================================
// 第四部分：图片处理与 API 调用
// ============================================================

/**
 * 处理用户选择的图片：转 base64 → 调智谱 GLM → 显示结果
 * @param {File} file - 用户选择的图片文件
 */
function handleImage(file) {
  // 显示加载中弹窗
  showAnalysisLoading();

  // 用 FileReader 把图片读成 base64
  var reader = new FileReader();
  reader.onload = function () {
    var dataUrl = reader.result;         // 形如 "data:image/jpeg;base64,xxxx"
    var mimeType = file.type || 'image/jpeg';
    var base64 = dataUrl.split(',')[1];  // 去掉前缀，只保留 base64 数据

    callGlm(dataUrl, mimeType, function (text) {
      showAnalysisResult(text);
    }, function (err) {
      showAnalysisResult('😅 分析失败：' + err.message + '\n\n请检查：\n1. 智谱 API Key 是否正确\n2. 网络是否正常');
    });
  };
  reader.readAsDataURL(file);
}

/**
 * 调用智谱 GLM 多模态接口，发送图片 + 分析提示，获取返回文字
 *
 * @param {string} dataUrl - 图片的完整 data URL（含 data:image/...;base64, 前缀）
 * @param {string} mimeType - 图片 MIME 类型，如 "image/jpeg"
 * @param {Function} onSuccess - 成功回调，参数为分析文字
 * @param {Function} onError - 失败回调，参数为 Error 对象
 */
function callGlm(dataUrl, mimeType, onSuccess, onError) {
  var key = getGlmKey();

  fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key  // 智谱用 Bearer 方式认证
    },
    body: JSON.stringify({
      model: GLM_MODEL,
      messages: [
        {
          role: 'user',
          // 智谱的图片输入：content 是数组，text + image_url 两个元素
          content: [
            { type: 'text', text: buildAnalysisPrompt() },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ]
    })
  })
  .then(function (response) {
    // 先检查 HTTP 状态码，出错时尽量把错误信息解析出来
    if (!response.ok) {
      return response.json().then(function (errData) {
        var msg = errData.error && errData.error.message
          ? errData.error.message
          : ('HTTP ' + response.status);
        throw new Error(msg);
      }).catch(function (parseErr) {
        throw new Error('HTTP ' + response.status + '，请检查 Key 或网络');
      });
    }
    return response.json();
  })
  .then(function (data) {
    // 智谱返回格式：data.choices[0].message.content 是分析文字
    var content = data.choices && data.choices[0]
      && data.choices[0].message && data.choices[0].message.content;
    if (content) {
      onSuccess(typeof content === 'string' ? content : JSON.stringify(content));
    } else {
      onError(new Error('智谱返回为空'));
    }
  })
  .catch(function (e) {
    onError(e);
  });
}

// ============================================================
// 第五部分：分析提示词（Prompt）
// ============================================================

/**
 * 根据当前分析类型（手相/面相）构建发给 AI 的提示词
 * 让 AI 扮演命理分析师，按网站知识体系来解读照片
 *
 * @returns {string} 完整的提示词
 */
function buildAnalysisPrompt() {
  if (currentAnalysisType === 'face') {
    return [
      '你是一位资深面相分析师。请看这张面部照片，基于传统面相学进行解读。',
      '',
      '请从以下方面分析（照片中能看清的部分）：',
      '1. 三停：上停（额头，15-30岁）、中停（眉眼鼻，31-50岁）、下停（口下巴，51岁以后）是否匀称',
      '2. 五官：眉（保寿官）、眼（监察官）、鼻（审辨官）、口（出纳官）、耳（采听官）的形态',
      '3. 重点部位：印堂（两眉间）、颧骨、人中、法令纹、下巴（地阁）',
      '',
      '要求：',
      '- 用白话、温和的语气，像长辈聊天，适当用生活化比喻',
      '- 不做绝对化断言，用「传统上认为」「从面相看」等措辞',
      '- 涉及健康时提醒对方看医生',
      '- 控制在 200-400 字',
      '- 末尾加一句「以上分析仅供参考，人生终究要靠自己把握」'
    ].join('\n');
  }

  // 默认手相
  return [
    '你是一位资深手相分析师。请看这张手掌照片，基于传统手相学进行解读。',
    '',
    '请从以下方面分析（照片中能看清的部分）：',
    '1. 三大主线：生命线（生命力健康）、智慧线（思维方式）、感情线（感情态度）的深浅长短走向',
    '2. 次要线：命运线（事业线）、婚姻线、太阳线（成功线）是否明显',
    '3. 掌丘：金星丘、木星丘、土星丘、太阳丘、水星丘、火星丘、太阴丘的饱满程度',
    '4. 五指：拇指（意志力）、食指（进取心）、中指（责任感）、无名指（艺术感）、小指（表达力）',
    '',
    '要求：',
    '- 用白话、温和的语气，像长辈聊天，适当用生活化比喻',
    '- 不做绝对化断言，用「传统上认为」「从手相看」等措辞',
    '- 涉及健康时提醒对方看医生',
    '- 控制在 200-400 字',
    '- 末尾加一句「以上分析仅供参考，人生终究要靠自己把握」'
  ].join('\n');
}

// ============================================================
// 第六部分：UI —— Key 输入弹窗 / 加载 / 结果
// ============================================================

/**
 * 显示智谱 Key 输入弹窗（首次使用、没有 Key 时）
 */
function showGlmKeyModal() {
  var typeName = currentAnalysisType === 'face' ? '面相' : '手相';
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay gemini-overlay';
  overlay.innerHTML =
    '<div class="modal-content gemini-content" onclick="event.stopPropagation()">'
    + '<button class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold" onclick="closeGeminiModal()">&times;</button>'
    + '<h3 class="text-lg font-bold text-red-800 mb-2">🔑 设置智谱 API Key</h3>'
    + '<p class="text-sm text-gray-600 mb-3">进行「' + typeName + '拍照分析」需要智谱 AI 的接口，请先免费注册获取 Key。</p>'
    + '<p class="text-sm text-gray-600 mb-3">获取步骤：打开 <a href="https://open.bigmodel.cn" target="_blank" class="text-blue-600 underline">open.bigmodel.cn</a> → 手机号注册登录 → 控制台「API Keys」→ 创建 API Key → 复制粘贴到这里</p>'
    + '<div class="flex gap-2 mb-2">'
    + '<input type="password" id="gemini-key-input" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="智谱 API Key（形如 xxxx.xxxx）">'
    + '<button id="gemini-key-save" class="bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-red-800">保存</button>'
    + '</div>'
    + '<p class="text-xs text-red-600 hidden" id="gemini-key-error"></p>'
    + '<p class="text-xs text-gray-400 mt-2">Key 只保存在你的浏览器本地，不会上传到任何第三方。</p>'
    + '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeGeminiModal();
  });

  // 绑定保存按钮
  setTimeout(function () {
    var saveBtn = document.getElementById('gemini-key-save');
    var inputEl = document.getElementById('gemini-key-input');
    if (saveBtn && inputEl) {
      saveBtn.addEventListener('click', function () {
        var key = inputEl.value.trim();
        var errEl = document.getElementById('gemini-key-error');
        if (!key) {
          if (errEl) { errEl.textContent = '请输入 API Key'; errEl.classList.remove('hidden'); }
          return;
        }
        saveGlmKey(key);
        closeGeminiModal();
        triggerFileInput();  // 保存后直接触发拍照
      });
      inputEl.focus();
    }
  }, 100);
}

/**
 * 关闭分析相关弹窗
 */
function closeGeminiModal() {
  var overlay = document.querySelector('.gemini-overlay');
  if (overlay) overlay.remove();
}

/**
 * 显示加载中弹窗
 */
function showAnalysisLoading() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay gemini-overlay';
  overlay.innerHTML =
    '<div class="modal-content gemini-content text-center">'
    + '<div class="loading-spinner mx-auto mb-4"></div>'
    + '<p class="text-gray-600 text-sm">AI 正在分析照片，请稍候…</p>'
    + '</div>';
  document.body.appendChild(overlay);
}

/**
 * 显示分析结果弹窗
 * @param {string} text - AI 返回的分析文字
 */
function showAnalysisResult(text) {
  // 先关闭加载中的弹窗
  closeGeminiModal();

  var typeName = currentAnalysisType === 'face' ? '面相' : '手相';
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay gemini-overlay';
  overlay.innerHTML =
    '<div class="modal-content gemini-content">'
    + '<button class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold" onclick="closeGeminiModal()">&times;</button>'
    + '<h3 class="text-lg font-bold text-red-800 mb-4">🤖 ' + typeName + '分析结果</h3>'
    + '<div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">' + escapeHtml(text) + '</div>'
    + '<p class="text-xs text-gray-400 mt-4 text-center">—— 以上分析由 AI 生成，仅供传统文化参考与娱乐 ——</p>'
    + '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeGeminiModal();
  });
}

/**
 * HTML 转义（防止 XSS）
 */
function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}
