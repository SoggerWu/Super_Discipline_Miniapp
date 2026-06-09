Page({
  goTeacher() {
    wx.navigateTo({
      url: '/pages/teacher/home/index',
    });
  },

  goParent() {
    wx.navigateTo({
      url: '/pages/parent/home/index',
    });
  },
});
