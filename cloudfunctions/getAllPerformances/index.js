const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const db = cloud.database();
    const _ = db.command;

    // 权限校验：仅管理员（有效绑定）
    const userRes = await db.collection('users').where({ _openid: openid, status: 'active' }).limit(1).get();
    if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
      return { code: -1, message: '无权限', data: null };
    }

    const { startDate, endDate } = event;
    if (!startDate || !endDate) {
      return { code: -1, message: '日期范围必填', data: null };
    }

    const res = await db.collection('performances')
      .where({ date: _.gte(startDate).and(_.lte(endDate)) })
      .orderBy('date', 'desc')
      .limit(1000)
      .get();

    return { code: 0, message: 'success', data: { list: res.data } };
  } catch (err) {
    console.error('[getAllPerformances] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
