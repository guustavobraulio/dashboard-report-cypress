const { defineConfig } = require('cypress');

async function sendResultsToDashboard(results) {
  if (!process.env.DASHBOARD_API_URL) {
    console.warn('[dashboard] DASHBOARD_API_URL ausente — envio pulado');
    return;
  }

  const payload = {
    runId: process.env.GITHUB_RUN_ID ? `Test-${process.env.GITHUB_RUN_ID}` : `Test-${Date.now()}`,
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
    tests: Array.isArray(results.runs)
      ? results.runs.flatMap(run => (run.tests || []).map(t => ({
          title: Array.isArray(t.title) ? t.title.join(' > ') : (t.title || 'spec'),
          state: t.state || (t.pass ? 'passed' : (t.fail ? 'failed' : 'unknown')),
          duration: typeof t.duration === 'number' ? t.duration : 0,
          error: t.displayError || ''
        })))
      : [],
    logs: Array.isArray(results.runs)
      ? results.runs.flatMap(run => (run.tests || [])
          .filter(t => t.displayError)
          .map(t => `[ERROR] ${(Array.isArray(t.title) ? t.title.join(' > ') : t.title) || 'spec'}\n${t.displayError}`))
      : [],
    artifacts: []
  };

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.API_TOKEN) headers.Authorization = `Bearer ${process.env.API_TOKEN}`;

  const url = `${process.env.DASHBOARD_API_URL}/.netlify/functions/test-results`;
  console.log('[dashboard] POST →', url);
  console.log('[dashboard] Payload:', payload);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  console.log('[dashboard] Resposta:', res.status, await res.text());
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
