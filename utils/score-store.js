const STORAGE_KEY = 'super-discipline-records-v2';

const METRICS = [
  { key: 'homework', label: '作业', weight: 0.35 },
  { key: 'recite', label: '背诵', weight: 0.2 },
  { key: 'practice', label: '加练', weight: 0.2 },
  { key: 'discipline', label: '纪律', weight: 0.25 },
];

const STUDENTS = [
  { id: 's1', name: '林浩', className: '高一(2)班' },
  { id: 's2', name: '许然', className: '高一(2)班' },
  { id: 's3', name: '周宁', className: '高一(2)班' },
  { id: 's4', name: '陈语', className: '高一(2)班' },
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
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function getTodayInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return {
    year,
    month,
    day,
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
    monthKey: `${year}-${pad(month)}`,
    monthLabel: `${year} 年 ${month} 月`,
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
  if (score === 10) return '#3f86ff';
  if (score >= 8) return '#36d66b';
  if (score >= 6) return '#f3af3c';
  return '#ea5a58';
}

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function statusText(status) {
  if (status === 'submitted') return '已提交';
  if (status === 'draft') return '已保存';
  return '未填写';
}

function calculateWeightedScore(scores) {
  const normalized = normalizeScores(scores);
  return Math.round(
    METRICS.reduce((sum, metric) => sum + normalized[metric.key] * 10 * metric.weight, 0)
  );
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function generateDefaultRecords(todayInfo) {
  const records = {};
  const daysInMonth = getDaysInMonth(todayInfo.year, todayInfo.month);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(todayInfo.year, todayInfo.month - 1, day).getDay();
    if (weekday === 0 || weekday === 6) continue;

    const dateKey = `${todayInfo.monthKey}-${pad(day)}`;
    records[dateKey] = {};

    STUDENTS.forEach((student) => {
      const pattern = SCORE_PATTERNS[student.id][(day - 1) % SCORE_PATTERNS[student.id].length];
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

function getRecords() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (stored && typeof stored === 'object' && Object.keys(stored).length) {
      return stored;
    }
  } catch (error) {}

  const defaults = generateDefaultRecords(getTodayInfo());
  wx.setStorageSync(STORAGE_KEY, defaults);
  return defaults;
}

function setRecords(records) {
  wx.setStorageSync(STORAGE_KEY, records);
}

function getStudents() {
  return clone(STUDENTS);
}

function getStudentRecord(records, dateKey, studentId) {
  return (records[dateKey] && records[dateKey][studentId]) || {
    scores: createEmptyScores(),
    feedback: '',
    photos: [],
    status: 'idle',
  };
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

function buildParentHistory(studentId) {
  const today = getTodayInfo();
  const records = getRecords();
  const daysInMonth = getDaysInMonth(today.year, today.month);
  const weekdays = ['一', '二', '三', '四', '五'];
  const firstDay = new Date(today.year, today.month - 1, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const days = [];

  for (let index = 0; index < offset; index += 1) {
    const weekdayIndex = index % 7;
    if (weekdayIndex < 5) {
      days.push({ id: `empty-${index}`, empty: true, cellWidth: '20%' });
    }
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(today.year, today.month - 1, day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const dateKey = `${today.monthKey}-${pad(day)}`;
    const record = getStudentRecord(records, dateKey, studentId);
    days.push({
      id: dateKey,
      dateKey,
      day: String(day),
      score: `${calculateWeightedScore(record.scores)}%`,
      totalWeighted: calculateWeightedScore(record.scores),
      metrics: mapMetrics(record.scores),
      cellWidth: '20%',
      canvasId: `history-ring-${day}`,
    });
  }

  return {
    monthLabel: today.monthLabel,
    weekdays,
    days,
  };
}

module.exports = {
  METRICS,
  STORAGE_KEY,
  getTodayInfo,
  getStudents,
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
