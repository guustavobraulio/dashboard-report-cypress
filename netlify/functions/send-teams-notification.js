const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Tratamento para preflight OPTIONS (CORS)
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
    console.log(`[teams] Client: ${data.client} | Total: ${data.totalTests}`);

    // 1. CONFIGURAÇÃO DA URL DO WEBHOOK
    // Tenta pegar TEAMS_WEBHOOK_URL, se não tiver, tenta N8N_WEBHOOK_URL
    const WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
    
    if (!WEBHOOK_URL) {
      console.error('[teams] ❌ URL do Webhook não configurada!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Webhook URL não configurada no servidor.' })
      };
    }

    // 2. NORMALIZAÇÃO DOS DADOS
    const stats = {
      total: data.totalTests || 0,
      passed: data.passedTests || 0,
      failed: data.failedTests || 0,
      skipped: data.skippedTests || 0,
      duration: data.duration || 0,
      environment: data.environment || 'Produção',
      author: data.author || 'Sistema',
      client: data.client || 'Projeto'
    };

    // 3. LÓGICA DE CORES E ÍCONES
    let headerStyle = "Good"; // Verde (Sucesso)
    let headerIcon = "✅";
    let headerText = "SUCESSO";
    let metricsColor = "Good";

    if (stats.failed > 0) {
      headerStyle = "Attention"; // Vermelho (Falha)
      headerIcon = "❌";
      headerText = "FALHA";
      metricsColor = "Attention";
    } else if (stats.skipped > 0 && stats.passed === 0) {
      headerStyle = "Warning"; // Amarelo (Atenção)
      headerIcon = "⚠️";
      headerText = "ATENÇÃO";
      metricsColor = "Warning";
    }

    // 4. FORMATAÇÃO DA LISTA DE ERROS (Design Limpo)
    const failedItems = (data.failedList || []).map(test => {
      // Tenta extrair "Suite > Teste" para separar visualmente
      const fullTitle = test.title || test;
      const parts = typeof fullTitle === 'string' ? fullTitle.split(' > ') : [fullTitle];
      
      const testName = parts.length > 1 ? parts[parts.length - 1] : fullTitle;
      const suiteName = parts.length > 1 ? parts.slice(0, -1).join(' > ') : 'Teste Geral';

      return {
        type: "Container",
        spacing: "Small",
        items: [
            {
                type: "TextBlock",
                text: `🔴 ${testName}`, 
                wrap: true,
                weight: "Bolder",
                size: "Small",
                color: "Attention"
            },
            {
                type: "TextBlock",
                text: suiteName,
                wrap: true,
                isSubtle: true, // Texto cinza claro
                size: "Small",
                spacing: "None",
                fontStyle: "Italic"
            }
        ]
      };
    });

    // 5. CONSTRUÇÃO DO ADAPTIVE CARD
    const adaptiveCard = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [
        // --- CABEÇALHO ---
        {
          type: "Container",
          style: headerStyle, // Cor de fundo dinâmica
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: headerIcon, size: "Large" }]
                },
                {
                  type: "Column",
                  width: "stretch",
                  verticalAxisAlignment: "Center",
                  items: [
                    {
                      type: "TextBlock",
                      text: `${stats.client} - ${headerText}`,
                      weight: "Bolder",
                      size: "Medium",
                      color: "Light", // Texto Branco
                      wrap: true
                    },
                    {
                      type: "TextBlock",
                      text: `Ambiente: ${stats.environment} | Autor: ${stats.author}`,
                      size: "Small",
                      color: "Light",
                      isSubtle: true,
                      wrap: true,
                      spacing: "None"
                    }
                  ]
                }
              ]
            }
          ],
          bleed: true
        },
        // --- DASHBOARD DE MÉTRICAS ---
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "⏱️ Tempo", isSubtle: true, size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: `${(stats.duration / 1000).toFixed(1)}s`, weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Total", isSubtle: true, size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: stats.total.toString(), weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Passou", color: "Good", size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: stats.passed.toString(), color: "Good", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Falhou", color: "Attention", size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: stats.failed.toString(), color: "Attention", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "🔍 Ver Relatório Detalhado",
          url: data.socialPanelUrl || "https://seu-dashboard-ci.com", // Fallback URL
          style: "positive"
        }
      ]
    };

    // --- INSERÇÃO DINÂMICA DA LISTA DE ERROS ---
    if (failedItems.length > 0) {
      adaptiveCard.body.push({
        type: "Container",
        spacing: "Large",
        separator: true,
        items: [
          {
            type: "TextBlock",
            text: `📋 Detalhes dos Erros (${stats.failed})`,
            weight: "Bolder",
            size: "Medium",
            spacing: "Medium"
          },
          ...failedItems.slice(0, 10) // Limite de 10 itens para não quebrar o card
        ]
      });

      if (failedItems.length > 10) {
        adaptiveCard.body.push({
          type: "TextBlock",
          text: `... e mais ${failedItems.length - 10} falhas não listadas.`,
          isSubtle: true,
          italic: true,
          size: "Small",
          horizontalAlignment: "Center",
          spacing: "Medium"
        });
      }
    }

    // 6. PREPARAÇÃO DO PAYLOAD (Importante para Workflows!)
    const payload = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: adaptiveCard
        }
      ]
    };

    // 7. ENVIO
    console.log('[teams] Enviando Adaptive Card...');
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('[teams] ✅ Sucesso! Status:', response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Relatório enviado com sucesso',
        stats: { passed: stats.passed, failed: stats.failed }
      })
    };

  } catch (error) {
    console.error('[teams] ❌ Erro:', error.message);
    if (error.response) {
      console.error('[teams] Resposta do Teams:', JSON.stringify(error.response.data));
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
