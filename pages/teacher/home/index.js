const store = require('../../../utils/score-store');

Page({
  data: {
    title: '超级纪律（教师端）',
    dateLabel: '',
    classes: [],
    activeClassKey: '',
    students: [],
    activeStudentId: '',
    activeStudent: null,
    records: {},
    showStudentModal: false,
    showClassModal: false,
    newStudentName: '',
    newClassName: '',
  },

  onLoad() {
    const today = store.getTodayInfo();
    const classes = store.getTeacherClasses();
    const records = store.getRecords();
    const students = store.getStudents();
    const activeClassKey = classes[0] ? classes[0].key : '';
    const firstStudent = students.find((item) => item.classKey === activeClassKey);

    this.setData(
      {
        dateLabel: today.dateKey,
        classes,
        activeClassKey,
        activeStudentId: firstStudent ? firstStudent.id : '',
        records,
      },
      () => this.syncView()
    );
  },

  onReady() {
    this.drawTeacherRings();
  },

  refreshRoster(callback) {
    const classes = store.getTeacherClasses();
    const records = store.getRecords();
    this.setData({ classes, records }, () => {
      this.syncView();
      if (callback) callback();
    });
  },

  syncView() {
    const baseStudents = store
      .getStudents()
      .filter((item) => item.classKey === this.data.activeClassKey);
    const students = store.buildTeacherRail(baseStudents, this.data.records, this.data.dateLabel);
    const fallbackStudentId = students[0] ? students[0].id : '';
    const activeStudentId = students.some((item) => item.id === this.data.activeStudentId)
      ? this.data.activeStudentId
      : fallbackStudentId;
    const activeStudent = activeStudentId
      ? store.buildTeacherStudentView(students, this.data.records, this.data.dateLabel, activeStudentId)
      : null;

    this.setData(
      {
        students,
        activeStudentId,
        activeStudent,
      },
      () => this.drawTeacherRings()
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
      const config = this.getRingConfig(width, height, activeStudent.metrics.length);

      activeStudent.metrics.forEach((metric, index) => {
        const radius = config.outerRadius - index * (config.lineWidth + config.gap);
        this.drawRing(ctx, centerX, centerY, radius, config.lineWidth, metric.percent, metric.color);
      });

      this.drawCenterDisc(ctx, centerX, centerY, config.centerRadius);
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

  handleClassChange(event) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.activeClassKey) return;
    this.setData(
      {
        activeClassKey: key,
        activeStudentId: '',
      },
      () => this.syncView()
    );
  },

  handleStudentChange(event) {
    const { id } = event.currentTarget.dataset;
    if (!id || id === this.data.activeStudentId) return;
    this.setData({ activeStudentId: id }, () => this.syncView());
  },

  openStudentModal() {
    this.setData({ showStudentModal: true, newStudentName: '' });
  },

  openClassModal() {
    this.setData({ showClassModal: true, newClassName: '' });
  },

  closeModal() {
    this.setData({
      showStudentModal: false,
      showClassModal: false,
      newStudentName: '',
      newClassName: '',
    });
  },

  handleStudentNameInput(event) {
    this.setData({ newStudentName: event.detail.value });
  },

  handleClassNameInput(event) {
    this.setData({ newClassName: event.detail.value });
  },

  handleAddStudent() {
    const student = store.addStudent({
      name: this.data.newStudentName,
      classKey: this.data.activeClassKey,
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

  handleAddClass() {
    const nextClass = store.addClass(this.data.newClassName);
    if (!nextClass) {
      wx.showToast({ title: '请输入班级名称', icon: 'none' });
      return;
    }

    this.setData(
      {
        showClassModal: false,
        newClassName: '',
        activeClassKey: nextClass.key,
        activeStudentId: '',
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

    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: activeStudent.status === 'submitted' ? 'submitted' : 'draft',
        scores: {
          ...currentScores,
          [key]: value,
        },
        feedback: activeStudent.feedback,
        photos: activeStudent.photos,
      }
    );

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

    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: activeStudent.status === 'submitted' ? 'submitted' : 'draft',
        scores: currentScores,
        feedback,
        photos: activeStudent.photos,
      }
    );

    this.setData({ records }, () => this.syncView());
  },

  handlePickImages() {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      success: (res) => {
        const photos = (res.tempFiles || []).map((file) => file.tempFilePath);
        const currentScores = activeStudent.metrics.reduce((result, metric) => {
          result[metric.key] = metric.score;
          return result;
        }, {});

        const records = store.updateStudentRecord(
          this.data.records,
          this.data.dateLabel,
          this.data.activeStudentId,
          {
            status: activeStudent.status === 'submitted' ? 'submitted' : 'draft',
            scores: currentScores,
            feedback: activeStudent.feedback,
            photos: [...activeStudent.photos, ...photos].slice(0, 3),
          }
        );

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

    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: activeStudent.status,
        scores: currentScores,
        feedback: activeStudent.feedback,
        photos: activeStudent.photos.filter((_, photoIndex) => photoIndex !== index),
      }
    );

    this.setData({ records }, () => this.syncView());
  },

  handleSave() {
    const activeStudent = this.data.activeStudent;
    if (!activeStudent) return;

    const currentScores = activeStudent.metrics.reduce((result, metric) => {
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
        feedback: activeStudent.feedback,
        photos: activeStudent.photos,
      }
    );

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

    const records = store.updateStudentRecord(
      this.data.records,
      this.data.dateLabel,
      this.data.activeStudentId,
      {
        status: 'submitted',
        scores: currentScores,
        feedback: activeStudent.feedback,
        photos: activeStudent.photos,
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
