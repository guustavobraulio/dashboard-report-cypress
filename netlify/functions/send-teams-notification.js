const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };

  try {
    const data = JSON.parse(event.body);
    const WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

    if (!WEBHOOK_URL) throw new Error('URL do Webhook não configurada.');

    // 1. DADOS E FORMATAÇÃO
    // Data atual formatada (ex: 26/11/2025 11:00)
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    const stats = {
      total: data.totalTests || 0,
      passed: data.passedTests || 0,
      failed: data.failedTests || 0,
      skipped: data.skippedTests || 0,
      duration: ((data.duration || 0) / 1000).toFixed(1) + "s", 
      environment: data.environment || 'Produção',
      author: data.author || 'Sistema',
      client: data.client || 'Projeto',
      date: now
    };

    // 2. CORES E ÍCONES DO CABEÇALHO
    let headerStyle = "Good"; // Verde
    let headerIcon = "✅";
    let headerText = "SUCESSO";

    if (stats.failed > 0) {
      headerStyle = "Attention"; // Vermelho
      headerIcon = "❌";
      headerText = "FALHA";
    } else if (stats.skipped > 0 && stats.passed === 0) {
      headerStyle = "Warning"; // Amarelo
      headerIcon = "⚠️";
      headerText = "ATENÇÃO";
    }

    // 3. HELPER PARA LISTA DE ERROS (Estilo Bolinha Vermelha)
    const createErrorList = (list) => {
      return (list || []).map(test => {
        const fullTitle = test.title || test;
        const parts = typeof fullTitle === 'string' ? fullTitle.split(' > ') : [fullTitle];
        const testName = parts.length > 1 ? parts[parts.length - 1] : fullTitle;
        const suiteName = parts.length > 1 ? parts.slice(0, -1).join(' > ') : 'Geral';

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
                  text: `[${stats.client}] ${suiteName}`,
                  wrap: true,
                  isSubtle: true,
                  size: "Small",
                  spacing: "None"
              }
          ]
        };
      });
    };

    const failedItems = createErrorList(data.failedList);

    // 4. ADAPTIVE CARD COMPLETO
    const adaptiveCard = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      msteams: { width: "Full" },
      body: [
        // --- CABEÇALHO ---
        {
          type: "Container",
          style: headerStyle,
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
                      color: "Light",
                      wrap: true
                    },
                    {
                      type: "TextBlock",
                      // Data adicionada aqui no final
                      text: `Ambiente: ${stats.environment} | Autor: ${stats.author} | 📅 ${stats.date}`,
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

        // --- DASHBOARD (5 COLUNAS AGORA) ---
        {
          type: "Container",
          spacing: "Medium",
          items: [
            {
              type: "ColumnSet",
              columns: [
                // 1. Duração
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "⏱️ Tempo", isSubtle: true, size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: stats.duration, weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                },
                // 2. Total
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Total", isSubtle: true, size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: stats.total.toString(), weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                },
                // 3. Passou
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Passou", color: "Good", size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: stats.passed.toString(), color: "Good", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                },
                // 4. Falhou
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Falhou", color: "Attention", size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: stats.failed.toString(), color: "Attention", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                },
                // 5. Ignorados (Novo!)
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: "Ignorados", color: "Warning", size: "Small", horizontalAlignment: "Center" },
                    { type: "TextBlock", text: stats.skipped.toString(), color: "Warning", weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
                  ]
                }
              ]
            },
            {
                type: "Container",
                items: [],
                style: "default",
                bleed: true,
                height: "1px",
                separator: true
            }
          ]
        },

        // --- LISTA DE ERROS ---
        ...(failedItems.length > 0 ? [
            {
                type: "Container",
                spacing: "Medium",
                items: [
                    {
                        type: "TextBlock",
                        text: `📋 Detalhes dos Erros (${stats.failed})`,
                        weight: "Bolder",
                        size: "Medium",
                        spacing: "Medium"
                    },
                    ...failedItems
                ]
            }
        ] : [])
      ],
      actions: [
        {
            type: "Action.OpenUrl",
            title: "🔍 Ver Relatório Detalhado",
            url: data.socialPanelUrl || "https://seusite.com",
            style: "positive"
        }
      ]
    };

    // 5. ENVIO
    const payload = {
      type: "message",
      attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: adaptiveCard }]
    };

    console.log('[teams] Enviando...');
    await axios.post(WEBHOOK_URL, payload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('[teams] Erro:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
