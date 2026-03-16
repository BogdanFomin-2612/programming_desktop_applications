
/* ──────────────────────────────────────────────
   HOMEROOM HUB — app.js (Renderer)
   Connects to Python FastAPI at http://localhost:8000
   ────────────────────────────────────────────── */

const API = 'http://localhost:8000';

// ─── State ───
let state = {
  students: [],
  grades: [],
  reviews: [],
  alerts: [],
  attendance: null,
  currentTab: 'Dashboard',
  theme: localStorage.getItem('theme') || 'light',
  studentColor: '#2563EB',
};

// ─── Helpers ───

async function api(path, options = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!r.ok) {
    const err = await r.text();
    console.error('API error', r.status, err);
    throw new Error(err);
  }
  if (r.status === 204) return null;
  return r.json();
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function gradeClass(v) {
  if (v >= 8) return 'high';
  if (v >= 5) return 'mid';
  return 'low';
}

function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Theme ───

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  state.theme = theme;
}

document.getElementById('themeToggle').addEventListener('click', () => {
  applyTheme(state.theme === 'light' ? 'dark' : 'light');
});

applyTheme(state.theme);

// ─── Tab Navigation ───

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab${tabName}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  document.getElementById('mainContent').scrollTop = 0;
  loadTab(tabName);
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

async function loadTab(tabName) {
  if (tabName === 'Dashboard') await loadDashboard();
  else if (tabName === 'Roster') await loadRoster();
  else if (tabName === 'Grades') await loadGrades();
  else if (tabName === 'CodeReview') await loadReviews();
}

// ─── DASHBOARD ───

async function loadDashboard() {
  try {
    const [attendance, students, alerts] = await Promise.all([
      api('/attendance/today'),
      api('/students'),
      api('/alerts'),
    ]);
    state.students = students;
    state.attendance = attendance;
    state.alerts = alerts;
    renderAttendance(attendance);
    renderGPA(students);
    renderAlerts(alerts);
    document.getElementById('dashStudentCount').textContent = students.length;
  } catch (e) {
    console.error('Dashboard load failed:', e);
  }
}

function renderAttendance(d) {
  document.getElementById('attendanceRate').textContent = d.rate + '%';
  document.getElementById('attendancePresentCount').textContent = `${d.present}/${d.total}`;
  document.getElementById('countPresent').textContent = d.present;
  document.getElementById('countLate').textContent = d.late;
  document.getElementById('countAbsent').textContent = d.absent;
}

function renderGPA(students) {
  if (!students.length) return;
  const avg = students.reduce((s, st) => s + st.gpa, 0) / students.length;
  const rounded = avg.toFixed(1);
  document.getElementById('avgGpa').textContent = rounded;
  document.getElementById('gpaBarFill').style.width = `${(avg / 10) * 100}%`;
  const badge = document.getElementById('gpaChange');
  badge.textContent = `Based on ${students.length} students`;
}

function renderAlerts(alerts) {
  const list = document.getElementById('alertsList');
  document.getElementById('alertCountBadge').textContent = alerts.length;
  if (!alerts.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p>No alerts! Everything looks good.</p></div>';
    return;
  }
  list.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.type}">
      <div class="alert-top">
        <span class="alert-teacher">${a.teacher} — ${a.subject}</span>
        <span class="alert-type-badge">${a.type}</span>
      </div>
      <div class="alert-student">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
        ${a.student_name}
      </div>
      <div class="alert-message">${a.message}</div>
    </div>
  `).join('');
}

// ─── ROSTER ───

async function loadRoster() {
  try {
    state.students = await api('/students');
    renderStudentList();
    document.getElementById('rosterSubtitle').textContent = `Grade 10A — ${state.students.length} students`;
  } catch (e) {
    document.getElementById('studentList').innerHTML = `<div class="loading-state">⚠️ Could not connect to API. Is the backend running?</div>`;
  }
}

function renderStudentList() {
  const container = document.getElementById('studentList');
  if (!state.students.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">👩‍🎓</div><p>No students yet. Add one!</p></div>';
    return;
  }
  container.innerHTML = state.students.map(s => `
    <div class="student-card" data-id="${s.id}">
      <div class="student-avatar" style="background:${s.avatar_color}">${getInitials(s.name)}</div>
      <div class="student-info">
        <div class="student-name">${s.name}</div>
        <div class="student-email">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          ${s.email}
        </div>
        <div class="student-metrics">
          <span class="metric">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
            GPA: <strong>${s.gpa.toFixed(1)}</strong>
          </span>
          <span class="metric">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Attendance: <strong>${s.attendance_pct}%</strong>
          </span>
        </div>
      </div>
      <div class="student-right">
        <button class="status-pill ${s.today_status}" onclick="cycleStatus('${s.id}','${s.today_status}',event)">${s.today_status}</button>
        <div class="action-btns">
          <button class="icon-btn" onclick="editStudent('${s.id}',event)" title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" onclick="deleteStudent('${s.id}',event)" title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function cycleStatus(studentId, current, e) {
  e.stopPropagation();
  const cycle = { present: 'late', late: 'absent', absent: 'present' };
  const next = cycle[current] || 'present';
  await api(`/attendance/${studentId}`, { method: 'PUT', body: JSON.stringify({ status: next }) });
  await loadRoster();
  if (state.currentTab === 'Dashboard') await loadDashboard();
  showToast(`Attendance updated: ${next}`);
}

function editStudent(id, e) {
  e.stopPropagation();
  const s = state.students.find(st => st.id === id);
  if (!s) return;
  document.getElementById('studentId').value = s.id;
  document.getElementById('studentName').value = s.name;
  document.getElementById('studentEmail').value = s.email;
  document.getElementById('studentColor').value = s.avatar_color;
  document.getElementById('studentModalTitle').textContent = 'Edit Student';
  setSelectedColor(s.avatar_color);
  openModal('studentModal');
}

async function deleteStudent(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this student? This will also remove their attendance, grades, and reviews.')) return;
  await api(`/students/${id}`, { method: 'DELETE' });
  showToast('Student deleted');
  await loadRoster();
}

document.getElementById('addStudentBtn').addEventListener('click', () => {
  document.getElementById('studentId').value = '';
  document.getElementById('studentName').value = '';
  document.getElementById('studentEmail').value = '';
  document.getElementById('studentColor').value = '#2563EB';
  document.getElementById('studentModalTitle').textContent = 'Add Student';
  setSelectedColor('#2563EB');
  openModal('studentModal');
});

// ─── Student Form ───

document.querySelectorAll('.color-option').forEach(opt => {
  opt.addEventListener('click', () => {
    const color = opt.dataset.color;
    document.getElementById('studentColor').value = color;
    setSelectedColor(color);
  });
});

function setSelectedColor(color) {
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.color === color);
  });
}

document.getElementById('studentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('studentId').value;
  const data = {
    name: document.getElementById('studentName').value,
    email: document.getElementById('studentEmail').value,
    avatar_color: document.getElementById('studentColor').value,
  };
  if (id) {
    await api(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    showToast('Student updated ✓');
  } else {
    await api('/students', { method: 'POST', body: JSON.stringify(data) });
    showToast('Student added ✓');
  }
  closeModal('studentModal');
  await loadRoster();
});

document.getElementById('closeStudentModal').addEventListener('click', () => closeModal('studentModal'));
document.getElementById('cancelStudentModal').addEventListener('click', () => closeModal('studentModal'));
document.getElementById('studentModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal('studentModal');
});

// ─── GRADES ───

async function loadGrades() {
  try {
    const [grades, students] = await Promise.all([
      api('/grades'),
      api('/students'),
    ]);
    state.grades = grades;
    if (!state.students.length) state.students = students;
    populateStudentSelects();
    populateGradeFilters(grades);
    renderGradesTable(grades);
  } catch (e) {
    document.getElementById('gradesTable').innerHTML = `<div class="loading-state">⚠️ Could not load grades.</div>`;
  }
}

function populateStudentSelects() {
  const options = state.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  ['gradeStudentId', 'reviewStudentId', 'gradeFilterStudent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const hadPlaceholder = el.options[0]?.value === '';
      el.innerHTML = (hadPlaceholder ? '<option value="">All Students</option>' : '') + options;
    }
  });
}

function populateGradeFilters(grades) {
  const subjects = [...new Set(grades.map(g => g.subject))];
  const sel = document.getElementById('gradeFilterSubject');
  sel.innerHTML = '<option value="">All Subjects</option>' +
    subjects.map(s => `<option value="${s}">${s}</option>`).join('');
}

function renderGradesTable(grades) {
  const container = document.getElementById('gradesTable');
  if (!grades.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>No grades yet.</p></div>';
    return;
  }
  container.innerHTML = `
    <table class="grades-table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Subject</th>
          <th>Grade</th>
          <th>Date</th>
          <th>Description</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${grades.map(g => `
          <tr>
            <td><strong>${g.student_name}</strong></td>
            <td>${g.subject}</td>
            <td><span class="grade-chip ${gradeClass(g.value)}">${g.value}</span></td>
            <td>${g.date}</td>
            <td style="color:var(--text-secondary)">${g.description || ''}</td>
            <td>
              <button class="icon-btn danger" onclick="deleteGrade('${g.id}')" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function deleteGrade(id) {
  if (!confirm('Delete this grade?')) return;
  await api(`/grades/${id}`, { method: 'DELETE' });
  showToast('Grade deleted');
  await loadGrades();
}

// Grade filters
document.getElementById('gradeFilterSubject').addEventListener('change', filterGrades);
document.getElementById('gradeFilterStudent').addEventListener('change', filterGrades);

function filterGrades() {
  const sub = document.getElementById('gradeFilterSubject').value;
  const sid = document.getElementById('gradeFilterStudent').value;
  const filtered = state.grades.filter(g =>
    (!sub || g.subject === sub) && (!sid || g.student_id === sid)
  );
  renderGradesTable(filtered);
}

document.getElementById('addGradeBtn').addEventListener('click', async () => {
  if (!state.students.length) state.students = await api('/students');
  populateStudentSelects();
  document.getElementById('gradeDate').value = todayISO();
  document.getElementById('gradeValue').value = '';
  document.getElementById('gradeSubject').value = '';
  document.getElementById('gradeDescription').value = '';
  openModal('gradeModal');
});

document.getElementById('gradeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    student_id: document.getElementById('gradeStudentId').value,
    subject: document.getElementById('gradeSubject').value,
    value: parseFloat(document.getElementById('gradeValue').value),
    date: document.getElementById('gradeDate').value,
    description: document.getElementById('gradeDescription').value,
  };
  await api('/grades', { method: 'POST', body: JSON.stringify(data) });
  showToast('Grade saved ✓');
  closeModal('gradeModal');
  await loadGrades();
});

document.getElementById('closeGradeModal').addEventListener('click', () => closeModal('gradeModal'));
document.getElementById('cancelGradeModal').addEventListener('click', () => closeModal('gradeModal'));
document.getElementById('gradeModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal('gradeModal');
});

// ─── CODE REVIEWS ───

async function loadReviews() {
  try {
    const [reviews, students] = await Promise.all([
      api('/code-reviews'),
      api('/students'),
    ]);
    state.reviews = reviews;
    if (!state.students.length) state.students = students;
    populateStudentSelects();
    renderReviews(reviews);
  } catch (e) {
    document.getElementById('reviewsList').innerHTML = `<div class="loading-state">⚠️ Could not load reviews.</div>`;
  }
}

function renderReviews(reviews) {
  const container = document.getElementById('reviewsList');
  if (!reviews.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">💻</div><p>No code reviews yet.</p></div>';
    return;
  }
  container.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-header">
        <div class="review-title-block">
          <div class="review-title">${r.title}</div>
          <div class="review-meta">
            <span class="review-student">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
              ${r.student_name}
            </span>
            <span class="lang-badge">${r.language}</span>
            <span style="font-size:11px;color:var(--text-muted)">${r.date}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${r.score != null ? `<span class="review-score-badge">${r.score}/10</span>` : ''}
          <div class="review-actions">
            <button class="icon-btn" onclick="editReview('${r.id}')" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn danger" onclick="deleteReview('${r.id}')" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="review-body">
        <div class="code-block">${escapeHtml(r.code)}</div>
        ${r.feedback ? `
        <div class="review-feedback">
          <span class="feedback-label">Feedback</span>
          <span class="feedback-text">${r.feedback}</span>
        </div>` : ''}
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function editReview(id) {
  const r = state.reviews.find(rv => rv.id === id);
  if (!r) return;
  document.getElementById('reviewId').value = r.id;
  document.getElementById('reviewStudentId').value = r.student_id;
  document.getElementById('reviewLanguage').value = r.language;
  document.getElementById('reviewTitle').value = r.title;
  document.getElementById('reviewCode').value = r.code;
  document.getElementById('reviewFeedback').value = r.feedback || '';
  document.getElementById('reviewScore').value = r.score || '';
  document.getElementById('reviewModalTitle').textContent = 'Edit Code Review';
  openModal('reviewModal');
}

async function deleteReview(id) {
  if (!confirm('Delete this code review?')) return;
  await api(`/code-reviews/${id}`, { method: 'DELETE' });
  showToast('Review deleted');
  await loadReviews();
}

document.getElementById('addReviewBtn').addEventListener('click', async () => {
  if (!state.students.length) state.students = await api('/students');
  populateStudentSelects();
  document.getElementById('reviewId').value = '';
  document.getElementById('reviewTitle').value = '';
  document.getElementById('reviewCode').value = '';
  document.getElementById('reviewFeedback').value = '';
  document.getElementById('reviewScore').value = '';
  document.getElementById('reviewModalTitle').textContent = 'New Code Review';
  openModal('reviewModal');
});

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('reviewId').value;
  const data = {
    student_id: document.getElementById('reviewStudentId').value,
    title: document.getElementById('reviewTitle').value,
    language: document.getElementById('reviewLanguage').value,
    code: document.getElementById('reviewCode').value,
    feedback: document.getElementById('reviewFeedback').value,
    score: parseFloat(document.getElementById('reviewScore').value) || null,
    date: todayISO(),
  };
  if (id) {
    await api(`/code-reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    showToast('Review updated ✓');
  } else {
    await api('/code-reviews', { method: 'POST', body: JSON.stringify(data) });
    showToast('Review saved ✓');
  }
  closeModal('reviewModal');
  await loadReviews();
});

document.getElementById('closeReviewModal').addEventListener('click', () => closeModal('reviewModal'));
document.getElementById('cancelReviewModal').addEventListener('click', () => closeModal('reviewModal'));
document.getElementById('reviewModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal('reviewModal');
});

// ─── INIT ───
(async () => {
  // Set today's date in grade form
  document.getElementById('gradeDate').value = todayISO();
  // Load initial tab
  await loadDashboard();
})();

