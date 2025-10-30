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
    
    // 🔍 Validação de entrada
    if (!data.client || !data.totalTests) {
      console.error('[teams] Payload inválido:', { client: data.client, totalTests: data.totalTests });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payload inválido: faltam campos obrigatórios' })
      };
    }

    console.log('[teams] ========== Iniciando notificação ==========');
    console.log('[teams] Cliente:', data.client);
    console.log('[teams] Total de Testes:', data.totalTests);
    console.log('[teams] Passados:', data.passedTests);
    console.log('[teams] Falhados:', data.failedTests);
    console.log('[teams] Ignorados:', data.skippedTests);
    
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
    
    if (!N8N_WEBHOOK_URL) {
      console.error('[teams] ❌ N8N_WEBHOOK_URL não configurado');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'N8N_WEBHOOK_URL não configurado' })
      };
    }

    // 🔥 PAYLOAD PARA N8N (Repassa exatamente o que recebeu)
    const payload = {
      client: data.client,
      branch: data.branch || 'main',
      environment: data.environment || 'production',
      totalTests: data.totalTests,
      passedTests: data.passedTests || 0,
      failedTests: data.failedTests || 0,
      skippedTests: data.skippedTests || 0,
      duration: data.duration || 0,
      timestamp: data.timestamp,
      author: data.author || 'Sistema',
      failedList: Array.isArray(data.failedList) ? data.failedList : [],
      passedList: Array.isArray(data.passedList) ? data.passedList : [],
      skippedList: Array.isArray(data.skippedList) ? data.skippedList : [],
      socialPanelUrl: data.socialPanelUrl || ''
    };

    console.log('[teams] 📤 Enviando para N8N...');
    console.log('[teams] N8N URL:', N8N_WEBHOOK_URL.substring(0, 50) + '...');

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000 // 🔥 30 segundos
    });

    console.log('[teams] ✅ Enviado com sucesso! Status:', response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Notificação enviada para Teams via N8N',
        testedBy: data.author,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('[teams] ❌ ERRO GERAL:', error.message);
    
    if (error.response) {
      console.error('[teams] ❌ Status HTTP:', error.response.status);
      console.error('[teams] ❌ Resposta:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('[teams] ❌ Nenhuma resposta do servidor');
    }

    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
