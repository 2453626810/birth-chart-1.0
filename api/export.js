/**
 * 导出接口：GET ?format=csv（默认）或 ?format=json
 * 对应原 server.js 的 /api/export
 */
const { getCollection, sendJson, handleCors } = require('../lib/backend');

module.exports = async function (req, res) {
  if (handleCors(req, res)) return;
  try {
    const col = await getCollection();
    const records = await col.find({}).sort({ _id: 1 }).toArray();
    const format = String(new URL(req.url, 'http://localhost').searchParams.get('format') || 'csv').toLowerCase();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=records.json');
      return res.end(JSON.stringify(records, null, 2));
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
    res.end('﻿' + lines.join('\n'));
  } catch (e) {
    sendJson(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
  }
};

// CSV 单元格转义（处理逗号、引号、换行）
function csvCell(value) {
  var s = String(value === null || value === undefined ? '' : value);
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
