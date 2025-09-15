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

  // ===========================
  // Bootstrap/Inicialização
  // ===========================
  document.addEventListener("DOMContentLoaded", () => {
    setupPeriodButtons();
    setupEventListeners();

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
    // Listener para fechar modal
    document.addEventListener('click', function (e) {
      if (e.target.id === 'closeModal' ||
        e.target.closest('#closeModal') ||
        e.target.classList.contains('modal-backdrop')) {

        console.log('Fechando modal...');
        closeExecutionModal();
      }
    });
  

  // ✅ FUNÇÃO PARA CARREGAR ARTEFATOS  
  function loadArtifactsContent(execution) {
    const artifactsContainer = document.getElementById('modalArtifacts');
    
    if (execution?.status === 'failed') {
      artifactsContainer.innerHTML = `
        <div class="artifact-item">
          <i class="fas fa-image"></i>
          <div class="artifact-info">
            <h5>checkout-error.png</h5>
            <div class="artifact-type">Screenshot</div>
          </div>
          <button class="btn btn--sm btn--outline">📥 Download</button>
        </div>
        <div class="artifact-item">
          <i class="fas fa-video"></i>
          <div class="artifact-info">
            <h5>checkout-test.mp4</h5>
            <div class="artifact-type">Vídeo do Teste</div>
          </div>
          <button class="btn btn--sm btn--outline">📥 Download</button>
        </div>
        <div class="artifact-item">
          <i class="fas fa-file-alt"></i>
          <div class="artifact-info">
            <h5>mochawesome-report.html</h5>
            <div class="artifact-type">Relatório HTML</div>
          </div>
          <button class="btn btn--sm btn--outline">📥 Download</button>
        </div>
      `;
    } else {
      artifactsContainer.innerHTML = `
        <div class="artifact-item">
          <i class="fas fa-file-alt"></i>
          <div class="artifact-info">
            <h5>mochawesome-report.html</h5>
            <div class="artifact-type">Relatório HTML</div>
          </div>
          <button class="btn btn--sm btn--outline">📥 Download</button>
        </div>
        <div class="no-artifacts">
          <i>✅</i>
          <h3>Execução bem-sucedida!</h3>
          <p>Todos os testes passaram. Apenas relatório disponível.</p>
        </div>
      `;
    }
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

// ===========================
// PageSpeed API Functions (GLOBAIS)
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

async function fetchDetailedPageSpeed(url) {
  try {
    console.log(`📡 Chamando Netlify Function para: ${url}`);

    const response = await fetch('/api/page-speed', {
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

// Configuração das lojas
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


