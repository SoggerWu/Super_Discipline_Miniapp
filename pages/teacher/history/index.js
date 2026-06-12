const store = require('../../../utils/score-store');
const { getSystemInfo, chooseImageMedia } = require('../../../utils/wx-compat');

function formatDateLabel(dateKey) {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function buildModalState(record, dateKey) {
  const scores = store.normalizeScores(record.scores);
  return {
    modalDateKey: dateKey,
    modalDateLabel: formatDateLabel(dateKey),
    modalScores: scores,
    modalMetrics: store.mapMetrics(scores),
    modalTotal: store.calculateWeightedScore(scores),
    modalFeedback: record.feedback || '',
    modalPhotos: record.photos || [],
    modalStatus: record.status || 'idle',
  };
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
    classes: [],
    activeClassKey: '',
    students: [],
    activeStudentId: '',
    activeStudentName: '',
    records: {},
    showDetailModal: false,
    modalDateKey: '',
    modalDateLabel: '',
    modalScores: null,
    modalMetrics: [],
    modalTotal: 0,
    modalFeedback: '',
    modalPhotos: [],
    modalStatus: 'idle',
  },

  onLoad() {
    const today = store.getTodayInfo();
    const windowInfo = getSystemInfo();
    const classes = store.getTeacherClasses();
    const allStudents = store.getStudents();
    const records = store.getRecords();
    const activeClassKey = classes[0] ? classes[0].key : '';
    const firstStudent = allStudents.find((item) => item.classKey === activeClassKey);
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
        classes,
        activeClassKey,
        activeStudentId: firstStudent ? firstStudent.id : '',
        records,
      },
      () => this.syncView()
    );
  },

  onShow() {
    this.setData({ records: store.getRecords() }, () => this.syncView());
  },

  syncView() {
    const allStudents = store.getStudents();
    const students = allStudents.filter((item) => item.classKey === this.data.activeClassKey);
    const fallbackStudent = students[0] || null;
    const activeStudent = students.find((item) => item.id === this.data.activeStudentId) || fallbackStudent;

    const history = activeStudent
      ? store.buildParentHistory(activeStudent.id, {
          year: this.data.year,
          month: this.data.month,
          showWeekends: this.data.showWeekends,
        })
      : {
          monthLabel: `${this.data.year}年${this.data.month}月`,
          weekdays: this.data.showWeekends ? ['一', '二', '三', '四', '五', '六', '日'] : ['一', '二', '三', '四', '五'],
          days: [],
          columns: this.data.showWeekends ? 7 : 5,
          year: this.data.year,
          month: this.data.month,
        };

    this.setData(
      {
        students,
        activeStudentId: activeStudent ? activeStudent.id : '',
        activeStudentName: activeStudent ? activeStudent.name : '',
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

  handleClassChange(event) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.activeClassKey) return;
    this.setData({ activeClassKey: key, activeStudentId: '' }, () => this.syncView());
  },

  handleStudentChange(event) {
    const { id } = event.currentTarget.dataset;
    if (!id || id === this.data.activeStudentId) return;
    this.setData({ activeStudentId: id }, () => this.syncView());
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
    if (Math.abs(deltaY) > 4) this.toggleDragState.moved = true;
    this.setData({ toggleTop: this.clampToggleTop(this.toggleDragState.startTop + deltaY) });
  },

  handleToggleTouchEnd() {
    if (!this.toggleDragState.moved) this.toggleWeekends();
  },

  clampToggleTop(value) {
    return Math.max(this.toggleDragState.minTop, Math.min(this.toggleDragState.maxTop, value));
  },

  openDayDetail(event) {
    const { dateKey } = event.currentTarget.dataset;
    if (!dateKey || !this.data.activeStudentId) return;

    const record = store.getStudentRecord(this.data.records, dateKey, this.data.activeStudentId);
    this.setData({
      showDetailModal: true,
      ...buildModalState(record, dateKey),
    });
  },

  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      modalDateKey: '',
      modalDateLabel: '',
      modalScores: null,
      modalMetrics: [],
      modalTotal: 0,
      modalFeedback: '',
      modalPhotos: [],
      modalStatus: 'idle',
    });
  },

  handleModalScoreChange(event) {
    const { key } = event.currentTarget.dataset;
    const nextValue = Number(event.detail.value);
    const modalScores = {
      ...(this.data.modalScores || store.normalizeScores({})),
      [key]: nextValue,
    };

    this.setData({
      modalScores,
      modalMetrics: store.mapMetrics(modalScores),
      modalTotal: store.calculateWeightedScore(modalScores),
      modalStatus: this.data.modalStatus === 'submitted' ? 'submitted' : 'draft',
    });
  },

  handleModalFeedbackInput(event) {
    this.setData({
      modalFeedback: event.detail.value,
      modalStatus: this.data.modalStatus === 'submitted' ? 'submitted' : 'draft',
    });
  },

  handleModalPickImages() {
    chooseImageMedia({
      count: 3,
      mediaType: ['image'],
      success: (res) => {
        const photos = (res.tempFiles || []).map((file) => file.tempFilePath);
        this.setData({
          modalPhotos: [...this.data.modalPhotos, ...photos].slice(0, 3),
          modalStatus: this.data.modalStatus === 'submitted' ? 'submitted' : 'draft',
        });
      },
    });
  },

  handleModalRemovePhoto(event) {
    const { index } = event.currentTarget.dataset;
    this.setData({
      modalPhotos: this.data.modalPhotos.filter((_, photoIndex) => photoIndex !== index),
      modalStatus: this.data.modalStatus === 'submitted' ? 'submitted' : 'draft',
    });
  },

  saveModalRecord(status) {
    if (!this.data.modalDateKey || !this.data.activeStudentId) return;

    const records = store.updateStudentRecord(this.data.records, this.data.modalDateKey, this.data.activeStudentId, {
      status,
      scores: this.data.modalScores,
      feedback: this.data.modalFeedback,
      photos: this.data.modalPhotos,
    });

    this.setData(
      {
        records,
        modalStatus: status,
      },
      () => this.syncView()
    );
  },

  handleModalSave() {
    this.saveModalRecord('draft');
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  handleModalSubmit() {
    this.saveModalRecord('submitted');
    wx.showToast({ title: '已提交', icon: 'success' });
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

    return { outerRadius, lineWidth, gap, centerRadius, outlineWidth };
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
    wx.redirectTo({ url: '/pages/teacher/home/index' });
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/teacher/profile/index' });
  },
});
