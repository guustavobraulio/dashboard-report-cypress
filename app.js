// app.js — Dashboard integrado às Netlify Functions

// ===========================
//  Estados Globais e Constantes
// ===========================
let executionsData = [];
let historyChart = null;
let statusChart = null;
let historyPeriod = '24h';
let currentPage = 1;
const itemsPerPage = 10;

/* ===========================
   Utils
=========================== */
const dfBR = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

function formatDateTime(s) {
  const d = new Date(s);
  return dfBR.format(d).replace(/\s(\d{2}):/, ' às $1:');
}

// ... Suas outras funções utilitárias como ensureButtonStructure, setButtonLabel, mostrarStatusNoBotao ...

/* ===========================
   Backend (Functions)
=========================== */
async function fetchRuns() {
  const res = await fetch("/.netlify/functions/get-results");
  if (!res.ok) throw new Error(`Falha ao carregar resultados: ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];

  return raw.map((r, idx) => ({
    id: r.runId || `exec-${String(idx + 1).padStart(3, "0")}`,
    date: r.timestamp || new Date().toISOString(),
    status: (r.totalFailed ?? 0) > 0 ? "failed" : "passed",
    duration: Math.round((r.totalDuration ?? 0) / 1000),
    totalTests: r.totalTests ?? (r.totalPassed ?? 0) + (r.totalFailed ?? 0),
    passedTests: r.totalPassed ?? 0,
    failedTests: r.totalFailed ?? 0,
    branch: r.branch || "-",
    environment: r.environment || "-",
    commit: r.commit || "",
    author: r.author || "",
    githubUrl: r.githubRunUrl || "#",
    tests: Array.isArray(r.tests) ? r.tests : [],
    logs: Array.isArray(r.logs) ? r.logs : [],
    artifacts: Array.isArray(r.artifacts) ? r.artifacts : [],
  }));
}

// ... Sua função executarPipeline ...

/* ===========================
   Componentes da UI (Cards, Tabela, Paginação)
=========================== */
function updateStatistics(runs) {
  const totalPassed = runs.reduce((s, e) => s + (e.passedTests || 0), 0);
  const totalFailed = runs.reduce((s, e) => s + (e.failedTests || 0), 0);
  const totalTests = totalPassed + totalFailed;
  const avgDuration = runs.length ? Math.round(runs.reduce((s, e) => s + (e.duration || 0), 0) / runs.length) : 0;
  const successRate = totalTests ? Math.round((totalPassed / totalTests) * 100) : 0;

  document.getElementById("totalPassed").textContent = totalPassed;
  document.getElementById("totalFailed").textContent = totalFailed;
  document.getElementById("avgDuration").textContent = `${avgDuration}s`;
  document.getElementById("successRate").textContent = `${successRate}%`;
}

function populateExecutionTable(runs) {
  const tbody = document.getElementById("executionTableBody");
  // ... Sua lógica para popular a tabela e paginação ...
}

// ... Suas funções updatePagination e changePage ...

// ... Suas funções para o Modal (openExecutionModal, closeModal) ...

/* ===========================
   Gráficos
=========================== */
function initializeStatusChart(runs) {
  const ctx = document.getElementById("statusChart")?.getContext("2d");
  if (!ctx) return;
  // ... Sua lógica para o gráfico de pizza ...
}

function buildPassedFailedSeries(runs) {
  return {
    passedSeries: runs.map(r => ({ x: r.date, y: r.passedTests || 0 })),
    failedSeries: runs.map(r => ({ x: r.date, y: r.failedTests || 0 })),
  };
}

function initializeHistoryChartFromRuns(runs) {
  const ctx = document.getElementById('historyChart')?.getContext('2d');
  if (!ctx) return;

  const { passedSeries, failedSeries } = buildPassedFailedSeries(runs);

  if (historyChart) {
    historyChart.destroy();
  }

  const allYValues = [...passedSeries.map(p => p.y), ...failedSeries.map(f => f.y)];
  const suggestedMax = Math.max(...allYValues, 5) + 1;

  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        { label: 'Aprovados', data: passedSeries, borderColor: '#16a34a', backgroundColor: '#16a34a', borderWidth: 3, pointRadius: 4, pointHoverRadius: 6, tension: 0.1 },
        { label: 'Falhados', data: failedSeries, borderColor: '#dc2626', backgroundColor: '#dc2626', borderWidth: 3, pointRadius: 4, pointHoverRadius: 6, tension: 0.1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'timeseries', time: { unit: 'day', tooltipFormat: 'dd/MM/yyyy HH:mm' }, grid: { display: false } },
        y: { beginAtZero: true, suggestedMax: suggestedMax, ticks: { stepSize: 1, precision: 0 } }
      },
      plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }
    }
  });
}

/* ===========================
   Filtros e Eventos
=========================== */
function filterRunsByPeriod(runs, period) {
  const now = Date.now();
  let milliseconds;
  switch (period) {
    case '7d': milliseconds = 7 * 24 * 60 * 60 * 1000; break;
    case '30d': milliseconds = 30 * 24 * 60 * 60 * 1000; break;
    case '24h': default: milliseconds = 24 * 60 * 60 * 1000;
  }
  const cutoffDate = now - milliseconds;
  return runs.filter(run => new Date(run.date).getTime() >= cutoffDate);
}

function setupPeriodButtons() {
  const periodButtons = document.querySelectorAll('.period-btn');
  periodButtons.forEach(button => {
    button.addEventListener('click', () => {
      periodButtons.forEach(btn => btn.classList.remove('period-btn--active'));
      button.classList.add('period-btn--active');
      historyPeriod = button.dataset.period;
      loadRuns();
    });
  });
}

// Sua função setupEventListeners original para os outros filtros
function setupEventListeners() {
    // ... seu código para os filtros de branch, environment, etc.
}


/* ===========================
   Orquestração Principal
=========================== */
async function loadRuns() {
  const runsContainer = document.querySelector('.runs-container');
  runsContainer?.classList.add('loading');

  try {
    executionsData = await fetchRuns();
    const filteredRunsForHistory = filterRunsByPeriod(executionsData, historyPeriod);

    // Renderiza os componentes
    initializeHistoryChartFromRuns(filteredRunsForHistory);
    updateStatistics(executionsData);
    initializeStatusChart(executionsData);
    populateExecutionTable(executionsData);

  } catch (error) {
    console.error('Erro ao carregar as execuções:', error);
  } finally {
    runsContainer?.classList.remove('loading');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupPeriodButtons();
  setupEventListeners(); // Sua função para os outros filtros
  loadRuns().catch(console.error);

  const btn = document.getElementById("runPipelineBtn");
  if (btn) {
    // ... sua lógica para o botão `runPipelineBtn` ...
  }
});
