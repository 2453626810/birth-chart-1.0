/**
 * 云函数 api —— 网站记录的后端
 * =============================================
 * 前端通过 app.callFunction({ name: 'api', data: { action, ... } }) 调用，
 * 云函数用服务端 SDK 读写「SQL 型数据库」（关系型，app.rdb()），比前端直连更安全。
 *
 * 数据库表结构（在 SQL 型数据库里建一张 records 表，两个字段）：
 *   records(id VARCHAR(64) 主键, data TEXT 存整条记录的 JSON)
 *
 * 支持的 action：
 *   - saveRecord：保存一条记录（排盘建会话，问答归到会话）
 *   - listRecords：返回全部记录（筛选/统计/导出都在前端完成）
 */
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });

// 关系型数据库客户端（SQL 型数据库必须用 app.rdb()，不能用 app.database()）
// 新版「SQL 型数据库」是 PostgreSQL，业务表在默认的 public schema 里，所以要显式指定 database: 'public'
// （app.rdb() 默认会把 database 填成环境 ID，导致报错 Invalid schema）
const db = app.rdb({ database: 'public' });

// 当前时间（北京时间）
function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}

// 生成一个唯一的记录 id
function genId() {
  return Date.now() + '-' + Math.floor(Math.random() * 100000);
}

// app.rdb() 是 Supabase 风格：出错时返回 { error } 而不是抛异常。
// 这里统一检查：有 error 就抛出去，让外层 catch 把真实原因返回给前端。
function throwIfError(res, op) {
  if (res && res.error) {
    const msg = res.error && res.error.message ? res.error.message : JSON.stringify(res.error);
    throw new Error(op + ' 失败：' + msg);
  }
}

// 从查询结果里取出「行数组」（兼容不同 SDK 版本返回 { data: [...] } 或直接返回数组两种情况）
function rowsOf(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

// 插入一条记录（把整条记录序列化成 JSON，存进 data 列）
async function insertRecord(record) {
  const res = await db.from('records').insert({ id: genId(), data: JSON.stringify(record) });
  throwIfError(res, 'insert');
  return { ok: true };
}

// 保存一条记录（会话逻辑和原 server.js 一致）
async function saveRecord(record) {
  if (!record) return { ok: false, error: '缺少 record' };

  // 问答：找到对应会话（type=bazi），把问答追加到它的 qa 列表
  if (record.type === 'qa' && record.sessionId) {
    const res = await db.from('records').select('*');
    throwIfError(res, 'select');
    const rows = rowsOf(res);
    for (let i = 0; i < rows.length; i++) {
      let rec = null;
      try { rec = JSON.parse(rows[i].data); } catch (e) { continue; }
      if (rec && rec.type === 'bazi' && rec.sessionId === record.sessionId) {
        rec.qa = (rec.qa || []).concat([
          { question: record.question, answer: record.answer, time: now() }
        ]);
        const upd = await db.from('records').update({ data: JSON.stringify(rec) }).eq('id', rows[i].id);
        throwIfError(upd, 'update');
        return { ok: true };
      }
    }
  }

  // 排盘记录（或没找到会话的问答）：新增一条
  const newRecord = Object.assign({}, record, { time: now() });
  if (newRecord.type === 'bazi') newRecord.qa = [];
  return insertRecord(newRecord);
}

// 查询全部记录（最多 1000 条，个人网站够用）
// 返回里带 rawCount：数据库实际行数。rawCount>0 但 records 为空，说明是读取/解析问题；
// rawCount=0，说明写入根本没落库。
async function listRecords() {
  const res = await db.from('records').select('*');
  throwIfError(res, 'select');
  const rows = rowsOf(res);
  const records = [];
  for (let i = 0; i < rows.length; i++) {
    try { records.push(JSON.parse(rows[i].data)); } catch (e) { /* 跳过坏数据 */ }
  }
  return { ok: true, records: records, rawCount: rows.length };
}

// 云函数入口
exports.main = async function (event) {
  try {
    if (event && event.action === 'saveRecord') return await saveRecord(event.record);
    if (event && event.action === 'listRecords') return await listRecords();
    return { ok: false, error: '未知的 action' };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
};
