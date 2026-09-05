const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 管理员查询员工花名册 + 微信绑定状态
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const db = cloud.database();

    // 权限校验：仅管理员可查询
    const callerRes = await db.collection('users')
      .where({ _openid: openid, status: 'active' })
      .limit(1)
      .get();

    if (callerRes.data.length === 0 || callerRes.data[0].role !== 'admin') {
      return { code: -1, message: '无权限：仅管理员可查看员工绑定信息', data: null };
    }

    // 花名册（按工号固定顺序）
    const rosterRes = await db.collection('employees')
      .where({ status: 'active' })
      .orderBy('employeeNo', 'asc')
      .limit(100)
      .get();

    // 有效绑定关系
    const bindRes = await db.collection('users')
      .where({ status: 'active' })
      .limit(100)
      .get();

    const bindMap = {};
    bindRes.data.forEach((u) => {
      bindMap[u.employeeId || u.employeeNo] = u;
    });

    const list = rosterRes.data.map((emp) => {
      const binding = bindMap[emp.employeeNo];
      return {
        _id: emp._id,
        employeeId: emp.employeeNo,
        employeeNo: emp.employeeNo,
        name: emp.name,
        role: emp.role || 'staff',
        subRole: emp.subRole || 'member',
        department: emp.department || '零售业务部',
        bindStatus: binding ? 'bound' : 'unbound',
        bindOpenid: binding ? binding._openid : '',
        bindTime: binding ? binding.bindTime : null
      };
    });

    return { code: 0, message: 'success', data: { list } };
  } catch (err) {
    console.error('[getEmployees] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
