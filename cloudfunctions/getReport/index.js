const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 严格对齐 Excel 表头顺序的产品列表
const PRODUCT_LIST = ['趸交', '期交', '基金', '定期', '养老金', '信用卡', '理财', '商养', '慧通卡', '财富卡', '个养账户'];

exports.main = async (event) => {
  try {
    const db = cloud.database();
    const _ = db.command;
    const { type = 'day', targetDate } = event;

    const now = targetDate ? new Date(targetDate) : new Date();

    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let startDate, endDate, dateLabel;

    if (type === 'day') {
      startDate = endDate = formatDate(now);
      dateLabel = `${now.getMonth() + 1}月${now.getDate()}日`;
    } else if (type === 'week') {
      // 计算周一到周日
      const weekStart = new Date(now);
      const dow = weekStart.getDay();
      const diffToMonday = dow === 0 ? -6 : 1 - dow;
      weekStart.setDate(weekStart.getDate() + diffToMonday);
      startDate = formatDate(weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      endDate = formatDate(weekEnd);
      dateLabel = `${startDate} ~ ${endDate}`;
    } else if (type === 'month') {
      startDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      endDate = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      dateLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
    } else if (type === 'year') {
      startDate = formatDate(new Date(now.getFullYear(), 0, 1));
      endDate = formatDate(new Date(now.getFullYear(), 11, 31));
      dateLabel = `${now.getFullYear()}年`;
    }

    // 查询区间内业绩
    const perfRes = await db.collection('performances')
      .where({ date: _.gte(startDate).and(_.lte(endDate)) })
      .limit(1000)
      .get();

    // 查询员工列表（按固定顺序）
    const empRes = await db.collection('employees')
      .orderBy('employeeNo', 'asc')
      .limit(50)
      .get();

    const employees = empRes.data && empRes.data.length ? empRes.data : [];

    // 构建员工矩阵（按 employeeId=工号 聚合，姓名仅展示）
    const employeeMatrix = employees.map((emp) => {
      const empRecords = perfRes.data.filter((p) => p.employeeId === emp.employeeNo);
      const products = PRODUCT_LIST.map((prodName) =>
        empRecords.reduce((sum, p) => sum + ((p.products && p.products[prodName] && p.products[prodName].count) || 0), 0)
      );
      const totalCount = products.reduce((a, b) => a + b, 0);
      return {
        employeeId: emp.employeeNo,
        userName: emp.name,
        subRole: emp.subRole || 'member',
        products,
        totalCount
      };
    });

    // 累计行
    const totals = {
      products: PRODUCT_LIST.map((_, idx) =>
        employeeMatrix.reduce((sum, row) => sum + row.products[idx], 0)
      ),
      totalCount: employeeMatrix.reduce((sum, row) => sum + row.totalCount, 0)
    };

    // 负责人
    const gaogui = employees.find((e) => e.subRole === 'gaogui')?.name || '';
    const yitang = employees.find((e) => e.subRole === 'yitang')?.name || '';

    // 汇总（兼容旧字段）
    const productStats = {};
    PRODUCT_LIST.forEach((name, idx) => {
      productStats[name] = { count: totals.products[idx], amount: 0 };
    });

    const submittedDays = new Set(perfRes.data.map((p) => p.date)).size;

    // 排行榜（按 employeeId 关联）
    const rankings = employeeMatrix
      .map((row) => ({
        employeeId: row.employeeId,
        userName: row.userName,
        totalCount: row.totalCount,
        totalAmount: 0,
        rank: 0
      }))
      .sort((a, b) => b.totalCount - a.totalCount)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return {
      code: 0,
      message: 'success',
      data: {
        type,
        date: dateLabel,
        employeeMatrix,
        totals,
        supervisors: { gaogui, yitang },
        summary: {
          totalCount: totals.totalCount,
          totalAmount: 0,
          productStats,
          submittedDays
        },
        rankings,
        details: perfRes.data
      }
    };
  } catch (err) {
    console.error('[getReport] error:', err);
    return { code: -1, message: err.message || '服务异常', data: null };
  }
};
