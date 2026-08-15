/**
 * face.js — 面相模块
 * 包含：面相知识弹窗交互
 * 面部示意图已改用公版古图（img/face.jpg），不再用 Canvas 绘制
 */

var faceData = null;

// 十二宫图标（弹窗标题用，和卡片图标保持一致）
var PALACE_ICONS = {
  ming: '🎯', caibo: '💰', xiongdi: '👫', tianzhai: '🏠',
  nannv: '👶', nupu: '👥', qiqie: '💞', jie: '🩺',
  qianyi: '🧭', guanlu: '💼', fude: '🍀', xiangmao: '👤'
};

// ========== 页面加载 ==========
document.addEventListener('DOMContentLoaded', function () {
  loadFaceData();
  renderFaceHotspots();
  applyFaceCardLabels();
});

function loadFaceData() {
  fetch('data/face-meanings.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { faceData = d; })
    .catch(function () { faceData = getBuiltinFaceData(); });
}

// ========== 弹窗交互 ==========
function showFaceInfo(area) {
  if (!faceData) faceData = getBuiltinFaceData();
  var title = '', content = '';

  if (area === 'upper' || area === 'middle' || area === 'lower') {
    var m = { upper: 'upper', middle: 'middle', lower: 'lower' };
    var d = faceData.threeSections[m[area]];
    var icon = { upper: '🧠', middle: '👃', lower: '👄' };
    title = icon[area] + ' ' + d.name + '（' + d.ageRange + '）';
    content = '<p class="text-sm text-gray-600 mb-2">📍 <strong>位置：</strong>' + d.position + '</p>'
      + '<p class="text-sm text-gray-700 mb-3">' + d.meaning + '</p>'
      + '<div class="bg-green-50 rounded-lg p-3 text-sm mb-2"><p class="font-bold text-green-800">✅ 好的特征：</p><p>' + d.goodSign + '</p></div>'
      + '<div class="bg-amber-50 rounded-lg p-3 text-sm"><p class="text-xs text-gray-500">💡 ' + d.note + '</p></div>';
  } else if (area === 'eyebrows' || area === 'eyes' || area === 'nose' || area === 'mouth' || area === 'ears') {
    var m2 = { eyebrows: 'eyebrows', eyes: 'eyes', nose: 'nose', mouth: 'mouth', ears: 'ears' };
    var d = faceData.fiveFeatures[m2[area]];
    var icon2 = { eyebrows: '🤨', eyes: '👀', nose: '👃', mouth: '👄', ears: '👂' };
    title = icon2[area] + ' ' + d.name + ' — ' + d.title + '（属' + d.element + '）';
    content = '<p class="text-sm text-gray-700 mb-3">' + d.meaning + '</p>'
      + '<div class="bg-green-50 rounded-lg p-3 text-sm mb-2"><p class="font-bold text-green-800">✅ 好的特征：</p><p>' + d.goodSign + '</p></div>'
      + (d.badSign ? '<div class="bg-red-50 rounded-lg p-3 text-sm mb-2"><p class="font-bold text-red-800">⚠️ 不太好的特征：</p><p>' + d.badSign + '</p></div>' : '')
      + '<div class="bg-amber-50 rounded-lg p-3 text-sm"><p class="text-xs text-gray-500 italic">📖 ' + d.quote + '</p></div>';
  } else if (area.indexOf('palace-') === 0) {
    var palaceKey = area.replace('palace-', '');
    var d = faceData.twelvePalaces[palaceKey];
    title = PALACE_ICONS[palaceKey] + ' ' + d.name + '（' + d.position + '）';
    content = '<p class="text-sm text-gray-700 mb-3">' + d.meaning + '</p>'
      + '<div class="bg-green-50 rounded-lg p-3 text-sm mb-2"><p class="font-bold text-green-800">✅ 好的特征：</p><p>' + d.goodSign + '</p></div>'
      + (d.badSign ? '<div class="bg-red-50 rounded-lg p-3 text-sm"><p class="font-bold text-red-800">⚠️ 不太好的特征：</p><p>' + d.badSign + '</p></div>' : '');
  } else {
    var km = { yintang: '印堂', cheekbones: '颧骨', philtrum: '人中', nasolabial: '法令纹', chin: '地阁' };
    var d = faceData.keyPoints[area];
    title = '📍 ' + d.name + '（' + d.position + '）';
    content = '<p class="text-sm text-gray-700 mb-3">' + d.meaning + '</p>';
  }
  showFaceModal(title, content);
  highlightFaceArea(area);
}

function showFaceModal(title, content) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal-content">'
    + '<button class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold" onclick="closeFaceModal()">&times;</button>'
    + '<h3 class="text-lg font-bold text-red-800 mb-4">' + title + '</h3>'
    + content
    + '<p class="text-xs text-gray-400 mt-4 text-center">—— 以上为传统文化知识，仅供参考 ——</p></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeFaceModal(); });
}
function closeFaceModal() {
  var o = document.querySelector('.modal-overlay');
  if (o) o.remove();
}

// ========== 内置兜底数据 ==========
function getBuiltinFaceData() {
  return {
    threeSections: {
      upper: { name: '上停', position: '额头区域', ageRange: '15-30岁', meaning: '主管早年运势，看祖上根基。', goodSign: '额头开阔明亮、饱满圆润', note: '额头也叫天庭' },
      middle: { name: '中停', position: '眉毛到鼻尖', ageRange: '31-50岁', meaning: '主管中年运势，看事业成就。', goodSign: '鼻梁挺拔、眉清目秀', note: '鼻子叫面王' },
      lower: { name: '下停', position: '鼻尖到下巴', ageRange: '51岁以后', meaning: '主管晚年运势。', goodSign: '下巴圆润、人中深长', note: '地阁方圆代表晚年安稳' }
    },
    fiveFeatures: {
      eyebrows: { name: '眉', title: '保寿官', element: '木', meaning: '代表健康寿命和人际关系。', goodSign: '眉清目秀、长短适中', badSign: '眉毛稀疏杂乱', quote: '眉为两目之华盖' },
      eyes: { name: '眼', title: '监察官', element: '火', meaning: '代表判断力和智慧。', goodSign: '眼神清澈、黑白分明', badSign: '眼神浑浊', quote: '一身精神，具乎两目' },
      nose: { name: '鼻', title: '审辨官', element: '土', meaning: '代表财运和自我意识。', goodSign: '鼻梁挺拔、鼻头有肉', badSign: '鼻梁歪斜', quote: '鼻为面王' },
      mouth: { name: '口', title: '出纳官', element: '水', meaning: '代表口才和诚信。', goodSign: '嘴角上扬、唇色红润', badSign: '嘴角下垂', quote: '口为出纳官' },
      ears: { name: '耳', title: '采听官', element: '水', meaning: '代表少年运势和福气。', goodSign: '耳垂丰满', badSign: '耳垂过小', quote: '耳为采听官' }
    },
    keyPoints: {
      yintang: { name: '印堂', position: '两眉之间', meaning: '代表近期运势和心胸。印堂开阔代表运气顺畅。' },
      cheekbones: { name: '颧骨', position: '眼下鼻侧', meaning: '代表权力和事业运。高而有肉代表有领导力。' },
      philtrum: { name: '人中', position: '鼻子和上唇之间', meaning: '代表健康和生育能力。深长清晰代表身体健康。' },
      nasolabial: { name: '法令纹', position: '鼻翼两侧向下延伸', meaning: '代表权威和晚年运势。' },
      chin: { name: '地阁', position: '脸部最下方', meaning: '代表晚年福气和根基。圆润饱满代表有福。' }
    },
    twelvePalaces: {
      ming: { name: '命宫', position: '两眉之间', meaning: '主一生运势总纲和近期吉凶。', goodSign: '印堂开阔平坦明亮', badSign: '印堂狭窄凹陷' },
      caibo: { name: '财帛宫', position: '鼻头', meaning: '主财运和理财能力。', goodSign: '鼻头圆润有肉', badSign: '鼻头尖削无肉' },
      xiongdi: { name: '兄弟宫', position: '两眉', meaning: '主兄弟姐妹缘分和人际关系。', goodSign: '眉毛清秀顺滑', badSign: '眉毛杂乱逆生' },
      tianzhai: { name: '田宅宫', position: '眉与眼之间', meaning: '主家产、房产和祖业。', goodSign: '上眼皮饱满宽润', badSign: '上眼皮凹陷' },
      nannv: { name: '男女宫', position: '眼下卧蚕', meaning: '主子女生育。', goodSign: '卧蚕饱满', badSign: '泪堂凹陷' },
      nupu: { name: '奴仆宫', position: '下巴两侧', meaning: '主下属和晚年人缘。', goodSign: '地阁方圆', badSign: '下巴尖削' },
      qiqie: { name: '妻妾宫', position: '眼尾鱼尾处', meaning: '主婚姻感情。', goodSign: '鱼尾纹细腻整齐', badSign: '鱼尾纹杂乱' },
      jie: { name: '疾厄宫', position: '山根', meaning: '主健康。', goodSign: '山根高挺', badSign: '山根低陷' },
      qianyi: { name: '迁移宫', position: '额头两侧', meaning: '主出行和外地发展。', goodSign: '额角开阔明亮', badSign: '额角凹陷' },
      guanlu: { name: '官禄宫', position: '额头正中', meaning: '主事业和名声。', goodSign: '额头开阔饱满', badSign: '额头狭窄' },
      fude: { name: '福德宫', position: '额头两侧上方', meaning: '主福分和德行。', goodSign: '天仓饱满', badSign: '天仓凹陷' },
      xiangmao: { name: '相貌宫', position: '整个面部', meaning: '看五官三停整体是否协调。', goodSign: '五官端正匀称', badSign: '五官偏斜' }
    }
  };
}

// ========== SVG 热区（图片与知识卡片联动） ==========

// 面相各知识点的热区坐标（基于 AI 生成的示意图 1024x1024）
// 说明：坐标为基于标准正面面部布局的估算值，位置可能有偏差
// 标注三停、五官、重点部位（十二宫位置与它们重叠，靠卡片文字说明）
var FACE_HOTSPOTS = [
  // 三停
  { area: 'upper', label: '1', name: '上停', cx: 609, cy: 260, rx: 200, ry: 120 },
  { area: 'middle', label: '2', name: '中停', cx: 609, cy: 500, rx: 200, ry: 180 },
  { area: 'lower', label: '3', name: '下停', cx: 609, cy: 780, rx: 180, ry: 160 },
  // 五官
  { area: 'eyebrows', label: '4', name: '眉', cx: 609, cy: 400, rx: 160, ry: 22 },
  { area: 'eyes', label: '5', name: '眼', cx: 609, cy: 470, rx: 160, ry: 26 },
  { area: 'nose', label: '6', name: '鼻', cx: 609, cy: 580, rx: 35, ry: 80 },
  { area: 'mouth', label: '7', name: '口', cx: 609, cy: 680, rx: 70, ry: 22 },
  { area: 'ears', label: '8', name: '耳', cx: 250, cy: 470, rx: 30, ry: 55 },
  // 重点部位
  { area: 'yintang', label: '9', name: '印堂', cx: 609, cy: 430, rx: 30, ry: 16 },
  { area: 'cheekbones', label: '10', name: '颧骨', cx: 609, cy: 520, rx: 150, ry: 30 },
  { area: 'philtrum', label: '11', name: '人中', cx: 609, cy: 630, rx: 14, ry: 26 },
  { area: 'nasolabial', label: '12', name: '法令纹', cx: 609, cy: 660, rx: 120, ry: 55 },
  { area: 'chin', label: '13', name: '地阁', cx: 609, cy: 850, rx: 70, ry: 50 }
];

/**
 * 在面部图上生成 SVG 热区层（可点击的数字标号）
 */
function renderFaceHotspots() {
  var container = document.getElementById('face-container');
  if (!container) return;

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'hotspot-svg');
  svg.setAttribute('viewBox', '0 0 1024 1024');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  for (var i = 0; i < FACE_HOTSPOTS.length; i++) {
    (function (hs) {
      var area = document.createElementNS(svgNS, 'ellipse');
      area.setAttribute('cx', hs.cx);
      area.setAttribute('cy', hs.cy);
      area.setAttribute('rx', hs.rx);
      area.setAttribute('ry', hs.ry);
      area.setAttribute('class', 'hotspot-area');
      area.setAttribute('data-area', hs.area);

      var dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('cx', hs.cx);
      dot.setAttribute('cy', hs.cy);
      dot.setAttribute('r', 14);
      dot.setAttribute('class', 'hotspot-dot');
      dot.setAttribute('data-area', hs.area);

      var text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', hs.cx);
      text.setAttribute('y', hs.cy + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'hotspot-label');
      text.textContent = hs.label;

      var els = [area, dot, text];
      for (var k = 0; k < els.length; k++) {
        els[k].addEventListener('click', function () { showFaceInfo(hs.area); });
      }

      svg.appendChild(area);
      svg.appendChild(dot);
      svg.appendChild(text);
    })(FACE_HOTSPOTS[i]);
  }

  container.appendChild(svg);
}

/**
 * 给面相卡片自动加上数字标号和 data-area 属性（与图上热区对应）
 */
function applyFaceCardLabels() {
  for (var i = 0; i < FACE_HOTSPOTS.length; i++) {
    var hs = FACE_HOTSPOTS[i];
    var selector = '#tab-face [onclick="showFaceInfo(\'' + hs.area + '\')"]';
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
function highlightFaceArea(area) {
  highlightFaceCard(area);
  highlightFaceHotspot(area);
}

function highlightFaceCard(area) {
  var card = document.querySelector('#tab-face [data-area="' + area + '"]');
  if (!card) return;
  card.classList.add('card-highlight');
  setTimeout(function () { card.classList.remove('card-highlight'); }, 1600);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function highlightFaceHotspot(area) {
  var dot = document.querySelector('#face-container .hotspot-dot[data-area="' + area + '"]');
  if (!dot) return;
  dot.classList.add('hotspot-active');
  setTimeout(function () { dot.classList.remove('hotspot-active'); }, 1600);
}
