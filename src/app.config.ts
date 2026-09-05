export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/record/index',
    'pages/report/index',
    'pages/mine/index',
    'pages/record-detail/index',
    'pages/export/index',
    'pages/logs/index',
    'pages/employee/index',
    'pages/bind/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E40AF',
    navigationBarTitleText: '网点业绩登记',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7FA'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#1E40AF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '业绩录入',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-selected.png'
      },
      {
        pagePath: 'pages/record/index',
        text: '业绩记录',
        iconPath: 'assets/tabbar/record.png',
        selectedIconPath: 'assets/tabbar/record-selected.png'
      },
      {
        pagePath: 'pages/report/index',
        text: '数据报表',
        iconPath: 'assets/tabbar/report.png',
        selectedIconPath: 'assets/tabbar/report-selected.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-selected.png'
      }
    ]
  }
})
