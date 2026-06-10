Page({
  goHome() {
    wx.redirectTo({ url: '/pages/parent/home/index' });
  },

  goRecord() {
    wx.redirectTo({ url: '/pages/parent/history/index' });
  },
});
