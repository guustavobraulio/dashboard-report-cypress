const fetch = require('node-fetch');

const GITHUB_OWNER = 'guustavobraulio';
const GITHUB_REPO = 'dashboard-report-cypress';
const WORKFLOW_FILE_NAME = 'pipeline.yml';
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

exports.handler = async function(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🚀 Disparando pipeline...');
    
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE_NAME}/dispatches`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { 
          environment: 'staging',
          triggered_by: 'dashboard'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro GitHub:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: `GitHub API error: ${error}` 
        })
      };
    }

    console.log('✅ Pipeline disparada!');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Pipeline disparada com sucesso!',
        repository: `${GITHUB_OWNER}/${GITHUB_REPO}`
      })
    };
  } catch (e) {
    console.error('❌ Erro:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: e.message 
      })
    };
  }
};
