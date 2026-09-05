const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 需要清空的集合（员工花名册 employees 为基础配置，不清空）
const COLLECTIONS_TO_CLEAR = ['performances', 'users', 'operation_logs'];

// 分批删除集合全部记录（云数据库单次 where().remove() 有数量上限，循环直到删空）
async function clearCollection(name) {
  let totalDeleted = 0;
  // 先统计总数
  const countRes = await db.collection(name).count();
  const total = countRes.total;

  // 循环批量删除：每次取 20 条 _id 删除（微信云数据库批量删除安全上限），直到删空
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await db.collection(name)
      .field({ _id: true })
      .limit(20)
      .get();

    if (batch.data.length === 0) break;

    const ids = batch.data.map((d) => d._id);
    await db.collection(name).where({ _id: _.in(ids) }).remove();
    totalDeleted += batch.data.length;

    if (batch.data.length < 20) break;
  }

  return { collection: name, total, deleted: totalDeleted };
}

// 管理员清空云数据库：清空业绩 / 绑定关系 / 操作日志，保留员工花名册
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 权限校验：仅管理员可清空
    const callerRes = await db.collection('users')
      .where({ _openid: openid, status: 'active' })
      .limit(1)
      .get();

    if (callerRes.data.length === 0 || callerRes.data[0].role !== 'admin') {
      return { code: -1, message: '无权限：仅管理员可清空数据', data: null };
    }

    const operator = callerRes.data[0];

    // 二次确认参数（前端必须传 confirm: true）
    if (event.confirm !== true) {
      return { code: -1, message: '缺少确认参数，已取消', data: null };
    }

    const results = [];
    for (const col of COLLECTIONS_TO_CLEAR) {
      try {
        const r = await clearCollection(col);
        results.push(r);
      } catch (e) {
        // 集合不存在等情况记录但不中断
        results.push({ collection: col, total: 0, deleted: 0, error: e.message });
      }
    }

    console.log('[clearAllData] 清空完成:', results);

    return {
      code: 0,
      message: 'success',
      data: {
        cleared: true,
        operator: operator.name,
        results
      }
    };
  } catch (err) {
    console.error('[clearAllData] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
