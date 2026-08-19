/**
 * cloudbase.js — 腾讯云开发（CloudBase）接入
 * =============================================
 * 用腾讯云开发替代原来的自建后端（server.js / Vercel）。
 * 前端不再直接读写数据库，而是调用云函数 api（见 cloudfunctions/api/），
 * 由云函数在服务端读写数据库，更安全。
 *
 * 部署前需要在云开发控制台做好：
 *   1. SQL 型数据库里建一张表，名字叫 records
 *   2. 云函数里新建一个函数，名字叫 api（代码见 cloudfunctions/api/）
 */

// 环境 ID（在腾讯云开发控制台 → 环境 → 环境 ID 里复制，和这里保持完全一致）
var CLOUDBASE_ENV_ID = 'birth-chart-d6gxjzx1wa0658046';

// CloudBase 应用实例缓存（避免每次调用都重新初始化、重新登录）
var _cloudbaseApp = null;
var _appReady = null;

// 拿到 CloudBase 应用实例（懒初始化：第一次用到时才初始化 + 匿名登录）
function getApp() {
  if (!_appReady) {
    _appReady = initCloudbase();
  }
  return _appReady;
}

// 初始化 CloudBase 并匿名登录
async function initCloudbase() {
  // SDK 没加载成功（CDN 地址错 / 网络不通）时，cloudbase 是 undefined，这里给个明确报错
  if (typeof cloudbase === 'undefined') {
    throw new Error('CloudBase SDK 没加载成功，请检查网络或 CDN 地址（static.cloudbase.net）');
  }
  _cloudbaseApp = cloudbase.init({ env: CLOUDBASE_ENV_ID });

  // 匿名登录：访客无需注册，CloudBase 分配一个临时身份用来调云函数
  var auth = _cloudbaseApp.auth({ persistence: 'local' });
  // 注意：v3 SDK 的 signInAnonymously 不再抛异常，而是返回 { data, error }，要检查 error 字段
  var loginRes = await auth.signInAnonymously();
  if (loginRes && loginRes.error) {
    throw new Error('匿名登录失败：' + (loginRes.error.message || JSON.stringify(loginRes.error)));
  }

  return _cloudbaseApp;
}

// 调用云函数 api，返回 res.result
async function callApi(data) {
  var app = await getApp();
  var res = await app.callFunction({ name: 'api', data: data });
  // v3 SDK 出错时不抛异常，而是返回 { error } 或 { code, message }，这里统一转成异常抛给上层
  if (res && res.error) {
    throw new Error(res.error.message || JSON.stringify(res.error));
  }
  if (res && res.result) return res.result;
  if (res && res.code && res.message) {
    throw new Error(res.message);
  }
  throw new Error('云函数 api 没有正常返回结果，请确认云函数已部署且名字为 api');
}

// 保存一条记录（对应云函数 api 里的 saveRecord）
async function saveRecord(record) {
  return callApi({ action: 'saveRecord', record: record });
}

// 查询全部记录（对应云函数 api 里的 listRecords）
async function getRecords() {
  var res = await callApi({ action: 'listRecords' });
  return (res && res.records) || [];
}
