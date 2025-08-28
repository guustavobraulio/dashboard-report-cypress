// app.js — Dashboard integrado às Netlify Functions

let executionsData = [];
let filteredExecutions = [];
let statusChart = null;
let historyChart = null;
let currentPage = 1;
const itemsPerPage = 10;

function formatDateTime(s) {
  const d = new Date(s);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
} [14]

console.log('app.js build 1')
async function fetchRuns() {
  const res = await fetch('/.netlify/functions/get-results');
  if (!res.ok) throw new Error(`Falha ao carregar resultados: ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];
  return raw.map((r, idx) => ({
    id: r.runId || `exec-${String(idx + 1).padStart(3, '0')}`,
    date: r.timestamp || new Date().toISOString(),
    status: (r.totalFailed ?? 0) > 0 ? 'failed' : 'passed',
    duration: Math.round((r.totalDuration ?? 0) / 1000),
    totalTests: r.totalTests ?? ((r.totalPassed ?? 0) + (r.totalFailed ?? 0)),
    passedTests: r.totalPassed ?? 0,
    failedTests: r.totalFailed ?? 0,
    branch: r.branch || '-',
    environment: r.environment || '-',
    commit: r.commit || '',
    author: r.author || '',
    githubUrl: r.githubRunUrl || '#',
    tests: Array.isArray(r.tests)
      ? r.tests.map(t => ({
          name: t.title || (Array.isArray(t.title) ? t.title.join(' > ') : 'spec'),
          status: t.state || 'passed',
          duration: Math.round((t.duration ?? 0) / 1000),
          error: t.error || t.displayError || ''
        }))
      : []
  }));
} [13][17]

function updateStatistics() {
  const totalPassed = filteredExecutions.reduce((s, e) => s + (e.passedTests || 0), 0);
  const totalFailed = filteredExecutions.reduce((s, e) => s + (e.failedTests || 0), 0);
  const totalTests = totalPassed + totalFailed;
  const avgDuration = filteredExecutions.length
    ? Math.round(filteredExecutions.reduce((s, e) => s + (e.duration || 0), 0) / filteredExecutions.length)
    : 0;
  const successRate = totalTests ? Math.round((totalPassed / totalTests) * 100) : 0;

  document.getElementById('totalPassed').textContent = totalPassed;
  document.getElementById('totalFailed').textContent = totalFailed;
  document.getElementById('avgDuration').textContent = `${avgDuration}s`;
  document.getElementById('successRate').textContent = `${successRate}%`;
} [15]

function populateExecutionTable() {
  const tbody = document.getElementById('executionTableBody');
  const start = (currentPage - 1) * itemsPerPage;
  const page = filteredExecutions.slice(start, start + itemsPerPage);

  tbody.innerHTML = page.map(e => `
    <tr>
      <td><code>${e.id}</code></td>
      <td>${formatDateTime(e.date)}</td>
      <td><code>${e.branch}</code></td>
      <td><span class="status status--info">${e.environment}</span></td>
      <td><span class="status status--${e.status}">${e.status === 'passed' ? 'Aprovado' : 'Falhado'}</span></td>
      <td>${e.passedTests}/${e.totalTests}</td>
      <td>${e.duration}s</td>
      <td>
        <button class="action-btn action-btn--view" data-execution-id="${e.id}">
          <i class="fas fa-eye"></i> Ver
        </button>
        ${e.githubUrl && e.githubUrl !== '#' ? `<a class="btn btn--sm btn--outline" href="${e.githubUrl}" target="_blank">Ação</a>` : ''}
      </td>
    </tr>
  `).join(''); [14]

  document.querySelectorAll('.action-btn--view').forEach(btn => {
    btn.addEventListener('click', () => openExecutionModal(btn.getAttribute('data-execution-id')));
  });

  updatePagination();
} [14]

function updatePagination() {
  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  const el = document.getElementById('pagination');
  el.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.textContent = '← Anterior';
  prev.disabled = currentPage === 1;
  prev.onclick = () => changePage(currentPage - 1);
  el.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      const b = document.createElement('button');
      b.textContent = i;
      b.className = i === currentPage ? 'active' : '';
      b.onclick = () => changePage(i);
      el.appendChild(b);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.style.padding = '0 8px';
      el.appendChild(dots);
    }
  }

  const next = document.createElement('button');
  next.textContent = 'Próxima →';
  next.disabled = currentPage === totalPages;
  next.onclick = () => changePage(currentPage + 1);
  el.appendChild(next);
} [14]

function changePage(p) {
  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  if (p >= 1 && p <= totalPages) { currentPage = p; populateExecutionTable(); }
} [14]

function initializeStatusChart() {
  const ctx = document.getElementById('statusChart')?.getContext('2d');
  if (!ctx) return;
  const totalPassed = filteredExecutions.reduce((s, e) => s + (e.passedTests || 0), 0);
  const totalFailed = filteredExecutions.reduce((s, e) => s + (e.failedTests || 0), 0);
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'pie',
    data: { labels: ['Aprovados', 'Falhados'], datasets: [{ data: [totalPassed, totalFailed], backgroundColor: ['#1FB8CD', '#B4413C'] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
} [15][18]

function initializeHistoryChartFromRuns(runs) {
  const ctx = document.getElementById('historyChart')?.getContext('2d');
  if (!ctx) return;
  const labels = runs.map(r => new Date(r.date).toLocaleString('pt-BR'));
  const execs = runs.map(() => 1);
  if (historyChart) historyChart.destroy();
  historyChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Execuções', data: execs, borderColor: '#28a745', backgroundColor: 'rgba(40,167,69,.2)', tension: .3 }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
} [15][18]

function openExecutionModal(id) {
  const e = executionsData.find(x => x.id === id);
  if (!e) return;
  document.getElementById('modalExecutionId').textContent = e.id;
  document.getElementById('modalExecutionDate').textContent = formatDateTime(e.date);
  document.getElementById('modalExecutionBranch').textContent = e.branch;
  document.getElementById('modalExecutionEnvironment').textContent = e.environment;
  document.getElementById('modalExecutionAuthor').textContent = e.author || '-';
  document.getElementById('modalExecutionCommit').textContent = e.commit || '-';
  document.getElementById('modalExecutionDuration').textContent = `${e.duration}s`;
  document.getElementById('modalExecutionStatus').innerHTML =
    `<span class="status status--${e.status}">${e.status === 'passed' ? 'Aprovado' : 'Falhado'}</span>`;
  document.getElementById('modalGithubLink').href = e.githubUrl || '#';
  const testsList = document.getElementById('modalTestsList');
  testsList.innerHTML = (e.tests || []).map(t => `
    <div class="test-item test-item--${t.status}">
      <div class="test-info">
        <div class="test-name">${t.name}</div>
        ${t.error ? `<div class="test-error">${t.error}</div>` : ''}
      </div>
      <div class="test-duration">${t.duration || 0}s</div>
    </div>
  `).join('');
  const modal = document.getElementById('executionModal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
} [14]

function closeModal() {
  const modal = document.getElementById('executionModal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
} [14]

function setupEventListeners() {
  document.getElementById('branchFilter').addEventListener('change', applyFilters);
  document.getElementById('environmentFilter').addEventListener('change', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('dateFilter').addEventListener('change', applyFilters);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  const backdrop = document.querySelector('#executionModal .modal-backdrop');
  backdrop?.addEventListener('click', closeModal);
} [14]

function applyFilters() {
  const branch = document.getElementById('branchFilter').value;
  const env = document.getElementById('environmentFilter').value;
  const status = document.getElementById('statusFilter').value;
  const date = document.getElementById('dateFilter').value;
  filteredExecutions = executionsData.filter(e => {
    if (branch && e.branch !== branch) return false;
    if (env && e.environment !== env) return false;
    if (status && e.status !== status) return false;
    if (date && !String(e.date).startsWith(date)) return false;
    return true;
  });
  currentPage = 1;
  updateStatistics();
  initializeStatusChart();
  populateExecutionTable();
} [14]

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadRuns().catch(console.error);
  setInterval(() => loadRuns().catch(console.error), 30000);
}); [19]

async function loadRuns() {
  const runs = await fetchRuns();
  runs.sort((a, b) => new Date(b.date) - new Date(a.date));
  executionsData = runs;
  filteredExecutions = [...runs];
  updateStatistics();
  initializeStatusChart();
  populateExecutionTable();
  initializeHistoryChartFromRuns(runs);
} [13][15]
