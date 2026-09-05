const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 微信登录：根据 openid 查询绑定关系
// 返回 { bound: true, user } 或 { bound: false }
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    const db = cloud.database();
    const usersCol = db.collection('users');

    // 仅查询有效绑定（status = active）
    const userRes = await usersCol.where({
      _openid: openid,
      status: 'active'
    }).limit(1).get();

    if (userRes.data.length > 0) {
      return { code: 0, message: 'success', data: { bound: true, user: userRes.data[0] } };
    }

    return { code: 0, message: 'needBind', data: { bound: false, user: null } };
  } catch (err) {
    console.error('[login] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
