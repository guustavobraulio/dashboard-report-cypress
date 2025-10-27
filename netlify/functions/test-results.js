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
      console.log('⚠️ TEAMS_WEBHOOK_URL não configurado, pulando notificação');
      return;
    }

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
      socialPanelUrl: process.env.URL || 'https://seu-painel.netlify.app',
      author: data.author || 'Sistema Automático',
      githubRunUrl: data.githubRunUrl || ''
    };

    console.log('📤 [test-results] Enviando notificação ao Teams...');
    console.log('📊 Resumo:', {
      client: brand,
      total: teamsPayload.totalTests,
      passed: teamsPayload.passedTests,
      failed: teamsPayload.failedTests
    });

    // Chama a função send-teams-notification
    const response = await fetch(`${process.env.URL}/.netlify/functions/send-teams-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teamsPayload)
    });

    if (response.ok) {
      console.log('✅ [test-results] Notificação enviada ao Teams com sucesso!');
    } else {
      const error = await response.text();
      console.warn('⚠️ [test-results] Falha ao enviar ao Teams:', error);
    }

  } catch (error) {
    console.warn('⚠️ [test-results] Erro ao enviar ao Teams (não crítico):', error.message);
  }
}

// ==========================================
// Handler principal
// ==========================================
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
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
      testsCount: data.tests?.length || 0
    });

    // 🔥 Extrai o brand do payload
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

    console.log('💾 [test-results] Salvando no Supabase com brand:', brand);

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
    // 🚀 NOVO: Envia notificação ao Teams
    // ==========================================
    // Executa em background (não espera resposta)
    sendToTeams(data, brand).catch(err => 
      console.log('Aviso: Teams notification falhou (não crítico):', err.message)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        runId: data.runId,
        brand: brand,
        testsSaved: data.tests?.length || 0,
        teamsNotificationQueued: true // Indica que notificação foi iniciada
      })
    };

  } catch (e) {
    console.error('❌ [test-results] Erro:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || 'Server error' })
    };
  }
  
}
