const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    
    console.log('[teams] Dados recebidos:', {
      client: data.client,
      runId: data.runId,
      totalTests: data.totalTests,
      failedTests: data.failedTests
    });
    
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
    
    if (!N8N_WEBHOOK_URL) {
      console.error('[teams] N8N_WEBHOOK_URL não configurado');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'N8N_WEBHOOK_URL não configurado' })
      };
    }

    // 🔥 BUSCA OS TESTES REAIS DO SUPABASE
    let failedList = [];
    let passedList = [];
    
    if (data.runId) {
      console.log('[teams] Buscando testes do Supabase...');
      
      const { data: runData, error } = await supabase
        .from('tabela_runs')
        .select('tests')
        .eq('id', data.runId)
        .single();
      
      if (error) {
        console.error('[teams] Erro ao buscar do Supabase:', error);
      } else if (runData && runData.tests) {
        console.log('[teams] Testes encontrados:', runData.tests.length);
        
        // Extrai os títulos dos testes que falharam
        failedList = runData.tests
          .filter(test => test.state === 'failed' || test.error)
          .map(test => test.title || test.name || 'Teste sem título');
        
        // Extrai os títulos dos testes que passaram
        passedList = runData.tests
          .filter(test => test.state === 'passed' && !test.error)
          .map(test => test.title || test.name || 'Teste sem título');
        
        console.log('[teams] Testes reprovados:', failedList.length);
        console.log('[teams] Testes aprovados:', passedList.length);
      }
    }

    // Monta o payload com os títulos reais
    const payload = {
      ...data,
      failedList: failedList,
      passedList: passedList
    };

    console.log('[teams] Enviando para N8N...');
    console.log('[teams] Testes reprovados que serão enviados:', failedList);

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    console.log('[teams] Sucesso! Status:', response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Enviado via N8N!',
        failedTests: failedList.length,
        passedTests: passedList.length
      })
    };
  } catch (error) {
    console.error('[teams] Erro:', error.message);
    if (error.response) {
      console.error('[teams] Status:', error.response.status);
      console.error('[teams] Data:', error.response.data);
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
