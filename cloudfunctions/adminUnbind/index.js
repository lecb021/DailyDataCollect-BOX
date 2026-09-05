const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 管理员解除某工号的微信绑定（解绑后该员工可重新绑定）
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const db = cloud.database();

    // 权限校验：仅管理员
    const callerRes = await db.collection('users')
      .where({ _openid: openid, status: 'active' })
      .limit(1)
      .get();

    if (callerRes.data.length === 0 || callerRes.data[0].role !== 'admin') {
      return { code: -1, message: '无权限：仅管理员可解绑员工', data: null };
    }

    const { employeeNo } = event;
    if (!employeeNo) {
      return { code: -1, message: '缺少工号参数', data: null };
    }

    // 不允许管理员解绑自己
    if (callerRes.data[0].employeeNo === employeeNo) {
      return { code: -1, message: '不能解除当前登录账号的绑定', data: null };
    }

    // 查找该工号的有效绑定
    const bindRes = await db.collection('users')
      .where({ employeeNo, status: 'active' })
      .limit(1)
      .get();

    if (bindRes.data.length === 0) {
      return { code: -1, message: '该工号当前未绑定', data: null };
    }

    const binding = bindRes.data[0];
    await db.collection('users').doc(binding._id).update({
      data: {
        status: 'unbound',
        unbindTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 操作日志
    await db.collection('operation_logs').add({
      data: {
        _openid: openid,
        employeeId: callerRes.data[0].employeeId || callerRes.data[0].employeeNo,
        userName: callerRes.data[0].name,
        action: 'unbind',
        target: employeeNo,
        detail: `解除员工绑定：${binding.name}（${employeeNo}）`,
        createTime: db.serverDate()
      }
    });

    return { code: 0, message: 'success', data: { employeeNo, unbound: true } };
  } catch (err) {
    console.error('[adminUnbind] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
