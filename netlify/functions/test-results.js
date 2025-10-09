import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
      brand: data.brand, // 🔥 LOG DO BRAND
      totalTests: data.totalTests,
      testsCount: data.tests?.length || 0
    });

    // 🔥 Extrai o brand do payload (vindo do cypress.config.js)
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
      tests: Array.isArray(data.tests) ? data.tests : [], // Array com objetos de testes
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

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true, 
        runId: data.runId,
        brand: brand, // 🔥 Confirma o brand na resposta
        testsSaved: data.tests?.length || 0
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
