// cypress.config.js (CJS)
const { defineConfig } = require('cypress');

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
  };

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.API_TOKEN) headers.Authorization = `Bearer ${process.env.API_TOKEN}`;

  const url = `${process.env.DASHBOARD_API_URL}/.netlify/functions/test-results`;
  console.log('[dashboard] POST →', url);

  // fetch em Node CJS
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[dashboard] Falha no envio: ${res.status} ${text}`);
  }
  console.log('[dashboard] Resultados enviados com sucesso');
}

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || 'https://dash-report-cy.netlify.app',
    setupNodeEvents(on, config) {
      on('after:run', async (results) => {
        try {
          await sendResultsToDashboard(results);
        } catch (err) {
          console.error('[dashboard] Erro no envio:', err?.message || err);
        }
      });
      return config;
    },
  },
});
