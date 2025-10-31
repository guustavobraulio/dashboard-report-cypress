import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendToTeams(data, brand) {
  try {
    const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
    
    if (!TEAMS_WEBHOOK_URL) {
      console.log('⚠️ [test-results] TEAMS_WEBHOOK_URL não configurado');
      return;
    }

    console.log('📤 [test-results] Preparando para notificar Teams...');

    const totalPassed = data.totalPassed || 0;
    const totalFailed = data.totalFailed || 0;
    const totalTests = data.totalTests || 0;

    // Filtra testes aprovados
    const passedList = (data.tests || [])
      .filter(t => t.status === 'passed' || t.state === 'passed')
      .map(t => t.name || t.title)
      .slice(0, 10);

    // Filtra testes reprovados
    const failedList = (data.tests || [])
      .filter(t => t.status === 'failed' || t.state === 'failed')
      .map(t => t.name || t.title);

    // Filtra testes skipped/pending
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

    // 🔥 Calcula skipped pela diferença (confiável)
    let totalSkipped = totalTests - totalPassed - totalFailed;
    if (totalSkipped < 0) totalSkipped = 0;

    console.log('✅ [test-results] Aprovados:', totalPassed);
    console.log('❌ [test-results] Reprovados:', totalFailed);
    console.log('⏭️ [test-results] Ignorados:', totalSkipped);

    // Se não tiver títulos, cria lista genérica
    if (totalSkipped > 0 && skippedList.length === 0) {
      for (let i = 0; i < Math.min(totalSkipped, 10); i++) {
        skippedList.push(`Teste ignorado/pendente ${i + 1}`);
      }
    }

    const durationSeconds = Math.floor((data.totalDuration || 0) / 1000);

    // 🔥 FORMATA DATA E HORA
    const timestamp = data.timestamp || new Date().toISOString();
    const dateObj = new Date(timestamp);
    
    // Opção 1: Formato brasileiro (recomendado)
    const formattedDate = dateObj.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Opção 2: Formato ISO (se preferir)
    // const formattedDate = dateObj.toISOString();

    console.log('📅 [test-results] Data/Hora formatada:', formattedDate);

    const teamsPayload = {
      client: brand,
      branch: data.branch || 'main',
      environment: data.environment || 'production',
      totalTests: totalTests,
      passedTests: totalPassed,
      failedTests: totalFailed,
      skippedTests: totalSkipped,
      duration: durationSeconds,
      timestamp: timestamp, // timestamp original (ISO)
      formattedDate: formattedDate, // 🔥 NOVO: Data/hora formatada
      passedList,
      failedList,
      skippedList,
      socialPanelUrl: process.env.URL || 'https://dash-report-cy.netlify.app',
      author: data.author || 'Sistema'
    };

    console.log('📊 [test-results] Payload pronto para Teams:', {
      client: brand,
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      author: data.author,
      formattedDate: formattedDate // 🔥 NOVO
    });

    // 🔥 CHAMA send-teams-notification.js
    const axios = (await import('axios')).default;
    const teamsNotifierUrl = `${process.env.URL}/.netlify/functions/send-teams-notification`;
    
    console.log('📤 [test-results] Chamando Teams notifier em:', teamsNotifierUrl);

    const response = await axios.post(teamsNotifierUrl, teamsPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000 // 30 segundos
    });

    if (response.status === 200) {
      console.log('✅ [test-results] Teams notificador respondeu com sucesso!');
      console.log('✅ [test-results] Resposta:', response.data);
    }

    return response.data;

  } catch (error) {
    console.error('❌ [test-results] Erro no Teams:', error.message);
    if (error.response) {
      console.error('❌ [test-results] Status HTTP:', error.response.status);
      console.error('❌ [test-results] Resposta:', JSON.stringify(error.response.data));
    }
    // Não joga erro, só loga - para não quebrar o fluxo principal
    return null;
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

    console.log('📊 [test-results] ========== Recebendo Payload ==========');
    console.log('📊 [test-results] runId:', data.runId);
    console.log('📊 [test-results] brand:', data.brand);
    console.log('📊 [test-results] totalTests:', data.totalTests);
    console.log('📊 [test-results] totalPassed:', data.totalPassed);
    console.log('📊 [test-results] totalFailed:', data.totalFailed);
    console.log('📊 [test-results] testsArray count:', data.tests?.length || 0);
    console.log('📊 [test-results] author:', data.author);

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

    console.log('💾 [test-results] Preparando para salvar no Supabase...');

    const { error } = await supabase
      .from('tabela_runs')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('❌ [test-results] Erro ao salvar no Supabase:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Erro ao salvar no banco',
          details: error.message
        })
      };
    }

    console.log('✅ [test-results] Dados salvos no Supabase com sucesso!');
    
    // 🔥 ENVIA NOTIFICAÇÃO PARA TEAMS
    try {
      console.log('🚀 [test-results] Iniciando envio para Teams...');
      await sendToTeams(data, brand);
      console.log('✅ [test-results] Fluxo de Teams concluído!');
    } catch (teamsError) {
      console.error('❌ [test-results] Erro ao enviar para Teams:', teamsError.message);
      // Continua mesmo se Teams falhar, pois o banco já foi salvo
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
        timestamp: new Date().toISOString(),
        message: 'Dados salvos e notificação enviada para Teams'
      })
    };

  } catch (e) {
    console.error('❌ [test-results] ERRO GERAL:', e);
    console.error('❌ [test-results] Stack:', e.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: e.message || 'Server error',
        timestamp: new Date().toISOString()
      })
    };
  }
}
