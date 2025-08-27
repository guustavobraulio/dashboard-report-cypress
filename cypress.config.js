// cypress.config.js
const { defineConfig } = require('cypress');

// Função que monta o payload e envia os resultados para a API do dashboard
async function sendResultsToDashboard(results) {
  // Validação mínima para evitar erros locais
  if (!process.env.DASHBOARD_API_URL || !process.env.API_TOKEN) {
    console.warn('[dashboard] DASHBOARD_API_URL/API_TOKEN ausentes — envio pulado');
    return;
  }

  const runId = process.env.GITHUB_RUN_ID
    ? `gh-${process.env.GITHUB_RUN_ID}`
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const payload = {
    runId,
    timestamp: new Date().toISOString(),
    branch: process.env.GITHUB_REF_NAME || 'local',
    commit: process.env.GITHUB_SHA || 'local',
    author: process.env.GITHUB_ACTOR || 'local',
    environment: process.env.ENVIRONMENT || 'staging',
    totalDuration: results.totalDuration,
    totalTests: results.totalTests,
    totalPassed: results.totalPassed,
    totalFailed: results.totalFailed,
    totalPending: results.totalPending,
    totalSkipped: results.totalSkipped,
    githubRunUrl:
      process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
        ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null,
    tests: results.runs.flatMap((run) =>
      run.tests.map((t) => ({
        title: t.title.join(' > '),
        state: t.state,
        duration: t.duration,
        spec: run.spec.name,
        error: t.displayError || null,
      })),
    ),
  };

  // Envio simples com fetch nativo (Node 18+)
  const res = await fetch(`${process.env.DASHBOARD_API_URL}/api/test-results`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[dashboard] Falha no envio: ${res.status} ${text}`);
  }
  console.log('[dashboard] Resultados enviados com sucesso');
}

module.exports = defineConfig({
  // Caso use component testing também, mantenha esta seção apenas em e2e:
  e2e: {
    // Seu baseUrl pode ser sobrescrito pela pipeline via env se desejar
    baseUrl: 'https://seu-app.staging.com',

    // Aqui entra exatamente o bloco que você enviou, porém adaptado
    setupNodeEvents(on, config) {
      // Listener que roda ao término da execução (headless)
      on('after:run', async (results) => {
        try {
          // results contém todas as métricas agregadas da execução
          await sendResultsToDashboard(results);
        } catch (err) {
          console.error('[dashboard] Erro no envio:', err?.message || err);
        }
      });

      // Se quiser alterar config/env dinamicamente, retorne o config:
      // ex: config.env.ENVIRONMENT = process.env.ENVIRONMENT || 'staging';
      return config;
    },
  },
});
