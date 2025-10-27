import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ==========================================
// Função auxiliar para enviar ao Teams
// ==========================================
async function sendToTeams(data, brand) {
  try {
    const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
    
    if (!TEAMS_WEBHOOK_URL) {
      console.log('⚠️ [teams] TEAMS_WEBHOOK_URL não configurado, pulando notificação');
      return;
    }

    console.log('📤 [teams] Preparando notificação ao Teams...');

    // Prepara lista de testes aprovados e reprovados
    const passedList = (data.tests || [])
      .filter(t => t.status === 'passed' || t.state === 'passed')
      .map(t => t.name || t.title)
      .slice(0, 10);

    const failedList = (data.tests || [])
      .filter(t => t.status === 'failed' || t.state === 'failed')
      .map(t => t.name || t.title);

    // Calcula duração em segundos
    const durationSeconds = Math.floor((data.totalDuration || 0) / 1000);

    // Monta payload para a função de Teams
    const teamsPayload = {
      executionId: data.runId,
      client: brand,
      branch: data.branch || 'main',
      environment: data.environment || 'production',
      totalTests: data.totalTests || 0,
      passedTests: data.totalPassed || 0,
      failedTests: data.totalFailed || 0,
      duration: durationSeconds,
      timestamp: data.timestamp || new Date().toISOString(),
      passedList: passedList,
      failedList: failedList,
      socialPanelUrl: process.env.URL || 'https://dash-report-cy.netlify.app',
      author: data.author || 'Sistema Automático',
      githubRunUrl: data.githubRunUrl || ''
    };

    console.log('📊 [teams] Resumo dos testes:', {
      client: brand,
      total: teamsPayload.totalTests,
      passed: teamsPayload.passedTests,
      failed: teamsPayload.failedTests,
      duration: `${durationSeconds}s`
    });

    // Importa axios dinamicamente (compatível com ES modules)
    const axios = (await import('axios')).default;
    
    const response = await axios.post(
      `${process.env.URL}/.netlify/functions/send-teams-notification`,
      teamsPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 segundos
      }
    );

    if (response.status === 200) {
      console.log('✅ [teams] Notificação enviada ao Teams com sucesso!');
    } else {
      console.warn('⚠️ [teams] Resposta inesperada:', response.status);
    }

    return response.data;

  } catch (error) {
    console.warn('⚠️ [teams] Erro ao enviar notificação (não crítico):', error.message);
    if (error.response) {
      console.warn('⚠️ [teams] Detalhes:', {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

// ==========================================
// Handler principal
// ==========================================
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');

    // Validação: runId é obrigatório
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

    // Extrai o brand do payload
    const brand = data.brand || 'Sem marca';
    console.log(`🏷️ [test-results] Brand recebido: "${brand}"`);

    // Monta o objeto para salvar no Supabase
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

    // Salva no Supabase
    const { error } = await supabase
      .from('tabela_runs')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('❌ [test-results] Erro ao salvar no Supabase:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Erro ao salvar no banco de dados',
          details: error.message
        })
      };
    }

    console.log('✅ [test-results] Dados salvos com sucesso!', {
      runId: data.runId,
      brand: brand,
      tests: data.tests?.length || 0
    });

    // ==========================================
    // 🚀 Envia notificação ao Teams (background)
    // ==========================================
    // Executa sem esperar resposta (fire and forget)
    sendToTeams(data, brand).catch(err => {
      console.log('⚠️ [test-results] Teams notification falhou (não crítico):', err.message);
    });

    // Retorna sucesso imediatamente
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
    console.error('❌ [test-results] Erro no handler:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: e.message || 'Server error',
        stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
      })
    };
  }
}
