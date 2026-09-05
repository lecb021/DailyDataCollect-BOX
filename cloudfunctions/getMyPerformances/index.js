const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 查询我的业绩：由 openid 反查绑定员工，按 employeeId 过滤
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const db = cloud.database();
    const _ = db.command;

    const bindRes = await db.collection('users')
      .where({ _openid: openid, status: 'active' })
      .limit(1)
      .get();

    if (bindRes.data.length === 0) {
      return { code: 0, message: 'success', data: { list: [] } };
    }
    const employeeId = bindRes.data[0].employeeId || bindRes.data[0].employeeNo;

    const { startDate, endDate } = event;

    const whereCond = { employeeId };
    if (startDate && endDate) {
      whereCond.date = _.gte(startDate).and(_.lte(endDate));
    }

    const res = await db.collection('performances')
      .where(whereCond)
      .orderBy('date', 'desc')
      .limit(200)
      .get();

    return { code: 0, message: 'success', data: { list: res.data } };
  } catch (err) {
    console.error('[getMyPerformances] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
