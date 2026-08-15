/**
 * server.js — 八字排盘网站的后端记录服务
 * =====================================================
 *
 * 【这个文件是做什么的？】
 * 前端（排盘、AI 问答）会把用户的查询记录发送到这里，
 * 后端把记录存到 data/records.json 文件里，
 * 网站所有者通过管理页面（http://localhost:3000）查看所有记录。
 *
 * 【怎么运行？】
 * 1. 先安装依赖：npm install（只需要装一次 express）
 * 2. 启动服务：npm start（或 node server.js）
 * 3. 打开管理页面：http://localhost:3000
 *
 * 【数据存哪里？】
 * data/records.json —— 一个 JSON 文件，可以直接打开看
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'records.json');

// 解析 JSON 请求体（最大 2MB，足够存排盘结果）
app.use(express.json({ limit: '2mb' }));

// 允许跨域（前端可能跑在 8000 端口，后端在 3000 端口）
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 读取所有记录（文件不存在时返回空数组）
function readRecords() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

// 写入所有记录（自动创建目录）
function writeRecords(records) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
}

// ========== 接口 ==========

// 接收一条查询记录
app.post('/api/records', function (req, res) {
  const record = Object.assign({}, req.body, {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    time: new Date().toLocaleString('zh-CN', { hour12: false })
  });
  const records = readRecords();
  records.push(record);
  writeRecords(records);
  res.json({ ok: true, id: record.id });
});

// 查看所有记录
app.get('/api/records', function (req, res) {
  res.json(readRecords());
});

// 管理页面
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// 启动服务
app.listen(PORT, function () {
  console.log('========================================');
  console.log('  八字排盘后端记录服务已启动');
  console.log('  管理页面：http://localhost:' + PORT);
  console.log('  记录文件：' + DATA_FILE);
  console.log('========================================');
});
