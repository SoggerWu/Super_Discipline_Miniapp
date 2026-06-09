const store = require('../../../utils/score-store');

Page({
  data: {
    className: '高一(2)班',
    dateLabel: '',
    students: [],
    activeStudentId: '',
    activeStudent: null,
    records: {},
  },

  onLoad() {
    const today = store.getTodayInfo();
    const baseStudents = store.getStudents();
    const records = store.getRecords();

    this.setData(
      {
        className: baseStudents[0].className,
        dateLabel: today.dateKey,
        activeStudentId: baseStudents[0].id,
        records,
      },
      () => {
        this.syncView();
      }
    );
  },

  onReady() {
    this.drawTeacherRings();
  },

  syncView() {
    const baseStudents = store.getStudents();
    const students = store.buildTeacherRail(baseStudents, this.data.records, this.data.dateLabel);
    const activeStudent = store.buildTeacherStudentView(
      baseStudents,
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId
    );

    this.setData(
      {
        students,
        activeStudent,
      },
      () => {
        this.drawTeacherRings();
      }
    );
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
      const dpr = wx.getWindowInfo().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseSize = Math.min(width, height);
      const lineWidth = Math.max(14, Math.round(baseSize * 0.055));
      const gap = Math.max(8, Math.round(baseSize * 0.022));
      const outerRadius = baseSize / 2 - lineWidth / 2 - 10;

      activeStudent.metrics.forEach((metric, index) => {
        const radius = outerRadius - index * (lineWidth + gap);
        this.drawRing(ctx, centerX, centerY, radius, lineWidth, metric.percent, metric.color);
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

  handleStudentChange(event) {
    const { id } = event.currentTarget.dataset;
    if (!id || id === this.data.activeStudentId) return;
    this.setData({ activeStudentId: id }, () => this.syncView());
  },

  handleScoreChange(event) {
    const { key } = event.currentTarget.dataset;
    const value = Number(event.detail.value);
    const currentScores = this.data.activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});

    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: this.data.activeStudent.status === 'submitted' ? 'submitted' : 'draft',
        scores: {
          ...currentScores,
          [key]: value,
        },
        feedback: this.data.activeStudent.feedback,
        photos: this.data.activeStudent.photos,
      }
    );

    this.setData({ records }, () => this.syncView());
  },

  handleFeedbackInput(event) {
    const feedback = event.detail.value;
    const currentScores = this.data.activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});

    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: this.data.activeStudent.status === 'submitted' ? 'submitted' : 'draft',
        scores: currentScores,
        feedback,
        photos: this.data.activeStudent.photos,
      }
    );

    this.setData({ records }, () => this.syncView());
  },

  handlePickImages() {
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      success: (res) => {
        const photos = (res.tempFiles || []).map((file) => file.tempFilePath);
        const currentScores = this.data.activeStudent.metrics.reduce((result, metric) => {
          result[metric.key] = metric.score;
          return result;
        }, {});

        const records = store.updateStudentRecord(
          this.data.records,
          this.data.dateLabel,
          this.data.activeStudentId,
          {
            status: this.data.activeStudent.status === 'submitted' ? 'submitted' : 'draft',
            scores: currentScores,
            feedback: this.data.activeStudent.feedback,
            photos: [...this.data.activeStudent.photos, ...photos].slice(0, 3),
          }
        );

        this.setData({ records }, () => this.syncView());
      },
    });
  },

  handleRemovePhoto(event) {
    const { index } = event.currentTarget.dataset;
    const currentScores = this.data.activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});
    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: this.data.activeStudent.status,
        scores: currentScores,
        feedback: this.data.activeStudent.feedback,
        photos: this.data.activeStudent.photos.filter((_, photoIndex) => photoIndex !== index),
      }
    );
    this.setData({ records }, () => this.syncView());
  },

  handleSave() {
    const currentScores = this.data.activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});
    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: 'draft',
        scores: currentScores,
        feedback: this.data.activeStudent.feedback,
        photos: this.data.activeStudent.photos,
      }
    );
    this.setData({ records }, () => {
      this.syncView();
      wx.showToast({ title: '已保存', icon: 'success' });
    });
  },

  handleSubmit() {
    const currentScores = this.data.activeStudent.metrics.reduce((result, metric) => {
      result[metric.key] = metric.score;
      return result;
    }, {});
    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: 'submitted',
        scores: currentScores,
        feedback: this.data.activeStudent.feedback,
        photos: this.data.activeStudent.photos,
      }
    );
    this.setData({ records }, () => {
      this.syncView();
      wx.showToast({ title: '已提交', icon: 'success' });
    });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/teacher/history/index' });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/teacher/profile/index' });
  },
});
