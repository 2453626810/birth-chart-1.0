/**
 * main.js — 主入口文件
 * 负责：Tab切换控制、全局初始化
 */

// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', function () {
  initTabs();
});

/**
 * 初始化Tab切换功能
 * 点击导航按钮时，显示对应的内容区，隐藏其他内容区
 */
function initTabs() {
  // 获取所有Tab按钮
  const tabBtns = document.querySelectorAll('.tab-btn');
  // 获取所有Tab内容区
  const tabContents = document.querySelectorAll('.tab-content');

  // 给每个按钮绑定点击事件
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // 获取这个按钮要显示哪个内容区（data-tab 属性）
      const targetTab = this.getAttribute('data-tab');

      // 1. 移除所有按钮的 active 样式
      tabBtns.forEach(function (b) {
        b.classList.remove('active');
      });
      // 2. 给当前点击的按钮加上 active 样式
      this.classList.add('active');

      // 3. 隐藏所有内容区
      tabContents.forEach(function (content) {
        content.classList.add('hidden');
      });
      // 4. 显示目标内容区
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.remove('hidden');
      }
    });
  });
}

// ========== 后端记录上报 ==========

// 后端服务地址（自建后端，见 server.js，默认本地 3000 端口）
var BACKEND_URL = 'http://localhost:3000';

/**
 * 把查询记录上报到后端
 * 后端没启动或网络不通时静默失败，不影响网站正常使用
 * @param {object} record - 要上报的记录对象
 */
function reportRecord(record) {
  try {
    fetch(BACKEND_URL + '/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(function () {
      // 后端未启动，静默忽略
    });
  } catch (e) {
    // 老浏览器不支持 fetch 时忽略
  }
}
