// cypress.config.js
const { defineConfig } = require('cypress');

async function sendResultsToDashboard(results) {
  // Exigir apenas a URL; token é opcional
  if (!process.env.DASHBOARD_API_URL) {
    console.warn('[dashboard] DASHBOARD_API_URL ausente — envio pulado');
    return;
  }

  const runId = process.env.GITHUB_RUN_ID
    ? `gh-${process.env.GITHUB_RUN_ID}`
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const payload = { /* ... exatamente como já está ... */ };

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
  }

  const res = await fetch(`${process.env.DASHBOARD_API_URL}/api/test-results`, {
    method: 'POST',
    headers,
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
