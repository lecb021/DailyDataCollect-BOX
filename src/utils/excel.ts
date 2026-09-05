import Taro from '@tarojs/taro';
import type { Performance, ReportData } from '@/types';
import { PRODUCT_TYPES } from '@/types';
import { formatDate, formatDateTime } from './format';

// 与报表页 / 云函数 / Mock 同源的 Excel 字段顺序
const EXCEL_PRODUCTS: readonly string[] = PRODUCT_TYPES;

// HTML 转义，防止内容破坏表格结构
function esc(str: string | number | undefined): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 生成 HTML 表格格式报表（保存为 .xls，Excel/WPS 可直接打开）
 * 微信小程序 openDocument 不支持 .csv，但支持 .xls
 */
export function generateReportCSV(report: ReportData): string {
  const typeLabel =
    report.type === 'day' ? '日报' : report.type === 'week' ? '周报' : report.type === 'year' ? '年表' : '月报';

  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ';
  html += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
  html += 'xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8" />';
  html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
  html += '<x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>';
  html += '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
  html += '<style>table{border-collapse:collapse;}td{border:1px solid #999;padding:4px 8px;white-space:nowrap;}</style>';
  html += '</head><body>';
  html += '<table>';

  // 标题行
  html += `<tr><td colspan="${EXCEL_PRODUCTS.length + 1}" style="font-size:16px;font-weight:bold;">${esc(typeLabel)}</td></tr>`;
  html += `<tr><td colspan="${EXCEL_PRODUCTS.length + 1}">统计日期: ${esc(report.date)}</td></tr>`;
  html += `<tr><td colspan="${EXCEL_PRODUCTS.length + 1}">&nbsp;</td></tr>`;

  // 日期标题行
  html += `<tr><td colspan="${EXCEL_PRODUCTS.length + 1}" style="font-weight:bold;">${esc(report.date)}</td></tr>`;

  // 产品列表头
  let headerRow = '<tr><td>&nbsp;</td>';
  EXCEL_PRODUCTS.forEach((p) => {
    headerRow += `<td style="font-weight:bold;background:#E8F0FE;">${esc(p)}</td>`;
  });
  headerRow += '</tr>';
  html += headerRow;

  // 员工数据行
  report.employeeMatrix.forEach((emp) => {
    let row = `<tr><td style="font-weight:bold;">${esc(emp.userName)}</td>`;
    EXCEL_PRODUCTS.forEach((_, idx) => {
      row += `<td>${esc(emp.products[idx] ?? '')}</td>`;
    });
    row += '</tr>';
    html += row;
  });

  // 累计行
  let totalRow = '<tr><td style="font-weight:bold;background:#FFF3CD;">累计数</td>';
  EXCEL_PRODUCTS.forEach((_, idx) => {
    totalRow += `<td style="font-weight:bold;background:#FFF3CD;">${esc(report.totals.products[idx] ?? '')}</td>`;
  });
  totalRow += '</tr>';
  html += totalRow;

  // 负责人信息
  html += `<tr><td colspan="${EXCEL_PRODUCTS.length + 1}">&nbsp;</td></tr>`;
  html += `<tr><td colspan="${EXCEL_PRODUCTS.length + 1}">厅堂主管: ${esc(report.supervisors.yitang)}</td></tr>`;

  html += '</table></body></html>';
  return html;
}

/**
 * 生成明细报表（HTML 表格 .xls 格式）
 */
export function generateDetailCSV(
  performances: Performance[],
  dateRange?: { start: string; end: string }
): string {
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ';
  html += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
  html += 'xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8" />';
  html += '<style>table{border-collapse:collapse;}td{border:1px solid #999;padding:4px 8px;white-space:nowrap;}</style>';
  html += '</head><body>';
  html += '<table>';

  const colCount = EXCEL_PRODUCTS.length + 4; // 日期+姓名+产品+备注+提交时间

  html += `<tr><td colspan="${colCount}" style="font-size:16px;font-weight:bold;">网点员工业绩明细</td></tr>`;
  if (dateRange) {
    html += `<tr><td colspan="${colCount}">日期范围: ${esc(dateRange.start)} ~ ${esc(dateRange.end)}</td></tr>`;
  }
  html += `<tr><td colspan="${colCount}">&nbsp;</td></tr>`;

  // 表头
  let headerRow = '<tr>';
  headerRow += '<td style="font-weight:bold;background:#E8F0FE;">日期</td>';
  headerRow += '<td style="font-weight:bold;background:#E8F0FE;">姓名</td>';
  EXCEL_PRODUCTS.forEach((p) => {
    headerRow += `<td style="font-weight:bold;background:#E8F0FE;">${esc(p)}(笔数)</td>`;
  });
  headerRow += '<td style="font-weight:bold;background:#E8F0FE;">备注</td>';
  headerRow += '<td style="font-weight:bold;background:#E8F0FE;">提交时间</td>';
  headerRow += '</tr>';
  html += headerRow;

  // 数据行
  performances.forEach((p) => {
    let row = '<tr>';
    row += `<td>${esc(p.date)}</td>`;
    row += `<td>${esc(p.userName)}</td>`;
    EXCEL_PRODUCTS.forEach((name) => {
      const count = p.products?.[name as typeof PRODUCT_TYPES[number]]?.count || 0;
      row += `<td>${esc(count)}</td>`;
    });
    row += `<td>${esc((p.remark || '').replace(/,/g, '，'))}</td>`;
    row += `<td>${esc(formatDateTime(p.createTime || Date.now()))}</td>`;
    row += '</tr>';
    html += row;
  });

  html += '</table></body></html>';
  return html;
}

/**
 * 保存文件到本地并打开（微信小程序 .xls 格式）
 */
export function saveCSVFile(filename: string, content: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 微信小程序环境（必须放在最前面，因为 Taro 运行时可能 polyfill document/window）
    if (process.env.TARO_ENV === 'weapp') {
      try {
        const fs = Taro.getFileSystemManager();
        if (!fs) {
          reject(new Error('文件系统管理器不可用'));
          return;
        }
        const userDataPath = Taro.env && Taro.env.USER_DATA_PATH;
        if (!userDataPath) {
          reject(new Error('USER_DATA_PATH 不可用'));
          return;
        }
        const filePath = `${userDataPath}/${filename}`;
        console.log('[Excel] 准备写入文件:', filePath, '内容长度:', content.length);
        fs.writeFile({
          filePath,
          data: content,
          encoding: 'utf8',
          success: () => {
            console.log('[Excel] 文件写入成功:', filePath);
            // openDocument 支持 .xls 格式，showMenu 显示"转发/保存到手机"菜单
            Taro.openDocument({
              filePath,
              fileType: 'xls',
              showMenu: true,
              success: () => {
                console.log('[Excel] 文档已打开');
                resolve(filePath);
              },
              fail: (err) => {
                console.warn('[Excel] openDocument 失败，尝试转发:', err);
                // 打开失败时尝试转发文件给用户（文件已保存，转发不影响本地文件）
                Taro.shareFileMessage({
                  filePath,
                  success: () => {
                    console.log('[Excel] 文件已转发');
                    resolve(filePath);
                  },
                  fail: (shareErr) => {
                    console.warn('[Excel] 转发也失败，但文件已保存:', shareErr);
                    // 文件已成功写入本地，即使无法预览/转发也算导出成功
                    resolve(filePath);
                  }
                });
              }
            });
          },
          fail: (err) => {
            console.error('[Excel] 写入文件失败:', err);
            reject(new Error(`写入文件失败: ${err.errMsg || JSON.stringify(err)}`));
          }
        });
      } catch (e) {
        console.error('[Excel] 保存异常:', e);
        reject(e);
      }
    } else if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      // H5 环境直接下载
      const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      resolve(filename);
    } else {
      console.warn('[Excel] 当前环境不支持文件保存');
      resolve(filename);
    }
  });
}

/**
 * 生成文件名（.xls 扩展名，Excel/WPS 可直接打开）
 * 文件名使用纯 ASCII 避免微信文件系统中文路径编码问题
 */
export function buildFileName(type: 'detail' | 'report', suffix?: string): string {
  const dateStr = formatDate(new Date());
  const typeName = type === 'detail' ? 'detail' : 'report';
  // 将中文 suffix 转为英文，确保文件名纯 ASCII
  let safeSuffix = suffix || '';
  safeSuffix = safeSuffix
    .replace(/日报/g, 'day')
    .replace(/周报/g, 'week')
    .replace(/月报/g, 'month')
    .replace(/年表/g, 'year');
  const suffixStr = safeSuffix ? `_${safeSuffix}` : '';
  return `performance_${typeName}_${dateStr}${suffixStr}.xls`;
}
