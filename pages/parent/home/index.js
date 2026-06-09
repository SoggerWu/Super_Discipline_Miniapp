const store = require('../../../utils/score-store');

Page({
  data: {
    student: null,
    today: null,
  },

  onLoad() {
    this.syncView();
  },

  onShow() {
    this.syncView();
  },

  syncView() {
    const { student, today } = store.buildParentHome('s1');
    this.setData({ student, today }, () => {
      this.drawRings();
    });
  },

  drawRings() {
    if (!this.data.today) return;

    const query = wx.createSelectorQuery();
    query.select('#parentRings').fields({ node: true, size: true }).exec((res) => {
      const canvasNode = res && res[0];
      if (!canvasNode || !canvasNode.node) return;

      const { node: canvas, width, height } = canvasNode;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseSize = Math.min(width, height);
      const lineWidth = Math.max(18, Math.round(baseSize * 0.052));
      const gap = Math.max(4, Math.round(baseSize * 0.012));
      const outerRadius = baseSize / 2 - lineWidth / 2 - 14;

      this.data.today.items.forEach((item, index) => {
        const radius = outerRadius - index * (lineWidth + gap);
        this.drawRing(ctx, centerX, centerY, radius, lineWidth, item.percent, item.color);
      });
    });
  },

  drawRing(ctx, centerX, centerY, radius, lineWidth, progress, color) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2;
    const progressEnd = startAngle + Math.PI * 2 * progress;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d8e3e8';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, progressEnd, false);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/parent/history/index' });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/parent/profile/index' });
  },
});
