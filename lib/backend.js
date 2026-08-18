/**
 * 后端共享工具（供 Vercel serverless 函数使用）
 * =============================================
 * 把原来 server.js 里「连 MongoDB、解析请求、返回 JSON」这几件事抽出来共用，
 * 这样每个接口函数（api/*.js）只写自己的业务逻辑，代码不重复。
 */
const { MongoClient } = require('mongodb');

let client = null;

// 获取 MongoDB 的 records 集合（懒连接：第一次用到时才连，之后复用这个连接）
async function getCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('未配置 MONGODB_URI 环境变量');
  }
  if (!client) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
  }
  return client.db('bazi').collection('records');
}

// 读取 JSON 请求体（POST 时用）
function readJson(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      try {
        var raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 发送 JSON 响应
function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

// 处理跨域（前端在 GitHub Pages，后端在 Vercel，是跨域请求）
// 返回 true 表示这是预检请求（OPTIONS），已处理完，函数可以直接结束
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return true;
  }
  return false;
}

// 当前时间（统一用北京时间，和本地开发时一致）
function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}

module.exports = { getCollection, readJson, sendJson, handleCors, now };
