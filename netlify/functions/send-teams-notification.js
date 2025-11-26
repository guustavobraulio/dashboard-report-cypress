const axios = require('axios');

exports.handler = async (event, context) => {
  // ... (Headers e Verificações de Método igual ao anterior) ...
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const data = JSON.parse(event.body);
    const WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

    if (!WEBHOOK_URL) throw new Error('Webhook URL não configurada.');

    // 1. CÁLCULOS E FORMATAÇÃO
    const total = data.totalTests || 0;
    const passed = data.passedTests || 0;
    const failed = data.failedTests || 0;
    const skipped = data.skippedTests || 0;
    
    // Porcentagem de Aprovação
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    // Data Formatada (DD/MM/YYYY, HH:mm:ss)
    const now = new Date();
    const dateString = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); // Ajuste o TimeZone se necessário

    // Duração (converte ms para s)
    const durationSeconds = ((data.duration || 0) / 1000).toFixed(0) + "s";

    const stats = {
      total, passed, failed, skipped, passRate, durationSeconds, dateString,
      environment: data.environment || 'Produção',
      author: data.author || 'Sistema',
      client: data.client || 'Projeto'
    };

    // 2. LÓGICA DE CORES
    let headerStyle = "Good"; 
    let headerIcon = "✅";
    let headerText = "SUCESSO";

    if (failed > 0) {
      headerStyle = "Attention"; // Vermelho
      headerIcon = "❌";
      headerText = "FALHA";
    } else if (skipped > 0 && passed === 0) {
      headerStyle = "Warning"; // Amarelo
      headerIcon = "⚠️";
      headerText = "ATENÇÃO";
    }

    // 3. HELPER PARA LISTAS (Falhas e Ignorados)
    const createListItems = (list, icon, color) => {
      return (list || []).map((test, index) => {
        const fullTitle = test.title || test;
        // Remove prefixos comuns se quiser limpar, ou mantém original
        return {
          type: "TextBlock",
          text: `${index + 1}. ${fullTitle}`, // Lista Numerada
          wrap: true,
          size: "Small",
          color: color, // "Attention" (Vermelho) ou "Accent" (Azul/Roxo para ignorados)
          spacing: "Small"
        };
      });
    };

    const failedItems = createListItems(data.failedList, "❌", "Attention");
    const skippedItems = createListItems(data.skippedList, "⏭️", "Accent"); // Accent geralmente é azul/roxo no Teams

    // 4. CONSTRUÇÃO DO ADAPTIVE CARD
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
                      text: `Ambiente: ${stats.environment}`,
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
        
        // --- INFO GERAL (Lista Vertical como na imagem) ---
        {
          type: "Container",
          spacing: "Medium",
          items: [
             // Linha 1: Total e Aprovação
             {
                type: "FactSet",
                facts: [
                    { title: "📊 Total:", value: `${stats.total}` },
                    { title: "✅ Aprovados:", value: `${stats.passed} (${stats.passRate}%)` },
                    { title: "❌ Falhados:", value: `${stats.failed}` },
                    { title: "⏭️ Ignorados:", value: `${stats.skipped}` }
                ]
             },
             // Linha 2: Metadados
             {
                type: "FactSet",
                facts: [
                    { title: "⏱️ Duração:", value: stats.durationSeconds },
                    { title: "👤 Autor:", value: stats.author },
                    { title: "📅 Data:", value: stats.dateString }
                ]
             }
          ]
        },

        // --- SEÇÃO DE FALHAS (Se houver) ---
        ...(failedItems.length > 0 ? [
            {
                type: "Container",
                spacing: "Large",
                separator: true,
                items: [
                    {
                        type: "TextBlock",
                        text: `❌ Testes com Falha (${failedItems.length})`,
                        weight: "Bolder",
                        size: "Medium",
                        color: "Attention"
                    },
                    ...failedItems.slice(0, 50) // Limite de segurança
                ]
            }
        ] : []),

        // --- SEÇÃO DE IGNORADOS (Se houver) ---
        ...(skippedItems.length > 0 ? [
            {
                type: "Container",
                spacing: "Large",
                separator: true, // Linha separadora
                items: [
                    {
                        type: "TextBlock",
                        text: `⏭️ Testes Ignorados (${skippedItems.length})`,
                        weight: "Bolder",
                        size: "Medium",
                        color: "Accent" // Cor diferente para destacar
                    },
                    ...skippedItems.slice(0, 50)
                ]
            }
        ] : [])
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "📊 Dashboard Completo",
          url: data.socialPanelUrl || "https://seu-dashboard.com",
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
