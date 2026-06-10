Page({
  goHome() {
    wx.redirectTo({ url: '/pages/teacher/home/index' });
  },

  goRecord() {
    wx.redirectTo({ url: '/pages/teacher/history/index' });
  },
});
