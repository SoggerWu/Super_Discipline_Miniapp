const STORAGE_KEY = 'super-discipline-records-v4';

const METRICS = [
  { key: 'homework', label: '作业', weight: 0.35 },
  { key: 'recite', label: '背诵', weight: 0.2 },
  { key: 'practice', label: '加练', weight: 0.2 },
  { key: 'discipline', label: '纪律', weight: 0.25 },
];

const DEFAULT_CLASSES = [
  { key: 'class-1', label: '雏鹰班' },
  { key: 'class-2', label: '进阶班' },
  { key: 'class-3', label: '晚训班' },
];

const DEFAULT_STUDENTS = [
  { id: 's1', name: '林浩', className: '雏鹰班', classKey: 'class-1' },
  { id: 's2', name: '许然', className: '雏鹰班', classKey: 'class-1' },
  { id: 's3', name: '周宁', className: '雏鹰班', classKey: 'class-1' },
  { id: 's4', name: '陈语', className: '雏鹰班', classKey: 'class-1' },
  { id: 's5', name: '孙天昊', className: '进阶班', classKey: 'class-2' },
  { id: 's6', name: '李若妍', className: '进阶班', classKey: 'class-2' },
  { id: 's7', name: '朱冰宁', className: '晚训班', classKey: 'class-3' },
  { id: 's8', name: '于祥元', className: '晚训班', classKey: 'class-3' },
];

const SCORE_PATTERNS = {
  s1: [
    { homework: 9, recite: 8, practice: 9, discipline: 10 },
    { homework: 8, recite: 9, practice: 7, discipline: 8 },
    { homework: 7, recite: 8, practice: 8, discipline: 9 },
    { homework: 10, recite: 9, practice: 8, discipline: 10 },
  ],
  s2: [
    { homework: 6, recite: 7, practice: 8, discipline: 6 },
    { homework: 8, recite: 8, practice: 7, discipline: 7 },
    { homework: 7, recite: 6, practice: 7, discipline: 8 },
    { homework: 9, recite: 8, practice: 8, discipline: 8 },
  ],
  s3: [
    { homework: 10, recite: 10, practice: 9, discipline: 9 },
    { homework: 9, recite: 9, practice: 10, discipline: 9 },
    { homework: 8, recite: 8, practice: 9, discipline: 10 },
    { homework: 10, recite: 9, practice: 9, discipline: 10 },
  ],
  s4: [
    { homework: 7, recite: 8, practice: 6, discipline: 7 },
    { homework: 8, recite: 7, practice: 7, discipline: 8 },
    { homework: 6, recite: 7, practice: 6, discipline: 7 },
    { homework: 8, recite: 8, practice: 7, discipline: 8 },
  ],
  s5: [
    { homework: 9, recite: 8, practice: 8, discipline: 9 },
    { homework: 8, recite: 8, practice: 9, discipline: 8 },
    { homework: 9, recite: 9, practice: 8, discipline: 9 },
    { homework: 10, recite: 8, practice: 9, discipline: 9 },
  ],
  s6: [
    { homework: 7, recite: 7, practice: 8, discipline: 7 },
    { homework: 8, recite: 7, practice: 8, discipline: 8 },
    { homework: 8, recite: 8, practice: 7, discipline: 8 },
    { homework: 9, recite: 8, practice: 8, discipline: 8 },
  ],
  s7: [
    { homework: 6, recite: 7, practice: 7, discipline: 6 },
    { homework: 7, recite: 7, practice: 8, discipline: 7 },
    { homework: 8, recite: 7, practice: 8, discipline: 7 },
    { homework: 8, recite: 8, practice: 8, discipline: 8 },
  ],
  s8: [
    { homework: 10, recite: 9, practice: 9, discipline: 10 },
    { homework: 9, recite: 10, practice: 9, discipline: 9 },
    { homework: 9, recite: 9, practice: 10, discipline: 9 },
    { homework: 10, recite: 9, practice: 10, discipline: 10 },
  ],
};

const WORKDAY_LABELS = ['一', '二', '三', '四', '五'];
const FULL_WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const RING_COLORS = {
  blue: '#35A8FF',
  green: '#32D74B',
  orange: '#F5B51F',
  red: '#F5535D',
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getTodayInfo() {
  const now = new Date();
  return buildMonthInfo(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function buildMonthInfo(year, month, day = 1) {
  return {
    year,
    month,
    day,
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
    monthKey: `${year}-${pad(month)}`,
    monthLabel: `${year}年${month}月`,
  };
}

function shiftMonth(year, month, offset) {
  const next = new Date(year, month - 1 + offset, 1);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
  };
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function createEmptyScores() {
  return {
    homework: 0,
    recite: 0,
    practice: 0,
    discipline: 0,
  };
}

function normalizeScores(scores) {
  const base = createEmptyScores();
  return {
    homework: Number(scores && scores.homework != null ? scores.homework : base.homework),
    recite: Number(scores && scores.recite != null ? scores.recite : base.recite),
    practice: Number(scores && scores.practice != null ? scores.practice : base.practice),
    discipline: Number(scores && scores.discipline != null ? scores.discipline : base.discipline),
  };
}

function metricColor(score) {
  if (score >= 10) return RING_COLORS.blue;
  if (score >= 8) return RING_COLORS.green;
  if (score >= 6) return RING_COLORS.orange;
  return RING_COLORS.red;
}

function formatScore(score) {
  return String(Math.round(score));
}

function statusText(status) {
  if (status === 'submitted') return '已提交';
  if (status === 'draft') return '已保存';
  return '未填写';
}

function calculateWeightedScore(scores) {
  const normalized = normalizeScores(scores);
  return Math.round(METRICS.reduce((sum, metric) => sum + normalized[metric.key] * metric.weight, 0) * 10);
}

function mapMetrics(scores) {
  const normalized = normalizeScores(scores);
  return METRICS.map((metric) => ({
    ...metric,
    score: normalized[metric.key],
    scoreText: formatScore(normalized[metric.key]),
    percent: normalized[metric.key] / 10,
    color: metricColor(normalized[metric.key]),
  }));
}

function generateDefaultRecords(students, todayInfo) {
  const records = {};
  const daysInMonth = getDaysInMonth(todayInfo.year, todayInfo.month);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(todayInfo.year, todayInfo.month - 1, day).getDay();
    if (weekday === 0 || weekday === 6) continue;

    const dateKey = `${todayInfo.monthKey}-${pad(day)}`;
    records[dateKey] = {};

    students.forEach((student, index) => {
      const patternSource = SCORE_PATTERNS[student.id] || SCORE_PATTERNS.s1;
      const pattern = patternSource[(day - 1 + index) % patternSource.length];
      records[dateKey][student.id] = {
        scores: normalizeScores(pattern),
        feedback: '',
        photos: [],
        status: dateKey === todayInfo.dateKey && student.id === 's1' ? 'draft' : 'submitted',
      };
    });
  }

  return records;
}

function buildStateFromDefaults() {
  return {
    classes: clone(DEFAULT_CLASSES),
    students: clone(DEFAULT_STUDENTS),
    records: generateDefaultRecords(clone(DEFAULT_STUDENTS), getTodayInfo()),
  };
}

function getState() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (stored && typeof stored === 'object' && stored.classes && stored.students && stored.records) {
      return stored;
    }
  } catch (error) {}

  const defaults = buildStateFromDefaults();
  wx.setStorageSync(STORAGE_KEY, defaults);
  return defaults;
}

function setState(state) {
  wx.setStorageSync(STORAGE_KEY, state);
}

function getRecords() {
  return clone(getState().records);
}

function setRecords(records) {
  const state = getState();
  state.records = clone(records);
  setState(state);
}

function getStudents() {
  return clone(getState().students);
}

function getTeacherClasses() {
  return clone(getState().classes);
}

function getStudentRecord(records, dateKey, studentId) {
  return (records[dateKey] && records[dateKey][studentId]) || {
    scores: createEmptyScores(),
    feedback: '',
    photos: [],
    status: 'idle',
  };
}

function ensureStudentRecords(records, studentId, monthInfo) {
  const nextRecords = clone(records);
  const daysInMonth = getDaysInMonth(monthInfo.year, monthInfo.month);
  const patternSource = SCORE_PATTERNS[studentId] || SCORE_PATTERNS.s1;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(monthInfo.year, monthInfo.month - 1, day).getDay();
    if (weekday === 0 || weekday === 6) continue;

    const dateKey = `${monthInfo.monthKey}-${pad(day)}`;
    nextRecords[dateKey] = nextRecords[dateKey] || {};

    if (!nextRecords[dateKey][studentId]) {
      const pattern = patternSource[(day - 1) % patternSource.length];
      nextRecords[dateKey][studentId] = {
        scores: normalizeScores(pattern),
        feedback: '',
        photos: [],
        status: 'idle',
      };
    }
  }

  return nextRecords;
}

function updateStudentRecord(records, dateKey, studentId, payload) {
  const nextRecords = clone(records);
  nextRecords[dateKey] = nextRecords[dateKey] || {};
  const current = getStudentRecord(nextRecords, dateKey, studentId);
  nextRecords[dateKey][studentId] = {
    ...current,
    ...payload,
    scores: normalizeScores(payload.scores || current.scores),
  };
  setRecords(nextRecords);
  return nextRecords;
}

function addClass(label) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return null;

  const state = getState();
  const nextClass = { key: `class-${Date.now()}`, label: trimmed };
  state.classes.push(nextClass);
  setState(state);
  return clone(nextClass);
}

function addStudent({ name, classKey }) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName || !classKey) return null;

  const state = getState();
  const targetClass = state.classes.find((item) => item.key === classKey);
  if (!targetClass) return null;

  const nextStudent = {
    id: `s-${Date.now()}`,
    name: trimmedName,
    className: targetClass.label,
    classKey,
  };

  state.students.push(nextStudent);
  state.records = ensureStudentRecords(state.records, nextStudent.id, getTodayInfo());
  setState(state);
  return clone(nextStudent);
}

function buildTeacherStudentView(students, records, dateKey, studentId) {
  const activeStudent = students.find((item) => item.id === studentId) || students[0];
  const record = getStudentRecord(records, dateKey, activeStudent.id);
  return {
    ...activeStudent,
    status: record.status || 'idle',
    statusText: statusText(record.status || 'idle'),
    feedback: record.feedback || '',
    photos: record.photos || [],
    totalWeighted: calculateWeightedScore(record.scores),
    metrics: mapMetrics(record.scores),
  };
}

function buildTeacherRail(students, records, dateKey) {
  return students.map((student) => {
    const record = getStudentRecord(records, dateKey, student.id);
    return {
      ...student,
      status: record.status || 'idle',
    };
  });
}

function buildParentHome(studentId) {
  const today = getTodayInfo();
  const records = getRecords();
  const students = getStudents();
  const student = students.find((item) => item.id === studentId) || students[0];
  const record = getStudentRecord(records, today.dateKey, student.id);

  return {
    student,
    today: {
      totalWeighted: calculateWeightedScore(record.scores),
      items: mapMetrics(record.scores),
      feedback: record.feedback || '今天老师还没有填写课堂反馈。',
      photos: record.photos && record.photos.length ? record.photos : ['作业照片待上传'],
    },
    todayInfo: today,
  };
}

function buildParentHistory(studentId, options = {}) {
  const today = getTodayInfo();
  const monthInfo = buildMonthInfo(options.year || today.year, options.month || today.month);
  const showWeekends = Boolean(options.showWeekends);
  const records = getRecords();
  const daysInMonth = getDaysInMonth(monthInfo.year, monthInfo.month);
  const weekdays = showWeekends ? FULL_WEEK_LABELS : WORKDAY_LABELS;
  const columns = showWeekends ? 7 : 5;
  const firstWeekday = new Date(monthInfo.year, monthInfo.month - 1, 1).getDay();
  const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const prefix = showWeekends ? mondayOffset : Math.min(mondayOffset, 5);
  const days = [];

  for (let index = 0; index < prefix; index += 1) {
    days.push({ id: `empty-${index}`, empty: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthInfo.year, monthInfo.month - 1, day);
    const weekday = date.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    if (!showWeekends && isWeekend) continue;

    const dateKey = `${monthInfo.monthKey}-${pad(day)}`;
    const record = getStudentRecord(records, dateKey, studentId);
    days.push({
      id: dateKey,
      dateKey,
      day: String(day),
      isWeekend,
      metrics: mapMetrics(record.scores),
      canvasId: `history-ring-${monthInfo.monthKey}-${day}`,
    });
  }

  return {
    monthLabel: monthInfo.monthLabel,
    year: monthInfo.year,
    month: monthInfo.month,
    weekdays,
    columns,
    showWeekends,
    days,
  };
}

module.exports = {
  METRICS,
  STORAGE_KEY,
  addClass,
  addStudent,
  buildMonthInfo,
  shiftMonth,
  getTodayInfo,
  getStudents,
  getTeacherClasses,
  getRecords,
  setRecords,
  normalizeScores,
  metricColor,
  mapMetrics,
  calculateWeightedScore,
  getStudentRecord,
  updateStudentRecord,
  buildTeacherStudentView,
  buildTeacherRail,
  buildParentHome,
  buildParentHistory,
};
