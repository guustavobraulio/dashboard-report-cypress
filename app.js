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
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Garante: ícone + label + slot do spinner dentro do botão (sem overlay)
function ensureButtonStructure() {
  const btn = document.getElementById("runPipelineBtn");
  if (!btn) return;

  // Envolvimento do conteúdo
  if (!btn.querySelector(".btn-pipeline__content")) {
    const current = btn.innerHTML;
    btn.innerHTML = `
      <span class="btn-pipeline__content">
        ${current}
        <span class="btn-spinner-slot" aria-hidden="true"></span>
      </span>`;
    btn.setAttribute("aria-live", "polite"); // acessibilidade
    return;
  }

  // Garante o slot do spinner mesmo se já existir content
  const content = btn.querySelector(".btn-pipeline__content");
  if (content && !content.querySelector(".btn-spinner-slot")) {
    content.insertAdjacentHTML(
      "beforeend",
      '<span class="btn-spinner-slot" aria-hidden="true"></span>'
    );
  }
}

// Troca somente o texto; preserva ícone e o slot do spinner
function setButtonLabel(text) {
  const btn = document.getElementById("runPipelineBtn");
  if (!btn) return;
  const content = btn.querySelector(".btn-pipeline__content");
  if (!content) return;

  const icon = content.querySelector("i")?.outerHTML || "";
  const slot =
    content.querySelector(".btn-spinner-slot")?.outerHTML ||
    '<span class="btn-spinner-slot" aria-hidden="true"></span>';

  content.innerHTML = `${icon}${text}${slot}`;
}

// Aplica classes de estado visuais (sem overlay)
function mostrarStatusNoBotao(statusText, variant = null) {
  const btn = document.getElementById("runPipelineBtn");
  if (!btn) return;
  btn.classList.remove("is-in-progress", "is-success", "is-failure");
  setButtonLabel(statusText);
  if (variant === "in_progress") btn.classList.add("is-in-progress");
  if (variant === "success") btn.classList.add("is-success");
  if (variant === "failure") btn.classList.add("is-failure");
}

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
    duration: Math.round((r.totalDuration ?? 0) / 1000), // ms -> s
    totalTests: r.totalTests ?? (r.totalPassed ?? 0) + (r.totalFailed ?? 0),
    passedTests: r.totalPassed ?? 0,
    failedTests: r.totalFailed ?? 0,
    branch: r.branch || "-",
    environment: r.environment || "-",
    commit: r.commit || "",
    author: r.author || "",
    githubUrl: r.githubRunUrl || "#",
    tests: Array.isArray(r.tests)
      ? r.tests.map((t) => ({
          name:
            t.title || (Array.isArray(t.title) ? t.title.join(" > ") : "spec"),
          status: t.state || "passed",
          duration: Math.round((t.duration ?? 0) / 1000), // ms -> s
          error: t.error || t.displayError || "",
        }))
      : [],
    logs: Array.isArray(r.logs) ? [...r.logs] : [],
    artifacts: Array.isArray(r.artifacts) ? [...r.artifacts] : [],
  }));
}

/* ===========================
   Trigger Pipeline (Functions)
=========================== */
async function executarPipeline() {
  const btn = document.getElementById("runPipelineBtn");
  if (!btn) return;

  ensureButtonStructure(); // garante slot do spinner e estrutura interna

  btn.disabled = true;
  btn.classList.add("btn--loading");
  mostrarStatusNoBotao("Iniciando...", "in_progress");

  try {
    const start = await fetch("/.netlify/functions/trigger-pipeline", {
      method: "POST",
    });
    if (!start.ok) throw new Error(`Falha ao disparar: ${start.status}`);

    let result = null;
    do {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await fetch("/.netlify/functions/pipeline-status");
      if (!res.ok) throw new Error(`Falha no status: ${res.status}`);
      result = await res.json();

      const label =
        result.status === "queued"
          ? "Na fila..."
          : result.status === "in_progress"
          ? "Executando..."
          : result.status === "completed"
          ? "Finalizando..."
          : "Processando...";

      mostrarStatusNoBotao(label, "in_progress");
    } while (result.status !== "completed");

    if (result.conclusion === "success") {
      mostrarStatusNoBotao("Concluída ✓", "success");
    } else {
      mostrarStatusNoBotao("Falhou ✕", "failure");
    }
  } catch (e) {
    console.error(e);
    mostrarStatusNoBotao("Erro ao executar", "failure");
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove(
        "btn--loading",
        "is-in-progress",
        "is-success",
        "is-failure"
      );
      setButtonLabel("Executar Pipeline");
      ensureButtonStructure(); // mantém slot para próximos loads
    }, 1800);
  }
}

/* ===========================
   Cards/Estatísticas
=========================== */
function updateStatistics() {
  const totalPassed = filteredExecutions.reduce(
    (s, e) => s + (e.passedTests || 0),
    0
  );
  const totalFailed = filteredExecutions.reduce(
    (s, e) => s + (e.failedTests || 0),
    0
  );
  const totalTests = totalPassed + totalFailed;
  const avgDuration = filteredExecutions.length
    ? Math.round(
        filteredExecutions.reduce((s, e) => s + (e.duration || 0), 0) /
          filteredExecutions.length
      )
    : 0;
  const successRate = totalTests
    ? Math.round((totalPassed / totalTests) * 100)
    : 0;

  document.getElementById("totalPassed").textContent = totalPassed;
  document.getElementById("totalFailed").textContent = totalFailed;
  document.getElementById("avgDuration").textContent = `${avgDuration}s`;
  document.getElementById("successRate").textContent = `${successRate}%`;
}

/* ===========================
   Tabela
=========================== */
function populateExecutionTable() {
  const tbody = document.getElementById("executionTableBody");
  const start = (currentPage - 1) * itemsPerPage;
  const page = filteredExecutions.slice(start, start + itemsPerPage);

  tbody.innerHTML = page
    .map(
      (e) => `
    <tr>
      <td><code>${e.id}</code></td>
      <td>${formatDateTime(e.date)}</td>
      <td><code>${e.branch}</code></td>
      <td><span class="status status--info">${e.environment}</span></td>
      <td><span class="status status--${e.status}">${
        e.status === "passed" ? "Aprovado" : "Falhado"
      }</span></td>
      <td>${e.passedTests}/${e.totalTests}</td>
      <td>${e.duration}s</td>
      <td>
        <button class="action-btn action-btn--view" data-execution-id="${e.id}">
          <i class="fas fa-eye"></i> Ver
        </button>
        ${
          e.githubUrl && e.githubUrl !== "#"
            ? `<a class="btn btn--sm btn--outline" href="${e.githubUrl}" target="_blank" rel="noopener">Ação</a>`
            : ""
        }
      </td>
    </tr>
  `
    )
    .join("");

  document.querySelectorAll(".action-btn--view").forEach((btn) => {
    btn.addEventListener("click", () =>
      openExecutionModal(btn.getAttribute("data-execution-id"))
    );
  });

  updatePagination();
}

/* ===========================
   Paginação
=========================== */
function updatePagination() {
  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  const el = document.getElementById("pagination");
  el.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "← Anterior";
  prev.disabled = currentPage === 1;
  prev.onclick = () => changePage(currentPage - 1);
  el.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
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

/* ===========================
   Gráficos
=========================== */
function initializeStatusChart() {
  const ctx = document.getElementById("statusChart")?.getContext("2d");
  if (!ctx) return;
  const totalPassed = filteredExecutions.reduce(
    (s, e) => s + (e.passedTests || 0),
    0
  );
  const totalFailed = filteredExecutions.reduce(
    (s, e) => s + (e.failedTests || 0),
    0
  );
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Aprovados", "Falhados"],
      datasets: [
        {
          data: [totalPassed, totalFailed],
          backgroundColor: ["#1FB8CD", "#B4413C"],
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function initializeHistoryChartFromRuns(runs) {
  const ctx = document.getElementById('historyChart')?.getContext('2d');
  if (!ctx) return;

  if (historyChart) historyChart.destroy();

  // calcula um suggestedMax simples
  const maxY = runs.reduce((m, r) => Math.max(m, (r.passedTests||0), (r.failedTests||0)), 0);
  const suggestedMax = Math.max(5, maxY);

  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Aprovados',
          data: runs.map(r => ({ x: r.date, y: r.passedTests || 0 })),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.15)',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 5,
          tension: 0.25,
        },
        {
          label: 'Falhados',
          data: runs.map(r => ({ x: r.date, y: r.failedTests || 0 })),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.15)',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 5,
          tension: 0.25,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: {
          type: 'timeseries',
          // time: { unit: 'minute' }, // opcional: deixar o adapter decidir
          ticks: { autoSkip: true, maxRotation: 0 }
        },
        y: {
          beginAtZero: true,
          suggestedMax,
          ticks: {
            precision: 0,   // força inteiros
            stepSize: 1     // passos de 1
          }
        }
      }
    }
  });
}


/* ===========================
   Modal
=========================== */
function openExecutionModal(id) {
  const e = executionsData.find((x) => x.id === id);
  if (!e) return;

  document.getElementById("modalExecutionId").textContent = e.id;
  document.getElementById("modalExecutionDate").textContent = formatDateTime(
    e.date
  );
  document.getElementById("modalExecutionBranch").textContent = e.branch;
  document.getElementById("modalExecutionEnvironment").textContent =
    e.environment;
  document.getElementById("modalExecutionAuthor").textContent = e.author || "-";
  document.getElementById("modalExecutionCommit").textContent = e.commit || "-";
  document.getElementById(
    "modalExecutionDuration"
  ).textContent = `${e.duration}s`;
  document.getElementById(
    "modalExecutionStatus"
  ).innerHTML = `<span class="status status--${e.status}">${
    e.status === "passed" ? "Aprovado" : "Falhado"
  }</span>`;
  document.getElementById("modalGithubLink").href = e.githubUrl || "#";

  const testsTabBtn = document.querySelector('[data-tab="tests"]');
  const logsTabBtn = document.querySelector('[data-tab="logs"]');
  const artifactsTabBtn = document.querySelector('[data-tab="artifacts"]');

  if (testsTabBtn) testsTabBtn.disabled = !(e.tests && e.tests.length);
  if (logsTabBtn) logsTabBtn.disabled = !(e.logs && e.logs.length);
  if (artifactsTabBtn)
    artifactsTabBtn.disabled = !(e.artifacts && e.artifacts.length);

  const testsList = document.getElementById("modalTestsList");
  testsList.innerHTML = (e.tests || [])
    .map(
      (t) => `
    <div class="test-item test-item--${t.status || "passed"}">
      <div class="test-info">
        <div class="test-name">${t.name}</div>
        ${t.error ? `<div class="test-error">${t.error}</div>` : ""}
      </div>
      <div class="test-duration">${t.duration || 0}s</div>
    </div>
  `
    )
    .join("");

  const logsPre = document.getElementById("modalLogs");
  logsPre.textContent = (e.logs || []).join("\n\n");

  const artifactsWrap = document.getElementById("modalArtifacts");
  artifactsWrap.innerHTML = (e.artifacts || [])
    .map(
      (a) => `
    <div class="artifact-item">
      <i class="fas fa-file-alt"></i>
      <span>${a.name || "artifact"}</span>
      ${
        a.url
          ? `<a class="btn btn--sm btn--outline" href="${a.url}" target="_blank" rel="noopener">Abrir</a>`
          : ""
      }
    </div>
  `
    )
    .join("");

  const modal = document.getElementById("executionModal");
  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("executionModal");
  modal.classList.add("hidden");
  modal.style.display = "none";

  document
    .querySelectorAll(".tab-button")
    .forEach((btn) => btn.classList.remove("tab-button--active"));
  document
    .querySelectorAll(".tab-panel")
    .forEach((panel) => panel.classList.remove("tab-panel--active"));
  const overviewTab = document.querySelector(
    '.tab-button[data-tab="overview"]'
  );
  const overviewPanel = document.getElementById("overview-tab");
  if (overviewTab) overviewTab.classList.add("tab-button--active");
  if (overviewPanel) overviewPanel.classList.add("tab-panel--active");
}

/* ===========================
   Filtros e eventos
=========================== */
function setupEventListeners() {
  document
    .getElementById("branchFilter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("environmentFilter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("statusFilter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("dateFilter")
    .addEventListener("change", applyFilters);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  const backdrop = document.querySelector("#executionModal .modal-backdrop");
  backdrop?.addEventListener("click", closeModal);

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const tabName = button.dataset.tab;
      document
        .querySelectorAll(".tab-button")
        .forEach((btn) => btn.classList.remove("tab-button--active"));
      document
        .querySelectorAll(".tab-panel")
        .forEach((panel) => panel.classList.remove("tab-panel--active"));
      button.classList.add("tab-button--active");
      const targetPanel = document.getElementById(`${tabName}-tab`);
      if (targetPanel) targetPanel.classList.add("tab-panel--active");
    });
  });
}

function applyFilters() {
  const branch = document.getElementById("branchFilter").value;
  const env = document.getElementById("environmentFilter").value;
  const status = document.getElementById("statusFilter").value;
  const date = document.getElementById("dateFilter").value;

  filteredExecutions = executionsData.filter((e) => {
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
document.addEventListener("DOMContentLoaded", () => {
  setupPeriodButtons(); // com parênteses
  setupEventListeners();
  loadRuns().catch(console.error);
  setInterval(() => loadRuns().catch(console.error), 30000);

  // Estrutura do botão para status embutido (ícone + label + slot spinner)
  const btn = document.getElementById("runPipelineBtn");
  if (btn) {
    if (!btn.querySelector(".btn-pipeline__content")) {
      const current = btn.innerHTML;
      btn.innerHTML = `<span class="btn-pipeline__content">${current}<span class="btn-spinner-slot" aria-hidden="true"></span></span>`;
      btn.setAttribute("aria-live", "polite");
    } else if (!btn.querySelector(".btn-spinner-slot")) {
      btn
        .querySelector(".btn-pipeline__content")
        .insertAdjacentHTML(
          "beforeend",
          '<span class="btn-spinner-slot" aria-hidden="true"></span>'
        );
    }
    btn.addEventListener("click", executarPipeline);
  } else {
    console.error("Botão runPipelineBtn não encontrado no DOM");
  }
});

async function loadRuns() {
  try {
    const res = await fetch('/.netlify/functions/get-results');
    const runs = await res.json();
    window.__allRuns = runs || [];

    executionsData = (runs || []).map(r => ({
      id: r.runId || crypto.randomUUID(),
      date: r.timestamp, // ISO (com Z) ou epoch ms aceitos por new Date()
      status: (r.totalFailed ?? 0) > 0 ? 'failed' : 'passed',
      duration: Math.round((r.totalDuration ?? 0) / 1000),
      totalTests: r.totalTests ?? (r.totalPassed ?? 0) + (r.totalFailed ?? 0),
      passedTests: r.totalPassed ?? 0,
      failedTests: r.totalFailed ?? 0,
      branch: r.branch || '-',
      environment: r.environment || '-',
      commit: r.commit || '',
      author: r.author || '',
      githubUrl: r.githubRunUrl || '#',
      tests: Array.isArray(r.tests) ? r.tests : [],
      logs: Array.isArray(r.logs) ? r.logs : [],
      artifacts: Array.isArray(r.artifacts) ? r.artifacts : [],
    }));

    filteredExecutions = executionsData.slice();
    updateStatistics();
    initializeStatusChart();
    populateExecutionTable();

    const filtered = filterRunsByPeriod(executionsData, historyPeriod);
    console.log('historyPeriod=', historyPeriod, 'total=', executionsData.length, 'filtrados=', filtered.length);
    initializeHistoryChartFromRuns(filtered);
  } catch (err) {
    console.error('Falha ao carregar execuções:', err);
  }
}


// Constrói séries de aprovados e reprovados por timestamp (minuto)
function buildPassedFailedSeries(runs) {
  const bucket = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const map = new Map(); // label -> { passed, failed }
  for (const r of runs) {
    const label = bucket(r.date);
    const passed = r.passedTests || 0;
    const failed = r.failedTests || 0;
    if (!map.has(label)) map.set(label, { passed: 0, failed: 0 });
    const agg = map.get(label);
    agg.passed += passed;
    agg.failed += failed;
  }

    const entries = Array.from(map.entries()).sort(
      (a, b) => new Date(a) - new Date(b)
    );
  return {
    labels: entries.map(([label]) => label),
    passedCounts: entries.map(([, v]) => v.passed),
    failedCounts: entries.map(([, v]) => v.failed),
  };
}


// Estado de período do histórico: '24h' | '7d' | '30d'
let historyPeriod = '24h'; // default

// Filtra runs no formato existente do projeto, assumindo run.date como string ISO ou timestamp
function filterRunsByPeriod(runs, period = historyPeriod) {
  const now = Date.now();

  let windowMs = 7 * 24 * 60 * 60 * 1000; // default 7d
  if (period === '24h') windowMs = 24 * 60 * 60 * 1000;
  else if (period === '30d') windowMs = 30 * 24 * 60 * 60 * 1000;

  const start = now - windowMs;

  const toMs = (d) => typeof d === 'number' ? d : new Date(d).getTime();

  return runs.filter(r => {
    const t = toMs(r.date);
    return Number.isFinite(t) && t >= start && t <= now;
  });
}

// Liga botões de período e re-renderiza o histórico
function setupPeriodButtons() {
  // Tenta bind direto
  const buttons = document.querySelectorAll('[data-history-period]');
  console.log('[history] Encontrados botões:', buttons.length);
  if (buttons.length) {
    buttons.forEach(btn => {
      btn.addEventListener('click', onHistoryPeriodClick);
    });
  }

  // Fallback: delegação no container do gráfico (caso botões sejam recriados)
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

  // Alterna estado visual
  document.querySelectorAll('[data-history-period]')
    .forEach(b => b.classList.remove('period-btn--active'));
  this.classList.add('period-btn--active');

  // Re-render
  if (!Array.isArray(executionsData)) {
    console.warn('[history] executionsData ausente; usando __allRuns');
  }
  const source = Array.isArray(executionsData) && executionsData.length
    ? executionsData
    : (window.__allRuns || []);
  const filtered = filterRunsByPeriod(source, historyPeriod);
  console.log('[history] período:', historyPeriod, 'pontos:', filtered.length);
  initializeHistoryChartFromRuns(filtered);
}

