const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 校验规则（与前端/Mock 保持一致）
const NAME_REGEX = /^[\u4e00-\u9fa5]{2,4}$/; // 姓名：2-4个中文字符

// 首次绑定：仅按姓名验证身份，与花名册比对
// 角色/职务一律取自花名册，不信任客户端传入
// 规则：一个 openid 绑定一个员工；一个员工只能被一个 openid 绑定
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const db = cloud.database();

    const name = (event.name || '').replace(/\s+/g, '').trim();

    // 0. 格式校验
    if (!name) {
      return { code: -1, message: '请输入姓名', data: null };
    }
    if (!NAME_REGEX.test(name)) {
      return { code: -1, message: '姓名格式不正确，应为2-4个中文字符', data: null };
    }

    // 1. 花名册按姓名查找
    const rosterRes = await db.collection('employees')
      .where({ name, status: 'active' })
      .limit(1)
      .get();

    if (rosterRes.data.length === 0) {
      return { code: -1, message: '姓名不在员工花名册中，请核对后重试', data: null };
    }
    const roster = rosterRes.data[0];

    // 2. 该员工是否已被其他微信账号绑定
    const boundRes = await db.collection('users')
      .where({ employeeNo: roster.employeeNo, status: 'active' })
      .limit(1)
      .get();

    if (boundRes.data.length > 0 && boundRes.data[0]._openid !== openid) {
      return { code: -1, message: '该员工已被其他微信账号绑定，请联系管理员解绑', data: null };
    }

    const userData = {
      _openid: openid,
      employeeId: roster.employeeNo,
      employeeNo: roster.employeeNo,
      name: roster.name,
      role: roster.role || 'staff',
      subRole: roster.subRole || 'member',
      department: roster.department || '零售业务部',
      status: 'active',
      bindTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    // 3. 当前 openid 已有记录（含已解绑）→ 更新；否则新建
    const ownRes = await db.collection('users').where({ _openid: openid }).limit(1).get();
    let user;

    if (ownRes.data.length > 0) {
      const existing = ownRes.data[0];
      await db.collection('users').doc(existing._id).update({ data: userData });
      user = { _id: existing._id, ...userData };
    } else {
      const addRes = await db.collection('users').add({ data: userData });
      user = { _id: addRes._id, ...userData };
    }

    // 4. 记录绑定日志
    await db.collection('operation_logs').add({
      data: {
        _openid: openid,
        employeeId: roster.employeeNo,
        userName: roster.name,
        action: 'bind',
        target: roster.employeeNo,
        detail: `绑定员工身份：${roster.name}`,
        createTime: db.serverDate()
      }
    });

    return { code: 0, message: 'success', data: { bound: true, user } };
  } catch (err) {
    console.error('[bindEmployee] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
