const store = require('../../../utils/score-store');
const { getSystemInfo, chooseImageMedia } = require('../../../utils/wx-compat');

Page({
  data: {
    title: '超级纪律（教师端）',
    classLabel: '',
    dateLabel: '',
    students: [],
    activeStudentId: '',
    activeStudent: null,
    records: {},
    showStudentModal: false,
    newStudentName: '',
  },

  onLoad() {
    const today = store.getTodayInfo();
    const classes = store.getTeacherClasses();
    const records = store.getRecords();
    const students = store.getStudents();
    const firstStudent = students[0] || null;

    this.setData(
      {
        classLabel: classes[0] ? classes[0].label : '',
        dateLabel: today.dateKey,
        activeStudentId: firstStudent ? firstStudent.id : '',
        records,
      },
      () => this.syncView()
    );
  },

  onShow() {
    this.refreshRoster();
  },

  onReady() {
    this.drawTeacherRings();
  },

  refreshRoster(callback) {
    const classes = store.getTeacherClasses();
    const records = store.getRecords();
    this.setData(
      {
        classLabel: classes[0] ? classes[0].label : '',
        records,
      },
      () => {
        this.syncView();
        if (callback) callback();
      }
    );
  },

  syncView() {
    const baseStudents = store.getStudents();
    const students = store.buildTeacherRail(baseStudents, this.data.records, this.data.dateLabel);
    const fallbackStudentId = students[0] ? students[0].id : '';
    const activeStudentId = students.some((item) => item.id === this.data.activeStudentId)
      ? this.data.activeStudentId
      : fallbackStudentId;
    const activeStudent = activeStudentId
      ? store.buildTeacherStudentView(students, this.data.records, this.data.dateLabel, activeStudentId)
      : null;

    this.setData({ students, activeStudentId, activeStudent }, () => this.drawTeacherRings());
  },

  drawTeacherRings() {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    const query = wx.createSelectorQuery();
    query.select('#teacherRings').fields({ node: true, size: true }).exec((res) => {
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
      const config = this.getRingConfig(width, height, activeStudent.metrics.length);

      activeStudent.metrics.forEach((metric, index) => {
        const radius = config.outerRadius - index * (config.lineWidth + config.gap);
        this.drawRing(ctx, centerX, centerY, radius, config.lineWidth, metric.percent, metric.color);
      });

      this.drawCenterDisc(ctx, centerX, centerY, config.centerRadius);
      this.drawCenterScore(ctx, centerX, centerY, activeStudent.totalWeighted);
    });
  },

  getRingConfig(width, height, ringCount) {
    const baseSize = Math.min(width, height);
    const half = baseSize / 2;
    const outerPadding = Math.max(8, Math.round(baseSize * 0.03));
    const gap = Math.max(2, Math.round(baseSize * 0.012));
    const centerRadius = Math.max(26, Math.round(baseSize * 0.115));
    const lineWidth = (half - outerPadding - centerRadius - gap * (ringCount - 1)) / ringCount;
    const outerRadius = half - outerPadding - lineWidth / 2;

    return { outerRadius, lineWidth, gap, centerRadius };
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
    ctx.font = '700 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score), centerX, centerY);
  },

  handleStudentChange(event) {
    const { id } = event.currentTarget.dataset;
    if (!id || id === this.data.activeStudentId) return;
    this.setData({ activeStudentId: id }, () => this.syncView());
  },

  openStudentModal() {
    this.setData({ showStudentModal: true, newStudentName: '' });
  },

  closeModal() {
    this.setData({
      showStudentModal: false,
      newStudentName: '',
    });
  },

  handleStudentNameInput(event) {
    this.setData({ newStudentName: event.detail.value });
  },

  handleAddStudent() {
    const student = store.addStudent({
      name: this.data.newStudentName,
      classKey: store.getTeacherClasses()[0] ? store.getTeacherClasses()[0].key : '',
    });

    if (!student) {
      wx.showToast({ title: '请输入学生姓名', icon: 'none' });
      return;
    }

    this.setData(
      {
        showStudentModal: false,
        newStudentName: '',
        activeStudentId: student.id,
      },
      () => this.refreshRoster()
    );
  },

  handleScoreChange(event) {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    const { key } = event.currentTarget.dataset;
    const value = Number(event.detail.value);
    const currentScores = activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});

    const records = store.updateStudentRecord(this.data.records, this.data.dateLabel, this.data.activeStudentId, {
      status: 'draft',
      scores: { ...currentScores, [key]: value },
      feedback: activeStudent.feedback,
      photos: activeStudent.photos,
    });

    this.setData({ records }, () => this.syncView());
  },

  handleFeedbackInput(event) {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    const feedback = event.detail.value;
    const currentScores = activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});

    const records = store.updateStudentRecord(this.data.records, this.data.dateLabel, this.data.activeStudentId, {
      status: 'draft',
      scores: currentScores,
      feedback,
      photos: activeStudent.photos,
    });

    this.setData({ records }, () => this.syncView());
  },

  handlePickImages() {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    chooseImageMedia({
      count: 3,
      mediaType: ['image'],
      success: (res) => {
        const photos = (res.tempFiles || []).map((file) => file.tempFilePath);
        const currentScores = activeStudent.metrics.reduce((result, metric) => {
          result[metric.key] = metric.score;
          return result;
        }, {});

        const records = store.updateStudentRecord(this.data.records, this.data.dateLabel, this.data.activeStudentId, {
          status: 'draft',
          scores: currentScores,
          feedback: activeStudent.feedback,
          photos: [...activeStudent.photos, ...photos].slice(0, 3),
        });

        this.setData({ records }, () => this.syncView());
      },
    });
  },

  handleRemovePhoto(event) {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    const { index } = event.currentTarget.dataset;
    const currentScores = activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});

    const records = store.updateStudentRecord(this.data.records, this.data.dateLabel, this.data.activeStudentId, {
      status: 'draft',
      scores: currentScores,
      feedback: activeStudent.feedback,
      photos: activeStudent.photos.filter((_, photoIndex) => photoIndex !== index),
    });

    this.setData({ records }, () => this.syncView());
  },

  handleSave() {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    const currentScores = activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});

    const records = store.updateStudentRecord(this.data.records, this.data.dateLabel, this.data.activeStudentId, {
      status: 'draft',
      scores: currentScores,
      feedback: activeStudent.feedback,
      photos: activeStudent.photos,
    });

    this.setData({ records }, () => {
      this.syncView();
      wx.showToast({ title: '已保存', icon: 'success' });
    });
  },

  handleSubmit() {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    const currentScores = activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});

    const records = store.updateStudentRecord(this.data.records, this.data.dateLabel, this.data.activeStudentId, {
      status: 'submitted',
      scores: currentScores,
      feedback: activeStudent.feedback,
      photos: activeStudent.photos,
    });

    this.setData({ records }, () => {
      this.syncView();
      wx.showToast({ title: '已提交', icon: 'success' });
    });
  },

  goRecord() {
    wx.redirectTo({ url: '/pages/teacher/history/index' });
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/teacher/profile/index' });
  },
});
