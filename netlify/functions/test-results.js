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
      return { statusCode: 400, body: 'runId é obrigatório' };
    }

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
      tests: Array.isArray(data.tests) ? data.tests : [],
      logs: Array.isArray(data.logs) ? data.logs : [],
      artifacts: Array.isArray(data.artifacts) ? data.artifacts : []
    };

    const { error } = await supabase
      .from('tabela_runs')  // Confirme o nome correto da tabela
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('[fn:test-results] supabase upsert error:', error);
      return { statusCode: 500, body: 'DB error' };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('[fn:test-results] error:', e);
    return { statusCode: 500, body: e.message || 'Server error' };
  }
}
