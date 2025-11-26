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

    // 1. DADOS E CÁLCULOS
    const stats = {
      total: data.totalTests || 0,
      passed: data.passedTests || 0,
      failed: data.failedTests || 0,
      skipped: data.skippedTests || 0,
      duration: ((data.duration || 0) / 1000).toFixed(1) + "s", // Formato "0.4s"
      environment: data.environment || 'Produção',
      author: data.author || 'Sistema',
      client: data.client || 'Projeto'
    };

    // 2. CORES DO CABEÇALHO
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

    // 3. HELPER PARA LISTAS (Estilo Bola Vermelha + 2 Linhas)
    const createErrorList = (list) => {
      return (list || []).map(test => {
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
                  text: `🔴 ${testName}`, // Bola vermelha + Nome
                  wrap: true,
                  weight: "Bolder",
                  size: "Small",
                  color: "Attention" // Texto Vermelho
              },
              {
                  type: "TextBlock",
                  text: `[${stats.client}] ${suiteName}`, // Contexto na linha de baixo
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

    // 4. CONSTRUÇÃO DO ADAPTIVE CARD (Estilo do Print)
    const adaptiveCard = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      msteams: { width: "Full" },
      body: [
        // --- CABEÇALHO (Faixa Colorida) ---
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

        // --- DASHBOARD (Colunas Centralizadas) ---
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
                    { type: "TextBlock", text: stats.duration, weight: "Bolder", size: "Large", horizontalAlignment: "Center" }
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
            },
             // Linha separadora fina
            {
                type: "Container",
                items: [
                    { type: "TextBlock", text: " ", size: "Small" } // Espaço vazio ou linha poderia ser usada
                ],
                style: "emphasis", // Fundo levemente cinza se quiser separar, ou remova
                height: "1px",
                isVisible: false 
            }
          ]
        },
        
        // Linha divisória explicita
        {
            type: "Container", 
            items: [], 
            style: "default", 
            bleed: true, 
            height: "1px", 
            separator: true 
        },

        // --- LISTA DE ERROS (Se houver) ---
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
                    ...failedItems // Exibe todos, sem limite
                ]
            }
        ] : [])
      ],
      actions: [
        {
            type: "Action.OpenUrl",
            title: "🔍 Ver Relatório Detalhado",
            url: data.socialPanelUrl || "https://google.com",
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
