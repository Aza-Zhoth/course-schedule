/**
 * 小程序全局配置。
 *
 * 只保留一个页面：整个应用是单页 + 内部 Tab 切换的结构。
 * 这么做是因为原 H5 版的状态全集中在 useSchedule 这一个 Hook 里，
 * 拆成 4 个页面就得引入跨页状态共享（Context / 全局 store），
 * 对课程表这种「数据量小、页面间跳转频繁」的场景是过度设计。
 */
export default defineAppConfig({
  pages: ['pages/index/index'],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: '课程表',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F5F7FA',
  },
});
