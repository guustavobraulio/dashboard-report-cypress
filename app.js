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
  ns.executionsData = ns.executionsData || [];
  ns.filteredExecutions = ns.filteredExecutions || [];
  ns.statusChart = ns.statusChart || null;
  ns.historyChart = ns.historyChart || null;
  ns.currentPage = ns.currentPage || 1;
  ns.itemsPerPage = ns.itemsPerPage || 10;
  ns.historyPeriod = ns.historyPeriod || '7d';
  ns.autoRefreshSeconds = ns.autoRefreshSeconds || 30;
  ns.autoRefreshTimer = ns.autoRefreshTimer || null;
  ns.countdownTimer = ns.countdownTimer || null; // ✅ NOVO
  ns.remainingSeconds = ns.remainingSeconds || 30; // ✅ NOVO

  // ===========================
  // Utils
  // ===========================
  const dfBR = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  function updateStatistics() {
    console.log('📊 Atualizando estatísticas...');

    // 1. Calcula as métricas do período atual a partir dos dados filtrados
    const currentRuns = ns.filteredExecutions || [];
    console.log('📈 Runs para calcular:', currentRuns.length);

    const totalPassed = currentRuns.reduce((sum, run) => sum + (run.passedTests || 0), 0);
    const totalFailed = currentRuns.reduce((sum, run) => sum + (run.failedTests || 0), 0);
    const totalTests = totalPassed + totalFailed;
    const avgDuration = currentRuns.length > 0 ? Math.round(currentRuns.reduce((sum, run) => sum + (run.duration || 0), 0) / currentRuns.length) : 0;
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    console.log('📊 Métricas calculadas:', { totalPassed, totalFailed, avgDuration, successRate });

    const currentData = {
      totalPassed,
      totalFailed,
      avgDuration,
      successRate
    };

    // 2. Atualiza os valores nos cards do HTML
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = val;
        console.log(`✅ Atualizado ${id} = ${val}`);
      } else {
        console.log(`❌ Elemento ${id} não encontrado`);
      }
    };

    set('totalPassed', totalPassed);
    set('totalFailed', totalFailed);
    set('avgDuration', `${avgDuration}s`);
    set('successRate', `${successRate}%`);

    // 3. Calcula e exibe as tendências (só se existir dados)
    if (currentRuns.length > 0) {
      try {
        const previousData = getPreviousPeriodData(ns.historyPeriod);
        const trends = calculateTrends(currentData, previousData);
        updateTrendBadges(trends);
        console.log('📈 Trends atualizados:', trends);
      } catch (e) {
        console.log('⚠️ Erro ao calcular trends:', e.message);
        // Remover badges de erro
        document.querySelectorAll('.trend-indicator').forEach(el => {
          el.textContent = '';
          el.style.display = 'none';
        });
      }
    } else {
      console.log('📭 Nenhum dado para exibir trends');
      // Esconder badges quando não há dados
      document.querySelectorAll('.trend-indicator').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
      });
    }
  }

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
        btn.classList.remove("btn--loading", "is-in-progress", "is-success", "is-failure");
        setButtonLabel("Executar Pipeline");
        ensureButtonStructure();
      }, 1800);
    }
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
        <td>${e.id}</td>
        <td>${formatDateTime(e.date)}</td>
        <td>${e.branch}</td>
        <td>${e.environment}</td>
        <td>
          <span class="status status--${e.status === 'passed' ? 'success' : 'error'}">
            ${e.status === 'passed' ? 'APROVADO' : 'FALHADO'}
          </span>
        </td>
        <td>${e.totalTests}/${e.totalTests}</td>
        <td>${e.duration}s</td>
        <td>
          <button class="action-btn action-btn--view" data-execution-id="${e.id}">
            <i class="fas fa-eye"></i> Ver
          </button>
          <a href="${e.githubUrl}" target="_blank" class="github-icon" title="Ver no GitHub">
            <i class="fab fa-github"></i>
          </a>
        </td>
      </tr>
    `).join('');
    
    // ✅ USAR APENAS UMA ABORDAGEM - Event Listeners (mais segura)
    document.querySelectorAll(".action-btn--view").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const executionId = btn.getAttribute("data-execution-id");
        console.log('📋 Abrindo modal para:', executionId);
        openExecutionDetails(executionId);
      });
    });

    // Configurar eventos do modal após criar os botões
    setTimeout(() => {
      setupModalEventListeners();
    }, 100);

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
  // Estatísticas e Cards
  // ===========================
  function updateStatistics() {
    // 1. Calcula as métricas do período atual a partir dos dados filtrados
    const currentRuns = ns.filteredExecutions || [];
    const totalPassed = currentRuns.reduce((sum, run) => sum + (run.passedTests || 0), 0);
    const totalFailed = currentRuns.reduce((sum, run) => sum + (run.failedTests || 0), 0);
    const totalTests = totalPassed + totalFailed;
    const avgDuration = currentRuns.length > 0 ? Math.round(currentRuns.reduce((sum, run) => sum + (run.duration || 0), 0) / currentRuns.length) : 0;
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    const currentData = {
      totalPassed,
      totalFailed,
      avgDuration,
      successRate
    };

    // 2. Atualiza os valores nos cards do HTML
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('totalPassed', totalPassed);
    set('totalFailed', totalFailed);
    set('avgDuration', `${avgDuration}s`);
    set('successRate', `${successRate}%`);

    // 3. Calcula e exibe as tendências comparando com o período anterior
    const previousData = getPreviousPeriodData(ns.historyPeriod);
    const trends = calculateTrends(currentData, previousData);
    updateTrendBadges(trends);
  }

  // ===========================
  // Gráficos Funcionais
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
          borderColor: ["#16a34a", "#dc2626"],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  function initializeHistoryChart() {
    const ctx = document.getElementById('historyChart')?.getContext('2d');
    if (!ctx) return;

    if (ns.historyChart) ns.historyChart.destroy();

    // Agrupar dados por data/hora
    const groupedData = groupExecutionsByHour(ns.filteredExecutions);

    const labels = groupedData.map(d => formatDateTime(d.date));
    const passedData = groupedData.map(d => d.passed);
    const failedData = groupedData.map(d => d.failed);

    ns.historyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Aprovados',
            data: passedData,
            backgroundColor: '#16a34a',
            borderColor: '#16a34a',
            borderWidth: 0,
            stack: 'stack1'
          },
          {
            label: 'Falhados',
            data: failedData,
            backgroundColor: '#dc2626',
            borderColor: '#dc2626',
            borderWidth: 0,
            stack: 'stack1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Data e Hora'
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Número de Testes'
            }
          }
        }
      }
    });
  }

  function groupExecutionsByHour(executions) {
    const groups = new Map();

    for (const exec of executions) {
      if (!exec.date) continue;

      const date = new Date(exec.date);
      const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;

      if (!groups.has(hourKey)) {
        groups.set(hourKey, {
          date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()),
          passed: 0,
          failed: 0
        });
      }

      const group = groups.get(hourKey);
      group.passed += exec.passedTests || 0;
      group.failed += exec.failedTests || 0;
    }

    return Array.from(groups.values()).sort((a, b) => a.date - b.date);
  }



  // ===========================
  // Modal
  // ===========================
  function openExecutionModal(id) {
    const e = ns.executionsData.find(x => x.id === id);
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

    // ✅ NOVA IMPLEMENTAÇÃO DOS ARTEFATOS
    const artifactsWrap = document.getElementById("modalArtifacts");
    if (artifactsWrap) {
      artifactsWrap.innerHTML = renderArtifacts(e.artifacts);
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
  // Filtros de Período
  // ===========================
  function filterRunsByPeriod(runs, period = '24h') {
    const now = Date.now();
    let windowMs = 24 * 60 * 60 * 1000; // 24h padrão

    if (period === '7d') windowMs = 7 * 24 * 60 * 60 * 1000;
    if (period === '30d') windowMs = 30 * 24 * 60 * 60 * 1000;

    const start = now - windowMs;

    return runs.filter(r => {
      const runTime = typeof r.date === 'number' ? r.date : new Date(r.date).getTime();
      return Number.isFinite(runTime) && runTime >= start && runTime <= now;
    });
  }

  function setupPeriodButtons() {
    console.log('🔘 Configurando botões de período...');

    const buttons = document.querySelectorAll('[data-history-period]');
    console.log('📊 Botões encontrados:', buttons.length);

    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();

        const newPeriod = button.getAttribute('data-history-period');
        console.log('🔄 Mudando para período:', newPeriod);

        // Atualizar período ativo no namespace
        ns.historyPeriod = newPeriod;

        // Atualizar visual dos botões (remover active de todos)
        buttons.forEach(btn => btn.classList.remove('period-btn--active'));
        // Adicionar active apenas no clicado
        button.classList.add('period-btn--active');

        // 🎯 RECARREGAR DADOS COM NOVO FILTRO
        refreshDataWithPeriod(newPeriod);
      });
    });

    setTimeout(() => {
      const defaultBtn = document.querySelector('[data-history-period="7d"]'); // ✅ MUDANÇA
      if (defaultBtn && !defaultBtn.classList.contains('period-btn--active')) {
        buttons.forEach(btn => btn.classList.remove('period-btn--active'));
        defaultBtn.classList.add('period-btn--active');
        console.log('✅ Botão 7d ativado por padrão');
      }
    }, 100);
  }

  function refreshDataWithPeriod(period) {
    console.log('🔄 Atualizando dados para período:', period);

    if (!ns.executionsData || ns.executionsData.length === 0) {
      console.log('⚠️ Nenhum dado base disponível, pulando atualização');
      return;
    }

    // Filtrar dados pelo período
    const filtered = filterRunsByPeriod(ns.executionsData, period);
    console.log(`📊 Período ${period}: ${filtered.length}/${ns.executionsData.length} execuções`);

    // Atualizar dados filtrados
    ns.filteredExecutions = filtered.slice();

    // Resetar página para primeira
    ns.currentPage = 1;

    // Atualizar toda a interface (incluindo gráficos)
    updateStatistics();
    initializeStatusChart();
    initializeHistoryChart(); // ✅ IMPORTANTE: incluir gráfico de histórico
    populateExecutionTable();
  }

  // ===========================
  // Função de Inicialização Interna
  // ===========================
  function initializeApp() {
    console.log('⚙️ Inicializando componentes internos...');

    // Configurar botões de período
    setupPeriodButtons();
    setupHeaderEventListeners();
    // Iniciar auto-refresh
    startAutoRefresh();

    // Outras inicializações podem ir aqui
    console.log('✅ Componentes inicializados');
  }

  function onHistoryPeriodClick(e) {
    e.preventDefault();
    const newPeriod = this.getAttribute('data-history-period');
    if (!newPeriod || newPeriod === ns.historyPeriod) return;

    // Atualizar período ativo
    ns.historyPeriod = newPeriod;
    document.querySelectorAll('[data-history-period]').forEach(b => b.classList.remove('period-btn--active'));
    this.classList.add('period-btn--active');

    // 🎯 SINCRONIZAÇÃO COMPLETA: Atualizar TUDO baseado no novo período
    const source = ns.executionsData?.length ? ns.executionsData : (window.__allRuns || []);
    const filtered = filterRunsByPeriod(source, ns.historyPeriod);
    ns.filteredExecutions = filtered.slice();
    updateStatistics();
    initializeStatusChart();
    populateExecutionTable();
    initializeHistoryChartFromRuns(filtered);

    console.log(`Período alterado para ${newPeriod}: ${filtered.length} execuções`);
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
  // Orquestração de carregamento (ATUALIZADA)
  // ===========================
  async function loadRuns() {
    try {
      console.log('🚀 Iniciando loadRuns...');
      const runs = await fetchRuns();

      // 1) Deduplicar por id e usar somente 'uniq'
      const uniqMap = new Map();
      for (const r of runs || []) uniqMap.set(r.id, r);
      const uniq = Array.from(uniqMap.values());

      // 1.1) NORMALIZAR DATAS (garantir milissegundos e valor válido)
      for (const r of uniq) {
        if (typeof r.date === 'number' && r.date < 1e12) r.date = r.date * 1000;
        const t = (typeof r.date === 'number') ? r.date : new Date(r.date).getTime();
        r.date = Number.isFinite(t) ? t : null;
      }

      // disponibiliza para inspeção no console
      window.__allRuns = uniq;

      // 2) Armazenar dados base (TODOS os dados)
      ns.executionsData = uniq.slice();

      // 3) Aplicar filtro de período atual (padrão 7d agora)
      const filtered = filterRunsByPeriod(ns.executionsData, ns.historyPeriod);
      ns.filteredExecutions = filtered.slice();

      console.log(`📊 Total: ${ns.executionsData.length}, Filtrado (${ns.historyPeriod}): ${ns.filteredExecutions.length}`);

      // 4) ✅ ATUALIZAR INTERFACE COMPLETA (incluindo gráfico)
      updateStatistics();
      initializeStatusChart();
      initializeHistoryChart(); // ✅ ADICIONAR ESTA LINHA
      populateExecutionTable();

      // 5) Inicializar componentes após carregar dados
      initializeApp();

    } catch (err) {
      console.error('❌ Falha ao carregar execuções:', err);
    }
  }

  // ===========================
  // Sistema de Tendências
  // ===========================
  // Sua função calculateTrends (mantida igual)
  function calculateTrends(currentData, previousData) {
    const trends = {};

    for (const key in currentData) {
      const current = currentData[key] || 0;
      const previous = previousData[key] || 0;

      // ✅ CORREÇÃO: Baseline mais baixa e mais permissiva
      if (previous === 0) {
        // ✅ Usar valor mínimo de 1 para evitar divisão por zero
        const assumedPrevious = 1;
        const diff = current - assumedPrevious;
        const percent = Math.round((diff / assumedPrevious) * 100);

        // ✅ Limitar percentuais para valores razoáveis
        const cappedPercent = Math.min(Math.max(percent, -100), 300);

        trends[key] = {
          value: current,
          change: diff,
          percent: cappedPercent,
          trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
        };
      } else {
        // Cálculo normal quando há dados anteriores válidos
        const diff = current - previous;
        const percent = Math.round((diff / previous) * 100);

        // ✅ Limitar percentuais para valores razoáveis
        const cappedPercent = Math.min(Math.max(percent, -100), 300);

        trends[key] = {
          value: current,
          change: diff,
          percent: cappedPercent,
          trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
        };
      }
    }

    return trends;
  }

  // ✨ NOVA FUNÇÃO: Para atualizar os badges no HTML
  function updateTrendBadges(trends) {
    // Atualizar badge dos Testes Aprovados
    if (trends.totalPassed) {
      const passedElement = document.querySelector('#totalPassed');
      const passedBadge = passedElement.parentElement.querySelector('.trend-indicator');

      if (passedBadge) {
        const trend = trends.totalPassed;
        if (trend.trend === 'up') {
          passedBadge.textContent = `📈 +${trend.percent}%`;
          passedBadge.className = 'trend-indicator trend-up';
        } else if (trend.trend === 'down') {
          passedBadge.textContent = `📉 ${trend.percent}%`;
          passedBadge.className = 'trend-indicator trend-down';
        } else {
          passedBadge.textContent = `➡️ ${trend.percent}%`;
          passedBadge.className = 'trend-indicator trend-neutral';
        }
      }
    }

    // Atualizar badge dos Testes Falhados
    if (trends.totalFailed) {
      const failedElement = document.querySelector('#totalFailed');
      const failedBadge = failedElement.parentElement.querySelector('.trend-indicator');

      if (failedBadge) {
        const trend = trends.totalFailed;
        if (trend.trend === 'up') {
          failedBadge.textContent = `📈 +${trend.percent}%`;
          failedBadge.className = 'trend-indicator trend-up';
        } else if (trend.trend === 'down') {
          failedBadge.textContent = `📉 ${trend.percent}%`;
          failedBadge.className = 'trend-indicator trend-down';
        } else {
          failedBadge.textContent = `➡️ ${trend.percent}%`;
          failedBadge.className = 'trend-indicator trend-neutral';
        }
      }
    }

    // Atualizar badge da Duração Média
    if (trends.avgDuration) {
      const durationElement = document.querySelector('#avgDuration');
      const durationBadge = durationElement.parentElement.querySelector('.trend-indicator');

      if (durationBadge) {
        const trend = trends.avgDuration;
        if (trend.trend === 'up') {
          durationBadge.textContent = `📈 +${trend.percent}%`;
          durationBadge.className = 'trend-indicator trend-up';
        } else if (trend.trend === 'down') {
          durationBadge.textContent = `📉 ${trend.percent}%`;
          durationBadge.className = 'trend-indicator trend-down';
        } else {
          durationBadge.textContent = `➡️ ${trend.percent}%`;
          durationBadge.className = 'trend-indicator trend-neutral';
        }
      }
    }

    // Atualizar badge da Taxa de Sucesso
    if (trends.successRate) {
      const rateElement = document.querySelector('#successRate');
      const rateBadge = rateElement.parentElement.querySelector('.trend-indicator');

      if (rateBadge) {
        const trend = trends.successRate;
        if (trend.trend === 'up') {
          rateBadge.textContent = `📈 +${trend.percent}%`;
          rateBadge.className = 'trend-indicator trend-up';
        } else if (trend.trend === 'down') {
          rateBadge.textContent = `📉 ${trend.percent}%`;
          rateBadge.className = 'trend-indicator trend-down';
        } else {
          rateBadge.textContent = `➡️ ${trend.percent}%`;
          rateBadge.className = 'trend-indicator trend-neutral';
        }
      }
    }
  }

  function getPreviousPeriodData(currentPeriod) {
    const now = Date.now();
    let previousWindow;

    switch (currentPeriod) {
      case '24h':
        previousWindow = { start: now - (48 * 60 * 60 * 1000), end: now - (24 * 60 * 60 * 1000) };
        break;
      case '7d':
        previousWindow = { start: now - (14 * 24 * 60 * 60 * 1000), end: now - (7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        previousWindow = { start: now - (60 * 24 * 60 * 60 * 1000), end: now - (30 * 24 * 60 * 60 * 1000) };
        break;
      default:
        return { totalPassed: 0, totalFailed: 0, avgDuration: 0, successRate: 0 };
    }

    console.log('Janela anterior:', new Date(previousWindow.start), 'até', new Date(previousWindow.end));

    const previousRuns = ns.executionsData.filter(r => {
      const runTime = new Date(r.date).getTime();
      return runTime >= previousWindow.start && runTime <= previousWindow.end;
    });

    console.log('Execuções no período anterior:', previousRuns.length);

    if (previousRuns.length === 0) {
      return { totalPassed: 0, totalFailed: 0, avgDuration: 0, successRate: 0 };
    }

    const totalPassed = previousRuns.reduce((s, e) => s + (e.passedTests || 0), 0);
    const totalFailed = previousRuns.reduce((s, e) => s + (e.failedTests || 0), 0);
    const totalTests = totalPassed + totalFailed;
    const avgDuration = Math.round(previousRuns.reduce((s, e) => s + (e.duration || 0), 0) / previousRuns.length);
    const successRate = totalTests ? Math.round((totalPassed / totalTests) * 100) : 0;

    return {
      totalPassed: totalPassed,
      totalFailed: totalFailed,
      avgDuration: avgDuration,
      successRate: successRate
    };
  }


  // ===========================
  // Renderização de Artefatos
  // ===========================
  function renderArtifacts(artifacts) {
    if (!artifacts || artifacts.length === 0) {
      return `
        <div class="no-artifacts">
          <i class="fas fa-images"></i>
          <p>Nenhum artefato disponível para esta execução</p>
          <small>Screenshots e vídeos aparecerão aqui quando disponíveis</small>
        </div>
      `;
    }

    return artifacts.map(a => {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(a.url || '');
      const isVideo = /\.(mp4|webm|mov)$/i.test(a.url || '');

      if (isImage) {
        return `
          <div class="artifact-item">
            <div class="artifact-preview">
              <img src="${a.url}" alt="${a.name || 'Screenshot'}" class="artifact-thumb" onclick="openImageModal('${a.url}', '${a.name || 'Screenshot'}')">
            </div>
            <div class="artifact-info">
              <h5>${a.name || 'Screenshot do Teste'}</h5>
              <span class="artifact-type">Imagem • ${getFileSize(a.size)}</span>
              <div style="margin-top: 0.5rem;">
                <button class="btn btn--sm btn--outline" onclick="openImageModal('${a.url}', '${a.name || 'Screenshot'}')">
                  <i class="fas fa-eye"></i> Visualizar
                </button>
                <a href="${a.url}" target="_blank" class="btn btn--sm btn--outline" style="margin-left: 0.5rem;">
                  <i class="fas fa-download"></i> Download
                </a>
              </div>
            </div>
          </div>
        `;
      } else if (isVideo) {
        return `
          <div class="artifact-item">
            <div class="artifact-preview">
              <video controls class="artifact-video">
                <source src="${a.url}" type="video/mp4">
                Seu browser não suporta reprodução de vídeo.
              </video>
            </div>
            <div class="artifact-info">
              <h5>${a.name || 'Gravação do Teste'}</h5>
              <span class="artifact-type">Vídeo • ${getFileSize(a.size)}</span>
              <div style="margin-top: 0.5rem;">
                <a href="${a.url}" target="_blank" class="btn btn--sm btn--outline">
                  <i class="fas fa-download"></i> Download
                </a>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="artifact-item">
            <div class="artifact-preview">
              <i class="fas fa-file-alt" style="font-size: 3rem; color: #6b7280;"></i>
            </div>
            <div class="artifact-info">
              <h5>${a.name || 'Arquivo'}</h5>
              <span class="artifact-type">Documento • ${getFileSize(a.size)}</span>
              <div style="margin-top: 0.5rem;">
                <a href="${a.url}" target="_blank" class="btn btn--sm btn--outline">
                  <i class="fas fa-external-link-alt"></i> Abrir
                </a>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  function getFileSize(bytes) {
    if (!bytes) return 'Tamanho desconhecido';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  function openImageModal(url, name) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
      <div class="image-modal-content">
        <span class="image-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
        <img src="${url}" alt="${name}" class="image-modal-img">
        <div class="image-modal-caption">${name}</div>
      </div>
    `;

    // Fechar modal ao clicar no fundo
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }

  function startAutoRefresh() {
    console.log('🔄 Iniciando auto-refresh...');
    
    if (ns.autoRefreshTimer) {
      clearInterval(ns.autoRefreshTimer);
    }
    
    if (ns.countdownTimer) {
      clearInterval(ns.countdownTimer);
    }

    // Inicializar contador
    ns.remainingSeconds = ns.autoRefreshSeconds;

    // Timer para o countdown (atualiza a cada segundo)
    ns.countdownTimer = setInterval(() => {
      ns.remainingSeconds--;
      updateAutoRefreshDisplay();

      // Quando chegar a zero, executar refresh
      if (ns.remainingSeconds <= 0) {
        executeRefresh();
        ns.remainingSeconds = ns.autoRefreshSeconds; // Reset
      }
    }, 1000);

    // Atualizar display inicial
    updateAutoRefreshDisplay();
  }

  async function executeRefresh() {
    console.log('🔄 Auto-refresh executado');
    try {
      await loadRuns();
      console.log('✅ Dados atualizados via auto-refresh');
    } catch (error) {
      console.error('❌ Erro no auto-refresh:', error);
    }
  }

  function updateAutoRefreshDisplay() {
    const refreshEl = document.querySelector('.auto-refresh span');
    if (refreshEl) {
      refreshEl.textContent = `Auto-refresh: ${ns.remainingSeconds || ns.autoRefreshSeconds}s`;
    }
  }

  function stopAutoRefresh() {
    if (ns.autoRefreshTimer) {
      clearInterval(ns.autoRefreshTimer);
      ns.autoRefreshTimer = null;
    }
    if (ns.countdownTimer) {
      clearInterval(ns.countdownTimer);
      ns.countdownTimer = null;
    }
  }

  // Executar Pipeline
  async function executarPipeline() {
    console.log('🚀 Executando pipeline...');

    const btn = document.getElementById("runPipelineBtn") || document.querySelector('.header-btn[onclick*="Pipeline"]');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executando...';

    try {
      // Simular execução do pipeline
      await new Promise(resolve => setTimeout(resolve, 3000));

      btn.innerHTML = '<i class="fas fa-check"></i> Concluído!';
      btn.style.backgroundColor = '#16a34a';

      // Recarregar dados após pipeline
      setTimeout(async () => {
        await loadRuns();
        resetPipelineButton(btn);
      }, 2000);

    } catch (error) {
      console.error('❌ Erro no pipeline:', error);
      btn.innerHTML = '<i class="fas fa-times"></i> Erro';
      btn.style.backgroundColor = '#dc2626';

      setTimeout(() => resetPipelineButton(btn), 3000);
    }
  }

  function resetPipelineButton(btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play"></i> Executar Pipeline';
    btn.style.backgroundColor = '';
  }



  function setupHeaderEventListeners() {
    console.log('⚙️ Configurando eventos do header...');

    // Botão Métricas
    const metricsBtn = document.querySelector('.header-btn[onclick*="Métricas"], .header-btn[data-action="metrics"]');
    if (metricsBtn) {
      metricsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openMetricsModal();
      });
    }

    // Botão Executar Pipeline
    const pipelineBtn = document.querySelector('.header-btn[onclick*="Pipeline"], .header-btn[data-action="pipeline"], #runPipelineBtn');
    if (pipelineBtn) {
      pipelineBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executarPipeline();
      });
    }

    console.log('✅ Eventos do header configurados');
  }

  // ===========================
  // Sistema de Tabs
  // ===========================
  function switchTab(tabName) {
    console.log('🔄 Mudando para tab:', tabName);

    // Remover classe ativa de todos os botões
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('tab-button--active');
    });

    // Esconder todos os painéis
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('tab-panel--active');
    });

    // Ativar botão clicado
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
      activeButton.classList.add('tab-button--active');
    }

    // Mostrar painel correspondente
    const activePanel = document.getElementById(`${tabName}Panel`);
    if (activePanel) {
      activePanel.classList.add('tab-panel--active');
    }
  }

  function setupModalEventListeners() {
    console.log('⚙️ Configurando eventos do modal...');

    // Botão de fechar (X)
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    // Fechar ao clicar no backdrop
    const backdrop = document.querySelector('#executionModal .modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeModal);
    }

    // Configurar tabs
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = button.getAttribute('data-tab');
        if (tabName) {
          switchTab(tabName);
        }
      });
    });

    console.log('✅ Eventos do modal configurados');
  }

  // Exponha utilitários se necessário
  root.__DASH_API__ = { loadRuns };
})(window);

// ===========================
// Modal Functions
// ===========================
function openMetricsPage() {
  console.log('🚀 Abrindo página de métricas...');
  const modal = document.getElementById('metricsModal');
  if (modal) {
    modal.classList.remove('hidden');
    loadDetailedMetrics();
  } else {
    console.error('Modal de métricas não encontrado!');
  }
}

function closeMetricsPage() {
  const modal = document.getElementById('metricsModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ===========================
// PageSpeed API Functions
// ===========================
async function loadDetailedMetrics() {
  console.log('🔄 Carregando métricas detalhadas...');

  const results = [];

  // Usar STORES_CONFIG em vez de PAGESPEED_CONFIG
  for (const store of STORES_CONFIG) {
    console.log(`📊 Buscando métricas para: ${store.name}`);
    const metrics = await fetchDetailedPageSpeed(store.url);
    results.push({
      name: store.name,
      url: store.url,
      ...metrics
    });
  }

  // Atualizar tabela e cards
  updateMetricsTable(results);
  updateSummaryCards(results);
}

// ✅ NOVA FUNÇÃO SEGURA (chama page-speed.js)
async function fetchDetailedPageSpeed(url) {
  try {
    console.log(`📡 Chamando Netlify Function para: ${url}`);

    const response = await fetch('/api/page-speed', {  // ← Note o hífen
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    console.log(`✅ Dados recebidos da Netlify Function:`, data);

    // Extrair métricas
    const categories = data.lighthouseResult?.categories || {};

    return {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100)
    };

  } catch (error) {
    console.error(`❌ Erro ao buscar métricas para ${url}:`, error);
    return {
      performance: '--',
      accessibility: '--',
      bestPractices: '--',
      seo: '--'
    };
  }
}

// ✅ CONFIGURAÇÃO SIMPLIFICADA (sem API Key)
// Defina as lojas a serem analisadas
const STORES_CONFIG = [
  { id: 'victor-hugo', url: 'https://www.victorhugo.com.br', name: 'Victor Hugo' },
  { id: 'shopvinho', url: 'https://www.shopvinho.com.br', name: 'ShopVinho' },
  { id: 'shopmulti', url: 'https://www.shopmulti.com.br', name: 'ShopMulti' }
];


function updateMetricsTable(results) {
  const tbody = document.getElementById('metrics-table-body');
  if (!tbody) return;

  tbody.innerHTML = results.map(store => `
    <tr>
      <td><strong>${store.name}</strong></td>
      <td><code>${store.url}</code></td>
      <td><span class="score ${getScoreClass(store.performance)}">${store.performance}</span></td>
      <td><span class="score ${getScoreClass(store.accessibility)}">${store.accessibility}</span></td>
      <td><span class="score ${getScoreClass(store.seo)}">${store.seo}</span></td>
    </tr>
  `).join('');
}

function updateSummaryCards(results) {
  const validResults = results.filter(r => parseInt(r.performance) > 0);

  if (validResults.length === 0) {
    document.getElementById('avg-performance').textContent = '--';
    document.getElementById('avg-accessibility').textContent = '--';
    document.getElementById('avg-best-practices').textContent = '--';
    document.getElementById('avg-seo').textContent = '--';
    return;
  }

  const avgPerformance = Math.round(validResults.reduce((sum, r) => sum + (parseInt(r.performance) || 0), 0) / validResults.length);
  const avgAccessibility = Math.round(validResults.reduce((sum, r) => sum + (parseInt(r.accessibility) || 0), 0) / validResults.length);
  const avgBestPractices = Math.round(validResults.reduce((sum, r) => sum + (parseInt(r.bestPractices) || 0), 0) / validResults.length);
  const avgSeo = Math.round(validResults.reduce((sum, r) => sum + (parseInt(r.seo) || 0), 0) / validResults.length);

  document.getElementById('avg-performance').textContent = avgPerformance;
  document.getElementById('avg-accessibility').textContent = avgAccessibility;
  document.getElementById('avg-best-practices').textContent = avgBestPractices;
  document.getElementById('avg-seo').textContent = avgSeo;
}

function getScoreClass(score) {
  const num = parseInt(score);
  if (num >= 90) return 'good';
  if (num >= 50) return 'average';
  return 'poor';
}

function refreshAllPageSpeed() {
  loadDetailedMetrics();
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando dashboard...');

  // Aguardar um pouco para garantir que o DOM esteja totalmente carregado
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    // Verificar se a API está disponível
    if (window.__DASH_API__ && window.__DASH_API__.loadRuns) {
      console.log('📡 Carregando dados iniciais...');
      await window.__DASH_API__.loadRuns();
      console.log('✅ Dashboard inicializado com sucesso');
    } else {
      console.error('❌ API não está disponível');
    }

  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
  }
});

// ===========================
// Funcionalidades do Header
// ===========================

// Modal de Métricas
function openMetricsModal() {
  console.log('📊 Abrindo modal de métricas...');
  // Placeholder - implemente conforme sua necessidade
  alert('Modal de Métricas será implementado aqui!');
}

// ===========================
// Função Global para Modal (FORA da IIFE)
// ===========================
function openExecutionDetails(executionId) {
  console.log('📋 Abrindo detalhes para:', executionId);
  
  // Buscar dados da execução
  const execution = window.__DASH_STATE__.filteredExecutions.find(e => e.id === executionId);
  if (!execution) {
    console.error('❌ Execução não encontrada:', executionId);
    return;
  }
  
  // Preencher dados do modal
  populateModalData(execution);
  
  // Mostrar modal
  const modal = document.getElementById('executionModal');
  if (modal) {
    modal.classList.remove('hidden');
    
    // Ativar primeira tab por padrão
    setTimeout(() => {
      const firstTab = document.querySelector('.tab-button[data-tab="overview"]');
      if (firstTab) {
        firstTab.click();
      }
    }, 50);
  }
}

function populateModalData(execution) {
  // Preencher título
  const modalTitle = document.querySelector('#executionModal .modal-header h2');
  if (modalTitle) {
    modalTitle.textContent = `Detalhes da Execução - ${execution.id}`;
  }
  
  // Preencher dados gerais
  const setModalData = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  setModalData('modalExecutionId', execution.id);
  setModalData('modalDate', formatDateTime(execution.date));
  setModalData('modalBranch', execution.branch);
  setModalData('modalEnvironment', execution.environment);
  setModalData('modalAuthor', execution.author || 'N/A');
  setModalData('modalCommit', execution.commit || 'N/A');
  setModalData('modalDuration', `${execution.duration}s`);
  setModalData('modalStatus', execution.status === 'passed' ? 'APROVADO' : 'FALHADO');
  
  // GitHub link
  const githubLink = document.getElementById('modalGithubLink');
  if (githubLink && execution.githubUrl) {
    githubLink.href = execution.githubUrl;
  }
  
  // Logs (se existirem)
  const logsContainer = document.getElementById('modalLogs');
  if (logsContainer) {
    logsContainer.textContent = execution.logs?.join('\n') || 'Nenhum log disponível';
  }
  
  console.log('✅ Dados do modal preenchidos');
}

// Função utilitária para formatação de data (FORA da IIFE)
function formatDateTime(dateInput) {
  if (!dateInput) return 'Data não disponível';
  const date = new Date(dateInput);
  return date.toLocaleString('pt-BR');
}






