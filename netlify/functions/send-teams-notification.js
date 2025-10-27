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
    console.log('📬 Iniciando envio de notificação ao Teams...');
    
    // Parse do body
    const data = JSON.parse(event.body);
    console.log('📊 Dados recebidos:', {
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
      console.warn('⚠️ TEAMS_WEBHOOK_URL não configurado');
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

    // Define cor e emoji baseado no resultado
    const themeColor = failedTests === 0 ? '28A745' : 'DC3545'; // Verde ou Vermelho
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
    let scheduleLabel = '';
    if (hour >= 7 && hour < 10) scheduleLabel = '🌅 Execução Matinal (08h)';
    else if (hour >= 11 && hour < 13) scheduleLabel = '☀️ Execução Meio-dia (12h)';
    else if (hour >= 15 && hour < 17) scheduleLabel = '🌤️ Execução Tarde (16h)';
    else if (hour >= 18 && hour < 21) scheduleLabel = '🌆 Execução Noite (19h)';
    else scheduleLabel = '🔄 Execução Manual';

    // ==========================================
    // Monta a mensagem para Teams (Adaptive Card)
    // ==========================================
    const teamsMessage = {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      "summary": `${statusEmoji} Cypress Tests - ${client || 'Testes'} - ${failedTests === 0 ? 'Sucesso Total' : `${failedTests} Falha(s)`}`,
      "themeColor": themeColor,
      "title": `🧪 ${scheduleLabel}`,
      "sections": [
        {
          "activityTitle": `**${client || 'Cliente'}** • ${branch || 'main'} • ${environment || 'production'}`,
          "activitySubtitle": `📅 ${formattedTime} • ⏱️ ${formattedDuration}`,
          "activityImage": "https://docs.cypress.io/img/logo/cypress-logo-circle-dark.png",
          "facts": [
            {
              "name": "📊 Total de Testes:",
              "value": `**${totalTests}**`
            },
            {
              "name": "✅ Aprovados:",
              "value": `**${passedTests}** (${successRate}%)`
            },
            {
              "name": "❌ Reprovados:",
              "value": `**${failedTests}**`
            },
            {
              "name": "👤 Executado por:",
              "value": author || 'Sistema Automático'
            }
          ],
          "markdown": true
        }
      ]
    };

    // Adiciona seção de testes aprovados (máximo 10)
    if (passedList.length > 0) {
      const passedDisplay = passedList.slice(0, 10);
      const morePassedCount = passedList.length - 10;
      
      teamsMessage.sections.push({
        "activityTitle": "✅ **Testes que Passaram**",
        "text": passedDisplay.map(test => `• ${test}`).join('\n\n') +
                (morePassedCount > 0 ? `\n\n*...e mais ${morePassedCount} teste(s)*` : ''),
        "markdown": true
      });
    }

    // Adiciona seção de testes reprovados (máximo 15)
    if (failedList.length > 0) {
      const failedDisplay = failedList.slice(0, 15);
      const moreFailedCount = failedList.length - 15;
      
      teamsMessage.sections.push({
        "activityTitle": "❌ **Testes que Falharam**",
        "text": failedDisplay.map(test => `• ${test}`).join('\n\n') +
                (moreFailedCount > 0 ? `\n\n*...e mais ${moreFailedCount} teste(s)*` : ''),
        "markdown": true
      });
    }

    // Adiciona botões de ação
    const actions = [];
    
    // Botão para Social Panel
    if (socialPanelUrl) {
      actions.push({
        "@type": "OpenUri",
        "name": "📊 Ver Dashboard Completo",
        "targets": [
          {
            "os": "default",
            "uri": socialPanelUrl
          }
        ]
      });
    }

    // Botão para GitHub Actions (se disponível)
    if (githubRunUrl) {
      actions.push({
        "@type": "OpenUri",
        "name": "🔗 Ver Execução no GitHub",
        "targets": [
          {
            "os": "default",
            "uri": githubRunUrl
          }
        ]
      });
    }

    if (actions.length > 0) {
      teamsMessage.potentialAction = actions;
    }

    // ==========================================
    // Envia para o Teams via Webhook
    // ==========================================
    console.log('📤 Enviando para Teams...');
    
    const response = await axios.post(TEAMS_WEBHOOK_URL, teamsMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 segundos timeout
    });

    console.log('✅ Notificação enviada ao Teams com sucesso!');
    console.log('📬 Status:', response.status);

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
    console.error('❌ Erro ao enviar notificação ao Teams:', error);
    
    // Log detalhado do erro
    if (error.response) {
      console.error('Resposta do erro:', {
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
