/**
 * palm.js — 手相模块
 * 包含：手相知识弹窗交互
 * 手掌示意图已改用公版古图（img/palm.jpg），不再用 Canvas 绘制
 */

// 手相数据缓存
var palmData = null;

// 掌丘与五指的图标（弹窗标题用，和卡片图标保持一致）
var MOUNT_ICONS = { venus: '💖', jupiter: '👑', saturn: '⛰️', sun: '☀️', mercury: '💬', mars: '⚔️', lunar: '🌙' };
var FINGER_ICONS = { thumb: '👍', index: '☝️', middle: '🖐️', ring: '💍', little: '🤙' };

// ========== 页面加载 ==========
document.addEventListener('DOMContentLoaded', function () {
  loadPalmData();
  renderPalmHotspots();
  applyPalmCardLabels();
});

function loadPalmData() {
  fetch('data/palm-meanings.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { palmData = d; })
    .catch(function () { palmData = getBuiltinPalmData(); });
}

// ========== 弹窗交互 ==========
function showPalmInfo(area) {
  if (!palmData) palmData = getBuiltinPalmData();
  var title = '', content = '';
  switch (area) {
    case 'life-line':
      var d = palmData.lines.life;
      title = '🧬 ' + d.name;
      content = '<p class="text-sm text-gray-600 mb-2">📍 <strong>位置：</strong>' + d.position + '</p>'
        + '<p class="text-sm text-gray-700 mb-3">' + d.generalMeaning + '</p>'
        + '<div class="bg-amber-50 rounded-lg p-3 text-sm"><p class="font-bold text-red-800 mb-2">不同特征的解读：</p><ul class="space-y-1 text-gray-700">'
        + '<li>✅ <strong>深长清晰：</strong>' + d.details.deepAndLong + '</li>'
        + '<li>⚠️ <strong>浅淡短小：</strong>' + d.details.shallowAndShort + '</li>'
        + '<li>🔗 <strong>呈链状：</strong>' + d.details.chained + '</li>'
        + '<li>✂️ <strong>有中断：</strong>' + d.details.broken + '</li>'
        + '<li>🔄 <strong>双线并行：</strong>' + d.details.double + '</li></ul></div>';
      break;
    case 'head-line':
      var d = palmData.lines.head;
      title = '🧠 ' + d.name;
      content = '<p class="text-sm text-gray-600 mb-2">📍 <strong>位置：</strong>' + d.position + '</p>'
        + '<p class="text-sm text-gray-700 mb-3">' + d.generalMeaning + '</p>'
        + '<div class="bg-amber-50 rounded-lg p-3 text-sm"><p class="font-bold text-red-800 mb-2">不同特征的解读：</p><ul class="space-y-1 text-gray-700">'
        + '<li>✅ <strong>深长清晰：</strong>' + d.details.deepAndLong + '</li>'
        + '<li>〰️ <strong>弯曲下垂：</strong>' + d.details.curved + '</li>'
        + '<li>➖ <strong>平直横穿：</strong>' + d.details.straight + '</li>'
        + '<li>🍴 <strong>末端分叉：</strong>' + d.details.forked + '</li>'
        + '<li>📏 <strong>较短：</strong>' + d.details.short + '</li></ul></div>';
      break;
    case 'heart-line':
      var d = palmData.lines.heart;
      title = '💕 ' + d.name;
      content = '<p class="text-sm text-gray-600 mb-2">📍 <strong>位置：</strong>' + d.position + '</p>'
        + '<p class="text-sm text-gray-700 mb-3">' + d.generalMeaning + '</p>'
        + '<div class="bg-amber-50 rounded-lg p-3 text-sm"><p class="font-bold text-red-800 mb-2">不同特征的解读：</p><ul class="space-y-1 text-gray-700">'
        + '<li>📏 <strong>长到食指下：</strong>' + d.details.long + '</li>'
        + '<li>📐 <strong>只到中指下：</strong>' + d.details.short + '</li>'
        + '<li>〰️ <strong>弯曲有弧度：</strong>' + d.details.curved + '</li>'
        + '<li>➖ <strong>平直横穿：</strong>' + d.details.straight + '</li>'
        + '<li>🌿 <strong>末端有分叉：</strong>' + d.details.branched + '</li></ul></div>';
      break;
    case 'fate-line':
      var d = palmData.lines.fate;
      title = '📈 ' + d.name;
      content = '<p class="text-sm text-gray-600 mb-2">📍 <strong>位置：</strong>' + d.position + '</p>'
        + '<p class="text-sm text-gray-700 mb-3">' + d.generalMeaning + '</p>'
        + '<div class="bg-amber-50 rounded-lg p-3 text-sm"><ul class="space-y-1 text-gray-700">'
        + '<li>✅ <strong>清晰直上：</strong>' + d.details.clearAndStraight + '</li>'
        + '<li>❌ <strong>没有此线：</strong>' + d.details.absent + '</li>'
        + '<li>🍴 <strong>有分叉：</strong>' + d.details.forked + '</li>'
        + '<li>✂️ <strong>有中断：</strong>' + d.details.broken + '</li>'
        + '<li>🌱 <strong>从生命线出发：</strong>' + d.details.startingAtLifeLine + '</li></ul></div>';
      break;
    case 'marriage-line':
      var d = palmData.lines.marriage;
      title = '💍 ' + d.name;
      content = '<p class="text-sm text-gray-600 mb-2">📍 <strong>位置：</strong>' + d.position + '</p>'
        + '<p class="text-sm text-gray-700 mb-3">' + d.generalMeaning + '</p>'
        + '<div class="bg-amber-50 rounded-lg p-3 text-sm"><ul class="space-y-1 text-gray-700">'
        + '<li>✅ <strong>清晰单条：</strong>' + d.details.clear + '</li>'
        + '<li>🔢 <strong>多条线：</strong>' + d.details.multiple + '</li>'
        + '<li>🍴 <strong>有分叉：</strong>' + d.details.forked + '</li></ul></div>';
      break;
    case 'sun-line':
      var d = palmData.lines.sun;
      title = '☀️ ' + d.name;
      content = '<p class="text-sm text-gray-600 mb-2">📍 <strong>位置：</strong>' + d.position + '</p>'
        + '<p class="text-sm text-gray-700 mb-3">' + d.generalMeaning + '</p>'
        + '<div class="bg-amber-50 rounded-lg p-3 text-sm"><ul class="space-y-1 text-gray-700">'
        + '<li>✅ <strong>清晰可见：</strong>' + d.details.clear + '</li>'
        + '<li>❌ <strong>没有此线：</strong>' + d.details.absent + '</li></ul></div>';
      break;
    case 'mount-venus':
    case 'mount-jupiter':
    case 'mount-saturn':
    case 'mount-sun':
    case 'mount-mercury':
    case 'mount-mars':
    case 'mount-lunar':
      var mountKey = area.replace('mount-', '');
      var m = palmData.mounts[mountKey];
      title = MOUNT_ICONS[mountKey] + ' ' + m.name + '（属' + m.element + '）';
      content = '<p class="text-sm text-gray-600 mb-2">📍 <strong>位置：</strong>' + m.position + '</p>'
        + '<p class="text-sm text-gray-700">' + m.meaning + '</p>';
      break;
    case 'finger-thumb':
    case 'finger-index':
    case 'finger-middle':
    case 'finger-ring':
    case 'finger-little':
      var fingerKey = area.replace('finger-', '');
      var f = palmData.fingers[fingerKey];
      title = FINGER_ICONS[fingerKey] + ' ' + f.name + '（属' + f.element + '）';
      content = '<p class="text-sm text-gray-700">' + f.meaning + '</p>';
      break;
    case 'hand-diff':
      var d = palmData.handDifference;
      title = '🙌 左右手区别';
      content = '<div class="space-y-3 text-sm"><div class="bg-blue-50 rounded-lg p-3"><strong>左手：</strong>' + d.left + '</div>'
        + '<div class="bg-green-50 rounded-lg p-3"><strong>右手：</strong>' + d.right + '</div>'
        + '<div class="bg-amber-50 rounded-lg p-3"><strong>总结：</strong>' + d.summary + '</div></div>';
      break;
    default:
      title = '提示'; content = '<p>详情即将推出~</p>';
  }
  showModal(title, content);
  highlightPalmArea(area);
}

// ========== 弹窗 ==========
function showModal(title, content) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-content">'
    + '<button class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold" onclick="closeModal()">&times;</button>'
    + '<h3 class="text-lg font-bold text-red-800 mb-4">' + title + '</h3>'
    + content
    + '<p class="text-xs text-gray-400 mt-4 text-center">—— 以上内容仅供参考 ——</p></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
}
function closeModal() {
  var o = document.querySelector('.modal-overlay');
  if (o) o.remove();
}

// ========== 内置兜底数据 ==========
function getBuiltinPalmData() {
  return {
    lines: {
      life: { name: '生命线', position: '从虎口绕过大拇指根部的弧线', generalMeaning: '代表生命力和健康状态，不是看寿命。', details: { deepAndLong: '精力充沛', shallowAndShort: '容易疲劳', chained: '消化系统需注意', broken: '人生可能有转折', double: '生命力更强' } },
      head: { name: '智慧线', position: '手掌中间横穿的线', generalMeaning: '代表思维方式和学习能力。', details: { deepAndLong: '逻辑思维强', curved: '想象力丰富', straight: '理性务实', forked: '多才多艺', short: '抓重点讲实用' } },
      heart: { name: '感情线', position: '从小指下方向食指延伸的横线', generalMeaning: '代表感情态度和人际交往方式。', details: { long: '感情丰富细腻', short: '理性务实', curved: '内心柔软', straight: '理性真诚', branched: '感情经历丰富' } },
      fate: { name: '命运线', position: '从手掌底部向上延伸的竖线', generalMeaning: '代表事业发展方向。没有此线也很正常。', details: { clearAndStraight: '事业方向清晰', absent: '多方面成就', forked: '职业转型', broken: '事业有过转折', startingAtLifeLine: '靠自己打拼' } },
      marriage: { name: '婚姻线', position: '小指下方、感情线上方的短横线', generalMeaning: '代表感情和婚姻状态。', details: { clear: '感情稳定', multiple: '感情经历丰富', forked: '面临过选择' } },
      sun: { name: '太阳线', position: '无名指下方纵向延伸', generalMeaning: '代表艺术才华和成功运。', details: { clear: '有天赋才华', absent: '靠努力成功' } }
    },
    mounts: {
      venus: { name: '金星丘', position: '大拇指根部', meaning: '代表爱情、魅力和生命力。饱满有弹性代表热情开朗。', element: '土' },
      jupiter: { name: '木星丘', position: '食指下方', meaning: '代表野心、领导力和自信。饱满代表有进取心。', element: '木' },
      saturn: { name: '土星丘', position: '中指下方', meaning: '代表责任感和沉稳。适度饱满代表稳重踏实。', element: '土' },
      sun: { name: '太阳丘', position: '无名指下方', meaning: '代表艺术天赋和成功运。饱满代表有创造力。', element: '火' },
      mercury: { name: '水星丘', position: '小指下方', meaning: '代表沟通能力和商业头脑。饱满代表口才好。', element: '水' },
      mars: { name: '火星丘', position: '虎口和手掌边缘之间', meaning: '代表勇气和斗志。饱满代表勇敢坚定。', element: '火' },
      lunar: { name: '太阴丘', position: '手掌外侧下部', meaning: '代表想象力和直觉。饱满代表想象力丰富。', element: '水' }
    },
    fingers: {
      thumb: { name: '拇指', element: '土', meaning: '代表意志力和决断力。粗壮有力代表有主见。' },
      index: { name: '食指', element: '木', meaning: '代表进取心和野心。较长代表有追求。' },
      middle: { name: '中指', element: '火', meaning: '代表责任感和节制。较长代表有责任心。' },
      ring: { name: '无名指', element: '金', meaning: '代表艺术感和名声。较长代表有艺术天赋。' },
      little: { name: '小指', element: '水', meaning: '代表沟通和表达。较长代表口才好。' }
    },
    handDifference: { left: '代表先天遗传', right: '代表后天努力', summary: '两手都要看' }
  };
}

// ========== SVG 热区（图片与知识卡片联动） ==========

// 手相各知识点的热区坐标（基于 AI 生成的示意图 1024x1024）
// 说明：坐标为 AI 标注 + 标准布局估算，位置可能有偏差
// area 对应 showPalmInfo 的参数，label 是图上与卡片上的数字标号
var PALM_HOTSPOTS = [
  // 三大主线
  { area: 'life-line', label: '1', name: '生命线', cx: 510, cy: 640, rx: 80, ry: 120 },
  { area: 'head-line', label: '2', name: '智慧线', cx: 500, cy: 520, rx: 130, ry: 28 },
  { area: 'heart-line', label: '3', name: '感情线', cx: 480, cy: 600, rx: 130, ry: 24 },
  // 次要线（AI 图中不明显，按标准布局估算）
  { area: 'fate-line', label: '4', name: '命运线', cx: 460, cy: 650, rx: 20, ry: 150 },
  { area: 'marriage-line', label: '5', name: '婚姻线', cx: 560, cy: 500, rx: 45, ry: 16 },
  { area: 'sun-line', label: '6', name: '太阳线', cx: 540, cy: 560, rx: 14, ry: 70 },
  // 掌丘
  { area: 'mount-venus', label: '7', name: '金星丘', cx: 450, cy: 780, rx: 50, ry: 55 },
  { area: 'mount-jupiter', label: '8', name: '木星丘', cx: 550, cy: 750, rx: 40, ry: 40 },
  { area: 'mount-saturn', label: '9', name: '土星丘', cx: 420, cy: 820, rx: 40, ry: 40 },
  { area: 'mount-sun', label: '10', name: '太阳丘', cx: 570, cy: 800, rx: 40, ry: 40 },
  { area: 'mount-mercury', label: '11', name: '水星丘', cx: 490, cy: 850, rx: 40, ry: 40 },
  { area: 'mount-mars', label: '12', name: '火星丘', cx: 460, cy: 950, rx: 42, ry: 42 },
  { area: 'mount-lunar', label: '13', name: '太阴丘', cx: 530, cy: 900, rx: 45, ry: 60 },
  // 五指
  { area: 'finger-thumb', label: '14', name: '拇指', cx: 320, cy: 1000, rx: 28, ry: 70 },
  { area: 'finger-index', label: '15', name: '食指', cx: 380, cy: 700, rx: 20, ry: 80 },
  { area: 'finger-middle', label: '16', name: '中指', cx: 440, cy: 650, rx: 20, ry: 90 },
  { area: 'finger-ring', label: '17', name: '无名指', cx: 500, cy: 600, rx: 20, ry: 85 },
  { area: 'finger-little', label: '18', name: '小指', cx: 560, cy: 650, rx: 18, ry: 75 }
];

/**
 * 在手掌图上生成 SVG 热区层（可点击的数字标号）
 */
function renderPalmHotspots() {
  var container = document.getElementById('palm-container');
  if (!container) return;

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'hotspot-svg');
  svg.setAttribute('viewBox', '0 0 1024 1024');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  for (var i = 0; i < PALM_HOTSPOTS.length; i++) {
    (function (hs) {
      // 透明可点击热区（椭圆）
      var area = document.createElementNS(svgNS, 'ellipse');
      area.setAttribute('cx', hs.cx);
      area.setAttribute('cy', hs.cy);
      area.setAttribute('rx', hs.rx);
      area.setAttribute('ry', hs.ry);
      area.setAttribute('class', 'hotspot-area');
      area.setAttribute('data-area', hs.area);

      // 数字标号圆点
      var dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('cx', hs.cx);
      dot.setAttribute('cy', hs.cy);
      dot.setAttribute('r', 14);
      dot.setAttribute('class', 'hotspot-dot');
      dot.setAttribute('data-area', hs.area);

      // 数字文字
      var text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', hs.cx);
      text.setAttribute('y', hs.cy + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'hotspot-label');
      text.textContent = hs.label;

      // 三个元素都绑定点击事件
      var els = [area, dot, text];
      for (var k = 0; k < els.length; k++) {
        els[k].addEventListener('click', function () { showPalmInfo(hs.area); });
      }

      svg.appendChild(area);
      svg.appendChild(dot);
      svg.appendChild(text);
    })(PALM_HOTSPOTS[i]);
  }

  container.appendChild(svg);
}

/**
 * 给手相卡片自动加上数字标号和 data-area 属性（与图上热区对应）
 * 通过 onclick 属性匹配卡片，避免手动改每一张卡片
 */
function applyPalmCardLabels() {
  for (var i = 0; i < PALM_HOTSPOTS.length; i++) {
    var hs = PALM_HOTSPOTS[i];
    var selector = '#tab-palm [onclick="showPalmInfo(\'' + hs.area + '\')"]';
    var card = document.querySelector(selector);
    if (!card) continue;
    card.setAttribute('data-area', hs.area);
    var h4 = card.querySelector('h4');
    if (h4 && !h4.querySelector('.hotspot-badge')) {
      h4.insertAdjacentHTML('afterbegin', '<span class="hotspot-badge">' + hs.label + '</span> ');
    }
  }
}

/**
 * 高亮某个知识点对应的卡片和图上热区（双向联动）
 */
function highlightPalmArea(area) {
  highlightPalmCard(area);
  highlightPalmHotspot(area);
}

function highlightPalmCard(area) {
  var card = document.querySelector('#tab-palm [data-area="' + area + '"]');
  if (!card) return;
  card.classList.add('card-highlight');
  setTimeout(function () { card.classList.remove('card-highlight'); }, 1600);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function highlightPalmHotspot(area) {
  var dot = document.querySelector('#palm-container .hotspot-dot[data-area="' + area + '"]');
  if (!dot) return;
  dot.classList.add('hotspot-active');
  setTimeout(function () { dot.classList.remove('hotspot-active'); }, 1600);
}
