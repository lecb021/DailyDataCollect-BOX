const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 查询单条业绩详情：仅可查看本人（按 openid 绑定的 employeeId）的记录
exports.main = async (event, context) => {
  try {
    const { id } = event;
    if (!id) {
      return { code: -1, message: '参数缺失', data: null };
    }

    const { OPENID } = cloud.getWXContext();
    const db = cloud.database();

    // openid 反查绑定关系
    const userRes = await db.collection('users')
      .where({ _openid: OPENID, status: 'active' })
      .get();
    const binding = userRes.data && userRes.data[0];
    if (!binding) {
      return { code: -1, message: '未绑定员工身份，请先完成工号绑定', data: null };
    }
    const employeeId = binding.employeeId || binding.employeeNo;

    const res = await db.collection('performances').doc(id).get();

    // 归属校验：员工只能查看自己的业绩记录
    if (!res.data || res.data.employeeId !== employeeId) {
      return { code: -1, message: '无权查看该记录', data: null };
    }

    return { code: 0, message: 'success', data: { performance: res.data } };
  } catch (err) {
    console.error('[getPerformanceDetail] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
