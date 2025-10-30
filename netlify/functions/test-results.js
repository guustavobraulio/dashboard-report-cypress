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

    // Filtra testes aprovados
    const passedList = (data.tests || [])
      .filter(t => t.status === 'passed' || t.state === 'passed')
      .map(t => t.name || t.title)
      .slice(0, 10);

    // Filtra testes reprovados
    const failedList = (data.tests || [])
      .filter(t => t.status === 'failed' || t.state === 'failed')
      .map(t => t.name || t.title);

    // 🆕 Filtra testes skipped/pending
    const skippedList = (data.tests || [])
      .filter(t => 
        t.status === 'skipped' || 
        t.state === 'skipped' || 
        t.status === 'pending' || 
        t.state === 'pending'
      )
      .map(t => t.name || t.title);

    // 🆕 Contabiliza os skipped
    const totalSkipped = skippedList.length;

    const durationSeconds = Math.floor((data.totalDuration || 0) / 1000);

    const teamsPayload = {
      client: brand,
      branch: data.branch || 'main',
      environment: data.environment || 'production',
      totalTests: data.totalTests || 0,
      passedTests: data.totalPassed || 0,
      failedTests: data.totalFailed || 0,
      skippedTests: totalSkipped, // 🆕 ADICIONAR
      duration: durationSeconds,
      timestamp: data.timestamp || new Date().toISOString(),
      passedList,
      failedList,
      skippedList, // 🆕 ADICIONAR
      socialPanelUrl: process.env.URL || 'https://dash-report-cy.netlify.app',
      author: data.author || 'Sistema'
    };

    console.log('📊 [teams] Resumo:', {
      client: brand,
      total: teamsPayload.totalTests,
      passed: teamsPayload.passedTests,
      failed: teamsPayload.failedTests,
      skipped: teamsPayload.skippedTests // 🆕 LOG
    });

    // Log detalhado da URL e payload
    const functionUrl = `${process.env.URL}/.netlify/functions/send-teams-notification`;
    console.log('🔗 [teams] URL da função:', functionUrl);
    console.log('📦 [teams] Payload size:', JSON.stringify(teamsPayload).length, 'bytes');

    const axios = (await import('axios')).default;
    console.log('✅ [teams] Axios importado');
    
    console.log('🚀 [teams] Enviando requisição...');
    
    const response = await axios.post(
      functionUrl,
      teamsPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000 // 20 segundos
      }
    );

    console.log('📬 [teams] Resposta recebida:', {
      status: response.status,
      data: response.data
    });

    if (response.status === 200) {
      console.log('✅ [teams] Notificação enviada com sucesso!');
    } else {
      console.warn('⚠️ [teams] Status inesperado:', response.status);
    }

    return response.data;

  } catch (error) {
    console.error('❌ [teams] ERRO CAPTURADO:', error.message);
    console.error('❌ [teams] Stack:', error.stack);
    
    if (error.response) {
      console.error('❌ [teams] Response status:', error.response.status);
      console.error('❌ [teams] Response data:', JSON.stringify(error.response.data));
    }
    
    if (error.code) {
      console.error('❌ [teams] Error code:', error.code);
    }
    
    throw error; // Re-lança para ver no log principal
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
      testsCount: data.tests?.length || 0
    });

    const brand = data.brand || 'Sem marca';
    console.log(`🏷️ [test-results] Brand: "${brand}"`);

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
    
    // Aguarda a conclusão com try/catch
    try {
      await sendToTeams(data, brand);
      console.log('✅ [test-results] Teams concluído!');
    } catch (teamsError) {
      console.error('❌ [test-results] Erro no Teams:', teamsError.message);
      // Continua mesmo se Teams falhar
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        runId: data.runId,
        brand: brand,
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
