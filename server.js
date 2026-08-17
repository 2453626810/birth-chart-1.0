/**
 * server.js — 八字排盘网站的后端记录服务
 * =====================================================
 *
 * 【这个文件是做什么的？】
 * 前端（排盘、AI 问答）会把用户的查询记录发送到这里，
 * 后端把记录存起来，网站所有者通过管理页面（http://localhost:3000）查看所有记录。
 *
 * 【记录存哪里？两种模式，自动切换】
 * 1. 云数据库模式（推荐，数据永久保存）：
 *    设置环境变量 MONGODB_URI（MongoDB Atlas 免费版连接串）后，
 *    记录存到云数据库，服务器重启、重新部署都不会丢数据。
 * 2. 本地文件模式（默认，方便本地测试）：
 *    没设置 MONGODB_URI 时，记录存到 data/records.json 文件里。
 *
 * 【怎么运行？】
 * 1. 先装依赖：npm install（装 express、mongodb、dotenv）
 * 2. 启动服务：npm start
 * 3. 打开管理页面：http://localhost:3000
 *
 * 【怎么开启云数据库？】
 * 本地：在项目根目录建一个 .env 文件，写一行
 *   MONGODB_URI=mongodb+srv://用户名:密码@xxxxx.mongodb.net/?retryWrites=true&w=majority
 * 线上（Render）：在服务后台的 Environment 里加同名环境变量即可。
 */

require('dotenv').config(); // 读取 .env 文件里的环境变量（本地开发用）

const express = require('express');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'records.json');

// 云数据库连接串（在 Render 后台或本地 .env 里配置，不要写死在代码里）
const MONGODB_URI = process.env.MONGODB_URI;

// 解析 JSON 请求体（最大 2MB，足够存排盘结果）
app.use(express.json({ limit: '2mb' }));

// 允许跨域（前端可能跑在 GitHub Pages 或本地 8000 端口）
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ========== 存储层：文件 or 云数据库 ==========

let mongoClient = null;
let mongoDb = null;

// 获取云数据库的 records 集合（懒连接，第一次用到时才连）
async function getCollection() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db('bazi');
  }
  return mongoDb.collection('records');
}

// 本地文件：读取所有记录（文件不存在时返回空数组）
function readFileRecords() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

// 本地文件：写入所有记录（自动创建目录）
function writeFileRecords(records) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
}

// 读全部记录（两种模式统一入口）
async function readRecords() {
  if (MONGODB_URI) {
    return (await getCollection()).find({}).sort({ _id: 1 }).toArray();
  }
  return readFileRecords();
}

// 按 sessionId 找一条会话记录（找不到返回 undefined）
async function findSession(sessionId) {
  if (MONGODB_URI) {
    return (await getCollection()).findOne({ sessionId: sessionId });
  }
  var records = readFileRecords();
  return records.find(function (r) { return r.sessionId === sessionId; });
}

// 新增一条记录
async function insertRecord(record) {
  if (MONGODB_URI) {
    await (await getCollection()).insertOne(record);
    return;
  }
  var records = readFileRecords();
  records.push(record);
  writeFileRecords(records);
}

// 往已有会话追加一条问答
async function appendQa(sessionId, qaItem) {
  if (MONGODB_URI) {
    await (await getCollection()).updateOne(
      { sessionId: sessionId },
      { $push: { qa: qaItem } }
    );
    return;
  }
  var records = readFileRecords();
  var session = records.find(function (r) { return r.sessionId === sessionId; });
  if (session) {
    if (!session.qa) session.qa = [];
    session.qa.push(qaItem);
    writeFileRecords(records);
  }
}

// ========== 接口 ==========

// 接收一条查询记录
// 排盘（type=bazi）会创建一条会话记录；AI 问答（type=qa）会归到对应会话的 qa 列表里
app.post('/api/records', async function (req, res) {
  const body = req.body;
  try {
    // AI 问答：按 sessionId 归到对应的排盘会话里（把同一个人和他的问答放在一起）
    if (body.type === 'qa' && body.sessionId) {
      const session = await findSession(body.sessionId);
      if (session) {
        await appendQa(body.sessionId, {
          question: body.question,
          answer: body.answer,
          time: new Date().toLocaleString('zh-CN', { hour12: false })
        });
        return res.json({ ok: true, sessionId: session.sessionId });
      }
      // 找不到对应会话（比如没排盘就直接问答），则继续走下面的新增逻辑
    }

    // 新增记录（排盘会创建一条会话；独立问答也记一条）
    const record = Object.assign({}, body, {
      id: Date.now() + '-' + Math.floor(Math.random() * 10000),
      time: new Date().toLocaleString('zh-CN', { hour12: false })
    });
    if (record.type === 'bazi') {
      record.qa = [];  // 排盘记录初始化问答列表，后续问答会往里追加
    }
    await insertRecord(record);
    res.json({ ok: true, id: record.id, sessionId: record.sessionId });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

// 查看所有记录（支持筛选：?gender=男/女 &year=1995 &keyword=关键词）
app.get('/api/records', async function (req, res) {
  try {
    var records = await readRecords();
    var gender = req.query.gender;
    var year = req.query.year;
    var keyword = req.query.keyword;

    if (gender) {
      records = records.filter(function (r) { return r.genderLabel === gender; });
    }
    if (year) {
      records = records.filter(function (r) { return r.birthDate && String(r.birthDate).indexOf(String(year)) === 0; });
    }
    if (keyword) {
      records = records.filter(function (r) { return JSON.stringify(r).indexOf(keyword) !== -1; });
    }
    res.json(records);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

// 统计信息：总会话数、总问答数、性别分布、出生年份分布
app.get('/api/stats', async function (req, res) {
  try {
    var records = await readRecords();
    var totalSessions = records.length;
    var totalQa = 0;
    var genderCount = { '男': 0, '女': 0, '未知': 0 };
    var yearCount = {};

    records.forEach(function (r) {
      if (r.qa) totalQa += r.qa.length;
      if (r.genderLabel === '男' || r.genderLabel === '女') {
        genderCount[r.genderLabel]++;
      } else {
        genderCount['未知']++;
      }
      if (r.birthDate) {
        var y = String(r.birthDate).substring(0, 4);
        if (y) yearCount[y] = (yearCount[y] || 0) + 1;
      }
    });

    res.json({
      totalSessions: totalSessions,
      totalQa: totalQa,
      genderCount: genderCount,
      yearCount: yearCount
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

// 导出记录：?format=csv（默认）或 ?format=json
app.get('/api/export', async function (req, res) {
  try {
    var records = await readRecords();
    var format = String(req.query.format || 'csv').toLowerCase();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=records.json');
      return res.send(JSON.stringify(records, null, 2));
    }

    // CSV（带 BOM，让 Excel 正确识别中文）
    var lines = ['会话ID,出生日期,时辰,性别,四柱,五行,问答数,问答内容,排盘时间'];
    records.forEach(function (r) {
      var qaText = '';
      if (r.qa && r.qa.length) {
        var qaParts = [];
        r.qa.forEach(function (q) {
          qaParts.push('问:' + (q.question || '') + ' 答:' + (q.answer || ''));
        });
        qaText = qaParts.join(' | ');
      }
      var row = [
        r.sessionId || '',
        r.birthDate || '',
        r.birthHourLabel || '',
        r.genderLabel || '',
        r.pillars || '',
        r.wuxing || '',
        r.qa ? r.qa.length : 0,
        qaText,
        r.time || ''
      ];
      lines.push(row.map(csvCell).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=records.csv');
    res.send('﻿' + lines.join('\n'));
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

// CSV 单元格转义（处理逗号、引号、换行）
function csvCell(value) {
  var s = String(value === null || value === undefined ? '' : value);
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// 管理页面
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// 启动服务
app.listen(PORT, function () {
  console.log('========================================');
  console.log('  八字排盘后端记录服务已启动');
  console.log('  管理页面：http://localhost:' + PORT);
  console.log('  存储模式：' + (MONGODB_URI ? '云数据库（MongoDB，数据永久保存）' : '本地文件（data/records.json）'));
  console.log('========================================');
});
