import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendToTeams(data, brand) {
  try {
    const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
    
    if (!TEAMS_WEBHOOK_URL) {
      console.log('⚠️ [teams] TEAMS_WEBHOOK_URL não configurado');
      return;
    }

    console.log('📤 [teams] Preparando notificação...');

    // 🔥 Usa os valores do Cypress (totalPassed, totalFailed) em vez de contar manualmente
    const totalPassed = data.totalPassed || 0;
    const totalFailed = data.totalFailed || 0;
    const totalTests = data.totalTests || 0;

    // Filtra testes aprovados (para pegar os títulos)
    const passedList = (data.tests || [])
      .filter(t => t.status === 'passed' || t.state === 'passed')
      .map(t => t.name || t.title)
      .slice(0, 10);

    // Filtra testes reprovados (para pegar os títulos)
    const failedList = (data.tests || [])
      .filter(t => t.status === 'failed' || t.state === 'failed')
      .map(t => t.name || t.title);

    // Filtra testes skipped/pending (para pegar os títulos)
    const skippedList = (data.tests || [])
      .filter(t => {
        const status = (t.status || '').toLowerCase();
        const state = (t.state || '').toLowerCase();
        
        return status === 'skipped' || 
               status === 'pending' || 
               state === 'skipped' ||
               state === 'pending' ||
               t.pending === true;
      })
      .map(t => t.name || t.title);

    // 🔥 Calcula skipped pela diferença (mais confiável)
    let totalSkipped = totalTests - totalPassed - totalFailed;
    
    // Garante que não seja negativo
    if (totalSkipped < 0) totalSkipped = 0;

    console.log('✅ [teams] Aprovados:', totalPassed);
    console.log('❌ [teams] Reprovados:', totalFailed);
    console.log('⏭️ [teams] Ignorados:', totalSkipped);

    // Se não tiver títulos de skipped mas tiver skipped calculado, cria lista genérica
    if (totalSkipped > 0 && skippedList.length === 0) {
      for (let i = 0; i < Math.min(totalSkipped, 10); i++) {
        skippedList.push(`Teste ignorado/pendente ${i + 1}`);
      }
    }

    const durationSeconds = Math.floor((data.totalDuration || 0) / 1000);

    const teamsPayload = {
      client: brand,
      branch: data.branch || 'main',
      environment: data.environment || 'production',
      totalTests: totalTests,
      passedTests: totalPassed, // 🔥 USA O VALOR DO CYPRESS
      failedTests: totalFailed, // 🔥 USA O VALOR DO CYPRESS
      skippedTests: totalSkipped, // 🔥 USA O VALOR CALCULADO
      duration: durationSeconds,
      timestamp: data.timestamp || new Date().toISOString(),
      passedList,
      failedList,
      skippedList,
      socialPanelUrl: process.env.URL || 'https://dash-report-cy.netlify.app',
      author: data.author || 'Sistema'
    };

    console.log('📊 [teams] Resumo que será enviado:', {
      client: brand,
      total: teamsPayload.totalTests,
      passed: teamsPayload.passedTests,
      failed: teamsPayload.failedTests,
      skipped: teamsPayload.skippedTests,
      author: teamsPayload.author
    });

    const functionUrl = `${process.env.URL}/.netlify/functions/send-teams-notification`;
    
    const axios = (await import('axios')).default;
    
    const response = await axios.post(
      functionUrl,
      teamsPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      }
    );

    if (response.status === 200) {
      console.log('✅ [teams] Notificação enviada com sucesso!');
    }

    return response.data;

  } catch (error) {
    console.error('❌ [teams] ERRO:', error.message);
    throw error;
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');

    if (!data.runId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'runId é obrigatório' })
      };
    }

    console.log('📊 [test-results] Recebendo payload:', {
      runId: data.runId,
      brand: data.brand,
      totalTests: data.totalTests,
      totalPassed: data.totalPassed,
      totalFailed: data.totalFailed,
      testsCount: data.tests?.length || 0,
      author: data.author
    });

    const brand = data.brand || 'Sem marca';
    
    const row = {
      id: data.runId,
      timestamp: data.timestamp || new Date().toISOString(),
      total_duration_ms: data.totalDuration ?? 0,
      total_tests: data.totalTests ?? 0,
      total_passed: data.totalPassed ?? 0,
      total_failed: data.totalFailed ?? 0,
      branch: data.branch || '',
      environment: data.environment || '',
      author: data.author || '',
      commit: data.commit || '',
      github_run_url: data.githubRunUrl || '',
      brand: brand,
      tests: Array.isArray(data.tests) ? data.tests : [],
      logs: Array.isArray(data.logs) ? data.logs : [],
      artifacts: Array.isArray(data.artifacts) ? data.artifacts : []
    };

    console.log('💾 [test-results] Salvando no Supabase...');

    const { error } = await supabase
      .from('tabela_runs')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('❌ [test-results] Erro ao salvar:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Erro ao salvar no banco',
          details: error.message
        })
      };
    }

    console.log('✅ [test-results] Dados salvos!');
    console.log('🔔 [test-results] Iniciando envio ao Teams...');
    
    try {
      await sendToTeams(data, brand);
      console.log('✅ [teams] Teams concluído!');
    } catch (teamsError) {
      console.error('❌ [test-results] Erro no Teams:', teamsError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        runId: data.runId,
        brand: brand,
        author: data.author,
        testsSaved: data.tests?.length || 0,
        teamsNotificationQueued: true,
        timestamp: new Date().toISOString()
      })
    };

  } catch (e) {
    console.error('❌ [test-results] Erro:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: e.message || 'Server error'
      })
    };
  }
}
