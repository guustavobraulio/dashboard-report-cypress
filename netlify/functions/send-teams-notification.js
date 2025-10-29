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
    console.log('📬 [send-teams] Iniciando...');
    
    const data = JSON.parse(event.body);
    const {
      client, branch, environment, totalTests, passedTests, failedTests,
      duration, timestamp, passedList = [], failedList = [], socialPanelUrl, author
    } = data;

    if (totalTests === undefined || passedTests === undefined || failedTests === undefined) {
      throw new Error('Dados incompletos');
    }

    const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
    
    if (!TEAMS_WEBHOOK_URL) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'TEAMS_WEBHOOK_URL não configurado' })
      };
    }

    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    const statusEmoji = failedTests === 0 ? '✅' : '⚠️';
    const formattedDuration = duration >= 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`;
    const formattedTime = timestamp ? new Date(timestamp).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');

    const hour = new Date().getHours();
    let scheduleLabel = '🔄 Execução Manual';
    if (hour >= 7 && hour < 10) scheduleLabel = '🌅 Execução Matinal (08h)';
    else if (hour >= 11 && hour < 13) scheduleLabel = '☀️ Execução Meio-dia (12h)';
    else if (hour >= 15 && hour < 17) scheduleLabel = '🌤️ Execução Tarde (16h)';
    else if (hour >= 18 && hour < 21) scheduleLabel = '🌆 Execução Noite (19h)';

    // Cria o Adaptive Card
    const adaptiveCard = {
      "type": "AdaptiveCard",
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.4",
      "body": [
        {
          "type": "TextBlock",
          "text": `${statusEmoji} Relatório de Testes - ${client || 'Cypress'}`,
          "size": "Large",
          "weight": "Bolder",
          "color": failedTests === 0 ? "Good" : "Warning"
        },
        {
          "type": "TextBlock",
          "text": scheduleLabel,
          "size": "Medium",
          "weight": "Bolder",
          "spacing": "None"
        },
        {
          "type": "FactSet",
          "facts": [
            { "title": "Branch:", "value": branch || 'main' },
            { "title": "Ambiente:", "value": environment || 'production' },
            { "title": "Data/Hora:", "value": formattedTime },
            { "title": "Duração:", "value": formattedDuration },
            { "title": "Executado por:", "value": author || 'Sistema' }
          ]
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                { "type": "TextBlock", "text": "📊 Total", "weight": "Bolder" },
                { "type": "TextBlock", "text": `${totalTests}`, "size": "ExtraLarge" }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                { "type": "TextBlock", "text": "✅ Aprovados", "weight": "Bolder" },
                { "type": "TextBlock", "text": `${passedTests}\n(${successRate}%)`, "size": "ExtraLarge", "color": "Good" }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                { "type": "TextBlock", "text": "❌ Reprovados", "weight": "Bolder" },
                { "type": "TextBlock", "text": `${failedTests}`, "size": "ExtraLarge", "color": "Attention" }
              ]
            }
          ]
        }
      ],
      "actions": []
    };

    // Adiciona testes aprovados
    if (passedList.length > 0) {
      const display = passedList.slice(0, 10);
      const more = passedList.length - 10;
      adaptiveCard.body.push({
        "type": "TextBlock",
        "text": "✅ **Testes Aprovados**",
        "weight": "Bolder",
        "size": "Medium",
        "spacing": "Large"
      });
      adaptiveCard.body.push({
        "type": "TextBlock",
        "text": display.map(t => `• ${t}`).join('\n') + (more > 0 ? `\n\n*...e mais ${more}*` : ''),
        "wrap": true
      });
    }

    // Adiciona testes reprovados
    if (failedList.length > 0) {
      adaptiveCard.body.push({
        "type": "TextBlock",
        "text": "❌ **Testes Reprovados**",
        "weight": "Bolder",
        "size": "Medium",
        "spacing": "Large",
        "color": "Attention"
      });
      adaptiveCard.body.push({
        "type": "TextBlock",
        "text": failedList.map(t => `• ${t}`).join('\n'),
        "wrap": true,
        "color": "Attention"
      });
    }

    // Adiciona botão
    if (socialPanelUrl) {
      adaptiveCard.actions.push({
        "type": "Action.OpenUrl",
        "title": "📊 Ver Dashboard Completo",
        "url": socialPanelUrl
      });
    }

    // ⭐ FORMATO CORRETO: Conforme documentação do Confluence
    const teamsMessage = {
      "body": {
        "attachments": [adaptiveCard]
      }
    };

    console.log('📤 [send-teams] Enviando...');

    await axios.post(TEAMS_WEBHOOK_URL, teamsMessage, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✅ [send-teams] Enviado!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Enviado ao Teams!' })
    };

  } catch (error) {
    console.error('❌ [send-teams] Erro:', error.message);
    if (error.response) {
      console.error('❌ [send-teams] Resposta:', error.response.data);
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
