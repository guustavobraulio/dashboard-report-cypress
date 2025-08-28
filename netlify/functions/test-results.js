// netlify/functions/test-results.js
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const data = JSON.parse(event.body || '{}');
    console.log('[fn:test-results] payload received keys:', Object.keys(data));
    // TODO: persistir (DB/Blobs/KV). Por ora só confirma.
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('[fn:test-results] error:', e);
    return { statusCode: 500, body: e.message || 'Server error' };
  }
}
