// app.js — Dashboard integrado às Netlify Functions

let executionsData = [];
let filteredExecutions = [];
let statusChart = null;
let historyChart = null;
let currentPage = 1;
const itemsPerPage = 10;

/* ===========================
   Utils
=========================== */
function formatDateTime(s) {
  const d = new Date(s);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Atualiza o rótulo do botão (ícone + texto)
function setButtonLabel(text) {
  const btn = document.getElementById('runPipelineBtn');
  if (!btn) return;
  const content = btn.querySelector('.btn-pipeline__content');
  if (!content) return;
  content.innerHTML = `<i class="fas fa-play" style="padding-right:10px;"></i>${text}`;
}

// Mensagem de status dentro do botão e classes visuais por estado
function mostrarStatusNoBotao(statusText, variant = null) {
  const btn = document.getElementById('runPipelineBtn');
  if (!btn) return;

  btn.classList.remove('is-in-progress', 'is-success', 'is-failure');
  setButtonLabel(statusText);

  if (variant === 'in_progress') btn.classList.add('is-in-progress');
  if (variant === 'success') btn.classList.add('is-success');
  if (variant === 'failure') btn.classList.add('is-failure');
}

/* ===========================
   Backend (Functions)
=========================== */
async function fetchRuns() {
  const res = await fetch('/.netlify/functions/get-results');
  if (!res.ok) throw new Error(`Falha ao carregar resultados: ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];
  return raw.map((r, idx) => ({
    id: r.runId || `exec-${String(idx + 1).padStart(3, '0')}`,
    date: r.timestamp || new Date().toISOString(),
    status: (r.totalFailed ?? 0) > 0 ? 'failed' : 'passed',
    duration: Math.round((r.totalDuration ?? 0) / 1000), // ms -> s
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
          duration: Math.round((t.duration ?? 0) / 1000), // ms -> s
          error: t.error || t.displayError || ''
        }))
      : [],
    logs: Array.isArray(r.logs) ? [...r.logs] : [],
    artifacts: Array.isArray(r.artifacts) ? [...r.artifacts] : []
  }));
}

/* ===========================
   Trigger Pipeline (Functions)
=========================== */
async function executarPipeline() {
  const btn = document.getElementById('runPipelineBtn');
  if (!btn) {
    console.error('runPipelineBtn não encontrado ao executar pipeline');
    return;
  }

  // Acessibilidade: anuncia mudanças no próprio botão (aria-live no HTML)
  btn.disabled = true;
  btn.classList.add('btn--loading');
  mostrarStatusNoBotao('Iniciando...', 'in_progress');

  try {
    // Dispara a pipeline
    const start = await fetch('/.netlify/functions/trigger-pipeline', { method: 'POST' });
    if (!start.ok) {
      const txt = await start.text().catch(() => '');
      throw new Error(`Falha ao disparar pipeline: ${start.status} ${txt}`);
    }

    // Polling do status
    let result = null;
    do {
      await new Promise(r => setTimeout(r, 5000));
      const res = await fetch('/.netlify/functions/pipeline-status');
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Falha ao obter status: ${res.status} ${txt}`);
      }
      result = await res.json();

      // Rótulos curtos e estáveis
      const label =
        result.status === 'queued' ? 'Na fila...' :
        result.status === 'in_progress' ? 'Executando...' :
        result.status === 'completed' ? 'Finalizando...' :
        `Status: ${result.status}`;

      mostrarStatusNoBotao(label, 'in_progress');
    } while (result.status !== 'completed');

    if (result.conclusion === 'success') {
      mostrarStatusNoBotao('Concluída ✓', 'success');
    } else {
      mostrarStatusNoBotao('Falhou ✕', 'failure');
    }
  } catch (e) {
    console.error(e);
    mostrarStatusNoBotao('Erro ao executar', 'failure');
  } finally {
    // Restaura o botão após breve intervalo
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove('btn--loading', 'is-in-progress', 'is-success', 'is-failure');
      setButtonLabel('Executar Pipeline');
    }, 2000);
  }
}

/* ===========================
   Cards/Estatísticas
=========================== */
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
}

/* ===========================
   Tabela
=========================== */
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
        ${e.githubUrl && e.githubUrl !== '#' ? `<a class="btn btn--sm btn--outline" href="${e.githubUrl}" target="_blank" rel="noopener">Ação</a>` : ''}
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.action-btn--view').forEach(btn => {
    btn.addEventListener('click', () => openExecutionModal(btn.getAttribute('data-execution-id')));
  });

  updatePagination();
}

/* ===========================
   Paginação
=========================== */
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
}

function changePage(p) {
  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  if (p >= 1 && p <= totalPages) { currentPage = p; populateExecutionTable(); }
}

/* ===========================
   Gráficos
=========================== */
function initializeStatusChart() {
  const ctx = document.getElementById('statusChart')?.getContext('2d');
  if (!ctx) return;
  const totalPassed = filteredExecutions.reduce((s, e) => s + (e.passedTests || 0), 0);
  const totalFailed = filteredExecutions.reduce((s, e) => s + (e.failedTests || 0), 0);
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Aprovados', 'Falhados'],
      datasets: [{ data: [totalPassed, totalFailed], backgroundColor: ['#1FB8CD', '#B4413C'] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function initializeHistoryChartFromRuns(runs) {
  const ctx = document.getElementById('historyChart')?.getContext('2d');
  if (!ctx) return;
  const labels = runs.map(r => new Date(r.date).toLocaleString('pt-BR'));
  const execs = runs.map(() => 1);
  if (historyChart) historyChart.destroy();
  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Execuções',
        data: execs,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40,167,69,.2)',
        tension: .3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

/* ===========================
   Modal
=========================== */
function openExecutionModal(id) {
  const e = executionsData.find(x => x.id === id);
  if (!e) return;

  // Overview
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

  // Tabs: habilitar/desabilitar
  const testsTabBtn = document.querySelector('[data-tab="tests"]');
  const logsTabBtn = document.querySelector('[data-tab="logs"]');
  const artifactsTabBtn = document.querySelector('[data-tab="artifacts"]');

  if (testsTabBtn) testsTabBtn.disabled = !(e.tests && e.tests.length);
  if (logsTabBtn) logsTabBtn.disabled = !(e.logs && e.logs.length);
  if (artifactsTabBtn) artifactsTabBtn.disabled = !(e.artifacts && e.artifacts.length);

  // Testes
  const testsList = document.getElementById('modalTestsList');
  testsList.innerHTML = (e.tests || []).map(t => `
    <div class="test-item test-item--${(t.status || 'passed')}">
      <div class="test-info">
        <div class="test-name">${t.name}</div>
        ${t.error ? `<div class="test-error">${t.error}</div>` : ''}
      </div>
      <div class="test-duration">${t.duration || 0}s</div>
    </div>
  `).join('');

  // Logs
  const logsPre = document.getElementById('modalLogs');
  logsPre.textContent = (e.logs || []).join('\n\n');

  // Artefatos
  const artifactsWrap = document.getElementById('modalArtifacts');
  artifactsWrap.innerHTML = (e.artifacts || []).map(a => `
    <div class="artifact-item">
      <i class="fas fa-file-alt"></i>
      <span>${a.name || 'artifact'}</span>
      ${a.url ? `<a class="btn btn--sm btn--outline" href="${a.url}" target="_blank" rel="noopener">Abrir</a>` : ''}
    </div>
  `).join('');

  const modal = document.getElementById('executionModal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('executionModal');
  modal.classList.add('hidden');
  modal.style.display = 'none';

  // Reset visual das tabs para "Visão Geral"
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('tab-button--active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('tab-panel--active'));
  const overviewTab = document.querySelector('.tab-button[data-tab="overview"]');
  const overviewPanel = document.getElementById('overview-tab');
  if (overviewTab) overviewTab.classList.add('tab-button--active');
  if (overviewPanel) overviewPanel.classList.add('tab-panel--active');
}

/* ===========================
   Filtros e eventos
=========================== */
function setupEventListeners() {
  document.getElementById('branchFilter').addEventListener('change', applyFilters);
  document.getElementById('environmentFilter').addEventListener('change', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('dateFilter').addEventListener('change', applyFilters);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  const backdrop = document.querySelector('#executionModal .modal-backdrop');
  backdrop?.addEventListener('click', closeModal);

  // Troca de abas
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const tabName = button.dataset.tab;
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('tab-button--active'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('tab-panel--active'));
      button.classList.add('tab-button--active');
      const targetPanel = document.getElementById(`${tabName}-tab`);
      if (targetPanel) targetPanel.classList.add('tab-panel--active');
    });
  });
}

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
}

/* ===========================
   Bootstrap
=========================== */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadRuns().catch(console.error);
  setInterval(() => loadRuns().catch(console.error), 30000);

  // Prepara botão com estrutura para status embutido (se ainda não tiver)
  const btn = document.getElementById('runPipelineBtn');
  if (btn) {
    // Garante o wrapper do conteúdo (ícone + label) para trocas de texto
    if (!btn.querySelector('.btn-pipeline__content')) {
      const current = btn.innerHTML;
      btn.innerHTML = `<span class="btn-pipeline__content">${current}</span>`;
      btn.setAttribute('aria-live', 'polite'); // acessibilidade
    }
    btn.addEventListener('click', executarPipeline);
  } else {
    console.error('Botão runPipelineBtn não encontrado no DOM');
  }
});

async function loadRuns() {
  const runs = await fetchRuns();
  runs.sort((a, b) => new Date(b.date) - new Date(a.date));
  executionsData = runs;
  filteredExecutions = [...runs];
  updateStatistics();
  initializeStatusChart();
  populateExecutionTable();
  initializeHistoryChartFromRuns(runs);
}
