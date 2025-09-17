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
  ns.updateStatistics = updateStatistics;
  window.updateStatistics = updateStatistics;
  ns.executionsData = ns.executionsData || [];
  ns.filteredExecutions = ns.filteredExecutions || [];
  ns.statusChart = ns.statusChart || null;
  ns.historyChart = ns.historyChart || null;
  ns.currentPage = ns.currentPage || 1;
  ns.itemsPerPage = ns.itemsPerPage || 10;
  ns.historyPeriod = ns.historyPeriod || '7d'; // ✅ MUDANÇA: 7d por padrão
  ns.autoRefreshSeconds = ns.autoRefreshSeconds || 30;
  ns.autoRefreshTimer = ns.autoRefreshTimer || null;
  ns.currentModalExecution = ns.currentModalExecution || null;

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

  // ===========================
  // Cards/Estatísticas (VERSÃO SIMPLES - SEM TRENDS)
  // ===========================
  function updateStatistics() {
    console.log('📊 Atualizando estatísticas...');

    const currentRuns = ns.filteredExecutions || [];
    const totalPassed = currentRuns.reduce((s, e) => s + (e.passedTests || 0), 0);
    const totalFailed = currentRuns.reduce((s, e) => s + (e.failedTests || 0), 0);
    const totalTests = totalPassed + totalFailed;
    const avgDuration = currentRuns.length > 0 ? Math.round(currentRuns.reduce((s, e) => s + (e.duration || 0), 0) / currentRuns.length) : 0;
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    const currentData = { totalPassed, totalFailed, avgDuration, successRate };

    const previousData = getPreviousPeriodData(ns.historyPeriod);

    // ✅ CALCULAR TRENDS REAIS
    const trends = calculateRealTrends(currentData, previousData);

    // ✅ ATUALIZAR COM VALORES REAIS
    updateElementWithTrend('totalPassed', totalPassed, trends.totalPassed);
    updateElementWithTrend('totalFailed', totalFailed, trends.totalFailed);
    updateElementWithTrend('avgDuration', `${avgDuration}s`, trends.avgDuration);
    updateElementWithTrend('successRate', `${successRate}%`, trends.successRate);

    console.log('📊 Trends reais aplicados:', trends);
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
          ${e.githubUrl && e.githubUrl !== "#" ? `
            <a class="btn btn--sm btn--outline" href="${e.githubUrl}" target="_blank" rel="noopener">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="github-icon" viewBox="0 0 16 16" style="margin-right: 4px; vertical-align: text-bottom;">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
              </svg>
              Actions
            </a>
          ` : ""}
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

    if (runsOk.length === 0) {
      ns.historyChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return;
    }

    // 2) Consolidar por HORA
    const byHour = new Map();
    for (const r of runsOk) {
      const d = new Date(r.date);
      if (!Number.isFinite(d.getTime())) continue;

      const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;

      const cur = byHour.get(hourKey) || {
        hourKey,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()),
        passed: 0,
        failed: 0
      };
      cur.passed += Number(r.passedTests || 0);
      cur.failed += Number(r.failedTests || 0);
      byHour.set(hourKey, cur);
    }

    // 3) Converter para array e ordenar
    const hourlyData = Array.from(byHour.values())
      .sort((a, b) => a.date - b.date);

    // 4) Formatação brasileira para labels
    const dfBRChart = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit'
    });

    function formatChartLabel(date) {
      const parts = dfBRChart.formatToParts(date);
      const day = parts.find(p => p.type === 'day').value;
      const month = parts.find(p => p.type === 'month').value;
      const hour = parts.find(p => p.type === 'hour').value;

      return `${day}/${month} às ${hour}h`;
    }

    const labels = hourlyData.map(d => formatChartLabel(d.date));
    const passedData = hourlyData.map(d => d.passed);
    const failedData = hourlyData.map(d => d.failed);

    // 7) Configurar gráfico
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
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: function (tooltipItems) {
                const index = tooltipItems[0].dataIndex;
                const hourData = hourlyData[index];
                return formatDateTime(hourData.date);
              },
              label: function (context) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              },
              footer: function (tooltipItems) {
                const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                return total > 0 ? `Total: ${total}` : '';
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Data e Hora'
            },
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Número de Testes'
            },
            ticks: {
              precision: 0,
              stepSize: 1
            }
          }
        },
        interaction: {
          mode: 'nearest',
          intersect: false
        }
      }
    });
  }

  // ===========================
  // Modal
    // ===========================
  function loadTabContent(tabId) {
    const currentExecution = ns.currentModalExecution;
    switch (tabId) {
      case 'tab-tests': loadTestsContent(currentExecution); break;
      case 'tab-logs': loadLogsContent(currentExecution); break;
      case 'tab-artifacts': loadArtifactsContent(currentExecution); break;
    }
  }



  function switchTab(activeTabId, activeButtonId) {
    console.log('Switching to tab:', activeTabId);

    // Ocultar todos os painéis
    const allPanels = document.querySelectorAll('#executionModal .tab-panel');
    allPanels.forEach(panel => {
      panel.style.display = 'none';
      panel.classList.remove('tab-panel--active');
    });

    // Remover classe ativa de todos os botões
    const allButtons = document.querySelectorAll('#executionModal .tab-button');
    allButtons.forEach(button => {
      button.classList.remove('tab-button--active');
    });

    // Mostrar painel ativo
    const activePanel = document.getElementById(activeTabId);
    if (activePanel) {
      activePanel.style.display = 'block';
      activePanel.classList.add('tab-panel--active');
    }

    // Ativar botão clicado
    const activeButton = document.getElementById(activeButtonId);
    if (activeButton) {
      activeButton.classList.add('tab-button--active');
    }

    // Carregar conteúdo
    loadTabContent(activeTabId);
  }



  function openExecutionModal(id) {
    const e = ns.executionsData.find(x => x.id === id);
    if (!e) return;

    const set = (id, val, prop = 'textContent') => {
      const el = document.getElementById(id);
      if (el) el[prop] = val;
    };

    // ✅ VISÃO GERAL - Apenas dados básicos
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

    // ✅ CONFIGURAR DISPONIBILIDADE DAS TABS
    const testsTabBtn = document.querySelector('[data-tab="tests"]');
    const logsTabBtn = document.querySelector('[data-tab="logs"]');
    const artifactsTabBtn = document.querySelector('[data-tab="artifacts"]');

    const hasTests = e.tests && e.tests.length > 0;
    const hasLogs = e.logs && e.logs.length > 0;
    const hasArtifacts = e.artifacts && e.artifacts.length > 0;

    if (testsTabBtn) testsTabBtn.disabled = !hasTests;
    if (logsTabBtn) logsTabBtn.disabled = !hasLogs;
    if (artifactsTabBtn) artifactsTabBtn.disabled = !hasArtifacts;

    // ✅ TAB TESTES - Apenas cenários de teste
    const testsList = document.getElementById("modalTestsList");
    if (testsList) {
      if (hasTests) {
        testsList.innerHTML = (e.tests || []).map(t => `
      <div class="test-item test-item--${t.status || "passed"}">
        <div class="test-info">
          <div class="test-name">${t.name}</div>
          ${t.error ? `<div class="test-error">${t.error}</div>` : ""}
        </div>
        <div class="test-duration">${t.duration || 0}s</div>
      </div>`).join("");
      } else {
        testsList.innerHTML = '<p>Nenhum teste detalhado disponível para esta execução.</p>';
      }
    }

    // ✅ TAB LOGS - Apenas logs
    const logsPre = document.getElementById("modalLogs");
    if (logsPre) {
      if (hasLogs) {
        logsPre.textContent = (e.logs || []).join("\n\n");
      } else {
        logsPre.textContent = 'Nenhum log disponível para esta execução.';
      }
    }

    // ✅ TAB ARTEFATOS - Apenas artifacts
    const artifactsWrap = document.getElementById("modalArtifacts");
    if (artifactsWrap) {
      if (hasArtifacts) {
        artifactsWrap.innerHTML = renderArtifacts(e.artifacts);
      } else {
        artifactsWrap.innerHTML = `
        <div class="no-artifacts">
          <i class="fas fa-images"></i>
          <p>Nenhum artefato disponível para esta execução</p>
          <small>Screenshots e vídeos aparecerão aqui quando disponíveis</small>
        </div>
      `;
      }
    }

    // ✅ ABRIR MODAL
    const modal = document.getElementById("executionModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.style.display = "flex";

      // ✅ ATIVAR TAB VISÃO GERAL por padrão
      setTimeout(() => {
        document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("tab-button--active"));
        document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("tab-panel--active"));

        const overviewTab = document.querySelector('.tab-button[data-tab="overview"]');
        const overviewPanel = document.getElementById("overview-tab");
        if (overviewTab) overviewTab.classList.add("tab-button--active");
        if (overviewPanel) overviewPanel.classList.add("tab-panel--active");
      }, 50);
    }
  }

  function closeExecutionModal() {
    const modal = document.getElementById("executionModal");
    if (!modal) return;

    // Fechar modal
    modal.classList.add("hidden");
    modal.style.display = "none";

    // Limpar dados da execução atual
    if (window.__DASH_STATE__) {
      window.__DASH_STATE__.currentModalExecution = null;
    }

    console.log('Modal fechado e pronto para reabrir');
  }

  function setupEventListeners() {
    const el = id => document.getElementById(id);

    el("statusFilter")?.addEventListener("change", applyFilters);
    el("dateFilter")?.addEventListener("change", applyFilters);
    el("closeModal")?.addEventListener("click", closeExecutionModal);
    // document.querySelector("#executionModal .modal-backdrop")?.addEventListener("click", closeModal);
    document.querySelector("#executionModal .modal-backdrop")?.addEventListener("click", closeExecutionModal);



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
    const pipelineBtn = document.getElementById("runPipelineBtn");
    if (pipelineBtn) {
      pipelineBtn.addEventListener("click", function(e) {
        e.preventDefault();
        console.log('🚀 Botão pipeline clicado via event listener!');
        executarPipeline();
      });
      console.log('✅ Event listener do pipeline configurado com sucesso');
    } else {
      console.warn('❌ Botão runPipelineBtn não encontrado durante setup');
    }
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

    // ✅ ATIVAR 7d POR PADRÃO
    setTimeout(() => {
      const defaultBtn = document.querySelector('[data-history-period="7d"]');
      if (defaultBtn) {
        buttons.forEach(btn => btn.classList.remove('period-btn--active'));
        defaultBtn.classList.add('period-btn--active');
      }
    }, 100);
  }

  function onHistoryPeriodClick(e) {
    e.preventDefault();
    const newPeriod = this.getAttribute('data-history-period');
    if (!newPeriod || newPeriod === ns.historyPeriod) return;

    // Atualizar período ativo
    ns.historyPeriod = newPeriod;
    document.querySelectorAll('[data-history-period]').forEach(b => b.classList.remove('period-btn--active'));
    this.classList.add('period-btn--active');

    // Atualizar dados baseado no período
    const source = ns.executionsData?.length ? ns.executionsData : (window.__allRuns || []);
    const filtered = filterRunsByPeriod(source, ns.historyPeriod);
    ns.filteredExecutions = filtered.slice();
    updateStatistics();
    initializeStatusChart();
    populateExecutionTable();
    initializeHistoryChartFromRuns(filtered);

    console.log(`Período alterado para ${newPeriod}: ${filtered.length} execuções`);
  }

  // ===========================
  // Auto-refresh FUNCIONAL
  // ===========================
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
  // Renderização de Artefatos
  // ===========================
  function renderArtifacts(artifacts) {
    if (!artifacts || artifacts.length === 0) {
      return `<div class="no-artifacts">
            <i class="fas fa-images"></i>
            <p>Nenhum artefato disponível para esta execução</p>
            <small>Screenshots e vídeos aparecerão aqui quando disponíveis</small>
        </div>`;
    }

    return artifacts.map(a => {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(a.url || a.name);
      const isVideo = /\.(mp4|webm|mov)$/i.test(a.url || a.name);

      if (isImage) {
        return `<div class="artifact-item">
                <div class="artifact-preview">
                    <img src="${a.url}" alt="${a.name} - Screenshot" class="artifact-thumb" 
                         onclick="openImageModal('${a.url}', '${a.name} - Screenshot')">
                </div>
                <div class="artifact-info">
                    <h5>${a.name} - Screenshot do Teste</h5>
                    <span class="artifact-type">Imagem</span> ${getFileSize(a.size)}
                </div>
                <div style="margin-top: 0.5rem;">
                    <button class="btn btn--sm btn--outline" 
                            onclick="openImageModal('${a.url}', '${a.name} - Screenshot')">
                        <i class="fas fa-eye"></i> Visualizar
                    </button>
                    <button class="btn btn--sm btn--outline" 
                            onclick="downloadArtifact('${a.url}', '${a.name}')" 
                            style="margin-left: 0.5rem;">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>`;
      }
      else if (isVideo) {
        return `<div class="artifact-item">
                <div class="artifact-preview">
                    <video controls class="artifact-video">
                        <source src="${a.url}" type="video/mp4">
                        Seu browser não suporta reprodução de vídeo.
                    </video>
                </div>
                <div class="artifact-info">
                    <h5>${a.name} - Gravação do Teste</h5>
                    <span class="artifact-type">Vídeo</span> ${getFileSize(a.size)}
                </div>
                <div style="margin-top: 0.5rem;">
                    <button class="btn btn--sm btn--outline" 
                            onclick="downloadArtifact('${a.url}', '${a.name}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>`;
      }
      else {
        return `<div class="artifact-item">
                <div class="artifact-preview">
                    <i class="fas fa-file-alt" style="font-size: 3rem; color: #6b7280;"></i>
                </div>
                <div class="artifact-info">
                    <h5>${a.name}</h5>
                    <span class="artifact-type">Documento</span> ${getFileSize(a.size)}
                </div>
                <div style="margin-top: 0.5rem;">
                    <button class="btn btn--sm btn--outline" 
                            onclick="downloadArtifact('${a.url || ''}', '${a.name}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>`;
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

  // ===========================
  // Bootstrap/Inicialização
  // ===========================
  document.addEventListener("DOMContentLoaded", () => {
    setupPeriodButtons();
    setupEventListeners();
    initializeModalTabsOnce();

    loadRuns()
      .catch(console.error)
      .finally(() => { startAutoRefreshCountdown(); });
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
        if (typeof r.date === 'number' && r.date < 1e12) r.date = r.date * 1000;
        const t = (typeof r.date === 'number') ? r.date : new Date(r.date).getTime();
        r.date = Number.isFinite(t) ? t : null;
      }

      // disponibiliza para inspeção no console
      window.__allRuns = uniq;

      // 2) Base para cards/tabela/pizza
      ns.executionsData = uniq.slice();
      ns.filteredExecutions = filterRunsByPeriod(ns.executionsData, ns.historyPeriod); // ✅ APLICAR FILTRO

      updateStatistics();
      initializeStatusChart();
      populateExecutionTable();

      // 3) Histórico por período
      console.log('loadRuns: total execs=', ns.executionsData.length, 'period=', ns.historyPeriod);
      console.log('filtered len=', ns.filteredExecutions.length);
      initializeHistoryChartFromRuns(ns.filteredExecutions);
    } catch (err) {
      console.error('Falha ao carregar execuções:', err);
    }
  }

  function calculateTrends(currentData, previousData) {
    const trends = {};

    for (const key in currentData) {
      const current = currentData[key] || 0;
      const previous = previousData[key] || 0;

      if (previous === 0) {
        const assumedPrevious = Math.max(1, current * 0.1);
        const diff = current - assumedPrevious;
        const percent = Math.round((diff / assumedPrevious) * 100);
        const cappedPercent = Math.min(Math.max(percent, -100), 100); // ✅ LIMITE ±100%

        trends[key] = {
          value: current,
          change: diff,
          percent: cappedPercent,
          trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
        };
      } else {
        const diff = current - previous;
        const percent = Math.round((diff / previous) * 100);
        const cappedPercent = Math.min(Math.max(percent, -100), 100); // ✅ LIMITE ±100%

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

  function getPreviousPeriodData(period) {
    const now = Date.now();
    let windowMs;

    switch (period) {
      case '24h': windowMs = 24 * 60 * 60 * 1000; break;
      case '7d': windowMs = 7 * 24 * 60 * 60 * 1000; break;
      case '30d': windowMs = 30 * 24 * 60 * 60 * 1000; break;
      default: windowMs = 7 * 24 * 60 * 60 * 1000;
    }

    const periodStart = now - (2 * windowMs); // Período anterior
    const periodEnd = now - windowMs;

    const previousRuns = ns.executionsData.filter(r => {
      const runTime = new Date(r.date).getTime();
      return runTime >= periodStart && runTime <= periodEnd;
    });

    if (previousRuns.length === 0) {
      return { totalPassed: 0, totalFailed: 0, avgDuration: 0, successRate: 0 };
    }

    const totalPassed = previousRuns.reduce((s, e) => s + (e.passedTests || 0), 0);
    const totalFailed = previousRuns.reduce((s, e) => s + (e.failedTests || 0), 0);
    const totalTests = totalPassed + totalFailed;
    const avgDuration = Math.round(previousRuns.reduce((s, e) => s + (e.duration || 0), 0) / previousRuns.length);
    const successRate = totalTests ? Math.round((totalPassed / totalTests) * 100) : 0;

    return { totalPassed, totalFailed, avgDuration, successRate };
  }

  function calculateRealTrends(current, previous) {
    const trends = {};

    Object.keys(current).forEach(key => {
      const cur = current[key] || 0;
      const prev = previous[key] || 0;

      if (prev === 0) {
        trends[key] = cur > 0 ? { percent: 100, direction: 'up' } : { percent: 0, direction: 'neutral' };
      } else {
        const change = ((cur - prev) / prev) * 100;
        const limitedChange = Math.min(Math.max(Math.round(change), -99), 99); // Limita -99% a +99%

        trends[key] = {
          percent: Math.abs(limitedChange),
          direction: limitedChange > 5 ? 'up' : limitedChange < -5 ? 'down' : 'neutral'
        };
      }
    });

    return trends;
  }
  function updateElementWithTrend(elementId, value, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const arrow = trend.direction === 'up' ? '↗️' : trend.direction === 'down' ? '↘️' : '➡️';
    const sign = trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : '';
    const color = trend.direction === 'up' ? '#16a34a' : trend.direction === 'down' ? '#dc2626' : '#6b7280';

    // Manter o layout existente, mas com valores reais
    element.innerHTML = `${value}<small style="color: ${color}; margin-left: 8px; font-size: 0.75rem;">${arrow} ${sign}${trend.percent}%</small>`;
  }





  function formatTrend(trendData) {
    if (!trendData || trendData.trend === undefined) {
      return '';
    }

    if (trendData.trend === 'new' || (trendData.change === null)) {
      return '';
    }

    // ✅ PERCENTUAL JÁ LIMITADO pela calculateTrends
    const arrow = trendData.trend === 'up' ? '↗️' : trendData.trend === 'down' ? '↘️' : '➡️';
    const color = trendData.trend === 'up' ? '#16a34a' : trendData.trend === 'down' ? '#dc2626' : '#6b7280';
    const sign = trendData.percent > 0 ? '+' : '';

    return `<span class="trend-indicator" style="color: ${color}; font-size: 0.85em; margin-left: 8px;">${arrow} ${sign}${trendData.percent}%</span>`;
  }

  // ===========================
  // FUNCIONALIDADE DAS TABS DO MODAL
  // ===========================
  function initializeModalTabsOnce() {
    console.log('Inicializando tabs globalmente...');

    // Event delegation - listener global permanente
    document.addEventListener('click', function (e) {
      // Verificar se o click foi em um botão de tab
      const tabButton = e.target.closest('#executionModal .tab-button');
      if (tabButton) {
        e.preventDefault();
        e.stopPropagation();

        const tabId = tabButton.getAttribute('data-tab');
        const buttonId = tabButton.id;

        console.log('Tab clicked:', tabId, buttonId);
        switchTab(tabId, buttonId);
      }
    });

    // Listener para fechar modal
    document.addEventListener('click', function (e) {
      if (e.target.id === 'closeModal' ||
        e.target.closest('#closeModal') ||
        e.target.classList.contains('modal-backdrop')) {

        console.log('Fechando modal...');
        closeExecutionModal();
      }
    });
  }

  function initializeModalTabs() {
    // Limpar event listeners antigos para evitar duplicatas
    const existingButtons = document.querySelectorAll('#executionModal .tab-button');
    existingButtons.forEach(button => {
      // Remove listeners antigos (clona o elemento para limpar eventos)
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });

    let modalTabsInitialized = false;

    // ✅ FUNÇÃO PARA RESETAR O MODAL QUANDO FECHA
    function resetModalTabs() {
      console.log('Resetando modal...');

      // Resetar para a primeira tab
      const allPanels = document.querySelectorAll('#executionModal .tab-panel');
      allPanels.forEach(panel => {
        panel.style.display = 'none';
        panel.classList.remove('tab-panel--active');
      });

      const allButtons = document.querySelectorAll('#executionModal .tab-button');
      allButtons.forEach(button => {
        button.classList.remove('tab-button--active');
      });

      // Ativar primeira tab
      const overviewTab = document.getElementById('tab-overview');
      const overviewBtn = document.getElementById('btn-overview');

      if (overviewTab && overviewBtn) {
        overviewTab.style.display = 'block';
        overviewTab.classList.add('tab-panel--active');
        overviewBtn.classList.add('tab-button--active');
      }
    }

    // Event listeners para os botões das tabs (novos elementos limpos)
    const tabButtons = document.querySelectorAll('#executionModal .tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const tabId = button.getAttribute('data-tab');
        const buttonId = button.id;

        console.log('Tab clicked:', tabId, buttonId); // Debug

        if (tabId && buttonId) {
          switchTab(tabId, buttonId);
        }
      });
    });

    // Ativar primeira tab por padrão
    switchTab('tab-overview', 'btn-overview');
  }

  // ✅ FUNÇÃO PARA CARREGAR TESTES
  function loadTestsContent(execution) {
    const testsContainer = document.getElementById('modalTestsList');
    
    if (!execution) {
      testsContainer.innerHTML = `
        <div class="no-artifacts">
          <i>🧪</i>
          <h3>Nenhum teste disponível</h3>
          <p>Esta execução não possui detalhes de testes.</p>
        </div>
      `;
      return;
    }

    testsContainer.innerHTML = `
      <div class="test-item test-item--passed">
        <div class="test-info">
          <div class="test-name">✅ Login de usuário</div>
          <div class="test-path">cypress/e2e/login.cy.js</div>
        </div>
        <div class="test-duration">2.1s</div>
      </div>
      <div class="test-item test-item--passed">
        <div class="test-info">
          <div class="test-name">✅ Navegação da home page</div>
          <div class="test-path">cypress/e2e/homepage.cy.js</div>
        </div>
        <div class="test-duration">1.5s</div>
      </div>
      ${execution.status === 'failed' ? `
      <div class="test-item test-item--failed">
        <div class="test-info">
          <div class="test-name">❌ Checkout de produto</div>
          <div class="test-path">cypress/e2e/checkout.cy.js</div>
          <div class="test-error">Elemento '.btn-checkout' não encontrado</div>
        </div>
        <div class="test-duration">3.2s</div>
      </div>
      ` : `
      <div class="test-item test-item--passed">
        <div class="test-info">
          <div class="test-name">✅ Checkout de produto</div>
          <div class="test-path">cypress/e2e/checkout.cy.js</div>
        </div>
        <div class="test-duration">2.8s</div>
      </div>
      `}
    `;
  }

  // ✅ FUNÇÃO PARA CARREGAR LOGS
  function loadLogsContent(execution) {
    const logsContainer = document.getElementById('modalLogs');
    
    if (!execution) {
      logsContainer.textContent = 'Nenhuma execução selecionada.';
      return;
    }

    logsContainer.textContent = 'Carregando logs...';

    setTimeout(() => {
      const mockLogs = `🚀 Iniciando execução Cypress...
  📁 Carregando especificações de teste...
  🌐 Abrindo navegador Chrome (headless)...

  === TESTES EXECUTADOS ===
  ✅ Login de usuário - PASSOU (2.1s)
  ✅ Navegação da home page - PASSOU (1.5s)
  ${execution.status === 'failed' ? 
    `❌ Checkout de produto - FALHOU (3.2s)
    └─ Erro: Elemento '.btn-checkout' não encontrado
    └─ Screenshot: cypress/screenshots/checkout-error.png
    └─ Vídeo: cypress/videos/checkout-test.mp4` : 
    `✅ Checkout de produto - PASSOU (2.8s)`}

  🧹 Limpando recursos do navegador...
  📊 Gerando relatórios HTML e JSON...
  ✨ Execução finalizada em ${execution.duration || '28s'}

  === LOG DETALHADO ===
  [${formatDateTime(execution.date)}] Execution ID: ${execution.id}
  [${formatDateTime(execution.date)}] Environment: ${execution.environment}
  [${formatDateTime(execution.date)}] Branch: ${execution.branch}  
  [${formatDateTime(execution.date)}] Status: ${execution.status.toUpperCase()}
  [${formatDateTime(execution.date)}] Tests: 3 total, ${execution.status === 'failed' ? '2' : '3'} passed
  [${formatDateTime(execution.date)}] Duration: ${execution.duration}s
  [${formatDateTime(execution.date)}] Process completed successfully`;

      logsContainer.textContent = mockLogs;
    }, 800);
  }
 

  // ✅ FUNÇÃO PARA CARREGAR ARTEFATOS  
  function loadArtifactsContent(execution) {
    const artifactsContainer = document.getElementById('modalArtifacts');

    // Simulação de artefatos mais realistas
    const mockArtifacts = [
      {
        name: 'mochawesome-report.html',
        url: '', // URL vazia indica que deve gerar conteúdo
        size: 245760, // ~240KB
        type: 'text/html'
      },
      {
        name: 'test-results.json',
        url: '',
        size: 15360, // ~15KB
        type: 'application/json'
      }
    ];

    // Se a execução falhou, adicionar artefatos de erro
    if (execution?.status === 'failed') {
      mockArtifacts.push(
        {
          name: 'checkout-error.png',
          url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="%236b7280" text-anchor="middle">Screenshot de Erro</text></svg>',
          size: 89600, // ~87KB
          type: 'image/png'
        },
        {
          name: 'test-recording.mp4',
          url: '', // Para vídeo, podemos usar um placeholder
          size: 2048000, // ~2MB
          type: 'video/mp4'
        }
      );
    }

    artifactsContainer.innerHTML = renderArtifacts(mockArtifacts);
  }

  function openExecutionModal(id) {
    console.log('=== ABRINDO MODAL ===');
    console.log('ID da execução:', id);

    const e = ns.executionsData.find(x => x.id === id);
    if (!e) {
      console.log('Execução não encontrada!');
      return;
    }

    console.log('Dados da execução:', e);

    // Guardar execução atual
    ns.currentModalExecution = e;

    // Preencher dados da visão geral
    document.getElementById("modalExecutionId").textContent = e.id;
    document.getElementById("modalExecutionDate").textContent = formatDateTime(e.date);
    document.getElementById("modalExecutionBranch").textContent = e.branch;
    document.getElementById("modalExecutionEnvironment").textContent = e.environment;
    document.getElementById("modalExecutionAuthor").textContent = e.author || "Sistema";
    document.getElementById("modalExecutionCommit").textContent = e.commit || "N/A";
    document.getElementById("modalExecutionDuration").textContent = e.duration + 's';
    document.getElementById("modalExecutionStatus").innerHTML = `<span class="status status--${e.status}">${e.status.toUpperCase()}</span>`;
    
    const githubLink = document.getElementById("modalGithubLink");
    if (e.githubUrl && e.githubUrl !== "#") {
      githubLink.href = e.githubUrl;
      githubLink.style.display = 'inline-flex';
    } else {
      githubLink.style.display = 'none';
    }

    // Resetar para primeira tab
    switchTab('tab-overview', 'btn-overview');

    // Mostrar modal
    document.getElementById("executionModal").classList.remove("hidden");
    console.log('Modal aberto!');
  }

  function closeExecutionModal() {
    document.getElementById("executionModal").classList.add("hidden");
    
    // Limpar dados
    ns.currentModalExecution = null;
    
    // Resetar para primeira tab
    switchTab('tab-overview', 'btn-overview');
    
    console.log('Modal fechado');
  }

  // ✅ FALLBACK - Se o DOM já carregou
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModalTabsOnce);
  } else {
    initializeModalTabsOnce();
  }


  // Exponha a API
  root.__DASH_API__ = { loadRuns };
})(window);

// ===========================
// Modal Functions (GLOBAIS)
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

async function executarPipeline() {
  console.log('🚀 Iniciando execução da pipeline...');
  
  const btn = document.getElementById('runPipelineBtn');
  if (!btn) {
    console.error('❌ Botão runPipelineBtn não encontrado!');
    return;
  }

  // Estado de loading
  btn.classList.add('btn--loading');
  btn.disabled = true;
  
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <span>Executando...</span>
    <div class="btn-spinner-slot"></div>
  `;

  // Mostrar notificação de sucesso
  showPipelineNotification('Pipeline iniciada com sucesso! ⚡', 'success');

  try {
    const response = await fetch('/.netlify/functions/trigger-pipeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        environment: 'staging',
        triggered_by: 'dashboard'
      })
  });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erro HTTP ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    console.log('✅ Pipeline disparada com sucesso:', result);

    // Mostrar sucesso
    btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
    <span>Disparada!</span>
  `;

    showPipelineNotification('Pipeline iniciada no GitHub Actions! 🚀', 'success');

    // Voltar ao estado normal após 3 segundos
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('btn--loading');
      btn.disabled = false;
    }, 3000);

    // Atualizar dados após 10 segundos (pipeline demora mais que simulação)
    setTimeout(() => {
      if (typeof loadRuns === 'function') {
        loadRuns();
        showPipelineNotification('Verificando novos resultados... 🔍', 'info');
      }
    }, 10000);

  } catch (error) {
    console.error('❌ Erro ao disparar pipeline:', error);

    // Mostrar erro detalhado
    btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
    <span>Falhou!</span>
  `;

    // Mostrar erro específico baseado no tipo
    let errorMessage = 'Erro ao disparar pipeline. ';
    if (error.message.includes('404')) {
      errorMessage += 'Função serverless não encontrada. ';
    } else if (error.message.includes('401')) {
      errorMessage += 'Token de acesso inválido. ';
    } else if (error.message.includes('403')) {
      errorMessage += 'Permissão negada no GitHub. ';
    } else {
      errorMessage += error.message;
    }

    showPipelineNotification(errorMessage + ' ❌', 'error');

    // Voltar ao estado normal após 5 segundos
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('btn--loading');
      btn.disabled = false;
    }, 5000);
  }
}

// Sistema de notificações toast
function showPipelineNotification(message, type = 'info') {
  // Remover notificação existente se houver
  const existing = document.querySelector('.pipeline-notification');
  if (existing) existing.remove();

  // Criar notificação
  const notification = document.createElement('div');
  notification.className = `pipeline-notification pipeline-notification--${type}`;
  notification.innerHTML = `
    <div class="pipeline-notification-content">
      <span class="pipeline-notification-message">${message}</span>
      <button class="pipeline-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  // Adicionar ao body
  document.body.appendChild(notification);

  // Mostrar com animação
  setTimeout(() => notification.classList.add('show'), 100);

  // Auto-remover após 5 segundos
  setTimeout(() => {
    if (notification.parentElement) {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

//////////////////////////////
/// mochawesome ///////////// 
/////////////////////////////

// Função universal para fazer download de qualquer tipo de arquivo
function downloadArtifact(url, filename) {
  console.log('Iniciando download de:', filename);

  // Mostrar indicador de carregamento no botão
  const buttons = document.querySelectorAll(`button[onclick*="${filename}"]`);
  buttons.forEach(btn => {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baixando...';
    btn.disabled = true;
  });

  // Função para resetar botões
  const resetButtons = () => {
    buttons.forEach(btn => {
      btn.innerHTML = '<i class="fas fa-download"></i> Download';
      btn.disabled = false;
    });
  };

  try {
    // Se é uma URL real, fazer download direto
    if (url && url.startsWith('http')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(resetButtons, 1000);
      return;
    }

    // Gerar conteúdo baseado no tipo de arquivo
    let content = '';
    let mimeType = 'text/plain';

    if (filename.endsWith('.html')) {
      content = generateMochaweseReport();
      mimeType = 'text/html';
    } else if (filename.endsWith('.json')) {
      content = generateJsonReport();
      mimeType = 'application/json';
    } else if (filename.endsWith('.xml')) {
      content = generateXmlReport();
      mimeType = 'text/xml';
    } else {
      content = `Relatório de execução: ${filename}\n\nGerado em: ${new Date().toLocaleString()}\n\nDetalhes da execução disponíveis no dashboard.`;
    }

    // Criar blob e fazer download
    const blob = new Blob([content], { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpar URL do blob
    URL.revokeObjectURL(downloadUrl);

    console.log('✅ Download concluído:', filename);

    // Mostrar notificação de sucesso
    showNotification(`✅ Download de "${filename}" concluído com sucesso!`, 'success');

  } catch (error) {
    console.error('❌ Erro no download:', error);
    showNotification(`❌ Erro ao baixar "${filename}": ${error.message}`, 'error');
  }

  setTimeout(resetButtons, 1000);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="margin-left: 10px; background: none; border: none; color: inherit; cursor: pointer;">×</button>
        </div>
    `;

  // Adicionar estilos se não existirem
  if (!document.querySelector('#notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                min-width: 300px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                animation: slideIn 0.3s ease-out;
            }
            .notification--success { background-color: #10b981; }
            .notification--error { background-color: #ef4444; }
            .notification--info { background-color: #3b82f6; }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
        `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(notification);

  // Auto remover após 4 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

// Função para gerar relatório HTML Mochawesome
function generateMochaweseReport() {
  const execution = window.DASHSTATE?.currentModalExecution;
  const timestamp = new Date().toLocaleString();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes - ${execution?.id || 'N/A'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center; }
        .test-item { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px; }
        .passed { border-left: 4px solid #4caf50; }
        .failed { border-left: 4px solid #f44336; }
        .error { color: #f44336; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Relatório de Execução de Testes</h1>
        <p><strong>ID da Execução:</strong> ${execution?.id || 'N/A'}</p>
        <p><strong>Data:</strong> ${execution?.date || timestamp}</p>
        <p><strong>Branch:</strong> ${execution?.branch || 'main'}</p>
        <p><strong>Ambiente:</strong> ${execution?.environment || 'production'}</p>
        <p><strong>Status:</strong> ${execution?.status || 'passed'}</p>
        <p><strong>Duração:</strong> ${execution?.duration || '0'}s</p>
    </div>
    
    <div class="stats">
        <div class="stat">
            <h3>${execution?.passedTests || 0}</h3>
            <p>Testes Aprovados</p>
        </div>
        <div class="stat">
            <h3>${execution?.failedTests || 0}</h3>
            <p>Testes Falhados</p>
        </div>
        <div class="stat">
            <h3>${execution?.totalTests || 0}</h3>
            <p>Total de Testes</p>
        </div>
    </div>
    
    <h2>📋 Detalhes dos Testes</h2>
    <div class="test-item passed">
        <h4>✅ Login de usuário</h4>
        <p><strong>Arquivo:</strong> cypress/e2e/login.cy.js</p>
        <p><strong>Duração:</strong> 2.1s</p>
    </div>
    
    <div class="test-item passed">
        <h4>✅ Navegação da home page</h4>
        <p><strong>Arquivo:</strong> cypress/e2e/homepage.cy.js</p>
        <p><strong>Duração:</strong> 1.5s</p>
    </div>
    
    ${execution?.status === 'failed' ? `
    <div class="test-item failed">
        <h4>❌ Checkout de produto</h4>
        <p><strong>Arquivo:</strong> cypress/e2e/checkout.cy.js</p>
        <p><strong>Duração:</strong> 3.2s</p>
        <div class="error">Erro: Elemento '.btn-checkout' não encontrado</div>
    </div>
    ` : ''}
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        <p>Relatório gerado automaticamente em ${timestamp}</p>
        <p>Dashboard de Testes Cypress v1.0</p>
    </footer>
</body>
</html>`;
}

// Função para gerar relatório JSON
function generateJsonReport() {
  const execution = window.DASHSTATE?.currentModalExecution;

  return JSON.stringify({
    execution: {
      id: execution?.id || 'N/A',
      date: execution?.date || new Date().toISOString(),
      branch: execution?.branch || 'main',
      environment: execution?.environment || 'production',
      status: execution?.status || 'passed',
      duration: execution?.duration || 0,
      totalTests: execution?.totalTests || 0,
      passedTests: execution?.passedTests || 0,
      failedTests: execution?.failedTests || 0
    },
    tests: [
      {
        name: "Login de usuário",
        file: "cypress/e2e/login.cy.js",
        status: "passed",
        duration: 2.1
      },
      {
        name: "Navegação da home page",
        file: "cypress/e2e/homepage.cy.js",
        status: "passed",
        duration: 1.5
      }
    ],
    generated: new Date().toISOString(),
    generator: "Cypress Dashboard v1.0"
  }, null, 2);
}

// Função para gerar relatório XML
function generateXmlReport() {
  const execution = window.DASHSTATE?.currentModalExecution;

  return `<?xml version="1.0" encoding="UTF-8"?>
<testResults>
    <execution>
        <id>${execution?.id || 'N/A'}</id>
        <date>${execution?.date || new Date().toISOString()}</date>
        <branch>${execution?.branch || 'main'}</branch>
        <environment>${execution?.environment || 'production'}</environment>
        <status>${execution?.status || 'passed'}</status>
        <duration>${execution?.duration || 0}</duration>
        <totalTests>${execution?.totalTests || 0}</totalTests>
        <passedTests>${execution?.passedTests || 0}</passedTests>
        <failedTests>${execution?.failedTests || 0}</failedTests>
    </execution>
    <tests>
        <test>
            <name>Login de usuário</name>
            <file>cypress/e2e/login.cy.js</file>
            <status>passed</status>
            <duration>2.1</duration>
        </test>
        <test>
            <name>Navegação da home page</name>
            <file>cypress/e2e/homepage.cy.js</file>
            <status>passed</status>
            <duration>1.5</duration>
        </test>
    </tests>
    <generated>${new Date().toISOString()}</generated>
</testResults>`;
}


// ===========================
// PageSpeed API Functions
// ===========================
async function loadDetailedMetrics() {
  console.log('📊 Carregando métricas detalhadas...');

  const results = [];
  const totalStores = STORES_CONFIG.length;

  // Mostrar indicador de progresso
  showPageSpeedProgress(0, totalStores);

  // ✅ EXECUÇÃO SEQUENCIAL para evitar sobrecarga
  for (let i = 0; i < STORES_CONFIG.length; i++) {
    const store = STORES_CONFIG[i];

    try {
      console.log(`🏪 [${i + 1}/${totalStores}] Processando ${store.name}...`);

      // Atualizar progresso
      showPageSpeedProgress(i, totalStores, `Analisando ${store.name}...`);

      const metrics = await fetchDetailedPageSpeed(store.url);

      results.push({
        name: store.name,
        url: store.url,
        ...metrics
      });

      console.log(`✅ ${store.name} processado:`, metrics);

    } catch (error) {
      console.error(`❌ Erro ao processar ${store.name}:`, error);

      // Adicionar resultado com erro
      results.push({
        name: store.name,
        url: store.url,
        performance: '--',
        accessibility: '--',
        bestPractices: '--',
        seo: '--',
        error: error.message
      });
    }

    // Pausa entre requisições para evitar rate limiting
    if (i < STORES_CONFIG.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s entre cada
    }
  }

  // Esconder indicador de progresso
  hidePageSpeedProgress();

  console.log('🎉 Todas as métricas carregadas:', results);

  // Atualizar tabela e cards
  updateMetricsTable(results);
  updateSummaryCards(results);
}

async function fetchDetailedPageSpeed(url) {
  const maxRetries = 2;
  const timeout = 50000; // 50 segundos
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`📡 Tentativa ${attempt}/${maxRetries + 1} para: ${url}`);
      
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`⏰ Timeout de ${timeout/1000}s atingido para ${url}`);
      }, timeout);
      
      const response = await fetch('/api/page-speed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log(`✅ Dados recebidos para ${url}:`, data);
      
      // Extrair métricas
      const categories = data.lighthouseResult?.categories || {};
      
      return {
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100)
      };
      
    } catch (error) {
      console.error(`❌ Tentativa ${attempt} falhou para ${url}:`, error.message);
      
      if (attempt === maxRetries + 1) {
        // Última tentativa - retornar erro
        console.error(`🚫 Falha definitiva para ${url} após ${maxRetries + 1} tentativas`);
        return {
          performance: '--',
          accessibility: '--',
          bestPractices: '--',
          seo: '--',
          error: error.message
        };
      }
      
      // Aguardar antes da próxima tentativa
      const delay = Math.min(2000 * attempt, 6000); // Máximo 6s
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Configuração das lojas
const STORES_CONFIG = [
  { id: 'victor-hugo', url: 'https://www.victorhugo.com.br', name: 'Victor Hugo' },
  { id: 'shopvinho', url: 'https://www.shopvinho.com.br', name: 'ShopVinho' },
  { id: 'shopmulti', url: 'https://www.shopmulti.com.br', name: 'ShopMulti' }
];

function showPageSpeedProgress(current, total, message = 'Carregando...') {
  const progressHTML = `
    <div id="pagespeed-progress" style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.95);
      color: white;
      padding: 25px;
      border-radius: 12px;
      z-index: 9999;
      text-align: center;
      min-width: 320px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    ">
      <div style="margin-bottom: 15px;">
        <i class="fas fa-chart-line" style="font-size: 2.5rem; color: #3b82f6;"></i>
      </div>
      <h3 style="margin: 10px 0; color: white; font-size: 1.2rem;">Analisando PageSpeed</h3>
      <p style="margin: 10px 0; color: #d1d5db; font-size: 0.9rem;">${message}</p>
      <div style="background: #374151; border-radius: 10px; overflow: hidden; margin: 20px 0; height: 8px;">
        <div style="
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          height: 100%;
          width: ${(current / total) * 100}%;
          transition: width 0.5s ease;
          border-radius: 10px;
        "></div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <small style="color: #9ca3af;">${current}/${total} lojas</small>
        <small style="color: #9ca3af;">${Math.round((current / total) * 100)}%</small>
      </div>
    </div>
  `;
  
  // Remover progresso anterior se existir
  const existing = document.getElementById('pagespeed-progress');
  if (existing) existing.remove();
  
  // Adicionar novo progresso
  document.body.insertAdjacentHTML('beforeend', progressHTML);
}

function hidePageSpeedProgress() {
  const progress = document.getElementById('pagespeed-progress');
  if (progress) {
    progress.style.opacity = '0';
    progress.style.transform = 'translate(-50%, -50%) scale(0.8)';
    setTimeout(() => progress.remove(), 300);
  }
}



function updateMetricsTable(results) {
  const tbody = document.getElementById('metrics-table-body');
  if (!tbody) return;

  tbody.innerHTML = results.map(store => {
    const hasError = store.error;
    const errorClass = hasError ? 'error-row' : '';
    
    return `
      <tr class="${errorClass}">
        <td><strong>${store.name}</strong></td>
        <td><code>${store.url}</code></td>
        <td>
          <span class="score ${getScoreClass(store.performance)}">
            ${store.performance}
            ${hasError ? ' <i class="fas fa-exclamation-triangle" title="' + store.error + '"></i>' : ''}
          </span>
        </td>
        <td><span class="score ${getScoreClass(store.accessibility)}">${store.accessibility}</span></td>
        <td><span class="score ${getScoreClass(store.seo)}">${store.seo}</span></td>
      </tr>
    `;
  }).join('');
  
  // Adicionar estilos para linhas com erro
  if (!document.getElementById('pagespeed-error-styles')) {
    const styles = document.createElement('style');
    styles.id = 'pagespeed-error-styles';
    styles.textContent = `
      .error-row {
        background-color: rgba(239, 68, 68, 0.1) !important;
      }
      .error-row td {
        color: #dc2626;
      }
      .fa-exclamation-triangle {
        color: #f59e0b;
        margin-left: 4px;
        cursor: help;
      }
    `;
    document.head.appendChild(styles);
  }
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
  console.log('🔄 Refresh manual do PageSpeed...');
  loadDetailedMetrics();
}

// ===========================
// Event Listeners Globais
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  // Setup das tabs do modal
  function setupModalTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (button.disabled) return;

        // Remover active de todas
        tabButtons.forEach(btn => btn.classList.remove('tab-button--active'));
        tabPanels.forEach(panel => panel.classList.remove('tab-panel--active'));

        // Ativar clicada
        button.classList.add('tab-button--active');

        const targetTab = button.getAttribute('data-tab');
        const targetPanel = document.getElementById(`${targetTab}-tab`);
        if (targetPanel) {
          targetPanel.classList.add('tab-panel--active');
        }

        console.log(`✅ Tab ativada: ${targetTab}`);
      });
    });

    console.log('✅ Modal tabs configuradas:', tabButtons.length);
  }

  // Executar setup após delay
  setTimeout(setupModalTabs, 1000);

  // Re-executar quando modal abrir
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const modal = mutation.target;
        if (modal.style.display === 'flex') {
          setTimeout(setupModalTabs, 100);
        }
      }
    });
  });

  const modal = document.getElementById('executionModal');
  if (modal) {
    observer.observe(modal, { attributes: true });
  }
});

// ===========================
// REMOVER +300% - VERSÃO CORRIGIDA
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  function remover300Percent() {
    // Método 1: Remover elementos que contêm APENAS "+300%"
    document.querySelectorAll('*').forEach(el => {
      if (el.textContent && el.textContent.trim() === '+300%') {
        el.style.display = 'none';
        console.log('✅ Removido +300%:', el);
      }
    });

    // Método 2: Limpar spans com emoji hardcoded
    const spans = document.querySelectorAll('span');
    spans.forEach(span => {
      if (span.textContent.includes('📈') && span.textContent.includes('+300%')) {
        span.remove();
        console.log('✅ Removido span hardcoded');
      }
    });
  }

  // Executar imediatamente
  remover300Percent();

  // Executar periodicamente
  setInterval(remover300Percent, 2000);

  console.log('✅ Sistema anti-300% ativado');
});

function removeHardcodedTrends() {
  console.log('🧹 Limpando trends hardcoded...');

  // Método 1: Remover spans que contenham exatamente "+300%" sem style
  const spans = document.querySelectorAll('span');
  let removidos = 0;

  spans.forEach(span => {
    const text = span.textContent.trim();
    const hasStyle = span.hasAttribute('style');
    const hasEmoji = span.innerHTML.includes('↗️') || span.innerHTML.includes('↘️') || span.innerHTML.includes('➡️');

    // Remover apenas "+300%" que NÃO são calculados
    if ((text === '+300%' || text === '📈 +300%') && !hasStyle && !hasEmoji) {
      console.log('Removendo span hardcoded:', span.textContent);
      span.remove();
      removidos++;
    }
  });

  // Método 2: Limpar elementos com emoji + "+300%" hardcoded
  const emojiSpans = document.querySelectorAll('span');
  const filteredSpans = Array.from(emojiSpans).filter(span => span.textContent.includes('📈'));
  filteredSpans.forEach(span => {
    if (span.textContent.includes('+300%')) {
      span.remove();
      removidos++;
    }
  });

  console.log(`✅ ${removidos} elementos hardcoded removidos`);
}

// Integrar com suas funções existentes
function updateStatistics() {
  console.log('📊 Atualizando estatísticas...');
  const currentRuns = ns.filteredExecutions || [];
  const totalPassed = currentRuns.reduce((s, e) => s + (e.passedTests || 0), 0);
  const totalFailed = currentRuns.reduce((s, e) => s + (e.failedTests || 0), 0);
  const totalTests = totalPassed + totalFailed;
  const avgDuration = currentRuns.length > 0 ?
    Math.round(currentRuns.reduce((s, e) => s + (e.duration || 0), 0) / currentRuns.length) : 0;
  const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  // ✅ ATUALIZAR ELEMENTOS DIRETAMENTE
  const totalPassedEl = document.getElementById('totalPassed');
  const totalFailedEl = document.getElementById('totalFailed');
  const avgDurationEl = document.getElementById('avgDuration');
  const successRateEl = document.getElementById('successRate');

  if (totalPassedEl) totalPassedEl.textContent = totalPassed;
  if (totalFailedEl) totalFailedEl.textContent = totalFailed;
  if (avgDurationEl) avgDurationEl.textContent = `${avgDuration}s`;
  if (successRateEl) successRateEl.textContent = `${successRate}%`;

  console.log('📊 Estatísticas atualizadas:', { totalPassed, totalFailed, avgDuration, successRate });
}

// Executar na inicialização
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(removeHardcodedTrends, 1000);
});

// Executar após refresh automático
if (window.__DASH_STATE__?.autoRefreshTimer) {
  const ns = window.__DASH_STATE__;
  const originalRefresh = ns.refresh || function () { };
  ns.refresh = function () {
    originalRefresh.apply(this, arguments);
    setTimeout(removeHardcodedTrends, 300);
  };
}


