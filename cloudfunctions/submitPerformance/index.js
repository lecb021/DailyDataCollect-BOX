const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 提交/修改业绩：
// 员工身份一律由 openid 反查绑定表得到，禁止客户端传入 userId/userName
// 唯一约束：employeeId + date（同一员工同一天仅一条）
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const db = cloud.database();

    // 1. 反查当前微信账号绑定的员工身份
    const bindRes = await db.collection('users')
      .where({ _openid: openid, status: 'active' })
      .limit(1)
      .get();

    if (bindRes.data.length === 0) {
      return { code: -1, message: '未绑定员工身份，请先完成工号绑定', data: null };
    }
    const binding = bindRes.data[0];
    const employeeId = binding.employeeId || binding.employeeNo;
    const userName = binding.name;

    const { date, products, remark } = event;
    if (!date || !products) {
      return { code: -1, message: '参数不完整', data: null };
    }

    const perfCol = db.collection('performances');

    // 2. 唯一约束：同一员工同一天
    const existRes = await perfCol.where({
      employeeId,
      date
    }).limit(1).get();

    let performance;
    if (existRes.data.length > 0) {
      const record = existRes.data[0];
      await perfCol.doc(record._id).update({
        data: {
          _openid: openid,
          userName,
          products,
          remark: remark || '',
          status: 'submitted',
          updateTime: db.serverDate()
        }
      });
      performance = { ...record, employeeId, userName, products, remark, status: 'submitted', updateTime: Date.now() };
    } else {
      const addRes = await perfCol.add({
        data: {
          _openid: openid,
          employeeId,   // 关联键：工号
          userName,     // 冗余姓名，仅展示用
          date,
          products,
          remark: remark || '',
          status: 'submitted',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      performance = { _id: addRes._id, employeeId, userName, date, products, remark, status: 'submitted' };
    }

    // 3. 操作日志（按 employeeId 关联）
    await db.collection('operation_logs').add({
      data: {
        _openid: openid,
        employeeId,
        userName,
        action: existRes.data.length > 0 ? 'update' : 'submit',
        target: date,
        detail: existRes.data.length > 0 ? '修改业绩数据' : '提交业绩数据',
        createTime: db.serverDate()
      }
    });

    return { code: 0, message: 'success', data: { performance } };
  } catch (err) {
    console.error('[submitPerformance] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
