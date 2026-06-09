Page({
  goHome() {
    wx.navigateBack();
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/parent/history/index' });
  },
});
