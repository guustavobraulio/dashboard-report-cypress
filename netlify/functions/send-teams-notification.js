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
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
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

    // Monta mensagem formatada
    let messageText = `${statusEmoji} **${scheduleLabel}**\n\n`;
    messageText += `**Cliente:** ${client || 'Cypress'}\n`;
    messageText += `**Branch:** ${branch || 'main'}\n`;
    messageText += `**Ambiente:** ${environment || 'production'}\n`;
    messageText += `**Data/Hora:** ${formattedTime}\n`;
    messageText += `**Duração:** ${formattedDuration}\n`;
    messageText += `**Executado por:** ${author || 'Sistema'}\n\n`;
    messageText += `📊 **Total:** ${totalTests} | ✅ **Aprovados:** ${passedTests} (${successRate}%) | ❌ **Reprovados:** ${failedTests}\n\n`;
    
    if (passedList.length > 0) {
      messageText += `✅ **Testes Aprovados:**\n`;
      passedList.slice(0, 10).forEach(t => messageText += `• ${t}\n`);
      if (passedList.length > 10) messageText += `\n*...e mais ${passedList.length - 10} teste(s)*\n`;
      messageText += `\n`;
    }
    
    if (failedList.length > 0) {
      messageText += `❌ **Testes Reprovados:**\n`;
      failedList.forEach(t => messageText += `• ${t}\n`);
      messageText += `\n`;
    }
    
    if (socialPanelUrl) {
      messageText += `\n📊 [Ver Dashboard Completo](${socialPanelUrl})`;
    }

    // Formato correto para o workflow do Teams
    const teamsMessage = {
      "attachments": [
        {
          "body": [
            {
              "type": "TextBlock",
              "text": messageText
            }
          ]
        }
      ]
    };

    console.log('📤 [send-teams] Enviando...');

    await axios.post(TEAMS_WEBHOOK_URL, teamsMessage, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✅ [send-teams] Enviado com sucesso!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Enviado ao Teams!' })
    };

  } catch (error) {
    console.error('❌ [send-teams] Erro:', error.message);
    if (error.response) {
      console.error('❌ [send-teams] Status:', error.response.status);
      console.error('❌ [send-teams] Data:', JSON.stringify(error.response.data));
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
