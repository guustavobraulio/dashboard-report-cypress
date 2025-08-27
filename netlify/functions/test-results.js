export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const data = JSON.parse(event.body || '{}');
    console.log('[fn] received run payload size:', Buffer.byteLength(event.body || ''), 'bytes');
    // TODO: salvar em storage/DB. Por enquanto, só confirma o recebimento.
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: e.message || 'Server error' };
  }
}
