/**
 * 记录接口：POST 新增 / GET 查询
 * 对应原 server.js 的 /api/records
 */
const { getCollection, readJson, sendJson, handleCors, now } = require('../lib/backend');

module.exports = async function (req, res) {
  if (handleCors(req, res)) return;
  try {
    if (req.method === 'POST') {
      return await createRecord(req, res);
    }
    return await listRecords(req, res);
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
  }
};

// 新增记录：排盘（type=bazi）建一条会话；AI 问答（type=qa）归到对应会话的 qa 列表
async function createRecord(req, res) {
  const body = await readJson(req);
  const col = await getCollection();

  if (body.type === 'qa' && body.sessionId) {
    const session = await col.findOne({ sessionId: body.sessionId });
    if (session) {
      await col.updateOne(
        { sessionId: body.sessionId },
        { $push: { qa: { question: body.question, answer: body.answer, time: now() } } }
      );
      return sendJson(res, 200, { ok: true, sessionId: session.sessionId });
    }
  }

  const record = Object.assign({}, body, {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    time: now()
  });
  if (record.type === 'bazi') record.qa = [];
  await col.insertOne(record);
  sendJson(res, 200, { ok: true, id: record.id, sessionId: record.sessionId });
}

// 查询记录：支持 ?gender=男 &year=1995 &keyword=关键词
async function listRecords(req, res) {
  const col = await getCollection();
  let records = await col.find({}).sort({ _id: 1 }).toArray();

  const q = new URL(req.url, 'http://localhost').searchParams;
  const gender = q.get('gender');
  const year = q.get('year');
  const keyword = q.get('keyword');

  if (gender) records = records.filter(function (r) { return r.genderLabel === gender; });
  if (year) records = records.filter(function (r) { return r.birthDate && String(r.birthDate).indexOf(String(year)) === 0; });
  if (keyword) records = records.filter(function (r) { return JSON.stringify(r).indexOf(keyword) !== -1; });

  sendJson(res, 200, records);
}
