async function sendResultsToDashboard(results) {
  if (!process.env.DASHBOARD_API_URL) {
    console.warn('[dashboard] DASHBOARD_API_URL ausente — envio pulado');
    return;
  }

  const payload = {
    runId: process.env.GITHUB_RUN_ID || `run-${Date.now()}`,
    timestamp: new Date().toISOString(),
    totalDuration: results.totalDuration,
    totalTests: results.totalTests,
    totalPassed: results.totalPassed,
    totalFailed: results.totalFailed,
    environment: process.env.ENVIRONMENT || 'staging',
    branch: process.env.GITHUB_REF_NAME || '',
    author: process.env.GITHUB_ACTOR || '',
    commit: process.env.GITHUB_SHA || '',
    githubRunUrl: process.env.GITHUB_RUN_ID
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '',
    // opcional: results.runs mapeado para tests detalhados
  };

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.API_TOKEN) headers.Authorization = `Bearer ${process.env.API_TOKEN}`;

  const url = `${process.env.DASHBOARD_API_URL}/.netlify/functions/test-results`;
  console.log('[dashboard] POST →', url);

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
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
    baseUrl: 'https://dash-report-cy.netlify.app/',

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
