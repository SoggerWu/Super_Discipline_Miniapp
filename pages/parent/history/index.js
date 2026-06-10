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
        const config = this.getRingConfig(width, height, day.metrics.length);

        day.metrics.forEach((metric, metricIndex) => {
          const radius = config.outerRadius - metricIndex * (config.lineWidth + config.gap);
          this.drawRing(ctx, centerX, centerY, radius, config.lineWidth, metric.percent, metric.color);
        });

        this.drawCenterDisc(ctx, centerX, centerY, config.centerRadius);
      });
    });
  },

  getRingConfig(width, height, ringCount) {
    const baseSize = Math.min(width, height);
    const half = baseSize / 2;
    const outerPadding = Math.max(2, Math.round(baseSize * 0.035));
    const gap = Math.max(1, Math.round(baseSize * 0.012));
    const centerRadius = Math.max(4, Math.round(baseSize * 0.1));
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
    ctx.strokeStyle = '#d6e0e5';
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
    ctx.fillStyle = '#edf3f6';
    ctx.fill();
  },

  goHome() {
    wx.navigateBack();
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/parent/profile/index' });
  },
});
