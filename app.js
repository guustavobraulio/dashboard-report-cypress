// ===========================
// Bootstrap seguro e namespace
// ===========================
(function (root) {
  // evita múltiplas montagens por reinjeção
  if (root.__DASH_APP_MOUNTED__) {
    console.warn('App já inicializado, ignorando nova montagem');
    return;
  }
  root.__DASH_APP_MOUNTED__ = true;

  // namespace único para estado global
  const ns = (root.__DASH_STATE__ = root.__DASH_STATE__ || {});
  ns.executionsData = ns.executionsData || [];        // cache de execuções normalizadas
  ns.filteredExecutions = ns.filteredExecutions || []; // base para cards/tabela/pizza
  ns.statusChart = ns.statusChart || null;            // instância do pie
  ns.historyChart = ns.historyChart || null;          // instância do histórico
  ns.currentPage = ns.currentPage || 1;
  ns.itemsPerPage = ns.itemsPerPage || 10;
  ns.historyPeriod = ns.historyPeriod || '24h';
  ns.autoRefreshSeconds = ns.autoRefreshSeconds || 30;
  ns.autoRefreshTimer = ns.autoRefreshTimer || null;

  // ===========================
  // Utils
  // ===========================
  const dfBR = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  function formatDateTime(s) {
    const d = new Date(s);
    return dfBR.format(d).replace(/\s(\d{2}):/, ' $1:');
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
  function mostrarStatusNoBotao(statusText, variant=null) {
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
    return arr.map((r, idx) => {
      const ts = r.timestamp;
      const valid = Number.isFinite(new Date(ts).getTime());
      return {
        id: r.runId || `exec-${String(idx + 1).padStart(3, "0")}`,
        date: valid ? ts : null,
        status: (r.totalFailed ?? 0) > 0 ? "failed" : "passed",
        duration: Math.round((r.totalDuration ?? 0) / 1000),
        totalTests: r.totalTests ?? ((r.totalPassed ?? 0) + (r.totalFailed ?? 0)),
        passedTests: r.totalPassed ?? 0,
        failedTests: r.totalFailed ?? 0,
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
      };
    });
  }

  // Disparo do pipeline
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
        btn.classList.remove("btn--loading","is-in-progress","is-success","is-failure");
        setButtonLabel("Executar Pipeline");
        ensureButtonStructure();
      }, 1800);
    }
  }

  // ===========================
  // Cards/Estatísticas
  // ===========================
  function updateStatistics() {
    const totalPassed = ns.filteredExecutions.reduce((s, e) => s + (e.passedTests || 0), 0);
    const totalFailed = ns.filteredExecutions.reduce((s, e) => s + (e.failedTests || 0), 0);
    const totalTests = totalPassed + totalFailed;
    const avgDuration = ns.filteredExecutions.length
      ? Math.round(ns.filteredExecutions.reduce((s, e) => s + (e.duration || 0), 0) / ns.filteredExecutions.length)
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
    const start = (ns.currentPage - 1) * ns.itemsPerPage;
    const page = ns.filteredExecutions.slice(start, start + ns.itemsPerPage);
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
    const totalPages = Math.ceil(ns.filteredExecutions.length / ns.itemsPerPage);
    const el = document.getElementById("pagination");
    if (!el) return;
    el.innerHTML = "";
    if (totalPages <= 1) return;

    const prev = document.createElement("button");
    prev.textContent = "← Anterior";
    prev.disabled = ns.currentPage === 1;
    prev.onclick = () => changePage(ns.currentPage - 1);
    el.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= ns.currentPage - 1 && i <= ns.currentPage + 1)) {
        const b = document.createElement("button");
        b.textContent = i;
        b.className = i === ns.currentPage ? "active" : "";
        b.onclick = () => changePage(i);
        el.appendChild(b);
      } else if (i === ns.currentPage - 2 || i === ns.currentPage + 2) {
        const dots = document.createElement("span");
        dots.textContent = "...";
        dots.style.padding = "0 8px";
        el.appendChild(dots);
      }
    }

    const next = document.createElement("button");
    next.textContent = "Próxima →";
    next.disabled = ns.currentPage === totalPages;
    next.onclick = () => changePage(ns.currentPage + 1);
    el.appendChild(next);
  }

  function changePage(p) {
    const totalPages = Math.ceil(ns.filteredExecutions.length / ns.itemsPerPage);
    if (p >= 1 && p <= totalPages) {
      ns.currentPage = p;
      populateExecutionTable();
    }
  }

  // ===========================
  // Gráficos
  // ===========================
  function initializeStatusChart() {
    const ctx = document.getElementById("statusChart")?.getContext("2d");
    if (!ctx) return;
    const totalPassed = ns.filteredExecutions.reduce((s, e) => s + (e.passedTests || 0), 0);
    const totalFailed = ns.filteredExecutions.reduce((s, e) => s + (e.failedTests || 0), 0);

    if (ns.statusChart) ns.statusChart.destroy();
    ns.statusChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Aprovados", "Falhados"],
        datasets: [{
          data: [totalPassed, totalFailed],
          backgroundColor: ["#16a34a", "#dc2626"],
          borderColor: ["#16a34a", "#dc2626"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  function initializeHistoryChartFromRuns(runs) {
    const ctx = document.getElementById('historyChart')?.getContext('2d');
    if (!ctx) return;
    if (ns.historyChart) ns.historyChart.destroy();

    // 1) Sanitizar, validar e ordenar
    const runsOk = (runs || [])
      .filter(r => Number.isFinite(new Date(r?.date).getTime()))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 2) Consolidar por hora (recomendado para 7d/30d)
    const byTs = new Map();
    for (const r of runsOk) {
      const d = new Date(r.date);
      if (!Number.isFinite(d.getTime())) continue;
      d.setMinutes(0, 0, 0); // truncar para o início da hora
      const ts = d.getTime();

      const cur = byTs.get(ts) || { x: new Date(ts), passed: 0, failed: 0 };
      cur.passed += Number(r.passedTests || 0);
      cur.failed += Number(r.failedTests || 0);
      byTs.set(ts, cur);
    }
    const points = Array.from(byTs.values()).sort((a, b) => a.x - b.x);

    // 3) Datasets
    const ptsExecutados = points.map(p => ({ x: p.x, y: p.passed + p.failed }));
    const ptsFalhados   = points.map(p => ({ x: p.x, y: p.failed }));

    // 4) Eixo X do primeiro ao último ponto (sem margens)
    const xMin = points.length ? points[0].x : undefined;
    const xMax = points.length ? points[points.length - 1].x : undefined;

    // 5) Y sugerido
    const suggestedMax = Math.max(5, ...ptsExecutados.map(p => p.y)) + 1;

    // 6) Formatadores
    const dfBRtzTooltip = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo', hour12: false
    });
    const dfBRtzAxis = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo'
    });

    ns.historyChart = new Chart(ctx, {
      type: 'line',
      data: { datasets: [
        {
          label: 'Executados',
          data: ptsExecutados,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.15)',
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.25,
          fill: true
        },
        {
          label: 'Falhados',
          data: ptsFalhados,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.10)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.25,
          fill: false
        }
      ]},
      options: {
        spanGaps: 12 * 60 * 60 * 1000,
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        normalized: true,
        interaction: { mode: 'nearest', intersect: false },
        scales: {
          x: {
            type: 'time',
            min: xMin,
            max: xMax,
            offset: false,
            time: { tooltipFormat: 'dd/MM/yyyy HH:mm' },
            ticks: {
              autoSkip: true,
              maxRotation: 0,
              callback(v) { return dfBRtzAxis.format(new Date(v)); }
            }
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
                const f = items[0];
                const t = f && (f.parsed?.x ?? f.raw?.x);
                return t ? dfBRtzTooltip.format(new Date(t)) : '';
              },
              label(ctx) {
                const v = ctx.parsed?.y ?? ctx.raw?.y ?? 0;
                return `${ctx.dataset?.label || 'Valor'}: ${v}`;
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
    const e = ns.executionsData.find(x => x.id === id);
    if (!e) return;
    const set = (id, val, prop='textContent') => {
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

  function setupEventListeners() {
    const el = id => document.getElementById(id);

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
    const status = document.getElementById("statusFilter")?.value || "";
    const date = document.getElementById("dateFilter")?.value || "";

    ns.filteredExecutions = ns.executionsData.filter(e => {
      if (status && e.status !== status) return false;
      if (date && !String(e.date).startsWith(date)) return false;
      return true;
    });

    ns.currentPage = 1;
    updateStatistics();
    initializeStatusChart();
    populateExecutionTable();
  }

  // ===========================
  // Histórico - filtro de período
  // ===========================
  function filterRunsByPeriod(runs, period = ns.historyPeriod) {
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
    if (!newPeriod || newPeriod === ns.historyPeriod) return;
    ns.historyPeriod = newPeriod;
    document.querySelectorAll('[data-history-period]').forEach(b => b.classList.remove('period-btn--active'));
    this.classList.add('period-btn--active');
    const source = ns.executionsData?.length ? ns.executionsData : (window.__allRuns || []);
    const filtered = filterRunsByPeriod(source, ns.historyPeriod);
    initializeHistoryChartFromRuns(filtered);
  }

  // Auto-refresh
  function updateAutoRefreshLabel() {
    const label = document.querySelector('.auto-refresh span');
    if (label) label.textContent = `Auto-refresh: ${ns.autoRefreshSeconds}s`;
  }

  function startAutoRefreshCountdown() {
    if (ns.autoRefreshTimer) clearInterval(ns.autoRefreshTimer);

    ns.autoRefreshSeconds = 30;
    updateAutoRefreshLabel();

    ns.autoRefreshTimer = setInterval(async () => {
      ns.autoRefreshSeconds -= 1;
      updateAutoRefreshLabel();

      if (ns.autoRefreshSeconds <= 0) {
        clearInterval(ns.autoRefreshTimer);
        ns.autoRefreshTimer = null;
        try {
          await loadRuns();
        } finally {
          startAutoRefreshCountdown();
        }
      }
    }, 1000);
  }

  // ===========================
  // Bootstrap
  // ===========================
  document.addEventListener("DOMContentLoaded", () => {
    setupPeriodButtons();
    setupEventListeners();
    ensureButtonStructure();

    loadRuns()
      .catch(console.error)
      .finally(() => { startAutoRefreshCountdown(); });

    const btn = document.getElementById("runPipelineBtn");
    btn?.addEventListener("click", executarPipeline);

    if (ns.autoRefreshTimer) {
      ns.autoRefreshSeconds = 30;
      updateAutoRefreshLabel();
    }
  });

  // ===========================
  // Orquestração de carregamento
  // ===========================
  async function loadRuns() {
  try {
    const runs = await fetchRuns();

    // 1) Deduplicar por id e usar somente 'uniq'
    const uniqMap = new Map();
    for (const r of runs || []) uniqMap.set(r.id, r);
    const uniq = Array.from(uniqMap.values());

    // 1.1) NORMALIZAR DATAS (garantir milissegundos e valor válido)
    for (const r of uniq) {
      // se vier em segundos (epoch < 1e12), converte p/ ms
      if (typeof r.date === 'number' && r.date < 1e12) r.date = r.date * 1000;
      // se vier string, tenta parse e normaliza p/ número ms
      const t = (typeof r.date === 'number') ? r.date : new Date(r.date).getTime();
      r.date = Number.isFinite(t) ? t : null;
    } // A escala time do Chart.js exige datas parseáveis e consistentes. [3][4]

    // disponibiliza para inspeção no console
    window.__allRuns = uniq;

    // 2) Base para cards/tabela/pizza
    ns.executionsData = uniq.slice();
    ns.filteredExecutions = ns.executionsData.slice();
    updateStatistics();
    initializeStatusChart();
    populateExecutionTable();

    // 3) Histórico por período
    console.log('loadRuns: total execs=', ns.executionsData.length, 'period=', ns.historyPeriod);
    const filtered = filterRunsByPeriod(ns.executionsData, ns.historyPeriod);
    console.log('history filtered len=', filtered.length);
    initializeHistoryChartFromRuns(filtered); // pontos no formato {x: Date, y: number} com parsing:false. [3][4]
  } catch (err) {
    console.error('Falha ao carregar execuções:', err);
  }
}

// Exponha utilitários se necessário
root.__DASH_API__ = { loadRuns }; // permite chamar window.__DASH_API__.loadRuns() após o carregamento. [5]
})(window);

