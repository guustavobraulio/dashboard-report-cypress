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
const dfBR = new Intl.DateTimeFormat('pt-BR', { /* ... */ });

function formatDateTime(s) {
  const d = new Date(s);
  return dfBR.format(d).replace(/\s(\d{2}):/, ' às $1:');
}

// ... (Suas outras funções utilitárias: ensureButtonStructure, setButtonLabel, etc.) ...

/* ===========================
   Backend (Functions)
=========================== */
async function fetchRuns() {
  const res = await fetch("/.netlify/functions/get-results");
  if (!res.ok) throw new Error(`Falha ao carregar: ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];
  // ... (sua lógica de mapeamento de dados) ...
  return raw.map(/* ... */);
}

// ... (Sua função executarPipeline) ...

/* ===========================
   Componentes da UI
=========================== */
function updateStatistics(runs) {
  // ... (sua lógica para os cards de estatísticas) ...
}

function populateExecutionTable(runs) {
  const tbody = document.getElementById("executionTableBody");
  if (!tbody) return;
  const start = (currentPage - 1) * itemsPerPage;
  const page = runs.slice(start, start + itemsPerPage);

  tbody.innerHTML = page.map(e => `
    <tr>
      <td><code>${e.id}</code></td>
      <td>${formatDateTime(e.date)}</td>
      <td><code>${e.branch}</code></td>
      <td><span class="status status--info">${e.environment}</span></td>
      <td><span class="status status--${e.status}">${e.status === "passed" ? "Aprovado" : "Falhado"}</span></td>
      <td>${e.passedTests}/${e.totalTests}</td>
      <td>${e.duration}s</td>
      <td>
        <button class="action-btn action-btn--view" data-execution-id="${e.id}">
          <i class="fas fa-eye"></i> Ver
        </button>
      </td>
    </tr>
  `).join("");

  // Adiciona listeners para os botões "Ver"
  document.querySelectorAll(".action-btn--view").forEach(btn => {
    btn.addEventListener("click", () => openExecutionModal(btn.dataset.executionId));
  });

  updatePagination(runs.length);
}

function updatePagination(totalItems) {
    // ... (sua lógica de paginação) ...
}

function initializeStatusChart(runs) {
  const ctx = document.getElementById("statusChart")?.getContext("2d");
  if (!ctx) return;
  
  const totalPassed = runs.reduce((sum, run) => sum + (run.passedTests || 0), 0);
  const totalFailed = runs.reduce((sum, run) => sum + (run.failedTests || 0), 0);

  if (statusChart) statusChart.destroy();
  
  statusChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Aprovados", "Falhados"],
      datasets: [{
        data: [totalPassed, totalFailed],
        backgroundColor: ["#16a34a", "#dc2626"],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

// ... (buildPassedFailedSeries e initializeHistoryChartFromRuns) ...

/* ===========================
   Filtros e Eventos
=========================== */
// ... (filterRunsByPeriod, setupPeriodButtons, setupEventListeners, etc.) ...

/* ===========================
   Orquestração Principal
=========================== */
async function loadRuns() {
  const runsContainer = document.querySelector('.runs-container, .history-section');
  runsContainer?.classList.add('loading');

  try {
    executionsData = await fetchRuns(); // Busca todos os dados da API
    
    // Filtra os dados APENAS para o gráfico de histórico
    const filteredRunsForHistory = filterRunsByPeriod(executionsData, historyPeriod);

    // **Renderiza TODOS os componentes**
    initializeHistoryChartFromRuns(filteredRunsForHistory); // Gráfico de histórico com dados filtrados
    updateStatistics(executionsData);                       // Estatísticas com dados totais
    initializeStatusChart(executionsData);                  // Gráfico de pizza com dados totais
    populateExecutionTable(executionsData);                 // Tabela com dados totais

  } catch (error) {
    console.error('Erro ao carregar as execuções:', error);
  } finally {
    runsContainer?.classList.remove('loading');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // ... (setupPeriodButtons, setupEventListeners, loadRuns, etc.) ...
});

