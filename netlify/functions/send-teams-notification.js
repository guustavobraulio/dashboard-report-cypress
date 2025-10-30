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
    
    console.log('[teams] ========== Dados Recebidos ==========');
    console.log('[teams] Client:', data.client);
    console.log('[teams] Total Tests:', data.totalTests);
    console.log('[teams] Failed Tests:', data.failedTests);
    console.log('[teams] Failed List:', data.failedList);
    console.log('[teams] Author:', data.author);
    
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
    
    if (!N8N_WEBHOOK_URL) {
      console.error('[teams] N8N_WEBHOOK_URL não configurado');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'N8N_WEBHOOK_URL não configurado' })
      };
    }

    // ✅ SIMPLESMENTE USA OS DADOS QUE JÁ VIERAM DO test-results.js
    // Não precisa buscar novamente do Supabase!
    const payload = {
      client: data.client || 'Cypress',
      branch: data.branch || 'main',
      environment: data.environment || 'production',
      totalTests: data.totalTests || 0,
      passedTests: data.passedTests || 0,
      failedTests: data.failedTests || 0,
      duration: data.duration || 0,
      timestamp: data.timestamp,
      author: data.author || 'Sistema',
      failedList: data.failedList || [],  // ✅ Usa a lista que já vem com os títulos reais!
      passedList: data.passedList || [],
      socialPanelUrl: data.socialPanelUrl || ''
    };

    console.log('[teams] Enviando para N8N...');
    console.log('[teams] Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    console.log('[teams] ✅ Enviado com sucesso! Status:', response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Enviado via N8N!',
        failedTests: payload.failedList.length
      })
    };
  } catch (error) {
    console.error('[teams] ❌ Erro:', error.message);
    if (error.response) {
      console.error('[teams] Response status:', error.response.status);
      console.error('[teams] Response data:', error.response.data);
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message
      })
    };
  }
};
