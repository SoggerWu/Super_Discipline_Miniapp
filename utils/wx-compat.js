function getSystemInfo() {
  if (typeof wx.getWindowInfo === 'function') {
    const windowInfo = wx.getWindowInfo() || {};
    const systemInfo = typeof wx.getSystemInfoSync === 'function' ? wx.getSystemInfoSync() || {} : {};
    return {
      ...systemInfo,
      ...windowInfo,
      safeArea: windowInfo.safeArea || systemInfo.safeArea || {},
      pixelRatio: windowInfo.pixelRatio || systemInfo.pixelRatio || 1,
      windowWidth: windowInfo.windowWidth || systemInfo.windowWidth || 375,
      windowHeight: windowInfo.windowHeight || systemInfo.windowHeight || 667,
      platform: systemInfo.platform || 'devtools',
    };
  }

  if (typeof wx.getSystemInfoSync === 'function') {
    const systemInfo = wx.getSystemInfoSync() || {};
    return {
      ...systemInfo,
      safeArea: systemInfo.safeArea || {},
      pixelRatio: systemInfo.pixelRatio || 1,
      windowWidth: systemInfo.windowWidth || 375,
      windowHeight: systemInfo.windowHeight || 667,
      platform: systemInfo.platform || 'devtools',
    };
  }

  return {
    safeArea: {},
    pixelRatio: 1,
    windowWidth: 375,
    windowHeight: 667,
    platform: 'devtools',
  };
}

function chooseImageMedia(options = {}) {
  if (typeof wx.chooseMedia === 'function') {
    return wx.chooseMedia(options);
  }

  const { count = 1, success, fail, complete } = options;
  return wx.chooseImage({
    count,
    success: (res) => {
      const tempFiles = (res.tempFiles || []).map((file, index) => ({
        ...file,
        tempFilePath: file.path || file.tempFilePath || (res.tempFilePaths || [])[index] || '',
      }));
      if (typeof success === 'function') {
        success({
          tempFiles,
          type: 'image',
        });
      }
      if (typeof complete === 'function') complete(res);
    },
    fail,
    complete,
  });
}

module.exports = {
  getSystemInfo,
  chooseImageMedia,
};
