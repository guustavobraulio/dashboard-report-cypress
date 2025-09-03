// app.js — Dashboard integrado às Netlify Functions

// ===========================
//  Estados Globais e Constantes
// ===========================
let executionsData = [];      // Cache de todas as execuções recebidas da API
let historyChart = null;      // Instância do gráfico de histórico para destruição/recriação
let historyPeriod = '24h';    // Estado inicial do filtro de período ('24h', '7d', '30d')
let currentPage = 1;          // Página atual da tabela de execuções
const itemsPerPage = 10;      // Itens por página na tabela

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

// ... (o restante das suas funções utilitárias como `ensureButtonStructure`, `setButtonLabel`, `mostrarStatusNoBotao` permanecem as mesmas)

/* ===========================
   Backend (Functions)
=========================== */
async function fetchRuns() {
  const res = await fetch("/.netlify/functions/get-results");
  if (!res.ok) throw new Error(`Falha ao carregar resultados: ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw.executions)) return [];
  
  // Normaliza os dados recebidos da API
  return raw.executions.map((r, idx) => ({
    id: r.runId || `exec-${String(idx + 1).padStart(3, "0")}`,
    date: r.timestamp || new Date().toISOString(),
    status: (r.totalFailed ?? 0) > 0 ? "failed" : "passed",
    duration: Math.round((r.totalDuration ?? 0) / 1000), // ms -> s
    totalTests: r.totalTests ?? (r.totalPassed ?? 0) + (r.totalFailed ?? 0),
    passedTests: r.totalPassed ?? 0,
    failedTests: r.totalFailed ?? 0,
    branch: r.branch || "-",
    environment: r.environment || "-",
    commit: r.commit || "",
    author: r.author || "",
    githubUrl: r.githubRunUrl || "#",
    tests: Array.isArray(r.tests) ? r.tests.map(t => ({ /*...*/ })) : [],
    logs: Array.isArray(r.logs) ? [...r.logs] : [],
    artifacts: Array.isArray(r.artifacts) ? [...r.artifacts] : [],
  }));
}

// ... (a sua função `executarPipeline` permanece a mesma)

/* ===========================
   Filtros e Renderização
=========================== */

/**
 * Filtra as execuções com base em um período de tempo ('24h', '7d', '30d').
 */
function filterRunsByPeriod(runs, period) {
  const now = Date.now();
  let milliseconds;

  switch (period) {
    case '7d':
      milliseconds = 7 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
      milliseconds = 30 * 24 * 60 * 60 * 1000;
      break;
    case '24h':
    default:
      milliseconds = 24 * 60 * 60 * 1000;
  }

  const cutoffDate = now - milliseconds;
  return runs.filter(run => new Date(run.date).getTime() >= cutoffDate);
}

/**
 * Configura os listeners de evento para os botões de filtro de período.
 */
function setupPeriodButtons() {
  const periodButtons = document.querySelectorAll('.period-btn');
  
  periodButtons.forEach(button => {
    button.addEventListener('click', () => {
      periodButtons.forEach(btn => btn.classList.remove('period-btn--active'));
      button.classList.add('period-btn--active');
      
      historyPeriod = button.dataset.period;
      loadRuns(); // Recarrega os dados e renderiza tudo com o novo filtro
    });
  });
}

/* ===========================
   Gráficos
=========================== */

/**
 * Constrói as séries de dados para o gráfico de histórico no formato {x, y}.
 */
function buildPassedFailedSeries(runs) {
  return {
    passedSeries: runs.map(r => ({ x: r.date, y: r.passedTests || 0 })),
    failedSeries: runs.map(r => ({ x: r.date, y: r.failedTests || 0 })),
  };
}

/**
 * Desenha o gráfico de histórico de execuções (timeseries) no canvas.
 */
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
        {
          label: 'Aprovados',
          data: passedSeries,
          borderColor: '#16a34a',
          backgroundColor: '#16a34a',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.1
        },
        {
          label: 'Falhados',
          data: failedSeries,
          borderColor: '#dc2626',
          backgroundColor: '#dc2626',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'timeseries',
          time: {
            unit: 'day',
            tooltipFormat: 'dd/MM/yyyy HH:mm',
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          suggestedMax: suggestedMax,
          ticks: {
            stepSize: 1,
            precision: 0
          }
        }
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      }
    }
  });
}

// ... (suas funções `initializeStatusChart`, `populateExecutionTable`, `updateStatistics`, etc. permanecem as mesmas)


/* ===========================
   Orquestração Principal
=========================== */

async function loadRuns() {
  const runsContainer = document.querySelector('.runs-container');
  runsContainer?.classList.add('loading');

  try {
    executionsData = await fetchRuns(); // Busca e normaliza todos os dados

    // Aplica o filtro de período aos dados antes de renderizar
    const filteredRunsForHistory = filterRunsByPeriod(executionsData, historyPeriod);

    // Renderiza os componentes
    initializeHistoryChartFromRuns(filteredRunsForHistory);
    // As outras funções podem usar a lista completa ou a filtrada, dependendo da necessidade
    // Ex: Tabela e Estatísticas também podem usar o `filteredRunsForHistory` se desejado
    populateExecutionTable(executionsData); // Tabela com todos os dados e paginação
    updateStatistics(executionsData);     // Estatísticas globais
    initializeStatusChart(executionsData); // Gráfico de pizza com o total

  } catch (error) {
    console.error('Erro ao carregar as execuções:', error);
  } finally {
    runsContainer?.classList.remove('loading');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupPeriodButtons();
  setupEventListeners(); // Sua função existente para os outros filtros
  loadRuns().catch(console.error);

  const btn = document.getElementById("runPipelineBtn");
  if (btn) {
    ensureButtonStructure();
    btn.addEventListener("click", executarPipeline);
  }
});

