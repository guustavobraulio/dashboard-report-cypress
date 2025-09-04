// ...existing code...
// app.js — Dashboard integrado às Netlify Functions

// ===========================
// Estados globais
// ===========================
let executionsData = [];          // cache de execuções normalizadas
let filteredExecutions = [];      // lista usada por cards/tabela/pizza (filtros da UI)
let statusChart = null;           // instância do pie
let historyChart = null;          // instância do histórico
let currentPage = 1;
const itemsPerPage = 10;
let historyPeriod = '24h';        // '24h' | '7d' | '30d'

// ===========================
// Utils
// ===========================
const dfBR = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

function formatDateTime(s) {
  const d = new Date(s);
  return dfBR.format(d).replace(/\s(\d{2}):/, ' às $1:');
}

// ==== Branch helpers ====
function uniqueBranches(items) {
  return [...new Set(items.map(i => i.branch).filter(Boolean))].sort();
}
function filterByBranch(items, branchValue) {
  return branchValue ? items.filter(i => i.branch === branchValue) : items;
}

// Estrutura do botão para conter label + ícone + slot de spinner
function ensureButtonStructure() {
  const btn = document.getElementById("runPipelineBtn");
  if (!btn) return;
  if (!btn.querySelector(".btn-pipeline__content")) {
    const current = btn.innerHTML;
    btn.innerHTML = `
      <span class="btn-pipeline__content">
        ${current}
        <span class="btn-spinner-slot" aria-hidden="true"></span>
      </span>`;
    btn.setAttribute("aria-live", "polite");
  } else if (!btn.querySelector(".btn-spinner-slot")) {
    btn.querySelector(".btn-pipeline__content")
      .insertAdjacentHTML("beforeend", '<span class="btn-spinner-slot" aria-hidden="true"></span>');
  }
}
function setButtonLabel(text) {
  const btn = document.getElementById("runPipelineBtn");
  if (!btn) return;
  const content = btn.querySelector(".btn-pipeline__content");
  if (!content) return;
  const icon = content.querySelector("i")?.outerHTML || "";
  const slot = content.querySelector(".btn-spinner-slot")?.outerHTML || '<span class="btn-spinner-slot" aria-hidden="true"></span>';
  content.innerHTML = `${icon}${text}${slot}`;
}
function mostrarStatusNoBotao(statusText, variant = null) {
  const btn = document.getElementById("runPipelineBtn");
  if (!btn) return;
  btn.classList.remove("is-in-progress", "is-success", "is-failure");
  setButtonLabel(statusText);
  if (variant === "in_progress") btn.classList.add("is-in-progress");
  if (variant === "success") btn.classList.add("is-success");
  if (variant === "failure") btn.classList.add("is-failure");
}

// ===========================
// Backend (Functions)
// ===========================
async function fetchRuns() {
  const res = await fetch("/.netlify/functions/get-results");
  if (!res.ok) throw new Error(`Falha ao carregar resultados: ${res.status}`);
  const raw = await res.json();
  const arr = Array.isArray(raw?.executions) ? raw.executions : (Array.isArray(raw) ? raw : []);
  return arr.map((r, idx) => ({
    id: r.runId || `exec-${String(idx + 1).padStart(3, "0")}`,
    date: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
    passedTests: Number(r.totalPassed ?? 0),
    failedTests: Number(r.totalFailed ?? 0),
    status: (r.totalFailed ?? 0) > 0 ? "failed" : "passed",
    duration: Math.round((r.totalDuration ?? 0) / 1000),
    totalTests: r.totalTests ?? ((r.totalPassed ?? 0) + (r.totalFailed ?? 0)),
    // passedTests: r.totalPassed ?? 0,
    // failedTests: r.totalFailed ?? 0,
    branch: r.branch || "-",
    environment: r.environment || "-",
    commit: r.commit || "",
    author: r.author || "",
    githubUrl: r.githubRunUrl || "#",
    tests: Array.isArray(r.tests) ? r.tests.map(t => ({
      name: t.title || (Array.isArray(t.title) ? t.title.join(" > ") : "spec"),
      status: t.state || "passed",
      duration: Math.round((t.duration ?? 0) / 1000),
      error: t.error || t.displayError || ""
    })) : [],
    logs: Array.isArray(r.logs) ? [...r.logs] : [],
    artifacts: Array.isArray(r.artifacts) ? [...r.artifacts] : []
  }));
}

// Disparo do pipeline (mantida sua lógica)
async function executarPipeline() {
  const btn = document.getElementById("runPipelineBtn");
  if (!btn) return;
  ensureButtonStructure();
  btn.disabled = true;
  btn.classList.add("btn--loading");
  mostrarStatusNoBotao("Iniciando...", "in_progress");
  try {
    const start = await fetch("/.netlify/functions/trigger-pipeline", { method: "POST" });
    if (!start.ok) throw new Error(`Falha ao disparar: ${start.status}`);
    let result = null;
    do {
      await new Promise(r => setTimeout(r, 5000));
      const res = await fetch("/.netlify/functions/pipeline-status");
      if (!res.ok) throw new Error(`Falha no status: ${res.status}`);
      result = await res.json();
      const label = result.status === "queued" ? "Na fila..."
        : result.status === "in_progress" ? "Executando..."
          : result.status === "completed" ? "Finalizando..." : "Processando...";
      mostrarStatusNoBotao(label, "in_progress");
    } while (result.status !== "completed");
    if (result.conclusion === "success") mostrarStatusNoBotao("Concluída ✓", "success");
    else mostrarStatusNoBotao("Falhou ✕", "failure");
  } catch (e) {
    console.error(e);
    mostrarStatusNoBotao("Erro ao executar", "failure");
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove("btn--loading", "is-in-progress", "is-success", "is-failure");
      setButtonLabel("Executar Pipeline");
      ensureButtonStructure();
    }, 1800);
  }
}

// ===========================
// Cards/Estatísticas
// ===========================
function updateStatistics() {
  const totalPassed = filteredExecutions.reduce((s, e) => s + (e.passedTests || 0), 0);
  const totalFailed = filteredExecutions.reduce((s, e) => s + (e.failedTests || 0), 0);
  const totalTests = totalPassed + totalFailed;
  const avgDuration = filteredExecutions.length
    ? Math.round(filteredExecutions.reduce((s, e) => s + (e.duration || 0), 0) / filteredExecutions.length)
    : 0;
  const successRate = totalTests ? Math.round((totalPassed / totalTests) * 100) : 0;

  const tp = document.getElementById("totalPassed");
  const tf = document.getElementById("totalFailed");
  const ad = document.getElementById("avgDuration");
  const sr = document.getElementById("successRate");
  if (tp) tp.textContent = totalPassed;
  if (tf) tf.textContent = totalFailed;
  if (ad) ad.textContent = `${avgDuration}s`;
  if (sr) sr.textContent = `${successRate}%`;
}

// ===========================
// Tabela + Paginação
// ===========================
function populateExecutionTable() {
  const tbody = document.getElementById("executionTableBody");
  if (!tbody) return;
  const start = (currentPage - 1) * itemsPerPage;
  const page = filteredExecutions.slice(start, start + itemsPerPage);
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
        ${e.githubUrl && e.githubUrl !== "#" ? `<a class="btn btn--sm btn--outline" href="${e.githubUrl}" target="_blank" rel="noopener">Ação</a>` : ""}
      </td>
    </tr>`).join("");

  document.querySelectorAll(".action-btn--view").forEach(btn => {
    btn.addEventListener("click", () => openExecutionModal(btn.getAttribute("data-execution-id")));
  });

  updatePagination();
}

function updatePagination() {
  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  const el = document.getElementById("pagination");
  if (!el) return;
  el.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "← Anterior";
  prev.disabled = currentPage === 1;
  prev.onclick = () => changePage(currentPage - 1);
  el.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      const b = document.createElement("button");
      b.textContent = i;
      b.className = i === currentPage ? "active" : "";
      b.onclick = () => changePage(i);
      el.appendChild(b);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      dots.style.padding = "0 8px";
      el.appendChild(dots);
    }
  }

  const next = document.createElement("button");
  next.textContent = "Próxima →";
  next.disabled = currentPage === totalPages;
  next.onclick = () => changePage(currentPage + 1);
  el.appendChild(next);
}

function changePage(p) {
  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  if (p >= 1 && p <= totalPages) {
    currentPage = p;
    populateExecutionTable();
  }
}

// ===========================
// Gráficos
// ===========================
function initializeStatusChart() {
  const ctx = document.getElementById("statusChart")?.getContext("2d");
  if (!ctx) return;
  const totalPassed = filteredExecutions.reduce((s, e) => s + (e.passedTests || 0), 0);
  const totalFailed = filteredExecutions.reduce((s, e) => s + (e.failedTests || 0), 0);

  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Aprovados", "Falhados"],
      datasets: [{
        data: [totalPassed, totalFailed],
        backgroundColor: ["#16a34a", "#dc2626"],   // verde/vermelho
        borderColor: ["#16a34a", "#dc2626"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
  window.statusChart = statusChart;

}

function populateBranchFilter() {
  const sel = document.getElementById('branchFilter');
  if (!sel) return;

  const current = sel.value || '';
  sel.innerHTML = '<option value="">Todas as branches</option>';

  const branches = uniqueBranches(filteredExecutions || []);
  for (const b of branches) {
    sel.add(new Option(b, b, false, b === current));
  }
}

function updateStatusChartForBranch() {
  const sel = document.getElementById('branchFilter');
  if (!sel || !window.statusChart) return;

  const withBranch = filterByBranch(filteredExecutions || [], sel.value);
  const totalPassed = withBranch.reduce((s, e) => s + (e.passedTests || 0), 0);
  const totalFailed = withBranch.reduce((s, e) => s + (e.failedTests || 0), 0);

  window.statusChart.data.datasets.data = [totalPassed, totalFailed];
  window.statusChart?.update(); // atualização conforme doc Chart.js [3][2][9]
}

function initializeHistoryChartFromRuns(runs) {
  const ctx = document.getElementById('historyChart')?.getContext('2d');
  if (!ctx) return;
  if (historyChart) historyChart.destroy();

  // 1) Filtra e ordena os pontos por data (garante time scale estável)
  const runsOk = (runs || []).filter(r => {
    if (!r || !r.date) return false;
    const t = new Date(r.date).getTime();
    return Number.isFinite(t);
  });
  const sorted = [...runsOk].sort((a, b) => new Date(a.date) - new Date(b.date));

  // DEBUG: confirme quantidade e range
  console.log('history(sorted) len=', sorted.length, 'first=', sorted?.date, 'last=', sorted.at(-1)?.date); // [4]

  // 2) Fallback quando não houver pontos válidos
  if (!sorted.length) {
    historyChart = new Chart(ctx, {
      type: 'line',
      data: { datasets: [
        { label: 'Aprovados', data: [] },
        { label: 'Falhados',  data: [] }
      ]},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        normalized: true,
        scales: {
          x: { type: 'time', time: { unit: 'hour' }, ticks: { autoSkip: true, maxRotation: 0 } },
          y: { beginAtZero: true, ticks: { precision: 0, stepSize: 1 } }
        },
        plugins: { legend: { position: 'top' } }
      }
    });
    return;
  }

  const suggestedMax = Math.max(5, ...sorted.map(r => Math.max(Number(r.passedTests || 0), Number(r.failedTests || 0)))) + 1;

  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Aprovados',
          data: sorted.map(r => ({ x: r.date, y: Number(r.passedTests ?? 0) })), // y sempre numérico
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.15)',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 5,
          tension: 0.25
        },
        {
          label: 'Falhados',
          data: sorted.map(r => ({ x: r.date, y: Number(r.failedTests ?? 0) })),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.15)',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 5,
          tension: 0.25
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,        // usa {x,y} diretamente
      normalized: true,      // melhora precisão/performance
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'hour' }, // mude para 'day' quando historyPeriod for 7d/30d, se desejar
          adapters: { date: { locale: window?.dateFns?.locale?.ptBR } },
          ticks: { autoSkip: true, maxRotation: 0 }
        },
        y: {
          beginAtZero: true,
          suggestedMax,
          ticks: { precision: 0, stepSize: 1 }
        }
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title(items) {
              // corrigido: pegar o primeiro item do array
              const first = (items && items.length) ? items : null;
              const t = first && (first.parsed?.x ?? first.raw?.x);
              return t ? dfBR.format(new Date(t)).replace(/\s(\d{2}):/, ' às $1:') : '';
            }
          }
        }
      }
    }
  });
}

// ===========================
// Modal
// ===========================
function openExecutionModal(id) {
  const e = executionsData.find(x => x.id === id);
  if (!e) return;
  const set = (id, val, prop = 'textContent') => {
    const el = document.getElementById(id);
    if (el) el[prop] = val;
  };
  set("modalExecutionId", e.id);
  set("modalExecutionDate", formatDateTime(e.date));
  set("modalExecutionBranch", e.branch);
  set("modalExecutionEnvironment", e.environment);
  set("modalExecutionAuthor", e.author || "-");
  set("modalExecutionCommit", e.commit || "-");
  set("modalExecutionDuration", `${e.duration}s`);
  const statusEl = document.getElementById("modalExecutionStatus");
  if (statusEl) statusEl.innerHTML = `<span class="status status--${e.status}">${e.status === "passed" ? "Aprovado" : "Falhado"}</span>`;
  const gh = document.getElementById("modalGithubLink");
  if (gh) gh.href = e.githubUrl || "#";

  const testsTabBtn = document.querySelector('[data-tab="tests"]');
  const logsTabBtn = document.querySelector('[data-tab="logs"]');
  const artifactsTabBtn = document.querySelector('[data-tab="artifacts"]');
  if (testsTabBtn) testsTabBtn.disabled = !(e.tests && e.tests.length);
  if (logsTabBtn) logsTabBtn.disabled = !(e.logs && e.logs.length);
  if (artifactsTabBtn) artifactsTabBtn.disabled = !(e.artifacts && e.artifacts.length);

  const testsList = document.getElementById("modalTestsList");
  if (testsList) {
    testsList.innerHTML = (e.tests || []).map(t => `
      <div class="test-item test-item--${t.status || "passed"}">
        <div class="test-info">
          <div class="test-name">${t.name}</div>
          ${t.error ? `<div class="test-error">${t.error}</div>` : ""}
        </div>
        <div class="test-duration">${t.duration || 0}s</div>
      </div>`).join("");
  }

  const logsPre = document.getElementById("modalLogs");
  if (logsPre) logsPre.textContent = (e.logs || []).join("\n\n");

  const artifactsWrap = document.getElementById("modalArtifacts");
  if (artifactsWrap) {
    artifactsWrap.innerHTML = (e.artifacts || []).map(a => `
      <div class="artifact-item">
        <i class="fas fa-file-alt"></i>
        <span>${a.name || "artifact"}</span>
        ${a.url ? `<a class="btn btn--sm btn--outline" href="${a.url}" target="_blank" rel="noopener">Abrir</a>` : ""}
      </div>`).join("");
  }

  const modal = document.getElementById("executionModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
}

function closeModal() {
  const modal = document.getElementById("executionModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.style.display = "none";
  document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("tab-button--active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("tab-panel--active"));
  const overviewTab = document.querySelector('.tab-button[data-tab="overview"]');
  const overviewPanel = document.getElementById("overview-tab");
  if (overviewTab) overviewTab.classList.add("tab-button--active");
  if (overviewPanel) overviewPanel.classList.add("tab-panel--active");
}

// ===========================
// Filtros e eventos
// ===========================
function setupEventListeners() {
  const el = id => document.getElementById(id);
  el("branchFilter")?.addEventListener("change", applyFilters);
  el("environmentFilter")?.addEventListener("change", applyFilters);
  el("statusFilter")?.addEventListener("change", applyFilters);
  el("dateFilter")?.addEventListener("change", applyFilters);
  el("closeModal")?.addEventListener("click", closeModal);
  document.querySelector("#executionModal .modal-backdrop")?.addEventListener("click", closeModal);

  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const tabName = button.dataset.tab;
      document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("tab-button--active"));
      document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("tab-panel--active"));
      button.classList.add("tab-button--active");
      const targetPanel = document.getElementById(`${tabName}-tab`);
      if (targetPanel) targetPanel.classList.add("tab-panel--active");
    });
  });
}

function applyFilters() {
  const branch = document.getElementById("branchFilter")?.value || "";
  const env = document.getElementById("environmentFilter")?.value || "";
  const status = document.getElementById("statusFilter")?.value || "";
  const date = document.getElementById("dateFilter")?.value || "";

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
  populateBranchFilter();
  updateStatusChartForBranch();
  populateExecutionTable();
}


// ===========================
// Histórico - filtro de período
// ===========================
function filterRunsByPeriod(runs, period = historyPeriod) {
  const now = Date.now();
  let windowMs = 24 * 60 * 60 * 1000;
  if (period === '7d') windowMs = 7 * 24 * 60 * 60 * 1000;
  if (period === '30d') windowMs = 30 * 24 * 60 * 60 * 1000;
  const start = now - windowMs;
  const toMs = d => typeof d === 'number' ? d : new Date(d).getTime();
  return runs.filter(r => {
    const t = toMs(r.date);
    return Number.isFinite(t) && t >= start && t <= now;
  });
}

function setupPeriodButtons() {
  const buttons = document.querySelectorAll('[data-history-period]');
  buttons.forEach(btn => btn.addEventListener('click', onHistoryPeriodClick));
  const container = document.querySelector('#historySection') || document;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-history-period]');
    if (!btn) return;
    onHistoryPeriodClick.call(btn, e);
  });
}

function onHistoryPeriodClick(e) {
  e.preventDefault();
  const newPeriod = this.getAttribute('data-history-period');
  if (!newPeriod || newPeriod === historyPeriod) return;
  historyPeriod = newPeriod;

  document.querySelectorAll('[data-history-period]').forEach(b => b.classList.remove('period-btn--active'));
  this.classList.add('period-btn--active');

  const source = executionsData?.length ? executionsData : (window.__allRuns || []);
  const filtered = filterRunsByPeriod(source, historyPeriod);
  // DEBUG: verificar tamanho pós-filtro de período
  console.log('historyPeriod(click)=', historyPeriod, 'count=', filtered.length);
  initializeHistoryChartFromRuns(filtered);
}

// ===========================
// Bootstrap
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  setupPeriodButtons();
  setupEventListeners();
  ensureButtonStructure();

  loadRuns().catch(console.error);
  setInterval(() => loadRuns().catch(console.error), 30000);

  const btn = document.getElementById("runPipelineBtn");
  btn?.addEventListener("click", executarPipeline);
});

// ===========================
// Orquestração de carregamento
// ===========================
async function loadRuns() {
  try {
    const runs = await fetchRuns();
    window.__allRuns = runs || [];
    executionsData = runs;

    filteredExecutions = executionsData.slice();
    updateStatistics();
    initializeStatusChart();
    populateBranchFilter();
    updateStatusChartForBranch();
    populateExecutionTable();

    // Histórico (período)
    const filtered = filterRunsByPeriod(executionsData, historyPeriod);

    // DEBUG: verificar tamanho pós-filtro de período no load
    console.log('historyPeriod(load)=', historyPeriod, 'count=', filtered.length); [3]

    initializeHistoryChartFromRuns(filtered);
  } catch (err) {
    console.error('Falha ao carregar execuções:', err);
  }
}