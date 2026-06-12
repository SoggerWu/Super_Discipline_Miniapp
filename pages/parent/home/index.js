const store = require('../../../utils/score-store');
const { getSystemInfo } = require('../../../utils/wx-compat');

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
      const dpr = getSystemInfo().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const config = this.getRingConfig(width, height, this.data.today.items.length);

      this.data.today.items.forEach((item, index) => {
        const radius = config.outerRadius - index * (config.lineWidth + config.gap);
        this.drawRing(ctx, centerX, centerY, radius, config.lineWidth, item.percent, item.color);
      });

      this.drawCenterDisc(ctx, centerX, centerY, config.centerRadius);
      this.drawCenterScore(ctx, centerX, centerY, this.data.today.totalWeighted);
    });
  },

  getRingConfig(width, height, ringCount) {
    const baseSize = Math.min(width, height);
    const half = baseSize / 2;
    const outerPadding = Math.max(12, Math.round(baseSize * 0.035));
    const gap = Math.max(3, Math.round(baseSize * 0.01));
    const centerRadius = Math.max(42, Math.round(baseSize * 0.115));
    const lineWidth = (half - outerPadding - centerRadius - gap * (ringCount - 1)) / ringCount;
    const outerRadius = half - outerPadding - lineWidth / 2;

    return {
      outerRadius,
      lineWidth,
      gap,
      centerRadius,
    };
  },

  drawRing(ctx, centerX, centerY, radius, lineWidth, progress, color) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2;
    const progressEnd = startAngle + Math.PI * 2 * progress;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0a2b39';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, progressEnd, false);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  },

  drawCenterDisc(ctx, centerX, centerY, radius) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
    ctx.fillStyle = '#0a2b39';
    ctx.fill();
  },

  drawCenterScore(ctx, centerX, centerY, score) {
    ctx.fillStyle = '#f4fbff';
    ctx.font = '700 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score), centerX, centerY);
  },

  goRecord() {
    wx.redirectTo({ url: '/pages/parent/history/index' });
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/parent/profile/index' });
  },
});
