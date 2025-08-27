// Cypress Test Dashboard JavaScript

// Mock data - in production this would come from an API
let executionsData = [
    {
        "id": "exec-001",
        "date": "2025-08-27T14:30:00Z",
        "status": "passed",
        "duration": 245,
        "totalTests": 8,
        "passedTests": 8,
        "failedTests": 0,
        "branch": "main",
        "environment": "staging",
        "commit": "a1b2c3d",
        "author": "João Silva",
        "githubUrl": "https://github.com/repo/actions/runs/123",
        "tests": [
            {"name": "Login com credenciais válidas", "status": "passed", "duration": 15},
            {"name": "Navegação menu principal", "status": "passed", "duration": 8},
            {"name": "Busca de produtos", "status": "passed", "duration": 12},
            {"name": "Adicionar item carrinho", "status": "passed", "duration": 18},
            {"name": "Processo checkout", "status": "passed", "duration": 45},
            {"name": "Validação dados usuário", "status": "passed", "duration": 22},
            {"name": "Logout sistema", "status": "passed", "duration": 5},
            {"name": "Responsividade mobile", "status": "passed", "duration": 120}
        ]
    },
    {
        "id": "exec-002", 
        "date": "2025-08-27T12:15:00Z",
        "status": "failed",
        "duration": 180,
        "totalTests": 6,
        "passedTests": 4,
        "failedTests": 2,
        "branch": "feature/payment",
        "environment": "dev",
        "commit": "x7y8z9a",
        "author": "Maria Santos",
        "githubUrl": "https://github.com/repo/actions/runs/124",
        "tests": [
            {"name": "Login sistema", "status": "passed", "duration": 12},
            {"name": "Seleção produtos", "status": "passed", "duration": 25},
            {"name": "Carrinho compras", "status": "passed", "duration": 18},
            {"name": "Processo pagamento", "status": "failed", "duration": 30, "error": "Element not found: .payment-button"},
            {"name": "Confirmação pedido", "status": "failed", "duration": 15, "error": "Timeout waiting for confirmation page"},
            {"name": "Email confirmação", "status": "passed", "duration": 80}
        ]
    },
    {
        "id": "exec-003",
        "date": "2025-08-27T10:45:00Z", 
        "status": "passed",
        "duration": 320,
        "totalTests": 12,
        "passedTests": 12,
        "failedTests": 0,
        "branch": "develop",
        "environment": "staging",
        "commit": "m5n6o7p",
        "author": "Pedro Costa",
        "githubUrl": "https://github.com/repo/actions/runs/125",
        "tests": [
            {"name": "Autenticação OAuth", "status": "passed", "duration": 25},
            {"name": "Dashboard admin", "status": "passed", "duration": 35},
            {"name": "Gestão usuários", "status": "passed", "duration": 40},
            {"name": "Relatórios vendas", "status": "passed", "duration": 55},
            {"name": "Configurações sistema", "status": "passed", "duration": 20},
            {"name": "Backup dados", "status": "passed", "duration": 45},
            {"name": "Notificações email", "status": "passed", "duration": 15},
            {"name": "API integração", "status": "passed", "duration": 30},
            {"name": "Performance carregamento", "status": "passed", "duration": 25},
            {"name": "Segurança dados", "status": "passed", "duration": 35},
            {"name": "Logs auditoria", "status": "passed", "duration": 10},
            {"name": "Monitoramento sistema", "status": "passed", "duration": 85}
        ]
    },
    {
        "id": "exec-004",
        "date": "2025-08-27T09:20:00Z",
        "status": "failed",
        "duration": 156,
        "totalTests": 5,
        "passedTests": 3,
        "failedTests": 2,
        "branch": "hotfix/login",
        "environment": "prod",
        "commit": "b4c5d6e",
        "author": "Ana Oliveira",
        "githubUrl": "https://github.com/repo/actions/runs/126",
        "tests": [
            {"name": "Login com email", "status": "passed", "duration": 18},
            {"name": "Login com username", "status": "failed", "duration": 25, "error": "Username field validation error"},
            {"name": "Recuperar senha", "status": "passed", "duration": 35},
            {"name": "Autenticação 2FA", "status": "failed", "duration": 40, "error": "2FA token validation timeout"},
            {"name": "Logout completo", "status": "passed", "duration": 38}
        ]
    },
    {
        "id": "exec-005",
        "date": "2025-08-27T08:15:00Z", 
        "status": "passed",
        "duration": 198,
        "totalTests": 10,
        "passedTests": 10,
        "failedTests": 0,
        "branch": "feature/auth",
        "environment": "dev",
        "commit": "f7g8h9i",
        "author": "Carlos Lima",
        "githubUrl": "https://github.com/repo/actions/runs/127",
        "tests": [
            {"name": "Registro novo usuário", "status": "passed", "duration": 22},
            {"name": "Validação email", "status": "passed", "duration": 18},
            {"name": "Ativação conta", "status": "passed", "duration": 15},
            {"name": "Login primeiro acesso", "status": "passed", "duration": 20},
            {"name": "Perfil usuário", "status": "passed", "duration": 25},
            {"name": "Alteração senha", "status": "passed", "duration": 30},
            {"name": "Upload avatar", "status": "passed", "duration": 28},
            {"name": "Configurações privacidade", "status": "passed", "duration": 16},
            {"name": "Notificações email", "status": "passed", "duration": 12},
            {"name": "Exclusão conta", "status": "passed", "duration": 12}
        ]
    }
];

// History data for the new chart
const historyData = {
    "24h": [
        {"time": "2025-08-27T08:00:00Z", "executions": 2, "tests": 15},
        {"time": "2025-08-27T10:00:00Z", "executions": 1, "tests": 12},
        {"time": "2025-08-27T12:00:00Z", "executions": 1, "tests": 6},
        {"time": "2025-08-27T14:00:00Z", "executions": 1, "tests": 8}
    ],
    "7d": [
        {"date": "2025-08-21", "executions": 12, "tests": 89},
        {"date": "2025-08-22", "executions": 8, "tests": 65},
        {"date": "2025-08-23", "executions": 15, "tests": 120},
        {"date": "2025-08-24", "executions": 6, "tests": 42},
        {"date": "2025-08-25", "executions": 3, "tests": 28},
        {"date": "2025-08-26", "executions": 10, "tests": 78},
        {"date": "2025-08-27", "executions": 5, "tests": 41}
    ],
    "30d": [
        {"date": "2025-07-28", "executions": 8, "tests": 65},
        {"date": "2025-07-29", "executions": 12, "tests": 89},
        {"date": "2025-07-30", "executions": 15, "tests": 120},
        {"date": "2025-07-31", "executions": 10, "tests": 78},
        {"date": "2025-08-01", "executions": 14, "tests": 112},
        {"date": "2025-08-02", "executions": 9, "tests": 72},
        {"date": "2025-08-03", "executions": 6, "tests": 45},
        {"date": "2025-08-04", "executions": 3, "tests": 28},
        {"date": "2025-08-05", "executions": 11, "tests": 87},
        {"date": "2025-08-06", "executions": 13, "tests": 104},
        {"date": "2025-08-07", "executions": 16, "tests": 128},
        {"date": "2025-08-08", "executions": 12, "tests": 96},
        {"date": "2025-08-09", "executions": 8, "tests": 64},
        {"date": "2025-08-10", "executions": 7, "tests": 56},
        {"date": "2025-08-11", "executions": 4, "tests": 32},
        {"date": "2025-08-12", "executions": 10, "tests": 80},
        {"date": "2025-08-13", "executions": 14, "tests": 112},
        {"date": "2025-08-14", "executions": 18, "tests": 144},
        {"date": "2025-08-15", "executions": 13, "tests": 104},
        {"date": "2025-08-16", "executions": 9, "tests": 72},
        {"date": "2025-08-17", "executions": 6, "tests": 48},
        {"date": "2025-08-18", "executions": 2, "tests": 16},
        {"date": "2025-08-19", "executions": 11, "tests": 88},
        {"date": "2025-08-20", "executions": 15, "tests": 120},
        {"date": "2025-08-21", "executions": 12, "tests": 89},
        {"date": "2025-08-22", "executions": 8, "tests": 65},
        {"date": "2025-08-23", "executions": 15, "tests": 120},
        {"date": "2025-08-24", "executions": 6, "tests": 42},
        {"date": "2025-08-25", "executions": 3, "tests": 28},
        {"date": "2025-08-26", "executions": 10, "tests": 78},
        {"date": "2025-08-27", "executions": 5, "tests": 41}
    ]
};

// Global variables
let statusChart = null;
let historyChart = null;
let filteredExecutions = [...executionsData];
let currentPage = 1;
let currentPeriod = '7d';
const itemsPerPage = 10;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeFilters();
    updateStatistics();
    initializeHistoryChart();
    initializeStatusChart();
    populateExecutionTable();
    setupEventListeners();
    startAutoRefresh();
});

// Initialize filter options
function initializeFilters() {
    const branches = [...new Set(executionsData.map(exec => exec.branch))];
    const environments = [...new Set(executionsData.map(exec => exec.environment))];
    
    const branchFilter = document.getElementById('branchFilter');
    const environmentFilter = document.getElementById('environmentFilter');
    
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch;
        option.textContent = branch;
        branchFilter.appendChild(option);
    });
    
    environments.forEach(env => {
        const option = document.createElement('option');
        option.value = env;
        option.textContent = env;
        environmentFilter.appendChild(option);
    });
}

// Update statistics cards
function updateStatistics() {
    const totalPassed = filteredExecutions.reduce((sum, exec) => sum + exec.passedTests, 0);
    const totalFailed = filteredExecutions.reduce((sum, exec) => sum + exec.failedTests, 0);
    const totalTests = totalPassed + totalFailed;
    const avgDuration = filteredExecutions.length > 0 
        ? Math.round(filteredExecutions.reduce((sum, exec) => sum + exec.duration, 0) / filteredExecutions.length)
        : 0;
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    document.getElementById('totalPassed').textContent = totalPassed;
    document.getElementById('totalFailed').textContent = totalFailed;
    document.getElementById('avgDuration').textContent = `${avgDuration}s`;
    document.getElementById('successRate').textContent = `${successRate}%`;
}

// Initialize history chart
function initializeHistoryChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    if (historyChart) {
        historyChart.destroy();
    }
    
    const data = historyData[currentPeriod];
    const labels = data.map(item => {
        if (currentPeriod === '24h') {
            return new Date(item.time).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else {
            return new Date(item.date).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit' 
            });
        }
    });
    const executionsData = data.map(item => item.executions);
    
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Execuções',
                data: executionsData,
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderColor: '#28a745',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#28a745',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const executions = data[dataIndex].executions;
                            const tests = data[dataIndex].tests;
                            return [
                                `Execuções: ${executions}`,
                                `Testes: ${tests}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: currentPeriod === '24h' ? 'Hora' : 'Data'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Número de Execuções'
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            elements: {
                point: {
                    hoverRadius: 8
                }
            }
        }
    });
}

// Initialize pie chart
function initializeStatusChart() {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    const totalPassed = filteredExecutions.reduce((sum, exec) => sum + exec.passedTests, 0);
    const totalFailed = filteredExecutions.reduce((sum, exec) => sum + exec.failedTests, 0);
    
    if (statusChart) {
        statusChart.destroy();
    }
    
    statusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Aprovados', 'Falhados'],
            datasets: [{
                data: [totalPassed, totalFailed],
                backgroundColor: ['#1FB8CD', '#B4413C'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = totalPassed + totalFailed;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedIndex = elements[0].index;
                    const statusFilter = clickedIndex === 0 ? 'passed' : 'failed';
                    document.getElementById('statusFilter').value = statusFilter;
                    applyFilters();
                }
            }
        }
    });
}

// Change period for history chart
function changePeriod(period) {
    currentPeriod = period;
    
    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('period-btn--active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('period-btn--active');
    
    // Update chart
    initializeHistoryChart();
}

// Populate execution table
function populateExecutionTable() {
    const tbody = document.getElementById('executionTableBody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageExecutions = filteredExecutions.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    pageExecutions.forEach(execution => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${execution.id}</code></td>
            <td>${formatDateTime(execution.date)}</td>
            <td><code>${execution.branch}</code></td>
            <td><span class="status status--info">${execution.environment}</span></td>
            <td><span class="status status--${execution.status}">${execution.status === 'passed' ? 'Aprovado' : 'Falhado'}</span></td>
            <td>${execution.passedTests}/${execution.totalTests}</td>
            <td>${execution.duration}s</td>
            <td>
                <button class="action-btn action-btn--view" data-execution-id="${execution.id}">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners to all view buttons
    document.querySelectorAll('.action-btn--view').forEach(btn => {
        btn.addEventListener('click', function() {
            const executionId = this.getAttribute('data-execution-id');
            openExecutionModal(executionId);
        });
    });
    
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Anterior';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    pagination.appendChild(prevBtn);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = i === currentPage ? 'active' : '';
            pageBtn.onclick = () => changePage(i);
            pagination.appendChild(pageBtn);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0 8px';
            pagination.appendChild(ellipsis);
        }
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Próxima →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    pagination.appendChild(nextBtn);
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        populateExecutionTable();
    }
}

// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Apply filters
function applyFilters() {
    const branchFilter = document.getElementById('branchFilter').value;
    const environmentFilter = document.getElementById('environmentFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    filteredExecutions = executionsData.filter(execution => {
        if (branchFilter && execution.branch !== branchFilter) return false;
        if (environmentFilter && execution.environment !== environmentFilter) return false;
        if (statusFilter && execution.status !== statusFilter) return false;
        if (dateFilter && !execution.date.startsWith(dateFilter)) return false;
        return true;
    });
    
    currentPage = 1;
    updateStatistics();
    initializeStatusChart();
    populateExecutionTable();
}

// Open execution modal
function openExecutionModal(executionId) {
    console.log('Opening modal for execution:', executionId);
    const execution = executionsData.find(exec => exec.id === executionId);
    if (!execution) {
        console.error('Execution not found:', executionId);
        return;
    }
    
    // Populate overview tab
    document.getElementById('modalExecutionId').textContent = execution.id;
    document.getElementById('modalExecutionDate').textContent = formatDateTime(execution.date);
    document.getElementById('modalExecutionBranch').textContent = execution.branch;
    document.getElementById('modalExecutionEnvironment').textContent = execution.environment;
    document.getElementById('modalExecutionAuthor').textContent = execution.author;
    document.getElementById('modalExecutionCommit').textContent = execution.commit;
    document.getElementById('modalExecutionDuration').textContent = `${execution.duration}s`;
    document.getElementById('modalExecutionStatus').innerHTML = `<span class="status status--${execution.status}">${execution.status === 'passed' ? 'Aprovado' : 'Falhado'}</span>`;
    document.getElementById('modalGithubLink').href = execution.githubUrl;
    
    // Populate tests tab
    const testsList = document.getElementById('modalTestsList');
    testsList.innerHTML = '';
    
    execution.tests.forEach(test => {
        const testItem = document.createElement('div');
        testItem.className = `test-item test-item--${test.status}`;
        testItem.innerHTML = `
            <div class="test-info">
                <div class="test-name">${test.name}</div>
                ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
            </div>
            <div class="test-duration">${test.duration}s</div>
        `;
        testsList.appendChild(testItem);
    });
    
    // Populate logs tab
    const failedTests = execution.tests.filter(test => test.error);
    let logs = '';
    
    if (failedTests.length > 0) {
        logs = failedTests.map(test => 
            `[ERROR] ${formatDateTime(execution.date)} - ${test.name}\n` +
            `   Status: FAILED\n` +
            `   Error: ${test.error}\n` +
            `   Duration: ${test.duration}s\n` +
            `   Stack trace: at cypress/integration/spec.js:${Math.floor(Math.random() * 100 + 1)}\n`
        ).join('\n');
    } else {
        logs = `[INFO] ${formatDateTime(execution.date)} - Execução concluída com sucesso\n` +
               `[INFO] Total de testes: ${execution.totalTests}\n` +
               `[INFO] Testes aprovados: ${execution.passedTests}\n` +
               `[INFO] Duração total: ${execution.duration}s\n` +
               `[INFO] Nenhum erro encontrado nos logs.`;
    }
    
    document.getElementById('modalLogs').textContent = logs;
    
    // Show modal
    const modal = document.getElementById('executionModal');
    if (modal) {
        console.log('Modal element found, removing hidden class');
        modal.classList.remove('hidden');
        // Force display
        modal.style.display = 'flex';
    } else {
        console.error('Modal element not found');
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('executionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    
    // Reset to first tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('tab-button--active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('tab-panel--active'));
    
    const overviewTab = document.querySelector('.tab-button[data-tab="overview"]');
    const overviewPanel = document.getElementById('overview-tab');
    
    if (overviewTab) overviewTab.classList.add('tab-button--active');
    if (overviewPanel) overviewPanel.classList.add('tab-panel--active');
}

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('tab-button--active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('tab-panel--active'));
    
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    const targetPanel = document.getElementById(`${tabName}-tab`);
    
    if (targetButton) targetButton.classList.add('tab-button--active');
    if (targetPanel) targetPanel.classList.add('tab-panel--active');
}

// Simulate pipeline execution
async function runPipeline() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const runButton = document.getElementById('runPipelineBtn');
    
    loadingOverlay.classList.remove('hidden');
    runButton.disabled = true;
    runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executando...';
    
    // Simulate pipeline execution time (3-8 seconds)
    const executionTime = Math.random() * 5000 + 3000;
    
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // Generate new execution result
    const newExecution = {
        id: `exec-${String(executionsData.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString(),
        status: Math.random() > 0.3 ? 'passed' : 'failed',
        duration: Math.floor(Math.random() * 300 + 60),
        totalTests: Math.floor(Math.random() * 10 + 5),
        passedTests: 0,
        failedTests: 0,
        branch: 'main',
        environment: 'dev',
        commit: Math.random().toString(36).substr(2, 7),
        author: 'Usuário Atual',
        githubUrl: `https://github.com/repo/actions/runs/${Math.floor(Math.random() * 1000 + 128)}`,
        tests: []
    };
    
    // Generate test results
    const testNames = [
        'Login sistema',
        'Navegação principal',
        'Busca produtos',
        'Carrinho compras',
        'Processo checkout',
        'Validação dados',
        'Logout sistema',
        'Responsividade mobile',
        'Performance carregamento',
        'Segurança dados'
    ];
    
    for (let i = 0; i < newExecution.totalTests; i++) {
        const testStatus = newExecution.status === 'passed' ? 'passed' : (Math.random() > 0.7 ? 'failed' : 'passed');
        const test = {
            name: testNames[i % testNames.length] + ` ${i + 1}`,
            status: testStatus,
            duration: Math.floor(Math.random() * 60 + 5)
        };
        
        if (testStatus === 'failed') {
            const errors = [
                'Elemento não encontrado: .submit-button',
                'Timeout aguardando elemento aparecer',
                'Falha na validação de dados',
                'Erro de conexão com API',
                'Elemento não clicável'
            ];
            test.error = errors[Math.floor(Math.random() * errors.length)];
            newExecution.failedTests++;
        } else {
            newExecution.passedTests++;
        }
        
        newExecution.tests.push(test);
    }
    
    // Add to executions data
    executionsData.unshift(newExecution);
    
    loadingOverlay.classList.add('hidden');
    runButton.disabled = false;
    runButton.innerHTML = '<i class="fas fa-play"></i> Executar Pipeline';
    
    // Refresh dashboard
    filteredExecutions = [...executionsData];
    currentPage = 1;
    updateStatistics();
    initializeStatusChart();
    populateExecutionTable();
    
    // Show success message
    const statusText = newExecution.status === 'passed' ? 'sucesso' : 'com falhas';
    alert(`Pipeline executada com ${statusText}! Os resultados foram atualizados no dashboard.`);
}

// Start auto-refresh
function startAutoRefresh() {
    setInterval(() => {
        console.log('Auto-refresh triggered');
        const refreshIcon = document.getElementById('refreshIcon');
        if (refreshIcon) {
            refreshIcon.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshIcon.style.transform = 'rotate(0deg)';
            }, 300);
        }
    }, 30000);
}

// Setup event listeners
function setupEventListeners() {
    // Filter change events
    document.getElementById('branchFilter').addEventListener('change', applyFilters);
    document.getElementById('environmentFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    
    // Period filter buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            changePeriod(btn.dataset.period);
        });
    });
    
    // Run pipeline button
    document.getElementById('runPipelineBtn').addEventListener('click', runPipeline);
    
    // Modal events
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    // Modal backdrop click
    const modal = document.getElementById('executionModal');
    if (modal) {
        const modalBackdrop = modal.querySelector('.modal-backdrop');
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', closeModal);
        }
    }
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.tab);
        });
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// Make functions globally accessible for onclick handlers
window.openExecutionModal = openExecutionModal;
window.closeModal = closeModal;
window.changePage = changePage;
window.changePeriod = changePeriod;