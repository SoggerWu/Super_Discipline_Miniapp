const MAX_SCORE = 100;
const STORAGE_KEY = 'evening-study-records-v1';

const METRIC_CONFIG = [
  {
    key: 'discipline',
    label: '纪律',
    description: '安静守纪、按要求就座',
    color: '#ff4f85',
    trackColor: 'rgba(255, 79, 133, 0.14)',
  },
  {
    key: 'focus',
    label: '专注',
    description: '持续学习、减少走神',
    color: '#9dff61',
    trackColor: 'rgba(157, 255, 97, 0.14)',
  },
  {
    key: 'task',
    label: '任务',
    description: '完成当晚任务与订正',
    color: '#53d8ff',
    trackColor: 'rgba(83, 216, 255, 0.14)',
  },
];

const DEFAULT_STUDENTS = [
  {
    id: 'stu-1',
    name: '林浩',
    group: '高一(2)班',
    scores: {
      discipline: 86,
      focus: 91,
      task: 84,
    },
  },
  {
    id: 'stu-2',
    name: '许然',
    group: '高一(2)班',
    scores: {
      discipline: 73,
      focus: 78,
      task: 88,
    },
  },
  {
    id: 'stu-3',
    name: '周宁',
    group: '高一(2)班',
    scores: {
      discipline: 94,
      focus: 90,
      task: 96,
    },
  },
];

const SCORE_PATTERNS = {
  'stu-1': [
    { discipline: 88, focus: 82, task: 84 },
    { discipline: 92, focus: 89, task: 90 },
    { discipline: 78, focus: 74, task: 81 },
    { discipline: 84, focus: 88, task: 79 },
    { discipline: 95, focus: 91, task: 93 },
  ],
  'stu-2': [
    { discipline: 76, focus: 79, task: 85 },
    { discipline: 80, focus: 82, task: 88 },
    { discipline: 72, focus: 77, task: 79 },
    { discipline: 79, focus: 75, task: 83 },
    { discipline: 83, focus: 84, task: 86 },
  ],
  'stu-3': [
    { discipline: 93, focus: 94, task: 91 },
    { discipline: 95, focus: 96, task: 94 },
    { discipline: 88, focus: 87, task: 90 },
    { discipline: 91, focus: 90, task: 92 },
    { discipline: 97, focus: 95, task: 96 },
  ],
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMonth(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

function getTodayInfo() {
  const now = new Date();
  return {
    dateKey: formatDate(now),
    monthKey: formatMonth(now),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function shiftMonth(monthKey, offset) {
  const { year, month } = parseMonth(monthKey);
  const date = new Date(year, month - 1 + offset, 1);
  return formatMonth(date);
}

function getDaysInMonth(monthKey) {
  const { year, month } = parseMonth(monthKey);
  return new Date(year, month, 0).getDate();
}

function createEmptyScores() {
  return {
    discipline: 0,
    focus: 0,
    task: 0,
  };
}

function buildMetrics(scores) {
  return METRIC_CONFIG.map((metric) => ({
    ...metric,
    score: scores[metric.key],
    percent: scores[metric.key],
  }));
}

function averageScores(scores) {
  const values = Object.values(scores);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function cloneRecords(records) {
  return JSON.parse(JSON.stringify(records));
}

function mergeRecordMaps(baseRecords, storedRecords) {
  const merged = cloneRecords(baseRecords);

  Object.keys(storedRecords || {}).forEach((date) => {
    merged[date] = {
      ...(merged[date] || {}),
      ...storedRecords[date],
    };
  });

  return merged;
}

function readStoredRecords() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    return stored && typeof stored === 'object' ? stored : {};
  } catch (error) {
    return {};
  }
}

function generateDemoRecords(todayInfo) {
  const records = {};
  const days = getDaysInMonth(todayInfo.monthKey);

  for (let day = 1; day <= days; day += 1) {
    const dateKey = `${todayInfo.monthKey}-${pad(day)}`;
    const weekday = new Date(todayInfo.year, todayInfo.month - 1, day).getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    if (isWeekend) {
      continue;
    }

    records[dateKey] = {};
    DEFAULT_STUDENTS.forEach((student) => {
      const patternList = SCORE_PATTERNS[student.id];
      const template = patternList[(day - 1) % patternList.length];
      records[dateKey][student.id] = {
        scores: { ...template },
      };
    });
  }

  return records;
}

function buildCalendarDays(studentId, recordsByDate, monthKey, todayKey) {
  const { year, month } = parseMonth(monthKey);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const firstDayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = getDaysInMonth(monthKey);
  const leading = Array.from({ length: firstDayOffset }, (_, index) => ({
    id: `empty-leading-${monthKey}-${index}`,
    placeholder: true,
  }));

  const entries = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const date = `${monthKey}-${pad(dayNumber)}`;
    const studentRecord = recordsByDate[date] && recordsByDate[date][studentId];
    const hasRecord = !!studentRecord;
    const scores = hasRecord ? studentRecord.scores : createEmptyScores();
    const average = hasRecord ? averageScores(scores) : 0;

    return {
      id: date,
      date,
      label: `${pad(month)}/${pad(dayNumber)}`,
      day: String(dayNumber),
      average,
      scores,
      empty: !hasRecord,
      today: date === todayKey,
      statusText: hasRecord ? `${average}` : '未评',
      canvasId: `calendarRing-${monthKey}-${dayNumber}`,
    };
  });

  return [...leading, ...entries];
}

function buildMonthTitle(monthKey) {
  const { year, month } = parseMonth(monthKey);
  return `${year} 年 ${month} 月`;
}

function buildVisibleCalendarDays(fullDays, showWeekend) {
  if (showWeekend) {
    return fullDays.map((item) => ({
      ...item,
      cellWidth: '14.285%',
    }));
  }

  const visibleDays = [];
  const rows = Math.ceil(fullDays.length / 7);

  for (let row = 0; row < rows; row += 1) {
    const week = fullDays.slice(row * 7, row * 7 + 7);
    const workweek = week.filter((item, index) => index < 5);
    workweek.forEach((item) => {
      visibleDays.push({
        ...item,
        cellWidth: '20%',
      });
    });
  }

  return visibleDays;
}

function buildCalendarStats(visibleDays) {
  const scoredDays = visibleDays.filter((item) => !item.placeholder && !item.empty);
  const average = scoredDays.length
    ? Math.round(scoredDays.reduce((sum, item) => sum + item.average, 0) / scoredDays.length)
    : 0;

  return {
    scoredDays: scoredDays.length,
    average,
  };
}

function buildCalendarEditorState(date, scores) {
  const normalizedScores = scores || createEmptyScores();
  return {
    date,
    scores: {
      discipline: normalizedScores.discipline || 0,
      focus: normalizedScores.focus || 0,
      task: normalizedScores.task || 0,
    },
    average: averageScores({
      discipline: normalizedScores.discipline || 0,
      focus: normalizedScores.focus || 0,
      task: normalizedScores.task || 0,
    }),
  };
}

Page({
  data: {
    currentTab: 'score',
    currentDate: '',
    todayKey: '',
    viewedMonth: '',
    viewedMonthTitle: '',
    showWeekend: false,
    saveButtonText: '保存今晚评分',
    tabBar: [
      { key: 'score', label: '评分' },
      { key: 'calendar', label: '日历' },
    ],
    weekdayLabels: ['一', '二', '三', '四', '五', '六', '日'],
    calendarWeekdayLabels: ['一', '二', '三', '四', '五'],
    students: DEFAULT_STUDENTS,
    activeStudentId: DEFAULT_STUDENTS[0].id,
    activeStudent: DEFAULT_STUDENTS[0],
    metrics: [],
    summaryScore: 0,
    recordsByDate: {},
    calendarDays: [],
    fullCalendarDays: [],
    calendarStats: {
      scoredDays: 0,
      average: 0,
    },
    selectedCalendarDate: '',
    selectedCalendarSummary: null,
    isCalendarEditorOpen: false,
    calendarEditor: buildCalendarEditorState('', createEmptyScores()),
  },

  onLoad() {
    const todayInfo = getTodayInfo();
    const storedRecords = readStoredRecords();
    const mergedRecords = mergeRecordMaps(generateDemoRecords(todayInfo), storedRecords);

    this.setData(
      {
        currentDate: todayInfo.dateKey,
        todayKey: todayInfo.dateKey,
        viewedMonth: todayInfo.monthKey,
        viewedMonthTitle: buildMonthTitle(todayInfo.monthKey),
        selectedCalendarDate: todayInfo.dateKey,
        recordsByDate: mergedRecords,
      },
      () => {
        this.syncStudentView();
        this.refreshCalendarData(this.data.activeStudentId, this.data.selectedCalendarDate, this.data.viewedMonth);
      }
    );
  },

  onReady() {
    this.drawAllRings();
  },

  handleTabChange(event) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.currentTab) {
      return;
    }

    this.setData({ currentTab: key }, () => {
      this.drawAllRings();
    });
  },

  handleStudentChange(event) {
    const { id } = event.currentTarget.dataset;
    if (!id || id === this.data.activeStudentId) {
      return;
    }

    this.setData({ activeStudentId: id }, () => {
      this.syncStudentView();
      this.refreshCalendarData(id, this.data.selectedCalendarDate, this.data.viewedMonth);
    });
  },

  handleSliderChange(event) {
    const { key } = event.currentTarget.dataset;
    const value = Number(event.detail.value);

    const students = this.data.students.map((student) => {
      if (student.id !== this.data.activeStudentId) {
        return student;
      }

      return {
        ...student,
        scores: {
          ...student.scores,
          [key]: value,
        },
      };
    });

    this.setData(
      {
        students,
        saveButtonText: '保存今晚评分',
      },
      () => {
        this.syncStudentView();
      }
    );
  },

  handleSaveRecord() {
    const recordEntry = {
      scores: { ...this.data.activeStudent.scores },
      studentName: this.data.activeStudent.name,
      savedAt: Date.now(),
    };

    const recordsByDate = {
      ...this.data.recordsByDate,
      [this.data.currentDate]: {
        ...(this.data.recordsByDate[this.data.currentDate] || {}),
        [this.data.activeStudentId]: recordEntry,
      },
    };

    try {
      wx.setStorageSync(STORAGE_KEY, recordsByDate);
    } catch (error) {
      wx.showToast({
        title: '保存失败',
        icon: 'none',
      });
      return;
    }

    this.setData(
      {
        recordsByDate,
        viewedMonth: this.data.currentDate.slice(0, 7),
        viewedMonthTitle: buildMonthTitle(this.data.currentDate.slice(0, 7)),
        selectedCalendarDate: this.data.currentDate,
        saveButtonText: '已保存到今日日历',
      },
      () => {
        this.refreshCalendarData(this.data.activeStudentId, this.data.currentDate, this.data.viewedMonth);
        wx.showToast({
          title: '已保存',
          icon: 'success',
        });
      }
    );
  },

  handleCalendarSelect(event) {
    const { date } = event.currentTarget.dataset;
    if (!date) {
      return;
    }

    this.syncCalendarSelection(date);

    const selected = this.data.calendarDays.find((item) => item.date === date);
    if (!selected || selected.placeholder) {
      return;
    }

    this.setData({
      isCalendarEditorOpen: true,
      calendarEditor: buildCalendarEditorState(date, selected.scores),
    });
  },

  handleMonthChange(event) {
    const { offset } = event.currentTarget.dataset;
    const nextMonth = shiftMonth(this.data.viewedMonth, Number(offset));

    this.setData(
      {
        viewedMonth: nextMonth,
        viewedMonthTitle: buildMonthTitle(nextMonth),
      },
      () => {
        this.refreshCalendarData(this.data.activeStudentId, this.data.selectedCalendarDate, nextMonth);
      }
    );
  },

  handleWeekendToggle() {
    this.setData(
      {
        showWeekend: !this.data.showWeekend,
        calendarWeekdayLabels: !this.data.showWeekend
          ? ['一', '二', '三', '四', '五', '六', '日']
          : ['一', '二', '三', '四', '五'],
      },
      () => {
        this.applyCalendarVisibility(this.data.selectedCalendarDate);
      }
    );
  },

  handleCalendarEditorChange(event) {
    const { key } = event.currentTarget.dataset;
    const value = Number(event.detail.value);
    const nextScores = {
      ...this.data.calendarEditor.scores,
      [key]: value,
    };

    this.setData({
      calendarEditor: {
        ...this.data.calendarEditor,
        scores: nextScores,
        average: averageScores(nextScores),
      },
    });
  },

  handleCalendarEditorClose() {
    this.setData({
      isCalendarEditorOpen: false,
    });
  },

  handleCalendarEditorSave() {
    const date = this.data.calendarEditor.date;
    const recordEntry = {
      scores: { ...this.data.calendarEditor.scores },
      studentName: this.data.activeStudent.name,
      savedAt: Date.now(),
    };

    const recordsByDate = {
      ...this.data.recordsByDate,
      [date]: {
        ...(this.data.recordsByDate[date] || {}),
        [this.data.activeStudentId]: recordEntry,
      },
    };

    try {
      wx.setStorageSync(STORAGE_KEY, recordsByDate);
    } catch (error) {
      wx.showToast({
        title: '保存失败',
        icon: 'none',
      });
      return;
    }

    this.setData(
      {
        recordsByDate,
        isCalendarEditorOpen: false,
      },
      () => {
        this.refreshCalendarData(this.data.activeStudentId, date, this.data.viewedMonth);
        wx.showToast({
          title: '已更新',
          icon: 'success',
        });
      }
    );
  },

  syncStudentView() {
    const activeStudent = this.data.students.find((student) => student.id === this.data.activeStudentId) || this.data.students[0];
    const metrics = buildMetrics(activeStudent.scores);
    const summaryScore = averageScores(activeStudent.scores);

    this.setData(
      {
        activeStudent,
        metrics,
        summaryScore,
      },
      () => {
        this.drawMainRing();
      }
    );
  },

  refreshCalendarData(studentId, preferredDate, monthKey) {
    const fullCalendarDays = buildCalendarDays(studentId, this.data.recordsByDate, monthKey, this.data.todayKey);
    const availableDates = fullCalendarDays.filter((item) => !item.placeholder);
    const sameMonthPreferred = preferredDate && preferredDate.startsWith(monthKey);
    const fallbackDate = sameMonthPreferred
      ? preferredDate
      : `${monthKey}-${pad(1)}`;
    const selectedDate = availableDates.some((item) => item.date === fallbackDate)
      ? fallbackDate
      : availableDates[0].date;

    this.setData(
      {
        fullCalendarDays,
        selectedCalendarDate: selectedDate,
      },
      () => {
        this.applyCalendarVisibility(selectedDate);
      }
    );
  },

  applyCalendarVisibility(selectedDate) {
    const calendarDays = buildVisibleCalendarDays(this.data.fullCalendarDays, this.data.showWeekend);
    const visibleDates = calendarDays.filter((item) => !item.placeholder).map((item) => item.date);
    const nextSelectedDate = visibleDates.includes(selectedDate)
      ? selectedDate
      : visibleDates[0];

    this.setData(
      {
        calendarDays,
        calendarStats: buildCalendarStats(calendarDays),
        selectedCalendarDate: nextSelectedDate,
      },
      () => {
        this.syncCalendarSelection(nextSelectedDate);
        this.drawCalendarRings();
      }
    );
  },

  syncCalendarSelection(date) {
    const selected = this.data.calendarDays.find((item) => item.date === date);
    if (!selected || selected.placeholder) {
      return;
    }

    this.setData({
      selectedCalendarDate: date,
      selectedCalendarSummary: {
        date: selected.date,
        label: selected.label,
        average: selected.average,
        detail: '',
      },
    });
  },

  drawAllRings() {
    this.drawMainRing();
    this.drawCalendarRings();
  },

  drawMainRing() {
    const query = wx.createSelectorQuery();
    query.select('#scoreRings').fields({ node: true, size: true }).exec((res) => {
      const canvasNode = res && res[0];
      if (!canvasNode || !canvasNode.node) {
        return;
      }

      const baseSize = Math.min(canvasNode.width, canvasNode.height);
      const lineWidth = Math.max(16, Math.round(baseSize * 0.045));
      const gap = Math.max(14, Math.round(baseSize * 0.026));
      const outerRadius = baseSize / 2 - lineWidth - 10;

      const rings = this.data.metrics.map((metric, index) => ({
        radius: outerRadius - index * (lineWidth + gap),
        lineWidth,
        progress: metric.percent / 100,
        color: metric.color,
        trackColor: metric.trackColor,
      }));

      this.paintRingCanvas(canvasNode, rings);
    });
  },

  drawCalendarRings() {
    const query = wx.createSelectorQuery();
    query.selectAll('.calendar-ring-canvas').fields({ node: true, size: true }).exec((res) => {
      const list = res && res[0];
      if (!list || !list.length) {
        return;
      }

      const drawableDays = this.data.calendarDays.filter((item) => !item.placeholder);
      list.forEach((canvasNode, index) => {
        const day = drawableDays[index];
        if (!day || day.empty) {
          this.paintRingCanvas(canvasNode, []);
          return;
        }

        const baseSize = Math.min(canvasNode.width, canvasNode.height);
        const lineWidth = Math.max(3, Math.round(baseSize * 0.08));
        const gap = Math.max(2, Math.round(baseSize * 0.025));
        const outerRadius = baseSize / 2 - lineWidth - 1;

        const rings = METRIC_CONFIG.map((metric, ringIndex) => ({
          radius: outerRadius - ringIndex * (lineWidth + gap),
          lineWidth,
          progress: day.scores[metric.key] / 100,
          color: metric.color,
          trackColor: metric.trackColor,
        }));

        this.paintRingCanvas(canvasNode, rings);
      });
    });
  },

  paintRingCanvas(canvasNode, rings) {
    if (!canvasNode || !canvasNode.node) {
      return;
    }

    const { node: canvas, width, height } = canvasNode;
    const context = canvas.getContext('2d');
    const dpr = wx.getWindowInfo().pixelRatio;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    context.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    rings.forEach((ring) => {
      this.drawRing(context, centerX, centerY, ring);
    });
  },

  drawRing(context, centerX, centerY, ring) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2;
    const progressEnd = startAngle + Math.PI * 2 * ring.progress;

    context.beginPath();
    context.arc(centerX, centerY, ring.radius, startAngle, endAngle, false);
    context.lineWidth = ring.lineWidth;
    context.lineCap = 'round';
    context.strokeStyle = ring.trackColor;
    context.stroke();

    context.beginPath();
    context.arc(centerX, centerY, ring.radius, startAngle, progressEnd, false);
    context.lineWidth = ring.lineWidth;
    context.lineCap = 'round';
    context.strokeStyle = ring.color;
    context.stroke();
  },
});
