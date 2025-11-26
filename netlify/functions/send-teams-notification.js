const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Tratamento para preflight OPTIONS
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
    
    // Configuração da URL (Pode vir do ambiente ou do payload se necessário)
    // IMPORTANTE: Certifique-se que esta variavel aponta para a URL do WORKFLOW do Teams
    const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    
    if (!TEAMS_WEBHOOK_URL) {
      throw new Error('URL do Webhook não configurada (TEAMS_WEBHOOK_URL)');
    }

    // Normalização dos dados
    const stats = {
      total: data.totalTests || 0,
      passed: data.passedTests || 0,
      failed: data.failedTests || 0,
      skipped: data.skippedTests || 0,
      duration: data.duration || 0,
      environment: data.environment || 'N/A',
      author: data.author || 'Sistema'
    };

    // Definição de Cor e Status
    let statusColor = "Good"; // Verde
    let statusText = "Sucesso ✅";
    
    if (stats.failed > 0) {
      statusColor = "Attention"; // Vermelho
      statusText = "Falha ❌";
    } else if (stats.skipped > 0 && stats.passed === 0) {
      statusColor = "Warning"; // Amarelo
      statusText = "Ignorado ⚠️";
    }

    // Montagem da Lista de Falhas (se houver)
    const failedItems = (data.failedList || []).map(test => ({
      type: "TextBlock",
      text: `❌ **${test.title || test}**`,
      wrap: true,
      color: "Attention",
      size: "Small"
    }));

    // Construção do Adaptive Card
    const adaptiveCard = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        {
          type: "Container",
          items: [
            {
              type: "TextBlock",
              text: `Relatório de Testes Cypress - ${data.client || 'Projeto'}`,
              weight: "Bolder",
              size: "Medium"
            },
            {
              type: "TextBlock",
              text: `Status: ${statusText}`,
              weight: "Bolder",
              size: "Default",
              color: statusColor
            }
          ]
        },
        {
          type: "FactSet",
          facts: [
            { title: "Ambiente", value: stats.environment },
            { title: "Autor", value: stats.author },
            { title: "Duração", value: `${(stats.duration / 1000).toFixed(2)}s` }
          ]
        },
        {
          type: "FactSet",
          facts: [
            { title: "Total", value: stats.total.toString() },
            { title: "Passou", value: stats.passed.toString() },
            { title: "Falhou", value: stats.failed.toString() },
            { title: "Ignorados", value: stats.skipped.toString() }
          ]
        }
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Ver Relatório Completo",
          url: data.socialPanelUrl || "https://seu-ci-cd-url.com" // Fallback se não tiver URL
        }
      ]
    };

    // Se houver falhas, adiciona a lista no card
    if (failedItems.length > 0) {
      adaptiveCard.body.push({
        type: "Container",
        spacing: "Large",
        items: [
          {
            type: "TextBlock",
            text: "Detalhamento das Falhas:",
            weight: "Bolder"
          },
          ...failedItems.slice(0, 10) // Limita a 10 para não estourar o tamanho
        ]
      });
      
      if (failedItems.length > 10) {
         adaptiveCard.body.push({
            type: "TextBlock",
            text: `... e mais ${failedItems.length - 10} erros.`,
            isSubtle: true,
            size: "Small"
         });
      }
    }

    // Payload formato para Workflows (Importante: estrutura específica)
    const payload = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: adaptiveCard
        }
      ]
    };

    console.log('[teams] Enviando Adaptive Card...');
    
    const response = await axios.post(TEAMS_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('[teams] ✅ Enviado! Status:', response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Relatório enviado ao Teams' })
    };

  } catch (error) {
    console.error('[teams] ❌ Erro:', error.message);
    if (error.response) {
        console.error('[teams] Detalhes:', JSON.stringify(error.response.data));
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
