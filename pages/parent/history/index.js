const store = require('../../../utils/score-store');
const { getSystemInfo } = require('../../../utils/wx-compat');

function formatDateLabel(dateKey) {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

Page({
  data: {
    monthLabel: '',
    weekdays: [],
    days: [],
    columns: 5,
    year: 0,
    month: 0,
    showWeekends: false,
    toggleTop: 320,
    records: {},
    showDetailModal: false,
    modalDateLabel: '',
    modalMetrics: [],
    modalTotal: 0,
    modalFeedback: '',
    modalPhotos: [],
    modalStatus: '',
  },

  onLoad() {
    const today = store.getTodayInfo();
    const windowInfo = getSystemInfo();
    const initialTop = Math.max(180, Math.round(windowInfo.windowHeight * 0.42));

    this.toggleDragState = {
      startY: 0,
      startTop: initialTop,
      moved: false,
      minTop: 150,
      maxTop: windowInfo.windowHeight - 220,
    };

    this.setData(
      {
        year: today.year,
        month: today.month,
        toggleTop: initialTop,
        records: store.getRecords(),
      },
      () => this.syncView()
    );
  },

  onShow() {
    this.setData({ records: store.getRecords() }, () => this.syncView());
  },

  syncView() {
    const history = store.buildParentHistory('s1', {
      year: this.data.year,
      month: this.data.month,
      showWeekends: this.data.showWeekends,
    });

    this.setData(
      {
        monthLabel: history.monthLabel,
        weekdays: history.weekdays,
        days: history.days,
        columns: history.columns,
        year: history.year,
        month: history.month,
      },
      () => this.drawHistoryRings()
    );
  },

  handlePrevMonth() {
    const prev = store.shiftMonth(this.data.year, this.data.month, -1);
    this.setData(prev, () => this.syncView());
  },

  handleNextMonth() {
    const next = store.shiftMonth(this.data.year, this.data.month, 1);
    this.setData(next, () => this.syncView());
  },

  toggleWeekends() {
    this.setData({ showWeekends: !this.data.showWeekends }, () => this.syncView());
  },

  handleToggleTouchStart(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    this.toggleDragState.startY = touch.clientY;
    this.toggleDragState.startTop = this.data.toggleTop;
    this.toggleDragState.moved = false;
  },

  handleToggleTouchMove(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - this.toggleDragState.startY;
    if (Math.abs(deltaY) > 4) {
      this.toggleDragState.moved = true;
    }

    const nextTop = this.clampToggleTop(this.toggleDragState.startTop + deltaY);
    this.setData({ toggleTop: nextTop });
  },

  handleToggleTouchEnd() {
    if (!this.toggleDragState.moved) {
      this.toggleWeekends();
    }
  },

  clampToggleTop(value) {
    return Math.max(this.toggleDragState.minTop, Math.min(this.toggleDragState.maxTop, value));
  },

  openDayDetail(event) {
    const { dateKey } = event.currentTarget.dataset;
    if (!dateKey) return;

    const record = store.getStudentRecord(this.data.records, dateKey, 's1');
    const scores = store.normalizeScores(record.scores);

    this.setData({
      showDetailModal: true,
      modalDateLabel: formatDateLabel(dateKey),
      modalMetrics: store.mapMetrics(scores),
      modalTotal: store.calculateWeightedScore(scores),
      modalFeedback: record.feedback || '老师当天还没有填写课堂反馈。',
      modalPhotos: record.photos || [],
      modalStatus: record.status === 'submitted' ? '已提交' : record.status === 'draft' ? '已保存' : '未填写',
    });
  },

  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      modalDateLabel: '',
      modalMetrics: [],
      modalTotal: 0,
      modalFeedback: '',
      modalPhotos: [],
      modalStatus: '',
    });
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
        const dpr = getSystemInfo().pixelRatio;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const config = this.getRingConfig(width, height, day.metrics.length);

        this.drawRingBackdrop(ctx, centerX, centerY, config.outerRadius + config.lineWidth / 2);

        day.metrics.forEach((metric, metricIndex) => {
          const radius = config.outerRadius - metricIndex * (config.lineWidth + config.gap);
          this.drawRing(ctx, centerX, centerY, radius, config.lineWidth, metric.percent, metric.color);
        });

        this.drawOuterRing(ctx, centerX, centerY, config.outerRadius + config.lineWidth / 2, config.outlineWidth);
        this.drawCenterDisc(ctx, centerX, centerY, config.centerRadius);
      });
    });
  },

  getRingConfig(width, height, ringCount) {
    const baseSize = Math.min(width, height);
    const half = baseSize / 2;
    const outerPadding = Math.max(1, Math.round(baseSize * 0.01));
    const gap = Math.max(1, Math.round(baseSize * 0.004));
    const centerRadius = Math.max(3, Math.round(baseSize * 0.058));
    const lineWidth = (half - outerPadding - centerRadius - gap * (ringCount - 1)) / ringCount;
    const outerRadius = half - outerPadding - lineWidth / 2;
    const outlineWidth = Math.max(2, Math.round(baseSize * 0.022));

    return {
      outerRadius,
      lineWidth,
      gap,
      centerRadius,
      outlineWidth,
    };
  },

  drawRingBackdrop(ctx, centerX, centerY, radius) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
    ctx.fillStyle = '#0a2b39';
    ctx.fill();
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

  drawOuterRing(ctx, centerX, centerY, radius, lineWidth) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#04151d';
    ctx.stroke();
  },

  drawCenterDisc(ctx, centerX, centerY, radius) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
    ctx.fillStyle = '#0a2b39';
    ctx.fill();
  },

  goHome() {
    wx.redirectTo({ url: '/pages/parent/home/index' });
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/parent/profile/index' });
  },
});
