// netlify/functions/page-speed.js
exports.handler = async (event, context) => {
  // Headers CORS para permitir chamadas do frontend
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Responder OPTIONS (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Verificar se é POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
    };
  }

  try {
    // Extrair URL do corpo da requisição
    const { url } = JSON.parse(event.body);
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL é obrigatória' })
      };
    }

    // 🔐 API Key segura no ambiente do servidor
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API Key não configurada no servidor' })
      };
    }

    // Construir URL da API Google PageSpeed
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&category=performance&category=accessibility&category=best-practices&category=seo&strategy=mobile`;
    
    console.log(`📊 Buscando PageSpeed para: ${url}`);
    
    // Fazer chamada para Google PageSpeed API
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ PageSpeed obtido com sucesso para: ${url}`);
    
    // Retornar dados para o frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('❌ Erro na função PageSpeed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro ao buscar dados do PageSpeed',
        details: error.message 
      })
    };
  }
};
