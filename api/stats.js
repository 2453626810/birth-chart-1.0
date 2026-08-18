/**
 * 统计接口：GET 返回总会话数、问答数、性别分布、年份分布
 * 对应原 server.js 的 /api/stats
 */
const { getCollection, sendJson, handleCors } = require('../lib/backend');

module.exports = async function (req, res) {
  if (handleCors(req, res)) return;
  try {
    const col = await getCollection();
    const records = await col.find({}).sort({ _id: 1 }).toArray();

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

    sendJson(res, 200, {
      totalSessions: totalSessions,
      totalQa: totalQa,
      genderCount: genderCount,
      yearCount: yearCount
    });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
  }
};
