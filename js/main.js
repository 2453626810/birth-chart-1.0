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

// ========== 记录上报（腾讯云开发 CloudBase） ==========

// 当前排盘的会话 ID（一次排盘生成一个，用于把排盘和后续 AI 问答关联到同一会话）
var currentSessionId = null;

/**
 * 把查询记录上报到云端数据库（腾讯云开发）
 * 网络不通或 CloudBase 没配好时静默失败，不影响网站正常使用
 * 具体逻辑见 js/cloudbase.js 里的 saveRecord
 * @param {object} record - 要上报的记录对象
 */
function reportRecord(record) {
  try {
    if (typeof saveRecord === 'function') {
      saveRecord(record).catch(function () {
        // 上报失败，静默忽略
      });
    }
  } catch (e) {
    // 忽略上报异常
  }
}
