import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cria cliente do Supabase usando a service_role_key para bypass RLS e permissão de escrita
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    
    if (!data.runId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'runId é obrigatório' }) };
    }

    console.log('📊 [test-results] Recebendo payload:', {
      runId: data.runId,
      totalTests: data.totalTests,
      testsCount: data.tests?.length || 0
    });

    const testsWithBrand = Array.isArray(data.tests) 
      ? data.tests.map(test => ({
          title: test.title || '',
          brand: test.brand || 'Sem marca', 
          state: test.state || 'unknown',
          duration: test.duration || 0,
          error: test.error || test.displayError || null
        }))
      : [];

    const uniqueBrands = [...new Set(testsWithBrand.map(t => t.brand))];
    console.log('🏷️ [test-results] Marcas capturadas:', uniqueBrands.join(', '));

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
      tests: testsWithBrand, // 🔥 TESTES COM BRAND!
      logs: Array.isArray(data.logs) ? data.logs : [],
      artifacts: Array.isArray(data.artifacts) ? data.artifacts : []
    };

    // Salva no Supabase
    const { error } = await supabase
      .from('tabela_runs')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('❌ [test-results] Erro ao salvar no Supabase:', error);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Erro ao salvar no banco de dados', details: error.message }) 
      };
    }

    console.log('✅ [test-results] Dados salvos com sucesso:', {
      runId: data.runId,
      tests: testsWithBrand.length,
      brands: uniqueBrands
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true, 
        runId: data.runId,
        testsSaved: testsWithBrand.length,
        brands: uniqueBrands
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
