const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

const NETLIFY_SITE_URL = process.env.NETLIFY_SITE_URL || 'https://dash-report-cy.netlify.app';

function getFailedScreenshotsPublicUrls() {
  const dir = path.join(process.cwd(), 'public', 'artifacts', 'screenshots');
  if (!fs.existsSync(dir)) return [];
  const files = [];

  function searchDir(d, prefix = '') {
    fs.readdirSync(d, { withFileTypes: true }).forEach(entry => {
      const fullPath = path.join(d, entry.name);
      if (entry.isFile() && entry.name.endsWith('.png')) {
        files.push(prefix + entry.name);
      } else if (entry.isDirectory()) {
        searchDir(fullPath, prefix + entry.name + '/');
      }
    });
  }
  searchDir(dir);

  return files.map(f =>
    `${NETLIFY_SITE_URL}/artifacts/screenshots/${encodeURIComponent(f)}`
  );
}

/**
 * 🔥 Extrai a marca do título do teste
 */
/**
 * 🔥 Extrai a marca do título do teste (VERSÃO MELHORADA)
 */
function extractBrandFromTitle(title) {
  if (!title) return 'Sem marca';

  // Padrão 1: [Marca] no início (case-insensitive)
  const bracketMatch = title.match(/^\[([^\]]+)\]/i);
  if (bracketMatch) {
    return bracketMatch[1].trim();
  }

  // Padrão 2: "- Marca" no final
  const dashMatch = title.match(/- ([^>]+)$/);
  if (dashMatch) {
    return dashMatch[1].trim();
  }

  // Padrão 3: Lista de marcas conhecidas (case-insensitive)
  const brandKeywords = [
    'VICTOR HUGO',
    'Marca A',
    'Marca B',
    'Marca C',
    'TESTE QA'
  ];

  // Busca case-insensitive
  const titleUpper = title.toUpperCase();
  for (const brand of brandKeywords) {
    if (titleUpper.includes(brand.toUpperCase())) {
      return brand; // Retorna com capitalização correta
    }
  }

  return 'Sem marca';
}

async function sendResultsToDashboard(results) {
  if (!process.env.DASHBOARD_API_URL) {
    console.warn('[dashboard] DASHBOARD_API_URL ausente — envio pulado');
    return;
  }

  const execNumber = Math.floor(Date.now() / 1000) % 1000;
  const runId = `Test-${execNumber.toString().padStart(3, '0')}`;

  // 🔥 Processa testes e extrai brands
  const testsWithBrand = Array.isArray(results.runs)
    ? results.runs.flatMap(run => (run.tests || []).map(t => {
      const title = Array.isArray(t.title) ? t.title.join(' > ') : (t.title || 'spec');
      const brand = extractBrandFromTitle(title);

      console.log(`  🏷️ "${title}" -> Brand: "${brand}"`);

      return {
        title,
        brand, // 🔥 CAMPO BRAND ADICIONADO!
        state: t.state || (t.pass ? 'passed' : (t.fail ? 'failed' : 'unknown')),
        duration: typeof t.duration === 'number' ? t.duration : 0,
        error: t.displayError || ''
      };
    }))
    : [];

  // 🔥 Extrai a marca predominante (primeira marca encontrada ou "Sem marca")
  const primaryBrand = testsWithBrand.find(t => t.brand !== 'Sem marca')?.brand || 'Sem marca';

  const uniqueBrands = [...new Set(testsWithBrand.map(t => t.brand))];
  console.log(`Marcas capturadas: ${uniqueBrands.join(', ')}`);
  console.log(`Marca principal desta execução: ${primaryBrand}`);

  const payload = {
    runId,
    timestamp: new Date().toISOString(),
    totalDuration: results.totalDuration,
    totalTests: results.totalTests,
    totalPassed: results.totalPassed,
    totalFailed: results.totalFailed,
    environment: process.env.ENVIRONMENT || '',
    branch: process.env.GITHUB_REF_NAME || '',
    author: process.env.GITHUB_ACTOR || '',
    commit: process.env.GITHUB_SHA || '',
    githubRunUrl: process.env.GITHUB_RUN_ID
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '',
    brand: primaryBrand, // 🔥 BRAND PRINCIPAL DA EXECUÇÃO
    tests: testsWithBrand, // 🔥 ARRAY DE TESTES COM BRAND
    logs: Array.isArray(results.runs)
      ? results.runs.flatMap(run => (run.tests || [])
        .filter(t => t.displayError)
        .map(t => `[ERROR] ${(Array.isArray(t.title) ? t.title.join(' > ') : t.title) || 'spec'}\n${t.displayError}`))
      : [],
    artifacts: getFailedScreenshotsPublicUrls(),
  };

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.API_TOKEN) headers.Authorization = `Bearer ${process.env.API_TOKEN}`;

  const url = `${process.env.DASHBOARD_API_URL}/.netlify/functions/test-results`;
  console.log('[dashboard] POST →', url);

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
    screenshotOnRunFailure: true,
    video: true,
    baseUrl: process.env.CYPRESS_baseUrl || 'https://dash-report-cy.netlify.app',

    setupNodeEvents(on, config) {
      on('after:run', async (results) => {
        if (!results) {
          console.log('⚠️ Modo interativo - results não disponível');
          return;
        }

        try {
          console.log('📊 Processando resultados com brands...');
          await sendResultsToDashboard(results);
        } catch (err) {
          console.error('[dashboard] Erro no envio:', err?.message || err);
        }
      });

      return config;
    },
  },
});
