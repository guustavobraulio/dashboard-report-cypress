// netlify/functions/get-results.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;

const READ_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cria cliente do Supabase com url e chave apropriada
const supabase = createClient(SUPABASE_URL, READ_KEY);

export async function handler(event) {
  try {
    const url = new URL(event.rawUrl);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    const { data, error } = await supabase
      .from('tabela_runs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[fn:get-results] supabase select error:', error);
      // return { statusCode: 500, body: 'DB error' };
      return { statusCode: 500, body: JSON.stringify(error) };
    }

    const out = (data || []).map(r => ({
      runId: r.id,
      timestamp: r.timestamp,
      totalDuration: r.total_duration_ms,
      totalTests: r.total_tests,
      totalPassed: r.total_passed,
      totalFailed: r.total_failed,
      branch: r.branch,
      environment: r.environment,
      author: r.author,
      commit: r.commit,
      githubRunUrl: r.github_run_url,
      tests: r.tests || [],
      logs: r.logs || [],
      artifacts: r.artifacts || []
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(out)
    };
  } catch (e) {
    console.error('[fn:get-results] error:', e);
    return { statusCode: 500, body: e.message || 'Server error' };
  }
}
