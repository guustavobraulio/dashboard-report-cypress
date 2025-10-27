const axios = require('axios');

// ==========================================
// Função para enviar notificação ao Teams
// ==========================================
exports.handler = async (event, context) => {
  // Configuração CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Responde OPTIONS para CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Apenas aceita POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
    };
  }

  try {
    console.log('📬 [send-teams] Iniciando envio de notificação ao Teams...');
    
    // Parse do body
    const data = JSON.parse(event.body);
    console.log('📊 [send-teams] Dados recebidos:', {
      client: data.client,
      totalTests: data.totalTests,
      passedTests: data.passedTests,
      failedTests: data.failedTests
    });

    const {
      executionId,
      client,
      branch,
      environment,
      totalTests,
      passedTests,
      failedTests,
      duration,
      timestamp,
      passedList = [],
      failedList = [],
      socialPanelUrl,
      author,
      githubRunUrl
    } = data;

    // Validação básica
    if (totalTests === undefined || passedTests === undefined || failedTests === undefined) {
      throw new Error('Dados incompletos. Necessário: totalTests, passedTests, failedTests');
    }

    // URL do Webhook do Teams (da variável de ambiente)
    const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
    
    if (!TEAMS_WEBHOOK_URL) {
      console.warn('⚠️ [send-teams] TEAMS_WEBHOOK_URL não configurado');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'TEAMS_WEBHOOK_URL não configurado nas variáveis de ambiente' 
        })
      };
    }

    // Calcula taxa de sucesso
    const successRate = totalTests > 0 
      ? ((passedTests / totalTests) * 100).toFixed(1) 
      : 0;

    // Define emoji baseado no resultado
    const statusEmoji = failedTests === 0 ? '✅' : '⚠️';

    // Formata duração
    const formattedDuration = duration >= 60 
      ? `${Math.floor(duration / 60)}m ${duration % 60}s`
      : `${duration}s`;

    // Formata timestamp
    const formattedTime = timestamp 
      ? new Date(timestamp).toLocaleString('pt-BR', { 
          dateStyle: 'short', 
          timeStyle: 'short' 
        })
      : new Date().toLocaleString('pt-BR', { 
          dateStyle: 'short', 
          timeStyle: 'short' 
        });

    // Identifica qual horário da execução automática
    const hour = new Date().getHours();
    let scheduleLabel = '🔄 Execução Manual';
    if (hour >= 7 && hour < 10) scheduleLabel = '🌅 Execução Matinal (08h)';
    else if (hour >= 11 && hour < 13) scheduleLabel = '☀️ Execução Meio-dia (12h)';
    else if (hour >= 15 && hour < 17) scheduleLabel = '🌤️ Execução Tarde (16h)';
    else if (hour >= 18 && hour < 21) scheduleLabel = '🌆 Execução Noite (19h)';

    // ==========================================
    // Monta a mensagem para Teams (Adaptive Card)
    // ==========================================
    const teamsMessage = {
      "type": "message",
      "attachments": [{
        "contentType": "application/vnd.microsoft.card.adaptive",
        "content": {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
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
                    {
                      "type": "TextBlock",
                      "text": "📊 Total",
                      "weight": "Bolder"
                    },
                    {
                      "type": "TextBlock",
                      "text": `${totalTests}`,
                      "size": "ExtraLarge"
                    }
                  ]
                },
                {
                  "type": "Column",
                  "width": "stretch",
                  "items": [
                    {
                      "type": "TextBlock",
                      "text": "✅ Aprovados",
                      "weight": "Bolder"
                    },
                    {
                      "type": "TextBlock",
                      "text": `${passedTests}\n(${successRate}%)`,
                      "size": "ExtraLarge",
                      "color": "Good"
                    }
                  ]
                },
                {
                  "type": "Column",
                  "width": "stretch",
                  "items": [
                    {
                      "type": "TextBlock",
                      "text": "❌ Reprovados",
                      "weight": "Bolder"
                    },
                    {
                      "type": "TextBlock",
                      "text": `${failedTests}`,
                      "size": "ExtraLarge",
                      "color": "Attention"
                    }
                  ]
                }
              ]
            }
          ],
          "actions": []
        }
      }]
    };

    // Adiciona seção de testes aprovados (máximo 10)
    if (passedList.length > 0) {
      const passedDisplay = passedList.slice(0, 10);
      const morePassedCount = passedList.length - 10;
      
      teamsMessage.attachments[0].content.body.push({
        "type": "TextBlock",
        "text": "✅ **Testes Aprovados**",
        "weight": "Bolder",
        "size": "Medium",
        "spacing": "Large"
      });
      
      teamsMessage.attachments[0].content.body.push({
        "type": "TextBlock",
        "text": passedDisplay.map(test => `• ${test}`).join('\n') +
                (morePassedCount > 0 ? `\n\n*...e mais ${morePassedCount} teste(s)*` : ''),
        "wrap": true
      });
    }

    // Adiciona seção de testes reprovados (todos)
    if (failedList.length > 0) {
      teamsMessage.attachments[0].content.body.push({
        "type": "TextBlock",
        "text": "❌ **Testes Reprovados**",
        "weight": "Bolder",
        "size": "Medium",
        "spacing": "Large",
        "color": "Attention"
      });
      
      teamsMessage.attachments[0].content.body.push({
        "type": "TextBlock",
        "text": failedList.map(test => `• ${test}`).join('\n'),
        "wrap": true,
        "color": "Attention"
      });
    }

    // Adiciona botão para o dashboard
    if (socialPanelUrl) {
      teamsMessage.attachments[0].content.actions.push({
        "type": "Action.OpenUrl",
        "title": "📊 Ver Dashboard Completo",
        "url": socialPanelUrl
      });
    }

    // Adiciona botão para GitHub (se disponível)
    if (githubRunUrl) {
      teamsMessage.attachments[0].content.actions.push({
        "type": "Action.OpenUrl",
        "title": "🔗 Ver Execução no GitHub",
        "url": githubRunUrl
      });
    }

    // ==========================================
    // Envia para o Teams via Webhook
    // ==========================================
    console.log('📤 [send-teams] Enviando para Teams...');
    
    const response = await axios.post(TEAMS_WEBHOOK_URL, teamsMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 segundos timeout
    });

    console.log('✅ [send-teams] Notificação enviada ao Teams com sucesso!');
    console.log('📬 [send-teams] Status:', response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Notificação enviada ao Microsoft Teams com sucesso!',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ [send-teams] Erro ao enviar notificação:', error.message);
    
    // Log detalhado do erro
    if (error.response) {
      console.error('❌ [send-teams] Resposta do erro:', {
        status: error.response.status,
        data: error.response.data
      });
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.response ? error.response.data : null
      })
    };
  }
};
