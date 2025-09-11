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
  ns.historyPeriod = ns.historyPeriod || '7d'; // ✅ MUDANÇA: 7d por padrão
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

  // ===========================
  // Cards/Estatísticas (VERSÃO SIMPLES - SEM TRENDS)
  // ===========================
  // ===========================
  // Cards/Estatísticas (COM TRENDS FUNCIONANDO)
  // ===========================
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

    const currentData = { totalPassed, totalFailed, avgDuration, successRate };

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

  // ✅ FUNÇÕES DE TRENDS (adicionar no final da IIFE, antes de root.__DASH_API__)
  function calculateTrends(currentData, previousData) {
    const trends = {};

    for (const key in currentData) {
      const current = currentData[key] || 0;
      const previous = previousData[key] || 0;

      // ✅ CORREÇÃO: Baseline mais baixa e mais permissiva
      if (previous === 0) {
        // ✅ Usar valor mínimo de 1 para evitar divisão por zero
        const assumedPrevious = Math.max(1, current * 0.1); // 10% do valor atual como baseline
        const diff = current - assumedPrevious;
        const percent = Math.round((diff / assumedPrevious) * 100);

        // ✅ Limitar percentuais para valores razoáveis
        const cappedPercent = Math.min(Math.max(percent, -100), 100); // ✅ MUDANÇA: limite 100% em vez de 300%

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
        const cappedPercent = Math.min(Math.max(percent, -100), 100); // ✅ MUDANÇA: limite 100%

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

    const previousRuns = ns.executionsData.filter(r => {
      const runTime = new Date(r.date).getTime();
      return runTime >= previousWindow.start && runTime <= previousWindow.end;
    });

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

  function formatTrend(trendData) {
    if (!trendData || trendData.trend === undefined) {
      return '';
    }

    if (trendData.trend === 'new' || (trendData.change === null)) {
      return ''; // Não mostra nem emoji nem indicador
    }

    const arrow = trendData.trend === 'up' ? '↗️' : trendData.trend === 'down' ? '↘️' : '➡️';
    const color = trendData.trend === 'up' ? '#16a34a' : trendData.trend === 'down' ? '#dc2626' : '#6b7280';
    const sign = trendData.change > 0 ? '+' : '';

    return `<span class="trend-indicator" style="color: ${color}; font-size: 0.85em; margin-left: 8px;">${arrow} ${sign}${trendData.percent}%</span>`;
  }

  function updateTrendBadges(trends) {
    const tp = document.getElementById("totalPassed");
    const tf = document.getElementById("totalFailed");
    const ad = document.getElementById("avgDuration");
    const sr = document.getElementById("successRate");

    if (tp && trends.totalPassed) tp.innerHTML = `${trends.totalPassed.value}${formatTrend(trends.totalPassed)}`;
    if (tf && trends.totalFailed) tf.innerHTML = `${trends.totalFailed.value}${formatTrend(trends.totalFailed)}`;
    if (ad && trends.avgDuration) ad.innerHTML = `${trends.avgDuration.value}s${formatTrend(trends.avgDuration)}`;
    if (sr && trends.successRate) sr.innerHTML = `${trends.successRate.value}%${formatTrend(trends.successRate)}`;
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
    ensureButtonStructure();

    loadRuns()
      .catch(console.error)
      .finally(() => { startAutoRefreshCountdown(); });

    // ✅ CORREÇÃO: Event listener do pipeline com delay
    setTimeout(() => {
      const btn = document.getElementById("runPipelineBtn");
      if (btn) {
        // Remover listeners existentes para evitar duplicação
        btn.replaceWith(btn.cloneNode(true)); // Reset do botão
        const newBtn = document.getElementById("runPipelineBtn");

        // Adicionar listener
        newBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🚀 Botão pipeline clicado!');
          executarPipeline();
        });
        console.log('✅ Event listener do pipeline configurado');
      } else {
        console.error('❌ Botão runPipelineBtn não encontrado');
      }
    }, 1000); // ✅ Delay maior para garantir que o DOM está pronto

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

      const uniqMap = new Map();
      for (const r of runs || []) uniqMap.set(r.id, r);
      const uniq = Array.from(uniqMap.values());

      for (const r of uniq) {
        if (typeof r.date === 'number' && r.date < 1e12) r.date = r.date * 1000;
        const t = (typeof r.date === 'number') ? r.date : new Date(r.date).getTime();
        r.date = Number.isFinite(t) ? t : null;
      }

      window.__allRuns = uniq;

      ns.executionsData = uniq.slice();
      ns.filteredExecutions = filterRunsByPeriod(ns.executionsData, ns.historyPeriod);

      updateStatistics();
      initializeStatusChart();
      populateExecutionTable();

      console.log('loadRuns: total execs=', ns.executionsData.length, 'period=', ns.historyPeriod);
      console.log('filtered len=', ns.filteredExecutions.length);
      initializeHistoryChartFromRuns(ns.filteredExecutions);
    } catch (err) {
      console.error('Falha ao carregar execuções:', err);
    }
  }

  // ✅ EXPONHA A API (deve estar no final)
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
  console.log('✅ PageSpeed metrics module loaded');

  // Fechar modal clicando fora
  document.getElementById('metricsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'metricsModal') {
      closeMetricsPage();
    }
  });
});