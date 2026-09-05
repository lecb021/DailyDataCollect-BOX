import Taro from '@tarojs/taro'

// 各云函数对应的本地 Mock 实现（用于 H5 预览及微信端云函数未部署时的降级）
import mockLogin from '../data/login'
import mockBindEmployee from '../data/bindEmployee'
import mockSubmitPerformance from '../data/submitPerformance'
import mockGetMyPerformances from '../data/getMyPerformances'
import mockGetPerformanceDetail from '../data/getPerformanceDetail'
import mockGetAllPerformances from '../data/getAllPerformances'
import mockGetReport from '../data/getReport'
import mockGetOperationLogs from '../data/getOperationLogs'
import mockGetEmployees from '../data/getEmployees';
import mockAdminUnbind from '../data/adminUnbind';
import mockClearAllData from '../data/clearAllData';

const isWeapp = process.env.TARO_ENV === 'weapp'

// 云函数调用失败时是否降级为本地 Mock（模拟器调试用；云端部署验证通过后可改为 false）
const ENABLE_LOCAL_FALLBACK = true

const mockMap: Record<string, (data?: any) => Promise<any>> = {
  login: mockLogin,
  bindEmployee: mockBindEmployee,
  submitPerformance: mockSubmitPerformance,
  getMyPerformances: mockGetMyPerformances,
  getPerformanceDetail: mockGetPerformanceDetail,
  getAllPerformances: mockGetAllPerformances,
  getReport: mockGetReport,
  getOperationLogs: mockGetOperationLogs,
  getEmployees: mockGetEmployees,
  adminUnbind: mockAdminUnbind,
  clearAllData: mockClearAllData
}

async function callMock<T = any>(name: string, data?: Record<string, any>): Promise<T> {
  const mock = mockMap[name]
  if (!mock) {
    throw new Error(`未找到 ${name} 的本地 Mock 实现`)
  }
  return mock(data) as Promise<T>
}

export async function callFunction<T = any>(
  name: string,
  data?: Record<string, any>
): Promise<T> {
  // 非微信平台直接走本地 Mock
  if (!isWeapp) {
    return callMock<T>(name, data)
  }

  try {
    const res = await Taro.cloud.callFunction({ name, data })
    const result = res.result as { code: number; message: string; data: T }
    if (result.code !== 0) {
      console.error(`[Cloud] ${name} 业务失败:`, result.message)
      throw new Error(result.message || '请求失败')
    }
    return result.data
  } catch (err) {
    // 云函数未部署 / 云环境未配置时降级为本地 Mock，保证模拟器可调试
    if (ENABLE_LOCAL_FALLBACK) {
      console.warn(`[Cloud] ${name} 调用失败，已降级为本地模式:`, err)
      return callMock<T>(name, data)
    }
    throw err
  }
}

export function getDatabase() {
  if (!isWeapp) {
    return null
  }
  return Taro.cloud.database()
}
