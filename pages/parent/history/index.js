const store = require('../../../utils/score-store');

Page({
  data: {
    month: '',
    weekdays: [],
    days: [],
  },

  onLoad() {
    this.syncView();
  },

  onShow() {
    this.syncView();
  },

  syncView() {
    const history = store.buildParentHistory('s1');
    this.setData(
      {
        month: history.monthLabel,
        weekdays: history.weekdays,
        days: history.days,
      },
      () => {
        this.drawHistoryRings();
      }
    );
  },

  drawHistoryRings() {
    const query = wx.createSelectorQuery();
    query.selectAll('.history-ring-canvas').fields({ node: true, size: true }).exec((res) => {
      const list = res && res[0];
      if (!list || !list.length) return;

      const drawableDays = this.data.days.filter((item) => !item.empty);
      list.forEach((canvasNode, index) => {
        const day = drawableDays[index];
        if (!day) return;

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
        const lineWidth = Math.max(3, Math.round(baseSize * 0.09));
        const gap = Math.max(2, Math.round(baseSize * 0.03));
        const outerRadius = baseSize / 2 - lineWidth - 1;

        day.metrics.forEach((metric, metricIndex) => {
          const radius = outerRadius - metricIndex * (lineWidth + gap);
          this.drawRing(ctx, centerX, centerY, radius, lineWidth, metric.percent, metric.color);
        });
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
    ctx.strokeStyle = '#173743';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, progressEnd, false);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  },

  goHome() {
    wx.navigateBack();
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/parent/profile/index' });
  },
});
