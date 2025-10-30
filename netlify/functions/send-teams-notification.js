const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // URL do webhook do N8N (ou direto do Teams Incoming Webhook)
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || process.env.TEAMS_WEBHOOK_URL;
    
    if (!N8N_WEBHOOK_URL) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'N8N_WEBHOOK_URL não configurado' })
      };
    }

    console.log('[teams] Enviando via N8N...');

    // Envia os dados puros - N8N vai formatar
    await axios.post(N8N_WEBHOOK_URL, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    console.log('[teams] Enviado com sucesso!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Enviado via N8N!' })
    };
  } catch (error) {
    console.error('[teams] Erro:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
