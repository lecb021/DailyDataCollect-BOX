const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  try {
    const { limit = 50 } = event;
    const db = cloud.database();

    const res = await db.collection('operation_logs')
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    return { code: 0, message: 'success', data: { list: res.data } };
  } catch (err) {
    console.error('[getOperationLogs] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
